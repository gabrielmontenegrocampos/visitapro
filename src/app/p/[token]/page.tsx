import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ProposalPublicView from './ProposalPublicView'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const admin = adminClient()
  const { data } = await admin
    .from('proposals')
    .select('title, proposal_number, leads(name)')
    .eq('public_token', token)
    .single()

  if (!data) return { title: 'Proposta não encontrada' }
  const lead = (Array.isArray(data.leads) ? data.leads[0] : data.leads) as { name: string } | null
  return {
    title: `${data.proposal_number ?? 'Proposta'} — ${data.title}`,
    description: lead ? `Proposta comercial para ${lead.name}` : data.title,
  }
}

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = adminClient()

  const [proposalRes, settingsRes] = await Promise.all([
    admin
      .from('proposals')
      .select('id, title, proposal_number, value, status, payment_terms, client_notes, expires_at, sent_at, created_at, client_refs, laudo, memorial_descritivo, leads(id, name, address, city, phone)')
      .eq('public_token', token)
      .single(),
    admin.from('company_settings').select('*').limit(1).maybeSingle(),
  ])

  if (!proposalRes.data || proposalRes.error) notFound()

  const proposal = proposalRes.data
  const settings = settingsRes.data

  // Busca todos os itens de serviço
  const { data: items } = await admin
    .from('proposal_items')
    .select('id, item_type, area_name, service_type, description, unit, quantity, total_price, measurements')
    .eq('proposal_id', proposal.id)
    .order('sort_order')

  // Busca itens BDI
  const { data: bdiItems } = await admin
    .from('proposal_bdi_items')
    .select('id, label, percentage')
    .eq('proposal_id', proposal.id)
    .order('sort_order')

  return (
    <ProposalPublicView
      proposal={proposal as any}
      items={items ?? []}
      bdiItems={bdiItems ?? []}
      settings={settings as any}
      token={token}
    />
  )
}
