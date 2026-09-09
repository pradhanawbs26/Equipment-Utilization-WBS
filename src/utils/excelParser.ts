import * as XLSX from 'xlsx';
import { TimesheetRecord, ParseResult, EquipmentCategory } from '../types';

/**
 * Month name lookup table including English and Indonesian abbreviations
 */
const MONTH_MAP: Record<string, string> = {
  jan: '01', januari: '01',
  feb: '02', februari: '02',
  mar: '03', maret: '03',
  apr: '04', april: '04',
  may: '05', mei: '05',
  jun: '06', juni: '06',
  jul: '07', juli: '07',
  aug: '08', agu: '08', agust: '08', agustus: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', okt: '10', oktober: '10',
  nov: '11', nop: '11', november: '11',
  dec: '12', des: '12', desember: '12',
};

/**
 * Converts Excel serial date or date string (e.g. 01-Aug-26, 01/08/2026) to YYYY-MM-DD
 */
export function formatExcelDate(rawDate: any): string {
  if (!rawDate) return new Date().toISOString().slice(0, 10);

  // If already Date object
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    const y = rawDate.getFullYear();
    const m = String(rawDate.getMonth() + 1).padStart(2, '0');
    const d = String(rawDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If string
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (!trimmed) return new Date().toISOString().slice(0, 10);

    // YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // Pattern like "01-Aug-26" or "01-Aug-2026" or "01 Aug 2026"
    const textDateMatch = trimmed.match(/^(\d{1,2})[-/\s]([A-Za-z]+)[-/\s](\d{2,4})$/);
    if (textDateMatch) {
      const day = textDateMatch[1].padStart(2, '0');
      const monthStr = textDateMatch[2].toLowerCase();
      const month = MONTH_MAP[monthStr] || '08';
      let rawYear = textDateMatch[3];
      if (rawYear.length === 2) {
        const yrNum = parseInt(rawYear, 10);
        rawYear = String(yrNum < 70 ? 2000 + yrNum : 1900 + yrNum);
      }
      return `${rawYear}-${month}-${day}`;
    }

    // Pattern like DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      let rawYear = dmyMatch[3];
      if (rawYear.length === 2) {
        const yrNum = parseInt(rawYear, 10);
        rawYear = String(yrNum < 70 ? 2000 + yrNum : 1900 + yrNum);
      }
      return `${rawYear}-${month}-${day}`;
    }

    // Fallback standard parse
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Excel serial number (e.g. 46235 for Aug 2026)
  if (typeof rawDate === 'number') {
    const utcDays = Math.floor(rawDate - 25569);
    const utcValue = utcDays * 86400;
    const dateObj = new Date(utcValue * 1000);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Normalizes numeric values, converting null, undefined, strings, NaN, "#REF!" to numeric float
 * Specifically handles Indonesian comma decimal formats (e.g. "0,17" -> 0.17, "12979,7" -> 12979.7)
 */
export function cleanNumeric(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;

  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? fallback : Math.max(0, val);
  }

  if (typeof val === 'string') {
    let s = val.trim();
    if (!s || s.startsWith('#') || s === '-') return fallback;

    // Check for comma decimal with dot thousand (e.g. "12.979,7")
    if (s.includes('.') && s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      // Single comma as decimal separator (e.g. "0,17", "12979,7")
      s = s.replace(',', '.');
    }

    const parsed = parseFloat(s);
    return isNaN(parsed) || !isFinite(parsed) ? fallback : Math.max(0, parsed);
  }

  return fallback;
}

/**
 * Format time to HH:mm string (e.g. "06:10")
 */
export function formatExcelTime(val: any, fallback = '00:00'): string {
  if (val === null || val === undefined || val === '') return fallback;

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const parts = trimmed.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return trimmed;
  }

  if (typeof val === 'number') {
    // Excel time as fraction of 24h day (e.g. 0.25694 -> 06:10)
    const totalMinutes = Math.round(val * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  if (val instanceof Date) {
    return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`;
  }

  return fallback;
}

/**
 * Infer equipment model from Unit ID or Category
 */
export function inferEquipmentModel(unitId: string, category: string): string {
  const u = (unitId || '').trim().toUpperCase();
  if (u.startsWith('FD')) return 'Flat Deck FD Hauler';
  if (u.startsWith('DT') || u.startsWith('HD')) return 'CAT 777D Dump Truck';
  if (u.startsWith('WL')) return 'CAT 992K Wheel Loader';
  if (u.startsWith('EX') || u.startsWith('PC')) return 'Komatsu PC2000-8 Excavator';
  if (u.startsWith('DZ') || (u.startsWith('D') && /^[0-9]/.test(u.slice(1)))) return 'Komatsu D375A Bulldozer';
  if (u.startsWith('WT')) return 'Scania P410 Water Truck';
  if (u.startsWith('MG') || u.startsWith('SV')) return 'CAT 16M Motor Grader';
  if (u.startsWith('VC') || u.startsWith('CP')) return 'Bomag BW211D-40 Compactor';
  if (u.startsWith('RS')) return 'Kalmar DRG450 Reach Stacker';
  if (u.startsWith('FL')) return 'Toyota 7-Series 5T Forklift';
  if (u.startsWith('CT') || u.startsWith('CR')) return 'Tadano GT-550E Crane Truck';
  if (u.startsWith('FT') || u.startsWith('FB')) return 'Hino 500 Fuel Service Truck';

  // Fallback by Category
  switch (category) {
    case 'FLAT DECK': return 'Flat Deck FD Hauler';
    case 'DUMP TRUCK': return 'CAT 777D Dump Truck';
    case 'WHEEL LOADER': return 'CAT 992K Wheel Loader';
    case 'EXCAVATOR': return 'Komatsu PC2000-8 Excavator';
    case 'DOZER': return 'Komatsu D375A Bulldozer';
    case 'WATER TRUCK': return 'Scania P410 Water Truck';
    case 'MOTOR GRADER': return 'CAT 16M Motor Grader';
    case 'VIBRATION COMPACTOR': return 'Bomag BW211D-40 Compactor';
    case 'REACH STACKER': return 'Kalmar DRG450 Reach Stacker';
    case 'FORKLIFT': return 'Toyota 7-Series Forklift';
    case 'CRANE TRUCK': return 'Tadano GT-550E Crane Truck';
    case 'FUEL TRUCK': return 'Hino 500 Fuel Service';
    default: return 'Operational Fleet Unit';
  }
}

/**
 * Detect equipment category based on Unit ID prefix or provided category name:
 * 1. FLAT DECK (FD...)
 * 2. DUMP TRUCK (DT...)
 * 3. WHEEL LOADER (WL)
 * 4. EXCAVATOR (EX)
 * 5. DOZER (DZ)
 * 6. WATER TRUCK (WT)
 * 7. MOTOR GRADER (MG)
 * 8. VIBRATION COMPACTOR (VC)
 * 9. REACH STACKER (RS)
 * 10. FORKLIFT (FL)
 * 11. CRANE TRUCK (CT)
 * 12. FUEL TRUCK (FT)
 */
export function inferEquipmentCategory(unitId: string, providedCategory?: string): EquipmentCategory {
  const u = (unitId || '').trim().toUpperCase();
  const p = (providedCategory || '').trim().toUpperCase();

  // 1. Provided Category matching
  if (p) {
    if (p.includes('FLAT') || p === 'FD') return 'FLAT DECK';
    if (p.includes('DUMP') || p === 'DT' || p.includes('OHT')) return 'DUMP TRUCK';
    if (p.includes('LOADER') || p === 'WL') return 'WHEEL LOADER';
    if (p.includes('EXCAV') || p.includes('SHOVEL') || p === 'EX' || p === 'PC') return 'EXCAVATOR';
    if (p.includes('DOZER') || p.includes('BULLDOZER') || p === 'DZ') return 'DOZER';
    if (p.includes('WATER') || p === 'WT') return 'WATER TRUCK';
    if (p.includes('GRADER') || p === 'MG') return 'MOTOR GRADER';
    if (p.includes('COMPACTOR') || p.includes('VIBRO') || p === 'VC') return 'VIBRATION COMPACTOR';
    if (p.includes('STACKER') || p === 'RS') return 'REACH STACKER';
    if (p.includes('FORKLIFT') || p === 'FL') return 'FORKLIFT';
    if (p.includes('CRANE') || p === 'CT') return 'CRANE TRUCK';
    if (p.includes('FUEL') || p === 'FT' || p === 'FB') return 'FUEL TRUCK';
  }

  // 2. Unit ID Prefix matching
  if (u.startsWith('FD')) return 'FLAT DECK';
  if (u.startsWith('DT') || u.startsWith('HD') || u.startsWith('TR')) return 'DUMP TRUCK';
  if (u.startsWith('WL')) return 'WHEEL LOADER';
  if (u.startsWith('EX') || u.startsWith('PC')) return 'EXCAVATOR';
  if (u.startsWith('DZ') || (u.startsWith('D') && /^[0-9]/.test(u.slice(1)))) return 'DOZER';
  if (u.startsWith('WT')) return 'WATER TRUCK';
  if (u.startsWith('MG') || u.startsWith('SV')) return 'MOTOR GRADER';
  if (u.startsWith('VC') || u.startsWith('CP')) return 'VIBRATION COMPACTOR';
  if (u.startsWith('RS')) return 'REACH STACKER';
  if (u.startsWith('FL')) return 'FORKLIFT';
  if (u.startsWith('CT') || u.startsWith('CR')) return 'CRANE TRUCK';
  if (u.startsWith('FT') || u.startsWith('FB')) return 'FUEL TRUCK';

  return 'FLAT DECK';
}

/**
 * Parses an Excel file buffer or ArrayBuffer according to the user's exact specification:
 * Sheet: "Timeshet Mobile"
 * Column B (index 1) : Tanggal (Date)
 * Column C (index 2) : Shift
 * Column E (index 4) : Nama Operator
 * Column F (index 5) : Nomor Unit
 * Column H (index 7) : Kode Aktifitas (optional code, e.g. HAW, WAB, P5M)
 * Column I (index 8) : Lokasi (optional location, e.g. TJB)
 * Column J (index 9) : Jam Mulai Aktifitas (Start Time)
 * Column K (index 10): Jam Selesai Aktifitas (End Time)
 * Column L (index 11): Total Jam Aktifitas (Total Time)
 * Column M (index 12): HM Start Aktifitas
 * Column N (index 13): HM Selesai Aktifitas
 * Column O (index 14): Total HM Setiap Aktifitas
 * Column Q (index 16): Deskripsi Aktifitas
 * Column R (index 17): Remark (optional remark, e.g. MME CRS & MIP, ACCIDENT)
 */
export function parseTimesheetWorkbook(buffer: ArrayBuffer | Uint8Array, fileName: string): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('The uploaded Excel file has no readable worksheets.');
  }

  // 1. Target sheet detection: "Timeshet Mobile" (with fuzzy matching for typos)
  let targetSheetName = sheetNames.find(s => s.toLowerCase().trim() === 'timeshet mobile')
    || sheetNames.find(s => s.toLowerCase().trim() === 'timesheet mobile')
    || sheetNames.find(s => s.toLowerCase().includes('timeshet') || s.toLowerCase().includes('timesheet'))
    || sheetNames[0];

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error(`Could not access sheet "${targetSheetName}".`);
  }

  // Convert sheet to 2D array of rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  if (!rawRows || rawRows.length === 0) {
    throw new Error(`The sheet "${targetSheetName}" appears to be empty.`);
  }

  // 2. Identify header row index (usually row 0 or row 1)
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(rawRows.length, 6); r++) {
    const row = rawRows[r];
    if (!row) continue;
    const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
    if (
      (rowText.includes('date') || rowText.includes('tanggal')) &&
      (rowText.includes('unit') || rowText.includes('operator') || rowText.includes('hm') || rowText.includes('activity'))
    ) {
      headerRowIndex = r;
      break;
    }
  }

  // If header found, start data rows right after; otherwise start from row 1 if row 0 has strings, else row 0
  const startRowIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;

  let cleanedNullHmCount = 0;
  const records: TimesheetRecord[] = [];
  const categoriesSet = new Set<string>();
  const unitsSet = new Set<string>();
  const activitiesSet = new Set<string>();
  let minDate = '9999-99-99';
  let maxDate = '0000-00-00';

  for (let r = startRowIndex; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // Exact Column Extraction:
    // Col B (index 1) : Tanggal
    const rawDate = row[1];

    // Col C (index 2) : Shift
    const rawShift = row[2];

    // Col E (index 4) : Nama Operator
    const rawOperator = row[4];

    // Col F (index 5) : Nomor Unit
    const rawUnit = row[5];

    // Col H (index 7) : Kode Aktifitas
    const rawActivityCode = row[7];

    // Col I (index 8) : Lokasi
    const rawLocation = row[8];

    // Col J (index 9) : Jam Mulai Aktifitas
    const rawStartTime = row[9];

    // Col K (index 10): Jam Selesai Aktifitas
    const rawEndTime = row[10];

    // Col L (index 11): Total Jam Aktifitas
    const rawTotalTime = row[11];

    // Col M (index 12): HM Start Aktifitas
    const rawStartHm = row[12];

    // Col N (index 13): HM Selesai Aktifitas
    const rawStopHm = row[13];

    // Col O (index 14): Total HM Setiap Aktifitas
    const rawTotalHm = row[14];

    // Col Q (index 16): Deskripsi Aktifitas
    const rawActivity = row[16];

    // Col R (index 17): Remark
    const rawRemark = row[17];

    // Skip empty row if neither unit, date, nor activity is present
    if (!rawUnit && !rawActivity && rawTotalHm === null && !rawDate) {
      continue;
    }

    const unit = String(rawUnit || '').trim();
    if (!unit) {
      // If row has no unit, it might be a subtotal or decorative row
      continue;
    }

    const dateFormatted = formatExcelDate(rawDate);
    const shift = String(rawShift ?? '1').trim();
    const operator = String(rawOperator || '-').trim();
    const activity = String(rawActivity || (rawActivityCode ? String(rawActivityCode) : 'General Operation')).trim();
    const activityCode = rawActivityCode ? String(rawActivityCode).trim() : undefined;
    const location = rawLocation ? String(rawLocation).trim() : undefined;
    const startTime = formatExcelTime(rawStartTime, '06:00');
    const endTime = formatExcelTime(rawEndTime, '18:00');
    const remark = rawRemark ? String(rawRemark).trim() : undefined;

    // Track null/string cleanup for Total HM
    if (
      rawTotalHm === null ||
      rawTotalHm === undefined ||
      rawTotalHm === '' ||
      rawTotalHm === '#REF!' ||
      isNaN(Number(String(rawTotalHm).replace(',', '.')))
    ) {
      cleanedNullHmCount++;
    }

    const totalHm = cleanNumeric(rawTotalHm, 0);
    const totalTime = cleanNumeric(rawTotalTime, 0);
    const startHm = cleanNumeric(rawStartHm, 0);
    const stopHm = cleanNumeric(rawStopHm, 0);

    const category = inferEquipmentCategory(unit);
    const model = inferEquipmentModel(unit, category);

    if (dateFormatted < minDate) minDate = dateFormatted;
    if (dateFormatted > maxDate) maxDate = dateFormatted;

    categoriesSet.add(category);
    unitsSet.add(unit);
    activitiesSet.add(activity);

    records.push({
      id: `rec-${r}-${unit}-${dateFormatted}-${records.length}`,
      date: dateFormatted,
      shift,
      operator,
      unit,
      activityCode,
      location,
      startTime,
      endTime,
      totalTime: Math.round(totalTime * 100) / 100,
      startHm: Math.round(startHm * 10) / 10,
      stopHm: Math.round(stopHm * 10) / 10,
      totalHm: Math.round(totalHm * 100) / 100,
      activity,
      remark,
      category,
      model,
    });
  }

  if (records.length === 0) {
    throw new Error(`No valid operational timesheet records found in sheet "${targetSheetName}".`);
  }

  return {
    records,
    sheetNameUsed: targetSheetName,
    availableSheets: sheetNames,
    totalRowsRaw: rawRows.length,
    validRows: records.length,
    cleanedNullHmCount,
    dateRange: {
      min: minDate === '9999-99-99' ? new Date().toISOString().slice(0, 10) : minDate,
      max: maxDate === '0000-00-00' ? new Date().toISOString().slice(0, 10) : maxDate,
    },
    categoriesDetected: Array.from(categoriesSet),
    unitsDetected: Array.from(unitsSet).sort(),
    activitiesDetected: Array.from(activitiesSet).sort(),
    fileName,
    uploadTimestamp: new Date().toLocaleTimeString(),
  };
}

/**
 * Creates a downloadable sample Excel workbook formatted with sheet "Timeshet Mobile"
 * with the exact columns specified:
 * Col B: Date, Col C: Shift, Col E: Operator, Col F: Unit, Col J: Start, Col K: End, Col L: Total Time,
 * Col M: Start HM, Col N: Stop HM, Col O: Total HM, Col Q: Activity, Col R: Remark
 */
export function generateSampleExcelWorkbook(records: TimesheetRecord[]): Uint8Array {
  // Build 2D matrix matching exact column layout
  const rows: any[][] = [];

  // Header row
  const headerRow: any[] = [];
  headerRow[0] = ''; // Col A
  headerRow[1] = 'Date'; // Col B
  headerRow[2] = 'Shift'; // Col C
  headerRow[3] = 'Unit Dept'; // Col D
  headerRow[4] = 'Operator'; // Col E
  headerRow[5] = 'Unit'; // Col F
  headerRow[6] = 'Numb'; // Col G
  headerRow[7] = 'Ac'; // Col H
  headerRow[8] = 'Location'; // Col I
  headerRow[9] = 'Start Operation'; // Col J
  headerRow[10] = 'End Operation'; // Col K
  headerRow[11] = 'Total Time'; // Col L
  headerRow[12] = 'Start HM'; // Col M
  headerRow[13] = 'Stop HM'; // Col N
  headerRow[14] = 'Total HM'; // Col O
  headerRow[15] = 'Check'; // Col P
  headerRow[16] = 'Activity'; // Col Q
  headerRow[17] = 'Remark'; // Col R

  rows.push(headerRow);

  records.forEach((r, idx) => {
    const row: any[] = [];
    row[0] = idx + 1; // Col A
    row[1] = r.date; // Col B: Tanggal
    row[2] = r.shift || '1'; // Col C: Shift
    row[3] = 'WBS'; // Col D: Dept
    row[4] = r.operator || 'OPERATOR'; // Col E: Operator
    row[5] = r.unit; // Col F: Unit
    row[6] = (idx % 12) + 1; // Col G: Numb
    row[7] = r.activityCode || (r.activity.startsWith('Coal') ? 'HAW' : r.activity.startsWith('Waiting') ? 'WAB' : 'P5M'); // Col H: Ac
    row[8] = r.location || 'TJB'; // Col I: Location
    row[9] = r.startTime || '06:10'; // Col J: Start Operation
    row[10] = r.endTime || '09:36'; // Col K: End Operation
    row[11] = r.totalTime; // Col L: Total Time
    row[12] = r.startHm; // Col M: Start HM
    row[13] = r.stopHm; // Col N: Stop HM
    row[14] = r.totalHm; // Col O: Total HM
    row[15] = 0; // Col P: Check
    row[16] = r.activity; // Col Q: Activity
    row[17] = r.remark || ''; // Col R: Remark
    rows.push(row);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths matching the real sheet
  ws['!cols'] = [
    { wch: 6 },  // A
    { wch: 14 }, // B: Date
    { wch: 8 },  // C: Shift
    { wch: 10 }, // D: Dept
    { wch: 22 }, // E: Operator
    { wch: 12 }, // F: Unit
    { wch: 8 },  // G: Numb
    { wch: 8 },  // H: Ac
    { wch: 10 }, // I: Location
    { wch: 14 }, // J: Start Operation
    { wch: 14 }, // K: End Operation
    { wch: 12 }, // L: Total Time
    { wch: 12 }, // M: Start HM
    { wch: 12 }, // N: Stop HM
    { wch: 12 }, // O: Total HM
    { wch: 8 },  // P: Check
    { wch: 26 }, // Q: Activity
    { wch: 26 }, // R: Remark
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Timeshet Mobile');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
