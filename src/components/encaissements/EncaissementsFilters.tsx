"use client"

import { EncaissementFilterState } from '@/types/commission'
import { formatMonthLabel } from '@/lib/commission-calculations'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, Calendar } from 'lucide-react'

interface EncaissementsFiltersProps {
  filters: EncaissementFilterState
  onChange: (f: EncaissementFilterState) => void
  mandataires: string[]
  availableMonths: string[]
}

export function EncaissementsFilters({ filters, onChange, mandataires, availableMonths }: EncaissementsFiltersProps) {
  const hasActiveFilters = filters.search !== '' || filters.mandataire !== '' || filters.paymentStatus !== 'unpaid'

  function reset() {
    onChange({ ...filters, search: '', mandataire: '', paymentStatus: 'unpaid' })
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {/* Recherche */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Rechercher client, mandataire..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Filtre mandataire */}
      <div className="min-w-[180px]">
        <Select
          value={filters.mandataire || '__all__'}
          onValueChange={v => onChange({ ...filters, mandataire: v === '__all__' ? '' : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tous les mandataires" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les mandataires</SelectItem>
            {mandataires.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtre mois d'encaissement */}
      <div className="min-w-[180px]">
        <Select
          value={filters.monthKey || '__all__'}
          onValueChange={v => onChange({ ...filters, monthKey: v === '__all__' ? '' : v })}
        >
          <SelectTrigger className="gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <SelectValue placeholder="Mois d'encaissement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les mois</SelectItem>
            {availableMonths.map(m => (
              <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtre statut paiement */}
      <div className="min-w-[160px]">
        <Select
          value={filters.paymentStatus}
          onValueChange={v => onChange({ ...filters, paymentStatus: v as EncaissementFilterState['paymentStatus'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les échéances</SelectItem>
            <SelectItem value="unpaid">Non payées</SelectItem>
            <SelectItem value="paid">Payées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-slate-500 hover:text-slate-700">
          <X className="h-4 w-4" />
          Réinitialiser
        </Button>
      )}
    </div>
  )
}
