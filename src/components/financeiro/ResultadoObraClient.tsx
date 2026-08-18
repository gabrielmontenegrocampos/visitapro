'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  HardHat, ArrowUpRight, ArrowDownRight, TrendingUp,
  TrendingDown, Clock, Plus, Pencil, Trash2, CheckCircle,
  AlertTriangle, XCircle, ChevronRight, Search, X, SlidersHorizontal,
} from 'lucide-react'
import type { CategoriaFinanceira } from '@/types/database'
import { deleteLancamento } from '@/app/(crm)/financeiro/actions'
import LancamentoModal from './LancamentoModal'

interface Resultado {
  projeto: {
    id: string
    nome: string
    proposals: {
      id: string
      title: string
      value: number
      status: string
      leads: { name: string; phone: string | null } | null
    } | null
  }
  valorOrcado: number
  receitas: number
  despesas: number
  resultado: number
  margem: number
  desvio: number
  desvioPerc: number
  aReceber: number
  aPagar: number
  lancamentos: any[]
}

interface Props {
  resultado: Resultado
  categorias: CategoriaFinanceira[]
  profissionais?: { id: string; nome: string }[]
  canEdit: boolean
  embedded?: boolean
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function pct(v: number) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

const STATUS_CLASS: Record<string, string> = {
  pago: 'bg-green-100 text-green-700',
  pendente: 'bg-amber-100 text-amber-700',
  cancelado: 'bg-gray-100 text-gray-400 line-through',
}
const STATUS_LABEL: Record<string, string> = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' }

export default function ResultadoObraClient({ resultado, categorias, profissionais = [], canEdit, embedded }: Props) {
  const { projeto, valorOrcado, receitas, despesas, resultado: saldo, margem, desvio, desvioPerc, aReceber, aPagar } = resultado
  const [lancamentos, setLancamentos] = useState(resultado.lancamentos)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pago' | 'pendente' | 'cancelado'>('todos')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterMes, setFilterMes] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>()
    lancamentos.forEach((l: any) => { if (l.data) set.add(l.data.slice(0, 7)) })
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [lancamentos])

  const categoriasDisponiveis = useMemo(() => {
    const map = new Map<string, string>()
    lancamentos.forEach((l: any) => {
      if (l.categorias_financeiras?.id) map.set(l.categorias_financeiras.id, l.categorias_financeiras.nome)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [lancamentos])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return lancamentos.filter((l: any) => {
      if (q && !l.descricao?.toLowerCase().includes(q) && !l.categorias_financeiras?.nome?.toLowerCase().includes(q) && !l.profissionais?.nome?.toLowerCase().includes(q)) return false
      if (filterTipo !== 'todos' && l.tipo !== filterTipo) return false
      if (filterStatus !== 'todos' && l.status !== filterStatus) return false
      if (filterCategoria && l.categorias_financeiras?.id !== filterCategoria) return false
      if (filterMes && !l.data?.startsWith(filterMes)) return false
      return true
    })
  }, [lancamentos, search, filterTipo, filterStatus, filterCategoria, filterMes])

  const hasFilters = search || filterTipo !== 'todos' || filterStatus !== 'todos' || filterCategoria || filterMes

  function clearFilters() {
    setSearch('')
    setFilterTipo('todos')
    setFilterStatus('todos')
    setFilterCategoria('')
    setFilterMes('')
  }

  const statusResult = saldo > 0 ? 'lucro' : saldo === 0 ? 'neutro' : 'prejuizo'
  const statusDesvio = desvioPerc >= -5 ? 'ok' : desvioPerc >= -15 ? 'atencao' : 'critico'

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteLancamento(deleteTarget.id)
    setLancamentos(prev => prev.filter(l => l.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  function handleSaved() {
    setShowModal(false)
    setEditTarget(null)
    window.location.reload()
  }

  const maxVal = Math.max(valorOrcado, receitas, despesas, 1)

  return (
    <div className={`${embedded ? 'space-y-4' : 'space-y-6 max-w-4xl mx-auto'}`}>
      {/* Header */}
      {embedded ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <HardHat size={16} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Desempenho Financeiro</h2>
              <Link href={`/financeiro/obras/${projeto.id}`}
                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                Ver relatório completo <ChevronRight size={11} />
              </Link>
            </div>
          </div>
          {canEdit && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shrink-0">
              <Plus size={13} />
              Lançamento
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/financeiro" className="hover:text-gray-700">Financeiro</Link>
            <ChevronRight size={14} />
            <span className="text-gray-800 font-medium truncate">{projeto.nome}</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <HardHat size={20} className="text-orange-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{projeto.nome}</h1>
                {projeto.proposals && (
                  <p className="text-sm text-gray-500">
                    {projeto.proposals.leads?.name} · {projeto.proposals.title}
                  </p>
                )}
              </div>
            </div>
            {canEdit && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shrink-0">
                <Plus size={15} />
                Novo lançamento
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comparativo Orçado vs Realizado */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Orçado vs Realizado</h2>

        {/* Barras comparativas */}
        <div className="space-y-3 mb-5">
          <BarComparativa label="Valor orçado"       value={valorOrcado} max={maxVal} color="bg-blue-400"  textColor="text-blue-700"  compact={embedded} />
          <BarComparativa label="Receitas faturadas" value={receitas}    max={maxVal} color="bg-green-400" textColor="text-green-700" compact={embedded} />
          <BarComparativa label="Custos (despesas)"  value={despesas}    max={maxVal} color="bg-red-400"   textColor="text-red-600"   compact={embedded} />
        </div>

        {/* KPIs principais */}
        <div className={`grid gap-3 ${embedded ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
          <KpiMini
            label="Resultado"
            value={fmt(saldo)}
            sub={`Margem: ${margem.toFixed(1)}%`}
            icon={saldo >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
            color={saldo >= 0 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}
          />
          <KpiMini
            label="Desvio orçamento"
            value={fmt(desvio)}
            sub={pct(desvioPerc)}
            icon={
              statusDesvio === 'ok' ? <CheckCircle size={16}/> :
              statusDesvio === 'atencao' ? <AlertTriangle size={16}/> :
              <XCircle size={16}/>
            }
            color={
              statusDesvio === 'ok' ? 'text-green-600 bg-green-50' :
              statusDesvio === 'atencao' ? 'text-amber-600 bg-amber-50' :
              'text-red-500 bg-red-50'
            }
          />
          <KpiMini
            label="A receber"
            value={fmt(aReceber)}
            sub="pendente"
            icon={<Clock size={16}/>}
            color="text-amber-600 bg-amber-50"
          />
          <KpiMini
            label="A pagar"
            value={fmt(aPagar)}
            sub="pendente"
            icon={<Clock size={16}/>}
            color="text-orange-600 bg-orange-50"
          />
        </div>

        {/* Badge de resultado */}
        <div className={`mt-5 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
          statusResult === 'lucro' ? 'bg-green-50 text-green-700 border border-green-100' :
          statusResult === 'prejuizo' ? 'bg-red-50 text-red-700 border border-red-100' :
          'bg-gray-50 text-gray-600 border border-gray-100'
        }`}>
          {statusResult === 'lucro' && <><CheckCircle size={16}/> Obra com lucro — resultado de {fmt(saldo)} ({margem.toFixed(1)}% de margem)</>}
          {statusResult === 'prejuizo' && <><XCircle size={16}/> Obra com prejuízo — deficit de {fmt(Math.abs(saldo))}</>}
          {statusResult === 'neutro' && <><CheckCircle size={16}/> Resultado neutro (receitas = despesas)</>}
        </div>
      </div>

      {/* Lançamentos da obra */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 shrink-0">
            Lançamentos{' '}
            <span className="text-gray-400 font-normal">
              ({hasFilters ? `${filtered.length} de ${lancamentos.length}` : lancamentos.filter((l: any) => l.status !== 'cancelado').length})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>Receitas</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Despesas</span>
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${showFilters || hasFilters ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <SlidersHorizontal size={13} />
              Filtros
              {hasFilters && <span className="w-4 h-4 bg-blue-600 text-white rounded-full text-[10px] flex items-center justify-center leading-none">{[search, filterTipo !== 'todos', filterStatus !== 'todos', filterCategoria, filterMes].filter(Boolean).length}</span>}
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por descrição, categoria, profissional…"
                className="w-full pl-8 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Chips row */}
            <div className="flex flex-wrap gap-2">
              {/* Tipo */}
              <div className="flex gap-1">
                {(['todos', 'receita', 'despesa'] as const).map(t => (
                  <button key={t} onClick={() => setFilterTipo(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filterTipo === t ? (t === 'receita' ? 'bg-green-100 text-green-700' : t === 'despesa' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700') : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {t === 'todos' ? 'Todos' : t === 'receita' ? 'Receitas' : 'Despesas'}
                  </button>
                ))}
              </div>

              {/* Status */}
              <div className="flex gap-1">
                {(['todos', 'pago', 'pendente', 'cancelado'] as const).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {s === 'todos' ? 'Todos status' : STATUS_LABEL[s]}
                  </button>
                ))}
              </div>

              {/* Categoria */}
              {categoriasDisponiveis.length > 0 && (
                <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-white border border-gray-200 text-gray-500 outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer">
                  <option value="">Todas categorias</option>
                  {categoriasDisponiveis.map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              )}

              {/* Mês */}
              {mesesDisponiveis.length > 0 && (
                <select value={filterMes} onChange={e => setFilterMes(e.target.value)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-white border border-gray-200 text-gray-500 outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer">
                  <option value="">Todos os meses</option>
                  {mesesDisponiveis.map(m => (
                    <option key={m} value={m}>
                      {new Date(m + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              )}

              {hasFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 transition-colors">
                  <X size={11} /> Limpar
                </button>
              )}
            </div>
          </div>
        )}

        {lancamentos.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">Nenhum lançamento ainda</p>
            {canEdit && (
              <button onClick={() => setShowModal(true)}
                className="mt-3 text-sm text-blue-600 hover:underline">
                Criar primeiro lançamento
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-400 text-sm">Nenhum lançamento encontrado com esses filtros</p>
            <button onClick={clearFilters} className="mt-2 text-sm text-blue-600 hover:underline">Limpar filtros</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((l: any) => (
              <div key={l.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${l.status === 'cancelado' ? 'opacity-50' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${l.tipo === 'receita' ? 'bg-green-50' : 'bg-red-50'}`}>
                  {l.tipo === 'receita'
                    ? <ArrowUpRight size={13} className="text-green-600" />
                    : <ArrowDownRight size={13} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{l.descricao}</p>
                  <p className="text-xs text-gray-400">
                    {l.categorias_financeiras?.nome}
                    {l.profissionais?.nome && <> · 👤 {l.profissionais.nome}</>}
                    {' · '}{new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_CLASS[l.status]}`}>
                  {STATUS_LABEL[l.status]}
                </span>
                <span className={`text-sm font-semibold shrink-0 ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                  {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
                </span>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditTarget(l)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setDeleteTarget(l)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Totais filtrados */}
        {hasFilters && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-6 text-xs">
            <span className="text-gray-500">{filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}</span>
            {filtered.some((l: any) => l.tipo === 'receita') && (
              <span className="text-green-600 font-semibold">
                +{fmt(filtered.filter((l: any) => l.tipo === 'receita').reduce((s: number, l: any) => s + l.valor, 0))}
              </span>
            )}
            {filtered.some((l: any) => l.tipo === 'despesa') && (
              <span className="text-red-500 font-semibold">
                -{fmt(filtered.filter((l: any) => l.tipo === 'despesa').reduce((s: number, l: any) => s + l.valor, 0))}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <LancamentoModal
          categorias={categorias}
          projetos={[{ id: projeto.id, nome: projeto.nome }]}
          profissionais={profissionais}
          projetoIdFixo={projeto.id}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
      {editTarget && (
        <LancamentoModal
          categorias={categorias}
          projetos={[{ id: projeto.id, nome: projeto.nome }]}
          profissionais={profissionais}
          projetoIdFixo={projeto.id}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
          initial={editTarget}
        />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Excluir lançamento?</h3>
            <p className="text-sm text-gray-500 mb-5">
              "<strong>{deleteTarget.descricao}</strong>" — {fmt(deleteTarget.valor)}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-sm font-medium">
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BarComparativa({ label, value, max, color, textColor, compact }: {
  label: string; value: number; max: number; color: string; textColor: string; compact?: boolean
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs text-gray-500 shrink-0 ${compact ? 'w-28' : 'w-36'}`}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold shrink-0 text-right tabular-nums ${compact ? 'w-24' : 'w-28'} ${textColor}`}>
        {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  )
}

function KpiMini({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-base font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}
