'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Wallet, Clock,
  ArrowUpRight, ArrowDownRight, Plus, Tag,
  Building2, HardHat, CheckCircle2, RefreshCw,
  Pencil, Trash2, X, ChevronRight, Filter,
} from 'lucide-react'
import type { CategoriaFinanceira } from '@/types/database'
import LancamentoModal from './LancamentoModal'
import { deleteLancamento, cancelarRecorrencia, updateLancamentoStatus, createCategoria, updateCategoria, deleteCategoria } from '@/app/(crm)/financeiro/actions'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_CLASS: Record<string, string> = {
  pago:      'bg-green-100 text-green-700',
  pendente:  'bg-amber-100 text-amber-700',
  cancelado: 'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<string, string> = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' }

interface DashboardData {
  receitas: number; despesas: number; saldo: number
  aReceber: number; aPagar: number
  meses: { mes: string; receitas: number; despesas: number }[]
  recentes: any[]
  adm: { receitas: number; despesas: number; saldo: number }
  obras: { receitas: number; despesas: number; saldo: number }
  porProjeto: { id: string; nome: string; receitas: number; despesas: number; saldo: number }[]
}

interface Lancamento {
  id: string; categoria_id: string; tipo: 'receita' | 'despesa'
  divisao: 'administracao' | 'obra'; descricao: string; valor: number
  data: string; status: 'pendente' | 'pago' | 'cancelado'
  projeto_id: string | null; observacoes: string | null
  recorrencia_grupo_id: string | null; recorrencia_mes: number | null
  categorias_financeiras: { id: string; nome: string } | null
  projetos_diario: { id: string; nome: string } | null
}

interface Props {
  dashboard: DashboardData
  categorias: CategoriaFinanceira[]
  projetos: { id: string; nome: string; proposals?: { value: number; title: string } | null }[]
  lancamentos: Lancamento[]
  canEdit: boolean
}

export default function FinanceiroClient({ dashboard, categorias: initialCats, projetos, lancamentos: initialLanc, canEdit }: Props) {
  const [activeTab, setActiveTab] = useState<'resumo' | 'lancamentos' | 'categorias'>('resumo')
  const [lancamentos, setLancamentos] = useState(initialLanc)
  const [categorias, setCategorias] = useState(initialCats)

  // Modal lançamento
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Lancamento | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Lancamento | null>(null)
  const [cancelRecorrTarget, setCancelRecorrTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Filtros lançamentos
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroDivisao, setFiltroDivisao] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  // Modal categoria
  const [showCatModal, setShowCatModal] = useState(false)
  const [editCat, setEditCat] = useState<CategoriaFinanceira | null>(null)
  const [deleteCat, setDeleteCat] = useState<CategoriaFinanceira | null>(null)
  const [catNome, setCatNome] = useState('')
  const [catTipo, setCatTipo] = useState<'receita' | 'despesa'>('despesa')
  const [catDivisao, setCatDivisao] = useState<'administracao' | 'obra'>('administracao')
  const [catSaving, setCatSaving] = useState(false)
  const [catDeleting, setCatDeleting] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)

  // Meses disponíveis
  const mesesDisponiveis = useMemo(() => {
    const set = new Set(lancamentos.map(l => l.data.slice(0, 7)))
    // Garantir que o mês atual sempre aparece
    set.add(new Date().toISOString().slice(0, 7))
    return Array.from(set).sort().reverse().slice(0, 6)
  }, [lancamentos])

  // Lançamentos filtrados
  const filtered = useMemo(() => {
    return lancamentos.filter(l => {
      if (filtroMes && !l.data.startsWith(filtroMes)) return false
      if (filtroTipo && l.tipo !== filtroTipo) return false
      if (filtroDivisao && l.divisao !== filtroDivisao) return false
      if (filtroStatus && l.status !== filtroStatus) return false
      return true
    })
  }, [lancamentos, filtroMes, filtroTipo, filtroDivisao, filtroStatus])

  // Totais do mês filtrado
  const totalReceitas = filtered.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
  const totalDespesas = filtered.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
  const totalPendente = filtered.filter(l => l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0)

  // Agrupar por data
  const agrupado = useMemo(() => {
    const groups: Record<string, Lancamento[]> = {}
    filtered.forEach(l => {
      const key = l.data
      if (!groups[key]) groups[key] = []
      groups[key].push(l)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  async function handleToggleStatus(l: Lancamento) {
    if (l.status === 'cancelado') return
    const newStatus = l.status === 'pago' ? 'pendente' : 'pago'
    setTogglingId(l.id)
    await updateLancamentoStatus(l.id, newStatus)
    setLancamentos(prev => prev.map(x => x.id === l.id ? { ...x, status: newStatus } : x))
    setTogglingId(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteLancamento(deleteTarget.id)
    setLancamentos(prev => prev.filter(l => l.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  async function handleCancelRecorr() {
    if (!cancelRecorrTarget) return
    await cancelarRecorrencia(cancelRecorrTarget)
    setCancelRecorrTarget(null)
    window.location.reload()
  }

  function handleSaved() {
    setShowModal(false); setEditTarget(null)
    window.location.reload()
  }

  // Categorias
  function openCreateCat() {
    setCatNome(''); setCatTipo('despesa'); setCatDivisao('administracao')
    setEditCat(null); setCatError(null); setShowCatModal(true)
  }
  function openEditCat(c: CategoriaFinanceira) {
    setCatNome(c.nome); setCatTipo(c.tipo); setCatDivisao(c.divisao)
    setEditCat(c); setCatError(null); setShowCatModal(true)
  }
  async function handleSaveCat() {
    if (!catNome.trim()) { setCatError('Informe um nome'); return }
    setCatSaving(true); setCatError(null)
    const res = editCat
      ? await updateCategoria(editCat.id, { nome: catNome.trim(), tipo: catTipo, divisao: catDivisao })
      : await createCategoria({ nome: catNome.trim(), tipo: catTipo, divisao: catDivisao })
    setCatSaving(false)
    if (res.error) { setCatError(res.error); return }
    setShowCatModal(false)
    window.location.reload()
  }
  async function handleDeleteCat() {
    if (!deleteCat) return
    setCatDeleting(true)
    await deleteCategoria(deleteCat.id)
    setCategorias(prev => prev.filter(c => c.id !== deleteCat.id))
    setDeleteCat(null); setCatDeleting(false)
  }

  const maxBar = Math.max(...dashboard.meses.map(m => Math.max(m.receitas, m.despesas)), 1)

  const tabs = [
    { key: 'resumo' as const,      label: 'Resumo' },
    { key: 'lancamentos' as const, label: 'Lançamentos', count: lancamentos.filter(l => l.status === 'pendente').length },
    { key: 'categorias' as const,  label: 'Categorias' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-0.5">Controle de receitas, despesas e resultado por obra</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setEditTarget(null); setShowModal(true) }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={15} /> Novo lançamento
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count ? (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                activeTab === tab.key ? 'bg-amber-100 text-amber-700' : 'bg-amber-200 text-amber-700'
              }`}>{tab.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ══ ABA RESUMO ══ */}
      {activeTab === 'resumo' && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Receitas pagas',  value: fmt(dashboard.receitas), icon: <TrendingUp size={18}/>,  color: 'text-green-600 bg-green-50' },
              { label: 'Despesas pagas',  value: fmt(dashboard.despesas), icon: <TrendingDown size={18}/>, color: 'text-red-500 bg-red-50' },
              { label: 'Saldo do período',value: fmt(dashboard.saldo),    icon: <Wallet size={18}/>,       color: dashboard.saldo >= 0 ? 'text-blue-600 bg-blue-50' : 'text-red-500 bg-red-50' },
              { label: 'A receber',       value: fmt(dashboard.aReceber), icon: <Clock size={18}/>,        color: 'text-amber-600 bg-amber-50',
                sub: dashboard.aPagar > 0 ? `A pagar: ${fmt(dashboard.aPagar)}` : undefined },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">{k.label}</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.color}`}>{k.icon}</div>
                </div>
                <p className="text-xl font-bold text-gray-900">{k.value}</p>
                {k.sub && <p className="text-xs text-gray-400 mt-1">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Adm + Obras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Administração Central', sub: 'Escritório, equipe, operacional', data: dashboard.adm, icon: <Building2 size={18} className="text-blue-600" />, bg: 'bg-blue-50', link: '?divisao=administracao' },
              { label: 'Obras em Andamento',    sub: 'Custos e receitas por projeto',   data: dashboard.obras, icon: <HardHat size={18} className="text-orange-600" />, bg: 'bg-orange-50', link: '?divisao=obra' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>{card.icon}</div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800">{card.label}</h2>
                    <p className="text-xs text-gray-400">{card.sub}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {[
                    { l: 'Receitas', v: card.data.receitas, c: 'text-green-600' },
                    { l: 'Despesas', v: card.data.despesas, c: 'text-red-500' },
                  ].map(row => (
                    <div key={row.l} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-sm text-gray-500">{row.l}</span>
                      <span className={`text-sm font-semibold ${row.c}`}>{fmt(row.v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-medium text-gray-700">Saldo</span>
                    <span className={`text-base font-bold ${card.data.saldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(card.data.saldo)}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFiltroDivisao(card.link.includes('obra') ? 'obra' : 'administracao')
                    setFiltroMes('')
                    setActiveTab('lancamentos')
                  }}
                  className="mt-3 block w-full text-xs text-blue-600 hover:underline text-center"
                >
                  Ver lançamentos →
                </button>
              </div>
            ))}
          </div>

          {/* Por projeto */}
          {dashboard.porProjeto.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">Resultado por obra</h2>
                <span className="text-xs text-gray-400">Clique para detalhar</span>
              </div>
              <div className="space-y-2">
                {dashboard.porProjeto.map(p => (
                  <Link key={p.id} href={`/financeiro/obras/${p.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                      <HardHat size={15} className="text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">{p.nome}</p>
                      <p className="text-xs text-gray-400">
                        {p.saldo > 0 ? '✓ Com lucro' : p.saldo < 0 ? '⚠ Com prejuízo' : '— Neutro'}
                      </p>
                    </div>
                    <div className="hidden sm:flex gap-4 text-right shrink-0">
                      <div><p className="text-xs text-gray-400">Receitas</p><p className="text-sm font-semibold text-green-600">{fmt(p.receitas)}</p></div>
                      <div><p className="text-xs text-gray-400">Despesas</p><p className="text-sm font-semibold text-red-500">{fmt(p.despesas)}</p></div>
                      <div><p className="text-xs text-gray-400">Resultado</p><p className={`text-sm font-bold ${p.saldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(p.saldo)}</p></div>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Gráfico */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Receitas vs Despesas — últimos 6 meses</h2>
            <div className="flex items-end gap-3 h-40">
              {dashboard.meses.map(m => (
                <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-1 items-end" style={{ height: '120px' }}>
                    <div className="flex-1 bg-green-400 rounded-t-md"
                      style={{ height: `${(m.receitas / maxBar) * 100}%`, minHeight: m.receitas > 0 ? '4px' : '0' }}
                      title={`Receitas: ${fmt(m.receitas)}`} />
                    <div className="flex-1 bg-red-400 rounded-t-md"
                      style={{ height: `${(m.despesas / maxBar) * 100}%`, minHeight: m.despesas > 0 ? '4px' : '0' }}
                      title={`Despesas: ${fmt(m.despesas)}`} />
                  </div>
                  <span className="text-[10px] text-gray-400 capitalize">{m.mes}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-3 rounded-sm bg-green-400" /> Receitas</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-3 rounded-sm bg-red-400" /> Despesas</div>
            </div>
          </div>
        </div>
      )}

      {/* ══ ABA LANÇAMENTOS ══ */}
      {activeTab === 'lancamentos' && (
        <div className="space-y-4">
          {/* Seletor de mês — pills horizontais */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {/* Pill "Todos" */}
            <button
              onClick={() => setFiltroMes('')}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                filtroMes === ''
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">Todos</div>
              <div className={`text-[10px] mt-0.5 ${filtroMes === '' ? 'text-blue-100' : 'text-gray-400'}`}>
                {lancamentos.length} registros
              </div>
            </button>
            {mesesDisponiveis.map(mes => {
              const r = lancamentos.filter(l => l.data.startsWith(mes) && l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
              const d = lancamentos.filter(l => l.data.startsWith(mes) && l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
              const saldo = r - d
              const label = new Date(mes + '-15').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
              return (
                <button
                  key={mes}
                  onClick={() => setFiltroMes(mes)}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                    filtroMes === mes
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold capitalize">{label}</div>
                  <div className={`text-[10px] mt-0.5 ${filtroMes === mes ? 'text-blue-100' : saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {saldo >= 0 ? '+' : ''}{fmt(saldo)}
                  </div>
                </button>
              )
            })}
          </div>

          {/* KPIs do mês */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <p className="text-xs text-green-700 font-medium">Receitas pagas</p>
              <p className="text-lg font-bold text-green-700">{fmt(totalReceitas)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-xs text-red-600 font-medium">Despesas pagas</p>
              <p className="text-lg font-bold text-red-600">{fmt(totalDespesas)}</p>
            </div>
            <div className={`rounded-xl p-3 border ${totalReceitas - totalDespesas >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
              <p className="text-xs font-medium text-gray-600">Saldo</p>
              <p className={`text-lg font-bold ${totalReceitas - totalDespesas >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                {fmt(totalReceitas - totalDespesas)}
              </p>
            </div>
          </div>

          {/* Filtros adicionais */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap gap-2 items-center">
            <Filter size={13} className="text-gray-400 shrink-0" />
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              <option value="">Tipo: todos</option>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
            <select value={filtroDivisao} onChange={e => setFiltroDivisao(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              <option value="">Divisão: todas</option>
              <option value="administracao">Administração</option>
              <option value="obra">Obra</option>
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              <option value="">Status: todos</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Cancelado</option>
            </select>
            {(filtroTipo || filtroDivisao || filtroStatus) && (
              <button onClick={() => { setFiltroTipo(''); setFiltroDivisao(''); setFiltroStatus('') }}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <X size={11} /> Limpar filtros
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400">{filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Lista agrupada por data */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center">
                <p className="text-gray-400 text-sm">Nenhum lançamento neste período</p>
                {canEdit && (
                  <button onClick={() => { setEditTarget(null); setShowModal(true) }}
                    className="mt-3 text-sm text-blue-600 hover:underline">
                    Criar primeiro lançamento
                  </button>
                )}
              </div>
            )}
            {agrupado.map(([data, itens]) => (
              <div key={data} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header do grupo */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-600">
                    {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  <div className="flex gap-3 text-xs">
                    {itens.filter(i => i.tipo === 'receita').length > 0 && (
                      <span className="text-green-600 font-medium">
                        +{fmt(itens.filter(i => i.tipo === 'receita').reduce((s, i) => s + Number(i.valor), 0))}
                      </span>
                    )}
                    {itens.filter(i => i.tipo === 'despesa').length > 0 && (
                      <span className="text-red-500 font-medium">
                        -{fmt(itens.filter(i => i.tipo === 'despesa').reduce((s, i) => s + Number(i.valor), 0))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Itens do grupo */}
                <div className="divide-y divide-gray-50">
                  {itens.map(l => (
                    <div key={l.id} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${l.status === 'cancelado' ? 'opacity-40' : ''}`}>
                      {/* Ícone tipo */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${l.tipo === 'receita' ? 'bg-green-50' : 'bg-red-50'}`}>
                        {l.tipo === 'receita'
                          ? <ArrowUpRight size={14} className="text-green-600" />
                          : <ArrowDownRight size={14} className="text-red-500" />}
                      </div>

                      {/* Descrição */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-gray-800 truncate">{l.descricao}</p>
                          {l.recorrencia_grupo_id && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium shrink-0">
                              <RefreshCw size={9} /> recorrente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400">{l.categorias_financeiras?.nome ?? '-'}</span>
                          {l.projetos_diario && (
                            <span className="text-xs text-orange-500 font-medium">{l.projetos_diario.nome}</span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${l.divisao === 'obra' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                            {l.divisao === 'obra' ? 'Obra' : 'Admin'}
                          </span>
                        </div>
                      </div>

                      {/* Valor + status */}
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                          {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
                        </p>
                        {/* Clique no badge para alternar status */}
                        {canEdit && l.status !== 'cancelado' ? (
                          <button
                            onClick={() => handleToggleStatus(l)}
                            disabled={togglingId === l.id}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors mt-1 ${STATUS_CLASS[l.status]} hover:opacity-75 cursor-pointer`}
                            title={l.status === 'pendente' ? 'Clique para marcar como pago' : 'Clique para marcar como pendente'}
                          >
                            {togglingId === l.id ? '...' : STATUS_LABEL[l.status]}
                          </button>
                        ) : (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${STATUS_CLASS[l.status]}`}>
                            {STATUS_LABEL[l.status]}
                          </span>
                        )}
                      </div>

                      {/* Ações */}
                      {canEdit && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => setEditTarget(l)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <Pencil size={13} />
                          </button>
                          {l.recorrencia_grupo_id && l.status === 'pendente' && (
                            <button onClick={() => setCancelRecorrTarget(l.recorrencia_grupo_id!)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition-colors"
                              title="Cancelar recorrência futura">
                              <RefreshCw size={13} />
                            </button>
                          )}
                          <button onClick={() => setDeleteTarget(l)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ ABA CATEGORIAS ══ */}
      {activeTab === 'categorias' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canEdit && (
              <button onClick={openCreateCat}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">
                <Plus size={14} /> Nova categoria
              </button>
            )}
          </div>
          {(['administracao', 'obra'] as const).map(div => (
            <div key={div} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className={`px-5 py-3 border-b border-gray-100 flex items-center gap-2 ${div === 'administracao' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                {div === 'administracao' ? <Building2 size={15} className="text-blue-600" /> : <HardHat size={15} className="text-orange-600" />}
                <span className={`text-xs font-bold uppercase tracking-wider ${div === 'administracao' ? 'text-blue-700' : 'text-orange-700'}`}>
                  {div === 'administracao' ? 'Administração' : 'Obra'}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {(['receita', 'despesa'] as const).map(tipo => {
                  const cats = categorias.filter(c => c.divisao === div && c.tipo === tipo)
                  if (cats.length === 0) return null
                  return (
                    <div key={tipo} className="px-5 py-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        {tipo === 'receita' ? '↑ Receitas' : '↓ Despesas'}
                      </p>
                      <div className="space-y-1">
                        {cats.map(c => (
                          <div key={c.id} className="flex items-center justify-between py-1.5 group">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${tipo === 'receita' ? 'bg-green-400' : 'bg-red-400'}`} />
                              <span className="text-sm text-gray-700">{c.nome}</span>
                            </div>
                            {canEdit && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditCat(c)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => setDeleteCat(c)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {categorias.filter(c => c.divisao === div).length === 0 && (
                  <p className="px-5 py-4 text-sm text-gray-400 text-center">Nenhuma categoria</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ MODALS ══ */}

      {/* Lançamento */}
      {(showModal || editTarget) && (
        <LancamentoModal
          categorias={categorias}
          projetos={projetos}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSaved={handleSaved}
          initial={editTarget ?? undefined}
        />
      )}

      {/* Confirmar delete lançamento */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Excluir lançamento?</h3>
            <p className="text-sm text-gray-500 mb-5">
              &quot;<strong>{deleteTarget.descricao}</strong>&quot; — {fmt(deleteTarget.valor)}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-sm font-medium">
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancelar recorrência */}
      {cancelRecorrTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <RefreshCw size={20} className="text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Cancelar recorrência?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">Todos os lançamentos <strong>futuros e pendentes</strong> desta série serão cancelados. Os já pagos não serão alterados.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelRecorrTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Manter</button>
              <button onClick={handleCancelRecorr} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium">Cancelar série</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal categoria */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">{editCat ? 'Editar categoria' : 'Nova categoria'}</h3>
              <button onClick={() => setShowCatModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input value={catNome} onChange={e => setCatNome(e.target.value)} placeholder="Ex: Material de limpeza"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
                  <select value={catTipo} onChange={e => setCatTipo(e.target.value as any)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Divisão *</label>
                  <select value={catDivisao} onChange={e => setCatDivisao(e.target.value as any)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="administracao">Administração</option>
                    <option value="obra">Obra</option>
                  </select>
                </div>
              </div>
              {catError && <p className="text-xs text-red-500">{catError}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCatModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveCat} disabled={catSaving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium">
                {catSaving ? 'Salvando...' : (editCat ? 'Atualizar' : 'Criar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar delete categoria */}
      {deleteCat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Excluir categoria?</h3>
            <p className="text-sm text-gray-500 mb-5">&quot;{deleteCat.nome}&quot; será desativada.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteCat(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDeleteCat} disabled={catDeleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-sm font-medium">
                {catDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
