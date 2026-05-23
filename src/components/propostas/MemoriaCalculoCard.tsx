'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calculator, ChevronRight, Trash2, Loader2, AlertTriangle, X } from 'lucide-react'
import { formatCurrency, formatDate, PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_CONFIG } from '@/lib/utils'
import InlineEditTitle from '@/components/propostas/InlineEditTitle'
import { deleteProposal } from '@/app/(crm)/propostas/[id]/actions'

interface Props {
  proposal: {
    id: string
    title: string
    status: string
    value: number
    created_at: string
    leads: { id: string; name: string } | null
  }
  calc: { count: number; total: number } | null
}

export default function MemoriaCalculoCard({ proposal: initial, calc }: Props) {
  const router = useRouter()
  const [title, setTitle]           = useState(initial.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const hasCalc = !!calc

  async function handleDelete() {
    setDeleting(true)
    await deleteProposal(initial.id)
    router.refresh()
  }

  return (
    <div className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      {/* Ícone */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasCalc ? 'bg-blue-100' : 'bg-gray-100'}`}>
        <Calculator className={`w-5 h-5 ${hasCalc ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 truncate">
            {(initial.leads as any)?.name ?? '—'}
          </p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${PROPOSAL_STATUS_CONFIG[initial.status]?.badge ?? 'bg-gray-100 text-gray-700'}`}>
            {PROPOSAL_STATUS_LABELS[initial.status]}
          </span>
        </div>
        <InlineEditTitle
          proposalId={initial.id}
          title={title}
          onSaved={setTitle}
          className="text-sm text-gray-500"
          inputClassName="w-52"
        />
        <div className="flex items-center gap-3 mt-1">
          {hasCalc ? (
            <>
              <span className="text-xs text-blue-600 font-medium">
                {calc!.count} {calc!.count === 1 ? 'item' : 'itens'}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                Custo direto: {formatCurrency(calc!.total)}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-400 italic">Sem itens — clique para adicionar</span>
          )}
        </div>
      </div>

      {/* Valor + seta + lixeira */}
      <div className="shrink-0 flex items-center gap-1">
        <Link href={`/propostas/${initial.id}`} className="text-right flex items-center gap-2">
          <div>
            <p className="font-bold text-gray-900">{formatCurrency(initial.value)}</p>
            <p className="text-xs text-gray-400">{formatDate(initial.created_at)}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-2 hover:bg-red-50 rounded-xl text-gray-300 hover:text-red-500 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Modal confirmação */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={e => e.stopPropagation()}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Excluir proposta?</p>
                <p className="text-sm text-gray-500 mt-1">
                  "<span className="font-medium">{title}</span>" e todos os seus itens serão removidos permanentemente.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
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
      )}
    </div>
  )
}
