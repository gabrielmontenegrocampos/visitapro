import { createClient } from '@/lib/supabase/server'
import VendedoresClient from '@/components/vendedores/VendedoresClient'
import type { Profile } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function VendedoresPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  const profilesList: Profile[] = (data as Profile[]) ?? []

  const leadsCountRes = await Promise.all(
    profilesList.map(async (p) => {
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', p.id)
      return { id: p.id, leadsCount: count ?? 0 }
    })
  )

  const visitsCountRes = await Promise.all(
    profilesList.map(async (p) => {
      const { count } = await supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', p.id)
        .gte('scheduled_at', new Date().toISOString())
      return { id: p.id, visitsCount: count ?? 0 }
    })
  )

  const profilesWithCounts = profilesList.map((p) => ({
    ...p,
    leadsCount: leadsCountRes.find((r) => r.id === p.id)?.leadsCount ?? 0,
    visitsCount: visitsCountRes.find((r) => r.id === p.id)?.visitsCount ?? 0,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendedores</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie a equipe de vendas</p>
      </div>
      <VendedoresClient profiles={profilesWithCounts} />
    </div>
  )
}
