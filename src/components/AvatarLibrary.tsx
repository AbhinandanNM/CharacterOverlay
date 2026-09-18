import type { AvatarConfig } from '../types/avatar';

interface AvatarLibraryProps {
  avatars: AvatarConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}

export function AvatarLibrary({
  avatars,
  selectedId,
  onSelect,
  onToggleVisible,
  onEdit,
  onRemove,
}: AvatarLibraryProps) {
  return (
    <div style={container}>
      {avatars.length === 0 && (
        <div style={{ color: '#718096', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
          No avatars yet. Add one below.
        </div>
      )}
      {avatars.map(avatar => (
        <div
          key={avatar.id}
          style={{
            ...row,
            background: selectedId === avatar.id
              ? 'rgba(99,179,237,0.15)'
              : 'rgba(255,255,255,0.04)',
            borderColor: selectedId === avatar.id
              ? 'rgba(99,179,237,0.5)'
              : 'rgba(255,255,255,0.07)',
          }}
          onClick={() => onSelect(avatar.id)}
        >
          {/* Thumbnail */}
          <img
            src={avatar.idleImage}
            alt={avatar.name}
            style={{
              width: 36,
              height: 36,
              objectFit: 'contain',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0,
            }}
          />

          {/* Name */}
          <span style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 'bold',
            color: avatar.visible ? 'white' : '#4a5568',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {avatar.name}
          </span>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <IconBtn
              title={avatar.visible ? 'Hide' : 'Show'}
              onClick={() => onToggleVisible(avatar.id)}
            >
              {avatar.visible ? '👁' : '🙈'}
            </IconBtn>
            <IconBtn title="Edit" onClick={() => onEdit(avatar.id)}>✏️</IconBtn>
            <IconBtn
              title="Delete"
              onClick={() => {
                if (confirm(`Delete "${avatar.name}"?`)) onRemove(avatar.id);
              }}
            >
              🗑️
            </IconBtn>
          </div>
        </div>
      ))}
    </div>
  );
}

function IconBtn({
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
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        padding: '2px 4px',
        borderRadius: 4,
        lineHeight: 1,
        opacity: 0.8,
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
    >
      {children}
    </button>
  );
}

const container: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  maxHeight: 180,
  overflowY: 'auto',
  marginBottom: 4,
};

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 6px',
  borderRadius: 8,
  border: '1px solid',
  cursor: 'pointer',
  transition: 'background 0.15s',
};
