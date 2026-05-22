"use client"

import { useState, useEffect, useMemo } from 'react'
import { CommissionDeal, CalculatedDeal, FilterState } from '@/types/commission'
import {
  calculateDeal,
  calculateKpis,
  calculateMonthlyStats,
  formatMonthLabel,
  getDealEncaissementStatus,
} from '@/lib/commission-calculations'
import {
  fetchDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  duplicateDeal,
  clearAllDeals,
  bulkCreateDeals,
  migrateLocalStorageDealsToSupabase,
  claimOrphanDeals,
} from '@/lib/deals-service'
import { AuthGuard } from '@/components/AuthGuard'
import { supabase } from '@/lib/supabase'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { MonthlyChart } from '@/components/dashboard/MonthlyChart'
import { CommissionTable } from '@/components/commissions/CommissionTable'
import { CommissionForm } from '@/components/commissions/CommissionForm'
import { CommissionFilters } from '@/components/commissions/CommissionFilters'
import { ExportButton } from '@/components/commissions/ExportButton'
import { ImportButton } from '@/components/commissions/ImportButton'
import { NavigationTabs } from '@/components/NavigationTabs'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Plus, BarChart3, TableProperties, ChevronDown, ChevronUp, TrendingUp, Database, UserCheck,
} from 'lucide-react'

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

export default function Home() {
  const [deals, setDeals] = useState<CommissionDeal[]>([])
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<CommissionDeal | null>(null)
  const [showChart, setShowChart] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [localStorageCount, setLocalStorageCount] = useState(0)
  const [showMigrateConfirm, setShowMigrateConfirm] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [showClaimConfirm, setShowClaimConfirm] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const { toast } = useToast()

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

  useEffect(() => {
    loadDeals()
    try {
      const raw = localStorage.getItem('commission_deals')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) setLocalStorageCount(parsed.length)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const calculatedDeals: CalculatedDeal[] = useMemo(
    () => deals.map(calculateDeal),
    [deals]
  )

  const filteredDeals: CalculatedDeal[] = useMemo(() => {
    return calculatedDeals.filter(deal => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !deal.clientName.toLowerCase().includes(q) &&
          !deal.mandataireName.toLowerCase().includes(q) &&
          !(deal.comment ?? '').toLowerCase().includes(q)
        ) return false
      }
      if (filters.mandataire && deal.mandataireName !== filters.mandataire) return false
      if (filters.monthM && deal.monthM !== filters.monthM) return false
      if (filters.status && deal.status !== filters.status) return false
      if (filters.deferToEndOfMonth !== '') {
        const expected = filters.deferToEndOfMonth === 'true'
        if (deal.deferToEndOfMonth !== expected) return false
      }
      if (filters.unepFilter === 'unep' && !deal.needsUnepNegotiation) return false
      if (filters.unepFilter === 'no_unep' && deal.needsUnepNegotiation) return false
      if (filters.encaissementFilter) {
        const rawDeal = deals.find(d => d.id === deal.id)
        if (rawDeal) {
          const encStatus = getDealEncaissementStatus(rawDeal)
          if (encStatus !== filters.encaissementFilter) return false
        }
      }
      return true
    })
  }, [calculatedDeals, deals, filters])

  const kpiStats = useMemo(() => calculateKpis(filteredDeals), [filteredDeals])
  const monthlyStats = useMemo(() => calculateMonthlyStats(filteredDeals), [filteredDeals])

  const mandataires = useMemo(() => {
    const set = new Set(calculatedDeals.map(d => d.mandataireName))
    return Array.from(set).sort()
  }, [calculatedDeals])

  const months = useMemo(() => {
    const set = new Set(calculatedDeals.map(d => d.monthM).filter(Boolean))
    return Array.from(set).sort()
  }, [calculatedDeals])

  async function handleFormSave(data: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    setIsSaving(true)
    try {
      if (editingDeal) {
        const updated = await updateDeal(editingDeal.id, data)
        setDeals(prev => prev.map(d => d.id === updated.id ? updated : d))
        toast({ title: 'Affaire modifiée avec succès', description: data.clientName, variant: 'default' })
      } else {
        const newDeal = await createDeal(data)
        setDeals(prev => [...prev, newDeal])
        toast({ title: 'Affaire enregistrée dans Supabase', description: `${data.clientName} — ${data.mandataireName}`, variant: 'success' })
      }
      setIsFormOpen(false)
      setEditingDeal(null)
    } catch (err) {
      toast({
        title: 'Erreur Supabase',
        description: err instanceof Error ? err.message : "Impossible de sauvegarder l'affaire",
        variant: 'destructive',
      })
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  function handleEdit(deal: CalculatedDeal) {
    const original = deals.find(d => d.id === deal.id)
    if (original) {
      setEditingDeal(original)
      setIsFormOpen(true)
    }
  }

  async function handleDelete(id: string) {
    const deal = deals.find(d => d.id === id)
    setDeals(prev => prev.filter(d => d.id !== id))
    try {
      await deleteDeal(id)
      toast({ title: 'Affaire supprimée', description: deal?.clientName, variant: 'destructive' })
    } catch (err) {
      if (deal) setDeals(prev => [...prev, deal])
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : "Impossible de supprimer l'affaire", variant: 'destructive' })
    }
  }

  async function handleDuplicate(id: string) {
    setIsSaving(true)
    try {
      const copy = await duplicateDeal(id)
      setDeals(prev => [...prev, copy])
      toast({ title: 'Affaire dupliquée', description: copy.clientName, variant: 'default' })
    } catch (err) {
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : "Impossible de dupliquer l'affaire", variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleInstance(id: string, value: boolean) {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, isInstance: value } : d))
    try {
      await updateDeal(id, { isInstance: value })
    } catch (err) {
      setDeals(prev => prev.map(d => d.id === id ? { ...d, isInstance: !value } : d))
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' })
    }
  }

  async function handleToggleContractOk(id: string, value: boolean) {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, isContractOk: value } : d))
    try {
      await updateDeal(id, { isContractOk: value })
    } catch (err) {
      setDeals(prev => prev.map(d => d.id === id ? { ...d, isContractOk: !value } : d))
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' })
    }
  }

  async function handleDeferToEndOfMonth(ids: string[], value: boolean) {
    setDeals(prev => prev.map(d => ids.includes(d.id) ? { ...d, deferToEndOfMonth: value } : d))
    try {
      await Promise.all(ids.map(id => updateDeal(id, { deferToEndOfMonth: value })))
      const label = value ? 'Reportées fin de mois' : 'Report annulé'
      toast({
        title: label,
        description: `${ids.length} affaire${ids.length > 1 ? 's' : ''} mise${ids.length > 1 ? 's' : ''} à jour`,
        variant: 'default',
      })
    } catch (err) {
      setDeals(prev => prev.map(d => ids.includes(d.id) ? { ...d, deferToEndOfMonth: !value } : d))
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' })
    }
  }

  async function handleBulkDelete(ids: string[]) {
    const removed = deals.filter(d => ids.includes(d.id))
    setDeals(prev => prev.filter(d => !ids.includes(d.id)))
    try {
      await Promise.all(ids.map(id => deleteDeal(id)))
      toast({
        title: `${ids.length} affaire${ids.length > 1 ? 's' : ''} supprimée${ids.length > 1 ? 's' : ''}`,
        variant: 'destructive',
      })
    } catch (err) {
      setDeals(prev => [...prev, ...removed])
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Erreur lors de la suppression', variant: 'destructive' })
    }
  }

  async function handleImport(imported: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>[]) {
    setIsSaving(true)
    try {
      const newDeals = await bulkCreateDeals(imported)
      setDeals(prev => [...prev, ...newDeals])
      toast({ title: `${newDeals.length} affaires importées`, variant: 'success' })
    } catch (err) {
      toast({ title: "Erreur d'import", description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  function handleFormClose() {
    setIsFormOpen(false)
    setEditingDeal(null)
  }

  async function handleTestSupabase() {
    try {
      const { count, error } = await supabase
        .from('commission_deals')
        .select('*', { count: 'exact', head: true })
      if (error) throw error
      toast({
        title: 'Connexion Supabase OK',
        description: `${count ?? 0} affaire(s) en base`,
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: 'Erreur Supabase',
        description: err instanceof Error ? err.message : 'Connexion échouée',
        variant: 'destructive',
      })
    }
  }

  async function handleResetAllData() {
    try {
      await clearAllDeals()
      setDeals([])
      setShowResetConfirm(false)
      setFilters(defaultFilters)
      toast({ title: 'Données réinitialisées', description: 'Toutes les affaires ont été supprimées.', variant: 'destructive' })
    } catch (err) {
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible de réinitialiser', variant: 'destructive' })
    }
  }

  async function handleMigrate() {
    setIsMigrating(true)
    try {
      const count = await migrateLocalStorageDealsToSupabase()
      const newDeals = await fetchDeals()
      setDeals(newDeals)
      setLocalStorageCount(0)
      setShowMigrateConfirm(false)
      toast({
        title: 'Migration réussie',
        description: `${count} affaire${count > 1 ? 's' : ''} migrée${count > 1 ? 's' : ''} vers Supabase`,
        variant: 'success',
      })
    } catch (err) {
      toast({ title: 'Erreur de migration', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' })
    } finally {
      setIsMigrating(false)
    }
  }

  async function handleClaimOrphanDeals() {
    setIsClaiming(true)
    try {
      const count = await claimOrphanDeals()
      const newDeals = await fetchDeals()
      setDeals(newDeals)
      setShowClaimConfirm(false)
      toast({
        title: 'Affaires rattachées',
        description: count > 0
          ? `${count} affaire${count > 1 ? 's' : ''} rattachée${count > 1 ? 's' : ''} à votre compte`
          : 'Aucune affaire sans propriétaire trouvée',
        variant: count > 0 ? 'success' : 'default',
      })
    } catch (err) {
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' })
    } finally {
      setIsClaiming(false)
    }
  }

  if (!isLoaded) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-slate-600" />
            <p className="text-slate-500 text-sm">Chargement...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  return (
    <AuthGuard>
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="bg-slate-800 text-white rounded-xl p-2">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-800 leading-none">
                    Pilotage Commissionnement
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">Réseau Mandataires</p>
                </div>
              </div>
              <NavigationTabs activePage="dashboard" />
            </div>

            <div className="flex items-center gap-2">
              <ImportButton onImport={handleImport} />
              <ExportButton deals={filteredDeals} />
              <Button
                onClick={() => { setEditingDeal(null); setIsFormOpen(true) }}
                disabled={isSaving}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Nouvelle affaire
              </Button>
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
                Tableau de bord
                {hasActiveFilters && (
                  <span className="ml-2 text-xs font-normal text-orange-500 normal-case">(filtres actifs)</span>
                )}
              </h2>
            </div>
            <p className="text-xs text-slate-400">{filteredDeals.length} affaires affichées sur {deals.length}</p>
          </div>
          <KpiCards stats={kpiStats} deals={filteredDeals} />
        </section>

        {/* Vue mensuelle */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <button
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 rounded-xl transition-colors"
            onClick={() => setShowChart(v => !v)}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">Vue mensuelle des surcommissions</h2>
              <span className="text-xs text-slate-400">({monthlyStats.length} mois)</span>
            </div>
            {showChart ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showChart && (
            <div className="px-6 pb-6">
              <MonthlyChart data={monthlyStats} />
            </div>
          )}
        </section>

        {/* Tableau principal */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TableProperties className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Suivi des affaires</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-200 border-l-2 border-red-400"></span>
                  Instance
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-green-200 border-l-2 border-green-400"></span>
                  OK
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-orange-200 border-l-2 border-orange-400"></span>
                  À valider
                </span>
              </div>
            </div>

            <CommissionFilters
              filters={filters}
              onChange={setFilters}
              mandataires={mandataires}
              months={months}
              monthLabel={formatMonthLabel}
            />
          </div>

          <div className="p-6">
            <CommissionTable
              deals={filteredDeals}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onToggleInstance={handleToggleInstance}
              onToggleContractOk={handleToggleContractOk}
              onDeferToEndOfMonth={handleDeferToEndOfMonth}
              onBulkDelete={handleBulkDelete}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="flex items-center justify-between text-xs text-slate-400 py-4">
          <span>Pilotage Commissionnement Mandataires — Données synchronisées avec Supabase</span>
          <div className="flex items-center gap-4">
            {/* Test Supabase */}
            <button
              className="flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors underline-offset-2 hover:underline"
              onClick={handleTestSupabase}
            >
              <Database className="h-3 w-3" />
              Tester Supabase
            </button>

            {/* Rattacher les anciennes affaires */}
            {!showClaimConfirm ? (
              <button
                className="flex items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors underline-offset-2 hover:underline"
                onClick={() => setShowClaimConfirm(true)}
              >
                <UserCheck className="h-3 w-3" />
                Rattacher mes anciennes affaires
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-medium">
                  Rattacher toutes les affaires sans propriétaire à mon compte ?
                </span>
                <button
                  className="text-emerald-600 font-semibold hover:text-emerald-700 underline disabled:opacity-50"
                  onClick={handleClaimOrphanDeals}
                  disabled={isClaiming}
                >
                  {isClaiming ? 'En cours...' : 'Confirmer'}
                </button>
                <button
                  className="text-slate-500 hover:text-slate-700"
                  onClick={() => setShowClaimConfirm(false)}
                  disabled={isClaiming}
                >
                  Annuler
                </button>
              </div>
            )}

            {/* Migration localStorage */}
            {localStorageCount > 0 && (
              <div className="flex items-center gap-2">
                {!showMigrateConfirm ? (
                  <button
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700 transition-colors underline-offset-2 hover:underline"
                    onClick={() => setShowMigrateConfirm(true)}
                  >
                    <Database className="h-3 w-3" />
                    Migrer {localStorageCount} donnée{localStorageCount > 1 ? 's' : ''} locale{localStorageCount > 1 ? 's' : ''} vers Supabase
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-medium">
                      Migrer {localStorageCount} affaire{localStorageCount > 1 ? 's' : ''} vers Supabase ?
                    </span>
                    <button
                      className="text-blue-600 font-semibold hover:text-blue-700 underline disabled:opacity-50"
                      onClick={handleMigrate}
                      disabled={isMigrating}
                    >
                      {isMigrating ? 'Migration...' : 'Confirmer'}
                    </button>
                    <button
                      className="text-slate-500 hover:text-slate-700"
                      onClick={() => setShowMigrateConfirm(false)}
                      disabled={isMigrating}
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Réinitialisation */}
            {!showResetConfirm ? (
              <button
                className="text-slate-400 hover:text-red-500 transition-colors underline-offset-2 hover:underline"
                onClick={() => setShowResetConfirm(true)}
              >
                Réinitialiser les données
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-medium">Supprimer toutes les affaires ?</span>
                <button
                  className="text-red-600 font-semibold hover:text-red-700 underline"
                  onClick={handleResetAllData}
                >
                  Confirmer
                </button>
                <button
                  className="text-slate-500 hover:text-slate-700"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </footer>
      </main>

      {/* Form modal */}
      <CommissionForm
        open={isFormOpen}
        onClose={handleFormClose}
        onSave={handleFormSave}
        initialData={editingDeal}
      />
    </div>
    </AuthGuard>
  )
}
