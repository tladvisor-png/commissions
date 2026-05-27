/**
 * export-pdf.ts — Récapitulatif exécutif des encaissements
 * Design: document de direction, synthétique, 1–2 pages max.
 * Aucune donnée Supabase n'est modifiée ici.
 */

import { EncaissementEntry, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─────────────────────────────────────────────────────────────────────────────
// Types utilitaires
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
  navy:       [15,  23,  42]  as RGB,  // slate-950
  dark:       [30,  41,  59]  as RGB,  // slate-800
  slate:      [71,  85, 105]  as RGB,  // slate-600
  muted:      [100, 116, 139] as RGB,  // slate-500
  border:     [226, 232, 240] as RGB,  // slate-200
  bg:         [248, 250, 252] as RGB,  // slate-50
  white:      [255, 255, 255] as RGB,
  blue:       [37,  99, 235]  as RGB,  // blue-600
  blue100:    [219, 234, 254] as RGB,
  blue50:     [239, 246, 255] as RGB,
  emerald:    [5,  150, 105]  as RGB,  // emerald-600
  emerald50:  [240, 253, 244] as RGB,
  orange:     [234,  88,  12] as RGB,  // orange-600
  orange50:   [255, 247, 237] as RGB,
  orange100:  [255, 237, 213] as RGB,
  amber:      [180, 100,   0] as RGB,  // amber foncé
  amber50:    [255, 251, 235] as RGB,
  red:        [185,  28,  28] as RGB,  // red-700
  red50:      [254, 242, 242] as RGB,
  violet:     [109,  40, 217] as RGB,  // violet-700
  violet50:   [245, 243, 255] as RGB,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Helpers métier — purs, testables
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

function entryStatusText(e: EncaissementEntry): { text: string; color: RGB; bg: RGB } {
  if (e.isInstance)
    return { text: 'Instance',   color: C.red,    bg: C.red50    }
  if (!e.isPaid && e.deferredMonths > 0)
    return { text: `Report +${e.deferredMonths}m`, color: C.violet, bg: C.violet50 }
  if (!e.isPaid)
    return { text: 'Non payée',  color: C.orange, bg: C.orange50  }
  if (e.paidAmount !== null && e.expectedAmount - e.paidAmount > 0.01)
    return { text: 'Partiel',    color: C.amber,  bg: C.amber50   }
  return   { text: 'Payée',      color: C.emerald, bg: C.emerald50 }
}

function contractLabel(e: EncaissementEntry): string {
  return e.contractType
    ? (CONTRACT_TYPE_LABELS[e.contractType] ?? e.contractType)
    : 'Ass. vie'
}

function generateExecutiveSummary(
  monthLabel: string,
  totalExpected: number,
  totalPaid: number,
  totalRemaining: number,
  unpaidEntries: EncaissementEntry[],
  varianceEntries: EncaissementEntry[],
  deferredEntries: EncaissementEntry[],
  instanceEntries: EncaissementEntry[],
  totalUnpaid: number,
  totalVariance: number,
  rate: number,
): string[] {
  if (totalExpected === 0) {
    return [
      `Aucune échéance de surcommission sur ${monthLabel}.`,
      'Aucun montant attendu pour ce mois.',
    ]
  }

  const line1 = totalRemaining < 0.01
    ? `Sur ${monthLabel}, ${formatPdfCurrency(totalExpected)} ont été intégralement encaissés (taux : 100%). Aucun reste à encaisser.`
    : `Sur ${monthLabel}, ${formatPdfCurrency(totalExpected)} étaient attendus en surcommissions. ${formatPdfCurrency(totalPaid)} ont été encaissés (taux : ${rate} %), soit un reste total à encaisser de ${formatPdfCurrency(totalRemaining)}.`

  const parts: string[] = []
  if (unpaidEntries.length > 0)
    parts.push(`${unpaidEntries.length} échéance${unpaidEntries.length > 1 ? 's' : ''} non payée${unpaidEntries.length > 1 ? 's' : ''} (${formatPdfCurrency(totalUnpaid)})`)
  if (varianceEntries.length > 0)
    parts.push(`${formatPdfCurrency(totalVariance)} d'écart${varianceEntries.length > 1 ? 's' : ''} de paiement`)
  if (deferredEntries.length > 0)
    parts.push(`${deferredEntries.length} report${deferredEntries.length > 1 ? 's' : ''} au mois suivant`)
  if (instanceEntries.length > 0)
    parts.push(`${instanceEntries.length} instance${instanceEntries.length > 1 ? 's' : ''} en cours`)

  const line2 = parts.length === 0
    ? 'Toutes les échéances ont été correctement réglées — aucune action requise.'
    : `Points d'attention : ${parts.join(' · ')}.`

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

  // ── Calculs ─────────────────────────────────────────────────────────────
  const paidEntries     = entries.filter(e => e.isPaid)
  const unpaidEntries   = entries.filter(e => !e.isPaid)
  const varianceEntries = entries.filter(
    e => e.isPaid && e.paidAmount !== null && e.expectedAmount - e.paidAmount > 0.01
  )
  const deferredEntries = entries.filter(e => e.deferredMonths > 0)
  const instanceEntries = entries.filter(e => e.isInstance)
  const criticalEntries = getCriticalEntries(entries)

  const totalExpected  = entries.reduce((s, e) => s + e.expectedAmount, 0)
  const totalPaid      = paidEntries.reduce((s, e) => s + (e.paidAmount ?? e.expectedAmount), 0)
  const totalUnpaid    = unpaidEntries.reduce((s, e) => s + e.expectedAmount, 0)
  const totalVariance  = varianceEntries.reduce((s, e) => s + (e.expectedAmount - (e.paidAmount ?? 0)), 0)
  const totalRemaining = totalExpected - totalPaid
  const rate           = getCollectionRate(totalPaid, totalExpected)

  // ── Document ─────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210
  const PH = 297
  const MX = 14          // marge gauche/droite
  const CW = PW - MX * 2 // largeur contenu = 182mm
  const FOOTER_H = 12

  // ── Micro-helpers de style ────────────────────────────────────────────────
  const sf = (...c: RGB) => doc.setFillColor(...c)
  const st = (...c: RGB) => doc.setTextColor(...c)
  const sd = (...c: RGB) => doc.setDrawColor(...c)
  const setFont = (style: 'normal' | 'bold' | 'italic', size: number) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
  }

  // ── drawFooter ────────────────────────────────────────────────────────────
  function drawFooter(totalPages: number) {
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      sd(...C.border)
      doc.setLineWidth(0.3)
      doc.line(MX, PH - FOOTER_H, PW - MX, PH - FOOTER_H)
      setFont('normal', 7)
      st(...C.muted)
      doc.text('Pilotage Commissionnement — Récapitulatif encaissements', MX, PH - FOOTER_H + 4.5)
      doc.text(`Page ${i} / ${totalPages}`, PW - MX, PH - FOOTER_H + 4.5, { align: 'right' })
    }
  }

  // ── drawKpiCard ───────────────────────────────────────────────────────────
  function drawKpiCard(
    x: number, y: number, w: number, h: number,
    label: string, value: string, sub: string,
    valueColor: RGB, borderColor: RGB, bgColor: RGB
  ) {
    // Fond + bordure fine
    sf(...bgColor); doc.roundedRect(x, y, w, h, 2.5, 2.5, 'F')
    sd(...borderColor); doc.setLineWidth(0.3)
    doc.roundedRect(x, y, w, h, 2.5, 2.5, 'S')
    // Top accent line
    sf(...borderColor)
    doc.roundedRect(x, y, w, 1.5, 0.5, 0.5, 'F')

    // Label
    setFont('normal', 6.5); st(...C.muted)
    doc.text(label.toUpperCase(), x + w / 2, y + 8, { align: 'center', maxWidth: w - 4 })

    // Valeur principale
    setFont('bold', 14); st(...valueColor)
    doc.text(value, x + w / 2, y + 17, { align: 'center' })

    // Sous-titre
    setFont('normal', 6.5); st(...C.muted)
    doc.text(sub, x + w / 2, y + h - 3.5, { align: 'center', maxWidth: w - 4 })
  }

  // ── drawSectionTitle ──────────────────────────────────────────────────────
  function drawSectionTitle(y: number, title: string, accent: RGB): number {
    if (y > PH - FOOTER_H - 50) { doc.addPage(); y = 16 }
    // Pastille colorée
    sf(...accent); doc.circle(MX + 1.5, y + 3, 1.8, 'F')
    setFont('bold', 9.5); st(...C.dark)
    doc.text(title, MX + 5.5, y + 5.5)
    // Filet bas
    sd(...C.border); doc.setLineWidth(0.2)
    doc.line(MX, y + 8.5, MX + CW, y + 8.5)
    return y + 12
  }

  // ── drawEmptyState ────────────────────────────────────────────────────────
  function drawEmptyState(y: number, msg: string): number {
    sf(...C.bg)
    doc.roundedRect(MX, y, CW, 12, 2, 2, 'F')
    sd(...C.border); doc.setLineWidth(0.2)
    doc.roundedRect(MX, y, CW, 12, 2, 2, 'S')
    setFont('italic', 8.5); st(...C.muted)
    doc.text(msg, MX + CW / 2, y + 7.5, { align: 'center' })
    return y + 16
  }

  // ─────────────────────────────────────────────────────────────────────────
  // A. EN-TÊTE
  // ─────────────────────────────────────────────────────────────────────────
  const HEADER_H = 44
  sf(...C.navy); doc.rect(0, 0, PW, HEADER_H, 'F')

  // Barre accent gauche (bleu vif)
  sf(...C.blue); doc.rect(0, 0, 5, HEADER_H, 'F')

  // Surtitle discret
  setFont('normal', 6.5); st(100, 116, 139)
  doc.text('PILOTAGE COMMISSIONNEMENT', MX + 5, 9)

  // Titre principal
  setFont('bold', 19); st(...C.white)
  doc.text('Récapitulatif Encaissements', MX + 5, 21)

  // Mois + mandataire
  setFont('normal', 11); st(148, 163, 184)
  const subLine = mandataireFilter
    ? `${monthLabel}  ·  ${mandataireFilter}`
    : monthLabel
  doc.text(subLine, MX + 5, 31)

  // Date de génération (droite)
  const dateLabel = format(new Date(), 'dd MMMM yyyy', { locale: fr })
  setFont('normal', 7.5); st(100, 116, 139)
  doc.text(`Généré le ${dateLabel}`, PW - MX, 16, { align: 'right' })

  // Badge "Supabase" discret
  sf(37, 99, 235); doc.roundedRect(PW - MX - 33, 21, 33, 6.5, 1.5, 1.5, 'F')
  setFont('normal', 6); st(...C.white)
  doc.text('Données synchronisées · Supabase', PW - MX - 1.5, 25.8, { align: 'right' })

  // Filet bas d'accent
  sf(...C.blue); doc.rect(0, HEADER_H - 1.5, PW, 1.5, 'F')

  let y = HEADER_H + 9

  // ─────────────────────────────────────────────────────────────────────────
  // B. SYNTHÈSE EXÉCUTIVE
  // ─────────────────────────────────────────────────────────────────────────
  const [execLine1, execLine2] = generateExecutiveSummary(
    monthLabel, totalExpected, totalPaid, totalRemaining,
    unpaidEntries, varianceEntries, deferredEntries, instanceEntries,
    totalUnpaid, totalVariance, rate
  )

  // Ligne 1 : phrase principale
  const lines1 = doc.splitTextToSize(execLine1, CW)
  setFont('normal', 9.5); st(...C.dark)
  doc.text(lines1, MX, y)
  y += lines1.length * 5.5

  // Ligne 2 : points d'attention
  const lines2 = doc.splitTextToSize(execLine2, CW)
  setFont('normal', 8.5)
  st(totalRemaining > 0.01 ? C.orange[0] : C.emerald[0],
     totalRemaining > 0.01 ? C.orange[1] : C.emerald[1],
     totalRemaining > 0.01 ? C.orange[2] : C.emerald[2])
  doc.text(lines2, MX, y)
  y += lines2.length * 5 + 10

  // ─────────────────────────────────────────────────────────────────────────
  // C. 4 KPI CARDS
  // ─────────────────────────────────────────────────────────────────────────
  const CARD_H = 30
  const CARD_W = (CW - 3 * 4) / 4  // 4 cartes, 3 gaps de 4mm

  const rateStr = `${rate} %`
  const kpis = [
    {
      label: 'Attendu',
      value: formatPdfCurrency(totalExpected),
      sub: `${entries.length} échéance${entries.length !== 1 ? 's' : ''}`,
      valueColor: C.blue, border: C.blue100, bg: C.blue50,
    },
    {
      label: 'Encaissé',
      value: formatPdfCurrency(totalPaid),
      sub: `${paidEntries.length} payée${paidEntries.length !== 1 ? 's' : ''}`,
      valueColor: C.emerald, border: [167, 243, 208] as RGB, bg: C.emerald50,
    },
    {
      label: 'Reste à encaisser',
      value: formatPdfCurrency(totalRemaining),
      sub: totalRemaining < 0.01 ? 'Tout encaissé ✓' : 'Non payé + écarts',
      valueColor: totalRemaining < 0.01 ? C.emerald : C.orange,
      border: totalRemaining < 0.01 ? [167, 243, 208] as RGB : C.orange100,
      bg: totalRemaining < 0.01 ? C.emerald50 : C.orange50,
    },
    {
      label: "Taux d'encaissement",
      value: rateStr,
      sub: rate >= 100 ? 'Objectif atteint ✓' : `Objectif : 100 %`,
      valueColor: rate >= 90 ? C.emerald : rate >= 70 ? C.amber : C.orange,
      border: rate >= 90 ? [167, 243, 208] as RGB : rate >= 70 ? [253, 230, 138] as RGB : C.orange100,
      bg: rate >= 90 ? C.emerald50 : rate >= 70 ? C.amber50 : C.orange50,
    },
  ]

  kpis.forEach((k, i) => {
    drawKpiCard(MX + i * (CARD_W + 4), y, CARD_W, CARD_H, k.label, k.value, k.sub, k.valueColor, k.border, k.bg)
  })
  y += CARD_H + 9

  // ─────────────────────────────────────────────────────────────────────────
  // D. LECTURE RAPIDE — barre horizontale
  // ─────────────────────────────────────────────────────────────────────────
  const LR_H = 19
  sf(...C.bg); doc.roundedRect(MX, y, CW, LR_H, 2, 2, 'F')
  sd(...C.border); doc.setLineWidth(0.2)
  doc.roundedRect(MX, y, CW, LR_H, 2, 2, 'S')

  const lrItems = [
    { label: 'Réglées', value: `${paidEntries.length} / ${entries.length}`, color: C.emerald },
    { label: 'Non payées', value: String(unpaidEntries.length), color: unpaidEntries.length > 0 ? C.orange : C.muted },
    { label: 'Écarts de paiement', value: totalVariance > 0.01 ? formatPdfCurrency(totalVariance) : '—', color: totalVariance > 0.01 ? C.amber : C.muted },
    { label: 'Reports', value: String(deferredEntries.length), color: deferredEntries.length > 0 ? C.violet : C.muted },
  ]

  const lrItemW = CW / lrItems.length
  lrItems.forEach((item, i) => {
    const ix = MX + i * lrItemW + lrItemW / 2

    // Séparateur vertical (sauf le premier)
    if (i > 0) {
      sd(...C.border); doc.setLineWidth(0.3)
      doc.line(MX + i * lrItemW, y + 3, MX + i * lrItemW, y + LR_H - 3)
    }

    setFont('normal', 6.5); st(...C.muted)
    doc.text(item.label.toUpperCase(), ix, y + 6.5, { align: 'center' })

    setFont('bold', 11); st(...item.color)
    doc.text(item.value, ix, y + 14.5, { align: 'center' })
  })
  y += LR_H + 10

  // ─────────────────────────────────────────────────────────────────────────
  // E. POINTS À TRAITER — échéances critiques uniquement
  // ─────────────────────────────────────────────────────────────────────────
  y = drawSectionTitle(y, 'Points à traiter', C.orange)

  if (criticalEntries.length === 0) {
    y = drawEmptyState(y, 'Aucune échéance critique — toutes les surcommissions ont été réglées correctement.')
  } else {
    const critBody = criticalEntries.map(e => {
      const st2  = entryStatusText(e)
      const reste = getRemainingAmount(e)
      return [
        e.clientName,
        e.mandataireName,
        contractLabel(e),
        e.paymentType === 'M' ? 'M' : 'M+1',
        formatPdfCurrency(e.expectedAmount),
        e.isPaid && e.paidAmount !== null ? formatPdfCurrency(e.paidAmount) : '—',
        reste > 0.01 ? formatPdfCurrency(reste) : '—',
        st2.text,
      ]
    })

    autoTable(doc, {
      startY: y,
      head: [['Client', 'Mandataire', 'Contrat', 'Type', 'Attendu', 'Payé', 'Reste', 'Statut']],
      body: critBody,
      margin: { left: MX, right: MX },
      styles: {
        fontSize: 8,
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
        fontSize: 7.5,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: {
        0: { cellWidth: 36 },
        1: { cellWidth: 30 },
        2: { cellWidth: 22 },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 20 },
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
      foot: criticalEntries.length > 0 ? [[
        { content: `${criticalEntries.length} ligne${criticalEntries.length !== 1 ? 's' : ''} à traiter`, colSpan: 6, styles: { fontStyle: 'bold', fillColor: C.bg, textColor: C.muted, fontSize: 7 } },
        { content: formatPdfCurrency(criticalEntries.reduce((s, e) => s + getRemainingAmount(e), 0)), styles: { fontStyle: 'bold', halign: 'right' as const, fillColor: C.orange50, textColor: C.orange, fontSize: 8 } },
        { content: '', styles: { fillColor: C.bg } },
      ]] : undefined,
      showFoot: 'lastPage',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 10
  }

  // ─────────────────────────────────────────────────────────────────────────
  // F. DÉTAIL DES ÉCARTS (conditionnel)
  // ─────────────────────────────────────────────────────────────────────────
  if (varianceEntries.length > 0) {
    y = drawSectionTitle(y, 'Détail des écarts de paiement', C.amber)

    const varBody = varianceEntries.map(e => [
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
        fontSize: 8,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        lineColor: C.border, lineWidth: 0.2, textColor: C.dark,
      },
      headStyles: { fillColor: [120, 80, 0] as RGB, textColor: C.white, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: C.amber50 },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 35 },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 21 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          data.cell.styles.textColor = C.amber
          data.cell.styles.fontStyle = 'bold'
        }
      },
      foot: [[
        { content: 'Total écarts', colSpan: 4, styles: { fontStyle: 'bold', fillColor: C.bg, textColor: C.muted, fontSize: 7 } },
        { content: formatPdfCurrency(totalVariance), styles: { fontStyle: 'bold', halign: 'right' as const, fillColor: C.amber50, textColor: C.amber, fontSize: 8 } },
        { content: '', styles: { fillColor: C.bg } },
      ]],
      showFoot: 'lastPage',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 10
  }

  // ─────────────────────────────────────────────────────────────────────────
  // G. REPORTS (conditionnel)
  // ─────────────────────────────────────────────────────────────────────────
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
        fontSize: 8,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        lineColor: C.border, lineWidth: 0.2, textColor: C.dark,
      },
      headStyles: { fillColor: C.violet, textColor: C.white, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: C.violet50 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 33 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          data.cell.styles.textColor = C.violet
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
    // (y non réutilisé après ici)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FOOTER — toutes les pages
  // ─────────────────────────────────────────────────────────────────────────
  drawFooter(doc.getNumberOfPages())

  // ─────────────────────────────────────────────────────────────────────────
  // TÉLÉCHARGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  const fileName = monthKey
    ? `recap_encaissements_mois_${monthKey}.pdf`
    : `recap_encaissements_mois_${format(new Date(), 'yyyy-MM-dd')}.pdf`

  doc.save(fileName)
}
