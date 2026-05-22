export type ContractType = 'ASSURANCE_VIE' | 'PER' | 'ARTICLE_82' | 'PER_ENTREPRISE' | 'TRANSFERT'

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  ASSURANCE_VIE: 'Assurance vie',
  PER: 'PER',
  ARTICLE_82: 'Article 82',
  PER_ENTREPRISE: "PER d'entreprise",
  TRANSFERT: 'Transfert',
}

export type PaymentStatusDetail = {
  paid: boolean
  paidDate: string | null
  paidAmount: number | null
  comment: string | null
}

export type CommissionDeal = {
  id: string
  effectiveDate: string
  clientName: string
  mandataireName: string
  contractType: ContractType
  puAmount: number
  ppAmount: number
  puEntryFeesRate: number
  ppPaymentFeesRate: number
  isInstance: boolean
  isContractOk: boolean
  comment?: string | null
  deferToEndOfMonth: boolean
  isEligibleForSurcommission: boolean
  surcommissionEligibilityRate: number
  paymentStatuses?: {
    M?: PaymentStatusDetail
    M_PLUS_1?: PaymentStatusDetail
  }
  createdAt: string
  updatedAt: string
}

export type DealStatus = 'INSTANCE' | 'CONTRAT_OK' | 'A_VALIDER'

export type CalculatedDeal = CommissionDeal & {
  monthM: string
  monthMPlus1: string
  theoreticalBasePU: number
  theoreticalBasePP: number
  theoreticalBaseTotal: number
  basePU: number
  basePP: number
  baseTotal: number
  payAtM: number
  payAtMPlus1: number
  status: DealStatus
  needsUnepNegotiation: boolean
  // CA Assentis (séparé de la surcommission)
  effectivePuEntryFeesRate: number
  effectivePpPaymentFeesRate: number
  netEntryFeesRate: number
  caPU: number
  caPP: number
  caTotal: number
}

export type MonthlyStats = {
  month: string
  payAtM: number
  payAtMPlus1: number
  total: number
  dealCount: number
}

export type KpiStats = {
  totalPU: number
  totalPP: number
  totalBase: number
  totalPayAtM: number
  totalPayAtMPlus1: number
  dealCount: number
  instanceCount: number
  contractOkCount: number
  toValidateCount: number
  deferredCount: number
  deferredBaseTotal: number
  unepNegotiationCount: number
  theoreticalNonRetainedAmount: number
}

export type KpiCardType =
  | 'TOTAL_AFFAIRES'
  | 'INSTANCE'
  | 'CONTRATS_OK'
  | 'A_VALIDER'
  | 'REPORT_FIN_MOIS'
  | 'NEGOCIATION_UNEP'
  | 'MONTANT_NON_RETENU'
  | 'TOTAL_PU'
  | 'TOTAL_PP'
  | 'SURCOMM_M'
  | 'SURCOMM_M_PLUS_1'

export type PaymentEntry = {
  monthKey: string
  monthLabel: string
  type: 'M' | 'M_PLUS_1'
  amount: number
  dealId: string
}

export type FilterState = {
  search: string
  mandataire: string
  monthM: string
  status: string
  isInstance: string
  isContractOk: string
  deferToEndOfMonth: string
  unepFilter: string
  encaissementFilter: string
}

export type RevenueFilterState = {
  search: string
  mandataire: string
  monthKey: string
  contractType: string
  status: string
  unepFilter: string
  deferFilter: string
}

export type RevenueKpiCardType =
  | 'CA_TOTAL'
  | 'CA_PU'
  | 'CA_PP'
  | 'DEAL_COUNT'
  | 'TICKET_MOYEN'
  | 'BEST_MANDATAIRE'
  | 'BEST_CONTRACT'
  | 'AVG_FEES_PU'
  | 'AVG_FEES_PP'

export type RevenueKpiStats = {
  caTotal: number
  caPU: number
  caPP: number
  dealCount: number
  ticketMoyen: number
  bestMandataire: string
  bestMandataireCA: number
  bestContract: string
  bestContractCA: number
  avgFeesPU: number
  avgFeesPP: number
}

export type EncaissementEntry = {
  id: string
  dealId: string
  commissionMonthKey: string
  commissionMonthLabel: string
  paymentMonthKey: string
  paymentMonthLabel: string
  paymentType: 'M' | 'M_PLUS_1'
  expectedAmount: number
  isPaid: boolean
  paidDate: string | null
  paidAmount: number | null
  deltaAmount: number
  clientName: string
  mandataireName: string
  effectiveDate: string
  status: DealStatus
  isInstance: boolean
  isContractOk: boolean
  deferToEndOfMonth: boolean
  needsUnepNegotiation: boolean
  dealComment: string | null
  puAmount: number
  ppAmount: number
  paymentComment: string | null
  contractType?: ContractType
}

export type EncaissementKpiStats = {
  totalExpected: number
  totalPaid: number
  totalDelta: number
  paidCount: number
  unpaidCount: number
  totalVariance: number
}

export type EncaissementFilterState = {
  search: string
  mandataire: string
  monthKey: string
  paymentStatus: 'all' | 'paid' | 'unpaid'
}
