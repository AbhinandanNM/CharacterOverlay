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
  openObsOverlay: () => ipcRenderer.invoke("open-obs-overlay"),
  closeObsOverlay: () => ipcRenderer.invoke("close-obs-overlay"),
  getObsOverlayStatus: () => ipcRenderer.invoke("get-obs-overlay-status"),
  onObsOverlayStatusChanged: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on("obs-overlay-status-changed", handler);
    return () => ipcRenderer.removeListener("obs-overlay-status-changed", handler);
  },
});
