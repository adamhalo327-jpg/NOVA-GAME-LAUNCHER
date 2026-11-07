'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('nova', {
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
