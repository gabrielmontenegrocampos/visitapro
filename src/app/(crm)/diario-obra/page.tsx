import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { can } from '@/lib/roles'
import DiarioListClient from '@/components/diario/DiarioListClient'

export const dynamic = 'force-dynamic'

export default async function DiarioObraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!can(me?.role ?? '', 'diario_view')) redirect('/dashboard')

  const [projetosRes, proposalsRes] = await Promise.all([
    supabase
      .from('projetos_diario')
      .select('*, proposals(id, title, value, status, leads(id, name, phone))')
      .order('created_at', { ascending: false }),
    supabase
      .from('proposals')
      .select('id, title, value, status, lead_id, leads(id, name, phone)')
      .order('created_at', { ascending: false }),
  ])

  const projIds = (projetosRes.data ?? []).map((p: any) => p.id)
  const registrosRes = projIds.length
    ? await supabase
        .from('diario_obras')
        .select('id, projeto_id, data, status_obra, atividades')
        .in('projeto_id', projIds)
        .order('data', { ascending: false })
    : { data: [] }

  const existingProposalIds = new Set(
    (projetosRes.data ?? []).map((p: any) => p.proposal_id)
  )
  const availableProposals = (proposalsRes.data ?? []).filter(
    (p: any) => !existingProposalIds.has(p.id)
  )

  return (
    <DiarioListClient
      projetos={(projetosRes.data ?? []) as any}
      proposals={availableProposals as any}
      registros={(registrosRes.data ?? []) as any}
    />
  )
}
