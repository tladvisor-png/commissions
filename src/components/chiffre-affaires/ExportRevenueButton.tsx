"use client"

import { useState } from 'react'
import { CalculatedDeal } from '@/types/commission'
import { exportRevenueToExcel } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet } from 'lucide-react'

interface ExportRevenueButtonProps {
  deals: CalculatedDeal[]
}

export function ExportRevenueButton({ deals }: ExportRevenueButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    if (loading || deals.length === 0) return
    setLoading(true)
    try {
      await exportRevenueToExcel(deals)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={deals.length === 0 || loading}
      className="gap-2"
    >
      <FileSpreadsheet className="h-4 w-4" />
      {loading ? 'Export…' : 'Exporter CA'}
    </Button>
  )
}
