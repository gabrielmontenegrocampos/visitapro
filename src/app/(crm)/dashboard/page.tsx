import { createClient } from '@/lib/supabase/server'
import { createClient as adminCreate } from '@supabase/supabase-js'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { getDashboardMetrics } from './actions'

export const dynamic = 'force-dynamic'

function adminClient() {
  return adminCreate(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const admin = adminClient()

  const [initialMetrics, stagesRes, visitsRes, leadsRes] = await Promise.all([
    getDashboardMetrics(),
    admin.from('pipeline_stages').select('id, name, color, slug').order('position'),
    supabase
      .from('visits')
      .select(`
        id, title, scheduled_at, duration_minutes, status,
        address, notes, assigned_to, lead_id,
        leads(id, name, company, phone, address),
        profiles!visits_assigned_to_fkey(id, full_name)
      `)
      .gte('scheduled_at', new Date().toISOString())
      .in('status', ['agendada', 'reagendada'])
      .order('scheduled_at')
      .limit(10),
    admin.from('leads').select('stage_id'),
  ])

  const stages = stagesRes.data ?? []
  const countByStage = (leadsRes.data ?? []).reduce<Record<string, number>>((acc, l) => {
    if (l.stage_id) acc[l.stage_id] = (acc[l.stage_id] ?? 0) + 1
    return acc
  }, {})
  const stageCounts = stages.map((stage: { id: string; name: string; color: string; slug: string }) => ({
    ...stage,
    count: countByStage[stage.id] ?? 0,
  }))

  return (
    <DashboardClient
      initialMetrics={initialMetrics as any}
      stages={stageCounts}
      visits={(visitsRes.data ?? []) as any}
    />
  )
}
