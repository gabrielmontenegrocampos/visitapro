'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Users, Calendar, UserCheck, UserX, Plus, Pencil, X,
  Loader2, CheckCircle, Phone, Trash2, AlertTriangle, Shield, HardHat,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { maskPhone } from '@/lib/masks'
import { ROLE_LABELS, ROLE_COLORS, type AppRole } from '@/lib/roles'
import { createMembro, updateMembro, deleteMembro } from '@/app/(crm)/equipe/actions'
import SearchableSelect from '@/components/ui/SearchableSelect'
import type { Profile } from '@/types/database'
import ProfissionaisTab from './ProfissionaisTab'
import type { Profissional } from './ProfissionaisTab'

type ProfileWithCounts = Profile & { leadsCount: number; visitsCount: number }

const ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin',       label: 'Administrador', description: 'Acesso total ao sistema' },
  { value: 'gerente',     label: 'Gerente',        description: 'Tudo exceto gestão de usuários' },
  { value: 'vendedor',    label: 'Vendedor',        description: 'Pipeline, leads, agenda e propostas' },
  { value: 'financeiro',  label: 'Financeiro',      description: 'Módulo financeiro e propostas (leitura)' },
  { value: 'encarregado', label: 'Encarregado',     description: 'Diário de obra e propostas (leitura)' },
]

const emptyNew = { email: '', full_name: '', phone: '', role: 'vendedor' as AppRole, password: '' }
const emptyEdit = { full_name: '', phone: '', role: 'vendedor' as AppRole, active: true, password: '' }

export default function EquipeClient({ profiles: initial, profissionais }: { profiles: ProfileWithCounts[], profissionais: Profissional[] }) {
  const router = useRouter()
  const [profiles, setProfiles] = useState(initial)
  const [activeTab, setActiveTab] = useState<'usuarios' | 'colaboradores'>('usuarios')

  // Criar
  const [showNew, setShowNew]   = useState(false)
  const [newForm, setNewForm]   = useState(emptyNew)
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [createOk, setCreateOk]   = useState(false)

  // Editar
  const [editTarget, setEditTarget] = useState<ProfileWithCounts | null>(null)
  const [editForm, setEditForm]     = useState(emptyEdit)
  const [saving, setSaving]         = useState(false)
  const [editErr, setEditErr]       = useState<string | null>(null)

  // Excluir
  const [deleteTarget, setDeleteTarget] = useState<ProfileWithCounts | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // Filtro por role
  const [roleFilter, setRoleFilter] = useState<string>('todos')

  const filtered = roleFilter === 'todos'
    ? profiles
    : profiles.filter(p => p.role === roleFilter)

  function openEdit(p: ProfileWithCounts) {
    setEditTarget(p)
    setEditForm({ full_name: p.full_name, phone: p.phone ?? '', role: p.role as AppRole, active: p.active, password: '' })
    setEditErr(null)
  }

  async function handleCreate() {
    if (!newForm.email.trim() || !newForm.full_name.trim() || !newForm.password.trim()) return
    setCreating(true); setCreateErr(null)
    const { error } = await createMembro({
      full_name: newForm.full_name.trim(),
      email:     newForm.email.trim(),
      phone:     newForm.phone.trim() || null,
      role:      newForm.role,
      password:  newForm.password,
    })
    if (error) { setCreateErr(error); setCreating(false); return }
    setCreateOk(true)
    setTimeout(() => { setShowNew(false); setCreateOk(false); setNewForm(emptyNew); router.refresh() }, 1800)
    setCreating(false)
  }

  async function handleEdit() {
    if (!editTarget) return
    setSaving(true); setEditErr(null)
    const { error } = await updateMembro(editTarget.id, {
      full_name: editForm.full_name.trim(),
      phone:     editForm.phone.trim() || null,
      role:      editForm.role,
      active:    editForm.active,
      password:  editForm.password.trim() || undefined,
    })
    if (error) { setEditErr(error); setSaving(false); return }
    setProfiles(prev => prev.map(p =>
      p.id === editTarget.id
        ? { ...p, full_name: editForm.full_name, phone: editForm.phone || null, role: editForm.role, active: editForm.active }
        : p
    ))
    setEditTarget(null)
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await deleteMembro(deleteTarget.id)
    if (error) { setDeleting(false); return }
    setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        <button onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'usuarios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <Users size={15} /> Usuários do sistema
          <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{profiles.length}</span>
        </button>
        <button onClick={() => setActiveTab('colaboradores')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'colaboradores' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <HardHat size={15} /> Colaboradores
          <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{profissionais.length}</span>
        </button>
      </div>

      {activeTab === 'colaboradores' && <ProfissionaisTab profissionais={profissionais} />}

      {activeTab === 'usuarios' && <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filtros de role */}
        <div className="flex gap-1 flex-wrap">
          {[{ value: 'todos', label: 'Todos' }, ...ROLES.map(r => ({ value: r.value, label: r.label }))].map(r => (
            <button
              key={r.value}
              onClick={() => setRoleFilter(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === r.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => { setShowNew(true); setCreateErr(null); setCreateOk(false) }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Novo membro
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => {
          const roleLabel = ROLE_LABELS[p.role as AppRole] ?? p.role
          const roleBadge = ROLE_COLORS[p.role as AppRole] ?? 'bg-gray-100 text-gray-600'
          return (
            <div key={p.id} className="card p-5">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm ${
                  p.active ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-gray-300'
                }`}>
                  {getInitials(p.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{p.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{p.email}</p>
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge}`}>
                      <Shield className="w-2.5 h-2.5" />
                      {roleLabel}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.active ? <UserCheck className="w-2.5 h-2.5" /> : <UserX className="w-2.5 h-2.5" />}
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button onClick={() => setDeleteTarget(p)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                    <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
                  </button>
                </div>
              </div>

              {['admin','gerente','vendedor'].includes(p.role) && (
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs">Leads</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{p.leadsCount}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-xs">Visitas</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{p.visitsCount}</p>
                  </div>
                </div>
              )}

              {p.phone && (
                <a href={`tel:${p.phone}`} className="mt-4 flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  <Phone className="w-3.5 h-3.5" /> {p.phone}
                </a>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 card p-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Nenhum membro encontrado</p>
          </div>
        )}
      </div>

      {/* Modal — Novo membro */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !creating && setShowNew(false)} />
          <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-bold text-gray-900">Novo membro</h2>
              <button onClick={() => setShowNew(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {createOk ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  </div>
                  <p className="font-semibold text-gray-900">Membro cadastrado!</p>
                  <p className="text-sm text-gray-500 mt-1">Acesso disponível imediatamente.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="label">Nome completo *</label>
                      <input className="input" placeholder="Nome do membro" value={newForm.full_name}
                        onChange={e => setNewForm(f => ({ ...f, full_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">E-mail *</label>
                      <input className="input" type="email" placeholder="email@empresa.com" value={newForm.email}
                        onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
                        autoCapitalize="none" inputMode="email" />
                    </div>
                    <div>
                      <label className="label">Telefone</label>
                      <input className="input" placeholder="(11) 9 9999-9999" value={newForm.phone}
                        onChange={e => setNewForm(f => ({ ...f, phone: maskPhone(e.target.value) }))}
                        inputMode="tel" maxLength={16} />
                    </div>
                  </div>

                  {/* Seleção de role com descrição */}
                  <div>
                    <label className="label">Tipo de acesso *</label>
                    <div className="grid grid-cols-1 gap-2 mt-1">
                      {ROLES.map(r => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setNewForm(f => ({ ...f, role: r.value }))}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            newForm.role === r.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ROLE_COLORS[r.value]}`}>
                            <Shield className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                            <p className="text-xs text-gray-500">{r.description}</p>
                          </div>
                          {newForm.role === r.value && (
                            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Senha *</label>
                    <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={newForm.password}
                      onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))} />
                  </div>

                  {createErr && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{createErr}</p>
                  )}
                </>
              )}
            </div>

            {!createOk && (
              <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
                <button onClick={() => setShowNew(false)} className="btn-secondary flex-1 text-sm">Cancelar</button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newForm.email.trim() || !newForm.full_name.trim() || !newForm.password.trim()}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? 'Criando...' : 'Criar membro'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal — Editar */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !saving && setEditTarget(null)} />
          <div className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl z-10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Editar — {editTarget.full_name}</h2>
              <button onClick={() => setEditTarget(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="label">Nome completo</label>
                <input className="input" value={editForm.full_name}
                  onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input" placeholder="(11) 9 9999-9999" value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: maskPhone(e.target.value) }))}
                  inputMode="tel" maxLength={16} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo de acesso</label>
                  <SearchableSelect
                    value={editForm.role}
                    onChange={v => setEditForm(f => ({ ...f, role: v as AppRole }))}
                    options={ROLES.map(r => ({ value: r.value, label: r.label }))}
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <SearchableSelect
                    value={editForm.active ? 'ativo' : 'inativo'}
                    onChange={v => setEditForm(f => ({ ...f, active: v === 'ativo' }))}
                    options={[{ value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }]}
                  />
                </div>
              </div>
              <div>
                <label className="label">Nova senha <span className="text-gray-400 font-normal">(deixe em branco para não alterar)</span></label>
                <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              {editErr && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editErr}</p>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setEditTarget(null)} className="btn-secondary flex-1 text-sm">Cancelar</button>
              <button onClick={handleEdit} disabled={saving || !editForm.full_name.trim()}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Confirmar exclusão */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Excluir membro?</p>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium">{deleteTarget.full_name}</span> perderá o acesso ao sistema permanentemente.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>}
    </>
  )
}
