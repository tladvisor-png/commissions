"use client"

import { useState, useEffect } from 'react'
import { CommissionDeal, ContractType, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  calcBasePU,
  calcBasePP,
  calcRealBasePU,
  calcRealBasePP,
  calcPayAtM,
  calcPayAtMPlus1,
  formatCurrency,
  getMonthMLabel,
  getMonthMPlus1Label,
  calculatePuRevenue,
  calculatePpRevenue,
  getNetFeeRate,
} from '@/lib/commission-calculations'
import { User, Calendar, Euro, MessageSquare, AlertTriangle, CheckCircle, Percent, FileText } from 'lucide-react'

interface CommissionFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  initialData?: CommissionDeal | null
}

type FormErrors = Partial<Record<string, string>>

const CONTRACT_TYPES: ContractType[] = ['ASSURANCE_VIE', 'PER', 'ARTICLE_82', 'PER_ENTREPRISE', 'TRANSFERT']

const emptyForm = {
  effectiveDate: '',
  clientName: '',
  mandataireName: '',
  puAmount: '',
  ppAmount: '',
  isInstance: false,
  isContractOk: false,
  comment: '',
  isEligibleForSurcommission: true,
  surcommissionEligibilityRate: '100',
  contractType: 'ASSURANCE_VIE' as ContractType,
  puEntryFeesRate: '3',
  ppPaymentFeesRate: '3',
}

function parseOptionalFeeRate(value: string, fallback = 3): number {
  const trimmed = value.trim()
  if (trimmed === '') return fallback
  const parsed = parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function CommissionForm({ open, onClose, onSave, initialData }: CommissionFormProps) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (initialData) {
      setForm({
        effectiveDate: initialData.effectiveDate,
        clientName: initialData.clientName,
        mandataireName: initialData.mandataireName,
        puAmount: initialData.puAmount > 0 ? String(initialData.puAmount) : '',
        ppAmount: initialData.ppAmount > 0 ? String(initialData.ppAmount) : '',
        isInstance: initialData.isInstance,
        isContractOk: initialData.isContractOk,
        comment: initialData.comment ?? '',
        isEligibleForSurcommission: initialData.isEligibleForSurcommission ?? true,
        surcommissionEligibilityRate: String(initialData.surcommissionEligibilityRate ?? 100),
        contractType: initialData.contractType ?? 'ASSURANCE_VIE',
        puEntryFeesRate: String(initialData.puEntryFeesRate ?? 3),
        ppPaymentFeesRate: String(initialData.ppPaymentFeesRate ?? 3),
      })
    } else {
      setForm(emptyForm)
    }
    setErrors({})
  }, [initialData, open])

  const pu = parseFloat(form.puAmount) || 0
  const pp = parseFloat(form.ppAmount) || 0
  const rate = form.isEligibleForSurcommission ? (parseFloat(form.surcommissionEligibilityRate) || 0) : 0

  function handleEligibilityChange(eligible: boolean) {
    if (!eligible) {
      setForm(f => ({ ...f, isEligibleForSurcommission: false, surcommissionEligibilityRate: '0' }))
    } else {
      const currentRate = parseFloat(form.surcommissionEligibilityRate) || 0
      setForm(f => ({
        ...f,
        isEligibleForSurcommission: true,
        surcommissionEligibilityRate: currentRate === 0 ? '100' : f.surcommissionEligibilityRate,
      }))
    }
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.effectiveDate) errs.effectiveDate = 'La date d\'effet est obligatoire'
    if (!form.clientName.trim()) errs.clientName = 'Le nom du client est obligatoire'
    if (!form.mandataireName.trim()) errs.mandataireName = 'Le nom du mandataire est obligatoire'
    if (pu < 0 || pp < 0) errs.amounts = 'Les montants doivent être positifs'
    if (pu === 0 && pp === 0) errs.amounts = 'Au moins un montant (PU ou PP) doit être supérieur à 0'
    const rateVal = parseFloat(form.surcommissionEligibilityRate)
    if (form.isEligibleForSurcommission && (isNaN(rateVal) || rateVal < 0 || rateVal > 100)) {
      errs.rate = 'Le taux doit être compris entre 0 et 100'
    }
    const puFeesVal = parseFloat(form.puEntryFeesRate)
    const ppFeesVal = parseFloat(form.ppPaymentFeesRate)
    if (form.puEntryFeesRate.trim() !== '' && (!Number.isFinite(puFeesVal) || puFeesVal < 0)) {
      errs.puEntryFeesRate = 'Les frais PU doivent être positifs ou égaux à 0'
    }
    if (form.ppPaymentFeesRate.trim() !== '' && (!Number.isFinite(ppFeesVal) || ppFeesVal < 0)) {
      errs.ppPaymentFeesRate = 'Les frais PP doivent être positifs ou égaux à 0'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    const finalRate = form.isEligibleForSurcommission ? (parseFloat(form.surcommissionEligibilityRate) || 100) : 0
    setIsSaving(true)
    try {
      await onSave({
        effectiveDate: form.effectiveDate,
        clientName: form.clientName.trim(),
        mandataireName: form.mandataireName.trim(),
        puAmount: pu,
        ppAmount: pp,
        isInstance: form.isInstance,
        isContractOk: form.isContractOk,
        deferToEndOfMonth: initialData?.deferToEndOfMonth ?? false,
        isEligibleForSurcommission: form.isEligibleForSurcommission,
        surcommissionEligibilityRate: finalRate,
        contractType: form.contractType,
        puEntryFeesRate: parseOptionalFeeRate(form.puEntryFeesRate),
        ppPaymentFeesRate: parseOptionalFeeRate(form.ppPaymentFeesRate),
        comment: form.comment.trim() || undefined,
      })
      // Le parent ferme la modal en cas de succès
    } catch {
      // Le parent affiche le toast d'erreur, la modal reste ouverte
    } finally {
      setIsSaving(false)
    }
  }

  const theoreticalBase = calcBasePU(pu) + calcBasePP(pp)
  const realBase = calcRealBasePU(pu, rate) + calcRealBasePP(pp, rate)
  const previewPayM = calcPayAtM(pu, pp, rate)
  const previewPayMPlus1 = calcPayAtMPlus1(pu, pp, rate)
  const showPreview = pu > 0 || pp > 0
  const showUnepWarning = rate !== 100

  // CA Assentis — calcul temps réel
  const puFeesRate = parseOptionalFeeRate(form.puEntryFeesRate, 0)
  const ppFeesRate = parseOptionalFeeRate(form.ppPaymentFeesRate, 0)
  const netPuFeesRate = getNetFeeRate(puFeesRate)
  const netPpFeesRate = getNetFeeRate(ppFeesRate)
  const previewCaPU = calculatePuRevenue({ puAmount: pu, ppAmount: pp, puEntryFeesRate: puFeesRate, ppPaymentFeesRate: ppFeesRate } as Parameters<typeof calculatePuRevenue>[0])
  const previewCaPP = calculatePpRevenue({ puAmount: pu, ppAmount: pp, puEntryFeesRate: puFeesRate, ppPaymentFeesRate: ppFeesRate } as Parameters<typeof calculatePpRevenue>[0])
  const previewCaTotal = Math.round((previewCaPU + previewCaPP) * 100) / 100

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {initialData ? '✏️ Modifier l\'affaire' : '➕ Nouvelle affaire'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Date d'effet */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-slate-700">
              <Calendar className="h-3.5 w-3.5" />
              Date d'effet <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={form.effectiveDate}
              onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))}
              className={errors.effectiveDate ? 'border-red-400' : ''}
            />
            {errors.effectiveDate && <p className="text-xs text-red-500">{errors.effectiveDate}</p>}
          </div>

          {/* Type de contrat */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-slate-700">
              <FileText className="h-3.5 w-3.5" />
              Type de contrat <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.contractType}
              onValueChange={v => setForm(f => ({ ...f, contractType: v as ContractType }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{CONTRACT_TYPE_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client & Mandataire */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-slate-700">
                <User className="h-3.5 w-3.5" />
                Client <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Nom du client"
                value={form.clientName}
                onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                className={errors.clientName ? 'border-red-400' : ''}
              />
              {errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-slate-700">
                <User className="h-3.5 w-3.5" />
                Mandataire <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Nom du mandataire"
                value={form.mandataireName}
                onChange={e => setForm(f => ({ ...f, mandataireName: e.target.value }))}
                className={errors.mandataireName ? 'border-red-400' : ''}
              />
              {errors.mandataireName && <p className="text-xs text-red-500">{errors.mandataireName}</p>}
            </div>
          </div>

          {/* PU & PP */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-slate-700">
                <Euro className="h-3.5 w-3.5" />
                Prime Unique (PU)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.puAmount}
                onChange={e => setForm(f => ({ ...f, puAmount: e.target.value }))}
                className={errors.amounts ? 'border-red-400' : ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-slate-700">
                <Euro className="h-3.5 w-3.5" />
                Prime Périodique (PP)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.ppAmount}
                onChange={e => setForm(f => ({ ...f, ppAmount: e.target.value }))}
                className={errors.amounts ? 'border-red-400' : ''}
              />
            </div>
          </div>
          {errors.amounts && <p className="text-xs text-red-500 -mt-3">{errors.amounts}</p>}

          {/* Frais CA Assentis */}
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Frais CA Assentis</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-slate-700">
                  <Percent className="h-3.5 w-3.5" />
                  Frais d'entrée PU brut (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="3"
                  value={form.puEntryFeesRate}
                  onChange={e => setForm(f => ({ ...f, puEntryFeesRate: e.target.value }))}
                  className={errors.puEntryFeesRate ? 'border-red-400' : ''}
                />
                {errors.puEntryFeesRate && <p className="text-xs text-red-500">{errors.puEntryFeesRate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-slate-700">
                  <Percent className="h-3.5 w-3.5" />
                  Frais de versement PP brut (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="3"
                  value={form.ppPaymentFeesRate}
                  onChange={e => setForm(f => ({ ...f, ppPaymentFeesRate: e.target.value }))}
                  className={errors.ppPaymentFeesRate ? 'border-red-400' : ''}
                />
                {errors.ppPaymentFeesRate && <p className="text-xs text-red-500">{errors.ppPaymentFeesRate}</p>}
              </div>
            </div>
            <p className="text-xs text-violet-500">
              Frais nets après déduction UNEP : PU {netPuFeesRate.toFixed(2)} % / PP {netPpFeesRate.toFixed(2)} %
            </p>
            {showPreview && (
              <div className="rounded-md bg-white border border-violet-200 p-3 space-y-1">
                <p className="text-xs font-semibold text-violet-700 mb-2">CA Assentis</p>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div>
                    <p className="text-slate-400">CA PU</p>
                    <p className="font-bold text-violet-700">{formatCurrency(previewCaPU)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">CA PP</p>
                    <p className="font-bold text-violet-700">{formatCurrency(previewCaPP)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Total CA</p>
                    <p className="font-bold text-violet-900 text-sm">{formatCurrency(previewCaTotal)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Les frais PU et PP sont diminués de 0,5 % d'incompressible UNEP.</p>
              </div>
            )}
          </div>

          {/* Éligibilité à la surcommission */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Éligibilité à la surcommission</p>

            <div className="flex items-center justify-between">
              <Label className="text-slate-700 font-medium cursor-pointer">
                Éligible à la surcommission
              </Label>
              <Switch
                checked={form.isEligibleForSurcommission}
                onCheckedChange={handleEligibilityChange}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            {form.isEligibleForSurcommission && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-slate-700">
                  <Percent className="h-3.5 w-3.5" />
                  Taux d'éligibilité (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="100"
                  value={form.surcommissionEligibilityRate}
                  onChange={e => setForm(f => ({ ...f, surcommissionEligibilityRate: e.target.value }))}
                  className={errors.rate ? 'border-red-400' : ''}
                />
                {errors.rate && <p className="text-xs text-red-500">{errors.rate}</p>}
                <p className="text-xs text-slate-400">
                  Ce taux applique un prorata sur la base de surcommission calculée.
                </p>
              </div>
            )}

            {!form.isEligibleForSurcommission && (
              <p className="text-xs text-slate-500 italic">
                Taux : 0 % — La base de surcommission sera égale à 0 €.
              </p>
            )}

            {showUnepWarning && (
              <div className="flex items-center gap-2 rounded-md bg-orange-50 border border-orange-200 px-3 py-2">
                <MessageSquare className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-orange-800">À négocier avec l'UNEP</span>
              </div>
            )}
          </div>

          {/* Preview calcul */}
          {showPreview && form.effectiveDate && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Aperçu des calculs</p>
              <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                <div className="text-center">
                  <p className="text-slate-400 text-xs">Base théorique</p>
                  <p className="font-medium text-slate-500">{formatCurrency(theoreticalBase)}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500 text-xs">Base réelle ({rate} %)</p>
                  <p className="font-bold text-slate-800">{formatCurrency(realBase)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm border-t border-slate-200 pt-2">
                <div className="text-center">
                  <p className="text-slate-500 text-xs">À payer M ({getMonthMLabel(form.effectiveDate)})</p>
                  <p className="font-bold text-blue-700">{formatCurrency(previewPayM)}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500 text-xs">À payer M+1 ({getMonthMPlus1Label(form.effectiveDate)})</p>
                  <p className="font-bold text-purple-700">{formatCurrency(previewPayMPlus1)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Statuts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <Label className="text-red-700 font-medium cursor-pointer">Instance</Label>
              </div>
              <Switch
                checked={form.isInstance}
                onCheckedChange={v => setForm(f => ({ ...f, isInstance: v }))}
                className="data-[state=checked]:bg-red-500"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <Label className="text-green-700 font-medium cursor-pointer">Contrat OK</Label>
              </div>
              <Switch
                checked={form.isContractOk}
                onCheckedChange={v => setForm(f => ({ ...f, isContractOk: v }))}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>

          {/* Commentaire */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-slate-700">
              <MessageSquare className="h-3.5 w-3.5" />
              Commentaire <span className="text-slate-400 text-xs">(optionnel)</span>
            </Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 resize-none"
              placeholder="Notes ou remarques sur ce dossier..."
              value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="px-6">
            {isSaving ? 'Enregistrement...' : (initialData ? 'Enregistrer les modifications' : 'Ajouter l\'affaire')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
