"use client"

import { useState, useMemo } from 'react'
import { EncaissementEntry, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import { exportEncaissementsToCSV, exportEncaissementsToExcel } from '@/lib/export'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle, CheckCircle, Clock, CalendarClock, MessageSquare,
  FileSpreadsheet, FileText, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type EncaissementKpiType =
  | 'expected'
  | 'paid'
  | 'unpaid'
  | 'paid_count'
  | 'unpaid_count'
  | 'variance'

const MODAL_TITLES: Record<EncaissementKpiType, string> = {
  expected: 'Surcommissions attendues',
  paid: 'Surcommissions payées',
  unpaid: 'Delta non payé — Échéances restantes',
  paid_count: 'Échéances payées',
  unpaid_count: 'Échéances non payées',
  variance: 'Écarts de paiement',
}

interface EncaissementsKpiDetailsModalProps {
  kpiType: EncaissementKpiType | null
  entries: EncaissementEntry[]
  open: boolean
  onClose: () => void
  monthLabel: string
  onMarkPaid?: (entry: EncaissementEntry) => void
}

function StatusBadgeMini({ isInstance, isContractOk }: { isInstance: boolean; isContractOk: boolean }) {
  if (isInstance) return (
    <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap">
      <AlertTriangle className="h-2.5 w-2.5" />Instance
    </Badge>
  )
  if (isContractOk) return (
    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap">
      <CheckCircle className="h-2.5 w-2.5" />OK
    </Badge>
  )
  return (
    <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap">
      <Clock className="h-2.5 w-2.5" />À valider
    </Badge>
  )
}

function filterEntries(type: EncaissementKpiType, entries: EncaissementEntry[]): EncaissementEntry[] {
  switch (type) {
    case 'expected': return entries
    case 'paid': return entries.filter(e => e.isPaid)
    case 'unpaid': return entries.filter(e => !e.isPaid)
    case 'paid_count': return entries.filter(e => e.isPaid)
    case 'unpaid_count': return entries.filter(e => !e.isPaid)
    case 'variance': return entries.filter(e => e.isPaid && e.paidAmount !== null && Math.abs(e.paidAmount - e.expectedAmount) > 0.01)
    default: return entries
  }
}

export function EncaissementsKpiDetailsModal({
  kpiType,
  entries,
  open,
  onClose,
  monthLabel,
  onMarkPaid,
}: EncaissementsKpiDetailsModalProps) {
  const [search, setSearch] = useState('')
  const [exportLoading, setExportLoading] = useState(false)

  const baseEntries = useMemo(() => {
    if (!kpiType) return []
    return filterEntries(kpiType, entries)
  }, [kpiType, entries])

  const filtered = useMemo(() => {
    if (!search.trim()) return baseEntries
    const q = search.toLowerCase()
    return baseEntries.filter(e =>
      e.clientName.toLowerCase().includes(q) ||
      e.mandataireName.toLowerCase().includes(q)
    )
  }, [baseEntries, search])

  const totalExpected = filtered.reduce((s, e) => s + e.expectedAmount, 0)
  const totalPaid = filtered.filter(e => e.isPaid).reduce((s, e) => s + (e.paidAmount ?? e.expectedAmount), 0)
  const totalDelta = totalExpected - totalPaid

  async function handleExcel() {
    setExportLoading(true)
    try {
      await exportEncaissementsToExcel(filtered)
    } finally {
      setExportLoading(false)
    }
  }

  const title = kpiType ? MODAL_TITLES[kpiType] : ''

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-800 pr-8">
            {title}
            {monthLabel && <span className="text-base font-normal text-slate-500 ml-2">— {monthLabel}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-3 border-b border-slate-100 flex-shrink-0 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Rechercher client, mandataire..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] max-w-sm px-3 py-1.5 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-xs text-slate-500 whitespace-nowrap">
              <span className="font-semibold text-slate-700">{filtered.length}</span> échéance{filtered.length > 1 ? 's' : ''}
            </div>
            <div className="text-xs text-slate-500 whitespace-nowrap">
              Attendu : <span className="font-semibold text-slate-800">{formatCurrency(totalExpected)}</span>
            </div>
            {totalPaid > 0 && (
              <div className="text-xs text-slate-500 whitespace-nowrap">
                Payé : <span className="font-semibold text-emerald-700">{formatCurrency(totalPaid)}</span>
              </div>
            )}
            {totalDelta > 0.01 && (
              <div className="text-xs text-slate-500 whitespace-nowrap">
                Delta : <span className="font-semibold text-orange-600">{formatCurrency(totalDelta)}</span>
              </div>
            )}
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportEncaissementsToCSV(filtered)} disabled={filtered.length === 0}>
              <FileText className="h-3.5 w-3.5" />CSV
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleExcel} disabled={filtered.length === 0 || exportLoading}>
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />{exportLoading ? 'Export...' : 'Excel'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-3">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <p className="text-sm">Aucune échéance pour cette sélection.</p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    'Mois commission', 'Mois encaissement', 'Date effet', 'Client', 'Mandataire',
                    'Type', 'Type contrat', 'Attendu', 'Payée', 'Date paiement', 'Montant payé', 'Delta',
                    'Statut', 'Report', 'UNEP',
                  ].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                  {onMarkPaid && <th className="px-3 py-2.5"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(entry => {
                  const hasVariance = entry.isPaid && entry.paidAmount !== null && Math.abs(entry.paidAmount - entry.expectedAmount) > 0.01
                  return (
                    <tr
                      key={entry.id}
                      className={cn(
                        'transition-colors',
                        entry.isInstance ? 'bg-red-50' :
                        entry.isPaid ? (hasVariance ? 'bg-amber-50' : 'bg-emerald-50') :
                        'hover:bg-slate-50'
                      )}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-blue-700 font-medium">{entry.commissionMonthLabel}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-700">{entry.paymentMonthLabel}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{entry.effectiveDate}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">{entry.clientName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{entry.mandataireName}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge className={cn(
                          'text-[10px] px-1.5 py-0 font-semibold',
                          entry.paymentType === 'M' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'
                        )}>
                          {entry.paymentType === 'M' ? 'M' : 'M+1'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          {entry.contractType ? (CONTRACT_TYPE_LABELS[entry.contractType] ?? entry.contractType) : 'Assurance vie'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-slate-800">{formatCurrency(entry.expectedAmount)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {entry.isPaid ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap">
                            <Check className="h-2.5 w-2.5" />Oui
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] px-1.5 py-0 whitespace-nowrap">
                            Non
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                        {entry.paidDate ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        {entry.paidAmount !== null
                          ? <span className="font-medium text-emerald-700">{formatCurrency(entry.paidAmount)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        {entry.isPaid ? (
                          Math.abs(entry.deltaAmount) < 0.01
                            ? <span className="text-emerald-600">0,00 €</span>
                            : <span className={cn('font-medium', entry.deltaAmount > 0 ? 'text-orange-600' : 'text-blue-600')}>
                                {entry.deltaAmount > 0 ? '+' : ''}{formatCurrency(entry.deltaAmount)}
                              </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusBadgeMini isInstance={entry.isInstance} isContractOk={entry.isContractOk} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        {entry.deferToEndOfMonth ? (
                          <span title="Report fin de mois"><CalendarClock className="h-3.5 w-3.5 text-violet-500 inline" /></span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        {entry.needsUnepNegotiation ? (
                          <span title="À négocier UNEP"><MessageSquare className="h-3.5 w-3.5 text-orange-500 inline" /></span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      {onMarkPaid && (
                        <td className="px-3 py-2 whitespace-nowrap">
                          {!entry.isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1"
                              onClick={() => onMarkPaid(entry)}
                            >
                              <CheckCircle className="h-3 w-3" />
                              Payer
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold text-slate-700">
                  <td className="px-3 py-2.5 text-xs uppercase tracking-wide" colSpan={7}>
                    Total ({filtered.length} échéance{filtered.length !== 1 ? 's' : ''})
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatCurrency(totalExpected)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">
                    {filtered.filter(e => e.isPaid).length}/{filtered.length}
                  </td>
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5 text-right text-emerald-700 whitespace-nowrap">
                    {totalPaid > 0 ? formatCurrency(totalPaid) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {totalDelta > 0.01
                      ? <span className="text-orange-600">{formatCurrency(totalDelta)}</span>
                      : <span className="text-emerald-600">0,00 €</span>}
                  </td>
                  <td colSpan={onMarkPaid ? 4 : 3}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
