interface ToggleSwitchProps {
  label: string;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
}

export function ToggleSwitch({ label, enabled, setEnabled }: ToggleSwitchProps) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-sm" style={{ color: 'var(--text-3)' }}>{label}</span>
      <div className="relative">
        <input type="checkbox" className="sr-only peer" checked={enabled} onChange={() => setEnabled(!enabled)} />
        <div className="block w-14 h-8 transition-colors" style={{ backgroundColor: enabled ? 'var(--accent-main)' : 'var(--bg-1)' }}></div>
        <div className="absolute left-1 top-1 w-6 h-6 flex items-center justify-center transition-transform peer-checked:translate-x-full"
          style={{
            backgroundColor: 'var(--bg-4)',
            transform: enabled ? 'translateX(1.5rem)' : 'translateX(0)',
          }}>
          <svg className={`w-4 h-4 ${enabled ? 'hidden' : 'block'}`} style={{ color: 'var(--text-4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <svg className={`w-5 h-5 ${enabled ? 'block' : 'hidden'}`} style={{ color: 'var(--accent-main)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
      </div>
    </label>
  );
}
