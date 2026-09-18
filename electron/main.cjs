const {
  app,
  BrowserWindow,
  screen,
  globalShortcut,
  ipcMain,
} = require("electron");

let mainWindow;
let obsOverlayWindow = null;
let clickThrough = false;

function openObsOverlayWindow() {
  if (obsOverlayWindow && !obsOverlayWindow.isDestroyed()) {
    obsOverlayWindow.show();
    obsOverlayWindow.focus();
    return true;
  }

  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  console.log("[OBS OVERLAY] Creating dedicated transparent overlay window (" + width + "x" + height + ")...");
  obsOverlayWindow = new BrowserWindow({
    title: "Reactive Avatars - OBS Overlay",
    width: width,
    height: height,
    x: 0,
    y: 0,

    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,

    alwaysOnTop: true,
    backgroundColor: "#00000000",

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: require("path").join(__dirname, "preload.cjs"),
    },
  });

  obsOverlayWindow.loadURL("http://localhost:5173/?overlay=true");
  obsOverlayWindow.setAlwaysOnTop(true, "floating");

  // Mouse clicks pass through 100% to desktop / games underneath
  obsOverlayWindow.setIgnoreMouseEvents(true, { forward: true });

  obsOverlayWindow.webContents.on("did-finish-load", () => {
    console.log("[OBS OVERLAY] Loaded successfully: http://localhost:5173/?overlay=true");
  });

  obsOverlayWindow.on("closed", () => {
    console.log("[OBS OVERLAY] Closed");
    obsOverlayWindow = null;
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send("obs-overlay-status-changed", false);
    }
  });

  console.log("[OBS OVERLAY] Created");
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send("obs-overlay-status-changed", true);
  }
  return true;
}

function closeObsOverlayWindow() {
  if (obsOverlayWindow && !obsOverlayWindow.isDestroyed()) {
    console.log("[OBS OVERLAY] Closing dedicated overlay window...");
    obsOverlayWindow.close();
    obsOverlayWindow = null;
    return true;
  }
  return false;
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  mainWindow = new BrowserWindow({
    title: "Reactive Avatars - Overlay & Editor",
    width: width,
    height: height,
    x: 0,
    y: 0,

    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,

    alwaysOnTop: true,
    backgroundColor: "#00000000",

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: require("path").join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.loadURL("http://localhost:5173");
  mainWindow.setAlwaysOnTop(true, "floating");

  // IPC handlers for OBS overlay window
  ipcMain.handle("open-obs-overlay", () => {
    return openObsOverlayWindow();
  });

  ipcMain.handle("close-obs-overlay", () => {
    return closeObsOverlayWindow();
  });

  ipcMain.handle("get-obs-overlay-status", () => {
    return obsOverlayWindow !== null && !obsOverlayWindow.isDestroyed();
  });

  // F8 = toggle click-through on main window
  const registeredF8 = globalShortcut.register("F8", () => {
    clickThrough = !clickThrough;
    mainWindow.setIgnoreMouseEvents(clickThrough);
    console.log("Click-through (Main Window):", clickThrough ? "ON" : "OFF");
    if (mainWindow.webContents) {
      mainWindow.webContents.send("click-through-changed", clickThrough);
    }
  });

  // F9 = toggle editor panel / stream mode globally
  const registeredF9 = globalShortcut.register("F9", () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send("toggle-overlay-mode");
    }
    console.log("F9 pressed -> toggling overlay mode");
  });

  console.log("F8 registered:", registeredF8, "| F9 registered:", registeredF9);
}

app.whenReady().then(createWindow);

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});