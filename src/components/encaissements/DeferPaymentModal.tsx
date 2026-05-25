"use client"

import { useState, useEffect } from 'react'
import { EncaissementEntry } from '@/types/commission'
import { addNMonths, formatMonthLabel } from '@/lib/commission-calculations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CalendarClock } from 'lucide-react'

const DEFER_REASONS = ['Instance', 'Non payée', 'Contrat en attente', 'Autre']

interface DeferPaymentModalProps {
  entry: EncaissementEntry | null
  open: boolean
  onClose: () => void
  onConfirm: (dealId: string, paymentType: 'M' | 'M_PLUS_1', reason: string | null) => void
}

export function DeferPaymentModal({ entry, open, onClose, onConfirm }: DeferPaymentModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customComment, setCustomComment] = useState('')

  useEffect(() => {
    if (open) {
      setSelectedReason('')
      setCustomComment('')
    }
  }, [open])

  if (!entry) return null

  const nextMonthKey = addNMonths(entry.paymentMonthKey, 1)
  const nextMonthLabel = formatMonthLabel(nextMonthKey)

  function handleConfirm() {
    if (!entry) return
    let reason: string | null = null
    if (selectedReason === 'Autre') {
      reason = customComment.trim() || 'Autre'
    } else if (selectedReason) {
      reason = selectedReason
    }
    onConfirm(entry.dealId, entry.paymentType, reason)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-orange-500" />
            Reporter l'échéance au mois suivant
          </DialogTitle>
        </DialogHeader>

        <div className="bg-slate-50 rounded-lg p-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Client</span>
            <span className="font-medium text-slate-800">{entry.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Mandataire</span>
            <span className="text-slate-600">{entry.mandataireName}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1">
            <span className="text-slate-500">Mois actuel</span>
            <span className="font-medium text-slate-700">{entry.paymentMonthLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Nouveau mois</span>
            <span className="font-bold text-orange-600">{nextMonthLabel}</span>
          </div>
          {entry.deferredMonths > 0 && (
            <div className="flex justify-between text-xs text-slate-400 border-t border-slate-200 pt-1 mt-1">
              <span>Reports déjà effectués</span>
              <span>{entry.deferredMonths} mois</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
              Raison du report <span className="text-slate-400 font-normal">(facultatif)</span>
            </Label>
            <select
              value={selectedReason}
              onChange={e => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">— Sélectionner une raison —</option>
              {DEFER_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {selectedReason === 'Autre' && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Commentaire libre</Label>
              <textarea
                value={customComment}
                onChange={e => setCustomComment(e.target.value)}
                placeholder="Précisez la raison..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={handleConfirm}
            className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Reporter au mois suivant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
