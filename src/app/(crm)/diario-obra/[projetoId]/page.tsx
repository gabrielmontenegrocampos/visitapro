import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DiarioTimelineClient from '@/components/diario/DiarioTimelineClient'

export const dynamic = 'force-dynamic'

export default async function DiarioTimelinePage({
  params,
}: {
  params: Promise<{ projetoId: string }>
}) {
  const { projetoId } = await params
  const supabase = await createClient()

  const [projetoRes, registrosRes] = await Promise.all([
    supabase
      .from('projetos_diario')
      .select('*, proposals(id, title, value, proposal_number, leads(id, name, phone))')
      .eq('id', projetoId)
      .single(),
    supabase
      .from('diario_obras')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('data', { ascending: false }),
  ])

  if (!projetoRes.data) notFound()

  return (
    <DiarioTimelineClient
      projeto={projetoRes.data as any}
      registros={(registrosRes.data ?? []) as any}
    />
  )
}
