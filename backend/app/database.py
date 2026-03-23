from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None


# async def connect_db():
#     global client
#     client = AsyncIOMotorClient(settings.MONGO_URI)
async def connect_db():
    global client
    client = AsyncIOMotorClient(
        settings.MONGO_URI,
        serverSelectionTimeoutMS=5000
    )
    # Force immediate connection attempt
    await client.admin.command("ping")
    print(f"✅ URI being used: {settings.MONGO_URI[:40]}...")

async def close_db():
    global client
    if client:
        client.close()


async def get_database():
    db = client[settings.DB_NAME]
    return db


async def create_indexes(db):
    """Create MongoDB indexes on startup."""
    await db.users.create_index("email", unique=True)
    await db.materials.create_index("user_id")
    await db.quizzes.create_index("user_id")
    await db.quizzes.create_index([("user_id", 1), ("created_at", -1)])
    await db.messages.create_index([("user_id", 1), ("material_id", 1)])
    await db.progress.create_index("user_id", unique=True)
