import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { ColorParam } from '@/types';
import { rgbToHsl } from '@/utils/color';

interface ColorRangeFilterProps {
  colorParams: ColorParam[];
  hueRange: [number, number];
  onHueRangeChange: (range: [number, number]) => void;
}

export function ColorRangeFilter({ colorParams, hueRange, onHueRangeChange }: ColorRangeFilterProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);

  const hueStops = useMemo(() => {
    const counts = new Array(36).fill(0);
    for (const p of colorParams) {
      const [h, s] = rgbToHsl(p.rgba.R, p.rgba.G, p.rgba.B);
      if (s < 0.05) continue;
      const bucket = Math.min(Math.floor(h * 36), 35);
      counts[bucket]++;
    }
    return counts;
  }, [colorParams]);

  const maxCount = Math.max(...hueStops, 1);

  const getHueFromX = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * 360);
  }, []);

  const handlePointerDown = useCallback((pin: 'min' | 'max') => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(pin);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const hue = getHueFromX(e.clientX);
    if (dragging === 'min') {
      onHueRangeChange([Math.min(hue, hueRange[1]), hueRange[1]]);
    } else {
      onHueRangeChange([hueRange[0], Math.max(hue, hueRange[0])]);
    }
  }, [dragging, hueRange, getHueFromX, onHueRangeChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const minPct = (hueRange[0] / 360) * 100;
  const maxPct = (hueRange[1] / 360) * 100;
  const isFiltering = hueRange[0] !== 0 || hueRange[1] !== 360;

  const filteredCount = useMemo(() => {
    if (!isFiltering) return colorParams.length;
    let count = 0;
    for (const p of colorParams) {
      const [h, s] = rgbToHsl(p.rgba.R, p.rgba.G, p.rgba.B);
      if (s < 0.05) {
        count++;
        continue;
      }
      const hueDeg = h * 360;
      if (hueDeg >= hueRange[0] && hueDeg <= hueRange[1]) count++;
    }
    return count;
  }, [colorParams, hueRange, isFiltering]);

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>
          Hue Range: {hueRange[0]}° – {hueRange[1]}°
          <span className="ml-2" style={{ color: 'var(--text-3)' }}>
            ({filteredCount}/{colorParams.length} color values)
          </span>
        </span>
        {isFiltering && (
          <button
            onClick={() => onHueRangeChange([0, 360])}
            className="text-xs px-1"
            style={{ color: 'var(--accent-main)' }}
          >
            Reset
          </button>
        )}
      </div>
      {/* Histogram */}
      <div className="flex items-end gap-px w-full" style={{ height: '24px' }}>
        {hueStops.map((count, i) => {
          const hue = (i / 36) * 360;
          const height = count > 0 ? Math.max(15, (count / maxCount) * 100) : 0;
          const inRange = hue >= hueRange[0] && hue <= hueRange[1] - 10;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${height}%`,
                backgroundColor: `hsl(${hue}, 70%, 50%)`,
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
        {/* Full hue gradient */}
        <div
          className="absolute inset-x-0 top-0 rounded-sm"
          style={{
            height: '8px',
            background: 'linear-gradient(to right, hsl(0,80%,50%), hsl(60,80%,50%), hsl(120,80%,50%), hsl(180,80%,50%), hsl(240,80%,50%), hsl(300,80%,50%), hsl(360,80%,50%))',
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
