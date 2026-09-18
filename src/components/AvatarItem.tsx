import { useCallback, useRef, useState } from 'react';
import type { AvatarConfig, AppMode } from '../types/avatar';

interface AvatarItemProps {
  avatar: AvatarConfig;
  speaking: boolean;
  isSelected: boolean;
  mode: AppMode;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<AvatarConfig>) => void;
}

export function AvatarItem({
  avatar,
  speaking,
  isSelected,
  mode,
  onSelect,
  onUpdate,
}: AvatarItemProps) {
  const isEditing = mode === 'edit';

  // ── Drag ─────────────────────────────────────────────────────────────────
  const dragStart = useRef<{ mouseX: number; mouseY: number; ax: number; ay: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditing) return;
      e.stopPropagation();
      onSelect(avatar.id);

      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        ax: avatar.x,
        ay: avatar.y,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragStart.current) return;
        const dx = ev.clientX - dragStart.current.mouseX;
        const dy = ev.clientY - dragStart.current.mouseY;
        // Free positioning: allow dragging smoothly across the full window,
        // allowing parts of the avatar to extend beyond the stage/screen edges.
        onUpdate(avatar.id, {
          x: Math.round(dragStart.current.ax + dx),
          y: Math.round(dragStart.current.ay + dy),
        });
      };

      const onUp = () => {
        dragStart.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [avatar.id, avatar.x, avatar.y, isEditing, onSelect, onUpdate]
  );

  // ── Resize handle ────────────────────────────────────────────────────────
  const resizeStart = useRef<{
    mouseX: number;
    mouseY: number;
    aw: number;
    ah: number;
  } | null>(null);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      resizeStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        aw: avatar.width,
        ah: avatar.height,
      };

      const onMove = (ev: MouseEvent) => {
        if (!resizeStart.current) return;
        const dx = ev.clientX - resizeStart.current.mouseX;
        const dy = ev.clientY - resizeStart.current.mouseY;
        const aspect = resizeStart.current.aw / resizeStart.current.ah;
        // Maintain aspect ratio: drive by larger delta
        const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        const newW = Math.max(60, resizeStart.current.aw + delta);
        const newH = Math.max(60, newW / aspect);
        onUpdate(avatar.id, { width: Math.round(newW), height: Math.round(newH) });
      };

      const onUp = () => {
        resizeStart.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [avatar.id, avatar.width, avatar.height, onUpdate]
  );

  // ── Image src ────────────────────────────────────────────────────────────
  const imageSrc = speaking ? avatar.talkingImage : avatar.idleImage;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: avatar.x,
    top: avatar.y,
    width: avatar.width,
    height: avatar.height,
    zIndex: avatar.visible ? avatar.zIndex : -1,
    opacity: avatar.visible ? 1 : 0,
    pointerEvents: isEditing && avatar.visible ? 'auto' : 'none',
    transform: `rotate(${avatar.rotation}deg)`,
    transformOrigin: 'center center',
    cursor: isEditing ? 'move' : 'default',
    userSelect: 'none',
    boxSizing: 'border-box',
    // Selection border
    outline: isSelected && isEditing
      ? '2px dashed rgba(99,179,237,0.9)'
      : 'none',
    outlineOffset: '2px',
  };

  // Talking bounce animation via inline style
  const [bounce] = useState(false);
  void bounce;

  return (
    <div
      style={containerStyle}
      onMouseDown={handleMouseDown}
    >
      <img
        src={imageSrc}
        alt={avatar.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          userSelect: 'none',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
          animation: speaking ? 'avatarTalking 0.3s infinite alternate ease-in-out' : 'none',
          display: 'block',
        }}
        draggable={false}
      />

      {/* Name label */}
      <div
        style={{
          position: 'absolute',
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontWeight: 'bold',
          fontSize: Math.max(12, avatar.width * 0.08),
          textShadow: '0 2px 4px black, 0 0 8px black',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {avatar.name}
      </div>

      {/* Resize handle (bottom-right corner) — edit mode only, selected */}
      {isEditing && isSelected && (
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            bottom: -6,
            right: -6,
            width: 14,
            height: 14,
            background: '#63b3ed',
            border: '2px solid white',
            borderRadius: 3,
            cursor: 'se-resize',
            zIndex: 999,
          }}
        />
      )}
    </div>
  );
}
