const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onToggleOverlayMode: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("toggle-overlay-mode", handler);
    return () => ipcRenderer.removeListener("toggle-overlay-mode", handler);
  },
  onClickThroughChanged: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on("click-through-changed", handler);
    return () => ipcRenderer.removeListener("click-through-changed", handler);
  },
  sendLocalSync: (data) => {
    ipcRenderer.send("local-sync-send", data);
  },
  onLocalSync: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("local-sync-receive", handler);
    return () => ipcRenderer.removeListener("local-sync-receive", handler);
  },
});

