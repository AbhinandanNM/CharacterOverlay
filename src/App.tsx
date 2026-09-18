import { useCallback, useEffect } from 'react';
import './App.css';
import { AvatarStage } from './components/AvatarStage';
import { ControlPanel } from './components/ControlPanel';
import { useAvatarStore } from './hooks/useAvatarStore';
import { useMicrophone } from './hooks/useMicrophone';

function App() {
  const store = useAvatarStore();

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

  // Drive the FIRST avatar's speaking state from the local microphone
  const handleVolumeChange = useCallback(
    (average: number) => {
      const firstAvatar = store.avatars[0];
      if (!firstAvatar) return;
      store.setSpeaking(firstAvatar.id, average > firstAvatar.sensitivity);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.avatars, store.setSpeaking]
  );

  const { volume, micStarted, startMicrophone } = useMicrophone(handleVolumeChange);

  return (
    <div className="app">
      {/* Transparent avatar canvas */}
      <AvatarStage
        avatars={store.avatars}
        speaking={store.speaking}
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

      {/* Stream mode: No buttons or controls visible on overlay. Press 'E' or 'Escape' to return to Edit mode */}
    </div>
  );
}

export default App;