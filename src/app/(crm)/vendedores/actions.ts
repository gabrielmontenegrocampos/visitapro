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

export async function createVendedor(input: {
  full_name: string
  email: string
  phone: string | null
  role: 'admin' | 'vendedor'
  password: string
}) {
  const admin = adminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, role: input.role },
  })

  if (error) return { error: error.message }

  await admin.from('profiles').upsert({
    id: data.user.id,
    full_name: input.full_name,
    email: input.email,
    phone: input.phone,
    role: input.role,
    active: true,
  }, { onConflict: 'id' })

  revalidatePath('/vendedores')
  return { error: null }
}

export async function updateVendedor(id: string, updates: {
  full_name?: string
  phone?: string | null
  role?: 'admin' | 'vendedor'
  active?: boolean
  password?: string
}) {
  const admin = adminClient()

  const { password, ...profileUpdates } = updates

  if (password) {
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) return { error: error.message }
  }

  const { error } = await admin.from('profiles').update(profileUpdates).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/vendedores')
  return { error: null }
}
