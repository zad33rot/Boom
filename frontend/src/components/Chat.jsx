import { useState, useEffect, useRef } from 'react';

// МАГИЯ АВАТАРОК: Компонент, который генерирует цветную аватарку по имени
const Avatar = ({ name, size = 48, showOnline = false, isOnline = false, bgApp = '#17171e' }) => {
  const getColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    // Генерируем сочный HSL цвет
    return `hsl(${hash % 360}, 70%, 55%)`;
  };
  
  const color = getColor(name || 'A');
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div style={{ width: size, height: size, minWidth: size, borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: size * 0.45, position: 'relative', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
      {initial}
      {showOnline && isOnline && (
        <div style={{ position: 'absolute', bottom: '0px', right: '0px', width: size * 0.25, height: size * 0.25, backgroundColor: '#00E676', borderRadius: '50%', border: `2px solid ${bgApp}` }} />
      )}
    </div>
  );
};

export default function Chat({ token, currentUser, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const [myChats, setMyChats] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const socketRef = useRef(null);
  const [showProfile, setShowProfile] = useState(false);
  const messagesEndRef = useRef(null); // Для автоскролла вниз

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  const loadMyChats = () => {
    fetch(`http://127.0.0.1:8000/my-chats/${currentUser}`)
      .then(res => res.json())
      .then(data => setMyChats(data))
      .catch(err => console.error(err));
  };

  useEffect(() => { loadMyChats(); }, [currentUser]);

  useEffect(() => {
    if (searchQuery.trim() === '') { setSearchResults([]); return; }
    fetch(`http://127.0.0.1:8000/users?q=${searchQuery}`)
      .then(res => res.json())
      .then(data => setSearchResults(data.filter(u => u !== currentUser)))
      .catch(err => console.error(err));
  }, [searchQuery, currentUser]);

  useEffect(() => {
    socketRef.current = new WebSocket(`ws://127.0.0.1:8000/ws/${currentUser}`);
    
    socketRef.current.onmessage = (event) => {
      const incomingMsg = JSON.parse(event.data);
      if (incomingMsg.type === 'status') { setOnlineUsers(incomingMsg.users); return; }
      if (incomingMsg.type === 'typing') {
        if (incomingMsg.receiver === currentUser) {
          setTypingUsers(prev => ({ ...prev, [incomingMsg.sender]: true }));
          setTimeout(() => setTypingUsers(prev => ({ ...prev, [incomingMsg.sender]: false })), 2000);
        }
        return;
      }

      setMessages((prev) => [...prev, incomingMsg]);
      if (!myChats.includes(incomingMsg.sender) && incomingMsg.sender !== currentUser) loadMyChats();
      if (incomingMsg.sender !== currentUser && Notification.permission === 'granted') {
        new Notification(`Boom 💥: ${incomingMsg.sender}`, { body: incomingMsg.text });
      }
    };
    return () => { if (socketRef.current) socketRef.current.close(); };
  }, [currentUser, myChats]);

  useEffect(() => {
    if (selectedUser) {
      setMessages([]); 
      fetch(`http://127.0.0.1:8000/history/${currentUser}/${selectedUser}`)
        .then(res => res.json())
        .then(history => setMessages(history))
        .catch(err => console.error(err));
    }
  }, [selectedUser, currentUser]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

const sendMessage = () => {
    // ДОБАВЛЕНО: Проверяем === WebSocket.OPEN
    if (input.trim() !== '' && socketRef.current && socketRef.current.readyState === WebSocket.OPEN && selectedUser) {
      const msgData = { type: 'message', sender: currentUser, receiver: selectedUser, text: input };
      socketRef.current.send(JSON.stringify(msgData)); 
      setInput('');
      
      if (!myChats.includes(selectedUser)) {
        setMyChats(prev => [selectedUser, ...prev]);
        setSearchQuery('');
      }
    } else if (socketRef.current && socketRef.current.readyState !== WebSocket.OPEN) {
      // Если связь оборвалась, мягко предупреждаем в консоли, а не крашим приложение
      console.warn("Соединение с сервером потеряно. Пожалуйста, обновите страницу.");
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    // ДОБАВЛЕНО: Проверяем === WebSocket.OPEN
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && selectedUser) {
      socketRef.current.send(JSON.stringify({ type: 'typing', sender: currentUser, receiver: selectedUser }));
    }
  };

  const displayUsers = searchQuery ? searchResults : myChats;

  const theme = {
    bgApp: '#0e0e12', bgSidebar: '#17171e', bgChat: '#101015', bgInput: '#1d1d26',
    accent: '#FF2A5F', accentHover: '#ff4b77', textMain: '#ffffff', textMuted: '#7f7f8c',
    bubbleMine: '#FF2A5F', bubbleTheirs: '#22222d', border: '#24242f'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: "'Segoe UI', sans-serif", backgroundColor: theme.bgApp, color: theme.textMain }}>
      
      {/* ЛЕВАЯ ПАНЕЛЬ */}
      <div style={{ width: '350px', minWidth: '350px', backgroundColor: theme.bgSidebar, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${theme.border}`, position: 'relative' }}>
        
        {showProfile ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'slideIn 0.3s ease-out' }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button onClick={() => setShowProfile(false)} style={{ background: 'transparent', border: 'none', color: theme.textMain, cursor: 'pointer', fontSize: '20px' }}>←</button>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Мой профиль</h2>
            </div>
            
            <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <Avatar name={currentUser} size={100} />
              
              {/* РЕДАКТОР НИКНЕЙМА */}
              <div style={{ marginTop: '20px', width: '100%' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: theme.textMuted }}>Ваш никнейм (виден всем):</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ backgroundColor: theme.bgInput, padding: '12px', borderRadius: '12px 0 0 12px', color: theme.textMuted, border: `1px solid ${theme.border}`, borderRight: 'none' }}>@</span>
                  <input 
                    type="text" 
                    id="nicknameInput"
                    defaultValue={currentUser}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: '0 12px 12px 0', border: `1px solid ${theme.border}`, borderLeft: 'none', outline: 'none', backgroundColor: theme.bgInput, color: theme.textMain, fontSize: '16px', fontWeight: 'bold' }}
                  />
                </div>
                <button 
                  onClick={async () => {
                    const newNick = document.getElementById('nicknameInput').value.trim();
                    if (newNick === '' || newNick === currentUser) return;
                    
                    try {
                      const res = await fetch('http://127.0.0.1:8000/update-nickname', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ old_nick: currentUser, new_nick: newNick })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        localStorage.setItem('token', data.access_token);
                        window.location.reload(); // Перезагружаем интерфейс для обновления данных
                      } else {
                        alert(data.detail); // Покажет ошибку "Никнейм занят"
                      }
                    } catch (e) { console.error(e); }
                  }}
                  style={{ width: '100%', padding: '12px', marginTop: '15px', borderRadius: '12px', border: 'none', backgroundColor: `${theme.accent}30`, color: theme.accent, fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = `${theme.accent}50`}
                  onMouseLeave={(e) => e.target.style.backgroundColor = `${theme.accent}30`}
                >
                  Сохранить новый никнейм
                </button>
              </div>

              <button onClick={onLogout} style={{ marginTop: 'auto', marginBottom: '20px', width: '100%', padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#ff444420', color: '#ff4444', fontWeight: 'bold', cursor: 'pointer' }}>Выйти из аккаунта</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: '15px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, color: theme.accent, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '24px', letterSpacing: '1px' }}>💥 BOOM</h2>
                <button onClick={() => setShowProfile(true)} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: '24px' }}>☰</button>
              </div>
              <input type="text" placeholder="Поиск чатов..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: 'none', outline: 'none', backgroundColor: theme.bgInput, color: theme.textMain, boxSizing: 'border-box' }}/>
            </div>
            <div style={{ overflowY: 'auto', padding: '10px', flex: 1 }}>
              {displayUsers.map(user => {
                const isOnline = onlineUsers.includes(user);
                return (
                  <div key={user} onClick={() => setSelectedUser(user)} style={{ padding: '12px', marginBottom: '4px', borderRadius: '10px', cursor: 'pointer', backgroundColor: selectedUser === user ? 'rgba(255, 42, 95, 0.1)' : 'transparent', border: selectedUser === user ? `1px solid ${theme.accent}` : '1px solid transparent', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar name={user} size={48} showOnline={true} isOnline={isOnline} bgApp={theme.bgSidebar} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', fontSize: '16px' }}>{user}</span>
                      <span style={{ fontSize: '13px', color: isOnline ? '#00E676' : theme.textMuted }}>{isOnline ? 'в сети' : 'был(а) недавно'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ПРАВАЯ ПАНЕЛЬ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.bgChat }}>
        {selectedUser ? (
          <>
            <div style={{ padding: '15px 25px', backgroundColor: theme.bgSidebar, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '15px', height: '50px' }}>
              <Avatar name={selectedUser} size={40} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{selectedUser}</h3>
                <span style={{ fontSize: '13px', color: typingUsers[selectedUser] ? theme.accent : (onlineUsers.includes(selectedUser) ? '#00E676' : theme.textMuted) }}>
                  {typingUsers[selectedUser] ? 'печатает... ✍️' : (onlineUsers.includes(selectedUser) ? 'в сети' : 'не в сети')}
                </span>
              </div>
            </div>
            
            <div style={{ flex: 1, padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {messages
                .filter(msg => (msg.sender === currentUser && msg.receiver === selectedUser) || (msg.sender === selectedUser && msg.receiver === currentUser))
                .map((msg, index) => {
                  const isMine = msg.sender === currentUser;
                  return (
                    <div key={index} style={{ 
                      alignSelf: isMine ? 'flex-end' : 'flex-start',
                      backgroundColor: isMine ? theme.bubbleMine : theme.bubbleTheirs,
                      color: '#fff',
                      marginBottom: '10px', padding: '10px 14px', borderRadius: '18px',
                      borderBottomRightRadius: isMine ? '4px' : '18px',
                      borderBottomLeftRadius: !isMine ? '4px' : '18px',
                      maxWidth: '60%', boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                      fontSize: '15px', lineHeight: '1.4',
                      display: 'flex', alignItems: 'flex-end', gap: '10px'
                    }}>
                      {/* Текст сообщения */}
                      <span style={{ wordBreak: 'break-word' }}>{msg.text}</span>
                      
                      {/* МЕТКА ВРЕМЕНИ */}
                      <span style={{ fontSize: '11px', color: isMine ? 'rgba(255,255,255,0.7)' : theme.textMuted, whiteSpace: 'nowrap', marginBottom: '-2px' }}>
                        {msg.timestamp || "только что"}
                      </span>
                    </div>
                  );
              })}
              {/* Невидимый элемент для автоскролла вниз */}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '20px 30px', backgroundColor: theme.bgChat, display: 'flex', gap: '15px', alignItems: 'center' }}>
              <input 
                type="text" value={input} onChange={handleInputChange} onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Написать сообщение..."
                style={{ flex: 1, padding: '16px 24px', borderRadius: '24px', border: `1px solid ${theme.border}`, outline: 'none', backgroundColor: theme.bgInput, color: theme.textMain, fontSize: '16px' }}
              />
              <button onClick={sendMessage} style={{ width: '54px', height: '54px', borderRadius: '50%', border: 'none', backgroundColor: theme.accent, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: theme.textMuted, backgroundColor: theme.bgApp }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: theme.bgInput, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', marginBottom: '20px' }}>💥</div>
            <h2 style={{ margin: '0 0 10px 0', color: theme.textMain }}>BOOM MESSENGER</h2>
            <p style={{ margin: 0, fontSize: '15px' }}>Выберите чат для начала общения</p>
          </div>
        )}
      </div>
    </div>
  );
}