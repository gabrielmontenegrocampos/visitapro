import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EquipeClient from '@/components/equipe/EquipeClient'
import { getProfissionais } from './actions'
import type { Profile } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function EquipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Somente admin
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  const list: Profile[] = (profiles as Profile[]) ?? []

  // Contagens em paralelo com uma única query por métrica
  const [leadsRes, visitsRes] = await Promise.all([
    supabase.from('leads').select('assigned_to').not('assigned_to', 'is', null),
    supabase.from('visits').select('assigned_to').not('assigned_to', 'is', null)
      .gte('scheduled_at', new Date().toISOString()),
  ])

  const leadsCount = (leadsRes.data ?? []).reduce<Record<string, number>>((acc, r) => {
    if (r.assigned_to) acc[r.assigned_to] = (acc[r.assigned_to] ?? 0) + 1
    return acc
  }, {})

  const visitsCount = (visitsRes.data ?? []).reduce<Record<string, number>>((acc, r) => {
    if (r.assigned_to) acc[r.assigned_to] = (acc[r.assigned_to] ?? 0) + 1
    return acc
  }, {})

  const profilesWithCounts = list.map(p => ({
    ...p,
    leadsCount:  leadsCount[p.id]  ?? 0,
    visitsCount: visitsCount[p.id] ?? 0,
  }))

  const profissionais = await getProfissionais()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
        <p className="text-gray-500 text-sm mt-1">Usuários do sistema e colaboradores de campo</p>
      </div>
      <EquipeClient profiles={profilesWithCounts} profissionais={profissionais as any} />
    </div>
  )
}
