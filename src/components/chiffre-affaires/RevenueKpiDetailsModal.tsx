"use client"

import { useState, useMemo } from 'react'
import { CalculatedDeal, RevenueKpiCardType, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import { exportRevenueToExcel } from '@/lib/export'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/commissions/StatusBadge'
import { Search, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const TITLES: Record<RevenueKpiCardType, string> = {
  CA_TOTAL: 'CA total Assentis',
  CA_PU: 'Affaires avec CA PU',
  CA_PP: 'Affaires avec CA PP',
  DEAL_COUNT: 'Toutes les affaires',
  TICKET_MOYEN: 'Toutes les affaires (ticket moyen)',
  BEST_MANDATAIRE: 'Affaires du meilleur mandataire',
  BEST_CONTRACT: 'Affaires du type de contrat le plus rentable',
  AVG_FEES_PU: 'Affaires avec frais PU',
  AVG_FEES_PP: 'Affaires avec frais PP',
}

interface RevenueKpiDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: RevenueKpiCardType | null
  deals: CalculatedDeal[]
}

export function RevenueKpiDetailsModal({ open, onOpenChange, type, deals }: RevenueKpiDetailsModalProps) {
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return deals
    const q = search.toLowerCase()
    return deals.filter(d =>
      d.clientName.toLowerCase().includes(q) ||
      d.mandataireName.toLowerCase().includes(q)
    )
  }, [deals, search])

  const totals = useMemo(() => ({
    pu: filtered.reduce((s, d) => s + d.puAmount, 0),
    pp: filtered.reduce((s, d) => s + d.ppAmount, 0),
    caPU: filtered.reduce((s, d) => s + d.caPU, 0),
    caPP: filtered.reduce((s, d) => s + d.caPP, 0),
    caTotal: filtered.reduce((s, d) => s + d.caTotal, 0),
  }), [filtered])

  async function handleExport() {
    setExporting(true)
    try { await exportRevenueToExcel(deals) } finally { setExporting(false) }
  }

  const title = type ? TITLES[type] : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-800 pr-8">{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-slate-500">
              {deals.length} affaire{deals.length !== 1 ? 's' : ''} — CA total :{' '}
              <span className="font-medium text-violet-700">
                {formatCurrency(deals.reduce((s, d) => s + d.caTotal, 0))}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-3 border-b border-slate-100 flex-shrink-0 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs ml-auto"
            onClick={handleExport}
            disabled={deals.length === 0 || exporting}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {exporting ? 'Export…' : 'Exporter'}
          </Button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-3">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              Aucune affaire correspondante
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Date d'effet", "Mois", "Client", "Mandataire", "Type contrat", "PU", "PP", "CA PU", "CA PP", "CA total", "Statut"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(deal => {
                  let moisLabel = deal.monthM
                  try {
                    const [yr, mo] = deal.monthM.split('-')
                    moisLabel = format(new Date(parseInt(yr), parseInt(mo) - 1, 1), 'MMM yyyy', { locale: fr })
                  } catch { /* keep default */ }
                  return (
                    <tr
                      key={deal.id}
                      className={cn(
                        'transition-colors',
                        deal.isInstance
                          ? 'bg-red-50 hover:bg-red-100'
                          : deal.isContractOk
                          ? 'bg-green-50 hover:bg-green-100'
                          : 'bg-orange-50 hover:bg-orange-100'
                      )}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                        {deal.effectiveDate ? new Date(deal.effectiveDate).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{moisLabel}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">{deal.clientName}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {deal.mandataireName}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          {deal.contractType ? (CONTRACT_TYPE_LABELS[deal.contractType] ?? deal.contractType) : 'Assurance vie'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        {deal.puAmount > 0 ? <span className="font-medium text-slate-800">{formatCurrency(deal.puAmount)}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        {deal.ppAmount > 0 ? <span className="font-medium text-slate-800">{formatCurrency(deal.ppAmount)}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-violet-700">
                        {deal.caPU > 0 ? formatCurrency(deal.caPU) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-violet-600">
                        {deal.caPP > 0 ? formatCurrency(deal.caPP) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right font-bold text-violet-800">
                        {formatCurrency(deal.caTotal)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusBadge status={deal.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold text-slate-700">
                  <td className="px-3 py-2.5 text-xs uppercase tracking-wide" colSpan={5}>
                    Total ({filtered.length} affaire{filtered.length !== 1 ? 's' : ''})
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatCurrency(totals.pu)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatCurrency(totals.pp)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-violet-700">{formatCurrency(totals.caPU)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-violet-600">{formatCurrency(totals.caPP)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-violet-800">{formatCurrency(totals.caTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
