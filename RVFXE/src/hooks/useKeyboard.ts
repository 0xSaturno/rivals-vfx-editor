import { useState, useEffect, useCallback } from 'react';

export interface KeyboardState {
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

/**
 * Tracks modifier keys and provides undo/redo keyboard shortcut handling.
 */
export function useKeyboard(
  onUndo: () => void,
  onRedo: () => void
): KeyboardState {
  const [shiftKey, setShiftKey] = useState(false);
  const [ctrlKey, setCtrlKey] = useState(false);
  const [altKey, setAltKey] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Shift') setShiftKey(true);
    if (e.key === 'Control' || e.metaKey) setCtrlKey(true);
    if (e.key === 'Alt') setAltKey(true);

    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        console.debug('[useKeyboard] Ctrl+Shift+Z -> Redo');
        onRedo();
      } else {
        console.debug('[useKeyboard] Ctrl+Z -> Undo');
        onUndo();
      }
    } else if (isCtrl && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      console.debug('[useKeyboard] Ctrl+Y -> Redo');
      onRedo();
    }
  }, [onUndo, onRedo]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Shift') setShiftKey(false);
    if (e.key === 'Control' || e.metaKey) setCtrlKey(false);
    if (e.key === 'Alt') setAltKey(false);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return { shiftKey, ctrlKey, altKey };
}
