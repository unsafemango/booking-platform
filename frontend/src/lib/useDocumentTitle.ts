import { useEffect } from 'react';

export const APP_TITLE = 'Booking Platform';

/** Sets the browser tab title to "<title> · Booking Platform", or just the app name when title is empty. */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_TITLE}` : APP_TITLE;
  }, [title]);
}
