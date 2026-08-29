import { useState, useCallback } from 'react';
import type { ColorParam } from '@/types';

export interface HistoryAPI {
  colorParams: ColorParam[];
  historyIndex: number;
  historyLength: number;
  recordHistory: (newParams: ColorParam[]) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  resetHistory: () => void;
  setInitialHistory: (params: ColorParam[]) => void;
  getOriginalParams: () => ColorParam[];
}

const MAX_HISTORY = 100;

export function useHistory(): HistoryAPI {
  const [history, setHistory] = useState<ColorParam[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const colorParams = history[historyIndex] || [];

  const recordHistory = useCallback((newParams: ColorParam[]) => {
    setHistory(prev => {
      const next = [...prev.slice(0, historyIndex + 1), newParams];
      // Each entry is a full copy of the param array (~10k entries at scale),
      // so drop the oldest edits instead of growing without bound. Index 0 is
      // the pristine load that getOriginalParams() reports, so it always stays.
      if (next.length > MAX_HISTORY) {
        return [next[0], ...next.slice(next.length - (MAX_HISTORY - 1))];
      }
      return next;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      console.debug('[useHistory] Undo -> index', historyIndex - 1);
      setHistoryIndex(prev => prev - 1);
    }
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    setHistory(prev => {
      if (historyIndex < prev.length - 1) {
        console.debug('[useHistory] Redo -> index', historyIndex + 1);
        setHistoryIndex(historyIndex + 1);
      }
      return prev;
    });
  }, [historyIndex]);

  const resetHistory = useCallback(() => {
    console.debug('[useHistory] Reset history');
    setHistory([[]]);
    setHistoryIndex(0);
  }, []);

  const setInitialHistory = useCallback((params: ColorParam[]) => {
    console.debug('[useHistory] Set initial history with', params.length, 'params');
    setHistory([params]);
    setHistoryIndex(0);
  }, []);

  const getOriginalParams = useCallback(() => {
    return history[0] || [];
  }, [history]);

  return {
    colorParams,
    historyIndex,
    historyLength: history.length,
    recordHistory,
    handleUndo,
    handleRedo,
    resetHistory,
    setInitialHistory,
    getOriginalParams,
  };
}
