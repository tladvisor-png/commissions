"use client"

import { useState } from 'react'
import { MonthlyRecap } from '@/types/commission'
import { exportRecapToExcel } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet } from 'lucide-react'

interface ExportRecapButtonProps {
  recaps: MonthlyRecap[]
}

export function ExportRecapButton({ recaps }: ExportRecapButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    if (recaps.length === 0) return
    setLoading(true)
    try {
      await exportRecapToExcel(recaps)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 text-xs"
      onClick={handleExport}
      disabled={recaps.length === 0 || loading}
    >
      <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
      {loading ? 'Export...' : 'Exporter récapitulatif'}
    </Button>
  )
}
