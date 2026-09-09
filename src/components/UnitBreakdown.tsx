import React, { useState, useMemo } from 'react';
import {
  Gauge,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Wrench,
  ArrowUpDown,
  Truck,
  TrendingUp,
  Info,
  X
} from 'lucide-react';
import { UnitSummaryItem, EquipmentCategory, FLEET_CATEGORIES } from '../types';
import { exportUnitBreakdown } from '../utils/exportUtils';

interface UnitBreakdownProps {
  units: UnitSummaryItem[];
  topProducer: UnitSummaryItem | null;
  underutilizedCount: number;
  averageUtilization: number;
  totalFleetCount: number;
  dateRangeText: string;
}

export const UnitBreakdown: React.FC<UnitBreakdownProps> = ({
  units,
  topProducer,
  underutilizedCount,
  averageUtilization,
  totalFleetCount,
  dateRangeText,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'totalHm' | 'utilizationRate' | 'unit'>('totalHm');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedUnitForInspect, setSelectedUnitForInspect] = useState<UnitSummaryItem | null>(null);

  // Filter and sort units
  const filteredAndSortedUnits = useMemo(() => {
    let result = [...units];

    if (selectedCategory !== 'ALL') {
      result = result.filter(u => u.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        u => u.unit.toLowerCase().includes(q) || u.model.toLowerCase().includes(q) || u.topActivity.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [units, selectedCategory, searchTerm, sortField, sortAsc]);

  // Top 10 units for horizontal bar visualization
  const top10Units = useMemo(() => {
    return [...units].sort((a, b) => b.totalHm - a.totalHm).slice(0, 10);
  }, [units]);

  const maxTop10Hm = top10Units.length > 0 ? top10Units[0].totalHm : 1;

  // Category efficiency statistics
  const categoryStats = useMemo(() => {
    const map = new Map<string, { totalHm: number; totalTime: number; count: number }>();
    units.forEach(u => {
      const cur = map.get(u.category) || { totalHm: 0, totalTime: 0, count: 0 };
      cur.totalHm += u.totalHm;
      cur.totalTime += u.totalTime;
      cur.count += 1;
      map.set(u.category, cur);
    });

    return Array.from(map.entries()).map(([cat, d]) => ({
      category: cat,
      count: d.count,
      totalHm: Math.round(d.totalHm * 10) / 10,
      utilization: d.totalTime > 0 ? Math.round((d.totalHm / d.totalTime) * 1000) / 10 : 0,
    }));
  }, [units]);

  const toggleSort = (field: 'totalHm' | 'utilizationRate' | 'unit') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. TOP KPI STRIP */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Units Online */}
        <div className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#88929b]">
              Fleet Online Ratio
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#1c2028] border border-[#31353e] font-mono text-[10px] text-[#4edea3] rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              ACTIVE
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="font-mono font-bold text-2xl lg:text-3xl text-[#dfe2ee]">
              {units.length}
            </span>
            <span className="font-mono text-xs text-[#88929b]">
              / {totalFleetCount || units.length} UNITS
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#31353e]/60 flex items-center justify-between text-xs font-mono">
            <span className="text-[#4edea3] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {totalFleetCount > 0 ? Math.round((units.length / totalFleetCount) * 100) : 100}% Active
            </span>
            <span className="text-[#88929b]">Period: {dateRangeText}</span>
          </div>
        </div>

        {/* Card 2: Top Producer */}
        <div className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#88929b]">
              Top Producer Unit
            </span>
            <span className="font-mono text-xs text-[#ffb95f] font-bold">#1 PRODUCER</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <span className="font-mono font-bold text-xl lg:text-2xl text-[#4edea3]">
                {topProducer ? topProducer.unit : 'N/A'}
              </span>
              <span className="font-mono text-xs text-[#88929b] block truncate max-w-[130px]">
                {topProducer ? topProducer.model : ''}
              </span>
            </div>
            <div className="text-right font-mono">
              <span className="text-xl font-bold text-[#dfe2ee]">
                {topProducer ? topProducer.totalHm.toFixed(1) : '0.0'}
              </span>
              <span className="text-xs text-[#88929b] block">HM</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#31353e]/60 flex items-center justify-between text-xs font-mono">
            <span className="text-[#88929b]">Efficiency:</span>
            <span className="font-bold text-[#4edea3]">
              {topProducer ? `${topProducer.utilizationRate}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 3: Watchlist / Under-utilized */}
        <div className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#88929b]">
              Watchlist (&lt;50% Utilization)
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#ffb4ab]/10 text-[#ffb4ab] font-mono text-[10px] rounded border border-[#ffb4ab]/30">
              <AlertTriangle className="w-3 h-3" />
              ALERT
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="font-mono font-bold text-2xl lg:text-3xl text-[#ffb4ab]">
              {underutilizedCount}
            </span>
            <span className="font-mono text-xs text-[#88929b]">UNITS FLAGGED</span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#31353e]/60 flex items-center justify-between text-xs font-mono">
            <span className="text-[#bec8d2]">Low / Standby Units</span>
            <span className="text-[#ffb4ab] font-bold">Action Needed</span>
          </div>
        </div>

        {/* Card 4: Average Fleet Utilization */}
        <div className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#88929b]">
              Avg Fleet Utilization
            </span>
            <Gauge className="w-4 h-4 text-[#89ceff]" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="font-mono font-bold text-2xl lg:text-3xl text-[#89ceff]">
              {averageUtilization}%
            </span>
            <span className="font-mono text-xs text-[#88929b]">OVERALL</span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#31353e]/60 flex items-center justify-between text-xs font-mono">
            <span className="text-[#4edea3]">Benchmark: 80.0%</span>
            <span className="text-[#88929b]">{units.length} Units Logged</span>
          </div>
        </div>
      </section>

      {/* 2. ANALYTICS VISUALIZATIONS (2 EQUAL COLUMNS) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Top 10 Units by Total HM (Bar Metric) */}
        <div className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#31353e]/60">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#89ceff]" />
                <h3 className="text-sm lg:text-base font-bold text-[#dfe2ee]">
                  Top 10 Units by Total HM
                </h3>
              </div>
              <span className="font-mono text-[10px] bg-[#0f131c] px-2 py-0.5 rounded text-[#89ceff] border border-[#31353e]">
                Ranked Leaders
              </span>
            </div>

            {/* Horizontal Bar Chart List */}
            <div className="flex flex-col gap-2 pt-1">
              {top10Units.map((u, idx) => {
                const widthPercent = maxTop10Hm > 0 ? (u.totalHm / maxTop10Hm) * 100 : 0;
                let barColor = 'bg-[#4edea3]';
                let textColor = 'text-[#4edea3]';
                if (u.utilizationRate < 50 || u.totalHm === 0) {
                  barColor = 'bg-[#ffb4ab]';
                  textColor = 'text-[#ffb4ab]';
                } else if (u.utilizationRate < 75) {
                  barColor = 'bg-[#ffb95f]';
                  textColor = 'text-[#ffb95f]';
                } else if (u.utilizationRate < 85) {
                  barColor = 'bg-[#0ea5e9]';
                  textColor = 'text-[#89ceff]';
                }

                return (
                  <div
                    key={u.unit}
                    onClick={() => setSelectedUnitForInspect(u)}
                    className="flex items-center gap-2.5 p-1.5 rounded hover:bg-[#1c2028] transition-colors cursor-pointer group"
                  >
                    <span className="w-5 font-mono text-[11px] text-[#88929b] text-right">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="w-24 min-w-[96px]">
                      <span className="font-mono font-bold text-xs text-[#dfe2ee] block truncate group-hover:text-[#89ceff]">
                        {u.unit}
                      </span>
                      <span className="font-mono text-[10px] text-[#88929b] block truncate">
                        {u.model}
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="flex-1 bg-[#0f131c] h-3.5 rounded overflow-hidden relative border border-[#31353e]/40">
                      <div
                        className={`h-full ${barColor} rounded transition-all duration-300`}
                        style={{ width: `${Math.max(2, widthPercent)}%` }}
                      ></div>
                    </div>

                    <div className="w-20 text-right font-mono text-xs">
                      <span className={`font-bold ${textColor} block`}>
                        {u.totalHm.toFixed(1)}h
                      </span>
                      <span className="text-[10px] text-[#88929b] block">
                        {u.utilizationRate}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-[#31353e]/60 flex items-center justify-between text-[11px] font-mono text-[#88929b]">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#89ceff]" />
              Green &gt;85% • Cyan 80-85% • Amber 70-79% • Red &lt;50%
            </span>
            <span className="text-[#dfe2ee]">Top 10 Leaders</span>
          </div>
        </div>

        {/* Right Column: Category Fleet Efficiency & Maintenance Status */}
        <div className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#31353e]/60">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#ffb95f]" />
                <h3 className="text-sm lg:text-base font-bold text-[#dfe2ee]">
                  Fleet Category Efficiency
                </h3>
              </div>
              <span className="font-mono text-[10px] text-[#4edea3]">
                Target: 82.0%
              </span>
            </div>

            {/* Category Stack */}
            <div className="flex flex-col gap-3 my-2">
              {categoryStats.map(cat => (
                <div key={cat.category} className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-[#dfe2ee] font-semibold">
                      {cat.category} ({cat.count} Units)
                    </span>
                    <span className="text-[#4edea3] font-bold">
                      {cat.utilization}% ({cat.totalHm.toLocaleString()} HM)
                    </span>
                  </div>
                  <div className="w-full bg-[#0f131c] h-2.5 rounded-full overflow-hidden border border-[#31353e]/50">
                    <div
                      className="bg-gradient-to-r from-[#0ea5e9] to-[#4edea3] h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, cat.utilization)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Maintenance Workshop Watchlist Ticker */}
            <div className="bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/70 mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] uppercase text-[#ffb95f] flex items-center gap-1 font-bold">
                  <Wrench className="w-3.5 h-3.5" /> Maintenance Bay Status
                </span>
                <span className="font-mono text-[10px] text-[#88929b]">Telemetry Interlock</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#181c24] p-2 rounded border border-[#31353e]/60 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-[#ffb4ab] font-bold">BAY 2 • DT-319</span>
                    <span className="text-[#88929b] text-[10px]">Overhaul</span>
                  </div>
                  <div className="w-full bg-[#0f131c] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#ffb4ab] h-full w-[65%]"></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#88929b]">
                    <span>ETA: 4h 15m</span>
                    <span>Tech: Danang</span>
                  </div>
                </div>

                <div className="bg-[#181c24] p-2 rounded border border-[#31353e]/60 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-[#ffb95f] font-bold">BAY 4 • EX-209</span>
                    <span className="text-[#88929b] text-[10px]">Hydraulic 500h</span>
                  </div>
                  <div className="w-full bg-[#0f131c] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#ffb95f] h-full w-[85%]"></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#88929b]">
                    <span>ETA: 35m Signoff</span>
                    <span>Tech: Hendra</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MASTER UNIT TELEMETRY & HM LEDGER TABLE */}
      <section className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 lg:p-5 shadow-md flex flex-col gap-3">
        {/* Table Search & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#31353e]/60">
          <div>
            <h3 className="text-sm lg:text-base font-bold text-[#dfe2ee]">
              Unit Telemetry & HM Master Ledger
            </h3>
            <span className="font-mono text-xs text-[#88929b]">
              Showing {filteredAndSortedUnits.length} of {units.length} registered equipment units
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Search inside Table */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88929b]" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search unit or model..."
                className="bg-[#0f131c] text-xs font-mono text-[#dfe2ee] pl-8 pr-3 py-1.5 rounded border border-[#31353e] focus:outline-none focus:border-[#89ceff] w-44 sm:w-56"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-[#0f131c] text-xs font-mono text-[#dfe2ee] px-2.5 py-1.5 rounded border border-[#31353e] focus:outline-none focus:border-[#89ceff] cursor-pointer"
            >
              <option value="ALL">All Categories (12 Types)</option>
              {FLEET_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  [{cat.code}] {cat.name} {cat.prefix ? `(${cat.prefix})` : ''}
                </option>
              ))}
            </select>

            {/* Export Button */}
            <button
              onClick={() => exportUnitBreakdown(filteredAndSortedUnits, 'xlsx', dateRangeText)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c2028] hover:bg-[#262a33] text-[#89ceff] text-xs font-mono font-medium rounded border border-[#31353e] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Ledger (.XLSX)</span>
            </button>
          </div>
        </div>

        {/* Dense Industrial Table */}
        <div className="overflow-x-auto rounded border border-[#31353e]/70">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-[#0f131c] text-[#88929b] uppercase tracking-wider text-[11px] h-9 border-b border-[#31353e] select-none">
                <th
                  onClick={() => toggleSort('unit')}
                  className="px-3 py-2 cursor-pointer hover:text-[#dfe2ee]"
                >
                  <div className="flex items-center gap-1">
                    <span>Unit ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-2">Operator</th>
                <th className="px-3 py-2">Equipment Model</th>
                <th className="px-3 py-2">Category</th>
                <th
                  onClick={() => toggleSort('totalHm')}
                  className="px-3 py-2 text-right cursor-pointer hover:text-[#dfe2ee]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total HM</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-2 text-right">Available Time</th>
                <th
                  onClick={() => toggleSort('utilizationRate')}
                  className="px-3 py-2 text-center cursor-pointer hover:text-[#dfe2ee]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Utilization %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-2 text-right">Avg HM/Day</th>
                <th className="px-3 py-2 text-center">Active Days</th>
                <th className="px-3 py-2">Top Operational Activity</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#31353e]/60 font-mono text-xs">
              {filteredAndSortedUnits.map((u) => {
                let statusBadge = (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30">
                    OPTIMAL
                  </span>
                );
                if (u.status === 'Critical' || u.status === 'Down') {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/30">
                      {u.totalHm === 0 ? 'DOWN / PM' : 'CRITICAL'}
                    </span>
                  );
                } else if (u.status === 'Staging') {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ffb95f]/15 text-[#ffb95f] border border-[#ffb95f]/30">
                      STAGING
                    </span>
                  );
                }

                return (
                  <tr
                    key={u.unit}
                    className="hover:bg-[#262a33]/60 transition-colors group"
                  >
                    <td className="px-3 py-2.5 font-bold text-[#89ceff] group-hover:underline cursor-pointer"
                        onClick={() => setSelectedUnitForInspect(u)}>
                      {u.unit}
                    </td>
                    <td className="px-3 py-2.5 text-[#dfe2ee] font-sans font-medium text-xs truncate max-w-[140px]">
                      {u.primaryOperator || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-[#dfe2ee] font-sans">
                      {u.model}
                    </td>
                    <td className="px-3 py-2.5 text-[#bec8d2]">
                      <span className="px-2 py-0.5 rounded bg-[#1c2028] border border-[#31353e] text-[10px]">
                        {u.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-[#ffb95f]">
                      {u.totalHm.toFixed(1)} h
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#bec8d2]">
                      {u.totalTime.toFixed(1)} h
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-[#0f131c] h-2 rounded-full overflow-hidden border border-[#31353e]">
                          <div
                            className={`h-full rounded-full ${
                              u.utilizationRate >= 80
                                ? 'bg-[#4edea3]'
                                : u.utilizationRate >= 60
                                ? 'bg-[#89ceff]'
                                : u.utilizationRate >= 40
                                ? 'bg-[#ffb95f]'
                                : 'bg-[#ffb4ab]'
                            }`}
                            style={{ width: `${Math.min(100, u.utilizationRate)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-[#dfe2ee] w-12 text-right">
                          {u.utilizationRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#dfe2ee]">
                      {u.avgDailyHm.toFixed(1)} h
                    </td>
                    <td className="px-3 py-2.5 text-center text-[#bec8d2]">
                      {u.activeDaysCount} d
                    </td>
                    <td className="px-3 py-2.5 text-[#dfe2ee] truncate max-w-[150px]">
                      {u.topActivity}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {statusBadge}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => setSelectedUnitForInspect(u)}
                        className="px-2 py-1 rounded bg-[#1c2028] hover:bg-[#31353e] text-[#89ceff] hover:text-white transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredAndSortedUnits.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-6 text-[#88929b]">
                    No equipment units matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* INSPECTION MODAL */}
      {selectedUnitForInspect && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181c24] border border-[#31353e] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#31353e]">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#0ea5e9]/20 text-[#89ceff] rounded">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#dfe2ee] font-sans">
                    {selectedUnitForInspect.unit} Detail Inspection
                  </h4>
                  <span className="text-[11px] text-[#88929b]">
                    {selectedUnitForInspect.model} • {selectedUnitForInspect.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUnitForInspect(null)}
                className="text-[#88929b] hover:text-[#dfe2ee] p-1 rounded hover:bg-[#262a33]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/60">
              <div>
                <span className="text-[#88929b] text-[10px] uppercase">Total Hour Meter</span>
                <div className="text-lg font-bold text-[#ffb95f] mt-0.5">
                  {selectedUnitForInspect.totalHm.toFixed(1)} HM
                </div>
              </div>
              <div>
                <span className="text-[#88929b] text-[10px] uppercase">Utilization Rate</span>
                <div className="text-lg font-bold text-[#4edea3] mt-0.5">
                  {selectedUnitForInspect.utilizationRate}%
                </div>
              </div>
              <div>
                <span className="text-[#88929b] text-[10px] uppercase">Daily Average HM</span>
                <div className="text-sm font-bold text-[#dfe2ee] mt-0.5">
                  {selectedUnitForInspect.avgDailyHm.toFixed(1)} HM / day
                </div>
              </div>
              <div>
                <span className="text-[#88929b] text-[10px] uppercase">Operating Days</span>
                <div className="text-sm font-bold text-[#dfe2ee] mt-0.5">
                  {selectedUnitForInspect.activeDaysCount} active days
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[#88929b] text-[11px]">Primary Task Assigned:</span>
              <div className="p-2.5 bg-[#1c2028] rounded border border-[#31353e] font-sans font-semibold text-[#dfe2ee]">
                {selectedUnitForInspect.topActivity}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#31353e]">
              <button
                onClick={() => setSelectedUnitForInspect(null)}
                className="px-4 py-1.5 bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] rounded text-xs font-mono transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
