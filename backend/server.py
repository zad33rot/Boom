import os
import random
import sqlite3
import httpx
from typing import List, Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Загружаем переменные из файла .env
load_dotenv()

EXOLVE_API_KEY = os.getenv("EXOLVE_API_KEY")
EXOLVE_NUMBER = os.getenv("EXOLVE_NUMBER")

app = FastAPI()

# Настройка CORS для десктопного приложения
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
    cursor.execute('''CREATE TABLE IF NOT EXISTS users 
                      (phone TEXT PRIMARY KEY, nickname TEXT, auth_code TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS messages 
                      (sender TEXT, receiver TEXT, text TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

init_db()

# --- ЛОГИКА СМС (EXOLVE) ---
async def send_sms_exolve(phone: str, code: str):
    url = "https://api.exolve.ru/messaging/v1/sms/send"
    headers = {
        "Authorization": f"Bearer {EXOLVE_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "number": EXOLVE_NUMBER,
        "destination": phone,
        "text": f"Ваш код подтверждения BOOM: {code}"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                print(f"✅ СМС успешно отправлено на {phone}")
            else:
                print(f"❌ Ошибка Exolve: {response.text}")
        except Exception as e:
            print(f"⚠️ Ошибка сети при отправке СМС: {e}")

# --- МОДЕЛИ ДАННЫХ ---
class AuthRequest(BaseModel):
    phone: str

class VerifyRequest(BaseModel):
    phone: str
    code: str
    nickname: str = None

# --- ЭНДПОИНТЫ АВТОРИЗАЦИИ ---
@app.post("/auth/send-code")
async def send_code(req: AuthRequest):
    code = str(random.randint(1000, 9999))
    conn = sqlite3.connect("messenger.db")
    cursor = conn.cursor()
    
    # Сохраняем код в базу (создаем юзера, если его нет)
    cursor.execute("INSERT OR REPLACE INTO users (phone, auth_code) VALUES (?, ?)", (req.phone, code))
    conn.commit()
    conn.close()
    
    # Отправляем реальное СМС
    await send_sms_exolve(req.phone, code)
    
    return {"status": "code_sent"}

@app.post("/auth/verify")
async def verify_code(req: VerifyRequest):
    conn = sqlite3.connect("messenger.db")
    cursor = conn.cursor()
    cursor.execute("SELECT auth_code FROM users WHERE phone = ?", (req.phone,))
    result = cursor.fetchone()
    
    if result and result[0] == req.code:
        if req.nickname:
            cursor.execute("UPDATE users SET nickname = ? WHERE phone = ?", (req.nickname, req.phone))
        conn.commit()
        conn.close()
        return {"status": "success", "phone": req.phone}
    
    conn.close()
    raise HTTPException(status_code=400, detail="Invalid code")

# --- МЕНЕДЖЕР СОЕДИНЕНИЙ WEBSOCKET ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, phone: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[phone] = websocket

    def disconnect(self, phone: str):
        if phone in self.active_connections:
            del self.active_connections[phone]

    async def send_personal_message(self, message: dict, receiver_phone: str):
        if receiver_phone in self.active_connections:
            await self.active_connections[receiver_phone].send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{phone}")
async def websocket_endpoint(websocket: WebSocket, phone: str):
    await manager.connect(phone, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # data формат: {"receiver": "...", "text": "..."}
            
            # Сохраняем в базу
            conn = sqlite3.connect("messenger.db")
            cursor = conn.cursor()
            cursor.execute("INSERT INTO messages (sender, receiver, text) VALUES (?, ?, ?)",
                           (phone, data['receiver'], data['text']))
            conn.commit()
            conn.close()
            
            # Пересылаем получателю
            await manager.send_personal_message({
                "sender": phone,
                "text": data['text']
            }, data['receiver'])
            
    except WebSocketDisconnect:
        manager.disconnect(phone)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)