"use client"

import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'
import { EncaissementEntry, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, CheckCircle, Clock, CalendarClock, MessageSquare,
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Pencil, X, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EncaissementsTableProps {
  entries: EncaissementEntry[]
  onMarkPaid: (entry: EncaissementEntry) => void
  onEditPayment: (entry: EncaissementEntry) => void
  onCancelPayment: (entry: EncaissementEntry) => void
}

const columnHelper = createColumnHelper<EncaissementEntry>()

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="h-3.5 w-3.5 text-slate-600" />
  if (sorted === 'desc') return <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
  return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
}

function StatusBadge({ isInstance, isContractOk }: { isInstance: boolean; isContractOk: boolean }) {
  if (isInstance) return (
    <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap">
      <AlertTriangle className="h-2.5 w-2.5" />Instance
    </Badge>
  )
  if (isContractOk) return (
    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap">
      <CheckCircle className="h-2.5 w-2.5" />OK
    </Badge>
  )
  return (
    <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap">
      <Clock className="h-2.5 w-2.5" />À valider
    </Badge>
  )
}

function getRowClass(entry: EncaissementEntry): string {
  if (entry.isInstance) return 'bg-red-50 border-l-4 border-l-red-400'
  if (entry.isPaid) {
    if (entry.paidAmount !== null && Math.abs(entry.expectedAmount - entry.paidAmount) > 0.01) {
      return 'bg-amber-50 border-l-4 border-l-amber-400'
    }
    return 'bg-emerald-50 border-l-4 border-l-emerald-400'
  }
  return 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent'
}

export function EncaissementsTable({ entries, onMarkPaid, onEditPayment, onCancelPayment }: EncaissementsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'commissionMonthKey', desc: false }])

  const columns = [
    columnHelper.accessor('commissionMonthLabel', {
      id: 'commissionMonthKey',
      header: 'Mois commission',
      cell: info => (
        <span className="text-blue-700 font-medium whitespace-nowrap">{info.getValue()}</span>
      ),
      sortingFn: (a, b) => a.original.commissionMonthKey.localeCompare(b.original.commissionMonthKey),
    }),
    columnHelper.accessor('paymentMonthLabel', {
      id: 'paymentMonthKey',
      header: 'Mois encaissement',
      cell: info => (
        <span className="font-medium text-slate-700 whitespace-nowrap">{info.getValue()}</span>
      ),
      sortingFn: (a, b) => a.original.paymentMonthKey.localeCompare(b.original.paymentMonthKey),
    }),
    columnHelper.accessor('effectiveDate', {
      header: 'Date effet',
      cell: info => <span className="text-slate-500 text-xs whitespace-nowrap">{info.getValue()}</span>,
    }),
    columnHelper.accessor('clientName', {
      header: 'Client',
      cell: info => <span className="font-medium text-slate-800">{info.getValue()}</span>,
    }),
    columnHelper.accessor('mandataireName', {
      header: 'Mandataire',
      cell: info => <span className="text-slate-600">{info.getValue()}</span>,
    }),
    columnHelper.accessor('paymentType', {
      header: 'Type',
      cell: info => (
        <Badge className={cn(
          'text-[10px] px-1.5 py-0 font-semibold',
          info.getValue() === 'M'
            ? 'bg-blue-100 text-blue-700 border-blue-200'
            : 'bg-purple-100 text-purple-700 border-purple-200'
        )}>
          {info.getValue() === 'M' ? 'M' : 'M+1'}
        </Badge>
      ),
    }),
    columnHelper.accessor('contractType', {
      header: 'Type contrat',
      enableSorting: false,
      cell: info => {
        const val = info.getValue()
        const label = val ? (CONTRACT_TYPE_LABELS[val] ?? val) : 'Assurance vie'
        return (
          <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700 whitespace-nowrap">
            {label}
          </span>
        )
      },
    }),
    columnHelper.accessor('puAmount', {
      header: 'PU (€)',
      cell: info => info.getValue() > 0 ? (
        <span className="text-slate-600 text-xs">{formatCurrency(info.getValue())}</span>
      ) : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('ppAmount', {
      header: 'PP (€)',
      cell: info => info.getValue() > 0 ? (
        <span className="text-slate-600 text-xs">{formatCurrency(info.getValue())}</span>
      ) : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('expectedAmount', {
      header: 'Attendu',
      cell: info => (
        <span className="font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('isPaid', {
      header: 'Payée',
      cell: info => info.getValue() ? (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 gap-0.5 whitespace-nowrap">
          <Check className="h-2.5 w-2.5" />Oui
        </Badge>
      ) : (
        <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] px-1.5 py-0 whitespace-nowrap">
          Non
        </Badge>
      ),
    }),
    columnHelper.accessor('paidDate', {
      header: 'Date paiement',
      cell: info => info.getValue()
        ? <span className="text-emerald-700 text-xs whitespace-nowrap">{info.getValue()}</span>
        : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('paidAmount', {
      header: 'Montant payé',
      cell: info => {
        const val = info.getValue()
        if (val === null) return <span className="text-slate-300">—</span>
        return <span className="font-medium text-emerald-700 whitespace-nowrap">{formatCurrency(val)}</span>
      },
    }),
    columnHelper.accessor('deltaAmount', {
      header: 'Delta',
      cell: info => {
        const entry = info.row.original
        if (!entry.isPaid) return <span className="text-slate-300">—</span>
        const delta = info.getValue()
        if (Math.abs(delta) < 0.01) return <span className="text-emerald-600 text-xs">0,00 €</span>
        return (
          <span className={cn('font-medium text-xs whitespace-nowrap', delta > 0 ? 'text-orange-600' : 'text-blue-600')}>
            {delta > 0 ? '+' : ''}{formatCurrency(delta)}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: 'status',
      header: 'Statut',
      cell: info => (
        <StatusBadge isInstance={info.row.original.isInstance} isContractOk={info.row.original.isContractOk} />
      ),
    }),
    columnHelper.accessor('deferToEndOfMonth', {
      header: 'Report',
      cell: info => info.getValue() ? (
        <span title="Report fin de mois"><CalendarClock className="h-4 w-4 text-violet-500" /></span>
      ) : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('needsUnepNegotiation', {
      header: 'UNEP',
      cell: info => info.getValue() ? (
        <span title="À négocier UNEP"><MessageSquare className="h-4 w-4 text-orange-500" /></span>
      ) : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('paymentComment', {
      header: 'Commentaire',
      cell: info => info.getValue()
        ? <span className="text-slate-500 text-xs max-w-[120px] truncate block" title={info.getValue() ?? ''}>{info.getValue()}</span>
        : <span className="text-slate-300">—</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => {
        const entry = info.row.original
        return (
          <div className="flex items-center gap-1 whitespace-nowrap">
            {!entry.isPaid ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1"
                onClick={() => onMarkPaid(entry)}
              >
                <Check className="h-3 w-3" />
                Payer
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => onEditPayment(entry)}
                >
                  <Pencil className="h-3 w-3" />
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1"
                  onClick={() => onCancelPayment(entry)}
                >
                  <X className="h-3 w-3" />
                  Annuler
                </Button>
              </>
            )}
          </div>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  const totalExpected = entries.reduce((s, e) => s + e.expectedAmount, 0)
  const totalPaid = entries.filter(e => e.isPaid).reduce((s, e) => s + (e.paidAmount ?? e.expectedAmount), 0)
  const totalDelta = totalExpected - totalPaid

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <ChevronsUpDown className="h-8 w-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Aucune échéance pour les filtres sélectionnés.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="bg-slate-50 border-b border-slate-200">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap select-none"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon sorted={header.column.getIsSorted()} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className={cn('transition-colors', getRowClass(row.original))}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {/* Totals footer */}
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
              <td className="px-3 py-2.5 text-xs text-slate-600" colSpan={9}>TOTAL ({entries.length} échéance{entries.length > 1 ? 's' : ''})</td>
              <td className="px-3 py-2.5 text-slate-800 whitespace-nowrap">{formatCurrency(totalExpected)}</td>
              <td className="px-3 py-2.5 text-xs text-slate-500">
                {entries.filter(e => e.isPaid).length}/{entries.length}
              </td>
              <td className="px-3 py-2.5"></td>
              <td className="px-3 py-2.5 text-emerald-700 whitespace-nowrap">{totalPaid > 0 ? formatCurrency(totalPaid) : '—'}</td>
              <td className="px-3 py-2.5">
                {totalDelta > 0.01 ? (
                  <span className="text-orange-600 whitespace-nowrap">{formatCurrency(totalDelta)}</span>
                ) : (
                  <span className="text-emerald-600">0,00 €</span>
                )}
              </td>
              <td colSpan={5}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()} —{' '}
            {entries.length} échéance{entries.length > 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
