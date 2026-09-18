import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { AvatarOverlay } from "./components/AvatarOverlay";
import { AvatarStage } from "./components/AvatarStage";
import { ControlPanel } from "./components/ControlPanel";
import { useAvatarStore } from "./hooks/useAvatarStore";
import { useMicrophone } from "./hooks/useMicrophone";
import { useRemoteVoice } from "./hooks/useRemoteVoice";

function isOverlayRoute(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("overlay") === "true" || window.location.hash.includes("overlay");
  } catch {
    return false;
  }
}

function App() {
  const isOverlay = isOverlayRoute();

  // If this is the dedicated OBS Overlay window, render AvatarOverlay directly
  if (isOverlay) {
    return <AvatarOverlay />;
  }

  return <EditorApp />;
}

function EditorApp() {
  const store = useAvatarStore();
  const remote = useRemoteVoice();

  const [localSpeaking, setLocalSpeaking] = useState(false);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel for real-time local tab/window sync
  useEffect(() => {
    const channel = new BroadcastChannel("reactive-avatars-sync");
    syncChannelRef.current = channel;

    channel.onmessage = (event) => {
      const data = event.data;
      if (data?.type === "REQUEST_INITIAL_STATE") {
        channel.postMessage({
          type: "AVATARS_UPDATE",
          avatars: store.avatars,
        });
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // Broadcast avatar layout updates to OBS overlay via WebSocket and BroadcastChannel
  useEffect(() => {
    syncChannelRef.current?.postMessage({
      type: "AVATARS_UPDATE",
      avatars: store.avatars,
    });
    remote.sendLayoutUpdate(store.avatars);
  }, [store.avatars, remote.sendLayoutUpdate]);

  // Global overlay toggle listeners
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.onToggleOverlayMode) {
      const unsubscribe = api.onToggleOverlayMode(() => {
        store.setMode(store.mode === "edit" ? "stream" : "edit");
      });
      return unsubscribe;
    }
  }, [store.mode, store.setMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "F9" || e.key === "Escape" || e.key === "e" || e.key === "E") {
        e.preventDefault();
        store.setMode(store.mode === "edit" ? "stream" : "edit");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store.mode, store.setMode]);

  const handleVolumeChange = useCallback(
    (average: number) => {
      const localAvatar = store.avatars.find(a => a.isLocalUser === true);
      if (localAvatar) {
        setLocalSpeaking(average > localAvatar.sensitivity);
      } else {
        setLocalSpeaking(false);
      }
    },
    [store.avatars]
  );

  const { volume, micStarted, startMicrophone } = useMicrophone(handleVolumeChange);

  const setLocalUser = useCallback(
    (avatarId: string | null) => {
      store.avatars.forEach(avatar => {
        const shouldBeLocal = avatar.id === avatarId;
        if (Boolean(avatar.isLocalUser) !== shouldBeLocal) {
          store.updateAvatar(avatar.id, { isLocalUser: shouldBeLocal });
        }
      });
      if (avatarId === null) setLocalSpeaking(false);
    },
    [store.avatars, store.updateAvatar]
  );

  // Broadcast local microphone speaking state to OBS overlay over WebSocket room
  useEffect(() => {
    const localAvatar = store.avatars.find(a => a.isLocalUser === true);
    const localName = localAvatar?.name || localAvatar?.id || "ANM";
    remote.sendLocalSpeaking(localName, localSpeaking);
  }, [localSpeaking, store.avatars, remote.sendLocalSpeaking]);

  const compositeSpeaking = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const avatar of store.avatars) {
      if (remote.devTestSpeaking[avatar.id] === true) {
        map[avatar.id] = true;
      } else if (avatar.isLocalUser === true) {
        map[avatar.id] = localSpeaking;
      } else if (avatar.voiceUserId) {
        const k = avatar.voiceUserId.toLowerCase();
        map[avatar.id] = Boolean(remote.remoteSpeaking[k] || remote.remoteSpeaking[avatar.voiceUserId]);
      } else {
        map[avatar.id] = false;
      }
    }
    return map;
  }, [store.avatars, localSpeaking, remote.remoteSpeaking, remote.devTestSpeaking]);

  // Broadcast speaking updates to OBS overlay in real time
  useEffect(() => {
    syncChannelRef.current?.postMessage({
      type: "SPEAKING_UPDATE",
      speaking: compositeSpeaking,
    });
  }, [compositeSpeaking]);

  return (
    <div className="app">
      <AvatarStage
        avatars={store.avatars}
        speaking={compositeSpeaking}
        selectedId={store.selectedId}
        mode={store.mode}
        onSelectAvatar={store.setSelectedId}
        onUpdateAvatar={store.updateAvatar}
        onDeselect={() => store.setSelectedId(null)}
      />
      {store.mode === "edit" && (
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
          remoteSpeaking={remote.remoteSpeaking}
          devTestSpeaking={remote.devTestSpeaking}
          debugInfo={remote.debugInfo}
          onSetServerUrl={remote.setServerUrl}
          onSetRoomId={remote.setRoomId}
          onConnectNetwork={remote.connect}
          onDisconnectNetwork={remote.disconnect}
          onToggleDevTest={remote.toggleDevTestSpeaking}
          onModeToggle={() => store.setMode(store.mode === "edit" ? "stream" : "edit")}
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
    </div>
  );
}

export default App;
