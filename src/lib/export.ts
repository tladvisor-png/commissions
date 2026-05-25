import { CommissionDeal, EncaissementEntry, CalculatedDeal, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { calculateDeal, formatMonthLabel, getEffectivePuEntryFeesRate, getEffectivePpPaymentFeesRate, getNetEntryFeesRate } from './commission-calculations'
import { format } from 'date-fns'

function formatAmount(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

export function exportToCSV(deals: CommissionDeal[]): void {
  const calculated = deals.map(calculateDeal)
  const headers = [
    'Date d\'effet',
    'Type de contrat',
    'Mois M',
    'Mois M+1',
    'Client',
    'Mandataire',
    'PU (€)',
    'PP (€)',
    'Frais entrée PU (%)',
    'Frais versement PP (%)',
    'Eligible surcommission',
    'Taux eligibilite (%)',
    'Base théorique PU (€)',
    'Base théorique PP (€)',
    'Base théorique totale (€)',
    'Base réelle PU (€)',
    'Base réelle PP (€)',
    'Base réelle totale (€)',
    'Montant théorique non retenu (€)',
    'À négocier avec l\'UNEP',
    'Surcomm. M (€)',
    'Surcomm. M+1 (€)',
    'CA PU (€)',
    'CA PP (€)',
    'CA total Assentis (€)',
    'Instance',
    'Contrat OK',
    'Report fin de mois',
    'Commentaire',
  ]

  const rows = calculated.map(d => [
    d.effectiveDate,
    d.contractType ? (CONTRACT_TYPE_LABELS[d.contractType] ?? d.contractType) : 'Assurance vie',
    formatMonthLabel(d.monthM),
    formatMonthLabel(d.monthMPlus1),
    d.clientName,
    d.mandataireName,
    formatAmount(d.puAmount),
    formatAmount(d.ppAmount),
    String(d.effectivePuEntryFeesRate),
    String(d.effectivePpPaymentFeesRate),
    d.isEligibleForSurcommission ? 'Oui' : 'Non',
    String(d.surcommissionEligibilityRate),
    formatAmount(d.theoreticalBasePU),
    formatAmount(d.theoreticalBasePP),
    formatAmount(d.theoreticalBaseTotal),
    formatAmount(d.basePU),
    formatAmount(d.basePP),
    formatAmount(d.baseTotal),
    formatAmount(d.theoreticalBaseTotal - d.baseTotal),
    d.needsUnepNegotiation ? 'Oui' : 'Non',
    formatAmount(d.payAtM),
    formatAmount(d.payAtMPlus1),
    formatAmount(d.caPU),
    formatAmount(d.caPP),
    formatAmount(d.caTotal),
    d.isInstance ? 'Oui' : 'Non',
    d.isContractOk ? 'Oui' : 'Non',
    d.deferToEndOfMonth ? 'Oui' : 'Non',
    d.comment ?? '',
  ])

  const totalPU = calculated.reduce((s, d) => s + d.puAmount, 0)
  const totalPP = calculated.reduce((s, d) => s + d.ppAmount, 0)
  const totalTheoreticalBase = calculated.reduce((s, d) => s + d.theoreticalBaseTotal, 0)
  const totalRealBase = calculated.reduce((s, d) => s + d.baseTotal, 0)
  const totalNonRetained = totalTheoreticalBase - totalRealBase
  const totalM = calculated.reduce((s, d) => s + d.payAtM, 0)
  const totalMPlus1 = calculated.reduce((s, d) => s + d.payAtMPlus1, 0)
  const totalCaPU = calculated.reduce((s, d) => s + d.caPU, 0)
  const totalCaPP = calculated.reduce((s, d) => s + d.caPP, 0)
  const totalCA = calculated.reduce((s, d) => s + d.caTotal, 0)

  const totalsRow = [
    'TOTAL',
    '', '', '', '', '',
    formatAmount(totalPU),
    formatAmount(totalPP),
    '', '',
    '', '',
    formatAmount(totalTheoreticalBase),
    '', '',
    formatAmount(totalRealBase),
    '', '',
    formatAmount(totalNonRetained),
    '',
    formatAmount(totalM),
    formatAmount(totalMPlus1),
    formatAmount(totalCaPU),
    formatAmount(totalCaPP),
    formatAmount(totalCA),
    '', '', '', '',
  ]

  const csvContent = [headers, ...rows, totalsRow]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n')

  const bom = '﻿'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const fileName = `suivi_commissionnement_mandataires_${format(new Date(), 'yyyy-MM-dd')}.csv`
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportToExcel(deals: CommissionDeal[]): Promise<void> {
  const XLSX = await import('xlsx')
  const calculated = deals.map(calculateDeal)

  const headers = [
    'Date d\'effet',
    'Type de contrat',
    'Mois M',
    'Mois M+1',
    'Client',
    'Mandataire',
    'PU (€)',
    'PP (€)',
    'Frais entrée PU (%)',
    'Frais versement PP (%)',
    'Eligible surcommission',
    'Taux eligibilite (%)',
    'Base théorique PU (€)',
    'Base théorique PP (€)',
    'Base théorique totale (€)',
    'Base réelle PU (€)',
    'Base réelle PP (€)',
    'Base réelle totale (€)',
    'Montant théorique non retenu (€)',
    'À négocier avec l\'UNEP',
    'Surcomm. M (€)',
    'Surcomm. M+1 (€)',
    'CA PU (€)',
    'CA PP (€)',
    'CA total Assentis (€)',
    'Instance',
    'Contrat OK',
    'Report fin de mois',
    'Commentaire',
  ]

  const dataRows = calculated.map(d => [
    d.effectiveDate,
    d.contractType ? (CONTRACT_TYPE_LABELS[d.contractType] ?? d.contractType) : 'Assurance vie',
    formatMonthLabel(d.monthM),
    formatMonthLabel(d.monthMPlus1),
    d.clientName,
    d.mandataireName,
    d.puAmount,
    d.ppAmount,
    d.effectivePuEntryFeesRate,
    d.effectivePpPaymentFeesRate,
    d.isEligibleForSurcommission ? 'Oui' : 'Non',
    d.surcommissionEligibilityRate,
    d.theoreticalBasePU,
    d.theoreticalBasePP,
    d.theoreticalBaseTotal,
    d.basePU,
    d.basePP,
    d.baseTotal,
    d.theoreticalBaseTotal - d.baseTotal,
    d.needsUnepNegotiation ? 'Oui' : 'Non',
    d.payAtM,
    d.payAtMPlus1,
    d.caPU,
    d.caPP,
    d.caTotal,
    d.isInstance ? 'Oui' : 'Non',
    d.isContractOk ? 'Oui' : 'Non',
    d.deferToEndOfMonth ? 'Oui' : 'Non',
    d.comment ?? '',
  ])

  const totalPU = calculated.reduce((s, d) => s + d.puAmount, 0)
  const totalPP = calculated.reduce((s, d) => s + d.ppAmount, 0)
  const totalTheoreticalBase = calculated.reduce((s, d) => s + d.theoreticalBaseTotal, 0)
  const totalRealBase = calculated.reduce((s, d) => s + d.baseTotal, 0)
  const totalNonRetained = totalTheoreticalBase - totalRealBase
  const totalM = calculated.reduce((s, d) => s + d.payAtM, 0)
  const totalMPlus1 = calculated.reduce((s, d) => s + d.payAtMPlus1, 0)
  const totalCaPU = calculated.reduce((s, d) => s + d.caPU, 0)
  const totalCaPP = calculated.reduce((s, d) => s + d.caPP, 0)
  const totalCA = calculated.reduce((s, d) => s + d.caTotal, 0)

  const totalsRow = [
    'TOTAL', '', '', '', '', '',
    totalPU, totalPP, '', '',
    '', '',
    totalTheoreticalBase, '', '',
    totalRealBase, '', '',
    totalNonRetained, '',
    totalM, totalMPlus1,
    totalCaPU, totalCaPP, totalCA,
    '', '', '', '',
  ]

  const wsData = [headers, ...dataRows, totalsRow]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  ws['!cols'] = headers.map((_, i) => ({ wch: i < 4 ? 20 : 16 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Commissionnements')

  const fileName = `suivi_commissionnement_mandataires_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  XLSX.writeFile(wb, fileName)
}

export async function exportRevenueToExcel(deals: CalculatedDeal[]): Promise<void> {
  const XLSX = await import('xlsx')
  const { fr } = await import('date-fns/locale')
  const { format: formatDate } = await import('date-fns')

  const headers = [
    'Date d\'effet',
    'Mois',
    'Client',
    'Mandataire',
    'Type de contrat',
    'PU (€)',
    'PP (€)',
    'Frais entrée PU (%)',
    'Frais entrée nets PU (%)',
    'Frais versement PP (%)',
    'CA PU (€)',
    'CA PP (€)',
    'CA total Assentis (€)',
    'Instance',
    'Contrat OK',
    'Report fin de mois',
    'Éligible surcommission',
    'Taux éligibilité (%)',
    'Négociation UNEP',
    'Commentaire',
  ]

  const dataRows = deals.map(d => {
    let moisLabel = ''
    try {
      const [yr, mo] = d.monthM.split('-')
      moisLabel = formatDate(new Date(parseInt(yr), parseInt(mo) - 1, 1), 'MMM yyyy', { locale: fr })
    } catch { moisLabel = d.monthM }
    return [
      d.effectiveDate,
      moisLabel,
      d.clientName,
      d.mandataireName,
      d.contractType ? (CONTRACT_TYPE_LABELS[d.contractType] ?? d.contractType) : 'Assurance vie',
      d.puAmount,
      d.ppAmount,
      d.effectivePuEntryFeesRate,
      d.netEntryFeesRate,
      d.effectivePpPaymentFeesRate,
      d.caPU,
      d.caPP,
      d.caTotal,
      d.isInstance ? 'Oui' : 'Non',
      d.isContractOk ? 'Oui' : 'Non',
      d.deferToEndOfMonth ? 'Oui' : 'Non',
      d.isEligibleForSurcommission ? 'Oui' : 'Non',
      d.surcommissionEligibilityRate,
      d.needsUnepNegotiation ? 'Oui' : 'Non',
      d.comment ?? '',
    ]
  })

  const totalsRow = [
    'TOTAL', '', '', '', '',
    deals.reduce((s, d) => s + d.puAmount, 0),
    deals.reduce((s, d) => s + d.ppAmount, 0),
    '', '', '',
    deals.reduce((s, d) => s + d.caPU, 0),
    deals.reduce((s, d) => s + d.caPP, 0),
    deals.reduce((s, d) => s + d.caTotal, 0),
    '', '', '', '', '', '', '',
  ]

  const wsData = [headers, ...dataRows, totalsRow]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = headers.map((_, i) => ({ wch: i < 5 ? 22 : 16 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'CA Assentis')

  const fileName = `chiffre_affaires_assentis_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  XLSX.writeFile(wb, fileName)
}

export function exportEncaissementsToCSV(entries: EncaissementEntry[]): void {
  const headers = [
    'Mois commission',
    'Mois encaissement initial',
    'Mois encaissement final',
    'Date d\'effet',
    'Client',
    'Mandataire',
    'Type paiement',
    'Type de contrat',
    'PU (€)',
    'PP (€)',
    'Montant attendu (€)',
    'Payée',
    'Date paiement',
    'Montant payé (€)',
    'Delta (€)',
    'Instance',
    'Contrat OK',
    'Report fin de mois',
    'Négociation UNEP',
    'Reportée',
    'Nombre de mois reportés',
    'Date du report',
    'Raison du report',
    'Commentaire paiement',
  ]

  const rows = entries.map(e => [
    e.commissionMonthLabel,
    e.initialPaymentMonthLabel,
    e.paymentMonthLabel,
    e.effectiveDate,
    e.clientName,
    e.mandataireName,
    e.paymentType === 'M' ? 'M' : 'M+1',
    e.contractType ? (CONTRACT_TYPE_LABELS[e.contractType] ?? e.contractType) : 'Assurance vie',
    formatAmount(e.puAmount),
    formatAmount(e.ppAmount),
    formatAmount(e.expectedAmount),
    e.isPaid ? 'Oui' : 'Non',
    e.paidDate ?? '',
    e.paidAmount !== null ? formatAmount(e.paidAmount) : '',
    e.isPaid && e.paidAmount !== null ? formatAmount(e.expectedAmount - e.paidAmount) : '',
    e.isInstance ? 'Oui' : 'Non',
    e.isContractOk ? 'Oui' : 'Non',
    e.deferToEndOfMonth ? 'Oui' : 'Non',
    e.needsUnepNegotiation ? 'Oui' : 'Non',
    e.deferredMonths > 0 ? 'Oui' : 'Non',
    e.deferredMonths > 0 ? String(e.deferredMonths) : '',
    e.deferredAt ? new Date(e.deferredAt).toLocaleDateString('fr-FR') : '',
    e.deferredReason ?? '',
    e.paymentComment ?? '',
  ])

  const totalExpected = entries.reduce((s, e) => s + e.expectedAmount, 0)
  const paidEntries = entries.filter(e => e.isPaid)
  const totalPaid = paidEntries.reduce((s, e) => s + (e.paidAmount ?? e.expectedAmount), 0)

  const totalsRow = [
    'TOTAL', '', '', '', '', '', '', '', '', '',
    formatAmount(totalExpected),
    `${paidEntries.length}/${entries.length} payées`,
    '', formatAmount(totalPaid),
    formatAmount(totalExpected - totalPaid),
    '', '', '', '',
    `${entries.filter(e => e.deferredMonths > 0).length} reportée(s)`,
    '', '', '', '',
  ]

  const csvContent = [headers, ...rows, totalsRow]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n')

  const bom = '﻿'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const fileName = `encaissements_surcommissions_${format(new Date(), 'yyyy-MM-dd')}.csv`
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportEncaissementsToExcel(entries: EncaissementEntry[]): Promise<void> {
  const XLSX = await import('xlsx')

  const headers = [
    'Mois commission',
    'Mois encaissement initial',
    'Mois encaissement final',
    'Date d\'effet',
    'Client',
    'Mandataire',
    'Type paiement',
    'Type de contrat',
    'PU (€)',
    'PP (€)',
    'Montant attendu (€)',
    'Payée',
    'Date paiement',
    'Montant payé (€)',
    'Delta (€)',
    'Instance',
    'Contrat OK',
    'Report fin de mois',
    'Négociation UNEP',
    'Reportée',
    'Nombre de mois reportés',
    'Date du report',
    'Raison du report',
    'Commentaire paiement',
  ]

  const dataRows = entries.map(e => [
    e.commissionMonthLabel,
    e.initialPaymentMonthLabel,
    e.paymentMonthLabel,
    e.effectiveDate,
    e.clientName,
    e.mandataireName,
    e.paymentType === 'M' ? 'M' : 'M+1',
    e.contractType ? (CONTRACT_TYPE_LABELS[e.contractType] ?? e.contractType) : 'Assurance vie',
    e.puAmount,
    e.ppAmount,
    e.expectedAmount,
    e.isPaid ? 'Oui' : 'Non',
    e.paidDate ?? '',
    e.paidAmount ?? '',
    e.isPaid && e.paidAmount !== null ? e.expectedAmount - e.paidAmount : '',
    e.isInstance ? 'Oui' : 'Non',
    e.isContractOk ? 'Oui' : 'Non',
    e.deferToEndOfMonth ? 'Oui' : 'Non',
    e.needsUnepNegotiation ? 'Oui' : 'Non',
    e.deferredMonths > 0 ? 'Oui' : 'Non',
    e.deferredMonths > 0 ? e.deferredMonths : '',
    e.deferredAt ? new Date(e.deferredAt).toLocaleDateString('fr-FR') : '',
    e.deferredReason ?? '',
    e.paymentComment ?? '',
  ])

  const totalExpected = entries.reduce((s, e) => s + e.expectedAmount, 0)
  const paidEntries = entries.filter(e => e.isPaid)
  const totalPaid = paidEntries.reduce((s, e) => s + (e.paidAmount ?? e.expectedAmount), 0)

  const totalsRow = [
    'TOTAL', '', '', '', '', '', '', '', '', '',
    totalExpected,
    `${paidEntries.length}/${entries.length} payées`,
    '', totalPaid,
    totalExpected - totalPaid,
    '', '', '', '',
    `${entries.filter(e => e.deferredMonths > 0).length} reportée(s)`,
    '', '', '', '',
  ]

  const wsData = [headers, ...dataRows, totalsRow]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = headers.map((_, i) => ({ wch: i < 4 ? 20 : 16 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Encaissements')

  const fileName = `encaissements_surcommissions_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  XLSX.writeFile(wb, fileName)
}
