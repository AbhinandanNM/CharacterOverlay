import type { AvatarConfig, AppMode } from '../types/avatar';
import { AvatarItem } from './AvatarItem';

interface AvatarStageProps {
  avatars: AvatarConfig[];
  speaking: Record<string, boolean>;
  selectedId: string | null;
  mode: AppMode;
  onSelectAvatar: (id: string) => void;
  onUpdateAvatar: (id: string, patch: Partial<AvatarConfig>) => void;
  onDeselect: () => void;
}

export function AvatarStage({
  avatars,
  speaking,
  selectedId,
  mode,
  onSelectAvatar,
  onUpdateAvatar,
  onDeselect,
}: AvatarStageProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
      onClick={() => {
        if (mode === 'edit') onDeselect();
      }}
    >
      {avatars
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(avatar => (
          <AvatarItem
            key={avatar.id}
            avatar={avatar}
            speaking={speaking[avatar.id] ?? false}
            isSelected={selectedId === avatar.id}
            mode={mode}
            onSelect={onSelectAvatar}
            onUpdate={onUpdateAvatar}
          />
        ))}
    </div>
  );
}
