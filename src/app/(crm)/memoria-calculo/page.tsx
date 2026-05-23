import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calculator, Plus, ChevronRight, FileText } from 'lucide-react'
import { formatCurrency, formatDate, PROPOSAL_STATUS_LABELS } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviada:  'bg-blue-100 text-blue-700',
  aceita:   'bg-green-100 text-green-700',
  recusada: 'bg-red-100 text-red-700',
  expirada: 'bg-yellow-100 text-yellow-700',
}

export default async function MemoriaCalculoPage() {
  const supabase = await createClient()

  const [propostasRes, itemsRes] = await Promise.all([
    supabase
      .from('proposals')
      .select('*, leads(id, name, phone)')
      .order('created_at', { ascending: false }),
    supabase
      .from('proposal_items')
      .select('proposal_id, total_price'),
  ])

  const proposals = propostasRes.data ?? []
  const allItems  = itemsRes.data ?? []

  // Agrupa itens por proposta
  const itemsByProposal = allItems.reduce<Record<string, { count: number; total: number }>>((acc, item) => {
    if (!acc[item.proposal_id]) acc[item.proposal_id] = { count: 0, total: 0 }
    acc[item.proposal_id].count++
    acc[item.proposal_id].total += item.total_price ?? 0
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Memória de Cálculo</h1>
          <p className="text-gray-500 text-sm mt-1">Orçamentos com composição de custo por área e serviço</p>
        </div>
        <Link
          href="/propostas"
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Proposta</span>
          <span className="sm:hidden">Nova</span>
        </Link>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {proposals.map((p) => {
          const calc   = itemsByProposal[p.id]
          const hasCalc = !!calc
          return (
            <Link
              key={p.id}
              href={`/propostas/${p.id}`}
              className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow block"
            >
              {/* Ícone */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasCalc ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Calculator className={`w-5 h-5 ${hasCalc ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 truncate">
                    {(p.leads as any)?.name ?? '—'}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[p.status]}`}>
                    {PROPOSAL_STATUS_LABELS[p.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{p.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  {hasCalc ? (
                    <>
                      <span className="text-xs text-blue-600 font-medium">
                        {calc.count} {calc.count === 1 ? 'item' : 'itens'}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        Custo direto: {formatCurrency(calc.total)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Sem itens — clique para adicionar</span>
                  )}
                </div>
              </div>

              {/* Valor + seta */}
              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900">{formatCurrency(p.value)}</p>
                <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </Link>
          )
        })}

        {proposals.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Nenhuma proposta ainda</p>
            <p className="text-sm mt-1">Crie uma proposta para começar a memória de cálculo</p>
            <Link href="/propostas" className="btn-primary inline-flex items-center gap-2 text-sm mt-4">
              <Plus className="w-4 h-4" /> Nova proposta
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
