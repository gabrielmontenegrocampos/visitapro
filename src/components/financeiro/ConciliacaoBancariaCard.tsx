'use client'

import { useState, useMemo } from 'react'
import {
  Landmark, Pencil, CheckCircle, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, Check, X,
} from 'lucide-react'
import { updateSaldoInicial, upsertConciliacaoMensal } from '@/app/(crm)/financeiro/actions'

// ── helpers ──────────────────────────────────────────────────────────
function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtInput(v: number | null): string {
  if (v == null || isNaN(Number(v))) return ''
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function maskBRL(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
}
function parseBRL(s: string): number {
  const clean = s.replace(/R\$\s*/g, '').trim()
  if (clean.includes(',')) return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0
  return parseFloat(clean.replace(/[^\d.-]/g, '')) || 0
}
function mesKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}
function mesLabel(key: string): string {
  const d = new Date(key + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '').replace(' de ', '/')
}
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')
}

// ── interfaces ────────────────────────────────────────────────────────
interface SaldoConfig {
  saldo_inicial: number
  saldo_inicial_data: string
}
interface ConciliacaoMensal {
  mes: string
  saldo_banco: number | null
  observacoes: string | null
  updated_at: string
}
interface Lancamento {
  tipo: 'receita' | 'despesa'
  status: string
  valor: number
  data: string
}
interface Props {
  config: SaldoConfig
  conciliacoes: ConciliacaoMensal[]
  lancamentos: Lancamento[]
  canEdit: boolean
}

// ── componente ────────────────────────────────────────────────────────
export default function ConciliacaoBancariaCard({ config: initConfig, conciliacoes: initConc, lancamentos, canEdit }: Props) {
  const [config, setConfig]           = useState(initConfig)
  const [conciliacoes, setConciliacoes] = useState(initConc)
  const [showAncora, setShowAncora]   = useState(false)
  const [editingMes, setEditingMes]   = useState<string | null>(null)
  const [savingMes, setSavingMes]     = useState(false)
  const [savingAncora, setSavingAncora] = useState(false)

  // Âncora — edição
  const [ancorValor, setAncorValor] = useState(fmtInput(initConfig.saldo_inicial))
  const [ancorData,  setAncorData]  = useState(initConfig.saldo_inicial_data)

  // Campo do mês em edição
  const [mesValor, setMesValor] = useState('')
  const [mesObs,   setMesObs]   = useState('')

  // ── Meses a exibir ────────────────────────────────────────────────
  const meses = useMemo(() => {
    // Coleta meses com lançamentos pagos
    const comLanc = new Set(
      lancamentos.filter(l => l.status === 'pago').map(l => {
        const [y, m] = l.data.split('-')
        return `${y}-${m}-01`
      })
    )
    // Coleta meses com conciliação salva
    conciliacoes.forEach(c => comLanc.add(c.mes))
    // Adiciona mês atual
    comLanc.add(mesKey(new Date()))

    // Filtra apenas meses >= saldo_inicial_data (ano do mês da âncora)
    const ancoraMes = config.saldo_inicial_data.slice(0, 7) + '-01'

    return Array.from(comLanc)
      .filter(m => m >= ancoraMes)
      .sort()
      .reverse()
      .slice(0, 18)
  }, [lancamentos, conciliacoes, config.saldo_inicial_data])

  // ── Cálculo por mês ───────────────────────────────────────────────
  const calculosMeses = useMemo(() => {
    const mesesOrdenados = [...meses].sort() // crescente para acumular
    let acumulado = config.saldo_inicial

    const map: Record<string, {
      receitas: number; despesas: number; saldoMes: number; saldoAcum: number
    }> = {}

    for (const mes of mesesOrdenados) {
      const mesStr = mes.slice(0, 7) // "2026-07"
      const pagos  = lancamentos.filter(l => l.status === 'pago' && l.data.startsWith(mesStr))
      const rec    = pagos.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0)
      const desp   = pagos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0)
      const net    = rec - desp
      acumulado   += net
      map[mes]     = { receitas: rec, despesas: desp, saldoMes: net, saldoAcum: acumulado }
    }

    return map
  }, [meses, lancamentos, config.saldo_inicial])

  // ── Salvar âncora ─────────────────────────────────────────────────
  async function saveAncora() {
    if (!ancorValor || !ancorData) return
    setSavingAncora(true)
    const val = parseBRL(ancorValor)
    const res = await updateSaldoInicial(val, ancorData)
    if (!res.error) {
      setConfig({ saldo_inicial: val, saldo_inicial_data: ancorData })
      setShowAncora(false)
    }
    setSavingAncora(false)
  }

  // ── Abrir edição de mês ───────────────────────────────────────────
  function openEditMes(mes: string) {
    const conc = conciliacoes.find(c => c.mes === mes)
    setMesValor(fmtInput(conc?.saldo_banco ?? null))
    setMesObs(conc?.observacoes ?? '')
    setEditingMes(mes)
  }

  // ── Salvar mês ────────────────────────────────────────────────────
  async function saveMes() {
    if (!editingMes || !mesValor) return
    setSavingMes(true)
    const val = parseBRL(mesValor)
    const res = await upsertConciliacaoMensal(editingMes, val, mesObs || undefined)
    if (!res.error) {
      setConciliacoes(prev => {
        const others = prev.filter(c => c.mes !== editingMes)
        return [...others, { mes: editingMes, saldo_banco: val, observacoes: mesObs || null, updated_at: new Date().toISOString() }]
      })
      setEditingMes(null)
    }
    setSavingMes(false)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Landmark size={15} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Conciliação Bancária</h3>
            <p className="text-[11px] text-gray-400">Compare o saldo do sistema com o extrato do banco mês a mês</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAncora(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
          >
            {showAncora ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Saldo inicial: {fmt(config.saldo_inicial)} em {fmtDate(config.saldo_inicial_data)}
          </button>
        )}
      </div>

      {/* Painel âncora */}
      {showAncora && (
        <div className="border-b border-gray-100 px-5 py-4 bg-gray-50">
          <p className="text-xs text-gray-500 mb-3">
            Informe o saldo bancário real em uma data de referência. O sistema calculará o acumulado a partir daí somando os lançamentos pagos.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Em</span>
            <input
              type="date" value={ancorData} onChange={e => setAncorData(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <span className="text-xs text-gray-500">o saldo era</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
              <input
                type="text" inputMode="numeric" value={ancorValor}
                onChange={e => setAncorValor(maskBRL(e.target.value))}
                placeholder="0,00"
                className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-40 tabular-nums"
              />
            </div>
            <button
              onClick={saveAncora} disabled={savingAncora || !ancorValor || !ancorData}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {savingAncora ? 'Salvando…' : 'Salvar âncora'}
            </button>
          </div>
        </div>
      )}

      {/* Cabeçalho da tabela */}
      <div className="hidden md:grid grid-cols-[130px_1fr_1fr_1fr_1fr_1fr_44px] gap-2 px-5 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
        <span>Mês</span>
        <span className="text-right">Receitas</span>
        <span className="text-right">Despesas</span>
        <span className="text-right">Saldo mês</span>
        <span className="text-right">Acum. sistema</span>
        <span className="text-right">Extrato banco</span>
        <span />
      </div>

      {/* Linhas */}
      <div className="divide-y divide-gray-50">
        {meses.map(mes => {
          const calc  = calculosMeses[mes] ?? { receitas: 0, despesas: 0, saldoMes: 0, saldoAcum: 0 }
          const conc  = conciliacoes.find(c => c.mes === mes)
          const banco = conc?.saldo_banco ?? null
          const div   = banco != null ? banco - calc.saldoAcum : null
          const divAbs = div != null ? Math.abs(div) : null

          const divColor = div == null ? 'text-gray-300'
            : divAbs! < 1 ? 'text-green-600' : divAbs! < 200 ? 'text-amber-500' : 'text-red-500'

          const divIcon = div == null ? null
            : divAbs! < 1 ? <CheckCircle size={13} className="text-green-500 shrink-0" />
            : divAbs! < 200 ? <AlertTriangle size={13} className="text-amber-400 shrink-0" />
            : <XCircle size={13} className="text-red-400 shrink-0" />

          const isEditing = editingMes === mes

          return (
            <div key={mes}>
              {/* Linha principal */}
              <div className={`px-5 py-3 transition-colors ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>

                {/* Mobile */}
                <div className="md:hidden flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{mesLabel(mes)}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {divIcon}
                      <span className={`text-xs font-medium ${divColor}`}>
                        {banco != null ? fmt(banco) : 'Banco não informado'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Sistema: {fmt(calc.saldoAcum)} · Mês: {calc.saldoMes >= 0 ? '+' : ''}{fmt(calc.saldoMes)}
                    </p>
                  </div>
                  {canEdit && !isEditing && (
                    <button onClick={() => openEditMes(mes)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 shrink-0">
                      <Pencil size={13} />
                    </button>
                  )}
                </div>

                {/* Desktop */}
                <div className="hidden md:grid grid-cols-[130px_1fr_1fr_1fr_1fr_1fr_44px] gap-2 items-center text-sm">
                  <span className="font-medium text-gray-700">{mesLabel(mes)}</span>
                  <span className="text-right text-green-600 tabular-nums">{calc.receitas > 0 ? fmt(calc.receitas) : <span className="text-gray-300">—</span>}</span>
                  <span className="text-right text-red-500 tabular-nums">{calc.despesas > 0 ? fmt(calc.despesas) : <span className="text-gray-300">—</span>}</span>
                  <span className={`text-right tabular-nums font-medium ${calc.saldoMes >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {calc.saldoMes !== 0 ? (calc.saldoMes > 0 ? '+' : '') + fmt(calc.saldoMes) : <span className="text-gray-300">—</span>}
                  </span>
                  <span className={`text-right tabular-nums font-semibold ${calc.saldoAcum >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                    {fmt(calc.saldoAcum)}
                  </span>
                  <div className="flex items-center justify-end gap-1.5">
                    {divIcon}
                    <span className={`tabular-nums font-medium ${divColor}`}>
                      {banco != null ? fmt(banco) : <span className="text-gray-300 font-normal text-xs">—</span>}
                    </span>
                  </div>
                  {canEdit ? (
                    <button onClick={() => openEditMes(mes)}
                      className="flex items-center justify-center p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                      <Pencil size={13} />
                    </button>
                  ) : <span />}
                </div>
              </div>

              {/* Inline edit */}
              {isEditing && (
                <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-[11px] text-gray-500 font-medium block mb-1">
                      Saldo no extrato — {mesLabel(mes)}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                      <input
                        autoFocus
                        type="text" inputMode="numeric" value={mesValor}
                        onChange={e => setMesValor(maskBRL(e.target.value))}
                        onKeyDown={e => { if (e.key === 'Enter') saveMes(); if (e.key === 'Escape') setEditingMes(null) }}
                        placeholder="0,00"
                        className="pl-8 pr-3 py-2 text-sm border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-44 tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-[11px] text-gray-500 font-medium block mb-1">Observação (opcional)</label>
                    <input
                      type="text" value={mesObs}
                      onChange={e => setMesObs(e.target.value)}
                      placeholder="ex: inclui transferência interna"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveMes} disabled={savingMes || !mesValor}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      <Check size={14} />
                      {savingMes ? 'Salvando…' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => setEditingMes(null)}
                      className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl text-sm transition-colors"
                    >
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                  {div != null && (
                    <div className={`text-xs px-3 py-2 rounded-xl ${
                      divAbs! < 1 ? 'bg-green-50 text-green-700' :
                      divAbs! < 200 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                    }`}>
                      Divergência: {div >= 0 ? '+' : ''}{fmt(div)}<br/>
                      <span className="text-[10px] opacity-75">
                        {div > 1 ? 'Banco acima → receita não registrada?' :
                         div < -1 ? 'Banco abaixo → despesa não registrada?' : 'Conciliado ✓'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {meses.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">
            Nenhum lançamento encontrado. Adicione lançamentos pagos para iniciar a conciliação.
          </div>
        )}
      </div>
    </div>
  )
}
