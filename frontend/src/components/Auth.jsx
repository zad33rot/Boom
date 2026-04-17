import { useState } from 'react';

export default function Auth({ onLogin }) {
  const [step, setStep] = useState(1); // 1 - ввод телефона, 2 - ввод кода
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Шаг 1: Отправляем номер телефона на сервер
  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (phone.length < 5) {
      setMessage('❌ Введите корректный номер');
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('http://127.0.0.1:8000/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      if (response.ok) {
        setStep(2); // Переключаем на экран ввода кода
      } else {
        setMessage('❌ Ошибка отправки кода');
      }
    } catch (error) {
      setMessage('❌ Сервер недоступен');
    } finally {
      setIsLoading(false);
    }
  };

  // Шаг 2: Отправляем код подтверждения
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://127.0.0.1:8000/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        onLogin(data.access_token);
      } else {
        setMessage('❌ Неверный код подтверждения');
      }
    } catch (error) {
      setMessage('❌ Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  };

  // Цвета Boom
  const theme = {
    bgApp: '#0e0e12',
    bgPanel: '#17171e',
    accent: '#FF2A5F',
    textMain: '#ffffff',
    textMuted: '#7f7f8c',
    inputBg: '#1d1d26'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: theme.bgApp, alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      
      <div style={{ backgroundColor: theme.bgPanel, padding: '40px', borderRadius: '24px', width: '350px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Логотип */}
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: theme.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '20px', boxShadow: `0 0 20px ${theme.accent}40` }}>
          💥
        </div>
        
        <h2 style={{ color: theme.textMain, margin: '0 0 10px 0', fontSize: '28px', fontWeight: '600' }}>BOOM</h2>
        <p style={{ color: theme.textMuted, margin: '0 0 30px 0', textAlign: 'center', fontSize: '15px' }}>
          {step === 1 ? 'Введите номер телефона для входа' : `Код отправлен на ${phone}`}
        </p>

        {/* Формы */}
        {step === 1 ? (
          <form onSubmit={handleRequestCode} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="tel" 
              placeholder="+7 (999) 000-00-00" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              style={{ width: '100%', boxSizing: 'border-box', padding: '15px', borderRadius: '12px', border: '1px solid #24242f', backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '16px', outline: 'none', textAlign: 'center', letterSpacing: '1px' }}
            />
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: theme.accent, color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? 'Отправка...' : 'Получить код'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="text" 
              placeholder="0000" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={4}
              style={{ width: '100%', boxSizing: 'border-box', padding: '15px', borderRadius: '12px', border: `1px solid ${theme.accent}`, backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '24px', outline: 'none', textAlign: 'center', letterSpacing: '10px', fontWeight: 'bold' }}
            />
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: theme.accent, color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? 'Проверка...' : 'Войти'}
            </button>
            
            <p 
              onClick={() => {setStep(1); setCode('');}} 
              style={{ color: theme.textMuted, fontSize: '14px', textAlign: 'center', cursor: 'pointer', marginTop: '10px', textDecoration: 'underline' }}
            >
              Изменить номер
            </p>
          </form>
        )}

        {/* Вывод ошибок */}
        {message && <div style={{ marginTop: '20px', color: '#ff4444', fontSize: '14px', backgroundColor: '#ff444420', padding: '10px 15px', borderRadius: '8px', width: '100%', boxSizing: 'border-box', textAlign: 'center' }}>{message}</div>}
        
      </div>
    </div>
  );
}