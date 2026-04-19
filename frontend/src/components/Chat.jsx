import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ currentUser, onLogout, onUpdateUser }) {
  const [messages, setMessages] = useState([]);
  const [knownUsers, setKnownUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeouts = useRef({});
  const lastTypingTime = useRef(0);

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

  useEffect(() => {
    fetch(`https://boom-chat.duckdns.org/messages/${myEmail}`)
      .then(res => res.json())
      .then(data => {
        setMessages(data.messages || []);
        if (data.users) {
          const map = {};
          data.users.forEach(u => map[u.email] = u);
          setKnownUsers(map);
        }
      })
      .catch(() => setMessages([]));
  }, [myEmail]);

  useEffect(() => {
    ws.current = new WebSocket(`wss://boom-chat.duckdns.org/ws/${myEmail}`);
    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      if (data.type === "online_list") {
        setOnlineUsers(new Set(data.users));
      } else if (data.type === "status") {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          data.status === "online" ? next.add(data.email) : next.delete(data.email);
          return next;
        });
      } else if (data.type === "msg") {
        setMessages(prev => [...prev, data]);
        setTypingUsers(prev => ({ ...prev, [data.sender]: false }));
      } else if (data.type === "read_update") {
        setMessages(prev => prev.map(m => m.receiver === data.by ? {...m, read: true} : m));
      } else if (data.type === "profile_update") {
        setKnownUsers(prev => ({...prev, [data.user.email]: data.user}));
        setActiveChat(prev => (prev?.email === data.user.email ? data.user : prev));
      } else if (data.type === "typing") {
        setTypingUsers(prev => ({ ...prev, [data.sender]: true }));
        clearTimeout(typingTimeouts.current[data.sender]);
        typingTimeouts.current[data.sender] = setTimeout(() => {
          setTypingUsers(prev => ({ ...prev, [data.sender]: false }));
        }, 2500);
      }
    };
    return () => ws.current.close();
  }, [myEmail]);

  useEffect(() => {
    if (activeChat) {
      fetch('https://boom-chat.duckdns.org/messages/read', {
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
          const res = await fetch(`https://boom-chat.duckdns.org/users/search?q=${searchQuery}`);
          if (res.ok) setSearchResults(await res.json());
        } catch {}
      } else setSearchResults([]);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleTyping = (e) => {
    setText(e.target.value);
    const now = Date.now();
    if (activeChat && (now - lastTypingTime.current > 2000)) {
      ws.current.send(JSON.stringify({ type: "typing", sender: myEmail, receiver: activeChat.email }));
      lastTypingTime.current = now;
    }
  };

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    const msg = { type: "msg", sender: myEmail, receiver: activeChat.email, text, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), read: false };
    ws.current.send(JSON.stringify(msg));
    setMessages(prev => [...prev, msg]);
    setText('');
  };

  const saveSettings = async () => {
    try {
      const res = await fetch('https://boom-chat.duckdns.org/users/update', {
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
    <div className={`boom-app ${activeChat ? 'chat-active' : ''}`}>
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Настройки профиля</h3>
            <div className="modal-body">
              <label>Имя</label>
              <input value={editNick} onChange={e=>setEditNick(e.target.value)} />
              <label>@username</label>
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
          <button className="menu-item" onClick={() => {setIsSettingsOpen(true); setIsMenuOpen(false);}}><span>⚙️</span> Настройки</button>
          <button className="menu-item logout" onClick={onLogout}><span>🚪</span> Выйти из аккаунта</button>
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
            const isTyping = typingUsers[user.email];
            
            // Фильтруем все сообщения с этим пользователем
            const userMessages = messages.filter(m => (m.sender === user.email && m.receiver === myEmail) || (m.sender === myEmail && m.receiver === user.email));
            // Берем самое последнее сообщение
            const lastMsg = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
            
            // Считаем непрочитанные
            const unreadCount = messages.filter(m => m.sender === user.email && m.receiver === myEmail && !m.read).length;

            // ЛОГИКА ДЛЯ ПОДЗАГОЛОВКА: Печатает -> Последнее сообщение -> Статус
            let subContent;
            if (isTyping) {
              subContent = <span style={{color: 'var(--primary)', fontWeight: 'bold'}}>печатает...</span>;
            } else if (lastMsg) {
              const prefix = lastMsg.sender === myEmail ? 'Вы: ' : '';
              // Обрезаем длинные сообщения
              const text = lastMsg.text.length > 25 ? lastMsg.text.substring(0, 25) + '...' : lastMsg.text;
              subContent = <span>{prefix}{text}</span>;
            } else {
              subContent = isOnline ? 'в сети' : 'был(а) недавно';
            }

            return (
              <div key={user.email} className={`chat-item ${activeChat?.email === user.email ? 'active' : ''}`} onClick={() => setActiveChat(user)}>
                <div className="avatar sm" style={{background: user.avatar, position: 'relative'}}>
                  {user.nickname[0]}
                  {isOnline && <div className="online-badge" />}
                </div>
                <div className="chat-info">
                  <div className="name">{user.nickname}</div>
                  <div className="sub">
                    {subContent}
                  </div>
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
              <button className="icon-btn" style={{marginRight: '15px'}} onClick={() => setActiveChat(null)}>←</button>
              
              <div className="avatar sm" style={{background: activeChat.avatar}}>{activeChat.nickname[0]}</div>
              <div>
                <div className="name">{activeChat.nickname}</div>
                <div className="status" style={{color: typingUsers[activeChat.email] ? 'var(--primary)' : (onlineUsers.has(activeChat.email) ? '#4caf50' : '#888')}}>
                  {typingUsers[activeChat.email] ? 'печатает...' : (onlineUsers.has(activeChat.email) ? 'в сети' : 'не в сети')}
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
              
              {typingUsers[activeChat.email] && (
                <div className="message-wrapper received">
                  <div className="message-box typing-indicator">
                    <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                  </div>
                </div>
              )}
              
              <div ref={scrollRef} />
            </div>
            <form className="input-row" onSubmit={send}>
              <input value={text} onChange={handleTyping} placeholder="Напишите сообщение..." />
              <button type="submit" className="send-btn">➤</button>
            </form>
          </>
        ) : (
          <div className="empty-state">
            <div style={{fontSize: 70, opacity: 0.3, marginBottom: 20}}>💬</div>
            <h2>Ваши сообщения</h2>
            <p style={{marginTop: 10}}>Выберите кому хотели бы написать</p>
          </div>
        )}
      </div>
    </div>
  );
}