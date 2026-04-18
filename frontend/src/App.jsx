import React, { useState } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';

export default function App() {
  // Храним email пользователя. Если он пустой — показываем Auth. Если заполнен — Chat.
  const [userEmail, setUserEmail] = useState(null);

  if (!userEmail) {
    // Передаем функцию setUserEmail в Auth.jsx
    return <Auth onLogin={(email) => setUserEmail(email)} />;
  }

  // Передаем email в Chat.jsx, чтобы он знал, к кому подключать сокеты
  return <Chat currentUser={userEmail} />;
}