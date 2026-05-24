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
  onRedo: () => void,
  onSelectAll?: () => void
): KeyboardState {
  const [shiftKey, setShiftKey] = useState(false);
  const [ctrlKey, setCtrlKey] = useState(false);
  const [altKey, setAltKey] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Shift') setShiftKey(true);
    if (e.key === 'Control' || e.metaKey) setCtrlKey(true);
    if (e.key === 'Alt') setAltKey(true);

    const target = e.target as HTMLElement;
    const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (isInput) return;

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
    } else if (e.shiftKey && e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      console.debug('[useKeyboard] Shift+A -> Select All');
      onSelectAll?.();
    }
  }, [onUndo, onRedo, onSelectAll]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Shift') setShiftKey(false);
    if (e.key === 'Control' || e.metaKey) setCtrlKey(false);
    if (e.key === 'Alt') setAltKey(false);
  }, []);

  useEffect(() => {
    const handleBlur = () => {
      setShiftKey(false);
      setCtrlKey(false);
      setAltKey(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleKeyDown, handleKeyUp]);

  return { shiftKey, ctrlKey, altKey };
}
