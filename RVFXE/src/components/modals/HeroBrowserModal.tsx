import { useState, useEffect, useCallback } from 'react';
import type { HeroEntry } from '@/types';
import * as tauri from '@/services/tauri';

// Module-level cache so icon data URLs persist across modal open/close cycles
const iconDataUrlCache: Record<string, string> = {};
const iconLoadedGlobal = new Set<string>();

interface HeroBrowserModalProps {
  onClose: () => void;
  onSelectHero: (heroId: string, heroName: string) => void;
  addDebugLog: (msg: string) => void;
}

export function HeroBrowserModal({ onClose, onSelectHero, addDebugLog }: HeroBrowserModalProps) {
  const [heroes, setHeroes] = useState<HeroEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [loadingVfx, setLoadingVfx] = useState(false);
  const [iconDataUrls, setIconDataUrls] = useState<Record<string, string>>({ ...iconDataUrlCache });

  // Load hero roster on mount
  useEffect(() => {
    const loadRoster = async () => {
      setLoading(true);
      setError(null);
      try {
        console.debug('[HeroBrowser] Loading hero roster...');
        addDebugLog('Loading hero roster from game files...');
        const result = await tauri.getHeroRoster(false);
        console.debug('[HeroBrowser] Roster result:', result);

        if (result.error) {
          setError(result.error);
          addDebugLog(`Hero roster error: ${result.error}`);
        } else {
          setHeroes(result.heroes);
          addDebugLog(`Loaded ${result.heroes.length} heroes${result.cached ? ' (cached)' : ''}`);
        }
      } catch (err) {
        const msg = String(err);
        console.error('[HeroBrowser] Failed to load roster:', err);
        setError(msg);
        addDebugLog(`Failed to load hero roster: ${msg}`);
      } finally {
        setLoading(false);
      }
    };
    loadRoster();
  }, [addDebugLog]);

  // Load icons lazily after roster is loaded
  useEffect(() => {
    if (heroes.length === 0) return;

    const loadIcons = async () => {
      const uncachedHeroes = heroes.filter(h => !iconLoadedGlobal.has(h.hero_id));
      if (uncachedHeroes.length === 0) return;

      try {
        addDebugLog(`Extracting ${uncachedHeroes.length} hero icons...`);
        await tauri.batchExtractHeroIcons(uncachedHeroes.map(h => h.hero_id));
      } catch (err) {
        console.error('[HeroBrowser] Batch extraction failed:', err);
      }

      const fetchPromises = uncachedHeroes.map(async (hero) => {
        try {
          const dataUrl = await tauri.getHeroIconDataUrl(hero.hero_id);
          if (dataUrl) {
            iconDataUrlCache[hero.hero_id] = dataUrl;
            iconLoadedGlobal.add(hero.hero_id);
            setIconDataUrls(prev => ({ ...prev, [hero.hero_id]: dataUrl }));
          }
        } catch (err) {
          console.debug(`[HeroBrowser] Icon data URL failed for ${hero.hero_id}:`, err);
        }
      });

      await Promise.all(fetchPromises);
    };

    loadIcons();
  }, [heroes]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHeroes([]);
    setIconDataUrls({});
    // Clear global cache on explicit refresh
    Object.keys(iconDataUrlCache).forEach(k => delete iconDataUrlCache[k]);
    iconLoadedGlobal.clear();
    try {
      addDebugLog('Refreshing hero roster (force)...');
      const result = await tauri.getHeroRoster(true);
      if (result.error) {
        setError(result.error);
      } else {
        setHeroes(result.heroes);
        addDebugLog(`Refreshed: ${result.heroes.length} heroes`);
      }
    } catch (err) {
      setError(String(err));
      addDebugLog(`Refresh failed: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [addDebugLog]);

  const handleLoadVfx = useCallback(async () => {
    if (!selectedHeroId) return;
    const hero = heroes.find(h => h.hero_id === selectedHeroId);
    if (!hero) return;

    setLoadingVfx(true);
    addDebugLog(`Loading VFX materials for ${hero.display_name} (${hero.hero_id})...`);
    console.debug('[HeroBrowser] Loading VFX for hero:', selectedHeroId);

    try {
      onSelectHero(hero.hero_id, hero.display_name);
    } catch (err) {
      addDebugLog(`Failed to load hero VFX: ${err}`);
      console.error('[HeroBrowser] VFX load error:', err);
    } finally {
      setLoadingVfx(false);
    }
  }, [selectedHeroId, heroes, onSelectHero, addDebugLog]);

  const filteredHeroes = heroes.filter(h => {
    const term = searchTerm.toLowerCase();
    return h.display_name.toLowerCase().includes(term) || h.hero_id.includes(term);
  });

  // Generate a consistent color from hero ID for placeholder
  const getHeroColor = (heroId: string): string => {
    const num = parseInt(heroId, 10) || 0;
    const hue = (num * 137) % 360;
    return `hsl(${hue}, 60%, 35%)`;
  };

  const getInitials = (name: string): string => {
    return name
      .split(/\s+/)
      .map(w => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full h-full max-h-[95vh] flex flex-col shadow-xl border-2 relative" style={{ backgroundColor: 'var(--bg-3)', borderColor: 'var(--bg-2)' }}>

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: 'var(--bg-2)' }}>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Hero VFX Browser</h2>
            <span className="text-sm px-2 py-0.5" style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-4)' }}>
              {heroes.length} heroes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh roster from game files"
              className="p-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
              style={{ color: 'var(--text-2)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transform hover:scale-125 transition-transform duration-200" style={{ color: 'var(--text-2)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--bg-2)' }}>
          <input
            type="text"
            placeholder="Search heroes by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-none focus:outline-none focus:ring-2 text-sm"
            style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--text-2)' }}
            autoFocus
          />
        </div>

        {/* Hero Grid */}
        <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mb-4" style={{ borderColor: 'var(--accent-main)', borderTopColor: 'transparent' }}></div>
              <p className="text-sm" style={{ color: 'var(--text-4)' }}>Loading hero roster from game files...</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>This may take a moment on first load</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4" style={{ color: 'var(--accent-warning, #f59e0b)' }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-center max-w-md" style={{ color: 'var(--text-3)' }}>{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 text-sm font-medium rounded-none"
                style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}
              >
                Retry
              </button>
            </div>
          ) : filteredHeroes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm" style={{ color: 'var(--text-4)' }}>
                {searchTerm ? 'No heroes match your search.' : 'No heroes found.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 auto-rows-min">
              {filteredHeroes.map((hero) => {
                const isSelected = selectedHeroId === hero.hero_id;
                const iconDataUrl = iconDataUrls[hero.hero_id];

                return (
                  <button
                    key={hero.hero_id}
                    onClick={() => setSelectedHeroId(isSelected ? null : hero.hero_id)}
                    onDoubleClick={() => {
                      setSelectedHeroId(hero.hero_id);
                      handleLoadVfx();
                    }}
                    className="flex flex-col items-center p-1 transition-all duration-150 border-2 group text-xs"
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-1)' : 'var(--bg-2)',
                      borderColor: isSelected ? 'var(--accent-main)' : 'transparent',
                    }}
                  >
                    {/* Icon / Placeholder */}
                    <div
                      className="w-full aspect-square mb-1 flex items-center justify-center overflow-hidden relative"
                      style={{ backgroundColor: iconDataUrl ? undefined : getHeroColor(hero.hero_id) }}
                    >
                      {iconDataUrl ? (
                        <>
                          {/* Blurred bg layer */}
                          <img
                            src={iconDataUrl}
                            alt=""
                            aria-hidden
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ filter: 'blur(32px) brightness(0.8) saturate(4)', transform: 'scale(2.5)' }}
                          />
                          {/* Foreground icon */}
                          <img
                            key={iconDataUrl}
                            src={iconDataUrl}
                            alt={hero.display_name}
                            className="w-full h-full object-cover relative z-10"
                          />
                        </>
                      ) : null}
                      <span
                        className={`text-xl font-bold text-white/80 ${iconDataUrl ? 'hidden' : ''}`}
                      >
                        {getInitials(hero.display_name)}
                      </span>
                    </div>

                    {/* Name */}
                    <span className="text-xs font-medium text-center leading-tight truncate w-full" style={{ color: 'var(--text-2)' }}>
                      {hero.display_name}
                    </span>

                    {/* ID badge */}
                    <span className="text-[9px] opacity-60 leading-tight" style={{ color: 'var(--text-4)' }}>
                      {hero.hero_id}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: 'var(--bg-2)' }}>
          <div className="text-sm" style={{ color: 'var(--text-4)' }}>
            {selectedHeroId ? (
              <span>
                Selected: <strong style={{ color: 'var(--text-2)' }}>
                  {heroes.find(h => h.hero_id === selectedHeroId)?.display_name}
                </strong>
                <span className="ml-1 opacity-60">({selectedHeroId})</span>
              </span>
            ) : (
              <span>Click a hero to select, double-click to load VFX</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium rounded-none"
              style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-2)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleLoadVfx}
              disabled={!selectedHeroId || loadingVfx}
              className="px-6 py-2 text-sm font-medium rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}
            >
              {loadingVfx ? 'Loading...' : 'Load VFX Materials'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
