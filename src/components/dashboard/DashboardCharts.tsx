import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

// Custom clean tooltip for charts
export const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg border border-slate-800 text-xs z-50">
        {label && <div className="font-semibold text-slate-200 mb-1 border-b border-slate-700/60 pb-1">{label}</div>}
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">
                {typeof entry.value === 'number' ? entry.value : entry.value}
                {entry.unit || ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// 1. Task Status Donut Chart
interface StatusChartProps {
  data: { name: string; value: number; color: string }[];
  total: number;
}

export const StatusDonutChart: React.FC<StatusChartProps> = ({ data, total }) => {
  const filteredData = data.filter(d => d.value > 0);

  if (total === 0 || filteredData.length === 0) {
    return (
      <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-xs">
        <span>No task data available</span>
      </div>
    );
  }

  return (
    <div className="h-56 w-full flex flex-col sm:flex-row items-center justify-between gap-2">
      <div className="h-full w-full sm:w-3/5 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomChartTooltip />} />
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={74}
              paddingAngle={3}
              dataKey="value"
              stroke="transparent"
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-slate-900 font-mono">{total}</span>
          <span className="text-[10px] uppercase font-semibold text-slate-400">Total</span>
        </div>
      </div>

      {/* Legend list */}
      <div className="w-full sm:w-2/5 flex flex-col gap-1.5 text-xs">
        {data.map(item => (
          <div key={item.name} className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1.5 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="font-semibold text-slate-900 font-mono">
              {item.value} <span className="text-slate-400 text-[10px]">({total > 0 ? Math.round((item.value / total) * 100) : 0}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 2. Weekly Daily Hours Chart
interface WeeklyBarProps {
  data: { label: string; dateStr: string; hours: number }[];
  targetHours?: number;
}

export const WeeklyHoursChart: React.FC<WeeklyBarProps> = ({ data, targetHours = 9 }) => {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            unit="h"
          />
          <Tooltip content={<CustomChartTooltip />} />
          <ReferenceLine
            y={targetHours}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            label={{ value: `${targetHours}h Target`, fill: '#64748b', fontSize: 10, position: 'insideTopRight' }}
          />
          <Bar
            dataKey="hours"
            name="Logged Hours"
            fill="#3b82f6"
            radius={[6, 6, 0, 0]}
            unit="h"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.hours >= targetHours ? '#2563eb' : entry.hours > 0 ? '#60a5fa' : '#e2e8f0'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 3. Employee FTE Horizontal Bar Chart
interface EmployeeFteChartProps {
  data: { name: string; fte: number; actualHours: number; availableHours: number; status: string }[];
}

export const EmployeeFteBarChart: React.FC<EmployeeFteChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
        No staff in current filter
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 25, left: 35, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            domain={[0, 'dataMax + 20']}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            unit="%"
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }}
            width={85}
          />
          <Tooltip content={<CustomChartTooltip />} />
          <ReferenceLine
            x={100}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{ value: '100% Full Cap', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
          />
          <Bar
            dataKey="fte"
            name="FTE Utilization"
            radius={[0, 6, 6, 0]}
            unit="%"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.status === 'OVER CAPACITY' || entry.status === 'Over Capacity'
                    ? '#ef4444'
                    : entry.status === 'AT CAPACITY' || entry.status === 'At Capacity' || entry.status === 'NEAR CAPACITY'
                    ? '#10b981'
                    : '#3b82f6'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 4. Department Capacity Comparison Combo Chart (Clustered Bars + Utilization % Line)
interface DeptCapacityChartProps {
  data: {
    name: string;
    actualHours: number;
    availableHours: number;
    fte: number;
    utilization?: number;
    status?: string;
  }[];
}

export const DepartmentCapacityChart: React.FC<DeptCapacityChartProps> = ({ data }) => {
  const chartData = data.map(d => {
    const util = d.utilization ?? d.fte;
    const status = d.status || (util > 100 ? 'Over Capacity' : util === 100 ? 'At Capacity' : 'Under Capacity');
    const statusColor = status === 'Over Capacity' ? '#EF4444' : status === 'At Capacity' ? '#10B981' : '#3B82F6';
    return {
      ...d,
      utilization: util,
      status,
      statusColor,
    };
  });

  const renderCapDot = (dotProps: any) => {
    const { cx, cy, payload, index } = dotProps;
    if (cx == null || cy == null || !payload) return null;
    const color = payload.statusColor || '#3B82F6';
    return (
      <g key={`dept-cap-dot-${index}`}>
        <circle cx={cx} cy={cy} r={8} fill={color} fillOpacity={0.25} />
        <circle cx={cx} cy={cy} r={5.5} fill={color} stroke="#FFFFFF" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={1.5} fill="#FFFFFF" />
      </g>
    );
  };

  const renderActiveCapDot = (dotProps: any) => {
    const { cx, cy, payload, index } = dotProps;
    if (cx == null || cy == null || !payload) return null;
    const color = payload.statusColor || '#3B82F6';
    return (
      <g key={`dept-active-cap-dot-${index}`}>
        <circle cx={cx} cy={cy} r={13} fill={color} fillOpacity={0.3} />
        <circle cx={cx} cy={cy} r={7.5} fill={color} stroke="#FFFFFF" strokeWidth={2.5} />
        <circle cx={cx} cy={cy} r={2} fill="#FFFFFF" />
      </g>
    );
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 px-1">
        <span>Combo: Grouped Columns (Hours) + Utilization Line</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-semibold text-blue-600">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            &lt;100% Under
          </span>
          <span className="flex items-center gap-1 font-semibold text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            100% Optimal
          </span>
          <span className="flex items-center gap-1 font-semibold text-rose-600">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            &gt;100% Over
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 25, left: -15, bottom: 5 }}
            barGap={4}
          >
            <defs>
              <linearGradient id="deptCapLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {chartData.map((d, idx, arr) => {
                  const offsetPct = arr.length <= 1 ? 50 : Math.round((idx / (arr.length - 1)) * 100);
                  return (
                    <stop
                      key={`dept-grad-stop-${idx}`}
                      offset={`${offsetPct}%`}
                      stopColor={d.statusColor}
                    />
                  );
                })}
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            {/* Left Y-axis: Available & Actual Hours */}
            <YAxis
              yAxisId="left"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
              unit="h"
            />
            {/* Right Y-axis: Utilization % */}
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#4f46e5', fontSize: 11, fontWeight: 600 }}
              unit="%"
              domain={[0, (dataMax: number) => Math.max(120, Math.ceil(dataMax / 20) * 20)]}
            />
            <Tooltip content={<CustomChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            <ReferenceLine
              yAxisId="right"
              y={100}
              stroke="#ef4444"
              strokeDasharray="3 3"
              strokeWidth={1.5}
            />
            {/* Clustered Grouped Columns: Available Hours vs. Actual Hours */}
            <Bar
              yAxisId="left"
              dataKey="availableHours"
              name="Available Hours"
              fill="#A5C8FF"
              radius={[4, 4, 0, 0]}
              unit="h"
              maxBarSize={40}
            />
            <Bar
              yAxisId="left"
              dataKey="actualHours"
              name="Actual Hours"
              fill="#2B7FFF"
              radius={[4, 4, 0, 0]}
              unit="h"
              maxBarSize={40}
            />
            {/* Line Chart: Utilization % with Capacity Status Color Coding */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="utilization"
              name="Utilization %"
              stroke="url(#deptCapLineGradient)"
              strokeWidth={3}
              dot={renderCapDot}
              activeDot={renderActiveCapDot}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 5. Effort Variance Chart
interface EffortVarianceChartProps {
  data: { name: string; plannedHours: number; actualHours: number }[];
}

export const EffortVarianceChart: React.FC<EffortVarianceChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
        No task variance data in filter
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            unit="h"
          />
          <Tooltip content={<CustomChartTooltip />} />
          <Bar
            dataKey="plannedHours"
            name="Target Hours"
            fill="#94a3b8"
            radius={[4, 4, 0, 0]}
            unit="h"
          />
          <Bar
            dataKey="actualHours"
            name="Actual Hours"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            unit="h"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ProjectVarianceChart = EffortVarianceChart;

// 6. Workload Distribution Donut
interface WorkloadPieProps {
  under: number;
  atCapacity?: number;
  near?: number;
  over: number;
}

export const WorkloadDistributionDonut: React.FC<WorkloadPieProps> = ({ under, atCapacity, near, over }) => {
  const atCap = atCapacity !== undefined ? atCapacity : (near || 0);
  const total = under + atCap + over;
  const data = [
    { name: 'Under Capacity (< 100%)', value: under, color: '#3b82f6' },
    { name: 'At Capacity (= 100%)', value: atCap, color: '#10b981' },
    { name: 'Over Capacity (> 100%)', value: over, color: '#ef4444' },
  ].filter(d => d.value > 0);

  if (total === 0 || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
        No staff workload data
      </div>
    );
  }

  return (
    <div className="h-56 w-full flex flex-col sm:flex-row items-center justify-between gap-2">
      <div className="h-full w-full sm:w-3/5 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomChartTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={74}
              paddingAngle={3}
              dataKey="value"
              stroke="transparent"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-slate-900 font-mono">{total}</span>
          <span className="text-[10px] uppercase font-semibold text-slate-400">Headcount</span>
        </div>
      </div>

      <div className="w-full sm:w-2/5 flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <span>Under (&lt; 100%)</span>
          </span>
          <span className="font-semibold text-slate-900 font-mono">{under}</span>
        </div>
        <div className="flex items-center justify-between text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>At Cap (= 100%)</span>
          </span>
          <span className="font-semibold text-slate-900 font-mono">{atCap}</span>
        </div>
        <div className="flex items-center justify-between text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span>Over (&gt; 100%)</span>
          </span>
          <span className="font-semibold text-slate-900 font-mono">{over}</span>
        </div>
      </div>
    </div>
  );
};
