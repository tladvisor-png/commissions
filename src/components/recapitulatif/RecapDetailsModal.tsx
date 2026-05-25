"use client"

import { useState, useMemo } from 'react'
import { EncaissementEntry, CalculatedDeal, RecapKpiType, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { formatCurrency, formatMonthLabel } from '@/lib/commission-calculations'
import { exportEncaissementsToExcel } from '@/lib/export'
import { exportRevenueToExcel } from '@/lib/export'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileSpreadsheet, Check, AlertTriangle, CheckCircle, Clock, CalendarClock, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecapDetailsModalProps {
  kpiType: RecapKpiType | null
  monthKey: string
  monthLabel: string
  surcoProduiteEntries: EncaissementEntry[]
  surcoEncaissableEntries: EncaissementEntry[]
  surcoEncaisseeEntries: EncaissementEntry[]
  remainingEntries: EncaissementEntry[]
  caProduiteDeals: CalculatedDeal[]
  caEncaisseDeals: CalculatedDeal[]
  open: boolean
  onClose: () => void
}

const TITLES: Record<RecapKpiType, string> = {
  SURCO_PRODUITE: 'Surcommissions produites',
  SURCO_ENCAISSABLE: 'Surcommissions encaissables',
  SURCO_ENCAISSEE: 'Surcommissions encaissées',
  RESTE_A_ENCAISSER: 'Reste à encaisser',
  CA_PRODUIT: 'CA produit',
  CA_ENCAISSE_ESTIME: 'CA encaissable estimé',
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

type SurcoTableType = 'produite' | 'encaissable' | 'encaissee'

function SurcoTable({ entries, type }: { entries: EncaissementEntry[]; type: SurcoTableType }) {
  const totalExpected = entries.reduce((s, e) => s + e.expectedAmount, 0)
  const totalPaid = entries.filter(e => e.isPaid).reduce((s, e) => s + (e.paidAmount ?? e.expectedAmount), 0)

  const headers: string[] = type === 'produite'
    ? ['Date effet', 'Client', 'Mandataire', 'Type contrat', 'Type', 'Mois production', 'Base surco', 'Statut', 'UNEP', 'FDM']
    : type === 'encaissable'
    ? ['Date effet', 'Client', 'Mandataire', 'Type', 'Mois production', 'Enc. initial', 'Enc. final', 'Attendu', 'Report', 'Statut']
    : ['Date effet', 'Client', 'Mandataire', 'Type', 'Mois production', 'Mois enc. final', 'Date paiement', 'Attendu', 'Payé', 'Delta', 'Reportée']

  return (
    <div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
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
                  type === 'encaissee' && entry.isPaid ? (hasVariance ? 'bg-amber-50' : 'bg-emerald-50') :
                  type === 'encaissable' && entry.isPaid ? 'bg-emerald-50' :
                  'hover:bg-slate-50'
                )}
              >
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">{entry.effectiveDate}</td>
                <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">{entry.clientName}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{entry.mandataireName}</td>
                {type === 'produite' && (
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                      {entry.contractType ? (CONTRACT_TYPE_LABELS[entry.contractType] ?? entry.contractType) : 'Assurance vie'}
                    </span>
                  </td>
                )}
                <td className="px-3 py-2 whitespace-nowrap">
                  <Badge className={cn(
                    'text-[10px] px-1.5 py-0 font-semibold',
                    entry.paymentType === 'M' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'
                  )}>
                    {entry.paymentType === 'M' ? 'M' : 'M+1'}
                  </Badge>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-blue-700 font-medium">{entry.commissionMonthLabel}</td>
                {type === 'produite' ? (
                  <>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-teal-700">{formatCurrency(entry.expectedAmount)}</td>
                    <td className="px-3 py-2 whitespace-nowrap"><StatusBadgeMini isInstance={entry.isInstance} isContractOk={entry.isContractOk} /></td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      {entry.needsUnepNegotiation ? <MessageSquare className="h-3.5 w-3.5 text-orange-500 inline" /> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      {entry.deferToEndOfMonth ? <CalendarClock className="h-3.5 w-3.5 text-violet-500 inline" /> : <span className="text-slate-300">—</span>}
                    </td>
                  </>
                ) : type === 'encaissable' ? (
                  <>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600 font-medium">{entry.initialPaymentMonthLabel}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700 font-medium">{entry.paymentMonthLabel}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-blue-700">{formatCurrency(entry.expectedAmount)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {entry.deferredMonths > 0 ? (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap">
                          <CalendarClock className="h-2.5 w-2.5" />+{entry.deferredMonths} mois
                        </Badge>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {entry.isPaid
                        ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap"><Check className="h-2.5 w-2.5" />Payée</Badge>
                        : <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] px-1.5 py-0 whitespace-nowrap">Non payée</Badge>
                      }
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-700">{entry.paymentMonthLabel}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500">{entry.paidDate ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-slate-700">{formatCurrency(entry.expectedAmount)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-emerald-700">
                      {entry.paidAmount !== null ? formatCurrency(entry.paidAmount) : <span className="text-slate-300">—</span>}
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
                      {entry.deferredMonths > 0 ? (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap">
                          <CalendarClock className="h-2.5 w-2.5" />+{entry.deferredMonths} mois
                        </Badge>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold text-slate-700">
            <td colSpan={type === 'produite' ? 5 : 4} className="px-3 py-2.5 text-xs uppercase tracking-wide">
              Total ({entries.length} échéance{entries.length !== 1 ? 's' : ''})
            </td>
            {type === 'produite' ? (
              <>
                <td className="px-3 py-2.5 text-right font-bold text-teal-800">{formatCurrency(totalExpected)}</td>
                <td colSpan={3} />
              </>
            ) : type === 'encaissable' ? (
              <>
                <td colSpan={2} />
                <td className="px-3 py-2.5 text-right font-bold text-blue-800">{formatCurrency(totalExpected)}</td>
                <td colSpan={2} />
              </>
            ) : (
              <>
                <td colSpan={2} />
                <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatCurrency(totalExpected)}</td>
                <td className="px-3 py-2.5 text-right font-bold text-emerald-800">{formatCurrency(totalPaid)}</td>
                <td colSpan={2} />
              </>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function CATable({ deals, isEstimated }: { deals: CalculatedDeal[]; isEstimated?: boolean }) {
  const totals = {
    caPU: deals.reduce((s, d) => s + d.caPU, 0),
    caPP: deals.reduce((s, d) => s + d.caPP, 0),
    caTotal: deals.reduce((s, d) => s + d.caTotal, 0),
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          {['Date effet', 'Client', 'Mandataire', 'Type contrat', 'PU', 'PP',
            ...(!isEstimated ? ['Frais PU', 'Frais PP'] : []),
            'CA PU', 'CA PP', 'CA total',
            ...(isEstimated ? ['Mois production', 'Mois encaissement estimé'] : []),
          ].map(h => (
            <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {deals.map(deal => (
          <tr
            key={deal.id}
            className={cn(
              'transition-colors',
              deal.isInstance ? 'bg-red-50 hover:bg-red-100' :
              deal.isContractOk ? 'bg-green-50 hover:bg-green-100' :
              'bg-orange-50 hover:bg-orange-100'
            )}
          >
            <td className="px-3 py-2 whitespace-nowrap text-slate-500">{deal.effectiveDate}</td>
            <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">{deal.clientName}</td>
            <td className="px-3 py-2 whitespace-nowrap text-slate-600">{deal.mandataireName}</td>
            <td className="px-3 py-2 whitespace-nowrap">
              <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                {deal.contractType ? (CONTRACT_TYPE_LABELS[deal.contractType] ?? deal.contractType) : 'Assurance vie'}
              </span>
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right">
              {deal.puAmount > 0 ? formatCurrency(deal.puAmount) : <span className="text-slate-300">—</span>}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right">
              {deal.ppAmount > 0 ? formatCurrency(deal.ppAmount) : <span className="text-slate-300">—</span>}
            </td>
            {!isEstimated && (
              <>
                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-500">
                  {deal.puAmount > 0 ? `${deal.effectivePuEntryFeesRate}%` : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-slate-500">
                  {deal.ppAmount > 0 ? `${deal.effectivePpPaymentFeesRate}%` : <span className="text-slate-300">—</span>}
                </td>
              </>
            )}
            <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-violet-700">
              {deal.caPU > 0 ? formatCurrency(deal.caPU) : <span className="text-slate-300">—</span>}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-violet-600">
              {deal.caPP > 0 ? formatCurrency(deal.caPP) : <span className="text-slate-300">—</span>}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right font-bold text-violet-800">{formatCurrency(deal.caTotal)}</td>
            {isEstimated && (
              <>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatMonthLabel(deal.monthM)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-indigo-700 font-medium">{formatMonthLabel(deal.monthMPlus1)}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-700">
          <td colSpan={!isEstimated ? 6 : 6} className="px-3 py-2.5 text-xs uppercase tracking-wide">
            Total ({deals.length} affaire{deals.length !== 1 ? 's' : ''})
          </td>
          {!isEstimated && <td colSpan={2} />}
          <td className="px-3 py-2.5 text-right text-violet-700">{formatCurrency(totals.caPU)}</td>
          <td className="px-3 py-2.5 text-right text-violet-600">{formatCurrency(totals.caPP)}</td>
          <td className="px-3 py-2.5 text-right text-violet-800">{formatCurrency(totals.caTotal)}</td>
          {isEstimated && <td colSpan={2} />}
        </tr>
      </tfoot>
    </table>
  )
}

export function RecapDetailsModal({
  kpiType, monthKey, monthLabel,
  surcoProduiteEntries, surcoEncaissableEntries, surcoEncaisseeEntries, remainingEntries,
  caProduiteDeals, caEncaisseDeals,
  open, onClose,
}: RecapDetailsModalProps) {
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  const { entries, deals, isSurco, isEstimated, tableType } = useMemo(() => {
    switch (kpiType) {
      case 'SURCO_PRODUITE':    return { entries: surcoProduiteEntries,    deals: [], isSurco: true,  isEstimated: false, tableType: 'produite' as SurcoTableType }
      case 'SURCO_ENCAISSABLE': return { entries: surcoEncaissableEntries, deals: [], isSurco: true,  isEstimated: false, tableType: 'encaissable' as SurcoTableType }
      case 'SURCO_ENCAISSEE':   return { entries: surcoEncaisseeEntries,   deals: [], isSurco: true,  isEstimated: false, tableType: 'encaissee' as SurcoTableType }
      case 'RESTE_A_ENCAISSER': return { entries: remainingEntries,        deals: [], isSurco: true,  isEstimated: false, tableType: 'encaissable' as SurcoTableType }
      case 'CA_PRODUIT':        return { entries: [], deals: caProduiteDeals,          isSurco: false, isEstimated: false, tableType: 'produite' as SurcoTableType }
      case 'CA_ENCAISSE_ESTIME':return { entries: [], deals: caEncaisseDeals,          isSurco: false, isEstimated: true,  tableType: 'produite' as SurcoTableType }
      default:                  return { entries: [], deals: [], isSurco: true, isEstimated: false, tableType: 'produite' as SurcoTableType }
    }
  }, [kpiType, surcoProduiteEntries, surcoEncaissableEntries, surcoEncaisseeEntries, remainingEntries, caProduiteDeals, caEncaisseDeals])

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return entries.filter(e => e.clientName.toLowerCase().includes(q) || e.mandataireName.toLowerCase().includes(q))
  }, [entries, search])

  const filteredDeals = useMemo(() => {
    if (!search.trim()) return deals
    const q = search.toLowerCase()
    return deals.filter(d => d.clientName.toLowerCase().includes(q) || d.mandataireName.toLowerCase().includes(q))
  }, [deals, search])

  async function handleExport() {
    setExporting(true)
    try {
      if (isSurco) {
        await exportEncaissementsToExcel(filteredEntries)
      } else {
        await exportRevenueToExcel(filteredDeals)
      }
    } finally {
      setExporting(false)
    }
  }

  const title = kpiType ? TITLES[kpiType] : ''
  const count = isSurco ? filteredEntries.length : filteredDeals.length

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
            <span className="text-xs text-slate-500 whitespace-nowrap">
              <span className="font-semibold text-slate-700">{count}</span>{' '}
              {isSurco ? `échéance${count !== 1 ? 's' : ''}` : `affaire${count !== 1 ? 's' : ''}`}
            </span>
            <Button
              size="sm" variant="outline" className="gap-1.5 text-xs"
              onClick={handleExport}
              disabled={count === 0 || exporting}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
              {exporting ? 'Export...' : 'Exporter cette sélection'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-3">
          {count === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              Aucune donnée pour cette sélection.
            </div>
          ) : isSurco ? (
            <SurcoTable entries={filteredEntries} type={tableType} />
          ) : (
            <CATable deals={filteredDeals} isEstimated={isEstimated} />
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
