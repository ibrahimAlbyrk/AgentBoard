from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_board_access, get_current_user
from app.core.errors import DuplicateError, NotFoundError
from app.core.database import get_db
from app.crud import crud_activity_log, crud_custom_field_definition, crud_custom_field_value, crud_task
from app.models.board import Board
from app.models.user import User
from app.schemas.base import ResponseBase
from app.schemas.custom_field import (
    BulkFieldValueSet,
    CustomFieldDefinitionCreate,
    CustomFieldDefinitionResponse,
    CustomFieldDefinitionUpdate,
    CustomFieldReorder,
    CustomFieldValueResponse,
    CustomFieldValueSet,
)
from app.services.custom_field_service import CustomFieldService
from app.services.websocket_manager import manager

router = APIRouter(tags=["Custom Fields"])


def _format_field_value(definition, value) -> str | None:
    """Return a human-readable display string for a custom field value."""
    ft = definition.field_type
    if ft == "text" or ft == "url":
        return value.value_text
    if ft == "number":
        return str(value.value_number) if value.value_number is not None else None
    if ft == "checkbox":
        return "checked" if value.value_number == 1.0 else "unchecked"
    if ft == "date":
        return str(value.value_date) if value.value_date else None
    if ft == "select":
        opt_id = value.value_json
        if isinstance(opt_id, str) and definition.options:
            match = next((o for o in definition.options if o.get("id") == opt_id), None)
            return match["label"] if match else opt_id
        return str(opt_id) if opt_id else None
    if ft == "multi_select":
        ids = value.value_json
        if isinstance(ids, list) and definition.options:
            opt_map = {o["id"]: o.get("label", o["id"]) for o in definition.options}
            return ", ".join(opt_map.get(i, i) for i in ids)
        return str(ids) if ids else None
    if ft == "person":
        persons = value.value_json
        if isinstance(persons, list):
            return f"{len(persons)} person(s)"
        return None
    return str(value.value_text or value.value_number or value.value_json or value.value_date)


# ── Definition Endpoints ──


@router.get(
    "/projects/{project_id}/boards/{board_id}/custom-fields",
    response_model=ResponseBase[list[CustomFieldDefinitionResponse]],
)
async def list_custom_fields(
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    definitions = await crud_custom_field_definition.get_multi_by_board(db, board.id)
    return ResponseBase(
        data=[CustomFieldDefinitionResponse.model_validate(d) for d in definitions]
    )


@router.post(
    "/projects/{project_id}/boards/{board_id}/custom-fields",
    response_model=ResponseBase[CustomFieldDefinitionResponse],
    status_code=201,
)
async def create_custom_field(
    field_in: CustomFieldDefinitionCreate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    existing = await crud_custom_field_definition.get_by_name(
        db, board.id, field_in.name
    )
    if existing:
        raise DuplicateError(f'Field "{field_in.name}" already exists on this board')

    definition = await CustomFieldService.create_definition(db, board.id, field_in)
    response = CustomFieldDefinitionResponse.model_validate(definition)

    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "custom_field.created",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": response.model_dump(mode="json"),
    })

    return ResponseBase(data=response)


@router.patch(
    "/projects/{project_id}/boards/{board_id}/custom-fields/{field_id}",
    response_model=ResponseBase[CustomFieldDefinitionResponse],
)
async def update_custom_field(
    field_id: UUID,
    field_in: CustomFieldDefinitionUpdate,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    definition = await crud_custom_field_definition.get(db, field_id)
    if not definition or definition.board_id != board.id:
        raise NotFoundError("Custom field not found")

    if field_in.name and field_in.name != definition.name:
        existing = await crud_custom_field_definition.get_by_name(
            db, board.id, field_in.name
        )
        if existing:
            raise DuplicateError(f'Field "{field_in.name}" already exists on this board')

    updated = await CustomFieldService.update_definition(db, definition, field_in)
    response = CustomFieldDefinitionResponse.model_validate(updated)

    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "custom_field.updated",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": response.model_dump(mode="json"),
    })

    return ResponseBase(data=response)


@router.delete(
    "/projects/{project_id}/boards/{board_id}/custom-fields/{field_id}",
    status_code=204,
)
async def delete_custom_field(
    field_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    definition = await crud_custom_field_definition.get(db, field_id)
    if not definition or definition.board_id != board.id:
        raise NotFoundError("Custom field not found")

    await crud_custom_field_definition.remove(db, id=field_id)

    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "custom_field.deleted",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": {"field_id": str(field_id)},
    })


@router.post(
    "/projects/{project_id}/boards/{board_id}/custom-fields/reorder",
    response_model=ResponseBase[list[CustomFieldDefinitionResponse]],
)
async def reorder_custom_fields(
    body: CustomFieldReorder,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    for i, field_id in enumerate(body.field_ids):
        definition = await crud_custom_field_definition.get(db, field_id)
        if not definition or definition.board_id != board.id:
            raise NotFoundError(f"Custom field not found")
        definition.position = (i + 1) * 1024.0
        db.add(definition)

    await db.flush()
    definitions = await crud_custom_field_definition.get_multi_by_board(db, board.id)
    responses = [CustomFieldDefinitionResponse.model_validate(d) for d in definitions]

    await manager.broadcast_to_board(str(board.project_id), str(board.id), {
        "type": "custom_field.reordered",
        "project_id": str(board.project_id),
        "board_id": str(board.id),
        "data": {"field_ids": [str(fid) for fid in body.field_ids]},
    })

    return ResponseBase(data=responses)


# ── Value Endpoints ──


@router.get(
    "/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values",
    response_model=ResponseBase[list[CustomFieldValueResponse]],
)
async def list_field_values(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get(db, task_id)
    if not task or task.board_id != board.id:
        raise NotFoundError("Task not found")

    values = await crud_custom_field_value.get_by_task(db, task_id)
    return ResponseBase(
        data=[CustomFieldValueResponse.model_validate(v) for v in values]
    )


@router.put(
    "/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values",
    response_model=ResponseBase[list[CustomFieldValueResponse]],
)
async def bulk_set_field_values(
    task_id: UUID,
    body: BulkFieldValueSet,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get(db, task_id)
    if not task or task.board_id != board.id:
        raise NotFoundError("Task not found")

    # Capture old values for diff
    old_values_map: dict = {}
    for v in body.values:
        defn = await crud_custom_field_definition.get(db, v.field_definition_id)
        if defn:
            old_val = await crud_custom_field_value.get_by_task_and_field(db, task_id, v.field_definition_id)
            old_values_map[v.field_definition_id] = (defn, _format_field_value(defn, old_val) if old_val else None)

    results = await CustomFieldService.bulk_set_values(
        db, task_id, board.id, body.values
    )

    # Log changes for each field that actually changed
    for result in results:
        fid = result.field_definition_id
        if fid in old_values_map:
            defn, old_display = old_values_map[fid]
            new_display = _format_field_value(defn, result)
            if old_display != new_display:
                await crud_activity_log.log(
                    db,
                    project_id=board.project_id,
                    user_id=current_user.id,
                    action="updated",
                    entity_type="task",
                    task_id=task_id,
                    changes={"custom_field": {
                        "field": defn.name,
                        "old": old_display,
                        "new": new_display,
                    }},
                )

    # Broadcast task update so field values propagate
    refreshed = await crud_task.get_with_relations(db, task_id)
    if refreshed:
        from app.schemas.task import TaskResponse
        task_resp = TaskResponse.model_validate(refreshed)
        await manager.broadcast_to_board(str(board.project_id), str(board.id), {
            "type": "task.updated",
            "project_id": str(board.project_id),
            "board_id": str(board.id),
            "data": task_resp.model_dump(mode="json"),
        })

    return ResponseBase(
        data=[CustomFieldValueResponse.model_validate(r) for r in results]
    )


@router.put(
    "/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values/{field_id}",
    response_model=ResponseBase[CustomFieldValueResponse],
)
async def set_field_value(
    task_id: UUID,
    field_id: UUID,
    value_in: CustomFieldValueSet,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get(db, task_id)
    if not task or task.board_id != board.id:
        raise NotFoundError("Task not found")

    definition = await crud_custom_field_definition.get(db, field_id)
    if not definition or definition.board_id != board.id:
        raise NotFoundError("Custom field not found")

    # Capture old value for activity diff
    old_value = await crud_custom_field_value.get_by_task_and_field(db, task_id, field_id)
    old_display = _format_field_value(definition, old_value) if old_value else None

    result = await CustomFieldService.set_field_value(
        db, task_id, definition, value_in
    )

    new_display = _format_field_value(definition, result)
    if old_display != new_display:
        await crud_activity_log.log(
            db,
            project_id=board.project_id,
            user_id=current_user.id,
            action="updated",
            entity_type="task",
            task_id=task_id,
            changes={"custom_field": {
                "field": definition.name,
                "old": old_display,
                "new": new_display,
            }},
        )

    # Broadcast task update
    refreshed = await crud_task.get_with_relations(db, task_id)
    if refreshed:
        from app.schemas.task import TaskResponse
        task_resp = TaskResponse.model_validate(refreshed)
        await manager.broadcast_to_board(str(board.project_id), str(board.id), {
            "type": "task.updated",
            "project_id": str(board.project_id),
            "board_id": str(board.id),
            "data": task_resp.model_dump(mode="json"),
        })

    return ResponseBase(data=CustomFieldValueResponse.model_validate(result))


@router.delete(
    "/projects/{project_id}/boards/{board_id}/tasks/{task_id}/field-values/{field_id}",
    status_code=204,
)
async def clear_field_value(
    task_id: UUID,
    field_id: UUID,
    db: AsyncSession = Depends(get_db),
    board: Board = Depends(check_board_access),
    current_user: User = Depends(get_current_user),
):
    task = await crud_task.get(db, task_id)
    if not task or task.board_id != board.id:
        raise NotFoundError("Task not found")

    definition = await crud_custom_field_definition.get(db, field_id)
    old_value = await crud_custom_field_value.get_by_task_and_field(db, task_id, field_id)
    old_display = _format_field_value(definition, old_value) if definition and old_value else None

    await crud_custom_field_value.delete_by_task_and_field(db, task_id, field_id)

    if old_display and definition:
        await crud_activity_log.log(
            db,
            project_id=board.project_id,
            user_id=current_user.id,
            action="updated",
            entity_type="task",
            task_id=task_id,
            changes={"custom_field": {
                "field": definition.name,
                "old": old_display,
                "new": None,
            }},
        )

    # Broadcast task update
    refreshed = await crud_task.get_with_relations(db, task_id)
    if refreshed:
        from app.schemas.task import TaskResponse
        task_resp = TaskResponse.model_validate(refreshed)
        await manager.broadcast_to_board(str(board.project_id), str(board.id), {
            "type": "task.updated",
            "project_id": str(board.project_id),
            "board_id": str(board.id),
            "data": task_resp.model_dump(mode="json"),
        })
