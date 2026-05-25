"use client"

import { MonthlyRecap, RecapKpiType } from '@/types/commission'
import { formatCurrency } from '@/lib/commission-calculations'
import { TrendingUp, CheckCircle, Clock, Wallet, Info } from 'lucide-react'

interface RecapKpiCardsProps {
  recap: MonthlyRecap | null
  monthLabel: string
  onClickKpi: (type: RecapKpiType) => void
}

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  note?: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  onClick: () => void
  valueColor?: string
}

function KpiCard({ title, value, subtitle, note, icon, color, bgColor, borderColor, onClick, valueColor }: KpiCardProps) {
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
        <p className={`text-xl font-bold mt-0.5 truncate ${valueColor ?? 'text-slate-800'}`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        {note && (
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <Info className="h-3 w-3 flex-shrink-0" />{note}
          </p>
        )}
      </div>
      <span className="absolute bottom-2 right-2.5 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium select-none">
        Voir détails →
      </span>
    </div>
  )
}

export function RecapKpiCards({ recap, monthLabel, onClickKpi }: RecapKpiCardsProps) {
  if (!recap) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  const remaining = recap.remainingSurcommission
  const remainingColor = remaining < -0.005 ? 'text-emerald-600' : remaining > 0.005 ? 'text-orange-600' : 'text-slate-400'

  return (
    <div className="space-y-4">
      {/* Ligne surcommissions — 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Surco produite"
          value={formatCurrency(recap.producedSurcommission)}
          subtitle={`${recap.producedDealsCount} affaire${recap.producedDealsCount !== 1 ? 's' : ''} — ${monthLabel}`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-teal-600"
          bgColor="bg-teal-50"
          borderColor="border-teal-100"
          onClick={() => onClickKpi('SURCO_PRODUITE')}
        />
        <KpiCard
          title="Surco encaissable"
          value={formatCurrency(recap.collectibleSurcommission)}
          subtitle={`${recap.collectiblePaymentEntriesCount} échéance${recap.collectiblePaymentEntriesCount !== 1 ? 's' : ''} attendue${recap.collectiblePaymentEntriesCount !== 1 ? 's' : ''}`}
          note="Production du mois précédent, ajustée des reports."
          icon={<Wallet className="h-5 w-5" />}
          color="text-blue-600"
          bgColor="bg-blue-50"
          borderColor="border-blue-100"
          onClick={() => onClickKpi('SURCO_ENCAISSABLE')}
        />
        <KpiCard
          title="Surco encaissée"
          value={formatCurrency(recap.paidSurcommission)}
          subtitle={`${recap.paidPaymentEntriesCount} échéance${recap.paidPaymentEntriesCount !== 1 ? 's' : ''} payée${recap.paidPaymentEntriesCount !== 1 ? 's' : ''} ce mois`}
          icon={<CheckCircle className="h-5 w-5" />}
          color={recap.paidSurcommission > 0 ? 'text-emerald-600' : 'text-slate-400'}
          bgColor={recap.paidSurcommission > 0 ? 'bg-emerald-50' : 'bg-slate-50'}
          borderColor={recap.paidSurcommission > 0 ? 'border-emerald-100' : 'border-slate-200'}
          onClick={() => onClickKpi('SURCO_ENCAISSEE')}
        />
        <KpiCard
          title="Reste à encaisser"
          value={`${remaining > 0 ? '+' : ''}${formatCurrency(remaining)}`}
          subtitle="Encaissable − Encaissée"
          icon={<Clock className="h-5 w-5" />}
          color={remaining > 0.005 ? 'text-orange-600' : remaining < -0.005 ? 'text-emerald-600' : 'text-slate-400'}
          bgColor={remaining > 0.005 ? 'bg-orange-50' : remaining < -0.005 ? 'bg-emerald-50' : 'bg-slate-50'}
          borderColor={remaining > 0.005 ? 'border-orange-100' : remaining < -0.005 ? 'border-emerald-100' : 'border-slate-200'}
          valueColor={remainingColor}
          onClick={() => onClickKpi('RESTE_A_ENCAISSER')}
        />
      </div>

      {/* Ligne CA — 2 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard
          title="CA produit"
          value={formatCurrency(recap.producedRevenue)}
          subtitle={`${recap.producedDealsCount} affaire${recap.producedDealsCount !== 1 ? 's' : ''} — ${monthLabel}`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-violet-600"
          bgColor="bg-violet-50"
          borderColor="border-violet-100"
          onClick={() => onClickKpi('CA_PRODUIT')}
        />
        <KpiCard
          title="CA encaissable estimé"
          value={formatCurrency(recap.estimatedCollectedRevenue)}
          subtitle="CA du mois précédent"
          note="CA encaissable estimé avec un décalage M+1."
          icon={<Clock className="h-5 w-5" />}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
          borderColor="border-indigo-100"
          onClick={() => onClickKpi('CA_ENCAISSE_ESTIME')}
        />
      </div>

      {/* Notes métier */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] text-slate-500 space-y-1">
        <p>
          <Info className="h-3 w-3 inline mr-1 text-slate-400" />
          Les surcommissions encaissables correspondent à la production du mois précédent, ajustée des reports d'encaissement.
        </p>
        <p>
          <Info className="h-3 w-3 inline mr-1 text-slate-400" />
          Le CA encaissable est estimé avec un décalage M+1.
        </p>
      </div>
    </div>
  )
}
