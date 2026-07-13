import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/roles'
import { getDashboardFinanceiro, getCategorias, getProjetosParaLancamento, getLancamentos, getSaldoConciliacao, getConciliacoesMensais } from './actions'
import { getProfissionais } from '@/app/(crm)/equipe/actions'
import FinanceiroClient from '@/components/financeiro/FinanceiroClient'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!can(me?.role ?? '', 'financeiro_view')) redirect('/dashboard')

  const canEdit = can(me?.role ?? '', 'financeiro_edit')
  const { aba } = await searchParams

  const [dashboard, categorias, projetos, lancamentos, profissionaisRaw, saldoConciliacao, conciliacoesMensais] = await Promise.all([
    getDashboardFinanceiro(),
    getCategorias(),
    getProjetosParaLancamento(),
    getLancamentos(),
    getProfissionais(),
    getSaldoConciliacao(),
    getConciliacoesMensais(),
  ])
  const profissionais = profissionaisRaw.filter((p: any) => p.ativo)

  return (
    <FinanceiroClient
      dashboard={dashboard}
      categorias={categorias}
      projetos={projetos}
      lancamentos={lancamentos}
      profissionais={profissionais}
      saldoConciliacao={saldoConciliacao}
      conciliacoesMensais={conciliacoesMensais}
      canEdit={canEdit}
      initialAba={aba}
    />
  )
}
