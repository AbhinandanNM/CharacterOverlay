import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomUser } from '../types/avatar';
import { NETWORK_STORAGE_KEY } from '../types/avatar';

interface UseRemoteVoiceResult {
  connected: boolean;
  statusText: string;
  serverUrl: string;
  roomId: string;
  roomUsers: RoomUser[];
  remoteSpeaking: Record<string, boolean>;
  devTestSpeaking: Record<string, boolean>;
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

function getStoredNetworkConfig(): StoredNetworkConfig {
  try {
    const raw = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.serverUrl && parsed.roomId) return parsed;
    }
  } catch {}
  return {
    serverUrl: 'ws://localhost:8080',
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

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);

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
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    manualDisconnectRef.current = false;
    const cleanUrl = serverUrl.trim();
    const cleanRoom = roomId.trim().toUpperCase();

    if (!cleanUrl || !cleanRoom) {
      setStatusText('Missing URL or Room');
      return;
    }

    setStatusText('Connecting...');
    try {
      const ws = new WebSocket(cleanUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setStatusText(`Connected: ${cleanRoom}`);

        // Join as overlay
        ws.send(JSON.stringify({
          type: 'join',
          roomId: cleanRoom,
          userId: 'OVERLAY-HOST',
          role: 'overlay',
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!msg || typeof msg !== 'object') return;

          switch (msg.type) {
            case 'room_users':
            case 'joined': {
              if (Array.isArray(msg.users)) {
                setRoomUsers(msg.users);
              }
              break;
            }

            case 'speaking': {
              const { userId, speaking } = msg;
              if (userId) {
                // Normalize userId to lowercase for case-insensitive matching
                setRemoteSpeaking(prev => ({
                  ...prev,
                  [userId.toLowerCase()]: Boolean(speaking),
                  [userId]: Boolean(speaking),
                }));
              }
              break;
            }

            default:
              break;
          }
        } catch (e) {
          console.error('Error parsing remote voice message:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setRoomUsers([]);
        setRemoteSpeaking({});
        wsRef.current = null;

        if (!manualDisconnectRef.current) {
          setStatusText('Disconnected (Retrying...)');
          // Auto reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        } else {
          setStatusText('Disconnected');
        }
      };

      ws.onerror = () => {
        setStatusText('Connection Error');
      };
    } catch (e) {
      setStatusText('Invalid URL');
      setConnected(false);
    }
  }, [serverUrl, roomId]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setStatusText('Disconnected');
    setRoomUsers([]);
    setRemoteSpeaking({});
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
    setServerUrl,
    setRoomId,
    connect,
    disconnect,
    toggleDevTestSpeaking,
  };
}
