import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as tauri from '@/services/tauri';

// Module-level cache so the index survives leaving and re-entering the page.
let assetIndexCache: string[] | null = null;

const MAX_SEARCH_RESULTS = 500;

// Row banding and hover live in css/style.css: the vendored tailwind build has
// no slash-opacity utilities, so `bg-white/5` and the like resolve to nothing.
const ROW_CLASS = 'mx-row';
const STRIPE_CLASS = 'mx-row-striped';

interface ManualExtractionPageProps {
  onClose: () => void;
  onExtract: (assetPaths: string[]) => void;
  addDebugLog: (msg: string) => void;
}

/** A folder in the browsable tree. Leaves live in `files`, subfolders in `dirs`. */
interface TreeNode {
  name: string;
  path: string;
  dirs: Map<string, TreeNode>;
  files: { name: string; path: string }[];
  /** Total material instances at or below this node, for the folder checkbox and count. */
  fileCount: number;
}

function makeNode(name: string, path: string): TreeNode {
  return { name, path, dirs: new Map(), files: [], fileCount: 0 };
}

/**
 * Build the folder tree from the flat, sorted path list.
 *
 * The index is ~130k entries, so this runs once per index load and is memoized;
 * rendering stays cheap because only expanded folders are ever walked.
 */
function buildTree(paths: string[]): TreeNode {
  const root = makeNode('', '');

  for (const path of paths) {
    const segments = path.split('/');
    const fileName = segments.pop();
    if (!fileName) continue;

    let node = root;
    node.fileCount++;
    let prefix = '';
    for (const segment of segments) {
      prefix = prefix ? `${prefix}/${segment}` : segment;
      let child = node.dirs.get(segment);
      if (!child) {
        child = makeNode(segment, prefix);
        node.dirs.set(segment, child);
      }
      child.fileCount++;
      node = child;
    }
    node.files.push({ name: fileName, path });
  }

  return root;
}

/** Collect every material instance at or below a folder. */
function collectFiles(node: TreeNode, out: string[]): string[] {
  for (const file of node.files) out.push(file.path);
  for (const dir of node.dirs.values()) collectFiles(dir, out);
  return out;
}

function findNode(root: TreeNode, path: string): TreeNode | null {
  if (!path) return root;
  let node: TreeNode | null = root;
  for (const segment of path.split('/')) {
    node = node?.dirs.get(segment) ?? null;
    if (!node) return null;
  }
  return node;
}

/** Strip the `<Root>/Content/` prefix so rows read as in-game paths. */
function displayPath(path: string): string {
  const idx = path.indexOf('/Content/');
  return idx >= 0 ? path.slice(idx + '/Content/'.length) : path;
}

/** Queue checkbox shared by folder and file rows. */
function QueueCheckbox({ checked, indeterminate = false }: { checked: boolean; indeterminate?: boolean }) {
  const active = checked || indeterminate;
  return (
    <span
      className="w-3.5 h-3.5 flex-shrink-0 border flex items-center justify-center"
      style={{
        // --bg-1 sat a shade off the hover fill and vanished under the cursor.
        borderColor: active ? 'var(--accent-main)' : 'var(--text-4)',
        backgroundColor: checked ? 'var(--accent-main)' : 'transparent',
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg-4)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      )}
      {indeterminate && !checked && (
        <span className="w-1.5 h-0.5" style={{ backgroundColor: 'var(--accent-main)' }} />
      )}
    </span>
  );
}

export function ManualExtractionPage({ onClose, onExtract, addDebugLog }: ManualExtractionPageProps) {
  const [assets, setAssets] = useState<string[]>(assetIndexCache ?? []);
  const [loading, setLoading] = useState(assetIndexCache === null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadIndex = useCallback(async (forceRefresh: boolean) => {
    setLoading(true);
    setError(null);
    try {
      addDebugLog(forceRefresh ? 'Rebuilding game asset index...' : 'Loading game asset index...');
      const result = await tauri.listGameAssets(forceRefresh);
      assetIndexCache = result.assets;
      setAssets(result.assets);
      addDebugLog(
        `Asset index ready: ${result.assets.length} material instances${result.cached ? ' (cached)' : ` from ${result.container_count} containers`}`
      );
      if (result.error) addDebugLog(`Asset index warning: ${result.error}`);
    } catch (err) {
      const msg = String(err);
      console.error('[ManualExtraction] Failed to load asset index:', err);
      setError(msg);
      addDebugLog(`Failed to load asset index: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [addDebugLog]);

  useEffect(() => {
    if (assetIndexCache === null) loadIndex(false);
  }, [loadIndex]);

  // Debounce search - each keystroke scans the whole index.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 200);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const tree = useMemo(() => buildTree(assets), [assets]);

  // Plugin content nests under its mount, so the index has a single `Marvel`
  // root - leaving it shut would put every asset one click further away.
  useEffect(() => {
    const roots = Array.from(tree.dirs.keys());
    if (roots.length > 0) setExpanded(new Set(roots));
  }, [tree]);

  const queueSet = useMemo(() => new Set(queue), [queue]);

  // Queued descendants per folder, so a folder row can show checked /
  // indeterminate without walking its subtree on every render.
  const queuedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const path of queue) {
      const segments = path.split('/');
      segments.pop();
      let prefix = '';
      for (const segment of segments) {
        prefix = prefix ? `${prefix}/${segment}` : segment;
        counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
      }
    }
    return counts;
  }, [queue]);

  const searchResults = useMemo(() => {
    if (!debouncedSearch) return null;
    const matches: string[] = [];
    for (const path of assets) {
      if (path.toLowerCase().includes(debouncedSearch)) {
        matches.push(path);
        if (matches.length > MAX_SEARCH_RESULTS) break;
      }
    }
    return matches;
  }, [assets, debouncedSearch]);

  const toggleExpand = useCallback((path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleFile = useCallback((path: string) => {
    setQueue(prev => (prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]));
  }, []);

  const addFolder = useCallback((folderPath: string) => {
    const node = findNode(tree, folderPath);
    if (!node) return;
    const paths = collectFiles(node, []);
    setQueue(prev => {
      const seen = new Set(prev);
      return [...prev, ...paths.filter(p => !seen.has(p))];
    });
    addDebugLog(`Queued ${paths.length} material instances from ${displayPath(folderPath)}`);
  }, [tree, addDebugLog]);

  const removeFolder = useCallback((folderPath: string) => {
    const node = findNode(tree, folderPath);
    if (!node) return;
    const paths = new Set(collectFiles(node, []));
    setQueue(prev => prev.filter(p => !paths.has(p)));
  }, [tree]);

  const toggleFolder = useCallback((node: TreeNode) => {
    const queued = queuedCounts.get(node.path) ?? 0;
    if (queued >= node.fileCount) removeFolder(node.path);
    else addFolder(node.path);
  }, [queuedCounts, addFolder, removeFolder]);

  const addAllSearchResults = useCallback(() => {
    if (!searchResults) return;
    setQueue(prev => {
      const seen = new Set(prev);
      return [...prev, ...searchResults.filter(p => !seen.has(p))];
    });
    addDebugLog(`Queued ${searchResults.length} search results`);
  }, [searchResults, addDebugLog]);

  const handleExtract = useCallback(() => {
    if (queue.length === 0) return;
    onExtract(queue);
  }, [queue, onExtract]);

  const renderFileRow = (name: string, path: string, depth: number, striped: boolean) => {
    const queued = queueSet.has(path);
    return (
      <div
        key={path}
        onClick={() => toggleFile(path)}
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer text-sm ${striped ? STRIPE_CLASS : ROW_CLASS}`}
        style={{ paddingLeft: `${depth * 14 + 8}px`, color: queued ? 'var(--accent-main)' : 'var(--text-3)' }}
        title={displayPath(path)}
      >
        <QueueCheckbox checked={queued} />
        <span className="truncate">{name.replace(/\.uasset$/, '')}</span>
      </div>
    );
  };

  const renderFolder = (node: TreeNode, depth: number, row: { i: number }) => {
    const isOpen = expanded.has(node.path);
    const queuedHere = queuedCounts.get(node.path) ?? 0;
    const allQueued = queuedHere >= node.fileCount;

    // Claimed before the children are built so the banding runs down the
    // rendered rows in visual order rather than restarting at each level.
    const striped = row.i++ % 2 === 1;

    const children: React.ReactNode[] = [];
    if (isOpen) {
      for (const dir of node.dirs.values()) children.push(renderFolder(dir, depth + 1, row));
      for (const file of node.files) children.push(renderFileRow(file.name, file.path, depth + 1, row.i++ % 2 === 1));
    }

    return (
      <div key={node.path || 'root'}>
        <div
          className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer text-sm group/row ${striped ? STRIPE_CLASS : ROW_CLASS}`}
          style={{ paddingLeft: `${depth * 14 + 8}px`, color: 'var(--text-2)' }}
          onClick={() => toggleExpand(node.path)}
        >
          <svg
            className="flex-shrink-0 transition-transform"
            style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span
            onClick={(e) => { e.stopPropagation(); toggleFolder(node); }}
            title={allQueued
              ? `Remove all ${node.fileCount} material instances in this folder from the queue`
              : `Queue all ${node.fileCount} material instances in this folder`}
            className="flex items-center"
          >
            <QueueCheckbox checked={allQueued} indeterminate={queuedHere > 0} />
          </span>
          <span className="truncate flex-1">{node.name}</span>
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-4)' }}>
            {queuedHere > 0 && (
              <span style={{ color: 'var(--accent-main)' }}>{queuedHere}/</span>
            )}
            {node.fileCount}
          </span>
        </div>
        {children}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 border-2" style={{ backgroundColor: 'var(--bg-3)', borderColor: 'var(--bg-2)' }}>

      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b flex-shrink-0" style={{ borderColor: 'var(--bg-2)' }}>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Manual Extraction</h2>
          <span className="text-sm px-2 py-0.5" style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-4)' }}>
            {assets.length.toLocaleString()} material instances
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadIndex(true)}
            disabled={loading}
            title="Rebuild the index from the game containers"
            className="p-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-2)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </button>
          <button
            onClick={onClose}
            title="Back"
            className="p-1 rounded hover:bg-white/10 transform hover:scale-125 transition-transform duration-200"
            style={{ color: 'var(--text-2)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mb-4" style={{ borderColor: 'var(--accent-main)', borderTopColor: 'transparent' }}></div>
          <p className="text-sm" style={{ color: 'var(--text-4)' }}>Indexing game containers...</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>First run reads the asset type of every package and takes about half a minute; afterwards only containers a game update changed are read again</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <p className="text-sm text-center" style={{ color: 'var(--accent-warning, #f59e0b)' }}>{error}</p>
          <button
            onClick={() => loadIndex(true)}
            className="px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">

          {/* Browser */}
          <div className="flex-1 flex flex-col min-h-0 border-r" style={{ borderColor: 'var(--bg-2)' }}>
            <div className="p-3 border-b flex items-center gap-2 flex-shrink-0" style={{ borderColor: 'var(--bg-2)' }}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search asset paths..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 rounded-none focus:outline-none focus:ring-2 text-sm"
                style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-2)' }}
                autoFocus
              />
              {searchResults && searchResults.length > 0 && (
                <button
                  onClick={addAllSearchResults}
                  className="px-3 py-2 text-xs font-semibold whitespace-nowrap"
                  style={{ backgroundColor: 'var(--bg-1)', color: 'var(--accent-main)' }}
                >
                  Queue all results
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
              {searchResults ? (
                searchResults.length === 0 ? (
                  <p className="p-4 text-sm" style={{ color: 'var(--text-4)' }}>No material instances match that search.</p>
                ) : (
                  <>
                    {searchResults.slice(0, MAX_SEARCH_RESULTS).map((path, i) => {
                      const name = path.split('/').pop() || path;
                      const queued = queueSet.has(path);
                      return (
                        <div
                          key={path}
                          onClick={() => toggleFile(path)}
                          className={`flex items-center gap-2 px-3 py-1 cursor-pointer text-sm ${i % 2 === 1 ? STRIPE_CLASS : ROW_CLASS}`}
                          style={{ color: queued ? 'var(--accent-main)' : 'var(--text-3)' }}
                        >
                          <QueueCheckbox checked={queued} />
                          <span className="truncate font-medium">{name.replace(/\.uasset$/, '')}</span>
                          <span className="truncate text-xs ml-auto pl-3" style={{ color: 'var(--text-4)' }}>{displayPath(path)}</span>
                        </div>
                      );
                    })}
                    {searchResults.length > MAX_SEARCH_RESULTS && (
                      <p className="p-3 text-xs" style={{ color: 'var(--text-4)' }}>
                        Showing the first {MAX_SEARCH_RESULTS} matches — narrow the search to see more.
                      </p>
                    )}
                  </>
                )
              ) : (
                (() => {
                  const row = { i: 0 };
                  return Array.from(tree.dirs.values()).map(dir => renderFolder(dir, 0, row));
                })()
              )}
            </div>
          </div>

          {/* Queue */}
          <div className="flex flex-col min-h-0 flex-shrink-0" style={{ width: 380 }}>
            <div className="p-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--bg-2)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-2)' }}>
                Extraction Queue <span style={{ color: 'var(--accent-main)' }}>({queue.length})</span>
              </h3>
              {queue.length > 0 && (
                <button onClick={() => setQueue([])} className="text-xs font-semibold" style={{ color: 'var(--text-4)' }}>
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
              {queue.length === 0 ? (
                <p className="p-4 text-sm" style={{ color: 'var(--text-4)' }}>
                  Nothing queued yet. Click a material instance to add it, or tick a folder to queue everything inside it.
                </p>
              ) : (
                queue.map((path, i) => (
                  <div
                    key={path}
                    className={`flex items-center gap-2 px-3 py-1 text-sm group/queue ${i % 2 === 1 ? STRIPE_CLASS : ROW_CLASS}`}
                    style={{ color: 'var(--text-3)' }}
                    title={displayPath(path)}
                  >
                    <span className="truncate flex-1">{(path.split('/').pop() || path).replace(/\.uasset$/, '')}</span>
                    <button
                      onClick={() => toggleFile(path)}
                      className="opacity-0 group-hover/queue:opacity-100 transition-opacity flex-shrink-0"
                      style={{ color: 'var(--text-4)' }}
                      title="Remove from queue"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t flex flex-col gap-3 flex-shrink-0" style={{ borderColor: 'var(--bg-2)' }}>
              <button
                onClick={handleExtract}
                disabled={queue.length === 0}
                className="w-full px-4 py-3 font-medium transition-colors disabled:cursor-not-allowed"
                style={{
                  backgroundColor: queue.length === 0 ? 'var(--bg-1)' : 'var(--accent-main)',
                  color: queue.length === 0 ? 'var(--text-4)' : 'var(--bg-4)',
                }}
              >
                Extract &amp; Import {queue.length > 0 ? `(${queue.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
