"use client";

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export interface ChartPoint {
  date: string;
  spend: number;
  leads: number;
  bookings: number;
}

export function SpendLeadsChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
          <YAxis yAxisId="left" stroke="#64748b" fontSize={11} />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#64748b"
            fontSize={11}
          />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="left"
            dataKey="spend"
            fill="#0f172a"
            name="Spend ($)"
            radius={[3, 3, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="leads"
            stroke="#10b981"
            strokeWidth={2}
            name="Leads"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bookings"
            stroke="#f59e0b"
            strokeWidth={2}
            name="Bookings"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
