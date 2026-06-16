import { useState } from 'react';
import { updateUploadTakenAt } from '../../services/adminService';
import {
  formatMediaDateLabel,
  toParisDateTimeLocalInput,
} from '../../utils/formatDateTime';

interface AdminTakenDateEditorProps {
  uploadId: string;
  takenAt: string | null;
  uploadedAt: string;
  secret: string;
  disabled?: boolean;
  onUpdated: () => void;
}

export function AdminTakenDateEditor({
  uploadId,
  takenAt,
  uploadedAt,
  secret,
  disabled = false,
  onUpdated,
}: AdminTakenDateEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setValue(toParisDateTimeLocalInput(takenAt ?? uploadedAt));
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    if (!value.trim()) {
      setError('Choose a date and time');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateUploadTakenAt(secret, uploadId, value);
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save date');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="admin-date-row">
        <p className="admin-card-meta">{formatMediaDateLabel(takenAt, uploadedAt)}</p>
        <button
          type="button"
          className="admin-link-button"
          onClick={startEdit}
          disabled={disabled || saving}
        >
          Edit date
        </button>
      </div>
    );
  }

  return (
    <div className="admin-date-edit">
      <label className="admin-date-label" htmlFor={`taken-at-${uploadId}`}>
        Taken (Paris time)
      </label>
      <input
        id={`taken-at-${uploadId}`}
        type="datetime-local"
        className="guest-name-input admin-date-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={saving}
      />
      {error && <p className="admin-error admin-date-error">{error}</p>}
      <div className="admin-date-edit-actions">
        <button
          type="button"
          className="admin-primary-button"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={cancelEdit}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
