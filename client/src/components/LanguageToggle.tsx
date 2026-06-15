import { LOCALE_LABELS, type Locale } from '../i18n/translations';
import { useI18n } from '../i18n/I18nContext';

const LOCALES: Locale[] = ['en', 'fr', 'zh-HK'];

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="language-toggle" role="group" aria-label="Language">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={locale === code ? 'active' : ''}
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          lang={code}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
