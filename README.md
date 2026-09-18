# CharacterOverlay (Reactive Avatars) 🎭

A lightweight, transparent voice-reactive avatar stream overlay, real-time visual editor, and **dedicated OBS Browser Source overlay** built with **React**, **TypeScript**, **Vite**, and **Electron**.

Featuring **Multi-Person Internet Voice-Reactivity** via cloud WebSockets and **Zero Desktop Clutter OBS Browser Source** — stream with animated reactive avatars while keeping your physical gaming monitor 100% clean!

---

## ✨ Features

- **🎬 Dedicated OBS Browser Source Overlay (Zero Desktop Clutter)**:
  - Add `http://localhost:5173/?overlay=true` directly into OBS Studio as a Browser Source.
  - Avatars render inside your stream/recording without covering your screen or interfering with gameplay.
  - Real-time layout and speaking synchronization over WebSockets with 1-click sync.
- **🌐 Multi-Person Internet Voice-Reactivity**:
  - Connect friends worldwide over the internet without port forwarding or sharing IP addresses.
  - Dedicated **Friend Companion Web App** (works on any browser/phone).
  - Room system (e.g. `ANTIC-STREAM-01`) isolating stream sessions.
  - **Local Voice Activity Detection (VAD)** with debounce/hysteresis so characters never flicker.
  - **Zero Audio Streaming**: Transmits ONLY binary/boolean speaking state packets. No raw microphone audio is ever sent or stored.
- **👥 Simultaneous Multi-Speaker Support**:
  - Multiple friends (e.g. ANM + SOM + ATHARV) can speak simultaneously; each avatar animates independently.
  - Local microphone and remote internet microphones coexist seamlessly.
- **🧪 Developer Test Mode**:
  - Built-in simulation buttons (`[ TALK ]`) to test avatar reactions without waiting for friends.
- **🛠️ Built-in Visual Editor**: 
  - Add unlimited avatars via the UI with local PNG/WebP/JPG uploads.
  - Free-canvas mouse dragging to position characters anywhere across the entire display.
  - Scale & resize with the bottom-right handle or exact numeric inputs.
  - Character rotation (-180° to +180°).
  - Layer management (Bring to Front, Send to Back, Bring Forward, Send Backward).
  - Edit names, sensitivities, and replace Idle / Talking image assets live.
  - Assign any avatar to a remote friend's `voiceUserId` dynamically.
- **🖥️ Clean Transparent Overlay**:
  - Borderless, transparent, full-screen floating Electron window over games and streaming software (OBS / Discord).
  - **F9**: Toggle editor control panel (Stream Mode vs. Edit Mode).
  - **F8**: Toggle global click-through (allows mouse clicks to pass directly through to games underneath).
- **💾 Automatic Persistence**:
  - Character arrangements, custom images, coordinates, sizes, rotations, sensitivities, and voice assignments automatically persist in `localStorage`.

---

## ⌨️ Shortcuts & Hotkeys

| Key | Action |
| --- | --- |
| **`F9`** | Toggle Editor Overlay (Edit Mode ↔ Stream Mode) |
| **`F8`** | Toggle Mouse Click-Through (Pass clicks to underlying games/apps) |
| **`Escape` / `E`** | Quick toggle back to Edit Mode (when overlay window is focused) |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/AbhinandanNM/CharacterOverlay.git

# Navigate to project directory
cd CharacterOverlay

# Install dependencies
npm install
```

### Running Locally (Overlay + WebSocket Server)

```bash
# Run Overlay App + Electron
npm start

# In a separate terminal (or via npm run server), start the WebSocket server:
npm run server
```

Or start everything (Server + Vite + Electron) simultaneously:
```bash
npm run start:all
```

---

## ☁️ Deploying the WebSocket Server to the Cloud (Free)

To let friends connect over the internet without being on your local Wi-Fi, deploy the lightweight server in `server/` to any free cloud host:

### Option 1: Render.com (Recommended & Easiest)
1. Fork or push this repository to your GitHub.
2. Go to [Render.com](https://render.com) and click **New + Web Service**.
3. Select this repository.
4. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Create Web Service**.
6. Render will provide a free public URL, for example:
   `https://reactive-avatars.onrender.com`
7. Your public WebSocket URL will be:
   `wss://reactive-avatars.onrender.com`

---

## 🎙️ How to Use with Friends

1. **Host (You)**:
   - In your Overlay control panel under **🌐 VOICE NETWORK**, enter your server URL (`wss://your-app.onrender.com` or `ws://localhost:8080`) and Room ID (e.g. `ANTIC-STREAM-01`).
   - Click **Connect**.
   - Select your friend's avatar (e.g. `SOM`), and in the Inspector under **Voice User**, select `SOM`.

2. **Friends (SOM / ATHARV)**:
   - Send your friend the companion link: `https://your-app.onrender.com` (or open `companion/index.html`).
   - They enter their **User ID** (e.g. `SOM`), the **Room ID** (`ANTIC-STREAM-01`), and click **🚀 Connect to Room**.
   - When they speak into their microphone, the SOM avatar on your overlay instantly switches to `talking.png`!

---

## 🏗️ Project Structure

```
├── server/
│   ├── server.js       # Cloud WebSocket & HTTP static server
│   └── package.json    # Standalone server dependencies
├── companion/
│   ├── index.html      # Friend Companion Web Client UI
│   └── app.js          # Web Audio VAD + Debounce + WebSocket logic
├── electron/
│   ├── main.cjs        # Full-screen transparent overlay & global hotkeys (F8, F9)
│   └── preload.cjs     # Context bridge & IPC listeners
├── src/
│   ├── components/     # AvatarStage, AvatarItem, ControlPanel, AvatarLibrary, Modals
│   ├── hooks/          # useAvatarStore, useMicrophone, useRemoteVoice
│   ├── types/          # AvatarConfig & RoomUser data models
│   ├── App.tsx         # Multi-speaker voice compositing
│   └── App.css         # Overlay resets and bounce animations
└── public/
    └── avatars/        # Default avatar assets (ANM, SOM, ATHARV)
```

---

## 📄 License

MIT License. Feel free to use and customize for your own streams!
