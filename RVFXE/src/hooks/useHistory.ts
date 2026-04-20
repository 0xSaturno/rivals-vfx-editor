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
}

export function useHistory(): HistoryAPI {
  const [history, setHistory] = useState<ColorParam[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const colorParams = history[historyIndex] || [];

  const recordHistory = useCallback((newParams: ColorParam[]) => {
    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), newParams];
      console.debug('[useHistory] Recorded new state, history length:', newHistory.length);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
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

  return {
    colorParams,
    historyIndex,
    historyLength: history.length,
    recordHistory,
    handleUndo,
    handleRedo,
    resetHistory,
    setInitialHistory,
  };
}
