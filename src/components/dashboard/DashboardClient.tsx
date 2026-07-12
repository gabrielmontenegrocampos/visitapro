'use client'

import { useState, useMemo, useTransition } from 'react'
import MetricsCards from './MetricsCards'
import PipelineChart from './PipelineChart'
import UpcomingVisits from './UpcomingVisits'
import { getDashboardMetrics } from '@/app/(crm)/dashboard/actions'

type Periodo = 'mes' | 'mes-ant' | 'trim' | 'ano' | 'tudo'

interface Stage { id: string; name: string; color: string; slug: string; count: number }
interface Visit { id: string; title: string | null; scheduled_at: string; duration_minutes: number | null; status: string; address: string | null; notes: string | null; assigned_to: string | null; lead_id: string | null; leads: { id: string; name: string; company: string | null; phone: string | null; address: string | null } | null; profiles: { id: string; full_name: string } | null }
interface Metrics {
  total_leads: number; propostas_enviadas: number; propostas_fechadas: number
  propostas_recusadas: number; valor_fechado: number; valor_pipeline: number
  visitas_agendadas: number; leads_mes_atual: number
}

interface Props {
  initialMetrics: Metrics
  stages: Stage[]
  visits: Visit[]
}

const PERIODO_LABELS: Record<Periodo, string> = {
  mes: 'Mês', 'mes-ant': 'Mês Ant', trim: 'Trim', ano: 'Ano', tudo: 'Tudo',
}

function getPeriodDates(periodo: Periodo): { inicio?: string; fim?: string } {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = (a: number, m: number) => new Date(a, m + 1, 0).getDate()

  if (periodo === 'mes')
    return { inicio: `${ano}-${pad(mes + 1)}-01`, fim: `${ano}-${pad(mes + 1)}-${lastDay(ano, mes)}` }
  if (periodo === 'mes-ant') {
    const pa = mes === 0 ? ano - 1 : ano
    const pm = mes === 0 ? 11 : mes - 1
    return { inicio: `${pa}-${pad(pm + 1)}-01`, fim: `${pa}-${pad(pm + 1)}-${lastDay(pa, pm)}` }
  }
  if (periodo === 'trim') {
    const d = new Date(ano, mes - 2, 1)
    return { inicio: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, fim: `${ano}-${pad(mes + 1)}-${lastDay(ano, mes)}` }
  }
  if (periodo === 'ano')
    return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` }
  return {}
}

function getPeriodLabel(periodo: Periodo): string {
  const hoje = new Date()
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  if (periodo === 'mes') return MESES[hoje.getMonth()]
  if (periodo === 'mes-ant') {
    const pm = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1
    return MESES[pm]
  }
  if (periodo === 'trim') return 'últimos 3 meses'
  if (periodo === 'ano') return `${hoje.getFullYear()}`
  return ''
}

export default function DashboardClient({ initialMetrics, stages, visits }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>('tudo')
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics)
  const [isPending, startTransition] = useTransition()

  function handlePeriodo(p: Periodo) {
    setPeriodo(p)
    const { inicio, fim } = getPeriodDates(p)
    startTransition(async () => {
      const m = await getDashboardMetrics(inicio, fim)
      setMetrics(m as Metrics)
    })
  }

  const periodoLabel = periodo !== 'tudo' ? getPeriodLabel(periodo) : undefined

  return (
    <div className="space-y-6">
      {/* Header + filtro de período */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral do seu CRM</p>
        </div>

        {/* Botões de período */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 self-start sm:self-auto">
          {(Object.keys(PERIODO_LABELS) as Periodo[]).map(p => (
            <button
              key={p}
              onClick={() => handlePeriodo(p)}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodo === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {PERIODO_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Rótulo do período ativo */}
      {periodoLabel && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
          Exibindo dados de <strong className="text-gray-700">{periodoLabel}</strong>
          {isPending && <span className="text-gray-400 ml-1">atualizando…</span>}
        </div>
      )}

      <div className={isPending ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'}>
        <MetricsCards metrics={metrics} periodo={periodoLabel} />
      </div>

      <UpcomingVisits visits={visits as any} />

      <PipelineChart stages={stages} />
    </div>
  )
}
