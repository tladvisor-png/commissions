"use client"

import { useState } from 'react'
import { EncaissementEntry } from '@/types/commission'
import { exportEncaissementsToCSV, exportEncaissementsToExcel } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react'

interface ExportEncaissementsButtonProps {
  entries: EncaissementEntry[]
}

export function ExportEncaissementsButton({ entries }: ExportEncaissementsButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const disabled = entries.length === 0 || loading

  async function handleExcel() {
    setLoading(true)
    try {
      await exportEncaissementsToExcel(entries)
    } finally {
      setLoading(false)
      setShowDropdown(false)
    }
  }

  function handleCSV() {
    exportEncaissementsToCSV(entries)
    setShowDropdown(false)
  }

  return (
    <div className="relative">
      <div className="flex">
        <Button
          variant="outline"
          className="rounded-r-none gap-2 border-r-0"
          disabled={disabled}
          onClick={handleExcel}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exporter Excel
        </Button>
        <Button
          variant="outline"
          className="rounded-l-none px-2"
          disabled={disabled}
          onClick={() => setShowDropdown(v => !v)}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden min-w-[160px]">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
              onClick={handleExcel}
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Excel (.xlsx)
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
              onClick={handleCSV}
            >
              <FileText className="h-4 w-4 text-blue-600" />
              CSV (.csv)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
