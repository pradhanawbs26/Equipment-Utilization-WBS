import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import baseAppletConfig from '../../firebase-applet-config.json';
import { TimesheetRecord } from '../types';

// Resolve configuration: allows overriding via Vite environment variables on Vercel deployment
const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;

// If user changed projectId on Vercel via env var, don't use AI Studio's internal database ID unless explicitly requested
const envDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID !== undefined
  ? import.meta.env.VITE_FIREBASE_DATABASE_ID
  : (envProjectId && envProjectId !== baseAppletConfig.projectId
      ? undefined
      : baseAppletConfig.firestoreDatabaseId);

export const resolvedFirebaseConfig = {
  apiKey: envApiKey || baseAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || baseAppletConfig.authDomain,
  projectId: envProjectId || baseAppletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || baseAppletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || baseAppletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || baseAppletConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || baseAppletConfig.measurementId || 'G-SJ6C2ZQZKZ',
  firestoreDatabaseId: envDatabaseId
};

// Initialize Firebase App safely (singleton pattern)
export const app = getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig);

// Initialize Firebase Analytics safely (only when supported in browser environment)
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}
export { analytics };

// Initialize Firestore with smart fallback
function createFirestoreInstance() {
  const dbId = resolvedFirebaseConfig.firestoreDatabaseId;
  if (dbId && dbId !== '(default)' && dbId !== '') {
    try {
      return getFirestore(app, dbId);
    } catch (e) {
      console.warn(`Failed to connect to custom Firestore DB "${dbId}", falling back to (default):`, e);
      return getFirestore(app);
    }
  }
  return getFirestore(app);
}

export const db = createFirestoreInstance();

export const FIREBASE_PROJECT_ID = resolvedFirebaseConfig.projectId;
export const FIRESTORE_DB_ID = resolvedFirebaseConfig.firestoreDatabaseId || '(default)';

export interface BatchMetadata {
  id: string;
  fileName: string;
  recordCount: number;
  uploadedAt: string;
  minDate: string;
  maxDate: string;
}

/**
 * Format raw Firebase errors into clear, actionable messages for the user.
 */
export function formatFirestoreErrorMessage(error: any): string {
  const code = error?.code || '';
  const message = error?.message || String(error);

  if (code.includes('permission-denied') || message.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
    return 'Izin Firestore ditolak (permission-denied). Periksa Security Rules di Firebase Console Anda dan izinkan read & write untuk collection "timesheet_records" dan "timesheet_batches".';
  }
  if (code.includes('not-found') || message.includes('NOT_FOUND') || message.includes('does not exist')) {
    return `Database Firestore tidak ditemukan untuk project "${FIREBASE_PROJECT_ID}". Pastikan Firestore telah dibuat di Firebase Console.`;
  }
  if (code.includes('unavailable') || message.includes('offline') || message.includes('network')) {
    return 'Koneksi ke Firebase sedang offline atau terputus. Data Anda tetap tersimpan dengan aman di memori browser.';
  }
  return message;
}

/**
 * Sanitize an object to ensure NO fields have `undefined` values.
 * In Firestore, any `undefined` field causes `WriteBatch.set()` to crash.
 */
export function cleanRecordForFirestore(rec: Partial<TimesheetRecord> & Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};

  for (const [key, val] of Object.entries(rec)) {
    if (val === undefined) {
      cleaned[key] = '';
    } else if (val === null) {
      cleaned[key] = null;
    } else if (typeof val === 'number') {
      cleaned[key] = isNaN(val) ? 0 : val;
    } else if (typeof val === 'string' || typeof val === 'boolean') {
      cleaned[key] = val;
    } else if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
      cleaned[key] = cleanRecordForFirestore(val);
    } else {
      cleaned[key] = val;
    }
  }

  // Ensure mandatory defaults
  if (!cleaned.id) cleaned.id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  if (!cleaned.date) cleaned.date = new Date().toISOString().split('T')[0];
  if (!cleaned.unit) cleaned.unit = '-';
  if (!cleaned.activity) cleaned.activity = 'General';
  if (cleaned.totalHm === undefined || cleaned.totalHm === null) cleaned.totalHm = 0;
  if (!cleaned.activityCode) cleaned.activityCode = '';
  if (!cleaned.location) cleaned.location = '';
  if (!cleaned.remark) cleaned.remark = '';

  return cleaned;
}

/**
 * Save array of parsed Excel timesheet records to Firebase Firestore.
 * Automatically chunks writes into Firestore batch limit (max 350 per batch).
 * Guarantees zero `undefined` fields to prevent WriteBatch crashes.
 */
export async function saveRecordsToFirestore(
  records: TimesheetRecord[],
  fileName: string = 'Timesheet_Upload.xlsx'
): Promise<{ batchId: string; count: number }> {
  if (!records || records.length === 0) {
    return { batchId: '', count: 0 };
  }

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Determine date bounds
  let minDate = records[0]?.date || '';
  let maxDate = records[0]?.date || '';
  for (const r of records) {
    if (r.date && r.date < minDate) minDate = r.date;
    if (r.date && r.date > maxDate) maxDate = r.date;
  }

  // 1. Record the batch log
  const batchMetaRef = doc(db, 'timesheet_batches', batchId);
  const cleanBatchMeta = cleanRecordForFirestore({
    id: batchId,
    fileName,
    recordCount: records.length,
    uploadedAt: now,
    minDate,
    maxDate
  });
  await setDoc(batchMetaRef, cleanBatchMeta);

  // 2. Commit records in batches of 350 (Firestore limit is 500)
  const CHUNK_SIZE = 350;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const writeOp = writeBatch(db);

    chunk.forEach((rec, idx) => {
      const docId = rec.id || `${batchId}_${i + idx}`;
      const docRef = doc(db, 'timesheet_records', docId);
      const cleaned = cleanRecordForFirestore({
        ...rec,
        id: docId,
        uploadBatchId: batchId,
        createdAt: now
      });
      writeOp.set(docRef, cleaned);
    });

    await writeOp.commit();
  }

  return { batchId, count: records.length };
}

/**
 * Fetch all timesheet records stored in Firestore.
 */
export async function fetchRecordsFromFirestore(): Promise<TimesheetRecord[]> {
  try {
    const recordsCol = collection(db, 'timesheet_records');
    const snap = await getDocs(recordsCol);

    if (snap.empty) {
      return [];
    }

    const records: TimesheetRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as TimesheetRecord;
      records.push({
        ...data,
        id: docSnap.id
      });
    });

    // Sort by date ascending, then startTime
    records.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return records;
  } catch (error: any) {
    console.error('Failed to fetch timesheet records from Firestore:', error);
    throw new Error(formatFirestoreErrorMessage(error));
  }
}

/**
 * Fetch upload batches metadata history from Firestore.
 */
export async function fetchBatchesFromFirestore(): Promise<BatchMetadata[]> {
  try {
    const batchesCol = collection(db, 'timesheet_batches');
    const q = query(batchesCol, orderBy('uploadedAt', 'desc'), limit(50));
    const snap = await getDocs(q);

    const batches: BatchMetadata[] = [];
    snap.forEach((docSnap) => {
      batches.push(docSnap.data() as BatchMetadata);
    });

    return batches;
  } catch (error) {
    console.warn('Failed to fetch batches from Firestore (ignorable if empty):', error);
    return [];
  }
}

/**
 * Real-time listener for Firestore timesheet records.
 */
export function subscribeToFirestoreRecords(
  onUpdate: (records: TimesheetRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const recordsCol = collection(db, 'timesheet_records');
  return onSnapshot(
    recordsCol,
    (snap) => {
      const records: TimesheetRecord[] = [];
      snap.forEach((docSnap) => {
        records.push({
          ...(docSnap.data() as TimesheetRecord),
          id: docSnap.id
        });
      });

      records.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.startTime || '').localeCompare(b.startTime || '');
      });

      onUpdate(records);
    },
    (err) => {
      console.error('Firestore subscription error:', err);
      if (onError) onError(new Error(formatFirestoreErrorMessage(err)));
    }
  );
}

/**
 * Delete all records and batches from Firestore.
 */
export async function clearAllFirestoreData(): Promise<void> {
  const recordsSnap = await getDocs(collection(db, 'timesheet_records'));
  const CHUNK_SIZE = 350;
  const docs = recordsSnap.docs;

  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const b = writeBatch(db);
    chunk.forEach((d) => b.delete(d.ref));
    await b.commit();
  }

  const batchesSnap = await getDocs(collection(db, 'timesheet_batches'));
  const bDocs = batchesSnap.docs;
  for (let i = 0; i < bDocs.length; i += CHUNK_SIZE) {
    const chunk = bDocs.slice(i, i + CHUNK_SIZE);
    const b = writeBatch(db);
    chunk.forEach((d) => b.delete(d.ref));
    await b.commit();
  }
}
