import { CommissionDeal, ContractType, PaymentStatusDetail } from '@/types/commission'

export type RawCrmRow = {
  dateEnvoi: string
  mia: string
  contact: string
  produit: string
  puTransfert: string
  pp: string
  tauxRetenu: string
}

export type CrmImportResult = {
  totalRows: number
  created: number
  duplicates: number
  incomplete: number
  unknownProducts: string[]
  errors: string[]
  createdDeals: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>[]
}

function parseCrmAmount(raw: string): number {
  if (!raw || raw.trim() === '') return 0
  const cleaned = raw
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .replace(/,/g, '')
    .trim()
  if (!cleaned) return 0
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function parseCrmDate(raw: string): string {
  if (!raw || raw.trim() === '') return ''
  const str = raw.trim()
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  return ''
}

function parseCrmTauxRetenu(raw: string): number {
  if (!raw || raw.trim() === '') return 0
  const cleaned = raw.trim().replace('%', '').replace(',', '.').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function parseCrmContractType(produit: string): { type: ContractType; isUnknown: boolean } {
  const normalized = produit.toLowerCase().trim()
  if (!normalized) return { type: 'ASSURANCE_VIE', isUnknown: false }

  if (normalized.includes('transfert')) return { type: 'TRANSFERT', isUnknown: false }
  if (normalized === 'perob' || normalized.includes('per obligatoire')) return { type: 'PER_ENTREPRISE', isUnknown: false }
  if (normalized.includes('per entreprise') || normalized.includes("per d'entreprise") || normalized.includes('per_entreprise')) return { type: 'PER_ENTREPRISE', isUnknown: false }
  if (normalized === 'per') return { type: 'PER', isUnknown: false }
  if (normalized === 'article 82' || normalized === 'article82') return { type: 'ARTICLE_82', isUnknown: false }
  if (normalized.includes('assurance vie') || normalized.includes('assurance_vie')) return { type: 'ASSURANCE_VIE', isUnknown: false }

  return { type: 'ASSURANCE_VIE', isUnknown: true }
}

function isDuplicate(
  deal: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>,
  existing: CommissionDeal[]
): boolean {
  return existing.some(e =>
    e.effectiveDate === deal.effectiveDate &&
    e.clientName.trim().toLowerCase() === deal.clientName.trim().toLowerCase() &&
    e.mandataireName.trim().toLowerCase() === deal.mandataireName.trim().toLowerCase() &&
    e.puAmount === deal.puAmount &&
    e.ppAmount === deal.ppAmount &&
    e.contractType === deal.contractType
  )
}

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

export async function parseCrmExcelFile(file: File): Promise<{ rows: RawCrmRow[]; error?: string }> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = async e => {
      try {
        const XLSX = await import('xlsx')
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

        const rows: RawCrmRow[] = rawData.map(r => ({
          dateEnvoi: String(r["Date d'envoi"] ?? ''),
          mia: String(r['MIA'] ?? ''),
          contact: String(r['Contact - Entreprise - Compagnie'] ?? ''),
          produit: String(r['Produit'] ?? ''),
          puTransfert: String(r['PU/Transfert'] ?? ''),
          pp: String(r['PP'] ?? ''),
          tauxRetenu: String(r['Taux retenu'] ?? ''),
        }))

        resolve({ rows })
      } catch (err) {
        resolve({ rows: [], error: err instanceof Error ? err.message : 'Erreur de lecture du fichier' })
      }
    }
    reader.onerror = () => resolve({ rows: [], error: 'Erreur de lecture du fichier' })
    reader.readAsArrayBuffer(file)
  })
}

export function buildCrmDeals(
  rows: RawCrmRow[],
  existingDeals: CommissionDeal[]
): CrmImportResult {
  const result: CrmImportResult = {
    totalRows: rows.length,
    created: 0,
    duplicates: 0,
    incomplete: 0,
    unknownProducts: [],
    errors: [],
    createdDeals: [],
  }

  const unknownProductSet = new Set<string>()

  for (const row of rows) {
    const effectiveDate = parseCrmDate(row.dateEnvoi)
    const clientName = row.contact.trim()
    const mandataireName = row.mia.trim()
    const puAmount = parseCrmAmount(row.puTransfert)
    const ppAmount = parseCrmAmount(row.pp)

    if (!effectiveDate || !clientName || !mandataireName) {
      result.incomplete++
      continue
    }
    if (puAmount === 0 && ppAmount === 0) {
      result.incomplete++
      continue
    }

    const { type: contractType, isUnknown } = parseCrmContractType(row.produit)
    if (isUnknown && row.produit.trim()) {
      unknownProductSet.add(row.produit.trim())
    }

    // taux net + 0,5 % = taux brut (stocké dans le logiciel)
    const tauxNet = parseCrmTauxRetenu(row.tauxRetenu)
    const tauxBrut = Math.round((tauxNet + 0.5) * 10) / 10

    const deal: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'> = {
      effectiveDate,
      clientName,
      mandataireName,
      contractType,
      puAmount,
      ppAmount,
      puEntryFeesRate: tauxBrut,
      ppPaymentFeesRate: tauxBrut,
      isInstance: false,
      isContractOk: false,
      deferToEndOfMonth: false,
      isEligibleForSurcommission: true,
      surcommissionEligibilityRate: 100,
      comment: undefined,
      paymentStatuses: {
        M: { ...DEFAULT_PAYMENT_STATUS },
        M_PLUS_1: { ...DEFAULT_PAYMENT_STATUS },
      },
    }

    if (isDuplicate(deal, existingDeals)) {
      result.duplicates++
      continue
    }

    result.createdDeals.push(deal)
    result.created++
  }

  result.unknownProducts = Array.from(unknownProductSet)
  return result
}
