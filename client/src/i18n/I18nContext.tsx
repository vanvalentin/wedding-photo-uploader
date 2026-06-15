import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translations, type Locale, type Translations } from './translations';

const LOCALES: Locale[] = ['en', 'fr', 'zh-HK'];

function detectLocale(): Locale {
  const tags = [navigator.language, ...(navigator.languages ?? [])].map((l) => l.toLowerCase());

  for (const tag of tags) {
    if (tag.startsWith('fr')) return 'fr';
    if (tag.startsWith('zh-hk') || tag.startsWith('zh-hant-hk')) return 'zh-HK';
    if (tag.startsWith('zh-tw') || tag.startsWith('zh-hant-tw')) return 'zh-HK';
    if (tag === 'zh-hant' || tag.startsWith('zh-hant-')) return 'zh-HK';
    if (tag.startsWith('zh')) return 'zh-HK';
  }

  return 'en';
}

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectLocale);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => {
      const index = LOCALES.indexOf(prev);
      return LOCALES[(index + 1) % LOCALES.length];
    });
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
