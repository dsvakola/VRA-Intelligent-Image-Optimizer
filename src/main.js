'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const engine = require('./engine');

const WEBSITE = 'https://vsa.edu.in/';
let win = null;
let cancelFlag = false;

const DEFAULTS = {
  mode: 'any-webp',
  smart: true,
  quality: 80,
  minQuality: 60,
  maxWidthOn: true,
  maxWidth: 1900,
  targetOn: true,
  targetKB: 200,
  stripMeta: true,
  cleanNames: true,
  openWhenDone: true,
  outDir: ''
};

function settingsFile() { return path.join(app.getPath('userData'), 'settings.json'); }

function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    return Object.assign({}, DEFAULTS, saved);
  } catch (e) {
    return Object.assign({}, DEFAULTS);
  }
}

function saveSettings(s) {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2));
  } catch (e) { /* ignore */ }
}

function createWindow() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'logo.png'));
  win = new BrowserWindow({
    width: 1020,
    height: 700,
    minWidth: 860,
    minHeight: 580,
    backgroundColor: '#eef1f6',
    title: 'VRA Intelligent Image Optimizer',
    icon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://vsa.edu.in')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (url.startsWith('https://vsa.edu.in')) shell.openExternal(url); }
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}

// ---------- IPC ----------
ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  website: WEBSITE,
  modes: Object.fromEntries(Object.entries(engine.MODES).map(([k, v]) => [k, v.label])),
  settings: loadSettings()
}));

ipcMain.handle('settings:save', (_e, s) => {
  const merged = Object.assign({}, loadSettings(), s);
  saveSettings(merged);
  return merged;
});

ipcMain.handle('logo:data', () => {
  const buf = fs.readFileSync(path.join(__dirname, '..', 'assets', 'logo.png'));
  return 'data:image/png;base64,' + buf.toString('base64');
});

ipcMain.handle('dialog:addImages', async (_e, mode) => {
  const exts = ['jpg', 'jpeg', 'jfif', 'png', 'bmp', 'gif', 'tif', 'tiff', 'avif', 'heic', 'heif', 'webp'];
  const r = await dialog.showOpenDialog(win, {
    title: 'Add images',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: exts }, { name: 'All files', extensions: ['*'] }]
  });
  if (r.canceled) return [];
  return r.filePaths;
});

ipcMain.handle('dialog:addFolder', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Add a folder of images', properties: ['openDirectory'] });
  if (r.canceled) return null;
  return r.filePaths[0];
});

ipcMain.handle('dialog:chooseOutDir', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Choose the folder where optimized images are saved',
    properties: ['openDirectory', 'createDirectory']
  });
  if (r.canceled) return null;
  return r.filePaths[0];
});

// Expand dropped/selected paths (files and folders) to image items
ipcMain.handle('files:expand', async (_e, paths, mode) => {
  const items = [];
  for (const p of paths) {
    let st;
    try { st = fs.statSync(p); } catch (e) { continue; }
    if (st.isDirectory()) {
      const root = path.basename(p);
      for (const f of engine.scanFolder(p, mode, p)) {
        items.push({ file: f.file, rel: path.join(root, f.rel), size: fs.statSync(f.file).size });
      }
    } else if (engine.isSupportedInput(p, mode)) {
      items.push({ file: p, rel: '', size: st.size });
    }
  }
  const out = [];
  for (const it of items) {
    out.push(Object.assign({}, it, { thumb: await engine.makeThumb(it.file) }));
  }
  return out;
});

ipcMain.handle('open:folder', async (_e, p) => {
  if (!p) return false;
  try { fs.mkdirSync(p, { recursive: true }); } catch (e) { /* ignore */ }
  const err = await shell.openPath(p);
  return !err;
});

ipcMain.handle('open:external', (_e, url) => {
  if (url === WEBSITE) shell.openExternal(url);
});

ipcMain.handle('process:cancel', () => { cancelFlag = true; });

ipcMain.handle('process:run', async (_e, items, settings) => {
  cancelFlag = false;
  const reserved = new Set();
  const total = items.length;
  let done = 0;
  let inSum = 0, outSum = 0, okCount = 0, failCount = 0;
  for (const it of items) {
    if (cancelFlag) break;
    win.webContents.send('process:progress', { id: it.id, state: 'working', done, total });
    const r = await engine.processOne({ file: it.file, rel: it.rel || '' }, settings, reserved);
    done++;
    if (r.status === 'error') failCount++;
    else okCount++;
    if (r.status === 'done' || r.status === 'above') { inSum += r.inBytes; outSum += r.outBytes; }
    win.webContents.send('process:progress', { id: it.id, state: 'result', result: r, done, total });
  }
  return { done, total, okCount, failCount, inSum, outSum, cancelled: cancelFlag };
});
