"use client"

import { EncaissementKpiStats } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import {
  CheckCircle, CreditCard, Clock, Scale, CalendarClock, Wallet,
  ArrowLeftRight, CornerDownRight, Banknote, CalendarDays, History,
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
  onClickBreakdownProductionM?: () => void
  onClickBreakdownProductionMPlus1?: () => void
  onClickBreakdownReportsOlder?: () => void
  monthLabel: string
  transfersCount?: number
  transfersExpected?: number
  prevMonthReportsCount?: number
  prevMonthReportsTotal?: number
  breakdownProductionMTotal?: number
  breakdownProductionMCount?: number
  breakdownProductionMPlus1Total?: number
  breakdownProductionMPlus1Count?: number
  breakdownReportsOlderTotal?: number
  breakdownReportsOlderCount?: number
  breakdownControlDelta?: number
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
  compact?: boolean
}

function KpiCard({ title, value, subtitle, icon, color, bgColor, borderColor, onClick, compact }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-xl border ${borderColor} shadow-sm ${compact ? 'p-3.5' : 'p-5'} flex items-start gap-3 overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.02]`}
    >
      <div className={`${bgColor} ${color} rounded-xl ${compact ? 'p-2' : 'p-3'} flex-shrink-0`}>
        {compact
          ? <span className="block [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
          : <span className="block [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium text-slate-500 uppercase tracking-wide truncate`}>{title}</p>
        <p className={`${compact ? 'text-base' : 'text-xl'} font-bold text-slate-800 mt-0.5 truncate`}>{value}</p>
        {subtitle && <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-400 mt-0.5`}>{subtitle}</p>}
      </div>
      <span className="absolute bottom-2 right-2.5 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium select-none">
        Voir →
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
  onClickBreakdownProductionM,
  onClickBreakdownProductionMPlus1,
  onClickBreakdownReportsOlder,
  monthLabel,
  transfersCount = 0,
  transfersExpected = 0,
  prevMonthReportsCount = 0,
  prevMonthReportsTotal = 0,
  breakdownProductionMTotal = 0,
  breakdownProductionMCount = 0,
  breakdownProductionMPlus1Total = 0,
  breakdownProductionMPlus1Count = 0,
  breakdownReportsOlderTotal = 0,
  breakdownReportsOlderCount = 0,
  breakdownControlDelta = 0,
}: EncaissementsKpiCardsProps) {
  const monthSubtitle = monthLabel ? `Sur ${monthLabel}` : 'Tous les mois'
  const deltaPercent = stats.totalExpected > 0
    ? Math.round((stats.totalDelta / stats.totalExpected) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Ligne 1 : montants principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Surcommissions attendues"
          value={formatCurrency(stats.totalExpected)}
          subtitle={monthSubtitle}
          icon={<CreditCard />}
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
          icon={<CornerDownRight />}
          color={prevMonthReportsCount > 0 ? 'text-violet-600' : 'text-slate-400'}
          bgColor={prevMonthReportsCount > 0 ? 'bg-violet-50' : 'bg-slate-50'}
          borderColor={prevMonthReportsCount > 0 ? 'border-violet-200' : 'border-slate-200'}
          onClick={onClickPrevMonthReports ?? (() => {})}
        />
        <KpiCard
          title="Surcommissions payées"
          value={formatCurrency(stats.totalPaid)}
          subtitle={`${stats.paidCount} échéance${stats.paidCount > 1 ? 's' : ''} réglée${stats.paidCount > 1 ? 's' : ''}`}
          icon={<CheckCircle />}
          color={stats.totalPaid > 0 ? 'text-emerald-600' : 'text-slate-400'}
          bgColor={stats.totalPaid > 0 ? 'bg-emerald-50' : 'bg-slate-50'}
          borderColor={stats.totalPaid > 0 ? 'border-emerald-100' : 'border-slate-200'}
          onClick={onClickPaid}
        />
        <KpiCard
          title="Reste total à encaisser"
          value={formatCurrency(stats.totalDelta)}
          subtitle={stats.totalDelta > 0 ? `${deltaPercent}% du total attendu` : 'Tout est encaissé'}
          icon={<Wallet />}
          color={stats.totalDelta > 0 ? 'text-orange-600' : 'text-emerald-600'}
          bgColor={stats.totalDelta > 0 ? 'bg-orange-50' : 'bg-emerald-50'}
          borderColor={stats.totalDelta > 0 ? 'border-orange-200' : 'border-emerald-100'}
          onClick={onClickDelta}
        />
      </div>

      {/* Ligne 2 : décomposition des surcommissions attendues */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 pt-3 pb-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Détail des surcommissions attendues
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title="Production M"
            value={formatCurrency(breakdownProductionMTotal)}
            subtitle={`${breakdownProductionMCount} échéance${breakdownProductionMCount !== 1 ? 's' : ''} M directes`}
            icon={<Banknote />}
            color={breakdownProductionMCount > 0 ? 'text-sky-600' : 'text-slate-400'}
            bgColor={breakdownProductionMCount > 0 ? 'bg-sky-50' : 'bg-slate-100'}
            borderColor={breakdownProductionMCount > 0 ? 'border-sky-200' : 'border-slate-200'}
            onClick={onClickBreakdownProductionM ?? (() => {})}
            compact
          />
          <KpiCard
            title="Production M+1"
            value={formatCurrency(breakdownProductionMPlus1Total)}
            subtitle={`${breakdownProductionMPlus1Count} échéance${breakdownProductionMPlus1Count !== 1 ? 's' : ''} M+1 directes`}
            icon={<CalendarDays />}
            color={breakdownProductionMPlus1Count > 0 ? 'text-indigo-600' : 'text-slate-400'}
            bgColor={breakdownProductionMPlus1Count > 0 ? 'bg-indigo-50' : 'bg-slate-100'}
            borderColor={breakdownProductionMPlus1Count > 0 ? 'border-indigo-200' : 'border-slate-200'}
            onClick={onClickBreakdownProductionMPlus1 ?? (() => {})}
            compact
          />
          <KpiCard
            title="Reports préc."
            value={formatCurrency(prevMonthReportsTotal)}
            subtitle={`${prevMonthReportsCount} report${prevMonthReportsCount !== 1 ? 's' : ''} du mois préc.`}
            icon={<CornerDownRight />}
            color={prevMonthReportsCount > 0 ? 'text-violet-600' : 'text-slate-400'}
            bgColor={prevMonthReportsCount > 0 ? 'bg-violet-50' : 'bg-slate-100'}
            borderColor={prevMonthReportsCount > 0 ? 'border-violet-200' : 'border-slate-200'}
            onClick={onClickPrevMonthReports ?? (() => {})}
            compact
          />
          <KpiCard
            title="Reports antérieurs"
            value={formatCurrency(breakdownReportsOlderTotal)}
            subtitle={`${breakdownReportsOlderCount} report${breakdownReportsOlderCount !== 1 ? 's' : ''} plus ancien${breakdownReportsOlderCount !== 1 ? 's' : ''}`}
            icon={<History />}
            color={breakdownReportsOlderCount > 0 ? 'text-rose-600' : 'text-slate-400'}
            bgColor={breakdownReportsOlderCount > 0 ? 'bg-rose-50' : 'bg-slate-100'}
            borderColor={breakdownReportsOlderCount > 0 ? 'border-rose-200' : 'border-slate-200'}
            onClick={onClickBreakdownReportsOlder ?? (() => {})}
            compact
          />
        </div>
        {/* Indicateur de contrôle */}
        <div className="mt-3 flex items-center gap-2">
          {breakdownControlDelta < 0.02 ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Contrôle OK — total cohérent avec surcommissions attendues
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              Écart de contrôle : {formatCurrency(breakdownControlDelta)}
            </span>
          )}
        </div>
      </div>

      {/* Ligne 3 : compteurs + transferts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {onClickTransfers && (
          <KpiCard
            title="Dont transferts"
            value={formatCurrency(transfersExpected)}
            subtitle={transfersCount > 0 ? `${transfersCount} transfert${transfersCount > 1 ? 's' : ''} attendu${transfersCount > 1 ? 's' : ''}` : 'Aucun transfert'}
            icon={<ArrowLeftRight />}
            color={transfersCount > 0 ? 'text-cyan-600' : 'text-slate-400'}
            bgColor={transfersCount > 0 ? 'bg-cyan-50' : 'bg-slate-50'}
            borderColor={transfersCount > 0 ? 'border-cyan-100' : 'border-slate-200'}
            onClick={onClickTransfers}
          />
        )}
        <KpiCard
          title="Échéances payées"
          value={String(stats.paidCount)}
          subtitle="Confirmées"
          icon={<CheckCircle />}
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
          icon={<Clock />}
          color={stats.unpaidCount > 0 ? 'text-orange-600' : 'text-slate-400'}
          bgColor={stats.unpaidCount > 0 ? 'bg-orange-50' : 'bg-slate-50'}
          borderColor={stats.unpaidCount > 0 ? 'border-orange-100' : 'border-slate-200'}
          onClick={onClickUnpaidCount}
        />
        <KpiCard
          title="Écarts de paiement"
          value={formatCurrency(stats.totalVariance)}
          subtitle={stats.totalVariance > 0 ? 'Différence attendu / payé' : 'Aucun écart'}
          icon={<Scale />}
          color={stats.totalVariance > 0 ? 'text-amber-600' : 'text-slate-400'}
          bgColor={stats.totalVariance > 0 ? 'bg-amber-50' : 'bg-slate-50'}
          borderColor={stats.totalVariance > 0 ? 'border-amber-100' : 'border-slate-200'}
          onClick={onClickVariance}
        />
        <KpiCard
          title="Échéances reportées"
          value={String(stats.deferredCount)}
          subtitle={stats.deferredCount > 0 ? 'Décalées par report' : 'Aucun report'}
          icon={<CalendarClock />}
          color={stats.deferredCount > 0 ? 'text-violet-600' : 'text-slate-400'}
          bgColor={stats.deferredCount > 0 ? 'bg-violet-50' : 'bg-slate-50'}
          borderColor={stats.deferredCount > 0 ? 'border-violet-100' : 'border-slate-200'}
          onClick={onClickDeferred}
        />
      </div>
    </div>
  )
}
