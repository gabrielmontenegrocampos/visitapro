'use client'

import { useState } from 'react'
import { Plus, Search, Phone, Mail, Filter, Loader2, X, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, SOURCE_LABELS } from '@/lib/utils'
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

export default function LeadsClient({ leads: initialLeads, stages, vendedores }: LeadsClientProps) {
  const supabase = createClient()
  const [leads, setLeads] = useState(initialLeads)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', neighborhood: '',
    source: 'google_ads' as Lead['source'], stage_id: '', assigned_to: '', notes: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('leads')
      .insert({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        neighborhood: form.neighborhood || null,
        source: form.source,
        stage_id: form.stage_id || null,
        assigned_to: form.assigned_to || null,
        notes: form.notes || null,
      })
      .select('*, pipeline_stages(id, name, color), profiles(id, full_name)')
      .single()

    if (data) {
      setLeads((prev) => [data as LeadWithRelations, ...prev])
      setForm({ name: '', email: '', phone: '', address: '', city: '', neighborhood: '', source: 'google_ads', stage_id: '', assigned_to: '', notes: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  const filtered = leads.filter((l) => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone ?? '').includes(search) || (l.email ?? '').toLowerCase().includes(search.toLowerCase())
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
        <select
          className="input w-auto"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">Todos estágios</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap"
        >
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
          <div key={lead.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900">{lead.name}</p>
              {lead.pipeline_stages && (
                <span
                  className="shrink-0 text-xs font-medium text-white px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: lead.pipeline_stages.color }}
                >
                  {lead.pipeline_stages.name}
                </span>
              )}
            </div>

            <div className="space-y-1">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-blue-600">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-blue-600 truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {lead.email}
                </a>
              )}
              {lead.city && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {[lead.neighborhood, lead.city].filter(Boolean).join(', ')}
                </div>
              )}
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
                {['Nome', 'Contato', 'Cidade', 'Origem', 'Estágio', 'Vendedor', 'Cadastro'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 group-hover:text-blue-600">{lead.name}</p>
                    {lead.notes && <p className="text-xs text-gray-400 truncate max-w-[160px]">{lead.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {lead.phone && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <a href={`tel:${lead.phone}`} className="hover:text-blue-600">{lead.phone}</a>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-1 text-gray-600 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                        <a href={`mailto:${lead.email}`} className="hover:text-blue-600 truncate max-w-[140px]">{lead.email}</a>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{[lead.neighborhood, lead.city].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {SOURCE_LABELS[lead.source]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {lead.pipeline_stages ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: lead.pipeline_stages.color }}>
                        {lead.pipeline_stages.name}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{lead.profiles?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(lead.created_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Nenhum lead encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - full screen no mobile, centered no desktop */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[92vh] md:max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Novo Lead</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3">
              <div>
                <label className="label">Nome *</label>
                <input className="input" placeholder="Nome do cliente" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Telefone</label>
                  <input className="input" placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className="label">E-mail</label>
                  <input className="input" type="email" placeholder="email@..." value={form.email} onChange={(e) => set('email', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Endereço</label>
                <input className="input" placeholder="Rua e número" value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Bairro</label>
                  <input className="input" placeholder="Bairro" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
                </div>
                <div>
                  <label className="label">Cidade</label>
                  <input className="input" placeholder="Cidade" value={form.city} onChange={(e) => set('city', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Origem</label>
                  <select className="input" value={form.source} onChange={(e) => set('source', e.target.value)}>
                    {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Estágio</label>
                  <select className="input" value={form.stage_id} onChange={(e) => set('stage_id', e.target.value)}>
                    <option value="">Sem estágio</option>
                    {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Vendedor</label>
                <select className="input" value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
                  <option value="">Sem responsável</option>
                  {vendedores.map((v) => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Observações</label>
                <textarea className="input resize-none" rows={3} placeholder="Detalhes adicionais..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 p-4 md:p-5 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1 text-sm">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.name.trim()} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Criar Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
