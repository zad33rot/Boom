import React, { useState } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <div>
      {currentUser ? (
        <Chat 
          currentUser={currentUser} 
          onLogout={() => setCurrentUser(null)} 
          onUpdateUser={(newData) => setCurrentUser(newData)} // Чтобы имя менялось сразу!
        />
      ) : (
        <Auth onLogin={(userData) => setCurrentUser(userData)} />
      )}
    </div>
  );
}

export default App;