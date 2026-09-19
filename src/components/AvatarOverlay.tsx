import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarConfig } from '../types/avatar';
import { DEFAULT_AVATARS, LAYOUT_STORAGE_KEY, NETWORK_STORAGE_KEY } from '../types/avatar';
import { useLocalSync, type SyncMessage } from '../hooks/useLocalSync';
import { AvatarStage } from './AvatarStage';

function getInitialConfig() {
  let serverUrl = 'wss://reactive-avatars.onrender.com';
  let roomId = 'ANTIC-STREAM-01';

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('serverUrl')) serverUrl = params.get('serverUrl')!;
    if (params.get('roomId')) roomId = params.get('roomId')!.toUpperCase();
  } catch {}

  try {
    const rawNet = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (rawNet) {
      const parsed = JSON.parse(rawNet);
      if (parsed.serverUrl && !window.location.search.includes('serverUrl')) serverUrl = parsed.serverUrl;
      if (parsed.roomId && !window.location.search.includes('roomId')) roomId = parsed.roomId.toUpperCase();
    }
  } catch {}

  return { serverUrl, roomId };
}

export function AvatarOverlay() {
  const { serverUrl, roomId } = useRef(getInitialConfig()).current;

  const [avatars, setAvatars] = useState<AvatarConfig[]>(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('[OBS OVERLAY] localStorage parse error:', e);
    }
    return DEFAULT_AVATARS;
  });

  const [speakingMap, setSpeakingMap] = useState<Record<string, boolean>>({});
  const wsRef = useRef<WebSocket | null>(null);

  // Local real-time sync channel listener (<1ms update from Electron editor)
  const handleLocalSyncMessage = useCallback((msg: SyncMessage) => {
    if ((msg.type === 'AVATARS_UPDATE' || msg.type === 'LAYOUT_UPDATE') && Array.isArray(msg.avatars) && msg.avatars.length > 0) {
      setAvatars(msg.avatars);
      try { localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(msg.avatars)); } catch {}
      console.log('[OBS OVERLAY] Instant local layout sync:', msg.avatars.length, 'avatars');
    } else if (msg.type === 'SPEAKING_UPDATE' && msg.speaking) {
      setSpeakingMap(prev => ({ ...prev, ...msg.speaking }));
    }
  }, []);

  useLocalSync(handleLocalSyncMessage);

  useEffect(() => {
    console.log('[OBS OVERLAY] Created - Initializing OBS Browser Source for room:', roomId);

    // 1. Fetch latest layout from server if available
    try {
      const httpUrl = serverUrl.replace('wss://', 'https://').replace('ws://', 'http://');
      fetch(`${httpUrl}/api/layout?roomId=${encodeURIComponent(roomId)}`)
        .then(res => res.json())
        .then(data => {
          if (data?.layout && Array.isArray(data.layout) && data.layout.length > 0) {
            setAvatars(data.layout);
            try { localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(data.layout)); } catch {}
            console.log('[OBS OVERLAY] Loaded initial layout from server API:', data.layout.length, 'avatars');
          }
        })
        .catch(err => {
          console.warn('[OBS OVERLAY] Could not fetch HTTP layout (will use WS / local):', err.message);
        });
    } catch {}

    // 2. Connect to WebSocket room for real-time layout & voice events
    let isMounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connectWs() {
      if (!isMounted) return;
      try {
        const socket = new WebSocket(serverUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log('[OBS OVERLAY] WebSocket Connected to:', serverUrl);
          socket.send(JSON.stringify({
            type: 'join',
            roomId,
            userId: 'OBS-OVERLAY',
            role: 'overlay',
          }));
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (!msg || typeof msg !== 'object') return;

            if (msg.type === 'joined' && msg.layout && Array.isArray(msg.layout) && msg.layout.length > 0) {
              setAvatars(msg.layout);
              try { localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(msg.layout)); } catch {}
              console.log('[OBS OVERLAY] Layout received on join:', msg.layout.length, 'avatars');
            } else if (msg.type === 'layout_update' && Array.isArray(msg.avatars) && msg.avatars.length > 0) {
              setAvatars(msg.avatars);
              try { localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(msg.avatars)); } catch {}
              console.log('[OBS OVERLAY] Real-time layout update:', msg.avatars.length, 'avatars');
            } else if (msg.type === 'speaking' && msg.userId) {
              const u = String(msg.userId);
              const spk = Boolean(msg.speaking);
              setSpeakingMap(prev => ({
                ...prev,
                [u.toLowerCase()]: spk,
                [u]: spk,
              }));
              console.log(`[OBS OVERLAY] Voice state: ${u} = ${spk}`);
            } else if (msg.type === 'ping') {
              socket.send(JSON.stringify({ type: 'pong', time: new Date().toISOString() }));
            }
          } catch (e) {
            console.error('[OBS OVERLAY] Message parse error:', e);
          }
        };

        socket.onclose = () => {
          console.log('[OBS OVERLAY] WebSocket Closed - Reconnecting in 3s...');
          if (isMounted) {
            reconnectTimer = setTimeout(connectWs, 3000);
          }
        };

        socket.onerror = (e) => {
          console.error('[OBS OVERLAY] WebSocket Error:', e);
        };
      } catch (err) {
        console.error('[OBS OVERLAY] WebSocket connection failed:', err);
        if (isMounted) {
          reconnectTimer = setTimeout(connectWs, 3000);
        }
      }
    }

    connectWs();

    // 3. Listen to local storage & BroadcastChannel as instant local fallbacks
    const channel = new BroadcastChannel('reactive-avatars-sync');
    channel.onmessage = (event) => {
      const data = event.data;
      if (data?.type === 'AVATARS_UPDATE' && Array.isArray(data.avatars)) {
        setAvatars(data.avatars);
      } else if (data?.type === 'SPEAKING_UPDATE' && data.speaking) {
        setSpeakingMap(prev => ({ ...prev, ...data.speaking }));
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LAYOUT_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) setAvatars(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
      channel.close();
      window.removeEventListener('storage', handleStorage);
      console.log('[OBS OVERLAY] Unmounted');
    };
  }, [serverUrl, roomId]);

  // Compute composite speaking states matching avatar assignments
  const compositeSpeaking = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const avatar of avatars) {
      let isTalking = false;

      // 1. Assigned remote user ID
      if (avatar.voiceUserId) {
        const k = avatar.voiceUserId.toLowerCase();
        if (speakingMap[k] !== undefined) isTalking = speakingMap[k];
        else if (speakingMap[avatar.voiceUserId] !== undefined) isTalking = speakingMap[avatar.voiceUserId];
      }

      // 2. Local user designation or match by name
      if (!isTalking && avatar.name) {
        const k = avatar.name.toLowerCase();
        if (speakingMap[k] !== undefined) isTalking = speakingMap[k];
        else if (speakingMap[avatar.name] !== undefined) isTalking = speakingMap[avatar.name];
      }

      // 3. Match by ID
      if (!isTalking) {
        const idLower = avatar.id.toLowerCase();
        if (speakingMap[idLower] !== undefined) isTalking = speakingMap[idLower];
        else if (speakingMap[avatar.id] !== undefined) isTalking = speakingMap[avatar.id];
      }

      // 4. Match local mic broadcast
      if (!isTalking && avatar.isLocalUser) {
        if (speakingMap['local'] !== undefined) isTalking = speakingMap['local'];
        else if (speakingMap['host'] !== undefined) isTalking = speakingMap['host'];
        else if (speakingMap['overlay-host'] !== undefined) isTalking = speakingMap['overlay-host'];
      }

      map[avatar.id] = isTalking;
    }
    return map;
  }, [avatars, speakingMap]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: 'transparent',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <AvatarStage
        avatars={avatars}
        speaking={compositeSpeaking}
        selectedId={null}
        mode="stream"
        onSelectAvatar={() => {}}
        onUpdateAvatar={() => {}}
        onDeselect={() => {}}
      />
    </div>
  );
}
