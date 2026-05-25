'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { createFornecedor, updateFornecedor, deleteFornecedor } from '@/app/(crm)/compras/actions'

const CATEGORIAS = [
  { value: 'material',       label: 'Fornecedor de Material' },
  { value: 'equipamento',    label: 'Locadora de Equipamentos' },
  { value: 'servico',        label: 'Prestador de Serviço' },
  { value: 'subempreiteiro', label: 'Subempreiteiro' },
]

interface Props {
  initial?: any
  onClose: () => void
  onSaved: (f: any) => void
  onDeleted?: (id: string) => void
}

export default function FornecedorModal({ initial, onClose, onSaved, onDeleted }: Props) {
  const [tab, setTab] = useState<'dados' | 'endereco'>('dados')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [error, setError] = useState('')

  const [nome, setNome] = useState(initial?.nome ?? '')
  const [nomeFantasia, setNomeFantasia] = useState(initial?.nome_fantasia ?? '')
  const [cnpjCpf, setCnpjCpf] = useState(initial?.cnpj_cpf ?? '')
  const [categoria, setCategoria] = useState(initial?.categoria ?? 'material')
  const [responsavel, setResponsavel] = useState(initial?.responsavel ?? '')
  const [telefone, setTelefone] = useState(initial?.telefone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [site, setSite] = useState(initial?.site ?? '')
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? '')
  const [cep, setCep] = useState(initial?.cep ?? '')
  const [endereco, setEndereco] = useState(initial?.endereco ?? '')
  const [numero, setNumero] = useState(initial?.numero ?? '')
  const [complemento, setComplemento] = useState(initial?.complemento ?? '')
  const [bairro, setBairro] = useState(initial?.bairro ?? '')
  const [cidade, setCidade] = useState(initial?.cidade ?? '')
  const [estado, setEstado] = useState(initial?.estado ?? '')
  const [formaPagamento, setFormaPagamento] = useState(initial?.forma_pagamento ?? '')
  const [prazoPagamento, setPrazoPagamento] = useState(initial?.prazo_pagamento ?? '')
  const [pix, setPix] = useState(initial?.pix ?? '')

  async function handleCepBlur() {
    const c = cep.replace(/\D/g, '')
    if (c.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${c}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setEndereco(data.logradouro ?? '')
        setBairro(data.bairro ?? '')
        setCidade(data.localidade ?? '')
        setEstado(data.uf ?? '')
      }
    } catch {}
    setCepLoading(false)
  }

  async function handleSave() {
    if (!nome.trim()) {
      setError('Nome é obrigatório')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      nome: nome.trim(),
      nome_fantasia: nomeFantasia || undefined,
      cnpj_cpf: cnpjCpf || undefined,
      categoria,
      responsavel: responsavel || undefined,
      telefone: telefone || undefined,
      email: email || undefined,
      site: site || undefined,
      observacoes: observacoes || undefined,
      cep: cep || undefined,
      endereco: endereco || undefined,
      numero: numero || undefined,
      complemento: complemento || undefined,
      bairro: bairro || undefined,
      cidade: cidade || undefined,
      estado: estado || undefined,
      forma_pagamento: formaPagamento || undefined,
      prazo_pagamento: prazoPagamento || undefined,
      pix: pix || undefined,
    }
    if (initial) {
      const res = await updateFornecedor(initial.id, payload)
      setSaving(false)
      if (res.error) {
        setError(res.error)
        return
      }
      onSaved({ ...initial, ...payload })
    } else {
      const res = await createFornecedor(payload as any)
      setSaving(false)
      if (res.error) {
        setError(res.error)
        return
      }
      if (res.data) onSaved(res.data)
    }
  }

  async function handleDelete() {
    if (!initial || !confirm(`Excluir fornecedor "${initial.nome}"?`)) return
    setDeleting(true)
    await deleteFornecedor(initial.id)
    setDeleting(false)
    onDeleted?.(initial.id)
  }

  const inputCls =
    'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-900">
            {initial ? 'Editar fornecedor' : 'Novo fornecedor'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4">
          {(['dados', 'endereco'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t === 'dados' ? 'Dados' : 'Endereço e Financeiro'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {tab === 'dados' && (
            <>
              <div>
                <label className={labelCls}>Nome / Razão Social *</label>
                <input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nome fantasia</label>
                  <input
                    value={nomeFantasia}
                    onChange={e => setNomeFantasia(e.target.value)}
                    placeholder="Apelido"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>CNPJ / CPF</label>
                  <input
                    value={cnpjCpf}
                    onChange={e => setCnpjCpf(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Categoria *</label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className={inputCls + ' bg-white'}
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Responsável</label>
                  <input
                    value={responsavel}
                    onChange={e => setResponsavel(e.target.value)}
                    placeholder="Nome do contato"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Telefone</label>
                  <input
                    value={telefone}
                    onChange={e => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>E-mail</label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@empresa.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Site</label>
                  <input
                    value={site}
                    onChange={e => setSite(e.target.value)}
                    placeholder="www.empresa.com"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Observações</label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Notas internas sobre este fornecedor..."
                  className={inputCls + ' resize-none'}
                />
              </div>
            </>
          )}

          {tab === 'endereco' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>CEP</label>
                  <input
                    value={cep}
                    onChange={e => setCep(e.target.value)}
                    onBlur={handleCepBlur}
                    placeholder={cepLoading ? 'Buscando...' : '00000-000'}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Endereço</label>
                  <input
                    value={endereco}
                    onChange={e => setEndereco(e.target.value)}
                    placeholder="Rua, Av..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Número</label>
                  <input
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    placeholder="Nº"
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Complemento</label>
                  <input
                    value={complemento}
                    onChange={e => setComplemento(e.target.value)}
                    placeholder="Sala, Galpão..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Bairro</label>
                  <input
                    value={bairro}
                    onChange={e => setBairro(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Cidade</label>
                  <input
                    value={cidade}
                    onChange={e => setCidade(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Estado</label>
                  <input
                    value={estado}
                    onChange={e => setEstado(e.target.value)}
                    placeholder="SP"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Informações financeiras
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Forma de pagamento</label>
                    <select
                      value={formaPagamento}
                      onChange={e => setFormaPagamento(e.target.value)}
                      className={inputCls + ' bg-white'}
                    >
                      <option value="">Não definido</option>
                      <option value="pix">Pix</option>
                      <option value="boleto">Boleto</option>
                      <option value="cartao">Cartão</option>
                      <option value="dinheiro">Dinheiro</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Prazo de pagamento</label>
                    <select
                      value={prazoPagamento}
                      onChange={e => setPrazoPagamento(e.target.value)}
                      className={inputCls + ' bg-white'}
                    >
                      <option value="">Não definido</option>
                      <option value="avista">À vista</option>
                      <option value="7d">7 dias</option>
                      <option value="14d">14 dias</option>
                      <option value="28d">28 dias</option>
                      <option value="30d">30 dias</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Chave Pix</label>
                    <input
                      value={pix}
                      onChange={e => setPix(e.target.value)}
                      placeholder="CPF, CNPJ, e-mail ou chave aleatória"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          {initial && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2.5 border border-red-100 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
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
            {saving ? 'Salvando...' : initial ? 'Salvar' : 'Criar fornecedor'}
          </button>
        </div>
      </div>
    </div>
  )
}
