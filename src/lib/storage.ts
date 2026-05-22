import { CommissionDeal, PaymentStatusDetail } from '@/types/commission'

const STORAGE_KEY = 'commission_deals'

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

function migrateDeals(raw: unknown[]): CommissionDeal[] {
  return (raw as CommissionDeal[]).map(d => ({
    ...d,
    deferToEndOfMonth: d.deferToEndOfMonth ?? false,
    isEligibleForSurcommission: d.isEligibleForSurcommission ?? true,
    surcommissionEligibilityRate: d.surcommissionEligibilityRate ?? 100,
    paymentStatuses: d.paymentStatuses ?? {},
    contractType: d.contractType ?? 'ASSURANCE_VIE',
    puEntryFeesRate: d.puEntryFeesRate ?? 3,
    ppPaymentFeesRate: d.ppPaymentFeesRate ?? 3,
  }))
}

export function getDeals(): CommissionDeal[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return migrateDeals(parsed)
  } catch {
    return []
  }
}

export function saveDeals(deals: CommissionDeal[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals))
}

export function clearAllDeals(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function addDeal(deal: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>): CommissionDeal {
  const deals = getDeals()
  const now = new Date().toISOString()
  const newDeal: CommissionDeal = {
    ...deal,
    deferToEndOfMonth: deal.deferToEndOfMonth ?? false,
    isEligibleForSurcommission: deal.isEligibleForSurcommission ?? true,
    surcommissionEligibilityRate: deal.surcommissionEligibilityRate ?? 100,
    paymentStatuses: deal.paymentStatuses ?? {},
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }
  saveDeals([...deals, newDeal])
  return newDeal
}

export function updateDeal(id: string, updates: Partial<Omit<CommissionDeal, 'id' | 'createdAt'>>): CommissionDeal | null {
  const deals = getDeals()
  const index = deals.findIndex(d => d.id === id)
  if (index === -1) return null
  const updated: CommissionDeal = {
    ...deals[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  deals[index] = updated
  saveDeals(deals)
  return updated
}

export function deleteDeal(id: string): boolean {
  const deals = getDeals()
  const filtered = deals.filter(d => d.id !== id)
  if (filtered.length === deals.length) return false
  saveDeals(filtered)
  return true
}

export function duplicateDeal(id: string): CommissionDeal | null {
  const deals = getDeals()
  const original = deals.find(d => d.id === id)
  if (!original) return null
  const now = new Date().toISOString()
  const duplicate: CommissionDeal = {
    ...original,
    id: generateId(),
    clientName: original.clientName + ' (copie)',
    paymentStatuses: {},
    createdAt: now,
    updatedAt: now,
  }
  saveDeals([...deals, duplicate])
  return duplicate
}

export function updatePaymentStatus(
  dealId: string,
  paymentType: 'M' | 'M_PLUS_1',
  status: PaymentStatusDetail
): CommissionDeal | null {
  const deals = getDeals()
  const index = deals.findIndex(d => d.id === dealId)
  if (index === -1) return null
  const existing = deals[index]
  const updated: CommissionDeal = {
    ...existing,
    paymentStatuses: {
      ...existing.paymentStatuses,
      [paymentType]: status,
    },
    updatedAt: new Date().toISOString(),
  }
  deals[index] = updated
  saveDeals(deals)
  return updated
}
