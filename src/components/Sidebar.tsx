import React from 'react';
import {
  BarChart3,
  Gauge,
  Grid,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  loadedSheetName: string;
  totalRecordsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  loadedSheetName,
  totalRecordsCount,
}) => {
  const navItems = [
    {
      id: 'pareto-activity',
      label: 'Pareto Activity',
      description: '80/20 Cumulative Distribution',
      icon: BarChart3,
      badge: 'Dual-Axis',
    },
    {
      id: 'unit-hm-breakdown',
      label: 'Unit HM Breakdown',
      description: 'Utilization & Ranking Ledger',
      icon: Gauge,
      badge: 'Fleet Ops',
    },
    {
      id: 'daily-hm-matrix',
      label: 'Daily HM Matrix',
      description: 'Unit x Date Pivot Heatmap',
      icon: Grid,
      badge: 'Pivot Grid',
    },
    {
      id: 'timesheet-ingestion',
      label: 'Timesheet Ingestion',
      description: 'Excel XLSX Ingestion & Raw Log',
      icon: UploadCloud,
      badge: 'Parser',
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#181c24] border-r border-[#31353e]/80 z-50 hidden lg:flex flex-col justify-between py-4 select-none">
      <div className="flex flex-col gap-4">
        {/* Brand Header */}
        <div className="px-4 py-1 flex items-center gap-3 border-b border-[#31353e]/50 pb-3">
          <img
            src="https://res.cloudinary.com/dgjnlxf69/image/upload/v1788933840/Logo_UA_Equipment_j2nlnj.png"
            alt="UA Equipment Logo"
            className="h-9 w-auto max-h-9 object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-[#dfe2ee] tracking-tight truncate">
              UA Equipment
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#89ceff]">
              Dispatch Controller
            </span>
          </div>
        </div>

        {/* Current Sheet Pill */}
        <div className="mx-3 px-3 py-2 bg-[#0f131c] rounded-lg border border-[#31353e]/60 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileSpreadsheet className="w-4 h-4 text-[#4edea3] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-mono text-[#88929b]">Active Sheet</span>
              <span className="text-xs font-mono text-[#dfe2ee] font-semibold truncate">
                {loadedSheetName || 'Timeshet Mobile'}
              </span>
            </div>
          </div>
          <span className="font-mono text-[10px] text-[#89ceff] bg-[#0ea5e9]/10 px-1.5 py-0.5 rounded shrink-0">
            {totalRecordsCount} rows
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1 px-3">
          <span className="px-2 pb-1 text-[10px] font-mono uppercase text-[#88929b] tracking-wider font-medium">
            Core Analytics Views
          </span>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                  isActive
                    ? 'bg-[#262a33] text-[#89ceff] shadow-md border-l-2 border-[#89ceff]'
                    : 'text-[#bec8d2] hover:bg-[#1c2028] hover:text-[#dfe2ee]'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? 'text-[#89ceff]' : 'text-[#88929b] group-hover:text-[#dfe2ee]'}`} />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isActive ? 'text-[#dfe2ee]' : 'text-[#dfe2ee]'}`}>
                      {item.label}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                      isActive ? 'bg-[#0ea5e9]/20 text-[#89ceff]' : 'bg-[#31353e]/40 text-[#88929b]'
                    }`}>
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#88929b] truncate mt-0.5">
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer */}
      <div className="px-4 py-2 border-t border-[#31353e]/40 flex items-center justify-between text-[11px] font-mono text-[#88929b]">
        <span>UA Fleet Ops</span>
        <span className="text-[#89ceff]">v2.4</span>
      </div>
    </aside>
  );
};
