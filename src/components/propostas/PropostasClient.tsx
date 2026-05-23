'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, X, Loader2, CheckCircle, XCircle, Clock, FileText, ChevronRight, Trash2, AlertTriangle, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency, PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_CONFIG } from '@/lib/utils'
import SearchableSelect from '@/components/ui/SearchableSelect'
import InlineEditTitle from '@/components/propostas/InlineEditTitle'
import { deleteProposal } from '@/app/(crm)/propostas/[id]/actions'
import { createProposalAndOpen } from '@/app/(crm)/memoria-calculo/actions'
import type { Proposal } from '@/types/database'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://visitapro.vercel.app'

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  )
}

interface Lead { id: string; name: string }
interface ProposalWithRelations extends Proposal {
  leads: { id: string; name: string; phone: string | null } | null
  profiles: { id: string; full_name: string } | null
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
  const router = useRouter()
  const [proposals, setProposals] = useState(initialProposals)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    lead_id: '', title: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreate() {
    if (!form.lead_id || !form.title) return
    setSaving(true)
    try {
      await createProposalAndOpen({ lead_id: form.lead_id, title: form.title })
      // createProposalAndOpen calls redirect() — if it returns, something went wrong
    } catch {
      // Next.js redirect() throws internally; navigation is handled
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await deleteProposal(id)
    setProposals(prev => prev.filter(p => p.id !== id))
    setConfirmDeleteId(null)
    setDeleting(false)
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
        <SearchableSelect
          className="w-auto min-w-[130px]"
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Todos"
          options={[
            { value: '', label: 'Todos' },
            ...Object.entries(PROPOSAL_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })),
          ]}
        />
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
            <div key={p.id} className="card p-4 space-y-3 hover:shadow-md transition-shadow relative">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{p.leads?.name ?? '—'}</p>
                  <InlineEditTitle
                    proposalId={p.id}
                    title={p.title}
                    onSaved={t => setProposals(prev => prev.map(x => x.id === p.id ? { ...x, title: t } : x))}
                    className="text-sm text-gray-500"
                    inputClassName="w-44"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PROPOSAL_STATUS_CONFIG[p.status]?.badge ?? 'bg-gray-100 text-gray-700'}`}>
                    <Icon className="w-3 h-3" />
                    {PROPOSAL_STATUS_LABELS[p.status]}
                  </span>
                  <button onClick={() => setConfirmDeleteId(p.id)} className="p-1 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-gray-900">{formatCurrency(p.value)}</p>
                <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                <Link href={`/propostas/${p.id}`} className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <ChevronRight className="w-3.5 h-3.5" />
                  Abrir cálculo
                </Link>
                {p.public_token && (
                  <>
                    <span className="text-gray-200">|</span>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`${p.proposal_number ? p.proposal_number + ' — ' : ''}${p.title}: ${BASE_URL}/p/${p.public_token}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-green-600 font-medium"
                    >
                      <WhatsAppIcon /> WhatsApp
                    </a>
                    <span className="text-gray-200">|</span>
                    <a
                      href={`/p/${p.public_token}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 font-medium"
                    >
                      <ExternalLink className="w-3 h-3" /> Ver proposta
                    </a>
                  </>
                )}
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
                {['Cliente', 'Título', 'Valor', 'Status', 'Criada em', 'Cálculo', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => {
                const Icon = STATUS_ICONS[p.status] ?? FileText
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/propostas/${p.id}`} className="hover:text-blue-600 transition-colors">
                        {p.leads?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                      <InlineEditTitle
                        proposalId={p.id}
                        title={p.title}
                        onSaved={t => setProposals(prev => prev.map(x => x.id === p.id ? { ...x, title: t } : x))}
                        className="text-gray-600 text-sm"
                        inputClassName="w-44"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(p.value)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${PROPOSAL_STATUS_CONFIG[p.status]?.badge ?? 'bg-gray-100 text-gray-700'}`}>
                        <Icon className="w-3 h-3" />
                        {PROPOSAL_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/propostas/${p.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                          Abrir
                        </Link>
                        {p.public_token && (
                          <>
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`${p.proposal_number ? p.proposal_number + ' — ' : ''}${p.title}: ${BASE_URL}/p/${p.public_token}`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="p-1 hover:bg-green-50 rounded-lg text-green-500 hover:text-green-600 transition-colors"
                              title="Enviar via WhatsApp"
                            >
                              <WhatsAppIcon />
                            </a>
                            <a
                              href={`/p/${p.public_token}`}
                              target="_blank" rel="noopener noreferrer"
                              className="p-1 hover:bg-blue-50 rounded-lg text-blue-400 hover:text-blue-600 transition-colors"
                              title="Ver proposta do cliente"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => setConfirmDeleteId(p.id)}
                          className="p-1 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SearchableSelect
                        value={p.status}
                        onChange={(v) => updateStatus(p.id, v as Proposal['status'])}
                        options={Object.entries(PROPOSAL_STATUS_LABELS).map(([k, v]) => ({
                          value: k, label: v, dot: PROPOSAL_STATUS_CONFIG[k]?.hex,
                        }))}
                      />
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Nenhuma proposta encontrada</td></tr>
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
              <p className="text-sm text-gray-500">Preencha as informações básicas. Você poderá editar todos os detalhes na próxima tela.</p>
              <div>
                <label className="label">Cliente *</label>
                <SearchableSelect
                  value={form.lead_id}
                  onChange={(v) => set('lead_id', v)}
                  placeholder="Selecione o cliente"
                  options={[
                    { value: '', label: 'Selecione o cliente' },
                    ...leads.map((l) => ({ value: l.id, label: l.name })),
                  ]}
                />
              </div>
              <div>
                <label className="label">Título *</label>
                <input className="input" placeholder="Ex: Pintura completa residencial..." value={form.title} onChange={(e) => set('title', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 p-4 md:p-5 border-t border-gray-100">
              <button onClick={() => { setShowForm(false); setForm({ lead_id: '', title: '' }) }} className="btn-secondary flex-1 text-sm">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.lead_id || !form.title} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmDeleteId && (() => {
        const p = proposals.find(x => x.id === confirmDeleteId)
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setConfirmDeleteId(null)} />
            <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">Excluir proposta?</p>
                  <p className="text-sm text-gray-500 mt-1">
                    "<span className="font-medium">{p?.title}</span>" e todos os seus itens serão removidos permanentemente.
                  </p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button onClick={() => setConfirmDeleteId(null)} disabled={deleting} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(confirmDeleteId)}
                    disabled={deleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
