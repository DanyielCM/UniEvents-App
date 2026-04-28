import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


async def save_upload(
    file: UploadFile,
    subdir: str,
    max_size_mb: int,
    upload_dir: str,
) -> dict:
    content = await file.read()
    size_bytes = len(content)

    if size_bytes > max_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {max_size_mb} MB limit")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail=f"File type '{file.content_type}' is not allowed")

    ext = Path(file.filename or "file").suffix.lower()
    stored_name = f"{uuid.uuid4().hex}{ext}"
    target_dir = Path(upload_dir) / subdir
    target_dir.mkdir(parents=True, exist_ok=True)

    (target_dir / stored_name).write_bytes(content)

    return {
        "filename": f"{subdir}/{stored_name}",
        "original_name": file.filename or "unknown",
        "mime_type": file.content_type or "application/octet-stream",
        "size_bytes": size_bytes,
    }


def delete_file(filename: str, upload_dir: str) -> None:
    path = Path(upload_dir) / filename
    if path.exists():
        path.unlink()
