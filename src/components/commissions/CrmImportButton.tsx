"use client"

import { useRef, useState } from 'react'
import { CommissionDeal } from '@/types/commission'
import { parseCrmExcelFile, buildCrmDeals, CrmImportResult } from '@/lib/crm-excel-import'
import { bulkCreateDeals } from '@/lib/deals-service'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface CrmImportButtonProps {
  existingDeals: CommissionDeal[]
  onImport: (newDeals: CommissionDeal[]) => void
}

export function CrmImportButton({ existingDeals, onImport }: CrmImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CrmImportResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (inputRef.current) inputRef.current.value = ''

    setIsLoading(true)
    setParseError(null)
    setResult(null)

    try {
      const { rows, error } = await parseCrmExcelFile(file)
      if (error) {
        setParseError(error)
        setIsLoading(false)
        return
      }

      const importResult = buildCrmDeals(rows, existingDeals)

      if (importResult.createdDeals.length > 0) {
        const created = await bulkCreateDeals(importResult.createdDeals)
        onImport(created)
      }

      setResult(importResult)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFile}
      />

      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        {isLoading ? 'Import en cours…' : 'Importer Excel CRM'}
      </Button>

      {/* Modal résumé d'import */}
      <Dialog open={!!result || !!parseError} onOpenChange={v => { if (!v) { setResult(null); setParseError(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {parseError ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              )}
              {parseError ? 'Erreur de lecture' : 'Import terminé'}
            </DialogTitle>
          </DialogHeader>

          {parseError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {parseError}
            </div>
          )}

          {result && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <StatLine label="Lignes lues" value={result.totalRows} />
                <StatLine label="Affaires créées" value={result.created} accent="emerald" />
                <StatLine label="Doublons ignorés" value={result.duplicates} accent={result.duplicates > 0 ? 'orange' : undefined} />
                <StatLine label="Lignes incomplètes" value={result.incomplete} accent={result.incomplete > 0 ? 'orange' : undefined} />
              </div>

              {result.unknownProducts.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="font-semibold text-amber-700 text-xs uppercase tracking-wide mb-1">
                    Produits non reconnus (mappés sur Assurance vie) :
                  </p>
                  <ul className="text-amber-700 text-xs space-y-0.5">
                    {result.unknownProducts.map(p => (
                      <li key={p} className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="font-semibold text-red-700 text-xs uppercase tracking-wide mb-1">Erreurs :</p>
                  <ul className="text-red-700 text-xs space-y-0.5">
                    {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {result.created === 0 && result.errors.length === 0 && (
                <p className="text-slate-500 text-xs italic">
                  Aucune nouvelle affaire à importer (tous doublons ou lignes incomplètes).
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setResult(null); setParseError(null) }}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatLine({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'orange' }) {
  const valueClass = accent === 'emerald'
    ? 'text-emerald-700 font-bold'
    : accent === 'orange'
    ? 'text-orange-600 font-semibold'
    : 'text-slate-700 font-semibold'

  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={`text-sm ${valueClass}`}>{value}</span>
    </div>
  )
}
