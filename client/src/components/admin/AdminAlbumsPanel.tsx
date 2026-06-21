import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { MediaPreview } from '../../types';
import type { AdminMediaUploadItem } from '../../services/adminService';
import {
  addAlbumItemFromLibrary,
  addAlbumItemFromUpload,
  createPrivateAlbum,
  deletePrivateAlbum,
  deletePrivateAlbumItem,
  fetchAdminAlbumItems,
  fetchAdminAlbums,
  initAlbumUpload,
  type AdminPrivateAlbum,
  type AdminPrivateAlbumItem,
} from '../../services/adminAlbumService';
import { GalleryMediaThumb } from '../GalleryMediaThumb';
import { Lightbox } from '../Lightbox';

interface AdminAlbumsPanelProps {
  secret: string;
  uploads: AdminMediaUploadItem[];
}

export function AdminAlbumsPanel({ secret, uploads }: AdminAlbumsPanelProps) {
  const [albums, setAlbums] = useState<AdminPrivateAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [albumItems, setAlbumItems] = useState<AdminPrivateAlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newSlug, setNewSlug] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId) ?? null;

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchAdminAlbums(secret);
      setAlbums(items);
      setSelectedAlbumId((current) => {
        if (current && items.some((album) => album.id === current)) return current;
        return items[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load albums');
    } finally {
      setLoading(false);
    }
  }, [secret]);

  const loadAlbumItems = useCallback(async (albumId: string) => {
    setItemsLoading(true);
    try {
      const items = await fetchAdminAlbumItems(secret, albumId);
      setAlbumItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load album photos');
    } finally {
      setItemsLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  useEffect(() => {
    if (selectedAlbumId) {
      loadAlbumItems(selectedAlbumId);
    } else {
      setAlbumItems([]);
    }
  }, [selectedAlbumId, loadAlbumItems]);

  const previewItems: MediaPreview[] = albumItems.map((item) => ({
    id: item.id,
    previewUrl: item.thumbnailUrl,
    viewUrl: item.viewUrl,
    name: item.fileName,
    isVideo: item.isVideo,
  }));

  const handleCreateAlbum = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const album = await createPrivateAlbum(secret, {
        slug: newSlug,
        title: newTitle,
        password: newPassword,
      });
      setAlbums((current) => [album, ...current]);
      setSelectedAlbumId(album.id);
      setNewSlug('');
      setNewTitle('');
      setNewPassword('');
      setMessage(`Created album "${album.title}"`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create album');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!selectedAlbum) return;
    const confirmed = window.confirm(
      `Delete "${selectedAlbum.title}" and all of its photos from the album?\n\nThe original files in storage are not deleted.`
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    try {
      await deletePrivateAlbum(secret, selectedAlbum.id);
      setAlbums((current) => current.filter((album) => album.id !== selectedAlbum.id));
      setSelectedAlbumId(null);
      setMessage('Album deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete album');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveItem = async (item: AdminPrivateAlbumItem) => {
    setBusy(true);
    setError(null);
    try {
      await deletePrivateAlbumItem(secret, item.id);
      setAlbumItems((current) => current.filter((entry) => entry.id !== item.id));
      setMessage('Removed photo from album');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove photo');
    } finally {
      setBusy(false);
    }
  };

  const handleAddFromLibrary = async (upload: AdminMediaUploadItem) => {
    if (!selectedAlbumId) return;
    setBusy(true);
    setError(null);
    try {
      await addAlbumItemFromLibrary(secret, selectedAlbumId, upload.id);
      await loadAlbumItems(selectedAlbumId);
      setMessage(`Added "${upload.fileName}" to album`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add photo');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!selectedAlbumId || !files?.length) return;

    setBusy(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const init = await initAlbumUpload(secret, {
          albumId: selectedAlbumId,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
        });

        const uploadResponse = await fetch(init.sessionUri, {
          method: init.uploadMethod === 'single_put' ? 'PUT' : 'PUT',
          headers: init.uploadMethod === 'single_put' ? { 'Content-Type': file.type } : {},
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const storageKey = init.storageKey ?? init.fileName;
        await addAlbumItemFromUpload(secret, {
          albumId: selectedAlbumId,
          driveFileId: storageKey,
          storageProvider: init.storageProvider,
          storageKey,
          fileName: init.fileName,
          mimeType: file.type,
          isVideo: file.type.startsWith('video/'),
        });
      }

      await loadAlbumItems(selectedAlbumId);
      setMessage(`Uploaded ${files.length} photo(s) to album`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const albumUrl = selectedAlbum
    ? `${window.location.origin}/album/${selectedAlbum.slug}`
    : null;

  return (
    <div className="admin-albums-panel">
      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-message">{message}</p>}

      <section className="admin-albums-create">
        <h2>Create private album</h2>
        <p className="admin-albums-help">
          Each album gets its own link and password. Share the link with the guest and give them the
          password separately.
        </p>
        <form className="admin-albums-form" onSubmit={handleCreateAlbum}>
          <label className="guest-name-label" htmlFor="album-title">
            Guest / album name
          </label>
          <input
            id="album-title"
            className="guest-name-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Sarah & James"
            disabled={busy}
          />

          <label className="guest-name-label" htmlFor="album-slug">
            URL slug
          </label>
          <input
            id="album-slug"
            className="guest-name-input"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="e.g. sarah-james"
            disabled={busy}
          />

          <label className="guest-name-label" htmlFor="album-password">
            Password
          </label>
          <input
            id="album-password"
            type="password"
            className="guest-name-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Choose a password for this guest"
            disabled={busy}
          />

          <button type="submit" className="admin-primary-button" disabled={busy}>
            Create album
          </button>
        </form>
      </section>

      {loading ? (
        <p className="admin-albums-help">Loading albums…</p>
      ) : albums.length === 0 ? (
        <p className="admin-albums-help">No private albums yet. Create one above.</p>
      ) : (
        <>
          <div className="admin-albums-toolbar">
            <label className="guest-name-label" htmlFor="album-select">
              Select album
            </label>
            <select
              id="album-select"
              className="guest-name-input"
              value={selectedAlbumId ?? ''}
              onChange={(e) => setSelectedAlbumId(e.target.value || null)}
            >
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.title} ({album.itemCount} photos)
                </option>
              ))}
            </select>

            {albumUrl && (
              <div className="admin-albums-link">
                <span className="admin-albums-link-label">Share link:</span>
                <code className="admin-albums-link-url">{albumUrl}</code>
              </div>
            )}

            <div className="admin-albums-actions">
              <button
                type="button"
                className="admin-primary-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || !selectedAlbumId}
              >
                Upload photos
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => handleUploadFiles(e.target.files)}
              />
              <button
                type="button"
                className="admin-danger-button"
                onClick={handleDeleteAlbum}
                disabled={busy || !selectedAlbumId}
              >
                Delete album
              </button>
            </div>
          </div>

          <section className="admin-albums-items">
            <h2>Album photos ({albumItems.length})</h2>
            {itemsLoading ? (
              <p className="admin-albums-help">Loading photos…</p>
            ) : albumItems.length === 0 ? (
              <p className="admin-albums-help">
                No photos yet. Upload photobooth photos or add from the library below.
              </p>
            ) : (
              <div className="admin-grid">
                {albumItems.map((item, index) => (
                  <article key={item.id} className="admin-card">
                    <button
                      type="button"
                      className="admin-card-preview-wrap"
                      onClick={() => setPreviewIndex(index)}
                    >
                      <GalleryMediaThumb
                        item={{
                          id: item.id,
                          previewUrl: item.thumbnailUrl,
                          viewUrl: item.viewUrl,
                          name: item.fileName,
                          isVideo: item.isVideo,
                        }}
                        alt={item.fileName}
                      />
                    </button>
                    <div className="admin-card-actions">
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => handleRemoveItem(item)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-albums-library">
            <h2>Add from existing uploads</h2>
            <p className="admin-albums-help">
              Pick photos already uploaded by guests to add to this album.
            </p>
            <div className="admin-grid">
              {uploads.slice(0, 24).map((upload) => (
                <article key={upload.id} className="admin-card">
                  <GalleryMediaThumb
                    item={{
                      id: upload.id,
                      previewUrl: upload.thumbnailUrl,
                      viewUrl: upload.viewUrl,
                      name: upload.fileName,
                      isVideo: upload.isVideo,
                    }}
                    alt={upload.fileName}
                  />
                  <div className="admin-card-actions">
                    <button
                      type="button"
                      className="admin-primary-button"
                      onClick={() => handleAddFromLibrary(upload)}
                      disabled={busy || !selectedAlbumId}
                    >
                      Add
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <Lightbox
        items={previewItems}
        activeIndex={previewIndex}
        onActiveIndexChange={setPreviewIndex}
      />
    </div>
  );
}
