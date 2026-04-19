import os
import sqlite3
import random
import smtplib
from email.mime.text import MIMEText
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import EmailReq, CodeReq, FinalRegReq, LoginReq
from database import init_db

load_dotenv()
app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

init_db()

def send_mail(to, code):
    msg = MIMEText(f"Твой код подтверждения BOOM: {code}")
    msg['Subject'] = 'Вход в BOOM'
    msg['From'] = SMTP_EMAIL
    msg['To'] = to
    try:
        s = smtplib.SMTP_SSL('smtp.mail.ru', 465, timeout=7)
        s.login(SMTP_EMAIL, SMTP_PASSWORD)
        s.send_message(msg)
        s.quit()
        return True
    except: 
        return False

@app.post("/auth/start")
def start_auth(req: EmailReq):
    conn = sqlite3.connect("messenger.db")
    cur = conn.cursor()
    cur.execute("SELECT password FROM users WHERE email = ?", (req.email,))
    user = cur.fetchone()
    
    # Если юзер уже есть в базе — отправляем его на страницу логина
    if user and user[0]:
        return {"action": "login", "message": "Email найден, введите пароль"}
    
    code = str(random.randint(1000, 9999))
    cur.execute("INSERT OR REPLACE INTO users (email, auth_code) VALUES (?, ?)", (req.email, code))
    conn.commit()
    conn.close()
    
    if send_mail(req.email, code): 
        return {"action": "verify_code"}
    raise HTTPException(status_code=500, detail="Ошибка отправки почты")

@app.post("/auth/verify-code")
def verify_code(req: CodeReq):
    conn = sqlite3.connect("messenger.db")
    cur = conn.cursor()
    cur.execute("SELECT auth_code FROM users WHERE email = ?", (req.email,))
    res = cur.fetchone()
    if res and res[0] == req.code: 
        return {"status": "ok"}
    raise HTTPException(status_code=400, detail="Неверный код")

@app.post("/auth/finalize")
def finalize(req: FinalRegReq):
    conn = sqlite3.connect("messenger.db")
    cur = conn.cursor()
    
    # ИСПРАВЛЕНИЕ: Исключаем нашу собственную почту из проверки!
    cur.execute("SELECT email FROM users WHERE username = ? AND email != ?", (req.username, req.email))
    if cur.fetchone(): 
        conn.close()
        raise HTTPException(status_code=400, detail="Этот @username уже занят!")
    
    colors = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#FF33A8", "#33FFF5"]
    avatar = random.choice(colors)
    
    cur.execute("UPDATE users SET username=?, nickname=?, password=?, avatar_color=?, auth_code=NULL WHERE email=?",
                (req.username, req.nickname, req.password, avatar, req.email))
    conn.commit()
    conn.close()
    return {"status": "done"}

@app.post("/auth/login")
def login(req: LoginReq):
    conn = sqlite3.connect("messenger.db")
    cur = conn.cursor()
    cur.execute("SELECT password, username, nickname, avatar_color FROM users WHERE email = ?", (req.email,))
    res = cur.fetchone()
    conn.close()
    
    if res and res[0] == req.password:
        return {"status": "ok", "username": res[1], "nickname": res[2], "avatar": res[3], "email": req.email}
    raise HTTPException(status_code=401, detail="Неверный пароль")

active_connections = {}

@app.websocket("/ws/{email}")
async def websocket_endpoint(websocket: WebSocket, email: str):
    await websocket.accept()
    active_connections[email] = websocket
    try:
        while True:
            data = await websocket.receive_json()
            receiver = data.get("receiver")
            
            # Сохраняем сообщение
            conn = sqlite3.connect("messenger.db")
            cur = conn.cursor()
            cur.execute("INSERT INTO messages (sender_email, receiver_email, text) VALUES (?, ?, ?)",
                        (email, receiver, data.get("text")))
            conn.commit()
            conn.close()

            # Отправляем получателю
            if receiver in active_connections:
                await active_connections[receiver].send_json({
                    "sender": email, 
                    "text": data.get("text"), 
                    "time": data.get("time")
                })
    except WebSocketDisconnect:
        if email in active_connections: 
            del active_connections[email]