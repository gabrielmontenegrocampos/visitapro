import { createClient } from '@/lib/supabase/server'
import AgendaView from '@/components/agenda/AgendaView'

export const dynamic = 'force-dynamic'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [visitsRes, vendedoresRes, leadsRes] = await Promise.all([
    supabase
      .from('visits')
      .select('*, leads(id, name, phone, address), profiles(id, full_name)')
      .order('scheduled_at'),
    supabase.from('profiles').select('id, full_name').eq('active', true).order('full_name'),
    supabase.from('leads').select('id, name, phone, address, city').order('name').limit(200),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agenda de Visitas</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie as visitas técnicas dos vendedores</p>
      </div>
      <AgendaView
        visits={visitsRes.data ?? []}
        vendedores={vendedoresRes.data ?? []}
        leads={leadsRes.data ?? []}
        currentUserId={user?.id ?? ''}
      />
    </div>
  )
}
