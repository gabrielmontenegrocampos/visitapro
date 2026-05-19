import { Users, FileText, CheckCircle, XCircle, DollarSign, Calendar, TrendingUp, UserPlus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DashboardMetrics } from '@/types/database'

interface MetricsCardsProps {
  metrics: DashboardMetrics | null
}

export default function MetricsCards({ metrics }: MetricsCardsProps) {
  const m = metrics ?? {
    total_leads: 0,
    propostas_enviadas: 0,
    propostas_fechadas: 0,
    propostas_recusadas: 0,
    valor_fechado: 0,
    valor_pipeline: 0,
    visitas_agendadas: 0,
    leads_mes_atual: 0,
  }

  const cards = [
    {
      label: 'Total de Leads',
      value: m.total_leads,
      icon: Users,
      color: 'blue',
      sub: `${m.leads_mes_atual} este mês`,
    },
    {
      label: 'Propostas Enviadas',
      value: m.propostas_enviadas,
      icon: FileText,
      color: 'purple',
      sub: `${formatCurrency(m.valor_pipeline)} em pipeline`,
    },
    {
      label: 'Contratos Fechados',
      value: m.propostas_fechadas,
      icon: CheckCircle,
      color: 'green',
      sub: `${formatCurrency(m.valor_fechado)} faturado`,
    },
    {
      label: 'Propostas Recusadas',
      value: m.propostas_recusadas,
      icon: XCircle,
      color: 'red',
      sub: 'neste período',
    },
    {
      label: 'Valor Faturado',
      value: formatCurrency(m.valor_fechado),
      icon: DollarSign,
      color: 'emerald',
      sub: 'contratos fechados',
      isText: true,
    },
    {
      label: 'Visitas Agendadas',
      value: m.visitas_agendadas,
      icon: Calendar,
      color: 'orange',
      sub: 'próximas visitas',
    },
    {
      label: 'Novos Leads (mês)',
      value: m.leads_mes_atual,
      icon: UserPlus,
      color: 'cyan',
      sub: 'mês atual',
    },
    {
      label: 'Valor Pipeline',
      value: formatCurrency(m.valor_pipeline),
      icon: TrendingUp,
      color: 'indigo',
      sub: 'propostas em aberto',
      isText: true,
    },
  ]

  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    text: 'text-blue-700' },
    purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600',  text: 'text-purple-700' },
    green:   { bg: 'bg-green-50',   icon: 'text-green-600',   text: 'text-green-700' },
    red:     { bg: 'bg-red-50',     icon: 'text-red-600',     text: 'text-red-700' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700' },
    orange:  { bg: 'bg-orange-50',  icon: 'text-orange-600',  text: 'text-orange-700' },
    cyan:    { bg: 'bg-cyan-50',    icon: 'text-cyan-600',    text: 'text-cyan-700' },
    indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  text: 'text-indigo-700' },
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, sub, isText }) => {
        const c = colorMap[color]
        return (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
                <p className={`mt-2 text-2xl font-bold ${isText ? 'text-lg' : ''} text-gray-900`}>
                  {value}
                </p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
              <div className={`${c.bg} p-2.5 rounded-lg ml-3 shrink-0`}>
                <Icon className={`w-5 h-5 ${c.icon}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
