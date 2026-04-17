const { app, BrowserWindow } = require('electron');

function createWindow() {
  // Создаем окно нашего приложения
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    autoHideMenuBar: true, // Скрываем скучное верхнее меню (Файл, Правка и тд)
    icon: __dirname + '/public/favicon.svg', // Иконка нашего Boom
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // Загружаем наш React-фронтенд (пока с локального сервера)
  win.loadURL('http://localhost:5173');
}

// Когда Electron готов - открываем окно
app.whenReady().then(createWindow);

// Закрываем программу, если закрыли все окна
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});