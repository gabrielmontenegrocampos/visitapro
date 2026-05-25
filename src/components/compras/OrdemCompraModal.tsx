'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { createOrdemCompra } from '@/app/(crm)/compras/actions'

interface ItemForm {
  descricao: string
  quantidade: string
  unidade: string
  valor_unitario: string
}

interface Props {
  fornecedores: any[]
  projetos: { id: string; nome: string }[]
  onClose: () => void
  onSaved: (nova: any) => void
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function OrdemCompraModal({ fornecedores, projetos, onClose, onSaved }: Props) {
  const [descricao, setDescricao] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [projetoId, setProjetoId] = useState('')
  const [dataPedido, setDataPedido] = useState(new Date().toISOString().split('T')[0])
  const [dataEntrega, setDataEntrega] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens] = useState<ItemForm[]>([
    { descricao: '', quantidade: '1', unidade: '', valor_unitario: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addItem() {
    setItens(prev => [...prev, { descricao: '', quantidade: '1', unidade: '', valor_unitario: '' }])
  }

  function removeItem(i: number) {
    setItens(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof ItemForm, value: string) {
    setItens(prev => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)))
  }

  const total = itens.reduce((s, i) => {
    const qty = parseFloat(i.quantidade) || 0
    const val = parseFloat(i.valor_unitario.replace(',', '.')) || 0
    return s + qty * val
  }, 0)

  async function handleSave() {
    if (!descricao.trim()) {
      setError('Informe uma descrição para a ordem')
      return
    }
    const itensValidos = itens.filter(i => i.descricao.trim())
    if (itensValidos.length === 0) {
      setError('Adicione pelo menos 1 item')
      return
    }
    setSaving(true)
    setError('')
    const res = await createOrdemCompra({
      descricao: descricao.trim(),
      fornecedor_id: fornecedorId || undefined,
      projeto_id: projetoId || undefined,
      data_pedido: dataPedido,
      data_entrega_prevista: dataEntrega || undefined,
      forma_pagamento: formaPagamento || undefined,
      observacoes: observacoes || undefined,
      itens: itensValidos.map(i => ({
        descricao: i.descricao.trim(),
        quantidade: parseFloat(i.quantidade) || 1,
        unidade: i.unidade || undefined,
        valor_unitario: parseFloat(i.valor_unitario.replace(',', '.')) || 0,
      })),
    })
    setSaving(false)
    if (res.error) {
      setError(res.error)
      return
    }
    onSaved(res.data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-900">Nova Ordem de Compra</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Descrição da compra *
            </label>
            <input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Materiais para acabamento — 2º andar"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Fornecedor</label>
              <select
                value={fornecedorId}
                onChange={e => setFornecedorId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecionar...</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Obra vinculada
              </label>
              <select
                value={projetoId}
                onChange={e => setProjetoId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Administração geral</option>
                {projetos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Data do pedido
              </label>
              <input
                type="date"
                value={dataPedido}
                onChange={e => setDataPedido(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Entrega prevista
              </label>
              <input
                type="date"
                value={dataEntrega}
                onChange={e => setDataEntrega(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Forma de pagamento
            </label>
            <select
              value={formaPagamento}
              onChange={e => setFormaPagamento(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Não informado</option>
              <option value="pix">Pix</option>
              <option value="boleto">Boleto</option>
              <option value="cartao">Cartão</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Itens da compra *</label>
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus size={12} /> Adicionar item
              </button>
            </div>
            <div className="space-y-2">
              {itens.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <input
                      value={item.descricao}
                      onChange={e => updateItem(i, 'descricao', e.target.value)}
                      placeholder="Descrição do item"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      value={item.quantidade}
                      onChange={e => updateItem(i, 'quantidade', e.target.value)}
                      placeholder="Qtd"
                      type="number"
                      min="0"
                      step="any"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      value={item.unidade}
                      onChange={e => updateItem(i, 'unidade', e.target.value)}
                      placeholder="un, m²"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      value={item.valor_unitario}
                      onChange={e => updateItem(i, 'valor_unitario', e.target.value)}
                      placeholder="R$ unit."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center pt-2">
                    {itens.length > 1 && (
                      <button
                        onClick={() => removeItem(i)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {total > 0 && (
              <div className="mt-3 flex justify-end">
                <div className="bg-gray-50 rounded-xl px-4 py-2 text-sm">
                  <span className="text-gray-500">Total: </span>
                  <span className="font-bold text-gray-900">{fmt(total)}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Observações</label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Instruções de entrega, referências, etc."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 bg-white font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium"
          >
            {saving ? 'Criando...' : 'Criar ordem'}
          </button>
        </div>
      </div>
    </div>
  )
}
