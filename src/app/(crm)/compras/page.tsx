import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ComprasClient from '@/components/compras/ComprasClient'
import { getFornecedores, getOrdensCompra } from './actions'

export const dynamic = 'force-dynamic'

export default async function ComprasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!['admin', 'gerente', 'financeiro', 'encarregado'].includes(me?.role ?? ''))
    redirect('/dashboard')

  const [{ data: ordens }, { data: fornecedores }] = await Promise.all([
    getOrdensCompra(),
    getFornecedores(),
  ])

  const { data: projetos } = await supabase
    .from('projetos_diario')
    .select('id, nome')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
        <p className="text-gray-500 text-sm mt-1">Ordens de compra e cadastro de fornecedores</p>
      </div>
      <ComprasClient
        ordens={ordens ?? []}
        fornecedores={fornecedores ?? []}
        projetos={projetos ?? []}
      />
    </div>
  )
}
