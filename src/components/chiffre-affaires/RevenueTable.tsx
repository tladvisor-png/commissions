"use client"

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'
import { CalculatedDeal, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { formatCurrency, formatMonthLabel, getRowClassName } from '@/lib/commission-calculations'
import { StatusBadge } from '@/components/commissions/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Pencil, CalendarClock, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface RevenueTableProps {
  deals: CalculatedDeal[]
  onEdit: (deal: CalculatedDeal) => void
}

const columnHelper = createColumnHelper<CalculatedDeal>()

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="h-3.5 w-3.5 text-slate-600" />
  if (sorted === 'desc') return <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
  return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
}

export function RevenueTable({ deals, onEdit }: RevenueTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'effectiveDate', desc: true }])

  const columns = useMemo(() => [
    columnHelper.accessor('effectiveDate', {
      header: "Date d'effet",
      cell: info => info.getValue()
        ? new Date(info.getValue()).toLocaleDateString('fr-FR')
        : '—',
    }),
    columnHelper.accessor('monthM', {
      header: 'Mois',
      cell: info => {
        const key = info.getValue()
        if (!key) return '—'
        try {
          const [yr, mo] = key.split('-')
          return format(new Date(parseInt(yr), parseInt(mo) - 1, 1), 'MMM yyyy', { locale: fr })
        } catch { return key }
      },
    }),
    columnHelper.accessor('clientName', {
      header: 'Client',
      cell: info => <span className="font-medium text-slate-800">{info.getValue()}</span>,
    }),
    columnHelper.accessor('mandataireName', {
      header: 'Mandataire',
      cell: info => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {info.getValue()}
        </span>
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
      header: 'PU',
      cell: info => info.getValue() > 0
        ? <span className="text-slate-800 font-medium">{formatCurrency(info.getValue())}</span>
        : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('ppAmount', {
      header: 'PP',
      cell: info => info.getValue() > 0
        ? <span className="text-slate-800 font-medium">{formatCurrency(info.getValue())}</span>
        : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('effectivePuEntryFeesRate', {
      header: 'Frais PU',
      cell: info => <span className="text-xs text-slate-600">{info.getValue()} %</span>,
    }),
    columnHelper.accessor('netEntryFeesRate', {
      header: 'Nets PU',
      cell: info => <span className="text-xs text-violet-600">{info.getValue().toFixed(2)} %</span>,
    }),
    columnHelper.accessor('effectivePpPaymentFeesRate', {
      header: 'Frais PP',
      cell: info => <span className="text-xs text-slate-600">{info.getValue()} %</span>,
    }),
    columnHelper.accessor('netPpPaymentFeesRate', {
      header: 'Nets PP',
      cell: info => <span className="text-xs text-violet-600">{info.getValue().toFixed(2)} %</span>,
    }),
    columnHelper.accessor('caPU', {
      header: 'CA PU',
      cell: info => info.getValue() > 0
        ? <span className="font-semibold text-violet-700">{formatCurrency(info.getValue())}</span>
        : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('caPP', {
      header: 'CA PP',
      cell: info => info.getValue() > 0
        ? <span className="font-semibold text-violet-600">{formatCurrency(info.getValue())}</span>
        : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('caTotal', {
      header: 'CA total',
      cell: info => (
        <span className="font-bold text-violet-800">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Statut',
      enableSorting: false,
      cell: info => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('isEligibleForSurcommission', {
      header: 'Éligible SC',
      enableSorting: false,
      cell: info => (
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border',
          info.getValue()
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        )}>
          {info.getValue() ? 'Oui' : 'Non'}
        </span>
      ),
    }),
    columnHelper.accessor('needsUnepNegotiation', {
      header: 'UNEP',
      enableSorting: false,
      cell: info => info.getValue() ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800 border border-orange-200">
          <MessageSquare className="h-3 w-3" />
          Oui
        </span>
      ) : <span className="text-slate-300 text-xs">—</span>,
    }),
    columnHelper.accessor('deferToEndOfMonth', {
      header: 'Report',
      enableSorting: false,
      cell: info => info.getValue() ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 border border-violet-200">
          <CalendarClock className="h-3 w-3" />
          Oui
        </span>
      ) : <span className="text-slate-300 text-xs">—</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 hover:bg-blue-50 hover:text-blue-600"
          onClick={() => onEdit(info.row.original)}
          title="Modifier"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ),
    }),
  ], [onEdit])

  const table = useReactTable({
    data: deals,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  const visibleRows = table.getRowModel().rows
  const totalCaPU = visibleRows.reduce((s, r) => s + r.original.caPU, 0)
  const totalCaPP = visibleRows.reduce((s, r) => s + r.original.caPP, 0)
  const totalCA = visibleRows.reduce((s, r) => s + r.original.caTotal, 0)
  const totalPU = visibleRows.reduce((s, r) => s + r.original.puAmount, 0)
  const totalPP = visibleRows.reduce((s, r) => s + r.original.ppAmount, 0)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {table.getHeaderGroups().map(hg =>
                hg.headers.map(header => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap",
                      header.column.getCanSort() && "cursor-pointer select-none hover:text-slate-700"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon sorted={header.column.getIsSorted()} />
                      )}
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-slate-400">
                  Aucune affaire trouvée
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className={cn('transition-colors', getRowClassName(row.original.status))}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2.5 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {deals.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold text-slate-700">
                {/* date + mois */}
                <td className="px-3 py-2.5 text-xs uppercase tracking-wide" colSpan={2}>
                  Total ({deals.length} affaires)
                </td>
                {/* client + mandataire + type */}
                <td colSpan={3} />
                <td className="px-3 py-2.5 font-bold text-slate-800">{formatCurrency(totalPU)}</td>
                <td className="px-3 py-2.5 font-bold text-slate-800">{formatCurrency(totalPP)}</td>
                {/* frais PU + nets + frais PP */}
                <td colSpan={3} />
                <td className="px-3 py-2.5 font-bold text-violet-700">{formatCurrency(totalCaPU)}</td>
                <td className="px-3 py-2.5 font-bold text-violet-600">{formatCurrency(totalCaPP)}</td>
                <td className="px-3 py-2.5 font-bold text-violet-800">{formatCurrency(totalCA)}</td>
                {/* statut + élig + unep + report + actions */}
                <td colSpan={5} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-slate-500">
            Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()} — {deals.length} affaires
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="h-8 w-8">
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="h-8 w-8">
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
