/**
 * Dive into a nested object and set a value at the given path.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setNestedValue(obj: any, path: (string | number)[], value: unknown): void {
  let schema = obj;
  for (let i = 0; i < path.length - 1; i++) {
    schema = schema[path[i]];
  }
  schema[path[path.length - 1]] = value;
}

/**
 * Extract just the filename from a path string (handles both / and \\).
 */
export function getFileName(path: string): string {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1];
}

/**
 * Normalize a file path for comparison: forward slashes, strip .json/.uasset, lowercase.
 */
export function normalizePath(path: string): string {
  if (!path) return '';
  return path
    .replace(/\\/g, '/')
    .replace(/\.json$/i, '')
    .replace(/\.uasset$/i, '')
    .toLowerCase();
}

/**
 * Check if two paths match via suffix (one ends with the other).
 */
export function pathsMatchSuffix(path1: string, path2: string): boolean {
  if (!path1 || !path2) return false;
  return path1.endsWith(path2) || path2.endsWith(path1);
}
