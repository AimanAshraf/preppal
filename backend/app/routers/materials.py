import os
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.services.pdf_service import extract_text_from_pdf
from app.config import settings

router = APIRouter(prefix="/materials", tags=["materials"])

MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024  # bytes


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_material(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted")

    contents = await file.read()

    # Validate file size
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 10MB limit")

    # Save file
    user_id = current_user["_id"]
    timestamp = int(datetime.utcnow().timestamp())
    safe_filename = f"{user_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(contents)

    # Extract text
    extracted_text = extract_text_from_pdf(file_path)

    # Store in DB
    material = {
        "user_id": user_id,
        "filename": file.filename,
        "file_path": file_path,
        "extracted_text": extracted_text,
        "uploaded_at": datetime.utcnow(),
        "file_size": len(contents),
    }
    result = await db.materials.insert_one(material)

    return {
        "id": str(result.inserted_id),
        "filename": file.filename,
        "file_size": len(contents),
        "uploaded_at": material["uploaded_at"].isoformat(),
        "message": "Material uploaded successfully",
    }


@router.get("")
async def list_materials(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]
    cursor = db.materials.find({"user_id": user_id}, {"extracted_text": 0})
    materials = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        materials.append(doc)
    return materials


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]

    try:
        obj_id = ObjectId(material_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid material ID")

    material = await db.materials.find_one({"_id": obj_id, "user_id": user_id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    # Delete file
    if os.path.exists(material["file_path"]):
        os.remove(material["file_path"])

    await db.materials.delete_one({"_id": obj_id})
