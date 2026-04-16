from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime
from fastapi.middleware.cors import CORSMiddleware

from .database import get_db, UsageRecord, User
from .agent import ElectricityAgent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, # Changed to False to prevent CORS block on Vercel
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Pydantic
class SignupData(BaseModel):
    username: str
    name: str
    email: str
    mobile: Optional[str] = None
    password: str = Field(..., min_length=8)

class LoginData(BaseModel):
    identifier: str # Unifies email, mobile, and username into one input field
    password: str

# Usage Pydantic
class UsageCreate(BaseModel):
    appliance: str
    kwh: float
    cost: float

class UsageResponse(UsageCreate):
    id: int
    user_id: int
    date: date
    time_logged: datetime

    class Config:
        orm_mode = True

# Helper to get user from custom identifier header
def get_current_user_from_header(user_id: str = Header(None)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user_id header")
    return int(user_id)

@app.post("/api/register")
def register(auth: SignupData, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        or_(User.username == auth.username, User.email == auth.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or Email already exists")
    
    new_user = User(
        username=auth.username,
        name=auth.name,
        email=auth.email,
        mobile=auth.mobile,
        password_hash=auth.password # Simple mockup
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Success", "user_id": new_user.id}

@app.post("/api/login")
def login(auth: LoginData, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        or_(
            User.username == auth.identifier, 
            User.email == auth.identifier,
            User.mobile == auth.identifier
        ),
        User.password_hash == auth.password
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials. Please check your spelling or sign up.")
    return {"message": "Success", "user_id": user.id}


@app.post("/api/usage", response_model=UsageResponse)
def add_usage(usage: UsageCreate, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_from_header)):
    db_usage = UsageRecord(user_id=current_user_id, appliance=usage.appliance, kwh=usage.kwh, cost=usage.cost)
    db.add(db_usage)
    db.commit()
    db.refresh(db_usage)
    return db_usage

@app.get("/api/usage", response_model=List[UsageResponse])
def get_usage(db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_from_header)):
    return db.query(UsageRecord).filter(UsageRecord.user_id == current_user_id).all()

@app.get("/api/analysis")
def get_analysis(db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_from_header)):
    records = db.query(UsageRecord).filter(UsageRecord.user_id == current_user_id).all()
    agent = ElectricityAgent(records)
    
    return {
        "dashboard_metrics": agent.get_dashboard_metrics(),
        "saving_suggestions": agent.suggest_savings()
    }
