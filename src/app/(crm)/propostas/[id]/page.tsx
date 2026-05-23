import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MemoriaCalculoClient from '@/components/propostas/MemoriaCalculoClient'

export const dynamic = 'force-dynamic'

export default async function PropostaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [proposalRes, itemsRes] = await Promise.all([
    supabase
      .from('proposals')
      .select('*, leads(id, name, phone)')
      .eq('id', id)
      .single(),
    supabase
      .from('proposal_items')
      .select('*')
      .eq('proposal_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (!proposalRes.data) notFound()

  return (
    <MemoriaCalculoClient
      proposal={proposalRes.data as any}
      items={(itemsRes.data ?? []) as any}
    />
  )
}
