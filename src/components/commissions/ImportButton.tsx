"use client"

import { useRef } from 'react'
import { CommissionDeal, ContractType } from '@/types/commission'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface ImportButtonProps {
  onImport: (deals: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>[]) => void
}

export function ImportButton({ onImport }: ImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function parseContractType(raw: string): ContractType {
    const normalized = raw.toLowerCase().trim()
    if (normalized === 'per') return 'PER'
    if (normalized.includes('82')) return 'ARTICLE_82'
    if (normalized === 'per_entreprise' || normalized === "per d'entreprise" || normalized === 'per entreprise') return 'PER_ENTREPRISE'
    if (normalized === 'transfert') return 'TRANSFERT'
    return 'ASSURANCE_VIE'
  }

  function parseCSV(text: string): Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>[] {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []

    const header = lines[0].split(';').map(h => h.replace(/"/g, '').trim().toLowerCase())
    const results: Omit<CommissionDeal, 'id' | 'createdAt' | 'updatedAt'>[] = []

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(';').map(c => c.replace(/"/g, '').trim())
      const row: Record<string, string> = {}
      header.forEach((h, idx) => { row[h] = cells[idx] ?? '' })

      const effectiveDate = row['date d\'effet'] || row['date'] || row['effectivedate'] || ''
      const clientName = row['client'] || row['clientname'] || ''
      const mandataireName = row['mandataire'] || row['mandatairename'] || ''
      const puAmount = parseFloat((row['pu'] || row['pu (€)'] || '0').replace(',', '.')) || 0
      const ppAmount = parseFloat((row['pp'] || row['pp (€)'] || '0').replace(',', '.')) || 0

      if (!effectiveDate || !clientName || !mandataireName) continue
      if (puAmount === 0 && ppAmount === 0) continue

      // Eligibilité surcommission — colonnes acceptées (variantes avec/sans accents)
      const eligibleRaw = row['eligible surcommission'] || row['éligible surcommission'] || row['eligiblesurcommission'] || ''
      const isEligibleForSurcommission = eligibleRaw === '' ? true : eligibleRaw.toLowerCase() === 'oui'

      const rateRaw = row['taux eligibilite (%)'] || row['taux éligibilité (%)'] || row['taux eligibilite'] || row['taux éligibilité'] || ''
      const surcommissionEligibilityRate = rateRaw === '' ? 100 : (parseFloat(rateRaw.replace(',', '.')) || 100)

      const contractTypeRaw = (row['type de contrat'] || row['type contrat'] || row['contracttype'] || '').trim()
      const contractType = parseContractType(contractTypeRaw)

      const puFeesRaw = row['frais entrée pu'] || row['frais entree pu'] || row['frais d\'entrée pu'] || row["frais d'entree pu"] || ''
      const puEntryFeesRate = puFeesRaw === '' ? 3 : (parseFloat(puFeesRaw.replace(',', '.')) || 3)

      const ppFeesRaw = row['frais versement pp'] || row['frais de versement pp'] || ''
      const ppPaymentFeesRate = ppFeesRaw === '' ? 3 : (parseFloat(ppFeesRaw.replace(',', '.')) || 3)

      results.push({
        effectiveDate,
        clientName,
        mandataireName,
        puAmount,
        ppAmount,
        isInstance: (row['instance'] || '').toLowerCase() === 'oui',
        isContractOk: (row['contrat ok'] || row['contratok'] || '').toLowerCase() === 'oui',
        deferToEndOfMonth: (row['report fin de mois'] || '').toLowerCase() === 'oui',
        isEligibleForSurcommission,
        surcommissionEligibilityRate,
        contractType,
        puEntryFeesRate,
        ppPaymentFeesRate,
        comment: row['commentaire'] || undefined,
      })
    }
    return results
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const deals = parseCSV(text)
      if (deals.length > 0) onImport(deals)
      if (inputRef.current) inputRef.current.value = ''
    }
    reader.readAsText(file, 'UTF-8')
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" onClick={() => inputRef.current?.click()} className="gap-2">
        <Upload className="h-4 w-4" />
        Importer CSV
      </Button>
    </>
  )
}
