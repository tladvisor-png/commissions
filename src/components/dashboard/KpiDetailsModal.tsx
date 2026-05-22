"use client"

import { useState, useMemo } from 'react'
import { CalculatedDeal, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import { exportToCSV, exportToExcel } from '@/lib/export'
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
import { MessageSquare, CalendarClock, Search, FileSpreadsheet, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  deals: CalculatedDeal[]
}

export function KpiDetailsModal({ open, onOpenChange, title, deals }: KpiDetailsModalProps) {
  const [search, setSearch] = useState('')
  const [exportLoading, setExportLoading] = useState(false)

  const filteredDeals = useMemo(() => {
    if (!search.trim()) return deals
    const q = search.toLowerCase()
    return deals.filter(d =>
      d.clientName.toLowerCase().includes(q) ||
      d.mandataireName.toLowerCase().includes(q) ||
      (d.comment ?? '').toLowerCase().includes(q)
    )
  }, [deals, search])

  const totals = useMemo(() => ({
    pu: filteredDeals.reduce((s, d) => s + d.puAmount, 0),
    pp: filteredDeals.reduce((s, d) => s + d.ppAmount, 0),
    base: filteredDeals.reduce((s, d) => s + d.baseTotal, 0),
    payAtM: filteredDeals.reduce((s, d) => s + d.payAtM, 0),
    payAtMPlus1: filteredDeals.reduce((s, d) => s + d.payAtMPlus1, 0),
    caTotal: filteredDeals.reduce((s, d) => s + d.caTotal, 0),
  }), [filteredDeals])

  const totalBase = deals.reduce((s, d) => s + d.baseTotal, 0)

  async function handleExcelExport() {
    setExportLoading(true)
    try {
      await exportToExcel(deals)
    } catch {
      exportToCSV(deals)
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-800 pr-8">{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-slate-500">
              <span>
                {deals.length} affaire{deals.length !== 1 ? 's' : ''} concernée{deals.length !== 1 ? 's' : ''}
              </span>
              {deals.length > 0 && (
                <span className="ml-2 font-medium text-slate-600">
                  — Base totale : {formatCurrency(totalBase)}
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-3 border-b border-slate-100 flex-shrink-0 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher client, mandataire…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => exportToCSV(deals)}
              disabled={deals.length === 0}
            >
              <FileText className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="success"
              className="gap-1.5 text-xs"
              onClick={handleExcelExport}
              disabled={deals.length === 0 || exportLoading}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {exportLoading ? 'Export…' : 'Excel'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-3">
          {filteredDeals.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <p className="text-sm">Aucune affaire correspondante</p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    "Date d'effet", "Client", "Mandataire",
                    "Type contrat",
                    "PU", "PP", "Base réelle",
                    "Surcomm. M", "Surcomm. M+1",
                    "CA total",
                    "Statut", "Report FDM", "Taux élig.",
                  ].map(h => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.map(deal => (
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
                      {deal.effectiveDate
                        ? new Date(deal.effectiveDate).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">
                      {deal.clientName}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {deal.mandataireName}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {deal.contractType ? (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          {CONTRACT_TYPE_LABELS[deal.contractType] ?? deal.contractType}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          Assurance vie
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {deal.puAmount > 0
                        ? <span className="font-medium text-slate-800">{formatCurrency(deal.puAmount)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {deal.ppAmount > 0
                        ? <span className="font-medium text-slate-800">{formatCurrency(deal.ppAmount)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-slate-800">
                      {formatCurrency(deal.baseTotal)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-bold text-blue-700">
                      {formatCurrency(deal.payAtM)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {deal.payAtMPlus1 > 0
                        ? <span className="font-bold text-purple-700">{formatCurrency(deal.payAtMPlus1)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-bold text-violet-700">
                      {formatCurrency(deal.caTotal)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <StatusBadge status={deal.status} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      {deal.deferToEndOfMonth ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 border border-violet-200">
                          <CalendarClock className="h-3 w-3" />
                          Oui
                        </span>
                      ) : (
                        <span className="text-slate-300">Non</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        <span className={cn(
                          'text-xs font-semibold',
                          deal.needsUnepNegotiation ? 'text-orange-700' : 'text-slate-500'
                        )}>
                          {deal.surcommissionEligibilityRate} %
                        </span>
                        {deal.needsUnepNegotiation && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800 border border-orange-200 whitespace-nowrap">
                            <MessageSquare className="h-3 w-3" />
                            À négocier UNEP
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold text-slate-700">
                  <td className="px-3 py-2.5 text-xs uppercase tracking-wide" colSpan={4}>
                    Total ({filteredDeals.length} affaire{filteredDeals.length !== 1 ? 's' : ''})
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatCurrency(totals.pu)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatCurrency(totals.pp)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatCurrency(totals.base)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-blue-700">{formatCurrency(totals.payAtM)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-purple-700">{formatCurrency(totals.payAtMPlus1)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-violet-700">{formatCurrency(totals.caTotal)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
