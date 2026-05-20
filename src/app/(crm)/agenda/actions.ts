'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Maps visit status → pipeline stage slug pattern to search
const VISIT_STATUS_TO_STAGE: Record<string, string> = {
  agendada:   'agend',
  realizada:  'realiz',
  cancelada:  'cancel',
  reagendada: 'agend',
}

async function syncLeadStage(leadId: string | null | undefined, visitStatus: string) {
  if (!leadId) return
  const pattern = VISIT_STATUS_TO_STAGE[visitStatus]
  if (!pattern) return

  const supabase = adminClient()
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, name, slug')
    .order('position')

  if (!stages?.length) return

  const match = stages.find(
    (s) =>
      s.slug?.toLowerCase().includes(pattern) ||
      s.name?.toLowerCase().includes(pattern)
  )
  if (!match) return

  await supabase.from('leads').update({ stage_id: match.id }).eq('id', leadId)
  revalidatePath('/pipeline')
}

export async function createVisit(data: Record<string, unknown>) {
  const supabase = adminClient()
  const { data: created, error } = await supabase
    .from('visits')
    .insert(data)
    .select('*, leads(id, name, phone, address), profiles!visits_assigned_to_fkey(id, full_name)')
    .single()

  if (error) return { data: null, error: error.message }

  await syncLeadStage(data.lead_id as string | null, 'agendada')

  revalidatePath('/agenda')
  return { data: created, error: null }
}

export async function updateVisit(id: string, data: Record<string, unknown>) {
  const supabase = adminClient()
  const { data: updated, error } = await supabase
    .from('visits')
    .update(data)
    .eq('id', id)
    .select('*, leads(id, name, phone, address), profiles!visits_assigned_to_fkey(id, full_name)')
    .single()

  if (error) return { data: null, error: error.message }

  if (data.status && typeof data.status === 'string') {
    const leadId = (updated as Record<string, unknown>).lead_id as string | null
    await syncLeadStage(leadId, data.status)
  }

  revalidatePath('/agenda')
  return { data: updated, error: null }
}

export async function deleteVisit(id: string) {
  const supabase = adminClient()
  const { error } = await supabase.from('visits').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/agenda')
  return { error: null }
}
