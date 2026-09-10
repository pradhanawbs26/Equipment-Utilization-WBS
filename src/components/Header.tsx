import React from 'react';
import { Download, RefreshCw, Calendar, Sparkles, Database } from 'lucide-react';
import { FilterState } from '../types';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  filters: FilterState;
  onResetFilters: () => void;
  onExportCurrentView: (format: 'csv' | 'xlsx') => void;
  totalRecordsCount: number;
  filteredRecordsCount: number;
  isCloudLoading?: boolean;
  isCloudSaving?: boolean;
  isSupabaseConfigured?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  filters,
  onResetFilters,
  onExportCurrentView,
  totalRecordsCount,
  filteredRecordsCount,
  isCloudLoading,
  isCloudSaving,
  isSupabaseConfigured = false,
}) => {
  const dateRangeDisplay = filters.dateMode === 'single'
    ? filters.selectedSingleDate || 'Single Date'
    : `${filters.startDate} – ${filters.endDate}`;

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-[#181c24] border-b border-[#31353e]/80">
      <div className="h-16 w-full px-4 lg:px-6 flex items-center justify-between gap-3">
        {/* Left Branding */}
        <div className="flex items-center gap-3 min-w-max">
          <div className="flex items-center gap-3">
            <img
              src="https://res.cloudinary.com/dgjnlxf69/image/upload/v1788933840/Logo_UA_Equipment_j2nlnj.png"
              alt="UA Equipment Logo"
              className="h-10 w-auto max-h-10 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-sm lg:text-base leading-none text-[#dfe2ee] tracking-tight">
                Equipment Activity Dashboard
              </span>
              <span className="font-mono text-[10px] uppercase text-[#89ceff] tracking-wider mt-1 font-semibold">
                UA EQUIPMENT • TIMESHEET ENGINE
              </span>
            </div>
          </div>

          {/* Database Live Status Indicator */}
          <div
            className="hidden md:flex items-center gap-1.5 bg-[#1c2028] px-2.5 py-1 rounded border border-[#89ceff]/30 cursor-pointer hover:bg-[#262a33] transition-colors"
            onClick={() => onTabChange('timesheet-ingestion')}
            title={isSupabaseConfigured ? 'Supabase PostgreSQL Connected' : 'Browser IndexedDB Active (Click to configure Supabase)'}
          >
            <Database className={`w-3 h-3 ${isCloudSaving || isCloudLoading ? 'text-[#ffb95f] animate-spin' : 'text-[#89ceff]'}`} />
            <span className="font-mono text-[11px] text-[#dfe2ee]">
              DB: <span className="text-[#89ceff] font-bold">{isSupabaseConfigured ? 'Supabase' : 'IndexedDB'}</span>
            </span>
            {isCloudSaving ? (
              <span className="text-[10px] text-[#ffb95f] font-mono animate-pulse">Saving...</span>
            ) : isCloudLoading ? (
              <span className="text-[10px] text-[#89ceff] font-mono animate-pulse">Syncing...</span>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></div>
            )}
          </div>
        </div>

        {/* Center Quick Navigation (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1 bg-[#0f131c]/60 p-1 rounded-lg border border-[#31353e]/60">
          <button
            onClick={() => onTabChange('pareto-activity')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              currentTab === 'pareto-activity'
                ? 'bg-[#1c2028] text-[#89ceff] font-semibold shadow-sm'
                : 'text-[#bec8d2] hover:text-[#dfe2ee] hover:bg-[#181c24]'
            }`}
          >
            Pareto Activity
          </button>
          <button
            onClick={() => onTabChange('unit-hm-breakdown')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              currentTab === 'unit-hm-breakdown'
                ? 'bg-[#1c2028] text-[#89ceff] font-semibold shadow-sm'
                : 'text-[#bec8d2] hover:text-[#dfe2ee] hover:bg-[#181c24]'
            }`}
          >
            Unit HM Breakdown
          </button>
          <button
            onClick={() => onTabChange('daily-hm-matrix')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              currentTab === 'daily-hm-matrix'
                ? 'bg-[#1c2028] text-[#89ceff] font-semibold shadow-sm'
                : 'text-[#bec8d2] hover:text-[#dfe2ee] hover:bg-[#181c24]'
            }`}
          >
            Daily HM Matrix
          </button>
          <button
            onClick={() => onTabChange('timesheet-ingestion')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              currentTab === 'timesheet-ingestion'
                ? 'bg-[#1c2028] text-[#89ceff] font-semibold shadow-sm'
                : 'text-[#bec8d2] hover:text-[#dfe2ee] hover:bg-[#181c24]'
            }`}
          >
            Timesheet Ingestion
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 min-w-max">
          {/* Active Date Tag */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#31353e]/60 border border-[#3e4850]/60 px-2.5 py-1.5 rounded text-xs font-mono text-[#dfe2ee]">
            <Calendar className="w-3.5 h-3.5 text-[#89ceff]" />
            <span className="truncate max-w-[140px]">{dateRangeDisplay}</span>
          </div>

          {/* Records Counter */}
          <div className="hidden lg:flex items-center gap-1 bg-[#1c2028] border border-[#31353e] px-2.5 py-1.5 rounded text-xs font-mono">
            <span className="text-[#89ceff] font-bold">{filteredRecordsCount}</span>
            <span className="text-[#88929b]">/ {totalRecordsCount} rows</span>
          </div>

          {/* Reset Filters if active */}
          {(filters.selectedCategory !== 'ALL' || filters.selectedUnits.length > 0 || filters.searchQuery) && (
            <button
              onClick={onResetFilters}
              title="Reset Filters"
              className="flex items-center gap-1 bg-[#31353e]/80 hover:bg-[#31353e] text-[#ffb95f] px-2.5 py-1.5 rounded text-xs font-mono font-medium transition-colors border border-[#ffb95f]/30"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {/* Export Dropdown / Trigger */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-[#00344d] font-bold px-3 py-1.5 rounded font-mono text-xs transition-colors shadow-sm cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-[#1c2028] border border-[#31353e] rounded shadow-xl py-1 min-w-[140px] z-50">
              <button
                onClick={() => onExportCurrentView('xlsx')}
                className="px-3 py-1.5 text-left text-xs font-mono text-[#dfe2ee] hover:bg-[#31353e] hover:text-[#89ceff] flex items-center justify-between"
              >
                <span>Excel (.xlsx)</span>
                <span className="text-[10px] text-[#4edea3]">XLS</span>
              </button>
              <button
                onClick={() => onExportCurrentView('csv')}
                className="px-3 py-1.5 text-left text-xs font-mono text-[#dfe2ee] hover:bg-[#31353e] hover:text-[#89ceff] flex items-center justify-between"
              >
                <span>CSV Table</span>
                <span className="text-[10px] text-[#88929b]">CSV</span>
              </button>
            </div>
          </div>

          {/* Operator Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#31353e]">
            <div className="w-8 h-8 rounded-full bg-[#1c2028] border border-[#0ea5e9]/40 flex items-center justify-center text-xs font-mono font-bold text-[#89ceff]">
              OP
            </div>
            <div className="hidden 2xl:flex flex-col">
              <span className="text-xs font-medium text-[#dfe2ee] leading-tight">M. Danang</span>
              <span className="font-mono text-[10px] text-[#88929b] leading-none">Dispatch Supv</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
