import React, { useState, useEffect, useRef } from 'react';

// Твой новый сервер
const API_BASE_URL = 'http://193.233.139.208:8000';
const WS_BASE_URL = 'ws://193.233.139.208:8000';

export default function Chat() {
  // Состояния авторизации
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState(1); // 1 - ввод почты, 2 - ввод кода, 3 - чат
  const [error, setError] = useState('');

  // Состояния чата
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const ws = useRef(null);

  // 1. Отправка почты для получения кода
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });

      if (response.ok) {
        setStep(2); // Переходим к вводу кода
      } else {
        setError('Ошибка при отправке кода. Проверь почту.');
      }
    } catch (err) {
      setError('Сервер недоступен. Проверь подключение.');
    }
  };

  // 2. Проверка кода и вход
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, code: code, nickname: nickname })
      });

      if (response.ok) {
        setStep(3); // Переходим в чат
        connectWebSocket(email);
      } else {
        setError('Неверный код.');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером.');
    }
  };

  // 3. Подключение к WebSocket для чата
  const connectWebSocket = (userEmail) => {
    ws.current = new WebSocket(`${WS_BASE_URL}/ws/${userEmail}`);
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    ws.current.onclose = () => {
      console.log('Отключено от сервера. Пытаюсь переподключиться...');
      setTimeout(() => connectWebSocket(userEmail), 3000);
    };
  };

  // 4. Отправка сообщения в чате
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (ws.current && messageText && receiverEmail) {
      const msgData = {
        receiver: receiverEmail,
        text: messageText,
        sender: email // Добавляем отправителя для локального отображения
      };
      
      ws.current.send(JSON.stringify(msgData));
      setMessages((prev) => [...prev, msgData]); // Показываем у себя
      setMessageText('');
    }
  };

  // --- ОТОБРАЖЕНИЕ (UI) ---

  // Экран 1: Ввод почты
  if (step === 1) {
    return (
      <div style={styles.container}>
        <h2>Вход в BOOM</h2>
        <form onSubmit={handleSendCode} style={styles.form}>
          <input
            type="email"
            placeholder="Твой Email (например: ivan@mail.ru)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" style={styles.button}>Получить код</button>
          {error && <p style={styles.error}>{error}</p>}
        </form>
      </div>
    );
  }

  // Экран 2: Ввод кода
  if (step === 2) {
    return (
      <div style={styles.container}>
        <h2>Проверка кода</h2>
        <p>Код отправлен на: {email}</p>
        <form onSubmit={handleVerifyCode} style={styles.form}>
          <input
            type="text"
            placeholder="Код из письма"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Твой Никнейм (необязательно)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={styles.input}
          />
          <button type="submit" style={styles.button}>Войти</button>
          {error && <p style={styles.error}>{error}</p>}
          <button type="button" onClick={() => setStep(1)} style={styles.linkButton}>Назад</button>
        </form>
      </div>
    );
  }

  // Экран 3: Чат
  return (
    <div style={styles.chatContainer}>
      <div style={styles.header}>
        <h3>BOOM Messenger</h3>
        <span>Твой аккаунт: {email}</span>
      </div>

      <div style={styles.chatBox}>
        {messages.map((msg, index) => (
          <div key={index} style={msg.sender === email ? styles.myMessage : styles.theirMessage}>
            <strong>{msg.sender === email ? 'Ты' : msg.sender}: </strong>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} style={styles.messageForm}>
        <input
          type="email"
          placeholder="Email получателя"
          value={receiverEmail}
          onChange={(e) => setReceiverEmail(e.target.value)}
          required
          style={styles.inputSmall}
        />
        <input
          type="text"
          placeholder="Текст сообщения"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          required
          style={styles.inputMain}
        />
        <button type="submit" style={styles.buttonSmall}>Отправить</button>
      </form>
    </div>
  );
}

// Базовые стили (можешь заменить на свои CSS/Tailwind классы)
const styles = {
  container: { maxWidth: '400px', margin: '50px auto', textAlign: 'center', fontFamily: 'sans-serif' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' },
  button: { padding: '10px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  linkButton: { background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' },
  error: { color: 'red', margin: 0 },
  chatContainer: { maxWidth: '600px', margin: '20px auto', border: '1px solid #ccc', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '80vh', fontFamily: 'sans-serif' },
  header: { padding: '15px', backgroundColor: '#f1f1f1', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chatBox: { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#dcf8c6', padding: '10px', borderRadius: '10px', maxWidth: '70%' },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', border: '1px solid #eee', padding: '10px', borderRadius: '10px', maxWidth: '70%' },
  messageForm: { display: 'flex', padding: '10px', borderTop: '1px solid #ccc', gap: '10px', backgroundColor: '#fafafa' },
  inputSmall: { flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '5px' },
  inputMain: { flex: 3, padding: '10px', border: '1px solid #ccc', borderRadius: '5px' },
  buttonSmall: { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }
};