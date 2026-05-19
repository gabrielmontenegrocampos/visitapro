import { createClient } from '@/lib/supabase/server'
import MetricsCards from '@/components/dashboard/MetricsCards'
import PipelineChart from '@/components/dashboard/PipelineChart'
import RecentLeads from '@/components/dashboard/RecentLeads'
import UpcomingVisits from '@/components/dashboard/UpcomingVisits'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [metricsRes, stagesRes, leadsRes, visitsRes] = await Promise.all([
    supabase.from('dashboard_metrics').select('*').single(),
    supabase.from('pipeline_stages').select('id, name, color, slug').order('position'),
    supabase
      .from('leads')
      .select('id, name, phone, source, created_at, stage_id, pipeline_stages(name, color)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('visits')
      .select('id, title, scheduled_at, status, leads(name), profiles(full_name)')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(5),
  ])

  // Count leads per stage for chart
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineChart stages={stageCountsRes} />
        <UpcomingVisits visits={visitsRes.data ?? []} />
      </div>

      <RecentLeads leads={leadsRes.data ?? []} />
    </div>
  )
}
