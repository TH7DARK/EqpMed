from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends
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
from datetime import datetime
import jwt
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = "medical_equipment_secret_key"
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class EquipmentStatus(str, Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    INACTIVE = "inactive"
    REMOVED = "removed"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole = UserRole.USER

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: UserRole
    created_at: datetime

class Equipment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    model: str
    manufacturer: str
    serial_number: str
    description: Optional[str] = None
    location: str
    status: EquipmentStatus = EquipmentStatus.ACTIVE
    installation_date: Optional[datetime] = None
    removal_date: Optional[datetime] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class EquipmentCreate(BaseModel):
    name: str
    model: str
    manufacturer: str
    serial_number: str
    description: Optional[str] = None
    location: str
    status: EquipmentStatus = EquipmentStatus.ACTIVE
    installation_date: Optional[datetime] = None

class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    serial_number: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    status: Optional[EquipmentStatus] = None
    installation_date: Optional[datetime] = None
    removal_date: Optional[datetime] = None

class Ticket(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    equipment_id: str
    title: str
    description: str
    status: TicketStatus = TicketStatus.OPEN
    priority: str = "medium"  # low, medium, high, urgent
    created_by: str
    assigned_to: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

class TicketCreate(BaseModel):
    equipment_id: str
    title: str
    description: str
    priority: str = "medium"

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TicketStatus] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None

class MaintenanceRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    equipment_id: str
    maintenance_type: str  # preventive, corrective
    description: str
    performed_by: str
    performed_at: datetime = Field(default_factory=datetime.utcnow)
    next_maintenance_date: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

class MaintenanceRecordCreate(BaseModel):
    equipment_id: str
    maintenance_type: str
    description: str
    next_maintenance_date: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hash.encode('utf-8'))

def create_jwt_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow().timestamp() + 86400  # 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return UserResponse(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: UserResponse = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Auth Routes
@api_router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Create user
    user_dict = user_data.dict()
    user_dict.pop('password')
    user_dict['password_hash'] = password_hash
    user_obj = User(**user_dict)
    
    await db.users.insert_one(user_obj.dict())
    return UserResponse(**user_obj.dict())

@api_router.post("/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user['id'], user['role'])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse(**user)
    }

@api_router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user

# Equipment Routes
@api_router.post("/equipment", response_model=Equipment)
async def create_equipment(equipment_data: EquipmentCreate, current_user: UserResponse = Depends(get_current_user)):
    equipment_dict = equipment_data.dict()
    equipment_dict['created_by'] = current_user.id
    equipment_obj = Equipment(**equipment_dict)
    
    await db.equipment.insert_one(equipment_obj.dict())
    return equipment_obj

@api_router.get("/equipment", response_model=List[Equipment])
async def get_equipment(current_user: UserResponse = Depends(get_current_user)):
    equipment_list = await db.equipment.find().to_list(1000)
    return [Equipment(**equipment) for equipment in equipment_list]

@api_router.get("/equipment/{equipment_id}", response_model=Equipment)
async def get_equipment_by_id(equipment_id: str, current_user: UserResponse = Depends(get_current_user)):
    equipment = await db.equipment.find_one({"id": equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return Equipment(**equipment)

@api_router.put("/equipment/{equipment_id}", response_model=Equipment)
async def update_equipment(equipment_id: str, equipment_data: EquipmentUpdate, current_user: UserResponse = Depends(get_current_user)):
    equipment = await db.equipment.find_one({"id": equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    update_data = {k: v for k, v in equipment_data.dict().items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()
    
    await db.equipment.update_one({"id": equipment_id}, {"$set": update_data})
    
    updated_equipment = await db.equipment.find_one({"id": equipment_id})
    return Equipment(**updated_equipment)

@api_router.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: str, current_user: UserResponse = Depends(get_admin_user)):
    equipment = await db.equipment.find_one({"id": equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    await db.equipment.delete_one({"id": equipment_id})
    return {"message": "Equipment deleted successfully"}

# Ticket Routes
@api_router.post("/tickets", response_model=Ticket)
async def create_ticket(ticket_data: TicketCreate, current_user: UserResponse = Depends(get_current_user)):
    # Check if equipment exists
    equipment = await db.equipment.find_one({"id": ticket_data.equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    ticket_dict = ticket_data.dict()
    ticket_dict['created_by'] = current_user.id
    ticket_obj = Ticket(**ticket_dict)
    
    await db.tickets.insert_one(ticket_obj.dict())
    return ticket_obj

@api_router.get("/tickets", response_model=List[Ticket])
async def get_tickets(current_user: UserResponse = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        tickets = await db.tickets.find().to_list(1000)
    else:
        tickets = await db.tickets.find({"created_by": current_user.id}).to_list(1000)
    
    return [Ticket(**ticket) for ticket in tickets]

@api_router.get("/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket_by_id(ticket_id: str, current_user: UserResponse = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check if user can access this ticket
    if current_user.role != UserRole.ADMIN and ticket['created_by'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return Ticket(**ticket)

@api_router.put("/tickets/{ticket_id}", response_model=Ticket)
async def update_ticket(ticket_id: str, ticket_data: TicketUpdate, current_user: UserResponse = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check permissions
    if current_user.role != UserRole.ADMIN and ticket['created_by'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in ticket_data.dict().items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()
    
    if update_data.get('status') == TicketStatus.RESOLVED:
        update_data['resolved_at'] = datetime.utcnow()
    
    await db.tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    updated_ticket = await db.tickets.find_one({"id": ticket_id})
    return Ticket(**updated_ticket)

# Maintenance Routes
@api_router.post("/maintenance", response_model=MaintenanceRecord)
async def create_maintenance_record(maintenance_data: MaintenanceRecordCreate, current_user: UserResponse = Depends(get_current_user)):
    # Check if equipment exists
    equipment = await db.equipment.find_one({"id": maintenance_data.equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    maintenance_dict = maintenance_data.dict()
    maintenance_dict['performed_by'] = current_user.id
    maintenance_obj = MaintenanceRecord(**maintenance_dict)
    
    await db.maintenance_records.insert_one(maintenance_obj.dict())
    return maintenance_obj

@api_router.get("/maintenance/equipment/{equipment_id}", response_model=List[MaintenanceRecord])
async def get_equipment_maintenance(equipment_id: str, current_user: UserResponse = Depends(get_current_user)):
    maintenance_records = await db.maintenance_records.find({"equipment_id": equipment_id}).to_list(1000)
    return [MaintenanceRecord(**record) for record in maintenance_records]

# Dashboard Stats (Admin only)
@api_router.get("/stats")
async def get_dashboard_stats(current_user: UserResponse = Depends(get_admin_user)):
    total_equipment = await db.equipment.count_documents({})
    active_equipment = await db.equipment.count_documents({"status": EquipmentStatus.ACTIVE})
    open_tickets = await db.tickets.count_documents({"status": TicketStatus.OPEN})
    total_users = await db.users.count_documents({})
    
    return {
        "total_equipment": total_equipment,
        "active_equipment": active_equipment,
        "open_tickets": open_tickets,
        "total_users": total_users
    }

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
