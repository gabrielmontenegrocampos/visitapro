'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, ArrowUpRight, ArrowDownRight, Filter, X, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import type { CategoriaFinanceira } from '@/types/database'
import { deleteLancamento, cancelarRecorrencia } from '@/app/(crm)/financeiro/actions'
import LancamentoModal from './LancamentoModal'

interface Lancamento {
  id: string
  categoria_id: string
  tipo: 'receita' | 'despesa'
  divisao: 'administracao' | 'obra'
  descricao: string
  valor: number
  data: string
  status: 'pendente' | 'pago' | 'cancelado'
  projeto_id: string | null
  observacoes: string | null
  recorrencia_grupo_id: string | null
  recorrencia_mes: number | null
  categorias_financeiras: { id: string; nome: string } | null
  projetos_diario: { id: string; nome: string } | null
}

interface Props {
  lancamentos: Lancamento[]
  categorias: CategoriaFinanceira[]
  projetos: { id: string; nome: string }[]
  canEdit: boolean
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_LABEL: Record<string, string> = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' }
const STATUS_CLASS: Record<string, string> = {
  pago: 'bg-green-100 text-green-700',
  pendente: 'bg-amber-100 text-amber-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

export default function LancamentosClient({ lancamentos: initial, categorias, projetos, canEdit }: Props) {
  const [lancamentos, setLancamentos] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Lancamento | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Lancamento | null>(null)
  const [cancelRecorrTarget, setCancelRecorrTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [cancelingRecorr, setCancelingRecorr] = useState(false)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroDivisao, setFiltroDivisao] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroMes, setFiltroMes] = useState('')

  const filtered = useMemo(() => {
    return lancamentos.filter(l => {
      if (filtroTipo && l.tipo !== filtroTipo) return false
      if (filtroDivisao && l.divisao !== filtroDivisao) return false
      if (filtroStatus && l.status !== filtroStatus) return false
      if (filtroMes && !l.data.startsWith(filtroMes)) return false
      return true
    })
  }, [lancamentos, filtroTipo, filtroDivisao, filtroStatus, filtroMes])

  const totalReceitas = filtered.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
  const totalDespesas = filtered.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteLancamento(deleteTarget.id)
    setLancamentos(prev => prev.filter(l => l.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  async function handleCancelRecorrencia() {
    if (!cancelRecorrTarget) return
    setCancelingRecorr(true)
    await cancelarRecorrencia(cancelRecorrTarget)
    setCancelRecorrTarget(null)
    setCancelingRecorr(false)
    window.location.reload()
  }

  function handleSaved() {
    setShowModal(false)
    setEditTarget(null)
    window.location.reload()
  }

  // Meses disponíveis para filtro
  const meses = useMemo(() => {
    const set = new Set(lancamentos.map(l => l.data.slice(0, 7)))
    return Array.from(set).sort().reverse()
  }, [lancamentos])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/financeiro" className="text-sm text-gray-500 hover:text-gray-700">← Financeiro</Link>
          <h1 className="text-xl font-bold text-gray-900">Lançamentos</h1>
        </div>
        {canEdit && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
            <Plus size={15} />
            Novo lançamento
          </button>
        )}
      </div>

      {/* Resumo filtrado */}
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
        <Filter size={14} className="text-gray-400 shrink-0" />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">Todos os tipos</option>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
        <select value={filtroDivisao} onChange={e => setFiltroDivisao(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">Todas as divisões</option>
          <option value="administracao">Administração</option>
          <option value="obra">Obra</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">Todos os meses</option>
          {meses.map(m => (
            <option key={m} value={m}>
              {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
        {(filtroTipo || filtroDivisao || filtroStatus || filtroMes) && (
          <button onClick={() => { setFiltroTipo(''); setFiltroDivisao(''); setFiltroStatus(''); setFiltroMes('') }}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <X size={12} /> Limpar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">Nenhum lançamento encontrado</p>
            {canEdit && (
              <button onClick={() => setShowModal(true)}
                className="mt-3 text-sm text-blue-600 hover:underline">
                Criar primeiro lançamento
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Divisão</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Valor</th>
                  {canEdit && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${l.tipo === 'receita' ? 'bg-green-50' : 'bg-red-50'}`}>
                          {l.tipo === 'receita'
                            ? <ArrowUpRight size={11} className="text-green-600" />
                            : <ArrowDownRight size={11} className="text-red-500" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-gray-800">{l.descricao}</p>
                            {l.recorrencia_grupo_id && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                                <RefreshCw size={9} />
                                {l.recorrencia_mes && `${l.recorrencia_mes}ª`}
                              </span>
                            )}
                          </div>
                          {l.projetos_diario && (
                            <p className="text-xs text-gray-400">{l.projetos_diario.nome}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{l.categorias_financeiras?.nome ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.divisao === 'obra' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {l.divisao === 'obra' ? 'Obra' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[l.status]}`}>
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      <span className={l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}>
                        {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditTarget(l)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <Pencil size={13} />
                          </button>
                          {l.recorrencia_grupo_id && l.status === 'pendente' && (
                            <button
                              onClick={() => setCancelRecorrTarget(l.recorrencia_grupo_id!)}
                              title="Cancelar recorrência futura"
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition-colors">
                              <RefreshCw size={13} />
                            </button>
                          )}
                          <button onClick={() => setDeleteTarget(l)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal criar */}
      {showModal && (
        <LancamentoModal
          categorias={categorias}
          projetos={projetos}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Modal editar */}
      {editTarget && (
        <LancamentoModal
          categorias={categorias}
          projetos={projetos}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
          initial={editTarget}
        />
      )}

      {/* Modal cancelar recorrência */}
      {cancelRecorrTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <RefreshCw size={20} className="text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Cancelar recorrência?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Todos os lançamentos <strong>futuros e pendentes</strong> desta série serão marcados como cancelados. Os já pagos não serão alterados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCancelRecorrTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Manter
              </button>
              <button onClick={handleCancelRecorrencia} disabled={cancelingRecorr}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-sm font-medium">
                {cancelingRecorr ? 'Cancelando...' : 'Cancelar série'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal deletar */}
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
