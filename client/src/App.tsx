import { useState } from 'react';
import { I18nProvider } from './i18n/I18nContext';
import { useUploadQueue } from './hooks/useUploadQueue';
import { useBeforeUnloadGuard } from './hooks/useBeforeUnload';
import { Header } from './components/Header';
import { GuestNameInput } from './components/GuestNameInput';
import { UploadZone } from './components/UploadZone';
import { MediaQueue } from './components/MediaQueue';
import { UploadButton } from './components/UploadButton';
import { ThankYouScreen } from './components/ThankYouScreen';
import { CuratedGallery } from './components/CuratedGallery';

function AppContent() {
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
    resetForMoreUploads,
    setGuestName,
  } = useUploadQueue();

  useBeforeUnloadGuard(hasActiveGuard);

  const handleGuestNameChange = (name: string) => {
    setGuestNameLocal(name);
    setGuestName(name);
  };

  const pendingCount = queue.filter((f) => f.status === 'pending' || f.status === 'error').length;
  const completedItems = queue.filter((f) => f.status === 'complete');
  const showThankYou = allComplete && queue.length > 0 && queue.every((f) => f.status === 'complete');

  return (
    <div className="app">
      <Header />

      <main className="main">
        {showThankYou ? (
          <ThankYouScreen completedItems={completedItems} onUploadMore={resetForMoreUploads} />
        ) : (
          <>
            <CuratedGallery />

            <GuestNameInput
              value={guestName}
              onChange={handleGuestNameChange}
              disabled={isUploading}
            />

            <UploadZone onFilesSelected={addFiles} disabled={isUploading} />

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
