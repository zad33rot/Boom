import React, { useState } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';

function App() {
  // Теперь тут хранится целый объект: {email, username, nickname, avatar}
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <div>
      {currentUser ? (
        <Chat currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
      ) : (
        <Auth onLogin={(userData) => setCurrentUser(userData)} />
      )}
    </div>
  );
}

export default App;