'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { CompanySettings } from '@/types/database'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const admin = adminClient()
  const { data } = await admin
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle()
  return data
}

export async function saveCompanySettings(
  settings: Omit<CompanySettings, 'id' | 'created_at' | 'updated_at'>
) {
  const admin = adminClient()

  // Verifica se já existe um registro
  const { data: existing } = await admin
    .from('company_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  let error
  if (existing?.id) {
    ;({ error } = await admin
      .from('company_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', existing.id))
  } else {
    ;({ error } = await admin
      .from('company_settings')
      .insert({ ...settings }))
  }

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { error: null }
}

export async function ensureStorageBucket() {
  const admin = adminClient()
  const { data: buckets } = await admin.storage.listBuckets()
  const exists = buckets?.some(b => b.name === 'company-assets')
  if (!exists) {
    await admin.storage.createBucket('company-assets', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    })
  }
  return { error: null }
}

export async function saveLogoUrl(url: string) {
  const admin = adminClient()
  const { data: existing } = await admin
    .from('company_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    await admin.from('company_settings').update({ logo_url: url }).eq('id', existing.id)
  } else {
    await admin.from('company_settings').insert({ logo_url: url })
  }
  revalidatePath('/configuracoes')
  return { error: null }
}
