from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uvicorn
import json
import random
from sqlalchemy import or_, and_

import models
import auth
from database import SessionLocal, engine
from encryption import encrypt_msg, decrypt_msg

# 1. Создаем таблицы
models.Base.metadata.create_all(bind=engine)

# 2. Инициализация приложения
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173"
    ], # Четко указываем адреса, где крутится твой React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- АВТОРИЗАЦИЯ И НИКНЕЙМЫ ---

verification_codes = {}

class PhoneAuth(BaseModel):
    phone: str

class CodeVerify(BaseModel):
    phone: str
    code: str

class UpdateNick(BaseModel):
    old_nick: str
    new_nick: str

@app.post("/send-code")
def send_code(data: PhoneAuth):
    code = str(random.randint(1000, 9999))
    verification_codes[data.phone] = code
    print("\n" + "="*40)
    print(f"📱 СМС для {data.phone}: ВАШ КОД {code}")
    print("="*40 + "\n")
    return {"message": "Код отправлен"}

@app.post("/verify-code")
def verify_code(data: CodeVerify):
    saved_code = verification_codes.get(data.phone)
    if not saved_code or saved_code != data.code:
        raise HTTPException(status_code=400, detail="Неверный код")
        
    db = SessionLocal()
    try:
        db_user = db.query(models.User).filter(models.User.phone == data.phone).first()
        
        if not db_user:
            default_nick = f"boom_user_{random.randint(1000, 9999)}"
            db_user = models.User(phone=data.phone, username=default_nick, hashed_password="sms_login")
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
        del verification_codes[data.phone]
        
        access_token = auth.create_access_token(data={"sub": db_user.username})
        return {"access_token": access_token, "token_type": "bearer"}
    finally:
        db.close()

@app.post("/update-nickname")
def update_nickname(data: UpdateNick):
    db = SessionLocal()
    try:
        exist = db.query(models.User).filter(models.User.username == data.new_nick).first()
        if exist:
            raise HTTPException(status_code=400, detail="Этот никнейм уже занят 😔")

        user = db.query(models.User).filter(models.User.username == data.old_nick).first()
        if user:
            user.username = data.new_nick
            db.query(models.Message).filter(models.Message.sender == data.old_nick).update({"sender": data.new_nick})
            db.query(models.Message).filter(models.Message.receiver == data.old_nick).update({"receiver": data.new_nick})
            db.commit()

            new_token = auth.create_access_token(data={"sub": user.username})
            return {"access_token": new_token}
        raise HTTPException(status_code=404)
    finally:
        db.close()

# --- REST API (ПОЛЬЗОВАТЕЛИ И ИСТОРИЯ) ---

@app.get("/users")
def get_users(q: Optional[str] = None):
    db = SessionLocal()
    try:
        query = db.query(models.User.username)
        if q:
            query = query.filter(models.User.username.ilike(f"%{q}%"))
        users = query.all()
        return [user[0] for user in users]
    finally:
        db.close()

@app.get("/my-chats/{username}")
def get_my_chats(username: str):
    db = SessionLocal()
    try:
        messages = db.query(models.Message).filter(
            or_(models.Message.sender == username, models.Message.receiver == username)
        ).all()
        contacts = set()
        for m in messages:
            if m.sender != username:
                contacts.add(m.sender)
            if m.receiver != username:
                contacts.add(m.receiver)
        return list(contacts)
    finally:
        db.close()

@app.get("/history/{user1}/{user2}")
def get_history(user1: str, user2: str):
    db = SessionLocal()
    try:
        messages = db.query(models.Message).filter(
            or_(
                and_(models.Message.sender == user1, models.Message.receiver == user2),
                and_(models.Message.sender == user2, models.Message.receiver == user1)
            )
        ).order_by(models.Message.timestamp).all()
        
        return [
            {
                "sender": m.sender, 
                "receiver": m.receiver, 
                "text": decrypt_msg(m.content),
                "timestamp": m.timestamp.strftime("%H:%M") if m.timestamp else ""
            } for m in messages
        ]
    finally:
        db.close()

# --- WEBSOCKETS (ЧАТ В РЕАЛЬНОМ ВРЕМЕНИ) ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket

if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)