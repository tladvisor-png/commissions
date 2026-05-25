"use client"

import { format } from 'date-fns'
import { MonthlyRecap, RecapFilterState } from '@/types/commission'
import { formatMonthLabel } from '@/lib/commission-calculations'

interface RecapFiltersProps {
  filters: RecapFilterState
  onChange: (f: RecapFilterState) => void
  availableMonths: string[]
}

const currentMonthKey = format(new Date(), 'yyyy-MM')

export function RecapFilters({ filters, onChange, availableMonths }: RecapFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="text-sm font-medium text-slate-600">Mois :</label>
      <select
        value={filters.monthKey}
        onChange={e => onChange({ ...filters, monthKey: e.target.value })}
        className="px-3 py-1.5 text-sm rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        <option value={currentMonthKey}>Mois courant ({formatMonthLabel(currentMonthKey)})</option>
        <option value="all">Tous les mois</option>
        {availableMonths
          .filter(m => m !== currentMonthKey)
          .map(m => (
            <option key={m} value={m}>{formatMonthLabel(m)}</option>
          ))}
      </select>
    </div>
  )
}
