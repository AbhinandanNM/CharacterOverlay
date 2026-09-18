import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AppMode,
  AvatarConfig,
} from '../types/avatar';
import { DEFAULT_AVATARS, LAYOUT_STORAGE_KEY } from '../types/avatar';

interface UseAvatarStoreResult {
  avatars: AvatarConfig[];
  mode: AppMode;
  selectedId: string | null;
  setMode: (mode: AppMode) => void;
  setSelectedId: (id: string | null) => void;
  addAvatar: (avatar: Omit<AvatarConfig, 'id' | 'zIndex'>) => void;
  updateAvatar: (id: string, patch: Partial<AvatarConfig>) => void;
  removeAvatar: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  saveLayout: () => void;
  resetLayout: () => void;
}

function loadLayout(): AvatarConfig[] {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_AVATARS;
    const parsed = JSON.parse(raw) as AvatarConfig[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // corrupt storage — fall back to defaults
  }
  return DEFAULT_AVATARS;
}

function persistLayout(avatars: AvatarConfig[]) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(avatars));
  } catch (e) {
    console.error('Failed to save layout:', e);
  }
}

export function useAvatarStore(): UseAvatarStoreResult {
  const [avatars, setAvatars] = useState<AvatarConfig[]>(() => loadLayout());
  const [mode, setMode] = useState<AppMode>('edit');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-persist whenever avatars change
  const avatarsRef = useRef(avatars);
  useEffect(() => {
    avatarsRef.current = avatars;
    persistLayout(avatars);
  }, [avatars]);

  const addAvatar = useCallback((config: Omit<AvatarConfig, 'id' | 'zIndex'>) => {
    setAvatars(prev => {
      const maxZ = prev.reduce((m, a) => Math.max(m, a.zIndex), 0);
      const newAvatar: AvatarConfig = {
        ...config,
        id: crypto.randomUUID(),
        zIndex: maxZ + 1,
      };
      return [...prev, newAvatar];
    });
  }, []);

  const updateAvatar = useCallback((id: string, patch: Partial<AvatarConfig>) => {
    setAvatars(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const removeAvatar = useCallback((id: string) => {
    setAvatars(prev => prev.filter(a => a.id !== id));
    setSelectedId(prev => (prev === id ? null : prev));
  }, []);

  // Layer operations
  const bringForward = useCallback((id: string) => {
    setAvatars(prev => {
      const current = prev.find(a => a.id === id);
      if (!current) return prev;
      const next = prev
        .filter(a => a.zIndex > current.zIndex)
        .sort((a, b) => a.zIndex - b.zIndex)[0];
      if (!next) return prev;
      return prev.map(a => {
        if (a.id === id) return { ...a, zIndex: next.zIndex };
        if (a.id === next.id) return { ...a, zIndex: current.zIndex };
        return a;
      });
    });
  }, []);

  const sendBackward = useCallback((id: string) => {
    setAvatars(prev => {
      const current = prev.find(a => a.id === id);
      if (!current) return prev;
      const prev2 = prev
        .filter(a => a.zIndex < current.zIndex)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      if (!prev2) return prev;
      return prev.map(a => {
        if (a.id === id) return { ...a, zIndex: prev2.zIndex };
        if (a.id === prev2.id) return { ...a, zIndex: current.zIndex };
        return a;
      });
    });
  }, []);

  const bringToFront = useCallback((id: string) => {
    setAvatars(prev => {
      const maxZ = prev.reduce((m, a) => Math.max(m, a.zIndex), 0);
      return prev.map(a => (a.id === id ? { ...a, zIndex: maxZ + 1 } : a));
    });
  }, []);

  const sendToBack = useCallback((id: string) => {
    setAvatars(prev => {
      const minZ = prev.reduce((m, a) => Math.min(m, a.zIndex), Infinity);
      return prev.map(a => (a.id === id ? { ...a, zIndex: minZ - 1 } : a));
    });
  }, []);

  const saveLayout = useCallback(() => {
    persistLayout(avatarsRef.current);
  }, []);

  const resetLayout = useCallback(() => {
    setAvatars(DEFAULT_AVATARS);
    setSelectedId(null);
  }, []);

  return {
    avatars,
    mode,
    selectedId,
    setMode,
    setSelectedId,
    addAvatar,
    updateAvatar,
    removeAvatar,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    saveLayout,
    resetLayout,
  };
}
