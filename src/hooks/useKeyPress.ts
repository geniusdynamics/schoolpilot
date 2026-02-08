/**
 * Key Press Hook
 * 
 * Listen for keyboard events.
 */

import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface UseKeyPressOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  target?: HTMLElement | Window | null;
}

/**
 * Hook to listen for key presses
 * 
 * @example
 * ```tsx
 * useKeyPress('Escape', () => setIsOpen(false));
 * useKeyPress('ctrl+s', handleSave, { preventDefault: true });
 * ```
 */
export function useKeyPress(
  targetKey: string,
  handler: KeyHandler,
  options: UseKeyPressOptions = {}
): void {
  const { preventDefault = false, stopPropagation = false, target = window } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const targetLower = targetKey.toLowerCase();

      // Check for modifier keys
      const hasCtrl = targetLower.includes('ctrl+');
      const hasAlt = targetLower.includes('alt+');
      const hasShift = targetLower.includes('shift+');
      const hasMeta = targetLower.includes('meta+');

      const keyWithoutModifiers = targetLower
        .replace('ctrl+', '')
        .replace('alt+', '')
        .replace('shift+', '')
        .replace('meta+', '');

      const matchesKey = key === keyWithoutModifiers;
      const matchesModifiers =
        event.ctrlKey === hasCtrl &&
        event.altKey === hasAlt &&
        event.shiftKey === hasShift &&
        event.metaKey === hasMeta;

      if (matchesKey && matchesModifiers) {
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        handler(event);
      }
    },
    [targetKey, handler, preventDefault, stopPropagation]
  );

  useEffect(() => {
    if (!target) return;

    target.addEventListener('keydown', handleKeyDown as EventListener);
    
    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [target, handleKeyDown]);
}

export default useKeyPress;
