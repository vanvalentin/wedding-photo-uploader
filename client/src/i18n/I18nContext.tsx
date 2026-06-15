import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translations, type Locale, type Translations } from './translations';

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): Locale {
  const browserLanguages = navigator.languages.length ? navigator.languages : [navigator.language];
  const normalizedLanguages = browserLanguages.map((language) => language.toLowerCase());

  if (
    normalizedLanguages.some(
      (language) =>
        language === 'zh-hk' ||
        language.startsWith('zh-hk-') ||
        language === 'zh-hant-hk' ||
        language.startsWith('zh-hant-hk-')
    )
  ) {
    return 'zh-HK';
  }

  return normalizedLanguages.some((language) => language.startsWith('fr')) ? 'fr' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === 'en' ? 'fr' : prev === 'fr' ? 'zh-HK' : 'en'));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: translations[locale],
      setLocale,
      toggleLocale,
    }),
    [locale, toggleLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
