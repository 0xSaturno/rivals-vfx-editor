import { useState, useRef, useCallback, useMemo } from 'react';
import type { ColorParam } from '@/types';
import { rgbToHsl } from '@/utils/color';

interface LumaRangeFilterProps {
  colorParams: ColorParam[];
  lumaRange: [number, number];
  onLumaRangeChange: (range: [number, number]) => void;
}

export function LumaRangeFilter({ colorParams, lumaRange, onLumaRangeChange }: LumaRangeFilterProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);

  const lumaStops = useMemo(() => {
    const counts = new Array(50).fill(0);
    for (const p of colorParams) {
      const [_, __, l] = rgbToHsl(p.rgba.R, p.rgba.G, p.rgba.B);
      const bucket = Math.min(Math.floor(l * 50), 49);
      counts[bucket]++;
    }
    return counts;
  }, [colorParams]);

  const maxCount = Math.max(...lumaStops, 1);

  const getLumaFromX = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * 100);
  }, []);

  const handlePointerDown = useCallback((pin: 'min' | 'max') => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(pin);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const luma = getLumaFromX(e.clientX);
    if (dragging === 'min') {
      onLumaRangeChange([Math.min(luma, lumaRange[1]), lumaRange[1]]);
    } else {
      onLumaRangeChange([lumaRange[0], Math.max(luma, lumaRange[0])]);
    }
  }, [dragging, lumaRange, getLumaFromX, onLumaRangeChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const minPct = lumaRange[0];
  const maxPct = lumaRange[1];
  const isFiltering = lumaRange[0] !== 0 || lumaRange[1] !== 100;

  const filteredCount = useMemo(() => {
    if (!isFiltering) return colorParams.length;
    let count = 0;
    for (const p of colorParams) {
      const [_, __, l] = rgbToHsl(p.rgba.R, p.rgba.G, p.rgba.B);
      const lumaPct = l * 100;
      if (lumaPct >= lumaRange[0] && lumaPct <= lumaRange[1]) count++;
    }
    return count;
  }, [colorParams, lumaRange, isFiltering]);

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>
          Luma Range: {lumaRange[0]}% – {lumaRange[1]}%
          <span className="ml-2" style={{ color: 'var(--text-3)' }}>
            ({filteredCount}/{colorParams.length} values)
          </span>
        </span>
        {isFiltering && (
          <button
            onClick={() => onLumaRangeChange([0, 100])}
            className="text-xs px-1"
            style={{ color: 'var(--accent-main)' }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Histogram */}
      <div className="flex items-end gap-px w-full" style={{ height: '24px' }}>
        {lumaStops.map((count, i) => {
          const lumaVal = (i / 50) * 100;
          const height = count > 0 ? Math.max(15, (count / maxCount) * 100) : 0;
          const inRange = lumaVal >= lumaRange[0] && lumaVal <= lumaRange[1];
          const brightness = Math.round((i / 50) * 200 + 40); // 40-240 scale for visibility
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${height}%`,
                backgroundColor: `rgb(${brightness}, ${brightness}, ${brightness})`,
                opacity: count === 0 ? 0 : inRange ? 1 : 0.2,
              }}
            />
          );
        })}
      </div>

      {/* Gradient track + pins */}
      <div
        ref={trackRef}
        className="relative w-full"
        style={{ height: '20px' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Full luma gradient */}
        <div
          className="absolute inset-x-0 top-0 rounded-sm"
          style={{
            height: '8px',
            background: 'linear-gradient(to right, #000000, #ffffff)',
          }}
        />
        {/* Dim overlay left */}
        <div
          className="absolute top-0 left-0 rounded-sm"
          style={{ height: '8px', width: `${minPct}%`, backgroundColor: 'rgba(0,0,0,0.7)' }}
        />
        {/* Dim overlay right */}
        <div
          className="absolute top-0 right-0 rounded-sm"
          style={{ height: '8px', width: `${100 - maxPct}%`, backgroundColor: 'rgba(0,0,0,0.7)' }}
        />
        {/* Min pin */}
        <div
          onPointerDown={handlePointerDown('min')}
          className="absolute cursor-ew-resize"
          style={{
            left: `${minPct}%`,
            top: '6px',
            bottom: '6px',
            width: 0,
            height: 0,
            transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '10px solid var(--text-1)',
          }}
        />
        {/* Max pin */}
        <div
          onPointerDown={handlePointerDown('max')}
          className="absolute cursor-ew-resize"
          style={{
            left: `${maxPct}%`,
            top: '6px',
            bottom: '6px',
            width: 0,
            height: 0,
            transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '10px solid var(--text-1)',
          }}
        />
      </div>
    </div>
  );
}
