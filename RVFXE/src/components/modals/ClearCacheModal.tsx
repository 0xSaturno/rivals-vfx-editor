import type { CacheInfo } from '@/types';
import * as tauri from '@/services/tauri';

interface ClearCacheModalProps {
  onClose: () => void;
  setCacheInfo: (info: CacheInfo) => void;
  addDebugLog: (msg: string) => void;
}

export function ClearCacheModal({ onClose, setCacheInfo, addDebugLog }: ClearCacheModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm p-6 rounded shadow-xl" style={{ backgroundColor: 'var(--bg-3)' }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-1)' }}>Clear Cache?</h2>
        <p className="mb-6" style={{ color: 'var(--text-2)' }}>
          Are you sure you want to delete all cached conversion files? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 font-medium rounded-none"
            style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-2)' }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              console.debug('[ClearCacheModal] Clearing cache...');
              await tauri.clearCache();
              setCacheInfo({ fileCount: 0, totalSizeBytes: 0 });
              addDebugLog('Cache cleared');
              onClose();
            }}
            className="px-4 py-2 font-medium rounded-none"
            style={{ backgroundColor: '#dc2626', color: 'white' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
