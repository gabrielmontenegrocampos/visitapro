import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DiarioPublicView from '@/components/diario/DiarioPublicView'

export const dynamic = 'force-dynamic'

export default async function ObraPublicPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const [projetoRes, settingsRes] = await Promise.all([
    supabase
      .from('projetos_diario')
      .select('*, proposals(id, title, value, leads(id, name, phone))')
      .eq('public_token', token)
      .eq('ativo', true)
      .single(),
    supabase
      .from('company_settings')
      .select('name, logo_url, whatsapp, phone, brand_color')
      .limit(1)
      .maybeSingle(),
  ])

  if (!projetoRes.data) notFound()

  const registrosRes = await supabase
    .from('diario_obras')
    .select('id, data, clima, status_obra, atividades, notas_cliente, fotos')
    .eq('projeto_id', projetoRes.data.id)
    .order('data', { ascending: false })

  return (
    <DiarioPublicView
      projeto={projetoRes.data as any}
      registros={(registrosRes.data ?? []) as any}
      settings={settingsRes.data as any}
    />
  )
}
