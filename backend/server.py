from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import logging
import asyncio
import json
from urllib.request import Request, urlopen
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import Dict, List, Optional, Set
import uuid
from datetime import datetime, timezone, timedelta
import re
import jwt
from passlib.context import CryptContext
import resend
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend setup
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
RECIPIENT_EMAIL = os.environ.get('RECIPIENT_EMAIL', 'aquilareale.mz@gmail.com')

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'pokemon-academy-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Admin credentials
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'aquilareale.mz@gmail.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Init1234')

# Password hashing
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

BCRYPT_MAX_BYTES = 72

# Security
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: str
    is_admin: bool = False

class ProfileUpdate(BaseModel):
    age: Optional[int] = Field(default=None, ge=0, le=120)
    savings: str = Field(default="", max_length=100)
    profile_image: Optional[str] = None
    mind: str = Field(default="", max_length=500)
    body: str = Field(default="", max_length=500)
    space: str = Field(default="", max_length=500)
    luck: str = Field(default="", max_length=500)

class MedalAssign(BaseModel):
    user_ids: List[str] = Field(min_length=1)
    name: str = Field(min_length=1, max_length=80)
    image: str

class InventoryItemAdd(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    display_name: str = Field(min_length=1, max_length=150)
    sprite: Optional[str] = None

class InventoryQuantityUpdate(BaseModel):
    delta: int = Field(ge=-1, le=1)

class AdminInventoryQuantity(BaseModel):
    quantity: int = Field(strict=True, ge=0, le=999)

class PokemonEvolution(BaseModel):
    pokemon_id: int = Field(strict=True, ge=1)

class ActiveTeamUpdate(BaseModel):
    pokemon_ids: List[str] = Field(max_length=3)

class AdminInventoryAssign(InventoryItemAdd):
    user_ids: List[str] = Field(min_length=1)
    quantity: int = Field(default=1, ge=1, le=999)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool = True

class NewsItem(BaseModel):
    id: str
    title: str
    description: str
    news_type: str  # questionnaire, announcement, event
    is_active: bool = True
    created_at: str
    size: str = "normal"  # normal, large, hero

class NewsCreate(BaseModel):
    title: str
    description: str
    news_type: str
    size: str = "normal"

class QuizAnswer(BaseModel):
    question_number: int
    answer: str

class QuizSubmit(BaseModel):
    answers: List[QuizAnswer]

class QuizResult(BaseModel):
    profile_name: str
    profile_type: str
    description: str

class PokemonAssign(BaseModel):
    pokemon_id: int
    pokemon_name: str

class LearnedMove(BaseModel):
    name: str
    englishName: str
    type: str
    power: Optional[int] = None
    accuracy: Optional[int] = None
    pp: Optional[int] = None
    damageClass: str
    level: Optional[int] = None
    tmNumber: Optional[str] = None

class HeldItem(BaseModel):
    name: str
    display_name: str
    sprite: Optional[str] = None

class PokemonUpdate(BaseModel):
    ability: Optional[str] = Field(default=None, min_length=1, max_length=100)
    nickname: Optional[str] = None
    level: Optional[int] = None
    learned_moves: Optional[List[Optional[LearnedMove]]] = None
    held_item: Optional[HeldItem] = None

class UserPokemon(BaseModel):
    ability: Optional[str] = None
    id: str
    user_id: str
    pokemon_id: int
    pokemon_name: str
    nickname: Optional[str] = None
    level: Optional[int] = None
    held_item: Optional[HeldItem] = None
    assigned_at: str

class DirectConversationCreate(BaseModel):
    user_id: str = Field(min_length=1)

class GroupConversationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    member_ids: List[str] = Field(default_factory=list, max_length=49)

class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

class GroupMembersAdd(BaseModel):
    user_ids: List[str] = Field(min_length=1, max_length=49)

class GroupNameUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)

# ============== HELPER FUNCTIONS ==============


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")

    if len(password_bytes) > BCRYPT_MAX_BYTES:
        raise ValueError("Password too long (max 72 bytes for bcrypt)")

    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")

    if len(password_bytes) > BCRYPT_MAX_BYTES:
        return False  # evita crash su login

    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str, is_admin: bool = False) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "is_admin": is_admin,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        is_admin = payload.get("is_admin", False)
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Token non valido")
        
        # Check if it's admin token
        if is_admin and user_id == "admin":
            return {"id": "admin", "username": "Admin", "email": ADMIN_EMAIL, "is_admin": True, "created_at": datetime.now(timezone.utc).isoformat()}
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        user["is_admin"] = False
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify user is admin"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        is_admin = payload.get("is_admin", False)
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
        return {"is_admin": True}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")


class ChatConnectionManager:
    """Keeps track of WebSocket connections for this application instance."""

    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        sockets = self.connections.get(user_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self.connections.pop(user_id, None)

    async def send_to_users(self, user_ids: List[str], payload: dict):
        dead_connections = []
        for user_id in set(user_ids):
            for websocket in list(self.connections.get(user_id, set())):
                try:
                    await websocket.send_json(payload)
                except Exception:
                    dead_connections.append((user_id, websocket))
        for user_id, websocket in dead_connections:
            self.disconnect(user_id, websocket)


chat_connections = ChatConnectionManager()


async def get_chat_conversation(conversation_id: str, user_id: str) -> dict:
    conversation = await db.chat_conversations.find_one(
        {"id": conversation_id, "member_ids": user_id}, {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversazione non trovata")
    return conversation


async def serialize_chat_conversation(conversation: dict, user_id: str) -> dict:
    member_ids = conversation.get("member_ids", [])
    users = await db.users.find(
        {"id": {"$in": member_ids}}, {"_id": 0, "id": 1, "username": 1}
    ).to_list(50)
    members = [
        {
            "id": member["id"],
            "username": member["username"],
        }
        for member in users
    ]

    read_state = await db.chat_reads.find_one(
        {"conversation_id": conversation["id"], "user_id": user_id}, {"_id": 0}
    )
    unread_query = {
        "conversation_id": conversation["id"],
        "sender_id": {"$ne": user_id},
    }
    if read_state and read_state.get("last_read_at"):
        unread_query["created_at"] = {"$gt": read_state["last_read_at"]}
    unread_count = await db.chat_messages.count_documents(unread_query)

    result = {key: value for key, value in conversation.items() if key != "direct_key"}
    result["members"] = members
    result["unread_count"] = unread_count
    if conversation["type"] == "direct":
        other_user = next((member for member in members if member["id"] != user_id), None)
        result["display_name"] = other_user["username"] if other_user else "Conversazione"
        result["image"] = None
    else:
        result["display_name"] = conversation.get("name", "Gruppo")
        result["image"] = None
    return result

def calculate_profile(answers: List[QuizAnswer]) -> QuizResult:
    """Calculate personality profile based on answers"""
    
    # Define answer patterns for each profile
    profiles = {
        "cinico": {
            "answers": {"1a", "2b", "4a", "5d", "6b", "7a", "8b", "9a", "10a"},
            "name": "Allenatore Cinico",
            "type": "Tipo Buio",
            "description": "Stratega diffidente, protegge il cuore dietro l'ironia e il controllo. I suoi Pokémon lo rispettano per la coerenza, non per le parole."
        },
        "empatico": {
            "answers": {"1b", "2a", "3e", "6a", "8a", "9b"},
            "name": "Allenatore Empatico",
            "type": "Tipo Folletto",
            "description": "Guida la squadra con gentilezza. Le creature combattono per legame autentico."
        },
        "ansioso": {
            "answers": {"1c", "2c", "3c", "4c", "5b", "6c", "7b", "8c", "10e"},
            "name": "Allenatore Ansioso",
            "type": "Tipo Psico",
            "description": "Intuitivo e sensibile, ma teme il fallimento. Deve scoprire la propria forza nascosta."
        },
        "aggressivo": {
            "answers": {"1d", "3a", "3d", "5a", "6d", "7d", "8d", "9c", "10c"},
            "name": "Allenatore Aggressivo",
            "type": "Tipo Fuoco/Lotta",
            "description": "Spirito ardente e competitivo. Può diventare grande leader imparando la misura."
        },
        "accondiscendente": {
            "answers": {"1e", "3b", "5e", "6e", "8e", "10d"},
            "name": "Allenatore Accondiscendente",
            "type": "Tipo Normale",
            "description": "Cerca armonia e appartenenza, talvolta dimenticando la propria voce."
        },
        "equilibrato": {
            "answers": {"3e", "5c", "7c", "4b"},
            "name": "Allenatore Equilibrato",
            "type": "Tipo Acciaio",
            "description": "Profilo ideale per l'Accademia: mente lucida, emozioni salde, rispetto per la squadra."
        }
    }
    
    # Convert user answers to set
    user_answers = set()
    for ans in answers:
        user_answers.add(f"{ans.question_number}{ans.answer.lower()}")
    
    # Calculate match scores
    best_match = None
    best_score = 0
    
    for profile_key, profile_data in profiles.items():
        matches = len(user_answers.intersection(profile_data["answers"]))
        if matches > best_score:
            best_score = matches
            best_match = profile_key
    
    # Default to equilibrato if no clear match
    if not best_match or best_score == 0:
        best_match = "equilibrato"
    
    selected_profile = profiles[best_match]
    return QuizResult(
        profile_name=selected_profile["name"],
        profile_type=selected_profile["type"],
        description=selected_profile["description"]
    )

async def send_quiz_email(user_email: str, username: str, answers: List[QuizAnswer], result: QuizResult):
    """Send quiz results via email"""
    
    # Format answers for email
    answers_text = ""
    for ans in sorted(answers, key=lambda x: x.question_number):
        answers_text += f"<li>Domanda {ans.question_number} - Risposta {ans.answer.upper()}</li>"
    
    html_content = f"""
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FDFBF7; border: 3px double #D4AF37;">
        <h1 style="color: #2C3E50; text-align: center; font-size: 24px;">Risultati del Questionario</h1>
        <h2 style="color: #2C3E50; text-align: center; font-size: 18px;">Accademia Pokémon</h2>
        
        <hr style="border: 1px solid #D4AF37; margin: 20px 0;">
        
        <p><strong>Allenatore:</strong> {username}</p>
        <p><strong>Email:</strong> {user_email}</p>
        <p><strong>Data:</strong> {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}</p>
        
        <h3 style="color: #2C3E50; margin-top: 20px;">Risposte:</h3>
        <ul style="list-style-type: none; padding: 0;">
            {answers_text}
        </ul>
        
        <hr style="border: 1px solid #D4AF37; margin: 20px 0;">
        
        <h3 style="color: #8E44AD; text-align: center;">{result.profile_name}</h3>
        <h4 style="color: #C0392B; text-align: center;">{result.profile_type}</h4>
        <p style="text-align: center; font-style: italic; color: #2C3E50;">{result.description}</p>
        
        <div style="text-align: center; margin-top: 30px; color: #8E44AD;">
            <p style="font-size: 12px;">Documento ufficiale dell'Accademia Pokémon</p>
        </div>
    </div>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [RECIPIENT_EMAIL],
        "subject": f"Risultato Questionario - {username} - {result.profile_name}",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent successfully: {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    # Check if username exists
    existing_username = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username già in uso")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create token
    token = create_token(user_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            username=user_data.username,
            email=user_data.email,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    token = create_token(user["id"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user["email"],
        created_at=current_user["created_at"],
        is_admin=current_user.get("is_admin", False)
    )

# ============== PROFILE ROUTES ==============

@api_router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    profile = await db.user_profiles.find_one(
        {"user_id": current_user["id"]}, {"_id": 0}
    )
    medals = await db.user_medals.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("assigned_at", 1).to_list(8)
    return {
        "username": current_user["username"],
        "email": current_user["email"],
        "age": profile.get("age") if profile else None,
        "savings": profile.get("savings", "") if profile else "",
        "profile_image": profile.get("profile_image") if profile else None,
        "mind": profile.get("mind", "") if profile else "",
        "body": profile.get("body", "") if profile else "",
        "space": profile.get("space", "") if profile else "",
        "luck": profile.get("luck", "") if profile else "",
        "medals": medals,
    }

@api_router.put("/profile")
async def update_profile(profile_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    if profile_data.profile_image and len(profile_data.profile_image) > 3_000_000:
        raise HTTPException(status_code=413, detail="Immagine profilo troppo grande")
    values = profile_data.model_dump()
    values["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.user_profiles.update_one(
        {"user_id": current_user["id"]},
        {"$set": values, "$setOnInsert": {"user_id": current_user["id"]}},
        upsert=True,
    )
    return {"message": "Profilo aggiornato"}

# ============== INVENTORY ROUTES ==============

@api_router.get("/inventory")
async def get_inventory(current_user: dict = Depends(get_current_user)):
    return await db.user_inventory.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("display_name", 1).to_list(1000)

@api_router.post("/inventory")
async def add_inventory_item(item: InventoryItemAdd, current_user: dict = Depends(get_current_user)):
    existing = await db.user_inventory.find_one({"user_id": current_user["id"], "name": item.name}, {"_id": 0})
    if existing:
        if existing["quantity"] < 999:
            await db.user_inventory.update_one({"id": existing["id"]}, {"$inc": {"quantity": 1}})
    else:
        document = {
            "id": str(uuid.uuid4()), "user_id": current_user["id"],
            "name": item.name, "display_name": item.display_name,
            "sprite": item.sprite, "quantity": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.user_inventory.insert_one(document)
    return await db.user_inventory.find_one({"user_id": current_user["id"], "name": item.name}, {"_id": 0})

@api_router.patch("/inventory/{item_name}")
async def update_inventory_quantity(item_name: str, update: InventoryQuantityUpdate, current_user: dict = Depends(get_current_user)):
    if update.delta == 0:
        raise HTTPException(status_code=400, detail="Variazione non valida")
    item = await db.user_inventory.find_one({"user_id": current_user["id"], "name": item_name}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Strumento non trovato")
    new_quantity = min(999, item["quantity"] + update.delta)
    if new_quantity <= 0:
        await db.user_inventory.delete_one({"id": item["id"]})
        return {"removed": True}
    await db.user_inventory.update_one({"id": item["id"]}, {"$set": {"quantity": new_quantity}})
    item["quantity"] = new_quantity
    return item

# ============== ADMIN ROUTES ==============

@api_router.post("/admin/login", response_model=AdminTokenResponse)
async def admin_login(credentials: UserLogin):
    """Admin login with hardcoded credentials"""
    if credentials.email != ADMIN_EMAIL or credentials.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Credenziali admin non valide")
    
    token = create_token("admin", is_admin=True)
    
    return AdminTokenResponse(
        access_token=token,
        is_admin=True
    )

@api_router.get("/admin/news", response_model=List[NewsItem])
async def get_all_news_admin(admin: dict = Depends(get_admin_user)):
    """Get all news including inactive ones for admin"""
    news = await db.news.find({}, {"_id": 0}).to_list(100)
    return news

@api_router.post("/admin/news", response_model=NewsItem)
async def create_news_admin(news_data: NewsCreate, admin: dict = Depends(get_admin_user)):
    """Create news as admin"""
    news_doc = {
        "id": str(uuid.uuid4()),
        "title": news_data.title,
        "description": news_data.description,
        "news_type": news_data.news_type,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "size": news_data.size
    }
    
    await db.news.insert_one(news_doc)
    return NewsItem(**news_doc)

@api_router.delete("/admin/news/{news_id}")
async def delete_news_admin(news_id: str, admin: dict = Depends(get_admin_user)):
    """Delete news as admin"""
    result = await db.news.delete_one({"id": news_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="News non trovata")
    return {"message": "News eliminata con successo"}

@api_router.put("/admin/news/{news_id}")
async def update_news_admin(news_id: str, news_data: NewsCreate, admin: dict = Depends(get_admin_user)):
    """Update news as admin"""
    update_data = {
        "title": news_data.title,
        "description": news_data.description,
        "news_type": news_data.news_type,
        "size": news_data.size
    }
    
    result = await db.news.update_one({"id": news_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="News non trovata")
    
    updated = await db.news.find_one({"id": news_id}, {"_id": 0})
    return NewsItem(**updated)

# ============== NEWS ROUTES ==============

@api_router.get("/news", response_model=List[NewsItem])
async def get_news(current_user: dict = Depends(get_current_user)):
    news = await db.news.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    # If no news exist, create default questionnaire news
    if not news:
        default_news = {
            "id": str(uuid.uuid4()),
            "title": "Questionario sulla Personalità",
            "description": "Scopri quale tipo di allenatore sei! Completa il questionario della Commissione dell'Accademia per ricevere la tua valutazione ufficiale.",
            "news_type": "questionnaire",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "size": "hero"
        }
        await db.news.insert_one(default_news)
        news = [default_news]
    
    return news

@api_router.post("/news", response_model=NewsItem)
async def create_news(news_data: NewsCreate, current_user: dict = Depends(get_current_user)):
    news_doc = {
        "id": str(uuid.uuid4()),
        "title": news_data.title,
        "description": news_data.description,
        "news_type": news_data.news_type,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "size": news_data.size
    }
    
    await db.news.insert_one(news_doc)
    return NewsItem(**news_doc)

# ============== QUIZ ROUTES ==============

@api_router.post("/quiz/submit", response_model=QuizResult)
async def submit_quiz(quiz_data: QuizSubmit, current_user: dict = Depends(get_current_user)):
    # Calculate result
    result = calculate_profile(quiz_data.answers)
    
    # Save quiz response
    quiz_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "answers": [{"question_number": a.question_number, "answer": a.answer} for a in quiz_data.answers],
        "result": {
            "profile_name": result.profile_name,
            "profile_type": result.profile_type,
            "description": result.description
        },
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.quiz_responses.insert_one(quiz_doc)
    
    # Send email
    await send_quiz_email(
        current_user["email"],
        current_user["username"],
        quiz_data.answers,
        result
    )
    
    return result

@api_router.get("/quiz/history")
async def get_quiz_history(current_user: dict = Depends(get_current_user)):
    history = await db.quiz_responses.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    return history

# ============== NEWS DETAIL ROUTE ==============

@api_router.get("/news/{news_id}")
async def get_news_detail(news_id: str, current_user: dict = Depends(get_current_user)):
    news = await db.news.find_one({"id": news_id, "is_active": True}, {"_id": 0})
    if not news:
        raise HTTPException(status_code=404, detail="News non trovata")
    return news

# ============== POKEMON ROUTES ==============

@api_router.get("/pokemon/my")
async def get_my_pokemon(current_user: dict = Depends(get_current_user)):
    """Get all pokemon assigned to current user"""
    pokemon = await db.user_pokemon.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    return pokemon

@api_router.get("/pokemon/active-team")
async def get_active_team(current_user: dict = Depends(get_current_user)):
    team = await db.active_teams.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not team or not team.get("pokemon_ids"):
        return []
    owned = await db.user_pokemon.find({
        "user_id": current_user["id"], "id": {"$in": team["pokemon_ids"]}
    }, {"_id": 0}).to_list(3)
    by_id = {pokemon["id"]: pokemon for pokemon in owned}
    return [by_id[pokemon_id] for pokemon_id in team["pokemon_ids"] if pokemon_id in by_id]

@api_router.put("/pokemon/active-team")
async def update_active_team(team_data: ActiveTeamUpdate, current_user: dict = Depends(get_current_user)):
    pokemon_ids = list(dict.fromkeys(team_data.pokemon_ids))
    if len(pokemon_ids) != len(team_data.pokemon_ids):
        raise HTTPException(status_code=400, detail="La squadra contiene duplicati")
    owned_count = await db.user_pokemon.count_documents({
        "user_id": current_user["id"], "id": {"$in": pokemon_ids}
    })
    if owned_count != len(pokemon_ids):
        raise HTTPException(status_code=400, detail="Puoi scegliere solo Pokémon che possiedi")
    await db.active_teams.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"pokemon_ids": pokemon_ids, "updated_at": datetime.now(timezone.utc).isoformat()},
         "$setOnInsert": {"user_id": current_user["id"]}},
        upsert=True,
    )
    return {"pokemon_ids": pokemon_ids}

@api_router.get("/pokemon/my/{pokemon_id}")
async def get_my_pokemon_detail(pokemon_id: int, current_user: dict = Depends(get_current_user)):
    """Get a specific pokemon assigned to current user"""
    pokemon = await db.user_pokemon.find_one(
        {"user_id": current_user["id"], "pokemon_id": pokemon_id},
        {"_id": 0}
    )
    if not pokemon:
        # Return default values if not found (for viewing any pokemon)
        return {"pokemon_id": pokemon_id, "nickname": None, "level": None}
    return pokemon

@api_router.put("/pokemon/my/{pokemon_id}")
async def update_my_pokemon(pokemon_id: int, update_data: PokemonUpdate, current_user: dict = Depends(get_current_user)):
    """Update nickname and level for user's pokemon"""
    update_fields = {}

    if update_data.nickname is not None:
        update_fields["nickname"] = update_data.nickname

    if update_data.level is not None:
        update_fields["level"] = update_data.level

    if update_data.learned_moves is not None:
        # Manteniamo sempre esattamente 4 slot
        learned_moves = list(update_data.learned_moves[:4])

        while len(learned_moves) < 4:
            learned_moves.append(None)

        update_fields["learned_moves"] = [
            move.model_dump() if move is not None else None
            for move in learned_moves
        ]

    if "held_item" in update_data.model_fields_set:
        update_fields["held_item"] = (
            update_data.held_item.model_dump() if update_data.held_item else None
        )
    
    if "ability" in update_data.model_fields_set:
        if update_data.ability is not None:
            pokemon_data = await fetch_pokeapi(f"pokemon/{pokemon_id}")
            available = {entry["ability"]["name"] for entry in pokemon_data.get("abilities", [])}
            if update_data.ability not in available:
                raise HTTPException(status_code=400, detail="Abilità non disponibile per questo Pokémon")
        update_fields["ability"] = update_data.ability

    if not update_fields:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    
    result = await db.user_pokemon.update_one(
        {"user_id": current_user["id"], "pokemon_id": pokemon_id},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pokemon non trovato")
    
    updated = await db.user_pokemon.find_one(
        {"user_id": current_user["id"], "pokemon_id": pokemon_id},
        {"_id": 0}
    )
    return updated

async def fetch_pokeapi(resource: str):
    def fetch():
        request = Request(
            f"https://pokeapi.co/api/v2/{resource.strip('/')}/",
            headers={
                "User-Agent": "PokemonAcademy/1.0 (Pokemon evolution lookup)",
                "Accept": "application/json",
            },
        )

        with urlopen(request, timeout=15) as response:
            return json.load(response)
    try:
        return await asyncio.to_thread(fetch)
    except Exception as exc:
        logger.warning("PokeAPI request failed for %s: %s", resource, exc)
        raise HTTPException(status_code=503, detail="Dati Pokémon non disponibili. Riprova tra poco.") from exc


async def evolution_options(pokemon_id: int):
    pokemon = await fetch_pokeapi(f"pokemon/{pokemon_id}")
    species_id = pokemon["species"]["url"].rstrip("/").split("/")[-1]
    species = await fetch_pokeapi(f"pokemon-species/{species_id}")
    if not species.get("evolution_chain"):
        return []
    chain_id = species["evolution_chain"]["url"].rstrip("/").split("/")[-1]
    chain = await fetch_pokeapi(f"evolution-chain/{chain_id}")
    def find(node):
        if node["species"]["name"] == species["name"]:
            return [{"pokemon_id": int(child["species"]["url"].rstrip("/").split("/")[-1]),
                     "pokemon_name": child["species"]["name"]} for child in node["evolves_to"]]
        for child in node["evolves_to"]:
            found = find(child)
            if found is not None:
                return found
        return None
    return find(chain["chain"]) or []


@api_router.get("/pokemon/my/{pokemon_id}/evolutions")
async def get_evolutions(pokemon_id: int, current_user: dict = Depends(get_current_user)):
    owned = await db.user_pokemon.find_one({"user_id": current_user["id"], "pokemon_id": pokemon_id})
    if not owned:
        raise HTTPException(status_code=404, detail="Pokemon non trovato")
    return await evolution_options(pokemon_id)


@api_router.post("/pokemon/my/{pokemon_id}/evolve")
async def evolve_pokemon(pokemon_id: int, evolution: PokemonEvolution, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"], "pokemon_id": pokemon_id}
    owned = await db.user_pokemon.find_one(query, {"_id": 0})
    if not owned:
        raise HTTPException(status_code=404, detail="Pokemon non trovato")
    options = await evolution_options(pokemon_id)
    target = next((option for option in options if option["pokemon_id"] == evolution.pokemon_id), None)
    if not target:
        raise HTTPException(status_code=400, detail="Evoluzione non valida per questo Pokemon")
    existing = await db.user_pokemon.find_one({"user_id": current_user["id"], "pokemon_id": evolution.pokemon_id})
    if existing:
        raise HTTPException(status_code=409, detail="Possiedi già questo stadio evolutivo: gestiscilo con l'admin prima di evolvere.")
    if owned.get("ability"):
        evolved = await fetch_pokeapi(f"pokemon/{evolution.pokemon_id}")
        if owned["ability"] not in {entry["ability"]["name"] for entry in evolved.get("abilities", [])}:
            target = {**target, "ability": None}
    result = await db.user_pokemon.update_one({**query, "id": owned["id"]}, {"$set": target})
    if not result.matched_count:
        raise HTTPException(status_code=409, detail="Il Pokemon è cambiato. Ricarica la pagina.")
    return await db.user_pokemon.find_one({"id": owned["id"]}, {"_id": 0})


@api_router.get("/admin/users/{user_id}/inventory")
async def get_admin_inventory(user_id: str, admin: dict = Depends(get_admin_user)):
    if not await db.users.find_one({"id": user_id}):
        raise HTTPException(status_code=404, detail="Allenatore non trovato")
    return await db.user_inventory.find({"user_id": user_id}, {"_id": 0}).sort("display_name", 1).to_list(None)


@api_router.patch("/admin/users/{user_id}/inventory/{item_name}")
async def set_admin_inventory(user_id: str, item_name: str, update: AdminInventoryQuantity, admin: dict = Depends(get_admin_user)):
    query = {"user_id": user_id, "name": item_name}
    if update.quantity == 0:
        result = await db.user_inventory.delete_one(query)
        if not result.deleted_count:
            raise HTTPException(status_code=404, detail="Strumento non trovato")
        return {"removed": True}
    result = await db.user_inventory.update_one(query, {"$set": {"quantity": update.quantity}})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Strumento non trovato")
    return await db.user_inventory.find_one(query, {"_id": 0})


@api_router.get("/admin/users")
async def get_all_users(admin: dict = Depends(get_admin_user)):
    """Get all registered users for admin"""
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/admin/medals")
async def get_medals_admin(admin: dict = Depends(get_admin_user)):
    return await db.user_medals.find({}, {"_id": 0}).sort("assigned_at", -1).to_list(1000)

@api_router.post("/admin/medals")
async def assign_medal_admin(medal_data: MedalAssign, admin: dict = Depends(get_admin_user)):
    if len(medal_data.image) > 3_000_000:
        raise HTTPException(status_code=413, detail="Immagine medaglia troppo grande")
    user_ids = list(dict.fromkeys(medal_data.user_ids))
    existing_users = await db.users.count_documents({"id": {"$in": user_ids}})
    if existing_users != len(user_ids):
        raise HTTPException(status_code=404, detail="Uno o più allenatori non esistono")
    full_users = []
    for user_id in user_ids:
        if await db.user_medals.count_documents({"user_id": user_id}) >= 8:
            full_users.append(user_id)
    if full_users:
        raise HTTPException(status_code=400, detail="Uno o più allenatori hanno già 8 medaglie")
    assigned_at = datetime.now(timezone.utc).isoformat()
    documents = [{
        "id": str(uuid.uuid4()), "user_id": user_id,
        "name": medal_data.name.strip(), "image": medal_data.image,
        "assigned_at": assigned_at,
    } for user_id in user_ids]
    await db.user_medals.insert_many(documents)
    return {"assigned": len(documents)}

@api_router.delete("/admin/users/{user_id}/medals/{medal_id}")
async def remove_user_medal_admin(user_id: str, medal_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.user_medals.delete_one({"id": medal_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medaglia assegnata non trovata")
    return {"message": "Medaglia rimossa con successo"}

@api_router.post("/admin/inventory")
async def assign_inventory_admin(item_data: AdminInventoryAssign, admin: dict = Depends(get_admin_user)):
    user_ids = list(dict.fromkeys(item_data.user_ids))
    existing_users = await db.users.count_documents({"id": {"$in": user_ids}})
    if existing_users != len(user_ids):
        raise HTTPException(status_code=404, detail="Uno o più allenatori non esistono")
    for user_id in user_ids:
        existing = await db.user_inventory.find_one({"user_id": user_id, "name": item_data.name}, {"_id": 0})
        if existing:
            quantity = min(999, existing.get("quantity", 0) + item_data.quantity)
            await db.user_inventory.update_one({"id": existing["id"]}, {"$set": {"quantity": quantity}})
        else:
            await db.user_inventory.insert_one({
                "id": str(uuid.uuid4()), "user_id": user_id,
                "name": item_data.name, "display_name": item_data.display_name,
                "sprite": item_data.sprite, "quantity": item_data.quantity,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    return {"assigned": len(user_ids)}

@api_router.get("/admin/users/{user_id}/pokemon")
async def get_user_pokemon_admin(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get pokemon assigned to a specific user"""
    pokemon = await db.user_pokemon.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    return pokemon

@api_router.post("/admin/users/{user_id}/pokemon")
async def assign_pokemon_to_user(user_id: str, pokemon_data: PokemonAssign, admin: dict = Depends(get_admin_user)):
    """Assign a pokemon to a user"""
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Check if pokemon already assigned
    existing = await db.user_pokemon.find_one({
        "user_id": user_id,
        "pokemon_id": pokemon_data.pokemon_id
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Pokemon già assegnato a questo utente")
    
    # Assign pokemon
    pokemon_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "pokemon_id": pokemon_data.pokemon_id,
        "pokemon_name": pokemon_data.pokemon_name,
        "assigned_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_pokemon.insert_one(pokemon_doc)
    return UserPokemon(**pokemon_doc)

@api_router.delete("/admin/users/{user_id}/pokemon/{pokemon_id}")
async def remove_pokemon_from_user(user_id: str, pokemon_id: int, admin: dict = Depends(get_admin_user)):
    """Remove a pokemon from a user"""
    result = await db.user_pokemon.delete_one({
        "user_id": user_id,
        "pokemon_id": pokemon_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pokemon non trovato per questo utente")
    
    return {"message": "Pokemon rimosso con successo"}

# ============== CHAT ROUTES ==============

@api_router.get("/chat/users")
async def search_chat_users(
    search: str = "",
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """Return public data for registered users that can be added to a chat."""
    safe_limit = max(1, min(limit, 50))
    query = {"id": {"$ne": current_user["id"]}}
    cleaned_search = search.strip()
    if cleaned_search:
        query["username"] = {"$regex": re.escape(cleaned_search), "$options": "i"}

    users = await db.users.find(
        query, {"_id": 0, "id": 1, "username": 1}
    ).sort("username", 1).to_list(safe_limit)
    return users


@api_router.get("/chat/conversations")
async def list_chat_conversations(current_user: dict = Depends(get_current_user)):
    conversations = await db.chat_conversations.find(
        {"member_ids": current_user["id"]}, {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    return [
        await serialize_chat_conversation(conversation, current_user["id"])
        for conversation in conversations
    ]


@api_router.post("/chat/conversations/direct")
async def create_direct_conversation(
    data: DirectConversationCreate,
    current_user: dict = Depends(get_current_user),
):
    if data.user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Non puoi avviare una chat con te stesso")
    target_user = await db.users.find_one(
        {"id": data.user_id}, {"_id": 0, "id": 1, "username": 1}
    )
    if not target_user:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    member_ids = sorted([current_user["id"], data.user_id])
    direct_key = ":".join(member_ids)
    conversation = await db.chat_conversations.find_one(
        {"direct_key": direct_key}, {"_id": 0}
    )
    if not conversation:
        now = datetime.now(timezone.utc).isoformat()
        conversation = {
            "id": str(uuid.uuid4()),
            "type": "direct",
            "name": None,
            "direct_key": direct_key,
            "member_ids": member_ids,
            "admins": [],
            "created_by": current_user["id"],
            "created_at": now,
            "updated_at": now,
            "last_message": None,
        }
        try:
            await db.chat_conversations.insert_one(conversation.copy())
        except DuplicateKeyError:
            conversation = await db.chat_conversations.find_one(
                {"direct_key": direct_key}, {"_id": 0}
            )
        await chat_connections.send_to_users(
            member_ids, {"type": "conversation.created", "conversation_id": conversation["id"]}
        )
    return await serialize_chat_conversation(conversation, current_user["id"])


@api_router.post("/chat/conversations/group")
async def create_group_conversation(
    data: GroupConversationCreate,
    current_user: dict = Depends(get_current_user),
):
    group_name = data.name.strip()
    if not group_name:
        raise HTTPException(status_code=400, detail="Inserisci un nome per il gruppo")

    member_ids = list(dict.fromkeys([current_user["id"], *data.member_ids]))
    if len(member_ids) < 2:
        raise HTTPException(status_code=400, detail="Seleziona almeno un altro partecipante")
    if len(member_ids) > 50:
        raise HTTPException(status_code=400, detail="Un gruppo può avere al massimo 50 partecipanti")
    existing_count = await db.users.count_documents({"id": {"$in": member_ids}})
    if existing_count != len(member_ids):
        raise HTTPException(status_code=404, detail="Uno o più utenti non esistono")

    now = datetime.now(timezone.utc).isoformat()
    conversation = {
        "id": str(uuid.uuid4()),
        "type": "group",
        "name": group_name,
        "member_ids": member_ids,
        "admins": [current_user["id"]],
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now,
        "last_message": None,
    }
    await db.chat_conversations.insert_one(conversation.copy())
    await chat_connections.send_to_users(
        member_ids, {"type": "conversation.created", "conversation_id": conversation["id"]}
    )
    return await serialize_chat_conversation(conversation, current_user["id"])


@api_router.get("/chat/conversations/{conversation_id}/messages")
async def list_chat_messages(
    conversation_id: str,
    before: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    await get_chat_conversation(conversation_id, current_user["id"])
    query = {"conversation_id": conversation_id}
    if before:
        query["created_at"] = {"$lt": before}
    messages = await db.chat_messages.find(query, {"_id": 0}).sort("created_at", -1).to_list(
        max(1, min(limit, 100))
    )
    messages.reverse()
    return messages


@api_router.post("/chat/conversations/{conversation_id}/messages")
async def send_chat_message(
    conversation_id: str,
    data: ChatMessageCreate,
    current_user: dict = Depends(get_current_user),
):
    conversation = await get_chat_conversation(conversation_id, current_user["id"])
    content = data.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Il messaggio non può essere vuoto")

    now = datetime.now(timezone.utc).isoformat()
    message = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": current_user["id"],
        "sender_username": current_user["username"],
        "content": content,
        "created_at": now,
    }
    await db.chat_messages.insert_one(message.copy())
    last_message = {
        "id": message["id"],
        "sender_id": message["sender_id"],
        "sender_username": message["sender_username"],
        "content": message["content"],
        "created_at": now,
    }
    await db.chat_conversations.update_one(
        {"id": conversation_id},
        {"$set": {"last_message": last_message, "updated_at": now}},
    )
    await db.chat_reads.update_one(
        {"conversation_id": conversation_id, "user_id": current_user["id"]},
        {"$set": {"last_read_at": now}},
        upsert=True,
    )
    await chat_connections.send_to_users(
        conversation["member_ids"], {"type": "message.created", "message": message}
    )
    return message


@api_router.put("/chat/conversations/{conversation_id}/read")
async def mark_chat_read(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    await get_chat_conversation(conversation_id, current_user["id"])
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_reads.update_one(
        {"conversation_id": conversation_id, "user_id": current_user["id"]},
        {"$set": {"last_read_at": now}},
        upsert=True,
    )
    return {"last_read_at": now}


@api_router.patch("/chat/conversations/{conversation_id}")
async def rename_group_conversation(
    conversation_id: str,
    data: GroupNameUpdate,
    current_user: dict = Depends(get_current_user),
):
    conversation = await get_chat_conversation(conversation_id, current_user["id"])
    if conversation["type"] != "group" or current_user["id"] not in conversation.get("admins", []):
        raise HTTPException(status_code=403, detail="Solo un amministratore può rinominare il gruppo")
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Il nome del gruppo non può essere vuoto")
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_conversations.update_one(
        {"id": conversation_id}, {"$set": {"name": name, "updated_at": now}}
    )
    await chat_connections.send_to_users(
        conversation["member_ids"], {"type": "conversation.updated", "conversation_id": conversation_id}
    )
    conversation["name"] = name
    conversation["updated_at"] = now
    return await serialize_chat_conversation(conversation, current_user["id"])


@api_router.post("/chat/conversations/{conversation_id}/members")
async def add_group_members(
    conversation_id: str,
    data: GroupMembersAdd,
    current_user: dict = Depends(get_current_user),
):
    conversation = await get_chat_conversation(conversation_id, current_user["id"])
    if conversation["type"] != "group" or current_user["id"] not in conversation.get("admins", []):
        raise HTTPException(status_code=403, detail="Solo un amministratore può aggiungere partecipanti")
    new_ids = [user_id for user_id in dict.fromkeys(data.user_ids) if user_id not in conversation["member_ids"]]
    if len(conversation["member_ids"]) + len(new_ids) > 50:
        raise HTTPException(status_code=400, detail="Un gruppo può avere al massimo 50 partecipanti")
    if new_ids:
        existing_count = await db.users.count_documents({"id": {"$in": new_ids}})
        if existing_count != len(new_ids):
            raise HTTPException(status_code=404, detail="Uno o più utenti non esistono")
        now = datetime.now(timezone.utc).isoformat()
        await db.chat_conversations.update_one(
            {"id": conversation_id},
            {"$addToSet": {"member_ids": {"$each": new_ids}}, "$set": {"updated_at": now}},
        )
        conversation["member_ids"].extend(new_ids)
        conversation["updated_at"] = now
        await chat_connections.send_to_users(
            conversation["member_ids"], {"type": "conversation.updated", "conversation_id": conversation_id}
        )
    return await serialize_chat_conversation(conversation, current_user["id"])


@api_router.delete("/chat/conversations/{conversation_id}/members/{member_id}")
async def remove_group_member(
    conversation_id: str,
    member_id: str,
    current_user: dict = Depends(get_current_user),
):
    conversation = await get_chat_conversation(conversation_id, current_user["id"])
    if conversation["type"] != "group":
        raise HTTPException(status_code=400, detail="Operazione disponibile solo per i gruppi")
    is_self = member_id == current_user["id"]
    is_admin = current_user["id"] in conversation.get("admins", [])
    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="Non puoi rimuovere questo partecipante")
    if member_id not in conversation["member_ids"]:
        raise HTTPException(status_code=404, detail="Partecipante non trovato")
    if member_id in conversation.get("admins", []) and len(conversation.get("admins", [])) == 1 and len(conversation["member_ids"]) > 1:
        raise HTTPException(status_code=400, detail="Nomina un altro amministratore prima di uscire")

    remaining_members = [user_id for user_id in conversation["member_ids"] if user_id != member_id]
    if not remaining_members:
        await db.chat_messages.delete_many({"conversation_id": conversation_id})
        await db.chat_reads.delete_many({"conversation_id": conversation_id})
        await db.chat_conversations.delete_one({"id": conversation_id})
    else:
        await db.chat_conversations.update_one(
            {"id": conversation_id},
            {
                "$pull": {"member_ids": member_id, "admins": member_id},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            },
        )
        await db.chat_reads.delete_one({"conversation_id": conversation_id, "user_id": member_id})
    await chat_connections.send_to_users(
        conversation["member_ids"], {"type": "conversation.updated", "conversation_id": conversation_id}
    )
    return {"removed": True}


@api_router.post("/chat/socket-ticket")
async def create_chat_socket_ticket(current_user: dict = Depends(get_current_user)):
    ticket = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=1)
    await db.chat_socket_tickets.insert_one(
        {"ticket": ticket, "user_id": current_user["id"], "expires_at": expires_at}
    )
    return {"ticket": ticket}

# ============== ROOT ROUTE ==============

@api_router.get("/")
async def root():
    return {"message": "Pokémon Academy API"}

# Include router
app.include_router(api_router)


@app.websocket("/api/chat/ws")
async def chat_websocket(websocket: WebSocket, ticket: str):
    ticket_doc = await db.chat_socket_tickets.find_one_and_delete({
        "ticket": ticket,
        "expires_at": {"$gt": datetime.now(timezone.utc)},
    })
    if not ticket_doc:
        await websocket.close(code=1008)
        return
    user_id = ticket_doc["user_id"]
    if not await db.users.find_one({"id": user_id}, {"_id": 1}):
        await websocket.close(code=1008)
        return

    await chat_connections.connect(user_id, websocket)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        chat_connections.disconnect(user_id, websocket)
    except Exception:
        chat_connections.disconnect(user_id, websocket)

origins_env = os.environ.get("CORS_ORIGINS")

if origins_env:
    origins = origins_env.split(",")
else:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,  # IMPORTANTISSIMO se usi "*"
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def create_database_indexes():
    """MongoDB creates collections automatically; indexes keep chat queries safe and fast."""
    await db.chat_conversations.create_index("id", unique=True)
    await db.chat_conversations.create_index("direct_key", unique=True, sparse=True)
    await db.chat_conversations.create_index([("member_ids", 1), ("updated_at", -1)])
    await db.chat_messages.create_index("id", unique=True)
    await db.chat_messages.create_index([("conversation_id", 1), ("created_at", -1)])
    await db.chat_reads.create_index([("conversation_id", 1), ("user_id", 1)], unique=True)
    await db.chat_socket_tickets.create_index("expires_at", expireAfterSeconds=0)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
