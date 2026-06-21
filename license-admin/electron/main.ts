import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 720,
    title: 'DR123 License Admin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('save-csv', async (_event, defaultName: string, content: string) => {
  const result = await dialog.showSaveDialog({
    title: 'Export license keys',
    defaultPath: defaultName,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });

  if (result.canceled || !result.filePath) return false;
  await writeFile(result.filePath, content, 'utf8');
  return true;
});
