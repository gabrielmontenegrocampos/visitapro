'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calculator, ChevronRight, Trash2, Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import { formatCurrency, formatDate, PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_CONFIG } from '@/lib/utils'
import InlineEditTitle from '@/components/propostas/InlineEditTitle'
import { deleteProposal } from '@/app/(crm)/propostas/[id]/actions'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://visitapro.vercel.app'

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  )
}

interface Props {
  proposal: {
    id: string
    title: string
    status: string
    value: number
    created_at: string
    public_token: string | null
    proposal_number: string | null
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

      {/* Valor + ações */}
      <div className="shrink-0 flex items-center gap-1">
        {/* Botões de proposta pública — só aparecem quando gerada */}
        {initial.public_token && (
          <>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${initial.proposal_number ? initial.proposal_number + ' — ' : ''}${initial.title}: ${BASE_URL}/p/${initial.public_token}`)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-2 hover:bg-green-50 rounded-xl text-green-500 hover:text-green-600 transition-colors"
              title="Enviar via WhatsApp"
            >
              <WhatsAppIcon />
            </a>
            <a
              href={`/p/${initial.public_token}`}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-2 hover:bg-blue-50 rounded-xl text-blue-400 hover:text-blue-600 transition-colors"
              title="Ver proposta do cliente"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </>
        )}
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
