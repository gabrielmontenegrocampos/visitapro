'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export interface CreateLeadInput {
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  neighborhood: string | null
  source: string
  stage_id: string | null
  assigned_to: string | null
  notes: string | null
}

function revalidate() {
  revalidatePath('/leads')
  revalidatePath('/pipeline')
}

export async function createLead(input: CreateLeadInput) {
  const { data, error } = await adminClient()
    .from('leads')
    .insert(input)
    .select('*, pipeline_stages(id, name, color), profiles(id, full_name)')
    .single()

  if (error) return { data: null, error: error.message }
  revalidate()
  return { data, error: null }
}

export async function updateLead(id: string, input: Partial<CreateLeadInput>) {
  const { data, error } = await adminClient()
    .from('leads')
    .update(input)
    .eq('id', id)
    .select('*, pipeline_stages(id, name, color), profiles(id, full_name)')
    .single()

  if (error) return { data: null, error: error.message }
  revalidate()
  return { data, error: null }
}

export async function deleteLead(id: string) {
  const { error } = await adminClient().from('leads').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidate()
  return { error: null }
}
