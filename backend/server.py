import os
import sqlite3
import random
import smtplib
from email.mime.text import MIMEText
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

# === МОДЕЛИ ===
class EmailReq(BaseModel): email: str
class CodeReq(BaseModel): email: str; code: str
class FinalRegReq(BaseModel): email: str; code: str; username: str; nickname: str; password: str
class LoginReq(BaseModel): email: str; password: str
class ProfileUpdateReq(BaseModel): email: str; username: str; nickname: str
class ReadReq(BaseModel): chat_with: str; my_email: str

# === ПОЧТА ===
def send_mail(to, code):
    msg = MIMEText(f"Твой код подтверждения BOOM: {code}")
    msg['Subject'] = 'Вход в BOOM'; msg['From'] = SMTP_EMAIL; msg['To'] = to
    try:
        s = smtplib.SMTP_SSL('smtp.mail.ru', 465, timeout=7)
        s.login(SMTP_EMAIL, SMTP_PASSWORD); s.send_message(msg); s.quit()
        return True
    except: return False

# === АВТОРИЗАЦИЯ ===
@app.post("/auth/start")
def start_auth(req: EmailReq):
    conn = sqlite3.connect("messenger.db"); cur = conn.cursor()
    cur.execute("SELECT password FROM users WHERE email = ?", (req.email,))
    user = cur.fetchone()
    if user and user[0]: return {"action": "login"}
    code = str(random.randint(1000, 9999))
    cur.execute("INSERT OR REPLACE INTO users (email, auth_code) VALUES (?, ?)", (req.email, code))
    conn.commit(); conn.close()
    if send_mail(req.email, code): return {"action": "verify_code"}
    raise HTTPException(status_code=500)

@app.post("/auth/verify-code")
def verify_code(req: CodeReq):
    conn = sqlite3.connect("messenger.db"); cur = conn.cursor()
    cur.execute("SELECT auth_code FROM users WHERE email = ?", (req.email,))
    if (res := cur.fetchone()) and res[0] == req.code: return {"status": "ok"}
    raise HTTPException(status_code=400)

@app.post("/auth/finalize")
def finalize(req: FinalRegReq):
    conn = sqlite3.connect("messenger.db"); cur = conn.cursor()
    cur.execute("SELECT email FROM users WHERE username = ? AND email != ?", (req.username, req.email))
    if cur.fetchone(): raise HTTPException(status_code=400, detail="Busy")
    avatar = random.choice(["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#FF33A8", "#33FFF5"])
    cur.execute("UPDATE users SET username=?, nickname=?, password=?, avatar_color=?, auth_code=NULL WHERE email=?", (req.username, req.nickname, req.password, avatar, req.email))
    conn.commit(); conn.close(); return {"status": "done"}

@app.post("/auth/login")
def login(req: LoginReq):
    conn = sqlite3.connect("messenger.db"); cur = conn.cursor()
    cur.execute("SELECT password, username, nickname, avatar_color FROM users WHERE email = ?", (req.email,))
    res = cur.fetchone(); conn.close()
    if res and res[0] == req.password: return {"status": "ok", "username": res[1], "nickname": res[2], "avatar": res[3], "email": req.email}
    raise HTTPException(status_code=401)

# === ОБНОВЛЕНИЕ ПРОФИЛЯ ===
@app.post("/users/update")
def update_profile(req: ProfileUpdateReq):
    conn = sqlite3.connect("messenger.db"); cur = conn.cursor()
    cur.execute("SELECT email FROM users WHERE username = ? AND email != ?", (req.username, req.email))
    if cur.fetchone(): conn.close(); raise HTTPException(status_code=400, detail="Юзернейм уже занят!")
    cur.execute("UPDATE users SET username=?, nickname=? WHERE email=?", (req.username, req.nickname, req.email))
    conn.commit()
    cur.execute("SELECT password, username, nickname, avatar_color FROM users WHERE email = ?", (req.email,))
    res = cur.fetchone(); conn.close()
    return {"status": "ok", "username": res[1], "nickname": res[2], "avatar": res[3], "email": req.email}

@app.get("/users/search")
def search_users(q: str):
    conn = sqlite3.connect("messenger.db"); cur = conn.cursor()
    cur.execute("SELECT username, nickname, avatar_color, email FROM users WHERE (username LIKE ? OR nickname LIKE ?) AND password IS NOT NULL", (f"%{q}%", f"%{q}%"))
    rows = cur.fetchall(); conn.close()
    return [{"username": r[0], "nickname": r[1], "avatar": r[2], "email": r[3]} for r in rows]

# === ЧАТ И СООБЩЕНИЯ ===
@app.get("/messages/{email}")
def get_messages(email: str):
    conn = sqlite3.connect("messenger.db"); cur = conn.cursor()
    cur.execute("SELECT sender_email, receiver_email, text, timestamp, is_read FROM messages WHERE sender_email = ? OR receiver_email = ? ORDER BY timestamp ASC", (email, email))
    msgs = [{"sender": r[0], "receiver": r[1], "text": r[2], "time": r[3][11:16], "read": bool(r[4])} for r in cur.fetchall()]
    cur.execute("SELECT email, username, nickname, avatar_color FROM users")
    users = {u[0]: {"email": u[0], "username": u[1], "nickname": u[2], "avatar": u[3]} for u in cur.fetchall()}
    conn.close()
    return {"messages": msgs, "users": users}

@app.post("/messages/read")
def mark_as_read(req: ReadReq):
    conn = sqlite3.connect("messenger.db"); cur = conn.cursor()
    cur.execute("UPDATE messages SET is_read = 1 WHERE sender_email = ? AND receiver_email = ?", (req.chat_with, req.my_email))
    conn.commit(); conn.close()
    return {"status": "ok"}

# === ВЕБСОКЕТЫ СО СТАТУСАМИ ===
active_connections = {}

async def broadcast_status(email, status):
    for conn in active_connections.values():
        try:
            await conn.send_json({"type": "status", "email": email, "status": status})
        except: pass

@app.websocket("/ws/{email}")
async def websocket_endpoint(websocket: WebSocket, email: str):
    await websocket.accept()
    active_connections[email] = websocket
    await broadcast_status(email, "online")

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "read_event":
                sender = data.get("sender")
                if sender in active_connections:
                    await active_connections[sender].send_json({"type": "read_update", "by": email})
                continue

            receiver = data.get("receiver")
            conn = sqlite3.connect("messenger.db"); cur = conn.cursor()
            cur.execute("INSERT INTO messages (sender_email, receiver_email, text, is_read) VALUES (?, ?, ?, 0)", (email, receiver, data.get("text")))
            conn.commit(); conn.close()

            if receiver in active_connections:
                await active_connections[receiver].send_json({
                    "type": "msg", "sender": email, "text": data.get("text"), "time": data.get("time"), "read": False
                })
    except WebSocketDisconnect:
        if email in active_connections: del active_connections[email]
        await broadcast_status(email, "offline")