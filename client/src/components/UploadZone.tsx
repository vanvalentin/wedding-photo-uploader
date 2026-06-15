import { useCallback, useRef, useState, type DragEvent } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface UploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
}

export function UploadZone({ onFilesSelected, disabled }: UploadZoneProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,.heic,.heif"
        multiple
        hidden
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="upload-zone-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="6" y="10" width="36" height="30" rx="4" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="18" cy="22" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 32l10-8 8 6 10-10 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M30 6v8M26 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="upload-zone-title">{t.uploadZoneTitle}</p>
      <p className="upload-zone-hint">{t.uploadZoneHint}</p>
      <p className="upload-zone-formats">{t.uploadZoneFormats}</p>
      <button
        type="button"
        className="upload-zone-button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) inputRef.current?.click();
        }}
      >
        {t.selectFiles}
      </button>
    </div>
  );
}
