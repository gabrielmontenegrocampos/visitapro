'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  HardHat, AlertTriangle, Clock, Activity,
  CheckCircle2, TrendingUp, Calendar, ChevronRight,
  MapPin, AlertCircle,
} from 'lucide-react'

interface Projeto {
  id: string
  titulo_publico: string | null
  status_projeto: string | null
  ativo: boolean
  data_inicio: string | null
  data_previsao_fim: string | null
  progresso_manual: number | null
  foto_capa: string | null
  tipo_obra: string | null
  proposals: { title: string; value: number; leads: { name: string; company: string | null } | null } | null
}
interface Registro {
  id: string; projeto_id: string; data: string
  status_obra: string; clima: string | null
  atividades: Array<{ status: string }> | null
}
interface Atividade {
  id: string; projeto_id: string; status: 'pendente' | 'em_andamento' | 'concluida'
}

type Periodo = 'mes' | 'mes-ant' | 'trim' | 'tudo'

const PERIODO_LABELS: Record<Periodo, string> = {
  mes: 'Este mês', 'mes-ant': 'Mês anterior', trim: 'Trimestre', tudo: 'Tudo',
}

const CLIMA_EMOJI: Record<string, string> = {
  ensolarado: '☀️', parcialmente_nublado: '⛅', nublado: '☁️', chuvoso: '🌧️', tempestade: '⛈️',
}

function periodDates(p: Periodo) {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = (a: number, m: number) => new Date(a, m + 1, 0).getDate()
  if (p === 'mes')
    return { ini: `${ano}-${pad(mes + 1)}-01`, fim: `${ano}-${pad(mes + 1)}-${pad(lastDay(ano, mes))}` }
  if (p === 'mes-ant') {
    const pa = mes === 0 ? ano - 1 : ano; const pm = mes === 0 ? 11 : mes - 1
    return { ini: `${pa}-${pad(pm + 1)}-01`, fim: `${pa}-${pad(pm + 1)}-${pad(lastDay(pa, pm))}` }
  }
  if (p === 'trim') {
    const d = new Date(ano, mes - 2, 1)
    return { ini: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, fim: `${ano}-${pad(mes + 1)}-${pad(lastDay(ano, mes))}` }
  }
  return { ini: '', fim: '' }
}

function formatDateBR(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function diasAtras(d: string) {
  const diff = Date.now() - new Date(d + 'T12:00:00').getTime()
  return Math.floor(diff / 86_400_000)
}
function progressColor(n: number) { return n < 30 ? '#ef4444' : n < 70 ? '#f97316' : '#22c55e' }

export default function DiarioDashboardClient({
  projetos, registros, atividades,
}: {
  projetos: Projeto[]
  registros: Registro[]
  atividades: Atividade[]
}) {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const hoje = new Date().toISOString().split('T')[0]
  const { ini, fim } = periodDates(periodo)

  // ── Registros do período ──────────────────────────────────────────────────
  const regPeriodo = useMemo(() =>
    registros.filter(r => {
      if (ini && r.data < ini) return false
      if (fim && r.data > fim) return false
      return true
    }), [registros, ini, fim])

  // ── KPIs gerais (não dependem do período) ────────────────────────────────
  const ativas    = projetos.filter(p => p.status_projeto === 'ativa' || (!p.status_projeto && p.ativo))
  const pausadas  = projetos.filter(p => p.status_projeto === 'pausada')
  const concluidas = projetos.filter(p => p.status_projeto === 'concluida')

  const atrasadas = ativas.filter(p =>
    p.data_previsao_fim && p.data_previsao_fim < hoje
  )

  const sete = new Date(); sete.setDate(sete.getDate() - 7)
  const seteDiasAtras = sete.toISOString().split('T')[0]
  const semRegistro = ativas.filter(p => {
    const ultimo = registros.find(r => r.projeto_id === p.id)
    return !ultimo || ultimo.data < seteDiasAtras
  })

  // ── Progresso por projeto ─────────────────────────────────────────────────
  const progressoPorProjeto = useMemo(() => {
    return projetos.map(p => {
      const ativs = atividades.filter(a => a.projeto_id === p.id)
      let prog = 0
      if (ativs.length > 0) {
        prog = Math.round(ativs.filter(a => a.status === 'concluida').length / ativs.length * 100)
      } else if (p.progresso_manual) {
        prog = p.progresso_manual
      }
      const ultimoReg = registros.find(r => r.projeto_id === p.id)
      return { projeto: p, prog, ultimoReg }
    })
  }, [projetos, atividades, registros])

  // ── Registros por dia (para o gráfico) ──────────────────────────────────
  const regPorDia = useMemo(() => {
    const map: Record<string, number> = {}
    regPeriodo.forEach(r => { map[r.data] = (map[r.data] ?? 0) + 1 })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [regPeriodo])

  // ── Distribuição de climas no período ───────────────────────────────────
  const climaDist = useMemo(() => {
    const map: Record<string, number> = {}
    regPeriodo.forEach(r => {
      if (r.clima) map[r.clima] = (map[r.clima] ?? 0) + 1
    })
    return Object.entries(map).sort(([, a], [, b]) => b - a)
  }, [regPeriodo])

  const maxBarReg = Math.max(...regPorDia.map(([, v]) => v), 1)

  return (
    <div className="space-y-5">
      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Obras ativas" value={String(ativas.length)}
          icon={<HardHat className="w-4 h-4" />} color="text-blue-600 bg-blue-50"
          sub={pausadas.length > 0 ? `${pausadas.length} pausada${pausadas.length > 1 ? 's' : ''}` : undefined}
        />
        <KpiCard
          label="Concluídas" value={String(concluidas.length)}
          icon={<Activity className="w-4 h-4" />} color="text-green-600 bg-green-50"
          sub={concluidas.length > 0 ? `de ${projetos.length} obra${projetos.length !== 1 ? 's' : ''}` : 'Nenhuma concluída'}
        />
        <KpiCard
          label="Em atraso" value={String(atrasadas.length)}
          icon={<AlertTriangle className="w-4 h-4" />}
          color={atrasadas.length > 0 ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-50'}
          sub={atrasadas.length > 0 ? 'Prazo ultrapassado' : 'Nenhuma em atraso'}
        />
        <KpiCard
          label="Sem registro (7d)" value={String(semRegistro.length)}
          icon={<Clock className="w-4 h-4" />}
          color={semRegistro.length > 0 ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50'}
          sub={semRegistro.length > 0 ? 'Requer atenção' : 'Tudo atualizado'}
        />
      </div>

      {/* ── Status das obras ───────────────────────────────────────── */}
      {projetos.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Status das obras</h2>
          <div className="space-y-2">
            {[
              { label: 'Ativas',    count: ativas.length,    color: 'bg-blue-500' },
              { label: 'Pausadas',  count: pausadas.length,  color: 'bg-yellow-400' },
              { label: 'Concluídas', count: concluidas.length, color: 'bg-green-500' },
              { label: 'Em atraso', count: atrasadas.length, color: 'bg-red-500' },
            ].filter(s => s.count > 0).map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 shrink-0">{s.label}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.color} transition-all duration-500`}
                    style={{ width: `${Math.round(s.count / projetos.length * 100)}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-6 text-right shrink-0">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Divisor: análise por período ───────────────────────────── */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Análise por período</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* ── Barra de período ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-gray-500 shrink-0">Período:</span>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
          {(Object.keys(PERIODO_LABELS) as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                periodo === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {PERIODO_LABELS[p]}
            </button>
          ))}
        </div>
        {ini && (
          <span className="text-xs text-gray-400">
            {formatDateBR(ini)} — {formatDateBR(fim)}
          </span>
        )}
        <span className="ml-auto text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg px-2.5 py-1">
          {regPeriodo.length} registro{regPeriodo.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Gráfico: registros por dia ──────────────────────────────── */}
      {regPorDia.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Registros por dia</h2>
            <span className="text-xs text-gray-400">{regPeriodo.length} no período</span>
          </div>
          <div className="flex items-end gap-1.5 h-24 overflow-x-auto pb-1">
            {regPorDia.map(([data, qtd]) => {
              const pct = Math.round(qtd / maxBarReg * 100)
              const d = new Date(data + 'T12:00:00')
              return (
                <div key={data} className="flex flex-col items-center gap-1 shrink-0" style={{ minWidth: 24 }}>
                  <span className="text-[9px] text-gray-500 font-medium">{qtd}</span>
                  <div className="w-5 rounded-t-md bg-blue-500 transition-all duration-300"
                    style={{ height: `${Math.max(pct * 0.72, 4)}px` }} />
                  <span className="text-[9px] text-gray-400 rotate-0 leading-none">
                    {d.getDate()}/{d.getMonth() + 1}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Climas registrados ──────────────────────────────────────── */}
      {climaDist.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Clima registrado no período</h2>
          <div className="flex gap-3 flex-wrap">
            {climaDist.map(([clima, qtd]) => (
              <div key={clima} className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-1.5">
                <span className="text-base">{CLIMA_EMOJI[clima] ?? '🌡️'}</span>
                <span className="text-xs font-medium text-gray-700">{qtd}x</span>
                <span className="text-xs text-gray-400">{clima.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Lista de obras ─────────────────────────────────────────── */}
      {progressoPorProjeto.filter(x => x.projeto.status_projeto !== 'concluida').length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <HardHat className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-700">Obras ativas</h2>
          </div>
          <div className="space-y-2">
            {progressoPorProjeto
              .filter(x => x.projeto.status_projeto !== 'concluida')
              .sort((a, b) => b.prog - a.prog)
              .map(({ projeto: p, prog, ultimoReg }) => {
                const nomeObra = p.titulo_publico ?? p.proposals?.title ?? 'Sem nome'
                const responsavel = p.proposals?.leads?.company ?? p.proposals?.leads?.name ?? null
                const isAtrasada = p.data_previsao_fim && p.data_previsao_fim < hoje
                return (
                  <Link key={p.id} href={`/diario-obra/${p.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-transparent hover:bg-orange-50 hover:border-orange-100 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                      <HardHat className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{responsavel ?? nomeObra}</p>
                      {responsavel && <p className="text-xs text-gray-500 truncate">{nomeObra}</p>}
                      {(isAtrasada || ultimoReg) && (
                        <p className="text-xs mt-0.5">
                          {isAtrasada
                            ? <span className="text-red-500 font-medium">Em atraso</span>
                            : <span className="text-gray-400">Último registro: {formatDateBR(ultimoReg!.data)}</span>
                          }
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {prog > 0 && (
                        <span className="text-xs font-bold" style={{ color: progressColor(prog) }}>{prog}%</span>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  </Link>
                )
              })}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {projetos.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <HardHat className="w-7 h-7 text-blue-400" />
          </div>
          <p className="font-semibold text-gray-900">Nenhuma obra cadastrada</p>
          <p className="text-sm text-gray-500 mt-1">Crie a primeira obra para ver o dashboard</p>
          <Link href="/diario-obra/nova" className="btn-primary mt-4 text-sm inline-flex items-center gap-2">
            Nova Obra
          </Link>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon, color, sub }: {
  label: string; value: string; icon: React.ReactNode; color: string; sub?: string
}) {
  const bg   = color.split(' ').find(c => c.startsWith('bg-'))   ?? 'bg-gray-50'
  const text = color.split(' ').find(c => c.startsWith('text-')) ?? 'text-gray-600'
  const borderMap: Record<string, string> = {
    'bg-blue-50': 'border-blue-100', 'bg-green-50': 'border-green-100',
    'bg-red-50': 'border-red-100',   'bg-amber-50': 'border-amber-100',
    'bg-gray-50': 'border-gray-100',
  }
  const border = borderMap[bg] ?? 'border-gray-100'
  return (
    <div className={`${bg} rounded-2xl p-4 border ${border}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium ${text}`}>{label}</span>
        <div className="w-8 h-8 rounded-xl bg-white/60 flex items-center justify-center">
          <span className={text}>{icon}</span>
        </div>
      </div>
      <p className={`text-2xl font-bold ${text}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${text} opacity-70`}>{sub}</p>}
    </div>
  )
}
