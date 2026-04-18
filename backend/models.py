from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)     # НОВОЕ: Номер телефона (скрыт от всех)
    username = Column(String, unique=True, index=True)  # ЭТО ТЕПЕРЬ @НИКНЕЙМ (виден всем)
    hashed_password = Column(String)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String, index=True)
    receiver = Column(String, index=True)
    content = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())