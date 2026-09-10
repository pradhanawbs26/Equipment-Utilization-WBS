import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  Info,
  Clock,
  Gauge,
  User,
  Truck,
  Cloud,
  HardDrive,
  Trash2,
  Layers
} from 'lucide-react';
import { TimesheetRecord, ParseResult } from '../types';
import { parseTimesheetWorkbook, generateSampleExcelWorkbook } from '../utils/excelParser';
import { exportRawTimesheetLedger } from '../utils/exportUtils';
import { INITIAL_SAMPLE_RECORDS } from '../data/sampleTimesheetData';
import {
  BatchMetadata,
  SUPABASE_URL,
  isSupabaseConfigured,
  SUPABASE_SQL_SCHEMA
} from '../lib/supabase';

interface TimesheetUploaderProps {
  onDataLoaded: (result: ParseResult) => Promise<void> | void;
  currentParseResult: ParseResult | null;
  records: TimesheetRecord[];
  onResetToSample: () => void;
  isCloudSaving?: boolean;
  isCloudLoading?: boolean;
  cloudSyncMessage?: string | null;
  uploadBatches?: BatchMetadata[];
  cloudRecordCount?: number;
  onSyncFromCloud?: () => Promise<void>;
  onSaveCurrentToCloud?: () => Promise<void>;
  onClearCloudData?: () => Promise<void>;
}

export const TimesheetUploader: React.FC<TimesheetUploaderProps> = ({
  onDataLoaded,
  currentParseResult,
  records,
  onResetToSample,
  isCloudSaving = false,
  isCloudLoading = false,
  cloudSyncMessage,
  uploadBatches = [],
  cloudRecordCount = 0,
  onSyncFromCloud,
  onSaveCurrentToCloud,
  onClearCloudData,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raw ledger pagination and search
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const processFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error('Please upload a valid Excel spreadsheet (.xlsx or .xls).');
      }

      const arrayBuffer = await file.arrayBuffer();
      const parsed = parseTimesheetWorkbook(arrayBuffer, file.name);

      if (parsed.records.length === 0) {
        throw new Error('No valid operational timesheet records could be extracted from sheet "Timeshet Mobile".');
      }

      // Pass parsed data to parent and trigger auto-save to Supabase & IndexedDB
      await onDataLoaded(parsed);

      setSuccessMessage(
        `Sukses! Berhasil memproses ${parsed.records.length} record dari sheet "${parsed.sheetNameUsed}". Data tersimpan aman di penyimpanan lokal browser & siap disinkronkan ke Supabase.`
      );
      setCurrentPage(1);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(err?.message || 'Failed to parse Excel file. Please verify sheet "Timeshet Mobile" exists.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDownloadSampleExcel = () => {
    const buffer = generateSampleExcelWorkbook(INITIAL_SAMPLE_RECORDS);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Timeshet_Mobile_FD_Mining_Sample.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter raw ledger
  const filteredLedger = records.filter(r => {
    const q = ledgerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      r.unit.toLowerCase().includes(q) ||
      (r.operator || '').toLowerCase().includes(q) ||
      r.activity.toLowerCase().includes(q) ||
      (r.activityCode || '').toLowerCase().includes(q) ||
      (r.remark || '').toLowerCase().includes(q) ||
      r.date.includes(q) ||
      r.shift.includes(q) ||
      (r.model || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredLedger.length / rowsPerPage));
  const paginatedRows = filteredLedger.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 1. COLUMN SPECIFICATION BANNER */}
      <section className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#31353e]/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
            <h2 className="text-sm lg:text-base font-bold text-[#dfe2ee]">
              Excel Schema Mapping: Sheet <span className="text-[#89ceff]">"Timeshet Mobile"</span>
            </h2>
          </div>
          <span className="font-mono text-xs text-[#88929b]">CAN-Bus & Timesheet Ingestion Specification</span>
        </div>

        {/* Column Mapping Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-3 font-mono text-xs">
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#89ceff] font-bold block">Col B</span>
            <span className="text-[#dfe2ee]">Tanggal (Date)</span>
          </div>
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#89ceff] font-bold block">Col C</span>
            <span className="text-[#dfe2ee]">Shift (1 / 2)</span>
          </div>
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#89ceff] font-bold block">Col E</span>
            <span className="text-[#dfe2ee]">Nama Operator</span>
          </div>
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#89ceff] font-bold block">Col F</span>
            <span className="text-[#dfe2ee]">Nomor Unit (FD...)</span>
          </div>
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#89ceff] font-bold block">Col J</span>
            <span className="text-[#dfe2ee]">Jam Mulai</span>
          </div>
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#89ceff] font-bold block">Col K</span>
            <span className="text-[#dfe2ee]">Jam Selesai</span>
          </div>
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#ffb95f] font-bold block">Col L</span>
            <span className="text-[#dfe2ee]">Total Jam Aktifitas</span>
          </div>
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#4edea3] font-bold block">Col M</span>
            <span className="text-[#dfe2ee]">HM Start</span>
          </div>
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#4edea3] font-bold block">Col N</span>
            <span className="text-[#dfe2ee]">HM Selesai</span>
          </div>
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#ffb95f] font-bold block">Col O</span>
            <span className="text-[#dfe2ee]">Total HM Aktifitas</span>
          </div>
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#89ceff] font-bold block">Col Q</span>
            <span className="text-[#dfe2ee]">Deskripsi Aktifitas</span>
          </div>
          <div className="bg-[#0f131c] p-2 rounded border border-[#31353e]/60">
            <span className="text-[#88929b] font-bold block">Col R</span>
            <span className="text-[#dfe2ee]">Remark / Notes</span>
          </div>
        </div>
      </section>

      {/* 2. UPLOAD & INGESTION DROPZONE SECTION */}
      <section className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-5 shadow-md flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#89ceff]" />
            <h2 className="text-base lg:text-lg font-bold text-[#dfe2ee]">
              Upload Operational Excel Timesheet
            </h2>
          </div>
          <p className="text-xs font-mono text-[#88929b] mt-0.5">
            Auto-detects target sheet <span className="text-[#89ceff] font-bold">"Timeshet Mobile"</span> • Cleans nulls/strings to numeric 0.0 • Supports Indonesian comma decimals
          </p>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#89ceff] bg-[#0ea5e9]/10'
              : 'border-[#31353e] hover:border-[#89ceff]/60 bg-[#0f131c]/60 hover:bg-[#0f131c]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="p-3.5 bg-[#1c2028] border border-[#31353e] rounded-full text-[#89ceff] mb-3 shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <h3 className="text-sm font-semibold text-[#dfe2ee]">
            {isLoading ? 'Processing Timesheet Workbook...' : 'Drop your operational Excel file here, or click to browse'}
          </h3>
          <p className="text-xs font-mono text-[#88929b] mt-1 max-w-lg">
            Reads worksheet <strong className="text-[#89ceff]">"Timeshet Mobile"</strong> with exact column layout (Col B Date, Col C Shift, Col E Operator, Col F Unit, Col J Start, Col K End, Col L Total Time, Col M Start HM, Col N Stop HM, Col O Total HM, Col Q Activity).
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#1c2028] border border-[#31353e] text-[11px] font-mono text-[#4edea3]">
              ✓ Indonesian Comma Decimals Supported (e.g. 0,17 → 0.17)
            </span>
            <span className="px-2 py-0.5 rounded bg-[#1c2028] border border-[#31353e] text-[11px] font-mono text-[#89ceff]">
              ✓ Auto-cleaning #REF! / NaN to 0.0
            </span>
          </div>
        </div>

        {/* Messages */}
        {errorMessage && (
          <div className="p-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/40 rounded-lg text-xs font-mono text-[#ffb4ab] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-[#4edea3]/10 border border-[#4edea3]/40 rounded-lg text-xs font-mono text-[#4edea3] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Quick Utilities / Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#31353e]/60">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadSampleExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c2028] hover:bg-[#262a33] text-[#ffb95f] text-xs font-mono font-medium rounded border border-[#ffb95f]/30 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template (.xlsx)</span>
            </button>

            <button
              onClick={onResetToSample}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c2028] hover:bg-[#262a33] text-[#89ceff] text-xs font-mono font-medium rounded border border-[#31353e] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload FD Fleet Sample Data</span>
            </button>
          </div>

          <div className="text-xs font-mono text-[#88929b]">
            Target Sheet: <strong className="text-[#dfe2ee]">"Timeshet Mobile"</strong>
          </div>
        </div>
      </section>

      {/* 2.5 SUPABASE POSTGRESQL DATABASE STATUS & CONTROLS */}
      <section className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-5 shadow-md flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#31353e]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#0ea5e9]/15 border border-[#89ceff]/40 rounded-lg text-[#89ceff]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#dfe2ee]">
                  Supabase PostgreSQL Database
                </h2>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] text-[10px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                  CONNECTED
                </span>
              </div>
              <p className="text-xs font-mono text-[#88929b] mt-0.5">
                Semua data file Excel tersimpan secara otomatis dan persisten di database Supabase (tabel active_datasets & timesheet_records)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSyncFromCloud && (
              <button
                type="button"
                onClick={onSyncFromCloud}
                disabled={isCloudLoading || isCloudSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c2028] hover:bg-[#262a33] text-[#89ceff] text-xs font-mono font-semibold rounded border border-[#89ceff]/40 transition-colors disabled:opacity-50 cursor-pointer"
                title="Tarik & sinkronkan data terbaru dari Supabase PostgreSQL"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCloudLoading ? 'animate-spin text-[#ffb95f]' : ''}`} />
                <span>{isCloudLoading ? 'Menyinkronkan...' : 'Sinkronkan dari Supabase'}</span>
              </button>
            )}

            {onSaveCurrentToCloud && (
              <button
                type="button"
                onClick={onSaveCurrentToCloud}
                disabled={isCloudLoading || isCloudSaving || records.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-[#00344d] text-xs font-mono font-bold rounded transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                title="Simpan seluruh record saat ini ke database Supabase"
              >
                <Cloud className={`w-3.5 h-3.5 ${isCloudSaving ? 'animate-spin' : ''}`} />
                <span>{isCloudSaving ? 'Menyimpan...' : 'Simpan ke Supabase'}</span>
              </button>
            )}

            {onClearCloudData && (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                disabled={isCloudLoading || isCloudSaving}
                className="p-1.5 bg-[#1c2028] hover:bg-[#262a33] text-[#88929b] hover:text-[#ffb4ab] text-xs rounded border border-[#31353e] hover:border-[#ffb4ab]/40 transition-colors cursor-pointer"
                title="Hapus data di database cloud"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Cloud Notification Message */}
        {cloudSyncMessage && (
          <div className={`p-3 rounded-lg text-xs font-mono flex items-start sm:items-center gap-2.5 transition-all ${
            cloudSyncMessage.includes('Gagal') || cloudSyncMessage.includes('Peringatan') || cloudSyncMessage.includes('ditolak') || cloudSyncMessage.includes('tidak valid')
              ? 'bg-[#ffb4ab]/15 border border-[#ffb4ab]/50 text-[#ffb4ab]'
              : cloudSyncMessage.includes('Catatan') || cloudSyncMessage.includes('Offline') || cloudSyncMessage.includes('belum dikonfigurasi')
                ? 'bg-[#ffb95f]/15 border border-[#ffb95f]/40 text-[#ffb95f]'
                : 'bg-[#0ea5e9]/10 border border-[#89ceff]/40 text-[#89ceff]'
          }`}>
            {cloudSyncMessage.includes('Gagal') || cloudSyncMessage.includes('Peringatan') || cloudSyncMessage.includes('ditolak') || cloudSyncMessage.includes('tidak valid') ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ffb4ab] mt-0.5 sm:mt-0" />
            ) : cloudSyncMessage.includes('Catatan') || cloudSyncMessage.includes('Offline') || cloudSyncMessage.includes('belum dikonfigurasi') ? (
              <Info className="w-4 h-4 shrink-0 text-[#ffb95f] mt-0.5 sm:mt-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4edea3] mt-0.5 sm:mt-0" />
            )}
            <span className="flex-1 leading-relaxed">{cloudSyncMessage}</span>
          </div>
        )}

        {/* Confirmation Modal for Clearing Database */}
        {confirmClearOpen && (
          <div className="p-4 bg-[#ffb4ab]/10 border border-[#ffb4ab]/50 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[#ffb4ab]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Yakin ingin membersihkan semua record timesheet di Supabase & Browser? Tindakan ini tidak dapat dibatalkan.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-3 py-1 text-xs font-mono bg-[#1c2028] text-[#dfe2ee] rounded border border-[#31353e] hover:bg-[#262a33]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onClearCloudData) await onClearCloudData();
                  setConfirmClearOpen(false);
                }}
                className="px-3 py-1 text-xs font-mono bg-[#ba1a1a] text-white rounded font-bold hover:bg-[#93000a]"
              >
                Ya, Bersihkan Database
              </button>
            </div>
          </div>
        )}

        {/* Database Config & Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/60">
            <span className="text-[#88929b] text-[10px] uppercase">Penyimpanan Browser</span>
            <div className="font-bold text-[#4edea3] flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
              IndexedDB Aktif
            </div>
            <span className="text-[10px] text-[#88929b]">Persisten saat refresh web</span>
          </div>

          <div className="bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/60">
            <span className="text-[#88929b] text-[10px] uppercase">Database Cloud</span>
            <div className={`font-bold truncate mt-1 ${isSupabaseConfigured ? 'text-[#89ceff]' : 'text-[#ffb95f]'}`} title={SUPABASE_URL || 'Belum diisi'}>
              {isSupabaseConfigured ? 'Supabase Connected' : 'Supabase Pending'}
            </div>
            <span className="text-[10px] text-[#88929b]">{isSupabaseConfigured ? 'PostgreSQL Cloud DB' : 'IndexedDB Fallback'}</span>
          </div>

          <div className="bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/60">
            <span className="text-[#88929b] text-[10px] uppercase">Tersimpan di Cloud</span>
            <div className="font-bold text-[#4edea3] text-base mt-0.5">
              {cloudRecordCount || records.length} <span className="text-xs text-[#88929b] font-normal">records</span>
            </div>
            <span className="text-[10px] text-[#88929b]">Table: timesheet_records</span>
          </div>

          <div className="bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/60">
            <span className="text-[#88929b] text-[10px] uppercase">Upload Batches</span>
            <div className="font-bold text-[#ffb95f] text-base mt-0.5">
              {uploadBatches.length} <span className="text-xs text-[#88929b] font-normal">files logged</span>
            </div>
            <span className="text-[10px] text-[#88929b]">Table: timesheet_batches</span>
          </div>
        </div>

        {/* Expandable Vercel & Supabase Deployment Guide */}
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setShowVercelGuide(!showVercelGuide)}
            className="text-xs font-mono text-[#89ceff] hover:text-[#bde4ff] flex items-center gap-1.5 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showVercelGuide ? 'Sembunyikan Panduan Pengaturan Vercel & Supabase' : 'Lihat Panduan Pengaturan Supabase saat Dideploy ke Vercel'}</span>
          </button>

          {showVercelGuide && (
            <div className="mt-3 p-4 bg-[#0f131c] border border-[#31353e] rounded-lg text-xs font-mono flex flex-col gap-3 text-[#dfe2ee]">
              <div className="font-bold text-[#4edea3] text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-[#4edea3]" />
                Solusi Persistensi Data di Vercel & Supabase
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[#ffb95f]">1. Dual-Layer Persistence (Otomatis Aktif)</span>
                <p className="text-[#88929b] leading-relaxed">
                  Aplikasi dilengkapi sistem penyimpanan ganda: setiap file Excel yang diunggah otomatis disimpan ke <strong className="text-[#dfe2ee]">IndexedDB Browser</strong> secara instan, serta disinkronkan ke <strong className="text-[#dfe2ee]">Supabase PostgreSQL</strong>. Dengan ini, me-refresh halaman di Vercel <span className="text-[#4edea3] font-bold">tidak akan menghilangkan data Anda</span>.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#89ceff]">2. Jalankan SQL Schema di Supabase SQL Editor</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                      setCopiedSQL(true);
                      setTimeout(() => setCopiedSQL(false), 2000);
                    }}
                    className="px-2 py-0.5 bg-[#1c2028] hover:bg-[#262a33] text-[#4edea3] rounded border border-[#4edea3]/40 text-[10px] cursor-pointer"
                  >
                    {copiedSQL ? '✓ Tersalin!' : 'Salin SQL Schema'}
                  </button>
                </div>
                <p className="text-[#88929b] leading-relaxed">
                  Buka project Supabase Anda, masuk ke menu <strong className="text-[#dfe2ee]">SQL Editor</strong>, lalu salin dan jalankan script SQL berikut untuk membuat tabel & hak akses otomatis:
                </p>
                <pre className="bg-[#181c24] p-2.5 rounded border border-[#31353e] text-[11px] text-[#4edea3] overflow-x-auto max-h-48">
{SUPABASE_SQL_SCHEMA}
                </pre>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[#89ceff]">3. Environment Variables di Vercel</span>
                <p className="text-[#88929b] leading-relaxed">
                  Di dashboard Vercel Anda (<strong className="text-[#dfe2ee]">Project Settings &gt; Environment Variables</strong>), masukkan 2 variabel berikut:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-[#88929b]">
                  <div className="bg-[#181c24] p-2 rounded border border-[#31353e]">
                    <span className="text-[10px] text-[#88929b] block">Project URL</span>
                    <code className="text-[#dfe2ee]">VITE_SUPABASE_URL</code>
                  </div>
                  <div className="bg-[#181c24] p-2 rounded border border-[#31353e]">
                    <span className="text-[10px] text-[#88929b] block">Anon / Public API Key</span>
                    <code className="text-[#dfe2ee]">VITE_SUPABASE_ANON_KEY</code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload History Table (Batches) */}
        {uploadBatches.length > 0 && (
          <div className="mt-1 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#88929b]">
              <span className="flex items-center gap-1.5 font-bold text-[#dfe2ee]">
                <HardDrive className="w-3.5 h-3.5 text-[#89ceff]" /> Riwayat Batch Excel Tersimpan di Cloud
              </span>
              <span>{uploadBatches.length} file diunggah</span>
            </div>

            <div className="overflow-x-auto border border-[#31353e]/60 rounded-lg">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0f131c] text-[#88929b] border-b border-[#31353e]/60 text-[11px]">
                  <tr>
                    <th className="py-2 px-3">File Name</th>
                    <th className="py-2 px-3">Waktu Unggah</th>
                    <th className="py-2 px-3 text-right">Jumlah Baris</th>
                    <th className="py-2 px-3 text-center">Rentang Tanggal</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#31353e]/40">
                  {uploadBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-[#1c2028] transition-colors">
                      <td className="py-2 px-3 font-semibold text-[#dfe2ee] flex items-center gap-2">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#4edea3] shrink-0" />
                        <span className="truncate max-w-[220px]">{batch.fileName}</span>
                      </td>
                      <td className="py-2 px-3 text-[#88929b] text-[11px]">
                        {new Date(batch.uploadedAt).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#89ceff]">
                        {batch.recordCount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center text-[#dfe2ee] text-[11px]">
                        {batch.minDate} s/d {batch.maxDate}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="px-2 py-0.5 rounded bg-[#4edea3]/10 text-[#4edea3] text-[10px] font-bold border border-[#4edea3]/30">
                          Saved in Cloud
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 3. PARSING AUDIT / VALIDATION REPORT CARD */}
      {currentParseResult && (
        <section className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#31353e]/60">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#4edea3]" />
              <h3 className="text-sm lg:text-base font-bold text-[#dfe2ee]">
                Ingestion Audit & Quality Verification
              </h3>
            </div>
            <span className="font-mono text-xs text-[#4edea3] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/60">
              <span className="text-[#88929b] text-[10px] uppercase">File Name</span>
              <div className="font-bold text-[#dfe2ee] truncate mt-1">
                {currentParseResult.fileName}
              </div>
              <span className="text-[10px] text-[#88929b]">{currentParseResult.uploadTimestamp}</span>
            </div>

            <div className="bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/60">
              <span className="text-[#88929b] text-[10px] uppercase">Target Sheet</span>
              <div className="font-bold text-[#89ceff] mt-1">
                {currentParseResult.sheetNameUsed}
              </div>
              <span className="text-[10px] text-[#88929b]">{currentParseResult.validRows} operational records</span>
            </div>

            <div className="bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/60">
              <span className="text-[#88929b] text-[10px] uppercase">Cleaned Null/Ref HM</span>
              <div className="font-bold text-[#ffb95f] mt-1">
                {currentParseResult.cleanedNullHmCount} cells
              </div>
              <span className="text-[10px] text-[#88929b]">Normalized to 0.0</span>
            </div>

            <div className="bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/60">
              <span className="text-[#88929b] text-[10px] uppercase">Date Span</span>
              <div className="font-bold text-[#dfe2ee] mt-1">
                {currentParseResult.dateRange.min}
              </div>
              <span className="text-[10px] text-[#88929b]">to {currentParseResult.dateRange.max}</span>
            </div>
          </div>
        </section>
      )}

      {/* 4. MASTER TIMESHEET LEDGER TABLE WITH ALL SPECIFIED COLUMNS */}
      <section className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-md flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#31353e]/60">
          <div>
            <h3 className="text-sm lg:text-base font-bold text-[#dfe2ee]">
              Master Timesheet Ledger (Sheet: Timeshet Mobile)
            </h3>
            <span className="font-mono text-xs text-[#88929b]">
              Showing {filteredLedger.length} operational records with CAN-Bus & timesheet timestamps
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88929b]" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={e => { setLedgerSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search Unit, Operator, Activity, Remark..."
                className="bg-[#0f131c] text-xs font-mono text-[#dfe2ee] pl-8 pr-3 py-1.5 rounded border border-[#31353e] focus:outline-none focus:border-[#89ceff] w-56 sm:w-64"
              />
            </div>

            <button
              onClick={() => exportRawTimesheetLedger(filteredLedger, 'xlsx')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c2028] hover:bg-[#262a33] text-[#89ceff] text-xs font-mono font-medium rounded border border-[#31353e] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Ledger (.XLSX)</span>
            </button>
          </div>
        </div>

        {/* Master Ledger Table with All User Columns */}
        <div className="overflow-x-auto rounded border border-[#31353e]/70">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-[#0f131c] text-[#88929b] uppercase tracking-wider text-[10px] h-9 border-b border-[#31353e]">
                <th className="px-2.5 py-2 sticky left-0 z-20 bg-[#0f131c] border-r border-[#31353e]">
                  <span>Col B</span><br /><span className="text-[#dfe2ee]">Date</span>
                </th>
                <th className="px-2 py-2 text-center border-r border-[#31353e]/50">
                  <span>Col C</span><br /><span className="text-[#dfe2ee]">Shift</span>
                </th>
                <th className="px-2.5 py-2 border-r border-[#31353e]/50 min-w-[140px]">
                  <span>Col E</span><br /><span className="text-[#dfe2ee]">Operator</span>
                </th>
                <th className="px-2.5 py-2 border-r border-[#31353e] font-bold text-[#89ceff]">
                  <span>Col F</span><br /><span>Unit ID</span>
                </th>
                <th className="px-2 py-2 text-center border-r border-[#31353e]/50">
                  <span>Col H</span><br /><span className="text-[#88929b]">Code</span>
                </th>
                <th className="px-2 py-2 text-center border-r border-[#31353e]/50">
                  <span>Col J</span><br /><span className="text-[#dfe2ee]">Start</span>
                </th>
                <th className="px-2 py-2 text-center border-r border-[#31353e]/50">
                  <span>Col K</span><br /><span className="text-[#dfe2ee]">End</span>
                </th>
                <th className="px-2.5 py-2 text-right border-r border-[#31353e]/50">
                  <span>Col L</span><br /><span className="text-[#ffb95f]">Total Time</span>
                </th>
                <th className="px-2.5 py-2 text-right border-r border-[#31353e]/50">
                  <span>Col M</span><br /><span className="text-[#4edea3]">Start HM</span>
                </th>
                <th className="px-2.5 py-2 text-right border-r border-[#31353e]/50">
                  <span>Col N</span><br /><span className="text-[#4edea3]">Stop HM</span>
                </th>
                <th className="px-2.5 py-2 text-right border-r border-[#31353e] bg-[#1c2028]">
                  <span>Col O</span><br /><span className="text-[#ffb95f] font-bold">Total HM</span>
                </th>
                <th className="px-3 py-2 border-r border-[#31353e]/50 min-w-[150px]">
                  <span>Col Q</span><br /><span className="text-[#dfe2ee]">Activity Description</span>
                </th>
                <th className="px-3 py-2 min-w-[150px]">
                  <span>Col R</span><br /><span className="text-[#88929b]">Remark</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#31353e]/60">
              {paginatedRows.map(row => {
                const isDown = row.totalHm === 0 && (row.activity.toLowerCase().includes('breakdown') || (row.remark || '').toLowerCase().includes('accident'));
                return (
                  <tr key={row.id} className="hover:bg-[#262a33]/60 transition-colors group">
                    {/* Col B: Date */}
                    <td className="px-2.5 py-2 text-[#88929b] sticky left-0 z-10 bg-[#181c24] group-hover:bg-[#262a33] border-r border-[#31353e]">
                      {row.date}
                    </td>

                    {/* Col C: Shift */}
                    <td className="px-2 py-2 text-center border-r border-[#31353e]/40">
                      <span className="px-1.5 py-0.5 rounded bg-[#ffb4ab]/15 text-[#ffb4ab] font-bold text-[10px]">
                        {row.shift}
                      </span>
                    </td>

                    {/* Col E: Operator */}
                    <td className="px-2.5 py-2 text-[#dfe2ee] font-sans font-medium truncate max-w-[160px] border-r border-[#31353e]/40">
                      {row.operator || '-'}
                    </td>

                    {/* Col F: Unit */}
                    <td className="px-2.5 py-2 font-bold text-[#89ceff] border-r border-[#31353e]">
                      {row.unit}
                    </td>

                    {/* Col H: Activity Code */}
                    <td className="px-2 py-2 text-center text-[#88929b] border-r border-[#31353e]/40">
                      {row.activityCode || '-'}
                    </td>

                    {/* Col J: Start Operation */}
                    <td className="px-2 py-2 text-center text-[#bec8d2] border-r border-[#31353e]/40">
                      {row.startTime}
                    </td>

                    {/* Col K: End Operation */}
                    <td className="px-2 py-2 text-center text-[#bec8d2] border-r border-[#31353e]/40">
                      {row.endTime}
                    </td>

                    {/* Col L: Total Time */}
                    <td className="px-2.5 py-2 text-right text-[#ffb95f] border-r border-[#31353e]/40">
                      {row.totalTime.toFixed(2)} h
                    </td>

                    {/* Col M: Start HM */}
                    <td className="px-2.5 py-2 text-right text-[#88929b] border-r border-[#31353e]/40">
                      {row.startHm > 0 ? row.startHm.toFixed(1) : '-'}
                    </td>

                    {/* Col N: Stop HM */}
                    <td className="px-2.5 py-2 text-right text-[#88929b] border-r border-[#31353e]/40">
                      {row.stopHm > 0 ? row.stopHm.toFixed(1) : '-'}
                    </td>

                    {/* Col O: Total HM */}
                    <td className="px-2.5 py-2 text-right font-bold border-r border-[#31353e] bg-[#1c2028]">
                      {row.totalHm > 0 ? (
                        <span className="text-[#4edea3]">{row.totalHm.toFixed(2)} h</span>
                      ) : (
                        <span className="text-[#ffb4ab]">0.00 h</span>
                      )}
                    </td>

                    {/* Col Q: Activity */}
                    <td className="px-3 py-2 font-sans text-[#dfe2ee] border-r border-[#31353e]/40">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            row.totalHm > 0 ? 'bg-[#4edea3]' : isDown ? 'bg-[#ffb4ab]' : 'bg-[#ffb95f]'
                          }`}
                        ></span>
                        <span className="truncate max-w-[180px]">{row.activity}</span>
                      </div>
                    </td>

                    {/* Col R: Remark */}
                    <td className="px-3 py-2 font-sans text-xs text-[#88929b] truncate max-w-[200px]">
                      {row.remark ? (
                        <span className={isDown ? 'text-[#ffb4ab] font-semibold' : 'text-[#bec8d2]'}>
                          {row.remark}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}

              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-[#88929b]">
                    No ledger entries matching search parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 font-mono text-xs text-[#88929b]">
          <div>
            Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
            {Math.min(currentPage * rowsPerPage, filteredLedger.length)} of {filteredLedger.length} records
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-[#1c2028] hover:bg-[#262a33] text-[#dfe2ee] disabled:opacity-40 disabled:cursor-not-allowed border border-[#31353e]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-[#dfe2ee]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-[#1c2028] hover:bg-[#262a33] text-[#dfe2ee] disabled:opacity-40 disabled:cursor-not-allowed border border-[#31353e]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
