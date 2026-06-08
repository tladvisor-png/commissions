"use client"

import { useState } from 'react'
import { KpiStats, KpiCardType, CalculatedDeal } from '@/types/commission'
import { formatCurrency, getDealsForKpi } from '@/lib/commission-calculations'
import { KpiDetailsModal } from './KpiDetailsModal'
import {
  TrendingUp, TrendingDown, BarChart3, AlertTriangle,
  CheckCircle, Clock, Briefcase, Calendar, CalendarCheck, CalendarClock,
  MessageSquare, TrendingDown as TrendingDownIcon, ArrowLeftRight,
} from 'lucide-react'

interface KpiCardsProps {
  stats: KpiStats
  deals: CalculatedDeal[]
}

interface KpiCardDef {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  kpiType: KpiCardType
}

interface KpiCardProps extends Omit<KpiCardDef, 'kpiType'> {
  onClick: () => void
}

function KpiCard({ title, value, subtitle, icon, color, bgColor, borderColor, onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-xl border ${borderColor} shadow-sm p-5 flex items-start gap-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 overflow-hidden`}
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

export function KpiCards({ stats, deals }: KpiCardsProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalDeals, setModalDeals] = useState<CalculatedDeal[]>([])

  function handleCardClick(kpiType: KpiCardType, title: string) {
    setModalTitle(title)
    setModalDeals(getDealsForKpi(kpiType, deals))
    setModalOpen(true)
  }

  const topCards: KpiCardDef[] = [
    {
      title: 'Base surcommission réelle',
      value: formatCurrency(stats.totalBase),
      subtitle: 'Après prorata d\'éligibilité',
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      kpiType: 'TOTAL_AFFAIRES',
    },
    {
      title: 'À payer ce mois M',
      value: formatCurrency(stats.totalPayAtM),
      subtitle: 'Mois courant',
      icon: <Calendar className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      kpiType: 'SURCOMM_M',
    },
    {
      title: 'À payer M+1',
      value: formatCurrency(stats.totalPayAtMPlus1),
      subtitle: 'Mois suivant',
      icon: <CalendarCheck className="h-5 w-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      kpiType: 'SURCOMM_M_PLUS_1',
    },
    {
      title: 'Total PU',
      value: formatCurrency(stats.totalPU),
      subtitle: 'Primes uniques',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      kpiType: 'TOTAL_PU',
    },
    {
      title: 'Total PP',
      value: formatCurrency(stats.totalPP),
      subtitle: 'Primes périodiques',
      icon: <TrendingDown className="h-5 w-5" />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-100',
      kpiType: 'TOTAL_PP',
    },
  ]

  const bottomCards: KpiCardDef[] = [
    {
      title: 'Total affaires',
      value: String(stats.dealCount),
      subtitle: 'Dossiers suivis',
      icon: <Briefcase className="h-5 w-5" />,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200',
      kpiType: 'TOTAL_AFFAIRES',
    },
    {
      title: 'En instance',
      value: String(stats.instanceCount),
      subtitle: stats.instanceCount > 0 ? 'Attention requise' : 'Aucun dossier',
      icon: <AlertTriangle className="h-5 w-5" />,
      color: stats.instanceCount > 0 ? 'text-red-600' : 'text-slate-400',
      bgColor: stats.instanceCount > 0 ? 'bg-red-50' : 'bg-slate-50',
      borderColor: stats.instanceCount > 0 ? 'border-red-100' : 'border-slate-200',
      kpiType: 'INSTANCE',
    },
    {
      title: 'Contrats OK',
      value: String(stats.contractOkCount),
      subtitle: 'Validés',
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-100',
      kpiType: 'CONTRATS_OK',
    },
    {
      title: 'À valider',
      value: String(stats.toValidateCount),
      subtitle: 'En attente de validation',
      icon: <Clock className="h-5 w-5" />,
      color: stats.toValidateCount > 0 ? 'text-orange-600' : 'text-slate-400',
      bgColor: stats.toValidateCount > 0 ? 'bg-orange-50' : 'bg-slate-50',
      borderColor: stats.toValidateCount > 0 ? 'border-orange-100' : 'border-slate-200',
      kpiType: 'A_VALIDER',
    },
    {
      title: 'Reportées fin de mois',
      value: String(stats.deferredCount),
      subtitle: stats.deferredCount > 0
        ? `Base : ${formatCurrency(stats.deferredBaseTotal)}`
        : 'Aucune affaire',
      icon: <CalendarClock className="h-5 w-5" />,
      color: stats.deferredCount > 0 ? 'text-violet-600' : 'text-slate-400',
      bgColor: stats.deferredCount > 0 ? 'bg-violet-50' : 'bg-slate-50',
      borderColor: stats.deferredCount > 0 ? 'border-violet-100' : 'border-slate-200',
      kpiType: 'REPORT_FIN_MOIS',
    },
  ]

  const transferDeals = deals.filter(d => d.contractType === 'TRANSFERT')
  const transferCount = transferDeals.length
  const transferPU = transferDeals.reduce((s, d) => s + d.puAmount, 0)

  const transferCards: KpiCardDef[] = [
    {
      title: 'Transferts',
      value: String(transferCount),
      subtitle: transferCount > 0 ? `PU : ${formatCurrency(transferPU)}` : 'Aucun transfert',
      icon: <ArrowLeftRight className="h-5 w-5" />,
      color: transferCount > 0 ? 'text-cyan-600' : 'text-slate-400',
      bgColor: transferCount > 0 ? 'bg-cyan-50' : 'bg-slate-50',
      borderColor: transferCount > 0 ? 'border-cyan-100' : 'border-slate-200',
      kpiType: 'TRANSFERTS',
    },
  ]

  const unepCards: KpiCardDef[] = [
    {
      title: 'Affaires à négocier UNEP',
      value: String(stats.unepNegotiationCount),
      subtitle: stats.unepNegotiationCount > 0 ? 'Taux d\'éligibilité ≠ 100 %' : 'Toutes éligibles à 100 %',
      icon: <MessageSquare className="h-5 w-5" />,
      color: stats.unepNegotiationCount > 0 ? 'text-orange-600' : 'text-slate-400',
      bgColor: stats.unepNegotiationCount > 0 ? 'bg-orange-50' : 'bg-slate-50',
      borderColor: stats.unepNegotiationCount > 0 ? 'border-orange-200' : 'border-slate-200',
      kpiType: 'NEGOCIATION_UNEP',
    },
    {
      title: 'Montant théorique non retenu',
      value: formatCurrency(stats.theoreticalNonRetainedAmount),
      subtitle: 'Base théorique − base réelle',
      icon: <TrendingDownIcon className="h-5 w-5" />,
      color: stats.theoreticalNonRetainedAmount > 0 ? 'text-rose-600' : 'text-slate-400',
      bgColor: stats.theoreticalNonRetainedAmount > 0 ? 'bg-rose-50' : 'bg-slate-50',
      borderColor: stats.theoreticalNonRetainedAmount > 0 ? 'border-rose-100' : 'border-slate-200',
      kpiType: 'MONTANT_NON_RETENU',
    },
  ]

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {topCards.map((card, i) => (
            <KpiCard
              key={i}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              color={card.color}
              bgColor={card.bgColor}
              borderColor={card.borderColor}
              onClick={() => handleCardClick(card.kpiType, card.title)}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {bottomCards.map((card, i) => (
            <KpiCard
              key={i}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              color={card.color}
              bgColor={card.bgColor}
              borderColor={card.borderColor}
              onClick={() => handleCardClick(card.kpiType, card.title)}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...transferCards, ...unepCards].map((card, i) => (
            <KpiCard
              key={i}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              color={card.color}
              bgColor={card.bgColor}
              borderColor={card.borderColor}
              onClick={() => handleCardClick(card.kpiType, card.title)}
            />
          ))}
        </div>
      </div>

      <KpiDetailsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalTitle}
        deals={modalDeals}
      />
    </>
  )
}
