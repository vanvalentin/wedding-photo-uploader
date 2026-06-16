import { useState } from 'react';
import { patchUploadsBulk } from '../../services/adminService';

interface AdminBulkDateBarProps {
  secret: string;
  selectedIds: string[];
  visibleCount: number;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onUpdated: () => void;
  disabled?: boolean;
}

export function AdminBulkDateBar({
  secret,
  selectedIds,
  visibleCount,
  onSelectAllVisible,
  onClearSelection,
  onUpdated,
  disabled = false,
}: AdminBulkDateBarProps) {
  const [takenAt, setTakenAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDate = async () => {
    if (selectedIds.length === 0) return;
    if (!takenAt.trim()) {
      setError('Choose a date and time');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await patchUploadsBulk(secret, selectedIds, takenAt);
      onClearSelection();
      onUpdated();
      setTakenAt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update dates');
    } finally {
      setSaving(false);
    }
  };

  const clearDates = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `Clear the taken date on ${selectedIds.length} selected upload(s)?`
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await patchUploadsBulk(secret, selectedIds, null);
      onClearSelection();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear dates');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-bulk-bar">
      <div className="admin-bulk-bar-selection">
        <span className="admin-bulk-bar-count">
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : 'Select uploads to bulk-edit dates'}
        </span>
        <button
          type="button"
          className="admin-link-button"
          onClick={onSelectAllVisible}
          disabled={disabled || saving || visibleCount === 0}
        >
          Select all visible ({visibleCount})
        </button>
        {selectedIds.length > 0 && (
          <button
            type="button"
            className="admin-link-button"
            onClick={onClearSelection}
            disabled={disabled || saving}
          >
            Clear
          </button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="admin-bulk-bar-actions">
          <label className="admin-bulk-date-label">
            Taken (Paris time)
            <input
              type="datetime-local"
              className="guest-name-input admin-date-input"
              value={takenAt}
              onChange={(event) => setTakenAt(event.target.value)}
              disabled={saving || disabled}
            />
          </label>
          <button
            type="button"
            className="admin-primary-button"
            onClick={applyDate}
            disabled={saving || disabled}
          >
            {saving ? 'Saving…' : `Set date on ${selectedIds.length}`}
          </button>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={clearDates}
            disabled={saving || disabled}
          >
            Clear dates
          </button>
        </div>
      )}

      {error && <p className="admin-error admin-bulk-error">{error}</p>}
    </div>
  );
}
