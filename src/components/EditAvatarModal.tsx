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
  const [textColor, setTextColor] = useState(avatar.textColor || '#ffffff');
  const [fontFamily, setFontFamily] = useState(avatar.fontFamily || 'Inter, sans-serif');
  const [glowColor, setGlowColor] = useState(avatar.glowColor || '#000000');
  const [showName, setShowName] = useState(avatar.showName !== false);

  // Sync when avatar changes (e.g. different avatar opened)
  useEffect(() => {
    setName(avatar.name);
    setIdleImage(avatar.idleImage);
    setTalkingImage(avatar.talkingImage);
    setSensitivity(avatar.sensitivity);
    setTextColor(avatar.textColor || '#ffffff');
    setFontFamily(avatar.fontFamily || 'Inter, sans-serif');
    setGlowColor(avatar.glowColor || '#000000');
    setShowName(avatar.showName !== false);
  }, [avatar.id, avatar.name, avatar.idleImage, avatar.talkingImage, avatar.sensitivity, avatar.textColor, avatar.fontFamily, avatar.glowColor, avatar.showName]);

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
    onSave(avatar.id, {
      name: name.trim(),
      idleImage,
      talkingImage,
      sensitivity,
      textColor,
      fontFamily,
      glowColor,
      showName,
    });
    onClose();
  };

  const COLOR_PRESETS = [
    '#ffffff', // White
    '#00f2fe', // Neon Cyan
    '#48bb78', // Emerald Green
    '#ecc94b', // Gold Yellow
    '#f687b3', // Vibrant Pink
    '#fc8181', // Coral Red
    '#9f7aea', // Purple
    '#ed8936', // Warm Orange
  ];

  const FONT_PRESETS = [
    { label: 'Clean Modern (Inter / Sans)', value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    { label: 'Bold Gamer (Impact)', value: 'Impact, "Arial Black", sans-serif' },
    { label: 'Rounded Friendly (Comic / Fredoka)', value: '"Fredoka One", "Comic Sans MS", cursive, sans-serif' },
    { label: 'Smooth Windows (Segoe UI)', value: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
    { label: 'Retro Terminal (Courier / Mono)', value: '"Courier New", Courier, monospace' },
    { label: 'Classic Editorial (Georgia)', value: 'Georgia, "Times New Roman", serif' },
  ];

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ margin: '0 0 14px', color: '#68d391', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>✏️</span> Edit Avatar: {avatar.name}
        </h3>

        {/* Name */}
        <label style={labelStyle}>Name</label>
        <input
          style={inputStyle}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        {/* Font Family */}
        <label style={labelStyle}>Font Style</label>
        <select
          value={fontFamily}
          onChange={e => setFontFamily(e.target.value)}
          style={{
            ...inputStyle,
            cursor: 'pointer',
            background: '#1a202c',
          }}
        >
          {FONT_PRESETS.map(f => (
            <option key={f.value} value={f.value} style={{ background: '#1a202c' }}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Text Color & Glow Color */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Text Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="color"
                value={textColor}
                onChange={e => setTextColor(e.target.value)}
                style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
              />
              <input
                type="text"
                value={textColor}
                onChange={e => setTextColor(e.target.value)}
                style={{ ...inputStyle, marginBottom: 0, padding: '4px 6px', fontSize: 12, flex: 1 }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Glow / Outline</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="color"
                value={glowColor}
                onChange={e => setGlowColor(e.target.value)}
                style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
              />
              <input
                type="text"
                value={glowColor}
                onChange={e => setGlowColor(e.target.value)}
                style={{ ...inputStyle, marginBottom: 0, padding: '4px 6px', fontSize: 12, flex: 1 }}
              />
            </div>
          </div>
        </div>

        {/* Quick Color Swatches */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#718096' }}>Swatches:</span>
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setTextColor(c)}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: c,
                border: textColor.toLowerCase() === c.toLowerCase() ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transform: textColor.toLowerCase() === c.toLowerCase() ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 0.1s',
              }}
              title={c}
            />
          ))}
        </div>

        {/* Name Tag Preview */}
        <div style={{
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: 9, color: '#718096', textTransform: 'uppercase', marginBottom: 4 }}>Name Tag Preview</span>
          <div style={{
            color: textColor,
            fontFamily,
            fontWeight: 'bold',
            fontSize: 16,
            textShadow: glowColor
              ? `0 0 10px ${glowColor}, 0 0 4px ${glowColor}, 0 2px 4px black, 0 0 8px black`
              : '0 2px 4px black, 0 0 8px black',
            letterSpacing: '0.5px',
          }}>
            {name || 'AVATAR'}
          </div>
        </div>

        {/* Toggle Show Name */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#e2e8f0', marginBottom: 14, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showName}
            onChange={e => setShowName(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: '#38a169', cursor: 'pointer' }}
          />
          <span>Show name label below avatar</span>
        </label>

        {/* Idle Image */}
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

        {/* Talking Image */}
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

        {/* Sensitivity */}
        <label style={labelStyle}>Sensitivity: {sensitivity}</label>
        <input
          type="range"
          min={1}
          max={30}
          value={sensitivity}
          onChange={e => setSensitivity(Number(e.target.value))}
          style={{ width: '100%', marginBottom: 16 }}
        />

        {/* Action Buttons */}
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
