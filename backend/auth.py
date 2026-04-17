from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta

# Секретный ключ сервера (в реальном проекте его прячут, но для пет-проекта пойдет)
SECRET_KEY = "my_super_secret_key_for_messenger"
ALGORITHM = "HS256"

# Настройка для хэширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 1. Функция: превращает обычный пароль в хэш
def get_password_hash(password: str):
    return pwd_context.hash(password)

# 2. Функция: проверяет, совпадает ли введенный пароль с хэшем из базы
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# 3. Функция: создает JWT токен (срок действия 1 день)
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=1)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt