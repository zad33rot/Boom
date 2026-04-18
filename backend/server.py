import os
import random
import sqlite3
import smtplib
from email.mime.text import MIMEText
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Ключи из .env (Обязательно проверь, что файл .env есть на сервере!)
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# --- ОТПРАВКА EMAIL ЧЕРЕЗ MAIL.RU ---
def send_email_code(receiver_email: str, code: str):
    msg = MIMEText(f"Твой код подтверждения в мессенджере BOOM: {code}")
    msg['Subject'] = 'BOOM: Код входа'
    msg['From'] = SMTP_EMAIL
    msg['To'] = receiver_email

    try:
        # Используем разблокированный порт 465 с таймаутом!
        server = smtplib.SMTP_SSL('smtp.mail.ru', 465, timeout=10) 
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ Код {code} успешно отправлен на {receiver_email}")
    except Exception as e:
        print(f"⚠️ Ошибка отправки почты: {e}")

# --- МОДЕЛИ ДАННЫХ ---
class AuthRequest(BaseModel):
    email: str

class VerifyRequest(BaseModel):
    email: str
    code: str
    nickname: str = None

# --- ЭНДПОИНТЫ ---
# Оставляем обычный def (без async), чтобы сервер не зависал!
@app.post("/auth/send-code")
def send_code(req: AuthRequest):
    code = str(random.randint(1000, 9999))
    conn = sqlite3.connect("messenger.db")
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO users (email, auth_code) VALUES (?, ?)", (req.email, code))
    conn.commit()
    conn.close()
    
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
            data = await websocket.receive_text()
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        print(f"User {email} disconnected")