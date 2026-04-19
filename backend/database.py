import sqlite3

def init_db():
    conn = sqlite3.connect("messenger.db")
    cursor = conn.cursor()
    
    # Таблица пользователей (username теперь УНИКАЛЬНЫЙ)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            nickname TEXT,
            password TEXT,
            avatar_color TEXT,
            auth_code TEXT
        )
    ''')
    
    # Таблица сообщений
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_email TEXT,
            receiver_email TEXT,
            text TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ База данных готова")

if __name__ == "__main__":
    init_db()