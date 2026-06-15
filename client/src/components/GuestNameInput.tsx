import { useI18n } from '../i18n/I18nContext';

interface GuestNameInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function GuestNameInput({ value, onChange, disabled }: GuestNameInputProps) {
  const { t } = useI18n();

  return (
    <div className="guest-name">
      <label htmlFor="guest-name" className="guest-name-label">
        {t.guestNameLabel}
      </label>
      <input
        id="guest-name"
        type="text"
        className="guest-name-input"
        placeholder={t.guestNamePlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={100}
        autoComplete="name"
      />
    </div>
  );
}
