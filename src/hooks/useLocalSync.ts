import { useCallback, useEffect, useRef } from 'react';
import type { AvatarConfig } from '../types/avatar';

export type SyncMessage =
  | { type: 'AVATARS_UPDATE'; avatars: AvatarConfig[] }
  | { type: 'LAYOUT_UPDATE'; avatars: AvatarConfig[] }
  | { type: 'SPEAKING_UPDATE'; speaking: Record<string, boolean> }
  | { type: 'REQUEST_INITIAL_STATE' };

const LOCAL_WS_URL = 'ws://127.0.0.1:9099';
const BROADCAST_CHANNEL_NAME = 'reactive-avatars-sync';

/**
 * Hook to send and receive real-time local sync messages
 * across Electron editor and OBS Browser Source.
 */
export function useLocalSync(onMessage?: (msg: SyncMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Connect to local WebSocket and BroadcastChannel
  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    // 1. BroadcastChannel (for browser tabs on same instance)
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bcRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data && onMessageRef.current) {
          onMessageRef.current(event.data);
        }
      };
    } catch (e) {
      console.warn('[LOCAL SYNC] BroadcastChannel not supported:', e);
    }

    // 2. Electron IPC listener (if running inside Electron)
    let unsubscribeIpc: (() => void) | null = null;
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.onLocalSync) {
      unsubscribeIpc = electronAPI.onLocalSync((data: SyncMessage) => {
        if (data && onMessageRef.current) {
          onMessageRef.current(data);
        }
      });
    }

    // 3. Local WebSocket connection to ws://127.0.0.1:9099
    function connectWs() {
      if (!isMounted) return;
      try {
        const ws = new WebSocket(LOCAL_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[LOCAL SYNC] Connected to local sync WebSocket');
          // Request initial cached state
          try {
            ws.send(JSON.stringify({ type: 'REQUEST_INITIAL_STATE' }));
          } catch {}
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && onMessageRef.current) {
              onMessageRef.current(data);
            }
          } catch (e) {
            console.error('[LOCAL SYNC] JSON parse error:', e);
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (isMounted) {
            reconnectTimeout = setTimeout(connectWs, 2000);
          }
        };

        ws.onerror = () => {
          // Socket error handled silently; onclose will schedule reconnect
          try {
            ws.close();
          } catch {}
        };
      } catch {
        if (isMounted) {
          reconnectTimeout = setTimeout(connectWs, 2000);
        }
      }
    }

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
      if (bcRef.current) {
        try {
          bcRef.current.close();
        } catch {}
        bcRef.current = null;
      }
      if (unsubscribeIpc) {
        unsubscribeIpc();
      }
    };
  }, []);

  const sendSync = useCallback((msg: SyncMessage) => {
    // A. Send via Electron IPC if available
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.sendLocalSync) {
      try {
        electronAPI.sendLocalSync(msg);
      } catch (e) {
        console.error('[LOCAL SYNC] Electron IPC send error:', e);
      }
    }

    // B. Send via Local WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
      } catch (e) {
        console.error('[LOCAL SYNC] Local WS send error:', e);
      }
    }

    // C. Send via BroadcastChannel
    if (bcRef.current) {
      try {
        bcRef.current.postMessage(msg);
      } catch (e) {
        console.error('[LOCAL SYNC] BroadcastChannel send error:', e);
      }
    }
  }, []);

  return { sendSync };
}
