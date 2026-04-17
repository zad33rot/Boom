const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Чтобы React и Electron лучше понимали друг друга
    },
  });

  // ПРОВЕРКА: Если мы в режиме разработки — грузим localhost
  // Если мы уже упакованы в .exe — грузим файл из папки dist
  const isDev = !app.isPackaged;

  if (isDev) {
    // ВАЖНО: Проверь, чтобы порт (5173) совпадал с тем, что пишет npm run dev!
    win.loadURL('http://localhost:5173').catch(() => {
        console.log("React server not found at 5173, retrying...");
        setTimeout(() => win.loadURL('http://localhost:5173'), 2000);
    });
  } else {
    // Путь к собранному файлу внутри .exe
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});