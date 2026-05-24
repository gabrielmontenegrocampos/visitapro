'use server'

import { createClient as adminCreate } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return adminCreate(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function updatePerfil(updates: {
  full_name: string
  phone: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const admin = adminClient()
  const { error } = await admin
    .from('profiles')
    .update({ full_name: updates.full_name, phone: updates.phone })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/perfil')
  return { error: null }
}

export async function updateSenha(senhaAtual: string, novaSenha: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Verifica senha atual tentando login
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: senhaAtual,
  })
  if (signInError) return { error: 'Senha atual incorreta' }

  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) return { error: error.message }
  return { error: null }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const file = formData.get('file') as File
  if (!file) return { error: 'Arquivo não encontrado' }

  const admin = adminClient()
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `avatars/${user.id}.${ext}`

  const bytes = await file.arrayBuffer()
  const { error: upErr } = await admin.storage
    .from('company-assets')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (upErr) return { error: upErr.message }

  const { data: urlData } = admin.storage.from('company-assets').getPublicUrl(path)
  const url = urlData.publicUrl

  await admin.from('profiles').update({ avatar_url: url }).eq('id', user.id)

  revalidatePath('/perfil')
  return { error: null, url }
}
