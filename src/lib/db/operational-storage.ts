import fs from 'fs';
import path from 'path';

function isServerEnvironment(): boolean {
  return typeof window === 'undefined' && typeof process !== 'undefined' && Boolean(fs && fs.existsSync);
}

function getDataDir(): string | null {
  if (!isServerEnvironment()) return null;
  const DATA_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      return null;
    }
  }
  return DATA_DIR;
}

export function loadPersistedData<T>(filename: string): T[] {
  if (!isServerEnvironment()) return [];
  const dir = getDataDir();
  if (!dir) return [];

  const filePath = path.join(dir, filename);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content || !content.trim()) return [];
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[STORAGE] Failed to read ${filename}:`, err instanceof Error ? err.message : String(err));
  }
  return [];
}

export function savePersistedData<T>(filename: string, items: T[]): void {
  if (!isServerEnvironment() || process.env.VITEST || process.env.NODE_ENV === 'test') return;
  const dir = getDataDir();
  if (!dir) return;

  const filePath = path.join(dir, filename);
  try {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(items || [], null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.warn(`[STORAGE] Failed to write ${filename}:`, err instanceof Error ? err.message : String(err));
  }
}
