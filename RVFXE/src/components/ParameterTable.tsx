import type { ColorParam, RGBA, SortConfig } from '@/types';
import { rgbaToDisplayHex, hexToRgba, rgbToHsl, hslToRgb, applyColorToParam } from '@/utils/color';
import { EditableHexInput } from '@/components/ui';

interface ParameterTableProps {
  filteredParams: ColorParam[];
  selectedParams: Set<string>;
  hueShiftValue: number;
  ignoreGrayscale: boolean;
  preserveIntensity: boolean;
  sortConfig: SortConfig;
  onSelectionChange: (id: string) => void;
  onSelectAll: () => void;
  onParamChange: (id: string, newRgba: RGBA) => void;
  onRequestSort: (key: string) => void;
}

export function ParameterTable({
  filteredParams, selectedParams, hueShiftValue, ignoreGrayscale, preserveIntensity,
  sortConfig, onSelectionChange, onSelectAll, onParamChange, onRequestSort,
}: ParameterTableProps) {
  return (
    <div className="overflow-x-auto flex-1" style={{ maxHeight: 'calc(100vh - 35rem)', overflowY: 'auto' }}>
      <table className="w-full text-sm text-left">
        <thead style={{ color: 'var(--text-4)' }}>
          <tr style={{ borderBottom: '2px solid var(--bg-2)' }}>
            <th scope="col" className="p-4">
              <input type="checkbox" onChange={onSelectAll} checked={filteredParams.length > 0 && selectedParams.size === filteredParams.length} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }} />
            </th>
            <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider cursor-pointer" onClick={() => onRequestSort('path')}>
              <div className="flex items-center gap-2">
                <span>Path</span>
                {sortConfig.key === 'path' && sortConfig.direction === 'ascending' && <span>&#9650;</span>}
                {sortConfig.key === 'path' && sortConfig.direction === 'descending' && <span>&#9660;</span>}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider cursor-pointer" onClick={() => onRequestSort('paramName')}>
              <div className="flex items-center gap-2">
                <span>Parameter Name</span>
                {sortConfig.key === 'paramName' && sortConfig.direction === 'ascending' && <span>&#9650;</span>}
                {sortConfig.key === 'paramName' && sortConfig.direction === 'descending' && <span>&#9660;</span>}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider cursor-pointer" onClick={() => onRequestSort('color')}>
              <div className="flex items-center gap-2">
                <span>Color</span>
                {sortConfig.key === 'color' && sortConfig.direction === 'ascending' && <span>&#9650;</span>}
                {sortConfig.key === 'color' && sortConfig.direction === 'descending' && <span>&#9660;</span>}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">R</th>
            <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">G</th>
            <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">B</th>
            <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">A</th>
          </tr>
        </thead>
        <tbody>
          {filteredParams.map(p => {
            let displayRgba = p.rgba;
            let isPreviewing = false;

            if (selectedParams.has(p.id) && hueShiftValue !== 0) {
              const isGrayscale = p.rgba.R === p.rgba.G && p.rgba.G === p.rgba.B;
              if (!(ignoreGrayscale && isGrayscale)) {
                isPreviewing = true;
                const originalIntensity = Math.max(p.rgba.R, p.rgba.G, p.rgba.B);
                const [h, s, l] = rgbToHsl(p.rgba.R, p.rgba.G, p.rgba.B);
                let newHue = h + (hueShiftValue / 360);
                if (newHue < 0) newHue += 1;
                if (newHue > 1) newHue -= 1;
                const [r, g, b] = hslToRgb(newHue, s, l);
                displayRgba = { ...p.rgba, R: r * originalIntensity, G: g * originalIntensity, B: b * originalIntensity };
              }
            }

            const displayHexColor = rgbaToDisplayHex(displayRgba.R, displayRgba.G, displayRgba.B);

            return (
              <tr key={p.id} className="hover:bg-opacity-50" style={{ borderBottom: '1px solid var(--bg-2)', backgroundColor: isPreviewing ? 'rgba(204, 255, 255, 0.05)' : 'transparent' }}>
                <td className="w-4 p-4">
                  <input
                    type="checkbox"
                    checked={selectedParams.has(p.id)}
                    onChange={() => onSelectionChange(p.id)}
                    className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0"
                    style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }}
                  />
                </td>
                <td className="px-6 py-4 font-medium whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{p.relativePath.replace(/\.json$/i, '')}</td>
                <td className="px-6 py-4">{p.paramName}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={displayHexColor}
                      onChange={(e) => {
                        const newColorRgba = hexToRgba(e.target.value);
                        const finalRgba = applyColorToParam(p.rgba, newColorRgba, { preserveIntensity, ignoreGrayscale, ignoreGrayscaleCheck: true });
                        onParamChange(p.id, finalRgba);
                      }}
                      className="w-8 h-8 p-0 border-2 cursor-pointer"
                      style={{ backgroundColor: 'transparent', borderColor: 'var(--bg-1)' }}
                    />
                    <EditableHexInput
                      initialHex={displayHexColor}
                      onCommit={(newHex) => {
                        const newColorRgba = hexToRgba(newHex);
                        const finalRgba = applyColorToParam(p.rgba, newColorRgba, { preserveIntensity, ignoreGrayscale, ignoreGrayscaleCheck: true });
                        onParamChange(p.id, finalRgba);
                      }}
                    />
                  </div>
                </td>
                {(['R', 'G', 'B', 'A'] as const).map(channel => (
                  <td key={channel} className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={(Number(p.rgba[channel]) || 0).toFixed(4)}
                      onChange={(e) => onParamChange(p.id, { ...p.rgba, [channel]: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 rounded-none text-center focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--text-2)' }}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
