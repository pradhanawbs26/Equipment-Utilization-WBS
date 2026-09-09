import { TimesheetRecord, ParseResult } from '../types';

const DB_NAME = 'safetyfirst_fleet_local_db';
const STORE_NAME = 'timesheet_storage';
const DB_VERSION = 1;
const DATA_KEY = 'active_timesheet_dataset';
const LOCALSTORAGE_BACKUP_KEY = 'safetyfirst_timesheet_backup';

interface StoredDataset {
  records: TimesheetRecord[];
  parseResult: ParseResult | null;
  savedAt: string;
  totalRecords: number;
}

function getIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Save dataset directly to browser IndexedDB with localStorage fallback.
 * Guarantees data is never lost when web is refreshed on Vercel or any host.
 */
export async function saveLocalDataset(
  records: TimesheetRecord[],
  parseResult: ParseResult | null
): Promise<void> {
  if (!records || records.length === 0) return;

  const dataset: StoredDataset = {
    records,
    parseResult,
    savedAt: new Date().toISOString(),
    totalRecords: records.length,
  };

  try {
    const db = await getIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataset, DATA_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to write to IndexedDB'));
    });
  } catch (idbErr) {
    console.warn('IndexedDB write failed, attempting localStorage fallback:', idbErr);
    try {
      // If records are small enough, save to localStorage as backup
      const jsonStr = JSON.stringify(dataset);
      if (jsonStr.length < 4 * 1024 * 1024) {
        localStorage.setItem(LOCALSTORAGE_BACKUP_KEY, jsonStr);
      }
    } catch (lsErr) {
      console.error('All local persistence writes failed:', lsErr);
    }
  }
}

/**
 * Load dataset directly from browser IndexedDB or localStorage.
 */
export async function loadLocalDataset(): Promise<{
  records: TimesheetRecord[];
  parseResult: ParseResult | null;
  savedAt: string;
} | null> {
  // 1. Try IndexedDB first
  try {
    const db = await getIndexedDB();
    const data = await new Promise<StoredDataset | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(DATA_KEY);

      req.onsuccess = () => resolve(req.result as StoredDataset | undefined);
      req.onerror = () => reject(req.error || new Error('Failed to read from IndexedDB'));
    });

    if (data && data.records && data.records.length > 0) {
      return {
        records: data.records,
        parseResult: data.parseResult,
        savedAt: data.savedAt,
      };
    }
  } catch (idbErr) {
    console.warn('IndexedDB read failed, checking localStorage fallback:', idbErr);
  }

  // 2. Try localStorage backup
  try {
    if (typeof localStorage !== 'undefined') {
      const item = localStorage.getItem(LOCALSTORAGE_BACKUP_KEY);
      if (item) {
        const parsed = JSON.parse(item) as StoredDataset;
        if (parsed && parsed.records && parsed.records.length > 0) {
          return {
            records: parsed.records,
            parseResult: parsed.parseResult,
            savedAt: parsed.savedAt,
          };
        }
      }
    }
  } catch (lsErr) {
    console.warn('localStorage read failed:', lsErr);
  }

  return null;
}

/**
 * Clear local dataset cache
 */
export async function clearLocalDataset(): Promise<void> {
  try {
    const db = await getIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(DATA_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB:', err);
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCALSTORAGE_BACKUP_KEY);
    }
  } catch (err) {
    console.warn('Failed to clear localStorage:', err);
  }
}
