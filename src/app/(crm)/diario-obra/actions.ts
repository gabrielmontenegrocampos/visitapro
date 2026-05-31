'use server'

import { createClient as adminCreate } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function adminClient() {
  return adminCreate(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function createProjeto(proposalId: string, tituloPub: string) {
  const admin = adminClient()

  const { data, error } = await admin
    .from('projetos_diario')
    .insert({ proposal_id: proposalId, titulo_publico: tituloPub || null })
    .select()
    .single()
  if (error || !data) return { error: error?.message ?? 'Erro ao criar projeto' }
  revalidatePath('/diario-obra')
  return { data, error: null }
}

export async function updateProjeto(id: string, fields: { titulo_publico?: string; ativo?: boolean }) {
  const admin = adminClient()
  const { error } = await admin.from('projetos_diario').update(fields).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/diario-obra')
  return { error: null }
}

export async function deleteProjeto(id: string) {
  const admin = adminClient()
  const { error } = await admin.from('projetos_diario').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/diario-obra')
  redirect('/diario-obra')
}

export async function createRegistro(projetoId: string) {
  const admin = adminClient()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await admin
    .from('diario_obras')
    .insert({ projeto_id: projetoId, data: today })
    .select()
    .single()
  if (error || !data) return { error: error?.message ?? 'Erro ao criar registro' }
  redirect(`/diario-obra/${projetoId}/${data.id}`)
}

export async function updateRegistro(
  id: string,
  projetoId: string,
  fields: Record<string, unknown>
) {
  const admin = adminClient()
  const { error } = await admin
    .from('diario_obras')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/diario-obra/${projetoId}`)
  revalidatePath(`/diario-obra/${projetoId}/${id}`)
  return { error: null }
}

export async function deleteRegistro(id: string, projetoId: string) {
  const admin = adminClient()
  const { error } = await admin.from('diario_obras').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/diario-obra/${projetoId}`)
  redirect(`/diario-obra/${projetoId}`)
}

// Garante que o bucket público existe (chamado apenas uma vez por sessão via prepareUpload)
async function ensureDiarioBucket() {
  const admin = adminClient()
  const { data: buckets } = await admin.storage.listBuckets()
  const exists = buckets?.some(b => b.name === 'diario-obras')
  if (!exists) {
    await admin.storage.createBucket('diario-obras', {
      public: true,
      fileSizeLimit: 20 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/gif'],
    })
  }
}

/**
 * Etapa 1: gera uma Signed Upload URL via service role.
 * O browser usa essa URL para fazer o upload direto ao Supabase Storage
 * sem passar pelo Next.js (sem limite de tamanho, sem timeout Vercel).
 */
export async function prepareUpload(registroId: string, fileName: string) {
  const admin = adminClient()
  await ensureDiarioBucket()

  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `diario/${registroId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`

  const { data, error } = await admin.storage
    .from('diario-obras')
    .createSignedUploadUrl(path)

  if (error || !data) return { error: error?.message ?? 'Erro ao gerar URL de upload', signedUrl: null, publicUrl: null, path: null }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/diario-obras/${path}`

  return { error: null, signedUrl: data.signedUrl, token: data.token, path, publicUrl }
}

/**
 * Etapa 2: após o browser ter feito o upload, registra a URL no banco.
 */
export async function registrarFotoUrl(registroId: string, projetoId: string, url: string) {
  const admin = adminClient()
  const { data: reg } = await admin
    .from('diario_obras')
    .select('fotos')
    .eq('id', registroId)
    .single()

  const fotos: Array<{ url: string; legenda: string; ordem: number }> = (reg?.fotos as any[]) ?? []
  fotos.push({ url, legenda: '', ordem: fotos.length })

  const { error } = await admin
    .from('diario_obras')
    .update({ fotos, updated_at: new Date().toISOString() })
    .eq('id', registroId)
  if (error) return { error: error.message }

  revalidatePath(`/diario-obra/${projetoId}/${registroId}`)
  return { error: null }
}

// Mantido para compatibilidade — não usado no novo fluxo
export async function uploadFoto(registroId: string, projetoId: string, formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return { error: 'Arquivo nao encontrado', url: null }
  const prep = await prepareUpload(registroId, file.name)
  return { error: 'Use o upload direto (prepareUpload + registrarFotoUrl)', url: null, prep }
}

export async function removeFoto(registroId: string, projetoId: string, url: string) {
  const admin = adminClient()
  const { data: reg } = await admin
    .from('diario_obras')
    .select('fotos')
    .eq('id', registroId)
    .single()

  const fotos = ((reg?.fotos as any[]) ?? [])
    .filter((f: any) => f.url !== url)
    .map((f: any, i: number) => ({ ...f, ordem: i }))

  const pathPart = url.split('/diario-obras/')[1]
  if (pathPart) {
    await admin.storage.from('diario-obras').remove([pathPart])
  }

  await admin
    .from('diario_obras')
    .update({ fotos, updated_at: new Date().toISOString() })
    .eq('id', registroId)

  revalidatePath(`/diario-obra/${projetoId}/${registroId}`)
  return { error: null }
}

export async function updateFotoLegenda(
  registroId: string,
  projetoId: string,
  url: string,
  legenda: string
) {
  const admin = adminClient()
  const { data: reg } = await admin
    .from('diario_obras')
    .select('fotos')
    .eq('id', registroId)
    .single()

  const fotos = ((reg?.fotos as any[]) ?? []).map((f: any) =>
    f.url === url ? { ...f, legenda } : f
  )

  await admin
    .from('diario_obras')
    .update({ fotos, updated_at: new Date().toISOString() })
    .eq('id', registroId)

  revalidatePath(`/diario-obra/${projetoId}/${registroId}`)
  return { error: null }
}
