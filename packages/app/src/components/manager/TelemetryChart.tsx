import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface TelemetryPoint {
  timestamp: string;
  tempC: number;
  ph: number;
  moisturePct: number;
  methanePpm: number;
  airPressureHpa?: number;
}

interface TelemetryChartProps {
  data?: TelemetryPoint[];
  nodeName?: string;
}

// Generate fallback 360-point dataset if live API has sparse history
const generateMock30DayPoints = (): TelemetryPoint[] => {
  const points: TelemetryPoint[] = [];
  const now = Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  for (let i = 359; i >= 0; i--) {
    const t = new Date(now - i * twoHoursMs);
    // Biological compost curve simulation over 30 days:
    // Days 1-4: Mesophilic (35-45C)
    // Days 5-18: Thermophilic peak (55-65C)
    // Days 19-30: Maturation & cooling (40-48C)
    const day = 30 - Math.floor(i / 12);
    let baseTemp = 42;
    let basePh = 6.8;

    if (day < 5) {
      baseTemp = 36 + day * 3 + Math.sin(i) * 2;
      basePh = 6.2 - day * 0.15;
    } else if (day <= 18) {
      baseTemp = 58 + Math.sin(i * 0.5) * 4;
      basePh = 6.8 + Math.sin(i * 0.2) * 0.4;
    } else {
      baseTemp = 54 - (day - 18) * 0.8 + Math.sin(i) * 1.5;
      basePh = 7.4 + (day - 18) * 0.03;
    }

    points.push({
      timestamp: `${t.getDate()} ${t.toLocaleString('en-US', { month: 'short' })} ${t.getHours()}:00`,
      tempC: Number(baseTemp.toFixed(1)),
      ph: Number(basePh.toFixed(2)),
      moisturePct: Number((52 + Math.sin(i * 0.3) * 6).toFixed(1)),
      methanePpm: Number((120 + Math.sin(i * 0.1) * 80).toFixed(0)),
    });
  }

  return points;
};

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  data,
  nodeName = 'Node 1 (Gaddha Alpha)',
}) => {
  const chartData = data && data.length > 0 ? data : generateMock30DayPoints();
  const [activeMetric, setActiveMetric] = useState<'ALL' | 'TEMP_PH' | 'MOISTURE_GAS'>('ALL');

  return (
    <div className="w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
            पिछले 30 दिनों का खाद रिपोर्ट कार्ड (30-Day Comprehensive Telemetry)
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            {nodeName} • 360 Telemetry Data Points (Sampling Rate: 1 reading / 2 hrs)
          </p>
        </div>

        {/* View Filter Toggles */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveMetric('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
            }`}
          >
            सभी (All)
          </button>
          <button
            onClick={() => setActiveMetric('TEMP_PH')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'TEMP_PH' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
            }`}
          >
            तापमान और pH
          </button>
          <button
            onClick={() => setActiveMetric('MOISTURE_GAS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'MOISTURE_GAS' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
            }`}
          >
            नमी और मीथेन
          </button>
        </div>
      </div>

      <div className="h-80 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 10, fill: '#64748B' }}
              minTickGap={40}
            />
            {/* Left Y Axis for Temp (C) & Moisture (%) */}
            <YAxis
              yAxisId="left"
              domain={[20, 80]}
              tick={{ fontSize: 10, fill: '#64748B' }}
              unit="°C"
            />
            {/* Right Y Axis for pH */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[4.0, 9.0]}
              tick={{ fontSize: 10, fill: '#64748B' }}
              unit=" pH"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F172A',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '12px',
                border: 'none',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

            {/* Optimal thermophilic temperature reference lines (55-65C) */}
            <ReferenceLine
              yAxisId="left"
              y={55}
              label={{ value: 'Thermophilic Min (55°C)', fill: '#16A34A', fontSize: 10 }}
              stroke="#22C55E"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              yAxisId="left"
              y={65}
              label={{ value: 'Thermophilic Max (65°C)', fill: '#DC2626', fontSize: 10 }}
              stroke="#EF4444"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              yAxisId="right"
              y={5.2}
              label={{ value: 'Acid Crash Trigger (5.2 pH)', fill: '#EA580C', fontSize: 10 }}
              stroke="#F97316"
              strokeDasharray="3 3"
            />

            {(activeMetric === 'ALL' || activeMetric === 'TEMP_PH') && (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="tempC"
                  name="तापमान (Temp °C)"
                  stroke="#EAB308"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ph"
                  name="pH स्तर (pH Level)"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                />
              </>
            )}

            {(activeMetric === 'ALL' || activeMetric === 'MOISTURE_GAS') && (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="moisturePct"
                  name="नमी (Moisture %)"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="methanePpm"
                  name="मीथेन (Methane PPM)"
                  stroke="#A855F7"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={false}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
