from cryptography.fernet import Fernet

# ВАЖНО: В реальных проектах этот ключ прячут, но мы пока оставим тут
SECRET_KEY = b'os.getenv("SECRET_KEY")'

# Создаем объект шифровальщика
cipher = Fernet(SECRET_KEY)

def encrypt_msg(text: str) -> str:
    # Превращаем текст в байты, шифруем и возвращаем как обычную строку
    return cipher.encrypt(text.encode()).decode()

def decrypt_msg(encrypted_text: str) -> str:
    # Берем зашифрованную строку и расшифровываем обратно в текст
    return cipher.decrypt(encrypted_text.encode()).decode()