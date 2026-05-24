'use server'

import { createClient as adminCreate } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { AppRole } from '@/lib/roles'

function adminClient() {
  return adminCreate(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function createMembro(input: {
  full_name: string
  email: string
  phone: string | null
  role: AppRole
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

  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id,
    full_name: input.full_name,
    email: input.email,
    phone: input.phone,
    role: input.role,
    active: true,
  }, { onConflict: 'id' })

  if (profileError) return { error: profileError.message }

  revalidatePath('/equipe')
  return { error: null }
}

export async function updateMembro(id: string, updates: {
  full_name?: string
  phone?: string | null
  role?: AppRole
  active?: boolean
  password?: string
}) {
  const admin = adminClient()
  const { password, ...profileUpdates } = updates

  if (password && password.length >= 6) {
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) return { error: error.message }
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await admin.from('profiles').update(profileUpdates).eq('id', id)
    if (error) return { error: error.message }
  }

  revalidatePath('/equipe')
  return { error: null }
}

export async function deleteMembro(id: string) {
  const admin = adminClient()

  // Deleta do Auth (cascade deleta o profile via trigger)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return { error: error.message }

  revalidatePath('/equipe')
  return { error: null }
}
