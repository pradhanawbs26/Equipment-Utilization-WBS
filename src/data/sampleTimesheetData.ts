import { TimesheetRecord } from '../types';
import { inferEquipmentCategory, inferEquipmentModel } from '../utils/excelParser';

/**
 * Realistic operational mining fleet dataset modeled directly from
 * sheet "Timeshet Mobile" (as seen in dispatch screenshot with units FD23001-FD23015)
 */
const RAW_SAMPLE_RECORDS: TimesheetRecord[] = [
  // ==========================================
  // DATE: 2026-08-01 (01-Aug-26)
  // ==========================================
  // Unit FD23001 - FERI HADI WINATA
  {
    id: 'rec-1',
    date: '2026-08-01',
    shift: '1',
    operator: 'FERI HADI WINATA',
    unit: 'FD23001',
    activityCode: 'P5M',
    location: 'TJB',
    startTime: '06:10',
    endTime: '06:20',
    totalTime: 0.17,
    startHm: 12979.7,
    stopHm: 12979.7,
    totalHm: 0.0,
    activity: 'P5M',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-2',
    date: '2026-08-01',
    shift: '1',
    operator: 'FERI HADI WINATA',
    unit: 'FD23001',
    activityCode: 'P2H',
    location: 'TJB',
    startTime: '06:20',
    endTime: '06:26',
    totalTime: 0.10,
    startHm: 12979.7,
    stopHm: 12979.8,
    totalHm: 0.10,
    activity: 'Pemeriksaan Harian',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-3',
    date: '2026-08-01',
    shift: '1',
    operator: 'FERI HADI WINATA',
    unit: 'FD23001',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '06:26',
    endTime: '06:42',
    totalTime: 0.27,
    startHm: 12979.8,
    stopHm: 12979.8,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-4',
    date: '2026-08-01',
    shift: '1',
    operator: 'FERI HADI WINATA',
    unit: 'FD23001',
    activityCode: 'HAW',
    location: 'TJB',
    startTime: '06:42',
    endTime: '09:36',
    totalTime: 2.90,
    startHm: 12979.8,
    stopHm: 12982.7,
    totalHm: 2.90,
    activity: 'Coal Hauling',
    remark: 'MME CRS & MIP',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-5',
    date: '2026-08-01',
    shift: '1',
    operator: 'FERI HADI WINATA',
    unit: 'FD23001',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '09:36',
    endTime: '11:18',
    totalTime: 1.70,
    startHm: 12982.7,
    stopHm: 12982.7,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-6',
    date: '2026-08-01',
    shift: '1',
    operator: 'FERI HADI WINATA',
    unit: 'FD23001',
    activityCode: 'HAW',
    location: 'TJB',
    startTime: '11:18',
    endTime: '12:00',
    totalTime: 0.70,
    startHm: 12982.7,
    stopHm: 12983.4,
    totalHm: 0.70,
    activity: 'Coal Hauling',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-7',
    date: '2026-08-01',
    shift: '1',
    operator: 'FERI HADI WINATA',
    unit: 'FD23001',
    activityCode: 'BREAK',
    location: 'TJB',
    startTime: '12:00',
    endTime: '13:00',
    totalTime: 1.00,
    startHm: 12983.4,
    stopHm: 12983.4,
    totalHm: 0.0,
    activity: 'Rest Time',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-8',
    date: '2026-08-01',
    shift: '1',
    operator: 'FERI HADI WINATA',
    unit: 'FD23001',
    activityCode: 'HAW',
    location: 'TJB',
    startTime: '13:00',
    endTime: '14:48',
    totalTime: 1.80,
    startHm: 12983.4,
    stopHm: 12985.2,
    totalHm: 1.80,
    activity: 'Coal Hauling',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-9',
    date: '2026-08-01',
    shift: '1',
    operator: 'FERI HADI WINATA',
    unit: 'FD23001',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '14:48',
    endTime: '15:00',
    totalTime: 0.20,
    startHm: 12985.2,
    stopHm: 12985.2,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-10',
    date: '2026-08-01',
    shift: '1',
    operator: 'FERI HADI WINATA',
    unit: 'FD23001',
    activityCode: 'HAW',
    location: 'TJB',
    startTime: '15:00',
    endTime: '17:12',
    totalTime: 2.20,
    startHm: 12985.2,
    stopHm: 12987.4,
    totalHm: 2.20,
    activity: 'Coal Hauling',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-11',
    date: '2026-08-01',
    shift: '1',
    operator: 'FERI HADI WINATA',
    unit: 'FD23001',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '17:12',
    endTime: '18:10',
    totalTime: 0.97,
    startHm: 12987.4,
    stopHm: 12987.4,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },

  // Unit FD23002 - Breakdown (Accident)
  {
    id: 'rec-12',
    date: '2026-08-01',
    shift: '1',
    operator: '-',
    unit: 'FD23002',
    activityCode: 'USC',
    location: 'TJB',
    startTime: '06:10',
    endTime: '18:10',
    totalTime: 12.00,
    startHm: 8520.0,
    stopHm: 8520.0,
    totalHm: 0.0,
    activity: 'Breakdown',
    remark: 'ACCIDENT',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },

  // Unit FD23003 - Breakdown (Ganti Pivot Dump)
  {
    id: 'rec-13',
    date: '2026-08-01',
    shift: '1',
    operator: '-',
    unit: 'FD23003',
    activityCode: 'USC',
    location: 'TJB',
    startTime: '06:10',
    endTime: '18:10',
    totalTime: 12.00,
    startHm: 9410.0,
    stopHm: 9410.0,
    totalHm: 0.0,
    activity: 'Breakdown',
    remark: 'GANTI PIVOT DUMP',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },

  // Unit FD23004 - DODI HARYADI
  {
    id: 'rec-14',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'P5M',
    location: 'TJB',
    startTime: '06:10',
    endTime: '06:20',
    totalTime: 0.17,
    startHm: 12732.0,
    stopHm: 12732.0,
    totalHm: 0.0,
    activity: 'P5M',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-15',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'P2H',
    location: 'TJB',
    startTime: '06:20',
    endTime: '06:26',
    totalTime: 0.10,
    startHm: 12732.0,
    stopHm: 12732.1,
    totalHm: 0.10,
    activity: 'Pemeriksaan Harian',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-16',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '06:26',
    endTime: '07:19',
    totalTime: 0.88,
    startHm: 12732.1,
    stopHm: 12732.1,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-17',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'USC',
    location: 'TJB',
    startTime: '07:19',
    endTime: '08:34',
    totalTime: 1.25,
    startHm: 12732.1,
    stopHm: 12732.1,
    totalHm: 0.0,
    activity: 'Breakdown',
    remark: 'PECAH BAN POS 4',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-18',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '08:34',
    endTime: '08:36',
    totalTime: 0.03,
    startHm: 12732.1,
    stopHm: 12732.1,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-19',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'HAW',
    location: 'TJB',
    startTime: '08:36',
    endTime: '09:54',
    totalTime: 1.30,
    startHm: 12732.1,
    stopHm: 12733.4,
    totalHm: 1.30,
    activity: 'Coal Hauling',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-20',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '09:54',
    endTime: '11:18',
    totalTime: 1.40,
    startHm: 12733.4,
    stopHm: 12733.4,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-21',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'FUELL',
    location: 'TJB',
    startTime: '11:18',
    endTime: '11:24',
    totalTime: 0.10,
    startHm: 12733.4,
    stopHm: 12733.5,
    totalHm: 0.10,
    activity: 'Refueling',
    remark: '128 LITER',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-22',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'HAW',
    location: 'TJB',
    startTime: '11:24',
    endTime: '12:00',
    totalTime: 0.60,
    startHm: 12733.5,
    stopHm: 12734.1,
    totalHm: 0.60,
    activity: 'Coal Hauling',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-23',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'BREAK',
    location: 'TJB',
    startTime: '12:00',
    endTime: '13:00',
    totalTime: 1.00,
    startHm: 12734.1,
    stopHm: 12734.1,
    totalHm: 0.0,
    activity: 'Rest Time',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-24',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'HAW',
    location: 'TJB',
    startTime: '13:00',
    endTime: '14:30',
    totalTime: 1.50,
    startHm: 12734.1,
    stopHm: 12735.6,
    totalHm: 1.50,
    activity: 'Coal Hauling',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-25',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '14:30',
    endTime: '15:12',
    totalTime: 0.70,
    startHm: 12735.6,
    stopHm: 12735.6,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-26',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'HAW',
    location: 'TJB',
    startTime: '15:12',
    endTime: '17:00',
    totalTime: 1.80,
    startHm: 12735.6,
    stopHm: 12737.4,
    totalHm: 1.80,
    activity: 'Coal Hauling',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-27',
    date: '2026-08-01',
    shift: '1',
    operator: 'DODI HARYADI',
    unit: 'FD23004',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '17:00',
    endTime: '18:10',
    totalTime: 1.17,
    startHm: 12737.4,
    stopHm: 12737.4,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },

  // Unit FD23005 - ANDIKA SETIAWAN
  {
    id: 'rec-28',
    date: '2026-08-01',
    shift: '1',
    operator: 'ANDIKA SETIAWAN',
    unit: 'FD23005',
    activityCode: 'P5M',
    location: 'TJB',
    startTime: '06:10',
    endTime: '06:20',
    totalTime: 0.17,
    startHm: 11049.3,
    stopHm: 11049.3,
    totalHm: 0.0,
    activity: 'P5M',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-29',
    date: '2026-08-01',
    shift: '1',
    operator: 'ANDIKA SETIAWAN',
    unit: 'FD23005',
    activityCode: 'P2H',
    location: 'TJB',
    startTime: '06:20',
    endTime: '06:26',
    totalTime: 0.10,
    startHm: 11049.3,
    stopHm: 11049.4,
    totalHm: 0.10,
    activity: 'Pemeriksaan Harian',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-30',
    date: '2026-08-01',
    shift: '1',
    operator: 'ANDIKA SETIAWAN',
    unit: 'FD23005',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '06:26',
    endTime: '06:42',
    totalTime: 0.27,
    startHm: 11049.4,
    stopHm: 11049.4,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-31',
    date: '2026-08-01',
    shift: '1',
    operator: 'ANDIKA SETIAWAN',
    unit: 'FD23005',
    activityCode: 'HAW',
    location: 'TJB',
    startTime: '06:42',
    endTime: '09:18',
    totalTime: 2.60,
    startHm: 11049.4,
    stopHm: 11052.0,
    totalHm: 2.60,
    activity: 'Coal Hauling',
    remark: 'MME CRS & MIP',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-32',
    date: '2026-08-01',
    shift: '1',
    operator: 'ANDIKA SETIAWAN',
    unit: 'FD23005',
    activityCode: 'FUELL',
    location: 'TJB',
    startTime: '09:18',
    endTime: '09:24',
    totalTime: 0.10,
    startHm: 11052.0,
    stopHm: 11052.1,
    totalHm: 0.10,
    activity: 'Refueling',
    remark: '145 LITER',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-33',
    date: '2026-08-01',
    shift: '1',
    operator: 'ANDIKA SETIAWAN',
    unit: 'FD23005',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '09:24',
    endTime: '11:18',
    totalTime: 1.90,
    startHm: 11052.1,
    stopHm: 11052.1,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-34',
    date: '2026-08-01',
    shift: '1',
    operator: 'ANDIKA SETIAWAN',
    unit: 'FD23005',
    activityCode: 'HAW',
    location: 'TJB',
    startTime: '11:18',
    endTime: '12:00',
    totalTime: 0.70,
    startHm: 11052.1,
    stopHm: 11052.8,
    totalHm: 0.70,
    activity: 'Coal Hauling',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-35',
    date: '2026-08-01',
    shift: '1',
    operator: 'ANDIKA SETIAWAN',
    unit: 'FD23005',
    activityCode: 'BREAK',
    location: 'TJB',
    startTime: '12:00',
    endTime: '13:00',
    totalTime: 1.00,
    startHm: 11052.8,
    stopHm: 11052.8,
    totalHm: 0.0,
    activity: 'Rest Time',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-36',
    date: '2026-08-01',
    shift: '1',
    operator: 'ANDIKA SETIAWAN',
    unit: 'FD23005',
    activityCode: 'HAW',
    location: 'TJB',
    startTime: '13:00',
    endTime: '15:20',
    totalTime: 2.33,
    startHm: 11052.8,
    stopHm: 11055.1,
    totalHm: 2.30,
    activity: 'Coal Hauling',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },
  {
    id: 'rec-37',
    date: '2026-08-01',
    shift: '1',
    operator: 'ANDIKA SETIAWAN',
    unit: 'FD23005',
    activityCode: 'WAB',
    location: 'TJB',
    startTime: '15:20',
    endTime: '18:10',
    totalTime: 2.83,
    startHm: 11055.1,
    stopHm: 11055.1,
    totalHm: 0.0,
    activity: 'Waiting Bongkaran',
    remark: '',
    category: 'Truck',
    model: 'Dump Truck FD (Coal Hauler)'
  },

  // Multi-day and Multi-unit Fleet data (01-Aug to 14-Aug) for realistic fleet trends across all 12 categories
  ...generateFleetRecordsForDates([
    '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
    '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09',
    '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'
  ])
];

/**
 * Standardized initial records mapped to the 12 specific equipment categories
 */
export const INITIAL_SAMPLE_RECORDS: TimesheetRecord[] = RAW_SAMPLE_RECORDS.map(r => {
  const cat = inferEquipmentCategory(r.unit, r.category);
  return {
    ...r,
    category: cat,
    model: inferEquipmentModel(r.unit, cat)
  };
});

/**
 * Helper to generate consistent daily records across multiple dates
 */
function generateFleetRecordsForDates(dates: string[]): TimesheetRecord[] {
  const result: TimesheetRecord[] = [];
  const units = [
    // 1. FLAT DECK (FD...)
    { unit: 'FD23001', op: 'FERI HADI WINATA', baseHm: 12987, nominalHm: 8.5, cat: 'FLAT DECK', model: 'Flat Deck FD Hauler' },
    { unit: 'FD23002', op: 'BAMBANG SUPRIYADI', baseHm: 8520, nominalHm: 7.2, cat: 'FLAT DECK', model: 'Flat Deck FD Hauler' },
    { unit: 'FD23003', op: 'EKO WAHYUDI', baseHm: 9410, nominalHm: 7.8, cat: 'FLAT DECK', model: 'Flat Deck FD Hauler' },
    { unit: 'FD23004', op: 'DODI HARYADI', baseHm: 12737, nominalHm: 6.8, cat: 'FLAT DECK', model: 'Flat Deck FD Hauler' },
    { unit: 'FD23005', op: 'ANDIKA SETIAWAN', baseHm: 11055, nominalHm: 7.5, cat: 'FLAT DECK', model: 'Flat Deck FD Hauler' },
    { unit: 'FD23006', op: 'AHMAD FAUZI', baseHm: 13420, nominalHm: 8.9, cat: 'FLAT DECK', model: 'Flat Deck FD Hauler' },
    { unit: 'FD23007', op: 'DANANG PRASETYO', baseHm: 14100, nominalHm: 8.1, cat: 'FLAT DECK', model: 'Flat Deck FD Hauler' },
    { unit: 'FD23008', op: 'TRI WIDODO', baseHm: 10800, nominalHm: 7.9, cat: 'FLAT DECK', model: 'Flat Deck FD Hauler' },
    { unit: 'FD23009', op: 'SUHARTONO', baseHm: 11950, nominalHm: 8.3, cat: 'FLAT DECK', model: 'Flat Deck FD Hauler' },
    { unit: 'FD23010', op: 'RIZKI RAMADHAN', baseHm: 9800, nominalHm: 7.0, cat: 'FLAT DECK', model: 'Flat Deck FD Hauler' },

    // 2. DUMP TRUCK (DT...)
    { unit: 'DT23001', op: 'WAHYU PRATAMA', baseHm: 16200, nominalHm: 9.1, cat: 'DUMP TRUCK', model: 'CAT 777D Dump Truck' },
    { unit: 'DT23002', op: 'SIGIT PURNOMO', baseHm: 15400, nominalHm: 8.7, cat: 'DUMP TRUCK', model: 'CAT 777D Dump Truck' },

    // 3. WHEEL LOADER (WL)
    { unit: 'WL23001', op: 'HENDRA KURNIAWAN', baseHm: 8900, nominalHm: 9.3, cat: 'WHEEL LOADER', model: 'CAT 992K Wheel Loader' },

    // 4. EXCAVATOR (EX)
    { unit: 'EX23001', op: 'JOKO SUSILO', baseHm: 7500, nominalHm: 10.5, cat: 'EXCAVATOR', model: 'Komatsu PC2000-8 Excavator' },
    { unit: 'EX23002', op: 'AGUS SANTOSO', baseHm: 6800, nominalHm: 9.8, cat: 'EXCAVATOR', model: 'Hitachi EX1900 Excavator' },

    // 5. DOZER (DZ)
    { unit: 'DZ23001', op: 'TEGUH WIDODO', baseHm: 9100, nominalHm: 8.6, cat: 'DOZER', model: 'Komatsu D375A Bulldozer' },

    // 6. WATER TRUCK (WT)
    { unit: 'WT23001', op: 'SURYA KENCANA', baseHm: 4900, nominalHm: 6.5, cat: 'WATER TRUCK', model: 'Scania P410 Water Truck' },

    // 7. MOTOR GRADER (MG)
    { unit: 'MG23001', op: 'RUDI HERMAWAN', baseHm: 5400, nominalHm: 8.2, cat: 'MOTOR GRADER', model: 'CAT 16M Motor Grader' },

    // 8. VIBRATION COMPACTOR (VC)
    { unit: 'VC23001', op: 'ARIS SETIAWAN', baseHm: 3800, nominalHm: 7.1, cat: 'VIBRATION COMPACTOR', model: 'Bomag BW211D-40 Compactor' },

    // 9. REACH STACKER (RS)
    { unit: 'RS23001', op: 'BAYU ADITYA', baseHm: 4200, nominalHm: 6.2, cat: 'REACH STACKER', model: 'Kalmar DRG450 Reach Stacker' },

    // 10. FORKLIFT (FL)
    { unit: 'FL23001', op: 'INDRA LESMANA', baseHm: 2800, nominalHm: 5.5, cat: 'FORKLIFT', model: 'Toyota 7-Series 5T Forklift' },

    // 11. CRANE TRUCK (CT)
    { unit: 'CT23001', op: 'EDI PRAYITNO', baseHm: 3400, nominalHm: 5.8, cat: 'CRANE TRUCK', model: 'Tadano GT-550E Crane Truck' },

    // 12. FUEL TRUCK (FT)
    { unit: 'FT23001', op: 'DENI KURNIA', baseHm: 6100, nominalHm: 7.4, cat: 'FUEL TRUCK', model: 'Hino 500 Fuel Service Truck' },
  ];

  let idCounter = 100;

  dates.forEach((date) => {
    const isRainDay = date.endsWith('-08'); // 08-Aug has rain delay

    units.forEach((u) => {
      // Avoid duplicate logs for units already explicitly defined in RAW_SAMPLE_RECORDS for 2026-08-01
      if (date === '2026-08-01' && ['FD23001', 'FD23002', 'FD23003', 'FD23004', 'FD23005'].includes(u.unit)) {
        return;
      }

      idCounter++;
      const rainFactor = isRainDay ? 0.65 : 1.0;
      // Unit FD23002 was accident down on Aug 01-02
      if (u.unit === 'FD23002' && date === '2026-08-02') {
        result.push({
          id: `gen-${idCounter}-1`,
          date,
          shift: '1',
          operator: '-',
          unit: u.unit,
          activityCode: 'USC',
          location: 'TJB',
          startTime: '06:10',
          endTime: '18:10',
          totalTime: 12.0,
          startHm: u.baseHm,
          stopHm: u.baseHm,
          totalHm: 0.0,
          activity: 'Breakdown',
          remark: 'REPAIR CHASSIS AFTER ACCIDENT',
          category: u.cat as any,
          model: u.model
        });
        return;
      }

      // Unit FD23003 was pivot dump repair down on Aug 02
      if (u.unit === 'FD23003' && date === '2026-08-02') {
        result.push({
          id: `gen-${idCounter}-1`,
          date,
          shift: '1',
          operator: '-',
          unit: u.unit,
          activityCode: 'USC',
          location: 'TJB',
          startTime: '06:10',
          endTime: '18:10',
          totalTime: 12.0,
          startHm: u.baseHm,
          stopHm: u.baseHm,
          totalHm: 0.0,
          activity: 'Breakdown',
          remark: 'GANTI PIVOT DUMP REPLACEMENT',
          category: u.cat as any,
          model: u.model
        });
        return;
      }

      const haulingHm = Math.round(u.nominalHm * rainFactor * 10) / 10;
      const haulingTime = Math.round((haulingHm + 1.2) * 10) / 10;
      const waitingTime = Math.round((12.0 - haulingTime - 1.2) * 10) / 10;

      // Leg 1: P2H / P5M
      result.push({
        id: `gen-${idCounter}-p2h`,
        date,
        shift: '1',
        operator: u.op,
        unit: u.unit,
        activityCode: 'P2H',
        location: 'TJB',
        startTime: '06:10',
        endTime: '06:30',
        totalTime: 0.33,
        startHm: u.baseHm,
        stopHm: u.baseHm + 0.1,
        totalHm: 0.1,
        activity: 'Pemeriksaan Harian',
        remark: 'P5M & P2H Clear',
        category: u.cat as any,
        model: u.model
      });

      // Leg 2: Main Production
      let primaryActivity = 'Coal Hauling';
      let actCode = 'HAW';
      if (u.cat === 'EXCAVATOR') {
        primaryActivity = 'Coal Digging & Loading';
        actCode = 'DIG';
      } else if (u.cat === 'WHEEL LOADER') {
        primaryActivity = 'Rehandling & Stockpile Loading';
        actCode = 'LOD';
      } else if (u.cat === 'DOZER') {
        primaryActivity = 'Ripping & Dozing Pit Floor';
        actCode = 'DOZ';
      } else if (u.cat === 'WATER TRUCK') {
        primaryActivity = 'Haul Road Dust Suppression';
        actCode = 'WTR';
      } else if (u.cat === 'MOTOR GRADER') {
        primaryActivity = 'Haul Road Maintenance';
        actCode = 'GRD';
      } else if (u.cat === 'VIBRATION COMPACTOR') {
        primaryActivity = 'Road Compaction & Leveling';
        actCode = 'CMP';
      } else if (u.cat === 'REACH STACKER') {
        primaryActivity = 'Container & Cargo Handling';
        actCode = 'STK';
      } else if (u.cat === 'FORKLIFT') {
        primaryActivity = 'Warehouse Logistics Support';
        actCode = 'FLT';
      } else if (u.cat === 'CRANE TRUCK') {
        primaryActivity = 'Heavy Component Lifting';
        actCode = 'CRN';
      } else if (u.cat === 'FUEL TRUCK') {
        primaryActivity = 'In-Pit Fleet Refueling';
        actCode = 'FUL';
      }

      result.push({
        id: `gen-${idCounter}-prod`,
        date,
        shift: '1',
        operator: u.op,
        unit: u.unit,
        activityCode: actCode,
        location: 'TJB',
        startTime: '06:30',
        endTime: '15:00',
        totalTime: haulingTime,
        startHm: u.baseHm + 0.1,
        stopHm: u.baseHm + 0.1 + haulingHm,
        totalHm: haulingHm,
        activity: primaryActivity,
        remark: 'Operational Dispatch',
        category: u.cat as any,
        model: u.model
      });

      // Leg 3: Standby / Waiting Bongkaran
      result.push({
        id: `gen-${idCounter}-wait`,
        date,
        shift: '1',
        operator: u.op,
        unit: u.unit,
        activityCode: 'WAB',
        location: 'TJB',
        startTime: '15:00',
        endTime: '18:10',
        totalTime: Math.max(0.5, waitingTime),
        startHm: u.baseHm + 0.1 + haulingHm,
        stopHm: u.baseHm + 0.1 + haulingHm,
        totalHm: 0.0,
        activity: 'Waiting Bongkaran',
        remark: isRainDay ? 'SLIPPERY ROAD & RAIN DELAY' : '',
        category: u.cat as any,
        model: u.model
      });

      u.baseHm += haulingHm + 0.1;
    });
  });

  return result;
}
