"use client"

import { useState, useMemo } from 'react'
import { EncaissementEntry, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { formatCurrency, getPreviousMonthReportEntries } from '@/lib/commission-calculations'
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
  FileSpreadsheet, FileText, Check, TrendingDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type EncaissementKpiType =
  | 'expected'
  | 'paid'
  | 'remaining_total'
  | 'paid_count'
  | 'unpaid_count'
  | 'variance'
  | 'deferred'
  | 'transfers'
  | 'prev_month_reports'

const MODAL_TITLES: Record<EncaissementKpiType, string> = {
  expected: 'Surcommissions attendues',
  paid: 'Surcommissions payées',
  remaining_total: 'Reste total à encaisser',
  paid_count: 'Échéances payées',
  unpaid_count: 'Échéances non payées',
  variance: 'Écarts de paiement',
  deferred: 'Échéances reportées',
  transfers: 'Transferts du mois',
  prev_month_reports: 'Reports du mois précédent',
}

interface EncaissementsKpiDetailsModalProps {
  kpiType: EncaissementKpiType | null
  entries: EncaissementEntry[]
  open: boolean
  onClose: () => void
  monthLabel: string
  monthKey?: string
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

function filterEntries(type: EncaissementKpiType, entries: EncaissementEntry[], monthKey?: string): EncaissementEntry[] {
  switch (type) {
    case 'expected': return entries
    case 'paid': return entries.filter(e => e.isPaid)
    case 'remaining_total':
      return entries.filter(e =>
        !e.isPaid ||
        (e.isPaid && e.paidAmount !== null && e.expectedAmount - e.paidAmount > 0.01)
      )
    case 'paid_count': return entries.filter(e => e.isPaid)
    case 'unpaid_count': return entries.filter(e => !e.isPaid)
    case 'variance': return entries.filter(e => e.isPaid && e.paidAmount !== null && Math.abs(e.paidAmount - e.expectedAmount) > 0.01)
    case 'deferred': return entries.filter(e => e.deferredMonths > 0)
    case 'transfers': return entries.filter(e => e.contractType === 'TRANSFERT')
    case 'prev_month_reports':
      return monthKey ? getPreviousMonthReportEntries(entries, monthKey) : []
    default: return entries
  }
}

// Table générique utilisée pour tous les types sauf remaining_total
function GenericTable({
  entries,
  onMarkPaid,
}: {
  entries: EncaissementEntry[]
  onMarkPaid?: (entry: EncaissementEntry) => void
}) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <p className="text-sm">Aucune échéance pour cette sélection.</p>
      </div>
    )
  }
  const totalExpected = entries.reduce((s, e) => s + e.expectedAmount, 0)
  const totalPaid = entries.filter(e => e.isPaid).reduce((s, e) => s + (e.paidAmount ?? e.expectedAmount), 0)
  const totalDelta = totalExpected - totalPaid

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          {[
            'Mois commission', 'Mois encaissement', 'Date effet', 'Client', 'Mandataire',
            'Type', 'Type contrat', 'Attendu', 'Payée', 'Date paiement', 'Montant payé', 'Delta',
            'Statut', 'FDM', 'UNEP', 'Mois initial', 'Reportée', 'Raison', 'Reporté le',
          ].map(h => (
            <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              {h}
            </th>
          ))}
          {onMarkPaid && <th className="px-3 py-2.5"></th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {entries.map(entry => {
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
              <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                {entry.initialPaymentMonthLabel}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {entry.deferredMonths > 0 ? (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap">
                    <CalendarClock className="h-2.5 w-2.5" />+{entry.deferredMonths} mois
                  </Badge>
                ) : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-3 py-2 max-w-[120px] truncate text-slate-500 text-xs">
                {entry.deferredReason ?? <span className="text-slate-300">—</span>}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-slate-500 text-xs">
                {entry.deferredAt
                  ? new Date(entry.deferredAt).toLocaleDateString('fr-FR')
                  : <span className="text-slate-300">—</span>}
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
            Total ({entries.length} échéance{entries.length !== 1 ? 's' : ''})
          </td>
          <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatCurrency(totalExpected)}</td>
          <td className="px-3 py-2.5 text-xs text-slate-500">
            {entries.filter(e => e.isPaid).length}/{entries.length}
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
          <td colSpan={onMarkPaid ? 8 : 7}></td>
        </tr>
      </tfoot>
    </table>
  )
}

// Tableau compact pour les deux sections du KPI "Reste total à encaisser"
function SectionTable({
  entries,
  columns,
  onMarkPaid,
}: {
  entries: EncaissementEntry[]
  columns: Array<{ label: string; render: (e: EncaissementEntry) => React.ReactNode; className?: string }>
  onMarkPaid?: (entry: EncaissementEntry) => void
}) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          {columns.map(c => (
            <th key={c.label} className={cn("px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap", c.className)}>
              {c.label}
            </th>
          ))}
          {onMarkPaid && <th className="px-3 py-2"></th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {entries.map(entry => (
          <tr key={entry.id} className={cn(
            'transition-colors',
            entry.isInstance ? 'bg-red-50' : 'hover:bg-slate-50'
          )}>
            {columns.map(c => (
              <td key={c.label} className={cn("px-3 py-2 whitespace-nowrap", c.className)}>
                {c.render(entry)}
              </td>
            ))}
            {onMarkPaid && (
              <td className="px-3 py-2 whitespace-nowrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1"
                  onClick={() => onMarkPaid(entry)}
                >
                  <CheckCircle className="h-3 w-3" />
                  Payer
                </Button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Rendu spécial pour le KPI "Reste total à encaisser"
function RemainingTotalContent({
  entries,
  onMarkPaid,
}: {
  entries: EncaissementEntry[]
  onMarkPaid?: (entry: EncaissementEntry) => void
}) {
  const unpaidEntries = entries.filter(e => !e.isPaid)
  const varianceEntries = entries.filter(e =>
    e.isPaid && e.paidAmount !== null && e.expectedAmount - e.paidAmount > 0.01
  )

  const totalUnpaid = unpaidEntries.reduce((s, e) => s + e.expectedAmount, 0)
  const totalVariance = varianceEntries.reduce((s, e) => s + (e.expectedAmount - (e.paidAmount ?? 0)), 0)
  const totalRemaining = totalUnpaid + totalVariance

  const commonColumns = [
    {
      label: 'Client',
      render: (e: EncaissementEntry) => <span className="font-medium text-slate-800">{e.clientName}</span>,
    },
    {
      label: 'Mandataire',
      render: (e: EncaissementEntry) => <span className="text-slate-600">{e.mandataireName}</span>,
    },
    {
      label: 'Mois encaissement',
      render: (e: EncaissementEntry) => <span className="font-medium text-slate-700">{e.paymentMonthLabel}</span>,
    },
    {
      label: 'Date effet',
      render: (e: EncaissementEntry) => <span className="text-slate-500">{e.effectiveDate}</span>,
    },
    {
      label: 'Type contrat',
      render: (e: EncaissementEntry) => (
        <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
          {e.contractType ? (CONTRACT_TYPE_LABELS[e.contractType] ?? e.contractType) : 'Assurance vie'}
        </span>
      ),
    },
  ]

  const unpaidColumns = [
    ...commonColumns,
    {
      label: 'Montant attendu',
      className: 'text-right',
      render: (e: EncaissementEntry) => (
        <span className="font-bold text-orange-700">{formatCurrency(e.expectedAmount)}</span>
      ),
    },
  ]

  const varianceColumns = [
    ...commonColumns,
    {
      label: 'Attendu',
      className: 'text-right',
      render: (e: EncaissementEntry) => (
        <span className="font-semibold text-slate-700">{formatCurrency(e.expectedAmount)}</span>
      ),
    },
    {
      label: 'Payé',
      className: 'text-right',
      render: (e: EncaissementEntry) => (
        <span className="font-medium text-emerald-700">{formatCurrency(e.paidAmount ?? 0)}</span>
      ),
    },
    {
      label: 'Écart restant',
      className: 'text-right',
      render: (e: EncaissementEntry) => (
        <span className="font-bold text-amber-700">{formatCurrency(e.expectedAmount - (e.paidAmount ?? 0))}</span>
      ),
    },
    {
      label: 'Date paiement',
      render: (e: EncaissementEntry) => (
        <span className="text-slate-500">{e.paidDate ?? <span className="text-slate-300">—</span>}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Résumé total en haut */}
      <div className="flex flex-wrap gap-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
        <div className="text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Total non payé</p>
          <p className="text-lg font-bold text-orange-700">{formatCurrency(totalUnpaid)}</p>
          <p className="text-[10px] text-slate-400">{unpaidEntries.length} échéance{unpaidEntries.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center text-slate-400 font-light text-2xl select-none">+</div>
        <div className="text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Total écarts</p>
          <p className="text-lg font-bold text-amber-700">{formatCurrency(totalVariance)}</p>
          <p className="text-[10px] text-slate-400">{varianceEntries.length} échéance{varianceEntries.length !== 1 ? 's' : ''} avec écart</p>
        </div>
        <div className="flex items-center text-slate-400 font-light text-2xl select-none">=</div>
        <div className="text-center">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Reste total à encaisser</p>
          <p className="text-2xl font-extrabold text-orange-800">{formatCurrency(totalRemaining)}</p>
        </div>
      </div>

      {/* Section A : Échéances non payées */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full bg-orange-400"></div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Section A — Échéances non payées
          </h3>
          <span className="text-xs text-slate-400">({unpaidEntries.length} échéance{unpaidEntries.length !== 1 ? 's' : ''})</span>
        </div>
        {unpaidEntries.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-2">Aucune échéance non payée.</p>
        ) : (
          <>
            <SectionTable entries={unpaidEntries} columns={unpaidColumns} onMarkPaid={onMarkPaid} />
            <div className="mt-2 flex justify-end">
              <div className="bg-orange-100 border border-orange-200 rounded-lg px-4 py-2 text-sm">
                <span className="text-slate-600">Total non payé : </span>
                <span className="font-bold text-orange-700">{formatCurrency(totalUnpaid)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Section B : Échéances payées avec écart */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full bg-amber-400"></div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Section B — Échéances payées avec écart
          </h3>
          <span className="text-xs text-slate-400">({varianceEntries.length} échéance{varianceEntries.length !== 1 ? 's' : ''} avec sous-paiement)</span>
        </div>
        {varianceEntries.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-2">Aucun écart de paiement.</p>
        ) : (
          <>
            <SectionTable entries={varianceEntries} columns={varianceColumns} />
            <div className="mt-2 flex justify-end">
              <div className="bg-amber-100 border border-amber-200 rounded-lg px-4 py-2 text-sm">
                <span className="text-slate-600">Total écarts : </span>
                <span className="font-bold text-amber-700">{formatCurrency(totalVariance)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function EncaissementsKpiDetailsModal({
  kpiType,
  entries,
  open,
  onClose,
  monthLabel,
  monthKey,
  onMarkPaid,
}: EncaissementsKpiDetailsModalProps) {
  const [search, setSearch] = useState('')
  const [exportLoading, setExportLoading] = useState(false)

  const baseEntries = useMemo(() => {
    if (!kpiType) return []
    return filterEntries(kpiType, entries, monthKey)
  }, [kpiType, entries, monthKey])

  const filtered = useMemo(() => {
    if (!search.trim()) return baseEntries
    const q = search.toLowerCase()
    return baseEntries.filter(e =>
      e.clientName.toLowerCase().includes(q) ||
      e.mandataireName.toLowerCase().includes(q)
    )
  }, [baseEntries, search])

  // Stats pour le résumé standard (non remaining_total)
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
  const isRemainingTotal = kpiType === 'remaining_total'

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-800 pr-8 flex items-center gap-2">
            {isRemainingTotal && <TrendingDown className="h-5 w-5 text-orange-600" />}
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
            {!isRemainingTotal && (
              <>
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
              </>
            )}
            {isRemainingTotal && (
              <div className="text-xs text-slate-500 whitespace-nowrap">
                <span className="font-semibold text-slate-700">{filtered.length}</span> ligne{filtered.length > 1 ? 's' : ''} concernée{filtered.length > 1 ? 's' : ''}
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
          {isRemainingTotal ? (
            <RemainingTotalContent entries={filtered} onMarkPaid={onMarkPaid} />
          ) : (
            <GenericTable entries={filtered} onMarkPaid={onMarkPaid} />
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
