from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import bcrypt
import base64
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = "crewz_nation_secret_key_2025"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="CrewZNatioN API", description="Automotive Social Media Platform")

# Create API router
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ===== MODELS =====
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    full_name: str
    bio: Optional[str] = ""
    profile_image: Optional[str] = ""  # base64
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    vehicles_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Vehicle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    make: str
    model: str
    year: int
    type: str  # "car" or "motorcycle"
    color: Optional[str] = ""
    description: Optional[str] = ""
    images: List[str] = []  # base64 images
    modifications: Optional[str] = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VehicleCreate(BaseModel):
    make: str
    model: str
    year: int
    type: str
    color: Optional[str] = ""
    description: Optional[str] = ""
    modifications: Optional[str] = ""

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    vehicle_id: Optional[str] = None
    caption: str
    images: List[str] = []  # base64 images
    likes_count: int = 0
    comments_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PostCreate(BaseModel):
    vehicle_id: Optional[str] = None
    caption: str
    images: List[str] = []

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    user_id: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Like(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

# ===== HELPER FUNCTIONS =====
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"user_id": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===== AUTH ROUTES =====
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"$or": [{"email": user_data.email}, {"username": user_data.username}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email or username already exists")
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_access_token(user.id)
    
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=user
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(login_data: UserLogin):
    # Find user
    user_data = await db.users.find_one({"email": login_data.email})
    if not user_data or not verify_password(login_data.password, user_data["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create user object
    user_data.pop("password")  # Remove password from response
    user = User(**user_data)
    
    # Create token
    token = create_access_token(user.id)
    
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=user
    )

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user_id: str = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": current_user_id})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data.pop("password", None)
    return User(**user_data)

# ===== USER ROUTES =====
@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user_data = await db.users.find_one({"id": user_id})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data.pop("password", None)
    return User(**user_data)

@api_router.put("/users/profile")
async def update_profile(
    full_name: Optional[str] = None,
    bio: Optional[str] = None,
    profile_image: Optional[str] = None,
    current_user_id: str = Depends(get_current_user)
):
    update_data = {}
    if full_name is not None:
        update_data["full_name"] = full_name
    if bio is not None:
        update_data["bio"] = bio
    if profile_image is not None:
        update_data["profile_image"] = profile_image
    
    if update_data:
        await db.users.update_one({"id": current_user_id}, {"$set": update_data})
    
    return {"message": "Profile updated successfully"}

# ===== VEHICLE ROUTES =====
@api_router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    current_user_id: str = Depends(get_current_user)
):
    vehicle = Vehicle(**vehicle_data.dict(), user_id=current_user_id)
    await db.vehicles.insert_one(vehicle.dict())
    
    # Update user's vehicle count
    await db.users.update_one(
        {"id": current_user_id},
        {"$inc": {"vehicles_count": 1}}
    )
    
    return vehicle

@api_router.get("/vehicles/my", response_model=List[Vehicle])
async def get_my_vehicles(current_user_id: str = Depends(get_current_user)):
    vehicles = await db.vehicles.find({"user_id": current_user_id}).to_list(100)
    return [Vehicle(**vehicle) for vehicle in vehicles]

@api_router.get("/vehicles/user/{user_id}", response_model=List[Vehicle])
async def get_user_vehicles(user_id: str):
    vehicles = await db.vehicles.find({"user_id": user_id}).to_list(100)
    return [Vehicle(**vehicle) for vehicle in vehicles]

@api_router.put("/vehicles/{vehicle_id}")
async def update_vehicle(
    vehicle_id: str,
    vehicle_data: VehicleCreate,
    current_user_id: str = Depends(get_current_user)
):
    # Check ownership
    vehicle = await db.vehicles.find_one({"id": vehicle_id, "user_id": current_user_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found or not owned by user")
    
    await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": vehicle_data.dict()}
    )
    
    return {"message": "Vehicle updated successfully"}

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: str,
    current_user_id: str = Depends(get_current_user)
):
    # Check ownership
    result = await db.vehicles.delete_one({"id": vehicle_id, "user_id": current_user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found or not owned by user")
    
    # Update user's vehicle count
    await db.users.update_one(
        {"id": current_user_id},
        {"$inc": {"vehicles_count": -1}}
    )
    
    return {"message": "Vehicle deleted successfully"}

class VehicleImageAdd(BaseModel):
    image_base64: str

@api_router.post("/vehicles/{vehicle_id}/images")
async def add_vehicle_image(
    vehicle_id: str,
    image_data: VehicleImageAdd,
    current_user_id: str = Depends(get_current_user)
):
    # Check ownership
    vehicle = await db.vehicles.find_one({"id": vehicle_id, "user_id": current_user_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found or not owned by user")
    
    # Add image to vehicle
    await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$push": {"images": image_data.image_base64}}
    )
    
    return {"message": "Image added successfully"}

# ===== POST ROUTES =====
@api_router.post("/posts", response_model=Post)
async def create_post(
    post_data: PostCreate,
    current_user_id: str = Depends(get_current_user)
):
    post = Post(**post_data.dict(), user_id=current_user_id)
    await db.posts.insert_one(post.dict())
    
    # Update user's posts count
    await db.users.update_one(
        {"id": current_user_id},
        {"$inc": {"posts_count": 1}}
    )
    
    return post

@api_router.get("/posts/feed", response_model=List[dict])
async def get_feed(
    limit: int = 20,
    skip: int = 0,
    current_user_id: str = Depends(get_current_user)
):
    # Get posts with user info
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "id",
                "as": "user"
            }
        },
        {
            "$lookup": {
                "from": "vehicles",
                "localField": "vehicle_id",
                "foreignField": "id",
                "as": "vehicle"
            }
        },
        {
            "$project": {
                "_id": 0,  # Exclude MongoDB _id
                "id": 1,
                "user_id": 1,
                "vehicle_id": 1,
                "caption": 1,
                "images": 1,
                "likes_count": 1,
                "comments_count": 1,
                "created_at": 1,
                "user": {
                    "$let": {
                        "vars": {"user": {"$arrayElemAt": ["$user", 0]}},
                        "in": {
                            "id": "$$user.id",
                            "username": "$$user.username",
                            "full_name": "$$user.full_name",
                            "profile_image": "$$user.profile_image"
                        }
                    }
                },
                "vehicle": {
                    "$let": {
                        "vars": {"vehicle": {"$arrayElemAt": ["$vehicle", 0]}},
                        "in": {
                            "$cond": {
                                "if": {"$ne": ["$$vehicle", None]},
                                "then": {
                                    "id": "$$vehicle.id",
                                    "make": "$$vehicle.make",
                                    "model": "$$vehicle.model",
                                    "year": "$$vehicle.year",
                                    "type": "$$vehicle.type",
                                    "color": "$$vehicle.color"
                                },
                                "else": None
                            }
                        }
                    }
                }
            }
        }
    ]
    
    posts = await db.posts.aggregate(pipeline).to_list(limit)
    return posts

@api_router.get("/posts/user/{user_id}", response_model=List[Post])
async def get_user_posts(user_id: str, limit: int = 20, skip: int = 0):
    posts = await db.posts.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Post(**post) for post in posts]

# ===== LIKE ROUTES =====
@api_router.post("/posts/{post_id}/like")
async def toggle_like(
    post_id: str,
    current_user_id: str = Depends(get_current_user)
):
    # Check if already liked
    existing_like = await db.likes.find_one({"post_id": post_id, "user_id": current_user_id})
    
    if existing_like:
        # Unlike
        await db.likes.delete_one({"post_id": post_id, "user_id": current_user_id})
        await db.posts.update_one({"id": post_id}, {"$inc": {"likes_count": -1}})
        return {"message": "Post unliked", "liked": False}
    else:
        # Like
        like = Like(post_id=post_id, user_id=current_user_id)
        await db.likes.insert_one(like.dict())
        await db.posts.update_one({"id": post_id}, {"$inc": {"likes_count": 1}})
        return {"message": "Post liked", "liked": True}

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()