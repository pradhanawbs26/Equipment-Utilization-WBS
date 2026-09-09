import React from 'react';
import {
  BarChart3,
  Gauge,
  Grid,
  UploadCloud,
  Layers,
  Radio,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Database
} from 'lucide-react';
import { FIREBASE_PROJECT_ID } from '../lib/firebase';

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
        {/* Top Header Badge */}
        <div className="px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#bec8d2] font-semibold">
              Dispatch Controller v2.4
            </span>
          </div>
          <span className="font-mono text-[9px] bg-[#31353e] text-[#89ceff] px-1.5 py-0.5 rounded font-bold">
            CAN-BUS
          </span>
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

        {/* Operational Scope */}
        <div className="mx-3 p-3 bg-[#1c2028]/80 rounded-lg border border-[#31353e]/50 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#bec8d2]">
            <span className="flex items-center gap-1.5 text-[#89ceff]">
              <Layers className="w-3.5 h-3.5" /> Fleet Scope
            </span>
            <span className="font-bold text-[#dfe2ee]">PIT-04 COAL</span>
          </div>
          <div className="text-[10px] font-mono text-[#88929b] leading-tight">
            Monitoring CAT 777D Haul, PC2000 Shovels, and support fleet duty cycles.
          </div>
        </div>

        {/* Firebase Cloud Backend Status */}
        <div className="mx-3 p-2.5 bg-[#0f131c] rounded-lg border border-[#31353e]/60 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#89ceff]" />
            <div className="flex flex-col">
              <span className="text-[10px] text-[#88929b] uppercase leading-none">Database</span>
              <span className="text-[11px] text-[#dfe2ee] font-bold truncate max-w-[110px] leading-tight mt-0.5">
                {FIREBASE_PROJECT_ID}
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-[#4edea3] font-bold bg-[#4edea3]/10 px-1.5 py-0.5 rounded border border-[#4edea3]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
            SYNCED
          </span>
        </div>
      </div>

      {/* Bottom Gateway / Telemetry Heartbeat */}
      <div className="px-3 flex flex-col gap-2">
        <div className="bg-[#0f131c] p-3 rounded-lg border border-[#31353e]/60 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase text-[#88929b] tracking-wider flex items-center gap-1">
              <Radio className="w-3 h-3 text-[#4edea3]" /> Pit Gateway Signal
            </span>
            <span className="font-mono text-[10px] text-[#4edea3] font-bold">12ms</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-[#4edea3] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#4edea3]" /> RTK-09 ONLINE
            </span>
            <span className="text-[#88929b] text-[10px]">BASE-4</span>
          </div>
          <div className="w-full bg-[#1c2028] h-1 rounded-full overflow-hidden">
            <div className="bg-[#4edea3] h-full w-[94%]"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};
