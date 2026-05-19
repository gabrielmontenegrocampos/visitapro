'use client'

import { useState } from 'react'
import { Plus, Search, X, Loader2, CheckCircle, XCircle, Clock, FileText, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency, PROPOSAL_STATUS_LABELS } from '@/lib/utils'
import type { Proposal } from '@/types/database'

interface Lead { id: string; name: string }
interface ProposalWithRelations extends Proposal {
  leads: { id: string; name: string; phone: string | null } | null
  profiles: { id: string; full_name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviada:  'bg-blue-100 text-blue-700',
  aceita:   'bg-green-100 text-green-700',
  recusada: 'bg-red-100 text-red-700',
  expirada: 'bg-yellow-100 text-yellow-700',
}

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  aceita:   CheckCircle,
  recusada: XCircle,
  enviada:  Clock,
  rascunho: FileText,
  expirada: Clock,
}

export default function PropostasClient({ proposals: initialProposals, leads }: { proposals: ProposalWithRelations[]; leads: Lead[] }) {
  const supabase = createClient()
  const [proposals, setProposals] = useState(initialProposals)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    lead_id: '', title: '', description: '', value: '',
    status: 'rascunho' as Proposal['status'], expires_at: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreate() {
    if (!form.lead_id || !form.title || !form.value) return
    setSaving(true)
    const { data } = await supabase
      .from('proposals')
      .insert({
        lead_id: form.lead_id, title: form.title,
        description: form.description || null, value: parseFloat(form.value),
        status: form.status, expires_at: form.expires_at || null,
        sent_at: form.status === 'enviada' ? new Date().toISOString() : null,
      })
      .select('*, leads(id, name, phone), profiles(id, full_name)')
      .single()

    if (data) {
      setProposals((prev) => [data as ProposalWithRelations, ...prev])
      setForm({ lead_id: '', title: '', description: '', value: '', status: 'rascunho', expires_at: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: Proposal['status']) {
    await supabase.from('proposals').update({
      status,
      sent_at: status === 'enviada' ? new Date().toISOString() : undefined,
    }).eq('id', id)
    setProposals((prev) => prev.map((p) => p.id === id ? { ...p, status } : p))
  }

  const filtered = proposals.filter((p) => {
    const matchSearch = !search ||
      (p.leads?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      p.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalAceita  = proposals.filter(p => p.status === 'aceita').reduce((s, p) => s + p.value, 0)
  const totalEnviada = proposals.filter(p => p.status === 'enviada').reduce((s, p) => s + p.value, 0)

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: proposals.length,                                sub: 'propostas',              color: 'gray'  },
          { label: 'Enviadas',  value: proposals.filter(p => p.status === 'enviada').length,  sub: formatCurrency(totalEnviada), color: 'blue'  },
          { label: 'Fechadas',  value: proposals.filter(p => p.status === 'aceita').length,   sub: formatCurrency(totalAceita),  color: 'green' },
          { label: 'Recusadas', value: proposals.filter(p => p.status === 'recusada').length, sub: 'propostas',              color: 'red'   },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className={`card p-4 border-l-4 ${color === 'blue' ? 'border-blue-500' : color === 'green' ? 'border-green-500' : color === 'red' ? 'border-red-500' : 'border-gray-300'}`}>
            <p className="text-xs text-gray-500 uppercase font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 w-full" placeholder="Buscar cliente ou título..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(PROPOSAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Proposta</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((p) => {
          const Icon = STATUS_ICONS[p.status] ?? FileText
          return (
            <div key={p.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{p.leads?.name ?? '—'}</p>
                  <p className="text-sm text-gray-500 truncate">{p.title}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                  <Icon className="w-3 h-3" />
                  {PROPOSAL_STATUS_LABELS[p.status]}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-gray-900">{formatCurrency(p.value)}</p>
                <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="text-xs text-gray-500 mb-1 block">Atualizar status</label>
                <select
                  value={p.status}
                  onChange={(e) => updateStatus(p.id, e.target.value as Proposal['status'])}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Object.entries(PROPOSAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Nenhuma proposta encontrada
          </div>
        )}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Cliente', 'Título', 'Valor', 'Status', 'Criada em', 'Ações'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => {
                const Icon = STATUS_ICONS[p.status] ?? FileText
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.leads?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{p.title}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(p.value)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                        <Icon className="w-3 h-3" />
                        {PROPOSAL_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={(e) => updateStatus(p.id, e.target.value as Proposal['status'])}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {Object.entries(PROPOSAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Nenhuma proposta encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal — sheet no mobile, dialog no desktop */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Nova Proposta</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3">
              <div>
                <label className="label">Cliente *</label>
                <select className="input" value={form.lead_id} onChange={(e) => set('lead_id', e.target.value)}>
                  <option value="">Selecione o cliente</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Título *</label>
                <input className="input" placeholder="Ex: Pintura completa..." value={form.title} onChange={(e) => set('title', e.target.value)} />
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea className="input resize-none" rows={3} placeholder="Descreva os serviços..." value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor (R$) *</label>
                  <input className="input" type="number" placeholder="0,00" step="0.01" min="0" value={form.value} onChange={(e) => set('value', e.target.value)} />
                </div>
                <div>
                  <label className="label">Validade</label>
                  <input className="input" type="date" value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Status inicial</label>
                <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {Object.entries(PROPOSAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-4 md:p-5 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1 text-sm">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.lead_id || !form.title || !form.value} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
