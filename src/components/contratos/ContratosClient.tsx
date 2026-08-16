'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileSignature, Plus, X, Loader2, Trash2, AlertTriangle, ChevronRight, CheckCircle, Clock, PenLine, Ban } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { createContrato, deleteContrato } from '@/app/(crm)/contratos/actions'

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  ativo:    'Ativo',
  assinado: 'Assinado',
  cancelado: 'Cancelado',
}
const STATUS_BADGE: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-600',
  ativo:    'bg-blue-100 text-blue-700',
  assinado: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-red-100 text-red-600',
}
const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  rascunho: PenLine,
  ativo:    Clock,
  assinado: CheckCircle,
  cancelado: Ban,
}

interface Contrato {
  id: string
  contract_number: string | null
  title: string
  status: string
  created_at: string
  updated_at: string
  leads: { id: string; name: string; company: string | null } | null
  proposals: { id: string; title: string; value: number } | null
}

interface Pendente {
  id: string
  title: string
  value: number
  leads: { id: string; name: string; company: string | null } | null
}

export default function ContratosClient({ contratos: initial, pendentes }: { contratos: Contrato[]; pendentes: Pendente[] }) {
  const router = useRouter()
  const [contratos, setContratos] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [creating, startCreating] = useTransition()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, startDeleting] = useTransition()

  async function handleCreate() {
    if (!selectedProposalId) return
    startCreating(async () => {
      const result = await createContrato(selectedProposalId)
      if (result.id) {
        router.push(`/contratos/${result.id}`)
      }
    })
  }

  function handleDelete(id: string) {
    startDeleting(async () => {
      await deleteContrato(id)
      setContratos(prev => prev.filter(c => c.id !== id))
      setConfirmDeleteId(null)
    })
  }

  const kpis = [
    { label: 'Total',    value: contratos.length,                               color: 'bg-gray-100 text-gray-600',     icon: <FileSignature className="w-4 h-4" /> },
    { label: 'Ativos',   value: contratos.filter(c => c.status === 'ativo').length,    color: 'bg-blue-50 text-blue-600',      icon: <Clock className="w-4 h-4" /> },
    { label: 'Assinados',value: contratos.filter(c => c.status === 'assinado').length, color: 'bg-emerald-50 text-emerald-600', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Propostas aguardando contrato', value: pendentes.length, color: 'bg-orange-50 text-orange-600', icon: <Plus className="w-4 h-4" /> },
  ]

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => {
          const [bgCls, textCls] = k.color.split(' ')
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${bgCls} flex items-center justify-center shrink-0 ${textCls}`}>
                {k.icon}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900 leading-none">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{k.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Todos os contratos</h2>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Novo Contrato
        </button>
      </div>

      {/* Lista de contratos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {contratos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
              <FileSignature className="w-6 h-6 text-blue-400" />
            </div>
            <p className="font-semibold text-gray-700">Nenhum contrato ainda</p>
            <p className="text-sm text-gray-400 mt-1">
              {pendentes.length > 0
                ? `${pendentes.length} proposta${pendentes.length > 1 ? 's' : ''} aceita${pendentes.length > 1 ? 's' : ''} aguardando contrato`
                : 'Crie um contrato a partir de uma proposta aceita'}
            </p>
            {pendentes.length > 0 && (
              <button onClick={() => setShowModal(true)} className="btn-primary mt-4 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Gerar contrato
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {contratos.map(c => {
              const Icon = STATUS_ICONS[c.status] ?? PenLine
              const clientName = c.leads?.company ?? c.leads?.name ?? '—'
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/contratos/${c.id}`)}
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <FileSignature className="w-4 h-4 text-blue-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 truncate">{clientName}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        <Icon className="w-3 h-3" />
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {c.contract_number && <span className="text-gray-400">{c.contract_number} · </span>}
                      {c.title}
                    </p>
                  </div>

                  <div className="hidden sm:flex flex-col items-end shrink-0 min-w-[110px]">
                    {c.proposals?.value && (
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(c.proposals.value)}</span>
                    )}
                    <span className="text-[11px] text-gray-400">
                      {c.status === 'assinado' ? 'Assinado' : 'Atualizado'} {formatDate(c.updated_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <ChevronRight className="w-4 h-4 text-blue-400" />
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteId(c.id) }}
                      className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal — Novo Contrato */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !creating && setShowModal(false)} />
          <div className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl z-10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileSignature className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Novo Contrato</h2>
                  <p className="text-xs text-gray-400">Selecione a proposta aceita para gerar o contrato</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {pendentes.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">Nenhuma proposta aceita sem contrato.</p>
                  <p className="text-xs text-gray-400 mt-1">Aceite uma proposta na seção Propostas primeiro.</p>
                </div>
              ) : (
                <div>
                  <label className="label">Proposta aceita *</label>
                  <SearchableSelect
                    value={selectedProposalId}
                    onChange={setSelectedProposalId}
                    placeholder="Selecione a proposta..."
                    options={[
                      { value: '', label: 'Selecione...' },
                      ...pendentes.map(p => ({
                        value: p.id,
                        label: p.leads?.company ?? p.leads?.name ?? '—',
                        subtitle: `${p.title} · ${formatCurrency(p.value)}`,
                      })),
                    ]}
                  />
                </div>
              )}
            </div>

            {pendentes.length > 0 && (
              <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
                <button onClick={() => setShowModal(false)} disabled={creating} className="btn-secondary flex-1 text-sm">
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !selectedProposalId}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : 'Gerar Contrato'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal — Confirmar exclusão */}
      {confirmDeleteId && (() => {
        const c = contratos.find(x => x.id === confirmDeleteId)
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setConfirmDeleteId(null)} />
            <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Excluir contrato?</p>
                  <p className="text-sm text-gray-500 mt-1">"{c?.title}" será removido permanentemente.</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button onClick={() => setConfirmDeleteId(null)} disabled={deleting} className="btn-secondary flex-1">Cancelar</button>
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
