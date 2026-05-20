import type { ColorParam, RGBA, RGBNormalized } from '@/types';
import { ToggleSwitch } from '@/components/ui';

interface GlobalControlsProps {
  masterColor: string;
  setMasterColor: (c: string) => void;
  hueShiftValue: number;
  setHueShiftValue: (v: number) => void;
  useFiveColors: boolean;
  setUseFiveColors: (v: boolean) => void;
  shuffleColors: string[];
  onShuffleColorChange: (index: number, color: string) => void;
  preserveIntensity: boolean;
  setPreserveIntensity: (v: boolean) => void;
  ignoreGrayscale: boolean;
  setIgnoreGrayscale: (v: boolean) => void;
  brightnessMultiplier: number;
  setBrightnessMultiplier: (v: number) => void;
  selectedCount: number;
  onApplyMasterColor: () => void;
  onApplyHueShift: () => void;
  onApplyShuffle: () => void;
  onApplyBrightnessMultiplier: () => void;
}

export function GlobalControls({
  masterColor, setMasterColor,
  hueShiftValue, setHueShiftValue,
  useFiveColors, setUseFiveColors,
  shuffleColors, onShuffleColorChange,
  preserveIntensity, setPreserveIntensity,
  ignoreGrayscale, setIgnoreGrayscale,
  brightnessMultiplier, setBrightnessMultiplier,
  selectedCount,
  onApplyMasterColor, onApplyHueShift, onApplyShuffle, onApplyBrightnessMultiplier,
}: GlobalControlsProps) {
  const isDisabled = selectedCount === 0;

  return (
    <div className="flex flex-col space-y-6">
      {/* Single Color */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium" style={{ color: 'var(--text-2)' }}>Single Color</h3>
        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-center gap-2">
            <input
              type="color"
              value={masterColor}
              onChange={(e) => setMasterColor(e.target.value)}
              className="w-12 h-12 p-0 border-0 rounded-none cursor-pointer" style={{ backgroundColor: 'transparent' }}
            />
            <input
              type="text"
              value={masterColor.toUpperCase()}
              onChange={(e) => setMasterColor(e.target.value)}
              className="w-20 px-1 py-0.5 text-xs text-center font-mono focus:outline-none border-2 rounded-none"
              style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-2)', borderColor: 'var(--bg-2)' }}
              maxLength={7}
            />
          </div>
          <button onClick={onApplyMasterColor} className="flex-grow px-4 py-3 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }} disabled={isDisabled}>
            Apply Single
          </button>
        </div>
      </div>

      {/* Hue Shift */}
      <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--bg-2)' }}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium" style={{ color: 'var(--text-2)' }}>Hue Shift</h3>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="-180"
              max="180"
              value={hueShiftValue}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setHueShiftValue(Number.isNaN(val) ? 0 : Math.max(-180, Math.min(180, val)));
              }}
              className="w-16 px-1 py-0.5 text-center font-mono text-sm focus:outline-none border-2 rounded-none"
              style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-2)', borderColor: 'var(--bg-2)' }}
            />
            <span className="text-sm opacity-60" style={{ color: 'var(--text-3)' }}>&deg;</span>
          </div>
        </div>
        <div>
          <input id="hue-shift" type="range" min="-180" max="180" value={hueShiftValue}
            onChange={(e) => setHueShiftValue(parseInt(e.target.value))}
            onDoubleClick={() => setHueShiftValue(0)}
            className="w-full h-2 rounded-none appearance-none cursor-pointer" />
        </div>
        <button onClick={onApplyHueShift} className="w-full px-4 py-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }} disabled={isDisabled}>
          Apply Hue Shift
        </button>
      </div>

      {/* Color Shuffle */}
      <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--bg-2)' }}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium" style={{ color: 'var(--text-2)' }}>Color Shuffle</h3>
          <ToggleSwitch label="5 Colors" enabled={useFiveColors} setEnabled={setUseFiveColors} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex justify-around items-center">
            {shuffleColors.slice(0, 3).map((color, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <input type="color" value={color} onChange={(e) => onShuffleColorChange(index, e.target.value)} className="w-12 h-12 p-0 border-0 rounded-none cursor-pointer" style={{ backgroundColor: 'transparent' }} />
                <input type="text" value={color.toUpperCase()} onChange={(e) => onShuffleColorChange(index, e.target.value)} className="w-20 px-1 py-0.5 text-xs text-center font-mono focus:outline-none border-2 rounded-none" style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-2)', borderColor: 'var(--bg-2)' }} maxLength={7} />
              </div>
            ))}
          </div>
          {useFiveColors && (
            <div className="flex justify-center gap-8 items-center">
              {shuffleColors.slice(3).map((color, index) => (
                <div key={index + 3} className="flex flex-col items-center gap-2">
                  <input type="color" value={color} onChange={(e) => onShuffleColorChange(index + 3, e.target.value)} className="w-12 h-12 p-0 border-0 rounded-none cursor-pointer" style={{ backgroundColor: 'transparent' }} />
                  <input type="text" value={color.toUpperCase()} onChange={(e) => onShuffleColorChange(index + 3, e.target.value)} className="w-20 px-1 py-0.5 text-xs text-center font-mono focus:outline-none border-2 rounded-none" style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-2)', borderColor: 'var(--bg-2)' }} maxLength={7} />
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={onApplyShuffle} className="w-full px-4 py-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }} disabled={isDisabled}>
          Apply Shuffle
        </button>
      </div>

      {/* Brightness Multiplier */}
      <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--bg-2)' }}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium" style={{ color: 'var(--text-2)' }}>Brightness Multiplier</h3>
          <div className="flex items-center gap-1">
            <span className="text-sm opacity-60" style={{ color: 'var(--text-3)' }}>x</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={Number(brightnessMultiplier.toFixed(2))}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setBrightnessMultiplier(Number.isNaN(val) ? 1.0 : Math.max(0, Math.min(100, val)));
              }}
              className="w-20 px-1 py-0.5 text-center font-mono text-sm focus:outline-none border-2 rounded-none"
              style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-2)', borderColor: 'var(--bg-2)' }}
            />
          </div>
        </div>
        <div>
          {/* Mapping: 0-25% => 0x-1x, 25-100% => 1x-100x */}
          <input type="range" min="0" max="100" step="0.1" 
            value={brightnessMultiplier <= 1 ? brightnessMultiplier * 25 : 25 + (brightnessMultiplier - 1) * (75 / 99)}
            onChange={(e) => {
              const s = parseFloat(e.target.value);
              const val = s <= 25 ? s / 25 : 1 + (s - 25) * (99 / 75);
              setBrightnessMultiplier(val);
            }}
            onDoubleClick={() => setBrightnessMultiplier(1.0)}
            className="w-full h-2 rounded-none appearance-none cursor-pointer" />
        </div>
        <button onClick={onApplyBrightnessMultiplier} className="w-full px-4 py-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }} disabled={isDisabled}>
          Apply Brightness
        </button>
      </div>

      {/* Toggles */}
      <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--bg-2)' }}>
        <ToggleSwitch label="Preserve Intensity (Recommended)" enabled={preserveIntensity} setEnabled={setPreserveIntensity} />
        <ToggleSwitch label="Ignore Grayscale (R=G=B)" enabled={ignoreGrayscale} setEnabled={setIgnoreGrayscale} />
      </div>
    </div>
  );
}
