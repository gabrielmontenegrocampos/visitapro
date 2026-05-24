'use client'

import { useState } from 'react'
import { X, AlertCircle, RefreshCw } from 'lucide-react'
import { createProfissional, updateProfissional } from '@/app/(crm)/equipe/actions'
import type { Profissional } from './ProfissionaisTab'

interface Props {
  initial?: Profissional
  onClose: () => void
  onSaved: (p?: any) => void
}

const ESPECIALIDADES = [
  'Pintor', 'Pedreiro', 'Eletricista', 'Encanador', 'Azulejista',
  'Gesseiro', 'Marceneiro', 'Serralheiro', 'Jardineiro', 'Encarregado',
  'Mestre de obras', 'Ajudante', 'Outro',
]

const TABS = ['Dados pessoais', 'Endereço', 'Financeiro'] as const
type Tab = typeof TABS[number]

export default function ProfissionalModal({ initial, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('Dados pessoais')

  // Dados pessoais
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [tipo, setTipo] = useState<'clt' | 'autonomo' | 'terceirizado'>(initial?.tipo ?? 'autonomo')
  const [especialidade, setEspecialidade] = useState(initial?.especialidade ?? '')
  const [cpf, setCpf] = useState(initial?.cpf ?? '')
  const [rg, setRg] = useState(initial?.rg ?? '')
  const [dataNasc, setDataNasc] = useState(initial?.data_nascimento ?? '')
  const [telefone, setTelefone] = useState(initial?.telefone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? '')

  // Endereço
  const [cep, setCep] = useState(initial?.cep ?? '')
  const [endereco, setEndereco] = useState(initial?.endereco ?? '')
  const [numero, setNumero] = useState(initial?.numero ?? '')
  const [complemento, setComplemento] = useState(initial?.complemento ?? '')
  const [bairro, setBairro] = useState(initial?.bairro ?? '')
  const [cidade, setCidade] = useState(initial?.cidade ?? '')
  const [estado, setEstado] = useState(initial?.estado ?? '')

  // Financeiro
  const [salarioBase, setSalarioBase] = useState(initial?.salario_base ? String(initial.salario_base) : '')
  const [valorDiaria, setValorDiaria] = useState(initial?.valor_diaria ? String(initial.valor_diaria) : '')
  const [banco, setBanco] = useState(initial?.banco ?? '')
  const [agencia, setAgencia] = useState(initial?.agencia ?? '')
  const [conta, setConta] = useState(initial?.conta ?? '')
  const [pix, setPix] = useState(initial?.pix ?? '')

  // Recorrência CLT
  const [criarSalarioRecorrente, setCriarSalarioRecorrente] = useState(false)
  const [mesesRecorrencia, setMesesRecorrencia] = useState(12)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!nome.trim()) { setError('Nome é obrigatório'); setTab('Dados pessoais'); return }
    if (!especialidade) { setError('Especialidade é obrigatória'); setTab('Dados pessoais'); return }

    setSaving(true)
    setError(null)

    const payload = {
      nome: nome.trim(),
      tipo,
      especialidade,
      cpf: cpf || null,
      rg: rg || null,
      data_nascimento: dataNasc || null,
      telefone: telefone || null,
      email: email || null,
      cep: cep || null,
      endereco: endereco || null,
      numero: numero || null,
      complemento: complemento || null,
      bairro: bairro || null,
      cidade: cidade || null,
      estado: estado || null,
      banco: banco || null,
      agencia: agencia || null,
      conta: conta || null,
      pix: pix || null,
      salario_base: salarioBase ? parseFloat(salarioBase) : null,
      valor_diaria: valorDiaria ? parseFloat(valorDiaria) : null,
      observacoes: observacoes || null,
    }

    if (initial) {
      const res = await updateProfissional(initial.id, payload)
      setSaving(false)
      if (res.error) { setError(res.error); return }
      onSaved()
    } else {
      const res = await createProfissional(payload)
      setSaving(false)
      if (res.error) { setError(res.error); return }

      // Se CLT + recorrência, cria lançamentos de salário
      if (tipo === 'clt' && criarSalarioRecorrente && salarioBase && res.id) {
        const { createLancamento } = await import('@/app/(crm)/financeiro/actions')
        const hoje = new Date().toISOString().split('T')[0]
        await createLancamento({
          categoria_id: '', // será preenchido depois
          tipo: 'despesa',
          divisao: 'administracao',
          descricao: `Salário — ${nome.trim()}`,
          valor: parseFloat(salarioBase),
          data: hoje,
          status: 'pendente',
          recorrente: true,
          recorrenciaMeses: mesesRecorrencia,
        })
      }

      onSaved()
    }
  }

  // Busca CEP
  async function handleCepBlur() {
    const c = cep.replace(/\D/g, '')
    if (c.length !== 8) return
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
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {initial ? 'Editar profissional' : 'Novo profissional'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Tab: Dados pessoais */}
          {tab === 'Dados pessoais' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['clt', 'autonomo', 'terceirizado'] as const).map(t => (
                  <button key={t} onClick={() => setTipo(t)}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      tipo === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {t === 'clt' ? 'CLT' : t === 'autonomo' ? 'Autônomo' : 'Terceirizado'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                <input value={nome} onChange={e => setNome(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade *</label>
                <select value={especialidade} onChange={e => setEspecialidade(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecionar...</option>
                  {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                  <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
                  <input value={rg} onChange={e => setRg(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
                  <input type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          )}

          {/* Tab: Endereço */}
          {tab === 'Endereço' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                  <input value={cep} onChange={e => setCep(e.target.value)} onBlur={handleCepBlur}
                    placeholder="00000-000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                  <input value={endereco} onChange={e => setEndereco(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                  <input value={numero} onChange={e => setNumero(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                  <input value={complemento} onChange={e => setComplemento(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input value={bairro} onChange={e => setBairro(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input value={cidade} onChange={e => setCidade(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <input value={estado} onChange={e => setEstado(e.target.value)} placeholder="SP" maxLength={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Financeiro */}
          {tab === 'Financeiro' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salário base (R$) {tipo === 'clt' && <span className="text-blue-600">CLT</span>}
                  </label>
                  <input type="number" min="0" step="0.01" value={salarioBase} onChange={e => setSalarioBase(e.target.value)}
                    placeholder="0,00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor diária (R$)</label>
                  <input type="number" min="0" step="0.01" value={valorDiaria} onChange={e => setValorDiaria(e.target.value)}
                    placeholder="0,00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                <input value={banco} onChange={e => setBanco(e.target.value)} placeholder="Ex: Caixa, Nubank, Itaú..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
                  <input value={agencia} onChange={e => setAgencia(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
                  <input value={conta} onChange={e => setConta(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIX</label>
                <input value={pix} onChange={e => setPix(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Recorrência CLT (só na criação) */}
              {!initial && tipo === 'clt' && salarioBase && (
                <div className={`rounded-xl border transition-colors ${criarSalarioRecorrente ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                  <button type="button" onClick={() => setCriarSalarioRecorrente(v => !v)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${criarSalarioRecorrente ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <RefreshCw size={15} className={criarSalarioRecorrente ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${criarSalarioRecorrente ? 'text-blue-800' : 'text-gray-700'}`}>
                        Criar lançamentos de salário automáticos
                      </p>
                      <p className="text-xs text-gray-400">
                        Gera despesas mensais de salário já agendadas
                      </p>
                    </div>
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${criarSalarioRecorrente ? 'bg-blue-600' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${criarSalarioRecorrente ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </button>
                  {criarSalarioRecorrente && (
                    <div className="px-4 pb-4 pt-1 border-t border-blue-100">
                      <label className="block text-xs font-medium text-blue-700 mb-2">Por quantos meses?</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[3, 6, 12, 24].map(m => (
                          <button key={m} type="button" onClick={() => setMesesRecorrencia(m)}
                            className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                              mesesRecorrencia === m
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-blue-200 text-blue-700 bg-white hover:bg-blue-50'
                            }`}>
                            {m}m
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
              <AlertCircle size={14} />{error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors">
            {saving ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar profissional'}
          </button>
        </div>
      </div>
    </div>
  )
}
