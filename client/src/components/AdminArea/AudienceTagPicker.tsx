import { FormEvent, useState } from 'react';
import { AudienceTag } from '../../Services/adminService';
import './AudienceTagPicker.css';

type Props = {
  tags: AudienceTag[];
  selectedIds: string[];
  onToggle: (tagId: string) => void;
  onCreateTag?: (name: string) => Promise<void>;
  disabled?: boolean;
};

export function AudienceTagPicker({
  tags,
  selectedIds,
  onToggle,
  onCreateTag,
  disabled = false,
}: Props) {
  const [newTagName, setNewTagName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!onCreateTag) return;
    const trimmed = newTagName.trim();
    if (trimmed.length < 2) return;

    try {
      setCreating(true);
      await onCreateTag(trimmed);
      setNewTagName('');
    } finally {
      setCreating(false);
    }
  }

  if (tags.length === 0 && !onCreateTag) {
    return <p className="audience-tag-picker-empty">אין תגיות זמינות</p>;
  }

  return (
    <div className="audience-tag-picker">
      {tags.length > 0 ? (
        <div className="audience-tag-picker-chips" role="group" aria-label="תגיות קהל">
          {tags.map((tag) => {
            const selected = selectedIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                className={`audience-tag-chip${selected ? ' selected' : ''}`}
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => onToggle(tag.id)}
              >
                {tag.name}
                {typeof tag.usersCount === 'number' ? (
                  <span className="audience-tag-count">{tag.usersCount}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="audience-tag-picker-empty">אין תגיות עדיין — צרו את הראשונה למטה</p>
      )}

      {onCreateTag && (
        <form className="audience-tag-picker-create" onSubmit={handleCreate}>
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder='תגית חדשה, למשל "תל אביב"'
            maxLength={60}
            disabled={disabled || creating}
          />
          <button
            type="submit"
            disabled={disabled || creating || newTagName.trim().length < 2}
          >
            {creating ? 'יוצר…' : '+ הוספה'}
          </button>
        </form>
      )}
    </div>
  );
}
