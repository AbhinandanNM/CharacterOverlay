# CharacterOverlay (Reactive Avatars) 🎭

A lightweight, transparent voice-reactive avatar stream overlay and real-time visual editor built with **React**, **TypeScript**, **Vite**, and **Electron**.

Designed for gaming streams, podcasts, and collaborative content creation.

---

## ✨ Features

- **🎤 Voice-Reactive Avatars**: Avatars dynamically animate and bounce when speaking based on microphone input.
- **🛠️ Built-in Visual Editor**: 
  - Add unlimited avatars via the UI with local PNG/WebP/JPG uploads.
  - Free-canvas mouse dragging to position characters anywhere.
  - Scale & resize with the bottom-right handle or exact numeric inputs.
  - Character rotation (-180° to +180°).
  - Layer management (Bring to Front, Send to Back, Bring Forward, Send Backward).
  - Edit names, sensitivities, and replace Idle / Talking image assets live.
  - Hide / Show characters or remove them safely.
- **🖥️ Clean Transparent Overlay**:
  - Borderless, transparent, floating Electron window over games and streaming software (OBS / Discord).
  - **F9**: Toggle editor control panel (Stream Mode vs. Edit Mode).
  - **F8**: Toggle global click-through (allows mouse clicks to pass directly through to games underneath).
- **💾 Automatic Persistence**:
  - Character arrangements, custom images, coordinates, sizes, rotations, and sensitivities automatically persist in `localStorage`.

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
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/AbhinandanNM/CharacterOverlay.git

# Navigate to project directory
cd CharacterOverlay

# Install dependencies
npm install
```

### Running Locally

```bash
# Start both Vite dev server and Electron overlay
npm start
```

### Building for Production

```bash
npm run build
```

---

## 🏗️ Project Structure

```
├── electron/
│   ├── main.cjs        # Electron window configuration & global shortcuts (F8, F9)
│   └── preload.cjs     # Context bridge & IPC listeners
├── src/
│   ├── components/     # AvatarStage, AvatarItem, ControlPanel, AvatarLibrary, Modals
│   ├── hooks/          # useAvatarStore, useMicrophone
│   ├── types/          # AvatarConfig data model
│   ├── App.tsx         # Main orchestration layer
│   └── App.css         # Animations and base reset
└── public/
    └── avatars/        # Default avatar assets (ANM, SOM, ATHARV)
```

---

## 📄 License

MIT License. Feel free to use and customize for your own streams!
