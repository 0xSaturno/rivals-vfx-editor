import { useState, useCallback } from 'react';

export interface DebugLogAPI {
  logs: string[];
  addLog: (message: string) => void;
  clearLogs: () => void;
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
}

export function useDebugLog(): DebugLogAPI {
  const [logs, setLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] ${message}`;
    console.debug('[DebugLog]', message);
    setLogs(prev => [...prev, entry]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, addLog, clearLogs, showDebug, setShowDebug };
}
