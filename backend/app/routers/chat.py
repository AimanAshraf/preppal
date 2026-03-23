from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.services.gemini_service import chat_response

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    material_id: str
    conversation_history: List[ChatMessage] = []


@router.post("/message")
async def send_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]

    # Get material context
    try:
        material = await db.materials.find_one(
            {"_id": ObjectId(request.material_id), "user_id": user_id}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid material ID")

    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    history = [msg.dict() for msg in request.conversation_history]

    # Get AI response
    response_text = await chat_response(
        message=request.message,
        context_text=material["extracted_text"],
        history=history,
    )

    # Store messages
    now = datetime.utcnow()
    await db.messages.insert_many([
        {
            "user_id": user_id,
            "material_id": request.material_id,
            "role": "user",
            "content": request.message,
            "created_at": now,
        },
        {
            "user_id": user_id,
            "material_id": request.material_id,
            "role": "assistant",
            "content": response_text,
            "created_at": now,
        },
    ])

    return {"response": response_text}


@router.get("/history/{material_id}")
async def get_chat_history(
    material_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]
    cursor = db.messages.find(
        {"user_id": user_id, "material_id": material_id}
    ).sort("created_at", 1).limit(100)

    messages = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        messages.append(doc)
    return messages
