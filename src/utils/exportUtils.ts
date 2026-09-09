import * as XLSX from 'xlsx';
import { ParetoActivityItem, UnitSummaryItem, DailyMatrixRow, TimesheetRecord } from '../types';

/**
 * Trigger browser file download
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export data array to CSV string
 */
function arrayToCSV(rows: (string | number)[][]): string {
  return rows.map(r => r.map(field => {
    const stringVal = String(field ?? '');
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  }).join(',')).join('\r\n');
}

/**
 * Export Pareto items to CSV or Excel
 */
export function exportParetoData(items: ParetoActivityItem[], format: 'csv' | 'xlsx', dateRangeText = '') {
  const headers = ['Rank', 'Activity Description', 'Total HM (Hours)', 'Share of Total (%)', 'Cumulative HM (Hours)', 'Cumulative Share (%)', 'Active Units', 'Pareto Classification'];
  const dataRows = items.map(item => [
    item.rank,
    item.activity,
    item.totalHm.toFixed(1),
    item.percentage.toFixed(1) + '%',
    item.cumulativeHm.toFixed(1),
    item.cumulativePercentage.toFixed(1) + '%',
    item.unitCount,
    item.isVitalFew ? 'Vital Few (Top 80%)' : 'Useful Many',
  ]);

  const filename = `Pareto_Activity_Analysis_${dateRangeText || 'Export'}.${format}`;

  if (format === 'csv') {
    const csvContent = arrayToCSV([headers, ...dataRows]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  } else {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Pareto Analysis');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, filename);
  }
}

/**
 * Export Unit HM summary to CSV or Excel
 */
export function exportUnitBreakdown(units: UnitSummaryItem[], format: 'csv' | 'xlsx', dateRangeText = '') {
  const headers = ['Unit ID', 'Operator', 'Equipment Model', 'Category', 'Total HM (Hours)', 'Total Available Time (Hours)', 'Utilization Rate (%)', 'Daily Average HM', 'Active Days Count', 'Top Activity', 'Fleet Status'];
  const dataRows = units.map(u => [
    u.unit,
    u.primaryOperator || '-',
    u.model,
    u.category,
    u.totalHm.toFixed(1),
    u.totalTime.toFixed(1),
    u.utilizationRate.toFixed(1) + '%',
    u.avgDailyHm.toFixed(1),
    u.activeDaysCount,
    u.topActivity,
    u.status,
  ]);

  const filename = `Unit_HM_Breakdown_${dateRangeText || 'Export'}.${format}`;

  if (format === 'csv') {
    const csvContent = arrayToCSV([headers, ...dataRows]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  } else {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 26 }, { wch: 12 }, { wch: 18 }, { wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 24 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Unit HM Summary');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, filename);
  }
}

/**
 * Export Daily Matrix Pivot Grid to CSV or Excel
 */
export function exportDailyMatrix(dates: string[], matrixRows: DailyMatrixRow[], format: 'csv' | 'xlsx') {
  const headers = ['Unit ID', 'Model', 'Category', ...dates, 'Total HM', 'Avg HM/Day'];
  const dataRows = matrixRows.map(row => {
    const dateValues = dates.map(d => (row.dailyHm[d] ?? 0).toFixed(1));
    return [
      row.unit,
      row.model,
      row.category,
      ...dateValues,
      row.totalHm.toFixed(1),
      row.avgHmPerDay.toFixed(1),
    ];
  });

  const filename = `Daily_HM_Matrix_Pivot_${dates[0] || 'Start'}_to_${dates[dates.length - 1] || 'End'}.${format}`;

  if (format === 'csv') {
    const csvContent = arrayToCSV([headers, ...dataRows]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  } else {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Daily HM Matrix');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, filename);
  }
}

/**
 * Export raw ledger records with full operational columns from Timeshet Mobile
 */
export function exportRawTimesheetLedger(records: TimesheetRecord[], format: 'csv' | 'xlsx') {
  const headers = [
    'Date (B)',
    'Shift (C)',
    'Operator (E)',
    'Unit (F)',
    'Ac Code (H)',
    'Location (I)',
    'Start Operation (J)',
    'End Operation (K)',
    'Total Time (L)',
    'Start HM (M)',
    'Stop HM (N)',
    'Total HM (O)',
    'Activity Description (Q)',
    'Remark (R)',
    'Category'
  ];
  const dataRows = records.map(r => [
    r.date,
    r.shift || '1',
    r.operator || '',
    r.unit,
    r.activityCode || '',
    r.location || '',
    r.startTime || '',
    r.endTime || '',
    r.totalTime,
    r.startHm,
    r.stopHm,
    r.totalHm,
    r.activity,
    r.remark || '',
    r.category,
  ]);

  const filename = `Timeshet_Mobile_Master_Ledger_${new Date().toISOString().slice(0, 10)}.${format}`;

  if (format === 'csv') {
    const csvContent = arrayToCSV([headers, ...dataRows]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  } else {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = [
      { wch: 14 }, // Date
      { wch: 8 },  // Shift
      { wch: 22 }, // Operator
      { wch: 12 }, // Unit
      { wch: 10 }, // Ac Code
      { wch: 10 }, // Location
      { wch: 16 }, // Start
      { wch: 16 }, // End
      { wch: 14 }, // Total Time
      { wch: 14 }, // Start HM
      { wch: 14 }, // Stop HM
      { wch: 14 }, // Total HM
      { wch: 28 }, // Activity
      { wch: 24 }, // Remark
      { wch: 12 }, // Category
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Timeshet Mobile');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, filename);
  }
}
