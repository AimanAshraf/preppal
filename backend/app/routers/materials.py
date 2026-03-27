import os
from datetime import datetime
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from bson import ObjectId
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.services.pdf_service import extract_text_from_pdf
from app.services.gemini_service import extract_topics
from app.config import settings
from app.models.material import MaterialResponse

router = APIRouter(prefix="/materials", tags=["materials"])

@router.post("/upload", response_model=MaterialResponse)
async def upload_material(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    if not file.filename.lower().endswith(".pdf") or file.content_type != "application/pdf":
        raise HTTPException(status_code=422, detail="Only PDF files are accepted")

    contents = await file.read()
    if len(contents) > settings.get_max_file_size_bytes():
        raise HTTPException(status_code=413, detail="File exceeds maximum size limit")

    user_id = str(current_user["_id"])
    timestamp = int(datetime.utcnow().timestamp())
    safe_filename = f"{user_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(contents)

    extracted_text = extract_text_from_pdf(file_path)
    topics = await extract_topics(extracted_text)

    material = {
        "user_id": user_id,
        "filename": file.filename,
        "file_path": file_path,
        "extracted_text": extracted_text,
        "topics": topics,
        "uploaded_at": datetime.utcnow(),
        "file_size": len(contents),
    }
    result = await db.materials.insert_one(material)

    return MaterialResponse(
        id=str(result.inserted_id),
        filename=file.filename,
        file_size=len(contents),
        uploaded_at=material["uploaded_at"],
        topics=topics,
    )

@router.get("", response_model=List[MaterialResponse])
async def list_materials(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
    page: int = 1,
    limit: int = 20,
    search: str = "",
):
    user_id = str(current_user["_id"])
    skip = (page - 1) * limit
    limit = min(limit, 100)

    query = {"user_id": user_id}
    if search:
        query["filename"] = {"$regex": search, "$options": "i"}

    cursor = db.materials.find(query).sort("uploaded_at", -1).skip(skip).limit(limit)
    materials = []
    async for doc in cursor:
        materials.append(MaterialResponse(
            id=str(doc["_id"]),
            filename=doc["filename"],
            file_size=doc["file_size"],
            uploaded_at=doc["uploaded_at"],
            topics=doc.get("topics", []),
        ))
    return materials

@router.get("/{material_id}/topics")
async def get_material_topics(
    material_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = str(current_user["_id"])
    try:
        obj_id = ObjectId(material_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid material ID")

    material = await db.materials.find_one({"_id": obj_id})
    if not material or material["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Material not found")

    # If topics not yet extracted (old material), extract now and save
    if not material.get("topics"):
        topics = await extract_topics(material["extracted_text"])
        await db.materials.update_one({"_id": obj_id}, {"$set": {"topics": topics}})
    else:
        topics = material["topics"]

    return {"material_id": material_id, "topics": topics}

@router.delete("/{material_id}")
async def delete_material(
    material_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = str(current_user["_id"])
    try:
        obj_id = ObjectId(material_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid material ID")

    material = await db.materials.find_one({"_id": obj_id})
    if not material or material["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Material not found")

    # Delete physical file
    if os.path.exists(material["file_path"]):
        os.remove(material["file_path"])

    # Delete material document
    await db.materials.delete_one({"_id": obj_id})

    # Cascade: delete all quizzes and chat messages for this material
    await db.quizzes.delete_many({"user_id": user_id, "material_id": material_id})
    await db.messages.delete_many({"user_id": user_id, "material_id": material_id})

    return {"message": "Material deleted"}
