import React, { useState } from 'react';

// Твой новый сервер
const API_BASE_URL = 'http://193.233.139.208:8000';

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState(1); // 1 - ввод почты, 2 - ввод кода
  const [error, setError] = useState('');

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
        setStep(2);
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
        // Если всё ок, передаем email в главный компонент (App.jsx), чтобы открыть Chat
        onLogin(email); 
      } else {
        setError('Неверный код.');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером.');
    }
  };

  // --- ОТОБРАЖЕНИЕ ---

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

const styles = {
  container: { maxWidth: '400px', margin: '50px auto', textAlign: 'center', fontFamily: 'sans-serif' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' },
  button: { padding: '10px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  linkButton: { background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' },
  error: { color: 'red', margin: 0 }
};