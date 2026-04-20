interface DebugConsoleProps {
  logs: string[];
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
  clearLogs: () => void;
}

export function DebugConsole({ logs, showDebug, setShowDebug, clearLogs }: DebugConsoleProps) {
  return (
    <>
      {/* Debug toggle button (hidden by default) */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 rounded text-xs font-mono hidden"
        style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}
        title="Toggle Debug Console"
      >
        {showDebug ? 'Hide' : 'Show'} Debug
      </button>

      {/* Debug overlay */}
      {showDebug && (
        <div className="fixed bottom-16 right-4 w-96 max-h-96 overflow-auto z-50 p-4 rounded shadow-lg font-mono text-xs"
          style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-2)', border: '2px solid var(--accent-main)' }}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Debug Console</h3>
            <button onClick={clearLogs} className="px-2 py-1 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-3)' }}>Clear</button>
          </div>
          <div className="space-y-1">
            {logs.length === 0 ? (
              <p style={{ color: 'var(--text-4)' }}>No logs yet...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="break-all" style={{ color: 'var(--text-3)' }}>{log}</div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
