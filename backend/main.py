from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from fastapi.middleware.cors import CORSMiddleware

from .database import get_db, UsageRecord, User
from .agent import ElectricityAgent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Pydantic
class AuthData(BaseModel):
    username: str
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

# Helper to get user from simple custom header (for simplicity over full JWT)
def get_current_user_from_header(user_id: str = Header(None)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user_id header")
    return int(user_id)

@app.post("/api/register")
def register(auth: AuthData, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == auth.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    new_user = User(username=auth.username, password_hash=auth.password) # Storing plain just for simple mockup execution
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Success", "user_id": new_user.id}

@app.post("/api/login")
def login(auth: AuthData, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == auth.username, User.password_hash == auth.password).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
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
