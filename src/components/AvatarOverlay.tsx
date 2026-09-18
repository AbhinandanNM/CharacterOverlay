import { useEffect, useState } from 'react';
import type { AvatarConfig } from '../types/avatar';
import { DEFAULT_AVATARS, LAYOUT_STORAGE_KEY } from '../types/avatar';
import { AvatarStage } from './AvatarStage';

export function AvatarOverlay() {
  const [avatars, setAvatars] = useState<AvatarConfig[]>(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('[OBS OVERLAY] Failed to load saved layout from localStorage:', e);
    }
    return DEFAULT_AVATARS;
  });

  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});

  useEffect(() => {
    console.log('[OBS OVERLAY] Created');
    console.log('[OBS OVERLAY] Loaded - Ready for OBS Window Capture');

    const channel = new BroadcastChannel('reactive-avatars-sync');

    // Request initial state from the editor window
    channel.postMessage({ type: 'REQUEST_INITIAL_STATE' });

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'AVATARS_UPDATE' && Array.isArray(data.avatars)) {
        setAvatars(data.avatars);
        console.log('[OBS OVERLAY] State synchronized - Avatars count:', data.avatars.length);
      } else if (data.type === 'SPEAKING_UPDATE' && data.speaking && typeof data.speaking === 'object') {
        setSpeaking(data.speaking);
        console.log('[OBS OVERLAY] Voice state updated:', data.speaking);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LAYOUT_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setAvatars(parsed);
            console.log('[OBS OVERLAY] State synchronized via storage event');
          }
        } catch (err) {
          console.error('[OBS OVERLAY] Storage sync parse error:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      console.log('[OBS OVERLAY] Closed');
      window.removeEventListener('storage', handleStorage);
      channel.close();
    };
  }, []);

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
        speaking={speaking}
        selectedId={null}
        mode="stream"
        onSelectAvatar={() => {}}
        onUpdateAvatar={() => {}}
        onDeselect={() => {}}
      />
    </div>
  );
}
