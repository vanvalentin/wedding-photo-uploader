import { useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

/**
 * Warns the user before leaving the page when uploads are active
 * or files remain in the queue without being successfully sent.
 */
export function useBeforeUnloadGuard(active: boolean) {
  const { t } = useI18n();

  useEffect(() => {
    if (!active) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t.beforeUnload;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active, t.beforeUnload]);
}
