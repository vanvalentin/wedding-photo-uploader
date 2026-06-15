import { useState } from 'react';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import { useUploadQueue } from './hooks/useUploadQueue';
import { useBeforeUnloadGuard } from './hooks/useBeforeUnload';
import { Header } from './components/Header';
import { GuestNameInput } from './components/GuestNameInput';
import { UploadZone } from './components/UploadZone';
import { MediaQueue } from './components/MediaQueue';
import { UploadButton } from './components/UploadButton';

function AppContent() {
  const { t } = useI18n();
  const [guestName, setGuestNameLocal] = useState('');
  const {
    queue,
    isUploading,
    allComplete,
    hasActiveGuard,
    addFiles,
    removeFile,
    uploadAll,
    retryFile,
    setGuestName,
  } = useUploadQueue();

  useBeforeUnloadGuard(hasActiveGuard);

  const handleGuestNameChange = (name: string) => {
    setGuestNameLocal(name);
    setGuestName(name);
  };

  const pendingCount = queue.filter((f) => f.status === 'pending' || f.status === 'error').length;

  return (
    <div className="app">
      <Header />

      <main className="main">
        {allComplete && queue.every((f) => f.status === 'complete') ? (
          <section className="thank-you" aria-live="polite">
            <div className="thank-you-icon" aria-hidden="true">♥</div>
            <h2>{t.thankYou}</h2>
            <p>{t.thankYouSubtitle}</p>
          </section>
        ) : (
          <>
            <GuestNameInput
              value={guestName}
              onChange={handleGuestNameChange}
              disabled={isUploading}
            />

            <UploadZone
              onFilesSelected={addFiles}
              disabled={isUploading}
            />

            <MediaQueue
              queue={queue}
              onRemove={removeFile}
              onRetry={retryFile}
              isUploading={isUploading}
            />

            <UploadButton
              onClick={uploadAll}
              disabled={isUploading || pendingCount === 0}
              isUploading={isUploading}
              fileCount={pendingCount}
            />
          </>
        )}
      </main>

      <footer className="footer">
        <p>♥</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
