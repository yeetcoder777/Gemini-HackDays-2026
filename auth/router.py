from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from bson import ObjectId
import traceback

from .database import users_collection
from .models import UserRegister, UserLogin, UserResponse, UserPreferencesUpdate, Token
from .utils import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


@router.post("/register", response_model=Token)
async def register(user: UserRegister):
    """Register a new user."""
    try:
        # Check if email already exists
        existing_user = await users_collection.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Check if username already exists
        existing_username = await users_collection.find_one({"username": user.username})
        if existing_username:
            raise HTTPException(status_code=400, detail="Username already taken")

        # Create user document
        user_doc = {
            "email": user.email,
            "password_hash": hash_password(user.password),
            "username": user.username,
            "preferences": {
                "ai_role": "assistant",
                "avatar_gender": "female"
            },
            "created_at": datetime.utcnow(),
            "last_login": datetime.utcnow(),
            "is_active": True
        }

        # Insert into database
        result = await users_collection.insert_one(user_doc)
        user_id = str(result.inserted_id)

        # Create access token
        access_token = create_access_token(user_id, user.email)

        return Token(
            access_token=access_token,
            user=UserResponse(
                id=user_id,
                email=user.email,
                username=user.username,
                ai_role="assistant",
                avatar_gender="female"
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    """Login an existing user."""
    # Find user by email
    db_user = await users_collection.find_one({"email": user.email})

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password
    if not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check if user is active
    if not db_user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")

    # Update last login
    await users_collection.update_one(
        {"_id": db_user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )

    user_id = str(db_user["_id"])
    access_token = create_access_token(user_id, user.email)

    preferences = db_user.get("preferences", {})

    return Token(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=db_user["email"],
            username=db_user["username"],
            ai_role=preferences.get("ai_role", "assistant"),
            avatar_gender=preferences.get("avatar_gender", "female")
        )
    )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user's profile."""
    user = await users_collection.find_one({"_id": ObjectId(current_user["sub"])})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    preferences = user.get("preferences", {})

    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        ai_role=preferences.get("ai_role", "assistant"),
        avatar_gender=preferences.get("avatar_gender", "female")
    )


@router.put("/preferences", response_model=UserResponse)
async def update_preferences(
    preferences: UserPreferencesUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user preferences (ai_role, avatar_gender)."""
    update_data = {}

    if preferences.ai_role:
        if preferences.ai_role not in ["teacher", "companion", "assistant"]:
            raise HTTPException(status_code=400, detail="Invalid ai_role. Must be teacher, companion, or assistant")
        update_data["preferences.ai_role"] = preferences.ai_role

    if preferences.avatar_gender:
        if preferences.avatar_gender not in ["male", "female"]:
            raise HTTPException(status_code=400, detail="Invalid avatar_gender. Must be male or female")
        update_data["preferences.avatar_gender"] = preferences.avatar_gender

    if update_data:
        await users_collection.update_one(
            {"_id": ObjectId(current_user["sub"])},
            {"$set": update_data}
        )

    # Return updated user
    user = await users_collection.find_one({"_id": ObjectId(current_user["sub"])})
    prefs = user.get("preferences", {})

    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        ai_role=prefs.get("ai_role", "assistant"),
        avatar_gender=prefs.get("avatar_gender", "female")
    )
