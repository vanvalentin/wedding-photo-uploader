import { useI18n } from '../i18n/I18nContext';

interface UploadButtonProps {
  onClick: () => void;
  disabled: boolean;
  isUploading: boolean;
  fileCount: number;
}

export function UploadButton({ onClick, disabled, isUploading, fileCount }: UploadButtonProps) {
  const { t } = useI18n();

  if (fileCount === 0) return null;

  return (
    <button
      type="button"
      className={`upload-button ${isUploading ? 'uploading' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {isUploading ? (
        <>
          <span className="upload-button-spinner" aria-hidden="true" />
          {t.uploading}
        </>
      ) : (
        t.uploadAll
      )}
    </button>
  );
}
