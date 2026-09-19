// Avatar configuration — fully serializable, stored in localStorage
export interface AvatarConfig {
  id: string;             // unique ID (crypto.randomUUID())
  name: string;           // display name e.g. "ANM", "SOM"
  idleImage: string;      // URL or base64 data URL for idle pose
  talkingImage: string;   // URL or base64 data URL for talking pose
  x: number;              // px from stage left
  y: number;              // px from stage top
  width: number;          // px
  height: number;         // px
  rotation: number;       // degrees (0 = no rotation)
  zIndex: number;         // layer order (higher = in front)
  visible: boolean;       // show/hide toggle
  sensitivity: number;    // microphone volume threshold 1–30
  voiceUserId?: string;   // assigned remote user ID (e.g. "som", "atharv")
  isLocalUser?: boolean;  // true = this avatar is controlled by the local microphone
  textColor?: string;     // custom name text color (hex e.g. "#ffffff")
  fontFamily?: string;    // custom font family
  fontSize?: number;      // custom font size multiplier/px
  showName?: boolean;     // whether to display the name below avatar (default: true)
  glowColor?: string;     // custom glow / text-shadow color
}

export interface RoomUser {
  userId: string;
  role: 'overlay' | 'companion';
}

// Runtime-only speaking state (not persisted)
export interface AvatarRuntime {
  speaking: boolean;
}

export type AppMode = 'edit' | 'stream';

export const LAYOUT_STORAGE_KEY = 'reactive-avatars-layout';
export const NETWORK_STORAGE_KEY = 'reactive-avatars-network';

// Default layout positions for ANM/SOM/ATHARV if no saved layout exists
export const DEFAULT_AVATARS: AvatarConfig[] = [
  {
    id: 'anm',
    name: 'ANM',
    idleImage: '/avatars/anm/idle.png',
    talkingImage: '/avatars/anm/talking.png',
    x: 1000,
    y: 600,
    width: 260,
    height: 260,
    rotation: 0,
    zIndex: 1,
    visible: true,
    sensitivity: 7,
  },
  {
    id: 'som',
    name: 'SOM',
    idleImage: '/avatars/som/idle.png',
    talkingImage: '/avatars/som/talking.png',
    x: 1280,
    y: 600,
    width: 260,
    height: 260,
    rotation: 0,
    zIndex: 2,
    visible: true,
    sensitivity: 4,
  },
  {
    id: 'atharv',
    name: 'ATHARV',
    idleImage: '/avatars/atharv/idle.png',
    talkingImage: '/avatars/atharv/talking.png',
    x: 1560,
    y: 600,
    width: 260,
    height: 260,
    rotation: 0,
    zIndex: 3,
    visible: true,
    sensitivity: 6,
  },
];
