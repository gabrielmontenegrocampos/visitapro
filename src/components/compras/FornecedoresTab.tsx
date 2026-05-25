'use client'

import { useState } from 'react'
import { Plus, Building2, Search, Phone, Mail, MapPin } from 'lucide-react'
import FornecedorModal from './FornecedorModal'

const CAT_CONFIG: Record<string, { label: string; color: string }> = {
  material:       { label: 'Material',      color: 'bg-blue-100 text-blue-700' },
  equipamento:    { label: 'Equipamento',    color: 'bg-purple-100 text-purple-700' },
  servico:        { label: 'Serviço',        color: 'bg-green-100 text-green-700' },
  subempreiteiro: { label: 'Subempreiteiro', color: 'bg-orange-100 text-orange-700' },
}

interface Props {
  fornecedores: any[]
}

export default function FornecedoresTab({ fornecedores: initial }: Props) {
  const [fornecedores, setFornecedores] = useState(initial)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const filtered = fornecedores.filter(
    f =>
      f.nome.toLowerCase().includes(search.toLowerCase()) ||
      (f.nome_fantasia ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (f.cidade ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar fornecedor..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setShowModal(true)
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={14} /> Novo fornecedor
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {search ? 'Nenhum resultado' : 'Nenhum fornecedor cadastrado'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((f: any) => (
              <div
                key={f.id}
                onClick={() => {
                  setEditing(f)
                  setShowModal(true)
                }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{f.nome}</p>
                    {f.nome_fantasia && f.nome_fantasia !== f.nome && (
                      <p className="text-xs text-gray-400">({f.nome_fantasia})</p>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        CAT_CONFIG[f.categoria]?.color ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {CAT_CONFIG[f.categoria]?.label ?? f.categoria}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-0.5">
                    {f.telefone && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone size={10} />
                        {f.telefone}
                      </span>
                    )}
                    {f.email && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Mail size={10} />
                        {f.email}
                      </span>
                    )}
                    {f.cidade && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin size={10} />
                        {f.cidade}
                        {f.estado ? `, ${f.estado}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                {f.cnpj_cpf && (
                  <p className="text-xs text-gray-400 shrink-0 hidden sm:block">{f.cnpj_cpf}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <FornecedorModal
          initial={editing}
          onClose={() => {
            setShowModal(false)
            setEditing(null)
          }}
          onSaved={saved => {
            if (editing) setFornecedores(prev => prev.map(f => (f.id === saved.id ? saved : f)))
            else setFornecedores(prev => [saved, ...prev])
            setShowModal(false)
            setEditing(null)
          }}
          onDeleted={id => {
            setFornecedores(prev => prev.filter(f => f.id !== id))
            setShowModal(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
