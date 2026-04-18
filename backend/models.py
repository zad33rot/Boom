from pydantic import BaseModel
from typing import Optional

# Шаг 1: Только почта для получения кода
class RegisterRequest(BaseModel):
    email: str

# Шаг 2: Код + создание профиля
class ConfirmRequest(BaseModel):
    email: str
    code: str
    nickname: str
    password: str

# Вход по паролю
class LoginRequest(BaseModel):
    email: str
    password: str

class MessageModel(BaseModel):
    sender: str
    receiver: str
    text: str
    time: Optional[str] = None