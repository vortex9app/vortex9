'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function strings(list, max) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, max).map((item) => String(item || '').slice(0, 200));
}

contextBridge.exposeInMainWorld('vortex9', {
  getState: () => ipcRenderer.invoke('vortex9:state'),
  toggle: (active) => ipcRenderer.invoke('vortex9:toggle', active === true),
  activate: (email, licenseKey) => ipcRenderer.invoke('vortex9:activate', {
    email: String(email || '').slice(0, 254),
    licenseKey: String(licenseKey || '').slice(0, 128)
  }),
  scan: (text) => ipcRenderer.invoke('vortex9:scan', String(text || '').slice(0, 8000)),
  threatFeed: (enabled) => ipcRenderer.invoke('vortex9:threat-feed', enabled === true),
  householdUnlock: (grant) => ipcRenderer.invoke('vortex9:household-unlock', { grant: String(grant || '') }),
  householdLock: () => ipcRenderer.invoke('vortex9:household-lock'),
  householdSave: (rules) => ipcRenderer.invoke('vortex9:household-save', {
    keywords: strings(rules && rules.keywords, 100),
    urls: strings(rules && rules.urls, 100)
  }),
  watch: (payload) => ipcRenderer.invoke('vortex9:watch', {
    on: !!(payload && payload.on),
    grant: String(payload && payload.grant || '')
  }),
  operatorStatus: () => ipcRenderer.invoke('vortex9:operator-status'),
  confirm: (payload) => ipcRenderer.invoke('vortex9:confirm', {
    biometric: !!(payload && payload.biometric),
    passphrase: String(payload && payload.passphrase || '').slice(0, 128)
  }),
  subscribe: () => ipcRenderer.invoke('vortex9:subscribe'),
  windowAction: (action) => ipcRenderer.invoke('vortex9:window', action === 'close' || action === 'minimize' ? action : ''),
  onState: (callback) => {
    const listener = (_event, next) => callback(next);
    ipcRenderer.on('vortex9:state', listener);
  },
  onFeed: (callback) => {
    const listener = (_event, line) => callback(line);
    ipcRenderer.on('vortex9:feed', listener);
  }
});
