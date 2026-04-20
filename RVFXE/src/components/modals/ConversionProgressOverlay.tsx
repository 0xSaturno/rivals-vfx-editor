import type { ConversionProgress } from '@/types';

interface ConversionProgressOverlayProps {
  conversionProgress: ConversionProgress;
}

export function ConversionProgressOverlay({ conversionProgress }: ConversionProgressOverlayProps) {
  const isIndeterminate = conversionProgress.total === 0 && conversionProgress.current === 0;
  const isComplete = conversionProgress.total > 0 && conversionProgress.current === conversionProgress.total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-lg p-8 rounded shadow-xl text-center" style={{ backgroundColor: 'var(--bg-3)' }}>
        {!isComplete && (
          <div className="mb-4">
            <svg className="animate-spin mx-auto h-12 w-12" style={{ color: 'var(--accent-main)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-1)' }}>
          Preparing assets
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
          {conversionProgress.fileName}
        </p>
        {isIndeterminate && (
          <div className="w-full h-2 rounded-full mb-2 overflow-hidden" style={{ backgroundColor: 'var(--bg-1)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: '40%',
                backgroundColor: 'var(--accent-main)',
                animation: 'indeterminate 1.5s ease-in-out infinite',
              }}
            ></div>
            <style>{`
              @keyframes indeterminate {
                0% { transform: translateX(-100%); }
                50% { transform: translateX(150%); }
                100% { transform: translateX(-100%); }
              }
            `}</style>
          </div>
        )}
        {conversionProgress.total > 0 && (
          <>
            <div className="w-full h-2 rounded-full mb-2" style={{ backgroundColor: 'var(--bg-1)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(conversionProgress.current / conversionProgress.total) * 100}%`,
                  backgroundColor: 'var(--accent-main)',
                }}
              ></div>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-4)' }}>
              {conversionProgress.current} / {conversionProgress.total}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
