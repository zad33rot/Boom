const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Создаем окно нашего приложения
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    autoHideMenuBar: true, // Скрываем скучное меню сверху
    icon: path.join(__dirname, 'public', 'favicon.svg'), // Подтягиваем иконку Boom
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // Загружаем наш React-фронтенд (который крутится на Vite)
  win.loadURL('http://localhost:5173');
}

// Когда Electron готов - открываем окно
app.whenReady().then(createWindow);

// Закрываем программу, если закрыли все окна (стандартное поведение для Windows)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});