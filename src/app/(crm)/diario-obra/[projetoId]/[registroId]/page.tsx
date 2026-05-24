import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DiarioEditorClient from '@/components/diario/DiarioEditorClient'

export const dynamic = 'force-dynamic'

export default async function DiarioEditorPage({
  params,
}: {
  params: Promise<{ projetoId: string; registroId: string }>
}) {
  const { projetoId, registroId } = await params
  const supabase = await createClient()

  const [projetoRes, registroRes] = await Promise.all([
    supabase
      .from('projetos_diario')
      .select('*, proposals(id, title, leads(id, name))')
      .eq('id', projetoId)
      .single(),
    supabase
      .from('diario_obras')
      .select('*')
      .eq('id', registroId)
      .single(),
  ])

  if (!projetoRes.data || !registroRes.data) notFound()

  return (
    <DiarioEditorClient
      projeto={projetoRes.data as any}
      registro={registroRes.data as any}
    />
  )
}
