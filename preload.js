'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('nova', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (value) => ipcRenderer.invoke('settings:save', value),
  edit: (id, changes) => ipcRenderer.invoke('game:edit', id, changes),
  setCover: (id) => ipcRenderer.invoke('game:cover', id),
  clearCover: (id) => ipcRenderer.invoke('game:clearCover', id),
  active: () => ipcRenderer.invoke('game:active'),
  list: () => ipcRenderer.invoke('library:list'),
  chooseExe: () => ipcRenderer.invoke('game:chooseExe'),
  add: (data) => ipcRenderer.invoke('game:add', data),
  remove: (id) => ipcRenderer.invoke('game:remove', id),
  favorite: (id) => ipcRenderer.invoke('game:favorite', id),
  launch: (id) => ipcRenderer.invoke('game:launch', id),
  export: () => ipcRenderer.invoke('library:export'),
  subscribe: (callback) => {
    const handler = (_event, games) => callback(games);
    ipcRenderer.on('library:changed', handler);
    return () => ipcRenderer.removeListener('library:changed', handler);
  }
});
