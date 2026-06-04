"use client"

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table'
import { CalculatedDeal, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { formatCurrency, getRowClassName, formatMonthLabel } from '@/lib/commission-calculations'
import { StatusBadge } from './StatusBadge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Pencil, Trash2, Copy, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CalendarClock, X, Trash, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommissionTableProps {
  deals: CalculatedDeal[]
  onEdit: (deal: CalculatedDeal) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleInstance: (id: string, value: boolean) => void
  onToggleContractOk: (id: string, value: boolean) => void
  onDeferToEndOfMonth: (ids: string[], value: boolean) => void
  onBulkDelete: (ids: string[]) => void
}

const columnHelper = createColumnHelper<CalculatedDeal>()

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="h-3.5 w-3.5 text-slate-600" />
  if (sorted === 'desc') return <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
  return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  className,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: React.ChangeEventHandler<HTMLInputElement>
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={cn('h-4 w-4 rounded border-slate-300 cursor-pointer accent-slate-700', className)}
    />
  )
}

export function CommissionTable({
  deals, onEdit, onDelete, onDuplicate, onToggleInstance, onToggleContractOk,
  onDeferToEndOfMonth, onBulkDelete,
}: CommissionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'effectiveDate', desc: true }])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Reset selection when deals list changes
  useEffect(() => {
    setRowSelection({})
    setShowDeleteConfirm(false)
  }, [deals])

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <IndeterminateCheckbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <IndeterminateCheckbox
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    }),
    columnHelper.accessor('effectiveDate', {
      header: 'Date d\'effet',
      cell: info => {
        const d = info.getValue()
        return d ? new Date(d).toLocaleDateString('fr-FR') : '-'
      },
    }),
    columnHelper.accessor('monthM', {
      header: 'Mois M',
      cell: info => <span className="text-blue-700 font-medium">{formatMonthLabel(info.getValue())}</span>,
    }),
    columnHelper.accessor('monthMPlus1', {
      header: 'Mois M+1',
      cell: info => <span className="text-purple-700 font-medium">{formatMonthLabel(info.getValue())}</span>,
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
    columnHelper.accessor('puAmount', {
      header: 'PU',
      cell: info => info.getValue() > 0 ? (
        <span className="text-slate-800 font-medium">{formatCurrency(info.getValue())}</span>
      ) : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('ppAmount', {
      header: 'PP',
      cell: info => info.getValue() > 0 ? (
        <span className="text-slate-800 font-medium">{formatCurrency(info.getValue())}</span>
      ) : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('effectivePuEntryFeesRate', {
      header: 'Frais PU',
      cell: info => {
        const row = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-600">{info.getValue()} %</span>
            <span className="text-[10px] text-slate-400">nets : {row.netEntryFeesRate.toFixed(2)} %</span>
          </div>
        )
      },
    }),
    columnHelper.accessor('effectivePpPaymentFeesRate', {
      header: 'Frais PP',
      cell: info => {
        const row = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-600">{info.getValue()} %</span>
            <span className="text-[10px] text-slate-400">nets : {row.netPpPaymentFeesRate.toFixed(2)} %</span>
          </div>
        )
      },
    }),
    columnHelper.accessor('surcommissionEligibilityRate', {
      header: 'Taux élig.',
      cell: info => {
        const rate = info.getValue()
        const needsUnep = rate !== 100
        return (
          <div className="flex flex-col gap-1">
            <span className={cn(
              'text-xs font-semibold',
              needsUnep ? 'text-orange-700' : 'text-slate-500'
            )}>
              {rate} %
            </span>
            {needsUnep && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800 border border-orange-200 whitespace-nowrap">
                <MessageSquare className="h-3 w-3" />
                À négocier UNEP
              </span>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor('basePU', {
      header: 'Base PU',
      cell: info => {
        const row = info.row.original
        const isReal = row.surcommissionEligibilityRate !== 100
        return info.getValue() > 0 ? (
          <span
            className="text-slate-600"
            title={isReal ? `Base théorique : ${formatCurrency(row.theoreticalBasePU)}` : undefined}
          >
            {formatCurrency(info.getValue())}
          </span>
        ) : <span className="text-slate-300">—</span>
      },
    }),
    columnHelper.accessor('basePP', {
      header: 'Base PP',
      cell: info => {
        const row = info.row.original
        const isReal = row.surcommissionEligibilityRate !== 100
        return info.getValue() > 0 ? (
          <span
            className="text-slate-600"
            title={isReal ? `Base théorique : ${formatCurrency(row.theoreticalBasePP)}` : undefined}
          >
            {formatCurrency(info.getValue())}
          </span>
        ) : <span className="text-slate-300">—</span>
      },
    }),
    columnHelper.accessor('baseTotal', {
      header: 'Base totale',
      cell: info => {
        const row = info.row.original
        const isReal = row.surcommissionEligibilityRate !== 100
        return (
          <span
            className="font-semibold text-slate-800"
            title={isReal ? `Base théorique : ${formatCurrency(row.theoreticalBaseTotal)}` : undefined}
          >
            {formatCurrency(info.getValue())}
          </span>
        )
      },
    }),
    columnHelper.accessor('payAtM', {
      header: 'Surcomm. M',
      cell: info => {
        const row = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-blue-700">{formatCurrency(info.getValue())}</span>
            <span className="text-xs text-slate-400">{formatMonthLabel(row.monthM)}</span>
          </div>
        )
      },
    }),
    columnHelper.accessor('payAtMPlus1', {
      header: 'Surcomm. M+1',
      cell: info => {
        const row = info.row.original
        return info.getValue() > 0 ? (
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-purple-700">{formatCurrency(info.getValue())}</span>
            <span className="text-xs text-slate-400">{formatMonthLabel(row.monthMPlus1)}</span>
          </div>
        ) : <span className="text-slate-300">—</span>
      },
    }),
    columnHelper.accessor('caPU', {
      header: 'CA PU',
      cell: info => info.getValue() > 0 ? (
        <span className="font-semibold text-violet-700">{formatCurrency(info.getValue())}</span>
      ) : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('caPP', {
      header: 'CA PP',
      cell: info => info.getValue() > 0 ? (
        <span className="font-semibold text-violet-600">{formatCurrency(info.getValue())}</span>
      ) : <span className="text-slate-300">—</span>,
    }),
    columnHelper.accessor('caTotal', {
      header: 'CA total',
      cell: info => (
        <span className="font-bold text-violet-800">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('isInstance', {
      header: 'Instance',
      enableSorting: false,
      cell: info => {
        const row = info.row.original
        return (
          <Switch
            checked={info.getValue()}
            onCheckedChange={v => onToggleInstance(row.id, v)}
            className="data-[state=checked]:bg-red-500 scale-90"
          />
        )
      },
    }),
    columnHelper.accessor('isContractOk', {
      header: 'Contrat OK',
      enableSorting: false,
      cell: info => {
        const row = info.row.original
        return (
          <Switch
            checked={info.getValue()}
            onCheckedChange={v => onToggleContractOk(row.id, v)}
            className="data-[state=checked]:bg-green-600 scale-90"
            disabled={row.isInstance}
          />
        )
      },
    }),
    columnHelper.accessor('status', {
      header: 'Statut',
      enableSorting: false,
      cell: info => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('deferToEndOfMonth', {
      header: 'Report',
      enableSorting: false,
      cell: info => info.getValue() ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-200">
          <CalendarClock className="h-3 w-3" />
          Fin de mois
        </span>
      ) : (
        <span className="text-slate-300 text-xs">—</span>
      ),
    }),
    columnHelper.accessor('comment', {
      header: 'Commentaire',
      enableSorting: false,
      cell: info => (
        <span className="text-xs text-slate-500 max-w-[120px] truncate block" title={info.getValue() ?? undefined}>
          {info.getValue() || '—'}
        </span>
      ),
    }),
    columnHelper.accessor('contractType', {
      header: 'Type contrat',
      enableSorting: false,
      cell: info => {
        const val = info.getValue()
        if (!val) return <span className="text-slate-300 text-xs">—</span>
        const label = CONTRACT_TYPE_LABELS[val] ?? val
        return (
          <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700 whitespace-nowrap">
            {label}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => {
        const row = info.row.original
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 hover:bg-blue-50 hover:text-blue-600"
              onClick={() => onEdit(row)}
              title="Modifier"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => onDuplicate(row.id)}
              title="Dupliquer"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
              onClick={() => onDelete(row.id)}
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
    }),
  ], [onEdit, onDelete, onDuplicate, onToggleInstance, onToggleContractOk])

  const table = useReactTable({
    data: deals,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  const selectedIds = table.getSelectedRowModel().rows.map(r => r.original.id)
  const hasSelection = selectedIds.length > 0

  // Totals row for visible data
  const visibleRows = table.getRowModel().rows
  const totalPayM = visibleRows.reduce((s, r) => s + r.original.payAtM, 0)
  const totalPayMPlus1 = visibleRows.reduce((s, r) => s + r.original.payAtMPlus1, 0)
  const totalBase = visibleRows.reduce((s, r) => s + r.original.baseTotal, 0)
  const totalPU = visibleRows.reduce((s, r) => s + r.original.puAmount, 0)
  const totalPP = visibleRows.reduce((s, r) => s + r.original.ppAmount, 0)
  const totalCaPU = visibleRows.reduce((s, r) => s + r.original.caPU, 0)
  const totalCaPP = visibleRows.reduce((s, r) => s + r.original.caPP, 0)
  const totalCaTotal = visibleRows.reduce((s, r) => s + r.original.caTotal, 0)

  return (
    <div className="space-y-3">
      {/* Barre d'actions groupées */}
      {hasSelection && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl">
          <span className="text-sm font-semibold text-violet-800">
            {selectedIds.length} affaire{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
          </span>
          <div className="h-4 w-px bg-violet-300" />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-100 hover:border-violet-400"
            onClick={() => { onDeferToEndOfMonth(selectedIds, true); setRowSelection({}) }}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Laisser à la fin du mois
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-slate-300 text-slate-600 hover:bg-slate-100"
            onClick={() => { onDeferToEndOfMonth(selectedIds, false); setRowSelection({}) }}
          >
            <X className="h-3.5 w-3.5" />
            Retirer du report fin de mois
          </Button>
          {!showDeleteConfirm ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash className="h-3.5 w-3.5" />
              Supprimer la sélection
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-red-700">
                Supprimer {selectedIds.length} affaire{selectedIds.length > 1 ? 's' : ''} ?
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => { onBulkDelete(selectedIds); setShowDeleteConfirm(false) }}
              >
                Confirmer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Annuler
              </Button>
            </div>
          )}
        </div>
      )}

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
                  className={cn(
                    'transition-colors',
                    row.getIsSelected() && 'ring-1 ring-inset ring-violet-300',
                    getRowClassName(row.original.status)
                  )}
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

          {/* Totals footer */}
          {deals.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold text-slate-700">
                {/* select + effectiveDate + monthM + monthMPlus1 */}
                <td className="px-3 py-2.5 text-xs uppercase tracking-wide" colSpan={4}>
                  Total ({deals.length} affaires)
                </td>
                {/* clientName + mandataireName */}
                <td className="px-3 py-2.5" colSpan={2}></td>
                {/* puAmount */}
                <td className="px-3 py-2.5 font-bold text-slate-800">{formatCurrency(totalPU)}</td>
                {/* ppAmount */}
                <td className="px-3 py-2.5 font-bold text-slate-800">{formatCurrency(totalPP)}</td>
                {/* effectivePuEntryFeesRate + effectivePpPaymentFeesRate */}
                <td colSpan={2}></td>
                {/* surcommissionEligibilityRate */}
                <td className="px-3 py-2.5"></td>
                {/* basePU + basePP */}
                <td colSpan={2}></td>
                {/* baseTotal */}
                <td className="px-3 py-2.5 font-bold text-slate-800">{formatCurrency(totalBase)}</td>
                {/* payAtM */}
                <td className="px-3 py-2.5 font-bold text-blue-700">{formatCurrency(totalPayM)}</td>
                {/* payAtMPlus1 */}
                <td className="px-3 py-2.5 font-bold text-purple-700">{formatCurrency(totalPayMPlus1)}</td>
                {/* caPU */}
                <td className="px-3 py-2.5 font-bold text-violet-700">{formatCurrency(totalCaPU)}</td>
                {/* caPP */}
                <td className="px-3 py-2.5 font-bold text-violet-600">{formatCurrency(totalCaPP)}</td>
                {/* caTotal */}
                <td className="px-3 py-2.5 font-bold text-violet-800">{formatCurrency(totalCaTotal)}</td>
                {/* isInstance + isContractOk + status + deferToEndOfMonth + comment + contractType + actions */}
                <td colSpan={7}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-slate-500">
            Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()} —{' '}
            {deals.length} affaires
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
