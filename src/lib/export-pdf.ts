/**
 * export-pdf.ts — Récapitulatif exécutif des encaissements
 * Design premium, document de direction, synthétique, 1–2 pages max.
 * Aucune donnée Supabase n'est modifiée ici.
 */

import { EncaissementEntry, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PdfExportParams {
  entries: EncaissementEntry[]
  monthLabel: string
  monthKey: string
  mandataireFilter?: string
}

type RGB = [number, number, number]

// Palette sobre et professionnelle
const C = {
  navy:      [15,  23,  42]  as RGB,
  dark:      [30,  41,  59]  as RGB,
  slate:     [71,  85, 105]  as RGB,
  muted:     [100, 116, 139] as RGB,
  border:    [226, 232, 240] as RGB,
  bg:        [248, 250, 252] as RGB,
  white:     [255, 255, 255] as RGB,
  blue:      [37,  99, 235]  as RGB,
  blue100:   [219, 234, 254] as RGB,
  blue50:    [239, 246, 255] as RGB,
  emerald:   [5,  150, 105]  as RGB,
  emerald50: [240, 253, 244] as RGB,
  emerald100:[167, 243, 208] as RGB,
  orange:    [234,  88,  12] as RGB,
  orange50:  [255, 247, 237] as RGB,
  orange100: [255, 237, 213] as RGB,
  amber:     [146,  64,  14] as RGB,
  amber50:   [255, 251, 235] as RGB,
  amber100:  [253, 230, 138] as RGB,
  red:       [185,  28,  28] as RGB,
  red50:     [254, 242, 242] as RGB,
  violet:    [109,  40, 217] as RGB,
  violet50:  [245, 243, 255] as RGB,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Helpers métier
// ─────────────────────────────────────────────────────────────────────────────

export function formatPdfCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n)
}

export function getCollectionRate(paid: number, expected: number): number {
  if (expected <= 0) return 0
  return Math.round((paid / expected) * 100)
}

export function getRemainingAmount(e: EncaissementEntry): number {
  if (!e.isPaid) return e.expectedAmount
  if (e.paidAmount !== null && e.expectedAmount - e.paidAmount > 0.01)
    return e.expectedAmount - e.paidAmount
  return 0
}

export function getCriticalEntries(entries: EncaissementEntry[]): EncaissementEntry[] {
  return entries.filter(e =>
    !e.isPaid ||
    (e.isPaid && e.paidAmount !== null && e.expectedAmount - e.paidAmount > 0.01) ||
    e.deferredMonths > 0 ||
    e.isInstance
  )
}

function entryStatusText(e: EncaissementEntry): { text: string; color: RGB } {
  if (e.isInstance)
    return { text: 'Instance',              color: C.red    }
  if (!e.isPaid && e.deferredMonths > 0)
    return { text: `Report +${e.deferredMonths}m`, color: C.violet }
  if (!e.isPaid)
    return { text: 'Non payée',             color: C.orange }
  if (e.paidAmount !== null && e.expectedAmount - e.paidAmount > 0.01)
    return { text: 'Écart',                 color: C.amber  }
  return   { text: 'Payée',                 color: C.emerald}
}

function contractLabel(e: EncaissementEntry): string {
  return e.contractType ? (CONTRACT_TYPE_LABELS[e.contractType] ?? e.contractType) : 'Ass. vie'
}

function generateExecutiveSummary(
  monthLabel: string,
  totalExpected: number,
  totalPaid: number,
  totalVariance: number,
  totalUnpaid: number,
  unpaidCount: number,
  deferredCount: number,
  instanceCount: number,
  rate: number,
): string[] {
  if (totalExpected === 0) {
    return [
      `Aucune échéance de surcommission enregistrée sur ${monthLabel}.`,
      'Aucun montant attendu pour ce mois.',
    ]
  }

  const allPaid = totalUnpaid < 0.01 && totalVariance < 0.01

  const line1 = allPaid
    ? `Sur ${monthLabel}, ${formatPdfCurrency(totalExpected)} de surcommissions ont été intégralement encaissés — taux d'encaissement : 100 %.`
    : `Sur ${monthLabel}, ${formatPdfCurrency(totalExpected)} étaient attendus en surcommissions. ${formatPdfCurrency(totalPaid)} ont été encaissés (taux : ${rate} %).`

  const parts: string[] = []
  if (unpaidCount > 0)
    parts.push(`${unpaidCount} échéance${unpaidCount > 1 ? 's' : ''} non payée${unpaidCount > 1 ? 's' : ''} (${formatPdfCurrency(totalUnpaid)})`)
  if (totalVariance > 0.01)
    parts.push(`${formatPdfCurrency(totalVariance)} d'écarts / non retenus`)
  if (deferredCount > 0)
    parts.push(`${deferredCount} report${deferredCount > 1 ? 's' : ''} au mois suivant`)
  if (instanceCount > 0)
    parts.push(`${instanceCount} instance${instanceCount > 1 ? 's' : ''} en cours`)

  const line2 = allPaid
    ? 'Toutes les échéances ont été correctement réglées — aucune action requise.'
    : parts.length > 0
    ? `Points d'attention : ${parts.join(' · ')}.`
    : 'Aucune action opérationnelle restante.'

  return [line1, line2]
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonction principale
// ─────────────────────────────────────────────────────────────────────────────

export async function exportEncaissementsPdf({
  entries,
  monthLabel,
  monthKey,
  mandataireFilter,
}: PdfExportParams): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  // ── Calculs ─────────────────────────────────────────────────────────────────
  const paidEntries     = entries.filter(e => e.isPaid)
  const unpaidEntries   = entries.filter(e => !e.isPaid)
  const varianceEntries = entries.filter(
    e => e.isPaid && e.paidAmount !== null && e.expectedAmount - e.paidAmount > 0.01
  )
  const deferredEntries = entries.filter(e => e.deferredMonths > 0)
  const instanceEntries = entries.filter(e => e.isInstance)
  const criticalEntries = getCriticalEntries(entries)

  const totalExpected = entries.reduce((s, e) => s + e.expectedAmount, 0)
  const totalPaid     = paidEntries.reduce((s, e) => s + (e.paidAmount ?? e.expectedAmount), 0)
  const totalUnpaid   = unpaidEntries.reduce((s, e) => s + e.expectedAmount, 0)
  const totalVariance = varianceEntries.reduce((s, e) => s + (e.expectedAmount - (e.paidAmount ?? 0)), 0)
  const totalRemaining = totalExpected - totalPaid
  const rate          = getCollectionRate(totalPaid, totalExpected)

  // Top-10 écarts par montant décroissant
  const top10Variance = [...varianceEntries]
    .sort((a, b) => (b.expectedAmount - (b.paidAmount ?? 0)) - (a.expectedAmount - (a.paidAmount ?? 0)))
    .slice(0, 10)
  const hiddenVarianceCount = varianceEntries.length - top10Variance.length

  // ── Document ─────────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210
  const PH = 297
  const MX = 14
  const CW = PW - MX * 2
  const FOOTER_H = 12

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const sf = (...c: RGB) => doc.setFillColor(...c)
  const st = (...c: RGB) => doc.setTextColor(...c)
  const sd = (...c: RGB) => doc.setDrawColor(...c)
  function setFont(style: 'normal' | 'bold' | 'italic', size: number) {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
  }

  function drawFooter(totalPages: number) {
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      sd(...C.border)
      doc.setLineWidth(0.3)
      doc.line(MX, PH - FOOTER_H, PW - MX, PH - FOOTER_H)
      setFont('normal', 7)
      st(...C.muted)
      doc.text('Pilotage Commissionnement — Récapitulatif encaissements', MX, PH - FOOTER_H + 4.5)
      doc.text(`Page ${i} / ${totalPages}`, PW - MX, PH - FOOTER_H + 4.5, { align: 'right' })
    }
  }

  function drawKpiCard(
    x: number, y: number, w: number, h: number,
    label: string, value: string, sub: string,
    valueColor: RGB, borderColor: RGB, bgColor: RGB
  ) {
    sf(...bgColor)
    doc.roundedRect(x, y, w, h, 2.5, 2.5, 'F')
    sd(...borderColor)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, w, h, 2.5, 2.5, 'S')
    // accent top
    sf(...borderColor)
    doc.roundedRect(x, y, w, 1.5, 0.5, 0.5, 'F')

    setFont('normal', 6.5)
    st(...C.muted)
    doc.text(label.toUpperCase(), x + w / 2, y + 8, { align: 'center', maxWidth: w - 4 })

    // Auto-reduce font if value too wide
    const valueLen = value.replace(/[^0-9]/g, '').length
    const valueFontSize = valueLen >= 8 ? 11 : 13
    setFont('bold', valueFontSize)
    st(...valueColor)
    doc.text(value, x + w / 2, y + 17.5, { align: 'center', maxWidth: w - 3 })

    setFont('normal', 6.5)
    st(...C.muted)
    doc.text(sub, x + w / 2, y + h - 3.5, { align: 'center', maxWidth: w - 4 })
  }

  function drawSectionTitle(y: number, title: string, accent: RGB): number {
    if (y > PH - FOOTER_H - 45) { doc.addPage(); y = 16 }
    sf(...accent)
    doc.circle(MX + 1.8, y + 3, 1.8, 'F')
    setFont('bold', 9.5)
    st(...C.dark)
    doc.text(title, MX + 6, y + 5.5)
    sd(...C.border)
    doc.setLineWidth(0.2)
    doc.line(MX, y + 8.5, MX + CW, y + 8.5)
    return y + 12
  }

  function drawEmptyState(y: number, msg: string): number {
    sf(...C.bg)
    doc.roundedRect(MX, y, CW, 12, 2, 2, 'F')
    sd(...C.border)
    doc.setLineWidth(0.2)
    doc.roundedRect(MX, y, CW, 12, 2, 2, 'S')
    setFont('italic', 8.5)
    st(...C.muted)
    doc.text(msg, MX + CW / 2, y + 7.5, { align: 'center' })
    return y + 16
  }

  // ── A. EN-TÊTE ───────────────────────────────────────────────────────────────
  const HEADER_H = 42
  sf(...C.navy)
  doc.rect(0, 0, PW, HEADER_H, 'F')
  // Barre accent gauche
  sf(...C.blue)
  doc.rect(0, 0, 4.5, HEADER_H, 'F')
  // Filet bas
  sf(...C.blue)
  doc.rect(0, HEADER_H - 1.5, PW, 1.5, 'F')

  setFont('normal', 6.5)
  st(100, 116, 139)
  doc.text('PILOTAGE COMMISSIONNEMENT', MX + 5, 9)

  setFont('bold', 18)
  st(...C.white)
  doc.text('Récapitulatif Encaissements', MX + 5, 21)

  setFont('normal', 10.5)
  st(148, 163, 184)
  const subLine = mandataireFilter ? `${monthLabel}  ·  ${mandataireFilter}` : monthLabel
  doc.text(subLine, MX + 5, 31)

  const dateLabel = format(new Date(), 'dd MMMM yyyy', { locale: fr })
  setFont('normal', 7.5)
  st(100, 116, 139)
  doc.text(`Généré le ${dateLabel}`, PW - MX, 16, { align: 'right' })

  sf(37, 99, 235)
  doc.roundedRect(PW - MX - 32, 22, 32, 6, 1.5, 1.5, 'F')
  setFont('normal', 5.8)
  st(...C.white)
  doc.text('Données synchronisées · Supabase', PW - MX - 1.5, 26.2, { align: 'right' })

  let y = HEADER_H + 9

  // ── B. SYNTHÈSE EXÉCUTIVE ────────────────────────────────────────────────────
  const [execLine1, execLine2] = generateExecutiveSummary(
    monthLabel, totalExpected, totalPaid,
    totalVariance, totalUnpaid,
    unpaidEntries.length, deferredEntries.length, instanceEntries.length, rate
  )

  const lines1 = doc.splitTextToSize(execLine1, CW)
  setFont('normal', 9.5)
  st(...C.dark)
  doc.text(lines1, MX, y)
  y += lines1.length * 5.5

  const lines2 = doc.splitTextToSize(execLine2, CW)
  setFont('normal', 8.5)
  const hasIssues = totalUnpaid > 0.01 || totalVariance > 0.01 || deferredEntries.length > 0 || instanceEntries.length > 0
  st(...(hasIssues ? C.orange : C.emerald))
  doc.text(lines2, MX, y)
  y += lines2.length * 5 + 10

  // ── C. 4 KPI CARDS ───────────────────────────────────────────────────────────
  const CARD_H = 31
  const GAP    = 4
  const CARD_W = (CW - GAP * 3) / 4

  const kpis = [
    {
      label: 'Attendu',
      value: formatPdfCurrency(totalExpected),
      sub: `${entries.length} échéance${entries.length !== 1 ? 's' : ''}`,
      valueColor: C.blue,
      border: C.blue100,
      bg: C.blue50,
    },
    {
      label: 'Encaissé',
      value: formatPdfCurrency(totalPaid),
      sub: `${paidEntries.length} payée${paidEntries.length !== 1 ? 's' : ''}`,
      valueColor: C.emerald,
      border: C.emerald100,
      bg: C.emerald50,
    },
    {
      label: 'Écart / non retenu',
      value: formatPdfCurrency(totalRemaining),
      sub: totalRemaining < 0.01
        ? 'Tout encaissé ✓'
        : totalUnpaid < 0.01
          ? 'Écart définitif'
          : 'Non payé + écart',
      valueColor: totalRemaining < 0.01 ? C.emerald : C.orange,
      border: totalRemaining < 0.01 ? C.emerald100 : C.orange100,
      bg: totalRemaining < 0.01 ? C.emerald50 : C.orange50,
    },
    {
      label: "Taux d'encaissement",
      value: `${rate} %`,
      sub: rate >= 100 ? 'Objectif atteint ✓' : `Sur ${formatPdfCurrency(totalExpected)}`,
      valueColor: rate >= 95 ? C.emerald : rate >= 75 ? C.amber : C.orange,
      border: rate >= 95 ? C.emerald100 : rate >= 75 ? C.amber100 : C.orange100,
      bg: rate >= 95 ? C.emerald50 : rate >= 75 ? C.amber50 : C.orange50,
    },
  ]

  kpis.forEach((k, i) => {
    drawKpiCard(
      MX + i * (CARD_W + GAP), y, CARD_W, CARD_H,
      k.label, k.value, k.sub,
      k.valueColor, k.border, k.bg
    )
  })
  y += CARD_H + 12

  // ── D. POINTS À TRAITER ──────────────────────────────────────────────────────
  y = drawSectionTitle(y, 'Points à traiter', C.orange)

  if (criticalEntries.length === 0) {
    y = drawEmptyState(y, 'Aucune action opérationnelle à traiter sur ce mois.')
  } else {
    const critBody = criticalEntries.map(e => {
      const s = entryStatusText(e)
      const reste = getRemainingAmount(e)
      return [
        e.clientName,
        e.mandataireName,
        contractLabel(e),
        e.paymentType === 'M' ? 'M' : 'M+1',
        formatPdfCurrency(e.expectedAmount),
        e.isPaid && e.paidAmount !== null ? formatPdfCurrency(e.paidAmount) : '—',
        reste > 0.01 ? formatPdfCurrency(reste) : '—',
        s.text,
      ]
    })

    const totalCritRemaining = criticalEntries.reduce((s, e) => s + getRemainingAmount(e), 0)

    autoTable(doc, {
      startY: y,
      head: [['Client', 'Mandataire', 'Contrat', 'Type', 'Attendu', 'Payé', 'Écart', 'Statut']],
      body: critBody,
      margin: { left: MX, right: MX },
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        overflow: 'linebreak',
        lineColor: C.border,
        lineWidth: 0.2,
        textColor: C.dark,
      },
      headStyles: {
        fillColor: C.dark,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 30 },
        2: { cellWidth: 22 },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 18 },
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return
        const entry = criticalEntries[data.row.index]
        if (!entry) return
        const s = entryStatusText(entry)
        if (data.column.index === 7) {
          data.cell.styles.textColor = s.color
          data.cell.styles.fontStyle = 'bold'
        }
        if (data.column.index === 6 && getRemainingAmount(entry) > 0.01) {
          data.cell.styles.textColor = entry.isInstance ? C.red : C.orange
          data.cell.styles.fontStyle = 'bold'
        }
      },
      foot: totalCritRemaining > 0.01 ? [[
        {
          content: `${criticalEntries.length} ligne${criticalEntries.length !== 1 ? 's' : ''} à traiter`,
          colSpan: 6,
          styles: { fontStyle: 'bold', fillColor: C.bg, textColor: C.muted, fontSize: 7 },
        },
        {
          content: formatPdfCurrency(totalCritRemaining),
          styles: { fontStyle: 'bold', halign: 'right' as const, fillColor: C.orange50, textColor: C.orange, fontSize: 7.5 },
        },
        { content: '', styles: { fillColor: C.bg } },
      ]] : undefined,
      showFoot: 'lastPage',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 12
  }

  // ── E. ÉCARTS DE PAIEMENT (conditionnel) ─────────────────────────────────────
  if (varianceEntries.length > 0) {
    y = drawSectionTitle(y, 'Détail des écarts de paiement', C.amber)

    const varBody = top10Variance.map(e => [
      e.clientName,
      e.mandataireName,
      formatPdfCurrency(e.expectedAmount),
      formatPdfCurrency(e.paidAmount ?? 0),
      formatPdfCurrency(e.expectedAmount - (e.paidAmount ?? 0)),
      e.paidDate ?? '—',
    ])

    autoTable(doc, {
      startY: y,
      head: [['Client', 'Mandataire', 'Attendu', 'Payé', 'Écart', 'Date paiement']],
      body: varBody,
      margin: { left: MX, right: MX },
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        lineColor: C.border,
        lineWidth: 0.2,
        textColor: C.dark,
      },
      headStyles: {
        fillColor: [120, 80, 0] as RGB,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: C.amber50 },
      columnStyles: {
        0: { cellWidth: 44 },
        1: { cellWidth: 36 },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 18 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          data.cell.styles.textColor = C.amber
          data.cell.styles.fontStyle = 'bold'
        }
      },
      foot: [[
        {
          content: hiddenVarianceCount > 0
            ? `Total (${top10Variance.length} / ${varianceEntries.length} affichés — + ${hiddenVarianceCount} autre${hiddenVarianceCount > 1 ? 's' : ''} dans l'export Excel)`
            : `Total écarts (${varianceEntries.length})`,
          colSpan: 4,
          styles: { fontStyle: 'bold', fillColor: C.bg, textColor: C.muted, fontSize: 6.5 },
        },
        {
          content: formatPdfCurrency(totalVariance),
          styles: { fontStyle: 'bold', halign: 'right' as const, fillColor: C.amber50, textColor: C.amber, fontSize: 7.5 },
        },
        { content: '', styles: { fillColor: C.bg } },
      ]],
      showFoot: 'lastPage',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 12
  }

  // ── F. REPORTS (conditionnel) ─────────────────────────────────────────────────
  if (deferredEntries.length > 0) {
    y = drawSectionTitle(y, 'Échéances reportées', C.violet)

    const defBody = deferredEntries.map(e => [
      e.clientName,
      e.mandataireName,
      e.initialPaymentMonthLabel,
      e.deferredToMonthLabel ?? '—',
      `+${e.deferredMonths} mois`,
      e.deferredReason ?? '—',
    ])

    autoTable(doc, {
      startY: y,
      head: [['Client', 'Mandataire', 'Mois initial', 'Mois final', 'Report', 'Raison']],
      body: defBody,
      margin: { left: MX, right: MX },
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        lineColor: C.border,
        lineWidth: 0.2,
        textColor: C.dark,
      },
      headStyles: {
        fillColor: C.violet,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: C.violet50 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 34 },
        2: { cellWidth: 27 },
        3: { cellWidth: 27 },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 36 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          data.cell.styles.textColor = C.violet
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  drawFooter(doc.getNumberOfPages())

  // ── TÉLÉCHARGEMENT ────────────────────────────────────────────────────────────
  const fileName = monthKey
    ? `recap_encaissements_${monthKey}.pdf`
    : `recap_encaissements_${format(new Date(), 'yyyy-MM-dd')}.pdf`

  doc.save(fileName)
}
