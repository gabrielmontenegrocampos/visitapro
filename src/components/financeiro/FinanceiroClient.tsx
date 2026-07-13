'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Wallet, Clock,
  ArrowUpRight, ArrowDownRight, Plus,
  Building2, HardHat, CheckCircle2, RefreshCw,
  Pencil, Trash2, X, ChevronRight, Filter, CheckSquare,
} from 'lucide-react'
import type { CategoriaFinanceira } from '@/types/database'
import LancamentoModal from './LancamentoModal'
import ConciliacaoBancariaCard from './ConciliacaoBancariaCard'
import { deleteLancamento, deleteLancamentoEProximos, cancelarRecorrencia, updateLancamentoStatus, updateLancamentosStatusBulk, createCategoria, updateCategoria, deleteCategoria, deduplicarCategorias, getLancamentos } from '@/app/(crm)/financeiro/actions'

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
  receitasTotal: number; despesasTotal: number; saldoProjetado: number
  meses: { mes: string; receitas: number; despesas: number; receitasPendente: number; despesasPendente: number }[]
  recentes: any[]
  adm: { receitas: number; receitasPendente: number; despesas: number; despesasPendente: number; saldo: number }
  obras: { receitas: number; receitasPendente: number; despesas: number; despesasPendente: number; saldo: number }
  porProjeto: { id: string; nome: string; receitas: number; despesas: number; saldo: number; aReceber: number; aPagar: number }[]
}

interface Lancamento {
  id: string; categoria_id: string; tipo: 'receita' | 'despesa'
  divisao: 'administracao' | 'obra'; descricao: string; valor: number
  data: string; status: 'pendente' | 'pago' | 'cancelado'
  projeto_id: string | null; profissional_id: string | null; observacoes: string | null
  recorrencia_grupo_id: string | null; recorrencia_mes: number | null
  categorias_financeiras: { id: string; nome: string } | null
  projetos_diario: { id: string; nome: string } | null
  profissionais: { id: string; nome: string } | null
}

interface SaldoConciliacao {
  saldo_inicial: number
  saldo_inicial_data: string
}
interface ConciliacaoMensal {
  mes: string
  saldo_banco: number | null
  observacoes: string | null
  updated_at: string
}

interface Props {
  dashboard: DashboardData
  categorias: CategoriaFinanceira[]
  projetos: { id: string; nome: string; proposals?: { value: number; title: string } | null }[]
  profissionais: { id: string; nome: string }[]
  lancamentos: Lancamento[]
  saldoConciliacao?: SaldoConciliacao
  conciliacoesMensais?: ConciliacaoMensal[]
  canEdit: boolean
  initialAba?: string
}

type ActiveTab = 'resumo' | 'administracao' | 'obras' | 'relatorios' | 'categorias'

function resolveAba(aba?: string): ActiveTab {
  if (aba === 'obras')         return 'obras'
  if (aba === 'administracao') return 'administracao'
  if (aba === 'relatorios')    return 'relatorios'
  if (aba === 'categorias')    return 'categorias'
  return 'resumo'
}

export default function FinanceiroClient({ dashboard, categorias: initialCats, projetos, profissionais, lancamentos: initialLanc, saldoConciliacao, conciliacoesMensais, canEdit, initialAba }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => resolveAba(initialAba))

  // Sincroniza a aba quando navega via sidebar (URL muda, componente reaproveita instância)
  useEffect(() => {
    setActiveTab(resolveAba(initialAba))
  }, [initialAba])
  const [modalDivisao, setModalDivisao] = useState<'administracao' | 'obra'>('administracao')

  const [lancamentos, setLancamentos] = useState(initialLanc)
  const [categorias, setCategorias] = useState(initialCats)

  // Modal lançamento
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Lancamento | null>(null)
  // Edição a partir da busca por palavra-chave (não recarrega a página — fica na mesma tela/filtro)
  const [editTargetBusca, setEditTargetBusca] = useState<Lancamento | null>(null)
  const [refreshingBusca, setRefreshingBusca] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Lancamento | null>(null)
  const [deleteMode, setDeleteMode] = useState<'single' | 'group'>('single')
  const [cancelRecorrTarget, setCancelRecorrTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Seleção em massa
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Filtros lançamentos (shared between tabs)
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

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
  const [deduping, setDeduping] = useState(false)
  const [dedupMsg, setDedupMsg] = useState<string | null>(null)

  // Filtros e visualização do Resumo
  const [periodoResumo, setPeriodoResumo] = useState<'mes' | 'mes-ant' | 'trim' | 'ano' | 'tudo' | 'custom'>('ano')
  const [resumoInicio, setResumoInicio] = useState('')
  const [resumoFim, setResumoFim] = useState('')
  const [vizResumo, setVizResumo] = useState<'barras' | 'contas' | 'tabela' | 'categorias'>('barras')
  const [periodoTab, setPeriodoTab] = useState<'mes' | 'mes-ant' | 'trim' | 'ano' | 'tudo' | 'custom'>('tudo')
  const [relatorioAtivo, setRelatorioAtivo] = useState<'dre' | 'resumo' | 'vencer' | 'fluxo' | 'categorias' | 'comparativo' | 'margens' | 'busca'>('dre')
  const [anoRelatorio, setAnoRelatorio] = useState<string>(new Date().getFullYear().toString())
  const [periodoRelatorio, setPeriodoRelatorio] = useState<'mes' | 'mes-ant' | 'trim' | 'ano' | 'tudo' | 'custom'>('ano')
  const [relCustomInicio, setRelCustomInicio] = useState('')
  const [relCustomFim,    setRelCustomFim]    = useState('')
  const [relBusca,        setRelBusca]        = useState('')

  // Divisão ativa pela aba (null = sem filtro de divisão)
  const tabDivisao: 'administracao' | 'obra' | null =
    activeTab === 'administracao' ? 'administracao' :
    activeTab === 'obras' ? 'obra' : null

  // Meses disponíveis (filtrados pela divisão da aba)
  const mesesDisponiveis = useMemo(() => {
    const src = tabDivisao ? lancamentos.filter(l => l.divisao === tabDivisao) : lancamentos
    const set = new Set(src.map(l => l.data.slice(0, 7)))
    set.add(new Date().toISOString().slice(0, 7))
    return Array.from(set).sort().reverse().slice(0, 6)
  }, [lancamentos, tabDivisao])

  // Lançamentos filtrados (divisão controlada pela aba)
  const filtered = useMemo(() => {
    return lancamentos.filter(l => {
      if (tabDivisao && l.divisao !== tabDivisao) return false
      if (filtroMes && !l.data.startsWith(filtroMes)) return false
      if (filtroTipo && l.tipo !== filtroTipo) return false
      if (filtroStatus && l.status !== filtroStatus) return false
      if (filtroDataInicio && l.data < filtroDataInicio) return false
      if (filtroDataFim && l.data > filtroDataFim) return false
      return true
    })
  }, [lancamentos, tabDivisao, filtroMes, filtroTipo, filtroStatus, filtroDataInicio, filtroDataFim])

  // Totais do filtro atual
  const totalReceitas         = filtered.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
  const totalDespesas         = filtered.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
  const totalPendente         = filtered.filter(l => l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0)
  const tabReceitasPendentes  = filtered.filter(l => l.tipo === 'receita' && l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0)
  const tabDespesasPendentes  = filtered.filter(l => l.tipo === 'despesa' && l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0)
  const tabSaldo              = totalReceitas - totalDespesas
  const tabPendentesCount     = filtered.filter(l => l.status === 'pendente').length

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

  // Por projeto (para aba obras)
  const porProjetoFiltrado = useMemo(() => {
    if (activeTab !== 'obras') return []
    const mapa: Record<string, { id: string; nome: string; receitas: number; despesas: number; saldo: number; aReceber: number; aPagar: number }> = {}
    filtered.forEach(l => {
      const pid = l.projeto_id ?? '__sem_projeto__'
      const nome = l.projetos_diario?.nome ?? 'Sem obra vinculada'
      if (!mapa[pid]) mapa[pid] = { id: pid, nome, receitas: 0, despesas: 0, saldo: 0, aReceber: 0, aPagar: 0 }
      if (l.tipo === 'receita') {
        if (l.status === 'pago') { mapa[pid].receitas += Number(l.valor); mapa[pid].saldo += Number(l.valor) }
        else if (l.status === 'pendente') mapa[pid].aReceber += Number(l.valor)
      } else {
        if (l.status === 'pago') { mapa[pid].despesas += Number(l.valor); mapa[pid].saldo -= Number(l.valor) }
        else if (l.status === 'pendente') mapa[pid].aPagar += Number(l.valor)
      }
    })
    return Object.values(mapa).sort((a, b) => b.receitas - a.receitas)
  }, [filtered, activeTab])

  // ── Período do resumo ──────────────────────────────────────────
  const resumoPeriodDates = useMemo(() => {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth()
    const pad = (n: number) => String(n).padStart(2, '0')
    const lastDay = (a: number, m: number) => new Date(a, m + 1, 0).getDate()

    if (periodoResumo === 'mes')
      return { inicio: `${ano}-${pad(mes + 1)}-01`, fim: `${ano}-${pad(mes + 1)}-${lastDay(ano, mes)}` }
    if (periodoResumo === 'mes-ant') {
      const pa = mes === 0 ? ano - 1 : ano; const pm = mes === 0 ? 11 : mes - 1
      return { inicio: `${pa}-${pad(pm + 1)}-01`, fim: `${pa}-${pad(pm + 1)}-${lastDay(pa, pm)}` }
    }
    if (periodoResumo === 'trim') {
      const d = new Date(ano, mes - 2, 1)
      return { inicio: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, fim: `${ano}-${pad(mes + 1)}-${lastDay(ano, mes)}` }
    }
    if (periodoResumo === 'ano') return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` }
    if (periodoResumo === 'custom') return { inicio: resumoInicio, fim: resumoFim }
    return { inicio: '', fim: '' } // tudo
  }, [periodoResumo, resumoInicio, resumoFim])

  // Lançamentos do período (sem cancelados)
  const resumoBase = useMemo(() =>
    lancamentos.filter(l => {
      if (l.status === 'cancelado') return false
      if (resumoPeriodDates.inicio && l.data < resumoPeriodDates.inicio) return false
      if (resumoPeriodDates.fim   && l.data > resumoPeriodDates.fim)   return false
      return true
    }),
  [lancamentos, resumoPeriodDates])

  // KPIs do período
  const rKPIs = useMemo(() => {
    const s = (arr: typeof resumoBase) => arr.reduce((acc, l) => acc + Number(l.valor), 0)
    const recPago  = s(resumoBase.filter(l => l.tipo === 'receita' && l.status === 'pago'))
    const recPend  = s(resumoBase.filter(l => l.tipo === 'receita' && l.status === 'pendente'))
    const despPago = s(resumoBase.filter(l => l.tipo === 'despesa' && l.status === 'pago'))
    const despPend = s(resumoBase.filter(l => l.tipo === 'despesa' && l.status === 'pendente'))
    const mk = (arr: typeof resumoBase) => ({
      receitas:          s(arr.filter(l => l.tipo === 'receita' && l.status === 'pago')),
      receitasPendente:  s(arr.filter(l => l.tipo === 'receita' && l.status === 'pendente')),
      despesas:          s(arr.filter(l => l.tipo === 'despesa' && l.status === 'pago')),
      despesasPendente:  s(arr.filter(l => l.tipo === 'despesa' && l.status === 'pendente')),
      get saldo() { return this.receitas - this.despesas },
    })
    return {
      receitas: recPago, aReceber: recPend, receitasTotal: recPago + recPend,
      despesas: despPago, aPagar: despPend, despesasTotal: despPago + despPend,
      saldo: recPago - despPago,
      saldoProjetado: (recPago + recPend) - (despPago + despPend),
      adm:   mk(resumoBase.filter(l => l.divisao === 'administracao')),
      obras: mk(resumoBase.filter(l => l.divisao === 'obra')),
    }
  }, [resumoBase])

  // Por projeto (período)
  const rPorProjeto = useMemo(() => {
    const map: Record<string, { id: string; nome: string; receitas: number; despesas: number; saldo: number; aReceber: number; aPagar: number }> = {}
    resumoBase.filter(l => l.divisao === 'obra').forEach(l => {
      const pid = l.projeto_id ?? '__sem__'
      const nome = l.projetos_diario?.nome ?? 'Sem projeto'
      if (!map[pid]) map[pid] = { id: pid, nome, receitas: 0, despesas: 0, saldo: 0, aReceber: 0, aPagar: 0 }
      if (l.tipo === 'receita') {
        if (l.status === 'pago') { map[pid].receitas += Number(l.valor); map[pid].saldo += Number(l.valor) }
        else map[pid].aReceber += Number(l.valor)
      } else {
        if (l.status === 'pago') { map[pid].despesas += Number(l.valor); map[pid].saldo -= Number(l.valor) }
        else map[pid].aPagar += Number(l.valor)
      }
    })
    return Object.values(map).sort((a, b) => (b.receitas + b.despesas) - (a.receitas + a.despesas))
  }, [resumoBase])

  // Dados por mês para o gráfico/tabela (período)
  const rMeses = useMemo(() => {
    const s = (arr: typeof resumoBase) => arr.reduce((acc, l) => acc + Number(l.valor), 0)
    const { inicio, fim } = resumoPeriodDates
    const months: { key: string; label: string }[] = []
    if (!inicio) {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        months.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        })
      }
    } else {
      const start = new Date(inicio + 'T12:00:00')
      const end   = fim ? new Date(fim + 'T12:00:00') : new Date()
      const cur   = new Date(start.getFullYear(), start.getMonth(), 1)
      while (cur <= end && months.length < 24) {
        months.push({
          key: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`,
          label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        })
        cur.setMonth(cur.getMonth() + 1)
      }
    }
    return months.slice(-14).map(m => {
      const ml = resumoBase.filter(l => l.data?.startsWith(m.key))
      const d2 = new Date(m.key + '-15T12:00:00')
      return {
        mes: d2.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), // "janeiro de 2025"
        mesAbrev: d2.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), // "jan"
        ano: m.key.slice(0, 4), // "2025"
        key: m.key,
        receitas:         s(ml.filter(l => l.tipo === 'receita' && l.status === 'pago')),
        despesas:         s(ml.filter(l => l.tipo === 'despesa' && l.status === 'pago')),
        receitasPendente: s(ml.filter(l => l.tipo === 'receita' && l.status === 'pendente')),
        despesasPendente: s(ml.filter(l => l.tipo === 'despesa' && l.status === 'pendente')),
      }
    })
  }, [resumoBase, resumoPeriodDates])

  // Por categoria (período, apenas pagos)
  const rPorCategoria = useMemo(() => {
    const map: Record<string, { nome: string; tipo: 'receita' | 'despesa'; valor: number }> = {}
    resumoBase.filter(l => l.status === 'pago').forEach(l => {
      const nome = l.categorias_financeiras?.nome ?? 'Sem categoria'
      const key  = `${l.tipo}::${nome}`
      if (!map[key]) map[key] = { nome, tipo: l.tipo as 'receita' | 'despesa', valor: 0 }
      map[key].valor += Number(l.valor)
    })
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 12)
  }, [resumoBase])

  // Contas a receber/pagar — Resumo (usa período do resumo)
  const contasAReceber = useMemo(() => {
    const map: Record<string, { nome: string; valor: number; qtd: number }> = {}
    resumoBase.filter(l => l.tipo === 'receita' && l.status === 'pendente').forEach(l => {
      const k = l.categorias_financeiras?.nome ?? 'Sem categoria'
      if (!map[k]) map[k] = { nome: k, valor: 0, qtd: 0 }
      map[k].valor += Number(l.valor); map[k].qtd++
    })
    return Object.values(map).sort((a, b) => b.valor - a.valor)
  }, [resumoBase])

  const contasAPagar = useMemo(() => {
    const map: Record<string, { nome: string; valor: number; qtd: number }> = {}
    resumoBase.filter(l => l.tipo === 'despesa' && l.status === 'pendente').forEach(l => {
      const k = l.categorias_financeiras?.nome ?? 'Sem categoria'
      if (!map[k]) map[k] = { nome: k, valor: 0, qtd: 0 }
      map[k].valor += Number(l.valor); map[k].qtd++
    })
    return Object.values(map).sort((a, b) => b.valor - a.valor)
  }, [resumoBase])

  // Contas a receber/pagar — Abas Adm/Obras (usa os filtros da aba: mês, tipo, status, datas)
  const tabContasAReceber = useMemo(() => {
    const map: Record<string, { nome: string; valor: number; qtd: number }> = {}
    filtered.filter(l => l.tipo === 'receita' && l.status === 'pendente').forEach(l => {
      const k = l.categorias_financeiras?.nome ?? 'Sem categoria'
      if (!map[k]) map[k] = { nome: k, valor: 0, qtd: 0 }
      map[k].valor += Number(l.valor); map[k].qtd++
    })
    return Object.values(map).sort((a, b) => b.valor - a.valor)
  }, [filtered])

  const tabContasAPagar = useMemo(() => {
    const map: Record<string, { nome: string; valor: number; qtd: number }> = {}
    filtered.filter(l => l.tipo === 'despesa' && l.status === 'pendente').forEach(l => {
      const k = l.categorias_financeiras?.nome ?? 'Sem categoria'
      if (!map[k]) map[k] = { nome: k, valor: 0, qtd: 0 }
      map[k].valor += Number(l.valor); map[k].qtd++
    })
    return Object.values(map).sort((a, b) => b.valor - a.valor)
  }, [filtered])

  const tabTotalAReceber = tabContasAReceber.reduce((s, c) => s + c.valor, 0)
  const tabTotalAPagar   = tabContasAPagar.reduce((s, c) => s + c.valor, 0)

  // ── Período dos Relatórios ────────────────────────────────────────────────
  const relPeriodDates = useMemo(() => {
    const h = new Date(), ano = h.getFullYear(), mes = h.getMonth()
    if (periodoRelatorio === 'tudo')    return { inicio: '', fim: '' }
    if (periodoRelatorio === 'custom')  return { inicio: relCustomInicio, fim: relCustomFim }
    if (periodoRelatorio === 'mes')     return { inicio: `${ano}-${String(mes+1).padStart(2,'0')}-01`, fim: new Date(ano, mes+1, 0).toISOString().split('T')[0] }
    if (periodoRelatorio === 'mes-ant') {
      const am = mes===0?11:mes-1, aa = mes===0?ano-1:ano
      return { inicio: `${aa}-${String(am+1).padStart(2,'0')}-01`, fim: new Date(aa, am+1, 0).toISOString().split('T')[0] }
    }
    if (periodoRelatorio === 'trim') {
      const i3 = new Date(ano, mes-2, 1)
      return { inicio: `${i3.getFullYear()}-${String(i3.getMonth()+1).padStart(2,'0')}-01`, fim: new Date(ano, mes+1, 0).toISOString().split('T')[0] }
    }
    return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` }
  }, [periodoRelatorio, relCustomInicio, relCustomFim])

  const relLancamentos = useMemo(() =>
    lancamentos.filter(l => {
      if (l.status === 'cancelado') return false
      if (relPeriodDates.inicio && l.data < relPeriodDates.inicio) return false
      if (relPeriodDates.fim    && l.data > relPeriodDates.fim)    return false
      return true
    }), [lancamentos, relPeriodDates])

  async function handleToggleStatus(l: Lancamento) {
    if (l.status === 'cancelado') return
    const newStatus = l.status === 'pago' ? 'pendente' : 'pago'
    setTogglingId(l.id)
    await updateLancamentoStatus(l.id, newStatus)
    setLancamentos(prev => prev.map(x => x.id === l.id ? { ...x, status: newStatus as typeof newStatus } : x))
    setTogglingId(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    if (deleteMode === 'group' && deleteTarget.recorrencia_grupo_id && deleteTarget.status === 'pendente') {
      await deleteLancamentoEProximos(deleteTarget.id, deleteTarget.recorrencia_grupo_id, deleteTarget.data)
      setLancamentos(prev => prev.filter(l =>
        !(l.recorrencia_grupo_id === deleteTarget.recorrencia_grupo_id &&
          l.status === 'pendente' &&
          l.data >= deleteTarget.data)
      ))
    } else {
      await deleteLancamento(deleteTarget.id)
      setLancamentos(prev => prev.filter(l => l.id !== deleteTarget.id))
    }
    setDeleteTarget(null)
    setDeleteMode('single')
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

  // Edição vinda da busca por palavra-chave: atualiza os dados sem recarregar
  // a página, mantendo o usuário na mesma aba/relatório/termo buscado.
  async function handleSavedBusca() {
    setEditTargetBusca(null)
    setRefreshingBusca(true)
    const fresh = await getLancamentos()
    setLancamentos(fresh as any)
    setRefreshingBusca(false)
  }

  function toggleSelecionado(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelecionarTodos() {
    if (selecionados.size === filtered.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(filtered.map(l => l.id)))
    }
  }

  async function handleBulkStatus(status: 'pago' | 'pendente' | 'cancelado') {
    if (selecionados.size === 0) return
    setBulkLoading(true)
    const ids = Array.from(selecionados)
    await updateLancamentosStatusBulk(ids, status)
    setLancamentos(prev => prev.map(l =>
      selecionados.has(l.id) ? { ...l, status } : l
    ))
    setSelecionados(new Set())
    setBulkLoading(false)
  }

  // Categorias
  function openCreateCat(tipo?: 'receita' | 'despesa', divisao?: 'administracao' | 'obra') {
    setCatNome('')
    setCatTipo(tipo ?? 'despesa')
    setCatDivisao(divisao ?? 'administracao')
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

  async function handleDedup() {
    setDeduping(true); setDedupMsg(null)
    const res = await deduplicarCategorias()
    setDeduping(false)
    if (res.error) { setDedupMsg(`Erro: ${res.error}`); return }
    if (res.removidas === 0) {
      setDedupMsg('Nenhuma duplicata encontrada.')
    } else {
      setDedupMsg(`${res.removidas} duplicata(s) removida(s).`)
      window.location.reload()
    }
  }

  function abrirNovo() {
    const div: 'administracao' | 'obra' =
      activeTab === 'obras' ? 'obra' :
      activeTab === 'administracao' ? 'administracao' : 'administracao'
    setModalDivisao(div)
    setEditTarget(null)
    setShowModal(true)
  }

  const maxBar = Math.max(...dashboard.meses.map(m => Math.max(m.receitas + m.receitasPendente, m.despesas + m.despesasPendente)), 1)

  const pendentesAdm = lancamentos.filter(l => l.status === 'pendente' && l.divisao === 'administracao').length
  const pendentesObra = lancamentos.filter(l => l.status === 'pendente' && l.divisao === 'obra').length

  const tabs = [
    { key: 'resumo'        as const, label: 'Resumo' },
    { key: 'administracao' as const, label: 'Administração', count: pendentesAdm },
    { key: 'obras'         as const, label: 'Obras',         count: pendentesObra },
    { key: 'relatorios'    as const, label: 'Relatórios' },
    { key: 'categorias'    as const, label: 'Categorias' },
  ]

  // ── Cards Contas a Receber / Pagar (usados nas abas Adm e Obras) ──
  function renderContasCards() {
    const totalRec  = tabTotalAReceber
    const totalDesp = tabTotalAPagar
    const totalRecTotal  = filtered.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0)
    const totalDespTotal = filtered.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0)
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* A RECEBER */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-green-50 border-b border-green-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                <ArrowUpRight size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-green-700 font-medium uppercase tracking-wide">A Receber</p>
                <p className="text-xl font-bold text-green-700">{fmt(totalRec)}</p>
              </div>
            </div>
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full font-medium">
              {filtered.filter(l => l.tipo === 'receita' && l.status === 'pendente').length} lançamentos
            </span>
          </div>
          <div className="p-3 space-y-1">
            {tabContasAReceber.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Nenhuma receita pendente</p>
            ) : tabContasAReceber.map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-green-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate font-medium">{c.nome}</p>
                  <p className="text-xs text-gray-400">{c.qtd} lançamento{c.qtd !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-600">{fmt(c.valor)}</p>
                  <p className="text-xs text-gray-400">{totalRec > 0 ? ((c.valor / totalRec) * 100).toFixed(0) : 0}%</p>
                </div>
              </div>
            ))}
            {totalRecTotal > 0 && (
              <div className="pt-2 mt-1 border-t border-green-50 px-2">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Recebido {fmt(totalRecTotal - totalRec)}</span>
                  <span>Total {fmt(totalRecTotal)}</span>
                </div>
                <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full"
                    style={{ width: `${((totalRecTotal - totalRec) / totalRecTotal) * 100}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {(((totalRecTotal - totalRec) / totalRecTotal) * 100).toFixed(0)}% recebido
                </p>
              </div>
            )}
          </div>
        </div>

        {/* A PAGAR */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <ArrowDownRight size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-xs text-red-600 font-medium uppercase tracking-wide">A Pagar</p>
                <p className="text-xl font-bold text-red-600">{fmt(totalDesp)}</p>
              </div>
            </div>
            <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full font-medium">
              {filtered.filter(l => l.tipo === 'despesa' && l.status === 'pendente').length} lançamentos
            </span>
          </div>
          <div className="p-3 space-y-1">
            {tabContasAPagar.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Nenhuma despesa pendente</p>
            ) : tabContasAPagar.map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-red-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate font-medium">{c.nome}</p>
                  <p className="text-xs text-gray-400">{c.qtd} lançamento{c.qtd !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-red-500">{fmt(c.valor)}</p>
                  <p className="text-xs text-gray-400">{totalDesp > 0 ? ((c.valor / totalDesp) * 100).toFixed(0) : 0}%</p>
                </div>
              </div>
            ))}
            {totalDespTotal > 0 && (
              <div className="pt-2 mt-1 border-t border-red-50 px-2">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Pago {fmt(totalDespTotal - totalDesp)}</span>
                  <span>Total {fmt(totalDespTotal)}</span>
                </div>
                <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full"
                    style={{ width: `${((totalDespTotal - totalDesp) / totalDespTotal) * 100}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {(((totalDespTotal - totalDesp) / totalDespTotal) * 100).toFixed(0)}% pago
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Seção de lançamentos reutilizável (renderizada por duas abas) ──
  function aplicarPeriodoTab(key: 'mes' | 'mes-ant' | 'trim' | 'ano' | 'tudo' | 'custom') {
    setPeriodoTab(key)
    setFiltroMes('')
    if (key === 'custom') return  // datas controladas pelos inputs diretamente
    if (key === 'tudo') {
      setFiltroDataInicio('')
      setFiltroDataFim('')
      return
    }
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth() // 0-based
    if (key === 'mes') {
      const ini = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
      const fim = new Date(ano, mes + 1, 0).toISOString().split('T')[0]
      setFiltroDataInicio(ini)
      setFiltroDataFim(fim)
    } else if (key === 'mes-ant') {
      const antMes = mes === 0 ? 11 : mes - 1
      const antAno = mes === 0 ? ano - 1 : ano
      const ini = `${antAno}-${String(antMes + 1).padStart(2, '0')}-01`
      const fim = new Date(antAno, antMes + 1, 0).toISOString().split('T')[0]
      setFiltroDataInicio(ini)
      setFiltroDataFim(fim)
    } else if (key === 'trim') {
      const ini3 = new Date(ano, mes - 2, 1)
      const ini = `${ini3.getFullYear()}-${String(ini3.getMonth() + 1).padStart(2, '0')}-01`
      const fim = new Date(ano, mes + 1, 0).toISOString().split('T')[0]
      setFiltroDataInicio(ini)
      setFiltroDataFim(fim)
    } else if (key === 'ano') {
      setFiltroDataInicio(`${ano}-01-01`)
      setFiltroDataFim(`${ano}-12-31`)
    }
  }

  function renderLancamentosSection(divisaoLabel: string) {
    const periodoTabOpts: { key: 'mes' | 'mes-ant' | 'trim' | 'ano' | 'tudo'; label: string }[] = [
      { key: 'mes', label: 'Este mês' },
      { key: 'mes-ant', label: 'Mês anterior' },
      { key: 'trim', label: 'Trimestre' },
      { key: 'ano', label: 'Este ano' },
      { key: 'tudo', label: 'Tudo' },
    ]
    return (
      <div className="space-y-4">
        {/* KPIs do período */}
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

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap gap-2 items-center">
          {filtered.length > 0 && canEdit && (
            <label className="flex items-center gap-1.5 mr-1 cursor-pointer" title="Selecionar todos">
              <input type="checkbox"
                checked={selecionados.size === filtered.length && filtered.length > 0}
                onChange={toggleSelecionarTodos}
                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer" />
              <span className="text-xs text-gray-400">Todos</span>
            </label>
          )}
          <Filter size={13} className="text-gray-400 shrink-0" />
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
            <option value="">Tipo: todos</option>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
            <option value="">Status: todos</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 shrink-0">De</span>
            <input type="date" value={filtroDataInicio}
              onChange={e => { setFiltroDataInicio(e.target.value); setFiltroMes('') }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 shrink-0">até</span>
            <input type="date" value={filtroDataFim}
              onChange={e => { setFiltroDataFim(e.target.value); setFiltroMes('') }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
          </div>
          {(filtroTipo || filtroStatus || filtroDataInicio || filtroDataFim) && (
            <button onClick={() => { setFiltroTipo(''); setFiltroStatus(''); setFiltroDataInicio(''); setFiltroDataFim('') }}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <X size={11} /> Limpar filtros
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">{filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Barra de ações em massa */}
        {selecionados.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-600 text-white rounded-xl px-4 py-3 shadow-lg flex-wrap">
            <CheckSquare size={16} className="shrink-0" />
            <span className="text-sm font-medium flex-1">
              {selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-blue-200">Alterar status:</span>
            {([
              { s: 'pago'      as const, label: 'Pago',      cls: 'bg-green-500 hover:bg-green-400' },
              { s: 'pendente'  as const, label: 'Pendente',  cls: 'bg-amber-500 hover:bg-amber-400' },
              { s: 'cancelado' as const, label: 'Cancelado', cls: 'bg-gray-500 hover:bg-gray-400'   },
            ]).map(({ s, label, cls }) => (
              <button key={s} onClick={() => handleBulkStatus(s)} disabled={bulkLoading}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50 ${cls}`}>
                {bulkLoading ? '...' : label}
              </button>
            ))}
            <button onClick={() => setSelecionados(new Set())}
              className="p-1.5 rounded-lg hover:bg-blue-500 transition-colors" title="Limpar seleção">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Lista agrupada por data */}
        <div className="space-y-3">
          {filtered.length === 0 && lancamentos.length === 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm py-8 px-6 text-center">
              <p className="text-amber-800 text-sm font-semibold mb-1">Nenhum lançamento encontrado no banco de dados</p>
              <p className="text-amber-700 text-xs mb-4">
                Execute a migração <strong>004_diario_financeiro_compras_equipe.sql</strong> no SQL Editor do Supabase.
              </p>
              {canEdit && (
                <button onClick={abrirNovo} className="mt-1 text-sm text-blue-600 hover:underline">
                  Criar um lançamento
                </button>
              )}
            </div>
          )}
          {filtered.length === 0 && lancamentos.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center">
              <p className="text-gray-400 text-sm">Nenhum lançamento neste período</p>
              {canEdit && (
                <button onClick={abrirNovo} className="mt-3 text-sm text-blue-600 hover:underline">
                  Criar novo lançamento
                </button>
              )}
            </div>
          )}
          {agrupado.map(([data, itens]) => (
            <div key={data} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
              <div className="divide-y divide-gray-50">
                {itens.map(l => (
                  <div key={l.id} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${l.status === 'cancelado' ? 'opacity-40' : ''} ${selecionados.has(l.id) ? 'bg-blue-50' : ''}`}>
                    {canEdit && (
                      <input type="checkbox"
                        checked={selecionados.has(l.id)}
                        onChange={() => toggleSelecionado(l.id)}
                        className="w-3.5 h-3.5 accent-blue-600 shrink-0 cursor-pointer" />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${l.tipo === 'receita' ? 'bg-green-50' : 'bg-red-50'}`}>
                      {l.tipo === 'receita'
                        ? <ArrowUpRight size={14} className="text-green-600" />
                        : <ArrowDownRight size={14} className="text-red-500" />}
                    </div>
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
                        {l.profissionais && (
                          <span className="text-xs text-purple-500 font-medium">👤 {l.profissionais.nome}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-bold ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                        {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
                      </p>
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
                        <button onClick={() => { setDeleteTarget(l); setDeleteMode('single') }}
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
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-0.5">Controle de receitas, despesas e resultado por obra</p>
        </div>
        {canEdit && (activeTab === 'administracao' || activeTab === 'obras') && (
          <button
            onClick={abrirNovo}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition-colors shadow-sm ${
              activeTab === 'obras'
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Plus size={15} />
            {activeTab === 'obras' ? 'Novo lançamento de obra' : 'Novo lançamento adm.'}
          </button>
        )}
        {canEdit && activeTab === 'resumo' && (
          <button
            onClick={() => { setModalDivisao('administracao'); setEditTarget(null); setShowModal(true) }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={15} /> Novo lançamento
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelecionados(new Set()); setPeriodoTab('tudo'); setFiltroMes(''); setFiltroDataInicio(''); setFiltroDataFim('') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
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
      {activeTab === 'resumo' && (() => {
        const PERIODOS = [
          { key: 'mes'     as const, label: 'Este mês'    },
          { key: 'mes-ant' as const, label: 'Mês anterior' },
          { key: 'trim'    as const, label: 'Trimestre'   },
          { key: 'ano'     as const, label: 'Este ano'    },
          { key: 'tudo'    as const, label: 'Tudo'        },
          { key: 'custom'  as const, label: 'Personalizado' },
        ]
        const maxBarR = Math.max(...rMeses.map(m => Math.max(m.receitas + m.receitasPendente, m.despesas + m.despesasPendente)), 1)
        const maxCat  = Math.max(...rPorCategoria.map(c => c.valor), 1)

        return (
          <div className="space-y-4">

            {/* ── Filtro de período ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-gray-500 shrink-0">Período:</span>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
                {PERIODOS.map(p => (
                  <button key={p.key} onClick={() => setPeriodoResumo(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      periodoResumo === p.key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
              {periodoResumo === 'custom' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" value={resumoInicio} onChange={e => setResumoInicio(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                  <span className="text-xs text-gray-400">até</span>
                  <input type="date" value={resumoFim} onChange={e => setResumoFim(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                </div>
              )}
              {resumoPeriodDates.inicio && (
                <span className="ml-auto text-xs text-gray-400">
                  {new Date(resumoPeriodDates.inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
                  {resumoPeriodDates.fim ? ` → ${new Date(resumoPeriodDates.fim + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                  {' '}· {resumoBase.length} lançamento{resumoBase.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">Receitas</span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-green-600 bg-green-50"><TrendingUp size={18}/></div>
                </div>
                <p className="text-xl font-bold text-green-600">{fmt(rKPIs.receitasTotal)}</p>
                <div className="mt-2 space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Recebido</span>
                    <span className="font-medium text-green-600">{fmt(rKPIs.receitas)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">A receber</span>
                    <span className="font-medium text-amber-500">{fmt(rKPIs.aReceber)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">Despesas</span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-red-500 bg-red-50"><TrendingDown size={18}/></div>
                </div>
                <p className="text-xl font-bold text-red-500">{fmt(rKPIs.despesasTotal)}</p>
                <div className="mt-2 space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Pago</span>
                    <span className="font-medium text-red-500">{fmt(rKPIs.despesas)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">A pagar</span>
                    <span className="font-medium text-amber-500">{fmt(rKPIs.aPagar)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">Saldo real</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${rKPIs.saldo >= 0 ? 'text-blue-600 bg-blue-50' : 'text-red-500 bg-red-50'}`}><Wallet size={18}/></div>
                </div>
                <p className={`text-xl font-bold ${rKPIs.saldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(rKPIs.saldo)}</p>
                <p className="text-xs text-gray-400 mt-2">Recebido − Pago</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">Saldo projetado</span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-amber-600 bg-amber-50"><Clock size={18}/></div>
                </div>
                <p className={`text-xl font-bold ${rKPIs.saldoProjetado >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(rKPIs.saldoProjetado)}</p>
                <p className="text-xs text-gray-400 mt-2">Incluindo pendentes</p>
              </div>
            </div>

            {/* Conciliação Bancária */}
            {saldoConciliacao && (
              <ConciliacaoBancariaCard
                config={saldoConciliacao}
                conciliacoes={conciliacoesMensais ?? []}
                lancamentos={lancamentos as any}
                canEdit={canEdit}
              />
            )}

            {/* Adm + Obras */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Administração Central', sub: 'Escritório, equipe, operacional', data: rKPIs.adm, icon: <Building2 size={18} className="text-blue-600" />, bg: 'bg-blue-50', tabKey: 'administracao' as const },
                { label: 'Obras em Andamento',    sub: 'Custos e receitas por projeto',   data: rKPIs.obras, icon: <HardHat size={18} className="text-orange-600" />, bg: 'bg-orange-50', tabKey: 'obras' as const },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>{card.icon}</div>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-800">{card.label}</h2>
                      <p className="text-xs text-gray-400">{card.sub}</p>
                    </div>
                  </div>
                  <div className="space-y-0">
                    <div className="py-1.5 border-b border-gray-50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Receitas</span>
                        <span className="text-sm font-semibold text-green-600">{fmt(card.data.receitas + card.data.receitasPendente)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className="text-xs text-gray-400 pl-2">↳ Recebido</span>
                        <span className="text-xs text-green-500">{fmt(card.data.receitas)}</span>
                      </div>
                      {card.data.receitasPendente > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400 pl-2">↳ A receber</span>
                          <span className="text-xs text-amber-500">{fmt(card.data.receitasPendente)}</span>
                        </div>
                      )}
                    </div>
                    <div className="py-1.5 border-b border-gray-50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Despesas</span>
                        <span className="text-sm font-semibold text-red-500">{fmt(card.data.despesas + card.data.despesasPendente)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className="text-xs text-gray-400 pl-2">↳ Pago</span>
                        <span className="text-xs text-red-400">{fmt(card.data.despesas)}</span>
                      </div>
                      {card.data.despesasPendente > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400 pl-2">↳ A pagar</span>
                          <span className="text-xs text-amber-500">{fmt(card.data.despesasPendente)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-medium text-gray-700">Saldo real</span>
                      <span className={`text-base font-bold ${card.data.saldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(card.data.saldo)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setActiveTab(card.tabKey); setFiltroMes(''); setSelecionados(new Set()); setPeriodoTab('tudo'); setFiltroDataInicio(''); setFiltroDataFim('') }}
                    className="mt-3 block w-full text-xs text-blue-600 hover:underline text-center"
                  >
                    Ver lançamentos →
                  </button>
                </div>
              ))}
            </div>

            {/* Por projeto */}
            {rPorProjeto.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700">Resultado por obra</h2>
                  <button onClick={() => { setActiveTab('obras'); setPeriodoTab('tudo'); setFiltroMes(''); setFiltroDataInicio(''); setFiltroDataFim('') }} className="text-xs text-blue-500 hover:underline">Ver aba Obras →</button>
                </div>
                <div className="space-y-2">
                  {rPorProjeto.map(p => (
                    <Link key={p.id} href={p.id !== '__sem__' ? `/financeiro/obras/${p.id}` : '#'}
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
                        <div>
                          <p className="text-xs text-gray-400">Receitas</p>
                          <p className="text-sm font-semibold text-green-600">{fmt(p.receitas)}</p>
                          {p.aReceber > 0 && <p className="text-xs text-amber-500">+{fmt(p.aReceber)} prev.</p>}
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Despesas</p>
                          <p className="text-sm font-semibold text-red-500">{fmt(p.despesas)}</p>
                          {p.aPagar > 0 && <p className="text-xs text-amber-500">+{fmt(p.aPagar)} prev.</p>}
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Resultado</p>
                          <p className={`text-sm font-bold ${p.saldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(p.saldo)}</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Contas a Receber / a Pagar ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CONTAS A RECEBER */}
              <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-green-50 border-b border-green-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                      <ArrowUpRight size={18} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-green-700 font-medium uppercase tracking-wide">A Receber</p>
                      <p className="text-xl font-bold text-green-700">{fmt(rKPIs.aReceber)}</p>
                    </div>
                  </div>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full font-medium">
                    {resumoBase.filter(l => l.tipo === 'receita' && l.status === 'pendente').length} lançamentos
                  </span>
                </div>
                <div className="p-3 space-y-1">
                  {contasAReceber.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Nenhuma receita pendente no período</p>
                  ) : contasAReceber.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-green-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate font-medium">{c.nome}</p>
                        <p className="text-xs text-gray-400">{c.qtd} lançamento{c.qtd !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-green-600">{fmt(c.valor)}</p>
                        <p className="text-xs text-gray-400">
                          {rKPIs.aReceber > 0 ? ((c.valor / rKPIs.aReceber) * 100).toFixed(0) : 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                  {rKPIs.receitasTotal > 0 && (
                    <div className="pt-2 mt-1 border-t border-green-50 px-2">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Recebido {fmt(rKPIs.receitas)}</span>
                        <span>Total {fmt(rKPIs.receitasTotal)}</span>
                      </div>
                      <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(rKPIs.receitas / rKPIs.receitasTotal) * 100}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {((rKPIs.receitas / rKPIs.receitasTotal) * 100).toFixed(0)}% recebido
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* CONTAS A PAGAR */}
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-red-50 border-b border-red-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                      <ArrowDownRight size={18} className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-xs text-red-600 font-medium uppercase tracking-wide">A Pagar</p>
                      <p className="text-xl font-bold text-red-600">{fmt(rKPIs.aPagar)}</p>
                    </div>
                  </div>
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full font-medium">
                    {resumoBase.filter(l => l.tipo === 'despesa' && l.status === 'pendente').length} lançamentos
                  </span>
                </div>
                <div className="p-3 space-y-1">
                  {contasAPagar.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Nenhuma despesa pendente no período</p>
                  ) : contasAPagar.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-red-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate font-medium">{c.nome}</p>
                        <p className="text-xs text-gray-400">{c.qtd} lançamento{c.qtd !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-red-500">{fmt(c.valor)}</p>
                        <p className="text-xs text-gray-400">
                          {rKPIs.aPagar > 0 ? ((c.valor / rKPIs.aPagar) * 100).toFixed(0) : 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                  {rKPIs.despesasTotal > 0 && (
                    <div className="pt-2 mt-1 border-t border-red-50 px-2">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Pago {fmt(rKPIs.despesas)}</span>
                        <span>Total {fmt(rKPIs.despesasTotal)}</span>
                      </div>
                      <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full"
                          style={{ width: `${(rKPIs.despesas / rKPIs.despesasTotal) * 100}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {((rKPIs.despesas / rKPIs.despesasTotal) * 100).toFixed(0)}% pago
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gráfico / Tabela / Categorias */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {/* Header com toggle de visualização */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  {vizResumo === 'barras'     && 'Receitas vs Despesas por mês'}
                  {vizResumo === 'tabela'     && 'Extrato mensal'}
                  {vizResumo === 'categorias' && 'Breakdown por categoria (pagos)'}
                </h2>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                  {([
                    { key: 'barras'     as const, label: '📊 Barras'     },
                    { key: 'tabela'     as const, label: '📋 Tabela'     },
                    { key: 'categorias' as const, label: '🏷️ Categorias' },
                  ]).map(v => (
                    <button key={v.key} onClick={() => setVizResumo(v.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        vizResumo === v.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Barras ── */}
              {vizResumo === 'barras' && (
                <>
                  {rMeses.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Nenhum dado no período</p>
                  ) : (
                    <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ minHeight: '160px' }}>
                      {rMeses.map(m => (
                        <div key={m.key} className="flex-1 min-w-[40px] flex flex-col items-center gap-1">
                          <div className="w-full flex gap-0.5 items-end" style={{ height: '120px' }}>
                            {/* Receitas */}
                            <div className="flex-1 flex flex-col justify-end rounded-t overflow-hidden"
                              style={{ height: `${((m.receitas + m.receitasPendente) / maxBarR) * 100}%`, minHeight: (m.receitas + m.receitasPendente) > 0 ? '3px' : '0' }}>
                              <div className="w-full bg-green-200"
                                style={{ height: `${(m.receitas + m.receitasPendente) > 0 ? (m.receitasPendente / (m.receitas + m.receitasPendente)) * 100 : 0}%` }}
                                title={`A receber: ${fmt(m.receitasPendente)}`} />
                              <div className="w-full bg-green-500 flex-1" title={`Recebido: ${fmt(m.receitas)}`} />
                            </div>
                            {/* Despesas */}
                            <div className="flex-1 flex flex-col justify-end rounded-t overflow-hidden"
                              style={{ height: `${((m.despesas + m.despesasPendente) / maxBarR) * 100}%`, minHeight: (m.despesas + m.despesasPendente) > 0 ? '3px' : '0' }}>
                              <div className="w-full bg-red-200"
                                style={{ height: `${(m.despesas + m.despesasPendente) > 0 ? (m.despesasPendente / (m.despesas + m.despesasPendente)) * 100 : 0}%` }}
                                title={`A pagar: ${fmt(m.despesasPendente)}`} />
                              <div className="w-full bg-red-400 flex-1" title={`Pago: ${fmt(m.despesas)}`} />
                            </div>
                          </div>
                          {/* Saldo abaixo da barra */}
                          {(() => {
                            const s = m.receitas - m.despesas
                            return <span className={`text-[9px] font-semibold ${s > 0 ? 'text-blue-600' : s < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                              {s > 0 ? '+' : ''}{s === 0 ? '—' : fmt(s).replace('R$ ', '')}
                            </span>
                          })()}
                          <div className="flex flex-col items-center leading-snug mt-1">
                            <span className="text-xs font-semibold text-gray-600 capitalize">{m.mesAbrev}</span>
                            <span className="text-xs text-gray-400">{m.ano}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-3 rounded-sm bg-green-500" /> Receitas pagas</div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-3 rounded-sm bg-green-200" /> A receber</div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-3 rounded-sm bg-red-400" /> Despesas pagas</div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-3 rounded-sm bg-red-200" /> A pagar</div>
                  </div>
                </>
              )}

              {/* ── Tabela ── */}
              {vizResumo === 'tabela' && (
                <>
                  {rMeses.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Nenhum dado no período</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-green-600">Receitas</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-green-400">A receber</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-red-500">Despesas</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-red-300">A pagar</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Saldo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {rMeses.map(m => {
                            const saldo = m.receitas - m.despesas
                            const hasData = m.receitas > 0 || m.despesas > 0 || m.receitasPendente > 0 || m.despesasPendente > 0
                            return (
                              <tr key={m.key} className={`hover:bg-gray-50 transition-colors ${!hasData ? 'opacity-40' : ''}`}>
                                <td className="py-2.5 px-3 font-medium text-gray-700 whitespace-nowrap capitalize">{m.mes}</td>
                                <td className="py-2.5 px-3 text-right text-green-600 font-medium">{m.receitas > 0 ? fmt(m.receitas) : '—'}</td>
                                <td className="py-2.5 px-3 text-right text-amber-500 text-xs">{m.receitasPendente > 0 ? fmt(m.receitasPendente) : '—'}</td>
                                <td className="py-2.5 px-3 text-right text-red-500 font-medium">{m.despesas > 0 ? fmt(m.despesas) : '—'}</td>
                                <td className="py-2.5 px-3 text-right text-amber-500 text-xs">{m.despesasPendente > 0 ? fmt(m.despesasPendente) : '—'}</td>
                                <td className={`py-2.5 px-3 text-right font-bold ${saldo > 0 ? 'text-blue-700' : saldo < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                  {hasData ? (saldo > 0 ? '+' : '') + fmt(saldo) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-200 bg-gray-50">
                            <td className="py-2.5 px-3 text-xs font-bold text-gray-600">Total</td>
                            <td className="py-2.5 px-3 text-right text-green-600 font-bold text-xs">{fmt(rKPIs.receitas)}</td>
                            <td className="py-2.5 px-3 text-right text-amber-500 text-xs font-bold">{fmt(rKPIs.aReceber)}</td>
                            <td className="py-2.5 px-3 text-right text-red-500 font-bold text-xs">{fmt(rKPIs.despesas)}</td>
                            <td className="py-2.5 px-3 text-right text-amber-500 text-xs font-bold">{fmt(rKPIs.aPagar)}</td>
                            <td className={`py-2.5 px-3 text-right font-bold text-xs ${rKPIs.saldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                              {rKPIs.saldo >= 0 ? '+' : ''}{fmt(rKPIs.saldo)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ── Categorias ── */}
              {vizResumo === 'categorias' && (
                <>
                  {rPorCategoria.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Nenhum lançamento pago no período</p>
                  ) : (
                    <div className="space-y-2">
                      {/* Subtotal receitas vs despesas */}
                      <div className="flex gap-3 mb-4 flex-wrap">
                        <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                          <span className="text-xs text-green-700 font-medium">Receitas: {fmt(rKPIs.receitas)}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                          <span className="text-xs text-red-600 font-medium">Despesas: {fmt(rKPIs.despesas)}</span>
                        </div>
                      </div>
                      {rPorCategoria.map((cat, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${cat.tipo === 'receita' ? 'bg-green-500' : 'bg-red-400'}`} />
                          <span className="text-xs text-gray-600 w-36 truncate shrink-0" title={cat.nome}>{cat.nome}</span>
                          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${cat.tipo === 'receita' ? 'bg-green-400' : 'bg-red-400'}`}
                              style={{ width: `${(cat.valor / maxCat) * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold shrink-0 w-28 text-right ${cat.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                            {fmt(cat.valor)}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0 w-10 text-right">
                            {((cat.valor / (cat.tipo === 'receita' ? rKPIs.receitas : rKPIs.despesas || 1)) * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* ══ ABA ADMINISTRAÇÃO ══ */}
      {activeTab === 'administracao' && (
        <div className="space-y-4">
          {/* ── Filtro de período ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-gray-500 shrink-0">Período:</span>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
              {([
                { key: 'mes'     as const, label: 'Este mês'      },
                { key: 'mes-ant' as const, label: 'Mês anterior'  },
                { key: 'trim'    as const, label: 'Trimestre'     },
                { key: 'ano'     as const, label: 'Este ano'      },
                { key: 'tudo'    as const, label: 'Tudo'          },
                { key: 'custom'  as const, label: 'Personalizado' },
              ]).map(p => (
                <button key={p.key} onClick={() => aplicarPeriodoTab(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    periodoTab === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            {periodoTab === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                <span className="text-xs text-gray-400">até</span>
                <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
              </div>
            )}
          </div>

          {/* KPIs específicos de Adm */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Receitas</span>
                <Building2 size={15} className="text-blue-400" />
              </div>
              <p className="text-lg font-bold text-green-600">{fmt(totalReceitas)}</p>
              {tabReceitasPendentes > 0 && (
                <p className="text-xs text-amber-500 mt-0.5">{fmt(tabReceitasPendentes)} a receber</p>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Despesas pagas</span>
                <Building2 size={15} className="text-blue-400" />
              </div>
              <p className="text-lg font-bold text-red-500">{fmt(totalDespesas)}</p>
              {tabDespesasPendentes > 0 && (
                <p className="text-xs text-amber-500 mt-0.5">{fmt(tabDespesasPendentes)} a pagar</p>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Saldo real</span>
                <Wallet size={15} className="text-blue-400" />
              </div>
              <p className={`text-lg font-bold ${tabSaldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(tabSaldo)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Recebido − Pago</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Pendentes</span>
                <Clock size={15} className="text-amber-400" />
              </div>
              <p className="text-lg font-bold text-amber-600">{tabPendentesCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">lançamentos</p>
            </div>
          </div>

          {renderContasCards()}

          {renderLancamentosSection('administracao')}
        </div>
      )}

      {/* ══ ABA OBRAS ══ */}
      {activeTab === 'obras' && (
        <div className="space-y-4">
          {/* ── Filtro de período ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-gray-500 shrink-0">Período:</span>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
              {([
                { key: 'mes'     as const, label: 'Este mês'     },
                { key: 'mes-ant' as const, label: 'Mês anterior' },
                { key: 'trim'    as const, label: 'Trimestre'    },
                { key: 'ano'     as const, label: 'Este ano'     },
                { key: 'tudo'    as const, label: 'Tudo'          },
                { key: 'custom'  as const, label: 'Personalizado' },
              ]).map(p => (
                <button key={p.key} onClick={() => aplicarPeriodoTab(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    periodoTab === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            {periodoTab === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                <span className="text-xs text-gray-400">até</span>
                <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
              </div>
            )}
          </div>

          {/* KPIs específicos de Obras */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Receitas</span>
                <HardHat size={15} className="text-orange-400" />
              </div>
              <p className="text-lg font-bold text-green-600">{fmt(totalReceitas)}</p>
              {tabReceitasPendentes > 0 && (
                <p className="text-xs text-amber-500 mt-0.5">{fmt(tabReceitasPendentes)} a receber</p>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Despesas pagas</span>
                <HardHat size={15} className="text-orange-400" />
              </div>
              <p className="text-lg font-bold text-red-500">{fmt(totalDespesas)}</p>
              {tabDespesasPendentes > 0 && (
                <p className="text-xs text-amber-500 mt-0.5">{fmt(tabDespesasPendentes)} a pagar</p>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Saldo real</span>
                <Wallet size={15} className="text-orange-400" />
              </div>
              <p className={`text-lg font-bold ${tabSaldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(tabSaldo)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Recebido − Pago</p>
            </div>
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Pendentes</span>
                <Clock size={15} className="text-amber-400" />
              </div>
              <p className="text-lg font-bold text-amber-600">{tabPendentesCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">lançamentos</p>
            </div>
          </div>

          {/* Resultado por projeto (filtrado pelo período selecionado) */}
          {porProjetoFiltrado.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <HardHat size={15} className="text-orange-500" />
                  Resultado por projeto
                </h2>
              </div>
              <div className="space-y-2">
                {porProjetoFiltrado.map(p => {
                  const href = p.id && p.id !== '__sem__' ? `/financeiro/obras/${p.id}` : null
                  const inner = (
                    <>
                      <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                        <HardHat size={13} className="text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.nome}</p>
                        {(p.aReceber > 0 || p.aPagar > 0) && (
                          <p className="text-xs text-amber-500">
                            {p.aReceber > 0 && `+${fmt(p.aReceber)} a receber`}
                            {p.aReceber > 0 && p.aPagar > 0 && ' · '}
                            {p.aPagar > 0 && `${fmt(p.aPagar)} a pagar`}
                          </p>
                        )}
                      </div>
                      <div className="hidden sm:flex gap-4 text-right shrink-0 text-xs">
                        <div><p className="text-gray-400">Receitas</p><p className="font-semibold text-green-600">{fmt(p.receitas)}</p></div>
                        <div><p className="text-gray-400">Despesas</p><p className="font-semibold text-red-500">{fmt(p.despesas)}</p></div>
                        <div><p className="text-gray-400">Saldo</p><p className={`font-bold ${p.saldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(p.saldo)}</p></div>
                      </div>
                      <div className="sm:hidden text-right shrink-0">
                        <p className={`text-sm font-bold ${p.saldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(p.saldo)}</p>
                      </div>
                      {href && <ChevronRight size={14} className="text-gray-300 shrink-0" />}
                    </>
                  )
                  return href ? (
                    <Link key={p.id} href={href}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-transparent hover:bg-orange-50 hover:border-orange-100 transition-colors">
                      {inner}
                    </Link>
                  ) : (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-transparent">
                      {inner}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {renderContasCards()}

          {renderLancamentosSection('obra')}
        </div>
      )}

      {/* ══ ABA RELATÓRIOS ══ */}
      {activeTab === 'relatorios' && (() => {
        const hoje       = new Date().toISOString().split('T')[0]
        const anoAtual   = new Date().getFullYear().toString()
        const mesAtual   = new Date().getMonth()        // 0-based
        const anosDisp   = Array.from(new Set(lancamentos.map(l => l.data.slice(0, 4)))).sort()
        const anoSel     = anosDisp.includes(anoRelatorio) ? anoRelatorio : (anosDisp.includes(anoAtual) ? anoAtual : (anosDisp[anosDisp.length - 1] ?? anoAtual))
        // ── helpers ─────────────────────────────────────────────────────────
        function mesLabel(ano: string, i: number) {
          return new Date(`${ano}-${String(i+1).padStart(2,'0')}-15`).toLocaleDateString('pt-BR', { month: 'long' })
        }
        function semanaFim() { const d=new Date(); d.setDate(d.getDate()+7); return d.toISOString().split('T')[0] }
        function mesFim()    { const d=new Date(); return new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0] }

        // ── Dados — todos usam relLancamentos (filtrado por período) ─────────

        // 0. DRE
        const dreRecObras  = relLancamentos.filter(l => l.tipo==='receita' && l.divisao==='obra'           && l.status==='pago')
        const dreRecAdm    = relLancamentos.filter(l => l.tipo==='receita' && l.divisao==='administracao'  && l.status==='pago')
        const dreCustoObra = relLancamentos.filter(l => l.tipo==='despesa' && l.divisao==='obra'           && l.status==='pago')
        const dreDespAdm   = relLancamentos.filter(l => l.tipo==='despesa' && l.divisao==='administracao'  && l.status==='pago')
        const dreRecObrasP = relLancamentos.filter(l => l.tipo==='receita' && l.divisao==='obra'           && l.status==='pendente')
        const dreRecAdmP   = relLancamentos.filter(l => l.tipo==='receita' && l.divisao==='administracao'  && l.status==='pendente')
        const dreCustoObraP= relLancamentos.filter(l => l.tipo==='despesa' && l.divisao==='obra'           && l.status==='pendente')
        const dreDespAdmP  = relLancamentos.filter(l => l.tipo==='despesa' && l.divisao==='administracao'  && l.status==='pendente')

        function somaVal(arr: Lancamento[]) { return arr.reduce((s,l)=>s+Number(l.valor),0) }
        function porCat(arr: Lancamento[]) {
          const m: Record<string,number> = {}
          arr.forEach(l => { const n=l.categorias_financeiras?.nome??'Sem categoria'; m[n]=(m[n]??0)+Number(l.valor) })
          return Object.entries(m).sort((a,b)=>b[1]-a[1])
        }

        const dreROval=somaVal(dreRecObras), dreRAval=somaVal(dreRecAdm)
        const dreCOval=somaVal(dreCustoObra), dreDAval=somaVal(dreDespAdm)
        const dreRecTotal=dreROval+dreRAval, dreDespTotal=dreCOval+dreDAval
        const dreLucroBruto=dreROval-dreCOval, dreResultado=dreRecTotal-dreDespTotal
        const dreMargemBruta  = dreRecTotal>0 ? (dreLucroBruto/dreRecTotal)*100 : 0
        const dreMargemLiq    = dreRecTotal>0 ? (dreResultado/dreRecTotal)*100   : 0
        const dreAPagar=somaVal(dreCustoObraP)+somaVal(dreDespAdmP)
        const dreAReceber=somaVal(dreRecObrasP)+somaVal(dreRecAdmP)
        const dreResultadoProj=dreResultado+dreAReceber-dreAPagar

        // 1. RESUMO ANUAL (usa lancamentos completo para tabela por mês do ano selecionado)
        function tabelaMensal(ano: string, div: 'administracao'|'obra'|null) {
          const meses = Array.from({length:12},(_,i)=>{
            const key=`${ano}-${String(i+1).padStart(2,'0')}`
            const src=lancamentos.filter(l=>l.data.startsWith(key)&&l.status!=='cancelado'&&(div?l.divisao===div:true))
            const rec =src.filter(l=>l.tipo==='receita'&&l.status==='pago').reduce((s,l)=>s+Number(l.valor),0)
            const desp=src.filter(l=>l.tipo==='despesa'&&l.status==='pago').reduce((s,l)=>s+Number(l.valor),0)
            const recP=src.filter(l=>l.tipo==='receita'&&l.status==='pendente').reduce((s,l)=>s+Number(l.valor),0)
            const depP=src.filter(l=>l.tipo==='despesa'&&l.status==='pendente').reduce((s,l)=>s+Number(l.valor),0)
            return {key,label:mesLabel(ano,i),rec,desp,recP,depP,saldo:rec-desp}
          })
          const tR=meses.reduce((s,m)=>s+m.rec,0), tD=meses.reduce((s,m)=>s+m.desp,0)
          const tRP=meses.reduce((s,m)=>s+m.recP,0), tDP=meses.reduce((s,m)=>s+m.depP,0)
          return {meses,totRec:tR,totDesp:tD,totRecP:tRP,totDepP:tDP,totSaldo:tR-tD}
        }

        // 2. CONTAS A VENCER (sempre todos os pendentes, sem filtro de período)
        const pendentes=lancamentos.filter(l=>l.status==='pendente').sort((a,b)=>a.data.localeCompare(b.data))
        const sf=semanaFim(), mf=mesFim()
        const gruposVencer=[
          {label:'Vencidos',   cor:'red',    items:pendentes.filter(l=>l.data<hoje)},
          {label:'Hoje',       cor:'amber',  items:pendentes.filter(l=>l.data===hoje)},
          {label:'Esta semana',cor:'blue',   items:pendentes.filter(l=>l.data>hoje&&l.data<=sf)},
          {label:'Este mês',   cor:'indigo', items:pendentes.filter(l=>l.data>sf&&l.data<=mf)},
          {label:'Futuro',     cor:'gray',   items:pendentes.filter(l=>l.data>mf)},
        ].filter(g=>g.items.length>0)

        // 3. FLUXO DE CAIXA (usa lancamentos por mês do ano selecionado)
        let saldoAcum=0
        const fluxoMeses=Array.from({length:12},(_,i)=>{
          const key=`${anoSel}-${String(i+1).padStart(2,'0')}`
          const src=lancamentos.filter(l=>l.data.startsWith(key)&&l.status!=='cancelado')
          const entradas=src.filter(l=>l.tipo==='receita'&&l.status==='pago').reduce((s,l)=>s+Number(l.valor),0)
          const saidas  =src.filter(l=>l.tipo==='despesa'&&l.status==='pago').reduce((s,l)=>s+Number(l.valor),0)
          const entPrev =src.filter(l=>l.tipo==='receita'&&l.status==='pendente').reduce((s,l)=>s+Number(l.valor),0)
          const saiPrev =src.filter(l=>l.tipo==='despesa'&&l.status==='pendente').reduce((s,l)=>s+Number(l.valor),0)
          saldoAcum+=entradas-saidas
          return {key,label:mesLabel(anoSel,i),entradas,saidas,entPrev,saiPrev,saldoMes:entradas-saidas,saldoAcum,saldoProj:saldoAcum+entPrev-saiPrev}
        })

        // 4. POR CATEGORIA (usa relLancamentos)
        const catMap: Record<string,{nome:string;receitas:number;despesas:number}>={}
        relLancamentos.filter(l=>l.status==='pago').forEach(l=>{
          const n=l.categorias_financeiras?.nome??'Sem categoria'
          if(!catMap[n]) catMap[n]={nome:n,receitas:0,despesas:0}
          if(l.tipo==='receita') catMap[n].receitas+=Number(l.valor)
          else catMap[n].despesas+=Number(l.valor)
        })
        const cats=Object.values(catMap)
        const catReceitas=cats.filter(c=>c.receitas>0).sort((a,b)=>b.receitas-a.receitas)
        const catDespesas=cats.filter(c=>c.despesas>0).sort((a,b)=>b.despesas-a.despesas)
        const maxRec=catReceitas[0]?.receitas??1, maxDesp=catDespesas[0]?.despesas??1
        const totCatRec=catReceitas.reduce((s,c)=>s+c.receitas,0)
        const totCatDesp=catDespesas.reduce((s,c)=>s+c.despesas,0)

        // 5. COMPARATIVO (usa lancamentos bruto — fixed a meses calendario)
        function dadosMes(ano:number,mes:number){
          const key=`${ano}-${String(mes+1).padStart(2,'0')}`
          const src=lancamentos.filter(l=>l.data.startsWith(key)&&l.status!=='cancelado')
          return {rec:src.filter(l=>l.tipo==='receita'&&l.status==='pago').reduce((s,l)=>s+Number(l.valor),0),
                  desp:src.filter(l=>l.tipo==='despesa'&&l.status==='pago').reduce((s,l)=>s+Number(l.valor),0)}
        }
        const anoN=parseInt(anoAtual)
        const compAtual =dadosMes(anoN,mesAtual)
        const compAntMes=mesAtual===0?dadosMes(anoN-1,11):dadosMes(anoN,mesAtual-1)
        const compAnoAnt=dadosMes(anoN-1,mesAtual)
        const compLabels=[
          {label:`${mesLabel(anoAtual,mesAtual)} ${anoAtual}`,data:compAtual,cor:'blue'},
          {label:mesAtual===0?`Dezembro ${anoN-1}`:`${mesLabel(anoAtual,mesAtual-1)} ${anoAtual}`,data:compAntMes,cor:'gray'},
          {label:`${mesLabel(String(anoN-1),mesAtual)} ${anoN-1}`,data:compAnoAnt,cor:'purple'},
        ]

        // 6. MARGEM POR OBRA (usa relLancamentos)
        const obraMap: Record<string,{nome:string;rec:number;desp:number;recP:number;depP:number}>={}
        relLancamentos.filter(l=>l.divisao==='obra').forEach(l=>{
          const id=l.projeto_id??'__sem_projeto__'
          const nome=l.projetos_diario?.nome??'Sem obra vinculada'
          if(!obraMap[id]) obraMap[id]={nome,rec:0,desp:0,recP:0,depP:0}
          if(l.tipo==='receita'&&l.status==='pago')     obraMap[id].rec +=Number(l.valor)
          if(l.tipo==='despesa'&&l.status==='pago')     obraMap[id].desp+=Number(l.valor)
          if(l.tipo==='receita'&&l.status==='pendente') obraMap[id].recP+=Number(l.valor)
          if(l.tipo==='despesa'&&l.status==='pendente') obraMap[id].depP+=Number(l.valor)
        })
        const obrasMargens=Object.values(obraMap)
          .map(o=>({...o,margem:o.rec-o.desp,margemPct:o.rec>0?((o.rec-o.desp)/o.rec)*100:0}))
          .sort((a,b)=>b.margem-a.margem)

        // 7. BUSCA POR PALAVRA-CHAVE OU VALOR (usa relLancamentos — respeita o período selecionado)
        const buscaTermo = relBusca.trim().toLowerCase()
        const buscaTermoDigits = buscaTermo.replace(/\D/g, '')
        const buscaResultados = buscaTermo
          ? relLancamentos.filter(l => {
              const matchTexto =
                l.descricao.toLowerCase().includes(buscaTermo) ||
                (l.categorias_financeiras?.nome ?? '').toLowerCase().includes(buscaTermo) ||
                (l.observacoes ?? '').toLowerCase().includes(buscaTermo) ||
                (l.projetos_diario?.nome ?? '').toLowerCase().includes(buscaTermo) ||
                (l.profissionais?.nome ?? '').toLowerCase().includes(buscaTermo)
              const matchValor =
                buscaTermoDigits.length >= 2 &&
                fmt(Number(l.valor)).replace(/\D/g, '').includes(buscaTermoDigits)
              return matchTexto || matchValor
            }).sort((a, b) => b.data.localeCompare(a.data))
          : []
        const buscaRecPago   = somaVal(buscaResultados.filter(l => l.tipo === 'receita' && l.status === 'pago'))
        const buscaRecPend   = somaVal(buscaResultados.filter(l => l.tipo === 'receita' && l.status === 'pendente'))
        const buscaDespPago  = somaVal(buscaResultados.filter(l => l.tipo === 'despesa' && l.status === 'pago'))
        const buscaDespPend  = somaVal(buscaResultados.filter(l => l.tipo === 'despesa' && l.status === 'pendente'))
        const buscaSaldo     = buscaRecPago - buscaDespPago

        // ── Label do período ─────────────────────────────────────────────────
        const periodoLabel: Record<string, string> = {
          'mes': 'Este mês', 'mes-ant': 'Mês anterior', 'trim': 'Último trimestre',
          'ano': `Ano ${anoAtual}`, 'tudo': 'Todo o período',
          'custom': relCustomInicio && relCustomFim ? `${new Date(relCustomInicio+'T12:00:00').toLocaleDateString('pt-BR')} – ${new Date(relCustomFim+'T12:00:00').toLocaleDateString('pt-BR')}` : 'Personalizado',
        }

        const relOpts = [
          {key:'dre'        as const, label:'DRE'},
          {key:'resumo'     as const, label:'Resumo Anual'},
          {key:'vencer'     as const, label:'Contas a Vencer'},
          {key:'fluxo'      as const, label:'Fluxo de Caixa'},
          {key:'categorias' as const, label:'Por Categoria'},
          {key:'comparativo'as const, label:'Comparativo'},
          {key:'margens'    as const, label:'Margem por Obra'},
          {key:'busca'      as const, label:'Buscar por Palavra-chave'},
        ]

        const periodoOpts:[string,string][]=[['mes','Este mês'],['mes-ant','Mês anterior'],['trim','Trimestre'],['ano','Este ano'],['tudo','Tudo'],['custom','Personalizado']]

        return (
          <div className="space-y-4">
            {/* ── Barra de controles ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3 no-print">
              {/* Dropdown de tipo */}
              <select
                value={relatorioAtivo}
                onChange={e => setRelatorioAtivo(e.target.value as typeof relatorioAtivo)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {relOpts.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>

              {/* Filtro de período */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
                {periodoOpts.map(([key, label]) => (
                  <button key={key} onClick={() => setPeriodoRelatorio(key as typeof periodoRelatorio)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      periodoRelatorio === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>{label}</button>
                ))}
              </div>

              {/* Inputs de data personalizada */}
              {periodoRelatorio === 'custom' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" value={relCustomInicio} onChange={e => setRelCustomInicio(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                  <span className="text-xs text-gray-400">até</span>
                  <input type="date" value={relCustomFim} onChange={e => setRelCustomFim(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                </div>
              )}

              {/* Busca por palavra-chave */}
              {relatorioAtivo === 'busca' && (
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input
                    type="text"
                    value={relBusca}
                    onChange={e => setRelBusca(e.target.value)}
                    placeholder="Buscar por palavra-chave ou valor (ex: tinta, 1250,00)..."
                    className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
                  />
                </div>
              )}

              {/* Seletor de ano (Resumo Anual e Fluxo de Caixa) */}
              {(relatorioAtivo === 'resumo' || relatorioAtivo === 'fluxo') && (
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                  {anosDisp.map(ano => (
                    <button key={ano} onClick={() => setAnoRelatorio(ano)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        anoSel === ano ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}>{ano}</button>
                  ))}
                </div>
              )}

              {/* Botão imprimir */}
              <button
                onClick={() => window.print()}
                className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-medium transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                Imprimir / PDF
              </button>
            </div>

            {/* Cabeçalho de impressão (só aparece no print) */}
            <div id="financeiro-relatorio-print" className="hidden print-show">
              <div className="text-center mb-6 pb-4 border-b border-gray-300">
                <h1 className="text-xl font-bold text-gray-900">VisitaPro — Relatório Financeiro</h1>
                <p className="text-sm text-gray-500 mt-1">{relOpts.find(r=>r.key===relatorioAtivo)?.label} · {periodoLabel[periodoRelatorio]}</p>
                <p className="text-xs text-gray-400 mt-0.5">Gerado em {new Date().toLocaleDateString('pt-BR', {day:'2-digit',month:'long',year:'numeric'})}</p>
              </div>
            </div>

            {/* ── 0. DRE ── */}
            {relatorioAtivo === 'dre' && (
              <div id="financeiro-relatorio-print" className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-gray-900 px-6 py-4">
                    <h3 className="text-base font-bold text-white">Demonstração do Resultado do Exercício</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{periodoLabel[periodoRelatorio]} · apenas lançamentos pagos (resultado realizado)</p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* RECEITAS */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Receitas</span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                      <div className="space-y-1">
                        {/* Receitas obras por categoria */}
                        {porCat(dreRecObras).map(([cat, val]) => (
                          <div key={cat} className="flex justify-between items-center py-1.5 pl-4 text-sm">
                            <span className="text-gray-600">{cat} <span className="text-xs text-orange-400 ml-1">(obras)</span></span>
                            <span className="text-green-600 font-medium">{fmt(val)}</span>
                          </div>
                        ))}
                        {porCat(dreRecAdm).map(([cat, val]) => (
                          <div key={cat} className="flex justify-between items-center py-1.5 pl-4 text-sm">
                            <span className="text-gray-600">{cat} <span className="text-xs text-blue-400 ml-1">(adm)</span></span>
                            <span className="text-green-600 font-medium">{fmt(val)}</span>
                          </div>
                        ))}
                        {dreRecTotal === 0 && <p className="text-xs text-gray-400 pl-4 py-2">Sem receitas no período</p>}
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-gray-900 bg-gray-50 px-4 py-2.5 rounded-xl">
                        <span className="text-sm font-bold text-gray-900">(=) Receita Total</span>
                        <span className="text-lg font-bold text-green-600">{fmt(dreRecTotal)}</span>
                      </div>
                    </div>

                    {/* CUSTO DAS OBRAS */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Custo das Obras</span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                      <div className="space-y-1">
                        {porCat(dreCustoObra).map(([cat, val]) => (
                          <div key={cat} className="flex justify-between items-center py-1.5 pl-4 text-sm">
                            <span className="text-gray-600">(-) {cat}</span>
                            <span className="text-red-500 font-medium">({fmt(val)})</span>
                          </div>
                        ))}
                        {dreCOval === 0 && <p className="text-xs text-gray-400 pl-4 py-2">Sem despesas de obras no período</p>}
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-orange-400 bg-orange-50 px-4 py-2.5 rounded-xl">
                        <div>
                          <span className="text-sm font-bold text-gray-900">(=) Lucro Bruto</span>
                          <span className={`ml-2 text-xs font-medium ${dreMargemBruta >= 0 ? 'text-orange-600' : 'text-red-500'}`}>
                            margem {dreMargemBruta.toFixed(1)}%
                          </span>
                        </div>
                        <span className={`text-lg font-bold ${dreLucroBruto >= 0 ? 'text-orange-700' : 'text-red-600'}`}>{fmt(dreLucroBruto)}</span>
                      </div>
                    </div>

                    {/* DESPESAS ADMINISTRATIVAS */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Despesas Administrativas</span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                      <div className="space-y-1">
                        {porCat(dreDespAdm).map(([cat, val]) => (
                          <div key={cat} className="flex justify-between items-center py-1.5 pl-4 text-sm">
                            <span className="text-gray-600">(-) {cat}</span>
                            <span className="text-red-500 font-medium">({fmt(val)})</span>
                          </div>
                        ))}
                        {dreDAval === 0 && <p className="text-xs text-gray-400 pl-4 py-2">Sem despesas administrativas no período</p>}
                      </div>
                    </div>

                    {/* RESULTADO LÍQUIDO */}
                    <div className={`px-5 py-4 rounded-2xl border-2 ${dreResultado >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-bold text-gray-900">(=) Resultado Líquido</p>
                          <p className={`text-xs mt-0.5 ${dreMargemLiq >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                            margem líquida {dreMargemLiq.toFixed(1)}% · receitas {fmt(dreRecTotal)} − despesas {fmt(dreDespTotal)}
                          </p>
                        </div>
                        <p className={`text-2xl font-bold ${dreResultado >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(dreResultado)}</p>
                      </div>
                    </div>

                    {/* RESULTADO A REALIZAR */}
                    {(dreAReceber > 0 || dreAPagar > 0) && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-px flex-1 bg-gray-200" />
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Resultado a Realizar (Pendentes)</span>
                          <div className="h-px flex-1 bg-gray-200" />
                        </div>
                        <div className="space-y-1">
                          {dreAReceber > 0 && (
                            <div className="flex justify-between items-center py-1.5 pl-4 text-sm">
                              <span className="text-gray-600">(+) A receber</span>
                              <span className="text-amber-600 font-medium">{fmt(dreAReceber)}</span>
                            </div>
                          )}
                          {dreAPagar > 0 && (
                            <div className="flex justify-between items-center py-1.5 pl-4 text-sm">
                              <span className="text-gray-600">(-) A pagar</span>
                              <span className="text-amber-600 font-medium">({fmt(dreAPagar)})</span>
                            </div>
                          )}
                        </div>
                        <div className={`flex justify-between items-center mt-3 px-5 py-3 rounded-xl border ${dreResultadoProj >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'}`}>
                          <span className="text-sm font-bold text-gray-700">(=) Resultado Projetado</span>
                          <span className={`text-lg font-bold ${dreResultadoProj >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{fmt(dreResultadoProj)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── 1. RESUMO ANUAL ── */}
            {relatorioAtivo === 'resumo' && (
              <div id="financeiro-relatorio-print" className="space-y-4">
                {([
                  { label: 'Geral (Adm + Obras)', div: null,             accent: 'bg-blue-600'   },
                  { label: 'Administração Central', div: 'administracao' as const, accent: 'bg-indigo-600' },
                  { label: 'Obras',                div: 'obra'          as const, accent: 'bg-orange-500' },
                ] as { label: string; div: 'administracao' | 'obra' | null; accent: string }[]).map(({ label, div, accent }) => {
                  const data = tabelaMensal(anoSel, div)
                  return (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className={`${accent} px-5 py-3`}>
                        <h3 className="text-sm font-semibold text-white">{label} — {anoSel}</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-gray-100 bg-gray-50">
                            <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-28">Mês</th>
                            <th className="text-right px-3 py-2.5 font-medium text-green-600">Receitas</th>
                            <th className="text-right px-3 py-2.5 font-medium text-amber-500">A receber</th>
                            <th className="text-right px-3 py-2.5 font-medium text-red-500">Despesas</th>
                            <th className="text-right px-3 py-2.5 font-medium text-amber-500">A pagar</th>
                            <th className="text-right px-4 py-2.5 font-medium text-gray-600">Saldo</th>
                          </tr></thead>
                          <tbody>
                            {data.meses.map(m => {
                              const vazio = m.rec === 0 && m.desp === 0 && m.recP === 0 && m.depP === 0
                              return (
                                <tr key={m.key} className={`border-b border-gray-50 transition-colors ${vazio ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                                  <td className="px-4 py-2.5 font-medium text-gray-700 capitalize">{m.label}</td>
                                  <td className="px-3 py-2.5 text-right text-green-600">{m.rec > 0 ? fmt(m.rec) : '—'}</td>
                                  <td className="px-3 py-2.5 text-right text-amber-500">{m.recP > 0 ? fmt(m.recP) : '—'}</td>
                                  <td className="px-3 py-2.5 text-right text-red-500">{m.desp > 0 ? fmt(m.desp) : '—'}</td>
                                  <td className="px-3 py-2.5 text-right text-amber-500">{m.depP > 0 ? fmt(m.depP) : '—'}</td>
                                  <td className={`px-4 py-2.5 text-right font-semibold ${m.saldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{vazio ? '—' : fmt(m.saldo)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot><tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                            <td className="px-4 py-3 text-gray-700 text-xs uppercase tracking-wide">Total {anoSel}</td>
                            <td className="px-3 py-3 text-right text-green-700">{fmt(data.totRec)}</td>
                            <td className="px-3 py-3 text-right text-amber-600">{fmt(data.totRecP)}</td>
                            <td className="px-3 py-3 text-right text-red-600">{fmt(data.totDesp)}</td>
                            <td className="px-3 py-3 text-right text-amber-600">{fmt(data.totDepP)}</td>
                            <td className={`px-4 py-3 text-right text-sm font-bold ${data.totSaldo >= 0 ? 'text-blue-800' : 'text-red-700'}`}>{fmt(data.totSaldo)}</td>
                          </tr></tfoot>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── 2. CONTAS A VENCER ── */}
            {relatorioAtivo === 'vencer' && (
              <div id="financeiro-relatorio-print" className="space-y-4">
                {/* Resumo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total pendente',  val: pendentes.reduce((s, l) => s + Number(l.valor), 0), cor: 'text-gray-800' },
                    { label: 'Vencidos',        val: gruposVencer.find(g => g.label === 'Vencidos')?.items.reduce((s, l) => s + Number(l.valor), 0) ?? 0, cor: 'text-red-600' },
                    { label: 'A receber',       val: pendentes.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0), cor: 'text-green-600' },
                    { label: 'A pagar',         val: pendentes.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0), cor: 'text-red-500' },
                  ].map(card => (
                    <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                      <p className={`text-lg font-bold ${card.cor}`}>{fmt(card.val)}</p>
                    </div>
                  ))}
                </div>

                {pendentes.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                    <p className="text-gray-400 text-sm">Nenhum lançamento pendente</p>
                  </div>
                )}

                {gruposVencer.map(grupo => {
                  const totalGrupo = grupo.items.reduce((s, l) => s + Number(l.valor), 0)
                  const corMap: Record<string, { badge: string; header: string; dot: string }> = {
                    red:    { badge: 'bg-red-100 text-red-700',       header: 'border-red-200 bg-red-50',    dot: 'bg-red-400' },
                    amber:  { badge: 'bg-amber-100 text-amber-700',   header: 'border-amber-200 bg-amber-50', dot: 'bg-amber-400' },
                    blue:   { badge: 'bg-blue-100 text-blue-700',     header: 'border-blue-200 bg-blue-50',  dot: 'bg-blue-400' },
                    indigo: { badge: 'bg-indigo-100 text-indigo-700', header: 'border-indigo-100 bg-white',  dot: 'bg-indigo-400' },
                    gray:   { badge: 'bg-gray-100 text-gray-600',     header: 'border-gray-100 bg-white',    dot: 'bg-gray-400' },
                  }
                  const c = corMap[grupo.cor]
                  return (
                    <div key={grupo.label} className={`rounded-2xl border shadow-sm overflow-hidden ${c.header}`}>
                      <div className="flex items-center justify-between px-5 py-3 border-b border-inherit">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                          <span className="text-sm font-semibold text-gray-800">{grupo.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>{grupo.items.length}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{fmt(totalGrupo)}</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {grupo.items.map(l => (
                          <div key={l.id} className="flex items-center gap-3 px-5 py-3 bg-white hover:bg-gray-50 transition-colors">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${l.tipo === 'receita' ? 'bg-green-400' : 'bg-red-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{l.descricao}</p>
                              <p className="text-xs text-gray-400">
                                {l.categorias_financeiras?.nome ?? 'Sem categoria'}
                                {l.projetos_diario && <> · {l.projetos_diario.nome}</>}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-semibold ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                                {l.tipo === 'receita' ? '+' : '-'}{fmt(Number(l.valor))}
                              </p>
                              <p className="text-xs text-gray-400">{new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── 3. FLUXO DE CAIXA ── */}
            {relatorioAtivo === 'fluxo' && (
              <div id="financeiro-relatorio-print" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-blue-600 px-5 py-3">
                  <h3 className="text-sm font-semibold text-white">Fluxo de Caixa — {anoSel}</h3>
                  <p className="text-xs text-blue-200 mt-0.5">Realizado + projeção com base nos lançamentos pendentes</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-24">Mês</th>
                      <th className="text-right px-3 py-2.5 font-medium text-green-600">Entradas</th>
                      <th className="text-right px-3 py-2.5 font-medium text-red-500">Saídas</th>
                      <th className="text-right px-3 py-2.5 font-medium text-gray-600">Saldo mês</th>
                      <th className="text-right px-3 py-2.5 font-medium text-blue-600">Acumulado</th>
                      <th className="text-right px-3 py-2.5 font-medium text-amber-500">Prev. entrada</th>
                      <th className="text-right px-3 py-2.5 font-medium text-amber-500">Prev. saída</th>
                      <th className="text-right px-4 py-2.5 font-medium text-indigo-600">Saldo proj.</th>
                    </tr></thead>
                    <tbody>
                      {fluxoMeses.map(m => {
                        const vazio = m.entradas === 0 && m.saidas === 0 && m.entPrev === 0 && m.saiPrev === 0
                        return (
                          <tr key={m.key} className={`border-b border-gray-50 transition-colors ${vazio ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-2.5 font-medium text-gray-700 capitalize">{m.label}</td>
                            <td className="px-3 py-2.5 text-right text-green-600">{m.entradas > 0 ? fmt(m.entradas) : '—'}</td>
                            <td className="px-3 py-2.5 text-right text-red-500">{m.saidas > 0 ? fmt(m.saidas) : '—'}</td>
                            <td className={`px-3 py-2.5 text-right font-medium ${m.saldoMes >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                              {vazio ? '—' : fmt(m.saldoMes)}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-semibold ${m.saldoAcum >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                              {fmt(m.saldoAcum)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-amber-500">{m.entPrev > 0 ? fmt(m.entPrev) : '—'}</td>
                            <td className="px-3 py-2.5 text-right text-amber-500">{m.saiPrev > 0 ? fmt(m.saiPrev) : '—'}</td>
                            <td className={`px-4 py-2.5 text-right font-semibold ${m.saldoProj >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                              {(m.entPrev > 0 || m.saiPrev > 0) ? fmt(m.saldoProj) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot><tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 text-xs uppercase tracking-wide">Total {anoSel}</td>
                      <td className="px-3 py-3 text-right text-green-700">{fmt(fluxoMeses.reduce((s, m) => s + m.entradas, 0))}</td>
                      <td className="px-3 py-3 text-right text-red-600">{fmt(fluxoMeses.reduce((s, m) => s + m.saidas, 0))}</td>
                      <td className={`px-3 py-3 text-right font-bold ${fluxoMeses.reduce((s, m) => s + m.saldoMes, 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(fluxoMeses.reduce((s, m) => s + m.saldoMes, 0))}</td>
                      <td className="px-3 py-3 text-right text-blue-800 font-bold">{fmt(fluxoMeses[11].saldoAcum)}</td>
                      <td className="px-3 py-3 text-right text-amber-600">{fmt(fluxoMeses.reduce((s, m) => s + m.entPrev, 0))}</td>
                      <td className="px-3 py-3 text-right text-amber-600">{fmt(fluxoMeses.reduce((s, m) => s + m.saiPrev, 0))}</td>
                      <td className="px-4 py-3 text-right text-indigo-800 font-bold">{fmt(fluxoMeses[11].saldoProj)}</td>
                    </tr></tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* ── 4. POR CATEGORIA ── */}
            {relatorioAtivo === 'categorias' && (
              <div id="financeiro-relatorio-print" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Receitas por categoria */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-green-600 px-5 py-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Receitas por Categoria</h3>
                    <span className="text-xs text-green-200">{anoSel} · {fmt(totCatRec)}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {catReceitas.length === 0 && <p className="text-xs text-gray-400 p-5">Sem dados</p>}
                    {catReceitas.map(c => {
                      const pct = totCatRec > 0 ? (c.receitas / totCatRec) * 100 : 0
                      return (
                        <div key={c.nome} className="px-5 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-700 truncate">{c.nome}</span>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                              <span className="text-xs font-semibold text-green-600">{fmt(c.receitas)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(c.receitas / maxRec) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Despesas por categoria */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-red-500 px-5 py-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Despesas por Categoria</h3>
                    <span className="text-xs text-red-200">{anoSel} · {fmt(totCatDesp)}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {catDespesas.length === 0 && <p className="text-xs text-gray-400 p-5">Sem dados</p>}
                    {catDespesas.map(c => {
                      const pct = totCatDesp > 0 ? (c.despesas / totCatDesp) * 100 : 0
                      return (
                        <div key={c.nome} className="px-5 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-700 truncate">{c.nome}</span>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                              <span className="text-xs font-semibold text-red-500">{fmt(c.despesas)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${(c.despesas / maxDesp) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── 5. COMPARATIVO MENSAL ── */}
            {relatorioAtivo === 'comparativo' && (
              <div id="financeiro-relatorio-print" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {compLabels.map(({ label, data, cor }) => {
                    const saldo = data.rec - data.desp
                    const corMap: Record<string, { border: string; header: string; rec: string; desp: string; saldo: string }> = {
                      blue:   { border: 'border-blue-100',   header: 'bg-blue-600',   rec: 'text-green-600', desp: 'text-red-500', saldo: 'text-blue-700' },
                      gray:   { border: 'border-gray-100',   header: 'bg-gray-500',   rec: 'text-green-600', desp: 'text-red-500', saldo: 'text-gray-700' },
                      purple: { border: 'border-purple-100', header: 'bg-purple-600', rec: 'text-green-600', desp: 'text-red-500', saldo: 'text-purple-700' },
                    }
                    const c = corMap[cor]
                    return (
                      <div key={label} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${c.border}`}>
                        <div className={`${c.header} px-5 py-3`}>
                          <p className="text-xs font-semibold text-white capitalize">{label}</p>
                        </div>
                        <div className="p-5 space-y-4">
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Receitas pagas</p>
                            <p className={`text-xl font-bold ${c.rec}`}>{fmt(data.rec)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Despesas pagas</p>
                            <p className={`text-xl font-bold ${c.desp}`}>{fmt(data.desp)}</p>
                          </div>
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-xs text-gray-400 mb-0.5">Saldo</p>
                            <p className={`text-2xl font-bold ${saldo >= 0 ? c.saldo : 'text-red-600'}`}>{fmt(saldo)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Tabela comparativa */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-gray-700 px-5 py-3">
                    <h3 className="text-sm font-semibold text-white">Comparativo — todos os meses do ano atual vs ano anterior</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Mês</th>
                        <th className="text-right px-3 py-2.5 font-medium text-blue-600">Rec. {anoAtual}</th>
                        <th className="text-right px-3 py-2.5 font-medium text-blue-400">Rec. {anoN - 1}</th>
                        <th className="text-right px-3 py-2.5 font-medium text-red-500">Desp. {anoAtual}</th>
                        <th className="text-right px-3 py-2.5 font-medium text-red-300">Desp. {anoN - 1}</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-600">Var. saldo</th>
                      </tr></thead>
                      <tbody>
                        {Array.from({ length: 12 }, (_, i) => {
                          const cur  = dadosMes(anoN, i)
                          const prev = dadosMes(anoN - 1, i)
                          const varSaldo = (cur.rec - cur.desp) - (prev.rec - prev.desp)
                          const vazio = cur.rec === 0 && cur.desp === 0 && prev.rec === 0 && prev.desp === 0
                          return (
                            <tr key={i} className={`border-b border-gray-50 transition-colors ${vazio ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                              <td className="px-4 py-2.5 font-medium text-gray-700 capitalize">{mesLabel(anoAtual, i)}</td>
                              <td className="px-3 py-2.5 text-right text-blue-600">{cur.rec > 0 ? fmt(cur.rec) : '—'}</td>
                              <td className="px-3 py-2.5 text-right text-blue-400">{prev.rec > 0 ? fmt(prev.rec) : '—'}</td>
                              <td className="px-3 py-2.5 text-right text-red-500">{cur.desp > 0 ? fmt(cur.desp) : '—'}</td>
                              <td className="px-3 py-2.5 text-right text-red-300">{prev.desp > 0 ? fmt(prev.desp) : '—'}</td>
                              <td className={`px-4 py-2.5 text-right font-semibold ${vazio ? 'text-gray-300' : varSaldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {vazio ? '—' : `${varSaldo >= 0 ? '+' : ''}${fmt(varSaldo)}`}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── 6. MARGEM POR OBRA ── */}
            {relatorioAtivo === 'margens' && (
              <div id="financeiro-relatorio-print" className="space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total receitas obras', val: obrasMargens.reduce((s, o) => s + o.rec, 0), cor: 'text-green-600' },
                    { label: 'Total despesas obras', val: obrasMargens.reduce((s, o) => s + o.desp, 0), cor: 'text-red-500' },
                    { label: 'Margem total',          val: obrasMargens.reduce((s, o) => s + o.margem, 0), cor: obrasMargens.reduce((s, o) => s + o.margem, 0) >= 0 ? 'text-blue-700' : 'text-red-600' },
                    { label: 'Obras analisadas',      val: obrasMargens.length, cor: 'text-gray-700', isCt: true },
                  ].map(card => (
                    <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                      <p className={`text-lg font-bold ${card.cor}`}>{(card as any).isCt ? card.val : fmt(card.val as number)}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-orange-500 px-5 py-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Margem por Obra — {anoSel}</h3>
                    <span className="text-xs text-orange-200">ordenado por margem</span>
                  </div>
                  {obrasMargens.length === 0 && (
                    <p className="text-xs text-gray-400 p-8 text-center">Sem obras com lançamentos em {anoSel}</p>
                  )}
                  <div className="divide-y divide-gray-50">
                    {obrasMargens.map((o, idx) => {
                      const margemPctFmt = `${o.margemPct >= 0 ? '+' : ''}${o.margemPct.toFixed(1)}%`
                      return (
                        <div key={o.nome} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{idx + 1}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{o.nome}</p>
                                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                  <span className="text-green-600">Rec: {fmt(o.rec)}</span>
                                  <span className="text-red-500">Desp: {fmt(o.desp)}</span>
                                  {(o.recP > 0 || o.depP > 0) && (
                                    <span className="text-amber-500">
                                      {o.recP > 0 && `+${fmt(o.recP)} pend.`}
                                      {o.recP > 0 && o.depP > 0 && ' · '}
                                      {o.depP > 0 && `-${fmt(o.depP)} pend.`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-base font-bold ${o.margem >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(o.margem)}</p>
                              <p className={`text-xs font-medium mt-0.5 ${o.margem >= 0 ? 'text-green-600' : 'text-red-500'}`}>{margemPctFmt}</p>
                            </div>
                          </div>
                          {o.rec > 0 && (
                            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${o.margem >= 0 ? 'bg-blue-500' : 'bg-red-400'}`}
                                style={{ width: `${Math.min(Math.abs(o.margemPct), 100)}%` }} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── 7. Busca por palavra-chave ── */}
            {relatorioAtivo === 'busca' && (
              <div id="financeiro-relatorio-print" className="space-y-4">
                {!buscaTermo ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-gray-300"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <p className="font-semibold text-gray-700">Digite uma palavra-chave para buscar</p>
                    <p className="text-sm text-gray-400 mt-1">Busca em descrição, categoria, obra vinculada e observações — ou digite um valor (ex: 1250 / 1.250,00) para buscar pelo valor do lançamento. Respeita o período selecionado ({periodoLabel[periodoRelatorio]}).</p>
                  </div>
                ) : (
                  <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Receitas (pago)', val: buscaRecPago, sub: buscaRecPend > 0 ? `+${fmt(buscaRecPend)} pendente` : null, cor: 'text-green-600' },
                        { label: 'Despesas (pago)', val: buscaDespPago, sub: buscaDespPend > 0 ? `+${fmt(buscaDespPend)} pendente` : null, cor: 'text-red-500' },
                        { label: 'Saldo realizado', val: buscaSaldo, sub: null, cor: buscaSaldo >= 0 ? 'text-blue-700' : 'text-red-600' },
                        { label: 'Lançamentos encontrados', val: buscaResultados.length, sub: null, cor: 'text-gray-700', isCt: true },
                      ].map(card => (
                        <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                          <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                          <p className={`text-lg font-bold ${card.cor}`}>{(card as any).isCt ? card.val : fmt(card.val as number)}</p>
                          {card.sub && <p className="text-xs text-amber-500 mt-0.5">{card.sub}</p>}
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="bg-gray-900 px-5 py-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">Resultados para "{relBusca.trim()}"</h3>
                        <span className="text-xs text-gray-400">{periodoLabel[periodoRelatorio]}</span>
                      </div>
                      {buscaResultados.length === 0 ? (
                        <p className="text-xs text-gray-400 p-8 text-center">Nenhum lançamento encontrado para essa palavra-chave no período selecionado.</p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {buscaResultados.map(l => (
                            <div key={l.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${l.tipo === 'receita' ? 'bg-green-50' : 'bg-red-50'}`}>
                                <span className={`text-xs font-bold ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>{l.tipo === 'receita' ? '+' : '-'}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{l.descricao}</p>
                                <p className="text-xs text-gray-400 truncate">
                                  {l.categorias_financeiras?.nome ?? 'Sem categoria'}
                                  {l.projetos_diario?.nome && <> · {l.projetos_diario.nome}</>}
                                  {l.profissionais?.nome && <> · 👤 {l.profissionais.nome}</>}
                                  {' · '}{new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_CLASS[l.status]}`}>
                                {STATUS_LABEL[l.status]}
                              </span>
                              <span className={`text-sm font-semibold shrink-0 ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                                {l.tipo === 'receita' ? '+' : '-'}{fmt(Number(l.valor))}
                              </span>
                              <button onClick={() => setEditTargetBusca(l)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors shrink-0 no-print" title="Editar">
                                <Pencil size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {refreshingBusca && (
                        <p className="text-xs text-gray-400 px-5 py-2 border-t border-gray-50">Atualizando...</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        )
      })()}

      {/* ══ ABA CATEGORIAS ══ */}
      {activeTab === 'categorias' && (() => {
        const GRUPOS: { tipo: 'receita' | 'despesa'; divisao: 'administracao' | 'obra'; label: string; icon: React.ReactNode; accent: string; dot: string; header: string; addBg: string }[] = [
          {
            tipo: 'receita', divisao: 'administracao',
            label: 'Adm — Receitas',
            icon: <Building2 size={14} className="text-emerald-600" />,
            accent: 'border-t-emerald-400', dot: 'bg-emerald-400',
            header: 'bg-emerald-50 border-b border-emerald-100',
            addBg: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700',
          },
          {
            tipo: 'receita', divisao: 'obra',
            label: 'Obra — Receitas',
            icon: <HardHat size={14} className="text-teal-600" />,
            accent: 'border-t-teal-400', dot: 'bg-teal-400',
            header: 'bg-teal-50 border-b border-teal-100',
            addBg: 'bg-teal-100 hover:bg-teal-200 text-teal-700',
          },
          {
            tipo: 'despesa', divisao: 'administracao',
            label: 'Adm — Despesas',
            icon: <Building2 size={14} className="text-rose-500" />,
            accent: 'border-t-rose-400', dot: 'bg-rose-400',
            header: 'bg-rose-50 border-b border-rose-100',
            addBg: 'bg-rose-100 hover:bg-rose-200 text-rose-700',
          },
          {
            tipo: 'despesa', divisao: 'obra',
            label: 'Obra — Despesas',
            icon: <HardHat size={14} className="text-orange-500" />,
            accent: 'border-t-orange-400', dot: 'bg-orange-400',
            header: 'bg-orange-50 border-b border-orange-100',
            addBg: 'bg-orange-100 hover:bg-orange-200 text-orange-700',
          },
        ]

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {dedupMsg && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">{dedupMsg}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    onClick={handleDedup}
                    disabled={deduping}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-medium transition-colors"
                  >
                    <RefreshCw size={13} className={deduping ? 'animate-spin' : ''} />
                    {deduping ? 'Limpando...' : 'Remover duplicatas'}
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => openCreateCat()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    <Plus size={14} /> Nova categoria
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {GRUPOS.map(g => {
                const cats = categorias.filter(c => c.divisao === g.divisao && c.tipo === g.tipo)
                return (
                  <div key={`${g.divisao}-${g.tipo}`}
                    className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-t-4 ${g.accent}`}>
                    <div className={`flex items-center justify-between px-4 py-3 ${g.header}`}>
                      <div className="flex items-center gap-2">
                        {g.icon}
                        <span className="text-sm font-semibold text-gray-700">{g.label}</span>
                        <span className="text-xs font-bold text-gray-400 bg-white/70 px-1.5 py-0.5 rounded-full">{cats.length}</span>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => openCreateCat(g.tipo, g.divisao)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${g.addBg}`}
                          title="Adicionar categoria"
                        >
                          <Plus size={11} /> Add
                        </button>
                      )}
                    </div>
                    <div className="p-2">
                      {cats.length === 0 ? (
                        <div className="py-6 text-center">
                          <p className="text-xs text-gray-400">Nenhuma categoria</p>
                          {canEdit && (
                            <button
                              onClick={() => openCreateCat(g.tipo, g.divisao)}
                              className="mt-2 text-xs text-blue-500 hover:text-blue-700 underline"
                            >
                              Adicionar uma
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {cats.map(c => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-gray-50 group transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${g.dot}`} />
                                <span className="text-sm text-gray-700 truncate">{c.nome}</span>
                              </div>
                              {canEdit && (
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                  <button
                                    onClick={() => openEditCat(c)}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Editar"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteCat(c)}
                                    className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ══ MODALS ══ */}

      {/* Lançamento */}
      {(showModal || editTarget) && (
        <LancamentoModal
          categorias={categorias}
          projetos={projetos}
          profissionais={profissionais}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSaved={handleSaved}
          initial={editTarget ?? undefined}
          defaultDivisao={editTarget ? undefined : modalDivisao}
        />
      )}

      {/* Edição vinda da busca por palavra-chave/valor — não recarrega a página */}
      {editTargetBusca && (
        <LancamentoModal
          categorias={categorias}
          projetos={projetos}
          profissionais={profissionais}
          onClose={() => setEditTargetBusca(null)}
          onSaved={handleSavedBusca}
          initial={editTargetBusca}
        />
      )}

      {/* Confirmar delete lançamento */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Excluir lançamento?</h3>
            <p className="text-sm text-gray-500 mb-4">
              &quot;<strong>{deleteTarget.descricao}</strong>&quot; — {fmt(deleteTarget.valor)}
            </p>

            {deleteTarget.recorrencia_grupo_id && deleteTarget.status === 'pendente' && (
              <div className="space-y-2 mb-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">O que deseja excluir?</p>
                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  deleteMode === 'single' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name="deleteMode" value="single"
                    checked={deleteMode === 'single'}
                    onChange={() => setDeleteMode('single')}
                    className="mt-0.5 accent-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Somente este lançamento</p>
                    <p className="text-xs text-gray-400">Os demais da série continuam programados</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  deleteMode === 'group' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name="deleteMode" value="group"
                    checked={deleteMode === 'group'}
                    onChange={() => setDeleteMode('group')}
                    className="mt-0.5 accent-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Este e todos os próximos pendentes</p>
                    <p className="text-xs text-gray-400">Remove este e os futuros não pagos da série</p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteMode('single') }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
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
