from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import requests
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security setup
SECRET_KEY = "crewz-nation-secret-key-2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    email: str  # This will accept both email and username
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    username: str
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    session_token: Optional[str] = None

class PostCreate(BaseModel):
    image: Optional[str] = None  # base64 encoded
    video: Optional[str] = None  # video file path or data
    caption: Optional[str] = ""
    tagged_users: Optional[List[str]] = []
    type: Optional[str] = "post"  # post, story, reel

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    image: Optional[str] = None
    video: Optional[str] = None
    caption: str = ""
    likes: int = 0
    comments: int = 0
    tagged_users: List[str] = []
    type: str = "post"  # post, story, reel
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # for stories

class Story(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    image: Optional[str] = None
    video: Optional[str] = None
    duration: int = 5  # seconds
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=24))

class Reel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    video: str
    caption: str = ""
    likes: int = 0
    comments: int = 0
    views: int = 0
    tagged_users: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LiveStream(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str = ""
    is_active: bool = True
    viewers: int = 0
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

class Vehicle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    make: str
    model: str
    year: int
    type: str  # sedan, suv, coupe, etc.
    engine: Optional[str] = None
    horsepower: Optional[int] = None
    torque: Optional[str] = None
    transmission: Optional[str] = None
    fuel_type: Optional[str] = None
    image: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    date: datetime
    location: str
    organizer_id: str
    attendees: List[str] = []
    invited_users: List[str] = []  # for private events
    image: Optional[str] = None
    is_private: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    receiver_id: str
    content: str
    message_type: str = "text"  # text, image, video
    media_url: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    message_type: str = "text"
    media_url: Optional[str] = None

class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user1_id: str
    user2_id: str
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    user1_unread_count: int = 0
    user2_unread_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Authentication Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username
        }
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    # Check if input is email or username
    if "@" in user_data.email:
        # It's an email
        user = await db.users.find_one({"email": user_data.email})
    else:
        # It's a username
        user = await db.users.find_one({"username": user_data.email})
    
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email/username or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"]
        }
    }

# Emergent Authentication
@api_router.get("/auth/session")
async def get_session_data(x_session_id: str = Header(...)):
    try:
        response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": x_session_id}
        )
        
        if response.status_code == 200:
            session_data = response.json()
            
            # Check if user exists, if not create one
            user = await db.users.find_one({"email": session_data["email"]})
            if not user:
                new_user = User(
                    email=session_data["email"],
                    username=session_data["name"] or session_data["email"].split("@")[0],
                    profile_picture=session_data.get("picture"),
                    session_token=session_data["session_token"]
                )
                await db.users.insert_one(new_user.dict())
                user = new_user.dict()
            else:
                # Update session token
                await db.users.update_one(
                    {"email": session_data["email"]},
                    {"$set": {"session_token": session_data["session_token"]}}
                )
            
            return {
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "username": user["username"],
                    "profile_picture": user.get("profile_picture")
                },
                "session_token": session_data["session_token"]
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid session")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Session validation failed")

# User Routes
@api_router.get("/users/search")
async def search_users(current_user: dict = Depends(get_current_user), q: str = ""):
    # Search for users by username or email
    if q:
        users = await db.users.find({
            "$or": [
                {"username": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}}
            ]
        }).limit(20).to_list(20)
    else:
        # Return all users if no query (for tagging)
        users = await db.users.find().limit(20).to_list(20)
    
    # Return simplified user data for tagging
    return [
        {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "profile_picture": user.get("profile_picture")
        }
        for user in users
        if user["id"] != current_user["id"]  # Exclude current user
    ]

# Posts Routes
@api_router.get("/posts/feed")
async def get_feed(current_user: dict = Depends(get_current_user)):
    posts = await db.posts.find().sort("created_at", -1).limit(50).to_list(50)
    
    # Populate user and vehicle data
    feed_posts = []
    for post in posts:
        user = await db.users.find_one({"id": post["user_id"]})
        vehicle_data = None
        if post.get("vehicle_id"):
            vehicle_data = await db.vehicles.find_one({"id": post["vehicle_id"]})
        
        feed_post = {
            "_id": post["id"],
            "user": {
                "username": user["username"] if user else "Unknown",
                "profilePicture": user.get("profile_picture") if user else None
            },
            "image": post["image"],
            "caption": post["caption"],
            "likes": post["likes"],
            "comments": post["comments"],
            "createdAt": post["created_at"].isoformat(),
            "vehicle": {
                "make": vehicle_data["make"],
                "model": vehicle_data["model"],
                "year": vehicle_data["year"]
            } if vehicle_data else None
        }
        feed_posts.append(feed_post)
    
    return feed_posts

@api_router.post("/posts")
async def create_post(post_data: PostCreate, current_user: dict = Depends(get_current_user)):
    post = Post(
        user_id=current_user["id"],
        image=post_data.image,
        video=post_data.video,
        caption=post_data.caption or "",
        tagged_users=post_data.tagged_users or [],
        type=post_data.type or "post"
    )
    
    # Set expiration for stories (24 hours)
    if post_data.type == "story":
        post.expires_at = datetime.utcnow() + timedelta(hours=24)
    
    await db.posts.insert_one(post.dict())
    return {"message": f"{post_data.type or 'Post'} created successfully", "post_id": post.id}

# Stories Routes
@api_router.post("/stories")
async def create_story(story_data: dict, current_user: dict = Depends(get_current_user)):
    story = Story(
        user_id=current_user["id"],
        image=story_data.get("image"),
        video=story_data.get("video"),
        duration=story_data.get("duration", 5)
    )
    
    await db.stories.insert_one(story.dict())
    return {"message": "Story created successfully", "story_id": story.id}

@api_router.get("/stories")
async def get_stories(current_user: dict = Depends(get_current_user)):
    # Get active stories (not expired)
    current_time = datetime.utcnow()
    stories = await db.stories.find({
        "expires_at": {"$gt": current_time}
    }).sort("created_at", -1).to_list(50)
    
    # Populate user data
    story_list = []
    for story in stories:
        user = await db.users.find_one({"id": story["user_id"]})
        story_data = {
            "id": story["id"],
            "user": {
                "username": user["username"] if user else "Unknown",
                "profile_picture": user.get("profile_picture") if user else None
            },
            "image": story.get("image"),
            "video": story.get("video"),
            "duration": story["duration"],
            "views": story["views"],
            "created_at": story["created_at"].isoformat()
        }
        story_list.append(story_data)
    
    return story_list

# Reels Routes
@api_router.post("/reels")
async def create_reel(reel_data: dict, current_user: dict = Depends(get_current_user)):
    reel = Reel(
        user_id=current_user["id"],
        video=reel_data["video"],
        caption=reel_data.get("caption", ""),
        tagged_users=reel_data.get("tagged_users", [])
    )
    
    await db.reels.insert_one(reel.dict())
    return {"message": "Reel created successfully", "reel_id": reel.id}

@api_router.get("/reels")
async def get_reels(current_user: dict = Depends(get_current_user)):
    reels = await db.reels.find().sort("created_at", -1).limit(50).to_list(50)
    
    # Populate user data
    reel_list = []
    for reel in reels:
        user = await db.users.find_one({"id": reel["user_id"]})
        reel_data = {
            "id": reel["id"],
            "user": {
                "username": user["username"] if user else "Unknown",
                "profile_picture": user.get("profile_picture") if user else None
            },
            "video": reel["video"],
            "caption": reel["caption"],
            "likes": reel["likes"],
            "comments": reel["comments"],
            "views": reel["views"],
            "created_at": reel["created_at"].isoformat()
        }
        reel_list.append(reel_data)
    
    return reel_list

# Live Stream Routes
@api_router.post("/live")
async def start_live_stream(live_data: dict, current_user: dict = Depends(get_current_user)):
    live_stream = LiveStream(
        user_id=current_user["id"],
        title=live_data["title"],
        description=live_data.get("description", "")
    )
    
    await db.live_streams.insert_one(live_stream.dict())
    return {"message": "Live stream started", "stream_id": live_stream.id}

@api_router.get("/live")
async def get_active_streams():
    streams = await db.live_streams.find({"is_active": True}).sort("started_at", -1).to_list(20)
    
    # Populate user data
    stream_list = []
    for stream in streams:
        user = await db.users.find_one({"id": stream["user_id"]})
        stream_data = {
            "id": stream["id"],
            "user": {
                "username": user["username"] if user else "Unknown",
                "profile_picture": user.get("profile_picture") if user else None
            },
            "title": stream["title"],
            "description": stream["description"],
            "viewers": stream["viewers"],
            "started_at": stream["started_at"].isoformat()
        }
        stream_list.append(stream_data)
    
    return stream_list

@api_router.post("/live/{stream_id}/end")
async def end_live_stream(stream_id: str, current_user: dict = Depends(get_current_user)):
    await db.live_streams.update_one(
        {"id": stream_id, "user_id": current_user["id"]},
        {"$set": {"is_active": False, "ended_at": datetime.utcnow()}}
    )
    return {"message": "Live stream ended"}

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Update likes count
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"likes": 1}}
    )
    
    return {"message": "Post liked successfully"}

# Vehicle Routes
@api_router.get("/vehicles")
async def get_vehicles(make: Optional[str] = None, year: Optional[int] = None):
    query = {}
    if make:
        query["make"] = {"$regex": make, "$options": "i"}
    if year:
        query["year"] = year
    
    vehicles = await db.vehicles.find(query, {"_id": 0}).limit(100).to_list(100)
    return vehicles

@api_router.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

# Events Routes
@api_router.get("/events")
async def get_events(current_user: dict = Depends(get_current_user)):
    # Get public events and private events where user is invited
    events = await db.events.find({
        "$or": [
            {"is_private": False},  # Public events
            {"invited_users": current_user["id"]},  # Private events where user is invited
            {"organizer_id": current_user["id"]}  # Events organized by user
        ]
    }).sort("date", 1).to_list(100)
    
    # Add privacy indicator and invitation status
    event_list = []
    for event in events:
        event_data = event.copy()
        event_data["can_join"] = not event["is_private"] or current_user["id"] in event["invited_users"]
        event_data["is_invited"] = current_user["id"] in event.get("invited_users", [])
        event_list.append(event_data)
    
    return event_list

@api_router.post("/events")
async def create_event(event_data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    event = Event(
        title=event_data["title"],
        description=event_data["description"],
        date=datetime.fromisoformat(event_data["date"]),
        location=event_data["location"],
        organizer_id=current_user["id"],
        image=event_data.get("image"),
        is_private=event_data.get("is_private", False),
        invited_users=event_data.get("invited_users", [])
    )
    
    await db.events.insert_one(event.dict())
    return {"message": "Event created successfully", "event_id": event.id}

@api_router.post("/events/{event_id}/invite")
async def invite_to_event(event_id: str, invite_data: dict, current_user: dict = Depends(get_current_user)):
    # Only event organizer can invite users
    event = await db.events.find_one({"id": event_id, "organizer_id": current_user["id"]})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or you're not the organizer")
    
    user_ids = invite_data.get("user_ids", [])
    await db.events.update_one(
        {"id": event_id},
        {"$addToSet": {"invited_users": {"$each": user_ids}}}
    )
    
    return {"message": f"Invited {len(user_ids)} users to the event"}

@api_router.post("/events/{event_id}/join")
async def join_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if user can join (public event or invited to private event)
    if event["is_private"] and current_user["id"] not in event.get("invited_users", []):
        raise HTTPException(status_code=403, detail="This is a private event and you're not invited")
    
    # Add user to attendees
    await db.events.update_one(
        {"id": event_id},
        {"$addToSet": {"attendees": current_user["id"]}}
    )
    
    return {"message": "Successfully joined the event"}

# Initialize sample vehicles data
@api_router.post("/init/vehicles")
async def initialize_vehicles():
    # Check if vehicles already exist
    existing_count = await db.vehicles.count_documents({})
    if existing_count > 0:
        return {"message": f"Vehicles already initialized ({existing_count} vehicles)"}
    
    # Sample vehicle data - this would be much more comprehensive in production
    sample_vehicles = [
        # BMW
        {"make": "BMW", "model": "M3", "year": 2023, "type": "sedan", "horsepower": 473, "engine": "3.0L Twin-Turbo I6"},
        {"make": "BMW", "model": "M4", "year": 2023, "type": "coupe", "horsepower": 473, "engine": "3.0L Twin-Turbo I6"},
        {"make": "BMW", "model": "X5 M", "year": 2023, "type": "suv", "horsepower": 617, "engine": "4.4L Twin-Turbo V8"},
        
        # Mercedes-Benz
        {"make": "Mercedes-Benz", "model": "AMG GT", "year": 2023, "type": "coupe", "horsepower": 523, "engine": "4.0L Twin-Turbo V8"},
        {"make": "Mercedes-Benz", "model": "C63 AMG", "year": 2023, "type": "sedan", "horsepower": 503, "engine": "4.0L Twin-Turbo V8"},
        {"make": "Mercedes-Benz", "model": "G63 AMG", "year": 2023, "type": "suv", "horsepower": 577, "engine": "4.0L Twin-Turbo V8"},
        
        # Ferrari
        {"make": "Ferrari", "model": "F8 Tributo", "year": 2023, "type": "coupe", "horsepower": 710, "engine": "3.9L Twin-Turbo V8"},
        {"make": "Ferrari", "model": "SF90 Stradale", "year": 2023, "type": "coupe", "horsepower": 986, "engine": "4.0L Twin-Turbo V8 + Electric"},
        {"make": "Ferrari", "model": "Roma", "year": 2023, "type": "coupe", "horsepower": 612, "engine": "3.9L Twin-Turbo V8"},
        
        # Lamborghini
        {"make": "Lamborghini", "model": "Huracán", "year": 2023, "type": "coupe", "horsepower": 630, "engine": "5.2L V10"},
        {"make": "Lamborghini", "model": "Aventador", "year": 2023, "type": "coupe", "horsepower": 769, "engine": "6.5L V12"},
        
        # Porsche
        {"make": "Porsche", "model": "911 Turbo S", "year": 2023, "type": "coupe", "horsepower": 640, "engine": "3.8L Twin-Turbo Flat-6"},
        {"make": "Porsche", "model": "Cayenne Turbo", "year": 2023, "type": "suv", "horsepower": 541, "engine": "4.0L Twin-Turbo V8"},
        
        # Audi
        {"make": "Audi", "model": "RS6 Avant", "year": 2023, "type": "wagon", "horsepower": 591, "engine": "4.0L Twin-Turbo V8"},
        {"make": "Audi", "model": "R8 V10", "year": 2023, "type": "coupe", "horsepower": 562, "engine": "5.2L V10"},
    ]
    
    # Add vehicle objects with proper structure
    vehicles_to_insert = []
    for vehicle_data in sample_vehicles:
        vehicle = Vehicle(**vehicle_data)
        vehicles_to_insert.append(vehicle.dict())
    
    await db.vehicles.insert_many(vehicles_to_insert)
    return {"message": f"Initialized {len(vehicles_to_insert)} vehicles"}

# Include the router in the main app
app.include_router(api_router)

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