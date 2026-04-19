import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ currentUser, onLogout, onUpdateUser }) {
  const [messages, setMessages] = useState([]);
  const [knownUsers, setKnownUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [text, setText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // ВЕРНУЛИ СОСТОЯНИЯ ДЛЯ НАСТРОЕК
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editNick, setEditNick] = useState(currentUser.nickname);
  const [editUser, setEditUser] = useState(currentUser.username);
  
  const ws = useRef(null);
  const scrollRef = useRef(null);
  const myEmail = currentUser.email;

  useEffect(() => {
    fetch(`http://193.233.139.208:8000/messages/${myEmail}`)
      .then(res => res.json())
      .then(data => {
        setMessages(data.messages || []);
        setKnownUsers(data.users || {});
      })
      .catch(() => setMessages([]));
  }, [myEmail]);

  useEffect(() => {
    ws.current = new WebSocket(`ws://193.233.139.208:8000/ws/${myEmail}`);
    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "status") {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          data.status === "online" ? next.add(data.email) : next.delete(data.email);
          return next;
        });
      } else if (data.type === "msg") {
        setMessages(prev => [...prev, data]);
      } else if (data.type === "read_update") {
        setMessages(prev => prev.map(m => m.receiver === data.by ? {...m, read: true} : m));
      }
    };
    return () => ws.current.close();
  }, [myEmail]);

  useEffect(() => {
    if (activeChat) {
      fetch('http://193.233.139.208:8000/messages/read', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chat_with: activeChat.email, my_email: myEmail })
      });
      ws.current.send(JSON.stringify({ type: "read_event", sender: activeChat.email }));
      setMessages(prev => prev.map(m => (m.sender === activeChat.email && m.receiver === myEmail) ? {...m, read: true} : m));
    }
  }, [activeChat, messages.length]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (searchQuery.length > 1) {
        try {
          const res = await fetch(`http://193.233.139.208:8000/users/search?q=${searchQuery}`);
          if (res.ok) setSearchResults(await res.json());
        } catch {}
      } else setSearchResults([]);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    const msg = { type: "msg", sender: myEmail, receiver: activeChat.email, text, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), read: false };
    ws.current.send(JSON.stringify(msg));
    setMessages(prev => [...prev, msg]);
    setText('');
  };

  // ФУНКЦИЯ СОХРАНЕНИЯ НАСТРОЕК
  const saveSettings = async () => {
    try {
      const res = await fetch('http://193.233.139.208:8000/users/update', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: myEmail, nickname: editNick, username: editUser })
      });
      const data = await res.json();
      if(res.ok) {
        onUpdateUser(data);
        setIsSettingsOpen(false);
      } else alert(data.detail || "Ошибка сохранения");
    } catch { alert("Ошибка сервера"); }
  };

  const dialogs = [...new Set(messages.map(m => m.sender === myEmail ? m.receiver : m.sender))];

  return (
    <div className="boom-app">
      {/* ОКНО НАСТРОЕК */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Настройки профиля</h3>
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

      <div className={`sidebar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)} />
      <div className={`drawer ${isMenuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
           <div className="avatar profile-avatar" style={{background: currentUser.avatar}}>{currentUser.nickname[0]}</div>
           <h3>{currentUser.nickname}</h3>
           <span>@{currentUser.username}</span>
        </div>
        <div className="drawer-content">
          {/* КНОПКА НАСТРОЕК ВЕРНУЛАСЬ */}
          <button className="menu-item" onClick={() => {setIsSettingsOpen(true); setIsMenuOpen(false);}}>
            <span>⚙️</span> Настройки
          </button>
          <button className="menu-item logout" onClick={onLogout}><span>🚪</span> Выйти</button>
        </div>
      </div>

      <div className="sidebar">
        <div className="sidebar-header">
          <button className="icon-btn" onClick={() => setIsMenuOpen(true)}>☰</button>
          <h2>BOOM</h2>
        </div>
        <div className="search-bar">
          <input placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="chat-list">
          {(searchQuery.length > 1 ? searchResults : dialogs).map(item => {
            const user = typeof item === 'string' ? (knownUsers[item] || {email: item, nickname: item.split('@')[0], avatar: '#333'}) : item;
            const isOnline = onlineUsers.has(user.email);
            const unreadCount = messages.filter(m => m.sender === user.email && m.receiver === myEmail && !m.read).length;

            return (
              <div key={user.email} className={`chat-item ${activeChat?.email === user.email ? 'active' : ''}`} onClick={() => setActiveChat(user)}>
                <div className="avatar sm" style={{background: user.avatar, position: 'relative'}}>
                  {user.nickname[0]}
                  {isOnline && <div className="online-badge" />}
                </div>
                <div className="chat-info">
                  <div className="name">{user.nickname}</div>
                  <div className="sub">{isOnline ? 'в сети' : 'был(а) недавно'}</div>
                </div>
                {unreadCount > 0 && <div className="unread-badge">{unreadCount}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="main-chat">
        {activeChat ? (
          <>
            <div className="chat-top">
              <div className="avatar sm" style={{background: activeChat.avatar}}>{activeChat.nickname[0]}</div>
              <div>
                <div className="name">{activeChat.nickname}</div>
                <div className="status" style={{color: onlineUsers.has(activeChat.email) ? '#4caf50' : '#888'}}>
                  {onlineUsers.has(activeChat.email) ? 'в сети' : 'не в сети'}
                </div>
              </div>
            </div>
            <div className="message-list">
              {messages.filter(m => (m.sender === myEmail && m.receiver === activeChat.email) || (m.sender === activeChat.email && m.receiver === myEmail)).map((m, i) => (
                <div key={i} className={`message-wrapper ${m.sender === myEmail ? 'sent' : 'received'}`}>
                  <div className="message-box">
                    {m.text}
                    <div className="time">
                      {m.time} 
                      {m.sender === myEmail && (
                        <span className="ticks" style={{color: m.read ? '#34b7f1' : '#888'}}>
                          {m.read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
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
          <div className="empty-state">💬 Выберите чат</div>
        )}
      </div>
    </div>
  );
}