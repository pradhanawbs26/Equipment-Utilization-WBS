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
  saveRecordsToFirestore,
  fetchRecordsFromFirestore,
  fetchBatchesFromFirestore,
  clearAllFirestoreData,
  BatchMetadata,
  FIREBASE_PROJECT_ID
} from './lib/firebase';
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

  // Firebase integration states
  const [isFirebaseLoading, setIsFirebaseLoading] = useState<boolean>(true);
  const [isFirebaseSaving, setIsFirebaseSaving] = useState<boolean>(false);
  const [firebaseRecordCount, setFirebaseRecordCount] = useState<number>(0);
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

  // Fetch initial records and batch history from Firebase Firestore
  useEffect(() => {
    let isMounted = true;

    async function loadFirestoreData() {
      setIsFirebaseLoading(true);
      try {
        const [cloudRecords, batches] = await Promise.all([
          fetchRecordsFromFirestore(),
          fetchBatchesFromFirestore()
        ]);

        if (!isMounted) return;

        setUploadBatches(batches);
        setFirebaseRecordCount(cloudRecords.length);

        // If cloud database has existing records, load them into the workspace
        if (cloudRecords.length > 0) {
          setRawRecords(cloudRecords);

          const dates = cloudRecords.map(r => r.date).filter(Boolean).sort();
          const minD = dates[0] || '2025-08-01';
          const maxD = dates[dates.length - 1] || '2025-08-14';

          const latestBatch = batches[0];
          setParseResult({
            records: cloudRecords,
            sheetNameUsed: 'Timeshet Mobile',
            availableSheets: ['Timeshet Mobile (Cloud)'],
            totalRowsRaw: cloudRecords.length,
            validRows: cloudRecords.length,
            cleanedNullHmCount: 0,
            dateRange: { min: minD, max: maxD },
            categoriesDetected: Array.from(new Set(cloudRecords.map(r => r.category))),
            unitsDetected: Array.from(new Set(cloudRecords.map(r => r.unit))).sort(),
            activitiesDetected: Array.from(new Set(cloudRecords.map(r => r.activity))).sort(),
            fileName: latestBatch?.fileName ? `${latestBatch.fileName} (Firestore)` : 'Firebase Cloud Database',
            uploadTimestamp: latestBatch?.uploadedAt
              ? new Date(latestBatch.uploadedAt).toLocaleString('id-ID')
              : 'Synced from Firestore',
          });

          setFilters(prev => ({
            ...prev,
            startDate: minD,
            endDate: maxD,
            selectedSingleDate: minD,
          }));

          setCloudSyncMessage(`Terkoneksi ke Firebase: Berhasil memuat ${cloudRecords.length} record dari database cloud (${FIREBASE_PROJECT_ID}).`);
        } else {
          setCloudSyncMessage(`Firebase Firestore online (${FIREBASE_PROJECT_ID}). Database siap menerima unggahan Excel.`);
        }
      } catch (err: any) {
        console.warn('Firestore initial fetch notice:', err);
        if (isMounted) {
          setCloudSyncMessage(`Firebase Firestore terkoneksi (${FIREBASE_PROJECT_ID}).`);
        }
      } finally {
        if (isMounted) setIsFirebaseLoading(false);
      }
    }

    loadFirestoreData();
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

  // File loaded event from uploader (with automatic Firebase Firestore persistence)
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

    // Auto-save to Firebase Firestore database
    setIsFirebaseSaving(true);
    try {
      const { batchId, count } = await saveRecordsToFirestore(result.records, result.fileName);
      setFirebaseRecordCount(count);

      // Refresh upload batches
      const batches = await fetchBatchesFromFirestore();
      setUploadBatches(batches);

      setCloudSyncMessage(
        `✓ Tersimpan di Database Firebase Firestore (${FIREBASE_PROJECT_ID})! Batch ID: ${batchId.slice(0, 8)}... (${count} baris data).`
      );
    } catch (err: any) {
      console.error('Failed to save to Firebase Firestore:', err);
      setCloudSyncMessage(`Peringatan: Gagal menyimpan ke Firebase Firestore (${err?.message || 'Error'}). Data tetap tersedia di sesi lokal.`);
    } finally {
      setIsFirebaseSaving(false);
    }
  };

  // Manual sync from Firebase Firestore
  const handleSyncFromFirebase = async () => {
    setIsFirebaseLoading(true);
    setCloudSyncMessage(null);
    try {
      const [cloudRecords, batches] = await Promise.all([
        fetchRecordsFromFirestore(),
        fetchBatchesFromFirestore()
      ]);

      setUploadBatches(batches);
      setFirebaseRecordCount(cloudRecords.length);

      if (cloudRecords.length > 0) {
        setRawRecords(cloudRecords);

        const dates = cloudRecords.map(r => r.date).filter(Boolean).sort();
        const minD = dates[0] || '2025-08-01';
        const maxD = dates[dates.length - 1] || '2025-08-14';

        const latestBatch = batches[0];
        setParseResult({
          records: cloudRecords,
          sheetNameUsed: 'Timeshet Mobile',
          availableSheets: ['Timeshet Mobile (Cloud)'],
          totalRowsRaw: cloudRecords.length,
          validRows: cloudRecords.length,
          cleanedNullHmCount: 0,
          dateRange: { min: minD, max: maxD },
          categoriesDetected: Array.from(new Set(cloudRecords.map(r => r.category))),
          unitsDetected: Array.from(new Set(cloudRecords.map(r => r.unit))).sort(),
          activitiesDetected: Array.from(new Set(cloudRecords.map(r => r.activity))).sort(),
          fileName: latestBatch?.fileName ? `${latestBatch.fileName} (Cloud)` : 'Firebase Cloud Database',
          uploadTimestamp: latestBatch?.uploadedAt
            ? new Date(latestBatch.uploadedAt).toLocaleString('id-ID')
            : 'Synced from Firestore',
        });

        setFilters(prev => ({
          ...prev,
          startDate: minD,
          endDate: maxD,
          selectedSingleDate: minD,
        }));

        setCloudSyncMessage(`Berhasil menyinkronkan ${cloudRecords.length} record dari database Firebase Firestore!`);
      } else {
        setCloudSyncMessage('Database Firebase Firestore saat ini masih kosong. Silakan upload file Excel.');
      }
    } catch (err: any) {
      console.error('Error syncing from Firebase:', err);
      setCloudSyncMessage(`Gagal menyinkronkan dari Firebase: ${err.message || 'Error'}`);
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  // Manual save current active records to Firestore
  const handleSaveCurrentToFirebase = async () => {
    if (rawRecords.length === 0) return;
    setIsFirebaseSaving(true);
    setCloudSyncMessage(null);
    try {
      const fileName = parseResult?.fileName || 'Fleet_Timesheet_Manual_Save.xlsx';
      const { batchId, count } = await saveRecordsToFirestore(rawRecords, fileName);
      setFirebaseRecordCount(count);

      const batches = await fetchBatchesFromFirestore();
      setUploadBatches(batches);

      setCloudSyncMessage(`Berhasil menyimpan ${count} record saat ini ke database Firebase Firestore (${FIREBASE_PROJECT_ID})!`);
    } catch (err: any) {
      console.error('Failed to save to Firestore:', err);
      setCloudSyncMessage(`Gagal menyimpan ke Firebase Firestore: ${err?.message || 'Error'}`);
    } finally {
      setIsFirebaseSaving(false);
    }
  };

  // Clear all data in Firestore
  const handleClearFirebaseData = async () => {
    setIsFirebaseLoading(true);
    try {
      await clearAllFirestoreData();
      setUploadBatches([]);
      setFirebaseRecordCount(0);
      setCloudSyncMessage('Semua data dan batch di Firebase Firestore telah berhasil dibersihkan.');
    } catch (err: any) {
      console.error('Failed to clear Firestore:', err);
      setCloudSyncMessage(`Gagal membersihkan database Firebase: ${err?.message || 'Error'}`);
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  // Reset back to pre-loaded sample
  const handleResetToSample = () => {
    setRawRecords(INITIAL_SAMPLE_RECORDS);
    setParseResult({
      records: INITIAL_SAMPLE_RECORDS,
      sheetNameUsed: 'Timeshet Mobile',
      availableSheets: ['Timeshet Mobile'],
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
          isFirebaseLoading={isFirebaseLoading}
          isFirebaseSaving={isFirebaseSaving}
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
              isFirebaseSaving={isFirebaseSaving}
              isFirebaseLoading={isFirebaseLoading}
              cloudSyncMessage={cloudSyncMessage}
              uploadBatches={uploadBatches}
              firebaseRecordCount={firebaseRecordCount}
              onSyncFromFirebase={handleSyncFromFirebase}
              onSaveCurrentToFirebase={handleSaveCurrentToFirebase}
              onClearFirebaseData={handleClearFirebaseData}
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
