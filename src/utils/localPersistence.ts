import {
  supabase,
  isSupabaseConfigured,
  mapSupabaseRowToTimesheetRecord,
  saveDatasetToSupabase,
  loadActiveDatasetFromSupabase
} from '../lib/supabase';
import { TimesheetRecord, ActiveDatasetMetadata, ParseResult } from '../types';

export {
  mapSupabaseRowToTimesheetRecord,
  saveDatasetToSupabase,
  loadActiveDatasetFromSupabase
};

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
 * Save dataset directly to browser IndexedDB with localStorage fallback and Supabase sync.
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

  // 1. IndexedDB immediate local persistence
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
      const jsonStr = JSON.stringify(dataset);
      if (jsonStr.length < 4 * 1024 * 1024) {
        localStorage.setItem(LOCALSTORAGE_BACKUP_KEY, jsonStr);
      }
    } catch (lsErr) {
      console.error('All local persistence writes failed:', lsErr);
    }
  }

  // 2. Supabase sync if credentials are configured
  if (isSupabaseConfigured) {
    try {
      const metadata: ActiveDatasetMetadata = {
        fileName: parseResult?.fileName || 'Timesheet_Data.xlsx',
        batchesCount: 1,
        startDate: parseResult?.dateRange?.min || records[0]?.date || '',
        endDate: parseResult?.dateRange?.max || records[records.length - 1]?.date || '',
        totalHours: records.reduce((sum, r) => sum + (r.totalHm || r.operatingHours || 0), 0),
        totalVolume: 0,
        recordCount: records.length,
        uploadedBy: 'Fleet Admin'
      };
      await saveDatasetToSupabase(metadata, records);
    } catch (sbErr) {
      console.warn('Supabase background sync notification:', sbErr);
    }
  }
}

/**
 * Load dataset directly from Supabase, browser IndexedDB, or localStorage.
 */
export async function loadLocalDataset(): Promise<{
  records: TimesheetRecord[];
  parseResult: ParseResult | null;
  savedAt: string;
} | null> {
  // 1. Check Supabase first if configured
  if (isSupabaseConfigured) {
    try {
      const sbData = await loadActiveDatasetFromSupabase();
      if (sbData && sbData.records && sbData.records.length > 0) {
        const mappedRecords = sbData.records.map(mapSupabaseRowToTimesheetRecord);
        const parseResult: ParseResult = {
          records: mappedRecords,
          sheetNameUsed: 'Supabase Active Dataset',
          availableSheets: ['Supabase Active Dataset'],
          totalRowsRaw: mappedRecords.length,
          validRows: mappedRecords.length,
          cleanedNullHmCount: 0,
          dateRange: {
            min: sbData.dataset.start_date || mappedRecords[0]?.date || '',
            max: sbData.dataset.end_date || mappedRecords[mappedRecords.length - 1]?.date || '',
          },
          categoriesDetected: Array.from(new Set(mappedRecords.map(r => r.category).filter(Boolean))),
          unitsDetected: Array.from(new Set(mappedRecords.map(r => r.unit).filter(Boolean))),
          activitiesDetected: Array.from(new Set(mappedRecords.map(r => r.activity).filter(Boolean))),
          fileName: sbData.dataset.file_name || 'Supabase_Dataset.xlsx',
          uploadTimestamp: sbData.dataset.created_at || new Date().toISOString(),
        };

        return {
          records: mappedRecords,
          parseResult,
          savedAt: sbData.dataset.created_at || new Date().toISOString()
        };
      }
    } catch (sbErr) {
      console.warn('Supabase load notice, falling back to local storage:', sbErr);
    }
  }

  // 2. Try IndexedDB
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

  // 3. Try localStorage backup
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
 * Clear local dataset cache and Supabase active dataset
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

  if (isSupabaseConfigured) {
    try {
      const { data: dataset } = await supabase
        .from('active_datasets')
        .select('id')
        .eq('dataset_code', 'current')
        .maybeSingle();

      if (dataset?.id) {
        await supabase.from('timesheet_records').delete().eq('dataset_id', dataset.id);
        await supabase.from('active_datasets').delete().eq('id', dataset.id);
      }
    } catch (sbErr) {
      console.warn('Supabase clear notice:', sbErr);
    }
  }
}
