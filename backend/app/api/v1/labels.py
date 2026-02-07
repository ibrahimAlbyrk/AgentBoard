from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_project_access
from app.core.database import get_db
from app.crud import crud_label
from app.models.label import Label
from app.models.project import Project
from app.schemas.base import ResponseBase
from app.schemas.label import LabelCreate, LabelResponse, LabelUpdate

router = APIRouter(
    prefix="/projects/{project_id}/labels", tags=["Labels"]
)


@router.get("/", response_model=ResponseBase[list[LabelResponse]])
async def list_labels(
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    labels = await crud_label.get_multi_by_project(db, project.id)
    return ResponseBase(
        data=[LabelResponse.model_validate(l) for l in labels]
    )


@router.post("/", response_model=ResponseBase[LabelResponse], status_code=201)
async def create_label(
    label_in: LabelCreate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    label = Label(
        project_id=project.id,
        name=label_in.name,
        color=label_in.color,
        description=label_in.description,
    )
    db.add(label)
    await db.flush()
    await db.refresh(label)
    return ResponseBase(data=LabelResponse.model_validate(label))


@router.patch("/{label_id}", response_model=ResponseBase[LabelResponse])
async def update_label(
    label_id: UUID,
    label_in: LabelUpdate,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    label = await crud_label.get(db, label_id)
    if not label or label.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Label not found"
        )
    updated = await crud_label.update(db, db_obj=label, obj_in=label_in)
    return ResponseBase(data=LabelResponse.model_validate(updated))


@router.delete("/{label_id}", status_code=204)
async def delete_label(
    label_id: UUID,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(check_project_access),
):
    label = await crud_label.get(db, label_id)
    if not label or label.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Label not found"
        )
    await crud_label.remove(db, id=label_id)
