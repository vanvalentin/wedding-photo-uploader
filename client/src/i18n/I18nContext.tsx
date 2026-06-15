import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { translations, type Locale, type Translations } from './translations';

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('fr') ? 'fr' : 'en';
  });

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === 'en' ? 'fr' : 'en'));
  }, []);

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
