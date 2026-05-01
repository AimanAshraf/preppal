from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from datetime import datetime
import os
# import dns.resolver
from pydantic import BaseModel
import httpx
from app.models.user import UserCreate, UserLogin, UserResponse, UpdateProfileRequest, ChangePasswordRequest
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.services.otp_service import store_otp, verify_otp, send_otp_email
# from app.services.otp_service import store_otp, verify_otp, send_otp_email  # commented backup
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


# ── OTP / Email verification ──

class SendOtpRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    code: str


@router.post("/send-otp")
async def send_otp(data: SendOtpRequest, db=Depends(get_database)):
    email = data.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered")
    code = store_otp(email)
    try:
        await send_otp_email(email, code)
    except Exception as e:
        print(f"[OTP] Email send failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send verification email: {str(e)[:120]}")
    return {"message": "Verification code sent"}


@router.post("/verify-otp")
async def verify_otp_endpoint(data: VerifyOtpRequest):
    if not verify_otp(data.email.strip().lower(), data.code.strip()):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    return {"verified": True}

# ── End OTP ──


class GoogleAuthRequest(BaseModel):
    id_token: str


@router.post("/google")
async def google_auth(data: GoogleAuthRequest, db=Depends(get_database)):
    """Verify Firebase ID token and sign in / register the user."""
    # Verify token with Google's public keys via Firebase
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys",
        )
    # Use Firebase's token verification endpoint
    async with httpx.AsyncClient() as client:
        verify_resp = await client.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={settings.FIREBASE_API_KEY}",
            json={"idToken": data.id_token},
        )
        if verify_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        user_info = verify_resp.json().get("users", [{}])[0]

    email = user_info.get("email")
    name = user_info.get("displayName") or email.split("@")[0]
    if not email:
        raise HTTPException(status_code=400, detail="Could not get email from Google account")

    # Find or create user
    user = await db.users.find_one({"email": email})
    if not user:
        now = datetime.utcnow()
        new_user = {
            "email": email,
            "name": name,
            "hashed_password": "",  # no password for OAuth users
            "created_at": now,
            "streak": 0,
            "longest_streak": 0,
            "last_active": None,
            "achievements": [],
            "bio": "",
            "interests": [],
            "auth_provider": "google",
        }
        result = await db.users.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        user = new_user

    token = create_access_token({"sub": email})
    return {"access_token": token, "token_type": "bearer", "user": _user_response(user).dict()}


def _user_response(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"],
        streak=user.get("streak", 0),
        longest_streak=user.get("longest_streak", 0),
        achievements=user.get("achievements", []),
        bio=user.get("bio", "") or "",
        interests=[i for i in (user.get("interests") or []) if isinstance(i, str)],
        avatar_url=user.get("avatar_url"),
    )


@router.post("/register")
async def register(user_data: UserCreate, db=Depends(get_database)):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    hashed = hash_password(user_data.password)
    now = datetime.utcnow()
    new_user = {
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": hashed,
        "created_at": now,
        "streak": 0,
        "longest_streak": 0,
        "last_active": None,
        "achievements": [],
        "bio": "",
        "interests": [],
    }
    result = await db.users.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    token = create_access_token({"sub": user_data.email})
    return {"access_token": token, "token_type": "bearer", "user": _user_response(new_user).dict()}


@router.post("/login")
async def login(user_data: UserLogin, db=Depends(get_database)):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token({"sub": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": _user_response(user).dict()}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return _user_response(current_user)


@router.put("/profile")
async def update_profile(
    data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "name": data.name.strip(),
            "bio": data.bio or "",
            "interests": data.interests or [],
        }}
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return _user_response(updated).dict()


@router.put("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    if not verify_password(data.current_password, current_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"hashed_password": hash_password(data.new_password)}}
    )
    return {"message": "Password updated successfully"}


@router.delete("/account")
async def delete_account(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = str(current_user["_id"])

    # Delete all user uploads from disk
    async for material in db.materials.find({"user_id": user_id}):
        if material.get("file_path") and os.path.exists(material["file_path"]):
            os.remove(material["file_path"])

    # Delete avatar if exists
    avatar_url = current_user.get("avatar_url")
    if avatar_url:
        avatar_path = avatar_url.lstrip("/")
        if os.path.exists(avatar_path):
            os.remove(avatar_path)

    # Cascade delete all user data
    await db.materials.delete_many({"user_id": user_id})
    await db.quizzes.delete_many({"user_id": user_id})
    await db.messages.delete_many({"user_id": user_id})
    await db.progress.delete_many({"user_id": user_id})
    await db.users.delete_one({"_id": current_user["_id"]})

    return {"message": "Account deleted"}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=422, detail="Only JPEG, PNG, WebP or GIF images are accepted")

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be under 2MB")

    user_id = str(current_user["_id"])
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    filename = f"avatar_{user_id}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(contents)

    avatar_url = f"/uploads/{filename}"
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"avatar_url": avatar_url}}
    )
    return {"avatar_url": avatar_url}


@router.delete("/avatar")
async def remove_avatar(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    old_url = current_user.get("avatar_url")
    if old_url:
        old_path = old_url.lstrip("/").replace("uploads/", settings.UPLOAD_DIR + "/", 1)
        if os.path.exists(old_path):
            os.remove(old_path)
    await db.users.update_one({"_id": current_user["_id"]}, {"$unset": {"avatar_url": ""}})
    return {"message": "Avatar removed"}
