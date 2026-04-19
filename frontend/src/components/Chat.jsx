import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ currentUser, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // Теперь это объект юзера {email, nickname, username...}
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const ws = useRef(null);
  const scrollRef = useRef(null);
  const myEmail = currentUser.email;

  // 1. WebSocket Подключение
  useEffect(() => {
    ws.current = new WebSocket(`ws://193.233.139.208:8000/ws/${myEmail}`);
    ws.current.onmessage = (e) => setMessages(prev => [...prev, JSON.parse(e.data)]);
    return () => ws.current.close();
  }, [myEmail]);

  // 2. Живой поиск пользователей на сервере
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        const res = await fetch(`http://193.233.139.208:8000/users/search?q=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    }, 300); // Задержка 300мс, чтобы не спамить сервер
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    const msg = { 
      sender: myEmail, 
      receiver: activeChat.email, 
      text, 
      time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) 
    };
    ws.current.send(JSON.stringify(msg));
    setMessages(prev => [...prev, msg]);
    setText('');
  };

  // Список существующих диалогов
  const dialogs = [...new Set(messages.map(m => m.sender === myEmail ? m.receiver : m.sender))];

  return (
    <div className="boom-app">
      {/* Меню профиля (Glassmorphism) */}
      <div className={`sidebar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)} />
      <div className={`drawer ${isMenuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
           <div className="avatar profile-avatar" style={{background: currentUser.avatar}}>
             {currentUser.nickname[0]}
           </div>
           <h3>{currentUser.nickname}</h3>
           <span>@{currentUser.username}</span>
        </div>
        <div className="drawer-content">
          <button className="menu-item"><span>👤</span> Профиль</button>
          <button className="menu-item"><span>⚙️</span> Настройки</button>
          <button className="menu-item logout" onClick={onLogout}><span>🚪</span> Выйти</button>
        </div>
      </div>

      {/* Список чатов */}
      <div className="sidebar">
        <div className="sidebar-header">
          <button className="icon-btn" onClick={() => setIsMenuOpen(true)}>☰</button>
          <h2>BOOM</h2>
        </div>
        
        <div className="search-bar">
          <input 
            placeholder="Поиск по @username..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="chat-list">
          {searchQuery.length > 1 ? (
            // РЕЗУЛЬТАТЫ ПОИСКА
            searchResults.map(user => (
              <div key={user.email} className="chat-item search-res" onClick={() => {setActiveChat(user); setSearchQuery('');}}>
                <div className="avatar sm" style={{background: user.avatar}}>{user.nickname[0]}</div>
                <div className="chat-info">
                  <div className="name">{user.nickname}</div>
                  <div className="sub">@{user.username}</div>
                </div>
              </div>
            ))
          ) : (
            // ВАШИ ЧАТЫ (из истории)
            dialogs.map(email => (
              <div key={email} className={`chat-item ${activeChat?.email === email ? 'active' : ''}`} onClick={() => setActiveChat({email, nickname: email.split('@')[0]})}>
                <div className="avatar sm">{email[0].toUpperCase()}</div>
                <div className="chat-info">
                  <div className="name">{email.split('@')[0]}</div>
                  <div className="sub">Нажмите, чтобы открыть</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Окно чата */}
      <div className="main-chat">
        {activeChat ? (
          <>
            <div className="chat-top">
              <div className="avatar sm" style={{background: activeChat.avatar}}>{activeChat.nickname[0]}</div>
              <div>
                <div className="name">{activeChat.nickname}</div>
                <div className="status">в сети</div>
              </div>
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
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="Напишите сообщение..." />
              <button type="submit" className="send-btn">➤</button>
            </form>
          </>
        ) : (
          <div className="empty-state">
            <div className="icon">💬</div>
            <p>Выберите чат или найдите пользователя</p>
          </div>
        )}
      </div>
    </div>
  );
}