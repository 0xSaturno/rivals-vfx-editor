import type { AppSettings } from '@/types';
import { StyledPanel } from '@/components/ui';

interface LoadFilesPanelProps {
  settings: AppSettings;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onSelectFolder: () => void;
  onBrowseHeroes: () => void;
}

export function LoadFilesPanel({
  settings, isDragging,
  onDragOver, onDragLeave, onDrop,
  onSelectFolder, onBrowseHeroes,
}: LoadFilesPanelProps) {
  const hasPaksPath = !!settings.paksPath;
  const hasUsmapPath = !!settings.usmapPath;

  return (
    <div className="flex flex-col gap-8">
      <StyledPanel title="Load Files">
        <div
          className="text-center py-20 px-6 border-2 border-dashed transition-colors"
          style={{ backgroundColor: 'var(--bg-2)', borderColor: isDragging ? 'var(--accent-main)' : 'var(--bg-1)', opacity: hasUsmapPath ? 1 : 0.6 }}
          onDragOver={hasUsmapPath ? onDragOver : undefined}
          onDragLeave={hasUsmapPath ? onDragLeave : undefined}
          onDrop={hasUsmapPath ? onDrop : undefined}
        >
          <div
            onClick={hasUsmapPath ? onSelectFolder : undefined}
            className={`w-full h-full flex flex-col items-center justify-center ${hasUsmapPath ? 'cursor-pointer' : 'cursor-not-allowed'}`}
          >
            <svg className="mx-auto h-12 w-12" style={{ color: 'var(--text-4)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M9 15.5a1.5 1.5 0 0 0-3 0v1a1.5 1.5 0 0 0 3 0"></path>
              <path d="M18 15.5a1.5 1.5 0 0 0-3 0v1a1.5 1.5 0 0 0 3 0"></path>
            </svg>
            <div className="flex items-center gap-2 mt-2">
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-2)' }}>No files loaded</h3>
              <img src="./assets/images/shrug.png" alt="shrug emoji" className="h-6 w-6" />
            </div>
            <p className="mt-1 text-sm font-medium" style={{ color: hasUsmapPath ? 'var(--text-4)' : 'var(--accent-warning, #f59e0b)' }}>
              {hasUsmapPath
                ? 'Drag and drop .uasset files or click here to browse.'
                : 'Set a valid mapping file in the settings to proceed'}
            </p>
          </div>
        </div>
      </StyledPanel>

      {/* Hero VFX Browser Button */}
      <StyledPanel title="Hero VFX Browser">
        <div className="p-4 flex flex-col items-center gap-3">

          <button
            onClick={onBrowseHeroes}
            disabled={!hasUsmapPath || !hasPaksPath}
            className="flex items-center gap-2 px-6 py-3 font-medium rounded-none transition-colors shadow-md disabled:cursor-not-allowed"
            style={{
              backgroundColor: (!hasUsmapPath || !hasPaksPath) ? 'var(--bg-1)' : 'var(--accent-main)',
              color: (!hasUsmapPath || !hasPaksPath) ? 'var(--text-4)' : 'var(--bg-4)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Browse Hero VFX
          </button>
          <p className="text-sm text-center" style={{ color: 'var(--text-4)' }}>
            Browse and load VFX materials directly from game files by hero.
          </p>
          {(!hasUsmapPath || !hasPaksPath) && (
            <p className="text-xs" style={{ color: 'var(--accent-warning, #f59e0b)' }}>
              {!hasUsmapPath && !hasPaksPath
                ? 'Set both .usmap and Game Paks paths in Settings to use this feature.'
                : !hasUsmapPath
                  ? 'Set .usmap path in Settings first.'
                  : 'Set Game Paks path in Settings first.'}
            </p>
          )}
        </div>
      </StyledPanel>
    </div>
  );
}
