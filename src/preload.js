'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('vra', {
  info: () => ipcRenderer.invoke('app:info'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),
  logo: () => ipcRenderer.invoke('logo:data'),
  addImages: (mode) => ipcRenderer.invoke('dialog:addImages', mode),
  addFolder: () => ipcRenderer.invoke('dialog:addFolder'),
  chooseOutDir: () => ipcRenderer.invoke('dialog:chooseOutDir'),
  expand: (paths, mode) => ipcRenderer.invoke('files:expand', paths, mode),
  openFolder: (p) => ipcRenderer.invoke('open:folder', p),
  openExternal: (u) => ipcRenderer.invoke('open:external', u),
  run: (items, settings) => ipcRenderer.invoke('process:run', items, settings),
  cancel: () => ipcRenderer.invoke('process:cancel'),
  onProgress: (cb) => ipcRenderer.on('process:progress', (_e, d) => cb(d)),
  pathForFile: (f) => webUtils.getPathForFile(f)
});
