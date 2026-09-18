import { useRef, useState } from 'react';
import type { AvatarConfig } from '../types/avatar';

interface AddAvatarModalProps {
  onAdd: (config: Omit<AvatarConfig, 'id' | 'zIndex'>) => void;
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

export function AddAvatarModal({ onAdd, onClose }: AddAvatarModalProps) {
  const [name, setName] = useState('');
  const [idleImage, setIdleImage] = useState('');
  const [talkingImage, setTalkingImage] = useState('');
  const [sensitivity, setSensitivity] = useState(7);
  const [idlePreview, setIdlePreview] = useState('');
  const [talkingPreview, setTalkingPreview] = useState('');
  const [error, setError] = useState('');

  const idleInputRef = useRef<HTMLInputElement>(null);
  const talkingInputRef = useRef<HTMLInputElement>(null);

  const handleIdleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    setIdleImage(dataUrl);
    setIdlePreview(dataUrl);
  };

  const handleTalkingFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    setTalkingImage(dataUrl);
    setTalkingPreview(dataUrl);
  };

  const handleSubmit = () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!idleImage) { setError('Idle image is required.'); return; }
    if (!talkingImage) { setError('Talking image is required.'); return; }

    onAdd({
      name: name.trim(),
      idleImage,
      talkingImage,
      x: 300,
      y: 150,
      width: 240,
      height: 240,
      rotation: 0,
      visible: true,
      sensitivity,
    });
    onClose();
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ margin: '0 0 16px', color: '#63b3ed' }}>➕ Add Avatar</h3>

        <label style={label}>Name</label>
        <input
          style={input}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. SOM"
          autoFocus
        />

        <label style={label}>Idle Image</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          {idlePreview && (
            <img src={idlePreview} alt="idle preview" style={thumb} />
          )}
          <button style={fileBtn} onClick={() => idleInputRef.current?.click()}>
            📂 Choose File
          </button>
          <input
            ref={idleInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleIdleFile}
          />
        </div>

        <label style={label}>Talking Image</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          {talkingPreview && (
            <img src={talkingPreview} alt="talking preview" style={thumb} />
          )}
          <button style={fileBtn} onClick={() => talkingInputRef.current?.click()}>
            📂 Choose File
          </button>
          <input
            ref={talkingInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleTalkingFile}
          />
        </div>

        <label style={label}>Sensitivity: {sensitivity}</label>
        <input
          type="range"
          min={1}
          max={30}
          value={sensitivity}
          onChange={e => setSensitivity(Number(e.target.value))}
          style={{ width: '100%', marginBottom: 12 }}
        />

        {error && <div style={{ color: '#fc8181', fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={cancelBtn} onClick={onClose}>Cancel</button>
          <button style={addBtn} onClick={handleSubmit}>Add Avatar</button>
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
  border: '1px solid rgba(99,179,237,0.3)',
  borderRadius: 14,
  padding: 24,
  width: 340,
  color: 'white',
  fontFamily: 'Arial, sans-serif',
  boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 'bold',
  color: '#a0aec0',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const input: React.CSSProperties = {
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
  width: 48,
  height: 48,
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

const addBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  color: 'white',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 'bold',
};
