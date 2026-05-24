import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/roles'
import { getLancamentos, getCategorias, getProjetosParaLancamento } from '../actions'
import LancamentosClient from '@/components/financeiro/LancamentosClient'

export const dynamic = 'force-dynamic'

export default async function LancamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!can(me?.role ?? '', 'financeiro_view')) redirect('/dashboard')

  const role = me?.role ?? 'vendedor'

  const [lancamentos, categorias, projetos] = await Promise.all([
    getLancamentos(),
    getCategorias(),
    getProjetosParaLancamento(),
  ])

  return (
    <LancamentosClient
      lancamentos={lancamentos as any}
      categorias={categorias as any}
      projetos={projetos}
      canEdit={can(role, 'financeiro_edit')}
    />
  )
}
