import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/roles'
import { getDashboardFinanceiro, getCategorias, getProjetosParaLancamento } from './actions'
import FinanceiroDashboard from '@/components/financeiro/FinanceiroDashboard'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!can(me?.role ?? '', 'financeiro_view')) redirect('/dashboard')

  const [dashboard, categorias, projetos] = await Promise.all([
    getDashboardFinanceiro(),
    getCategorias(),
    getProjetosParaLancamento(),
  ])

  return <FinanceiroDashboard dashboard={dashboard} categorias={categorias} projetos={projetos} />
}
