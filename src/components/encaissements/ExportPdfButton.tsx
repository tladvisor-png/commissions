"use client"

import { useState } from 'react'
import { EncaissementEntry } from '@/types/commission'
import { exportEncaissementsPdf } from '@/lib/export-pdf'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'

interface ExportPdfButtonProps {
  entries: EncaissementEntry[]
  monthLabel: string
  monthKey: string
  mandataireFilter?: string
}

export function ExportPdfButton({
  entries,
  monthLabel,
  monthKey,
  mandataireFilter,
}: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await exportEncaissementsPdf({ entries, monthLabel, monthKey, mandataireFilter })
    } catch (err) {
      console.error('Erreur génération PDF:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 transition-colors"
      onClick={handleClick}
      disabled={loading}
      title="Télécharger le récapitulatif PDF du mois sélectionné"
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <FileDown className="h-4 w-4" />}
      {loading ? 'Génération…' : 'Récap PDF'}
    </Button>
  )
}
