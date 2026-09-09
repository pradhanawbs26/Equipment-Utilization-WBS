export type EquipmentCategory =
  | 'FLAT DECK'
  | 'DUMP TRUCK'
  | 'WHEEL LOADER'
  | 'EXCAVATOR'
  | 'DOZER'
  | 'WATER TRUCK'
  | 'MOTOR GRADER'
  | 'VIBRATION COMPACTOR'
  | 'REACH STACKER'
  | 'FORKLIFT'
  | 'CRANE TRUCK'
  | 'FUEL TRUCK'
  | string;

export interface FleetCategoryItem {
  id: string;
  name: string;
  code: string;
  label: string;
  description: string;
  prefix: string;
}

export const FLEET_CATEGORIES: FleetCategoryItem[] = [
  { id: 'FLAT DECK', name: 'FLAT DECK', code: 'FD', label: 'FLAT DECK (FD)', description: 'unit dengan nomor FD...', prefix: 'FD' },
  { id: 'DUMP TRUCK', name: 'DUMP TRUCK', code: 'DT', label: 'DUMP TRUCK (DT)', description: 'unit dengan nomor DT...', prefix: 'DT' },
  { id: 'WHEEL LOADER', name: 'WHEEL LOADER', code: 'WL', label: 'WHEEL LOADER (WL)', description: 'Wheel Loader (WL)', prefix: 'WL' },
  { id: 'EXCAVATOR', name: 'EXCAVATOR', code: 'EX', label: 'EXCAVATOR (EX)', description: 'Excavator (EX)', prefix: 'EX' },
  { id: 'DOZER', name: 'DOZER', code: 'DZ', label: 'DOZER (DZ)', description: 'Dozer (DZ)', prefix: 'DZ' },
  { id: 'WATER TRUCK', name: 'WATER TRUCK', code: 'WT', label: 'WATER TRUCK (WT)', description: 'Water Truck (WT)', prefix: 'WT' },
  { id: 'MOTOR GRADER', name: 'MOTOR GRADER', code: 'MG', label: 'MOTOR GRADER (MG)', description: 'Motor Grader (MG)', prefix: 'MG' },
  { id: 'VIBRATION COMPACTOR', name: 'VIBRATION COMPACTOR', code: 'VC', label: 'VIBRATION COMPACTOR (VC)', description: 'Vibration Compactor (VC)', prefix: 'VC' },
  { id: 'REACH STACKER', name: 'REACH STACKER', code: 'RS', label: 'REACH STACKER (RS)', description: 'Reach Stacker (RS)', prefix: 'RS' },
  { id: 'FORKLIFT', name: 'FORKLIFT', code: 'FL', label: 'FORKLIFT (FL)', description: 'Forklift (FL)', prefix: 'FL' },
  { id: 'CRANE TRUCK', name: 'CRANE TRUCK', code: 'CT', label: 'CRANE TRUCK (CT)', description: 'Crane Truck (CT)', prefix: 'CT' },
  { id: 'FUEL TRUCK', name: 'FUEL TRUCK', code: 'FT', label: 'FUEL TRUCK (FT)', description: 'Fuel Truck (FT)', prefix: 'FT' },
];

export interface TimesheetRecord {
  id: string;
  date: string; // Column B: Tanggal (YYYY-MM-DD)
  shift: string; // Column C: Shift (1, 2)
  operator: string; // Column E: Nama Operator (e.g. FERI HADI WINATA)
  unit: string; // Column F: Nomor Unit (e.g. FD23001)
  activityCode?: string; // Column H: Kode Aktifitas (e.g. HAW, WAB, P5M, P2H, BREAK, USC, FUELL)
  location?: string; // Column I: Lokasi (e.g. TJB)
  startTime: string; // Column J: Jam Mulai Aktifitas (e.g. 06:10)
  endTime: string; // Column K: Jam Selesai Aktifitas (e.g. 06:20)
  totalTime: number; // Column L: Total Jam Aktifitas (e.g. 0.17, 2.90)
  startHm: number; // Column M: HM Start Aktifitas (e.g. 12979.7)
  stopHm: number; // Column N: HM Selesai Aktifitas (e.g. 12979.8)
  totalHm: number; // Column O: Total HM Setiap Aktifitas (e.g. 2.90)
  activity: string; // Column Q: Deskripsi Aktifitas (e.g. Coal Hauling, Pemeriksaan Harian)
  remark?: string; // Column R: Remark / Keterangan (e.g. MME CRS & MIP, ACCIDENT)
  category: EquipmentCategory; // Truck, HE, Support
  model?: string;
  notes?: string;
}

export interface FilterState {
  dateMode: 'range' | 'single';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  selectedSingleDate: string; // YYYY-MM-DD
  selectedCategory: string; // 'ALL' or specific
  selectedUnits: string[]; // empty = all
  selectedActivity: string; // 'ALL' or specific
  searchQuery: string;
}

export interface ParetoActivityItem {
  activity: string;
  totalHm: number;
  percentage: number;
  cumulativeHm: number;
  cumulativePercentage: number;
  rank: number;
  isVitalFew: boolean; // <= 80% cumulative
  unitCount: number;
}

export interface UnitSummaryItem {
  unit: string;
  category: EquipmentCategory;
  model: string;
  primaryOperator?: string;
  totalHm: number;
  totalTime: number;
  utilizationRate: number; // (totalHm / totalTime) * 100
  avgDailyHm: number;
  activeDaysCount: number;
  topActivity: string;
  status: 'Optimal' | 'Staging' | 'Critical' | 'Down';
}

export interface DailyMatrixRow {
  unit: string;
  category: EquipmentCategory;
  model: string;
  dailyHm: Record<string, number>; // dateString -> hm
  totalHm: number;
  avgHmPerDay: number;
  activeDays: number;
}

export interface ParseResult {
  records: TimesheetRecord[];
  sheetNameUsed: string;
  availableSheets: string[];
  totalRowsRaw: number;
  validRows: number;
  cleanedNullHmCount: number;
  dateRange: { min: string; max: string };
  categoriesDetected: string[];
  unitsDetected: string[];
  activitiesDetected: string[];
  fileName: string;
  uploadTimestamp: string;
}
