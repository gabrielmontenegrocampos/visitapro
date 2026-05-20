import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/kanban/KanbanBoard'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const supabase = await createClient()

  const [stagesRes, leadsRes] = await Promise.all([
    supabase.from('pipeline_stages').select('*').order('position'),
    supabase
      .from('leads')
      .select('*, pipeline_stages(id, name, color, slug, position), profiles(id, full_name, avatar_url)')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="flex flex-col h-full -m-6">
      <div className="px-6 pt-6 pb-4 bg-gray-50 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie seus leads por estágio de negociação</p>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <KanbanBoard
          stages={stagesRes.data ?? []}
          leads={leadsRes.data ?? []}
        />
      </div>
    </div>
  )
}
