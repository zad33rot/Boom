import os
import sqlite3
import random
import smtplib
from email.mime.text import MIMEText
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import RegisterRequest, ConfirmRequest, LoginRequest
from database import init_db

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

init_db()

def send_email(receiver, code):
    msg = MIMEText(f"Твой код подтверждения BOOM: {code}")
    msg['Subject'] = 'Регистрация в BOOM'
    msg['From'] = SMTP_EMAIL
    msg['To'] = receiver
    try:
        server = smtplib.SMTP_SSL('smtp.mail.ru', 465, timeout=10)
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except: return False

@app.post("/auth/register-step1")
def register_step1(req: RegisterRequest):
    code = str(random.randint(1000, 9999))
    conn = sqlite3.connect("messenger.db")
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO users (email, auth_code) VALUES (?, ?)", (req.email, code))
    conn.commit()
    conn.close()
    if send_email(req.email, code): return {"status": "code_sent"}
    raise HTTPException(status_code=500, detail="Ошибка отправки почты")

@app.post("/auth/confirm-registration")
def confirm_registration(req: ConfirmRequest):
    conn = sqlite3.connect("messenger.db")
    cursor = conn.cursor()
    cursor.execute("SELECT auth_code FROM users WHERE email = ?", (req.email,))
    res = cursor.fetchone()
    if res and res[0] == req.code:
        cursor.execute("UPDATE users SET nickname=?, password=?, auth_code=NULL WHERE email=?", 
                       (req.nickname, req.password, req.email))
        conn.commit()
        conn.close()
        return {"status": "success"}
    conn.close()
    raise HTTPException(status_code=400, detail="Неверный код")

@app.post("/auth/login")
def login(req: LoginRequest):
    conn = sqlite3.connect("messenger.db")
    cursor = conn.cursor()
    cursor.execute("SELECT password, nickname FROM users WHERE email = ?", (req.email,))
    res = cursor.fetchone()
    conn.close()
    if res and res[0] == req.password:
        return {"status": "success", "nickname": res[1], "email": req.email}
    raise HTTPException(status_code=401, detail="Ошибка входа")

active_connections = {}
@app.websocket("/ws/{email}")
async def websocket_endpoint(websocket: WebSocket, email: str):
    await websocket.accept()
    active_connections[email] = websocket
    try:
        while True:
            data = await websocket.receive_json()
            receiver = data.get("receiver")
            if receiver in active_connections:
                await active_connections[receiver].send_json({
                    "sender": email, "text": data.get("text"), "time": data.get("time")
                })
    except WebSocketDisconnect:
        if email in active_connections: del active_connections[email]