"""Content processing for Tiptap rich text: normalization, plain-text extraction, mention extraction."""


def normalize_content(value: str | dict | None) -> dict | None:
    """Convert string to Tiptap JSON doc, validate existing dict, or return None for empty."""
    if value is None:
        return None

    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        # Split on newlines to create multiple paragraphs
        lines = text.split("\n")
        content = []
        for line in lines:
            if line.strip():
                content.append(
                    {"type": "paragraph", "content": [{"type": "text", "text": line}]}
                )
            else:
                content.append({"type": "paragraph"})
        return {"type": "doc", "content": content}

    if isinstance(value, dict):
        if value.get("type") != "doc":
            raise ValueError("Invalid content: must be a Tiptap JSON doc with type='doc'")
        # Treat empty doc as None
        doc_content = value.get("content", [])
        if not doc_content:
            return None
        # Check if doc has any meaningful content (text, mentions, references, images, etc.)
        if _has_meaningful_content(value):
            return value
        return None

    raise ValueError("Content must be a string or Tiptap JSON dict")


_MEANINGFUL_NODE_TYPES = {"text", "mention", "reference", "image", "taskItem", "table"}


def _has_meaningful_content(doc: dict) -> bool:
    """Check if a Tiptap doc has any meaningful nodes (text, mentions, references, images, etc.)."""
    def walk(node: dict) -> bool:
        if node.get("type") in _MEANINGFUL_NODE_TYPES:
            # For text nodes, require non-whitespace content
            if node.get("type") == "text":
                return bool(node.get("text", "").strip())
            return True
        for child in node.get("content", []):
            if walk(child):
                return True
        return False
    return walk(doc)


def extract_plain_text(doc: dict | None) -> str:
    """Recursively extract all text content from Tiptap JSON."""
    if not doc:
        return ""
    parts: list[str] = []

    def walk(node: dict) -> None:
        ntype = node.get("type")
        if ntype == "text":
            parts.append(node.get("text", ""))
        elif ntype == "mention":
            label = node.get("attrs", {}).get("label", "")
            if label:
                parts.append(f"@{label}")
        elif ntype == "reference":
            label = node.get("attrs", {}).get("label", "")
            if label:
                parts.append(f"#{label}")
        elif ntype == "hardBreak":
            parts.append("\n")
        for child in node.get("content", []):
            walk(child)

    walk(doc)
    return " ".join(parts).strip()


def extract_mentions(
    doc: dict | None, entity_types: set[str] | None = None
) -> list[dict]:
    """Extract all mention nodes from Tiptap JSON, optionally filtered by entity_type."""
    if not doc:
        return []
    mentions: list[dict] = []

    def walk(node: dict) -> None:
        if node.get("type") == "mention":
            attrs = node.get("attrs", {})
            et = attrs.get("entityType")
            if entity_types is None or et in entity_types:
                mentions.append(
                    {
                        "entity_type": et,
                        "id": attrs.get("id"),
                        "label": attrs.get("label"),
                    }
                )
        for child in node.get("content", []):
            walk(child)

    walk(doc)
    return mentions
