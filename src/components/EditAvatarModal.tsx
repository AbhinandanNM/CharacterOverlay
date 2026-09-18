import { useEffect, useRef, useState } from 'react';
import type { AvatarConfig } from '../types/avatar';

interface EditAvatarModalProps {
  avatar: AvatarConfig;
  onSave: (id: string, patch: Partial<AvatarConfig>) => void;
  onClose: () => void;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function EditAvatarModal({ avatar, onSave, onClose }: EditAvatarModalProps) {
  const [name, setName] = useState(avatar.name);
  const [idleImage, setIdleImage] = useState(avatar.idleImage);
  const [talkingImage, setTalkingImage] = useState(avatar.talkingImage);
  const [sensitivity, setSensitivity] = useState(avatar.sensitivity);

  // Sync when avatar changes (e.g. different avatar opened)
  useEffect(() => {
    setName(avatar.name);
    setIdleImage(avatar.idleImage);
    setTalkingImage(avatar.talkingImage);
    setSensitivity(avatar.sensitivity);
  }, [avatar.id, avatar.name, avatar.idleImage, avatar.talkingImage, avatar.sensitivity]);

  const idleInputRef = useRef<HTMLInputElement>(null);
  const talkingInputRef = useRef<HTMLInputElement>(null);

  const handleIdleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    setIdleImage(dataUrl);
  };

  const handleTalkingFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    setTalkingImage(dataUrl);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(avatar.id, { name: name.trim(), idleImage, talkingImage, sensitivity });
    onClose();
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ margin: '0 0 16px', color: '#68d391' }}>✏️ Edit Avatar: {avatar.name}</h3>

        <label style={labelStyle}>Name</label>
        <input
          style={inputStyle}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <label style={labelStyle}>Idle Image</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <img src={idleImage} alt="idle" style={thumb} />
          <button style={fileBtn} onClick={() => idleInputRef.current?.click()}>
            🔄 Replace
          </button>
          <input
            ref={idleInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleIdleFile}
          />
        </div>

        <label style={labelStyle}>Talking Image</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <img src={talkingImage} alt="talking" style={thumb} />
          <button style={fileBtn} onClick={() => talkingInputRef.current?.click()}>
            🔄 Replace
          </button>
          <input
            ref={talkingInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleTalkingFile}
          />
        </div>

        <label style={labelStyle}>Sensitivity: {sensitivity}</label>
        <input
          type="range"
          min={1}
          max={30}
          value={sensitivity}
          onChange={e => setSensitivity(Number(e.target.value))}
          style={{ width: '100%', marginBottom: 16 }}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={cancelBtn} onClick={onClose}>Cancel</button>
          <button style={saveBtn} onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modal: React.CSSProperties = {
  background: 'rgba(20,20,35,0.98)',
  border: '1px solid rgba(104,211,145,0.3)',
  borderRadius: 14,
  padding: 24,
  width: 340,
  color: 'white',
  fontFamily: 'Arial, sans-serif',
  boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 'bold',
  color: '#a0aec0',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.07)',
  color: 'white',
  fontSize: 14,
  marginBottom: 12,
  boxSizing: 'border-box',
  outline: 'none',
};

const thumb: React.CSSProperties = {
  width: 64,
  height: 64,
  objectFit: 'contain',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
};

const fileBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.08)',
  color: 'white',
  cursor: 'pointer',
  fontSize: 12,
};

const cancelBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'transparent',
  color: '#a0aec0',
  cursor: 'pointer',
  fontSize: 13,
};

const saveBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: 'linear-gradient(135deg, #38a169, #2b6cb0)',
  color: 'white',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 'bold',
};
