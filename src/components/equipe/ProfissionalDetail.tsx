'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  ChevronRight, Phone, Mail, MapPin, CreditCard, HardHat,
  Calendar, ArrowDownRight, Plus, Camera, Pencil, CheckCircle, XCircle,
} from 'lucide-react'
import { uploadFotoProfissional, vincularProfissionalObra, encerrarVinculoObra } from '@/app/(crm)/equipe/actions'
import ProfissionalModal from './ProfissionalModal'
import type { Profissional } from './ProfissionaisTab'

const TIPO_LABEL = { clt: 'CLT', autonomo: 'Autônomo', terceirizado: 'Terceirizado' }
const TIPO_COLOR = {
  clt: 'bg-blue-100 text-blue-700',
  autonomo: 'bg-green-100 text-green-700',
  terceirizado: 'bg-orange-100 text-orange-700',
}

const TIPO_PAG_LABEL: Record<string, string> = {
  salario: 'Salário', producao: 'Produção', adiantamento: 'Adiantamento',
  ferias: 'Férias', decimo_terceiro: '13º Salário', vale_transporte: 'Vale Transporte',
  vale_alimentacao: 'Vale Alimentação', rescisao: 'Rescisão', outros: 'Outros',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  prof: Profissional
  obras: any[]
  pagamentos: any[]
  projetos: { id: string; nome: string }[]
}

export default function ProfissionalDetail({ prof: initial, obras: initialObras, pagamentos, projetos }: Props) {
  const [prof, setProf] = useState(initial)
  const [obras, setObras] = useState(initialObras)
  const [showEdit, setShowEdit] = useState(false)
  const [showVincular, setShowVincular] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoUrl, setFotoUrl] = useState(initial.foto_url ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  // Vincular obra form
  const [projetoId, setProjetoId] = useState('')
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0])
  const [funcao, setFuncao] = useState('')
  const [vinculando, setVinculando] = useState(false)

  const initials = prof.nome.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  const totalPago = pagamentos
    .filter(p => p.status === 'pago')
    .reduce((s: number, p: any) => s + Number(p.valor), 0)
  const totalPendente = pagamentos
    .filter(p => p.status === 'pendente')
    .reduce((s: number, p: any) => s + Number(p.valor), 0)

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFoto(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadFotoProfissional(prof.id, fd)
    setUploadingFoto(false)
    if (res.url) setFotoUrl(res.url)
  }

  async function handleVincular() {
    if (!projetoId) return
    setVinculando(true)
    await vincularProfissionalObra({
      profissional_id: prof.id,
      projeto_id: projetoId,
      data_entrada: dataEntrada,
      funcao: funcao || null,
    })
    setVinculando(false)
    setShowVincular(false)
    window.location.reload()
  }

  async function handleEncerrar(vinculoId: string) {
    await encerrarVinculoObra(vinculoId, new Date().toISOString().split('T')[0])
    setObras(prev => prev.map(o => o.id === vinculoId ? { ...o, data_saida: new Date().toISOString().split('T')[0] } : o))
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/equipe" className="hover:text-gray-700">Equipe</Link>
        <ChevronRight size={14} />
        <Link href="/equipe?tab=colaboradores" className="hover:text-gray-700">Colaboradores</Link>
        <ChevronRight size={14} />
        <span className="text-gray-800 font-medium">{prof.nome}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Foto */}
          <div className="relative shrink-0">
            {fotoUrl ? (
              <img src={fotoUrl} alt={prof.nome}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-100" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-2xl border-2 border-gray-100">
                {initials}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} disabled={uploadingFoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md">
              <Camera size={13} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{prof.nome}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{prof.especialidade}</p>
                <span className={`inline-block mt-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${TIPO_COLOR[prof.tipo]}`}>
                  {TIPO_LABEL[prof.tipo]}
                </span>
              </div>
              <button onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors">
                <Pencil size={14} /> Editar
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-4">
              {prof.telefone && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone size={13} className="text-gray-400" />{prof.telefone}
                </div>
              )}
              {prof.email && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Mail size={13} className="text-gray-400" />{prof.email}
                </div>
              )}
              {prof.cidade && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin size={13} className="text-gray-400" />{prof.cidade}{prof.estado ? `, ${prof.estado}` : ''}
                </div>
              )}
              {prof.cpf && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <CreditCard size={13} className="text-gray-400" />CPF: {prof.cpf}
                </div>
              )}
            </div>

            {/* PIX / Banco */}
            {(prof.pix || prof.banco) && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                {prof.pix && <span>PIX: <strong className="text-gray-600">{prof.pix}</strong></span>}
                {prof.banco && <span>Banco: <strong className="text-gray-600">{prof.banco}{prof.agencia ? ` ag. ${prof.agencia}` : ''}{prof.conta ? ` c. ${prof.conta}` : ''}</strong></span>}
              </div>
            )}
          </div>
        </div>

        {/* KPIs de pagamento */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Total pago</p>
            <p className="text-lg font-bold text-green-600">{fmt(totalPago)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">A pagar (pendente)</p>
            <p className="text-lg font-bold text-amber-600">{fmt(totalPendente)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Obras vinculadas</p>
            <p className="text-lg font-bold text-gray-800">{obras.length}</p>
          </div>
        </div>
      </div>

      {/* Obras vinculadas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <HardHat size={16} className="text-orange-500" /> Obras vinculadas
          </h2>
          <button onClick={() => setShowVincular(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            <Plus size={12} /> Vincular obra
          </button>
        </div>

        {obras.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhuma obra vinculada</p>
        ) : (
          <div className="space-y-2">
            {obras.map((o: any) => (
              <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                  <HardHat size={14} className="text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{o.projetos_diario?.nome}</p>
                  <p className="text-xs text-gray-400">
                    {o.funcao && <>{o.funcao} · </>}
                    Entrada: {new Date(o.data_entrada + 'T12:00:00').toLocaleDateString('pt-BR')}
                    {o.data_saida && ` · Saída: ${new Date(o.data_saida + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
                {!o.data_saida ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Ativo</span>
                    <button onClick={() => handleEncerrar(o.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                      Encerrar
                    </button>
                  </div>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium shrink-0">Encerrado</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Form vincular obra */}
        {showVincular && (
          <div className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-xl space-y-3">
            <p className="text-sm font-medium text-blue-800">Vincular a uma obra</p>
            <select value={projetoId} onChange={e => setProjetoId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Selecionar obra...</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data de entrada</label>
                <input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Função na obra</label>
                <input value={funcao} onChange={e => setFuncao(e.target.value)} placeholder="Ex: Pintor, Ajudante..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowVincular(false)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 bg-white">
                Cancelar
              </button>
              <button onClick={handleVincular} disabled={!projetoId || vinculando}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium">
                {vinculando ? 'Vinculando...' : 'Vincular'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Histórico de pagamentos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Histórico de pagamentos</h2>
          <Link href={`/financeiro/lancamentos`}
            className="text-xs text-blue-600 hover:underline">
            Novo pagamento →
          </Link>
        </div>

        {pagamentos.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Nenhum pagamento registrado</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {pagamentos.map((p: any) => (
              <div key={p.id} className={`flex items-center gap-3 px-5 py-3 ${p.status === 'cancelado' ? 'opacity-40' : ''}`}>
                <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <ArrowDownRight size={13} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.descricao}</p>
                  <p className="text-xs text-gray-400">
                    {p.categorias_financeiras?.nome}
                    {p.projetos_diario && ` · ${p.projetos_diario.nome}`}
                    {' · '}{new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-red-500">-{fmt(p.valor)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    p.status === 'pago' ? 'bg-green-100 text-green-700' :
                    p.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-400'
                  }`}>{p.status === 'pago' ? 'Pago' : p.status === 'pendente' ? 'Pendente' : 'Cancelado'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEdit && (
        <ProfissionalModal
          initial={prof}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); window.location.reload() }}
        />
      )}
    </div>
  )
}
