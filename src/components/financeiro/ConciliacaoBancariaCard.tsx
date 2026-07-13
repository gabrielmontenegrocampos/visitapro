'use client'

import { useState, useMemo } from 'react'
import { Landmark, Pencil, CheckCircle, AlertTriangle, XCircle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { updateSaldoConciliacao } from '@/app/(crm)/financeiro/actions'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')
}
function parseBRL(s: string): number {
  return Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0
}
function fmtInput(v: number | null) {
  if (v == null) return ''
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface SaldoConfig {
  saldo_inicial: number
  saldo_inicial_data: string
  saldo_banco_real: number | null
  saldo_banco_data: string | null
}

interface Lancamento {
  tipo: 'receita' | 'despesa'
  status: string
  valor: number
  data: string
}

interface Props {
  config: SaldoConfig
  lancamentos: Lancamento[]
  canEdit: boolean
}

export default function ConciliacaoBancariaCard({ config: initialConfig, lancamentos, canEdit }: Props) {
  const [config, setConfig]     = useState(initialConfig)
  const [showEdit, setShowEdit] = useState(false)
  const [showInicial, setShowInicial] = useState(false)
  const [saving, setSaving]     = useState(false)

  // Banco — edição
  const [bancoValor, setBancoValor] = useState(fmtInput(initialConfig.saldo_banco_real))
  const [bancoData, setBancoData]   = useState(initialConfig.saldo_banco_data ?? new Date().toISOString().slice(0, 10))

  // Inicial — edição
  const [inicialValor, setInicialValor] = useState(fmtInput(initialConfig.saldo_inicial))
  const [inicialData, setInicialData]   = useState(initialConfig.saldo_inicial_data)

  // Saldo sistema = saldo_inicial + receitas pagas desde data inicial - despesas pagas desde data inicial
  const saldoSistema = useMemo(() => {
    const base = config.saldo_inicial_data
    const pagos = lancamentos.filter(l => l.status === 'pago' && l.data >= base)
    const rec  = pagos.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0)
    const desp = pagos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0)
    return config.saldo_inicial + rec - desp
  }, [config, lancamentos])

  const divergencia   = config.saldo_banco_real != null ? config.saldo_banco_real - saldoSistema : null
  const divAbs        = divergencia != null ? Math.abs(divergencia) : null
  const statusDiv     = divergencia == null ? 'sem-dado' : divAbs! < 1 ? 'ok' : divAbs! < 500 ? 'atencao' : 'critico'

  const divColor = {
    'sem-dado': 'text-gray-400',
    ok:        'text-green-600',
    atencao:   'text-amber-600',
    critico:   'text-red-600',
  }[statusDiv]

  const divIcon = {
    'sem-dado': null,
    ok:         <CheckCircle size={14} className="text-green-500" />,
    atencao:    <AlertTriangle size={14} className="text-amber-500" />,
    critico:    <XCircle size={14} className="text-red-500" />,
  }[statusDiv]

  const divMsg = divergencia == null ? 'Informe o saldo bancário'
    : divergencia > 1   ? 'Banco acima do sistema — receitas não registradas?'
    : divergencia < -1  ? 'Banco abaixo do sistema — despesas não registradas?'
    : 'Saldo conciliado ✓'

  async function saveBanco() {
    if (!bancoValor) return
    setSaving(true)
    const val = parseBRL(bancoValor)
    const res = await updateSaldoConciliacao({ saldo_banco_real: val, saldo_banco_data: bancoData })
    if (!res.error) {
      setConfig(c => ({ ...c, saldo_banco_real: val, saldo_banco_data: bancoData }))
      setShowEdit(false)
    }
    setSaving(false)
  }

  async function saveInicial() {
    if (!inicialValor || !inicialData) return
    setSaving(true)
    const val = parseBRL(inicialValor)
    const res = await updateSaldoConciliacao({ saldo_inicial: val, saldo_inicial_data: inicialData })
    if (!res.error) {
      setConfig(c => ({ ...c, saldo_inicial: val, saldo_inicial_data: inicialData }))
      setShowInicial(false)
    }
    setSaving(false)
  }

  function handleBancoValorKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveBanco()
  }

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
            <p className="text-[11px] text-gray-400">base: {fmtDate(config.saldo_inicial_data)}</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => { setShowEdit(v => !v); setShowInicial(false) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
          >
            {showEdit ? <X size={12} /> : <Pencil size={12} />}
            {showEdit ? 'Fechar' : 'Editar'}
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 px-0">
        {/* Saldo sistema */}
        <div className="px-5 py-4">
          <p className="text-[11px] text-gray-400 mb-1">Saldo no sistema</p>
          <p className="text-lg font-bold text-blue-700 tabular-nums">{fmt(saldoSistema)}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            Inicial {fmt(config.saldo_inicial)} + lançamentos pagos
          </p>
        </div>

        {/* Saldo banco */}
        <div className="px-5 py-4">
          <p className="text-[11px] text-gray-400 mb-1">Saldo no banco</p>
          {config.saldo_banco_real != null ? (
            <>
              <p className="text-lg font-bold text-gray-800 tabular-nums">{fmt(config.saldo_banco_real)}</p>
              <p className="text-[10px] text-gray-400 mt-1">em {fmtDate(config.saldo_banco_data)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic mt-1">não informado</p>
          )}
        </div>

        {/* Divergência */}
        <div className="px-5 py-4">
          <p className="text-[11px] text-gray-400 mb-1">Divergência</p>
          {divergencia != null ? (
            <>
              <div className="flex items-center gap-1.5">
                {divIcon}
                <p className={`text-lg font-bold tabular-nums ${divColor}`}>
                  {divergencia >= 0 ? '+' : ''}{fmt(divergencia)}
                </p>
              </div>
              <p className={`text-[10px] mt-1 ${divColor}`}>{divMsg}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic mt-1">—</p>
          )}
        </div>
      </div>

      {/* Formulário de edição */}
      {showEdit && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">

          {/* Saldo do banco hoje */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Saldo atual no banco</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={bancoValor}
                  onChange={e => setBancoValor(e.target.value)}
                  onKeyDown={handleBancoValorKey}
                  placeholder="0,00"
                  className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-40"
                />
              </div>
              <span className="text-xs text-gray-400">em</span>
              <input
                type="date"
                value={bancoData}
                onChange={e => setBancoData(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <button
                onClick={saveBanco}
                disabled={saving || !bancoValor}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Saldo inicial (expandível) */}
          <div>
            <button
              onClick={() => setShowInicial(v => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showInicial ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Ajustar saldo inicial (âncora do cálculo)
            </button>

            {showInicial && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-gray-400">
                  Informe o saldo bancário real em uma data de referência. O sistema calculará
                  o saldo atual somando receitas e subtraindo despesas pagas desde essa data.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">Em</span>
                  <input
                    type="date"
                    value={inicialData}
                    onChange={e => setInicialData(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <span className="text-xs text-gray-500">o saldo era</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inicialValor}
                      onChange={e => setInicialValor(e.target.value)}
                      placeholder="0,00"
                      className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-40"
                    />
                  </div>
                  <button
                    onClick={saveInicial}
                    disabled={saving || !inicialValor || !inicialData}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {saving ? 'Salvando…' : 'Salvar âncora'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
