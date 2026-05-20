import { Users, FileText, CheckCircle, XCircle, DollarSign, Calendar, TrendingUp, UserPlus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DashboardMetrics } from '@/types/database'

interface MetricsCardsProps {
  metrics: DashboardMetrics | null
}

const colorConfig: Record<string, {
  gradFrom: string; gradTo: string
  border: string; shadow: string
  iconBg: string; iconColor: string
  valueColor: string; labelColor: string; subColor: string
}> = {
  blue:    {
    gradFrom: 'rgba(59,130,246,0.10)',  gradTo: 'rgba(239,246,255,0.70)',
    border: 'rgba(59,130,246,0.20)',    shadow: '0 2px 12px rgba(59,130,246,0.07)',
    iconBg: 'rgba(59,130,246,0.14)',    iconColor: '#2563eb',
    valueColor: '#1e3a8a', labelColor: '#3b82f6', subColor: '#60a5fa',
  },
  purple:  {
    gradFrom: 'rgba(139,92,246,0.10)',  gradTo: 'rgba(245,243,255,0.70)',
    border: 'rgba(139,92,246,0.20)',    shadow: '0 2px 12px rgba(139,92,246,0.07)',
    iconBg: 'rgba(139,92,246,0.14)',    iconColor: '#7c3aed',
    valueColor: '#4c1d95', labelColor: '#7c3aed', subColor: '#a78bfa',
  },
  green:   {
    gradFrom: 'rgba(34,197,94,0.10)',   gradTo: 'rgba(240,253,244,0.70)',
    border: 'rgba(34,197,94,0.20)',     shadow: '0 2px 12px rgba(34,197,94,0.07)',
    iconBg: 'rgba(34,197,94,0.14)',     iconColor: '#16a34a',
    valueColor: '#14532d', labelColor: '#16a34a', subColor: '#4ade80',
  },
  red:     {
    gradFrom: 'rgba(239,68,68,0.10)',   gradTo: 'rgba(254,242,242,0.70)',
    border: 'rgba(239,68,68,0.20)',     shadow: '0 2px 12px rgba(239,68,68,0.07)',
    iconBg: 'rgba(239,68,68,0.14)',     iconColor: '#dc2626',
    valueColor: '#7f1d1d', labelColor: '#dc2626', subColor: '#f87171',
  },
  emerald: {
    gradFrom: 'rgba(16,185,129,0.10)',  gradTo: 'rgba(236,253,245,0.70)',
    border: 'rgba(16,185,129,0.20)',    shadow: '0 2px 12px rgba(16,185,129,0.07)',
    iconBg: 'rgba(16,185,129,0.14)',    iconColor: '#059669',
    valueColor: '#064e3b', labelColor: '#059669', subColor: '#34d399',
  },
  orange:  {
    gradFrom: 'rgba(249,115,22,0.10)',  gradTo: 'rgba(255,247,237,0.70)',
    border: 'rgba(249,115,22,0.20)',    shadow: '0 2px 12px rgba(249,115,22,0.07)',
    iconBg: 'rgba(249,115,22,0.14)',    iconColor: '#ea580c',
    valueColor: '#7c2d12', labelColor: '#ea580c', subColor: '#fb923c',
  },
  cyan:    {
    gradFrom: 'rgba(6,182,212,0.10)',   gradTo: 'rgba(236,254,255,0.70)',
    border: 'rgba(6,182,212,0.20)',     shadow: '0 2px 12px rgba(6,182,212,0.07)',
    iconBg: 'rgba(6,182,212,0.14)',     iconColor: '#0891b2',
    valueColor: '#164e63', labelColor: '#0891b2', subColor: '#22d3ee',
  },
  indigo:  {
    gradFrom: 'rgba(99,102,241,0.10)',  gradTo: 'rgba(238,242,255,0.70)',
    border: 'rgba(99,102,241,0.20)',    shadow: '0 2px 12px rgba(99,102,241,0.07)',
    iconBg: 'rgba(99,102,241,0.14)',    iconColor: '#4f46e5',
    valueColor: '#1e1b4b', labelColor: '#4f46e5', subColor: '#818cf8',
  },
}

export default function MetricsCards({ metrics }: MetricsCardsProps) {
  const m = metrics ?? {
    total_leads: 0, propostas_enviadas: 0, propostas_fechadas: 0,
    propostas_recusadas: 0, valor_fechado: 0, valor_pipeline: 0,
    visitas_agendadas: 0, leads_mes_atual: 0,
  }

  const cards = [
    { label: 'Total de Leads',       value: m.total_leads,           icon: Users,       color: 'blue',    sub: `${m.leads_mes_atual} este mês` },
    { label: 'Propostas Enviadas',   value: m.propostas_enviadas,    icon: FileText,    color: 'purple',  sub: `${formatCurrency(m.valor_pipeline)} pipeline` },
    { label: 'Contratos Fechados',   value: m.propostas_fechadas,    icon: CheckCircle, color: 'green',   sub: `${formatCurrency(m.valor_fechado)} faturado` },
    { label: 'Propostas Recusadas',  value: m.propostas_recusadas,   icon: XCircle,     color: 'red',     sub: 'neste período' },
    { label: 'Valor Faturado',       value: formatCurrency(m.valor_fechado),  icon: DollarSign, color: 'emerald', sub: 'contratos fechados', isText: true },
    { label: 'Visitas Agendadas',    value: m.visitas_agendadas,     icon: Calendar,    color: 'orange',  sub: 'próximas visitas' },
    { label: 'Novos Leads',          value: m.leads_mes_atual,       icon: UserPlus,    color: 'cyan',    sub: 'mês atual' },
    { label: 'Valor Pipeline',       value: formatCurrency(m.valor_pipeline), icon: TrendingUp, color: 'indigo',  sub: 'propostas em aberto', isText: true },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map(({ label, value, icon: Icon, color, sub, isText }) => {
        const c = colorConfig[color]
        return (
          <div
            key={label}
            className="rounded-2xl p-3.5 md:p-5 transition-transform hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${c.gradFrom} 0%, ${c.gradTo} 100%)`,
              border: `1px solid ${c.border}`,
              boxShadow: c.shadow,
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider leading-tight line-clamp-2"
                  style={{ color: c.labelColor }}
                >
                  {label}
                </p>
                <p
                  className={`mt-2 font-bold leading-tight ${isText ? 'text-sm md:text-xl' : 'text-2xl md:text-3xl'}`}
                  style={{ color: c.valueColor }}
                >
                  {value}
                </p>
                <p
                  className="text-[10px] md:text-xs mt-1 leading-tight"
                  style={{ color: c.subColor }}
                >
                  {sub}
                </p>
              </div>
              <div
                className="p-2 md:p-2.5 rounded-xl shrink-0"
                style={{ background: c.iconBg }}
              >
                <Icon
                  className="w-4 h-4 md:w-5 md:h-5"
                  style={{ color: c.iconColor }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
