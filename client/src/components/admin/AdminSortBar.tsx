import type { AdminSortDirection, AdminSortField } from '../../utils/formatDateTime';

interface AdminSortBarProps {
  sortField: AdminSortField;
  sortDirection: AdminSortDirection;
  onSortFieldChange: (field: AdminSortField) => void;
  onSortDirectionChange: (direction: AdminSortDirection) => void;
  uploadDateLabel?: string;
}

export function AdminSortBar({
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
  uploadDateLabel = 'Upload date',
}: AdminSortBarProps) {
  return (
    <div className="admin-sort-bar">
      <label className="admin-sort-label">
        Sort by
        <select
          className="admin-sort-select"
          value={sortField}
          onChange={(event) => onSortFieldChange(event.target.value as AdminSortField)}
        >
          <option value="taken">Taken date</option>
          <option value="uploaded">{uploadDateLabel}</option>
        </select>
      </label>
      <label className="admin-sort-label">
        Order
        <select
          className="admin-sort-select"
          value={sortDirection}
          onChange={(event) => onSortDirectionChange(event.target.value as AdminSortDirection)}
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </label>
    </div>
  );
}
