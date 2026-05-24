import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/roles'
import { getResultadoObra, getCategorias } from '../../actions'
import ResultadoObraClient from '@/components/financeiro/ResultadoObraClient'

export const dynamic = 'force-dynamic'

export default async function ResultadoObraPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!can(me?.role ?? '', 'financeiro_view')) redirect('/dashboard')

  const [resultado, categorias] = await Promise.all([
    getResultadoObra(projetoId),
    getCategorias(),
  ])

  if (!resultado) notFound()

  return (
    <ResultadoObraClient
      resultado={resultado as any}
      categorias={categorias as any}
      canEdit={can(me?.role ?? '', 'financeiro_edit')}
    />
  )
}
