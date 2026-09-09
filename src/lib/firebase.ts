import { initializeApp } from 'firebase/app';
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
import firebaseConfig from '../../firebase-applet-config.json';
import { TimesheetRecord } from '../types';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID if specified in config
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DB_ID = firebaseConfig.firestoreDatabaseId || '(default)';

export interface BatchMetadata {
  id: string;
  fileName: string;
  recordCount: number;
  uploadedAt: string;
  minDate: string;
  maxDate: string;
}

/**
 * Save array of parsed Excel timesheet records to Firebase Firestore.
 * Automatically chunks writes into Firestore batch limit (max 400 per batch).
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
  let minDate = records[0].date || '';
  let maxDate = records[0].date || '';
  for (const r of records) {
    if (r.date && r.date < minDate) minDate = r.date;
    if (r.date && r.date > maxDate) maxDate = r.date;
  }

  // 1. Record the batch log
  const batchMetaRef = doc(db, 'timesheet_batches', batchId);
  await setDoc(batchMetaRef, {
    id: batchId,
    fileName,
    recordCount: records.length,
    uploadedAt: now,
    minDate,
    maxDate
  });

  // 2. Commit records in batches of 400
  const CHUNK_SIZE = 400;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const writeOp = writeBatch(db);

    chunk.forEach((rec, idx) => {
      // Ensure unique document id
      const docId = rec.id || `${batchId}_${i + idx}`;
      const docRef = doc(db, 'timesheet_records', docId);
      writeOp.set(docRef, {
        ...rec,
        id: docId,
        uploadBatchId: batchId,
        createdAt: now
      });
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
  } catch (error) {
    console.error('Failed to fetch timesheet records from Firestore:', error);
    throw error;
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
    console.error('Failed to fetch batches from Firestore:', error);
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
      if (onError) onError(err);
    }
  );
}

/**
 * Delete all records and batches from Firestore (useful for clearing test data).
 */
export async function clearAllFirestoreData(): Promise<void> {
  const recordsSnap = await getDocs(collection(db, 'timesheet_records'));
  const CHUNK_SIZE = 400;
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

/**
 * Ping Firestore connection and return metadata.
 */
export async function checkFirestoreConnection(): Promise<{
  connected: boolean;
  recordCount: number;
  batchCount: number;
  error?: string;
}> {
  try {
    const recordsSnap = await getDocs(collection(db, 'timesheet_records'));
    const batchesSnap = await getDocs(collection(db, 'timesheet_batches'));
    return {
      connected: true,
      recordCount: recordsSnap.size,
      batchCount: batchesSnap.size
    };
  } catch (err: any) {
    return {
      connected: false,
      recordCount: 0,
      batchCount: 0,
      error: err.message || String(err)
    };
  }
}
