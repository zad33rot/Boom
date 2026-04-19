import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ currentUser, onLogout, onUpdateUser }) {
  const [messages, setMessages] = useState([]);
  const [knownUsers, setKnownUsers] = useState({}); // ПАМЯТЬ ПРИЛОЖЕНИЯ НА ИМЕНА
  const [text, setText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editNick, setEditNick] = useState(currentUser.nickname);
  const [editUser, setEditUser] = useState(currentUser.username);
  
  const ws = useRef(null);
  const scrollRef = useRef(null);
  const myEmail = currentUser.email;

  // 1. Загрузка истории при старте
  useEffect(() => {
    fetch(`http://193.233.139.208:8000/messages/${myEmail}`)
      .then(res => res.json())
      .then(data => {
        setMessages(data.messages);
        const usersMap = {};
        data.users.forEach(u => usersMap[u.email] = u);
        setKnownUsers(usersMap);
      })
      .catch(() => console.log("Ошибка загрузки истории"));
  }, [myEmail]);

  // 2. WebSocket
  useEffect(() => {
    ws.current = new WebSocket(`ws://193.233.139.208:8000/ws/${myEmail}`);
    ws.current.onmessage = (e) => setMessages(prev => [...prev, JSON.parse(e.data)]);
    return () => ws.current.close();
  }, [myEmail]);

  // 3. Поиск (пополняет память)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        try {
          const res = await fetch(`http://193.233.139.208:8000/users/search?q=${searchQuery}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(Array.isArray(data) ? data : []);
            // Запоминаем найденных пользователей
            const usersMap = {};
            data.forEach(u => usersMap[u.email] = u);
            setKnownUsers(prev => ({...prev, ...usersMap}));
          }
        } catch {}
      } else setSearchResults([]);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Отправка сообщения
  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    const msg = { sender: myEmail, receiver: activeChat.email, text, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) };
    ws.current.send(JSON.stringify(msg));
    setMessages(prev => [...prev, msg]);
    setText('');
  };

  // Сохранение настроек
  const saveSettings = async () => {
    try {
      const res = await fetch('http://193.233.139.208:8000/users/update', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: myEmail, nickname: editNick, username: editUser })
      });
      const data = await res.json();
      if(res.ok) {
        onUpdateUser(data); // Обновляем в App.jsx
        setIsSettingsOpen(false);
      } else alert(data.detail || "Ошибка сохранения");
    } catch { alert("Ошибка сервера"); }
  };

  const dialogs = [...new Set(messages.map(m => m.sender === myEmail ? m.receiver : m.sender))];

  return (
    <div className="boom-app">
      {/* МОДАЛЬНОЕ ОКНО НАСТРОЕК */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>⚙️ Настройки профиля</h3>
            <div className="modal-body">
              <label>Отображаемое имя</label>
              <input value={editNick} onChange={e=>setEditNick(e.target.value)} />
              <label>@username (уникальный)</label>
              <input value={editUser} onChange={e=>setEditUser(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button onClick={saveSettings} className="save-btn">Сохранить</button>
              <button onClick={() => setIsSettingsOpen(false)} className="cancel-btn">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Выезжающее меню */}
      <div className={`sidebar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)} />
      <div className={`drawer ${isMenuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
           <div className="avatar profile-avatar" style={{background: currentUser.avatar}}>{currentUser.nickname[0]}</div>
           <h3>{currentUser.nickname}</h3>
           <span>@{currentUser.username}</span>
        </div>
        <div className="drawer-content">
          <button className="menu-item" onClick={() => {setIsSettingsOpen(true); setIsMenuOpen(false);}}>
            <span>⚙️</span> Настройки
          </button>
          <button className="menu-item logout" onClick={onLogout}><span>🚪</span> Выйти</button>
        </div>
      </div>

      {/* Левая панель */}
      <div className="sidebar">
        <div className="sidebar-header">
          <button className="icon-btn" onClick={() => setIsMenuOpen(true)}>☰</button>
          <h2>BOOM</h2>
        </div>
        <div className="search-bar">
          <input placeholder="Поиск (минимум 2 буквы)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="chat-list">
          {searchQuery.length > 1 ? (
            searchResults.map(user => (
              <div key={user.email} className="chat-item search-res" onClick={() => {setActiveChat(user); setSearchQuery('');}}>
                <div className="avatar sm" style={{background: user.avatar}}>{user.nickname[0]}</div>
                <div className="chat-info"><div className="name">{user.nickname}</div><div className="sub">@{user.username}</div></div>
              </div>
            ))
          ) : (
            dialogs.map(email => {
              // Вот она магия! Достаем из памяти или ставим заглушку, пока грузится
              const u = knownUsers[email] || { email, nickname: email.split('@')[0], username: '...', avatar: '#333' };
              return (
                <div key={email} className={`chat-item ${activeChat?.email === email ? 'active' : ''}`} onClick={() => setActiveChat(u)}>
                  <div className="avatar sm" style={{background: u.avatar}}>{u.nickname[0].toUpperCase()}</div>
                  <div className="chat-info"><div className="name">{u.nickname}</div><div className="sub">@{u.username}</div></div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Чат */}
      <div className="main-chat">
        {activeChat ? (
          <>
            <div className="chat-top">
              <div className="avatar sm" style={{background: activeChat.avatar}}>{activeChat.nickname[0]}</div>
              <div><div className="name">{activeChat.nickname}</div><div className="status">В сети</div></div>
            </div>
            <div className="message-list">
              {messages.filter(m => (m.sender === myEmail && m.receiver === activeChat.email) || (m.sender === activeChat.email && m.receiver === myEmail)).map((m, i) => (
                <div key={i} className={`message-wrapper ${m.sender === myEmail ? 'sent' : 'received'}`}>
                  <div className="message-box">
                    {m.text}
                    <div className="time">{m.time} {m.sender === myEmail && '✓✓'}</div>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <form className="input-row" onSubmit={send}>
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="Сообщение..." />
              <button type="submit" className="send-btn">➤</button>
            </form>
          </>
        ) : (
          <div className="empty-state"><div className="icon">💬</div><p>Выберите чат или найдите друга</p></div>
        )}
      </div>
    </div>
  );
}