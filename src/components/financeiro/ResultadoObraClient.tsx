'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  HardHat, ArrowUpRight, ArrowDownRight, Target, TrendingUp,
  TrendingDown, Clock, Plus, Pencil, Trash2, CheckCircle,
  AlertTriangle, XCircle, ChevronRight,
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
  canEdit: boolean
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

export default function ResultadoObraClient({ resultado, categorias, canEdit }: Props) {
  const { projeto, valorOrcado, receitas, despesas, resultado: saldo, margem, desvio, desvioPerc, aReceber, aPagar } = resultado
  const [lancamentos, setLancamentos] = useState(resultado.lancamentos)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  // Status visual do resultado
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

  // Barras de progresso comparativas
  const maxVal = Math.max(valorOrcado, receitas, despesas, 1)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
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

      {/* Comparativo Orçado vs Realizado */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Orçado vs Realizado</h2>

        {/* Barras comparativas */}
        <div className="space-y-4 mb-6">
          {/* Orçado */}
          <BarComparativa
            label="Valor orçado"
            value={valorOrcado}
            max={maxVal}
            color="bg-blue-400"
            textColor="text-blue-700"
          />
          {/* Faturado (receitas pagas) */}
          <BarComparativa
            label="Receitas faturadas"
            value={receitas}
            max={maxVal}
            color="bg-green-400"
            textColor="text-green-700"
          />
          {/* Custos */}
          <BarComparativa
            label="Custos (despesas)"
            value={despesas}
            max={maxVal}
            color="bg-red-400"
            textColor="text-red-600"
          />
        </div>

        {/* KPIs principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiMini
            label="Resultado"
            value={fmt(saldo)}
            sub={`Margem: ${margem.toFixed(1)}%`}
            icon={saldo >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
            color={saldo >= 0 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}
          />
          <KpiMini
            label="Desvio do orçamento"
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Lançamentos ({lancamentos.filter(l => l.status !== 'cancelado').length})
          </h2>
          <div className="flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>Receitas</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Despesas</span>
          </div>
        </div>

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
        ) : (
          <div className="divide-y divide-gray-50">
            {lancamentos.map((l: any) => (
              <div key={l.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${l.status === 'cancelado' ? 'opacity-50' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${l.tipo === 'receita' ? 'bg-green-50' : 'bg-red-50'}`}>
                  {l.tipo === 'receita'
                    ? <ArrowUpRight size={13} className="text-green-600" />
                    : <ArrowDownRight size={13} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{l.descricao}</p>
                  <p className="text-xs text-gray-400">
                    {l.categorias_financeiras?.nome} ·{' '}
                    {new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}
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
      </div>

      {/* Modals */}
      {showModal && (
        <LancamentoModal
          categorias={categorias}
          projetos={[{ id: projeto.id, nome: projeto.nome }]}
          projetoIdFixo={projeto.id}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
      {editTarget && (
        <LancamentoModal
          categorias={categorias}
          projetos={[{ id: projeto.id, nome: projeto.nome }]}
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

function BarComparativa({ label, value, max, color, textColor }: {
  label: string; value: number; max: number; color: string; textColor: string
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-semibold w-28 text-right shrink-0 ${textColor}`}>
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
