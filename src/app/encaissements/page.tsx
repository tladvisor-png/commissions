"use client"

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { CommissionDeal, EncaissementEntry, EncaissementFilterState, PaymentStatusDetail } from '@/types/commission'
import {
  getEncaissementEntries,
  calculateEncaissementKpis,
  formatMonthLabel,
} from '@/lib/commission-calculations'
import { fetchDeals, updatePaymentStatus, deferPaymentToNextMonth, cancelPaymentDeferral } from '@/lib/deals-service'
import { NavigationTabs } from '@/components/NavigationTabs'
import { AuthGuard } from '@/components/AuthGuard'
import { EncaissementsKpiCards } from '@/components/encaissements/EncaissementsKpiCards'
import { EncaissementsTable } from '@/components/encaissements/EncaissementsTable'
import { EncaissementsFilters } from '@/components/encaissements/EncaissementsFilters'
import { PaymentStatusModal } from '@/components/encaissements/PaymentStatusModal'
import { UnpaidDetailsModal } from '@/components/encaissements/UnpaidDetailsModal'
import { DeferPaymentModal } from '@/components/encaissements/DeferPaymentModal'
import { EncaissementsKpiDetailsModal, EncaissementKpiType } from '@/components/encaissements/EncaissementsKpiDetailsModal'
import { ExportEncaissementsButton } from '@/components/encaissements/ExportEncaissementsButton'
import { useToast } from '@/hooks/use-toast'
import { Wallet, TableProperties, BarChart3 } from 'lucide-react'

export default function EncaissementsPage() {
  const [deals, setDeals] = useState<CommissionDeal[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [paymentModalEntry, setPaymentModalEntry] = useState<EncaissementEntry | null>(null)
  const [deferModalEntry, setDeferModalEntry] = useState<EncaissementEntry | null>(null)
  const [showUnpaidModal, setShowUnpaidModal] = useState(false)
  const [kpiModalType, setKpiModalType] = useState<EncaissementKpiType | null>(null)
  const { toast } = useToast()

  const currentMonthKey = format(new Date(), 'yyyy-MM')

  const [filters, setFilters] = useState<EncaissementFilterState>({
    search: '',
    mandataire: '',
    monthKey: currentMonthKey,
    paymentStatus: 'unpaid',
  })

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

  const allEntries = useMemo(() => getEncaissementEntries(deals), [deals])

  const availableMonths = useMemo(() => {
    const set = new Set(allEntries.map(e => e.paymentMonthKey).filter(Boolean))
    return Array.from(set).sort()
  }, [allEntries])

  const availableMandataires = useMemo(() => {
    const set = new Set(deals.map(d => d.mandataireName))
    return Array.from(set).sort()
  }, [deals])

  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      if (filters.monthKey && entry.paymentMonthKey !== filters.monthKey) return false
      if (filters.paymentStatus === 'paid' && !entry.isPaid) return false
      if (filters.paymentStatus === 'unpaid' && entry.isPaid) return false
      if (filters.paymentStatus === 'with_variance') {
        // Uniquement les échéances payées avec un écart de paiement
        if (!entry.isPaid) return false
        if (entry.paidAmount === null) return false
        if (Math.abs(entry.paidAmount - entry.expectedAmount) <= 0.01) return false
      }
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !entry.clientName.toLowerCase().includes(q) &&
          !entry.mandataireName.toLowerCase().includes(q)
        ) return false
      }
      if (filters.mandataire && entry.mandataireName !== filters.mandataire) return false
      return true
    })
  }, [allEntries, filters])

  const kpiEntries = useMemo(() => {
    return allEntries.filter(entry => {
      if (filters.monthKey && entry.paymentMonthKey !== filters.monthKey) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !entry.clientName.toLowerCase().includes(q) &&
          !entry.mandataireName.toLowerCase().includes(q)
        ) return false
      }
      if (filters.mandataire && entry.mandataireName !== filters.mandataire) return false
      return true
    })
  }, [allEntries, filters])

  const kpiStats = useMemo(() => calculateEncaissementKpis(kpiEntries), [kpiEntries])

  const unpaidEntries = useMemo(() => {
    return allEntries.filter(e => {
      if (!e.isPaid) {
        if (filters.monthKey && e.paymentMonthKey !== filters.monthKey) return false
        if (filters.mandataire && e.mandataireName !== filters.mandataire) return false
        return true
      }
      return false
    })
  }, [allEntries, filters.monthKey, filters.mandataire])

  const selectedMonthLabel = filters.monthKey ? formatMonthLabel(filters.monthKey) : 'Tous les mois'

  async function handleSavePayment(dealId: string, paymentType: 'M' | 'M_PLUS_1', status: PaymentStatusDetail) {
    try {
      const updated = await updatePaymentStatus(dealId, paymentType, status)
      setDeals(prev => prev.map(d => d.id === updated.id ? updated : d))
      setPaymentModalEntry(null)
      toast({
        title: status.paid ? 'Paiement enregistré' : 'Paiement annulé',
        description: status.paid
          ? `Encaissement confirmé le ${status.paidDate}`
          : 'Statut remis à "Non payé"',
        variant: status.paid ? 'success' : 'default',
      })
    } catch (err) {
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible de mettre à jour le paiement', variant: 'destructive' })
    }
  }

  function handleMarkPaid(entry: EncaissementEntry) {
    setPaymentModalEntry(entry)
    setShowUnpaidModal(false)
    setKpiModalType(null)
  }

  function handleEditPayment(entry: EncaissementEntry) {
    setPaymentModalEntry(entry)
  }

  async function handleDefer(entry: EncaissementEntry) {
    setDeferModalEntry(entry)
  }

  async function handleSaveDefer(dealId: string, paymentType: 'M' | 'M_PLUS_1', reason: string | null) {
    try {
      const updated = await deferPaymentToNextMonth(dealId, paymentType, reason)
      setDeals(prev => prev.map(d => d.id === updated.id ? updated : d))
      setDeferModalEntry(null)
      toast({
        title: 'Échéance reportée',
        description: 'L\'échéance a été reportée au mois suivant.',
        variant: 'success',
      })
    } catch (err) {
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible de reporter l\'échéance', variant: 'destructive' })
    }
  }

  async function handleCancelDeferral(entry: EncaissementEntry) {
    if (!window.confirm(`Annuler le report de "${entry.clientName}" ?\n\nL'échéance reviendra au mois initial : ${entry.initialPaymentMonthLabel}.`)) return
    try {
      const updated = await cancelPaymentDeferral(entry.dealId, entry.paymentType)
      setDeals(prev => prev.map(d => d.id === updated.id ? updated : d))
      toast({
        title: 'Report annulé',
        description: `${entry.clientName} — retour au mois ${entry.initialPaymentMonthLabel}`,
        variant: 'default',
      })
    } catch (err) {
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible d\'annuler le report', variant: 'destructive' })
    }
  }

  async function handleCancelPayment(entry: EncaissementEntry) {
    try {
      const updated = await updatePaymentStatus(entry.dealId, entry.paymentType, {
        paid: false,
        paidDate: null,
        paidAmount: null,
        comment: null,
      })
      setDeals(prev => prev.map(d => d.id === updated.id ? updated : d))
      toast({ title: 'Paiement annulé', description: `${entry.clientName} — ${entry.paymentMonthLabel}`, variant: 'default' })
    } catch (err) {
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible d\'annuler le paiement', variant: 'destructive' })
    }
  }

  if (!isLoaded) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-emerald-600" />
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
                <div className="bg-emerald-700 text-white rounded-xl p-2">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-800 leading-none">
                    Encaissements
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Surcommissions réelles — {selectedMonthLabel}
                  </p>
                </div>
              </div>
              <NavigationTabs activePage="encaissements" />
            </div>

            <div className="flex items-center gap-2">
              <ExportEncaissementsButton entries={filteredEntries} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* KPI Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                Tableau de bord encaissements
              </h2>
              {filters.monthKey && (
                <span className="text-xs text-slate-400">— {selectedMonthLabel}</span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {kpiEntries.length} échéance{kpiEntries.length > 1 ? 's' : ''} sur ce mois
            </p>
          </div>

          <EncaissementsKpiCards
            stats={kpiStats}
            monthLabel={selectedMonthLabel}
            onClickExpected={() => setKpiModalType('expected')}
            onClickPaid={() => setKpiModalType('paid')}
            onClickDelta={() => setKpiModalType('remaining_total')}
            onClickPaidCount={() => setKpiModalType('paid_count')}
            onClickUnpaidCount={() => setKpiModalType('unpaid_count')}
            onClickVariance={() => setKpiModalType('variance')}
            onClickDeferred={() => setKpiModalType('deferred')}
          />
        </section>

        {/* Table section */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TableProperties className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Échéances de surcommission</h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border-l-2 border-emerald-400"></span>
                  Payée
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border-l-2 border-amber-400"></span>
                  Écart
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border-l-2 border-red-400"></span>
                  Instance
                </span>
              </div>
            </div>

            <EncaissementsFilters
              filters={filters}
              onChange={setFilters}
              mandataires={availableMandataires}
              availableMonths={availableMonths}
            />
          </div>

          <div className="p-6">
            <EncaissementsTable
              entries={filteredEntries}
              onMarkPaid={handleMarkPaid}
              onEditPayment={handleEditPayment}
              onCancelPayment={handleCancelPayment}
              onDefer={handleDefer}
              onCancelDeferral={handleCancelDeferral}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="text-xs text-slate-400 py-4 text-center">
          Encaissements — Données synchronisées avec Supabase
        </footer>
      </main>

      {/* Modals */}
      <PaymentStatusModal
        entry={paymentModalEntry}
        open={paymentModalEntry !== null}
        onClose={() => setPaymentModalEntry(null)}
        onSave={handleSavePayment}
      />

      <DeferPaymentModal
        entry={deferModalEntry}
        open={deferModalEntry !== null}
        onClose={() => setDeferModalEntry(null)}
        onConfirm={handleSaveDefer}
      />

      <UnpaidDetailsModal
        entries={unpaidEntries}
        open={showUnpaidModal}
        onClose={() => setShowUnpaidModal(false)}
        onMarkPaid={handleMarkPaid}
        monthLabel={selectedMonthLabel}
      />

      <EncaissementsKpiDetailsModal
        kpiType={kpiModalType}
        entries={kpiEntries}
        open={kpiModalType !== null}
        onClose={() => setKpiModalType(null)}
        monthLabel={selectedMonthLabel}
        onMarkPaid={handleMarkPaid}
      />
    </div>
    </AuthGuard>
  )
}
