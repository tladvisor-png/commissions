/**
 * export-pdf.ts
 * Génération du récapitulatif PDF mensuel des encaissements.
 * Utilise jspdf + jspdf-autotable (imports dynamiques, compatible Next.js SSR).
 * Aucune donnée Supabase n'est modifiée ici.
 */

import { EncaissementEntry, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface PdfExportParams {
  entries: EncaissementEntry[]
  monthLabel: string
  monthKey: string
  mandataireFilter?: string
}

type RGB = [number, number, number]

const C = {
  dark:       [30,  41,  59]  as RGB, // slate-800
  slate:      [71,  85, 105]  as RGB, // slate-600
  slateLight: [241, 245, 249] as RGB, // slate-100
  slate200:   [226, 232, 240] as RGB, // slate-200
  muted:      [100, 116, 139] as RGB, // slate-500
  white:      [255, 255, 255] as RGB,
  blue:       [37,  99, 235]  as RGB, // blue-600
  blue50:     [239, 246, 255] as RGB,
  emerald:    [5,  150, 105]  as RGB, // emerald-600
  emerald50:  [236, 253, 245] as RGB,
  orange:     [234,  88,  12] as RGB, // orange-600
  orange50:   [255, 247, 237] as RGB,
  orange100:  [255, 237, 213] as RGB,
  amber:      [217, 119,   6] as RGB, // amber-600
  amber50:    [255, 251, 235] as RGB,
  amber100:   [254, 243, 199] as RGB,
  violet:     [124,  58, 237] as RGB, // violet-600
  violet50:   [245, 243, 255] as RGB,
  red:        [220,  38,  38] as RGB, // red-600
} as const

function fmtCur(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function contractLabel(entry: EncaissementEntry): string {
  return entry.contractType
    ? (CONTRACT_TYPE_LABELS[entry.contractType] ?? entry.contractType)
    : 'Ass. vie'
}

function entryStatus(e: EncaissementEntry): { text: string; color: RGB } {
  if (e.isInstance) return { text: 'Instance',   color: C.red }
  if (!e.isPaid) {
    if (e.deferredMonths > 0) return { text: `Report +${e.deferredMonths}m`, color: C.violet }
    return { text: 'Non payée', color: C.orange }
  }
  if (e.paidAmount !== null && e.expectedAmount - e.paidAmount > 0.01)
    return { text: 'Partielle', color: C.amber }
  return { text: 'Payée', color: C.emerald }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export function
// ─────────────────────────────────────────────────────────────────────────────

export async function exportEncaissementsPdf({
  entries,
  monthLabel,
  monthKey,
  mandataireFilter,
}: PdfExportParams): Promise<void> {
  // Imports dynamiques → côté client uniquement, pas de SSR
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const paidEntries     = entries.filter(e => e.isPaid)
  const unpaidEntries   = entries.filter(e => !e.isPaid)
  const varianceEntries = entries.filter(
    e => e.isPaid && e.paidAmount !== null && e.expectedAmount - e.paidAmount > 0.01
  )
  const deferredEntries = entries.filter(e => e.deferredMonths > 0)
  const instanceEntries = entries.filter(e => e.isInstance)

  const totalExpected = entries.reduce((s, e) => s + e.expectedAmount, 0)
  const totalPaid     = paidEntries.reduce((s, e) => s + (e.paidAmount ?? e.expectedAmount), 0)
  const totalUnpaid   = unpaidEntries.reduce((s, e) => s + e.expectedAmount, 0)
  const totalVariance = varianceEntries.reduce(
    (s, e) => s + (e.expectedAmount - (e.paidAmount ?? 0)), 0
  )
  const totalRemaining = totalUnpaid + totalVariance // = totalExpected - totalPaid

  // ── Document ───────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW     = 210
  const PH     = 297
  const MX     = 13        // marge horizontale
  const CW     = PW - MX * 2  // largeur contenu
  const generatedAt = format(new Date(), 'dd MMMM yyyy', { locale: fr })

  let y = 0

  // ── Helpers locaux ────────────────────────────────────────────────────────
  function setFill(...rgb: RGB) { doc.setFillColor(...rgb) }
  function setTxt(...rgb: RGB)  { doc.setTextColor(...rgb) }
  function setDraw(...rgb: RGB) { doc.setDrawColor(...rgb) }

  function kpiCard(
    x: number, cardY: number, w: number, h: number,
    label: string, value: string, sub: string,
    accentColor: RGB, bgColor: RGB
  ) {
    setFill(...bgColor)
    doc.roundedRect(x, cardY, w, h, 2, 2, 'F')
    setFill(...accentColor)
    doc.roundedRect(x, cardY, 2.5, h, 1, 1, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    setTxt(...C.muted)
    doc.text(label.toUpperCase(), x + 5, cardY + 5.5, { maxWidth: w - 6 })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setTxt(...accentColor)
    doc.text(value, x + 5, cardY + 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    setTxt(...C.muted)
    doc.text(sub, x + 5, cardY + h - 3.5, { maxWidth: w - 6 })
  }

  // Dessine un en-tête de section coloré. Retourne le nouveau y.
  function drawSectionHeader(currentY: number, title: string, count: number, accentColor: RGB): number {
    if (currentY > PH - 55) {
      doc.addPage()
      currentY = 14
    }
    setFill(...accentColor)
    doc.roundedRect(MX, currentY, 3, 9, 1, 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    setTxt(...C.dark)
    doc.text(title.toUpperCase(), MX + 6, currentY + 6.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setTxt(...C.muted)
    doc.text(
      `${count} ligne${count !== 1 ? 's' : ''}`,
      PW - MX, currentY + 6.2,
      { align: 'right' }
    )
    return currentY + 11
  }

  // Dessine une table de section ou un message vide. Retourne le nouveau y.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function drawSectionTable(currentY: number, sectionEntries: EncaissementEntry[], head: string[], body: string[][], accentColor: RGB): number {
    if (sectionEntries.length === 0) {
      setFill(...C.slateLight)
      doc.roundedRect(MX, currentY, CW, 10, 1.5, 1.5, 'F')
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      setTxt(...C.muted)
      doc.text('Aucune échéance concernée.', MX + CW / 2, currentY + 6.5, { align: 'center' })
      return currentY + 14
    }

    autoTable(doc, {
      startY: currentY,
      head: [head],
      body,
      margin: { left: MX, right: MX },
      tableLineColor: C.slate200,
      tableLineWidth: 0,
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
        overflow: 'linebreak',
        lineColor: C.slate200,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: accentColor,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] as RGB,
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((doc as any).lastAutoTable?.finalY ?? currentY) + 6
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. EN-TÊTE
  // ─────────────────────────────────────────────────────────────────────────
  setFill(...C.dark)
  doc.rect(0, 0, PW, 38, 'F')
  // Barre orange gauche
  setFill(...C.orange)
  doc.rect(0, 0, 4, 38, 'F')

  // Titre
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  setTxt(...C.white)
  doc.text('RÉCAPITULATIF DES ENCAISSEMENTS', MX + 4, 14)

  // Sous-titre
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setTxt(203, 213, 225) // slate-300
  const subtitle = mandataireFilter
    ? `Mois : ${monthLabel}  ·  Mandataire : ${mandataireFilter}`
    : `Mois d'encaissement : ${monthLabel}`
  doc.text(subtitle, MX + 4, 23)

  // Droite : date
  doc.setFontSize(8)
  setTxt(148, 163, 184) // slate-400
  doc.text(`Généré le ${generatedAt}`, PW - MX, 14, { align: 'right' })
  doc.text('Pilotage Commissionnement — Supabase', PW - MX, 21, { align: 'right' })

  y = 44

  // ─────────────────────────────────────────────────────────────────────────
  // 2. KPI ROW 1 — 3 grandes cartes
  // ─────────────────────────────────────────────────────────────────────────
  const r1W = (CW - 8) / 3
  const r1H = 24

  const row1 = [
    { label: 'Surcommissions attendues', value: fmtCur(totalExpected), sub: `${entries.length} échéance${entries.length !== 1 ? 's' : ''}`, accent: C.blue,    bg: C.blue50    },
    { label: 'Surcommissions payées',    value: fmtCur(totalPaid),     sub: `${paidEntries.length} payée${paidEntries.length !== 1 ? 's' : ''}`,   accent: C.emerald, bg: C.emerald50 },
    { label: 'Reste total à encaisser',  value: fmtCur(totalRemaining), sub: totalRemaining > 0 ? 'Non payé + écarts' : 'Tout est encaissé', accent: C.orange,  bg: C.orange50  },
  ]
  row1.forEach((card, i) => {
    kpiCard(MX + i * (r1W + 4), y, r1W, r1H, card.label, card.value, card.sub, card.accent, card.bg)
  })
  y += r1H + 4

  // ─────────────────────────────────────────────────────────────────────────
  // 3. KPI ROW 2 — 4 petites cartes
  // ─────────────────────────────────────────────────────────────────────────
  const r2W = (CW - 12) / 4
  const r2H = 20

  const row2 = [
    {
      label: 'Échéances payées',
      value: String(paidEntries.length),
      sub: fmtCur(totalPaid),
      accent: C.emerald, bg: C.emerald50,
    },
    {
      label: 'Non payées',
      value: String(unpaidEntries.length),
      sub: unpaidEntries.length > 0 ? fmtCur(totalUnpaid) : '—',
      accent: C.orange, bg: C.orange50,
    },
    {
      label: 'Écarts de paiement',
      value: fmtCur(totalVariance),
      sub: `${varianceEntries.length} avec écart`,
      accent: C.amber, bg: C.amber50,
    },
    {
      label: 'Échéances reportées',
      value: String(deferredEntries.length),
      sub: deferredEntries.length > 0 ? `Report décalé` : 'Aucun report',
      accent: C.violet, bg: C.violet50,
    },
  ]
  row2.forEach((card, i) => {
    kpiCard(MX + i * (r2W + 4), y, r2W, r2H, card.label, card.value, card.sub, card.accent, card.bg)
  })
  y += r2H + 6

  // ─────────────────────────────────────────────────────────────────────────
  // 4. SYNTHÈSE DU MOIS
  // ─────────────────────────────────────────────────────────────────────────
  const bullets: string[] = [
    `Total attendu : ${fmtCur(totalExpected)}`,
    `Total payé : ${fmtCur(totalPaid)} (${paidEntries.length} échéance${paidEntries.length !== 1 ? 's' : ''})`,
    `Reste à encaisser : ${fmtCur(totalRemaining)}`,
  ]
  if (unpaidEntries.length > 0)
    bullets.push(`${unpaidEntries.length} échéance${unpaidEntries.length !== 1 ? 's' : ''} restante${unpaidEntries.length !== 1 ? 's' : ''} à régulariser`)
  if (varianceEntries.length > 0)
    bullets.push(`${varianceEntries.length} écart${varianceEntries.length !== 1 ? 's' : ''} de paiement → ${fmtCur(totalVariance)} manquant${varianceEntries.length !== 1 ? 's' : ''}`)
  if (deferredEntries.length > 0)
    bullets.push(`${deferredEntries.length} échéance${deferredEntries.length !== 1 ? 's' : ''} reportée${deferredEntries.length !== 1 ? 's' : ''} au mois suivant`)
  if (instanceEntries.length > 0)
    bullets.push(`${instanceEntries.length} instance${instanceEntries.length !== 1 ? 's' : ''} en cours`)

  const colSize = Math.ceil(bullets.length / 2)
  const synthesisH = Math.max(28, colSize * 5.5 + 16)

  setFill(...C.slateLight)
  doc.roundedRect(MX, y, CW, synthesisH, 2, 2, 'F')
  // Barre gauche
  setFill(...C.slate)
  doc.roundedRect(MX, y, 2.5, synthesisH, 1, 1, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  setTxt(...C.dark)
  doc.text('SYNTHÈSE DU MOIS', MX + 6, y + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setTxt(...C.slate)

  const col1 = bullets.slice(0, colSize)
  const col2 = bullets.slice(colSize)
  const halfCW = CW / 2

  col1.forEach((line, i) => {
    doc.text(`• ${line}`, MX + 6, y + 13.5 + i * 5.5)
  })
  col2.forEach((line, i) => {
    doc.text(`• ${line}`, MX + halfCW + 4, y + 13.5 + i * 5.5)
  })

  y += synthesisH + 7

  // ─────────────────────────────────────────────────────────────────────────
  // 5. TABLEAU PRINCIPAL — toutes les échéances
  // ─────────────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  setTxt(...C.dark)
  doc.text('TABLEAU DES ÉCHÉANCES', MX, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setTxt(...C.muted)
  doc.text(
    entries.length === 0
      ? 'Aucune échéance pour ce mois.'
      : `${entries.length} échéance${entries.length !== 1 ? 's' : ''}`,
    PW - MX, y + 5, { align: 'right' }
  )
  y += 8

  const mainBody = entries.map(e => {
    const st    = entryStatus(e)
    const reste = !e.isPaid
      ? e.expectedAmount
      : (e.paidAmount !== null ? Math.max(0, e.expectedAmount - e.paidAmount) : 0)
    return [
      e.clientName,
      e.mandataireName,
      contractLabel(e),
      e.paymentMonthLabel,
      e.paymentType === 'M' ? 'M' : 'M+1',
      fmtCur(e.expectedAmount),
      e.isPaid && e.paidAmount !== null ? fmtCur(e.paidAmount) : '—',
      e.paidDate ?? '—',
      reste > 0.01 ? fmtCur(reste) : '—',
      st.text,
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['Client', 'Mandataire', 'Contrat', 'Mois enc.', 'Type', 'Attendu', 'Payé', 'Date paiem.', 'Reste', 'Statut']],
    body: mainBody,
    margin: { left: MX, right: MX },
    styles: {
      fontSize: 7,
      cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
      overflow: 'linebreak',
      lineColor: C.slate200,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: C.dark,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [249, 250, 251] as RGB },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 24 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 10 },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 20 },
      8: { cellWidth: 16, halign: 'right' },
      9: { cellWidth: 14 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const entry = entries[data.row.index]
        if (!entry) return
        const st = entryStatus(entry)
        // Statut
        if (data.column.index === 9) {
          data.cell.styles.textColor = st.color
          data.cell.styles.fontStyle = 'bold'
        }
        // Reste
        if (data.column.index === 8) {
          if (!entry.isPaid) data.cell.styles.textColor = C.orange
          else if (entry.paidAmount !== null && entry.expectedAmount - entry.paidAmount > 0.01)
            data.cell.styles.textColor = C.amber
        }
      }
    },
    foot: entries.length > 0 ? [[
      { content: `TOTAL (${entries.length})`, colSpan: 5, styles: { fontStyle: 'bold', fillColor: C.dark, textColor: C.white } },
      { content: fmtCur(totalExpected), styles: { fontStyle: 'bold', halign: 'right' as const, fillColor: C.dark, textColor: [147, 197, 253] as RGB } },
      { content: fmtCur(totalPaid),     styles: { fontStyle: 'bold', halign: 'right' as const, fillColor: C.dark, textColor: [110, 231, 183] as RGB } },
      { content: '', styles: { fillColor: C.dark } },
      { content: totalRemaining > 0.01 ? fmtCur(totalRemaining) : '—', styles: { fontStyle: 'bold', halign: 'right' as const, fillColor: C.dark, textColor: [253, 186, 116] as RGB } },
      { content: '', styles: { fillColor: C.dark } },
    ]] : undefined,
    showFoot: 'lastPage',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY ?? y) + 10

  // ─────────────────────────────────────────────────────────────────────────
  // 6. SECTION A — Échéances non payées
  // ─────────────────────────────────────────────────────────────────────────
  y = drawSectionHeader(y, 'Section A — Échéances non payées', unpaidEntries.length, C.orange)

  const unpaidBody = unpaidEntries.map(e => [
    e.clientName,
    e.mandataireName,
    contractLabel(e),
    e.paymentMonthLabel,
    e.paymentType === 'M' ? 'M' : 'M+1',
    fmtCur(e.expectedAmount),
    e.deferredMonths > 0 ? `Report +${e.deferredMonths} mois` : 'Non payée',
  ])

  y = drawSectionTable(y, unpaidEntries, ['Client', 'Mandataire', 'Contrat', 'Mois enc.', 'Type', 'Montant attendu', 'Statut'], unpaidBody, C.orange)

  if (unpaidEntries.length > 0) {
    setFill(...C.orange100)
    doc.roundedRect(MX, y, CW, 8, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    setTxt(...C.orange)
    doc.text(`Total non payé : ${fmtCur(totalUnpaid)}`, PW - MX - 4, y + 5.5, { align: 'right' })
    y += 12
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. SECTION B — Échéances payées avec écart
  // ─────────────────────────────────────────────────────────────────────────
  y = drawSectionHeader(y, 'Section B — Échéances payées avec écart', varianceEntries.length, C.amber)

  const varianceBody = varianceEntries.map(e => [
    e.clientName,
    e.mandataireName,
    contractLabel(e),
    e.paymentMonthLabel,
    fmtCur(e.expectedAmount),
    fmtCur(e.paidAmount ?? 0),
    fmtCur(e.expectedAmount - (e.paidAmount ?? 0)),
    e.paidDate ?? '—',
  ])

  y = drawSectionTable(y, varianceEntries, ['Client', 'Mandataire', 'Contrat', 'Mois enc.', 'Attendu', 'Payé', 'Écart restant', 'Date paiement'], varianceBody, C.amber)

  if (varianceEntries.length > 0) {
    setFill(...C.amber100)
    doc.roundedRect(MX, y, CW, 8, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    setTxt(...C.amber)
    doc.text(`Total écarts : ${fmtCur(totalVariance)}`, PW - MX - 4, y + 5.5, { align: 'right' })
    y += 12
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. ENCADRÉ RESTE TOTAL (si applicable)
  // ─────────────────────────────────────────────────────────────────────────
  if (totalRemaining > 0.01) {
    if (y > PH - 28) { doc.addPage(); y = 14 }
    setFill(...C.orange100)
    doc.roundedRect(MX, y, CW, 12, 2, 2, 'F')
    setFill(...C.orange)
    doc.roundedRect(MX, y, 3, 12, 1, 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    setTxt(...C.orange)
    doc.text(
      `RESTE TOTAL À ENCAISSER : ${fmtCur(totalRemaining)}`,
      PW / 2, y + 8,
      { align: 'center' }
    )
    y += 16
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. SECTION C — Échéances reportées
  // ─────────────────────────────────────────────────────────────────────────
  y = drawSectionHeader(y, 'Section C — Échéances reportées', deferredEntries.length, C.violet)

  const deferredBody = deferredEntries.map(e => [
    e.clientName,
    e.mandataireName,
    e.paymentMonthLabel,
    `+${e.deferredMonths} mois`,
    e.deferredToMonthLabel ?? '—',
    e.deferredReason ?? '—',
    e.deferredAt ? new Date(e.deferredAt).toLocaleDateString('fr-FR') : '—',
  ])

  drawSectionTable(y, deferredEntries, ['Client', 'Mandataire', 'Mois enc.', 'Report', 'Mois final', 'Raison', 'Date du report'], deferredBody, C.violet)

  // ─────────────────────────────────────────────────────────────────────────
  // 10. FOOTER SUR TOUTES LES PAGES
  // ─────────────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    setDraw(...C.slate200)
    doc.setLineWidth(0.3)
    doc.line(MX, PH - 10, PW - MX, PH - 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    setTxt(...C.muted)
    doc.text('Pilotage Commissionnement — Encaissements', MX, PH - 5.5)
    doc.text(`Page ${i} / ${totalPages}`, PW - MX, PH - 5.5, { align: 'right' })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 11. TÉLÉCHARGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  const fileName = monthKey
    ? `recap_encaissements_${monthKey}.pdf`
    : `recap_encaissements_${format(new Date(), 'yyyy-MM-dd')}.pdf`

  doc.save(fileName)
}
