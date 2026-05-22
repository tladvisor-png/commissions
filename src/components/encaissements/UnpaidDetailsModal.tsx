"use client"

import { useState } from 'react'
import { EncaissementEntry, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Clock, CalendarClock, MessageSquare, CreditCard } from 'lucide-react'

interface UnpaidDetailsModalProps {
  entries: EncaissementEntry[]
  open: boolean
  onClose: () => void
  onMarkPaid: (entry: EncaissementEntry) => void
  monthLabel: string
}

function StatusBadgeMini({ isInstance, isContractOk }: { isInstance: boolean; isContractOk: boolean }) {
  if (isInstance) return (
    <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0 gap-0.5">
      <AlertTriangle className="h-2.5 w-2.5" />Instance
    </Badge>
  )
  if (isContractOk) return (
    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0 gap-0.5">
      <CheckCircle className="h-2.5 w-2.5" />OK
    </Badge>
  )
  return (
    <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0 gap-0.5">
      <Clock className="h-2.5 w-2.5" />À valider
    </Badge>
  )
}

export function UnpaidDetailsModal({ entries, open, onClose, onMarkPaid, monthLabel }: UnpaidDetailsModalProps) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? entries.filter(e =>
        e.clientName.toLowerCase().includes(search.toLowerCase()) ||
        e.mandataireName.toLowerCase().includes(search.toLowerCase())
      )
    : entries

  const totalUnpaid = filtered.reduce((s, e) => s + e.expectedAmount, 0)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-600" />
            Surcommissions non encaissées — {monthLabel || 'Tous les mois'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 py-2">
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <div className="text-sm font-semibold text-slate-700 whitespace-nowrap">
            {filtered.length} échéance{filtered.length > 1 ? 's' : ''} —{' '}
            <span className="text-orange-600">{formatCurrency(totalUnpaid)}</span>
          </div>
        </div>

        <div className="overflow-auto flex-1 rounded-lg border border-slate-200">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Aucune échéance non payée pour ce mois.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Mois commission</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Mois encaissement</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Client</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Mandataire</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Type contrat</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Attendu</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Statut</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Indicateurs</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Date effet</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(entry => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-50 transition-colors ${entry.isInstance ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-3 py-2.5 text-blue-700 font-medium whitespace-nowrap">{entry.commissionMonthLabel}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{entry.paymentMonthLabel}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{entry.clientName}</td>
                    <td className="px-3 py-2.5 text-slate-600">{entry.mandataireName}</td>
                    <td className="px-3 py-2.5">
                      <Badge className={`text-[10px] px-1.5 py-0 ${entry.paymentType === 'M' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
                        {entry.paymentType === 'M' ? 'M' : 'M+1'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700 whitespace-nowrap">
                        {entry.contractType ? (CONTRACT_TYPE_LABELS[entry.contractType] ?? entry.contractType) : 'Assurance vie'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                      {formatCurrency(entry.expectedAmount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadgeMini isInstance={entry.isInstance} isContractOk={entry.isContractOk} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {entry.deferToEndOfMonth && (
                          <span title="Report fin de mois">
                            <CalendarClock className="h-3.5 w-3.5 text-violet-500" />
                          </span>
                        )}
                        {entry.needsUnepNegotiation && (
                          <span title="À négocier UNEP">
                            <MessageSquare className="h-3.5 w-3.5 text-orange-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{entry.effectiveDate}</td>
                    <td className="px-3 py-2.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1"
                        onClick={() => onMarkPaid(entry)}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Marquer payée
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
