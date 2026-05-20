import { createClient } from '@/lib/supabase/server'
import MetricsCards from '@/components/dashboard/MetricsCards'
import PipelineChart from '@/components/dashboard/PipelineChart'
import UpcomingVisits from '@/components/dashboard/UpcomingVisits'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [metricsRes, stagesRes, visitsRes] = await Promise.all([
    supabase.from('dashboard_metrics').select('*').single(),
    supabase.from('pipeline_stages').select('id, name, color, slug').order('position'),
    supabase
      .from('visits')
      .select(`
        id, title, scheduled_at, duration_minutes, status,
        address, notes, assigned_to, lead_id,
        leads(id, name, phone, address),
        profiles!visits_assigned_to_fkey(id, full_name)
      `)
      .gte('scheduled_at', new Date().toISOString())
      .in('status', ['agendada', 'reagendada'])
      .order('scheduled_at')
      .limit(10),
  ])

  const stages = stagesRes.data ?? []
  const stageCountsRes = await Promise.all(
    stages.map(async (stage: { id: string; name: string; color: string; slug: string }) => {
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('stage_id', stage.id)
      return { ...stage, count: count ?? 0 }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do seu CRM</p>
      </div>

      <MetricsCards metrics={metricsRes.data} />

      {/* Visitas em destaque no topo */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <UpcomingVisits visits={(visitsRes.data ?? []) as any} />

      <PipelineChart stages={stageCountsRes} />
    </div>
  )
}
