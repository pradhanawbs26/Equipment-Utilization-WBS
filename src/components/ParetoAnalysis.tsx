import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
  Legend
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Download,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Truck,
  Flame,
  Gauge,
  Lightbulb,
  Info
} from 'lucide-react';
import { ParetoActivityItem, UnitSummaryItem } from '../types';
import { exportParetoData } from '../utils/exportUtils';

interface ParetoAnalysisProps {
  paretoItems: ParetoActivityItem[];
  totalHm: number;
  vitalFewCount: number;
  vitalFewHm: number;
  activeUnitsCount: number;
  totalUnitsCount: number;
  topProducer: UnitSummaryItem | null;
  averageUtilization: number;
  dateRangeText: string;
}

export const ParetoAnalysis: React.FC<ParetoAnalysisProps> = ({
  paretoItems,
  totalHm,
  vitalFewCount,
  vitalFewHm,
  activeUnitsCount,
  totalUnitsCount,
  topProducer,
  averageUtilization,
  dateRangeText,
}) => {
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);

  const topActivity = paretoItems.length > 0 ? paretoItems[0] : null;
  const vitalFewShare = totalHm > 0 ? Math.round((vitalFewHm / totalHm) * 1000) / 10 : 0;

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: ParetoActivityItem = payload[0].payload;
      return (
        <div className="bg-[#1c2028] border border-[#31353e] p-3 rounded-lg shadow-xl font-mono text-xs max-w-xs z-50">
          <div className="flex items-center gap-1.5 pb-1.5 border-b border-[#31353e] mb-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#ffb95f]"></div>
            <span className="font-bold text-[#dfe2ee] text-sm">{data.activity}</span>
          </div>
          <div className="flex flex-col gap-1 text-[#bec8d2]">
            <div className="flex justify-between">
              <span className="text-[#88929b]">Rank:</span>
              <span className="font-bold text-[#dfe2ee]">#{data.rank} of {paretoItems.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#88929b]">Total Hour Meter:</span>
              <span className="font-bold text-[#ffb95f]">{data.totalHm.toLocaleString()} HM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#88929b]">Contribution:</span>
              <span className="font-bold text-[#dfe2ee]">{data.percentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#88929b]">Cumulative Share:</span>
              <span className="font-bold text-[#89ceff]">{data.cumulativePercentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#88929b]">Active Equipment:</span>
              <span className="font-bold text-[#4edea3]">{data.unitCount} units</span>
            </div>
            <div className="mt-1 pt-1 border-t border-[#31353e]/80 flex items-center justify-between text-[10px]">
              <span className="text-[#88929b]">Pareto Zone:</span>
              <span className={data.isVitalFew ? 'text-[#4edea3] font-bold' : 'text-[#bec8d2]'}>
                {data.isVitalFew ? 'Vital Few (Top 80%)' : 'Useful Many'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. TOP KPI STRIP (4 CARDS) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total HM Accumulated */}
        <div className="relative overflow-hidden bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#88929b]">
                Total HM Accumulated
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-mono font-bold text-2xl lg:text-3xl text-[#dfe2ee]">
                  {totalHm.toLocaleString()}
                </span>
                <span className="font-mono text-xs text-[#88929b]">HM</span>
              </div>
            </div>
            <div className="p-2 bg-[#1c2028] border border-[#31353e] rounded text-[#89ceff]">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#31353e]/60 flex items-center justify-between text-xs font-mono">
            <span className="text-[#4edea3] flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Nominal Ops
            </span>
            <span className="text-[#88929b] text-[11px]">{dateRangeText}</span>
          </div>
        </div>

        {/* Card 2: Active Heavy Fleet */}
        <div className="relative overflow-hidden bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#88929b]">
                Active Fleet Equipment
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-mono font-bold text-2xl lg:text-3xl text-[#dfe2ee]">
                  {activeUnitsCount}
                </span>
                <span className="font-mono text-sm text-[#88929b]">/ {totalUnitsCount} Units</span>
              </div>
            </div>
            <div className="p-2 bg-[#1c2028] border border-[#31353e] rounded text-[#4edea3]">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#31353e]/60">
            <div className="w-full bg-[#0f131c] h-1.5 rounded-full overflow-hidden flex">
              <div
                className="bg-[#4edea3] h-full rounded-full"
                style={{ width: `${totalUnitsCount > 0 ? (activeUnitsCount / totalUnitsCount) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-[#88929b]">
              <span className="text-[#4edea3]">
                {totalUnitsCount > 0 ? Math.round((activeUnitsCount / totalUnitsCount) * 100) : 0}% Deployed
              </span>
              <span>Pit-04 Operations</span>
            </div>
          </div>
        </div>

        {/* Card 3: Top Dominant Activity */}
        <div className="relative overflow-hidden bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#ffb95f]">
                Top Dominant Task
              </span>
              <div className="mt-1">
                <span className="font-sans font-bold text-lg lg:text-xl text-[#dfe2ee] truncate block max-w-[190px]">
                  {topActivity ? topActivity.activity : 'N/A'}
                </span>
              </div>
            </div>
            <div className="p-2 bg-[#1c2028] border border-[#31353e] rounded text-[#ffb95f]">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#31353e]/60 flex items-center justify-between text-xs font-mono">
            <span className="text-[#ffb95f] font-bold">
              {topActivity ? `${topActivity.totalHm.toLocaleString()} HM` : '0 HM'}
            </span>
            <span className="text-[#88929b]">
              {topActivity ? `${topActivity.percentage}% share` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 4: Fleet Utilization Index */}
        <div className="relative overflow-hidden bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#88929b]">
                Fleet Utilization Index
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-mono font-bold text-2xl lg:text-3xl text-[#dfe2ee]">
                  {averageUtilization}%
                </span>
                <span className="font-mono text-xs text-[#4edea3]">(≥80% BM)</span>
              </div>
            </div>
            <div className="p-2 bg-[#1c2028] border border-[#31353e] rounded text-[#89ceff]">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#31353e]/60 flex items-center justify-between text-xs font-mono">
            <span className="text-[#4edea3] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Optimal Range
            </span>
            <span className="text-[#88929b]">Target: 80.0%</span>
          </div>
        </div>
      </section>

      {/* 2. MAIN PARETO DUAL-AXIS CHART SECTION */}
      <section className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 lg:p-5 shadow-md flex flex-col gap-4">
        {/* Header & Legends */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#31353e]/60">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#89ceff]" />
              <h2 className="text-base lg:text-lg font-bold text-[#dfe2ee]">
                Pareto Diagram: Activity Hours vs. Cumulative Impact
              </h2>
            </div>
            <p className="text-xs font-mono text-[#88929b] mt-0.5">
              Ranked 80/20 Efficiency Curve • Left Bar: Total HM (Hours) • Right Line: Cumulative %
            </p>
          </div>

          {/* Legend Badges */}
          <div className="flex flex-wrap items-center gap-3 bg-[#0f131c] px-3 py-1.5 rounded-lg border border-[#31353e]/60 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#ffb95f]"></span>
              <span className="text-[#dfe2ee]">Bars: Total HM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#89ceff]"></span>
              <span className="text-[#dfe2ee]">Line: Cumulative %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t border-dashed border-[#ffb4ab]"></span>
              <span className="text-[#ffb4ab]">80% Cutoff</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="w-full h-84 sm:h-96 min-h-[340px]">
          {paretoItems.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#88929b] font-mono text-sm gap-2">
              <AlertCircle className="w-8 h-8 text-[#ffb95f]" />
              <span>No timesheet activity data found for current filter settings.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={paretoItems}
                margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
                onMouseMove={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    setHoveredActivity(e.activePayload[0].payload.activity);
                  }
                }}
                onMouseLeave={() => setHoveredActivity(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#31353e" vertical={false} />
                <XAxis
                  dataKey="activity"
                  stroke="#88929b"
                  tick={{ fill: '#bec8d2', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                />
                {/* Left Y-Axis: Total HM */}
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#ffb95f"
                  tick={{ fill: '#ffb95f', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}h`}
                  label={{
                    value: 'Total HM (Hours)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#ffb95f',
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                {/* Right Y-Axis: Cumulative Percentage */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="#89ceff"
                  tick={{ fill: '#89ceff', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(val) => `${val}%`}
                  label={{
                    value: 'Cumulative %',
                    angle: 90,
                    position: 'insideRight',
                    fill: '#89ceff',
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* 80% Pareto Reference Line */}
                <ReferenceLine
                  yAxisId="right"
                  y={80}
                  stroke="#ffb4ab"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: '80% Pareto Cutoff (Vital Few)',
                    fill: '#ffb4ab',
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono',
                    position: 'top',
                  }}
                />
                {/* Bars: Total HM per Activity */}
                <Bar
                  yAxisId="left"
                  dataKey="totalHm"
                  name="Total HM"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={60}
                >
                  {paretoItems.map((entry) => (
                    <Cell
                      key={`cell-${entry.activity}`}
                      fill={
                        hoveredActivity === entry.activity
                          ? '#ffddb8'
                          : entry.isVitalFew
                          ? '#ffb95f'
                          : '#0ea5e9'
                      }
                      opacity={hoveredActivity && hoveredActivity !== entry.activity ? 0.45 : 0.9}
                    />
                  ))}
                </Bar>
                {/* Line: Cumulative Percentage */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativePercentage"
                  name="Cumulative %"
                  stroke="#89ceff"
                  strokeWidth={3}
                  dot={{ fill: '#89ceff', r: 4, stroke: '#0f131c', strokeWidth: 1.5 }}
                  activeDot={{ r: 7, fill: '#4edea3', stroke: '#0f131c', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 80/20 Recommendation Banner */}
        <div className="bg-[#1c2028] border-l-3 border-[#89ceff] p-3.5 rounded-r-lg flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-[#89ceff] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-mono font-bold text-xs text-[#89ceff] uppercase tracking-wide">
              Dispatcher 80/20 Operational Insight
            </span>
            <p className="text-xs text-[#bec8d2] leading-relaxed">
              The top <strong className="text-[#dfe2ee]">{vitalFewCount} operational tasks</strong> account for{' '}
              <strong className="text-[#ffb95f] font-bold">{vitalFewShare}% of all machine hours</strong> ({vitalFewHm.toLocaleString()} HM).
              Optimizing cycle time and haul road conditions for these key tasks delivers the highest productivity gains across Pit-04 fleet.
            </p>
          </div>
        </div>
      </section>

      {/* 3. DETAILED PARETO SUMMARY TABLE */}
      <section className="bg-[#181c24] border border-[#31353e]/80 rounded-lg p-4 lg:p-5 shadow-md flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm lg:text-base font-bold text-[#dfe2ee]">
              Detailed Pareto Summary Table
            </h3>
            <span className="font-mono text-xs text-[#88929b]">
              Activity hour meter rankings, contribution shares, and cumulative progress
            </span>
          </div>

          <button
            onClick={() => exportParetoData(paretoItems, 'xlsx', dateRangeText)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c2028] hover:bg-[#262a33] text-[#89ceff] text-xs font-mono font-medium rounded border border-[#31353e] transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Pareto (.XLSX)</span>
          </button>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded border border-[#31353e]/70">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-[#0f131c] text-[#88929b] uppercase tracking-wider text-[11px] h-9 border-b border-[#31353e]">
                <th className="px-3 py-2 text-center w-12">Rank</th>
                <th className="px-3 py-2">Activity Description</th>
                <th className="px-3 py-2 text-center">Active Units</th>
                <th className="px-3 py-2 text-right">Total HM (h)</th>
                <th className="px-3 py-2 text-right">% Contribution</th>
                <th className="px-3 py-2 text-right">Cumulative HM</th>
                <th className="px-3 py-2">Cumulative % Curve</th>
                <th className="px-3 py-2 text-center">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#31353e]/60">
              {paretoItems.map((item) => (
                <tr
                  key={item.activity}
                  onMouseEnter={() => setHoveredActivity(item.activity)}
                  onMouseLeave={() => setHoveredActivity(null)}
                  className={`hover:bg-[#262a33]/60 transition-colors ${
                    hoveredActivity === item.activity ? 'bg-[#262a33]/80' : ''
                  }`}
                >
                  <td className="px-3 py-2.5 text-center font-bold text-[#88929b]">
                    {item.rank}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          item.isVitalFew ? 'bg-[#ffb95f]' : 'bg-[#0ea5e9]'
                        }`}
                      ></div>
                      <span className="font-sans font-semibold text-[#dfe2ee]">
                        {item.activity}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#bec8d2]">
                    {item.unitCount} units
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-[#ffb95f]">
                    {item.totalHm.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[#dfe2ee]">
                    {item.percentage}%
                  </td>
                  <td className="px-3 py-2.5 text-right text-[#bec8d2]">
                    {item.cumulativeHm.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#0f131c] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.cumulativePercentage <= 80 ? 'bg-[#ffb95f]' : 'bg-[#89ceff]'
                          }`}
                          style={{ width: `${Math.min(100, item.cumulativePercentage)}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] font-bold text-[#dfe2ee] w-12 text-right">
                        {item.cumulativePercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.isVitalFew
                          ? 'bg-[#ffb95f]/15 text-[#ffb95f] border border-[#ffb95f]/30'
                          : 'bg-[#31353e]/60 text-[#bec8d2]'
                      }`}
                    >
                      {item.isVitalFew ? 'Vital Few (≤80%)' : 'Useful Many'}
                    </span>
                  </td>
                </tr>
              ))}
              {paretoItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-[#88929b]">
                    No activities recorded.
                  </td>
                </tr>
              )}
            </tbody>
            {paretoItems.length > 0 && (
              <tfoot>
                <tr className="bg-[#0f131c] font-bold text-[#dfe2ee] border-t border-[#31353e]">
                  <td colSpan={2} className="px-3 py-2.5 text-left text-[#89ceff]">
                    Total Shift Activities ({paretoItems.length})
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#bec8d2]">
                    {activeUnitsCount} Units Active
                  </td>
                  <td className="px-3 py-2.5 text-right text-[#ffb95f]">
                    {totalHm.toLocaleString()} HM
                  </td>
                  <td className="px-3 py-2.5 text-right">100.0%</td>
                  <td className="px-3 py-2.5 text-right text-[#bec8d2]">
                    {totalHm.toLocaleString()} HM
                  </td>
                  <td className="px-3 py-2.5 text-center">100.0% Complete</td>
                  <td className="px-3 py-2.5 text-center text-[#4edea3]">
                    100% Pareto Coverage
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
};
