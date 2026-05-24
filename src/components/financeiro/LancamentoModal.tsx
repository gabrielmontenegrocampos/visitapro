'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { CategoriaFinanceira } from '@/types/database'
import { createLancamento, updateLancamento } from '@/app/(crm)/financeiro/actions'

interface Props {
  categorias: CategoriaFinanceira[]
  projetos: { id: string; nome: string }[]
  onClose: () => void
  onSaved: () => void
  initial?: {
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
  }
}

export default function LancamentoModal({ categorias, projetos, onClose, onSaved, initial }: Props) {
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(initial?.tipo ?? 'despesa')
  const [divisao, setDivisao] = useState<'administracao' | 'obra'>(initial?.divisao ?? 'administracao')
  const [categoriaId, setCategoriaId] = useState(initial?.categoria_id ?? '')
  const [descricao, setDescricao] = useState(initial?.descricao ?? '')
  const [valor, setValor] = useState(initial ? String(initial.valor) : '')
  const [data, setData] = useState(initial?.data ?? new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<'pendente' | 'pago' | 'cancelado'>(initial?.status ?? 'pago')
  const [projetoId, setProjetoId] = useState(initial?.projeto_id ?? '')
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categsFiltradas = categorias.filter(c => c.tipo === tipo && c.divisao === divisao)

  async function handleSave() {
    if (!categoriaId || !descricao.trim() || !valor || !data) {
      setError('Preencha todos os campos obrigatórios')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      categoria_id: categoriaId,
      tipo,
      divisao,
      descricao: descricao.trim(),
      valor: parseFloat(valor.replace(',', '.')),
      data,
      status,
      projeto_id: divisao === 'obra' && projetoId ? projetoId : null,
      observacoes: observacoes.trim() || null,
    }
    const res = initial
      ? await updateLancamento(initial.id, payload)
      : await createLancamento(payload)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {initial ? 'Editar lançamento' : 'Novo lançamento'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['receita', 'despesa'] as const).map(t => (
                <button key={t} onClick={() => { setTipo(t); setCategoriaId('') }}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    tipo === t
                      ? t === 'receita' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
                </button>
              ))}
            </div>
          </div>

          {/* Divisão */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Divisão</label>
            <div className="grid grid-cols-2 gap-2">
              {(['administracao', 'obra'] as const).map(d => (
                <button key={d} onClick={() => { setDivisao(d); setCategoriaId('') }}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    divisao === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {d === 'administracao' ? 'Administração' : 'Obra'}
                </button>
              ))}
            </div>
          </div>

          {/* Projeto (só para obras) */}
          {divisao === 'obra' && projetos.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Projeto (opcional)</label>
              <select value={projetoId} onChange={e => setProjetoId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecionar projeto...</option>
                {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          )}

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecionar categoria...</option>
              {categsFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {categsFiltradas.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Nenhuma categoria para {tipo} / {divisao === 'administracao' ? 'administração' : 'obra'}. <a href="/financeiro/categorias" className="underline">Criar categoria</a></p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Pagamento fornecedor X"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
              <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'pago', label: 'Pago', cls: 'bg-green-600 text-white border-green-600' },
                { v: 'pendente', label: 'Pendente', cls: 'bg-amber-500 text-white border-amber-500' },
                { v: 'cancelado', label: 'Cancelado', cls: 'bg-gray-500 text-white border-gray-500' },
              ] as const).map(s => (
                <button key={s.v} onClick={() => setStatus(s.v)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                    status === s.v ? s.cls : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
              rows={2} placeholder="Notas adicionais..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors">
            {saving ? 'Salvando...' : initial ? 'Salvar' : 'Criar lançamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
