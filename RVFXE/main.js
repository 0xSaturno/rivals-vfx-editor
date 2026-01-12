const { useState, useCallback, useMemo, useRef, useEffect } = React;
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { open: openDialog } = window.__TAURI__.dialog;

// component that makes all the little star particles for the header
const Particles = () => {
    const particles = useMemo(() => {
        const particleArray = [];
        const numParticles = 200; //  stars amount!
        for (let i = 0; i < numParticles; i++) {
            const size = Math.random() * 2.5 + 0.5;
            const duration = 5 + Math.random() * 10; // shorter duration = faster particles
            const style = {
                width: `${size}px`,
                height: `${size}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `-${Math.random() * duration}s`, // negative delay makes them start at random points in the animation, no delay
                animationDuration: `${duration}s`,
            };
            particleArray.push(<div key={i} className="particle" style={style}></div>);
        }
        return particleArray;
    }, []);

    return <div className="particles">{particles}</div>;
};


// helper function to dive into a nested object and change a value.
const setNestedValue = (obj, path, value) => {
    let schema = obj;
    for (let i = 0; i < path.length - 1; i++) {
        schema = schema[path[i]];
    }
    schema[path[path.length - 1]] = value;
};

const rgbaToDisplayHex = (r, g, b) => {
    const maxVal = Math.max(r, g, b, 1.0);
    const normR = r / maxVal;
    const normG = g / maxVal;
    const normB = b / maxVal;

    const toHex = (c) => {
        const numC = Number.isNaN(c) ? 0 : Number(c);
        const hex = Math.round(numC * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(normR)}${toHex(normG)}${toHex(normB)}`;
};

const hexToRgba = (hex) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    return { r: r / 255, g: g / 255, b: b / 255 };
};

function rgbToHsl(r, g, b) {
    const maxVal = Math.max(r, g, b, 1.0);
    if (maxVal === 0) return [0, 0, 0];
    const r_norm = r / maxVal;
    const g_norm = g / maxVal;
    const b_norm = b / maxVal;

    const max = Math.max(r_norm, g_norm, b_norm), min = Math.min(r_norm, g_norm, b_norm);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r_norm: h = (g_norm - b_norm) / d + (g_norm < b_norm ? 6 : 0); break;
            case g_norm: h = (b_norm - r_norm) / d + 2; break;
            case b_norm: h = (r_norm - g_norm) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r, g, b];
}

const StyledPanel = ({ title, children, className, ...props }) => {
    return (
        <div className={`relative group ${className}`} style={{ backgroundColor: 'var(--bg-3)' }} {...props}>
            <div className="absolute inset-0 border-2 pointer-events-none transition-colors" style={{ borderColor: 'var(--bg-2)' }}></div>
            <div className="absolute inset-0 border-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--accent-main)' }}></div>
            <h2 className="absolute -top-3 left-4 px-2 text-xl font-medium" style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)' }}>
                <span className="transition-colors group-hover:text-[--accent-main]">{title}</span>
            </h2>
            <div className="p-6 pt-8">
                {children}
            </div>
        </div>
    );
};

const ToggleSwitch = ({ label, enabled, setEnabled }) => {
    return (
        <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>{label}</span>
            <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={enabled} onChange={() => setEnabled(!enabled)} />
                <div className="block w-14 h-8 transition-colors" style={{ backgroundColor: enabled ? 'var(--accent-main)' : 'var(--bg-1)' }}></div>
                <div className="absolute left-1 top-1 w-6 h-6 flex items-center justify-center transition-transform peer-checked:translate-x-full"
                    style={{
                        backgroundColor: 'var(--bg-4)',
                        transform: enabled ? 'translateX(1.5rem)' : 'translateX(0)'
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
};

const EditableHexInput = ({ initialHex, onCommit }) => {
    const [hexValue, setHexValue] = useState(initialHex);

    useEffect(() => {
        setHexValue(initialHex);
    }, [initialHex]);

    const handleChange = (e) => {
        setHexValue(e.target.value);
    };

    const handleCommit = () => {
        // check if Hex value is valid
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexValue)) {
            onCommit(hexValue);
        } else {
            setHexValue(initialHex);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCommit();
            e.target.blur(); // Remove input focus
        } else if (e.key === 'Escape') {
            setHexValue(initialHex); // Cancel edits with Esc
            e.target.blur();
        }
    };

    return (
        <input
            type="text"
            value={hexValue.toUpperCase()}
            onChange={handleChange}
            onBlur={handleCommit} // apply when clickin out of the box
            onKeyDown={handleKeyDown} // apply or cancel with keystrokes
            className="w-16 px-1 py-0.5 text-xs text-center font-mono focus:outline-none border-2 rounded-none focus:ring-2"
            style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-2)', borderColor: 'var(--bg-2)', 'ringColor': 'var(--accent-main)' }}
            maxLength="7"
        />
    );
};


const KeywordListEditor = ({ title, keywords, onChange }) => {
    const [newItem, setNewItem] = useState('');

    const handleAdd = () => {
        if (newItem.trim()) {
            onChange([...keywords, newItem.trim()]);
            setNewItem('');
        }
    };

    const handleRemove = (index) => {
        const newKeywords = [...keywords];
        newKeywords.splice(index, 1);
        onChange(newKeywords);
    };

    return (
        <div className="mb-4">
            <label className="block text-xs font-bold uppercase mb-1 opacity-70" style={{ color: 'var(--text-2)' }}>
                {title}
            </label>
            <div className="flex flex-wrap gap-2 mb-2 max-h-40 overflow-y-auto p-2 border rounded" style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--bg-2)' }}>
                {keywords.length === 0 && <div className="text-xs opacity-50 px-1 italic">No keywords</div>}
                {keywords.map((keyword, idx) => (
                    <div key={idx} className="flex items-center text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)' }}>
                        <span className="mr-1">{keyword}</span>
                        <button
                            onClick={() => handleRemove(idx)}
                            className="text-red-500 hover:text-red-400 font-bold ml-1"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex gap-1">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Add..."
                    className="flex-1 text-xs px-2 py-1 rounded-none focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)' }}
                />
                <button
                    onClick={handleAdd}
                    className="px-2 py-1 text-xs font-bold rounded-none"
                    style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}
                >
                    +
                </button>
            </div>
        </div>
    );
};


// MAIN APP COMPONENT
function App() {
    const [history, setHistory] = useState([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const colorParams = history[historyIndex] || [];
    const [originalFiles, setOriginalFiles] = useState({});

    // Add debug state
    const [debugLog, setDebugLog] = useState([]);
    const [showDebug, setShowDebug] = useState(false);

    // Helper to add debug messages
    const addDebugLog = useCallback((message) => {
        setDebugLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    }, []);

    const [shiftKeyPressed, setShiftKeyPressed] = useState(false);
    const [ctrlKeyPressed, setCtrlKeyPressed] = useState(false);
    const [altKeyPressed, setAltKeyPressed] = useState(false);
    const [lastSelectedIndex, setLastSelectedIndex] = useState(null);


    const [selectedParams, setSelectedParams] = useState(new Set());
    const [masterColor, setMasterColor] = useState('#ffffff');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    const [ignoreGrayscale, setIgnoreGrayscale] = useState(true);
    const [preserveIntensity, setPreserveIntensity] = useState(true);
    const [showGrayscale, setShowGrayscale] = useState(true);
    const [showEnemy, setShowEnemy] = useState(true);
    const [hueShiftValue, setHueShiftValue] = useState(0);
    const [useFiveColors, setUseFiveColors] = useState(false);
    const [shuffleColors, setShuffleColors] = useState(['#ccffff', '#88eeee', '#66dddd']);
    const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);

    // Update shuffle colors array size when useFiveColors changes
    useEffect(() => {
        setShuffleColors(prev => {
            if (useFiveColors) {
                // expanding to 5: add 2 more colors if needed
                if (prev.length < 5) {
                    return [...prev, '#44cccc', '#22bbbb'];
                }
                return prev.slice(0, 5);
            } else {
                // shrinking to 3
                return prev.slice(0, 3);
            }
        });
    }, [useFiveColors]);

    // Listen for conversion progress events
    useEffect(() => {
        const unlistenPromise = listen('conversion-progress', (event) => {
            const { current, total, fileName } = event.payload;
            setConversionProgress({
                current,
                total,
                fileName: fileName || 'Processing...'
            });
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, []);

    const directoryHandleRef = useRef(null);

    const defaultFilterDictionary = {
        "include_keywords": [
            "color",
            "tint",
            "Enemy",
            "Emiss",
            "Diff"
        ],
        "exclude_keywords": [
            "Offset",
            "uv",
            "ColorMaskChannel",
            "MaskColor_Enemy"
        ],
        "color_property_names": [
            "ColorAndOpacity", "SpecifiedColor", "BaseColor", "HighlightColor",
            "FontTopColor", "FontButtomColor", "VectorParameter", "ShadowColor",
            "ContentColor", "OutlineColor", "Color", "TextColor", "BackgroundColor"
        ]
    };
    // ... inside App ...
    const [folders, setFolders] = useState([]);
    const [selectedFolders, setSelectedFolders] = useState(new Set());
    const [filterDictionary, setFilterDictionary] = useState(defaultFilterDictionary);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });

    const [sessionName, setSessionName] = useState('YourProjectName');

    // === UASSET INTEGRATION STATE ===
    const [settings, setSettings] = useState({ usmapPath: null, showDetailedErrors: true, autoClearCache: false });
    const [isConverting, setIsConverting] = useState(false);
    const [conversionProgress, setConversionProgress] = useState({ current: 0, total: 0, fileName: '' });
    const [showSettings, setShowSettings] = useState(false);
    const [showFilterSettings, setShowFilterSettings] = useState(false);
    const [cacheInfo, setCacheInfo] = useState({ fileCount: 0, totalSizeBytes: 0 });
    // Track which files came from uasset conversion (for save flow)
    const [uassetSourceMap, setUassetSourceMap] = useState({});

    // Handle system file drops (bypasses browser security)
    useEffect(() => {
        let unlistenDrop = null;
        let unlistenEnter = null;
        let unlistenLeave = null;

        const setupListener = async () => {
            unlistenEnter = await listen('tauri://drag-enter', () => setIsDragging(true));
            unlistenLeave = await listen('tauri://drag-leave', () => setIsDragging(false));

            unlistenDrop = await listen('tauri://drag-drop', async (event) => {
                setIsDragging(false);
                const payload = event.payload;
                // V2 payload is object with paths, V1 was array
                const paths = payload.paths || payload;

                if (!paths || !Array.isArray(paths) || paths.length === 0) return;

                addDebugLog(`System drop detected: ${paths.length} items`);
                // ... rest of logic (unchanged)

                const { readDir, readTextFile, stat } = window.__TAURI__.fs;
                const fileObjects = [];
                const uassetFiles = [];

                for (const path of paths) {
                    try {
                        const metadata = await stat(path);
                        if (metadata.isDirectory) {
                            try {
                                const processDirectoryRecursively = async (dirPath, rootPath) => {
                                    const entries = await readDir(dirPath);
                                    for (const entry of entries) {
                                        const fullPath = entry.path || `${dirPath}\\${entry.name}`.replace(/\//g, '\\');

                                        if (entry.isDirectory) {
                                            await processDirectoryRecursively(fullPath, rootPath);
                                        } else {
                                            const rootDir = rootPath.replace(/\\/g, '/');
                                            const entryPath = fullPath.replace(/\\/g, '/');

                                            // Determine relative path based on session state
                                            let relativePath;
                                            if (colorParams.length > 0) {
                                                // If appending, keep the dropped folder name as part of the structure
                                                // We want paths like "DroppedFolder/Sub/File.uasset" relative to the DROP PARENT
                                                // So we strip the PARENT of the rootPath
                                                const parentOfRoot = rootDir.substring(0, rootDir.lastIndexOf('/'));
                                                relativePath = entryPath.replace(parentOfRoot + '/', '');
                                            } else {
                                                // Default behavior: dropped folder content becomes root
                                                relativePath = entryPath.replace(rootDir + '/', '');
                                            }

                                            if (entry.name?.endsWith('.uasset')) {
                                                uassetFiles.push({
                                                    name: entry.name,
                                                    relativePath: relativePath,
                                                    fullPath: fullPath.replace(/\//g, '\\')
                                                });
                                            } else if (entry.name?.endsWith('.json')) {
                                                try {
                                                    const content = await readTextFile(fullPath);
                                                    fileObjects.push({
                                                        name: entry.name,
                                                        content: content,
                                                        relativePath: relativePath
                                                    });
                                                } catch (e) { console.error(e); }
                                            }
                                        }
                                    }
                                };
                                await processDirectoryRecursively(path, path);
                            } catch (e) { addDebugLog("ReadDir/Scan error: " + e); }
                        } else {
                            const name = path.split(/[\\/]/).pop();
                            if (name.endsWith('.uasset')) {
                                uassetFiles.push({
                                    name: name,
                                    relativePath: name,
                                    fullPath: path
                                });
                            } else if (name.endsWith('.json')) {
                                const content = await readTextFile(path);
                                fileObjects.push({
                                    name: name,
                                    content: content,
                                    relativePath: name
                                });
                            }
                        }
                    } catch (e) {
                        addDebugLog(`Error processing path ${path}: ${e}`);
                    }
                }

                if (uassetFiles.length > 0) {
                    setIsConverting(true);
                    setConversionProgress({ current: 0, total: uassetFiles.length, fileName: 'Converting dropped files...' });

                    let rootPath = "";
                    if (uassetFiles[0]?.fullPath) {
                        const fp = uassetFiles[0].fullPath;
                        const sep = fp.includes('/') ? '/' : '\\';
                        rootPath = fp.substring(0, fp.lastIndexOf(sep));
                    }

                    try {
                        const result = await invoke('batch_convert_uassets_to_json', {
                            uassetPaths: uassetFiles.map(f => f.fullPath),
                            rootPath: rootPath
                        });

                        for (const convResult of result.results) {
                            addDebugLog(`Processing drop result: success=${convResult.success}, json_path=${convResult.json_path || 'null'}`);

                            if (convResult.success && convResult.json_path) {
                                try {
                                    const content = await readTextFile(convResult.json_path);

                                    // Robust matching strategy
                                    let original = uassetFiles.find(u => u.fullPath === convResult.uasset_path);
                                    if (!original) {
                                        original = uassetFiles.find(u => u.fullPath.replace(/\\/g, '/').endsWith(convResult.file_name));
                                    }

                                    const relPath = original ? original.relativePath.replace(/\.uasset$/i, '.json') : convResult.file_name.replace(/\.uasset$/i, '.json');
                                    const keyPath = relPath.replace(/\.json$/i, ''); // key for source map usually doesn't have extension or keeps original? let's stick to existing pattern

                                    addDebugLog(`Drop Mapping: ${convResult.file_name} -> ${relPath}`);

                                    fileObjects.push({
                                        name: convResult.file_name.replace(/\.uasset$/i, '.json'),
                                        content: content,
                                        relativePath: relPath
                                    });

                                    setUassetSourceMap(prev => ({
                                        ...prev,
                                        [relPath]: { // Use full relative path (with .json) as key to match save usage
                                            uassetPath: convResult.uasset_path,
                                            jsonPath: convResult.json_path
                                        }
                                    }));
                                } catch (readErr) {
                                    addDebugLog(`Error reading converted JSON: ${readErr}`);
                                }
                            }
                        }
                    } catch (e) {
                        addDebugLog("System drop conversion failed: " + e);
                    }
                }

                if (fileObjects.length > 0) {
                    if (uassetFiles.length > 0) {
                        setConversionProgress({
                            current: uassetFiles.length,
                            total: uassetFiles.length,
                            fileName: 'Extracting color parameters...'
                        });
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    processFileObjects(fileObjects, colorParams.length > 0);
                }

                setIsConverting(false);
                setConversionProgress({ current: 0, total: 0, fileName: '' });
            });
        };
        setupListener();
        return () => {
            if (unlistenDrop) unlistenDrop();
            if (unlistenEnter) unlistenEnter();
            if (unlistenLeave) unlistenLeave();
        };
    }, [colorParams]);

    // Reset button animation states
    const [isHoldingReset, setIsHoldingReset] = useState(false);
    const resetTimerRef = useRef(null);
    const resetButtonRef = useRef(null);
    const animationFrameRef = useRef(null);
    const pressStartTimeRef = useRef(null);


    // Records a new state in the history for undo/redo
    const recordHistory = useCallback((newParams) => {
        const newHistory = [...history.slice(0, historyIndex + 1), newParams];
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prevIndex => prevIndex - 1);
        }
    }, [historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prevIndex => prevIndex + 1);
        }
    }, [history, historyIndex]);

    const handleResetPress = () => {
        pressStartTimeRef.current = Date.now(); // Store user press start time
        // start animation cycle
        animationFrameRef.current = requestAnimationFrame(shakeEffect);
        // Timer to reset
        resetTimerRef.current = setTimeout(() => {
            setHistory([[]]);
            setHistoryIndex(0);
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

            cancelAnimationFrame(animationFrameRef.current); // Stop animation when complete
            if (resetButtonRef.current) {
                resetButtonRef.current.style.transform = 'translate(0, 0)';
            }
        }, 2000); // animation duration in ms
    };

    const handleResetRelease = () => {
        clearTimeout(resetTimerRef.current); // cancel reset

        cancelAnimationFrame(animationFrameRef.current);

        // Reset button position
        if (resetButtonRef.current) {
            resetButtonRef.current.style.transform = 'translate(0, 0)';
        }
    };

    const shakeEffect = () => {
        if (!resetButtonRef.current || !pressStartTimeRef.current) return;

        const elapsedTime = Date.now() - pressStartTimeRef.current;
        const progress = Math.min(elapsedTime / 2000, 1);

        // Shake controls
        const maxIntensity = 4; // value in pixel
        const currentIntensity = maxIntensity * progress;

        // Random the X n Y movement
        const x = (Math.random() - 0.5) * 2 * currentIntensity;
        const y = (Math.random() - 0.5) * 2 * currentIntensity;

        // apply the style to the button
        resetButtonRef.current.style.transform = `translate(${x}px, ${y}px)`;

        // Repeat the function every next frame to make it loop
        animationFrameRef.current = requestAnimationFrame(shakeEffect);
    };

    // === LOAD SETTINGS FROM BACKEND ===
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const loadedSettings = await invoke('get_settings');
                setSettings(loadedSettings);

                // Use dictionary from settings if available, otherwise fallback to default
                if (loadedSettings.filterDictionary) {
                    setFilterDictionary(loadedSettings.filterDictionary);
                    addDebugLog(`✓ Filter dictionary loaded from settings`);
                } else {
                    setFilterDictionary(defaultFilterDictionary);
                    addDebugLog(`⚠ No dictionary in settings - using default`);
                }

                addDebugLog(`Settings loaded: usmap=${loadedSettings.usmapPath || 'not set'}`);
            } catch (err) {
                addDebugLog(`Failed to load settings: ${err}`);
                setFilterDictionary(defaultFilterDictionary);
            }

            try {
                const cache = await invoke('get_cache_info');
                setCacheInfo({
                    fileCount: cache.file_count,
                    totalSizeBytes: cache.total_size_bytes
                });
            } catch (err) {
                addDebugLog(`Failed to load cache info: ${err}`);
            }
        };
        loadSettings();
    }, [addDebugLog]);

    // this effect handles keystrokes for multi-selection and undo/redo
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Shift') setShiftKeyPressed(true);
            if (e.key === 'Control' || e.metaKey) setCtrlKeyPressed(true);
            if (e.key === 'Alt') setAltKeyPressed(true);

            const isCtrl = e.ctrlKey || e.metaKey;
            if (isCtrl && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) { // Ctrl+Shift+Z for Redo
                    handleRedo();
                } else { // Ctrl+Z for Undo
                    handleUndo();
                }
            } else if (isCtrl && e.key.toLowerCase() === 'y') { // Ctrl+Y for Redo
                e.preventDefault();
                handleRedo();
            }
        };
        const handleKeyUp = (e) => {
            if (e.key === 'Shift') setShiftKeyPressed(false);
            if (e.key === 'Control' || e.metaKey) setCtrlKeyPressed(false);
            if (e.key === 'Alt') setAltKeyPressed(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleUndo, handleRedo]);

    // helper to decide if a param name matches the external filter dictionary
    const paramMatchesFilter = (paramName) => {
        if (!filterDictionary) return false; // don't match until dictionary is loaded

        const paramNameLower = (paramName || '').toLowerCase();

        const includeKeywords = (filterDictionary.include_keywords || []).map(k => String(k).toLowerCase());
        const excludeKeywords = (filterDictionary.exclude_keywords || []).map(k => String(k).toLowerCase());

        // include requires at least one include keyword (if include list empty => allow all)
        const hasIncludeKeyword = includeKeywords.length === 0
            ? true
            : includeKeywords.some(keyword => paramNameLower.includes(keyword));

        // substring exclusions (JSON-driven)
        const hasExcludedKeyword = excludeKeywords.some(keyword => paramNameLower.includes(keyword));

        // debug: show why a param is rejected
        if (!hasIncludeKeyword || hasExcludedKeyword) {
            console.debug('paramMatchesFilter: excluded', {
                paramName,
                hasIncludeKeyword,
                hasExcludedKeyword,
                includeKeywords,
                excludeKeywords
            });
        }

        return hasIncludeKeyword && !hasExcludedKeyword;
    };

    const getColorPropertyNames = () => {
        return filterDictionary?.color_property_names || [
            'ColorAndOpacity', 'SpecifiedColor', 'BaseColor', 'HighlightColor',
            'FontTopColor', 'FontButtomColor', 'VectorParameter', 'ShadowColor',
            'ContentColor', 'OutlineColor', 'Color', 'TextColor', 'BackgroundColor'
        ];
    };

    const findColorsRecursive = (currentObject, currentPath, fileName, parentName, allParams, relativePath) => {
        // Exit if the item is not a searchable object
        if (!currentObject || typeof currentObject !== 'object') {
            return;
        }

        // Determine which property names count as color properties via JSON
        const colorNames = getColorPropertyNames();
        const isColorProperty = colorNames.includes(currentObject.Name) && currentObject.StructType === 'LinearColor';

        const colorValue = currentObject?.Value?.[0]?.Value;

        if (isColorProperty && colorValue && typeof colorValue.R !== 'undefined') {
            // Build a human-readable param name that matches the VectorParameter flow
            const paramName = `${parentName} - ${currentObject.Name}`;

            // Only add parameters that match the external filter dictionary
            if (!paramMatchesFilter(paramName)) {
                return;
            }

            const id = `${relativePath}-${parentName}-${currentObject.Name}-${allParams.length}`;
            const path = [...currentPath, 'Value', 0, 'Value'];

            const sanitizedRgba = {
                ...colorValue,
                R: parseFloat(colorValue.R) || 0,
                G: parseFloat(colorValue.G) || 0,
                B: parseFloat(colorValue.B) || 0,
                A: parseFloat(colorValue.A) || 0,
            };

            allParams.push({ id, fileName, paramName, path, rgba: sanitizedRgba, relativePath });

        } else {
            // If it's not a color property, treat it as a generic container and search its children.
            if (Array.isArray(currentObject)) {
                currentObject.forEach((item, index) => {
                    findColorsRecursive(item, [...currentPath, index], fileName, parentName, allParams, relativePath);
                });
            } else {
                for (const key in currentObject) {
                    if (Object.prototype.hasOwnProperty.call(currentObject, key)) {
                        findColorsRecursive(currentObject[key], [...currentPath, key], fileName, parentName, allParams, relativePath);
                    }
                }
            }
        }
    };

    // JSON format spider to find color parameters
    const parseJsonAndExtractColors = (json, fileName, relativePath, allParams) => {
        // FORMAT TYPE 1: VFX Material File (original format)
        const vectorParamsArray = json?.Exports?.[0]?.Data?.find(p => p.Name === 'VectorParameterValues');
        if (vectorParamsArray && vectorParamsArray.Value) {
            vectorParamsArray.Value.forEach((param, paramIndex) => {
                const paramInfo = param?.Value?.find(p => p.Name === 'ParameterInfo');
                const paramName = paramInfo?.Value?.find(p => p.Name === 'Name')?.Value;

                if (paramName) {
                    // Use centralized JSON-driven matcher instead of any hardcoded lists
                    if (!paramMatchesFilter(paramName)) return;

                    const paramValueObj = param?.Value?.find(p => p.Name === 'ParameterValue');
                    const linearColor = paramValueObj?.Value?.find(p => p.Name === 'ParameterValue')?.Value;

                    if (linearColor) {
                        const id = `${relativePath}-${paramName}-${paramIndex}`;
                        const path = [
                            'Exports', 0, 'Data',
                            json.Exports[0].Data.findIndex(p => p.Name === 'VectorParameterValues'),
                            'Value', paramIndex, 'Value',
                            param.Value.findIndex(p => p.Name === 'ParameterValue'),
                            'Value', 0, 'Value'
                        ];

                        const sanitizedRgba = {
                            ...linearColor,
                            R: parseFloat(linearColor.R) || 0,
                            G: parseFloat(linearColor.G) || 0,
                            B: parseFloat(linearColor.B) || 0,
                            A: parseFloat(linearColor.A) || 0,
                        };

                        allParams.push({ id, fileName, paramName, path, rgba: sanitizedRgba, relativePath });
                    }
                }
            });
        }
        // FORMAT TYPE 2: RichText blueprints support
        else if (json?.Exports?.[0]?.$type === "UAssetAPI.ExportTypes.DataTableExport, UAssetAPI" && json.Exports[0].Table?.Data) {
            const tableData = json.Exports[0].Table.Data;
            const tablePath = ['Exports', 0, 'Table', 'Data'];

            tableData.forEach((row, rowIndex) => {
                if (row.StructType === "RichTextStyleRow") {
                    const styleName = row.Name;
                    const rowPath = [...tablePath, rowIndex, 'Value'];
                    findColorsRecursive(row.Value, rowPath, fileName, styleName, allParams, relativePath);
                }
            });
        }
        // FORMAT TYPE 3: Generic? Blueprint support
        else if (Array.isArray(json?.Exports)) {
            json.Exports.forEach((exportItem, exportIndex) => {
                if (Array.isArray(exportItem.Data)) {
                    // Uses export's ObjectName as a descriptive parent name
                    const parentName = exportItem.ObjectName || `Export_${exportIndex}`;
                    const basePath = ['Exports', exportIndex, 'Data'];
                    // recursive search within the Data array of this export
                    findColorsRecursive(exportItem.Data, basePath, fileName, parentName, allParams, relativePath);
                }
            });
        }
    }

    const processFileObjects = (fileObjects, append = false) => {
        let allParams = append ? [...colorParams] : [];
        let newOriginalFiles = append ? { ...originalFiles } : {};

        fileObjects.forEach(fileObj => {
            if (append && newOriginalFiles[fileObj.relativePath]) {
                return;
            }
            try {
                const json = JSON.parse(fileObj.content);
                newOriginalFiles[fileObj.relativePath] = json;
                parseJsonAndExtractColors(json, fileObj.name, fileObj.relativePath, allParams);
            } catch (error) {
                console.error("Error processing file content:", fileObj.name, error);
                alert(`Error processing file ${fileObj.name}.`);
            }
        });

        //  Extract folder list for filtering UI
        const uniqueFolders = [...new Set(allParams.map(p => {
            const lastSlash = p.relativePath.lastIndexOf('/');
            return lastSlash > 0 ? p.relativePath.substring(0, lastSlash) : '/'; // root folder
        }))];
        setFolders(uniqueFolders.sort());
        setSelectedFolders(new Set(uniqueFolders)); // Select all by default

        if (!append) {
            setHistory([allParams]);
            setHistoryIndex(0);
        } else {
            recordHistory(allParams);
        }
        setOriginalFiles(newOriginalFiles);

        // Log unique parameters to Rust console
        const uniqueParamNames = [...new Set(allParams.map(p => p.paramName))].sort();
        invoke('log_unique_params', { paramNames: uniqueParamNames }).catch(e => console.error("Failed to log params:", e));
    };

    const processFiles = async (files, append) => {
        const fileObjects = [];
        const promises = files.map(file => {
            return new Promise((resolve, reject) => {
                if (file.name.endsWith('.json')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        fileObjects.push({
                            name: file.name,
                            content: e.target.result,
                            relativePath: file.webkitRelativePath || file.name
                        });
                        resolve();
                    };
                    reader.onerror = (error) => reject(error);
                    reader.readAsText(file);
                } else {
                    resolve();
                }
            });
        });

        await Promise.all(promises);
        processFileObjects(fileObjects, append);
    };

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        processFiles(files, colorParams.length > 0);
    };

    // === OPEN SETTINGS AND REFRESH CACHE INFO ===
    const handleOpenSettings = async () => {
        setShowSettings(true);
        try {
            const cache = await invoke('get_cache_info');
            setCacheInfo({
                fileCount: cache.file_count,
                totalSizeBytes: cache.total_size_bytes
            });
        } catch (err) {
            addDebugLog(`Failed to refresh cache info: ${err}`);
        }
    };

    // === UASSET FOLDER SELECTION VIA TAURI DIALOG ===
    const handleSelectUassetFolder = async () => {
        if (!settings.usmapPath) {
            alert('Please set a .usmap file path in Settings first!');
            handleOpenSettings();
            return;
        }

        try {
            // Open folder dialog
            const selectedPath = await openDialog({
                directory: true,
                multiple: false,
                title: 'Select folder containing .uasset files'
            });

            if (!selectedPath) return;

            addDebugLog(`Selected folder: ${selectedPath}`);
            setIsConverting(true);
            setConversionProgress({ current: 0, total: 0, fileName: 'Scanning...' });

            // Use backend to find and convert uasset files
            const { readDir, readTextFile } = window.__TAURI__.fs;

            // Recursively find all .uasset files (manual recursion for consistency)
            const findUassetFiles = async (rootDir) => {
                const uassetPaths = [];

                const processDir = async (currentDir) => {
                    try {
                        const entries = await readDir(currentDir);
                        for (const entry of entries) {
                            const fullPath = entry.path || `${currentDir}\\${entry.name}`.replace(/\//g, '\\');

                            if (entry.isDirectory) {
                                await processDir(fullPath);
                            } else {
                                if (entry.name?.endsWith('.uasset')) {
                                    // Normalize paths for relative calculation
                                    const normalizedRoot = rootDir.replace(/\\/g, '/');
                                    const normalizedFull = fullPath.replace(/\\/g, '/');

                                    // Remove rootDir from start
                                    let relativePath = normalizedFull.replace(normalizedRoot, '');
                                    // Remove leading slash if present
                                    if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);

                                    uassetPaths.push({
                                        fullPath: fullPath,
                                        relativePath: relativePath
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        addDebugLog(`Error scanning directory ${currentDir}: ${e}`);
                    }
                };

                await processDir(selectedPath);
                return uassetPaths;
            };

            const uassetFiles = await findUassetFiles(selectedPath);
            addDebugLog(`Found ${uassetFiles.length} .uasset files`);

            // Log first few paths for debugging
            if (uassetFiles.length > 0) {
                addDebugLog(`First path: ${uassetFiles[0].fullPath}`);
            }

            if (uassetFiles.length === 0) {
                alert('No .uasset files found in the selected folder.');
                setIsConverting(false);
                return;
            }

            setConversionProgress({ current: 0, total: uassetFiles.length, fileName: 'Starting conversion...' });

            // Set up progress listener
            const unlisten = await listen('conversion-progress', (event) => {
                const { current, total, fileName, cached, error } = event.payload;
                setConversionProgress({
                    current,
                    total,
                    fileName: `${fileName || 'Converting...'}${cached ? ' (cached)' : ''}${error ? ' - ERROR' : ''}`
                });
                if (cached) {
                    addDebugLog(`[${current}/${total}] ${fileName} (cache hit)`);
                } else if (error) {
                    addDebugLog(`[${current}/${total}] ${fileName} - ERROR: ${error}`);
                } else {
                    addDebugLog(`[${current}/${total}] ${fileName} converted`);
                }
            });

            try {
                // Call batch conversion
                const result = await invoke('batch_convert_uassets_to_json', {
                    uassetPaths: uassetFiles.map(f => f.fullPath),
                    rootPath: selectedPath
                });

                addDebugLog(`Conversion complete: ${result.succeeded}/${result.total} succeeded, ${result.cached_count} from cache`);
                addDebugLog(`Results array has ${result.results?.length || 0} items`);

                // Process the converted JSONs IN PARALLEL for speed
                const fileObjects = [];
                const newSourceMap = { ...uassetSourceMap };

                // Create read promises for all successful results
                const readPromises = result.results
                    .filter(convResult => convResult.success && convResult.json_path)
                    .map(async (convResult) => {
                        try {
                            const jsonContent = await readTextFile(convResult.json_path);

                            // Try to find the original file object using full path first (most reliable)
                            let originalFile = uassetFiles.find(f => f.fullPath === convResult.uasset_path);

                            // Fallback: try finding by filename if path mismatch due to separators
                            if (!originalFile) {
                                originalFile = uassetFiles.find(f => f.fullPath.replace(/\\/g, '/').endsWith(convResult.file_name));
                            }

                            const relPath = originalFile ? originalFile.relativePath : convResult.file_name;
                            const keyPath = relPath.replace(/\.uasset$/i, '.json');

                            return {
                                fileObject: {
                                    name: convResult.file_name.replace(/\.uasset$/i, '.json'),
                                    content: jsonContent,
                                    relativePath: keyPath
                                },
                                sourceEntry: {
                                    keyPath,
                                    uassetPath: convResult.uasset_path,
                                    jsonPath: convResult.json_path
                                }
                            };
                        } catch (err) {
                            addDebugLog(`Failed to read JSON for ${convResult.file_name}: ${err}`);
                            return null;
                        }
                    });

                // Wait for all reads to complete
                const readResults = await Promise.all(readPromises);

                // Show processing state while we parse the JSON data
                setConversionProgress({
                    current: conversionProgress.total,
                    total: conversionProgress.total,
                    fileName: 'Processing asset data...'
                });

                // Process results
                for (const result of readResults) {
                    if (result) {
                        fileObjects.push(result.fileObject);
                        newSourceMap[result.sourceEntry.keyPath] = {
                            uassetPath: result.sourceEntry.uassetPath,
                            jsonPath: result.sourceEntry.jsonPath
                        };
                    }
                }

                addDebugLog(`Read ${fileObjects.length} JSON files in parallel`);

                setUassetSourceMap(newSourceMap);
                addDebugLog(`fileObjects.length = ${fileObjects.length}`);

                // Show final processing state
                setConversionProgress({
                    current: conversionProgress.total,
                    total: conversionProgress.total,
                    fileName: 'Extracting color parameters...'
                });

                await new Promise(resolve => setTimeout(resolve, 50));

                if (fileObjects.length > 0) {
                    processFileObjects(fileObjects, colorParams.length > 0);
                    addDebugLog(`Loaded ${fileObjects.length} files into editor`);
                } else {
                    addDebugLog('WARNING: No fileObjects to load!');
                }

                // Refresh cache info
                const cache = await invoke('get_cache_info');
                setCacheInfo({
                    fileCount: cache.file_count,
                    totalSizeBytes: cache.total_size_bytes
                });

            } finally {
                unlisten();
            }

        } catch (err) {
            addDebugLog(`Error selecting folder: ${err}`);
            if (settings.showDetailedErrors) {
                alert(`Error: ${err}`);
            } else {
                alert('Failed to load uasset files. Check the debug log for details.');
            }
        } finally {
            setIsConverting(false);
            setConversionProgress({ current: 0, total: 0, fileName: '' });
        }
    };



    const handleDragOver = (event) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (event) => {
        event.preventDefault();
        setIsDragging(false);
        addDebugLog("Drop event detected. Delegating to system listener for path resolution.");
    };


    const handleParamChange = (id, newRgba) => {
        const newParams = colorParams.map(p => (p.id === id ? { ...p, rgba: newRgba } : p));
        recordHistory(newParams);
    };


    const handleSelectionChange = (id) => {
        const index = filteredParams.findIndex(p => p.id === id);
        if (index === -1) return;

        setSelectedParams(prev => {
            let next = new Set(prev);

            if ((shiftKeyPressed || altKeyPressed) && lastSelectedIndex !== null) {
                const start = Math.min(lastSelectedIndex, index);
                const end = Math.max(lastSelectedIndex, index);
                for (let i = start; i <= end; i++) {
                    const currentId = filteredParams[i].id;
                    if (altKeyPressed) {
                        next.delete(currentId); // deselect range
                    } else {
                        next.add(currentId);    // select range
                    }
                }
            } else {
                if (next.has(id)) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
            }

            return next;
        });

        setLastSelectedIndex(index);
    };



    const handleSelectAll = () => {
        if (selectedParams.size === filteredParams.length) {
            setSelectedParams(new Set());
        } else {
            setSelectedParams(new Set(filteredParams.map(p => p.id)));
        }
    };

    const applyColor = (p, newColorRgba, options = {}) => {
        const { ignoreGrayscaleCheck = false } = options;
        const isGrayscale = p.rgba.R === p.rgba.G && p.rgba.G === p.rgba.B;

        //  added 'ignoreGrayscaleCheck' to bypass it when needed
        if (!ignoreGrayscaleCheck && ignoreGrayscale && isGrayscale) {
            return p.rgba;
        }

        if (preserveIntensity) {
            const originalIntensity = Math.max(p.rgba.R, p.rgba.G, p.rgba.B);
            if (originalIntensity === 0) return { ...p.rgba, R: 0, G: 0, B: 0 };

            const maxNew = Math.max(newColorRgba.r, newColorRgba.g, newColorRgba.b);
            if (maxNew === 0) return { ...p.rgba, R: 0, G: 0, B: 0 };

            const normalizedNewR = newColorRgba.r / maxNew;
            const normalizedNewG = newColorRgba.g / maxNew;
            const normalizedNewB = newColorRgba.b / maxNew;

            return {
                ...p.rgba,
                R: normalizedNewR * originalIntensity,
                G: normalizedNewG * originalIntensity,
                B: normalizedNewB * originalIntensity,
            };
        } else {
            return { ...p.rgba, R: newColorRgba.r, G: newColorRgba.g, B: newColorRgba.b };
        }
    };

    const applyMasterColor = () => {
        if (selectedParams.size === 0) {
            alert("No parameters selected. Please select at least one parameter before applying the master color.");
            return;
        }
        const newRgba = hexToRgba(masterColor);
        const newParams = colorParams.map(p => {
            if (selectedParams.has(p.id)) {
                return { ...p, rgba: applyColor(p, newRgba) };
            }
            return p;
        });
        recordHistory(newParams);
    };

    const applyHueShift = () => {
        if (selectedParams.size === 0) {
            alert("No parameters selected. Please select at least one parameter before applying the hue shift.");
            return;
        }

        const newParams = colorParams.map(p => {
            if (selectedParams.has(p.id)) {
                const isGrayscale = p.rgba.R === p.rgba.G && p.rgba.G === p.rgba.B;
                if (ignoreGrayscale && isGrayscale) return p;

                const originalIntensity = Math.max(p.rgba.R, p.rgba.G, p.rgba.B);
                const [h, s, l] = rgbToHsl(p.rgba.R, p.rgba.G, p.rgba.B);

                let newHue = h + (hueShiftValue / 360);
                if (newHue < 0) newHue += 1;
                if (newHue > 1) newHue -= 1;

                const [r, g, b] = hslToRgb(newHue, s, l);

                return { ...p, rgba: { ...p.rgba, R: r * originalIntensity, G: g * originalIntensity, B: b * originalIntensity } };
            }
            return p;
        });
        recordHistory(newParams);

        setHueShiftValue(0);
    };

    const applyShuffle = () => {
        if (selectedParams.size === 0) {
            alert("No parameters selected. Please select at least one parameter before applying shuffle.");
            return;
        }

        const selectedFiles = [...new Set(colorParams.filter(p => selectedParams.has(p.id)).map(p => p.fileName))];
        const fileToColorMap = {};
        selectedFiles.forEach((fileName, index) => {
            fileToColorMap[fileName] = shuffleColors[index % shuffleColors.length];
        });

        const newParams = colorParams.map(p => {
            if (selectedParams.has(p.id)) {
                const newColorHex = fileToColorMap[p.fileName];
                if (newColorHex) {
                    const newRgba = hexToRgba(newColorHex);
                    return { ...p, rgba: applyColor(p, newRgba) };
                }
            }
            return p;
        });
        recordHistory(newParams);
    };

    const handleShuffleColorChange = (index, color) => {
        const newShuffleColors = [...shuffleColors];
        newShuffleColors[index] = color;
        setShuffleColors(newShuffleColors);
    };


    const handleSave = async () => {
        if (colorParams.length === 0) {
            alert("No parameters to save.");
            return;
        }

        setSaveStatus('Saving...');

        const modifiedFiles = JSON.parse(JSON.stringify(originalFiles));
        colorParams.forEach(param => {
            // Use relativePath to get the right path
            const fileToModify = modifiedFiles[param.relativePath];
            if (fileToModify) {
                setNestedValue(fileToModify, param.path, param.rgba);
            }
        });

        const filesToSave = new Set(Object.keys(modifiedFiles));

        try {
            let dirHandle = directoryHandleRef.current;
            // Asks for save path only one time
            if (!dirHandle) {
                dirHandle = await window.showDirectoryPicker();
                directoryHandleRef.current = dirHandle;
            }
            const outputDirHandle = await dirHandle.getDirectoryHandle('output', { create: true });

            for (const relativePath of filesToSave) {
                const pathParts = relativePath.split('/');
                const fileName = pathParts.pop(); // Gets file name
                let currentDirHandle = outputDirHandle;

                // Make every subfolder needed
                for (const part of pathParts) {
                    currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: true });
                }

                // Write new files to the right folder
                const fileHandle = await currentDirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(modifiedFiles[relativePath], null, 2));
                await writable.close();
            }

            setSaveStatus(`All ${filesToSave.size} files saved to 'output' folder!`);

        } catch (err) {
            console.error("Error saving files:", err);
            if (err.name !== 'AbortError') {
                setSaveStatus(`Error: ${err.message}.`);
            } else {
                setSaveStatus('Save cancelled.');
            }
        }

        setTimeout(() => setSaveStatus(''), 10000);
    };

    // === SAVE AS UASSET - Convert edited JSONs back to .uasset files ===
    const handleSaveAsUasset = async () => {
        // Check if we have uasset source files
        const uassetKeys = Object.keys(uassetSourceMap);
        if (uassetKeys.length === 0) {
            alert("No UAsset files to save. Load .uasset files first using the UAsset button.");
            return;
        }

        // Determine which files have actually been edited
        const editedFilePaths = new Set();
        colorParams.forEach(param => {
            const originalFile = originalFiles[param.relativePath];
            if (!originalFile) return;

            // Get the original value at this path
            let originalValue = originalFile;
            for (const key of param.path) {
                if (originalValue && typeof originalValue === 'object') {
                    originalValue = originalValue[key];
                } else {
                    originalValue = undefined;
                    break;
                }
            }

            // Compare current value vs original
            if (originalValue && (
                param.rgba.R !== originalValue.R ||
                param.rgba.G !== originalValue.G ||
                param.rgba.B !== originalValue.B ||
                param.rgba.A !== originalValue.A
            )) {
                editedFilePaths.add(param.relativePath);
            }
        });

        if (editedFilePaths.size === 0) {
            alert("No edited parameters to save. Make some changes first!");
            return;
        }

        // Filter uassetKeys to only include edited files
        const editedUassetKeys = uassetKeys.filter(key => editedFilePaths.has(key));

        try {
            // Select output folder
            const outputPath = await openDialog({
                directory: true,
                multiple: false,
                title: 'Select folder to save .uasset files'
            });

            if (!outputPath) return;

            setSaveStatus('Saving UAsset files...');
            setIsConverting(true);
            setConversionProgress({ current: 0, total: editedUassetKeys.length, fileName: 'Preparing...' });

            const { writeTextFile } = window.__TAURI__.fs;

            // First, apply edits to the cached JSON files
            const modifiedFiles = JSON.parse(JSON.stringify(originalFiles));
            colorParams.forEach(param => {
                const fileToModify = modifiedFiles[param.relativePath];
                if (fileToModify) {
                    setNestedValue(fileToModify, param.path, param.rgba);
                }
            });

            // Write modified JSONs back to cache IN PARALLEL for speed
            const writePromises = [];
            const jsonPathsForConversion = [];
            let writeProgress = 0;
            const totalToWrite = editedUassetKeys.filter(k => uassetSourceMap[k]?.jsonPath && modifiedFiles[k]).length;

            for (const keyPath of editedUassetKeys) {
                const sourceInfo = uassetSourceMap[keyPath];
                if (sourceInfo && sourceInfo.jsonPath && modifiedFiles[keyPath]) {
                    const jsonContent = JSON.stringify(modifiedFiles[keyPath], null, 2);
                    // Preserve folder structure: use full relative path with .uasset extension
                    const outputRelativePath = keyPath.replace(/\.json$/i, '.uasset');

                    // Queue the write operation
                    writePromises.push(
                        writeTextFile(sourceInfo.jsonPath, jsonContent)
                            .then(() => {
                                jsonPathsForConversion.push({
                                    jsonPath: sourceInfo.jsonPath,
                                    outputName: outputRelativePath
                                });
                                writeProgress++;
                                // Extract just filename for display
                                const displayName = outputRelativePath.split('/').pop();
                                setConversionProgress({
                                    current: writeProgress,
                                    total: totalToWrite,
                                    fileName: `Preparing: ${displayName}`
                                });
                            })
                            .catch(err => {
                                addDebugLog(`Failed to write JSON ${keyPath}: ${err}`);
                                writeProgress++;
                            })
                    );
                }
            }

            // Wait for all writes to complete in parallel
            await Promise.all(writePromises);
            addDebugLog(`Wrote ${jsonPathsForConversion.length} JSON files in parallel (${editedFilePaths.size} edited)`);

            if (jsonPathsForConversion.length === 0) {
                alert("No JSON files were modified. Nothing to convert.");
                setIsConverting(false);
                setSaveStatus('');
                return;
            }

            setConversionProgress({ current: 0, total: jsonPathsForConversion.length, fileName: 'Converting to UAsset...' });

            // Set up progress listener
            const unlisten = await listen('conversion-progress', (event) => {
                const { current, total, fileName, error } = event.payload;
                setConversionProgress({
                    current,
                    total,
                    fileName: `${fileName || 'Converting...'}${error ? ' - ERROR' : ''}`
                });
            });

            try {
                // Call batch conversion from JSON to UAsset
                const invokeArgs = {
                    jsonPaths: jsonPathsForConversion.map(f => `${f.jsonPath},${f.outputName}`),
                    outputDir: outputPath
                };
                addDebugLog(`Invoking batch_convert_jsons_to_uassets with ${invokeArgs.jsonPaths.length} files`);
                addDebugLog(`Output dir: ${outputPath}`);
                addDebugLog(`First jsonPath entry: ${invokeArgs.jsonPaths[0]}`);

                const result = await invoke('batch_convert_jsons_to_uassets', invokeArgs);

                addDebugLog(`Result: ${JSON.stringify(result)}`);
                addDebugLog(`Conversion complete: ${result.succeeded}/${result.total} succeeded`);

                if (result.succeeded > 0) {
                    setSaveStatus(`Saved ${result.succeeded} .uasset files to output folder!`);
                } else {
                    setSaveStatus(`Conversion failed. Check debug log for details.`);
                }

            } catch (invokeErr) {
                addDebugLog(`Invoke error: ${invokeErr}`);
                throw invokeErr;
            } finally {
                unlisten();
            }

        } catch (err) {
            addDebugLog(`Error saving UAsset files: ${err}`);
            setSaveStatus(`Error: ${err}`);
        } finally {
            setIsConverting(false);
            setConversionProgress({ current: 0, total: 0, fileName: '' });
            setTimeout(() => setSaveStatus(''), 10000);
        }
    };

    // Session saving feature
    const sessionFileInputRef = useRef(null);

    const handleExportSession = async () => {
        if (selectedParams.size === 0) {
            alert("No parameters selected to export. Please select at least one parameter.");
            return;
        }

        const sessionData = colorParams
            .filter(p => selectedParams.has(p.id))
            .map(p => ({
                relativePath: p.relativePath.replace(/\.json$/i, ''),
                paramName: p.paramName,
                rgba: p.rgba
            }));

        const jsonString = JSON.stringify(sessionData, null, 2);

        try {
            const { save } = window.__TAURI__.dialog;
            const { writeTextFile } = window.__TAURI__.fs;

            // Use Tauri's save dialog
            const fileName = sessionName.endsWith('.rvfxp') ? sessionName : `${sessionName}.rvfxp`;
            const filePath = await save({
                title: "Export Project File",
                defaultPath: fileName,
                filters: [{
                    name: 'RVFX Project',
                    extensions: ['rvfxp']
                }]
            });

            if (!filePath) return; // User cancelled

            await writeTextFile(filePath, jsonString);
            alert(`Project exported successfully!`);

        } catch (err) {
            console.error("Failed to export session:", err);
            alert(`Failed to export session: ${err.message || err}`);
        }
    };

    const handleImportSession = async () => {
        try {
            const { open } = window.__TAURI__.dialog;
            const { readTextFile } = window.__TAURI__.fs;

            // Use Tauri's open dialog
            const filePath = await open({
                title: "Import Project File",
                multiple: false,
                filters: [{
                    name: 'RVFX Project',
                    extensions: ['rvfxp', 'json']
                }]
            });

            if (!filePath) return; // User cancelled

            const content = await readTextFile(filePath);
            const sessionData = JSON.parse(content);

            if (!Array.isArray(sessionData)) {
                alert("Invalid project file format.");
                return;
            }

            addDebugLog(`Importing project with ${sessionData.length} entries`);

            // Helper to extract just the filename from a path
            const getFileName = (path) => {
                if (!path) return '';
                const normalized = path.replace(/\\/g, '/');
                const parts = normalized.split('/');
                return parts[parts.length - 1];
            };

            // Helper to normalize paths for comparison
            const normalizePath = (path) => {
                if (!path) return '';
                return path
                    .replace(/\\/g, '/')
                    .replace(/\.json$/i, '')
                    .replace(/\.uasset$/i, '')
                    .toLowerCase();
            };

            let updatedCount = 0;

            // Create a new array with updates applied
            const newColorParams = colorParams.map(param => {
                const paramNormalizedPath = normalizePath(param.relativePath);
                const paramFileName = getFileName(param.relativePath);

                // Try exact path match first
                let matchingEntry = sessionData.find(entry => {
                    const entryNormalizedPath = normalizePath(entry.relativePath);
                    return entryNormalizedPath === paramNormalizedPath &&
                        entry.paramName === param.paramName;
                });

                // Fallback: try filename-only match
                if (!matchingEntry) {
                    matchingEntry = sessionData.find(entry => {
                        const entryFileName = getFileName(entry.relativePath);
                        return entryFileName.toLowerCase() === paramFileName.toLowerCase() &&
                            entry.paramName === param.paramName;
                    });
                }

                if (matchingEntry && matchingEntry.rgba) {
                    updatedCount++;
                    return {
                        ...param,
                        rgba: {
                            R: matchingEntry.rgba.R !== undefined ? matchingEntry.rgba.R : param.rgba.R,
                            G: matchingEntry.rgba.G !== undefined ? matchingEntry.rgba.G : param.rgba.G,
                            B: matchingEntry.rgba.B !== undefined ? matchingEntry.rgba.B : param.rgba.B,
                            A: matchingEntry.rgba.A !== undefined ? matchingEntry.rgba.A : param.rgba.A
                        }
                    };
                }
                return param;
            });

            setColorParams(newColorParams);
            addDebugLog(`Updated ${updatedCount} parameters from import`);

            if (updatedCount > 0) {
                alert(`Project imported successfully! ${updatedCount} parameters were updated.`);
            } else {
                alert(`Project file loaded but no matching parameters found. The file structure may not match the currently loaded assets.`);
            }

        } catch (err) {
            console.error("Failed to import session:", err);
            alert(`Failed to import session: ${err.message || err}`);
        }
    };

    // Legacy handler for hidden file input (keeping for backwards compatibility)
    const onSessionFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const sessionData = JSON.parse(e.target.result);

                if (!Array.isArray(sessionData)) {
                    alert("Invalid project file format.");
                    return;
                }

                const getFileName = (path) => {
                    if (!path) return '';
                    const normalized = path.replace(/\\/g, '/');
                    const parts = normalized.split('/');
                    return parts[parts.length - 1];
                };

                const normalizePath = (path) => {
                    if (!path) return '';
                    return path
                        .replace(/\\/g, '/')
                        .replace(/\.json$/i, '')
                        .replace(/\.uasset$/i, '')
                        .toLowerCase();
                };

                let updatedCount = 0;

                const newParams = colorParams.map(p => {
                    const normalizedPath = normalizePath(p.relativePath);
                    const fileName = getFileName(p.relativePath);

                    let matchingEntry = sessionData.find(entry => {
                        const entryNormalizedPath = normalizePath(entry.relativePath);
                        return entryNormalizedPath === normalizedPath &&
                            entry.paramName === p.paramName;
                    });

                    if (!matchingEntry) {
                        matchingEntry = sessionData.find(entry => {
                            const entryFileName = getFileName(entry.relativePath);
                            return entryFileName.toLowerCase() === fileName.toLowerCase() &&
                                entry.paramName === p.paramName;
                        });
                    }

                    if (matchingEntry && matchingEntry.rgba) {
                        updatedCount++;
                        return {
                            ...p,
                            rgba: {
                                R: matchingEntry.rgba.R !== undefined ? matchingEntry.rgba.R : p.rgba.R,
                                G: matchingEntry.rgba.G !== undefined ? matchingEntry.rgba.G : p.rgba.G,
                                B: matchingEntry.rgba.B !== undefined ? matchingEntry.rgba.B : p.rgba.B,
                                A: matchingEntry.rgba.A !== undefined ? matchingEntry.rgba.A : p.rgba.A
                            }
                        };
                    }
                    return p;
                });

                setColorParams(newParams);

                if (updatedCount > 0) {
                    alert(`Project imported successfully! ${updatedCount} parameters were updated.`);
                } else {
                    alert(`Project file loaded but no matching parameters found.`);
                }

            } catch (error) {
                console.error("Failed to import session:", error);
                alert(`Failed to import session: ${error.message}`);
            }
        };
        reader.readAsText(file);
        event.target.value = null;
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'none'; // Cycle back to no sort
            key = null;
        }
        setSortConfig({ key, direction });
    };

    const handleFilterDictionaryChange = async (newDictionary) => {
        setFilterDictionary(newDictionary);

        // Also update backend settings
        try {
            await invoke('set_filter_dictionary', { dictionary: newDictionary });
            setSettings(prev => ({ ...prev, filterDictionary: newDictionary }));
        } catch (err) {
            console.error("Failed to save filter dictionary:", err);
            addDebugLog(`Failed to save filter settings: ${err}`);
        }
    };

    const handleFolderToggle = (folder) => {
        setSelectedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folder)) {
                newSet.delete(folder);
            } else {
                newSet.add(folder);
            }
            return newSet;
        });
    };

    const filteredParams = useMemo(() => {
        let sortableParams = [...colorParams];

        if (sortConfig.key !== null && sortConfig.direction !== 'none') {
            sortableParams.sort((a, b) => {
                if (sortConfig.key === 'color') {
                    const [hA, sA, lA] = rgbToHsl(a.rgba.R, a.rgba.G, a.rgba.B);
                    const [hB, sB, lB] = rgbToHsl(b.rgba.R, b.rgba.G, b.rgba.B);

                    if (hA < hB) return -1;
                    if (hA > hB) return 1;
                    if (sA < sB) return -1;
                    if (sA > sB) return 1;
                    if (lA < lB) return -1;
                    if (lA > lB) return 1;
                    return 0;
                }
                return 0;
            });
            if (sortConfig.direction === 'descending') {
                sortableParams.reverse();
            }
        }

        // Apply filters AFTER sorting or on the original array
        let params = sortableParams;

        // Filter by selected folders
        if (folders.length > 0) {
            params = params.filter(p => {
                const lastSlash = p.relativePath.lastIndexOf('/');
                const folder = lastSlash > 0 ? p.relativePath.substring(0, lastSlash) : '/';
                return selectedFolders.has(folder);
            });
        }

        if (!showGrayscale) {
            params = params.filter(p => p.rgba.R !== p.rgba.G || p.rgba.G !== p.rgba.B);
        }

        if (!showEnemy) {
            params = params.filter(p =>
                !p.paramName.toLowerCase().includes('enemy') &&
                !p.fileName.toLowerCase().includes('enemy') &&
                !p.relativePath.toLowerCase().includes('enemy')
            );
        }

        if (searchTerm) {
            params = params.filter(p =>
                p.paramName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.fileName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return params;
    }, [colorParams, searchTerm, showGrayscale, showEnemy, selectedFolders, folders, sortConfig]);

    return (
        <div style={{ backgroundColor: 'var(--bg-4)', color: 'var(--text-3)' }} className="min-h-screen p-6">
            {/* Debug toggle button (hidden) */}
            <button
                onClick={() => setShowDebug(!showDebug)}
                className="fixed bottom-4 right-4 z-50 px-3 py-2 rounded text-xs font-mono hidden"
                style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}
                title="Toggle Debug Console"
            >
                {showDebug ? 'Hide' : 'Show'} Debug
            </button>


            {/* Debug overlay */}
            {showDebug && (
                <div className="fixed bottom-16 right-4 w-96 max-h-96 overflow-auto z-50 p-4 rounded shadow-lg font-mono text-xs"
                    style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-2)', border: '2px solid var(--accent-main)' }}>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold">Debug Console</h3>
                        <button onClick={() => setDebugLog([])} className="px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: 'var(--bg-3)' }}>Clear</button>
                    </div>
                    <div className="space-y-1">
                        {debugLog.length === 0 ? (
                            <p style={{ color: 'var(--text-4)' }}>No logs yet...</p>
                        ) : (
                            debugLog.map((log, i) => (
                                <div key={i} className="break-all" style={{ color: 'var(--text-3)' }}>{log}</div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <div className="w-full">
                <div className="relative group p-4 border-2 particle-header" style={{ borderColor: 'var(--bg-2)' }}>
                    {/* Reset button */}
                    {/* Advanced Filter Settings button */}
                    <button
                        title="Advanced Parser Settings"
                        onClick={() => setShowFilterSettings(true)}
                        className="absolute top-1 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
                        style={{ right: '5.5rem' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 9.75V10.5" />
                        </svg>
                    </button>
                    <button
                        title="Settings"
                        onClick={handleOpenSettings}
                        className="absolute top-1 right-12 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        {!settings.usmapPath && (
                            <span className="absolute top-2 right-2 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                    <button
                        ref={resetButtonRef}
                        title="Long press to Reset"
                        className="absolute top-1 right-2 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
                        onMouseDown={handleResetPress}
                        onMouseUp={handleResetRelease}
                        onMouseLeave={handleResetRelease}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                    </button>
                    <Particles />
                    <div className="absolute inset-0 border-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--accent-main)', zIndex: 2 }}></div>
                    <div className="flex items-center gap-4 relative" style={{ zIndex: 1 }}>
                        <img src="./assets/saturn-logo.svg" alt="Rivals Logo" className="h-24 filter brightness-0 invert" />
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-5xl font-normal" style={{ color: 'var(--text-1)' }}>Rivals VFX Editor</h1>
                            <h2 className="text-1xl font-medium" style={{ color: 'var(--text-4)' }}>v2.0.0</h2>
                        </div>
                    </div>
                    <span className="absolute bottom-2 right-4 text-xs" style={{ color: 'var(--text-4)', zIndex: 1 }}>
                        by Saturn
                    </span>
                </div>

                <div className="my-8">
                    {colorParams.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
                            <div className="lg:col-span-3">
                                <StyledPanel title="Global Controls">
                                    <div className="flex flex-col space-y-6">
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
                                                        maxLength="7"
                                                    />
                                                </div>
                                                <button onClick={applyMasterColor} className="flex-grow px-4 py-3 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }} disabled={selectedParams.size === 0}>
                                                    Apply Single
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--bg-2)' }}>
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-lg font-medium" style={{ color: 'var(--text-2)' }}>Hue Shift</h3>
                                                <span className="font-mono text-lg" style={{ color: 'var(--text-3)' }}>{hueShiftValue}°</span>
                                            </div>
                                            <div>
                                                <input id="hue-shift" type="range" min="-180" max="180" value={hueShiftValue}
                                                    onChange={(e) => setHueShiftValue(parseInt(e.target.value))}
                                                    onDoubleClick={() => setHueShiftValue(0)}
                                                    className="w-full h-2 rounded-none appearance-none cursor-pointer" />
                                            </div>
                                            <button onClick={applyHueShift} className="w-full px-4 py-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }} disabled={selectedParams.size === 0}>
                                                Apply Hue Shift
                                            </button>
                                        </div>
                                        <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--bg-2)' }}>
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="text-lg font-medium" style={{ color: 'var(--text-2)' }}>Color Shuffle</h3>
                                                <ToggleSwitch label="5 Colors" enabled={useFiveColors} setEnabled={setUseFiveColors} />
                                            </div>
                                            <div className="flex flex-col gap-4">
                                                <div className="flex justify-around items-center">
                                                    {shuffleColors.slice(0, 3).map((color, index) => (
                                                        <div key={index} className="flex flex-col items-center gap-2">
                                                            <input
                                                                type="color"
                                                                value={color}
                                                                onChange={(e) => handleShuffleColorChange(index, e.target.value)}
                                                                className="w-12 h-12 p-0 border-0 rounded-none cursor-pointer" style={{ backgroundColor: 'transparent' }}
                                                            />
                                                            <input
                                                                type="text"
                                                                value={color.toUpperCase()}
                                                                onChange={(e) => handleShuffleColorChange(index, e.target.value)}
                                                                className="w-20 px-1 py-0.5 text-xs text-center font-mono focus:outline-none border-2 rounded-none"
                                                                style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-2)', borderColor: 'var(--bg-2)' }}
                                                                maxLength="7"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                {useFiveColors && (
                                                    <div className="flex justify-center gap-8 items-center">
                                                        {shuffleColors.slice(3).map((color, index) => (
                                                            <div key={index + 3} className="flex flex-col items-center gap-2">
                                                                <input
                                                                    type="color"
                                                                    value={color}
                                                                    onChange={(e) => handleShuffleColorChange(index + 3, e.target.value)}
                                                                    className="w-12 h-12 p-0 border-0 rounded-none cursor-pointer" style={{ backgroundColor: 'transparent' }}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={color.toUpperCase()}
                                                                    onChange={(e) => handleShuffleColorChange(index + 3, e.target.value)}
                                                                    className="w-20 px-1 py-0.5 text-xs text-center font-mono focus:outline-none border-2 rounded-none"
                                                                    style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-2)', borderColor: 'var(--bg-2)' }}
                                                                    maxLength="7"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button onClick={applyShuffle} className="w-full px-4 py-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }} disabled={selectedParams.size === 0}>
                                                Apply Shuffle
                                            </button>
                                        </div>
                                        <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--bg-2)' }}>
                                            <ToggleSwitch label="Preserve Intensity (Recommended)" enabled={preserveIntensity} setEnabled={setPreserveIntensity} />
                                            <ToggleSwitch label="Ignore Grayscale (R=G=B)" enabled={ignoreGrayscale} setEnabled={setIgnoreGrayscale} />
                                        </div>
                                    </div>
                                </StyledPanel>
                            </div>

                            <div className="lg:col-span-7">
                                <StyledPanel title="Parameters">
                                    <input
                                        type="file"
                                        ref={sessionFileInputRef}
                                        className="hidden"
                                        accept=".rvfxp"
                                        onChange={onSessionFileSelected}
                                    />
                                    <div className="p-4 flex flex-col gap-4 border-b" style={{ borderColor: 'var(--bg-2)' }}>
                                        <div className="flex justify-between items-start w-full gap-4">
                                            {/* Left group: folder filters - intentionally left empty or removed as it's now below search */}
                                            <div className="hidden">
                                            </div>

                                            {/* Right group: controls container - separated into rows */}
                                            <div className="flex flex-col gap-4 w-full">
                                                {/* Top Row: Project Settings */}
                                                <div className="flex items-center justify-end gap-2">
                                                    <label htmlFor="sessionNameInput" className="text-sm" style={{ color: 'var(--text-3)' }}>Project Filename:</label>
                                                    <input
                                                        id="sessionNameInput"
                                                        type="text"
                                                        value={sessionName}
                                                        onChange={(e) => setSessionName(e.target.value)}
                                                        className="w-48 px-3 py-1 rounded-none focus:outline-none focus:ring-2"
                                                        style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--text-2)', 'ringColor': 'var(--accent-main)' }}
                                                    />
                                                    <span className="text-sm" style={{ color: 'var(--text-4)' }}>.rvfxp</span>
                                                    <button onClick={handleImportSession} title="Import Project" className="flex items-center justify-center w-8 h-8 rounded-none transition-colors shadow-md ml-2" style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-1)' }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                    </button>
                                                    <button onClick={handleExportSession} title="Export Selected to Project" className="flex items-center justify-center w-8 h-8 rounded-none transition-colors shadow-md" style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-1)' }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                                    </button>
                                                </div>

                                                {/* Second Row: Filter, Options & Actions */}
                                                <div className="flex flex-col md:flex-row items-start justify-between gap-4 w-full">
                                                    {/* Left: Filter & Display Options */}
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-4">
                                                            <input
                                                                type="text"
                                                                placeholder="Filter by name..."
                                                                value={searchTerm}
                                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                                className="w-full sm:w-64 px-3 py-2 rounded-none focus:outline-none focus:ring-2"
                                                                style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--text-2)', 'ringColor': 'var(--accent-main)' }}
                                                            />
                                                            <label className="flex items-center text-sm cursor-pointer whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                                                                <input type="checkbox" checked={showGrayscale} onChange={() => setShowGrayscale(!showGrayscale)} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0 mr-2" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }} />
                                                                Show Grayscale
                                                            </label>
                                                            <label className="flex items-center text-sm cursor-pointer whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                                                                <input type="checkbox" checked={showEnemy} onChange={() => setShowEnemy(!showEnemy)} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0 mr-2" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }} />
                                                                Show Enemy
                                                            </label>
                                                        </div>
                                                        {folders.length > 1 && (
                                                            <div>
                                                                <h4 className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Filter by Folder:</h4>
                                                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                                    {folders.map(folder => (
                                                                        <label key={folder} className="flex items-center text-xs cursor-pointer" style={{ color: 'var(--text-3)' }}>
                                                                            <input type="checkbox" checked={selectedFolders.has(folder)} onChange={() => handleFolderToggle(folder)} className="w-3 h-3 rounded-none focus:ring-offset-0 focus:ring-0 mr-1" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }} />
                                                                            {folder === '/' ? 'Root' : folder}
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right: Actions (Undo/Redo/Save) */}
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={handleUndo} title="Undo (Ctrl+Z)" className="flex items-center justify-center p-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-1)' }} disabled={historyIndex === 0}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                                                        </button>
                                                        <button onClick={handleRedo} title="Redo (Ctrl+Y or Shift+Ctrl+Z)" className="flex items-center justify-center p-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-1)' }} disabled={historyIndex >= history.length - 1}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                                        </button>
                                                        {Object.keys(uassetSourceMap).length > 0 ? (
                                                            <button onClick={handleSaveAsUasset} disabled={isConverting} className="flex items-center gap-2 px-6 py-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50" style={{ backgroundColor: 'var(--accent-green)', color: 'var(--text-1)' }}>
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4M7 21h10M5 21H3V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2h-2M12 11v-4M9 11h6"></path>
                                                                </svg>
                                                                Save UAsset
                                                            </button>
                                                        ) : (
                                                            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 font-medium rounded-none transition-colors shadow-md" style={{ backgroundColor: 'var(--accent-green)', color: 'var(--text-1)' }}>
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4M7 21h10M5 21H3V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2h-2M12 11v-4M9 11h6"></path>
                                                                </svg>
                                                                Save JSON
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Status Message Row */}
                                                <div className="flex justify-end h-6">
                                                    {saveStatus && <span className="text-sm whitespace-nowrap" style={{ color: 'var(--text-4)' }}>{saveStatus}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm" style={{ color: 'var(--text-4)' }}>
                                            {filteredParams.length} color parameters found across {new Set(filteredParams.map(p => p.relativePath)).size} assets. <span style={{ color: 'var(--accent-main)' }}>{selectedParams.size} selected.</span>
                                        </p>
                                    </div>
                                    <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
                                        <table className="w-full text-sm text-left">
                                            <thead style={{ color: 'var(--text-4)' }}>
                                                <tr style={{ borderBottom: '2px solid var(--bg-2)' }}>
                                                    <th scope="col" className="p-4">
                                                        <input type="checkbox" onChange={handleSelectAll} checked={filteredParams.length > 0 && selectedParams.size === filteredParams.length} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }} />
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider">Path</th>
                                                    <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider">Parameter Name</th>
                                                    <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider cursor-pointer" onClick={() => requestSort('color')}>
                                                        <div className="flex items-center gap-2">
                                                            <span>Color</span>
                                                            {sortConfig.key === 'color' && sortConfig.direction === 'ascending' && <span>▲</span>}
                                                            {sortConfig.key === 'color' && sortConfig.direction === 'descending' && <span>▼</span>}
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
                                                                    onChange={() => handleSelectionChange(p.id)}
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
                                                                            // call applyColor with the option bypassing the grayscale check
                                                                            const finalRgba = applyColor(p, newColorRgba, { ignoreGrayscaleCheck: true });
                                                                            handleParamChange(p.id, finalRgba);
                                                                        }}
                                                                        className="w-8 h-8 p-0 border-2 cursor-pointer"
                                                                        style={{ backgroundColor: 'transparent', borderColor: 'var(--bg-1)' }}
                                                                    />
                                                                    <EditableHexInput
                                                                        initialHex={displayHexColor}
                                                                        onCommit={(newHex) => {
                                                                            const newColorRgba = hexToRgba(newHex);
                                                                            const finalRgba = applyColor(p, newColorRgba, { ignoreGrayscaleCheck: true });
                                                                            handleParamChange(p.id, finalRgba);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </td>
                                                            {['R', 'G', 'B', 'A'].map(channel => (
                                                                <td key={channel} className="px-2 py-2">
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={(Number(p.rgba[channel]) || 0).toFixed(4)}
                                                                        onChange={(e) => handleParamChange(p.id, { ...p.rgba, [channel]: parseFloat(e.target.value) || 0 })}
                                                                        className="w-24 px-2 py-1 rounded-none text-center focus:outline-none focus:ring-2"
                                                                        style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--text-2)', 'ringColor': 'var(--accent-main)' }}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </StyledPanel>
                            </div>
                        </div>
                    ) : (
                        <div className="my-8">
                            <StyledPanel title="Load Files">
                                <div
                                    className={`text-center py-20 px-6 border-2 border-dashed transition-colors`}
                                    style={{ backgroundColor: 'var(--bg-2)', borderColor: isDragging ? 'var(--accent-main)' : 'var(--bg-1)', opacity: settings.usmapPath ? 1 : 0.6 }}
                                    onDragOver={settings.usmapPath ? handleDragOver : undefined}
                                    onDragLeave={settings.usmapPath ? handleDragLeave : undefined}
                                    onDrop={settings.usmapPath ? handleDrop : undefined}
                                >
                                    <div
                                        onClick={settings.usmapPath ? handleSelectUassetFolder : undefined}
                                        className={`w-full h-full flex flex-col items-center justify-center ${settings.usmapPath ? 'cursor-pointer' : 'cursor-not-allowed'}`}
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
                                        <p className="mt-1 text-sm font-medium" style={{ color: settings.usmapPath ? 'var(--text-4)' : 'var(--accent-warning, #f59e0b)' }}>
                                            {settings.usmapPath
                                                ? "Drag and drop .uasset files or click here to browse."
                                                : "Set a valid mapping file in the settings to proceed"}
                                        </p>
                                    </div>
                                </div>
                            </StyledPanel>
                        </div>
                    )
                    }
                </div >
            </div >

            {/* === SETTINGS PANEL MODAL === */}
            {
                showSettings && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                        <div className="w-full max-w-md p-6 shadow-xl border-2 relative group" style={{ backgroundColor: 'var(--bg-3)', borderColor: 'var(--bg-2)' }}>
                            <div className="absolute inset-0 border-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--accent-main)', zIndex: 10 }}></div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Settings</h2>
                                <button onClick={() => setShowSettings(false)} className="p-1 rounded hover:bg-white/10 transform hover:scale-125 transition-transform duration-200" style={{ color: 'var(--text-2)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Usmap Path */}
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>
                                        .usmap File Path
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={settings.usmapPath || ''}
                                            readOnly
                                            placeholder="No .usmap file selected"
                                            className="flex-grow px-3 py-2 rounded-none text-sm"
                                            style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-3)' }}
                                        />
                                        <button
                                            onClick={async () => {
                                                const path = await openDialog({
                                                    filters: [{ name: 'Usmap', extensions: ['usmap'] }],
                                                    multiple: false,
                                                    title: 'Select .usmap mapping file'
                                                });
                                                if (path) {
                                                    await invoke('set_usmap_path', { path });
                                                    setSettings(prev => ({ ...prev, usmapPath: path }));
                                                }
                                            }}
                                            className="px-4 py-2 font-medium rounded-none"
                                            style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}
                                        >
                                            Browse
                                        </button>
                                    </div>
                                </div>

                                {/* Cache Info */}
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>
                                        Conversion Cache
                                    </label>
                                    <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: 'var(--bg-2)' }}>
                                        <span className="text-sm" style={{ color: 'var(--text-3)' }}>
                                            {cacheInfo.fileCount} files ({(cacheInfo.totalSizeBytes / 1024 / 1024).toFixed(1)} MB)
                                        </span>
                                        <button
                                            onClick={() => setShowClearCacheConfirm(true)}
                                            className="px-3 py-1 text-sm font-medium rounded-none"
                                            style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-2)' }}
                                        >
                                            Clear Cache
                                        </button>
                                    </div>
                                </div>

                                {/* Auto Clear Cache Toggle */}
                                <ToggleSwitch
                                    label="Auto Clear Cache on Exit"
                                    enabled={settings.autoClearCache}
                                    setEnabled={async (val) => {
                                        await invoke('set_auto_clear_cache', { enabled: val });
                                        setSettings(prev => ({ ...prev, autoClearCache: val }));
                                    }}
                                />
                            </div>

                            <div className="mt-8 text-center">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="px-8 py-2 font-medium rounded-none"
                                    style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* === ADVANCED FILTER SETTINGS MODAL === */}
            {
                showFilterSettings && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                        <div className="w-full max-w-lg p-6 shadow-xl border-2 flex flex-col max-h-[90vh] relative group" style={{ backgroundColor: 'var(--bg-3)', borderColor: 'var(--bg-2)' }}>
                            <div className="absolute inset-0 border-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--accent-warning, #f59e0b)', zIndex: 10 }}></div>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Advanced Parser Settings</h2>
                                </div>
                                <button onClick={() => setShowFilterSettings(false)} className="p-1 rounded hover:bg-white/10 transform hover:scale-125 transition-transform duration-200" style={{ color: 'var(--text-2)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>

                            <div className="mb-4 text-xs font-medium p-3 rounded border" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-warning, #f59e0b)' }}>
                                Incorrectly modifying these keywords may result in missing color parameters or unintended inclusions. Proceed with caution.
                            </div>

                            <div className="flex-grow space-y-4 overflow-y-auto pr-1">
                                <div>
                                    <KeywordListEditor
                                        title="Include Keywords"
                                        keywords={filterDictionary.include_keywords || []}
                                        onChange={(newKeywords) => handleFilterDictionaryChange({
                                            ...filterDictionary,
                                            include_keywords: newKeywords
                                        })}
                                    />
                                    <p className="text-xs opacity-50 italic -mt-2 mb-2" style={{ color: 'var(--text-3)' }}>
                                        Leave empty to show all parameters except excluded ones.
                                    </p>
                                </div>

                                <KeywordListEditor
                                    title="Exclude Keywords"
                                    keywords={filterDictionary.exclude_keywords || []}
                                    onChange={(newKeywords) => handleFilterDictionaryChange({
                                        ...filterDictionary,
                                        exclude_keywords: newKeywords
                                    })}
                                />

                                <KeywordListEditor
                                    title="Color Property Names"
                                    keywords={filterDictionary.color_property_names || []}
                                    onChange={(newKeywords) => handleFilterDictionaryChange({
                                        ...filterDictionary,
                                        color_property_names: newKeywords
                                    })}
                                />
                            </div>

                            <div className="text-center pt-2 border-t" style={{ borderColor: 'var(--bg-1)' }}>
                                <button
                                    onClick={() => setShowFilterSettings(false)}
                                    className="px-8 py-2 font-medium rounded-none"
                                    style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* === CLEAR CACHE CONFIRM MODAL === */}
            {
                showClearCacheConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                        <div className="w-full max-w-sm p-6 rounded shadow-xl" style={{ backgroundColor: 'var(--bg-3)' }}>
                            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-1)' }}>Clear Cache?</h2>
                            <p className="mb-6" style={{ color: 'var(--text-2)' }}>
                                Are you sure you want to delete all cached conversion files? This cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowClearCacheConfirm(false)}
                                    className="px-4 py-2 font-medium rounded-none"
                                    style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-2)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        await invoke('clear_cache');
                                        setCacheInfo({ fileCount: 0, totalSizeBytes: 0 });
                                        addDebugLog('Cache cleared');
                                        setShowClearCacheConfirm(false);
                                    }}
                                    className="px-4 py-2 font-medium rounded-none"
                                    style={{ backgroundColor: '#dc2626', color: 'white' }}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* === CONVERSION PROGRESS OVERLAY === */}
            {
                isConverting && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                        <div className="w-full max-w-lg p-8 rounded shadow-xl text-center" style={{ backgroundColor: 'var(--bg-3)' }}>
                            <div className="mb-4">
                                <svg className="animate-spin mx-auto h-12 w-12" style={{ color: 'var(--accent-main)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-1)' }}>
                                Preparing assets
                            </h3>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
                                {conversionProgress.fileName}
                            </p>
                            {conversionProgress.total > 0 && (
                                <>
                                    <div className="w-full h-2 rounded-full mb-2" style={{ backgroundColor: 'var(--bg-1)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${(conversionProgress.current / conversionProgress.total) * 100}%`,
                                                backgroundColor: 'var(--accent-main)'
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
                )
            }

        </div >
    );
}


// Render the app into the page
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
