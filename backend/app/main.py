from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import connect_db, close_db, get_database, create_indexes
from app.config import settings
from app.routers import auth, materials, quiz, chat, progress
import traceback

from fastapi import Request
from fastapi.responses import JSONResponse
app = FastAPI(title="PrepPal API")
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__}
    )


# CORS - Development configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(materials.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(progress.router, prefix="/api")

# Ensure uploads directory exists before mounting
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.on_event("startup")
async def startup_event():
    try:
        await connect_db()
        db = await get_database()
        # Verify connection with timeout
        await db.command("ping")
        print("✅ Connected to MongoDB")
        # Create indexes
        await create_indexes(db)
        print("✅ MongoDB indexes created")
    except Exception as e:
        print(f"⚠️  Warning: Could not connect to MongoDB during startup: {type(e).__name__}")
        print(f"   The app will continue to run, but database operations may fail.")
        print(f"   Error: {str(e)[:100]}")


@app.on_event("shutdown")
async def shutdown_event():
    await close_db()


@app.get("/")
async def root():
    return {"message": "PrepPal API is running"}
