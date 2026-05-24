import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfissional, getProfissionais } from '../../actions'
import ProfissionalDetail from '@/components/equipe/ProfissionalDetail'

export const dynamic = 'force-dynamic'

export default async function ProfissionalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin' && me?.role !== 'gerente') redirect('/dashboard')

  const resultado = await getProfissional(id)
  if (!resultado.prof) notFound()

  // Projetos disponíveis para vincular
  const { data: projetos } = await supabase
    .from('projetos_diario')
    .select('id, nome')
    .order('created_at', { ascending: false })

  return (
    <ProfissionalDetail
      prof={resultado.prof as any}
      obras={resultado.obras as any}
      pagamentos={resultado.pagamentos as any}
      projetos={projetos ?? []}
    />
  )
}
