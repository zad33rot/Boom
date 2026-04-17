import { useState, useEffect } from 'react';
import Chat from './components/Chat';
import Auth from './components/Auth';
import './index.css'

// Маленькая магия: функция для расшифровки внутренностей JWT-токена
const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

function App() {
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // <-- Добавили состояние для имени

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setCurrentUser(parseJwt(savedToken).sub); // Достаем имя при загрузке
    }
  }, []);

  const handleLogin = (newToken) => {
    setToken(newToken);
    setCurrentUser(parseJwt(newToken).sub); // Достаем имя при входе
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  };

  return (
    <div>
      {!token ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Верхняя панель с твоим именем и кнопкой выхода */}
          <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '15px', alignItems: 'center', zIndex: 100 }}>
            <button 
              onClick={handleLogout} 
              style={{ padding: '5px 10px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Выйти
            </button>
          </div>
          
          {/* Передаем твое имя внутрь чата */}
          {/* Убрали старую кнопку, теперь передаем handleLogout внутрь чата */}
          <Chat token={token} currentUser={currentUser} onLogout={handleLogout} />      
        </div>
      )}
    </div>
  );
}

export default App;