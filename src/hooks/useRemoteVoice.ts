import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomUser } from '../types/avatar';
import { NETWORK_STORAGE_KEY } from '../types/avatar';

export interface RemoteVoiceDebugInfo {
  readyState: number;
  lastEvent: string;
  lastMessage: string;
  lastError: string;
  reconnectAttempts: number;
  lastCloseCode: number | null;
  lastCloseReason: string;
  lastRemoteVoiceEvent: { userId: string; speaking: boolean; time: string } | null;
  pipeline: {
    mic: boolean;
    vad: boolean;
    wsSend: boolean;
    server: boolean;
    wsRecv: boolean;
    overlay: boolean;
  };
}

interface UseRemoteVoiceResult {
  connected: boolean;
  statusText: string;
  serverUrl: string;
  roomId: string;
  roomUsers: RoomUser[];
  remoteSpeaking: Record<string, boolean>;
  devTestSpeaking: Record<string, boolean>;
  debugInfo: RemoteVoiceDebugInfo;
  setServerUrl: (url: string) => void;
  setRoomId: (roomId: string) => void;
  connect: () => void;
  disconnect: () => void;
  toggleDevTestSpeaking: (avatarId: string) => void;
}

interface StoredNetworkConfig {
  serverUrl: string;
  roomId: string;
}

function ts(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

const CLOSE_CODE_EXPLANATIONS: Record<number, string> = {
  1000: 'Normal Closure',
  1001: 'Going Away',
  1002: 'Protocol Error',
  1003: 'Unsupported Data',
  1005: 'No Status Received',
  1006: 'Abnormal Closure (Server/Network dropped connection without close frame)',
  1008: 'Policy Violation',
  1011: 'Server Error',
};

function getStoredNetworkConfig(): StoredNetworkConfig {
  try {
    const raw = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.serverUrl && parsed.roomId) return parsed;
    }
  } catch {}
  return {
    serverUrl: 'wss://reactive-avatars.onrender.com',
    roomId: 'ANTIC-STREAM-01',
  };
}

export function useRemoteVoice(): UseRemoteVoiceResult {
  const initial = useRef(getStoredNetworkConfig()).current;
  const [serverUrl, setServerUrlState] = useState(initial.serverUrl);
  const [roomId, setRoomIdState] = useState(initial.roomId);

  const [connected, setConnected] = useState(false);
  const [statusText, setStatusText] = useState('Disconnected');
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [remoteSpeaking, setRemoteSpeaking] = useState<Record<string, boolean>>({});
  const [devTestSpeaking, setDevTestSpeaking] = useState<Record<string, boolean>>({});

  const [debugInfo, setDebugInfo] = useState<RemoteVoiceDebugInfo>({
    readyState: 3, // CLOSED
    lastEvent: 'Init',
    lastMessage: '-',
    lastError: 'None',
    reconnectAttempts: 0,
    lastCloseCode: null,
    lastCloseReason: '',
    lastRemoteVoiceEvent: null,
    pipeline: {
      mic: true,
      vad: true,
      wsSend: true,
      server: false,
      wsRecv: false,
      overlay: false,
    },
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);
  const connectionGenRef = useRef(0);

  const setServerUrl = useCallback((url: string) => {
    setServerUrlState(url);
    localStorage.setItem(
      NETWORK_STORAGE_KEY,
      JSON.stringify({ serverUrl: url, roomId })
    );
  }, [roomId]);

  const setRoomId = useCallback((id: string) => {
    const clean = id.trim().toUpperCase();
    setRoomIdState(clean);
    localStorage.setItem(
      NETWORK_STORAGE_KEY,
      JSON.stringify({ serverUrl, roomId: clean })
    );
  }, [serverUrl]);

  const connect = useCallback(() => {
    manualDisconnectRef.current = false;
    const cleanUrl = serverUrl.trim();
    const cleanRoom = roomId.trim().toUpperCase();

    if (!cleanUrl || !cleanRoom) {
      setStatusText('Missing URL or Room');
      return;
    }

    // 1. Safely teardown old socket
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // 2. Increment generation token
    const gen = ++connectionGenRef.current;

    setStatusText('Connecting...');
    setDebugInfo(prev => ({
      ...prev,
      readyState: 0,
      lastEvent: `${ts()} CONNECTING (gen #${gen})`,
    }));

    try {
      const ws = new WebSocket(cleanUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (gen !== connectionGenRef.current) return;
        setConnected(true);
        setStatusText(`Connected: ${cleanRoom}`);
        setDebugInfo(prev => ({
          ...prev,
          readyState: 1,
          reconnectAttempts: 0,
          lastEvent: `${ts()} OPEN`,
          lastError: 'None',
          pipeline: { ...prev.pipeline, server: true },
        }));

        // Join as overlay
        ws.send(JSON.stringify({
          type: 'join',
          roomId: cleanRoom,
          userId: 'OVERLAY-HOST',
          role: 'overlay',
        }));
      };

      ws.onmessage = (event) => {
        if (gen !== connectionGenRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (!msg || typeof msg !== 'object') return;

          setDebugInfo(prev => ({
            ...prev,
            lastMessage: `${ts()} [type=${msg.type || '?'}]`,
            pipeline: { ...prev.pipeline, wsRecv: true },
          }));

          switch (msg.type) {
            case 'room_users':
            case 'joined': {
              if (Array.isArray(msg.users)) {
                setRoomUsers(msg.users);
                const activeUserIds = new Set(
                  msg.users.map((u: RoomUser) => String(u.userId || '').toLowerCase())
                );
                setRemoteSpeaking(prev => {
                  const next: Record<string, boolean> = {};
                  for (const [k, v] of Object.entries(prev)) {
                    if (activeUserIds.has(k.toLowerCase()) && v === true) {
                      next[k] = true;
                    }
                  }
                  return next;
                });
              }
              break;
            }

            case 'speaking': {
              const { userId, speaking } = msg;
              if (userId) {
                const isSpk = Boolean(speaking);
                setRemoteSpeaking(prev => ({
                  ...prev,
                  [userId.toLowerCase()]: isSpk,
                  [userId]: isSpk,
                }));
                setDebugInfo(prev => ({
                  ...prev,
                  lastRemoteVoiceEvent: { userId, speaking: isSpk, time: ts() },
                  pipeline: { ...prev.pipeline, wsRecv: true, overlay: true },
                }));
              }
              break;
            }

            case 'ping': {
              ws.send(JSON.stringify({ type: 'pong', time: ts() }));
              break;
            }

            default:
              break;
          }
        } catch (e) {
          console.error('Error parsing remote voice message:', e);
        }
      };

      ws.onclose = (ev) => {
        if (gen !== connectionGenRef.current) return;
        const code = ev.code;
        const reason = ev.reason || CLOSE_CODE_EXPLANATIONS[code] || '';

        setConnected(false);
        setRoomUsers([]);
        setRemoteSpeaking({});
        wsRef.current = null;

        setDebugInfo(prev => ({
          ...prev,
          readyState: 3,
          lastEvent: `${ts()} CLOSED (code=${code})`,
          lastCloseCode: code,
          lastCloseReason: reason,
          pipeline: { ...prev.pipeline, server: false, wsRecv: false },
        }));

        if (!manualDisconnectRef.current) {
          setDebugInfo(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }));
          setStatusText(`Disconnected (Retrying... #${debugInfo.reconnectAttempts + 1})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!manualDisconnectRef.current) {
              connect();
            }
          }, 3000);
        } else {
          setStatusText('Disconnected');
        }
      };

      ws.onerror = (err: any) => {
        if (gen !== connectionGenRef.current) return;
        const msg = err?.message || 'WebSocket Error';
        setStatusText('Connection Error');
        setDebugInfo(prev => ({
          ...prev,
          lastEvent: `${ts()} ERROR`,
          lastError: msg,
        }));
      };
    } catch (e: any) {
      setStatusText('Invalid URL');
      setConnected(false);
      setDebugInfo(prev => ({
        ...prev,
        readyState: 3,
        lastError: e?.message || 'Invalid URL',
      }));
    }
  }, [serverUrl, roomId, debugInfo.reconnectAttempts]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'User initiated disconnect');
      } catch (e) {}
      wsRef.current = null;
    }
    setConnected(false);
    setStatusText('Disconnected');
    setRoomUsers([]);
    setRemoteSpeaking({});
    setDebugInfo(prev => ({
      ...prev,
      readyState: 3,
      lastEvent: `${ts()} DISCONNECTED (manual)`,
      pipeline: { ...prev.pipeline, server: false, wsRecv: false, overlay: false },
    }));
  }, []);

  const toggleDevTestSpeaking = useCallback((avatarId: string) => {
    setDevTestSpeaking(prev => ({
      ...prev,
      [avatarId]: !prev[avatarId],
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      manualDisconnectRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, []);

  return {
    connected,
    statusText,
    serverUrl,
    roomId,
    roomUsers,
    remoteSpeaking,
    devTestSpeaking,
    debugInfo,
    setServerUrl,
    setRoomId,
    connect,
    disconnect,
    toggleDevTestSpeaking,
  };
}
