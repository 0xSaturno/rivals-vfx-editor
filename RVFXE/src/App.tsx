import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  ColorParam, RGBA, AppSettings, CacheInfo, ConversionProgress,
  FilterDictionary, SortConfig, UassetSourceMap, FileObject, UassetFileRef, SessionEntry,
  UsmapStatus,
} from '@/types';

import { useHistory } from '@/hooks/useHistory';
import { useDebugLog } from '@/hooks/useDebugLog';
import { useKeyboard } from '@/hooks/useKeyboard';

import { hexToRgba, applyColorToParam, applyHueShiftToRgba, rgbToHsl } from '@/utils/color';
import { setNestedValue, getFileName, normalizePath, pathsMatchSuffix } from '@/utils/helpers';
import { parseJsonAndExtractColors } from '@/services/colorParser';
import * as tauri from '@/services/tauri';

import { Header } from '@/components/Header';
import { DebugConsole } from '@/components/DebugConsole';
import { GlobalControls } from '@/components/GlobalControls';
import { ParameterTable } from '@/components/ParameterTable';
import { ColorRangeFilter } from '@/components/ColorRangeFilter';
import { LumaRangeFilter } from '@/components/LumaRangeFilter';
import { LoadFilesPanel } from '@/components/LoadFilesPanel';
import { StyledPanel } from '@/components/ui';
import { SettingsModal, FilterSettingsModal, ConversionProgressOverlay, HeroBrowserModal } from '@/components/modals';

import '../css/tailwind.min.css';
import '../css/fonts.css';
import '../css/style.css';

const DEFAULT_FILTER_DICTIONARY: FilterDictionary = {
  include_keywords: ['color', 'tint', 'Enemy', 'Emiss', 'Diff'],
  exclude_keywords: ['Offset', 'uv', 'ColorMaskChannel', 'MaskColor_Enemy'],
  color_property_names: [
    'ColorAndOpacity', 'SpecifiedColor', 'BaseColor', 'HighlightColor',
    'FontTopColor', 'FontButtomColor', 'VectorParameter', 'ShadowColor',
    'ContentColor', 'OutlineColor', 'Color', 'TextColor', 'BackgroundColor',
  ],
};

export function App() {
  // === CORE STATE ===
  const history = useHistory();
  const debug = useDebugLog();
  const { colorParams, recordHistory, handleUndo, handleRedo, historyIndex, historyLength, resetHistory, setInitialHistory } = history;

  const selectAllRef = useRef<() => void>();
  const keyboard = useKeyboard(handleUndo, handleRedo, () => selectAllRef.current?.());

  const [originalFiles, setOriginalFiles] = useState<Record<string, any>>({});
  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [masterColor, setMasterColor] = useState('#ffffff');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // === FILTER/DISPLAY STATE ===
  const [ignoreGrayscale, setIgnoreGrayscale] = useState(true);
  const [preserveIntensity, setPreserveIntensity] = useState(true);
  const [showGrayscale, setShowGrayscale] = useState(true);
  const [showColor, setShowColor] = useState(true);
  const [showEnemy, setShowEnemy] = useState(true);
  const [hueShiftValue, setHueShiftValue] = useState(0);
  const [hueRange, setHueRange] = useState<[number, number]>([0, 360]);
  const [lumaRange, setLumaRange] = useState<[number, number]>([0, 100]);
  const [useFiveColors, setUseFiveColors] = useState(false);
  const [shuffleColors, setShuffleColors] = useState(['#ccffff', '#88eeee', '#66dddd']);
  const [brightnessMultiplier, setBrightnessMultiplier] = useState(1.0);

  // === FOLDER/SORT STATE ===
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'none' });
  const [sessionName, setSessionName] = useState('YourProjectName');
  const [filterDictionary, setFilterDictionary] = useState<FilterDictionary>(DEFAULT_FILTER_DICTIONARY);

  // === UASSET INTEGRATION STATE ===
  const [settings, setSettings] = useState<AppSettings>({ usmapPath: null, paksPath: null, showDetailedErrors: true, autoClearCache: false, uiScale: 1 });
  const [showHeroBrowser, setShowHeroBrowser] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress>({ current: 0, total: 0, fileName: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [heroBrowserCacheInfo, setHeroBrowserCacheInfo] = useState<CacheInfo>({ fileCount: 0, totalSizeBytes: 0 });
  const [vfxCacheInfo, setVfxCacheInfo] = useState<CacheInfo>({ fileCount: 0, totalSizeBytes: 0 });
  const [uassetSourceMap, setUassetSourceMap] = useState<UassetSourceMap>({});

  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const sessionFileInputRef = useRef<HTMLInputElement>(null);

  // === USMAP MANAGEMENT STATE ===
  const [usmapStatus, setUsmapStatus] = useState<UsmapStatus | null>(null);
  const [usmapLoading, setUsmapLoading] = useState(false);

  // === SHUFFLE COLORS EFFECT ===
  useEffect(() => {
    setShuffleColors(prev => {
      if (useFiveColors) {
        if (prev.length < 5) return [...prev, '#44cccc', '#22bbbb'];
        return prev.slice(0, 5);
      } else {
        return prev.slice(0, 3);
      }
    });
  }, [useFiveColors]);

  // === CONVERSION PROGRESS LISTENER ===
  useEffect(() => {
    const unlistenPromise = tauri.listen('conversion-progress', (event: any) => {
      const { current, total, fileName } = event.payload;
      setConversionProgress({ current, total, fileName: fileName || 'Processing...' });
    });
    return () => { unlistenPromise.then((unlisten: () => void) => unlisten()); };
  }, []);

  // === LOAD SETTINGS FROM BACKEND ===
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loaded = await tauri.getSettings();
        setSettings(loaded);
        await tauri.applyWebviewUiScale(loaded.uiScale ?? 1);
        debug.addLog(`UI scale applied: ${Math.round((loaded.uiScale ?? 1) * 100)}%`);
        if (loaded.filterDictionary) {
          setFilterDictionary(loaded.filterDictionary);
          debug.addLog('✓ Filter dictionary loaded from settings');
        } else {
          setFilterDictionary(DEFAULT_FILTER_DICTIONARY);
          debug.addLog('⚠ No dictionary in settings - using default');
        }
        debug.addLog(`Settings loaded: usmap=${loaded.usmapPath || 'not set'}`);
      } catch (err) {
        debug.addLog(`Failed to load settings: ${err}`);
        setFilterDictionary(DEFAULT_FILTER_DICTIONARY);
      }
      try {
        const hbCache = await tauri.getHeroBrowserCacheInfo();
        setHeroBrowserCacheInfo({ fileCount: hbCache.file_count, totalSizeBytes: hbCache.total_size_bytes });
        const vfxCache = await tauri.getVfxCacheInfo();
        setVfxCacheInfo({ fileCount: vfxCache.file_count, totalSizeBytes: vfxCache.total_size_bytes });
      } catch (err) {
        debug.addLog(`Failed to load cache info: ${err}`);
      }
    };
    loadSettings();
  }, []);

  // === USMAP AUTO-MANAGEMENT ===
  useEffect(() => {
    const manageUsmap = async () => {
      try {
        const status = await tauri.checkUsmapStatus();
        setUsmapStatus(status);
        debug.addLog(`Usmap status: installed=${status.installed}, update=${status.needs_update}, file=${status.file_name || 'none'}`);

        if (!status.installed || status.needs_update) {
          debug.addLog('Usmap missing or outdated, attempting auto-update...');
          setUsmapLoading(true);
          try {
            const result = await tauri.fetchLatestUsmap();
            setUsmapStatus(result);
            setSettings(prev => ({ ...prev, usmapPath: result.file_path }));
            debug.addLog(`✓ Usmap auto-updated: ${result.file_name}`);
          } catch (fetchErr) {
            debug.addLog(`⚠ Auto-update failed: ${fetchErr}. ${status.installed ? 'Using existing mappings.' : 'Manual usmap selection required.'}`);
          } finally {
            setUsmapLoading(false);
          }
        }
      } catch (err) {
        debug.addLog(`Failed to check usmap status: ${err}`);
      }
    };
    manageUsmap();
  }, []);

  // === PREVENT GLOBAL DRAG/DROP NAVIGATION ===
  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  // === DRAG/DROP SYSTEM LISTENER ===
  const colorParamsRef = useRef(colorParams);
  const processFileObjectsRef = useRef<any>(null);

  useEffect(() => {
    colorParamsRef.current = colorParams;
  }, [colorParams]);

  useEffect(() => {
    let isMounted = true;
    let unlistenDrop: (() => void) | null = null;
    let unlistenEnter: (() => void) | null = null;
    let unlistenLeave: (() => void) | null = null;

    const setupListener = async () => {
      const enter = await tauri.listen('tauri://drag-enter', () => { if (isMounted) setIsDragging(true); });
      const leave = await tauri.listen('tauri://drag-leave', () => { if (isMounted) setIsDragging(false); });

      const drop = await tauri.listen('tauri://drag-drop', async (event: any) => {
        if (!isMounted) return;
        setIsDragging(false);
        const payload = event.payload;
        const paths: string[] = payload.paths || payload;
        if (!paths || !Array.isArray(paths) || paths.length === 0) return;

        debug.addLog(`System drop detected: ${paths.length} items`);

        const fileObjects: FileObject[] = [];
        const directoryPaths: string[] = [];
        const individualUassets: string[] = [];

        for (const path of paths) {
          try {
            const name = path.split(/[\\/]/).pop()!;
            if (name.endsWith('.uasset')) {
              individualUassets.push(path);
            } else if (name.endsWith('.json')) {
              const content = await tauri.readTextFile(path);
              fileObjects.push({ name, content, relativePath: name });
            } else {
              const metadata = await tauri.stat(path);
              if (metadata.isDirectory) {
                directoryPaths.push(path);
              }
            }
          } catch (e) {
            debug.addLog(`Error processing path ${path}: ${e}`);
          }
        }

        const hasUassets = directoryPaths.length > 0 || individualUassets.length > 0;
        if (hasUassets) {
          setIsConverting(true);
          setConversionProgress({ current: 0, total: 1, fileName: 'Converting dropped files...' });
          const newSourceMap: Record<string, { uassetPath: string; jsonPath: string }> = {};

          const processResult = async (result: any, rootPath: string) => {
            for (let i = 0; i < result.json_paths.length; i++) {
              const jsonPath = result.json_paths[i];
              const fileName = jsonPath.split(/[\\/]/).pop() || 'unknown.json';
              const uassetPath = result.uasset_paths[i] || '';
              try {
                const content = await tauri.readTextFile(jsonPath);
                const parts = jsonPath.replace(/\\/g, '/').split('/');
                const normalizedRoot = rootPath.replace(/\\/g, '/');
                const rootName = normalizedRoot.split('/').pop() || '';
                const rootIdx = parts.indexOf(rootName);
                const relativePath = rootIdx >= 0
                  ? parts.slice(rootIdx).join('/')
                  : `${rootName}/${fileName}`;
                fileObjects.push({ name: fileName, content, relativePath });
                newSourceMap[relativePath] = { uassetPath, jsonPath };
              } catch (readErr) { debug.addLog(`Error reading converted JSON: ${readErr}`); }
            }
          };

          // Convert dropped directories
          for (const dirPath of [...new Set(directoryPaths)]) {
            try {
              const result = await tauri.batchConvertDirectory(dirPath);
              debug.addLog(`Drop batch complete: ${result.json_paths.length} JSON files from ${result.uasset_paths.length} uassets`);
              await processResult(result, dirPath);
            } catch (e) { debug.addLog(`Drop batch conversion failed for ${dirPath}: ${e}`); }
          }

          // Convert individually dropped .uasset files
          if (individualUassets.length > 0) {
            const sep = individualUassets[0].includes('/') ? '/' : '\\';
            const basePath = individualUassets[0].substring(0, individualUassets[0].lastIndexOf(sep));
            try {
              const result = await tauri.batchConvertFiles(individualUassets, basePath);
              debug.addLog(`Drop file batch complete: ${result.json_paths.length} JSON files from ${result.uasset_paths.length} uassets`);
              await processResult(result, basePath);
            } catch (e) { debug.addLog(`Drop file batch conversion failed: ${e}`); }
          }

          setUassetSourceMap(prev => ({ ...prev, ...newSourceMap }));
        }

        if (fileObjects.length > 0) {
          if (hasUassets) {
            setConversionProgress({ current: 1, total: 1, fileName: 'Extracting color parameters...' });
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          const currentParams = colorParamsRef.current;
          processFileObjectsRef.current?.(fileObjects, currentParams.length > 0);
        }
        setIsConverting(false);
        setConversionProgress({ current: 0, total: 0, fileName: '' });
      });

      if (isMounted) {
        unlistenEnter = enter;
        unlistenLeave = leave;
        unlistenDrop = drop;
      } else {
        enter();
        leave();
        drop();
      }
    };
    setupListener();

    return () => {
      isMounted = false;
      if (unlistenDrop) unlistenDrop();
      if (unlistenEnter) unlistenEnter();
      if (unlistenLeave) unlistenLeave();
    };
  }, []);

  // === PROCESS FILE OBJECTS ===
  const processFileObjects = useCallback((fileObjects: FileObject[], append = false) => {
    let allParams: ColorParam[] = append ? [...colorParams] : [];
    const newOriginalFiles: Record<string, any> = append ? { ...originalFiles } : {};

    fileObjects.forEach(fileObj => {
      if (append && newOriginalFiles[fileObj.relativePath]) return;
      try {
        const json = JSON.parse(fileObj.content);
        newOriginalFiles[fileObj.relativePath] = json;
        parseJsonAndExtractColors(json, fileObj.name, fileObj.relativePath, allParams, filterDictionary, debug.addLog);
      } catch (error) {
        console.error('Error processing file content:', fileObj.name, error);
        debug.addLog(`⚠ Skipped ${fileObj.name}: failed to parse (possibly outdated mappings)`);
      }
    });

    const uniqueFolders = [...new Set(allParams.map(p => {
      const lastSlash = p.relativePath.lastIndexOf('/');
      return lastSlash > 0 ? p.relativePath.substring(0, lastSlash) : '/';
    }))];
    setFolders(uniqueFolders.sort());
    setSelectedFolders(new Set(uniqueFolders));

    if (!append) { setInitialHistory(allParams); } else { recordHistory(allParams); }
    setOriginalFiles(newOriginalFiles);

    const uniqueParamNames = [...new Set(allParams.map(p => p.paramName))].sort();
    tauri.logUniqueParams(uniqueParamNames).catch(e => console.error('Failed to log params:', e));
  }, [colorParams, originalFiles, filterDictionary, debug.addLog, recordHistory, setInitialHistory]);

  useEffect(() => {
    processFileObjectsRef.current = processFileObjects;
  }, [processFileObjects]);

  // === COLOR ACTIONS ===
  const handleParamChange = useCallback((id: string, newRgba: RGBA) => {
    console.debug('[App] handleParamChange', id);
    const newParams = colorParams.map(p => (p.id === id ? { ...p, rgba: newRgba } : p));
    recordHistory(newParams);
  }, [colorParams, recordHistory]);

  const applyMasterColor = useCallback(() => {
    if (selectedParams.size === 0) { alert('No parameters selected.'); return; }
    const newRgba = hexToRgba(masterColor);
    const newParams = colorParams.map(p => {
      if (selectedParams.has(p.id)) {
        return { ...p, rgba: applyColorToParam(p.rgba, newRgba, { preserveIntensity, ignoreGrayscale }) };
      }
      return p;
    });
    recordHistory(newParams);
  }, [colorParams, selectedParams, masterColor, preserveIntensity, ignoreGrayscale, recordHistory]);

  const applyHueShift = useCallback(() => {
    if (selectedParams.size === 0) { alert('No parameters selected.'); return; }
    const newParams = colorParams.map(p => {
      if (selectedParams.has(p.id)) return { ...p, rgba: applyHueShiftToRgba(p.rgba, hueShiftValue, ignoreGrayscale) };
      return p;
    });
    recordHistory(newParams);
    setHueShiftValue(0);
  }, [colorParams, selectedParams, hueShiftValue, ignoreGrayscale, recordHistory]);

  const applyShuffle = useCallback(() => {
    if (selectedParams.size === 0) { alert('No parameters selected.'); return; }
    const selectedFiles = [...new Set(colorParams.filter(p => selectedParams.has(p.id)).map(p => p.fileName))];
    const fileToColorMap: Record<string, string> = {};
    selectedFiles.forEach((fileName, index) => { fileToColorMap[fileName] = shuffleColors[index % shuffleColors.length]; });
    const newParams = colorParams.map(p => {
      if (selectedParams.has(p.id)) {
        const newColorHex = fileToColorMap[p.fileName];
        if (newColorHex) return { ...p, rgba: applyColorToParam(p.rgba, hexToRgba(newColorHex), { preserveIntensity, ignoreGrayscale }) };
      }
      return p;
    });
    recordHistory(newParams);
  }, [colorParams, selectedParams, shuffleColors, preserveIntensity, ignoreGrayscale, recordHistory]);

  const applyBrightnessMultiplier = useCallback(() => {
    if (selectedParams.size === 0) { alert('No parameters selected.'); return; }
    const newParams = colorParams.map(p => {
      if (selectedParams.has(p.id)) {
        return {
          ...p,
          rgba: {
            ...p.rgba,
            R: Math.min(100, Math.max(0, p.rgba.R * brightnessMultiplier)),
            G: Math.min(100, Math.max(0, p.rgba.G * brightnessMultiplier)),
            B: Math.min(100, Math.max(0, p.rgba.B * brightnessMultiplier)),
          }
        };
      }
      return p;
    });
    recordHistory(newParams);
    setBrightnessMultiplier(1.0);
  }, [colorParams, selectedParams, brightnessMultiplier, recordHistory]);

  // === SELECTION ===
  const baseFilteredParams = useMemo(() => {
    let sortableParams = [...colorParams];
    if (sortConfig.key !== null && sortConfig.direction !== 'none') {
      sortableParams.sort((a, b) => {
        if (sortConfig.key === 'color') {
          const [hA, sA, lA] = rgbToHsl(a.rgba.R, a.rgba.G, a.rgba.B);
          const [hB, sB, lB] = rgbToHsl(b.rgba.R, b.rgba.G, b.rgba.B);
          if (hA < hB) return -1; if (hA > hB) return 1;
          if (sA < sB) return -1; if (sA > sB) return 1;
          if (lA < lB) return -1; if (lA > lB) return 1;
          return 0;
        }
        if (sortConfig.key === 'path') {
          return a.relativePath.localeCompare(b.relativePath);
        }
        if (sortConfig.key === 'paramName') {
          return a.paramName.localeCompare(b.paramName);
        }
        return 0;
      });
      if (sortConfig.direction === 'descending') sortableParams.reverse();
    }
    let params = sortableParams;
    if (folders.length > 0) {
      params = params.filter(p => {
        const lastSlash = p.relativePath.lastIndexOf('/');
        const folder = lastSlash > 0 ? p.relativePath.substring(0, lastSlash) : '/';
        return selectedFolders.has(folder);
      });
    }
    if (!showGrayscale) params = params.filter(p => p.rgba.R !== p.rgba.G || p.rgba.G !== p.rgba.B);
    if (!showColor) params = params.filter(p => p.rgba.R === p.rgba.G && p.rgba.G === p.rgba.B);
    if (!showEnemy) params = params.filter(p => !p.paramName.toLowerCase().includes('enemy') && !p.fileName.toLowerCase().includes('enemy') && !p.relativePath.toLowerCase().includes('enemy'));
    if (searchTerm) {
      const terms = searchTerm.split(',').map(t => t.trim()).filter(Boolean);
      const positiveTerms = terms.filter(t => !t.startsWith('-'));
      const negativeTerms = terms.filter(t => t.startsWith('-')).map(t => t.slice(1).trim()).filter(Boolean);

      const matchTerm = (p: ColorParam, term: string) => {
        const isRegex = term.startsWith('/') && term.endsWith('/') && term.length > 2;
        if (isRegex) {
          try {
            const regex = new RegExp(term.slice(1, -1), 'i');
            return regex.test(p.paramName) || regex.test(p.relativePath);
          } catch (e) {
            // fallback to literal
          }
        }
        const lowerTerm = term.toLowerCase();
        return p.paramName.toLowerCase().includes(lowerTerm) || p.relativePath.toLowerCase().includes(lowerTerm);
      };

      params = params.filter(p => {
        const matchesPositive = positiveTerms.length === 0 || positiveTerms.some(term => matchTerm(p, term));
        const matchesNegative = negativeTerms.length > 0 && negativeTerms.some(term => matchTerm(p, term));
        return matchesPositive && !matchesNegative;
      });
    }
    return params;
  }, [colorParams, searchTerm, showGrayscale, showColor, showEnemy, selectedFolders, folders, sortConfig]);

  const filteredParams = useMemo(() => {
    let params = [...baseFilteredParams];
    if (hueRange[0] !== 0 || hueRange[1] !== 360) {
      params = params.filter(p => {
        const [h, s] = rgbToHsl(p.rgba.R, p.rgba.G, p.rgba.B);
        if (s < 0.05) return true; // always show grayscale
        const hueDeg = h * 360;
        return hueDeg >= hueRange[0] && hueDeg <= hueRange[1];
      });
    }
    if (lumaRange[0] !== 0 || lumaRange[1] !== 100) {
      params = params.filter(p => {
        const [_, __, l] = rgbToHsl(p.rgba.R, p.rgba.G, p.rgba.B);
        const lumaPct = l * 100;
        return lumaPct >= lumaRange[0] && lumaPct <= lumaRange[1];
      });
    }
    return params;
  }, [baseFilteredParams, hueRange, lumaRange]);

  const handleSelectionChange = useCallback((id: string) => {
    const index = filteredParams.findIndex(p => p.id === id);
    if (index === -1) return;
    setSelectedParams(prev => {
      const next = new Set(prev);
      if ((keyboard.shiftKey || keyboard.altKey) && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          const currentId = filteredParams[i].id;
          if (keyboard.altKey) next.delete(currentId); else next.add(currentId);
        }
      } else {
        if (next.has(id)) next.delete(id); else next.add(id);
      }
      return next;
    });
    setLastSelectedIndex(index);
  }, [filteredParams, keyboard.shiftKey, keyboard.altKey, lastSelectedIndex]);

  const handleSelectAll = useCallback(() => {
    if (selectedParams.size === filteredParams.length) setSelectedParams(new Set());
    else setSelectedParams(new Set(filteredParams.map(p => p.id)));
  }, [selectedParams.size, filteredParams]);

  useEffect(() => {
    selectAllRef.current = handleSelectAll;
  }, [handleSelectAll]);

  const requestSort = useCallback((key: string) => {
    let direction: 'ascending' | 'descending' | 'none' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    else if (sortConfig.key === key && sortConfig.direction === 'descending') { direction = 'none'; key = ''; }
    setSortConfig({ key: key || null, direction });
  }, [sortConfig]);

  const handleFolderToggle = useCallback((folder: string, isAlt = false) => {
    setSelectedFolders(prev => {
      if (isAlt) return new Set([folder]);
      const newSet = new Set(prev);
      if (newSet.has(folder)) newSet.delete(folder); else newSet.add(folder);
      return newSet;
    });
  }, []);

  // === SAVE HANDLERS ===
  const handleSave = useCallback(async () => {
    if (colorParams.length === 0) { alert('No parameters to save.'); return; }
    setSaveStatus('Saving...');
    const modifiedFiles = JSON.parse(JSON.stringify(originalFiles));
    colorParams.forEach(param => {
      const fileToModify = modifiedFiles[param.relativePath];
      if (fileToModify) setNestedValue(fileToModify, param.path, param.rgba);
    });
    const filesToSave = new Set(Object.keys(modifiedFiles));
    try {
      let dirHandle = directoryHandleRef.current;
      if (!dirHandle) { dirHandle = await (window as any).showDirectoryPicker(); directoryHandleRef.current = dirHandle; }
      const outputDirHandle = await dirHandle!.getDirectoryHandle('output', { create: true });
      for (const relativePath of filesToSave) {
        const pathParts = relativePath.split('/');
        const fileName = pathParts.pop()!;
        let currentDirHandle = outputDirHandle;
        for (const part of pathParts) currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: true });
        const fileHandle = await currentDirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(modifiedFiles[relativePath], null, 2));
        await writable.close();
      }
      setSaveStatus(`All ${filesToSave.size} files saved to 'output' folder!`);
    } catch (err: any) {
      console.error('Error saving files:', err);
      if (err.name !== 'AbortError') setSaveStatus(`Error: ${err.message}.`);
      else setSaveStatus('Save cancelled.');
    }
    setTimeout(() => setSaveStatus(''), 10000);
  }, [colorParams, originalFiles]);

  const handleSaveAsUasset = useCallback(async (saveAll = false) => {
    const uassetKeys = Object.keys(uassetSourceMap);
    if (uassetKeys.length === 0) { alert('No UAsset files to save.'); return; }
    let filesToSave: string[];
    if (saveAll) {
      filesToSave = uassetKeys;
      debug.addLog(`Saving ALL ${filesToSave.length} files`);
    } else {
      const editedFilePaths = new Set<string>();
      colorParams.forEach(param => {
        const originalFile = originalFiles[param.relativePath];
        if (!originalFile) return;
        let originalValue: any = originalFile;
        for (const key of param.path) {
          if (originalValue && typeof originalValue === 'object') originalValue = originalValue[key];
          else { originalValue = undefined; break; }
        }
        if (originalValue && (param.rgba.R !== originalValue.R || param.rgba.G !== originalValue.G || param.rgba.B !== originalValue.B || param.rgba.A !== originalValue.A)) {
          editedFilePaths.add(param.relativePath);
        }
      });
      filesToSave = uassetKeys.filter(key => editedFilePaths.has(key));
      debug.addLog(`Saving ${filesToSave.length} edited files`);
      if (filesToSave.length === 0) { alert('No edited files detected. Hold Shift and click to force save all files.'); return; }
    }
    try {
      const outputPath = await tauri.openDialog({ directory: true, multiple: false, title: 'Select folder to save .uasset files' }) as string;
      if (!outputPath) return;
      setSaveStatus('Saving UAsset files...');
      setIsConverting(true);
      setConversionProgress({ current: 0, total: filesToSave.length, fileName: 'Preparing...' });

      const modifiedFiles = JSON.parse(JSON.stringify(originalFiles));
      colorParams.forEach(param => {
        const fileToModify = modifiedFiles[param.relativePath];
        if (fileToModify) setNestedValue(fileToModify, param.path, param.rgba);
      });

      const writePromises: Promise<void>[] = [];
      const jsonPathsForConversion: { jsonPath: string; outputName: string }[] = [];
      let writeProgress = 0;
      const totalToWrite = filesToSave.filter(k => uassetSourceMap[k]?.jsonPath && modifiedFiles[k]).length;

      for (const keyPath of filesToSave) {
        const sourceInfo = uassetSourceMap[keyPath];
        if (sourceInfo && sourceInfo.jsonPath && modifiedFiles[keyPath]) {
          const jsonContent = JSON.stringify(modifiedFiles[keyPath], null, 2);
          const outputRelativePath = keyPath.replace(/\.json$/i, '.uasset');
          writePromises.push(
            tauri.writeTextFile(sourceInfo.jsonPath, jsonContent).then(() => {
              jsonPathsForConversion.push({ jsonPath: sourceInfo.jsonPath, outputName: outputRelativePath });
              writeProgress++;
              const displayName = outputRelativePath.split('/').pop();
              setConversionProgress({ current: writeProgress, total: totalToWrite, fileName: `Preparing: ${displayName}` });
            }).catch((err: any) => { debug.addLog(`Failed to write JSON ${keyPath}: ${err}`); writeProgress++; })
          );
        }
      }
      await Promise.all(writePromises);
      debug.addLog(`Wrote ${jsonPathsForConversion.length} JSON files in parallel`);

      if (jsonPathsForConversion.length === 0) { alert('No JSON files were modified.'); setIsConverting(false); setSaveStatus(''); return; }

      setConversionProgress({ current: 0, total: jsonPathsForConversion.length, fileName: 'Converting to UAsset...' });
      const unlisten = await tauri.listen('conversion-progress', (event: any) => {
        const { current, total, fileName, error } = event.payload;
        setConversionProgress({ current, total, fileName: `${fileName || 'Converting...'}${error ? ' - ERROR' : ''}` });
      });
      try {
        const invokeArgs = { jsonPaths: jsonPathsForConversion.map(f => `${f.jsonPath},${f.outputName}`), outputDir: outputPath };
        debug.addLog(`Invoking batch_convert_jsons_to_uassets with ${invokeArgs.jsonPaths.length} files`);
        const result = await tauri.batchConvertJsonsToUassets(invokeArgs.jsonPaths, outputPath);
        debug.addLog(`Conversion complete: ${result.succeeded}/${result.total} succeeded`);
        if (result.succeeded > 0) {
          setSaveStatus(`Saved ${result.succeeded} .uasset files to output folder!`);
          await tauri.openFolder(outputPath);
        } else {
          setSaveStatus('Conversion failed. Check debug log for details.');
        }
      } finally { unlisten(); }
    } catch (err) {
      debug.addLog(`Error saving UAsset files: ${err}`);
      setSaveStatus(`Error: ${err}`);
    } finally {
      setIsConverting(false);
      setConversionProgress({ current: 0, total: 0, fileName: '' });
      setTimeout(() => setSaveStatus(''), 10000);
    }
  }, [colorParams, originalFiles, uassetSourceMap, debug.addLog]);

  // === SELECT UASSET FOLDER ===
  const handleSelectUassetFolder = useCallback(async () => {
    if (!settings.usmapPath) {
      debug.addLog('No usmap set, attempting auto-fetch...');
      setUsmapLoading(true);
      try {
        const result = await tauri.fetchLatestUsmap();
        setUsmapStatus(result);
        setSettings(prev => ({ ...prev, usmapPath: result.file_path }));
        debug.addLog(`✓ Usmap auto-fetched: ${result.file_name}`);
      } catch (fetchErr) {
        debug.addLog(`⚠ Auto-fetch failed: ${fetchErr}`);
        setShowSettings(true);
        setUsmapLoading(false);
        return;
      }
      setUsmapLoading(false);
    }
    try {
      const selectedPath = await tauri.openDialog({ directory: true, multiple: false, title: 'Select folder containing .uasset files' }) as string;
      if (!selectedPath) return;
      debug.addLog(`Selected folder: ${selectedPath}`);
      setIsConverting(true);
      setConversionProgress({ current: 0, total: 1, fileName: 'Scanning and converting...' });

      const unlisten = await tauri.listen('conversion-progress', (event: any) => {
        const { current, total, fileName, cached, error } = event.payload;
        setConversionProgress({ current, total, fileName: `${fileName || 'Converting...'}${cached ? ' (cached)' : ''}${error ? ' - ERROR' : ''}` });
      });

      try {
        const result = await tauri.batchConvertDirectory(selectedPath);
        debug.addLog(`Batch conversion complete: ${result.json_paths.length} JSON files from ${result.uasset_paths.length} uassets`);

        const fileObjects: FileObject[] = [];
        const newSourceMap: Record<string, { uassetPath: string; jsonPath: string }> = {};
        const normalizedRoot = selectedPath.replace(/\\/g, '/');

        setConversionProgress({ current: 0, total: result.json_paths.length, fileName: 'Loading converted files...' });

        for (let i = 0; i < result.json_paths.length; i++) {
          const jsonPath = result.json_paths[i];
          const fileName = jsonPath.split(/[\\/]/).pop() || 'unknown.json';
          const uassetPath = result.uasset_paths[i] || '';

          try {
            const content = await tauri.readTextFile(jsonPath);
            const parts = jsonPath.replace(/\\/g, '/').split('/');
            // Build relative path from the root directory name
            const rootName = normalizedRoot.split('/').pop() || '';
            const rootIdx = parts.indexOf(rootName);
            const relativePath = rootIdx >= 0
              ? parts.slice(rootIdx).join('/')
              : `${rootName}/${fileName}`;

            fileObjects.push({ name: fileName, content, relativePath });
            newSourceMap[relativePath] = { uassetPath, jsonPath };

            setConversionProgress({ current: i + 1, total: result.json_paths.length, fileName });
          } catch (readErr) {
            debug.addLog(`Failed to read ${fileName}: ${readErr}`);
          }
        }

        if (fileObjects.length > 0) {
          setConversionProgress({ current: result.json_paths.length, total: result.json_paths.length, fileName: 'Extracting color parameters...' });
          await new Promise(resolve => setTimeout(resolve, 50));

          setUassetSourceMap(prev => ({ ...prev, ...newSourceMap }));
          processFileObjects(fileObjects, colorParams.length > 0);
          debug.addLog(`Loaded ${fileObjects.length} files into editor`);
        } else {
          debug.addLog('WARNING: No fileObjects to load!');
        }

        const hbCache = await tauri.getHeroBrowserCacheInfo();
        setHeroBrowserCacheInfo({ fileCount: hbCache.file_count, totalSizeBytes: hbCache.total_size_bytes });
        const vfxCache = await tauri.getVfxCacheInfo();
        setVfxCacheInfo({ fileCount: vfxCache.file_count, totalSizeBytes: vfxCache.total_size_bytes });
      } finally { unlisten(); }
    } catch (err) {
      debug.addLog(`⚠ Error selecting folder: ${err}`);
    } finally {
      setIsConverting(false);
      setConversionProgress({ current: 0, total: 0, fileName: '' });
    }
  }, [settings, colorParams, debug.addLog, processFileObjects]);

  // === SESSION IMPORT / EXPORT ===
  const handleExportSession = useCallback(async () => {
    if (selectedParams.size === 0) { alert('No parameters selected to export.'); return; }
    const sessionData: SessionEntry[] = colorParams.filter(p => selectedParams.has(p.id)).map(p => ({
      relativePath: p.relativePath.replace(/\.json$/i, ''), paramName: p.paramName, rgba: p.rgba,
    }));
    try {
      const fileName = sessionName.endsWith('.rvfxp') ? sessionName : `${sessionName}.rvfxp`;
      const filePath = await tauri.saveDialog({ title: 'Export Project File', defaultPath: fileName, filters: [{ name: 'RVFX Project', extensions: ['rvfxp'] }] });
      if (!filePath) return;
      await tauri.writeTextFile(filePath as string, JSON.stringify(sessionData, null, 2));
      alert('Project exported successfully!');
    } catch (err: any) { console.error('Failed to export session:', err); alert(`Failed to export session: ${err.message || err}`); }
  }, [colorParams, selectedParams, sessionName]);

  const handleImportSession = useCallback(async () => {
    try {
      const filePath = await tauri.openDialog({ title: 'Import Project File', multiple: false, filters: [{ name: 'RVFX Project', extensions: ['rvfxp', 'json'] }] });
      if (!filePath) return;
      const content = await tauri.readTextFile(filePath as string);
      const sessionData: SessionEntry[] = JSON.parse(content);
      if (!Array.isArray(sessionData)) { alert('Invalid project file format.'); return; }
      debug.addLog(`Importing project with ${sessionData.length} entries`);
      let updatedCount = 0;
      const newColorParams = colorParams.map(param => {
        const paramNormalizedPath = normalizePath(param.relativePath);
        const paramFileName = getFileName(param.relativePath).toLowerCase().replace(/\.json$/i, '').replace(/\.uasset$/i, '');
        let matchingEntry = sessionData.find(entry => normalizePath(entry.relativePath) === paramNormalizedPath && entry.paramName === param.paramName);
        if (!matchingEntry) matchingEntry = sessionData.find(entry => pathsMatchSuffix(normalizePath(entry.relativePath), paramNormalizedPath) && entry.paramName === param.paramName);
        if (!matchingEntry) matchingEntry = sessionData.find(entry => { const fn = getFileName(entry.relativePath).toLowerCase().replace(/\.json$/i, '').replace(/\.uasset$/i, ''); return fn === paramFileName && entry.paramName === param.paramName; });
        if (matchingEntry?.rgba) {
          updatedCount++;
          return { ...param, rgba: { R: matchingEntry.rgba.R ?? param.rgba.R, G: matchingEntry.rgba.G ?? param.rgba.G, B: matchingEntry.rgba.B ?? param.rgba.B, A: matchingEntry.rgba.A ?? param.rgba.A } };
        }
        return param;
      });
      recordHistory(newColorParams);
      debug.addLog(`Updated ${updatedCount} parameters from import`);
      alert(updatedCount > 0 ? `Project imported successfully! ${updatedCount} parameters were updated.` : 'Project file loaded but no matching parameters found.');
    } catch (err: any) { console.error('Failed to import session:', err); alert(`Failed to import session: ${err.message || err}`); }
  }, [colorParams, debug.addLog, recordHistory]);

  // === FILTER DICTIONARY ===
  const handleFilterDictionaryChange = useCallback(async (newDictionary: FilterDictionary) => {
    setFilterDictionary(newDictionary);
    try {
      await tauri.setFilterDictionary(newDictionary);
      setSettings(prev => ({ ...prev, filterDictionary: newDictionary }));
    } catch (err) { console.error('Failed to save filter dictionary:', err); debug.addLog(`Failed to save filter settings: ${err}`); }
  }, [debug.addLog]);

  // === SETTINGS OPEN ===
  const handleOpenSettings = useCallback(async () => {
    setShowSettings(true);
    try {
      const hbCache = await tauri.getHeroBrowserCacheInfo();
      setHeroBrowserCacheInfo({ fileCount: hbCache.file_count, totalSizeBytes: hbCache.total_size_bytes });
      const vfxCache = await tauri.getVfxCacheInfo();
      setVfxCacheInfo({ fileCount: vfxCache.file_count, totalSizeBytes: vfxCache.total_size_bytes });
    } catch (err) { debug.addLog(`Failed to refresh cache info: ${err}`); }
  }, [debug.addLog]);

  // === RESET ===
  const handleReset = useCallback(() => {
    console.debug('[App] Full reset');
    resetHistory();
    setOriginalFiles({});
    setSelectedParams(new Set());
    setSearchTerm('');
    setFolders([]);
    setSelectedFolders(new Set());
    setSessionName('YourProjectName');
    directoryHandleRef.current = null;
    setMasterColor('#ffffff');
    setHueShiftValue(0);
    setShuffleColors(['#ccffff', '#88eeee', '#66dddd']);
    setPreserveIntensity(true);
    setIgnoreGrayscale(true);
    setShowGrayscale(true);
    setUassetSourceMap({});
  }, [resetHistory]);

  // === HERO VFX SELECT ===
  const handleHeroSelect = useCallback(async (heroId: string, heroName: string, koMode = false) => {
    console.debug('[App] handleHeroSelect', heroId, heroName, koMode);
    setShowHeroBrowser(false);
    setIsConverting(true);
    setConversionProgress({ current: 0, total: 1, fileName: koMode ? `Extracting KO Prompt for ${heroName}...` : `Extracting VFX for ${heroName}...` });

    try {
      if (koMode) {
        debug.addLog(`Extracting KO Prompt WBP for ${heroName} (${heroId})...`);
      } else {
        debug.addLog(`Extracting VFX materials for ${heroName} (${heroId})...`);
      }
      const result = await tauri.extractHeroVfx(heroId, koMode);
      console.debug('[App] Hero extract result:', result);

      if (result.error && result.json_paths.length === 0) {
        debug.addLog(`Hero extraction warning: ${result.error}`);
        alert(`No assets found for ${heroName}. ${result.error}`);
        setIsConverting(false);
        setConversionProgress({ current: 0, total: 0, fileName: '' });
        return;
      }

      debug.addLog(`Got ${result.json_paths.length} JSON files for ${heroName}${result.cached ? ' (cached)' : ''}`);

      // Read all JSON files and feed into processFileObjects
      const fileObjects: { name: string; content: string; relativePath: string }[] = [];
      const newSourceMap: Record<string, { uassetPath: string; jsonPath: string }> = {};

      setConversionProgress({ current: 0, total: result.json_paths.length, fileName: 'Loading converted files...' });

      for (let i = 0; i < result.json_paths.length; i++) {
        const jsonPath = result.json_paths[i];
        const fileName = jsonPath.split(/[\\/]/).pop() || 'unknown.json';
        const uassetPath = result.uasset_paths[i] || '';

        try {
          const content = await tauri.readTextFile(jsonPath);
          // Build a relative path. Skip cache path prefix dynamically:
          const parts = jsonPath.replace(/\\/g, '/').split('/');
          const customIdx = parts.findIndex(p => p === 'Custom');
          const charsIdx = parts.findIndex(p => p === 'Characters');
          let relativePath = '';
          if (customIdx >= 0) {
            relativePath = parts.slice(customIdx + 1).join('/');
          } else if (charsIdx >= 0) {
            const heroIdx = parts.indexOf(heroId, charsIdx + 1);
            relativePath = heroIdx >= 0 ? parts.slice(heroIdx).join('/') : `${heroId}/${fileName}`;
          } else {
            const heroIdx = parts.lastIndexOf(heroId);
            relativePath = heroIdx >= 0 ? parts.slice(heroIdx).join('/') : `${heroId}/${fileName}`;
          }

          fileObjects.push({ name: fileName, content, relativePath });
          newSourceMap[relativePath] = { uassetPath, jsonPath };

          setConversionProgress({ current: i + 1, total: result.json_paths.length, fileName });
        } catch (readErr) {
          console.error('[App] Failed to read hero JSON:', jsonPath, readErr);
          debug.addLog(`Failed to read ${fileName}: ${readErr}`);
        }
      }

      if (fileObjects.length > 0) {
        setConversionProgress({ current: result.json_paths.length, total: result.json_paths.length, fileName: 'Extracting color parameters...' });
        await new Promise(resolve => setTimeout(resolve, 50));

        // Set the uasset source map for save-back functionality
        setUassetSourceMap(prev => ({ ...prev, ...newSourceMap }));
        setSessionName(koMode ? `${heroName.replace(/\s+/g, '_')}_KO` : heroName.replace(/\s+/g, '_'));

        processFileObjects(fileObjects, colorParams.length > 0);
        debug.addLog(`Loaded ${fileObjects.length} assets for ${heroName}`);
      } else {
        debug.addLog(`No readable files found for ${heroName}`);
      }
    } catch (err) {
      console.error('[App] Hero extraction failed:', err);
      debug.addLog(`Hero extraction failed: ${err}`);
      alert(`Failed to extract assets for ${heroName}: ${err}`);
    } finally {
      setIsConverting(false);
      setConversionProgress({ current: 0, total: 0, fileName: '' });
    }
  }, [debug, processFileObjects, colorParams.length]);

  // === DRAG HANDLERS ===
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); debug.addLog('Drop event detected. Delegating to system listener.'); }, [debug.addLog]);

  // =================== RENDER ===================
  return (
    <div style={{ backgroundColor: 'var(--bg-4)', color: 'var(--text-3)' }} className="min-h-screen p-6">
      <DebugConsole logs={debug.logs} showDebug={debug.showDebug} setShowDebug={debug.setShowDebug} clearLogs={debug.clearLogs} />

      <div className="w-full">
        <Header settings={settings} onOpenSettings={handleOpenSettings} onOpenFilterSettings={() => setShowFilterSettings(true)} onReset={handleReset} addDebugLog={debug.addLog} />

        {/* Usmap Status Banner */}
        {usmapLoading && (
          <div className="mt-2 px-4 py-2 text-sm flex items-center gap-2" style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-3)' }}>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeDashoffset="10" /></svg>
            Updating mapping files...
          </div>
        )}
        {usmapStatus && !usmapStatus.installed && !usmapLoading && (
          <div className="mt-2 px-4 py-2 text-sm flex items-center justify-between" style={{ backgroundColor: 'var(--bg-2)', borderLeft: '3px solid var(--accent-warning, #f59e0b)', color: 'var(--text-3)' }}>
            <span>⚠ No mapping file found. Auto-download failed — please set a .usmap file manually in Settings.</span>
            <button onClick={handleOpenSettings} className="px-3 py-1 text-xs font-medium rounded-none" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}>
              Open Settings
            </button>
          </div>
        )}

        <div className="my-8">
          {colorParams.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
              <div className="lg:col-span-3">
                <StyledPanel title="Global Controls">
                  <GlobalControls
                    masterColor={masterColor} setMasterColor={setMasterColor}
                    hueShiftValue={hueShiftValue} setHueShiftValue={setHueShiftValue}
                    useFiveColors={useFiveColors} setUseFiveColors={setUseFiveColors}
                    shuffleColors={shuffleColors}
                    onShuffleColorChange={(i, c) => { const nc = [...shuffleColors]; nc[i] = c; setShuffleColors(nc); }}
                    preserveIntensity={preserveIntensity} setPreserveIntensity={setPreserveIntensity}
                    ignoreGrayscale={ignoreGrayscale} setIgnoreGrayscale={setIgnoreGrayscale}
                    brightnessMultiplier={brightnessMultiplier} setBrightnessMultiplier={setBrightnessMultiplier}
                    selectedCount={selectedParams.size}
                    onApplyMasterColor={applyMasterColor} onApplyHueShift={applyHueShift} onApplyShuffle={applyShuffle} onApplyBrightnessMultiplier={applyBrightnessMultiplier}
                  />
                </StyledPanel>
              </div>
              <div className="lg:col-span-7">
                <StyledPanel title="Parameters">
                  <div className="p-4 flex flex-col gap-4 border-b" style={{ borderColor: 'var(--bg-2)' }}>
                    <div className="flex justify-between items-start w-full gap-4">
                      <div className="hidden"></div>
                      <div className="flex flex-col gap-4 w-full">
                        {/* Project Settings & Actions Row */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                          {/* Project Filename */}
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <label htmlFor="sessionNameInput" className="text-sm" style={{ color: 'var(--text-3)' }}>Project Filename:</label>
                            <input id="sessionNameInput" type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} className="w-48 px-3 py-1 rounded-none focus:outline-none focus:ring-2" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--text-2)' }} />
                            <span className="text-sm" style={{ color: 'var(--text-4)' }}>.rvfxp</span>
                            <button onClick={handleImportSession} title="Import Project" className="flex items-center justify-center w-8 h-8 rounded-none transition-colors shadow-md ml-2" style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-1)' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            </button>
                            <button onClick={handleExportSession} title="Export Selected to Project" className="flex items-center justify-center w-8 h-8 rounded-none transition-colors shadow-md" style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-1)' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            </button>
                          </div>

                          {/* Undo, Redo, Save Actions */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {saveStatus && (
                              <span className="text-xs whitespace-nowrap mr-2" style={{ color: 'var(--text-4)' }}>{saveStatus}</span>
                            )}
                            <button onClick={handleUndo} title="Undo (Ctrl+Z)" className="flex items-center justify-center p-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-1)' }} disabled={historyIndex === 0}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                            </button>
                            <button onClick={handleRedo} title="Redo (Ctrl+Y)" className="flex items-center justify-center p-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-1)' }} disabled={historyIndex >= historyLength - 1}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                            </button>
                            {Object.keys(uassetSourceMap).length > 0 ? (
                              <button onClick={(e) => handleSaveAsUasset(e.shiftKey)} disabled={isConverting} title="Save edited files (Shift+click to save ALL)" className="flex items-center gap-2 px-6 py-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 whitespace-nowrap w-auto" style={{ backgroundColor: 'var(--accent-green)', color: 'var(--text-1)' }}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4M7 21h10M5 21H3V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2h-2M12 11v-4M9 11h6"></path></svg>
                                Save UAsset
                              </button>
                            ) : (
                              <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 font-medium rounded-none transition-colors shadow-md whitespace-nowrap w-auto" style={{ backgroundColor: 'var(--accent-green)', color: 'var(--text-1)' }}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4M7 21h10M5 21H3V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2h-2M12 11v-4M9 11h6"></path></svg>
                                Save JSON
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Filter Row */}
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex items-center gap-4">
                            <input type="text" placeholder="Filter by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-3 py-2 rounded-none focus:outline-none focus:ring-2" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--text-2)' }} />
                            <label className="flex items-center text-sm cursor-pointer whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                              <input type="checkbox" checked={showColor} onChange={() => setShowColor(!showColor)} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0 mr-2" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }} />
                              Show Color
                            </label>
                            <label className="flex items-center text-sm cursor-pointer whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                              <input type="checkbox" checked={showGrayscale} onChange={() => setShowGrayscale(!showGrayscale)} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0 mr-2" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }} />
                              Show Grayscale
                            </label>
                            <label className="flex items-center text-sm cursor-pointer whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                              <input type="checkbox" checked={showEnemy} onChange={() => setShowEnemy(!showEnemy)} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0 mr-2" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }} />
                              Show Enemy
                            </label>
                          </div>
                          {baseFilteredParams.length > 0 && (
                            <div className="flex flex-row gap-6 w-full">
                              <div className="flex-1 min-w-0">
                                <ColorRangeFilter colorParams={baseFilteredParams} hueRange={hueRange} onHueRangeChange={setHueRange} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <LumaRangeFilter colorParams={baseFilteredParams} lumaRange={lumaRange} onLumaRangeChange={setLumaRange} />
                              </div>
                            </div>
                          )}
                          {folders.length > 1 && (
                            <div>
                              <h4 className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Filter by Folder:</h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {folders.map(folder => (
                                  <label key={folder} className="flex items-center text-xs cursor-pointer" style={{ color: 'var(--text-3)' }} title="Alt + Click to solo select">
                                    <input
                                      type="checkbox"
                                      checked={selectedFolders.has(folder)}
                                      onClick={(e) => { if (e.altKey) { e.preventDefault(); handleFolderToggle(folder, true); } }}
                                      onChange={(e) => { if (!(e.nativeEvent as MouseEvent).altKey) handleFolderToggle(folder); }}
                                      className="w-3 h-3 rounded-none focus:ring-offset-0 focus:ring-0 mr-1"
                                      style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }}
                                    />
                                    {folder === '/' ? 'Root' : folder}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-4)' }}>
                      {filteredParams.length} color parameters found across {new Set(filteredParams.map(p => p.relativePath)).size} assets. <span style={{ color: 'var(--accent-main)' }}>{selectedParams.size} selected.</span>
                    </p>
                  </div>
                  <ParameterTable
                    filteredParams={filteredParams} selectedParams={selectedParams}
                    hueShiftValue={hueShiftValue} ignoreGrayscale={ignoreGrayscale} preserveIntensity={preserveIntensity}
                    sortConfig={sortConfig} onSelectionChange={handleSelectionChange} onSelectAll={handleSelectAll}
                    onParamChange={handleParamChange} onRequestSort={requestSort}
                  />
                </StyledPanel>
              </div>
            </div>
          ) : (
            <LoadFilesPanel settings={settings} isDragging={isDragging} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onSelectFolder={handleSelectUassetFolder} onBrowseHeroes={() => { console.debug('[App] Opening hero browser'); setShowHeroBrowser(true); }} />
          )}
        </div>
      </div>

      {/* MODALS */}
      {showSettings && <SettingsModal settings={settings} setSettings={setSettings} heroBrowserCacheInfo={heroBrowserCacheInfo} vfxCacheInfo={vfxCacheInfo} onClose={() => setShowSettings(false)} onClearHeroBrowserCache={async () => { await tauri.clearHeroBrowserCache(); setHeroBrowserCacheInfo({ fileCount: 0, totalSizeBytes: 0 }); }} onClearVfxCache={async () => { await tauri.clearVfxCache(); setVfxCacheInfo({ fileCount: 0, totalSizeBytes: 0 }); }} />}
      {showFilterSettings && <FilterSettingsModal filterDictionary={filterDictionary} onChangeDictionary={handleFilterDictionaryChange} onClose={() => setShowFilterSettings(false)} onReset={() => handleFilterDictionaryChange(DEFAULT_FILTER_DICTIONARY)} />}
      {isConverting && <ConversionProgressOverlay conversionProgress={conversionProgress} />}
      {showHeroBrowser && <HeroBrowserModal onClose={() => setShowHeroBrowser(false)} onSelectHero={handleHeroSelect} addDebugLog={debug.addLog} />}
    </div>
  );
}
