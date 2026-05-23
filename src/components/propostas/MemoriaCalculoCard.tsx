'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calculator, ChevronRight } from 'lucide-react'
import { formatCurrency, formatDate, PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_CONFIG } from '@/lib/utils'
import InlineEditTitle from '@/components/propostas/InlineEditTitle'

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
  const [title, setTitle] = useState(initial.title)
  const hasCalc = !!calc

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

      {/* Valor + seta — clicável */}
      <Link href={`/propostas/${initial.id}`} className="text-right shrink-0 flex items-center gap-2">
        <div>
          <p className="font-bold text-gray-900">{formatCurrency(initial.value)}</p>
          <p className="text-xs text-gray-400">{formatDate(initial.created_at)}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </Link>
    </div>
  )
}
