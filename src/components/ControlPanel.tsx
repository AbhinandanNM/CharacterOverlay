import { useState } from 'react';
import type { AppMode, AvatarConfig } from '../types/avatar';
import { AvatarLibrary } from './AvatarLibrary';
import { AddAvatarModal } from './AddAvatarModal';
import { EditAvatarModal } from './EditAvatarModal';

interface ControlPanelProps {
  avatars: AvatarConfig[];
  selectedId: string | null;
  mode: AppMode;
  volume: number;
  micStarted: boolean;
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
}

export function ControlPanel({
  avatars,
  selectedId,
  mode,
  volume,
  micStarted,
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
}: ControlPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panelPos, setPanelPos] = useState({ x: 20, y: 20 });

  const selectedAvatar = avatars.find(a => a.id === selectedId) ?? null;
  const editingAvatar = avatars.find(a => a.id === editingId) ?? null;

  const isEdit = mode === 'edit';

  // ── Dragging the Control Panel ───────────────────────────────────
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicking header background or title, not buttons/inputs
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
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

        {/* ── Microphone ─────────────────────────────────────── */}
        <SectionLabel>MICROPHONE</SectionLabel>
        {!micStarted ? (
          <button style={micBtn} onClick={onStartMicrophone}>
            🎙️ Start Microphone
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
