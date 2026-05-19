import { createClient } from '@/lib/supabase/server'
import PropostasClient from '@/components/propostas/PropostasClient'

export const dynamic = 'force-dynamic'

export default async function PropostasPage() {
  const supabase = await createClient()

  const [propostasRes, leadsRes] = await Promise.all([
    supabase
      .from('proposals')
      .select('*, leads(id, name, phone), profiles(id, full_name)')
      .order('created_at', { ascending: false }),
    supabase.from('leads').select('id, name').order('name').limit(200),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Propostas</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie todas as propostas comerciais</p>
      </div>
      <PropostasClient
        proposals={propostasRes.data ?? []}
        leads={leadsRes.data ?? []}
      />
    </div>
  )
}
