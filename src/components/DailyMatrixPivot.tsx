import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Grid,
  Search,
  Download,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  CheckCircle2,
  Clock,
  Info,
  Layers,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import { DailyMatrixRow, FLEET_CATEGORIES } from '../types';
import { exportDailyMatrix } from '../utils/exportUtils';

interface DailyMatrixPivotProps {
  dates: string[];
  matrixRows: DailyMatrixRow[];
  dateTotals: Record<string, number>;
  grandTotalHm: number;
  dateRangeText: string;
}

export const DailyMatrixPivot: React.FC<DailyMatrixPivotProps> = ({
  dates,
  matrixRows,
  dateTotals,
  grandTotalHm,
  dateRangeText,
}) => {
  const [matrixSearch, setMatrixSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const catDropdownRef = useRef<HTMLDivElement>(null);

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) {
        setIsCatDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute unit counts per category in matrix
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    matrixRows.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }, [matrixRows]);

  // Filter matrix rows by unit search and category
  const filteredRows = useMemo(() => {
    return matrixRows.filter(row => {
      const matchSearch = row.unit.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        row.model.toLowerCase().includes(matrixSearch.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || row.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchSearch && matchCat;
    });
  }, [matrixRows, matrixSearch, selectedCategory]);

  const activeCategoryItem = FLEET_CATEGORIES.find(
    c => c.id.toLowerCase() === selectedCategory.toLowerCase()
  );

  const filteredCategoriesForDropdown = useMemo(() => {
    const q = catSearch.toLowerCase().trim();
    if (!q) return FLEET_CATEGORIES;
    return FLEET_CATEGORIES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [catSearch]);

  // Format date header to short form (e.g. 2025-08-01 -> 01 Aug)
  const formatHeaderDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${parts[2]} ${months[mIdx] || parts[1]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper to color-code matrix cells:
  // > 10 HM: Optimal green
  // 1 - 9.9 HM: Staging/Mid amber
  // 0 HM: Down red
  const getCellBadge = (hm: number) => {
    if (hm >= 10.0) {
      return (
        <span className="block py-1 px-1 bg-[#4edea3]/20 text-[#4edea3] font-semibold rounded text-center">
          {hm.toFixed(1)}
        </span>
      );
    }
    if (hm > 0) {
      return (
        <span className="block py-1 px-1 bg-[#ffb95f]/20 text-[#ffb95f] font-semibold rounded text-center">
          {hm.toFixed(1)}
        </span>
      );
    }
    return (
      <span className="block py-1 px-1 bg-[#ffb4ab]/25 text-[#ffb4ab] font-bold rounded text-center">
        0.0
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. TOP HEADER & CONTROLS SECTION */}
      <section className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm flex flex-col gap-3">
        {/* Row 1: Title, Interval Controls, and Action Utilities */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase text-[#89ceff] tracking-wider font-semibold">
                Pit-04 Seam Fleet Telemetry
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#3e4850]"></span>
              <span className="font-mono text-[11px] text-[#88929b]">
                Real-Time CAN-Bus Pivot Aggregation
              </span>
            </div>
            <h2 className="text-base lg:text-lg font-bold text-[#dfe2ee] mt-0.5">
              Daily Hour Meter (HM) Matrix - Pivot Heatmap
            </h2>
          </div>

          {/* Right: Legend Badges & Quick Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Heatmap Color Legend Pills */}
            <div className="flex items-center gap-1.5 bg-[#0f131c] px-3 py-1.5 rounded-lg border border-[#31353e]/70 text-xs font-mono">
              <span className="text-[#88929b] uppercase text-[10px] mr-1">Legend:</span>
              <div className="flex items-center gap-1 bg-[#4edea3]/10 px-2 py-0.5 rounded text-[#4edea3]">
                <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
                <span>&gt;10 HM (Optimal)</span>
              </div>
              <div className="flex items-center gap-1 bg-[#ffb95f]/10 px-2 py-0.5 rounded text-[#ffb95f]">
                <span className="w-2 h-2 rounded-full bg-[#ffb95f]"></span>
                <span>1–9.9 HM (Staging)</span>
              </div>
              <div className="flex items-center gap-1 bg-[#ffb4ab]/10 px-2 py-0.5 rounded text-[#ffb4ab]">
                <span className="w-2 h-2 rounded-full bg-[#ffb4ab]"></span>
                <span>0.0 HM (Down/RCA)</span>
              </div>
            </div>

            {/* Quick Unit Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88929b]" />
              <input
                type="text"
                value={matrixSearch}
                onChange={e => setMatrixSearch(e.target.value)}
                placeholder="Search Unit ID..."
                className="bg-[#0f131c] font-mono text-xs text-[#dfe2ee] pl-8 pr-3 py-1.5 rounded border border-[#31353e] focus:outline-none focus:border-[#89ceff] w-40 sm:w-48"
              />
            </div>

            {/* Export CSV Button */}
            <button
              onClick={() => exportDailyMatrix(dates, filteredRows, 'xlsx')}
              className="flex items-center gap-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-[#00344d] px-3 py-1.5 font-mono text-xs font-bold rounded transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Matrix (.XLSX)</span>
            </button>
          </div>
        </div>

        {/* Row 2: Equipment Category Dropdown Menu & Telemetry Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#31353e]/60">
          <div className="flex items-center gap-2">
            <div className="relative" ref={catDropdownRef}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono border transition-all ${
                    selectedCategory !== 'ALL'
                      ? 'bg-[#0ea5e9]/15 border-[#89ceff] text-[#dfe2ee] font-medium shadow-sm'
                      : 'bg-[#0f131c] border-[#31353e]/80 text-[#dfe2ee] hover:bg-[#1c2028] hover:border-[#89ceff]/50'
                  }`}
                  title="Filter Matrix by Equipment Category"
                >
                  <div className="flex items-center gap-1.5">
                    <Layers className={`w-3.5 h-3.5 ${selectedCategory !== 'ALL' ? 'text-[#89ceff]' : 'text-[#88929b]'}`} />
                    <span className="text-[#88929b] text-[11px]">Category:</span>
                  </div>

                  {selectedCategory === 'ALL' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#262a33] text-[#89ceff] text-[10px] font-bold">
                        ALL
                      </span>
                      <span className="font-semibold text-[#dfe2ee]">All Categories</span>
                      <span className="text-[11px] text-[#88929b]">({matrixRows.length} Units)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#89ceff] text-[#00344d] text-[10px] font-bold">
                        {activeCategoryItem ? activeCategoryItem.code : selectedCategory.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-bold text-[#89ceff]">
                        {activeCategoryItem ? activeCategoryItem.name : selectedCategory}
                      </span>
                      <span className="text-[11px] text-[#88929b]">({filteredRows.length} Units)</span>
                    </div>
                  )}

                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCatDropdownOpen ? 'rotate-180 text-[#89ceff]' : 'text-[#88929b]'}`} />
                </button>

                {selectedCategory !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    title="Reset Category to All"
                    className="p-1.5 rounded bg-[#1c2028] border border-[#31353e] text-[#88929b] hover:text-[#ffb4ab] hover:border-[#ffb4ab]/40 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Category Dropdown Popover */}
              {isCatDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 bg-[#1c2028] border border-[#31353e] rounded-lg shadow-2xl z-50 p-2 flex flex-col gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#88929b]" />
                    <input
                      type="text"
                      value={catSearch}
                      onChange={e => setCatSearch(e.target.value)}
                      placeholder="Filter category (FD, DT, Excavator, Crane...)"
                      className="w-full bg-[#0f131c] text-[#dfe2ee] pl-8 pr-7 py-1.5 rounded text-xs font-mono border border-[#31353e] focus:outline-none focus:border-[#89ceff]"
                      autoFocus
                    />
                    {catSearch && (
                      <button
                        onClick={() => setCatSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#88929b] hover:text-[#dfe2ee]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto flex flex-col gap-1 pr-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('ALL');
                        setIsCatDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded text-left transition-colors ${
                        selectedCategory === 'ALL'
                          ? 'bg-[#0ea5e9]/20 border border-[#89ceff]/50 text-[#dfe2ee]'
                          : 'hover:bg-[#262a33] text-[#bec8d2]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-6 rounded bg-[#262a33] text-[#89ceff] text-[10px] font-mono font-bold flex items-center justify-center">
                          ALL
                        </span>
                        <div>
                          <div className="text-xs font-mono font-bold text-[#dfe2ee]">
                            All Units ({matrixRows.length})
                          </div>
                          <div className="text-[10px] font-mono text-[#88929b]">
                            View all 12 equipment categories
                          </div>
                        </div>
                      </div>
                      {selectedCategory === 'ALL' && (
                        <Check className="w-4 h-4 text-[#89ceff] shrink-0" />
                      )}
                    </button>

                    <div className="border-t border-[#31353e]/60 my-1"></div>

                    {filteredCategoriesForDropdown.map(cat => {
                      const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
                      const unitCount = categoryCounts[cat.id] || 0;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setIsCatDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded text-left transition-colors ${
                            isSelected
                              ? 'bg-[#0ea5e9]/20 border border-[#89ceff]/50 text-[#dfe2ee]'
                              : 'hover:bg-[#262a33] text-[#bec8d2]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-7 h-6 rounded text-[11px] font-mono font-bold flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#89ceff] text-[#00344d]'
                                : 'bg-[#0f131c] text-[#89ceff] border border-[#31353e]'
                            }`}>
                              {cat.code}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono font-bold truncate ${isSelected ? 'text-[#89ceff]' : 'text-[#dfe2ee]'}`}>
                                  {cat.name}
                                </span>
                                {cat.prefix && (
                                  <span className="text-[10px] font-mono text-[#88929b] bg-[#0f131c] px-1 rounded border border-[#31353e]/50">
                                    {cat.prefix}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-[#88929b] truncate">
                                {cat.description}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {unitCount > 0 && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0f131c] text-[#88929b] border border-[#31353e]/60">
                                {unitCount} {unitCount === 1 ? 'unit' : 'units'}
                              </span>
                            )}
                            {isSelected && (
                              <Check className="w-4 h-4 text-[#89ceff]" />
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {filteredCategoriesForDropdown.length === 0 && (
                      <div className="py-4 text-center text-xs font-mono text-[#88929b]">
                        No categories found matching "{catSearch}"
                      </div>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-[#31353e] flex items-center justify-between text-[10px] font-mono text-[#88929b]">
                    <span>12 Categories (Mining & Auxiliary)</span>
                    <span>Daily Pivot Heatmap</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-[#88929b]">
            <div>
              <span>Fleet Matrix Total: </span>
              <strong className="text-[#ffb95f]">{grandTotalHm.toLocaleString()} HM</strong>
            </div>
            <div>
              <span>Columns: </span>
              <strong className="text-[#89ceff]">{dates.length} Dates</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PIVOT HEATMAP MATRIX CONTAINER */}
      <section className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-2 sm:p-3 shadow-md overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left font-mono text-xs select-none">
            {/* Table Header */}
            <thead>
              <tr className="bg-[#0f131c] text-[#88929b] uppercase tracking-wider text-[11px] h-9 border-b border-[#31353e]">
                <th className="py-2 px-3 sticky left-0 z-20 bg-[#0f131c] min-w-[100px] border-r border-[#31353e]">
                  Unit ID
                </th>
                <th className="py-2 px-3 sticky left-[100px] z-20 bg-[#0f131c] min-w-[140px] border-r border-[#31353e]">
                  Model & Category
                </th>
                {dates.map((d) => {
                  const isRainDip = d.endsWith('-08'); // Aug 08 has rain delay
                  return (
                    <th
                      key={d}
                      className={`py-2 px-1 text-center min-w-[58px] border-r border-[#31353e]/40 ${
                        isRainDip ? 'bg-[#1c2028] text-[#ffb95f]' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span>{formatHeaderDate(d)}</span>
                        {isRainDip && <span className="text-[9px] text-[#ffb95f]">⚡ Rain</span>}
                      </div>
                    </th>
                  );
                })}
                <th className="py-2 px-3 text-right min-w-[85px] bg-[#1c2028] font-bold text-[#dfe2ee] border-l border-[#31353e]">
                  Total HM
                </th>
                <th className="py-2 px-3 text-right min-w-[75px] bg-[#1c2028] font-bold text-[#dfe2ee]">
                  Avg/Day
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#31353e]/50 font-mono text-xs">
              {filteredRows.map((row) => {
                const isDownUnit = row.totalHm === 0 || Object.values(row.dailyHm).some(val => val === 0);
                return (
                  <tr
                    key={row.unit}
                    className="hover:bg-[#262a33]/60 transition-colors group"
                  >
                    {/* Sticky Unit ID */}
                    <td className="py-1 px-3 sticky left-0 z-10 bg-[#181c24] group-hover:bg-[#262a33] font-bold text-[#89ceff] border-r border-[#31353e]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            row.avgHmPerDay >= 10
                              ? 'bg-[#4edea3]'
                              : row.avgHmPerDay > 0
                              ? 'bg-[#ffb95f]'
                              : 'bg-[#ffb4ab]'
                          }`}
                        ></span>
                        <span>{row.unit}</span>
                      </div>
                    </td>

                    {/* Sticky Model */}
                    <td className="py-1 px-3 sticky left-[100px] z-10 bg-[#181c24] group-hover:bg-[#262a33] text-[#bec8d2] truncate max-w-[150px] border-r border-[#31353e]">
                      {row.model}
                    </td>

                    {/* Date HM Cells */}
                    {dates.map((d) => {
                      const val = row.dailyHm[d] ?? 0;
                      return (
                        <td key={d} className="p-0.5 text-center border-r border-[#31353e]/30">
                          {getCellBadge(val)}
                        </td>
                      );
                    })}

                    {/* Total HM Column */}
                    <td className="py-1 px-3 text-right bg-[#1c2028] font-bold text-[#dfe2ee] border-l border-[#31353e]">
                      {row.totalHm.toFixed(1)}
                    </td>

                    {/* Avg/Day Column */}
                    <td className="py-1 px-3 text-right bg-[#1c2028] text-[#4edea3] font-semibold">
                      {row.avgHmPerDay.toFixed(1)}
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={dates.length + 4}
                    className="text-center py-8 text-[#88929b] font-mono"
                  >
                    No unit data found for selected filter parameters.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Heatmap Summary Footer */}
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-[#1c2028] font-mono text-xs border-t-2 border-[#31353e] font-bold">
                  <td className="py-2.5 px-3 sticky left-0 z-10 bg-[#1c2028] text-[#89ceff] border-r border-[#31353e]">
                    Fleet Totals
                  </td>
                  <td className="py-2.5 px-3 sticky left-[100px] z-10 bg-[#1c2028] text-[#88929b] border-r border-[#31353e]">
                    {filteredRows.length} Units
                  </td>
                  {dates.map((d) => {
                    const colTotal = filteredRows.reduce((sum, r) => sum + (r.dailyHm[d] || 0), 0);
                    return (
                      <td
                        key={d}
                        className="py-2.5 px-1 text-center bg-[#262a33] text-[#dfe2ee] border-r border-[#31353e]/40"
                      >
                        {colTotal.toFixed(0)}h
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3 text-right bg-[#0ea5e9] text-[#00344d] font-bold border-l border-[#31353e]">
                    {grandTotalHm.toFixed(1)}h
                  </td>
                  <td className="py-2.5 px-3 text-right bg-[#262a33] text-[#4edea3] font-bold">
                    {(dates.length > 0 ? grandTotalHm / dates.length : 0).toFixed(0)}h/d
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* 3. TELEMETRY WATCHLIST & RCA + SHIFT PRODUCTION / WEATHER SECTION */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Card 1: Critical Watchlist Telemetry (Flagged Units & RCA) */}
        <div className="flex flex-col bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#31353e]/60">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#ffb95f]" />
              <h3 className="text-sm lg:text-base font-bold text-[#dfe2ee]">
                Critical Watchlist Telemetry & RCA
              </h3>
              <span className="bg-[#ffb4ab]/15 text-[#ffb4ab] font-mono font-bold text-[10px] px-2 py-0.5 rounded border border-[#ffb4ab]/30">
                Units Flagged
              </span>
            </div>
            <span className="font-mono text-xs text-[#88929b]">Live Dispatch Interlock</span>
          </div>

          {/* Flagged Item 1: DT-319 */}
          <div className="flex flex-col gap-1.5 p-3 bg-[#1c2028] rounded-lg border border-[#31353e]/60 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#ffb4ab]">DT-319</span>
                <span className="text-[#88929b]">CAT 777D • Haul Truck</span>
                <span className="bg-[#ffb4ab]/20 text-[#ffb4ab] px-1.5 py-0.2 rounded font-bold text-[10px]">
                  UNSCHEDULED DOWN
                </span>
              </div>
              <span className="text-[#ffb95f] text-[11px]">0.0 HM (01-02 Aug) → Staging</span>
            </div>
            <p className="text-[#dfe2ee] font-sans text-xs leading-relaxed mt-1">
              <strong className="text-[#88929b]">Root Cause Analysis (RCA):</strong> Differential overhaul backlog in Pit-4 Bay 2. Low gear transmission pressure triggered automated ECU cut-off during grade haul.
            </p>
            <div className="flex items-center justify-between text-[#88929b] text-[11px] pt-1">
              <span className="flex items-center gap-1 text-[#ffb95f]">
                <Clock className="w-3 h-3" /> Full Release: Overhaul completed
              </span>
              <span className="text-[#89ceff]">Action: Standby Unit DT-325 Backfilled</span>
            </div>
          </div>

          {/* Flagged Item 2: EX-204 */}
          <div className="flex flex-col gap-1.5 p-3 bg-[#1c2028] rounded-lg border border-[#31353e]/60 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#4edea3]">EX-204</span>
                <span className="text-[#88929b]">Hitachi EX1900 • Heavy Excavator</span>
                <span className="bg-[#4edea3]/20 text-[#4edea3] px-1.5 py-0.2 rounded font-semibold text-[10px]">
                  ALERT RESOLVED
                </span>
              </div>
              <span className="text-[#4edea3] text-[11px]">Resumed (10.8 HM)</span>
            </div>
            <p className="text-[#dfe2ee] font-sans text-xs leading-relaxed mt-1">
              <strong className="text-[#88929b]">Resolution Notes:</strong> Hydraulic hose line replaced following high-temperature telemetry trip on Bench 3 ramp. Cleared by Pit Supv Danang.
            </p>
            <div className="flex items-center justify-between text-[#88929b] text-[11px] pt-1">
              <span className="text-[#4edea3] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Cleared for 100% Bucket Duty
              </span>
              <span>Logged in Shift A</span>
            </div>
          </div>
        </div>

        {/* Card 2: Shift Production vs Weather Impact */}
        <div className="flex flex-col bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm gap-3 justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#31353e]/60">
              <div className="flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-[#89ceff]" />
                <h3 className="text-sm lg:text-base font-bold text-[#dfe2ee]">
                  Daily Shift HM vs Weather Delay Impact
                </h3>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2 bg-[#89ceff] rounded-xs"></span>
                  <span className="text-[#88929b]">Fleet HM</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-[#ffb95f] rounded-xs"></span>
                  <span className="text-[#ffb95f]">Rainfall (mm)</span>
                </div>
              </div>
            </div>

            {/* Inline SVG Visualization: Daily HM Bars & Rainfall Curve */}
            <div className="w-full bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/60 my-2">
              <svg className="w-full h-36" preserveAspectRatio="none" viewBox="0 0 560 140">
                <line stroke="#31353e" strokeDasharray="3,3" strokeWidth="0.8" x1="0" x2="560" y1="30" y2="30" />
                <line stroke="#31353e" strokeDasharray="3,3" strokeWidth="0.8" x1="0" x2="560" y1="70" y2="70" />
                <line stroke="#31353e" strokeDasharray="3,3" strokeWidth="0.8" x1="0" x2="560" y1="110" y2="110" />

                {/* 14 Day Bars */}
                <rect x="15" y="45" width="22" height="75" rx="2" fill="#89ceff" opacity="0.85" />
                <rect x="53" y="42" width="22" height="78" rx="2" fill="#89ceff" opacity="0.85" />
                <rect x="91" y="49" width="22" height="71" rx="2" fill="#89ceff" opacity="0.85" />
                <rect x="129" y="38" width="22" height="82" rx="2" fill="#89ceff" opacity="0.85" />
                <rect x="167" y="41" width="22" height="79" rx="2" fill="#89ceff" opacity="0.85" />
                <rect x="205" y="46" width="22" height="74" rx="2" fill="#89ceff" opacity="0.85" />
                <rect x="243" y="43" width="22" height="77" rx="2" fill="#89ceff" opacity="0.85" />
                {/* Aug 08 Rain Dip Bar */}
                <rect x="281" y="70" width="22" height="50" rx="2" fill="#ffb95f" opacity="0.95" />
                <rect x="319" y="42" width="22" height="78" rx="2" fill="#89ceff" opacity="0.85" />
                <rect x="357" y="40" width="22" height="80" rx="2" fill="#89ceff" opacity="0.85" />
                <rect x="395" y="37" width="22" height="83" rx="2" fill="#89ceff" opacity="0.85" />
                <rect x="433" y="41" width="22" height="79" rx="2" fill="#89ceff" opacity="0.85" />
                <rect x="471" y="39" width="22" height="81" rx="2" fill="#89ceff" opacity="0.85" />
                <rect x="509" y="40" width="22" height="80" rx="2" fill="#89ceff" opacity="0.85" />

                {/* Rainfall Line */}
                <polyline
                  fill="none"
                  stroke="#ffb95f"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="26,115 64,118 102,112 140,118 178,118 216,115 254,95 292,25 330,85 368,118 406,118 444,118 482,118 520,118"
                />
                <circle cx="292" cy="25" r="4" fill="#ee9800" stroke="#0f131c" strokeWidth="2" />
                <text x="292" y="16" fill="#ffb95f" fontSize="9" fontWeight="700" fontFamily="JetBrains Mono" textAnchor="middle">
                  42mm Rain (-18% HM)
                </text>
              </svg>

              <div className="flex justify-between font-mono text-[10px] text-[#88929b] pt-1">
                <span>01 Aug</span>
                <span>03 Aug</span>
                <span>05 Aug</span>
                <span>07 Aug</span>
                <span className="text-[#ffb95f] font-bold">08 Aug (Rain)</span>
                <span>10 Aug</span>
                <span>12 Aug</span>
                <span>14 Aug</span>
              </div>
            </div>
          </div>

          {/* Shift Handover Note */}
          <div className="bg-[#0f131c] p-2.5 rounded-lg border border-[#31353e]/60 font-mono text-xs">
            <span className="text-[#89ceff] font-bold block mb-1">
              SHIFT SUPERVISOR LOG (PIT-04 SEAM)
            </span>
            <p className="text-[#bec8d2] font-sans text-xs leading-relaxed">
              "All CAT 777 haulers reached nominal target cycles on Bench 4 North. Slippery haul road patch between Station 12 and Dump 3 was graded and re-sheeted by RS-001 grader."
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
