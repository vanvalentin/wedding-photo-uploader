import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';

/**
 * Warns the user before leaving when uploads are active or files remain unsent.
 * Uses a localized window.confirm for back navigation (fully translated).
 * Uses beforeunload for tab close/refresh (browser may show a generic dialog,
 * but html[lang] is set so the browser UI matches the app locale when possible).
 */
export function useBeforeUnloadGuard(active: boolean) {
  const { t } = useI18n();
  const messageRef = useRef(t.beforeUnload);

  useEffect(() => {
    messageRef.current = t.beforeUnload;
  }, [t.beforeUnload]);

  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const message = messageRef.current;
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    const trapBackNavigation = () => {
      history.pushState({ leaveGuard: true }, '', window.location.href);
    };

    const onPopState = () => {
      const message = messageRef.current;
      const confirmedLeave = window.confirm(message);
      if (!confirmedLeave) {
        trapBackNavigation();
      }
    };

    trapBackNavigation();
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
  }, [active]);
}
