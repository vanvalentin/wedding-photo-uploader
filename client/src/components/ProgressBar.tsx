interface ProgressBarProps {
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  label?: string;
}

export function ProgressBar({ progress, status, label }: ProgressBarProps) {
  const isAnimated = status === 'uploading';

  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div
        className={`progress-bar-fill ${status} ${isAnimated ? 'animated' : ''}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
