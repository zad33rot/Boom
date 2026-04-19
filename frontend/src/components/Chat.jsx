import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const ws = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(`ws://193.233.139.208:8000/ws/${currentUser}`);
    ws.current.onmessage = (e) => setMessages(prev => [...prev, JSON.parse(e.data)]);
    return () => ws.current.close();
  }, [currentUser]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    const msg = { 
      sender: currentUser, 
      receiver: activeChat, 
      text, 
      time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) 
    };
    ws.current.send(JSON.stringify(msg));
    setMessages(prev => [...prev, msg]);
    setText('');
  };

  // Ищем уникальных собеседников
  const partners = [...new Set(messages.map(m => m.sender === currentUser ? m.receiver : m.sender))];
  const filtered = partners.filter(p => p.toLowerCase().includes(search.toLowerCase()));
  const chatMsgs = messages.filter(m => (m.sender === currentUser && m.receiver === activeChat) || (m.sender === activeChat && m.receiver === currentUser));

  return (
    <div className="boom-app">
      {/* Левая панель */}
      <div className="sidebar">
        <div className="profile-bar">
          {/* Бургер-меню (заготовка для профиля) */}
          <div style={{cursor: 'pointer', fontSize: 24, marginRight: 10}}>☰</div>
          <div className="avatar">{currentUser[0].toUpperCase()}</div>
          <div style={{fontWeight: 'bold', fontSize: 18}}>BOOM</div>
        </div>
        
        <div className="search-box">
          <input placeholder="Поиск (почта)..." onChange={e=>setSearch(e.target.value)} />
        </div>
        
        <div style={{flex:1, overflowY:'auto'}}>
          {filtered.map(p => (
            <div key={p} className="chat-item" style={{background: p === activeChat ? '#e3f2fd' : ''}} onClick={()=>setActiveChat(p)}>
              <div style={{fontWeight:'bold', color: '#333'}}>{p.split('@')[0]}</div>
              <div style={{fontSize:13, color:'#888', marginTop: 4}}>Нажмите, чтобы открыть чат</div>
            </div>
          ))}
          {/* Если ищем кого-то нового */}
          {search && !partners.includes(search) && (
            <div className="chat-item" style={{color:'var(--primary)'}} onClick={()=>{setActiveChat(search); setSearch('');}}>
              Начать чат с <b>{search}</b>
            </div>
          )}
        </div>
      </div>

      {/* Правая панель (Чат) */}
      <div className="chat-area">
        {activeChat ? (
          <>
            <div style={{padding:'20px', background:'white', borderBottom:'1px solid #eee', fontWeight: 'bold'}}>
              {activeChat}
            </div>
            
            <div className="messages">
              {chatMsgs.map((m, i) => (
                <div key={i} className={`msg ${m.sender === currentUser ? 'my' : 'their'}`}>
                  {m.text}
                  <div className="msg-footer">
                    {m.time} {m.sender === currentUser && <span className="ticks">✓✓</span>}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            
            <form className="input-area" onSubmit={send}>
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="Написать сообщение..." />
              <button className="send-btn">➤</button>
            </form>
          </>
        ) : (
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#888', fontSize: 16}}>
            Выберите чат, чтобы начать общение
          </div>
        )}
      </div>
    </div>
  );
}