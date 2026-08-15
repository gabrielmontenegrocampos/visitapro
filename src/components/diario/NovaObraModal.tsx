'use client'

import { useState, useTransition } from 'react'
import { X, Plus, Loader2, Search, AlertCircle, HardHat } from 'lucide-react'
import { createProjeto, updateProjetoDetalhes } from '@/app/(crm)/diario-obra/actions'
import SearchableSelect from '@/components/ui/SearchableSelect'

const TIPO_OBRA_OPTIONS = [
  'Reforma', 'Construção', 'Pintura', 'Elétrica', 'Hidráulica',
  'Revestimento', 'Estrutural', 'Acabamento', 'Demolição', 'Outro',
]
const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
]
const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho', enviada: 'Enviada', aceita: 'Aceita',
  recusada: 'Recusada', expirada: 'Expirada',
}

interface ProposalOption {
  id: string; title: string; value: number; status: string
  leads: { name: string; company: string | null; phone: string | null } | null
}

interface Props {
  proposals: ProposalOption[]
  onClose: () => void
  onSuccess: (projetoId: string) => void
}

export default function NovaObraModal({ proposals, onClose, onSuccess }: Props) {
  const [proposalId, setProposalId] = useState('')
  const [nome, setNome] = useState('')
  const [tipoObra, setTipoObra] = useState('')
  const [status, setStatus] = useState('ativa')
  const [cep, setCep] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [artRrt, setArtRrt] = useState('')

  const [saving, startSave] = useTransition()
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')
  const [error, setError] = useState('')

  const sel = proposals.find(p => p.id === proposalId)

  async function buscarCep() {
    const cleaned = cep.replace(/\D/g, '')
    if (cleaned.length !== 8) { setCepError('CEP inválido'); return }
    setCepError(''); setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
      const data = await res.json()
      if (data.erro) { setCepError('CEP não encontrado') }
      else {
        setLogradouro(data.logradouro ?? '')
        setBairro(data.bairro ?? '')
        setCidade(data.localidade ?? '')
        setEstado(data.uf ?? '')
      }
    } catch { setCepError('Erro ao buscar CEP') }
    finally { setCepLoading(false) }
  }

  function handleSave() {
    if (!proposalId) { setError('Selecione uma proposta'); return }
    setError('')
    startSave(async () => {
      const titulo = nome.trim() || sel?.title || ''
      const res = await createProjeto(proposalId, titulo)
      if (res.error || !res.data) { setError(res.error ?? 'Erro ao criar obra'); return }

      const id = res.data.id
      await updateProjetoDetalhes(id, {
        titulo_publico: nome.trim() || undefined,
        tipo_obra: tipoObra || undefined,
        status_projeto: status,
        ativo: status === 'ativa',
        cep: cep.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2') || undefined,
        logradouro: logradouro.trim() || undefined,
        numero: numero.trim() || undefined,
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim() || undefined,
        cidade: cidade.trim() || undefined,
        estado: estado || undefined,
        data_inicio: dataInicio || null,
        data_previsao_fim: dataFim || null,
        responsavel_tecnico: responsavel.trim() || undefined,
        art_rrt: artRrt.trim() || undefined,
      })

      onSuccess(id)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()} />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl z-10 flex flex-col max-h-[92dvh]">

        {/* Handle mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Nova Obra</h2>
              <p className="text-xs text-gray-400">Preencha os dados da obra</p>
            </div>
          </div>
          <button onClick={() => !saving && onClose()}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo scrollável */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Proposta */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Proposta *</h3>
            <SearchableSelect
              value={proposalId}
              onChange={v => { setProposalId(v); setError('') }}
              placeholder="Selecione a proposta..."
              options={[
                { value: '', label: 'Selecione...' },
                ...proposals.map(p => {
                  const name = p.leads?.name ?? '—'
                  const company = p.leads?.company
                  return {
                    value: p.id,
                    label: `${name} — ${p.title} [${PROPOSAL_STATUS_LABELS[p.status] ?? p.status}]`,
                    subtitle: company ?? undefined,
                  }
                }),
              ]}
            />
            {proposals.length === 0 && (
              <p className="text-xs text-amber-600">Todas as propostas já possuem diário.</p>
            )}
            {sel && (
              <p className="text-xs text-gray-500">
                Cliente: <span className="font-medium text-gray-700">
                  {sel.leads?.company ?? sel.leads?.name}
                </span>
                {sel.leads?.company && sel.leads?.name !== sel.leads.company && (
                  <> · {sel.leads.name}</>
                )}
                {sel.value > 0 && <> · {sel.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>}
              </p>
            )}
          </section>

          {/* Identificação */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Identificação</h3>
            <div>
              <label className="label">Nome da obra</label>
              <input value={nome} onChange={e => setNome(e.target.value)}
                placeholder={sel?.title ?? 'Nome da obra (opcional)'}
                className="input" />
            </div>
            <div>
              <label className="label">Tipo de obra</label>
              <SearchableSelect
                value={tipoObra}
                onChange={setTipoObra}
                placeholder="Selecione..."
                options={TIPO_OBRA_OPTIONS.map(t => ({ value: t, label: t }))}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <div className="flex gap-2">
                {(['ativa', 'pausada', 'concluida'] as const).map(s => {
                  const labels = { ativa: 'Ativa', pausada: 'Pausada', concluida: 'Concluída' }
                  const activeColors = { ativa: 'bg-blue-900 text-white', pausada: 'bg-yellow-500 text-white', concluida: 'bg-gray-700 text-white' }
                  const dots = { ativa: 'bg-green-400', pausada: 'bg-yellow-300', concluida: 'bg-gray-400' }
                  const isSelected = status === s
                  return (
                    <button key={s} onClick={() => setStatus(s)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-sm font-medium transition-colors ${
                        isSelected ? activeColors[s] : 'bg-white text-gray-600 border border-gray-200'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? dots[s] : 'bg-gray-300'}`} />
                      {labels[s]}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Endereço */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Endereço</h3>
            <div>
              <label className="label">CEP</label>
              <div className="flex gap-2">
                <input value={cep}
                  onChange={e => setCep(e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9))}
                  onKeyDown={e => e.key === 'Enter' && buscarCep()}
                  placeholder="00000-000" className="input flex-1" maxLength={9} />
                <button onClick={buscarCep} disabled={cepLoading} className="btn-secondary px-3 shrink-0">
                  {cepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
            </div>
            <div>
              <label className="label">Logradouro</label>
              <input value={logradouro} onChange={e => setLogradouro(e.target.value)} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Número</label>
                <input value={numero} onChange={e => setNumero(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Complemento</label>
                <input value={complemento} onChange={e => setComplemento(e.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Bairro</label>
              <input value={bairro} onChange={e => setBairro(e.target.value)} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Cidade</label>
                <input value={cidade} onChange={e => setCidade(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Estado</label>
                <select value={estado} onChange={e => setEstado(e.target.value)} className="input">
                  <option value="">UF</option>
                  {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Datas */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Datas</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data de início</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Previsão de término</label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input" />
              </div>
            </div>
          </section>

          {/* Responsabilidade Técnica */}
          <section className="space-y-3 pb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Responsabilidade Técnica</h3>
            <div>
              <label className="label">Responsável técnico</label>
              <input value={responsavel} onChange={e => setResponsavel(e.target.value)}
                placeholder="Nome do responsável" className="input" />
            </div>
            <div>
              <label className="label">ART / RRT</label>
              <input value={artRrt} onChange={e => setArtRrt(e.target.value)}
                placeholder="Número da ART ou RRT" className="input" />
            </div>
          </section>
        </div>

        {/* Footer fixo */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-2">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => !saving && onClose()} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !proposalId}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Criando...' : 'Criar Obra'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
