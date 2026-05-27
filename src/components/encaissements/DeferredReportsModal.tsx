"use client"

import { useEffect, useMemo, useState } from 'react'
import { EncaissementEntry, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { formatCurrency, formatMonthLabel } from '@/lib/commission-calculations'
import { exportReportsEncaissementsToExcel } from '@/lib/export'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle,
  FileSpreadsheet,
  RotateCcw,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ReportTypeFilter = 'all' | 'active_unpaid' | 'paid' | 'M' | 'M_PLUS_1'

interface DeferredReportsModalProps {
  entries: EncaissementEntry[]
  open: boolean
  onClose: () => void
  currentMonthKey: string
  initialMonthKey?: string
  onMarkPaid: (entry: EncaissementEntry) => void
  onCancelDeferral: (entry: EncaissementEntry) => void
  onViewDetails?: (entry: EncaissementEntry) => void
}

function remainingAmount(entry: EncaissementEntry): number {
  if (!entry.isPaid) return entry.expectedAmount
  return Math.max(entry.expectedAmount - (entry.paidAmount ?? entry.expectedAmount), 0)
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('fr-FR')
}

export function DeferredReportsModal({
  entries,
  open,
  onClose,
  currentMonthKey,
  initialMonthKey,
  onMarkPaid,
  onCancelDeferral,
  onViewDetails,
}: DeferredReportsModalProps) {
  const [monthFilter, setMonthFilter] = useState('__all_reports__')
  const [typeFilter, setTypeFilter] = useState<ReportTypeFilter>('all')
  const [search, setSearch] = useState('')
  const [exportLoading, setExportLoading] = useState(false)

  const reportEntries = useMemo(
    () => entries.filter(entry => entry.deferredMonths > 0),
    [entries]
  )

  const monthOptions = useMemo(() => {
    const set = new Set(reportEntries.map(entry => entry.finalPaymentMonthKey).filter(Boolean))
    return Array.from(set).sort()
  }, [reportEntries])

  useEffect(() => {
    if (!open) return
    setMonthFilter(initialMonthKey || '__all_reports__')

    if (process.env.NODE_ENV === 'development') {
      console.table(
        entries
          .filter(entry => entry.deferredMonths > 0)
          .map(entry => ({
            client: entry.clientName,
            type: entry.paymentType,
            initial: entry.initialPaymentMonthKey,
            final: entry.finalPaymentMonthKey,
            deferredMonths: entry.deferredMonths,
            expected: entry.expectedAmount,
            paid: entry.isPaid,
          }))
      )
    }
  }, [entries, initialMonthKey, open])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return reportEntries.filter(entry => {
      if (monthFilter === '__current__' && entry.finalPaymentMonthKey !== currentMonthKey) return false
      if (!monthFilter.startsWith('__') && entry.finalPaymentMonthKey !== monthFilter) return false

      if (typeFilter === 'active_unpaid' && entry.isPaid) return false
      if (typeFilter === 'paid' && !entry.isPaid) return false
      if (typeFilter === 'M' && entry.paymentType !== 'M') return false
      if (typeFilter === 'M_PLUS_1' && entry.paymentType !== 'M_PLUS_1') return false

      if (q) {
        const contractLabel = entry.contractType ? (CONTRACT_TYPE_LABELS[entry.contractType] ?? entry.contractType) : 'Assurance vie'
        const haystack = [
          entry.clientName,
          entry.mandataireName,
          entry.contractType ?? '',
          contractLabel,
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [currentMonthKey, monthFilter, reportEntries, search, typeFilter])

  const stats = useMemo(() => {
    return {
      totalCount: filtered.length,
      totalAmount: filtered.reduce((sum, entry) => sum + entry.expectedAmount, 0),
      unpaidCount: filtered.filter(entry => !entry.isPaid).length,
      remainingAmount: filtered.reduce((sum, entry) => sum + remainingAmount(entry), 0),
      mCount: filtered.filter(entry => entry.paymentType === 'M').length,
      mPlus1Count: filtered.filter(entry => entry.paymentType === 'M_PLUS_1').length,
    }
  }, [filtered])

  async function handleExport() {
    setExportLoading(true)
    try {
      await exportReportsEncaissementsToExcel(filtered)
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => { if (!value) onClose() }}>
      <DialogContent className="max-w-[96vw] w-full max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-800 pr-8 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-orange-600" />
            Affaires reportées
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              ['Total échéances reportées', String(stats.totalCount)],
              ['Montant total reporté', formatCurrency(stats.totalAmount)],
              ['Reports non payés', String(stats.unpaidCount)],
              ['Montant restant à encaisser', formatCurrency(stats.remainingAmount)],
              ['Reports M', String(stats.mCount)],
              ['Reports M+1', String(stats.mPlus1Count)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="min-w-[210px]">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Mois final d'encaissement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all_reports__">Tous les reports</SelectItem>
                  <SelectItem value="__all_months__">Tous les mois</SelectItem>
                  <SelectItem value="__current__">Mois courant</SelectItem>
                  {monthOptions.map(month => (
                    <SelectItem key={month} value={month}>{formatMonthLabel(month)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[210px]">
              <Select value={typeFilter} onValueChange={value => setTypeFilter(value as ReportTypeFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Type de report" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les reports</SelectItem>
                  <SelectItem value="active_unpaid">Reports actifs non payés</SelectItem>
                  <SelectItem value="paid">Reports payés</SelectItem>
                  <SelectItem value="M">Reports M</SelectItem>
                  <SelectItem value="M_PLUS_1">Reports M+1</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Rechercher client, mandataire, type contrat..."
                className="pl-9"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleExport}
              disabled={filtered.length === 0 || exportLoading}
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              {exportLoading ? 'Export...' : 'Exporter les reports'}
            </Button>
          </div>

          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{filtered.length}</span> report{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''} sur{' '}
            <span className="font-semibold text-slate-700">{reportEntries.length}</span> report{reportEntries.length > 1 ? 's' : ''} au total
          </p>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <p className="text-sm">Aucun report pour cette sélection.</p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    'Mois commission',
                    'Mois encaissement initial',
                    'Mois encaissement final',
                    'Client',
                    'Mandataire',
                    'Type contrat',
                    'Type échéance',
                    'Montant attendu',
                    'Payée',
                    'Date paiement',
                    'Montant payé',
                    'Reste',
                    'Nombre de mois reportés',
                    'Date du report',
                    'Raison du report',
                    'Instance',
                    'Contrat OK',
                    'Actions',
                  ].map(header => (
                    <th key={header} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(entry => (
                  <tr key={entry.id} className={cn(entry.isPaid ? 'bg-emerald-50' : 'hover:bg-slate-50', entry.isInstance && 'bg-red-50')}>
                    <td className="px-3 py-2 whitespace-nowrap text-blue-700 font-medium">{entry.commissionMonthLabel}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{entry.initialPaymentMonthLabel}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-800">{entry.finalPaymentMonthLabel}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">{entry.clientName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{entry.mandataireName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                        {entry.contractType ? (CONTRACT_TYPE_LABELS[entry.contractType] ?? entry.contractType) : 'Assurance vie'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Badge className={cn(
                        'text-[10px] px-1.5 py-0 font-semibold',
                        entry.paymentType === 'M' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'
                      )}>
                        {entry.paymentType === 'M' ? 'M' : 'M+1'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-slate-800">{formatCurrency(entry.expectedAmount)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{entry.isPaid ? 'Oui' : 'Non'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500">{entry.paidDate ?? <span className="text-slate-300">-</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-emerald-700">{entry.paidAmount !== null ? formatCurrency(entry.paidAmount) : <span className="text-slate-300">-</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-orange-700">{formatCurrency(remainingAmount(entry))}</td>
                    <td className="px-3 py-2 whitespace-nowrap">+{entry.deferredMonths}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatDate(entry.deferredAt) || <span className="text-slate-300">-</span>}</td>
                    <td className="px-3 py-2 max-w-[180px] truncate text-slate-500" title={entry.deferredReason ?? ''}>{entry.deferredReason ?? <span className="text-slate-300">-</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {entry.isInstance ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0 gap-0.5"><AlertTriangle className="h-2.5 w-2.5" />Oui</Badge>
                      ) : 'Non'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {entry.isContractOk ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0 gap-0.5"><Check className="h-2.5 w-2.5" />Oui</Badge>
                      ) : 'Non'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {onViewDetails && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onViewDetails(entry)}>
                            Détail
                          </Button>
                        )}
                        {!entry.isPaid && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1" onClick={() => onMarkPaid(entry)}>
                              <CheckCircle className="h-3 w-3" />
                              Payer
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-600 hover:bg-slate-100 gap-1" onClick={() => onCancelDeferral(entry)}>
                              <RotateCcw className="h-3 w-3" />
                              Annuler report
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
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
