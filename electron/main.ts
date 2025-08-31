import { app, BrowserWindow, shell, globalShortcut } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform');
app.commandLine.appendSwitch('ozone-platform', 'x11');


const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null = null;
let ignoringMouse = false;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 420,
    height: 420,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#0040ffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      sandbox:false,
      webgl: true,
    },
  });

  // optional: start click-through, toggle with Ctrl+Shift+C
  win.setIgnoreMouseEvents(false, { forward: true });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(path.join(__dirname, '../index.html'));
  }

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  const gpu = app.getGPUFeatureStatus?.();
  console.log('GPU feature status:', gpu);
  createWindow();

  // Register a hotkey to toggle click-through
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    ignoringMouse = !ignoringMouse;
    win?.setIgnoreMouseEvents(ignoringMouse, { forward: true });
    console.log('Click-through:', ignoringMouse);
  });
});
