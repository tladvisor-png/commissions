"use client"

import { FilterState } from '@/types/commission'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'

interface CommissionFiltersProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  mandataires: string[]
  months: string[]
  monthLabel: (m: string) => string
}

const defaultFilters: FilterState = {
  search: '',
  mandataire: '',
  monthM: '',
  status: '',
  isInstance: '',
  isContractOk: '',
  deferToEndOfMonth: '',
  unepFilter: '',
  encaissementFilter: '',
}

export function CommissionFilters({ filters, onChange, mandataires, months, monthLabel }: CommissionFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  function reset() {
    onChange(defaultFilters)
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {/* Recherche globale */}
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

      {/* Filtre mois M */}
      <div className="min-w-[150px]">
        <Select
          value={filters.monthM || '__all__'}
          onValueChange={v => onChange({ ...filters, monthM: v === '__all__' ? '' : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tous les mois" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les mois</SelectItem>
            {months.map(m => (
              <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtre statut */}
      <div className="min-w-[150px]">
        <Select
          value={filters.status || '__all__'}
          onValueChange={v => onChange({ ...filters, status: v === '__all__' ? '' : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les statuts</SelectItem>
            <SelectItem value="INSTANCE">Instance</SelectItem>
            <SelectItem value="CONTRAT_OK">Contrat OK</SelectItem>
            <SelectItem value="A_VALIDER">À valider</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filtre report fin de mois */}
      <div className="min-w-[170px]">
        <Select
          value={filters.deferToEndOfMonth || '__all__'}
          onValueChange={v => onChange({ ...filters, deferToEndOfMonth: v === '__all__' ? '' : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tous les reports" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les reports</SelectItem>
            <SelectItem value="true">Fin de mois uniquement</SelectItem>
            <SelectItem value="false">Non reportées uniquement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filtre négociation UNEP */}
      <div className="min-w-[180px]">
        <Select
          value={filters.unepFilter || '__all__'}
          onValueChange={v => onChange({ ...filters, unepFilter: v === '__all__' ? '' : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Toutes (UNEP)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes les affaires</SelectItem>
            <SelectItem value="unep">À négocier UNEP</SelectItem>
            <SelectItem value="no_unep">Sans négociation UNEP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filtre statut d'encaissement */}
      <div className="min-w-[210px]">
        <Select
          value={filters.encaissementFilter || '__all__'}
          onValueChange={v => onChange({ ...filters, encaissementFilter: v === '__all__' ? '' : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Statut encaissement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes (encaissement)</SelectItem>
            <SelectItem value="non_encaissee">Non encaissées</SelectItem>
            <SelectItem value="partiellement_encaissee">Partiellement encaissées</SelectItem>
            <SelectItem value="totalement_encaissee">Totalement encaissées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-slate-500 hover:text-slate-700">
          <X className="h-4 w-4" />
          Effacer filtres
        </Button>
      )}
    </div>
  )
}
