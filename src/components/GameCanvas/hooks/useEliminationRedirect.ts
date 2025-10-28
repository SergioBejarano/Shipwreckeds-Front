import { useEffect, type MutableRefObject } from 'react';

export function useEliminationRedirect(
  eliminationMessage: string | null,
  eliminationRedirectRef: MutableRefObject<number | null>,
  onRedirect: () => void
) {
  useEffect(() => {
    if (!eliminationMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onRedirect();
    }, 3500);

    eliminationRedirectRef.current = timeoutId;

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [eliminationMessage, eliminationRedirectRef, onRedirect]);

  useEffect(
    () => () => {
      if (eliminationRedirectRef.current !== null) {
        window.clearTimeout(eliminationRedirectRef.current);
      }
    },
    [eliminationRedirectRef]
  );
}
