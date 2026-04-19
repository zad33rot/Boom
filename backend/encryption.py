import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet
load_dotenv()

# Создаем объект шифровальщика
raw_key = os.getenv("SECRET_KEY")

if not raw_key:
    raise ValueError("SECRET_KEY не найден в .env файле!")

SECRET_KEY = raw_key.strip().encode()

# Создаем объект шифровальщика
try:
    cipher = Fernet(SECRET_KEY)
except Exception as e:
    print(f"Ошибка ключа шифрования: {e}")
    raise

def encrypt_msg(text: str) -> str:
    return cipher.encrypt(text.encode()).decode()

def decrypt_msg(encrypted_text: str) -> str:
    return cipher.decrypt(encrypted_text.encode()).decode()