import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/roles'
import { getCompanySettings } from './actions'
import ConfiguracoesClient from '@/components/configuracoes/ConfiguracoesClient'

export const dynamic = 'force-dynamic'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!can(me?.role ?? '', 'configuracoes_view')) redirect('/dashboard')

  const settings = await getCompanySettings()
  return <ConfiguracoesClient settings={settings} />
}
