import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ currentUser, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  
  // Состояние для нашего крутого бокового меню
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const ws = useRef(null);
  const scrollRef = useRef(null);

  // Подключение к сокетам
  useEffect(() => {
    if (!currentUser) return;
    ws.current = new WebSocket(`ws://193.233.139.208:8000/ws/${currentUser}`);
    ws.current.onmessage = (e) => setMessages(prev => [...prev, JSON.parse(e.data)]);
    return () => ws.current.close();
  }, [currentUser]);

  // Автопрокрутка чата вниз
  useEffect(() => { 
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  // Отправка сообщения
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

  // Логика списков и поиска
  const partners = [...new Set(messages.map(m => m.sender === currentUser ? m.receiver : m.sender))];
  const filtered = partners.filter(p => p.toLowerCase().includes(search.toLowerCase()));
  const chatMsgs = messages.filter(m => (m.sender === currentUser && m.receiver === activeChat) || (m.sender === activeChat && m.receiver === currentUser));

  return (
    <div className="boom-app" style={{ position: 'relative', overflow: 'hidden' }}>
      
      {/* 1. ЗАТЕМНЕНИЕ ФОНА (когда меню открыто) */}
      {isMenuOpen && (
        <div 
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, transition: '0.3s' }}
          onClick={() => setIsMenuOpen(false)} // Закрываем меню по клику на темный фон
        />
      )}

      {/* 2. ВЫЕЗЖАЮЩЕЕ МЕНЮ (ТРИ ПОЛОСКИ) */}
      <div style={{
        position: 'absolute', top: 0, left: isMenuOpen ? 0 : '-350px',
        width: '320px', height: '100%', background: '#1a1a2e', // Темный премиальный цвет
        color: 'white', zIndex: 1000, transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
        padding: '25px', display: 'flex', flexDirection: 'column',
        boxShadow: isMenuOpen ? '5px 0 25px rgba(0,0,0,0.5)' : 'none'
      }}>
        {/* Кнопка закрытия крестиком */}
        <div style={{textAlign: 'right'}}>
          <span style={{fontSize: 28, cursor: 'pointer', color: '#888', transition: '0.2s'}} onClick={() => setIsMenuOpen(false)}>✕</span>
        </div>
        
        {/* Профиль пользователя */}
        <div className="avatar" style={{width: 90, height: 90, fontSize: 36, margin: '10px auto 20px', background: 'var(--primary-gradient)', color: 'white'}}>
          {currentUser[0].toUpperCase()}
        </div>
        <h2 style={{textAlign: 'center', marginBottom: 5, fontSize: 22}}>{currentUser.split('@')[0]}</h2>
        <p style={{textAlign: 'center', color: '#888', fontSize: 14}}>{currentUser}</p>

        {/* Кнопки меню */}
        <div style={{marginTop: 40, display: 'flex', flexDirection: 'column', gap: 15}}>
          <button style={{
            width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 14, 
            cursor: 'pointer', textAlign: 'left', fontSize: 16, display: 'flex', gap: 12, alignItems: 'center'
          }}>
            ⚙️ Настройки профиля
          </button>
          
          <button 
            onClick={onLogout} 
            style={{
              width: '100%', padding: '16px', background: 'linear-gradient(135deg, #ff4757, #ff6b81)', 
              border: 'none', color: 'white', borderRadius: 14, cursor: 'pointer', 
              textAlign: 'left', fontSize: 16, display: 'flex', gap: 12, alignItems: 'center', fontWeight: 'bold'
            }}>
            🚪 Выйти из аккаунта
          </button>
        </div>
      </div>

      {/* 3. ЛЕВАЯ ПАНЕЛЬ (Список чатов) */}
      <div className="sidebar">
        <div className="profile-bar">
          {/* Вот они, наши три полоски! */}
          <div 
            style={{cursor: 'pointer', fontSize: 26, marginRight: 15, transition: '0.2s'}} 
            onClick={() => setIsMenuOpen(true)}
          >
            ☰
          </div>
          <div style={{fontWeight: '900', fontSize: 20, letterSpacing: '1px'}}>BOOM</div>
        </div>
        
        <div className="search-box">
          <input placeholder="Поиск (введите почту)..." onChange={e=>setSearch(e.target.value)} />
        </div>
        
        <div style={{flex:1, overflowY:'auto'}}>
          {filtered.map(p => (
            <div key={p} className="chat-item" style={{background: p === activeChat ? '#e3f2fd' : ''}} onClick={()=>setActiveChat(p)}>
              <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                <div className="avatar" style={{width: 40, height: 40, fontSize: 16, background: '#ccc', color: 'white'}}>
                  {p[0].toUpperCase()}
                </div>
                <div>
                  <div style={{fontWeight:'bold', color: '#333'}}>{p.split('@')[0]}</div>
                  <div style={{fontSize:13, color:'#888', marginTop: 4}}>Нажмите, чтобы открыть чат</div>
                </div>
              </div>
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

      {/* 4. ПРАВАЯ ПАНЕЛЬ (Окно переписки) */}
      <div className="chat-area">
        {activeChat ? (
          <>
            <div style={{padding:'20px', background:'white', borderBottom:'1px solid #eee', display: 'flex', alignItems: 'center', gap: 12}}>
              <div className="avatar" style={{width: 40, height: 40, fontSize: 16, background: 'var(--primary-gradient)', color: 'white'}}>
                {activeChat[0].toUpperCase()}
              </div>
              <b style={{fontSize: 16}}>{activeChat}</b>
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
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#888', fontSize: 16, flexDirection: 'column', gap: 15}}>
            <div style={{fontSize: 60, opacity: 0.2}}>💬</div>
            Выберите чат, чтобы начать общение
          </div>
        )}
      </div>
    </div>
  );
}