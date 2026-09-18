import { useCallback, useEffect, useMemo } from 'react';
import './App.css';
import { AvatarStage } from './components/AvatarStage';
import { ControlPanel } from './components/ControlPanel';
import { useAvatarStore } from './hooks/useAvatarStore';
import { useMicrophone } from './hooks/useMicrophone';
import { useRemoteVoice } from './hooks/useRemoteVoice';

function App() {
  const store = useAvatarStore();
  const remote = useRemoteVoice();

  // Listen for global F9 hotkey from Electron (works even when overlay does not have focus)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI;
    if (api?.onToggleOverlayMode) {
      const unsubscribe = api.onToggleOverlayMode(() => {
        store.setMode(store.mode === 'edit' ? 'stream' : 'edit');
      });
      return unsubscribe;
    }
  }, [store.mode, store.setMode]);

  // Also support keyboard shortcuts (F9, Escape, E) when window is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'F9' || e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        store.setMode(store.mode === 'edit' ? 'stream' : 'edit');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store.mode, store.setMode]);

  const handleVolumeChange = useCallback(
    (average: number) => {
      // Find the avatar explicitly designated as the local user
      const localAvatar = store.avatars.find(a => a.isLocalUser);

      if (localAvatar) {
        // Precisely targeted: only drive the local avatar
        store.setSpeaking(localAvatar.id, average > localAvatar.sensitivity);
      } else {
        // Fallback (no local user set): drive all avatars without a voiceUserId
        // This preserves the original behavior for setups that haven’t configured voice assignment yet
        store.avatars.forEach(avatar => {
          if (!avatar.voiceUserId) {
            store.setSpeaking(avatar.id, average > avatar.sensitivity);
          }
        });
      }
    },
    [store.avatars, store.setSpeaking]
  );

  const { volume, micStarted, startMicrophone } = useMicrophone(handleVolumeChange);

  // Set which avatar is the local user (mutual exclusivity enforced)
  const setLocalUser = useCallback(
    (avatarId: string | null) => {
      store.avatars.forEach(avatar => {
        const shouldBeLocal = avatar.id === avatarId;
        if (avatar.isLocalUser !== shouldBeLocal) {
          store.updateAvatar(avatar.id, { isLocalUser: shouldBeLocal });
        }
      });
    },
    [store.avatars, store.updateAvatar]
  );

  // Unified Speaking Map: Evaluates Local Mic + Remote WS Voice User + Dev Test Mode
  const compositeSpeaking = useMemo(() => {
    const map: Record<string, boolean> = {};

    // Is there at least one avatar explicitly designated as the local user?
    const hasLocalUserDesignated = store.avatars.some(a => a.isLocalUser);

    store.avatars.forEach(avatar => {
      // 1. Dev test mode simulation — always wins if active
      if (remote.devTestSpeaking[avatar.id]) {
        map[avatar.id] = true;
        return;
      }

      // 2. Local avatar (isLocalUser flag) — driven by local microphone
      if (avatar.isLocalUser) {
        map[avatar.id] = Boolean(store.speaking[avatar.id]);
        return;
      }

      // 3. Remote WebSocket user assignment — driven by matching voiceUserId
      if (avatar.voiceUserId) {
        const key = avatar.voiceUserId.toLowerCase();
        const isRemoteActive = Boolean(
          remote.remoteSpeaking[key] || remote.remoteSpeaking[avatar.voiceUserId]
        );
        map[avatar.id] = isRemoteActive;
        return;
      }

      // 4. Fallback: if NO avatar has isLocalUser set, all unassigned avatars react to local mic
      //    This preserves out-of-the-box behavior before voice assignment is configured.
      if (!hasLocalUserDesignated) {
        map[avatar.id] = Boolean(store.speaking[avatar.id]);
        return;
      }

      // 5. Avatar has no local or remote assignment — stays silent
      map[avatar.id] = false;
    });

    return map;
  }, [store.avatars, store.speaking, remote.remoteSpeaking, remote.devTestSpeaking]);

  return (
    <div className="app">
      {/* Transparent avatar canvas */}
      <AvatarStage
        avatars={store.avatars}
        speaking={compositeSpeaking}
        selectedId={store.selectedId}
        mode={store.mode}
        onSelectAvatar={store.setSelectedId}
        onUpdateAvatar={store.updateAvatar}
        onDeselect={() => store.setSelectedId(null)}
      />

      {/* Control panel — hidden in stream mode */}
      {store.mode === 'edit' && (
        <ControlPanel
          avatars={store.avatars}
          selectedId={store.selectedId}
          mode={store.mode}
          volume={volume}
          micStarted={micStarted}
          connected={remote.connected}
          statusText={remote.statusText}
          serverUrl={remote.serverUrl}
          roomId={remote.roomId}
          roomUsers={remote.roomUsers}
          devTestSpeaking={remote.devTestSpeaking}
          onSetServerUrl={remote.setServerUrl}
          onSetRoomId={remote.setRoomId}
          onConnectNetwork={remote.connect}
          onDisconnectNetwork={remote.disconnect}
          onToggleDevTest={remote.toggleDevTestSpeaking}
          onModeToggle={() => store.setMode(store.mode === 'edit' ? 'stream' : 'edit')}
          onSelectAvatar={store.setSelectedId}
          onAddAvatar={store.addAvatar}
          onUpdateAvatar={store.updateAvatar}
          onRemoveAvatar={store.removeAvatar}
          onToggleVisible={id => store.updateAvatar(id, { visible: !store.avatars.find(a => a.id === id)?.visible })}
          onBringForward={store.bringForward}
          onSendBackward={store.sendBackward}
          onBringToFront={store.bringToFront}
          onSendToBack={store.sendToBack}
          onSaveLayout={store.saveLayout}
          onResetLayout={store.resetLayout}
          onStartMicrophone={startMicrophone}
          onSetLocalUser={setLocalUser}
        />
      )}

      {/* Stream mode: No buttons or controls visible on overlay. Press 'E' or 'Escape' or 'F9' to toggle Edit mode */}
    </div>
  );
}

export default App;