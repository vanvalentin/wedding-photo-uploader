import { useI18n } from '../i18n/I18nContext';
import { LanguageToggle } from './LanguageToggle';

export function Header() {
  const { t } = useI18n();

  return (
    <header className="header">
      <div className="header-top">
        <LanguageToggle />
      </div>
      <div className="header-content">
        <div className="header-ornament" aria-hidden="true">
          <span className="ornament-line" />
          <span className="ornament-diamond">◇</span>
          <span className="ornament-line" />
        </div>
        <h1 className="header-title">{t.title}</h1>
        <p className="header-subtitle">{t.subtitle}</p>
      </div>
    </header>
  );
}
