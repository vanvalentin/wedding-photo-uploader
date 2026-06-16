import type { AdminReviewFilter, AdminSortDirection, AdminSortField } from '../../utils/formatDateTime';

interface AdminSortBarProps {
  sortField: AdminSortField;
  sortDirection: AdminSortDirection;
  onSortFieldChange: (field: AdminSortField) => void;
  onSortDirectionChange: (direction: AdminSortDirection) => void;
  uploadDateLabel?: string;
  reviewFilter?: AdminReviewFilter;
  onReviewFilterChange?: (filter: AdminReviewFilter) => void;
  showReviewFilter?: boolean;
}

export function AdminSortBar({
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
  uploadDateLabel = 'Upload date',
  reviewFilter = 'all',
  onReviewFilterChange,
  showReviewFilter = false,
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
      {showReviewFilter && onReviewFilterChange && (
        <label className="admin-sort-label">
          Review
          <select
            className="admin-sort-select"
            value={reviewFilter}
            onChange={(event) => onReviewFilterChange(event.target.value as AdminReviewFilter)}
          >
            <option value="all">All</option>
            <option value="unreviewed">To review</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </label>
      )}
    </div>
  );
}
