'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function moveLeadStage(leadId: string, stageId: string | null) {
  const { error } = await admin().from('leads').update({ stage_id: stageId }).eq('id', leadId)
  if (error) return { error: error.message }
  revalidatePath('/pipeline')
  return { error: null }
}

export async function createLeadInStage(name: string, phone: string | null, stageId: string) {
  const { data, error } = await admin()
    .from('leads')
    .insert({ name, phone, stage_id: stageId, source: 'outro' })
    .select('*, pipeline_stages(id, name, color, slug, position), profiles(id, full_name, avatar_url)')
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath('/pipeline')
  return { data, error: null }
}

export async function addActivity(leadId: string, type: string, content: string) {
  const { error } = await admin().from('activities').insert({ lead_id: leadId, type, content })
  if (error) return { error: error.message }
  return { error: null }
}
