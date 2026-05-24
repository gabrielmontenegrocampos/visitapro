'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import type { CategoriaFinanceira } from '@/types/database'
import { createCategoria, updateCategoria, deleteCategoria } from '@/app/(crm)/financeiro/actions'

interface Props {
  categorias: CategoriaFinanceira[]
  canEdit: boolean
}

const DIVISAO_LABEL = { administracao: 'Administração', obra: 'Obra' }
const TIPO_LABEL = { receita: 'Receita', despesa: 'Despesa' }

export default function CategoriasClient({ categorias: initial, canEdit }: Props) {
  const [categorias, setCategorias] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<CategoriaFinanceira | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CategoriaFinanceira | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa')
  const [divisao, setDivisao] = useState<'administracao' | 'obra'>('administracao')

  function openCreate() {
    setNome(''); setTipo('despesa'); setDivisao('administracao')
    setEditTarget(null); setError(null); setShowModal(true)
  }

  function openEdit(c: CategoriaFinanceira) {
    setNome(c.nome); setTipo(c.tipo); setDivisao(c.divisao)
    setEditTarget(c); setError(null); setShowModal(true)
  }

  async function handleSave() {
    if (!nome.trim()) { setError('Informe um nome'); return }
    setSaving(true); setError(null)
    const res = editTarget
      ? await updateCategoria(editTarget.id, { nome: nome.trim(), tipo, divisao })
      : await createCategoria({ nome: nome.trim(), tipo, divisao })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setShowModal(false)
    window.location.reload()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteCategoria(deleteTarget.id)
    setCategorias(prev => prev.filter(c => c.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  // Agrupa por divisão > tipo
  const grupos = [
    { divisao: 'administracao' as const, tipo: 'receita' as const, label: 'Administração — Receitas' },
    { divisao: 'administracao' as const, tipo: 'despesa' as const, label: 'Administração — Despesas' },
    { divisao: 'obra' as const, tipo: 'receita' as const, label: 'Obra — Receitas' },
    { divisao: 'obra' as const, tipo: 'despesa' as const, label: 'Obra — Despesas' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/financeiro" className="text-sm text-gray-500 hover:text-gray-700">← Financeiro</Link>
          <h1 className="text-xl font-bold text-gray-900">Categorias</h1>
        </div>
        {canEdit && (
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
            <Plus size={15} />
            Nova categoria
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grupos.map(g => {
          const items = categorias.filter(c => c.divisao === g.divisao && c.tipo === g.tipo)
          return (
            <div key={`${g.divisao}-${g.tipo}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">{g.label}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  g.tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">Nenhuma categoria</p>
              ) : (
                <div className="space-y-1.5">
                  {items.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
                      <span className="text-sm text-gray-700">{c.nome}</span>
                      {canEdit && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(c)}
                            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => setDeleteTarget(c)}
                            className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal criar/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">
                {editTarget ? 'Editar categoria' : 'Nova categoria'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Salários, Material de construção..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['receita', 'despesa'] as const).map(t => (
                    <button key={t} onClick={() => setTipo(t)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        tipo === t
                          ? t === 'receita' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {TIPO_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Divisão</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['administracao', 'obra'] as const).map(d => (
                    <button key={d} onClick={() => setDivisao(d)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        divisao === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {DIVISAO_LABEL[d]}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium">
                {saving ? 'Salvando...' : editTarget ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal deletar */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Excluir categoria?</h3>
            <p className="text-sm text-gray-500 mb-5">
              "<strong>{deleteTarget.nome}</strong>" será desativada. Lançamentos existentes não serão afetados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-sm font-medium">
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
