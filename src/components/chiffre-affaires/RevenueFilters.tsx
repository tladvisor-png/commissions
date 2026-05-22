"use client"

import { RevenueFilterState, ContractType, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RevenueFiltersProps {
  filters: RevenueFilterState
  onChange: (f: RevenueFilterState) => void
  mandataires: string[]
  availableMonths: { key: string; label: string }[]
}

const CONTRACT_TYPES: ContractType[] = ['ASSURANCE_VIE', 'PER', 'ARTICLE_82', 'PER_ENTREPRISE', 'TRANSFERT']

export function RevenueFilters({ filters, onChange, mandataires, availableMonths }: RevenueFiltersProps) {
  function set<K extends keyof RevenueFilterState>(key: K, value: RevenueFilterState[K]) {
    onChange({ ...filters, [key]: value })
  }

  function reset() {
    onChange({
      search: '',
      mandataire: 'all',
      monthKey: 'current',
      contractType: 'all',
      status: 'all',
      unepFilter: 'all',
      deferFilter: 'all',
    })
  }

  const hasActiveFilters =
    filters.search || filters.mandataire !== 'all' || filters.monthKey !== 'current' ||
    filters.contractType !== 'all' || filters.status !== 'all' ||
    filters.unepFilter !== 'all' || filters.deferFilter !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <Input
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          placeholder="Client, mandataire…"
          className="pl-8 h-8 text-sm w-48"
        />
      </div>

      {/* Mois */}
      <Select value={filters.monthKey} onValueChange={v => set('monthKey', v)}>
        <SelectTrigger className="h-8 text-sm w-44">
          <SelectValue placeholder="Mois" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">Mois courant</SelectItem>
          <SelectItem value="all">Tous les mois</SelectItem>
          {availableMonths.map(m => (
            <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Mandataire */}
      <Select value={filters.mandataire} onValueChange={v => set('mandataire', v)}>
        <SelectTrigger className="h-8 text-sm w-44">
          <SelectValue placeholder="Mandataire" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les mandataires</SelectItem>
          {mandataires.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type de contrat */}
      <Select value={filters.contractType} onValueChange={v => set('contractType', v)}>
        <SelectTrigger className="h-8 text-sm w-44">
          <SelectValue placeholder="Type de contrat" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          {CONTRACT_TYPES.map(t => (
            <SelectItem key={t} value={t}>{CONTRACT_TYPE_LABELS[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Statut */}
      <Select value={filters.status} onValueChange={v => set('status', v)}>
        <SelectTrigger className="h-8 text-sm w-40">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="CONTRAT_OK">Contrat OK</SelectItem>
          <SelectItem value="INSTANCE">Instance</SelectItem>
          <SelectItem value="A_VALIDER">À valider</SelectItem>
        </SelectContent>
      </Select>

      {/* Négociation UNEP */}
      <Select value={filters.unepFilter} onValueChange={v => set('unepFilter', v)}>
        <SelectTrigger className="h-8 text-sm w-40">
          <SelectValue placeholder="Négo. UNEP" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          <SelectItem value="oui">UNEP : oui</SelectItem>
          <SelectItem value="non">UNEP : non</SelectItem>
        </SelectContent>
      </Select>

      {/* Report fin de mois */}
      <Select value={filters.deferFilter} onValueChange={v => set('deferFilter', v)}>
        <SelectTrigger className="h-8 text-sm w-44">
          <SelectValue placeholder="Report FDM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="oui">Report : oui</SelectItem>
          <SelectItem value="non">Report : non</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={reset} className="h-8 gap-1 text-slate-500">
          <X className="h-3.5 w-3.5" />
          Réinitialiser
        </Button>
      )}
    </div>
  )
}
