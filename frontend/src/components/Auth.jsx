import React, { useState } from 'react';

const API = 'http://193.233.139.208:8000';

export default function Auth({ onLogin }) {
  const [step, setStep] = useState('email'); 
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({ code: '', user: '', nick: '', pass: '' });
  const [err, setErr] = useState('');

  const next = async (url, body, nextStep) => {
    setErr('');
    try {
      const res = await fetch(`${API}${url}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.action) setStep(data.action);
        else if (nextStep) setStep(nextStep);
        else onLogin(data); // Передаем ВЕСЬ объект профиля!
      } else {
        const errorMessage = Array.isArray(data.detail) ? "Заполните все поля" : data.detail;
        setErr(errorMessage || 'Ошибка связи');
      }
    } catch { setErr('Ошибка связи с сервером'); }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">BOOM</h1>
        
        {step === 'email' && (
          <form onSubmit={(e) => {e.preventDefault(); next('/auth/start', { email });}}>
            <p style={{marginBottom: 15, fontSize: 14, color: '#ccc'}}>Введите почту для входа или регистрации</p>
            <input placeholder="Email" type="email" onChange={e=>setEmail(e.target.value)} required />
            <button>Продолжить</button>
          </form>
        )}

        {step === 'verify_code' && (
          <form onSubmit={(e) => {e.preventDefault(); next('/auth/verify-code', { email, code: formData.code }, 'profile');}}>
            <p style={{marginBottom: 15, fontSize: 14, color: '#ccc'}}>Код отправлен на {email}</p>
            <input placeholder="4-значный код" onChange={e=>setFormData({...formData, code: e.target.value})} required />
            <button>Подтвердить</button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={(e) => {
            e.preventDefault(); 
            // ВАЖНО: 3-й аргумент 'login' перекинет нас на вход!
            next('/auth/finalize', { 
              email: email, code: formData.code, username: formData.user,
              nickname: formData.nick, password: formData.pass
            }, 'login'); 
          }}>
            <h2 style={{marginBottom: 15}}>Создание профиля</h2>
            <input placeholder="@username (индивидуальный)" onChange={e=>setFormData({...formData, user: e.target.value})} required />
            <input placeholder="Имя (как вас увидят)" onChange={e=>setFormData({...formData, nick: e.target.value})} required />
            <input placeholder="Пароль" type="password" onChange={e=>setFormData({...formData, pass: e.target.value})} required />
            <button>Начать общение</button>
          </form>
        )}

        {step === 'login' && (
          <form onSubmit={(e) => {e.preventDefault(); next('/auth/login', { email, password: formData.pass });}}>
            <p style={{marginBottom: 15, fontSize: 14, color: '#ccc'}}>С возвращением!</p>
            <input placeholder="Пароль" type="password" onChange={e=>setFormData({...formData, pass: e.target.value})} required />
            <button>Войти</button>
          </form>
        )}

        {err && <p className="error-text">{err}</p>}
      </div>
    </div>
  );
}