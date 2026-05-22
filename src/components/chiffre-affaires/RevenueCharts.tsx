"use client"

import { useMemo } from 'react'
import { CalculatedDeal, CONTRACT_TYPE_LABELS, ContractType } from '@/types/commission'
import { formatMonthLabel } from '@/lib/commission-calculations'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#7c3aed', '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444']

function fmtEur(val: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

interface RevenueChartsProps {
  deals: CalculatedDeal[]
}

export function RevenueCharts({ deals }: RevenueChartsProps) {
  // 1. CA par mois
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; caPU: number; caPP: number; caTotal: number }>()
    for (const d of deals) {
      const key = d.monthM
      if (!key) continue
      const existing = map.get(key) ?? { month: key, caPU: 0, caPP: 0, caTotal: 0 }
      existing.caPU += d.caPU
      existing.caPP += d.caPP
      existing.caTotal += d.caTotal
      map.set(key, existing)
    }
    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({
        ...d,
        label: formatMonthLabel(d.month),
        caPU: Math.round(d.caPU * 100) / 100,
        caPP: Math.round(d.caPP * 100) / 100,
        caTotal: Math.round(d.caTotal * 100) / 100,
      }))
  }, [deals])

  // 2. CA par mandataire
  const mandataireData = useMemo(() => {
    const map = new Map<string, { mandataire: string; caTotal: number; count: number }>()
    for (const d of deals) {
      const existing = map.get(d.mandataireName) ?? { mandataire: d.mandataireName, caTotal: 0, count: 0 }
      existing.caTotal += d.caTotal
      existing.count += 1
      map.set(d.mandataireName, existing)
    }
    return Array.from(map.values())
      .sort((a, b) => b.caTotal - a.caTotal)
      .slice(0, 8)
      .map(d => ({ ...d, caTotal: Math.round(d.caTotal * 100) / 100 }))
  }, [deals])

  // 3. CA par type de contrat
  const contractData = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of deals) {
      const key = d.contractType ?? 'ASSURANCE_VIE'
      map.set(key, (map.get(key) ?? 0) + d.caTotal)
    }
    return Array.from(map.entries())
      .map(([key, ca]) => ({
        name: CONTRACT_TYPE_LABELS[key as ContractType] ?? key,
        value: Math.round(ca * 100) / 100,
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [deals])

  if (deals.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Aucune donnée à afficher
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Histogramme CA par mois */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">CA Assentis par mois</h3>
        {monthlyData.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Aucune donnée</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => fmtEur(v)} tick={{ fontSize: 10 }} width={70} />
              <Tooltip formatter={(v: number) => fmtEur(v)} />
              <Legend />
              <Bar dataKey="caPU" name="CA PU" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="caPP" name="CA PP" stackId="a" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie chart CA par type de contrat */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Répartition par type de contrat</h3>
        {contractData.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Aucune donnée</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={contractData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)} %`}
                  labelLine={false}
                >
                  {contractData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtEur(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {contractData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600 truncate max-w-[100px]">{d.name}</span>
                  </div>
                  <span className="font-medium text-slate-800">{fmtEur(d.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bar chart CA par mandataire */}
      <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">CA Assentis par mandataire</h3>
        {mandataireData.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Aucune donnée</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mandataireData} layout="vertical" margin={{ left: 10, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={v => fmtEur(v)} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="mandataire" tick={{ fontSize: 11 }} width={120} />
              <Tooltip
                formatter={(v: number, name: string) => [fmtEur(v), name]}
                labelFormatter={l => `Mandataire : ${l}`}
              />
              <Bar dataKey="caTotal" name="CA total" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
