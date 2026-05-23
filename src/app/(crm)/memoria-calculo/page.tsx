import { createClient } from '@/lib/supabase/server'
import { FileText } from 'lucide-react'
import NovaProposta from '@/components/propostas/NovaProposta'
import MemoriaCalculoCard from '@/components/propostas/MemoriaCalculoCard'

export const dynamic = 'force-dynamic'

export default async function MemoriaCalculoPage() {
  const supabase = await createClient()

  const [propostasRes, itemsRes, leadsRes] = await Promise.all([
    supabase
      .from('proposals')
      .select('*, leads(id, name, phone)')
      .order('created_at', { ascending: false }),
    supabase
      .from('proposal_items')
      .select('proposal_id, total_price'),
    supabase
      .from('leads')
      .select('id, name')
      .order('name')
      .limit(200),
  ])

  const proposals = propostasRes.data ?? []
  const allItems  = itemsRes.data  ?? []
  const leads     = leadsRes.data  ?? []

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
        <NovaProposta leads={leads} />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {proposals.map((p) => (
          <MemoriaCalculoCard
            key={p.id}
            proposal={p as any}
            calc={itemsByProposal[p.id] ?? null}
          />
        ))}

        {proposals.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Nenhuma proposta ainda</p>
            <p className="text-sm mt-1">Crie uma proposta para começar a memória de cálculo</p>
            <div className="flex justify-center mt-4">
              <NovaProposta leads={leads} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
