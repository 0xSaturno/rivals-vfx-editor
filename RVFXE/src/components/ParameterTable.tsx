import { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from 'react';
import type { ColorParam, RGBA, SortConfig } from '@/types';
import { rgbaToDisplayHex, hexToRgba, rgbToHsl, hslToRgb, applyColorToParam } from '@/utils/color';
import { EditableHexInput } from '@/components/ui';

/**
 * The table is virtualized: only the rows inside the viewport (plus a small
 * overscan) are mounted, with two spacer rows standing in for everything above
 * and below. Rendering all ~10k rows means ~60k live <input> elements, which
 * stalls both layout and every subsequent React commit.
 *
 * Virtualization needs a uniform row height, so the first mounted row is
 * measured and reused for the spacer maths. Column widths are pinned via
 * `table-layout: fixed` + <colgroup> so the columns do not jump around as the
 * mounted slice changes.
 */
const ESTIMATED_ROW_HEIGHT = 65;
const OVERSCAN = 6;
const COLUMN_WIDTHS = [48, 520, 260, 200, 120, 120, 120, 120];
const TABLE_MIN_WIDTH = COLUMN_WIDTHS.reduce((sum, w) => sum + w, 0);

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

interface ParameterRowProps {
  param: ColorParam;
  isSelected: boolean;
  hueShiftValue: number;
  ignoreGrayscale: boolean;
  preserveIntensity: boolean;
  onSelectionChange: (id: string) => void;
  onParamChange: (id: string, newRgba: RGBA) => void;
  onRowMouseDown: (e: React.MouseEvent, id: string) => void;
  onRowMouseEnter: (e: React.MouseEvent, id: string) => void;
  measureRef?: React.Ref<HTMLTableRowElement>;
}

const CHANNELS = ['R', 'G', 'B', 'A'] as const;

const ParameterRow = memo(function ParameterRow({
  param: p, isSelected, hueShiftValue, ignoreGrayscale, preserveIntensity,
  onSelectionChange, onParamChange, onRowMouseDown, onRowMouseEnter, measureRef,
}: ParameterRowProps) {
  let displayRgba = p.rgba;
  let isPreviewing = false;

  if (isSelected && hueShiftValue !== 0) {
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
  const displayPath = p.relativePath.replace(/\.json$/i, '');

  return (
    <tr
      ref={measureRef}
      onMouseDown={(e) => onRowMouseDown(e, p.id)}
      onMouseEnter={(e) => onRowMouseEnter(e, p.id)}
      className="hover:bg-opacity-50 cursor-pointer"
      style={{ borderBottom: '1px solid var(--bg-2)', backgroundColor: isPreviewing ? 'rgba(204, 255, 255, 0.05)' : 'transparent' }}
    >
      <td className="p-0">
        <label className="flex items-center justify-center cursor-pointer w-full h-full">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelectionChange(p.id)}
            className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0"
            style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }}
          />
        </label>
      </td>
      <td className="px-6 py-4 font-medium whitespace-nowrap overflow-hidden text-ellipsis" title={displayPath} style={{ color: 'var(--text-2)' }}>{displayPath}</td>
      <td className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis" title={p.paramName}>{p.paramName}</td>
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
      {CHANNELS.map(channel => (
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
});

function SortArrow({ sortConfig, columnKey }: { sortConfig: SortConfig; columnKey: string }) {
  if (sortConfig.key !== columnKey) return null;
  return <span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>;
}

export function ParameterTable({
  filteredParams, selectedParams, hueShiftValue, ignoreGrayscale, preserveIntensity,
  sortConfig, onSelectionChange, onSelectAll, onParamChange, onRequestSort,
}: ParameterTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLTableSectionElement>(null);
  const firstRowRef = useRef<HTMLTableRowElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [rowHeight, setRowHeight] = useState(ESTIMATED_ROW_HEIGHT);

  // Latest props behind refs so the row callbacks below can stay referentially
  // stable - otherwise every mounted row re-renders on each parent render and
  // the memo() above buys nothing.
  const selectedParamsRef = useRef(selectedParams);
  selectedParamsRef.current = selectedParams;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const onParamChangeRef = useRef(onParamChange);
  onParamChangeRef.current = onParamChange;

  const dragActiveRef = useRef(false);
  const dragModeRef = useRef<'select' | 'deselect' | null>(null);

  useEffect(() => {
    const endDrag = () => {
      dragActiveRef.current = false;
      dragModeRef.current = null;
    };
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('blur', endDrag);
    return () => {
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('blur', endDrag);
    };
  }, []);

  // --- viewport / header measurement ---
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      setViewportHeight(el.clientHeight);
      if (headRef.current) setHeaderHeight(headRef.current.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Row height is content-driven (padding, font size, browser zoom), so read it
  // off the first mounted row instead of hardcoding it.
  useLayoutEffect(() => {
    const el = firstRowRef.current;
    if (!el) return;
    const measured = el.getBoundingClientRect().height;
    if (measured > 0 && Math.abs(measured - rowHeight) > 0.5) setRowHeight(measured);
  });

  const rafRef = useRef(0);
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
    });
  }, []);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const total = filteredParams.length;

  // Filtering/sorting can shrink the list under the current scroll offset; the
  // browser clamps scrollTop silently, so re-sync it rather than render a slice
  // that no longer exists.
  useEffect(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  }, [total]);

  const handleRowMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('.editable-hex-input') ||
      target.closest('a') ||
      target.closest('label')
    ) {
      return;
    }
    // Prevent browser text highlight while dragging
    e.preventDefault();

    const isSelected = selectedParamsRef.current.has(id);
    dragActiveRef.current = true;
    dragModeRef.current = isSelected ? 'deselect' : 'select';
    onSelectionChangeRef.current(id);
  }, []);

  const handleRowMouseEnter = useCallback((e: React.MouseEvent, id: string) => {
    if ((e.buttons & 1) !== 1) {
      dragActiveRef.current = false;
      dragModeRef.current = null;
      return;
    }
    if (!dragActiveRef.current || !dragModeRef.current) return;
    const isSelected = selectedParamsRef.current.has(id);
    if (dragModeRef.current === 'select' && !isSelected) {
      onSelectionChangeRef.current(id);
    } else if (dragModeRef.current === 'deselect' && isSelected) {
      onSelectionChangeRef.current(id);
    }
  }, []);

  const handleSelectionChange = useCallback((id: string) => onSelectionChangeRef.current(id), []);
  const handleParamChange = useCallback((id: string, rgba: RGBA) => onParamChangeRef.current(id, rgba), []);

  const startIndex = Math.max(0, Math.floor((scrollTop - headerHeight) / rowHeight) - OVERSCAN);
  const visibleCount = Math.ceil((viewportHeight || ESTIMATED_ROW_HEIGHT * 12) / rowHeight) + OVERSCAN * 2;
  const endIndex = Math.min(total, startIndex + visibleCount);
  const visibleParams = filteredParams.slice(startIndex, endIndex);
  const topSpacer = startIndex * rowHeight;
  const bottomSpacer = Math.max(0, (total - endIndex) * rowHeight);

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="overflow-x-auto flex-1 min-h-0" style={{ overflowY: 'auto' }}>
      <table className="text-sm text-left" style={{ tableLayout: 'fixed', width: '100%', minWidth: TABLE_MIN_WIDTH }}>
        <colgroup>
          {COLUMN_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
        </colgroup>
        <thead ref={headRef} style={{ color: 'var(--text-4)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-4)', zIndex: 10 }}>
          <tr style={{ borderBottom: '2px solid var(--bg-2)' }}>
            <th scope="col" className="p-4">
              <input type="checkbox" onChange={onSelectAll} checked={total > 0 && selectedParams.size === total} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }} />
            </th>
            <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider cursor-pointer" onClick={() => onRequestSort('path')}>
              <div className="flex items-center gap-2"><span>Path</span><SortArrow sortConfig={sortConfig} columnKey="path" /></div>
            </th>
            <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider cursor-pointer" onClick={() => onRequestSort('paramName')}>
              <div className="flex items-center gap-2"><span>Parameter Name</span><SortArrow sortConfig={sortConfig} columnKey="paramName" /></div>
            </th>
            <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider cursor-pointer" onClick={() => onRequestSort('color')}>
              <div className="flex items-center gap-2"><span>Color</span><SortArrow sortConfig={sortConfig} columnKey="color" /></div>
            </th>
            <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">R</th>
            <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">G</th>
            <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">B</th>
            <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">A</th>
          </tr>
        </thead>
        <tbody>
          {topSpacer > 0 && (
            <tr aria-hidden="true"><td colSpan={COLUMN_WIDTHS.length} style={{ height: topSpacer, padding: 0, border: 'none' }} /></tr>
          )}
          {visibleParams.map((p, i) => (
            <ParameterRow
              key={p.id}
              param={p}
              isSelected={selectedParams.has(p.id)}
              hueShiftValue={hueShiftValue}
              ignoreGrayscale={ignoreGrayscale}
              preserveIntensity={preserveIntensity}
              onSelectionChange={handleSelectionChange}
              onParamChange={handleParamChange}
              onRowMouseDown={handleRowMouseDown}
              onRowMouseEnter={handleRowMouseEnter}
              measureRef={i === 0 ? firstRowRef : undefined}
            />
          ))}
          {bottomSpacer > 0 && (
            <tr aria-hidden="true"><td colSpan={COLUMN_WIDTHS.length} style={{ height: bottomSpacer, padding: 0, border: 'none' }} /></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
