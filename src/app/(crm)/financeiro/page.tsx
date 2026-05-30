import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/roles'
import { getDashboardFinanceiro, getCategorias, getProjetosParaLancamento, getLancamentos } from './actions'
import FinanceiroClient from '@/components/financeiro/FinanceiroClient'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!can(me?.role ?? '', 'financeiro_view')) redirect('/dashboard')

  const canEdit = can(me?.role ?? '', 'financeiro_edit')

  const [dashboard, categorias, projetos, lancamentos] = await Promise.all([
    getDashboardFinanceiro(),
    getCategorias(),
    getProjetosParaLancamento(),
    getLancamentos(),
  ])

  return (
    <FinanceiroClient
      dashboard={dashboard}
      categorias={categorias}
      projetos={projetos}
      lancamentos={lancamentos}
      canEdit={canEdit}
    />
  )
}
