'use client'

import { useState, useMemo } from 'react'
import {
  Plus, ShoppingCart, CheckCircle, XCircle, Package,
  ChevronDown, ChevronUp, Trash2, Filter, X, CheckSquare, Pencil,
} from 'lucide-react'
import { updateOrdemStatus, deleteOrdemCompra, updateOrdensStatusBulk } from '@/app/(crm)/compras/actions'
import OrdemCompraModal from './OrdemCompraModal'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  solicitado: { label: 'Solicitado', color: 'bg-amber-100 text-amber-700' },
  aprovado:   { label: 'Aprovado',   color: 'bg-blue-100 text-blue-700' },
  recebido:   { label: 'Recebido',   color: 'bg-green-100 text-green-700' },
  cancelado:  { label: 'Cancelado',  color: 'bg-gray-100 text-gray-400' },
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  ordens: any[]
  fornecedores: any[]
  projetos: { id: string; nome: string }[]
}

function enriquecerOrdem(o: any, projetos: { id: string; nome: string }[]) {
  if (!o) return o
  return {
    ...o,
    projetos_diario: o.projeto_id ? (projetos.find(p => p.id === o.projeto_id) ?? null) : null,
  }
}

export default function OrdensCompraTab({ ordens: initial, fornecedores, projetos }: Props) {
  const [ordens, setOrdens] = useState(() => initial.map(o => enriquecerOrdem(o, projetos)))
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

  // Seleção em massa
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Ordens filtradas
  const filtered = useMemo(() => {
    return ordens.filter(o => {
      if (filtroStatus !== 'todos' && o.status !== filtroStatus) return false
      if (filtroDataInicio && o.data_pedido < filtroDataInicio) return false
      if (filtroDataFim && o.data_pedido > filtroDataFim) return false
      return true
    })
  }, [ordens, filtroStatus, filtroDataInicio, filtroDataFim])

  const temFiltroExtra = filtroDataInicio || filtroDataFim

  // Totais KPI (sempre sobre todas as ordens, não filtradas)
  const totais = {
    solicitado: ordens.filter(o => o.status === 'solicitado').reduce((s: number, o: any) => s + (o.total ?? 0), 0),
    aprovado:   ordens.filter(o => o.status === 'aprovado').reduce((s: number, o: any) => s + (o.total ?? 0), 0),
    recebido:   ordens.filter(o => o.status === 'recebido').reduce((s: number, o: any) => s + (o.total ?? 0), 0),
  }

  // Seleção
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
      setSelecionados(new Set(filtered.map(o => o.id)))
    }
  }

  async function handleBulkStatus(status: string) {
    if (selecionados.size === 0) return
    setBulkLoading(true)
    const ids = Array.from(selecionados)
    await updateOrdensStatusBulk(ids, status)
    setOrdens(prev => prev.map(o => selecionados.has(o.id) ? { ...o, status } : o))
    setSelecionados(new Set())
    setBulkLoading(false)
  }

  async function handleStatus(id: string, newStatus: string) {
    setLoading(id)
    const dataRecebimento = newStatus === 'recebido' ? new Date().toISOString().split('T')[0] : undefined
    await updateOrdemStatus(id, newStatus, dataRecebimento)
    setOrdens(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, data_recebimento: dataRecebimento } : o))
    setLoading(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta ordem de compra?')) return
    await deleteOrdemCompra(id)
    setOrdens(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Aguardando aprovação', valor: totais.solicitado, count: ordens.filter(o => o.status === 'solicitado').length, color: 'text-amber-600' },
          { label: 'Aprovado / A receber',  valor: totais.aprovado,   count: ordens.filter(o => o.status === 'aprovado').length,   color: 'text-blue-600' },
          { label: 'Recebido no total',     valor: totais.recebido,   count: ordens.filter(o => o.status === 'recebido').length,   color: 'text-green-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">{k.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${k.color}`}>{fmt(k.valor)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.count} {k.count === 1 ? 'ordem' : 'ordens'}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Header: filtros de status + botão nova ordem */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1 flex-wrap">
              {(['todos', 'solicitado', 'aprovado', 'recebido', 'cancelado'] as const).map(s => (
                <button key={s} onClick={() => setFiltroStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filtroStatus === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}>
                  {s === 'todos' ? 'Todos' : STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus size={14} /> Nova ordem
            </button>
          </div>

          {/* Filtro data + checkbox selecionar todos */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Checkbox selecionar todos */}
            {filtered.length > 0 && (
              <label className="flex items-center gap-1.5 mr-1 cursor-pointer" title="Selecionar todos">
                <input type="checkbox"
                  checked={selecionados.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelecionarTodos}
                  className="w-3.5 h-3.5 accent-blue-600 cursor-pointer" />
                <span className="text-xs text-gray-400">Todos</span>
              </label>
            )}

            <Filter size={13} className="text-gray-400 shrink-0" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 shrink-0">De</span>
              <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 shrink-0">até</span>
              <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
            </div>

            {temFiltroExtra && (
              <button onClick={() => { setFiltroDataInicio(''); setFiltroDataFim('') }}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <X size={11} /> Limpar datas
              </button>
            )}

            <span className="ml-auto text-xs text-gray-400">{filtered.length} ordem{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Barra de ações em massa */}
        {selecionados.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-600 text-white px-5 py-3 flex-wrap">
            <CheckSquare size={16} className="shrink-0" />
            <span className="text-sm font-medium flex-1">
              {selecionados.size} selecionada{selecionados.size !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-blue-200">Alterar status:</span>
            {([
              { s: 'solicitado', label: 'Solicitado', cls: 'bg-amber-500 hover:bg-amber-400' },
              { s: 'aprovado',   label: 'Aprovado',   cls: 'bg-blue-400 hover:bg-blue-300' },
              { s: 'recebido',   label: 'Recebido',   cls: 'bg-green-500 hover:bg-green-400' },
              { s: 'cancelado',  label: 'Cancelado',  cls: 'bg-gray-500 hover:bg-gray-400' },
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

        {/* Lista de ordens */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingCart size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma ordem de compra</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((o: any) => (
              <div key={o.id}>
                <div className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 ${selecionados.has(o.id) ? 'bg-blue-50' : ''}`}>
                  {/* Checkbox */}
                  <input type="checkbox"
                    checked={selecionados.has(o.id)}
                    onChange={() => toggleSelecionado(o.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-3.5 h-3.5 accent-blue-600 shrink-0 cursor-pointer" />

                  {/* Linha clicável para expandir */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}>
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{o.descricao}</p>
                      <p className="text-xs text-gray-400">
                        {o.fornecedores?.nome ?? 'Sem fornecedor'}
                        {o.projetos_diario && ` · ${o.projetos_diario.nome}`}
                        {' · '}
                        {new Date(o.data_pedido + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-gray-800">{fmt(o.total ?? 0)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[o.status]?.color ?? ''}`}>
                        {STATUS_CONFIG[o.status]?.label}
                      </span>
                      {expandedId === o.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                  </div>
                </div>

                {expandedId === o.id && (
                  <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                    {o.itens_ordem_compra?.length > 0 && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left px-3 py-2 text-gray-500 font-medium">Item</th>
                              <th className="text-right px-3 py-2 text-gray-500 font-medium">Qtd</th>
                              <th className="text-right px-3 py-2 text-gray-500 font-medium">Vlr unit.</th>
                              <th className="text-right px-3 py-2 text-gray-500 font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {o.itens_ordem_compra.map((item: any) => (
                              <tr key={item.id}>
                                <td className="px-3 py-2 text-gray-700">{item.descricao}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{item.quantidade} {item.unidade ?? ''}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{fmt(item.valor_unitario)}</td>
                                <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt(item.valor_total)}</td>
                              </tr>
                            ))}
                            <tr className="bg-gray-50">
                              <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">Total</td>
                              <td className="px-3 py-2 text-right font-bold text-gray-900">{fmt(o.total ?? 0)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    {o.observacoes && (
                      <p className="mt-2 text-xs text-gray-500 italic">{o.observacoes}</p>
                    )}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {/* Editar — disponível enquanto não recebido/cancelado */}
                      {!['recebido', 'cancelado'].includes(o.status) && (
                        <button onClick={() => { setEditTarget(o); setExpandedId(null) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-medium">
                          <Pencil size={12} /> Editar
                        </button>
                      )}
                      {o.status === 'solicitado' && (
                        <button onClick={() => handleStatus(o.id, 'aprovado')} disabled={loading === o.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
                          <CheckCircle size={12} /> Aprovar
                        </button>
                      )}
                      {o.status === 'aprovado' && (
                        <button onClick={() => handleStatus(o.id, 'recebido')} disabled={loading === o.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">
                          <Package size={12} /> Marcar recebido
                        </button>
                      )}
                      {o.status === 'recebido' && o.lancamento_id && (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle size={12} /> Despesa lançada automaticamente
                        </span>
                      )}
                      {['solicitado', 'aprovado'].includes(o.status) && (
                        <button onClick={() => handleStatus(o.id, 'cancelado')} disabled={loading === o.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-500 hover:bg-gray-100 rounded-lg text-xs font-medium">
                          <XCircle size={12} /> Cancelar
                        </button>
                      )}
                      {o.status === 'cancelado' && (
                        <button onClick={() => handleDelete(o.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-100 text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium">
                          <Trash2 size={12} /> Excluir
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(showModal || editTarget) && (
        <OrdemCompraModal
          fornecedores={fornecedores}
          projetos={projetos}
          initial={editTarget ?? undefined}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSaved={ordem => {
            if (ordem) {
              const enriched = enriquecerOrdem(ordem, projetos)
              if (editTarget) {
                // Atualiza a ordem existente no estado
                setOrdens(prev => prev.map(o => o.id === enriched.id ? enriched : o))
              } else {
                // Adiciona nova ao topo
                setOrdens(prev => [enriched, ...prev])
              }
            }
            setShowModal(false)
            setEditTarget(null)
          }}
        />
      )}
    </div>
  )
}
