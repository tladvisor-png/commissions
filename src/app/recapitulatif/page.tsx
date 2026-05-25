"use client"

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { CommissionDeal, RecapFilterState, RecapKpiType } from '@/types/commission'
import {
  getMonthlyRecap,
  getProducedSurcommissionEntries,
  getCollectibleSurcommissionEntries,
  getPaidSurcommissionEntries,
  getRemainingToCollectEntries,
  getProducedRevenueDeals,
  getEstimatedCollectedRevenueDeals,
  formatMonthLabel,
} from '@/lib/commission-calculations'
import { fetchDeals } from '@/lib/deals-service'
import { AuthGuard } from '@/components/AuthGuard'
import { NavigationTabs } from '@/components/NavigationTabs'
import { RecapKpiCards } from '@/components/recapitulatif/RecapKpiCards'
import { RecapFilters } from '@/components/recapitulatif/RecapFilters'
import { RecapTable } from '@/components/recapitulatif/RecapTable'
import { RecapChart } from '@/components/recapitulatif/RecapChart'
import { RecapDetailsModal } from '@/components/recapitulatif/RecapDetailsModal'
import { ExportRecapButton } from '@/components/recapitulatif/ExportRecapButton'
import { useToast } from '@/hooks/use-toast'
import { BarChart2, TableProperties, BarChart3 } from 'lucide-react'

const currentMonthKey = format(new Date(), 'yyyy-MM')

export default function RecapitulatifPage() {
  const [deals, setDeals] = useState<CommissionDeal[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [filters, setFilters] = useState<RecapFilterState>({ monthKey: currentMonthKey })
  const [kpiModalType, setKpiModalType] = useState<RecapKpiType | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function loadDeals() {
      try {
        const data = await fetchDeals()
        setDeals(data)
      } catch (err) {
        toast({
          title: 'Erreur de chargement',
          description: err instanceof Error ? err.message : 'Impossible de charger les affaires',
          variant: 'destructive',
        })
      } finally {
        setIsLoaded(true)
      }
    }
    loadDeals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allRecaps = useMemo(() => getMonthlyRecap(deals), [deals])

  const availableMonths = useMemo(() => allRecaps.map(r => r.monthKey), [allRecaps])

  const displayedRecaps = useMemo(() => {
    if (filters.monthKey === 'all') return allRecaps
    return allRecaps.filter(r => r.monthKey === filters.monthKey)
  }, [allRecaps, filters.monthKey])

  const selectedMonthKey = filters.monthKey === 'all' ? '' : filters.monthKey
  const selectedRecap = useMemo(() => {
    if (filters.monthKey === 'all') return null
    return allRecaps.find(r => r.monthKey === filters.monthKey) ?? null
  }, [allRecaps, filters.monthKey])

  const selectedMonthLabel = useMemo(() => {
    if (filters.monthKey === 'all') return 'Tous les mois'
    return formatMonthLabel(filters.monthKey)
  }, [filters.monthKey])

  const modalMonthKey = filters.monthKey === 'all' ? currentMonthKey : filters.monthKey

  const surcoProduiteEntries = useMemo(
    () => getProducedSurcommissionEntries(deals, modalMonthKey),
    [deals, modalMonthKey]
  )
  const surcoEncaissableEntries = useMemo(
    () => getCollectibleSurcommissionEntries(deals, modalMonthKey),
    [deals, modalMonthKey]
  )
  const surcoEncaisseeEntries = useMemo(
    () => getPaidSurcommissionEntries(deals, modalMonthKey),
    [deals, modalMonthKey]
  )
  const remainingEntries = useMemo(
    () => getRemainingToCollectEntries(deals, modalMonthKey),
    [deals, modalMonthKey]
  )
  const caProduiteDeals = useMemo(
    () => getProducedRevenueDeals(deals, modalMonthKey),
    [deals, modalMonthKey]
  )
  const caEncaisseDeals = useMemo(
    () => getEstimatedCollectedRevenueDeals(deals, modalMonthKey),
    [deals, modalMonthKey]
  )

  const modalMonthLabel = formatMonthLabel(modalMonthKey)

  if (!isLoaded) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-teal-600" />
            <p className="text-slate-500 text-sm">Chargement...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="bg-teal-700 text-white rounded-xl p-2">
                    <BarChart2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-slate-800 leading-none">
                      Récapitulatif
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Synthèse mensuelle — {selectedMonthLabel}
                    </p>
                  </div>
                </div>
                <NavigationTabs activePage="recapitulatif" />
              </div>

              <div className="flex items-center gap-2">
                <ExportRecapButton recaps={displayedRecaps} />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Filtres */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <RecapFilters
              filters={filters}
              onChange={setFilters}
              availableMonths={availableMonths}
            />
          </div>

          {/* KPI Cards — uniquement si un mois est sélectionné */}
          {filters.monthKey !== 'all' && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                  KPI du mois
                </h2>
                <span className="text-xs text-slate-400">— {selectedMonthLabel}</span>
              </div>
              <RecapKpiCards
                recap={selectedRecap}
                monthLabel={selectedMonthLabel}
                onClickKpi={type => setKpiModalType(type)}
              />
            </section>
          )}

          {/* Tableau récapitulatif */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableProperties className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">
                  Tableau récapitulatif mensuel
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                {displayedRecaps.length} mois
              </p>
            </div>
            <div className="p-4">
              <RecapTable recaps={displayedRecaps} selectedMonthKey={selectedMonthKey} />
            </div>
          </section>

          {/* Graphique */}
          {allRecaps.length > 1 && (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">
                  Évolution mensuelle
                </h2>
              </div>
              <RecapChart recaps={allRecaps} />
            </section>
          )}

          <footer className="text-xs text-slate-400 py-4 text-center">
            Récapitulatif — Données synchronisées avec Supabase
          </footer>
        </main>

        {/* Modal détails KPI */}
        <RecapDetailsModal
          kpiType={kpiModalType}
          monthKey={modalMonthKey}
          monthLabel={modalMonthLabel}
          surcoProduiteEntries={surcoProduiteEntries}
          surcoEncaissableEntries={surcoEncaissableEntries}
          surcoEncaisseeEntries={surcoEncaisseeEntries}
          remainingEntries={remainingEntries}
          caProduiteDeals={caProduiteDeals}
          caEncaisseDeals={caEncaisseDeals}
          open={kpiModalType !== null}
          onClose={() => setKpiModalType(null)}
        />
      </div>
    </AuthGuard>
  )
}
