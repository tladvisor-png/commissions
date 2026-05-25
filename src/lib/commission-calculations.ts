import {
  CommissionDeal, CalculatedDeal, DealStatus, KpiStats, KpiCardType,
  MonthlyStats, PaymentEntry, EncaissementEntry, EncaissementKpiStats,
  RevenueKpiStats, RevenueKpiCardType,
} from '@/types/commission'
import { format, addMonths, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export function addOneMonth(monthKey: string): string {
  try {
    const [year, month] = monthKey.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return format(addMonths(date, 1), 'yyyy-MM')
  } catch {
    return monthKey
  }
}

export function addNMonths(monthKey: string, n: number): string {
  if (n === 0) return monthKey
  try {
    const [year, month] = monthKey.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return format(addMonths(date, n), 'yyyy-MM')
  } catch {
    return monthKey
  }
}

export function getMonthM(effectiveDate: string): string {
  try {
    const date = parseISO(effectiveDate)
    return format(date, 'yyyy-MM')
  } catch {
    return ''
  }
}

export function getMonthMLabel(effectiveDate: string): string {
  try {
    const date = parseISO(effectiveDate)
    return format(date, 'MMM yyyy', { locale: fr })
  } catch {
    return ''
  }
}

export function getMonthMPlus1(effectiveDate: string): string {
  try {
    const date = parseISO(effectiveDate)
    return format(addMonths(date, 1), 'yyyy-MM')
  } catch {
    return ''
  }
}

export function getMonthMPlus1Label(effectiveDate: string): string {
  try {
    const date = parseISO(effectiveDate)
    return format(addMonths(date, 1), 'MMM yyyy', { locale: fr })
  } catch {
    return ''
  }
}

// Bases théoriques (avant prorata d'éligibilité)
export function calcBasePU(puAmount: number): number {
  if (puAmount <= 0) return 0
  return puAmount * 0.10
}

export function calcBasePP(ppAmount: number): number {
  if (ppAmount <= 0) return 0
  return ppAmount * 12
}

export function calcBaseTotal(puAmount: number, ppAmount: number): number {
  return calcBasePU(puAmount) + calcBasePP(ppAmount)
}

// Bases réelles (après prorata d'éligibilité)
export function calcRealBasePU(puAmount: number, rate: number): number {
  return calcBasePU(puAmount) * rate / 100
}

export function calcRealBasePP(ppAmount: number, rate: number): number {
  return calcBasePP(ppAmount) * rate / 100
}

/**
 * Règle d'encaissement avec prorata :
 * - PU seule    => payAtM = basePU réelle, payAtMPlus1 = 0
 * - PP seule    => payAtM = basePP réelle, payAtMPlus1 = 0
 * - PU + PP     => payAtM = basePU réelle, payAtMPlus1 = basePP réelle
 */
export function calcPayAtM(puAmount: number, ppAmount: number, rate: number = 100): number {
  const hasPU = puAmount > 0
  const hasPP = ppAmount > 0
  if (hasPU) return calcRealBasePU(puAmount, rate)
  if (hasPP) return calcRealBasePP(ppAmount, rate)
  return 0
}

export function calcPayAtMPlus1(puAmount: number, ppAmount: number, rate: number = 100): number {
  const hasPU = puAmount > 0
  const hasPP = ppAmount > 0
  if (hasPU && hasPP) return calcRealBasePP(ppAmount, rate)
  return 0
}

// ─── CA Assentis ────────────────────────────────────────────────────────────

export function getEffectivePuEntryFeesRate(deal: CommissionDeal): number {
  return deal.puEntryFeesRate ?? 3
}

export function getEffectivePpPaymentFeesRate(deal: CommissionDeal): number {
  return deal.ppPaymentFeesRate ?? 3
}

/** Frais nets PU = max(frais saisis − 0,5 %, 0) */
export function getNetEntryFeesRate(deal: CommissionDeal): number {
  const raw = getEffectivePuEntryFeesRate(deal)
  return Math.max(raw - 0.5, 0)
}

/** CA PU = PU × frais nets / 100 */
export function calculatePuRevenue(deal: CommissionDeal): number {
  if ((deal.puAmount ?? 0) <= 0) return 0
  const netRate = getNetEntryFeesRate(deal)
  return Math.round(deal.puAmount * netRate / 100 * 100) / 100
}

/** CA PP = PP × frais versement / 100 × 36 × 0,88 */
export function calculatePpRevenue(deal: CommissionDeal): number {
  if ((deal.ppAmount ?? 0) <= 0) return 0
  const rate = getEffectivePpPaymentFeesRate(deal)
  return Math.round(deal.ppAmount * rate / 100 * 36 * 0.88 * 100) / 100
}

export function calculateTotalRevenue(deal: CommissionDeal): number {
  return Math.round((calculatePuRevenue(deal) + calculatePpRevenue(deal)) * 100) / 100
}

// ─── Fin CA Assentis ─────────────────────────────────────────────────────────

export function getDealStatus(deal: CommissionDeal): DealStatus {
  if (deal.isInstance) return 'INSTANCE'
  if (deal.isContractOk) return 'CONTRAT_OK'
  return 'A_VALIDER'
}

export function getRowClassName(status: DealStatus): string {
  switch (status) {
    case 'INSTANCE':
      return 'bg-red-50 hover:bg-red-100 border-l-4 border-red-400'
    case 'CONTRAT_OK':
      return 'bg-green-50 hover:bg-green-100 border-l-4 border-green-400'
    case 'A_VALIDER':
      return 'bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-400'
    default:
      return ''
  }
}

export function calculateDeal(deal: CommissionDeal): CalculatedDeal {
  const rate = deal.surcommissionEligibilityRate ?? 100
  const theoreticalBasePU = calcBasePU(deal.puAmount)
  const theoreticalBasePP = calcBasePP(deal.ppAmount)
  const basePU = calcRealBasePU(deal.puAmount, rate)
  const basePP = calcRealBasePP(deal.ppAmount, rate)
  const effectivePuEntryFeesRate = getEffectivePuEntryFeesRate(deal)
  const effectivePpPaymentFeesRate = getEffectivePpPaymentFeesRate(deal)
  const netEntryFeesRate = getNetEntryFeesRate(deal)
  const caPU = calculatePuRevenue(deal)
  const caPP = calculatePpRevenue(deal)
  return {
    ...deal,
    monthM: getMonthM(deal.effectiveDate),
    monthMPlus1: getMonthMPlus1(deal.effectiveDate),
    theoreticalBasePU,
    theoreticalBasePP,
    theoreticalBaseTotal: theoreticalBasePU + theoreticalBasePP,
    basePU,
    basePP,
    baseTotal: basePU + basePP,
    payAtM: calcPayAtM(deal.puAmount, deal.ppAmount, rate),
    payAtMPlus1: calcPayAtMPlus1(deal.puAmount, deal.ppAmount, rate),
    status: getDealStatus(deal),
    needsUnepNegotiation: rate !== 100,
    effectivePuEntryFeesRate,
    effectivePpPaymentFeesRate,
    netEntryFeesRate,
    caPU,
    caPP,
    caTotal: Math.round((caPU + caPP) * 100) / 100,
  }
}

export function calculateKpis(deals: CommissionDeal[]): KpiStats {
  const calculated = deals.map(calculateDeal)
  const deferred = calculated.filter(d => d.deferToEndOfMonth)
  const theoreticalTotal = calculated.reduce((s, d) => s + d.theoreticalBaseTotal, 0)
  const realTotal = calculated.reduce((s, d) => s + d.baseTotal, 0)
  return {
    totalPU: calculated.reduce((s, d) => s + d.puAmount, 0),
    totalPP: calculated.reduce((s, d) => s + d.ppAmount, 0),
    totalBase: realTotal,
    totalPayAtM: calculated.reduce((s, d) => s + d.payAtM, 0),
    totalPayAtMPlus1: calculated.reduce((s, d) => s + d.payAtMPlus1, 0),
    dealCount: deals.length,
    instanceCount: deals.filter(d => d.isInstance).length,
    contractOkCount: deals.filter(d => !d.isInstance && d.isContractOk).length,
    toValidateCount: deals.filter(d => !d.isInstance && !d.isContractOk).length,
    deferredCount: deferred.length,
    deferredBaseTotal: deferred.reduce((s, d) => s + d.baseTotal, 0),
    unepNegotiationCount: calculated.filter(d => d.needsUnepNegotiation).length,
    theoreticalNonRetainedAmount: theoreticalTotal - realTotal,
  }
}

/**
 * Retourne les écritures de paiement d'une affaire avec le mois réel de paiement.
 * Règle : PU+PP → PU à M, PP à M+1 ; PU seul → PU à M ; PP seul → PP à M.
 */
export function getPaymentSchedule(deal: CalculatedDeal): PaymentEntry[] {
  const entries: PaymentEntry[] = []
  if (deal.payAtM > 0) {
    entries.push({
      monthKey: deal.monthM,
      monthLabel: formatMonthLabel(deal.monthM),
      type: 'M',
      amount: deal.payAtM,
      dealId: deal.id,
    })
  }
  if (deal.payAtMPlus1 > 0) {
    entries.push({
      monthKey: deal.monthMPlus1,
      monthLabel: formatMonthLabel(deal.monthMPlus1),
      type: 'M_PLUS_1',
      amount: deal.payAtMPlus1,
      dealId: deal.id,
    })
  }
  return entries
}

export function calculateMonthlyStats(deals: CommissionDeal[]): MonthlyStats[] {
  const calculated = deals.map(calculateDeal)
  const monthMap = new Map<string, MonthlyStats>()
  const dealSets = new Map<string, Set<string>>()

  for (const deal of calculated) {
    for (const entry of getPaymentSchedule(deal)) {
      if (!entry.monthKey) continue
      const existing = monthMap.get(entry.monthKey) ?? {
        month: entry.monthKey,
        payAtM: 0,
        payAtMPlus1: 0,
        total: 0,
        dealCount: 0,
      }
      if (entry.type === 'M') {
        existing.payAtM += entry.amount
      } else {
        existing.payAtMPlus1 += entry.amount
      }
      existing.total += entry.amount
      const dealSet = dealSets.get(entry.monthKey) ?? new Set<string>()
      dealSet.add(entry.dealId)
      dealSets.set(entry.monthKey, dealSet)
      existing.dealCount = dealSet.size
      monthMap.set(entry.monthKey, existing)
    }
  }

  return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function getDealsForKpi(type: KpiCardType, deals: CalculatedDeal[]): CalculatedDeal[] {
  switch (type) {
    case 'TOTAL_AFFAIRES': return deals
    case 'INSTANCE': return deals.filter(d => d.isInstance)
    case 'CONTRATS_OK': return deals.filter(d => !d.isInstance && d.isContractOk)
    case 'A_VALIDER': return deals.filter(d => !d.isInstance && !d.isContractOk)
    case 'REPORT_FIN_MOIS': return deals.filter(d => d.deferToEndOfMonth)
    case 'NEGOCIATION_UNEP': return deals.filter(d => d.surcommissionEligibilityRate !== 100)
    case 'MONTANT_NON_RETENU': return deals.filter(d => d.theoreticalBaseTotal > d.baseTotal || d.surcommissionEligibilityRate !== 100)
    case 'TOTAL_PU': return deals.filter(d => d.puAmount > 0)
    case 'TOTAL_PP': return deals.filter(d => d.ppAmount > 0)
    case 'SURCOMM_M': return deals.filter(d => d.payAtM > 0)
    case 'SURCOMM_M_PLUS_1': return deals.filter(d => d.payAtMPlus1 > 0)
    default: return deals
  }
}

export function formatMonthLabel(monthKey: string): string {
  try {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return format(date, 'MMM yyyy', { locale: fr })
  } catch {
    return monthKey
  }
}

/**
 * Construit la liste des entrées d'encaissement à partir des affaires.
 * Règle de décalage : le mois d'encaissement réel = mois de commission prévisionnel + 1 mois.
 *  - PU seule  → commission M  → encaissement M+1
 *  - PP seule  → commission M  → encaissement M+1
 *  - PU + PP   → PU commission M → encaissement M+1 ; PP commission M+1 → encaissement M+2
 */
export function getEncaissementEntries(deals: CommissionDeal[]): EncaissementEntry[] {
  const entries: EncaissementEntry[] = []

  for (const deal of deals) {
    const calculated = calculateDeal(deal)

    if (calculated.payAtM > 0) {
      const mStatus = deal.paymentStatuses?.M
      const isPaid = mStatus?.paid ?? false
      const paidAmount = isPaid ? (mStatus?.paidAmount ?? null) : null
      const expectedAmount = calculated.payAtM
      const commissionMonthKey = calculated.monthM
      const initialPaymentMonthKey = addOneMonth(commissionMonthKey)
      const deferredMonths = mStatus?.deferredMonths ?? 0
      const finalPaymentMonthKey = deferredMonths > 0 ? addNMonths(initialPaymentMonthKey, deferredMonths) : initialPaymentMonthKey
      entries.push({
        id: `${deal.id}-M`,
        dealId: deal.id,
        commissionMonthKey,
        commissionMonthLabel: formatMonthLabel(commissionMonthKey),
        initialPaymentMonthKey,
        initialPaymentMonthLabel: formatMonthLabel(initialPaymentMonthKey),
        paymentMonthKey: finalPaymentMonthKey,
        paymentMonthLabel: formatMonthLabel(finalPaymentMonthKey),
        paymentType: 'M',
        expectedAmount,
        isPaid,
        paidDate: mStatus?.paidDate ?? null,
        paidAmount,
        deltaAmount: isPaid && paidAmount !== null ? expectedAmount - paidAmount : 0,
        clientName: deal.clientName,
        mandataireName: deal.mandataireName,
        effectiveDate: deal.effectiveDate,
        status: calculated.status,
        isInstance: deal.isInstance,
        isContractOk: deal.isContractOk,
        deferToEndOfMonth: deal.deferToEndOfMonth,
        needsUnepNegotiation: calculated.needsUnepNegotiation,
        dealComment: deal.comment ?? null,
        puAmount: deal.puAmount,
        ppAmount: deal.ppAmount,
        paymentComment: mStatus?.comment ?? null,
        contractType: deal.contractType,
        deferredMonths,
        deferredToMonthKey: mStatus?.deferredToMonthKey ?? null,
        deferredToMonthLabel: mStatus?.deferredToMonthLabel ?? null,
        deferredAt: mStatus?.deferredAt ?? null,
        deferredReason: mStatus?.deferredReason ?? null,
      })
    }

    if (calculated.payAtMPlus1 > 0) {
      const mPlus1Status = deal.paymentStatuses?.M_PLUS_1
      const isPaid = mPlus1Status?.paid ?? false
      const paidAmount = isPaid ? (mPlus1Status?.paidAmount ?? null) : null
      const expectedAmount = calculated.payAtMPlus1
      const commissionMonthKey = calculated.monthMPlus1
      const initialPaymentMonthKey = addOneMonth(commissionMonthKey)
      const deferredMonths = mPlus1Status?.deferredMonths ?? 0
      const finalPaymentMonthKey = deferredMonths > 0 ? addNMonths(initialPaymentMonthKey, deferredMonths) : initialPaymentMonthKey
      entries.push({
        id: `${deal.id}-M_PLUS_1`,
        dealId: deal.id,
        commissionMonthKey,
        commissionMonthLabel: formatMonthLabel(commissionMonthKey),
        initialPaymentMonthKey,
        initialPaymentMonthLabel: formatMonthLabel(initialPaymentMonthKey),
        paymentMonthKey: finalPaymentMonthKey,
        paymentMonthLabel: formatMonthLabel(finalPaymentMonthKey),
        paymentType: 'M_PLUS_1',
        expectedAmount,
        isPaid,
        paidDate: mPlus1Status?.paidDate ?? null,
        paidAmount,
        deltaAmount: isPaid && paidAmount !== null ? expectedAmount - paidAmount : 0,
        clientName: deal.clientName,
        mandataireName: deal.mandataireName,
        effectiveDate: deal.effectiveDate,
        status: calculated.status,
        isInstance: deal.isInstance,
        isContractOk: deal.isContractOk,
        deferToEndOfMonth: deal.deferToEndOfMonth,
        needsUnepNegotiation: calculated.needsUnepNegotiation,
        dealComment: deal.comment ?? null,
        puAmount: deal.puAmount,
        ppAmount: deal.ppAmount,
        paymentComment: mPlus1Status?.comment ?? null,
        contractType: deal.contractType,
        deferredMonths,
        deferredToMonthKey: mPlus1Status?.deferredToMonthKey ?? null,
        deferredToMonthLabel: mPlus1Status?.deferredToMonthLabel ?? null,
        deferredAt: mPlus1Status?.deferredAt ?? null,
        deferredReason: mPlus1Status?.deferredReason ?? null,
      })
    }
  }

  return entries.sort((a, b) => a.paymentMonthKey.localeCompare(b.paymentMonthKey) || a.clientName.localeCompare(b.clientName))
}

export function calculateEncaissementKpis(entries: EncaissementEntry[]): EncaissementKpiStats {
  const paidEntries = entries.filter(e => e.isPaid)
  const unpaidEntries = entries.filter(e => !e.isPaid)

  const totalExpected = entries.reduce((s, e) => s + e.expectedAmount, 0)
  const totalPaid = paidEntries.reduce((s, e) => s + (e.paidAmount ?? e.expectedAmount), 0)
  const totalDelta = totalExpected - totalPaid

  const totalVariance = paidEntries
    .filter(e => e.paidAmount !== null && Math.abs(e.paidAmount - e.expectedAmount) > 0.01)
    .reduce((s, e) => s + Math.abs((e.paidAmount ?? 0) - e.expectedAmount), 0)

  return {
    totalExpected,
    totalPaid,
    totalDelta,
    paidCount: paidEntries.length,
    unpaidCount: unpaidEntries.length,
    totalVariance,
    deferredCount: entries.filter(e => e.deferredMonths > 0).length,
  }
}

export function calculateRevenueKpis(deals: CalculatedDeal[]): RevenueKpiStats {
  const caTotal = deals.reduce((s, d) => s + d.caTotal, 0)
  const caPU = deals.reduce((s, d) => s + d.caPU, 0)
  const caPP = deals.reduce((s, d) => s + d.caPP, 0)
  const dealCount = deals.length
  const ticketMoyen = dealCount > 0 ? caTotal / dealCount : 0

  const mandataireMap = new Map<string, number>()
  for (const d of deals) {
    mandataireMap.set(d.mandataireName, (mandataireMap.get(d.mandataireName) ?? 0) + d.caTotal)
  }
  let bestMandataire = ''
  let bestMandataireCA = 0
  mandataireMap.forEach((ca, name) => {
    if (ca > bestMandataireCA) { bestMandataireCA = ca; bestMandataire = name }
  })

  const contractMap = new Map<string, number>()
  for (const d of deals) {
    const key = d.contractType ?? 'ASSURANCE_VIE'
    contractMap.set(key, (contractMap.get(key) ?? 0) + d.caTotal)
  }
  let bestContract = ''
  let bestContractCA = 0
  contractMap.forEach((ca, type) => {
    if (ca > bestContractCA) { bestContractCA = ca; bestContract = type }
  })

  const dealsWithPU = deals.filter(d => d.puAmount > 0)
  const avgFeesPU = dealsWithPU.length > 0
    ? dealsWithPU.reduce((s, d) => s + d.effectivePuEntryFeesRate, 0) / dealsWithPU.length
    : 0

  const dealsWithPP = deals.filter(d => d.ppAmount > 0)
  const avgFeesPP = dealsWithPP.length > 0
    ? dealsWithPP.reduce((s, d) => s + d.effectivePpPaymentFeesRate, 0) / dealsWithPP.length
    : 0

  return {
    caTotal: Math.round(caTotal * 100) / 100,
    caPU: Math.round(caPU * 100) / 100,
    caPP: Math.round(caPP * 100) / 100,
    dealCount,
    ticketMoyen: Math.round(ticketMoyen * 100) / 100,
    bestMandataire,
    bestMandataireCA: Math.round(bestMandataireCA * 100) / 100,
    bestContract,
    bestContractCA: Math.round(bestContractCA * 100) / 100,
    avgFeesPU: Math.round(avgFeesPU * 100) / 100,
    avgFeesPP: Math.round(avgFeesPP * 100) / 100,
  }
}

export function getDealsForRevenueKpi(type: RevenueKpiCardType, deals: CalculatedDeal[], kpis: RevenueKpiStats): CalculatedDeal[] {
  switch (type) {
    case 'CA_TOTAL': return deals
    case 'CA_PU': return deals.filter(d => d.puAmount > 0)
    case 'CA_PP': return deals.filter(d => d.ppAmount > 0)
    case 'DEAL_COUNT': return deals
    case 'TICKET_MOYEN': return deals
    case 'BEST_MANDATAIRE': return deals.filter(d => d.mandataireName === kpis.bestMandataire)
    case 'BEST_CONTRACT': return deals.filter(d => (d.contractType ?? 'ASSURANCE_VIE') === kpis.bestContract)
    case 'AVG_FEES_PU': return deals.filter(d => d.puAmount > 0)
    case 'AVG_FEES_PP': return deals.filter(d => d.ppAmount > 0)
    default: return deals
  }
}

export function getDealEncaissementStatus(
  deal: CommissionDeal
): 'non_encaissee' | 'partiellement_encaissee' | 'totalement_encaissee' {
  const calculated = calculateDeal(deal)
  const hasM = calculated.payAtM > 0
  const hasMPlus1 = calculated.payAtMPlus1 > 0

  if (!hasM && !hasMPlus1) return 'non_encaissee'

  const expectedCount = (hasM ? 1 : 0) + (hasMPlus1 ? 1 : 0)
  const mPaid = hasM ? (deal.paymentStatuses?.M?.paid ?? false) : false
  const mPlus1Paid = hasMPlus1 ? (deal.paymentStatuses?.M_PLUS_1?.paid ?? false) : false
  const paidCount = (mPaid ? 1 : 0) + (mPlus1Paid ? 1 : 0)

  if (paidCount === 0) return 'non_encaissee'
  if (paidCount === expectedCount) return 'totalement_encaissee'
  return 'partiellement_encaissee'
}
