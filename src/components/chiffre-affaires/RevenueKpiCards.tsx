"use client"

import { RevenueKpiStats, RevenueKpiCardType, CONTRACT_TYPE_LABELS } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import { TrendingUp, Euro, BarChart2, Users, Award, FileText, Percent } from 'lucide-react'

interface RevenueKpiCardsProps {
  kpis: RevenueKpiStats
  onClickCard: (type: RevenueKpiCardType) => void
}

function KpiCard({
  label, value, sub, icon: Icon, color, onClick,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col gap-1 rounded-xl border p-4 text-left shadow-sm transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer ${color}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
        <Icon className="h-4 w-4 opacity-60" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </button>
  )
}

export function RevenueKpiCards({ kpis, onClickCard }: RevenueKpiCardsProps) {
  const bestContractLabel = kpis.bestContract
    ? (CONTRACT_TYPE_LABELS[kpis.bestContract as keyof typeof CONTRACT_TYPE_LABELS] ?? kpis.bestContract)
    : '—'

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <KpiCard
        label="CA total Assentis"
        value={formatCurrency(kpis.caTotal)}
        sub={`${kpis.dealCount} affaire${kpis.dealCount !== 1 ? 's' : ''}`}
        icon={TrendingUp}
        color="bg-violet-50 border-violet-200 text-violet-900"
        onClick={() => onClickCard('CA_TOTAL')}
      />
      <KpiCard
        label="CA PU"
        value={formatCurrency(kpis.caPU)}
        icon={Euro}
        color="bg-indigo-50 border-indigo-200 text-indigo-900"
        onClick={() => onClickCard('CA_PU')}
      />
      <KpiCard
        label="CA PP"
        value={formatCurrency(kpis.caPP)}
        icon={Euro}
        color="bg-purple-50 border-purple-200 text-purple-900"
        onClick={() => onClickCard('CA_PP')}
      />
      <KpiCard
        label="Nombre d'affaires"
        value={String(kpis.dealCount)}
        icon={BarChart2}
        color="bg-slate-50 border-slate-200 text-slate-900"
        onClick={() => onClickCard('DEAL_COUNT')}
      />
      <KpiCard
        label="Ticket moyen CA"
        value={formatCurrency(kpis.ticketMoyen)}
        icon={TrendingUp}
        color="bg-blue-50 border-blue-200 text-blue-900"
        onClick={() => onClickCard('TICKET_MOYEN')}
      />
      <KpiCard
        label="Meilleur mandataire"
        value={kpis.bestMandataire || '—'}
        sub={kpis.bestMandataire ? formatCurrency(kpis.bestMandataireCA) : undefined}
        icon={Users}
        color="bg-emerald-50 border-emerald-200 text-emerald-900"
        onClick={() => onClickCard('BEST_MANDATAIRE')}
      />
      <KpiCard
        label="Contrat le + rentable"
        value={bestContractLabel}
        sub={kpis.bestContract ? formatCurrency(kpis.bestContractCA) : undefined}
        icon={Award}
        color="bg-amber-50 border-amber-200 text-amber-900"
        onClick={() => onClickCard('BEST_CONTRACT')}
      />
      <KpiCard
        label="Frais bruts moyens PU"
        value={`${kpis.avgFeesPU.toFixed(2)} %`}
        icon={Percent}
        color="bg-cyan-50 border-cyan-200 text-cyan-900"
        onClick={() => onClickCard('AVG_FEES_PU')}
      />
      <KpiCard
        label="Frais bruts moyens PP"
        value={`${kpis.avgFeesPP.toFixed(2)} %`}
        icon={Percent}
        color="bg-teal-50 border-teal-200 text-teal-900"
        onClick={() => onClickCard('AVG_FEES_PP')}
      />
    </div>
  )
}
