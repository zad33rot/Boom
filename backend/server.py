import os
import random
import sqlite3
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Твоя ссылка на Google Apps Script
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzJKbnQV2FEF1Z0r_zvO5Oc6KkIaHCKlatiVA3f-xJgD_NrLyPIfFqEjWrpo_TCHXcwJA/exec"

# --- БАЗА ДАННЫХ ---
def init_db():
    conn = sqlite3.connect("messenger.db")
    cursor = conn.cursor()
    # Используем email как главный ключ
    cursor.execute('''CREATE TABLE IF NOT EXISTS users 
                      (email TEXT PRIMARY KEY, nickname TEXT, auth_code TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS messages 
                      (sender TEXT, receiver TEXT, text TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

init_db()

# --- ОТПРАВКА КОДА ЧЕРЕЗ GOOGLE API ---
def send_email_code(receiver_email: str, code: str):
    data = {
        "to": receiver_email,
        "code": code
    }
    
    try:
        # Google всегда делает редиректы, поэтому follow_redirects=True обязателен
        with httpx.Client(follow_redirects=True) as client:
            response = client.post(GOOGLE_SCRIPT_URL, json=data, timeout=10.0)
            
        if response.status_code == 200:
            print(f"✅ Код {code} успешно отправлен через Google API на {receiver_email}")
        else:
            print(f"⚠️ Google API ответил ошибкой: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"⚠️ Ошибка при обращении к Google API: {e}")

# --- МОДЕЛИ ДАННЫХ ---
class AuthRequest(BaseModel):
    email: str

class VerifyRequest(BaseModel):
    email: str
    code: str
    nickname: str = None

# --- ЭНДПОИНТЫ ---
@app.post("/auth/send-code")
def send_code(req: AuthRequest):
    code = str(random.randint(1000, 9999))
    conn = sqlite3.connect("messenger.db")
    cursor = conn.cursor()
    # Записываем код в базу
    cursor.execute("INSERT OR REPLACE INTO users (email, auth_code) VALUES (?, ?)", (req.email, code))
    conn.commit()
    conn.close()
    
    # Отправляем через Google
    send_email_code(req.email, code)
    
    return {"status": "code_sent"}

@app.post("/auth/verify")
def verify_code(req: VerifyRequest):
    conn = sqlite3.connect("messenger.db")
    cursor = conn.cursor()
    cursor.execute("SELECT auth_code FROM users WHERE email = ?", (req.email,))
    result = cursor.fetchone()
    
    if result and result[0] == req.code:
        if req.nickname:
            cursor.execute("UPDATE users SET nickname = ? WHERE email = ?", (req.nickname, req.email))
        conn.commit()
        conn.close()
        return {"status": "success", "email": req.email}
    
    conn.close()
    raise HTTPException(status_code=400, detail="Invalid code")

# --- WEBSOCKETS ---
@app.websocket("/ws/{email}")
async def websocket_endpoint(websocket: WebSocket, email: str):
    await websocket.accept()
    try:
        while True:
            # Здесь будет логика обмена сообщениями
            data = await websocket.receive_text()
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        print(f"User {email} disconnected")