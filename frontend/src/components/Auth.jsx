import React, { useState } from 'react';
const API = 'http://193.233.139.208:8000';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [err, setErr] = useState('');

  const login = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) onLogin(email); else setErr('Ошибка входа');
  };

  const regStep1 = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/auth/register-step1`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (res.ok) setStep(2); else setErr('Ошибка отправки кода');
  };

  const regStep2 = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/auth/confirm-registration`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, nickname, password })
    });
    if (res.ok) onLogin(email); else setErr('Ошибка регистрации');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">BOOM</h1>
        <div className="auth-tabs">
          <button className={isLogin ? 'active' : ''} onClick={() => setIsLogin(true)}>Вход</button>
          <button className={!isLogin ? 'active' : ''} onClick={() => {setIsLogin(false); setStep(1);}}>Регистрация</button>
        </div>
        {isLogin ? (
          <form className="auth-form" onSubmit={login}>
            <input type="email" placeholder="Email" onChange={e=>setEmail(e.target.value)} required />
            <input type="password" placeholder="Пароль" onChange={e=>setPassword(e.target.value)} required />
            <button>Войти</button>
          </form>
        ) : (
          step === 1 ? (
            <form className="auth-form" onSubmit={regStep1}>
              <input type="email" placeholder="Email для кода" onChange={e=>setEmail(e.target.value)} required />
              <button>Получить код</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={regStep2}>
              <input type="text" placeholder="Код" onChange={e=>setCode(e.target.value)} required />
              <input type="text" placeholder="Никнейм" onChange={e=>setNickname(e.target.value)} required />
              <input type="password" placeholder="Пароль" onChange={e=>setPassword(e.target.value)} required />
              <button>Создать аккаунт</button>
            </form>
          )
        )}
        {err && <p style={{color:'red', marginTop:10}}>{err}</p>}
      </div>
    </div>
  );
}