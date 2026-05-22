"use client"

import { MonthlyStats } from '@/types/commission'
import { formatCurrency, formatMonthLabel } from '@/lib/commission-calculations'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell
} from 'recharts'

interface MonthlyChartProps {
  data: MonthlyStats[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-sm">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name} : {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const chartData = data.map(d => ({
    month: formatMonthLabel(d.month),
    'Surcomm. M': d.payAtM,
    'Surcomm. M+1': d.payAtMPlus1,
    'Affaires': d.dealCount,
    rawMonth: d.month,
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Aucune donnée à afficher
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            />
            <Bar dataKey="Surcomm. M" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
            <Bar dataKey="Surcomm. M+1" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table récap mensuelle */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mois</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-blue-500 uppercase tracking-wide">Surcomm. M</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-purple-500 uppercase tracking-wide">Surcomm. M+1</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Affaires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(row => (
              <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-slate-700">{formatMonthLabel(row.month)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{formatCurrency(row.payAtM)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-purple-700">{formatCurrency(row.payAtMPlus1)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-800">{formatCurrency(row.total)}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{row.dealCount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
              <td className="px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500">Total</td>
              <td className="px-4 py-2.5 text-right font-bold text-blue-700">
                {formatCurrency(data.reduce((s, r) => s + r.payAtM, 0))}
              </td>
              <td className="px-4 py-2.5 text-right font-bold text-purple-700">
                {formatCurrency(data.reduce((s, r) => s + r.payAtMPlus1, 0))}
              </td>
              <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                {formatCurrency(data.reduce((s, r) => s + r.total, 0))}
              </td>
              <td className="px-4 py-2.5 text-right text-slate-600">
                {data.reduce((s, r) => s + r.dealCount, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
