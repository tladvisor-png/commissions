"use client"

import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { fetchDeals, updateDeal } from '@/lib/deals-service'
import { AuthGuard } from '@/components/AuthGuard'
import { calculateDeal, calculateRevenueKpis, getDealsForRevenueKpi, formatMonthLabel } from '@/lib/commission-calculations'
import { CommissionDeal, CalculatedDeal, RevenueFilterState, RevenueKpiCardType } from '@/types/commission'
import { CommissionForm } from '@/components/commissions/CommissionForm'
import { NavigationTabs } from '@/components/NavigationTabs'
import { RevenueKpiCards } from '@/components/chiffre-affaires/RevenueKpiCards'
import { RevenueFilters } from '@/components/chiffre-affaires/RevenueFilters'
import { RevenueCharts } from '@/components/chiffre-affaires/RevenueCharts'
import { RevenueTable } from '@/components/chiffre-affaires/RevenueTable'
import { RevenueKpiDetailsModal } from '@/components/chiffre-affaires/RevenueKpiDetailsModal'
import { ExportRevenueButton } from '@/components/chiffre-affaires/ExportRevenueButton'
import { useToast } from '@/hooks/use-toast'
import { TrendingUp } from 'lucide-react'

const currentMonthKey = format(new Date(), 'yyyy-MM')

const DEFAULT_FILTERS: RevenueFilterState = {
  search: '',
  mandataire: 'all',
  monthKey: 'current',
  contractType: 'all',
  status: 'all',
  unepFilter: 'all',
  deferFilter: 'all',
}

export default function ChiffreAffairesPage() {
  const [rawDeals, setRawDeals] = useState<CommissionDeal[]>([])
  const [filters, setFilters] = useState<RevenueFilterState>(DEFAULT_FILTERS)
  const [editingDeal, setEditingDeal] = useState<CalculatedDeal | null>(null)
  const [kpiModalType, setKpiModalType] = useState<RevenueKpiCardType | null>(null)
  const [kpiModalOpen, setKpiModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function loadDeals() {
      try {
        const data = await fetchDeals()
        setRawDeals(data)
      } catch (err) {
        toast({
          title: 'Erreur de chargement',
          description: err instanceof Error ? err.message : 'Impossible de charger les affaires',
          variant: 'destructive',
        })
      }
    }
    loadDeals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allCalculated = useMemo(() => rawDeals.map(calculateDeal), [rawDeals])

  const availableMonths = useMemo(() => {
    const keys = new Set<string>()
    for (const d of allCalculated) {
      if (d.monthM) keys.add(d.monthM)
    }
    return Array.from(keys)
      .sort()
      .map(key => ({ key, label: formatMonthLabel(key) }))
  }, [allCalculated])

  const mandataires = useMemo(() => {
    const set = new Set<string>()
    for (const d of allCalculated) set.add(d.mandataireName)
    return Array.from(set).sort()
  }, [allCalculated])

  const monthFiltered = useMemo(() => {
    const { monthKey } = filters
    if (monthKey === 'all') return allCalculated
    const targetMonth = monthKey === 'current' ? currentMonthKey : monthKey
    return allCalculated.filter(d => d.monthM === targetMonth)
  }, [allCalculated, filters])

  const filteredDeals = useMemo(() => {
    let result = monthFiltered
    const q = filters.search.toLowerCase()
    if (q) {
      result = result.filter(d =>
        d.clientName.toLowerCase().includes(q) ||
        d.mandataireName.toLowerCase().includes(q)
      )
    }
    if (filters.mandataire !== 'all') {
      result = result.filter(d => d.mandataireName === filters.mandataire)
    }
    if (filters.contractType !== 'all') {
      result = result.filter(d => (d.contractType ?? 'ASSURANCE_VIE') === filters.contractType)
    }
    if (filters.status !== 'all') {
      result = result.filter(d => d.status === filters.status)
    }
    if (filters.unepFilter === 'oui') result = result.filter(d => d.needsUnepNegotiation)
    if (filters.unepFilter === 'non') result = result.filter(d => !d.needsUnepNegotiation)
    if (filters.deferFilter === 'oui') result = result.filter(d => d.deferToEndOfMonth)
    if (filters.deferFilter === 'non') result = result.filter(d => !d.deferToEndOfMonth)
    return result
  }, [monthFiltered, filters])

  const kpis = useMemo(() => calculateRevenueKpis(filteredDeals), [filteredDeals])

  const kpiModalDeals = useMemo(() => {
    if (!kpiModalType) return []
    return getDealsForRevenueKpi(kpiModalType, filteredDeals, kpis)
  }, [kpiModalType, filteredDeals, kpis])

  function handleKpiClick(type: RevenueKpiCardType) {
    setKpiModalType(type)
    setKpiModalOpen(true)
  }

  async function handleEditSave(data: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!editingDeal) return
    try {
      const updated = await updateDeal(editingDeal.id, data)
      setRawDeals(prev => prev.map(d => d.id === updated.id ? updated : d))
      toast({ title: 'Affaire modifiée avec succès', description: data.clientName, variant: 'default' })
    } catch (err) {
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : "Impossible de modifier l'affaire", variant: 'destructive' })
    } finally {
      setEditingDeal(null)
    }
  }

  const displayMonthLabel = useMemo(() => {
    if (filters.monthKey === 'all') return 'tous les mois'
    if (filters.monthKey === 'current') return formatMonthLabel(currentMonthKey)
    return formatMonthLabel(filters.monthKey)
  }, [filters.monthKey])

  return (
    <AuthGuard>
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Chiffre d'affaires</h1>
                <p className="text-xs text-slate-500">CA Assentis — {displayMonthLabel}</p>
              </div>
            </div>
            <NavigationTabs activePage="chiffre-affaires" />
          </div>
          <ExportRevenueButton deals={filteredDeals} />
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <RevenueKpiCards kpis={kpis} onClickCard={handleKpiClick} />

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <RevenueFilters
            filters={filters}
            onChange={setFilters}
            mandataires={mandataires}
            availableMonths={availableMonths}
          />
        </div>

        {/* Graphiques */}
        <RevenueCharts deals={filteredDeals} />

        {/* Tableau */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">
              Détail des affaires
              <span className="ml-2 text-slate-400 font-normal">({filteredDeals.length} affaire{filteredDeals.length !== 1 ? 's' : ''})</span>
            </h2>
          </div>
          <RevenueTable
            deals={filteredDeals}
            onEdit={deal => setEditingDeal(deal)}
          />
        </div>
      </main>

      {/* Modal KPI détails */}
      <RevenueKpiDetailsModal
        open={kpiModalOpen}
        onOpenChange={setKpiModalOpen}
        type={kpiModalType}
        deals={kpiModalDeals}
      />

      {/* Modal modification affaire */}
      <CommissionForm
        open={editingDeal !== null}
        onClose={() => setEditingDeal(null)}
        onSave={handleEditSave}
        initialData={editingDeal}
      />
    </div>
    </AuthGuard>
  )
}
