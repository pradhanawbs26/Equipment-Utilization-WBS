import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TimesheetRecord, ActiveDatasetMetadata } from '../types';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Convert raw Supabase row from timesheet_records to typed TimesheetRecord
 */
export function mapSupabaseRowToTimesheetRecord(r: any): TimesheetRecord {
  const loggedDate = r.logged_date || r.date || (r.created_at ? String(r.created_at).split('T')[0] : '') || new Date().toISOString().split('T')[0];
  const unit = r.cn_unit || r.unit || '-';
  const category = r.model || r.category || 'General';
  const activity = r.activity_type || r.activity || 'General';
  const totalHm = Number(r.operating_hours ?? r.total_hm) || 0;
  const location = r.user_location || r.location || '';

  return {
    id: String(r.id || `rec_${Math.random().toString(36).substring(2, 7)}`),
    date: loggedDate,
    loggedDate,
    shift: r.shift || 'Day',
    unit,
    cnUnit: unit,
    category,
    model: r.model || category,
    activity,
    activityType: activity,
    activityCode: r.activity_code || r.activityCode || '',
    location,
    userLocation: location,
    startTime: r.start_time || '07:00',
    endTime: r.end_time || '17:00',
    totalTime: Number(r.total_time) || totalHm || 0,
    startHm: Number(r.start_hm) || 0,
    stopHm: Number(r.stop_hm) || 0,
    totalHm,
    operatingHours: totalHm,
    fuelVolume: Number(r.fuel_volume) || 0,
    operator: r.operator || 'Operator',
    remark: r.remark || '',
    datasetId: r.dataset_id
  };
}

// SIMPAN DATASET BARU KE SUPABASE
export async function saveDatasetToSupabase(
  metadata: ActiveDatasetMetadata,
  records: TimesheetRecord[]
) {
  // 1. Simpan Header Ringkasan Dataset
  const { data: dataset, error: metaError } = await supabase
    .from('active_datasets')
    .upsert({
      dataset_code: 'current',
      file_name: metadata.fileName,
      batches_count: metadata.batchesCount || 1,
      start_date: metadata.startDate || '',
      end_date: metadata.endDate || '',
      total_hours: metadata.totalHours || 0,
      total_volume: metadata.totalVolume || 0,
      record_count: metadata.recordCount || records.length,
      uploaded_by: metadata.uploadedBy || 'Anonymous User'
    }, { onConflict: 'dataset_code' })
    .select()
    .single();

  if (metaError) throw metaError;

  // 2. Hapus log lama & masukkan log timesheet Excel yang baru
  await supabase.from('timesheet_records').delete().eq('dataset_id', dataset.id);

  const formattedRecords = records.map((rec, idx) => ({
    id: String(rec.id || `rec_${Date.now()}_${idx}`),
    dataset_id: dataset.id,
    cn_unit: rec.cnUnit || rec.unit || '-',
    model: rec.model || rec.category || '-',
    user_location: rec.userLocation || rec.location || '',
    activity_type: rec.activityType || rec.activity || 'General',
    operating_hours: rec.operatingHours ?? rec.totalHm ?? 0,
    fuel_volume: rec.fuelVolume ?? 0,
    logged_date: rec.loggedDate || rec.date || new Date().toISOString().split('T')[0],
    date: rec.date || rec.loggedDate || new Date().toISOString().split('T')[0],
    shift: rec.shift || 'Day',
    unit: rec.unit || rec.cnUnit || '-',
    category: rec.category || rec.model || 'General',
    activity: rec.activity || rec.activityType || 'General',
    activity_code: rec.activityCode || '',
    start_time: rec.startTime || '07:00',
    end_time: rec.endTime || '17:00',
    total_time: rec.totalTime || rec.operatingHours || rec.totalHm || 0,
    start_hm: rec.startHm || 0,
    stop_hm: rec.stopHm || 0,
    total_hm: rec.totalHm ?? rec.operatingHours ?? 0,
    location: rec.location || rec.userLocation || '',
    remark: rec.remark || '',
    operator: rec.operator || 'Operator'
  }));

  const CHUNK_SIZE = 500;
  for (let i = 0; i < formattedRecords.length; i += CHUNK_SIZE) {
    const chunk = formattedRecords.slice(i, i + CHUNK_SIZE);
    const { error: insertError } = await supabase
      .from('timesheet_records')
      .insert(chunk);

    if (insertError) throw insertError;
  }

  return dataset;
}

// BACA DATASET AKTIF DARI SUPABASE
export async function loadActiveDatasetFromSupabase() {
  const { data: dataset, error: dsError } = await supabase
    .from('active_datasets')
    .select('*')
    .eq('dataset_code', 'current')
    .maybeSingle();

  if (dsError || !dataset) return null;

  const { data: records, error: recError } = await supabase
    .from('timesheet_records')
    .select('*')
    .eq('dataset_id', dataset.id);

  if (recError) throw recError;

  return { dataset, records: records || [] };
}

export interface BatchMetadata {
  id: string;
  fileName: string;
  recordCount: number;
  uploadedAt: string;
  minDate: string;
  maxDate: string;
}

/**
 * Format raw Supabase errors into clear, actionable messages.
 */
export function formatSupabaseErrorMessage(error: any): string {
  const message = error?.message || error?.error_description || String(error);

  if (message.includes('column') && message.includes('does not exist')) {
    return `Kolom tabel Supabase belum lengkap (${message}). Buka SQL Editor di Supabase dan jalankan script SQL Schema terbaru yang tersedia di tab Timesheet Ingestion.`;
  }
  if (message.includes('relation') && message.includes('does not exist')) {
    return 'Tabel Supabase belum dibuat. Silakan jalankan script SQL di SQL Editor Supabase untuk membuat tabel "timesheet_records" dan "timesheet_batches".';
  }
  if (message.includes('JWT') || message.includes('apikey') || message.includes('unauthorized')) {
    return 'Kunci anon Supabase (VITE_SUPABASE_ANON_KEY) tidak valid atau telah kedaluwarsa.';
  }
  if (message.includes('Failed to fetch') || message.includes('network')) {
    return 'Gagal menghubungi Supabase URL. Periksa koneksi internet atau format VITE_SUPABASE_URL.';
  }
  return message;
}

/**
 * Sanitize timesheet record for Supabase columns.
 */
export function cleanRecordForSupabase(rec: Partial<TimesheetRecord> & Record<string, any>, batchId: string, now: string): Record<string, any> {
  return {
    id: String(rec.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
    date: rec.date || new Date().toISOString().split('T')[0],
    shift: rec.shift || 'Day',
    unit: rec.unit || '-',
    category: rec.category || 'General',
    activity: rec.activity || 'General',
    activity_code: rec.activityCode || '',
    start_time: rec.startTime || '07:00',
    end_time: rec.endTime || '17:00',
    total_time: typeof rec.totalTime === 'number' && !isNaN(rec.totalTime) ? rec.totalTime : 0,
    start_hm: typeof rec.startHm === 'number' && !isNaN(rec.startHm) ? rec.startHm : 0,
    stop_hm: typeof rec.stopHm === 'number' && !isNaN(rec.stopHm) ? rec.stopHm : 0,
    total_hm: typeof rec.totalHm === 'number' && !isNaN(rec.totalHm) ? rec.totalHm : 0,
    location: rec.location || '',
    remark: rec.remark || '',
    operator: rec.operator || '',
    upload_batch_id: batchId,
    created_at: now
  };
}

/**
 * Save array of parsed Excel timesheet records to Supabase PostgreSQL database.
 */
export async function saveRecordsToSupabase(
  records: TimesheetRecord[],
  fileName: string = 'Timesheet_Upload.xlsx'
): Promise<{ batchId: string; count: number }> {
  if (!records || records.length === 0) {
    return { batchId: '', count: 0 };
  }

  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase belum dikonfigurasi (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY belum diisi). Data tersimpan aman di penyimpanan lokal browser (IndexedDB).');
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

  // 1. Insert batch metadata
  const { error: batchErr } = await supabase
    .from('timesheet_batches')
    .upsert({
      id: batchId,
      file_name: fileName,
      record_count: records.length,
      uploaded_at: now,
      min_date: minDate,
      max_date: maxDate
    });

  if (batchErr) {
    console.error('Supabase batch insert error:', batchErr);
    throw new Error(formatSupabaseErrorMessage(batchErr));
  }

  // 2. Insert records in chunks of 500 rows
  const CHUNK_SIZE = 500;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE).map(r => cleanRecordForSupabase(r, batchId, now));
    const { error: recsErr } = await supabase
      .from('timesheet_records')
      .upsert(chunk, { onConflict: 'id' });

    if (recsErr) {
      console.error('Supabase records insert error:', recsErr);
      throw new Error(formatSupabaseErrorMessage(recsErr));
    }
  }

  return { batchId, count: records.length };
}

/**
 * Fetch all timesheet records stored in Supabase.
 */
export async function fetchRecordsFromSupabase(): Promise<TimesheetRecord[]> {
  if (!supabase || !isSupabaseConfigured) {
    return [];
  }

  try {
    // Select all records without forcing database-level order to prevent error 42703 if column 'date' is missing/named differently
    const { data, error } = await supabase
      .from('timesheet_records')
      .select('*')
      .limit(10000);

    if (error) {
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        console.warn('Supabase schema notice (table or column does not exist):', error.message);
        return [];
      }
      console.warn('Notice fetching records from Supabase:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const mapped: TimesheetRecord[] = data.map((r: any) => ({
      id: String(r.id || `rec_${Math.random().toString(36).substring(2, 7)}`),
      date: r.date || r.work_date || r.tanggal || (r.created_at ? String(r.created_at).split('T')[0] : '') || new Date().toISOString().split('T')[0],
      shift: r.shift || 'Day',
      unit: r.unit || '-',
      category: r.category || 'General',
      activity: r.activity || 'General',
      activityCode: r.activity_code || r.activityCode || '',
      startTime: r.start_time || r.startTime || '',
      endTime: r.end_time || r.endTime || '',
      totalTime: Number(r.total_time ?? r.totalTime) || 0,
      startHm: Number(r.start_hm ?? r.startHm) || 0,
      stopHm: Number(r.stop_hm ?? r.stopHm) || 0,
      totalHm: Number(r.total_hm ?? r.totalHm) || 0,
      location: r.location || '',
      remark: r.remark || '',
      operator: r.operator || ''
    }));

    // Sort safely in JavaScript
    return mapped.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  } catch (error: any) {
    console.warn('Notice from Supabase records fetch:', error?.message || error);
    return [];
  }
}

/**
 * Fetch upload batches metadata history from Supabase.
 */
export async function fetchBatchesFromSupabase(): Promise<BatchMetadata[]> {
  if (!supabase || !isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('timesheet_batches')
      .select('*')
      .limit(50);

    if (error) {
      console.warn('Failed to fetch batches from Supabase:', error.message);
      return [];
    }

    const mapped: BatchMetadata[] = (data || []).map((b: any) => ({
      id: String(b.id || ''),
      fileName: b.file_name || b.fileName || 'Upload',
      recordCount: Number(b.record_count ?? b.recordCount) || 0,
      uploadedAt: b.uploaded_at || b.uploadedAt || new Date().toISOString(),
      minDate: b.min_date || b.minDate || '',
      maxDate: b.max_date || b.maxDate || ''
    }));

    return mapped.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
  } catch (err: any) {
    console.warn('Batches retrieval notice:', err?.message || err);
    return [];
  }
}

/**
 * Delete all timesheet records and batches in Supabase.
 */
export async function clearAllSupabaseData(): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  const [res1, res2, res3] = await Promise.all([
    supabase.from('timesheet_records').delete().neq('id', '___non_existent___'),
    supabase.from('timesheet_batches').delete().neq('id', '___non_existent___'),
    supabase.from('active_datasets').delete().neq('dataset_code', '___non_existent___')
  ]);

  if (res1.error) throw new Error(formatSupabaseErrorMessage(res1.error));
  if (res2.error) throw new Error(formatSupabaseErrorMessage(res2.error));
  if (res3.error) console.warn('active_datasets delete notice:', res3.error);
}

/**
 * Supabase SQL Schema for quick setup in Supabase SQL Editor
 */
export const SUPABASE_SQL_SCHEMA = `-- ============================================================
-- SQL Schema Setup untuk Supabase Timesheet UA Equipment
-- Jalankan seluruh script ini di SQL Editor Supabase Anda
-- ============================================================

-- 1. Buat Tabel active_datasets jika belum ada
CREATE TABLE IF NOT EXISTS public.active_datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_code TEXT UNIQUE NOT NULL DEFAULT 'current',
  file_name TEXT,
  batches_count INT DEFAULT 1,
  start_date TEXT,
  end_date TEXT,
  total_hours NUMERIC DEFAULT 0,
  total_volume NUMERIC DEFAULT 0,
  record_count INT DEFAULT 0,
  uploaded_by TEXT DEFAULT 'Anonymous User',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Tabel timesheet_batches jika belum ada
CREATE TABLE IF NOT EXISTS public.timesheet_batches (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  record_count INT DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  min_date TEXT,
  max_date TEXT
);

-- 3. Buat Tabel timesheet_records jika belum ada
CREATE TABLE IF NOT EXISTS public.timesheet_records (
  id TEXT PRIMARY KEY,
  dataset_id UUID,
  cn_unit TEXT,
  model TEXT,
  user_location TEXT,
  activity_type TEXT,
  operating_hours NUMERIC DEFAULT 0,
  fuel_volume NUMERIC DEFAULT 0,
  logged_date TEXT,
  date TEXT,
  shift TEXT,
  unit TEXT,
  category TEXT,
  activity TEXT,
  activity_code TEXT,
  start_time TEXT,
  end_time TEXT,
  total_time NUMERIC DEFAULT 0,
  start_hm NUMERIC DEFAULT 0,
  stop_hm NUMERIC DEFAULT 0,
  total_hm NUMERIC DEFAULT 0,
  location TEXT,
  remark TEXT,
  operator TEXT,
  upload_batch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tambahkan kolom ke timesheet_records jika tabel sudah pernah dibuat sebelumnya
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS dataset_id UUID;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS cn_unit TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS user_location TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS activity_type TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS operating_hours NUMERIC DEFAULT 0;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS fuel_volume NUMERIC DEFAULT 0;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS logged_date TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS shift TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS activity TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS activity_code TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS total_time NUMERIC DEFAULT 0;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS start_hm NUMERIC DEFAULT 0;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS stop_hm NUMERIC DEFAULT 0;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS total_hm NUMERIC DEFAULT 0;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS operator TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS upload_batch_id TEXT;
ALTER TABLE public.timesheet_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.timesheet_batches ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.timesheet_batches ADD COLUMN IF NOT EXISTS record_count INT DEFAULT 0;
ALTER TABLE public.timesheet_batches ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.timesheet_batches ADD COLUMN IF NOT EXISTS min_date TEXT;
ALTER TABLE public.timesheet_batches ADD COLUMN IF NOT EXISTS max_date TEXT;

-- 5. Aktifkan Row Level Security (RLS) dan Izinkan Akses Publik
ALTER TABLE public.active_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read and write active_datasets" ON public.active_datasets;
CREATE POLICY "Allow public read and write active_datasets" ON public.active_datasets
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write batches" ON public.timesheet_batches;
CREATE POLICY "Allow public read and write batches" ON public.timesheet_batches
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write records" ON public.timesheet_records;
CREATE POLICY "Allow public read and write records" ON public.timesheet_records
  FOR ALL USING (true) WITH CHECK (true);
`;
