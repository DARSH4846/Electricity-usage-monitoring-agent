from sqlalchemy import create_engine, Column, Integer, Float, String, Date, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import date, datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./usage_v2.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    
    usages = relationship("UsageRecord", back_populates="owner")

class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, default=date.today)
    time_logged = Column(DateTime, default=datetime.utcnow)
    appliance = Column(String, index=True)
    kwh = Column(Float)
    cost = Column(Float)

    owner = relationship("User", back_populates="usages")

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
