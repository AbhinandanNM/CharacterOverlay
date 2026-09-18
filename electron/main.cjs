const {
  app,
  BrowserWindow,
  screen,
  globalShortcut
} = require("electron");

let mainWindow;
let clickThrough = false;

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 500,

    x: width - 1030,
    y: height - 530,

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

  // F8 = toggle click-through
  const registeredF8 = globalShortcut.register("F8", () => {
    clickThrough = !clickThrough;
    mainWindow.setIgnoreMouseEvents(clickThrough);
    console.log("Click-through:", clickThrough ? "ON" : "OFF");
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