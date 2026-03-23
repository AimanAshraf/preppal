from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from app.models.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.database import get_database
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db=Depends(get_database)):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

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
    }

    result = await db.users.insert_one(new_user)
    new_user["_id"] = str(result.inserted_id)

    token = create_access_token({"sub": user_data.email})

    user_response = UserResponse(
        id=new_user["_id"],
        email=new_user["email"],
        name=new_user["name"],
        created_at=new_user["created_at"],
        streak=new_user["streak"],
        longest_streak=new_user["longest_streak"],
        achievements=new_user["achievements"],
    )
    return TokenResponse(access_token=token, user=user_response)


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db=Depends(get_database)):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": user["email"]})
    user_response = UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"],
        streak=user.get("streak", 0),
        longest_streak=user.get("longest_streak", 0),
        achievements=user.get("achievements", []),
    )
    return TokenResponse(access_token=token, user=user_response)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["_id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"],
        streak=current_user.get("streak", 0),
        longest_streak=current_user.get("longest_streak", 0),
        achievements=current_user.get("achievements", []),
    )