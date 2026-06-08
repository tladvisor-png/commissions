"use client"

import { EncaissementKpiStats } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import {
  TrendingDown, CheckCircle, CreditCard, Clock, Scale, CalendarClock, Wallet, ArrowLeftRight, CornerDownRight, Banknote, CalendarDays,
} from 'lucide-react'

interface EncaissementsKpiCardsProps {
  stats: EncaissementKpiStats
  onClickExpected: () => void
  onClickPaid: () => void
  onClickDelta: () => void
  onClickPaidCount: () => void
  onClickUnpaidCount: () => void
  onClickVariance: () => void
  onClickDeferred: () => void
  onClickTransfers?: () => void
  onClickPrevMonthReports?: () => void
  onClickPaymentM?: () => void
  onClickPaymentMPlus1?: () => void
  monthLabel: string
  transfersCount?: number
  transfersExpected?: number
  prevMonthReportsCount?: number
  prevMonthReportsTotal?: number
  paymentMTotal?: number
  paymentMCount?: number
  paymentMPlus1Total?: number
  paymentMPlus1Count?: number
}

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  onClick: () => void
}

function KpiCard({ title, value, subtitle, icon, color, bgColor, borderColor, onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-xl border ${borderColor} shadow-sm p-5 flex items-start gap-4 overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.02]`}
    >
      <div className={`${bgColor} ${color} rounded-xl p-3 flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{title}</p>
        <p className="text-xl font-bold text-slate-800 mt-0.5 truncate">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <span className="absolute bottom-2 right-2.5 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium select-none">
        Voir détails →
      </span>
    </div>
  )
}

export function EncaissementsKpiCards({
  stats,
  onClickExpected,
  onClickPaid,
  onClickDelta,
  onClickPaidCount,
  onClickUnpaidCount,
  onClickVariance,
  onClickDeferred,
  onClickTransfers,
  onClickPrevMonthReports,
  onClickPaymentM,
  onClickPaymentMPlus1,
  monthLabel,
  transfersCount = 0,
  transfersExpected = 0,
  prevMonthReportsCount = 0,
  prevMonthReportsTotal = 0,
  paymentMTotal = 0,
  paymentMCount = 0,
  paymentMPlus1Total = 0,
  paymentMPlus1Count = 0,
}: EncaissementsKpiCardsProps) {
  const monthSubtitle = monthLabel ? `Sur ${monthLabel}` : 'Tous les mois'
  const deltaPercent = stats.totalExpected > 0
    ? Math.round((stats.totalDelta / stats.totalExpected) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Ligne 1 : montants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Surcommissions attendues"
          value={formatCurrency(stats.totalExpected)}
          subtitle={monthSubtitle}
          icon={<CreditCard className="h-5 w-5" />}
          color="text-blue-600"
          bgColor="bg-blue-50"
          borderColor="border-blue-100"
          onClick={onClickExpected}
        />
        <KpiCard
          title="Dont reports"
          value={formatCurrency(prevMonthReportsTotal)}
          subtitle={prevMonthReportsCount > 0
            ? `${prevMonthReportsCount} report${prevMonthReportsCount > 1 ? 's' : ''} du mois précédent`
            : 'Aucun report du mois précédent'}
          icon={<CornerDownRight className="h-5 w-5" />}
          color={prevMonthReportsCount > 0 ? 'text-violet-600' : 'text-slate-400'}
          bgColor={prevMonthReportsCount > 0 ? 'bg-violet-50' : 'bg-slate-50'}
          borderColor={prevMonthReportsCount > 0 ? 'border-violet-200' : 'border-slate-200'}
          onClick={onClickPrevMonthReports ?? (() => {})}
        />
        <KpiCard
          title="Surcommissions payées"
          value={formatCurrency(stats.totalPaid)}
          subtitle={`${stats.paidCount} échéance${stats.paidCount > 1 ? 's' : ''} réglée${stats.paidCount > 1 ? 's' : ''}`}
          icon={<CheckCircle className="h-5 w-5" />}
          color={stats.totalPaid > 0 ? 'text-emerald-600' : 'text-slate-400'}
          bgColor={stats.totalPaid > 0 ? 'bg-emerald-50' : 'bg-slate-50'}
          borderColor={stats.totalPaid > 0 ? 'border-emerald-100' : 'border-slate-200'}
          onClick={onClickPaid}
        />
        <KpiCard
          title="Reste total à encaisser"
          value={formatCurrency(stats.totalDelta)}
          subtitle={stats.totalDelta > 0 ? `${deltaPercent}% du total attendu` : 'Tout est encaissé'}
          icon={<Wallet className="h-5 w-5" />}
          color={stats.totalDelta > 0 ? 'text-orange-600' : 'text-emerald-600'}
          bgColor={stats.totalDelta > 0 ? 'bg-orange-50' : 'bg-emerald-50'}
          borderColor={stats.totalDelta > 0 ? 'border-orange-200' : 'border-emerald-100'}
          onClick={onClickDelta}
        />
      </div>

      {/* Ligne 2 : ventilation M / M+1 / Transferts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="À payer M"
          value={formatCurrency(paymentMTotal)}
          subtitle={`${paymentMCount} échéance${paymentMCount !== 1 ? 's' : ''} M du mois`}
          icon={<Banknote className="h-5 w-5" />}
          color={paymentMCount > 0 ? 'text-sky-600' : 'text-slate-400'}
          bgColor={paymentMCount > 0 ? 'bg-sky-50' : 'bg-slate-50'}
          borderColor={paymentMCount > 0 ? 'border-sky-200' : 'border-slate-200'}
          onClick={onClickPaymentM ?? (() => {})}
        />
        <KpiCard
          title="À payer M+1"
          value={formatCurrency(paymentMPlus1Total)}
          subtitle={`${paymentMPlus1Count} échéance${paymentMPlus1Count !== 1 ? 's' : ''} M+1 du mois`}
          icon={<CalendarDays className="h-5 w-5" />}
          color={paymentMPlus1Count > 0 ? 'text-indigo-600' : 'text-slate-400'}
          bgColor={paymentMPlus1Count > 0 ? 'bg-indigo-50' : 'bg-slate-50'}
          borderColor={paymentMPlus1Count > 0 ? 'border-indigo-200' : 'border-slate-200'}
          onClick={onClickPaymentMPlus1 ?? (() => {})}
        />
        {onClickTransfers ? (
          <KpiCard
            title="Transferts du mois"
            value={String(transfersCount)}
            subtitle={transfersCount > 0 ? `Attendu : ${formatCurrency(transfersExpected)}` : 'Aucun transfert'}
            icon={<ArrowLeftRight className="h-5 w-5" />}
            color={transfersCount > 0 ? 'text-cyan-600' : 'text-slate-400'}
            bgColor={transfersCount > 0 ? 'bg-cyan-50' : 'bg-slate-50'}
            borderColor={transfersCount > 0 ? 'border-cyan-100' : 'border-slate-200'}
            onClick={onClickTransfers}
          />
        ) : <div />}
      </div>

      {/* Ligne 2 : compteurs + écarts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Échéances payées"
          value={String(stats.paidCount)}
          subtitle="Confirmées"
          icon={<CheckCircle className="h-5 w-5" />}
          color={stats.paidCount > 0 ? 'text-emerald-600' : 'text-slate-400'}
          bgColor={stats.paidCount > 0 ? 'bg-emerald-50' : 'bg-slate-50'}
          borderColor={stats.paidCount > 0 ? 'border-emerald-100' : 'border-slate-200'}
          onClick={onClickPaidCount}
        />
        <KpiCard
          title="Échéances non payées"
          value={String(stats.unpaidCount)}
          subtitle={stats.unpaidCount > 0
            ? `${formatCurrency(stats.totalUnpaidAmount)} en attente`
            : 'Toutes réglées'}
          icon={<Clock className="h-5 w-5" />}
          color={stats.unpaidCount > 0 ? 'text-orange-600' : 'text-slate-400'}
          bgColor={stats.unpaidCount > 0 ? 'bg-orange-50' : 'bg-slate-50'}
          borderColor={stats.unpaidCount > 0 ? 'border-orange-100' : 'border-slate-200'}
          onClick={onClickUnpaidCount}
        />
        <KpiCard
          title="Écarts de paiement"
          value={formatCurrency(stats.totalVariance)}
          subtitle={stats.totalVariance > 0 ? 'Différence attendu / payé' : 'Aucun écart'}
          icon={<Scale className="h-5 w-5" />}
          color={stats.totalVariance > 0 ? 'text-amber-600' : 'text-slate-400'}
          bgColor={stats.totalVariance > 0 ? 'bg-amber-50' : 'bg-slate-50'}
          borderColor={stats.totalVariance > 0 ? 'border-amber-100' : 'border-slate-200'}
          onClick={onClickVariance}
        />
        <KpiCard
          title="Échéances reportées"
          value={String(stats.deferredCount)}
          subtitle={stats.deferredCount > 0 ? 'Décalées par report' : 'Aucun report'}
          icon={<CalendarClock className="h-5 w-5" />}
          color={stats.deferredCount > 0 ? 'text-violet-600' : 'text-slate-400'}
          bgColor={stats.deferredCount > 0 ? 'bg-violet-50' : 'bg-slate-50'}
          borderColor={stats.deferredCount > 0 ? 'border-violet-100' : 'border-slate-200'}
          onClick={onClickDeferred}
        />
      </div>
    </div>
  )
}
