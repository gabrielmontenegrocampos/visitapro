'use client'

import { useState, useMemo, useTransition } from 'react'
import MetricsCards from './MetricsCards'
import PipelineChart from './PipelineChart'
import UpcomingVisits from './UpcomingVisits'
import { getDashboardMetrics } from '@/app/(crm)/dashboard/actions'

type Periodo = 'mes' | 'mes-ant' | 'trim' | 'ano' | 'tudo' | 'custom'

interface Stage { id: string; name: string; color: string; slug: string; count: number }
interface Visit {
  id: string; title: string | null; scheduled_at: string; duration_minutes: number | null
  status: string; address: string | null; notes: string | null
  assigned_to: string | null; lead_id: string | null
  leads: { id: string; name: string; company: string | null; phone: string | null; address: string | null } | null
  profiles: { id: string; full_name: string } | null
}
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

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'mes',     label: 'Este mês'     },
  { key: 'mes-ant', label: 'Mês anterior' },
  { key: 'trim',    label: 'Trimestre'    },
  { key: 'ano',     label: 'Este ano'     },
  { key: 'tudo',    label: 'Tudo'         },
  { key: 'custom',  label: 'Personalizado' },
]

function getPeriodDates(periodo: Periodo, customInicio: string, customFim: string): { inicio?: string; fim?: string } {
  const hoje = new Date()
  const ano  = hoje.getFullYear()
  const mes  = hoje.getMonth()
  const pad  = (n: number) => String(n).padStart(2, '0')
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
  if (periodo === 'custom')
    return { inicio: customInicio || undefined, fim: customFim || undefined }
  return {}
}

function getPeriodLabel(periodo: Periodo, customInicio: string, customFim: string): string {
  const hoje  = new Date()
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  if (periodo === 'mes')     return MESES[hoje.getMonth()]
  if (periodo === 'mes-ant') {
    const pm = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1
    return MESES[pm]
  }
  if (periodo === 'trim') return 'últimos 3 meses'
  if (periodo === 'ano')  return `${hoje.getFullYear()}`
  if (periodo === 'custom' && customInicio && customFim) {
    const fmt = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    return `${fmt(customInicio)} → ${fmt(customFim)}`
  }
  return ''
}

export default function DashboardClient({ initialMetrics, stages, visits }: Props) {
  const [periodo, setPeriodo]           = useState<Periodo>('tudo')
  const [customInicio, setCustomInicio] = useState('')
  const [customFim, setCustomFim]       = useState('')
  const [metrics, setMetrics]           = useState<Metrics>(initialMetrics)
  const [isPending, startTransition]    = useTransition()

  const { inicio, fim } = useMemo(
    () => getPeriodDates(periodo, customInicio, customFim),
    [periodo, customInicio, customFim]
  )

  function fetchMetrics(p: Periodo, ci: string, cf: string) {
    const { inicio: i, fim: f } = getPeriodDates(p, ci, cf)
    if (p === 'custom' && (!ci || !cf)) return // aguarda ambas as datas
    startTransition(async () => {
      const m = await getDashboardMetrics(i, f)
      setMetrics(m as Metrics)
    })
  }

  function handlePeriodo(p: Periodo) {
    setPeriodo(p)
    if (p !== 'custom') fetchMetrics(p, customInicio, customFim)
  }

  function handleCustomInicio(v: string) {
    setCustomInicio(v)
    if (v && customFim) fetchMetrics('custom', v, customFim)
  }

  function handleCustomFim(v: string) {
    setCustomFim(v)
    if (customInicio && v) fetchMetrics('custom', customInicio, v)
  }

  const periodoLabel = periodo !== 'tudo' ? getPeriodLabel(periodo, customInicio, customFim) : undefined

  return (
    <div className="space-y-4">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do seu CRM</p>
      </div>

      {/* Barra de período — igual ao Financeiro */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-gray-500 shrink-0">Período:</span>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
          {PERIODOS.map(p => (
            <button
              key={p.key}
              onClick={() => handlePeriodo(p.key)}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                periodo === p.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {periodo === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={customInicio}
              onChange={e => handleCustomInicio(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
            <span className="text-xs text-gray-400">até</span>
            <input
              type="date"
              value={customFim}
              onChange={e => handleCustomFim(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>
        )}

        {inicio && fim && (
          <span className="ml-auto text-xs text-gray-400">
            {new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
            {' → '}
            {new Date(fim + 'T12:00:00').toLocaleDateString('pt-BR')}
            {isPending && <span className="ml-2 text-blue-400">atualizando…</span>}
          </span>
        )}
      </div>

      <div className={isPending ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'}>
        <MetricsCards metrics={metrics} periodo={periodoLabel} />
      </div>

      <UpcomingVisits visits={visits as any} />

      <PipelineChart stages={stages} />
    </div>
  )
}
