import { supabase } from './supabase'
import { CommissionDeal, ContractType, PaymentStatusDetail } from '@/types/commission'
import { getMonthM, getMonthMPlus1, addOneMonth, addNMonths, formatMonthLabel } from './commission-calculations'

const TABLE = 'commission_deals'
const LOCAL_STORAGE_KEY = 'commission_deals'

const DEFAULT_PAYMENT_STATUS: PaymentStatusDetail = {
  paid: false,
  paidDate: null,
  paidAmount: null,
  comment: null,
  deferredMonths: 0,
  deferredToMonthKey: null,
  deferredToMonthLabel: null,
  deferredAt: null,
  deferredReason: null,
}

function normalizePaymentStatus(raw: Partial<PaymentStatusDetail> | undefined | null): PaymentStatusDetail {
  return {
    paid: raw?.paid ?? false,
    paidDate: raw?.paidDate ?? null,
    paidAmount: raw?.paidAmount ?? null,
    comment: raw?.comment ?? null,
    deferredMonths: raw?.deferredMonths ?? 0,
    deferredToMonthKey: raw?.deferredToMonthKey ?? null,
    deferredToMonthLabel: raw?.deferredToMonthLabel ?? null,
    deferredAt: raw?.deferredAt ?? null,
    deferredReason: raw?.deferredReason ?? null,
  }
}

export function mapSupabaseDealToCommissionDeal(row: Record<string, unknown>): CommissionDeal {
  const raw = row.payment_statuses as CommissionDeal['paymentStatuses'] | null | undefined
  return {
    id: row.id as string,
    effectiveDate: row.effective_date as string,
    clientName: row.client_name as string,
    mandataireName: row.mandataire_name as string,
    contractType: (row.contract_type as ContractType | null) ?? 'ASSURANCE_VIE',
    puAmount: Number(row.pu_amount ?? 0),
    ppAmount: Number(row.pp_amount ?? 0),
    puEntryFeesRate: Number(row.pu_entry_fees_rate ?? 3),
    ppPaymentFeesRate: Number(row.pp_payment_fees_rate ?? 3),
    isInstance: Boolean(row.is_instance ?? false),
    isContractOk: Boolean(row.is_contract_ok ?? false),
    comment: (row.comment as string | null) ?? null,
    deferToEndOfMonth: Boolean(row.defer_to_end_of_month ?? false),
    isEligibleForSurcommission: Boolean(row.is_eligible_for_surcommission ?? true),
    surcommissionEligibilityRate: Number(row.surcommission_eligibility_rate ?? 100),
    paymentStatuses: {
      M: normalizePaymentStatus(raw?.M),
      M_PLUS_1: normalizePaymentStatus(raw?.M_PLUS_1),
    },
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function mapCommissionDealToSupabase(
  deal: Partial<Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>>
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if ('effectiveDate' in deal) row.effective_date = deal.effectiveDate
  if ('clientName' in deal) row.client_name = deal.clientName
  if ('mandataireName' in deal) row.mandataire_name = deal.mandataireName
  if ('contractType' in deal) row.contract_type = deal.contractType
  if ('puAmount' in deal) row.pu_amount = deal.puAmount
  if ('ppAmount' in deal) row.pp_amount = deal.ppAmount
  if ('puEntryFeesRate' in deal) row.pu_entry_fees_rate = deal.puEntryFeesRate
  if ('ppPaymentFeesRate' in deal) row.pp_payment_fees_rate = deal.ppPaymentFeesRate
  if ('isInstance' in deal) row.is_instance = deal.isInstance
  if ('isContractOk' in deal) row.is_contract_ok = deal.isContractOk
  if ('comment' in deal) row.comment = deal.comment ?? null
  if ('deferToEndOfMonth' in deal) row.defer_to_end_of_month = deal.deferToEndOfMonth
  if ('isEligibleForSurcommission' in deal) row.is_eligible_for_surcommission = deal.isEligibleForSurcommission
  if ('surcommissionEligibilityRate' in deal) row.surcommission_eligibility_rate = deal.surcommissionEligibilityRate
  if ('paymentStatuses' in deal) row.payment_statuses = deal.paymentStatuses
  return row
}

export async function fetchDeals(): Promise<CommissionDeal[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilisateur non connecté')

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Erreur Supabase : impossible de charger les affaires — ${error.message}`)
  }

  return (data ?? []).map(row => mapSupabaseDealToCommissionDeal(row as Record<string, unknown>))
}

export async function createDeal(
  deal: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CommissionDeal> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilisateur non connecté')

  const now = new Date().toISOString()
  const row = {
    ...mapCommissionDealToSupabase(deal),
    user_id: user.id,
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await supabase.from(TABLE).insert(row).select().single()

  if (error) {
    console.error(error)
    throw new Error(`Erreur Supabase : impossible de créer l'affaire — ${error.message}`)
  }

  return mapSupabaseDealToCommissionDeal(data as Record<string, unknown>)
}

export async function updateDeal(
  id: string,
  updates: Partial<Omit<CommissionDeal, 'id' | 'createdAt'>>
): Promise<CommissionDeal> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilisateur non connecté')

  const row = {
    ...mapCommissionDealToSupabase(updates),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Erreur Supabase : impossible de modifier l'affaire — ${error.message}`)
  }

  return mapSupabaseDealToCommissionDeal(data as Record<string, unknown>)
}

export async function deleteDeal(id: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilisateur non connecté')

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Erreur Supabase : impossible de supprimer l'affaire — ${error.message}`)
  }
}

export async function duplicateDeal(id: string): Promise<CommissionDeal> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilisateur non connecté')

  const { data: original, error: fetchError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !original) {
    throw new Error(
      `Erreur Supabase : affaire introuvable — ${fetchError?.message ?? 'id inconnu'}`
    )
  }

  const mapped = mapSupabaseDealToCommissionDeal(original as Record<string, unknown>)
  const now = new Date().toISOString()
  const row = {
    ...mapCommissionDealToSupabase({
      ...mapped,
      clientName: `${mapped.clientName} (copie)`,
      paymentStatuses: {},
    }),
    user_id: user.id,
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await supabase.from(TABLE).insert(row).select().single()

  if (error) {
    throw new Error(`Erreur Supabase : impossible de dupliquer l'affaire — ${error.message}`)
  }

  return mapSupabaseDealToCommissionDeal(data as Record<string, unknown>)
}

export async function updatePaymentStatus(
  dealId: string,
  paymentType: 'M' | 'M_PLUS_1',
  status: PaymentStatusDetail
): Promise<CommissionDeal> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilisateur non connecté')

  const { data: current, error: fetchError } = await supabase
    .from(TABLE)
    .select('payment_statuses')
    .eq('id', dealId)
    .single()

  if (fetchError || !current) {
    throw new Error(
      `Erreur Supabase : affaire introuvable — ${fetchError?.message ?? 'id inconnu'}`
    )
  }

  const existing = (current.payment_statuses as CommissionDeal['paymentStatuses']) ?? {}
  const existingTypeStatus = (existing[paymentType] ?? {}) as Partial<PaymentStatusDetail>
  // Spread order: existing deferral fields first, then new payment fields (preserves deferral unless explicitly overridden)
  const mergedStatus: PaymentStatusDetail = { ...existingTypeStatus, ...status }
  const updatedStatuses = { ...existing, [paymentType]: mergedStatus }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ payment_statuses: updatedStatuses, updated_at: new Date().toISOString() })
    .eq('id', dealId)
    .select()
    .single()

  if (error) {
    throw new Error(
      `Erreur Supabase : impossible de mettre à jour le paiement — ${error.message}`
    )
  }

  return mapSupabaseDealToCommissionDeal(data as Record<string, unknown>)
}

export async function bulkCreateDeals(
  deals: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<CommissionDeal[]> {
  if (deals.length === 0) return []

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilisateur non connecté')

  const now = new Date().toISOString()
  const rows = deals.map(deal => ({
    ...mapCommissionDealToSupabase(deal),
    user_id: user.id,
    created_at: now,
    updated_at: now,
  }))

  const { data, error } = await supabase.from(TABLE).insert(rows).select()

  if (error) {
    throw new Error(`Erreur Supabase : impossible d'importer les affaires — ${error.message}`)
  }

  return (data ?? []).map(row => mapSupabaseDealToCommissionDeal(row as Record<string, unknown>))
}

export async function clearAllDeals(): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilisateur non connecté')

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', user.id)

  if (error) {
    throw new Error(
      `Erreur Supabase : impossible de réinitialiser les affaires — ${error.message}`
    )
  }
}

export async function migrateLocalStorageDealsToSupabase(): Promise<number> {
  if (typeof window === 'undefined') return 0

  const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!raw) return 0

  let localDeals: CommissionDeal[]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return 0
    localDeals = parsed as CommissionDeal[]
  } catch {
    return 0
  }

  if (localDeals.length === 0) return 0

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilisateur non connecté')

  const now = new Date().toISOString()
  const rows = localDeals.map(deal => ({
    ...mapCommissionDealToSupabase({
      effectiveDate: deal.effectiveDate,
      clientName: deal.clientName,
      mandataireName: deal.mandataireName,
      contractType: deal.contractType ?? 'ASSURANCE_VIE',
      puAmount: deal.puAmount,
      ppAmount: deal.ppAmount,
      puEntryFeesRate: deal.puEntryFeesRate ?? 3,
      ppPaymentFeesRate: deal.ppPaymentFeesRate ?? 3,
      isInstance: deal.isInstance,
      isContractOk: deal.isContractOk,
      comment: deal.comment ?? null,
      deferToEndOfMonth: deal.deferToEndOfMonth ?? false,
      isEligibleForSurcommission: deal.isEligibleForSurcommission ?? true,
      surcommissionEligibilityRate: deal.surcommissionEligibilityRate ?? 100,
      paymentStatuses: deal.paymentStatuses ?? {},
    }),
    user_id: user.id,
    created_at: deal.createdAt ?? now,
    updated_at: deal.updatedAt ?? now,
  }))

  const { data, error } = await supabase.from(TABLE).insert(rows).select()

  if (error) {
    throw new Error(`Erreur Supabase : migration impossible — ${error.message}`)
  }

  return (data ?? []).length
}

export async function deferPaymentToNextMonth(
  dealId: string,
  paymentType: 'M' | 'M_PLUS_1',
  reason: string | null
): Promise<CommissionDeal> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilisateur non connecté')

  const { data: current, error: fetchError } = await supabase
    .from(TABLE)
    .select('payment_statuses, effective_date')
    .eq('id', dealId)
    .single()

  if (fetchError || !current) {
    throw new Error(
      `Erreur Supabase : affaire introuvable — ${fetchError?.message ?? 'id inconnu'}`
    )
  }

  const existing = (current.payment_statuses as CommissionDeal['paymentStatuses']) ?? {}
  const currentStatus = normalizePaymentStatus(existing[paymentType])

  const effectiveDate = current.effective_date as string
  const commissionMonthKey = paymentType === 'M'
    ? getMonthM(effectiveDate)
    : getMonthMPlus1(effectiveDate)
  const initialPaymentMonthKey = addOneMonth(commissionMonthKey)
  const newDeferredMonths = (currentStatus.deferredMonths ?? 0) + 1
  const newFinalMonthKey = addNMonths(initialPaymentMonthKey, newDeferredMonths)

  const updatedStatus: PaymentStatusDetail = {
    ...currentStatus,
    deferredMonths: newDeferredMonths,
    deferredToMonthKey: newFinalMonthKey,
    deferredToMonthLabel: formatMonthLabel(newFinalMonthKey),
    deferredAt: new Date().toISOString(),
    deferredReason: reason || null,
  }

  const updatedStatuses = { ...existing, [paymentType]: updatedStatus }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ payment_statuses: updatedStatuses, updated_at: new Date().toISOString() })
    .eq('id', dealId)
    .select()
    .single()

  if (error) {
    throw new Error(
      `Erreur Supabase : impossible de reporter l'échéance — ${error.message}`
    )
  }

  return mapSupabaseDealToCommissionDeal(data as Record<string, unknown>)
}

export async function cancelPaymentDeferral(
  dealId: string,
  paymentType: 'M' | 'M_PLUS_1'
): Promise<CommissionDeal> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilisateur non connecté')

  const { data: current, error: fetchError } = await supabase
    .from(TABLE)
    .select('payment_statuses')
    .eq('id', dealId)
    .single()

  if (fetchError || !current) {
    throw new Error(
      `Erreur Supabase : affaire introuvable — ${fetchError?.message ?? 'id inconnu'}`
    )
  }

  const existing = (current.payment_statuses as CommissionDeal['paymentStatuses']) ?? {}
  const currentStatus = normalizePaymentStatus(existing[paymentType])

  const updatedStatus: PaymentStatusDetail = {
    ...currentStatus,
    deferredMonths: 0,
    deferredToMonthKey: null,
    deferredToMonthLabel: null,
    deferredAt: null,
    deferredReason: null,
  }

  const updatedStatuses = { ...existing, [paymentType]: updatedStatus }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ payment_statuses: updatedStatuses, updated_at: new Date().toISOString() })
    .eq('id', dealId)
    .select()
    .single()

  if (error) {
    throw new Error(
      `Erreur Supabase : impossible d'annuler le report — ${error.message}`
    )
  }

  return mapSupabaseDealToCommissionDeal(data as Record<string, unknown>)
}

export async function claimOrphanDeals(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Vous devez être connecté pour effectuer cette action')

  const { data, error } = await supabase
    .from(TABLE)
    .update({ user_id: user.id })
    .is('user_id', null)
    .select('id')

  if (error) {
    throw new Error(`Erreur Supabase : impossible de rattacher les affaires — ${error.message}`)
  }

  return (data ?? []).length
}
