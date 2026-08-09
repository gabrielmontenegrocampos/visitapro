'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, AlertCircle, RefreshCw, Calendar, Info } from 'lucide-react'
import type { CategoriaFinanceira } from '@/types/database'
import { createLancamento, updateLancamento, garantirCategoriaParcelamento } from '@/app/(crm)/financeiro/actions'
import { maskCurrency, parseCurrency, initCurrency } from '@/lib/masks'
import SearchableSelect from '@/components/ui/SearchableSelect'

/** Retorna o 1º dia do mês seguinte à data informada (YYYY-MM-DD) */
function primeiroDiaProximoMes(refDate?: string): string {
  const d = refDate ? new Date(refDate + 'T12:00:00') : new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function formatMesAno(dateStr: string) {
  const [y, m] = dateStr.split('-')
  return `${MESES_PT[parseInt(m) - 1]}/${y}`
}

interface Projeto {
  id: string
  nome: string
  proposals?: { value: number; title: string } | null
}

interface Profissional {
  id: string
  nome: string
}

interface Props {
  categorias: CategoriaFinanceira[]
  projetos: Projeto[]
  profissionais?: Profissional[]
  onClose: () => void
  onSaved: () => void
  projetoIdFixo?: string         // quando aberto de dentro de uma obra
  defaultDivisao?: 'administracao' | 'obra'  // pré-seleciona a divisão
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
    profissional_id?: string | null
    observacoes: string | null
  }
}

export default function LancamentoModal({ categorias, projetos, profissionais = [], onClose, onSaved, initial, projetoIdFixo, defaultDivisao }: Props) {
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(initial?.tipo ?? 'despesa')
  const [divisao, setDivisao] = useState<'administracao' | 'obra'>(
    projetoIdFixo ? 'obra' : (initial?.divisao ?? defaultDivisao ?? 'administracao')
  )
  const [categoriaId, setCategoriaId] = useState(initial?.categoria_id ?? '')
  const [descricao, setDescricao] = useState(initial?.descricao ?? '')
  const [valor, setValor] = useState(initial ? initCurrency(initial.valor) : '')
  const [data, setData] = useState(initial?.data ?? new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<'pendente' | 'pago' | 'cancelado'>(initial?.status ?? 'pago')
  const [projetoId, setProjetoId] = useState(projetoIdFixo ?? initial?.projeto_id ?? '')
  const [profissionalId, setProfissionalId] = useState(initial?.profissional_id ?? '')
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? '')
  const [recorrente, setRecorrente] = useState(false)
  const [recorrenciaMeses, setRecorrenciaMeses] = useState(3)
  const [dataInicioParcelas, setDataInicioParcelas] = useState(() => primeiroDiaProximoMes())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [catLoading, setCatLoading] = useState(false)

  const categsFiltradas = categorias.filter(c => c.tipo === tipo && c.divisao === divisao)

  // Projeto selecionado (para mostrar valor orçado)
  const projetoSelecionado = projetos.find(p => p.id === projetoId)

  // Preview das parcelas
  const previewParcelas = useMemo(() => {
    if (!recorrente || recorrenciaMeses < 1) return []
    return Array.from({ length: Math.min(recorrenciaMeses, 6) }, (_, i) => {
      const d = new Date(dataInicioParcelas + 'T12:00:00')
      d.setMonth(d.getMonth() + i)
      return {
        num: i + 1,
        mes: formatMesAno(d.toISOString().split('T')[0]),
        valor: parseCurrency(valor),
      }
    })
  }, [recorrente, recorrenciaMeses, dataInicioParcelas, valor])

  // Quando ligar recorrência, atualiza dataInicioParcelas para próximo mês da data base
  useEffect(() => {
    if (recorrente) {
      setDataInicioParcelas(primeiroDiaProximoMes(data))
    }
  }, [recorrente, data])

  // Selecionar automaticamente categoria "Parcelamento de obra" quando disponível
  async function aplicarCategoriaParcelamento() {
    if (!categorias.find(c => c.nome === 'Parcelamento de obra' && c.tipo === 'receita' && c.divisao === 'obra')) {
      setCatLoading(true)
      const id = await garantirCategoriaParcelamento()
      setCatLoading(false)
      if (id) {
        setCategoriaId(id)
        setTipo('receita')
        setDivisao('obra')
        return
      }
    }
    const cat = categorias.find(c => c.nome === 'Parcelamento de obra' && c.tipo === 'receita' && c.divisao === 'obra')
    if (cat) { setCategoriaId(cat.id); setTipo('receita'); setDivisao('obra') }
  }

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
    const basePayload = {
      categoria_id: categoriaId,
      tipo,
      divisao,
      descricao: descricao.trim(),
      valor: parseCurrency(valor),
      data,
      status,
      projeto_id: divisao === 'obra' && projetoId ? projetoId : null,
      profissional_id: tipo === 'despesa' && profissionalId ? profissionalId : null,
      observacoes: observacoes.trim() || null,
    }
    const res = initial
      ? await updateLancamento(initial.id, basePayload)
      : await createLancamento({
          ...basePayload,
          recorrente,
          recorrenciaMeses: recorrente ? recorrenciaMeses : undefined,
          dataInicioParcelas: recorrente ? dataInicioParcelas : undefined,
        })
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
                  <SearchableSelect
                    value={projetoId}
                    onChange={setProjetoId}
                    placeholder="Selecionar obra..."
                    emptyMessage="Nenhuma obra encontrada"
                    className={!projetoId ? 'border-amber-300' : ''}
                    options={projetos.map(p => ({
                      value: p.id,
                      label: p.nome,
                      subtitle: p.proposals?.value
                        ? `Orçado: ${p.proposals.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                        : undefined,
                    }))}
                  />
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

          {/* Colaborador (mão de obra / pró-labore / diária) */}
          {tipo === 'despesa' && profissionais.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Colaborador <span className="text-gray-400 text-xs font-normal">(opcional)</span>
              </label>
              <SearchableSelect
                value={profissionalId}
                onChange={setProfissionalId}
                placeholder="Não vincular a um colaborador"
                options={profissionais.map(p => ({ value: p.id, label: p.nome }))}
              />
              <p className="text-xs text-gray-400 mt-1">
                Vincule pagamentos de mão de obra/pró-labore ao colaborador para aparecer no histórico dele em Equipe.
              </p>
            </div>
          )}

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={categoriaId}
              onChange={setCategoriaId}
              placeholder="Selecionar categoria..."
              emptyMessage={`Nenhuma categoria para ${tipo}/${divisao === 'administracao' ? 'administração' : 'obra'}`}
              options={categsFiltradas.map(c => ({ value: c.id, label: c.nome }))}
            />
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
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={valor}
                  onChange={e => setValor(maskCurrency(e.target.value))}
                  placeholder="0,00"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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

          {/* Parcelamento / Recorrência (só na criação) */}
          {!initial && (
            <div className={`rounded-xl border transition-colors ${recorrente ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200 bg-gray-50'}`}>
              {/* Toggle */}
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
                    Parcelamento mensal
                  </p>
                  <p className="text-xs text-gray-400">
                    Gera parcelas automáticas numeradas — Parcela 1/N, 2/N...
                  </p>
                </div>
                <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${recorrente ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${recorrente ? 'left-5' : 'left-0.5'}`} />
                </div>
              </button>

              {recorrente && (
                <div className="px-4 pb-5 pt-2 border-t border-blue-100 space-y-4">

                  {/* Sugestão de categoria */}
                  {tipo === 'receita' && divisao === 'obra' && (
                    <button
                      type="button"
                      onClick={aplicarCategoriaParcelamento}
                      disabled={catLoading}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs text-blue-700 font-medium hover:bg-blue-50 transition-colors"
                    >
                      <Info size={12} />
                      {catLoading ? 'Aplicando...' : 'Usar categoria "Parcelamento de obra"'}
                    </button>
                  )}

                  {/* Número de parcelas */}
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-2">Número de parcelas</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[3, 6, 10, 12, 18, 24].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setRecorrenciaMeses(m)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            recorrenciaMeses === m
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-blue-200 text-blue-700 bg-white hover:bg-blue-50'
                          }`}
                        >
                          {m}×
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={recorrenciaMeses}
                        onChange={e => setRecorrenciaMeses(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 border border-blue-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        title="Outro número"
                      />
                    </div>
                  </div>

                  {/* Data de início */}
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-1.5 flex items-center gap-1.5">
                      <Calendar size={11} />
                      Início das parcelas
                    </label>
                    <input
                      type="date"
                      value={dataInicioParcelas}
                      onChange={e => setDataInicioParcelas(e.target.value)}
                      className="border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <p className="text-xs text-blue-500 mt-1">
                      Padrão: 1º do mês seguinte ao lançamento
                    </p>
                  </div>

                  {/* Preview das parcelas */}
                  {previewParcelas.length > 0 && parseCurrency(valor) > 0 && (
                    <div>
                      <p className="text-xs font-medium text-blue-800 mb-2">Prévia das parcelas</p>
                      <div className="bg-white rounded-xl border border-blue-100 divide-y divide-blue-50 overflow-hidden">
                        {previewParcelas.map(p => (
                          <div key={p.num} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <span className="text-gray-500">
                              <span className="font-medium text-gray-700">Parcela {p.num}/{recorrenciaMeses}</span>
                              {' · '}{p.mes}
                            </span>
                            <span className="font-semibold text-blue-700">
                              {p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        ))}
                        {recorrenciaMeses > 6 && (
                          <div className="px-3 py-1.5 text-xs text-gray-400 text-center">
                            + {recorrenciaMeses - 6} parcelas adicionais
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 mt-2 font-medium">
                        Total:{' '}
                        {(parseCurrency(valor) * recorrenciaMeses).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  )}

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
