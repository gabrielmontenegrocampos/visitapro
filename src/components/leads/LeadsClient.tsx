'use client'

import { useState } from 'react'
import { Plus, Search, Phone, Mail, Loader2, X, MapPin, Pencil, Trash2 } from 'lucide-react'
import { formatDate, SOURCE_LABELS, mapsUrl, whatsappUrl } from '@/lib/utils'
import { maskPhone, maskCep, onlyDigits } from '@/lib/masks'
import { createLead, updateLead, deleteLead } from '@/app/(crm)/leads/actions'
import CepField from '@/components/ui/CepField'
import type { CepResult } from '@/components/ui/CepField'
import SearchableSelect from '@/components/ui/SearchableSelect'
import type { Lead, PipelineStage } from '@/types/database'

interface Vendedor { id: string; full_name: string }
interface LeadWithRelations extends Lead {
  pipeline_stages: Pick<PipelineStage, 'id' | 'name' | 'color'> | null
  profiles: { id: string; full_name: string } | null
}

interface LeadsClientProps {
  leads: LeadWithRelations[]
  stages: PipelineStage[]
  vendedores: Vendedor[]
}

const SOURCES = ['google_ads', 'indicacao', 'site', 'telefone', 'outro'] as const

const emptyForm = {
  name: '', email: '', phone: '', cep: '',
  address: '', number: '', complement: '',
  neighborhood: '', city: '', state: '',
  source: 'google_ads' as Lead['source'],
  stage_id: '', assigned_to: '', notes: '',
}

function leadToForm(lead: LeadWithRelations) {
  return {
    name: lead.name ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    cep: maskCep(lead.cep ?? ''),
    address: lead.address ?? '',
    number: lead.number ?? '',
    complement: lead.complement ?? '',
    neighborhood: lead.neighborhood ?? '',
    city: lead.city ?? '',
    state: '',
    source: lead.source ?? 'outro',
    stage_id: lead.stage_id ?? '',
    assigned_to: lead.assigned_to ?? '',
    notes: lead.notes ?? '',
  }
}

export default function LeadsClient({ leads: initialLeads, stages, vendedores }: LeadsClientProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingLead, setEditingLead] = useState<LeadWithRelations | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function openCreate() {
    setForm(emptyForm)
    setEditingLead(null)
    setConfirmDelete(false)
    setSaveError(null)
    setModalMode('create')
  }

  function openEdit(lead: LeadWithRelations) {
    setForm(leadToForm(lead))
    setEditingLead(lead)
    setConfirmDelete(false)
    setSaveError(null)
    setModalMode('edit')
  }

  function closeModal() {
    setModalMode(null)
    setEditingLead(null)
    setSaveError(null)
    setConfirmDelete(false)
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    set('phone', maskPhone(e.target.value))
  }

  function handleCepFound(result: CepResult) {
    setForm((prev) => ({
      ...prev,
      address: result.logradouro || prev.address,
      neighborhood: result.bairro || prev.neighborhood,
      city: result.localidade || prev.city,
      state: result.uf || prev.state,
    }))
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: onlyDigits(form.phone) ? form.phone : null,
      cep: form.cep.trim() || null,
      address: form.address.trim() || null,
      number: form.number.trim() || null,
      complement: form.complement.trim() || null,
      city: form.city.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      source: form.source,
      stage_id: form.stage_id || null,
      assigned_to: form.assigned_to || null,
      notes: form.notes.trim() || null,
    }
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setSaveError(null)

    if (modalMode === 'edit' && editingLead) {
      const { data, error } = await updateLead(editingLead.id, buildPayload())
      if (error) { setSaveError(error); setSaving(false); return }
      if (data) {
        setLeads((prev) => prev.map((l) => l.id === editingLead.id ? data as LeadWithRelations : l))
        closeModal()
      }
    } else {
      const { data, error } = await createLead(buildPayload())
      if (error) { setSaveError(error); setSaving(false); return }
      if (data) {
        setLeads((prev) => [data as LeadWithRelations, ...prev])
        closeModal()
      }
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!editingLead) return
    setDeleting(true)
    const { error } = await deleteLead(editingLead.id)
    if (!error) {
      setLeads((prev) => prev.filter((l) => l.id !== editingLead.id))
      closeModal()
    }
    setDeleting(false)
  }

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      l.name.toLowerCase().includes(q) ||
      (l.phone ?? '').includes(q) ||
      (l.email ?? '').toLowerCase().includes(q)
    const matchStage = !stageFilter || l.stage_id === stageFilter
    return matchSearch && matchStage
  })

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Buscar nome, telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SearchableSelect
          className="w-auto min-w-[140px]"
          value={stageFilter}
          onChange={setStageFilter}
          placeholder="Todos estágios"
          options={[
            { value: '', label: 'Todos estágios' },
            ...stages.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Lead</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      <div className="flex gap-3 text-sm text-gray-500 items-center">
        <span>{filtered.length} leads</span>
        {stageFilter && (
          <button onClick={() => setStageFilter('')} className="text-blue-600 flex items-center gap-1 text-xs">
            <X className="w-3 h-3" /> limpar filtro
          </button>
        )}
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((lead) => (
          <div key={lead.id} className="card p-4 space-y-3" onClick={() => openEdit(lead)}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900">{lead.name}</p>
              <div className="flex items-center gap-2 shrink-0">
                {lead.pipeline_stages && (
                  <span className="text-xs font-medium text-white px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: lead.pipeline_stages.color }}>
                    {lead.pipeline_stages.name}
                  </span>
                )}
                <Pencil className="w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>
            <div className="space-y-1">
              {lead.phone && (
                <a href={whatsappUrl(lead.phone) ?? '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 text-sm text-blue-600">
                  <Phone className="w-3.5 h-3.5 shrink-0" />{lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 text-sm text-blue-600 truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0" />{lead.email}
                </a>
              )}
              {lead.city && (() => {
                const url = mapsUrl([lead.address, lead.number, lead.neighborhood, lead.city])
                return (
                  <a href={url ?? '#'} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-sm text-blue-600">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {[lead.address, lead.number, lead.neighborhood, lead.city].filter(Boolean).join(', ')}
                  </a>
                )
              })()}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {SOURCE_LABELS[lead.source]}
              </span>
              <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Nenhum lead encontrado
          </div>
        )}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nome', 'Contato', 'Cidade', 'Origem', 'Estágio', 'Vendedor', 'Cadastro', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors group cursor-pointer"
                  onClick={() => openEdit(lead)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 group-hover:text-blue-600">{lead.name}</p>
                    {lead.notes && <p className="text-xs text-gray-400 truncate max-w-[160px]">{lead.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {lead.phone && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <a href={whatsappUrl(lead.phone) ?? '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="hover:text-blue-600">{lead.phone}</a>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-1 text-gray-600 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                        <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()}
                          className="hover:text-blue-600 truncate max-w-[140px]">{lead.email}</a>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(lead.address || lead.city) ? (
                      <a href={mapsUrl([lead.address, lead.number, lead.neighborhood, lead.city]) ?? '#'}
                        target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {[lead.address, lead.number, lead.neighborhood, lead.city].filter(Boolean).join(', ')}
                      </a>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {SOURCE_LABELS[lead.source]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {lead.pipeline_stages ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: lead.pipeline_stages.color }}>
                        {lead.pipeline_stages.name}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{lead.profiles?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(lead.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(lead) }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-50 rounded-lg transition-all">
                      <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Nenhum lead encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal criar / editar */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[92vh] md:max-h-[90vh] flex flex-col">

            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-base">
                {modalMode === 'edit' ? 'Editar Lead' : 'Novo Lead'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-3">
              <div>
                <label className="label">Nome completo *</label>
                <input className="input" placeholder="Nome do cliente" value={form.name}
                  onChange={(e) => set('name', e.target.value)} autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Telefone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input className="input pl-9" placeholder="(11) 9 9999-9999" value={form.phone}
                      onChange={handlePhoneChange} inputMode="tel" maxLength={16} />
                  </div>
                </div>
                <div>
                  <label className="label">E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input className="input pl-9" type="email" placeholder="email@exemplo.com" value={form.email}
                      onChange={(e) => set('email', e.target.value)} inputMode="email" autoCapitalize="none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CepField value={form.cep} onChange={(v) => set('cep', v)} onFound={handleCepFound} />
                <div>
                  <label className="label">Número</label>
                  <input className="input" placeholder="123" value={form.number}
                    onChange={(e) => set('number', e.target.value)} inputMode="numeric" />
                </div>
              </div>

              <div>
                <label className="label">Logradouro</label>
                <input className="input" placeholder="Rua, Avenida..." value={form.address}
                  onChange={(e) => set('address', e.target.value)} />
              </div>

              <div>
                <label className="label">Complemento</label>
                <input className="input" placeholder="Apto, Bloco, Casa..." value={form.complement}
                  onChange={(e) => set('complement', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Bairro</label>
                  <input className="input" placeholder="Bairro" value={form.neighborhood}
                    onChange={(e) => set('neighborhood', e.target.value)} />
                </div>
                <div>
                  <label className="label">Cidade</label>
                  <input className="input" placeholder="Cidade" value={form.city}
                    onChange={(e) => set('city', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Origem</label>
                  <SearchableSelect
                    value={form.source}
                    onChange={(v) => set('source', v)}
                    options={SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))}
                  />
                </div>
                <div>
                  <label className="label">Estágio</label>
                  <SearchableSelect
                    value={form.stage_id}
                    onChange={(v) => set('stage_id', v)}
                    placeholder="Sem estágio"
                    options={[
                      { value: '', label: 'Sem estágio' },
                      ...stages.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="label">Vendedor responsável</label>
                <SearchableSelect
                  value={form.assigned_to}
                  onChange={(v) => set('assigned_to', v)}
                  placeholder="Sem responsável"
                  options={[
                    { value: '', label: 'Sem responsável' },
                    ...vendedores.map((v) => ({ value: v.id, label: v.full_name })),
                  ]}
                />
              </div>

              <div>
                <label className="label">Observações</label>
                <textarea className="input resize-none" rows={3}
                  placeholder="Detalhes adicionais sobre o cliente..."
                  value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>
            </div>

            {saveError && (
              <div className="px-4 md:px-5 pt-3 pb-0">
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
              </div>
            )}

            <div className="px-4 md:px-5 py-4 border-t border-gray-100">
              {modalMode === 'edit' && confirmDelete ? (
                <div className="space-y-2">
                  <p className="text-sm text-center text-gray-700 font-medium">Excluir este lead?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1 text-sm">Cancelar</button>
                    <button onClick={handleDelete} disabled={deleting}
                      className="btn-danger flex-1 text-sm flex items-center justify-center gap-2">
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {deleting ? 'Excluindo...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {modalMode === 'edit' && (
                    <button onClick={() => setConfirmDelete(true)}
                      className="btn-secondary px-3 flex items-center gap-1 text-sm">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                  <button onClick={closeModal} className="btn-secondary flex-1 text-sm">Cancelar</button>
                  <button onClick={handleSave} disabled={saving || !form.name.trim()}
                    className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Salvando...' : modalMode === 'edit' ? 'Salvar' : 'Criar Lead'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
