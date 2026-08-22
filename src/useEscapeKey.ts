import { useEffect } from 'react';

/** Runs the handler when Escape is pressed, so overlays can be dismissed by keyboard. */
export function useEscapeKey(onEscape: () => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape]);
}
