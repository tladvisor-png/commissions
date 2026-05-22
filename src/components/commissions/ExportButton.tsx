"use client"

import { useState } from 'react'
import { CommissionDeal } from '@/types/commission'
import { Button } from '@/components/ui/button'
import { exportToExcel, exportToCSV } from '@/lib/export'
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'

interface ExportButtonProps {
  deals: CommissionDeal[]
}

export function ExportButton({ deals }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  async function handleExcelExport() {
    setLoading(true)
    setShowMenu(false)
    try {
      await exportToExcel(deals)
    } catch (err) {
      console.error(err)
      exportToCSV(deals)
    } finally {
      setLoading(false)
    }
  }

  function handleCSVExport() {
    setShowMenu(false)
    exportToCSV(deals)
  }

  return (
    <div className="relative">
      <div className="flex">
        <Button
          onClick={handleExcelExport}
          disabled={loading || deals.length === 0}
          className="gap-2 rounded-r-none"
          variant="success"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {loading ? 'Export...' : 'Exporter Excel'}
        </Button>
        <Button
          onClick={() => setShowMenu(v => !v)}
          disabled={loading || deals.length === 0}
          className="rounded-l-none border-l border-green-500 px-2"
          variant="success"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-slate-200 shadow-lg z-10">
          <button
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
            onClick={handleExcelExport}
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Export Excel (.xlsx)
          </button>
          <button
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
            onClick={handleCSVExport}
          >
            <FileText className="h-4 w-4 text-slate-500" />
            Export CSV (.csv)
          </button>
        </div>
      )}
    </div>
  )
}
