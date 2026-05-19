import { createClient } from '@/lib/supabase/server'
import LeadsClient from '@/components/leads/LeadsClient'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()

  const [leadsRes, stagesRes, vendedoresRes] = await Promise.all([
    supabase
      .from('leads')
      .select('*, pipeline_stages(id, name, color), profiles(id, full_name)')
      .order('created_at', { ascending: false }),
    supabase.from('pipeline_stages').select('*').order('position'),
    supabase.from('profiles').select('id, full_name').eq('active', true).order('full_name'),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie todos os seus contatos e clientes</p>
      </div>
      <LeadsClient
        leads={leadsRes.data ?? []}
        stages={stagesRes.data ?? []}
        vendedores={vendedoresRes.data ?? []}
      />
    </div>
  )
}
