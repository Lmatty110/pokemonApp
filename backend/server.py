from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend setup
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
RECIPIENT_EMAIL = os.environ.get('RECIPIENT_EMAIL', 'test@gmail.com')

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'pokemon-academy-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

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

# ============== HELPER FUNCTIONS ==============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token non valido")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

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
        created_at=current_user["created_at"]
    )

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

# ============== ROOT ROUTE ==============

@api_router.get("/")
async def root():
    return {"message": "Pokémon Academy API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
