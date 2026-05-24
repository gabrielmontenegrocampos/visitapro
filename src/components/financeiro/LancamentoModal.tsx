'use client'

import { useState } from 'react'
import { X, AlertCircle, RefreshCw } from 'lucide-react'
import type { CategoriaFinanceira } from '@/types/database'
import { createLancamento, updateLancamento } from '@/app/(crm)/financeiro/actions'

interface Projeto {
  id: string
  nome: string
  proposals?: { value: number; title: string } | null
}

interface Props {
  categorias: CategoriaFinanceira[]
  projetos: Projeto[]
  onClose: () => void
  onSaved: () => void
  projetoIdFixo?: string   // quando aberto de dentro de uma obra
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

export default function LancamentoModal({ categorias, projetos, onClose, onSaved, initial, projetoIdFixo }: Props) {
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(initial?.tipo ?? 'despesa')
  const [divisao, setDivisao] = useState<'administracao' | 'obra'>(
    projetoIdFixo ? 'obra' : (initial?.divisao ?? 'administracao')
  )
  const [categoriaId, setCategoriaId] = useState(initial?.categoria_id ?? '')
  const [descricao, setDescricao] = useState(initial?.descricao ?? '')
  const [valor, setValor] = useState(initial ? String(initial.valor) : '')
  const [data, setData] = useState(initial?.data ?? new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<'pendente' | 'pago' | 'cancelado'>(initial?.status ?? 'pago')
  const [projetoId, setProjetoId] = useState(projetoIdFixo ?? initial?.projeto_id ?? '')
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? '')
  const [recorrente, setRecorrente] = useState(false)
  const [recorrenciaMeses, setRecorrenciaMeses] = useState(3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categsFiltradas = categorias.filter(c => c.tipo === tipo && c.divisao === divisao)

  // Projeto selecionado (para mostrar valor orçado)
  const projetoSelecionado = projetos.find(p => p.id === projetoId)

  async function handleSave() {
    if (!categoriaId || !descricao.trim() || !valor || !data) {
      setError('Preencha todos os campos obrigatórios')
      return
    }
    if (divisao === 'obra' && !projetoId) {
      setError('Selecione a obra vinculada ao lançamento')
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
      recorrente: !initial && recorrente,
      recorrenciaMeses: !initial && recorrente ? recorrenciaMeses : undefined,
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

          {/* Divisão (bloqueada se projetoIdFixo) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Divisão</label>
            <div className="grid grid-cols-2 gap-2">
              {(['administracao', 'obra'] as const).map(d => (
                <button key={d}
                  disabled={!!projetoIdFixo}
                  onClick={() => { setDivisao(d); setCategoriaId(''); if (d === 'administracao') setProjetoId('') }}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    divisao === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}>
                  {d === 'administracao' ? '🏢 Administração' : '👷 Obra'}
                </button>
              ))}
            </div>
          </div>

          {/* Projeto (obrigatório para obra) */}
          {divisao === 'obra' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Obra vinculada <span className="text-red-500">*</span>
              </label>
              {projetoIdFixo ? (
                // Projeto fixo (aberto de dentro da obra)
                <div className="w-full border border-blue-200 bg-blue-50 rounded-xl px-3 py-2.5 text-sm text-blue-800 font-medium">
                  👷 {projetoSelecionado?.nome}
                  {projetoSelecionado?.proposals?.value && (
                    <span className="ml-2 text-xs text-blue-500 font-normal">
                      Orçado: {projetoSelecionado.proposals.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <select value={projetoId} onChange={e => setProjetoId(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !projetoId ? 'border-amber-300' : 'border-gray-200'
                    }`}>
                    <option value="">Selecionar obra...</option>
                    {projetos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome}{p.proposals?.value ? ` — orçado: ${p.proposals.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                      </option>
                    ))}
                  </select>
                  {!projetoId && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> Obrigatório para rastrear custo por obra
                    </p>
                  )}
                  {projetos.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Nenhuma obra encontrada. <a href="/diario-obra" className="text-blue-600 underline">Criar obra</a>
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria <span className="text-red-500">*</span>
            </label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecionar categoria...</option>
              {categsFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {categsFiltradas.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Nenhuma categoria para {tipo}/{divisao === 'administracao' ? 'administração' : 'obra'}.{' '}
                <a href="/financeiro/categorias" className="underline">Criar categoria</a>
              </p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição <span className="text-red-500">*</span>
            </label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Pagamento fornecedor, Medição parcial..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor (R$) <span className="text-red-500">*</span>
              </label>
              <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data <span className="text-red-500">*</span>
              </label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'pago',      label: 'Pago',      cls: 'bg-green-600 text-white border-green-600' },
                { v: 'pendente',  label: 'Pendente',  cls: 'bg-amber-500 text-white border-amber-500' },
                { v: 'cancelado', label: 'Cancelado', cls: 'bg-gray-500 text-white border-gray-500'  },
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

          {/* Recorrência (só na criação) */}
          {!initial && (
            <div className={`rounded-xl border transition-colors ${recorrente ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
              <button
                type="button"
                onClick={() => setRecorrente(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${recorrente ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <RefreshCw size={15} className={recorrente ? 'text-white' : 'text-gray-500'} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${recorrente ? 'text-blue-800' : 'text-gray-700'}`}>
                    Repetir mensalmente
                  </p>
                  <p className="text-xs text-gray-400">
                    Cria lançamentos futuros automáticos com status pendente
                  </p>
                </div>
                <div className={`w-10 h-5 rounded-full transition-colors relative ${recorrente ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${recorrente ? 'left-5' : 'left-0.5'}`} />
                </div>
              </button>

              {recorrente && (
                <div className="px-4 pb-4 pt-1 border-t border-blue-100">
                  <label className="block text-xs font-medium text-blue-700 mb-2">Repetir por quantos meses?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 6, 12, 24].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setRecorrenciaMeses(m)}
                        className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                          recorrenciaMeses === m
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-blue-200 text-blue-700 bg-white hover:bg-blue-50'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Serão criados {recorrenciaMeses} lançamentos — o 1º com status <strong>{status}</strong>, os demais como <strong>pendente</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
              <AlertCircle size={14} />{error}
            </p>
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
