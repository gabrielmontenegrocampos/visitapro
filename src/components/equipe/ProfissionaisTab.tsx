'use client'

import { useState } from 'react'
import { Plus, Search, HardHat, Phone, MapPin, Pencil, Trash2, ChevronRight, UserCheck } from 'lucide-react'
import { deleteProfissional } from '@/app/(crm)/equipe/actions'
import ProfissionalModal from './ProfissionalModal'
import Link from 'next/link'

export interface Profissional {
  id: string
  nome: string
  tipo: 'clt' | 'autonomo' | 'terceirizado'
  especialidade: string
  cpf: string | null
  rg: string | null
  data_nascimento: string | null
  telefone: string | null
  email: string | null
  cep: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  banco: string | null
  agencia: string | null
  conta: string | null
  pix: string | null
  salario_base: number | null
  valor_diaria: number | null
  foto_url: string | null
  ativo: boolean
  observacoes: string | null
  created_at: string
}

const TIPO_LABEL = { clt: 'CLT', autonomo: 'Autônomo', terceirizado: 'Terceirizado' }
const TIPO_COLOR = {
  clt: 'bg-blue-100 text-blue-700',
  autonomo: 'bg-green-100 text-green-700',
  terceirizado: 'bg-orange-100 text-orange-700',
}

interface Props {
  profissionais: Profissional[]
}

export default function ProfissionaisTab({ profissionais: initial }: Props) {
  const [profissionais, setProfissionais] = useState(initial)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Profissional | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Profissional | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = profissionais.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.especialidade.toLowerCase().includes(search.toLowerCase())
    const matchTipo = !filtroTipo || p.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteProfissional(deleteTarget.id)
    setProfissionais(prev => prev.filter(p => p.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  function handleSaved(novo?: Profissional) {
    setShowModal(false)
    setEditTarget(null)
    window.location.reload()
  }

  const initials = (nome: string) => nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou especialidade..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1">
          {(['', 'clt', 'autonomo', 'terceirizado'] as const).map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                filtroTipo === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t === '' ? 'Todos' : TIPO_LABEL[t]}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
          <Plus size={15} />
          Novo profissional
        </button>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <HardHat size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum profissional encontrado</p>
          <button onClick={() => setShowModal(true)}
            className="mt-3 text-sm text-blue-600 hover:underline">
            Cadastrar primeiro profissional
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.nome}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {initials(p.nome)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.nome}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${TIPO_COLOR[p.tipo]}`}>
                        {TIPO_LABEL[p.tipo]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.especialidade}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {p.telefone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone size={11} className="shrink-0 text-gray-400" />
                      {p.telefone}
                    </div>
                  )}
                  {p.cidade && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin size={11} className="shrink-0 text-gray-400" />
                      {p.cidade}{p.estado ? `, ${p.estado}` : ''}
                    </div>
                  )}
                  {(p.salario_base || p.valor_diaria) && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <UserCheck size={11} className="shrink-0 text-gray-400" />
                      {p.salario_base
                        ? `Salário: ${p.salario_base.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                        : `Diária: ${p.valor_diaria?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center border-t border-gray-50 divide-x divide-gray-50">
                <Link href={`/equipe/profissionais/${p.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors rounded-bl-2xl font-medium">
                  Ver detalhes <ChevronRight size={12} />
                </Link>
                <button onClick={() => setEditTarget(p)}
                  className="p-2.5 hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => setDeleteTarget(p)}
                  className="p-2.5 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors rounded-br-2xl">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {(showModal || editTarget) && (
        <ProfissionalModal
          initial={editTarget ?? undefined}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSaved={handleSaved}
        />
      )}

      {/* Modal deletar */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Desativar profissional?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <strong>{deleteTarget.nome}</strong> será marcado como inativo. O histórico de pagamentos é mantido.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-sm font-medium">
                {deleting ? 'Desativando...' : 'Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
