"use client"

import { useState, useEffect } from 'react'
import { EncaissementEntry, PaymentStatusDetail } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Euro, Calendar, MessageSquare, X } from 'lucide-react'

interface PaymentStatusModalProps {
  entry: EncaissementEntry | null
  open: boolean
  onClose: () => void
  onSave: (dealId: string, paymentType: 'M' | 'M_PLUS_1', status: PaymentStatusDetail) => void
}

export function PaymentStatusModal({ entry, open, onClose, onSave }: PaymentStatusModalProps) {
  const [isPaid, setIsPaid] = useState(false)
  const [paidDate, setPaidDate] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (entry && open) {
      setIsPaid(entry.isPaid)
      setPaidDate(entry.paidDate ?? '')
      setPaidAmount(entry.paidAmount !== null ? String(entry.paidAmount) : String(entry.expectedAmount))
      setComment(entry.paymentComment ?? '')
      setError('')
    }
  }, [entry, open])

  function handleSave() {
    if (isPaid && !paidDate) {
      setError('La date de paiement est obligatoire.')
      return
    }
    const amount = parseFloat(paidAmount.replace(',', '.'))
    if (isPaid && (isNaN(amount) || amount < 0)) {
      setError('Le montant payé doit être un nombre positif.')
      return
    }
    if (!entry) return

    onSave(entry.dealId, entry.paymentType, {
      paid: isPaid,
      paidDate: isPaid ? paidDate : null,
      paidAmount: isPaid ? amount : null,
      comment: comment.trim() || null,
    })
  }

  function handleCancelPayment() {
    if (!entry) return
    onSave(entry.dealId, entry.paymentType, {
      paid: false,
      paidDate: null,
      paidAmount: null,
      comment: null,
    })
  }

  if (!entry) return null

  const typeLabel = entry.paymentType === 'M' ? 'M (mois courant)' : 'M+1 (mois suivant)'

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            Encaissement — {entry.clientName}
          </DialogTitle>
        </DialogHeader>

        {/* Recap */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Client</span>
            <span className="font-medium text-slate-800">{entry.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Mandataire</span>
            <span className="font-medium text-slate-800">{entry.mandataireName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Mois attendu</span>
            <span className="font-medium text-slate-800">{entry.paymentMonthLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Type</span>
            <span className="font-medium text-slate-800">{typeLabel}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
            <span className="text-slate-500">Montant attendu</span>
            <span className="font-bold text-slate-900">{formatCurrency(entry.expectedAmount)}</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Payée toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={e => {
                setIsPaid(e.target.checked)
                setError('')
                if (e.target.checked && !paidAmount) {
                  setPaidAmount(String(entry.expectedAmount))
                }
              }}
              className="h-5 w-5 rounded border-slate-300 cursor-pointer accent-emerald-600"
            />
            <div>
              <div className="text-sm font-semibold text-slate-800">Marquer comme payée</div>
              <div className="text-xs text-slate-500">
                {isPaid ? 'Paiement confirmé' : 'En attente de paiement'}
              </div>
            </div>
          </label>

          {/* Date de paiement */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Calendar className="h-3.5 w-3.5" />
              Date de paiement réelle
              {isPaid && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="date"
              value={paidDate}
              onChange={e => { setPaidDate(e.target.value); setError('') }}
              disabled={!isPaid}
              className={!isPaid ? 'opacity-40' : ''}
            />
          </div>

          {/* Montant payé */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Euro className="h-3.5 w-3.5" />
              Montant payé (€)
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={paidAmount}
              onChange={e => { setPaidAmount(e.target.value); setError('') }}
              disabled={!isPaid}
              placeholder={String(entry.expectedAmount)}
              className={!isPaid ? 'opacity-40' : ''}
            />
            {isPaid && paidAmount && parseFloat(paidAmount.replace(',', '.')) !== entry.expectedAmount && (
              <p className="text-xs text-orange-600">
                Écart : {formatCurrency(entry.expectedAmount - parseFloat(paidAmount.replace(',', '.')))}
              </p>
            )}
          </div>

          {/* Commentaire */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <MessageSquare className="h-3.5 w-3.5" />
              Commentaire (facultatif)
            </Label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Note sur ce paiement..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {entry.isPaid && (
            <Button variant="ghost" onClick={handleCancelPayment} className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 mr-auto">
              <X className="h-3.5 w-3.5" />
              Annuler le paiement
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={handleSave} className={isPaid ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : ''}>
            {isPaid ? 'Enregistrer le paiement' : 'Sauvegarder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
