import { useEffect, useEffectEvent } from 'react';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Global keyboard shortcut; ignored while the user types in a form field. */
export function useHotkey(matches: (event: KeyboardEvent) => boolean, handler: () => void) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isTypingTarget(event.target) || !matches(event)) return;
    event.preventDefault();
    handler();
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
