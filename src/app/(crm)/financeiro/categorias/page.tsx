import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/roles'
import { getCategorias } from '../actions'
import CategoriasClient from '@/components/financeiro/CategoriasClient'

export const dynamic = 'force-dynamic'

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!can(me?.role ?? '', 'financeiro_view')) redirect('/dashboard')

  const role = me?.role ?? 'vendedor'
  const categorias = await getCategorias()

  return (
    <CategoriasClient
      categorias={categorias as any}
      canEdit={can(role, 'financeiro_edit')}
    />
  )
}
