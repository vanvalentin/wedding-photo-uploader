import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MediaPreview } from '../../types';
import {
  addCuratedItem,
  clearAdminSecret,
  deleteUpload,
  fetchAdminCurated,
  fetchAdminUploads,
  importDriveFolder,
  patchUpload,
  removeCuratedItem,
  type AdminCuratedItem,
  type AdminMediaUploadItem,
} from '../../services/adminService';
import { Lightbox } from '../Lightbox';
import { AdminSortBar } from './AdminSortBar';
import { AdminTakenDateEditor } from './AdminTakenDateEditor';
import { AdminBulkDateBar } from './AdminBulkDateBar';
import {
  filterByReviewStatus,
  formatMediaDateLabel,
  sortByMediaDate,
  type AdminReviewFilter,
  type AdminSortDirection,
  type AdminSortField,
} from '../../utils/formatDateTime';

interface AdminDashboardProps {
  secret: string;
  onLogout: () => void;
}

type AdminTab = 'uploads' | 'curated';

export function AdminDashboard({ secret, onLogout }: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('uploads');
  const [uploads, setUploads] = useState<AdminMediaUploadItem[]>([]);
  const [curated, setCurated] = useState<AdminCuratedItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [sortField, setSortField] = useState<AdminSortField>('taken');
  const [sortDirection, setSortDirection] = useState<AdminSortDirection>('desc');
  const [reviewFilter, setReviewFilter] = useState<AdminReviewFilter>('unreviewed');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const loadData = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;

    if (background) {
      setRefreshing(true);
    } else {
      setInitialLoading(true);
    }
    setError(null);

    try {
      const [uploadItems, curatedItems] = await Promise.all([
        fetchAdminUploads(secret),
        fetchAdminCurated(secret),
      ]);
      setUploads(uploadItems);
      setCurated(curatedItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setInitialLoading(false);
      }
    }
  }, [secret]);

  const refreshData = useCallback(() => loadData({ background: true }), [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedUploads = useMemo(
    () => sortByMediaDate(uploads, sortField, sortDirection, 'uploadedAt'),
    [uploads, sortField, sortDirection]
  );

  const filteredUploads = useMemo(
    () => filterByReviewStatus(sortedUploads, reviewFilter),
    [sortedUploads, reviewFilter]
  );

  const unreviewedCount = useMemo(
    () => uploads.filter((item) => !item.reviewed).length,
    [uploads]
  );

  const sortedCurated = useMemo(
    () => sortByMediaDate(curated, sortField, sortDirection, 'createdAt'),
    [curated, sortField, sortDirection]
  );

  const previewItems = useMemo((): MediaPreview[] => {
    if (tab === 'uploads') {
      return filteredUploads.map((item) => ({
        id: item.id,
        previewUrl: item.thumbnailUrl,
        viewUrl: item.viewUrl,
        name: item.fileName,
        isVideo: item.isVideo,
      }));
    }

    return sortedCurated.map((item) => ({
      id: item.id,
      previewUrl: item.thumbnailUrl,
      viewUrl: item.viewUrl,
      name: item.fileName ?? item.caption ?? 'Highlight',
      isVideo: item.isVideo,
      caption: item.caption,
    }));
  }, [tab, filteredUploads, sortedCurated]);

  useEffect(() => {
    if (previewIndex !== null && previewIndex >= previewItems.length) {
      setPreviewIndex(null);
    }
  }, [previewItems, previewIndex]);

  useEffect(() => {
    setPreviewIndex(null);
    setSelectedIds(new Set());
  }, [tab, reviewFilter]);

  const handleLogout = () => {
    clearAdminSecret();
    onLogout();
  };

  const handleAddToHighlights = async (item: AdminMediaUploadItem) => {
    setBusyId(item.id);
    setActionMessage(null);
    setError(null);

    try {
      await Promise.all([
        addCuratedItem(secret, {
          driveFileId: item.driveFileId,
          isVideo: item.isVideo,
          takenAt: item.takenAt,
          sortOrder: curated.length,
        }),
        item.reviewed
          ? Promise.resolve()
          : patchUpload(secret, item.id, { reviewed: true }),
      ]);
      setUploads((current) =>
        current.map((upload) =>
          upload.id === item.id
            ? { ...upload, isCurated: true, reviewed: true }
            : upload
        )
      );
      setActionMessage(`Added "${item.fileName}" to highlights`);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add highlight');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveFromHighlights = async (item: AdminCuratedItem) => {
    setBusyId(item.id);
    setActionMessage(null);

    try {
      await removeCuratedItem(secret, item.id);
      setActionMessage('Removed from highlights');
      await refreshData();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to remove highlight');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleReviewed = async (item: AdminMediaUploadItem) => {
    setBusyId(item.id);
    setActionMessage(null);
    setError(null);

    try {
      await patchUpload(secret, item.id, { reviewed: !item.reviewed });
      setUploads((current) =>
        current.map((upload) =>
          upload.id === item.id ? { ...upload, reviewed: !item.reviewed } : upload
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update review status');
    } finally {
      setBusyId(null);
    }
  };

  const handleImportFromDrive = async () => {
    setImporting(true);
    setActionMessage(null);
    setError(null);

    try {
      const result = await importDriveFolder(secret, (totals) => {
        setActionMessage(
          `Importing… ${totals.processed} file(s) processed (${totals.imported} new, ${totals.skipped} already registered)`
        );
      });
      setActionMessage(
        `Imported ${result.imported} new file(s) from Drive (${result.skipped} already registered, ${result.processed} total in folder).`
      );
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import from Drive');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteUpload = async (item: AdminMediaUploadItem) => {
    const confirmed = window.confirm(
      `Delete "${item.fileName}" from Google Drive and remove it from the gallery?\n\nThis moves the file to Drive trash and cannot be undone from here.`
    );
    if (!confirmed) return;

    setBusyId(item.id);
    setActionMessage(null);
    setError(null);

    try {
      await deleteUpload(secret, item.id);
      setActionMessage(`Deleted "${item.fileName}" from Drive`);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete upload');
    } finally {
      setBusyId(null);
    }
  };

  const openPreview = (id: string) => {
    const index = previewItems.findIndex((item) => item.id === id);
    if (index >= 0) setPreviewIndex(index);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredUploads.map((item) => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <h1>Gallery Admin</h1>
          <p>Curate highlights shown to guests on the upload page</p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-secondary-button"
            onClick={handleImportFromDrive}
            disabled={initialLoading || importing}
          >
            {importing ? 'Importing…' : 'Import from Drive'}
          </button>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => loadData({ background: true })}
            disabled={initialLoading || refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="admin-secondary-button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="admin-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={tab === 'uploads' ? 'active' : ''}
          aria-selected={tab === 'uploads'}
          onClick={() => setTab('uploads')}
        >
          All uploads ({uploads.length}
          {unreviewedCount > 0 ? ` · ${unreviewedCount} to review` : ''})
        </button>
        <button
          type="button"
          role="tab"
          className={tab === 'curated' ? 'active' : ''}
          aria-selected={tab === 'curated'}
          onClick={() => setTab('curated')}
        >
          Highlights ({curated.length})
        </button>
      </div>

      {!initialLoading && (
        <AdminSortBar
          sortField={sortField}
          sortDirection={sortDirection}
          onSortFieldChange={setSortField}
          onSortDirectionChange={setSortDirection}
          uploadDateLabel={tab === 'curated' ? 'Added date' : 'Upload date'}
          showReviewFilter={tab === 'uploads'}
          reviewFilter={reviewFilter}
          onReviewFilterChange={setReviewFilter}
        />
      )}

      {actionMessage && <p className="admin-message">{actionMessage}</p>}
      {error && <p className="admin-error">{error}</p>}
      {initialLoading && <p className="admin-loading">Loading…</p>}

      {!initialLoading && tab === 'uploads' && (
        <>
          <p className="admin-import-hint">
            Existing photos already in your Drive folder? Click <strong>Import from Drive</strong> once to register them here.
          </p>
          <AdminBulkDateBar
            secret={secret}
            selectedIds={[...selectedIds]}
            visibleCount={filteredUploads.length}
            onSelectAllVisible={selectAllVisible}
            onClearSelection={clearSelection}
            onUpdated={refreshData}
            disabled={initialLoading || importing}
          />
          <div className="admin-grid">
          {filteredUploads.length === 0 ? (
            <p className="admin-empty">
              {reviewFilter === 'unreviewed'
                ? 'All uploads have been reviewed.'
                : reviewFilter === 'reviewed'
                  ? 'No reviewed uploads yet.'
                  : 'No uploads registered yet. Use Import from Drive for existing folder photos, or wait for new guest uploads.'}
            </p>
          ) : (
            filteredUploads.map((item) => (
              <article
                key={item.id}
                className={`admin-card${item.reviewed ? ' admin-card-reviewed' : ''}${selectedIds.has(item.id) ? ' admin-card-selected' : ''}`}
              >
                <div className="admin-card-preview-wrap">
                  <label className="admin-card-select">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelected(item.id)}
                      aria-label={`Select ${item.fileName}`}
                    />
                  </label>
                  <button type="button" className="admin-card-preview" onClick={() => openPreview(item.id)}>
                    <img src={item.thumbnailUrl} alt={item.fileName} loading="lazy" />
                    {item.isVideo && <span className="video-badge" aria-hidden="true">▶</span>}
                    {item.reviewed && <span className="admin-reviewed-badge">Reviewed</span>}
                  </button>
                </div>
                <div className="admin-card-body">
                  <p className="admin-card-title">{item.fileName}</p>
                  {item.guestName && <p className="admin-card-meta">By {item.guestName}</p>}
                  <AdminTakenDateEditor
                    uploadId={item.id}
                    takenAt={item.takenAt}
                    uploadedAt={item.uploadedAt}
                    secret={secret}
                    disabled={busyId === item.id}
                    onUpdated={refreshData}
                  />
                  <div className="admin-card-actions">
                    <button
                      type="button"
                      className="admin-secondary-button"
                      disabled={busyId === item.id}
                      onClick={() => handleToggleReviewed(item)}
                    >
                      {busyId === item.id
                        ? 'Saving…'
                        : item.reviewed
                          ? 'Mark unreviewed'
                          : 'Mark reviewed'}
                    </button>
                    <button
                      type="button"
                      className="admin-primary-button"
                      disabled={item.isCurated || busyId === item.id}
                      onClick={() => handleAddToHighlights(item)}
                    >
                      {item.isCurated ? 'In highlights' : busyId === item.id ? 'Adding…' : 'Add to highlights'}
                    </button>
                    <button
                      type="button"
                      className="admin-danger-button"
                      disabled={busyId === item.id}
                      onClick={() => handleDeleteUpload(item)}
                    >
                      {busyId === item.id ? 'Deleting…' : 'Delete from Drive'}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
        </>
      )}

      {!initialLoading && tab === 'curated' && (
        <div className="admin-grid">
          {sortedCurated.length === 0 ? (
            <p className="admin-empty">No highlights yet. Add uploads from the All uploads tab.</p>
          ) : (
            sortedCurated.map((item) => (
              <article key={item.id} className="admin-card">
                <button type="button" className="admin-card-preview" onClick={() => openPreview(item.id)}>
                  <img src={item.thumbnailUrl} alt={item.fileName ?? 'Highlight'} loading="lazy" />
                  {item.isVideo && <span className="video-badge" aria-hidden="true">▶</span>}
                </button>
                <div className="admin-card-body">
                  <p className="admin-card-title">{item.fileName ?? item.driveFileId}</p>
                  {item.caption && <p className="admin-card-meta">{item.caption}</p>}
                  <p className="admin-card-meta">
                    {formatMediaDateLabel(item.takenAt, item.createdAt)}
                  </p>
                  <p className="admin-card-meta">Order {item.sortOrder}</p>
                  <button
                    type="button"
                    className="admin-danger-button"
                    disabled={busyId === item.id}
                    onClick={() => handleRemoveFromHighlights(item)}
                  >
                    {busyId === item.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      <Lightbox
        items={previewItems}
        activeIndex={previewIndex}
        onActiveIndexChange={setPreviewIndex}
      />
    </div>
  );
}
