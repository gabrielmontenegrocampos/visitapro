'use server'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function createProposalAndOpen(data: { lead_id: string; title: string }) {
  const admin = adminClient()

  const { data: proposal, error } = await admin
    .from('proposals')
    .insert({
      lead_id:    data.lead_id,
      title:      data.title,
      value:      0,
      status:     'rascunho',
      bdi_profit: 15,
    })
    .select()
    .single()

  if (error || !proposal) {
    return { error: error?.message ?? 'Erro ao criar proposta' }
  }

  redirect(`/propostas/${proposal.id}`)
}
