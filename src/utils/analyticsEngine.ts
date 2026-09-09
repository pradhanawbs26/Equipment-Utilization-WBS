import { TimesheetRecord, FilterState, ParetoActivityItem, UnitSummaryItem, DailyMatrixRow } from '../types';

/**
 * Filter raw timesheet records according to global filter state
 */
export function filterRecords(records: TimesheetRecord[], filters: FilterState): TimesheetRecord[] {
  return records.filter(record => {
    // 1. Date filter
    if (filters.dateMode === 'single') {
      if (filters.selectedSingleDate && record.date !== filters.selectedSingleDate) {
        return false;
      }
    } else {
      if (filters.startDate && record.date < filters.startDate) {
        return false;
      }
      if (filters.endDate && record.date > filters.endDate) {
        return false;
      }
    }

    // 2. Category filter
    if (filters.selectedCategory && filters.selectedCategory !== 'ALL') {
      if (record.category.toLowerCase() !== filters.selectedCategory.toLowerCase()) {
        return false;
      }
    }

    // 3. Unit multi-select filter
    if (filters.selectedUnits && filters.selectedUnits.length > 0) {
      if (!filters.selectedUnits.includes(record.unit)) {
        return false;
      }
    }

    // 4. Activity filter
    if (filters.selectedActivity && filters.selectedActivity !== 'ALL') {
      if (record.activity.toLowerCase() !== filters.selectedActivity.toLowerCase()) {
        return false;
      }
    }

    // 5. Search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchUnit = record.unit.toLowerCase().includes(q);
      const matchAct = record.activity.toLowerCase().includes(q);
      const matchModel = (record.model || '').toLowerCase().includes(q);
      const matchNotes = (record.notes || '').toLowerCase().includes(q);
      if (!matchUnit && !matchAct && !matchModel && !matchNotes) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Compute Pareto Activity items sorted descending with cumulative % curve up to 100%
 */
export function computeParetoAnalysis(filteredRecords: TimesheetRecord[]): {
  items: ParetoActivityItem[];
  totalHm: number;
  vitalFewCount: number;
  vitalFewHm: number;
} {
  const activityMap = new Map<string, { totalHm: number; units: Set<string> }>();

  filteredRecords.forEach(r => {
    const existing = activityMap.get(r.activity) || { totalHm: 0, units: new Set<string>() };
    existing.totalHm += r.totalHm;
    existing.units.add(r.unit);
    activityMap.set(r.activity, existing);
  });

  const totalHm = Array.from(activityMap.values()).reduce((sum, v) => sum + v.totalHm, 0);

  // Sort descending by Total HM
  const sortedActivities = Array.from(activityMap.entries())
    .map(([activity, data]) => ({
      activity,
      totalHm: Math.round(data.totalHm * 10) / 10,
      unitCount: data.units.size,
    }))
    .sort((a, b) => b.totalHm - a.totalHm);

  let cumulativeHm = 0;
  let vitalFewCount = 0;
  let vitalFewHm = 0;

  const items: ParetoActivityItem[] = sortedActivities.map((act, index) => {
    cumulativeHm += act.totalHm;
    const percentage = totalHm > 0 ? (act.totalHm / totalHm) * 100 : 0;
    const cumulativePercentage = totalHm > 0 ? Math.min(100, (cumulativeHm / totalHm) * 100) : 0;
    const isVitalFew = cumulativePercentage <= 80 || (index === 0 && cumulativePercentage > 80);

    if (isVitalFew) {
      vitalFewCount++;
      vitalFewHm += act.totalHm;
    }

    return {
      rank: index + 1,
      activity: act.activity,
      totalHm: act.totalHm,
      percentage: Math.round(percentage * 10) / 10,
      cumulativeHm: Math.round(cumulativeHm * 10) / 10,
      cumulativePercentage: Math.round(cumulativePercentage * 10) / 10,
      isVitalFew,
      unitCount: act.unitCount,
    };
  });

  return {
    items,
    totalHm: Math.round(totalHm * 10) / 10,
    vitalFewCount,
    vitalFewHm: Math.round(vitalFewHm * 10) / 10,
  };
}

/**
 * Compute Unit HM Summary & Performance
 */
export function computeUnitSummaries(filteredRecords: TimesheetRecord[]): {
  units: UnitSummaryItem[];
  topProducer: UnitSummaryItem | null;
  underutilizedCount: number;
  averageUtilization: number;
} {
  const unitMap = new Map<string, {
    category: string;
    model: string;
    totalHm: number;
    totalTime: number;
    dates: Set<string>;
    activities: Map<string, number>;
    operators: Map<string, number>;
  }>();

  filteredRecords.forEach(r => {
    const existing = unitMap.get(r.unit) || {
      category: r.category,
      model: r.model || r.category,
      totalHm: 0,
      totalTime: 0,
      dates: new Set<string>(),
      activities: new Map<string, number>(),
      operators: new Map<string, number>(),
    };
    existing.totalHm += r.totalHm;
    existing.totalTime += r.totalTime;
    existing.dates.add(r.date);
    const actHm = existing.activities.get(r.activity) || 0;
    existing.activities.set(r.activity, actHm + r.totalHm);
    if (r.operator && r.operator !== '-') {
      const opCount = existing.operators.get(r.operator) || 0;
      existing.operators.set(r.operator, opCount + 1);
    }
    unitMap.set(r.unit, existing);
  });

  let underutilizedCount = 0;
  let totalUtilizationSum = 0;

  const units: UnitSummaryItem[] = Array.from(unitMap.entries()).map(([unit, data]) => {
    const totalHm = Math.round(data.totalHm * 10) / 10;
    const totalTime = Math.round(data.totalTime * 10) / 10;
    const utilizationRate = totalTime > 0 ? Math.min(100, Math.round((totalHm / totalTime) * 1000) / 10) : 0;
    const activeDaysCount = data.dates.size;
    const avgDailyHm = activeDaysCount > 0 ? Math.round((totalHm / activeDaysCount) * 10) / 10 : 0;

    // Find top activity for this unit
    let topActivity = 'N/A';
    let maxActHm = -1;
    data.activities.forEach((hm, act) => {
      if (hm > maxActHm) {
        maxActHm = hm;
        topActivity = act;
      }
    });

    // Find primary operator
    let primaryOperator = '-';
    let maxOpCount = 0;
    data.operators.forEach((count, op) => {
      if (count > maxOpCount) {
        maxOpCount = count;
        primaryOperator = op;
      }
    });

    // Status assignment
    let status: UnitSummaryItem['status'] = 'Optimal';
    if (utilizationRate < 50 || totalHm === 0) {
      status = totalHm === 0 ? 'Down' : 'Critical';
      underutilizedCount++;
    } else if (utilizationRate < 75) {
      status = 'Staging';
    } else {
      status = 'Optimal';
    }

    totalUtilizationSum += utilizationRate;

    return {
      unit,
      category: data.category,
      model: data.model,
      primaryOperator,
      totalHm,
      totalTime,
      utilizationRate,
      avgDailyHm,
      activeDaysCount,
      topActivity,
      status,
    };
  });

  // Sort by Total HM descending
  units.sort((a, b) => b.totalHm - a.totalHm);

  const topProducer = units.length > 0 ? units[0] : null;
  const averageUtilization = units.length > 0 ? Math.round((totalUtilizationSum / units.length) * 10) / 10 : 0;

  return {
    units,
    topProducer,
    underutilizedCount,
    averageUtilization,
  };
}

/**
 * Compute Daily HM Matrix (Pivot View: Rows = Units, Columns = Selected Dates)
 */
export function computeDailyMatrix(filteredRecords: TimesheetRecord[]): {
  dates: string[];
  rows: DailyMatrixRow[];
  dateTotals: Record<string, number>;
  grandTotalHm: number;
} {
  const datesSet = new Set<string>();
  const unitMap = new Map<string, {
    category: string;
    model: string;
    dailyHm: Record<string, number>;
    totalHm: number;
    activeDays: number;
  }>();

  filteredRecords.forEach(r => {
    datesSet.add(r.date);
    const existing = unitMap.get(r.unit) || {
      category: r.category,
      model: r.model || r.category,
      dailyHm: {},
      totalHm: 0,
      activeDays: 0,
    };

    const currentDayHm = existing.dailyHm[r.date] || 0;
    existing.dailyHm[r.date] = Math.round((currentDayHm + r.totalHm) * 10) / 10;
    existing.totalHm += r.totalHm;
    unitMap.set(r.unit, existing);
  });

  const sortedDates = Array.from(datesSet).sort();
  const dateTotals: Record<string, number> = {};
  sortedDates.forEach(d => { dateTotals[d] = 0; });
  let grandTotalHm = 0;

  const rows: DailyMatrixRow[] = Array.from(unitMap.entries()).map(([unit, data]) => {
    const totalHm = Math.round(data.totalHm * 10) / 10;
    grandTotalHm += totalHm;

    let activeDays = 0;
    sortedDates.forEach(d => {
      const val = data.dailyHm[d] || 0;
      dateTotals[d] = Math.round(((dateTotals[d] || 0) + val) * 10) / 10;
      if (val > 0) activeDays++;
    });

    const avgHmPerDay = sortedDates.length > 0 ? Math.round((totalHm / sortedDates.length) * 10) / 10 : 0;

    return {
      unit,
      category: data.category,
      model: data.model,
      dailyHm: data.dailyHm,
      totalHm,
      avgHmPerDay,
      activeDays,
    };
  });

  // Sort rows by Total HM descending
  rows.sort((a, b) => b.totalHm - a.totalHm);

  return {
    dates: sortedDates,
    rows,
    dateTotals,
    grandTotalHm: Math.round(grandTotalHm * 10) / 10,
  };
}
