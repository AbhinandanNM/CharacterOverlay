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
});
