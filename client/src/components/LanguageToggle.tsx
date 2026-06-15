import { useI18n } from '../i18n/I18nContext';

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="language-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={locale === 'en' ? 'active' : ''}
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        className={locale === 'fr' ? 'active' : ''}
        onClick={() => setLocale('fr')}
        aria-pressed={locale === 'fr'}
      >
        FR
      </button>
      <button
        type="button"
        className={locale === 'zh-HK' ? 'active' : ''}
        onClick={() => setLocale('zh-HK')}
        aria-pressed={locale === 'zh-HK'}
        aria-label="Hong Kong Traditional Chinese"
      >
        繁中
      </button>
    </div>
  );
}
