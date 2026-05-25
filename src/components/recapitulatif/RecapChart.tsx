"use client"

import { MonthlyRecap } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

interface RecapChartProps {
  recaps: MonthlyRecap[]
}

function formatEuro(value: number) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k€`
  return `${value.toFixed(0)}€`
}

export function RecapChart({ recaps }: RecapChartProps) {
  if (recaps.length === 0) return null

  const data = recaps.map(r => ({
    name: r.monthLabel,
    'Surco produite': Math.round(r.producedSurcommission * 100) / 100,
    'Surco encaissable': Math.round(r.collectibleSurcommission * 100) / 100,
    'Surco encaissée': Math.round(r.paidSurcommission * 100) / 100,
    'CA produit': Math.round(r.producedRevenue * 100) / 100,
    'CA encaissable estimé': Math.round(r.estimatedCollectedRevenue * 100) / 100,
  }))

  const hasSurco = recaps.some(r => r.producedSurcommission > 0 || r.collectibleSurcommission > 0 || r.paidSurcommission > 0)
  const hasCA = recaps.some(r => r.producedRevenue > 0 || r.estimatedCollectedRevenue > 0)

  if (!hasSurco && !hasCA) return null

  return (
    <div className="space-y-6">
      {hasSurco && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Surcommissions par mois
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tickFormatter={formatEuro} tick={{ fontSize: 11, fill: '#64748b' }} width={52} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Surco produite" fill="#0d9488" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Surco encaissable" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Surco encaissée" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasCA && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            CA Assentis par mois
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tickFormatter={formatEuro} tick={{ fontSize: 11, fill: '#64748b' }} width={52} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="CA produit" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="CA encaissable estimé" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
