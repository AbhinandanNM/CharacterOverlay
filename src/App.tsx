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
      store.avatars.forEach(avatar => {
        // If avatar has no voiceUserId assigned, local mic drives it
        if (!avatar.voiceUserId) {
          store.setSpeaking(avatar.id, average > avatar.sensitivity);
        }
      });
    },
    [store.avatars, store.setSpeaking]
  );

  const { volume, micStarted, startMicrophone } = useMicrophone(handleVolumeChange);

  // Unified Speaking Map: Evaluates Local Mic + Remote WS Voice User + Dev Test Mode
  const compositeSpeaking = useMemo(() => {
    const map: Record<string, boolean> = {};

    store.avatars.forEach(avatar => {
      // 1. Dev test mode simulation
      if (remote.devTestSpeaking[avatar.id]) {
        map[avatar.id] = true;
        return;
      }

      // 2. Remote WebSocket user assignment
      if (avatar.voiceUserId) {
        const key = avatar.voiceUserId.toLowerCase();
        const isRemoteActive = Boolean(
          remote.remoteSpeaking[key] || remote.remoteSpeaking[avatar.voiceUserId]
        );
        map[avatar.id] = isRemoteActive;
        return;
      }

      // 3. Local microphone (if no remote user is mapped)
      map[avatar.id] = Boolean(store.speaking[avatar.id]);
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
        />
      )}

      {/* Stream mode: No buttons or controls visible on overlay. Press 'E' or 'Escape' or 'F9' to toggle Edit mode */}
    </div>
  );
}

export default App;