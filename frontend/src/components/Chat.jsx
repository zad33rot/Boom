import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(`ws://193.233.139.208:8000/ws/${currentUser}`);
    ws.current.onmessage = (e) => setMessages(prev => [...prev, JSON.parse(e.data)]);
    return () => ws.current.close();
  }, [currentUser]);

  const send = (e) => {
    e.preventDefault();
    if (!text || !activeChat) return;
    const msg = { sender: currentUser, receiver: activeChat, text, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) };
    ws.current.send(JSON.stringify(msg));
    setMessages(prev => [...prev, msg]);
    setText('');
  };

  const partners = [...new Set(messages.map(m => m.sender === currentUser ? m.receiver : m.sender))];
  const filtered = partners.filter(p => p.includes(search));
  const currentMsgs = messages.filter(m => (m.sender === currentUser && m.receiver === activeChat) || (m.sender === activeChat && m.receiver === currentUser));

  return (
    <div className="boom-app">
      <div className="sidebar">
        <div className="profile-bar">
          <div className="avatar">{currentUser[0].toUpperCase()}</div>
          <b>BOOM</b>
        </div>
        <div style={{padding:15}}><input className="input-box" style={{width:'100%', padding:8}} placeholder="Поиск (email)..." onChange={e=>setSearch(e.target.value)} /></div>
        <div style={{flex:1, overflowY:'auto'}}>
          {filtered.map(p => (
            <div key={p} style={{padding:15, cursor:'pointer', borderBottom:'1px solid #eee', background: p === activeChat ? '#f0f2f5' : ''}} onClick={()=>setActiveChat(p)}>
              <b>{p}</b>
              <div style={{fontSize:12, color:'#888'}}>Сообщений: {messages.filter(m => m.sender === p || m.receiver === p).length}</div>
            </div>
          ))}
          {search && !partners.includes(search) && <div style={{padding:15, color:'#764ba2', cursor:'pointer'}} onClick={()=>setActiveChat(search)}>Начать чат с {search}</div>}
        </div>
      </div>
      <div className="chat-area">
        {activeChat ? (
          <>
            <div style={{padding:20, background:'white', borderBottom:'1px solid #eee'}}><b>{activeChat}</b></div>
            <div className="messages">
              {currentMsgs.map((m, i) => (
                <div key={i} className={`msg ${m.sender === currentUser ? 'my' : 'their'}`}>
                  {m.text}
                  <div className="msg-footer">
                    {m.time} {m.sender === currentUser && <span className="ticks">✓✓</span>}
                  </div>
                </div>
              ))}
            </div>
            <form className="input-box" onSubmit={send}>
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="Сообщение..." />
              <button style={{background:'none', border:'none', fontSize:24, cursor:'pointer'}}>➤</button>
            </form>
          </>
        ) : <div style={{display:'flex', flex:1, alignItems:'center', justifyContent:'center', color:'#888'}}>Выберите чат</div>}
      </div>
    </div>
  );
}