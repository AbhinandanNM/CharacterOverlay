const {
  app,
  BrowserWindow,
  screen,
  globalShortcut,
  ipcMain,
} = require("electron");
const { WebSocketServer, WebSocket } = require("ws");

let mainWindow;
let clickThrough = false;

// ── Local Real-Time Sync Server (Port 9099) ──────────────────────────────────
const LOCAL_SYNC_PORT = 9099;
let syncWss = null;
let latestLayout = null;
let latestSpeaking = null;
const localSyncClients = new Set();

function broadcastToLocalClients(senderWs, data) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  for (const client of localSyncClients) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.error("[LOCAL SYNC] Error sending to client:", err);
      }
    }
  }
}

function initLocalSyncServer() {
  try {
    syncWss = new WebSocketServer({ port: LOCAL_SYNC_PORT });

    syncWss.on("connection", (ws) => {
      localSyncClients.add(ws);
      console.log(`[LOCAL SYNC] Client connected (total: ${localSyncClients.size})`);

      // Immediately push latest cached layout and speaking state to new client (OBS overlay)
      if (latestLayout) {
        try {
          ws.send(JSON.stringify({ type: "AVATARS_UPDATE", avatars: latestLayout }));
        } catch (e) {}
      }
      if (latestSpeaking) {
        try {
          ws.send(JSON.stringify({ type: "SPEAKING_UPDATE", speaking: latestSpeaking }));
        } catch (e) {}
      }

      ws.on("message", (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          if (!data || typeof data !== "object") return;

          if (data.type === "AVATARS_UPDATE" || data.type === "LAYOUT_UPDATE") {
            if (Array.isArray(data.avatars)) {
              latestLayout = data.avatars;
            }
          } else if (data.type === "SPEAKING_UPDATE") {
            if (data.speaking && typeof data.speaking === "object") {
              latestSpeaking = data.speaking;
            }
          }

          // Broadcast to all other local clients (including OBS Browser Source)
          broadcastToLocalClients(ws, data);

          // If mainWindow is active, also forward via IPC
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send("local-sync-receive", data);
          }
        } catch (e) {
          console.error("[LOCAL SYNC] Message parse error:", e);
        }
      });

      ws.on("close", () => {
        localSyncClients.delete(ws);
        console.log(`[LOCAL SYNC] Client disconnected (total: ${localSyncClients.size})`);
      });

      ws.on("error", (err) => {
        localSyncClients.delete(ws);
        console.error("[LOCAL SYNC] Client socket error:", err.message);
      });
    });

    syncWss.on("error", (err) => {
      console.error("[LOCAL SYNC] Server error on port " + LOCAL_SYNC_PORT + ":", err.message);
    });

    console.log(`[LOCAL SYNC] WebSocket server running on ws://127.0.0.1:${LOCAL_SYNC_PORT}`);
  } catch (err) {
    console.error("[LOCAL SYNC] Failed to initialize WebSocket server:", err);
  }
}

// Handle IPC messages from Electron editor window
ipcMain.on("local-sync-send", (_event, data) => {
  if (!data || typeof data !== "object") return;
  if (data.type === "AVATARS_UPDATE" || data.type === "LAYOUT_UPDATE") {
    if (Array.isArray(data.avatars)) {
      latestLayout = data.avatars;
    }
  } else if (data.type === "SPEAKING_UPDATE") {
    if (data.speaking && typeof data.speaking === "object") {
      latestSpeaking = data.speaking;
    }
  }
  broadcastToLocalClients(null, data);
});

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  mainWindow = new BrowserWindow({
    title: "Reactive Avatars - Editor & Overlay",
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

  // F8 = toggle click-through on editor/overlay
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

app.whenReady().then(() => {
  initLocalSyncServer();
  createWindow();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (syncWss) {
    try {
      syncWss.close();
    } catch (e) {}
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});