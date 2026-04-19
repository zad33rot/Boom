import React, { useState } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <div>
      {currentUser ? (
        // ВАЖНО: передаем onLogout, чтобы кнопка стирала юзера и возвращала на экран входа
        <Chat currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
      ) : (
        <Auth onLogin={(email) => setCurrentUser(email)} />
      )}
    </div>
  );
}

export default App;