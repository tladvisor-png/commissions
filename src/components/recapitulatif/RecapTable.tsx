"use client"

import { MonthlyRecap } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import { cn } from '@/lib/utils'

interface RecapTableProps {
  recaps: MonthlyRecap[]
  selectedMonthKey: string
}

function RemainingCell({ value }: { value: number }) {
  const isPositive = value > 0.005
  const isNegative = value < -0.005
  return (
    <td className={cn(
      'px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap',
      isNegative ? 'text-emerald-600' : isPositive ? 'text-orange-600' : 'text-slate-400'
    )}>
      {value > 0 ? '+' : ''}{formatCurrency(value)}
    </td>
  )
}

export function RecapTable({ recaps, selectedMonthKey }: RecapTableProps) {
  if (recaps.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
        Aucune donnée disponible.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {[
              'Mois',
              'Surco produite',
              'Surco encaissable',
              'Surco encaissée',
              'Reste à encaisser',
              'CA produit',
              'CA encaissable estimé',
              'Affaires prod.',
              'Échéances encaissables',
              'Échéances payées',
            ].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {recaps.map(r => (
            <tr
              key={r.monthKey}
              className={cn(
                'transition-colors hover:bg-slate-50',
                r.monthKey === selectedMonthKey && selectedMonthKey !== 'all'
                  ? 'bg-teal-50 font-semibold'
                  : ''
              )}
            >
              <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-800">{r.monthLabel}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-teal-700">{formatCurrency(r.producedSurcommission)}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-blue-700">{formatCurrency(r.collectibleSurcommission)}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-emerald-700">{formatCurrency(r.paidSurcommission)}</td>
              <RemainingCell value={r.remainingSurcommission} />
              <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-violet-700">{formatCurrency(r.producedRevenue)}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-indigo-700">{formatCurrency(r.estimatedCollectedRevenue)}</td>
              <td className="px-3 py-2.5 text-center whitespace-nowrap text-slate-600">{r.producedDealsCount}</td>
              <td className="px-3 py-2.5 text-center whitespace-nowrap text-slate-600">{r.collectiblePaymentEntriesCount}</td>
              <td className="px-3 py-2.5 text-center whitespace-nowrap text-slate-600">{r.paidPaymentEntriesCount}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-700">
            <td className="px-3 py-2.5 text-xs uppercase tracking-wide">Total ({recaps.length} mois)</td>
            <td className="px-3 py-2.5 text-right text-teal-800">{formatCurrency(recaps.reduce((s, r) => s + r.producedSurcommission, 0))}</td>
            <td className="px-3 py-2.5 text-right text-blue-800">{formatCurrency(recaps.reduce((s, r) => s + r.collectibleSurcommission, 0))}</td>
            <td className="px-3 py-2.5 text-right text-emerald-800">{formatCurrency(recaps.reduce((s, r) => s + r.paidSurcommission, 0))}</td>
            <td className="px-3 py-2.5 text-right text-orange-700">{formatCurrency(recaps.reduce((s, r) => s + r.remainingSurcommission, 0))}</td>
            <td className="px-3 py-2.5 text-right text-violet-800">{formatCurrency(recaps.reduce((s, r) => s + r.producedRevenue, 0))}</td>
            <td className="px-3 py-2.5 text-right text-indigo-800">{formatCurrency(recaps.reduce((s, r) => s + r.estimatedCollectedRevenue, 0))}</td>
            <td className="px-3 py-2.5 text-center">{recaps.reduce((s, r) => s + r.producedDealsCount, 0)}</td>
            <td className="px-3 py-2.5 text-center">{recaps.reduce((s, r) => s + r.collectiblePaymentEntriesCount, 0)}</td>
            <td className="px-3 py-2.5 text-center">{recaps.reduce((s, r) => s + r.paidPaymentEntriesCount, 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
