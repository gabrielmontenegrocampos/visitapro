'use client'

import { useState } from 'react'
import { Users, Calendar, UserCheck, UserX, Plus, Pencil, X, Loader2, CheckCircle, Phone } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { maskPhone } from '@/lib/masks'
import { createVendedor, updateVendedor } from '@/app/(crm)/vendedores/actions'
import SearchableSelect from '@/components/ui/SearchableSelect'
import type { Profile } from '@/types/database'

type ProfileWithCounts = Profile & { leadsCount: number; visitsCount: number }

import type { AppRole } from '@/lib/roles'
const emptyInvite = { email: '', full_name: '', phone: '', role: 'vendedor' as AppRole, password: '' }
const emptyEdit = { full_name: '', phone: '', role: 'vendedor' as AppRole, active: true, password: '' }

export default function VendedoresClient({ profiles: initial }: { profiles: ProfileWithCounts[] }) {
  const [profiles, setProfiles] = useState(initial)

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState(emptyInvite)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState<ProfileWithCounts | null>(null)
  const [editForm, setEditForm] = useState(emptyEdit)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function openEdit(p: ProfileWithCounts) {
    setEditTarget(p)
    setEditForm({ full_name: p.full_name, phone: p.phone ?? '', role: p.role, active: p.active, password: '' })
    setEditError(null)
  }

  async function handleInvite() {
    if (!inviteForm.email.trim() || !inviteForm.full_name.trim() || !inviteForm.password.trim()) return
    setInviting(true)
    setInviteError(null)
    const { error } = await createVendedor({
      full_name: inviteForm.full_name.trim(),
      email: inviteForm.email.trim(),
      phone: inviteForm.phone.trim() || null,
      role: inviteForm.role,
      password: inviteForm.password,
    })
    if (error) {
      setInviteError(error)
    } else {
      setInviteSuccess(true)
      setInviteForm(emptyInvite)
      setTimeout(() => { setShowInvite(false); setInviteSuccess(false) }, 2000)
    }
    setInviting(false)
  }

  async function handleEdit() {
    if (!editTarget) return
    setSaving(true)
    setEditError(null)
    const { error } = await updateVendedor(editTarget.id, {
      full_name: editForm.full_name.trim(),
      phone: editForm.phone.trim() || null,
      role: editForm.role,
      active: editForm.active,
      password: editForm.password.trim() || undefined,
    })
    if (error) {
      setEditError(error)
    } else {
      setProfiles((prev) => prev.map((p) =>
        p.id === editTarget.id
          ? { ...p, full_name: editForm.full_name, phone: editForm.phone || null, role: editForm.role, active: editForm.active }
          : p
      ))
      setEditTarget(null)
    }
    setSaving(false)
  }

  return (
    <>
      {/* Header action */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowInvite(true); setInviteError(null); setInviteSuccess(false) }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo vendedor
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${p.active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className="text-sm font-bold text-white">{getInitials(p.full_name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{p.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{p.email}</p>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {p.role === 'admin' ? 'Admin' : 'Vendedor'}
                  </span>
                  {p.active ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      <UserCheck className="w-3 h-3" /> Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      <UserX className="w-3 h-3" /> Inativo
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => openEdit(p)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                title="Editar"
              >
                <Pencil className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Leads</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{p.leadsCount}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Próx. Visitas</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{p.visitsCount}</p>
              </div>
            </div>

            {p.phone && (
              <a href={`tel:${p.phone}`} className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Phone className="w-3.5 h-3.5" /> {p.phone}
              </a>
            )}
          </div>
        ))}

        {profiles.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Nenhum vendedor cadastrado</p>
            <p className="text-sm mt-1">Clique em "Convidar vendedor" para adicionar a equipe</p>
          </div>
        )}
      </div>

      {/* Modal — Convidar */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl z-10">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Novo vendedor</h2>
              <button onClick={() => setShowInvite(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {inviteSuccess ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-semibold text-gray-900">Vendedor cadastrado!</p>
                  <p className="text-sm text-gray-500 mt-1">O acesso já está disponível.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="label">Nome completo *</label>
                    <input
                      className="input"
                      placeholder="Nome do vendedor"
                      value={inviteForm.full_name}
                      onChange={(e) => setInviteForm((f) => ({ ...f, full_name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">E-mail *</label>
                      <input
                        className="input"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                        inputMode="email"
                        autoCapitalize="none"
                      />
                    </div>
                    <div>
                      <label className="label">Telefone</label>
                      <input
                        className="input"
                        placeholder="(11) 9 9999-9999"
                        value={inviteForm.phone}
                        onChange={(e) => setInviteForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
                        inputMode="tel"
                        maxLength={16}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Perfil</label>
                      <SearchableSelect
                        value={inviteForm.role}
                        onChange={(v) => setInviteForm((f) => ({ ...f, role: v as 'admin' | 'vendedor' }))}
                        options={[
                          { value: 'vendedor', label: 'Vendedor' },
                          { value: 'admin', label: 'Admin' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="label">Senha *</label>
                      <input
                        className="input"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={inviteForm.password}
                        onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
                      />
                    </div>
                  </div>
                  {inviteError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{inviteError}</p>
                  )}
                </>
              )}
            </div>

            {!inviteSuccess && (
              <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
                <button onClick={() => setShowInvite(false)} className="btn-secondary flex-1 text-sm">Cancelar</button>
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteForm.email.trim() || !inviteForm.full_name.trim() || !inviteForm.password.trim()}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  {inviting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {inviting ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal — Editar */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl z-10">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Editar vendedor</h2>
              <button onClick={() => setEditTarget(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="label">Nome completo</label>
                <input
                  className="input"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input
                  className="input"
                  placeholder="(11) 9 9999-9999"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
                  inputMode="tel"
                  maxLength={16}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Perfil</label>
                  <SearchableSelect
                    value={editForm.role}
                    onChange={(v) => setEditForm((f) => ({ ...f, role: v as 'admin' | 'vendedor' }))}
                    options={[
                      { value: 'vendedor', label: 'Vendedor' },
                      { value: 'admin', label: 'Admin' },
                    ]}
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <SearchableSelect
                    value={editForm.active ? 'ativo' : 'inativo'}
                    onChange={(v) => setEditForm((f) => ({ ...f, active: v === 'ativo' }))}
                    options={[
                      { value: 'ativo', label: 'Ativo' },
                      { value: 'inativo', label: 'Inativo' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <label className="label">Nova senha <span className="text-gray-400 font-normal">(deixe em branco para não alterar)</span></label>
                <input
                  className="input"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>

              {editError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setEditTarget(null)} className="btn-secondary flex-1 text-sm">Cancelar</button>
              <button
                onClick={handleEdit}
                disabled={saving || !editForm.full_name.trim()}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
