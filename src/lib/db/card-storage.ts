import fs from 'fs';
import path from 'path';
import { RFIDCard, RFIDAccessEvent } from '@/types';

function isServerEnvironment(): boolean {
  return typeof window === 'undefined' && typeof process !== 'undefined' && Boolean(fs && fs.existsSync);
}

function getDataPaths() {
  if (!isServerEnvironment()) return null;
  const DATA_DIR = path.join(process.cwd(), 'data');
  const CARDS_FILE = path.join(DATA_DIR, 'cards.json');
  const EVENTS_FILE = path.join(DATA_DIR, 'rfid_events.json');
  return { DATA_DIR, CARDS_FILE, EVENTS_FILE };
}

export function loadPersistedCards(): RFIDCard[] {
  if (!isServerEnvironment()) return [];
  const paths = getDataPaths();
  if (!paths) return [];

  try {
    if (fs.existsSync(paths.CARDS_FILE)) {
      const data = fs.readFileSync(paths.CARDS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[STORAGE] Failed to read cards.json:', err);
  }
  return [];
}

export function savePersistedCards(cards: RFIDCard[]): void {
  if (!isServerEnvironment()) return;
  const paths = getDataPaths();
  if (!paths) return;

  try {
    if (!fs.existsSync(paths.DATA_DIR)) {
      fs.mkdirSync(paths.DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(paths.CARDS_FILE, JSON.stringify(cards, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[STORAGE] Failed to write cards.json:', err);
  }
}

export function loadPersistedEvents(): RFIDAccessEvent[] {
  if (!isServerEnvironment()) return [];
  const paths = getDataPaths();
  if (!paths) return [];

  try {
    if (fs.existsSync(paths.EVENTS_FILE)) {
      const data = fs.readFileSync(paths.EVENTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[STORAGE] Failed to read rfid_events.json:', err);
  }
  return [];
}

export function savePersistedEvents(events: RFIDAccessEvent[]): void {
  if (!isServerEnvironment()) return;
  const paths = getDataPaths();
  if (!paths) return;

  try {
    if (!fs.existsSync(paths.DATA_DIR)) {
      fs.mkdirSync(paths.DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(paths.EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[STORAGE] Failed to write rfid_events.json:', err);
  }
}
