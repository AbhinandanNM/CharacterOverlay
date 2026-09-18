import { useState } from 'react';
import type { AppMode, AvatarConfig } from '../types/avatar';
import type { RemoteVoiceDebugInfo } from '../hooks/useRemoteVoice';
import { AvatarLibrary } from './AvatarLibrary';
import { AddAvatarModal } from './AddAvatarModal';
import { EditAvatarModal } from './EditAvatarModal';

interface ControlPanelProps {
  avatars: AvatarConfig[];
  selectedId: string | null;
  mode: AppMode;
  volume: number;
  micStarted: boolean;
  // Network voice props
  connected: boolean;
  statusText: string;
  serverUrl: string;
  roomId: string;
  roomUsers: import('../types/avatar').RoomUser[];
  remoteSpeaking: Record<string, boolean>;
  devTestSpeaking: Record<string, boolean>;
  debugInfo?: RemoteVoiceDebugInfo;
  isObsOverlayOpen?: boolean;
  onOpenObsOverlay?: () => void;
  onCloseObsOverlay?: () => void;
  onSetServerUrl: (url: string) => void;
  onSetRoomId: (id: string) => void;
  onConnectNetwork: () => void;
  onDisconnectNetwork: () => void;
  onToggleDevTest: (avatarId: string) => void;
  // Actions
  onModeToggle: () => void;
  onSelectAvatar: (id: string | null) => void;
  onAddAvatar: (config: Omit<AvatarConfig, 'id' | 'zIndex'>) => void;
  onUpdateAvatar: (id: string, patch: Partial<AvatarConfig>) => void;
  onRemoveAvatar: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onSaveLayout: () => void;
  onResetLayout: () => void;
  onStartMicrophone: () => Promise<void>;
  onSetLocalUser: (avatarId: string | null) => void;
}

export function ControlPanel({
  avatars,
  selectedId,
  mode,
  volume,
  micStarted,
  connected,
  statusText,
  serverUrl,
  roomId,
  roomUsers,
  remoteSpeaking,
  devTestSpeaking,
  debugInfo,
  isObsOverlayOpen,
  onOpenObsOverlay,
  onCloseObsOverlay,
  onSetServerUrl,
  onSetRoomId,
  onConnectNetwork,
  onDisconnectNetwork,
  onToggleDevTest,
  onModeToggle,
  onSelectAvatar,
  onAddAvatar,
  onUpdateAvatar,
  onRemoveAvatar,
  onToggleVisible,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onSaveLayout,
  onResetLayout,
  onStartMicrophone,
  onSetLocalUser,
}: ControlPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panelPos, setPanelPos] = useState({ x: 20, y: 20 });
  const [showNetworkSettings, setShowNetworkSettings] = useState(false);
  const [showNetworkDebug, setShowNetworkDebug] = useState(true);

  const selectedAvatar = avatars.find(a => a.id === selectedId) ?? null;
  const editingAvatar = avatars.find(a => a.id === editingId) ?? null;

  const isEdit = mode === 'edit';

  // ── Dragging the Control Panel ───────────────────────────────────
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialPos = { ...panelPos };

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setPanelPos({
        x: Math.max(0, initialPos.x + dx),
        y: Math.max(0, initialPos.y + dy),
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <>
      <div style={{ ...panelStyle, left: panelPos.x, top: panelPos.y }}>
        {/* ── Header (Draggable Handle) ───────────────────────── */}
        <div style={header} onMouseDown={handleHeaderMouseDown}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'grab' }}>
            <span style={{ fontSize: 13, color: '#718096' }}>⠿</span>
            <span style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: 1 }}>
              🎮 OVERLAY
            </span>
          </div>
          <button
            onClick={onModeToggle}
            style={{
              ...modeBtn,
              background: isEdit
                ? 'linear-gradient(135deg,#3b82f6,#6366f1)'
                : 'linear-gradient(135deg,#38a169,#2f855a)',
            }}
          >
            {isEdit ? '✏️ EDIT' : '▶ STREAM'}
          </button>
        </div>

        {/* ── Dedicated OBS Overlay Trigger ───────────────────── */}
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={isObsOverlayOpen ? onCloseObsOverlay : onOpenObsOverlay}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: isObsOverlayOpen
                ? '1px solid rgba(239,68,68,0.4)'
                : '1px solid rgba(99,179,237,0.4)',
              background: isObsOverlayOpen
                ? 'rgba(239,68,68,0.15)'
                : 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25))',
              color: isObsOverlayOpen ? '#fc8181' : '#90cdf4',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <span>{isObsOverlayOpen ? '❌' : '🎬'}</span>
            <span>{isObsOverlayOpen ? 'CLOSE OBS OVERLAY' : 'OPEN OBS OVERLAY'}</span>
            {isObsOverlayOpen && (
              <span style={{ fontSize: 9, background: '#38a169', color: 'white', padding: '1px 5px', borderRadius: 10 }}>
                ACTIVE
              </span>
            )}
          </button>
        </div>

        <Divider />

        {/* ── Voice Network (Internet Sync) ───────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <SectionLabel>🌐 VOICE NETWORK</SectionLabel>
          <button
            onClick={() => setShowNetworkSettings(!showNetworkSettings)}
            style={{ background: 'transparent', border: 'none', color: '#63b3ed', fontSize: 11, cursor: 'pointer' }}
          >
            {showNetworkSettings ? '▲ Hide' : '⚙️ Setup'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected ? '#48bb78' : '#e53e3e',
              boxShadow: connected ? '0 0 6px #48bb78' : 'none'
            }} />
            <span style={{ color: connected ? '#68d391' : '#a0aec0', fontWeight: 'bold', fontSize: 11 }}>
              {statusText}
            </span>
          </div>
          <button
            onClick={connected ? onDisconnectNetwork : onConnectNetwork}
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              border: 'none',
              fontSize: 11,
              fontWeight: 'bold',
              cursor: 'pointer',
              background: connected ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
              color: connected ? '#fc8181' : 'white',
            }}
          >
            {connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>

        {showNetworkSettings && (
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: 8, marginBottom: 8 }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: '#a0aec0', display: 'block', marginBottom: 2 }}>Server URL</span>
              <input
                type="text"
                value={serverUrl}
                onChange={e => onSetServerUrl(e.target.value)}
                placeholder="ws://localhost:8080"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  color: 'white',
                  padding: '4px 6px',
                  fontSize: 11,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: '#a0aec0', display: 'block', marginBottom: 2 }}>Room ID</span>
              <input
                type="text"
                value={roomId}
                onChange={e => onSetRoomId(e.target.value)}
                placeholder="ANTIC-STREAM-01"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  color: 'white',
                  padding: '4px 6px',
                  fontSize: 11,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}

        {/* Connected Room Users List */}
        {connected && roomUsers.length > 0 && (
          <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {roomUsers.map((u, i) => (
              <span
                key={i}
                style={{
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  background: u.role === 'overlay' ? 'rgba(99,179,237,0.2)' : 'rgba(72,187,120,0.2)',
                  color: u.role === 'overlay' ? '#63b3ed' : '#68d391',
                  border: `1px solid ${u.role === 'overlay' ? 'rgba(99,179,237,0.3)' : 'rgba(72,187,120,0.3)'}`,
                }}
              >
                {u.role === 'overlay' ? '🖥️ Host' : `🎙️ ${u.userId}`}
              </span>
            ))}
          </div>
        )}

        {/* ── Network Debug Panel ───────────────────────────── */}
        <div style={{ marginTop: 6, marginBottom: 8 }}>
          <div
            onClick={() => setShowNetworkDebug(!showNetworkDebug)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '3px 0',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 'bold', color: '#63b3ed', letterSpacing: 1 }}>
              🌐 NETWORK DEBUG
            </span>
            <span style={{ fontSize: 10, color: '#718096' }}>
              {showNetworkDebug ? '▼' : '▶'}
            </span>
          </div>

          {showNetworkDebug && (
            <div style={{
              background: '#0a0d17',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 10,
              fontFamily: 'monospace',
              color: '#cbd5e0',
              lineHeight: 1.5,
              marginTop: 4,
            }}>
              <div><strong style={{ color: '#718096' }}>Status: </strong><span style={{ color: connected ? '#68d391' : '#fc8181', fontWeight: 'bold' }}>{connected ? 'CONNECTED' : 'DISCONNECTED'}</span></div>
              <div><strong style={{ color: '#718096' }}>Room: </strong><span>{roomId || '-'}</span></div>
              <div>
                <strong style={{ color: '#718096' }}>Users: </strong>
                <span>{roomUsers.length ? roomUsers.map(u => u.userId).join(', ') : 'None'}</span>
              </div>
              <div>
                <strong style={{ color: '#718096' }}>Remote Map: </strong>
                <span>
                  {Object.keys(remoteSpeaking).length === 0
                    ? 'None'
                    : Object.entries(remoteSpeaking)
                        .filter(([k]) => k === k.toUpperCase()) // show unique normalized
                        .map(([k, v]) => `${k} → ${v ? 'TALKING' : 'idle'}`)
                        .join(', ')}
                </span>
              </div>
              <div>
                <strong style={{ color: '#718096' }}>Last Voice: </strong>
                <span>
                  {debugInfo?.lastRemoteVoiceEvent
                    ? `${debugInfo.lastRemoteVoiceEvent.userId} = ${debugInfo.lastRemoteVoiceEvent.speaking} (${debugInfo.lastRemoteVoiceEvent.time})`
                    : 'None yet'}
                </span>
              </div>
              <div>
                <strong style={{ color: '#718096' }}>Last WS Msg: </strong>
                <span>{debugInfo?.lastMessage || '-'}</span>
              </div>
              <div>
                <strong style={{ color: '#718096' }}>WS State: </strong>
                <span>
                  {debugInfo?.readyState === 1 ? '1 OPEN' : debugInfo?.readyState === 0 ? '0 CONNECTING' : '3 CLOSED'}
                </span>
              </div>
              {debugInfo?.lastCloseCode !== null && debugInfo?.lastCloseCode !== undefined && (
                <div>
                  <strong style={{ color: '#718096' }}>Last Disconnect: </strong>
                  <span style={{ color: '#fc8181' }}>
                    {debugInfo.lastCloseCode} {debugInfo.lastCloseReason ? `(${debugInfo.lastCloseReason})` : ''}
                  </span>
                </div>
              )}
              <div>
                <strong style={{ color: '#718096' }}>Reconnects: </strong>
                <span>{debugInfo?.reconnectAttempts || 0}</span>
              </div>

              {/* Pipeline Status */}
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: '#a0aec0', fontWeight: 'bold', marginBottom: 2 }}>REMOTE PIPELINE:</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', fontSize: 9 }}>
                  <span style={{ padding: '1px 4px', borderRadius: 3, background: 'rgba(72,187,120,0.15)', color: '#68d391' }}>MIC ✅</span>
                  <span style={{ padding: '1px 4px', borderRadius: 3, background: 'rgba(72,187,120,0.15)', color: '#68d391' }}>VAD ✅</span>
                  <span style={{ padding: '1px 4px', borderRadius: 3, background: 'rgba(72,187,120,0.15)', color: '#68d391' }}>WS SEND ✅</span>
                  <span style={{ padding: '1px 4px', borderRadius: 3, background: debugInfo?.pipeline.server ? 'rgba(72,187,120,0.15)' : 'rgba(237,137,54,0.15)', color: debugInfo?.pipeline.server ? '#68d391' : '#f6ad55' }}>
                    SERVER {debugInfo?.pipeline.server ? '✅' : '❓'}
                  </span>
                  <span style={{ padding: '1px 4px', borderRadius: 3, background: debugInfo?.pipeline.wsRecv ? 'rgba(72,187,120,0.15)' : 'rgba(237,137,54,0.15)', color: debugInfo?.pipeline.wsRecv ? '#68d391' : '#f6ad55' }}>
                    WS RECV {debugInfo?.pipeline.wsRecv ? '✅' : '❓'}
                  </span>
                  <span style={{ padding: '1px 4px', borderRadius: 3, background: debugInfo?.pipeline.overlay ? 'rgba(72,187,120,0.15)' : 'rgba(237,137,54,0.15)', color: debugInfo?.pipeline.overlay ? '#68d391' : 'rgba(255,255,255,0.4)' }}>
                    OVERLAY {debugInfo?.pipeline.overlay ? '✅' : '❓'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Divider />

        {/* ── Avatar Library ─────────────────────────────────── */}
        <SectionLabel>AVATARS ({avatars.length})</SectionLabel>
        <AvatarLibrary
          avatars={avatars}
          selectedId={selectedId}
          onSelect={id => onSelectAvatar(id === selectedId ? null : id)}
          onToggleVisible={onToggleVisible}
          onEdit={id => setEditingId(id)}
          onRemove={onRemoveAvatar}
        />

        {isEdit && (
          <button style={addBtn} onClick={() => setShowAddModal(true)}>
            ＋ Add Avatar
          </button>
        )}

        <Divider />

        {/* ── Selected Avatar Inspector ───────────────────────── */}
        {selectedAvatar && isEdit ? (
          <>
            <SectionLabel>SELECTED: {selectedAvatar.name}</SectionLabel>

            {/* Voice Assignment */}
            <InspectorRow label="Voice">
              <select
                value={
                  selectedAvatar.isLocalUser
                    ? '__local__'
                    : selectedAvatar.voiceUserId || ''
                }
                onChange={e => {
                  const val = e.target.value;
                  if (val === '__local__') {
                    // Mark as local user, clear any remote assignment
                    onSetLocalUser(selectedAvatar.id);
                    onUpdateAvatar(selectedAvatar.id, { voiceUserId: undefined });
                  } else if (val === '') {
                    // No assignment — clear both
                    onSetLocalUser(null);
                    onUpdateAvatar(selectedAvatar.id, { voiceUserId: undefined, isLocalUser: false });
                  } else {
                    // Assign to a remote voice user, clear local flag
                    onUpdateAvatar(selectedAvatar.id, { voiceUserId: val, isLocalUser: false });
                    // If this avatar was previously the local user, deassign it
                    if (selectedAvatar.isLocalUser) onSetLocalUser(null);
                  }
                }}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.07)',
                  border: selectedAvatar.isLocalUser
                    ? '1px solid rgba(72,187,120,0.5)'
                    : selectedAvatar.voiceUserId
                    ? '1px solid rgba(99,179,237,0.4)'
                    : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  color: 'white',
                  padding: '3px 6px',
                  fontSize: 11,
                  outline: 'none',
                }}
              >
                <option value="" style={{ background: '#141423' }}>[ Unassigned ]</option>
                <option value="__local__" style={{ background: '#141423' }}>🎤 Local Mic (This Machine)</option>
                {/* Dynamically list connected companions */}
                {roomUsers
                  .filter(u => u.role !== 'overlay')
                  .map(u => (
                    <option key={u.userId} value={u.userId} style={{ background: '#141423' }}>
                      🟢 {u.userId} (Connected)
                    </option>
                  ))}
                {/* Always provide default presets if not in connected list */}
                {['ANM', 'SOM', 'ATHARV']
                  .filter(preset => !roomUsers.some(u => u.userId.toUpperCase() === preset))
                  .map(preset => (
                    <option key={preset} value={preset} style={{ background: '#141423' }}>
                      🎙️ {preset}
                    </option>
                  ))}
              </select>
            </InspectorRow>

            <InspectorRow label="X">
              <NumericInput
                value={selectedAvatar.x}
                onChange={v => onUpdateAvatar(selectedAvatar.id, { x: v })}
              />
            </InspectorRow>
            <InspectorRow label="Y">
              <NumericInput
                value={selectedAvatar.y}
                onChange={v => onUpdateAvatar(selectedAvatar.id, { y: v })}
              />
            </InspectorRow>
            <InspectorRow label="W">
              <NumericInput
                value={selectedAvatar.width}
                onChange={v => onUpdateAvatar(selectedAvatar.id, { width: v })}
              />
            </InspectorRow>
            <InspectorRow label="H">
              <NumericInput
                value={selectedAvatar.height}
                onChange={v => onUpdateAvatar(selectedAvatar.id, { height: v })}
              />
            </InspectorRow>

            <InspectorRow label={`Rot ${selectedAvatar.rotation}°`}>
              <input
                type="range"
                min={-180}
                max={180}
                value={selectedAvatar.rotation}
                style={{ flex: 1, accentColor: '#63b3ed' }}
                onChange={e =>
                  onUpdateAvatar(selectedAvatar.id, { rotation: Number(e.target.value) })
                }
              />
            </InspectorRow>

            <InspectorRow label={`Sens ${selectedAvatar.sensitivity}`}>
              <input
                type="range"
                min={1}
                max={30}
                value={selectedAvatar.sensitivity}
                style={{ flex: 1, accentColor: '#68d391' }}
                onChange={e =>
                  onUpdateAvatar(selectedAvatar.id, { sensitivity: Number(e.target.value) })
                }
              />
            </InspectorRow>

            {/* Quick Position Helpers */}
            <div style={{ display: 'flex', gap: 4, marginTop: 6, marginBottom: 6 }}>
              <SmallBtn
                onClick={() => onUpdateAvatar(selectedAvatar.id, { x: 380, y: 150 })}
                title="Center on overlay canvas"
              >
                🎯 Center
              </SmallBtn>
              <SmallBtn
                onClick={() => onUpdateAvatar(selectedAvatar.id, { x: 100, y: 180, width: 240, height: 240, rotation: 0 })}
                title="Reset this character's transform"
              >
                ↺ Reset Pos
              </SmallBtn>
            </div>

            {/* Layer controls */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              <SmallBtn onClick={() => onBringToFront(selectedAvatar.id)} title="Bring to Front">⬆⬆</SmallBtn>
              <SmallBtn onClick={() => onBringForward(selectedAvatar.id)} title="Bring Forward">⬆</SmallBtn>
              <SmallBtn onClick={() => onSendBackward(selectedAvatar.id)} title="Send Backward">⬇</SmallBtn>
              <SmallBtn onClick={() => onSendToBack(selectedAvatar.id)} title="Send to Back">⬇⬇</SmallBtn>
            </div>

            <Divider />
          </>
        ) : isEdit ? (
          <div style={{ color: '#4a5568', fontSize: 11, textAlign: 'center', padding: '4px 0' }}>
            Click an avatar on stage to select it
          </div>
        ) : null}

        {/* ── Remote Voice Developer Test ────────────────────── */}
        <SectionLabel>🧪 DEVELOPER TEST MODE</SectionLabel>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {avatars.map(avatar => {
            const isTestTalking = Boolean(devTestSpeaking[avatar.id]);
            return (
              <button
                key={avatar.id}
                onClick={() => onToggleDevTest(avatar.id)}
                style={{
                  flex: 1,
                  padding: '5px 4px',
                  borderRadius: 6,
                  border: isTestTalking ? '1px solid #48bb78' : '1px solid rgba(255,255,255,0.15)',
                  background: isTestTalking ? 'rgba(72,187,120,0.25)' : 'rgba(255,255,255,0.05)',
                  color: isTestTalking ? '#68d391' : 'white',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 'bold',
                }}
              >
                {avatar.name} {isTestTalking ? '🗣️ TALK' : '⚪ IDLE'}
              </button>
            );
          })}
        </div>

        <Divider />

        {/* ── Local Microphone ────────────────────────────────── */}
        <SectionLabel>LOCAL MICROPHONE</SectionLabel>
        {!micStarted ? (
          <button style={micBtn} onClick={onStartMicrophone}>
            🎙️ Start Local Microphone
          </button>
        ) : (
          <div style={micRow}>
            <span>🎙️</span>
            <div style={micBarOuter}>
              <div
                style={{
                  ...micBarInner,
                  width: `${Math.min(100, (volume / 30) * 100)}%`,
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: '#a0aec0', minWidth: 24 }}>{volume}</span>
          </div>
        )}

        <Divider />

        {/* ── Save / Reset ───────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={saveBtn} onClick={onSaveLayout}>💾 Save</button>
          <button
            style={resetBtn}
            onClick={() => { if (confirm('Reset layout to defaults?')) onResetLayout(); }}
          >
            ↺ Reset
          </button>
        </div>

        <div style={{ fontSize: 10, color: '#718096', textAlign: 'center', marginTop: 8, lineHeight: 1.4 }}>
          <div><b style={{ color: '#63b3ed' }}>F9</b> = Toggle Editor Overlay</div>
          <div><b style={{ color: '#68d391' }}>F8</b> = Toggle Click-through</div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {showAddModal && (
        <AddAvatarModal
          onAdd={onAddAvatar}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {editingAvatar && (
        <EditAvatarModal
          avatar={editingAvatar}
          onSave={onUpdateAvatar}
          onClose={() => setEditingId(null)}
        />
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 'bold',
      color: '#4a5568',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div style={{
      height: 1,
      background: 'rgba(255,255,255,0.08)',
      margin: '10px 0',
    }} />
  );
}

function InspectorRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: '#718096', width: 40, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}

function NumericInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={Number.isNaN(value) ? '' : value}
      onChange={e => {
        const val = e.target.value === '' ? 0 : Number(e.target.value);
        if (!Number.isNaN(val)) {
          onChange(val);
        }
      }}
      style={{
        flex: 1,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 6,
        color: 'white',
        padding: '3px 6px',
        fontSize: 12,
        outline: 'none',
        width: '100%',
      }}
    />
  );
}

function SmallBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        flex: 1,
        padding: '4px 0',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.07)',
        color: 'white',
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const panelStyle: React.CSSProperties = {
  position: 'absolute',
  left: 14,
  top: 14,
  width: 260,
  padding: '14px 14px',
  borderRadius: 14,
  background: 'rgba(13,13,25,0.95)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.09)',
  color: 'white',
  fontFamily: 'Arial, sans-serif',
  zIndex: 1000,
  boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
  maxHeight: 'calc(100vh - 28px)',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

const header: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
};

const modeBtn: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: 8,
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 'bold',
  letterSpacing: 0.5,
};

const addBtn: React.CSSProperties = {
  width: '100%',
  padding: '7px 0',
  borderRadius: 8,
  border: '1px dashed rgba(99,179,237,0.4)',
  background: 'rgba(99,179,237,0.07)',
  color: '#63b3ed',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 'bold',
  marginTop: 6,
  transition: 'background 0.15s',
};

const micBtn: React.CSSProperties = {
  width: '100%',
  padding: '7px 0',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.07)',
  color: 'white',
  cursor: 'pointer',
  fontSize: 12,
};

const micRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const micBarOuter: React.CSSProperties = {
  flex: 1,
  height: 6,
  borderRadius: 3,
  background: 'rgba(255,255,255,0.1)',
  overflow: 'hidden',
};

const micBarInner: React.CSSProperties = {
  height: '100%',
  borderRadius: 3,
  background: 'linear-gradient(90deg,#38a169,#68d391)',
  transition: 'width 0.08s linear',
};

const saveBtn: React.CSSProperties = {
  flex: 1,
  padding: '7px 0',
  borderRadius: 8,
  border: 'none',
  background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
  color: 'white',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 'bold',
};

const resetBtn: React.CSSProperties = {
  flex: 1,
  padding: '7px 0',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.05)',
  color: '#a0aec0',
  cursor: 'pointer',
  fontSize: 12,
};
