import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { GlobalFilterBar } from './components/GlobalFilterBar';
import { ParetoAnalysis } from './components/ParetoAnalysis';
import { UnitBreakdown } from './components/UnitBreakdown';
import { DailyMatrixPivot } from './components/DailyMatrixPivot';
import { TimesheetUploader } from './components/TimesheetUploader';
import { INITIAL_SAMPLE_RECORDS } from './data/sampleTimesheetData';
import {
  TimesheetRecord,
  FilterState,
  ParseResult
} from './types';
import {
  filterRecords,
  computeParetoAnalysis,
  computeUnitSummaries,
  computeDailyMatrix
} from './utils/analyticsEngine';
import {
  exportParetoData,
  exportUnitBreakdown,
  exportDailyMatrix,
  exportRawTimesheetLedger
} from './utils/exportUtils';
import {
  supabase,
  isSupabaseConfigured,
  saveDatasetToSupabase,
  saveRecordsToSupabase,
  fetchBatchesFromSupabase,
  clearAllSupabaseData,
  mapSupabaseRowToTimesheetRecord,
  BatchMetadata,
  SUPABASE_URL
} from './lib/supabase';
import {
  saveLocalDataset,
  loadLocalDataset,
  clearLocalDataset
} from './utils/localPersistence';
import {
  BarChart3,
  Gauge,
  Grid,
  UploadCloud
} from 'lucide-react';

export default function App() {
  // State for raw dataset
  const [rawRecords, setRawRecords] = useState<TimesheetRecord[]>(INITIAL_SAMPLE_RECORDS);

  // Initial audit summary for the dataset
  const [parseResult, setParseResult] = useState<ParseResult | null>({
    records: INITIAL_SAMPLE_RECORDS,
    sheetNameUsed: 'Timeshet Mobile',
    availableSheets: ['Timeshet Mobile', 'Summary', 'Equipment Roster'],
    totalRowsRaw: 150,
    validRows: 150,
    cleanedNullHmCount: 3,
    dateRange: { min: '2025-08-01', max: '2025-08-14' },
    categoriesDetected: ['Truck', 'HE', 'Support'],
    unitsDetected: Array.from(new Set(INITIAL_SAMPLE_RECORDS.map(r => r.unit))).sort(),
    activitiesDetected: Array.from(new Set(INITIAL_SAMPLE_RECORDS.map(r => r.activity))).sort(),
    fileName: 'Pit04_Seam_Dispatch_Timesheet_Aug2025.xlsx',
    uploadTimestamp: 'System Pre-loaded (Aug 2025)',
  });

  // Current active navigation tab
  const [currentTab, setCurrentTab] = useState<string>('pareto-activity');

  // Cloud (Supabase) integration states
  const [isCloudLoading, setIsCloudLoading] = useState<boolean>(false);
  const [isCloudSaving, setIsCloudSaving] = useState<boolean>(false);
  const [cloudRecordCount, setCloudRecordCount] = useState<number>(0);
  const [uploadBatches, setUploadBatches] = useState<BatchMetadata[]>([]);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);

  // Derive initial dates
  const initialMinDate = '2025-08-01';
  const initialMaxDate = '2025-08-14';

  // Global filters
  const [filters, setFilters] = useState<FilterState>({
    dateMode: 'range',
    startDate: initialMinDate,
    endDate: initialMaxDate,
    selectedSingleDate: initialMinDate,
    selectedCategory: 'ALL',
    selectedUnits: [],
    selectedActivity: 'ALL',
    searchQuery: '',
  });

  // Fetch initial records: prioritize instant local IndexedDB dataset, then query Supabase
  useEffect(() => {
    let isMounted = true;

    async function initializeFleetData() {
      // 1. Instantly restore uploaded data from browser IndexedDB (eliminates data loss on refresh)
      try {
        const localData = await loadLocalDataset();
        if (localData && localData.records && localData.records.length > 0 && isMounted) {
          setRawRecords(localData.records);
          if (localData.parseResult) {
            setParseResult(localData.parseResult);
          }
          const dates = localData.records.map(r => r.date).filter(Boolean).sort();
          const minD = dates[0] || '2025-08-01';
          const maxD = dates[dates.length - 1] || '2025-08-14';
          setFilters(prev => ({
            ...prev,
            startDate: minD,
            endDate: maxD,
            selectedSingleDate: minD,
          }));
          setCloudSyncMessage(`Memuat ${localData.records.length} record dari penyimpanan lokal browser (IndexedDB).`);
        }
      } catch (localErr) {
        console.warn('Local storage retrieval notice:', localErr);
      }

      // 2. Fetch from Supabase in parallel if configured using Supabase Client SDK
      if (isSupabaseConfigured) {
        setIsCloudLoading(true);
        try {
          // Ambil dataset aktif dari tabel active_datasets dan timesheet_records
          let cloudRecords: TimesheetRecord[] = [];
          let activeFileName = 'Supabase Cloud Database';
          let activeUploadedAt = 'Synced from Supabase';

          // Query tabel active_datasets
          const { data: activeDs } = await supabase
            .from('active_datasets')
            .select('*')
            .eq('dataset_code', 'current')
            .maybeSingle();

          if (activeDs && activeDs.id) {
            activeFileName = activeDs.file_name ? `${activeDs.file_name} (Supabase)` : activeFileName;
            activeUploadedAt = activeDs.created_at ? new Date(activeDs.created_at).toLocaleString('id-ID') : activeUploadedAt;

            // Query tabel timesheet_records berdasarkan dataset_id
            const { data: recData } = await supabase
              .from('timesheet_records')
              .select('*')
              .eq('dataset_id', activeDs.id);

            if (recData && recData.length > 0) {
              cloudRecords = recData.map(mapSupabaseRowToTimesheetRecord);
            }
          }

          // Fallback query tabel timesheet_records langsung
          if (cloudRecords.length === 0) {
            const { data: allRecs } = await supabase
              .from('timesheet_records')
              .select('*')
              .limit(10000);

            if (allRecs && allRecs.length > 0) {
              cloudRecords = allRecs.map(mapSupabaseRowToTimesheetRecord);
            }
          }

          const batches = await fetchBatchesFromSupabase().catch(() => []);

          if (!isMounted) return;

          setUploadBatches(batches);
          setCloudRecordCount(cloudRecords.length);

          // If cloud database has records, synchronize with workspace and local storage
          if (cloudRecords.length > 0) {
            setRawRecords(cloudRecords);

            const dates = cloudRecords.map(r => r.date).filter(Boolean).sort();
            const minD = dates[0] || '2025-08-01';
            const maxD = dates[dates.length - 1] || '2025-08-14';

            const latestBatch = batches[0];
            const cloudParseResult: ParseResult = {
              records: cloudRecords,
              sheetNameUsed: 'Timeshet Mobile',
              availableSheets: ['Timeshet Mobile (Supabase)'],
              totalRowsRaw: cloudRecords.length,
              validRows: cloudRecords.length,
              cleanedNullHmCount: 0,
              dateRange: { min: minD, max: maxD },
              categoriesDetected: Array.from(new Set(cloudRecords.map(r => r.category))),
              unitsDetected: Array.from(new Set(cloudRecords.map(r => r.unit))).sort(),
              activitiesDetected: Array.from(new Set(cloudRecords.map(r => r.activity))).sort(),
              fileName: latestBatch?.fileName ? `${latestBatch.fileName} (Supabase)` : activeFileName,
              uploadTimestamp: latestBatch?.uploadedAt
                ? new Date(latestBatch.uploadedAt).toLocaleString('id-ID')
                : activeUploadedAt,
            };

            setParseResult(cloudParseResult);
            // Keep local IndexedDB updated with cloud state
            await saveLocalDataset(cloudRecords, cloudParseResult);

            setFilters(prev => ({
              ...prev,
              startDate: minD,
              endDate: maxD,
              selectedSingleDate: minD,
            }));

            setCloudSyncMessage(`Terkoneksi ke Supabase: Berhasil menyinkronkan ${cloudRecords.length} record dari PostgreSQL (active_datasets & timesheet_records).`);
          } else {
            setCloudSyncMessage('Supabase online. Database siap menerima unggahan Excel.');
          }
        } catch (err: any) {
          console.warn('Supabase initial fetch notice:', err);
          if (isMounted) {
            setCloudSyncMessage(`Penyimpanan browser (IndexedDB) aktif. Info Supabase: ${err?.message || 'Offline'}`);
          }
        } finally {
          if (isMounted) setIsCloudLoading(false);
        }
      } else {
        setCloudSyncMessage('Penyimpanan lokal browser (IndexedDB) aktif. Data persisten saat web direfresh.');
      }
    }

    initializeFleetData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Extract master metadata from raw records
  const { minDate, maxDate, availableCategories, availableUnits, availableDates, categoryUnitCounts } = useMemo(() => {
    let minD = '9999-99-99';
    let maxD = '0000-00-00';
    const catSet = new Set<string>();
    const unitSet = new Set<string>();
    const dateSet = new Set<string>();
    const catUnitMap: Record<string, Set<string>> = {};

    rawRecords.forEach(r => {
      if (r.date < minD) minD = r.date;
      if (r.date > maxD) maxD = r.date;
      catSet.add(r.category);
      unitSet.add(r.unit);
      dateSet.add(r.date);

      if (!catUnitMap[r.category]) {
        catUnitMap[r.category] = new Set();
      }
      catUnitMap[r.category].add(r.unit);
    });

    const categoryUnitCounts: Record<string, number> = {};
    Object.keys(catUnitMap).forEach(cat => {
      categoryUnitCounts[cat] = catUnitMap[cat].size;
    });

    return {
      minDate: minD === '9999-99-99' ? '2025-08-01' : minD,
      maxDate: maxD === '0000-00-00' ? '2025-08-14' : maxD,
      availableCategories: Array.from(catSet),
      availableUnits: Array.from(unitSet).sort(),
      availableDates: Array.from(dateSet).sort(),
      categoryUnitCounts,
    };
  }, [rawRecords]);

  // Compute filtered records
  const filteredRecords = useMemo(() => {
    return filterRecords(rawRecords, filters);
  }, [rawRecords, filters]);

  // Tab 1: Pareto Activity Analytics
  const paretoAnalytics = useMemo(() => {
    return computeParetoAnalysis(filteredRecords);
  }, [filteredRecords]);

  // Tab 2: Unit HM Summaries
  const unitAnalytics = useMemo(() => {
    return computeUnitSummaries(filteredRecords);
  }, [filteredRecords]);

  // Tab 3: Daily HM Matrix Pivot
  const matrixAnalytics = useMemo(() => {
    return computeDailyMatrix(filteredRecords);
  }, [filteredRecords]);

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      dateMode: 'range',
      startDate: minDate,
      endDate: maxDate,
      selectedSingleDate: minDate,
      selectedCategory: 'ALL',
      selectedUnits: [],
      selectedActivity: 'ALL',
      searchQuery: '',
    });
  };

  // Filter updates
  const handleFilterChange = (updated: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  // File loaded event from uploader (with automatic IndexedDB & Supabase PostgreSQL persistence)
  const handleDataLoaded = async (result: ParseResult) => {
    setRawRecords(result.records);
    setParseResult(result);
    setFilters({
      dateMode: 'range',
      startDate: result.dateRange.min,
      endDate: result.dateRange.max,
      selectedSingleDate: result.dateRange.min,
      selectedCategory: 'ALL',
      selectedUnits: [],
      selectedActivity: 'ALL',
      searchQuery: '',
    });

    // 1. Immediately persist to browser IndexedDB so it NEVER disappears on page refresh
    try {
      await saveLocalDataset(result.records, result);
    } catch (saveLocalErr) {
      console.warn('Local persistence warning:', saveLocalErr);
    }

    // 2. Auto-save to Supabase cloud database if configured (active_datasets & timesheet_records)
    if (isSupabaseConfigured) {
      setIsCloudSaving(true);
      try {
        const metadata = {
          fileName: result.fileName || 'Timesheet_Data.xlsx',
          batchesCount: 1,
          startDate: result.dateRange.min,
          endDate: result.dateRange.max,
          totalHours: result.records.reduce((sum, r) => sum + (r.totalHm || r.operatingHours || 0), 0),
          totalVolume: 0,
          recordCount: result.records.length,
          uploadedBy: 'Fleet Admin'
        };
        await saveDatasetToSupabase(metadata, result.records);

        const { batchId, count } = await saveRecordsToSupabase(result.records, result.fileName);
        setCloudRecordCount(count);

        // Refresh upload batches
        const batches = await fetchBatchesFromSupabase();
        setUploadBatches(batches);

        setCloudSyncMessage(
          `✓ Data tersimpan di Supabase PostgreSQL (active_datasets & timesheet_records)! (${count} baris data).`
        );
      } catch (err: any) {
        console.error('Failed to save to Supabase:', err);
        const errDetail = err?.message || String(err);
        setCloudSyncMessage(
          `✓ Data tersimpan aman di browser (IndexedDB). Catatan Supabase: ${errDetail}`
        );
      } finally {
        setIsCloudSaving(false);
      }
    } else {
      setCloudSyncMessage(
        `✓ ${result.records.length} baris data tersimpan aman di browser (IndexedDB)! Data tidak akan hilang saat direfresh.`
      );
    }
  };

  // Manual sync from Supabase using supabase client querying active_datasets & timesheet_records
  const handleSyncFromCloud = async () => {
    if (!isSupabaseConfigured) {
      setCloudSyncMessage('Supabase belum dikonfigurasi. Masukkan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di environment variables.');
      return;
    }
    setIsCloudLoading(true);
    setCloudSyncMessage(null);
    try {
      let cloudRecords: TimesheetRecord[] = [];
      let activeFileName = 'Supabase Cloud Database';
      let activeUploadedAt = 'Synced from Supabase';

      // Query tabel active_datasets
      const { data: activeDs } = await supabase
        .from('active_datasets')
        .select('*')
        .eq('dataset_code', 'current')
        .maybeSingle();

      if (activeDs && activeDs.id) {
        activeFileName = activeDs.file_name ? `${activeDs.file_name} (Supabase)` : activeFileName;
        activeUploadedAt = activeDs.created_at ? new Date(activeDs.created_at).toLocaleString('id-ID') : activeUploadedAt;

        // Query tabel timesheet_records berdasarkan dataset_id
        const { data: recData } = await supabase
          .from('timesheet_records')
          .select('*')
          .eq('dataset_id', activeDs.id);

        if (recData && recData.length > 0) {
          cloudRecords = recData.map(mapSupabaseRowToTimesheetRecord);
        }
      }

      // Fallback: query tabel timesheet_records langsung
      if (cloudRecords.length === 0) {
        const { data: allRecs } = await supabase
          .from('timesheet_records')
          .select('*')
          .limit(10000);

        if (allRecs && allRecs.length > 0) {
          cloudRecords = allRecs.map(mapSupabaseRowToTimesheetRecord);
        }
      }

      const batches = await fetchBatchesFromSupabase().catch(() => []);

      setUploadBatches(batches);
      setCloudRecordCount(cloudRecords.length);

      if (cloudRecords.length > 0) {
        setRawRecords(cloudRecords);

        const dates = cloudRecords.map(r => r.date).filter(Boolean).sort();
        const minD = dates[0] || '2025-08-01';
        const maxD = dates[dates.length - 1] || '2025-08-14';

        const latestBatch = batches[0];
        const syncResult: ParseResult = {
          records: cloudRecords,
          sheetNameUsed: 'Timeshet Mobile',
          availableSheets: ['Timeshet Mobile (Supabase)'],
          totalRowsRaw: cloudRecords.length,
          validRows: cloudRecords.length,
          cleanedNullHmCount: 0,
          dateRange: { min: minD, max: maxD },
          categoriesDetected: Array.from(new Set(cloudRecords.map(r => r.category))),
          unitsDetected: Array.from(new Set(cloudRecords.map(r => r.unit))).sort(),
          activitiesDetected: Array.from(new Set(cloudRecords.map(r => r.activity))).sort(),
          fileName: latestBatch?.fileName ? `${latestBatch.fileName} (Cloud)` : activeFileName,
          uploadTimestamp: latestBatch?.uploadedAt
            ? new Date(latestBatch.uploadedAt).toLocaleString('id-ID')
            : activeUploadedAt,
        };

        setParseResult(syncResult);
        await saveLocalDataset(cloudRecords, syncResult);

        setFilters(prev => ({
          ...prev,
          startDate: minD,
          endDate: maxD,
          selectedSingleDate: minD,
        }));

        setCloudSyncMessage(`Berhasil menyinkronkan ${cloudRecords.length} record dari database Supabase (tabel active_datasets & timesheet_records)!`);
      } else {
        setCloudSyncMessage('Database Supabase saat ini masih kosong. Silakan upload file Excel.');
      }
    } catch (err: any) {
      console.error('Error syncing from Supabase:', err);
      setCloudSyncMessage(`Gagal menyinkronkan dari Supabase: ${err?.message || 'Error'}`);
    } finally {
      setIsCloudLoading(false);
    }
  };

  // Manual save current active records to Supabase & Local IndexedDB
  const handleSaveCurrentToCloud = async () => {
    if (rawRecords.length === 0) return;
    setIsCloudSaving(true);
    setCloudSyncMessage(null);
    try {
      const fileName = parseResult?.fileName || 'Fleet_Timesheet_Manual_Save.xlsx';
      
      // Save locally first
      if (parseResult) {
        await saveLocalDataset(rawRecords, parseResult);
      }

      // Save to Supabase if configured (active_datasets & timesheet_records)
      if (isSupabaseConfigured) {
        const metadata = {
          fileName,
          batchesCount: 1,
          startDate: parseResult?.dateRange?.min || rawRecords[0]?.date || '',
          endDate: parseResult?.dateRange?.max || rawRecords[rawRecords.length - 1]?.date || '',
          totalHours: rawRecords.reduce((sum, r) => sum + (r.totalHm || r.operatingHours || 0), 0),
          totalVolume: 0,
          recordCount: rawRecords.length,
          uploadedBy: 'Fleet Admin'
        };
        await saveDatasetToSupabase(metadata, rawRecords);

        const { batchId, count } = await saveRecordsToSupabase(rawRecords, fileName);
        setCloudRecordCount(count);

        const batches = await fetchBatchesFromSupabase();
        setUploadBatches(batches);

        setCloudSyncMessage(`Berhasil menyimpan ${count} record ke Supabase PostgreSQL (active_datasets & timesheet_records) & Browser Storage!`);
      } else {
        setCloudSyncMessage(`Berhasil menyimpan ${rawRecords.length} record ke penyimpanan browser (IndexedDB).`);
      }
    } catch (err: any) {
      console.error('Failed to save to Supabase:', err);
      setCloudSyncMessage(`Data tersimpan di browser. Info Cloud: ${err?.message || 'Error'}`);
    } finally {
      setIsCloudSaving(false);
    }
  };

  // Clear all data in Supabase and local IndexedDB
  const handleClearCloudData = async () => {
    setIsCloudLoading(true);
    try {
      await Promise.all([
        clearAllSupabaseData().catch(e => console.warn('Clear Supabase notice:', e)),
        clearLocalDataset().catch(e => console.warn('Clear Local notice:', e))
      ]);
      setUploadBatches([]);
      setCloudRecordCount(0);
      setCloudSyncMessage('Semua data di Supabase dan penyimpanan browser telah berhasil dibersihkan.');
    } catch (err: any) {
      console.error('Failed to clear Supabase:', err);
      setCloudSyncMessage(`Gagal membersihkan database: ${err?.message || 'Error'}`);
    } finally {
      setIsCloudLoading(false);
    }
  };

  // Reset back to pre-loaded sample
  const handleResetToSample = async () => {
    setRawRecords(INITIAL_SAMPLE_RECORDS);
    const sampleResult: ParseResult = {
      records: INITIAL_SAMPLE_RECORDS,
      sheetNameUsed: 'Timeshet Mobile',
      availableSheets: ['Timeshet Mobile'],
      totalRowsRaw: INITIAL_SAMPLE_RECORDS.length,
      validRows: INITIAL_SAMPLE_RECORDS.length,
      cleanedNullHmCount: 3,
      dateRange: { min: '2025-08-01', max: '2025-08-14' },
      categoriesDetected: ['DUMP TRUCK', 'EXCAVATOR', 'DOZER', 'MOTOR GRADER', 'WHEEL LOADER', 'WATER TRUCK'],
      unitsDetected: Array.from(new Set(INITIAL_SAMPLE_RECORDS.map(r => r.unit))).sort(),
      activitiesDetected: Array.from(new Set(INITIAL_SAMPLE_RECORDS.map(r => r.activity))).sort(),
      fileName: 'Sample_Timesheet_Aug2025.xlsx',
      uploadTimestamp: 'System Pre-loaded (Aug 2025)',
    };
    setParseResult(sampleResult);
    await saveLocalDataset(INITIAL_SAMPLE_RECORDS, sampleResult);
    setFilters({
      dateMode: 'range',
      startDate: '2025-08-01',
      endDate: '2025-08-14',
      selectedSingleDate: '2025-08-01',
      selectedCategory: 'ALL',
      selectedUnits: [],
      selectedActivity: 'ALL',
      searchQuery: '',
    });
    setCloudSyncMessage('Dataset dikembalikan ke contoh data timesheet awal.');
  };

  // Export current active view
  const handleExportCurrentView = (format: 'csv' | 'xlsx') => {
    const dateRangeLabel = filters.dateMode === 'single'
      ? filters.selectedSingleDate
      : `${filters.startDate}_to_${filters.endDate}`;

    if (currentTab === 'pareto-activity') {
      exportParetoData(paretoAnalytics.items, format, dateRangeLabel);
    } else if (currentTab === 'unit-hm-breakdown') {
      exportUnitBreakdown(unitAnalytics.units, format, dateRangeLabel);
    } else if (currentTab === 'daily-hm-matrix') {
      exportDailyMatrix(matrixAnalytics.dates, matrixAnalytics.rows, format);
    } else {
      exportRawTimesheetLedger(filteredRecords, format);
    }
  };

  const activeDateLabel = filters.dateMode === 'single'
    ? filters.selectedSingleDate
    : `${filters.startDate} – ${filters.endDate}`;

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased flex flex-col">
      {/* Sidebar (Desktop) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        loadedSheetName={parseResult?.sheetNameUsed || 'Timeshet Mobile'}
        totalRecordsCount={rawRecords.length}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 pb-16 lg:pb-8">
        {/* Header */}
        <Header
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          filters={filters}
          onResetFilters={handleResetFilters}
          onExportCurrentView={handleExportCurrentView}
          totalRecordsCount={rawRecords.length}
          filteredRecordsCount={filteredRecords.length}
          isFirebaseLoading={isCloudLoading}
          isFirebaseSaving={isCloudSaving}
        />

        {/* Primary Page Canvas */}
        <main className="w-full pt-20 px-3 sm:px-6 py-4 flex flex-col gap-4">
          {/* Global Filter Bar (Always accessible on all tabs for dynamic slicing) */}
          <GlobalFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            availableCategories={availableCategories}
            availableUnits={availableUnits}
            availableDates={availableDates}
            minDate={minDate}
            maxDate={maxDate}
            categoryUnitCounts={categoryUnitCounts}
          />

          {/* Tab 1: Pareto Activity Analysis */}
          {currentTab === 'pareto-activity' && (
            <ParetoAnalysis
              paretoItems={paretoAnalytics.items}
              totalHm={paretoAnalytics.totalHm}
              vitalFewCount={paretoAnalytics.vitalFewCount}
              vitalFewHm={paretoAnalytics.vitalFewHm}
              activeUnitsCount={unitAnalytics.units.length}
              totalUnitsCount={availableUnits.length}
              topProducer={unitAnalytics.topProducer}
              averageUtilization={unitAnalytics.averageUtilization}
              dateRangeText={activeDateLabel}
            />
          )}

          {/* Tab 2: Unit HM Breakdown */}
          {currentTab === 'unit-hm-breakdown' && (
            <UnitBreakdown
              units={unitAnalytics.units}
              topProducer={unitAnalytics.topProducer}
              underutilizedCount={unitAnalytics.underutilizedCount}
              averageUtilization={unitAnalytics.averageUtilization}
              totalFleetCount={availableUnits.length}
              dateRangeText={activeDateLabel}
            />
          )}

          {/* Tab 3: Daily HM Matrix Pivot */}
          {currentTab === 'daily-hm-matrix' && (
            <DailyMatrixPivot
              dates={matrixAnalytics.dates}
              matrixRows={matrixAnalytics.rows}
              dateTotals={matrixAnalytics.dateTotals}
              grandTotalHm={matrixAnalytics.grandTotalHm}
              dateRangeText={activeDateLabel}
            />
          )}

          {/* Tab 4: Timesheet Ingestion & Raw Ledger */}
          {currentTab === 'timesheet-ingestion' && (
            <TimesheetUploader
              onDataLoaded={handleDataLoaded}
              currentParseResult={parseResult}
              records={filteredRecords}
              onResetToSample={handleResetToSample}
              isCloudSaving={isCloudSaving}
              isCloudLoading={isCloudLoading}
              cloudSyncMessage={cloudSyncMessage}
              uploadBatches={uploadBatches}
              cloudRecordCount={cloudRecordCount}
              onSyncFromCloud={handleSyncFromCloud}
              onSaveCurrentToCloud={handleSaveCurrentToCloud}
              onClearCloudData={handleClearCloudData}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#181c24] border-t border-[#31353e] flex items-center justify-around py-2 px-1">
        <button
          onClick={() => setCurrentTab('pareto-activity')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded font-mono text-[10px] ${
            currentTab === 'pareto-activity' ? 'text-[#89ceff] font-bold' : 'text-[#88929b]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Pareto</span>
        </button>
        <button
          onClick={() => setCurrentTab('unit-hm-breakdown')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded font-mono text-[10px] ${
            currentTab === 'unit-hm-breakdown' ? 'text-[#89ceff] font-bold' : 'text-[#88929b]'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Unit HM</span>
        </button>
        <button
          onClick={() => setCurrentTab('daily-hm-matrix')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded font-mono text-[10px] ${
            currentTab === 'daily-hm-matrix' ? 'text-[#89ceff] font-bold' : 'text-[#88929b]'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Matrix</span>
        </button>
        <button
          onClick={() => setCurrentTab('timesheet-ingestion')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded font-mono text-[10px] ${
            currentTab === 'timesheet-ingestion' ? 'text-[#89ceff] font-bold' : 'text-[#88929b]'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Ingest</span>
        </button>
      </div>
    </div>
  );
}
