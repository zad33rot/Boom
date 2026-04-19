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
async def update_profile(req: ProfileUpdateReq):
    conn = sqlite3.connect("messenger.db"); cur = conn.cursor()
    cur.execute("SELECT email FROM users WHERE username = ? AND email != ?", (req.username, req.email))
    if cur.fetchone(): conn.close(); raise HTTPException(status_code=400, detail="Юзернейм уже занят!")
    cur.execute("UPDATE users SET username=?, nickname=? WHERE email=?", (req.username, req.nickname, req.email))
    conn.commit()
    cur.execute("SELECT password, username, nickname, avatar_color FROM users WHERE email = ?", (req.email,))
    res = cur.fetchone(); conn.close()
    
    updated_user = {"email": req.email, "username": res[1], "nickname": res[2], "avatar": res[3]}

    for conn_ws in list(active_connections.values()):
        try:
            await conn_ws.send_json({"type": "profile_update", "user": updated_user})
        except: pass

    return {"status": "ok", **updated_user}

@app.get("/users/search")
def search_users(q: str):
    conn = sqlite3.connect("messenger.db"); cur = conn.cursor()
    cur.execute("SELECT username, nickname, avatar_color, email FROM users WHERE (username LIKE ? OR nickname LIKE ?) AND password IS NOT