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

export async function createRegistro(projetoId: string, date?: string) {
  const admin = adminClient()
  const dia = date ?? new Date().toISOString().split('T')[0]
  const { data, error } = await admin
    .from('diario_obras')
    .insert({ projeto_id: projetoId, data: dia })
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

// ── Atividades da obra (checklist do projeto) ─────────────────────────────────

export async function upsertAtividadeObra(
  projetoId: string,
  atividade: {
    id?: string
    etapa: string
    descricao?: string | null
    status: 'pendente' | 'em_andamento' | 'concluida'
    ordem: number
    parent_id?: string | null
  }
) {
  const admin = adminClient()
  const payload = { projeto_id: projetoId, ...atividade }

  if (atividade.id) {
    const { data, error } = await admin
      .from('atividades_obra')
      .update(payload)
      .eq('id', atividade.id)
      .select()
      .single()
    revalidatePath(`/diario-obra/${projetoId}`)
    return { data: data as any, error: error?.message ?? null }
  }

  const { data, error } = await admin
    .from('atividades_obra')
    .insert(payload)
    .select()
    .single()
  revalidatePath(`/diario-obra/${projetoId}`)
  return { data: data as any, error: error?.message ?? null }
}

export async function deleteAtividadeObra(id: string, projetoId: string) {
  const admin = adminClient()
  const { error } = await admin.from('atividades_obra').delete().eq('id', id)
  revalidatePath(`/diario-obra/${projetoId}`)
  return { error: error?.message ?? null }
}

// ── Documentos da obra ────────────────────────────────────────────────────────

async function ensureDocumentosBucket() {
  const admin = adminClient()
  const { data: buckets } = await admin.storage.listBuckets()
  const exists = buckets?.some(b => b.name === 'documentos-diario')
  if (!exists) {
    await admin.storage.createBucket('documentos-diario', {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024,
      allowedMimeTypes: [
        'application/pdf',
        'image/png', 'image/jpeg', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
    })
  }
}

export async function prepareDocumentoUpload(projetoId: string, fileName: string) {
  const admin = adminClient()
  await ensureDocumentosBucket()

  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${projetoId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`

  const { data, error } = await admin.storage
    .from('documentos-diario')
    .createSignedUploadUrl(path)

  if (error || !data) return { error: error?.message ?? 'Erro ao gerar URL', signedUrl: null, publicUrl: null, path: null }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/documentos-diario/${path}`

  return { error: null, signedUrl: data.signedUrl, path, publicUrl }
}

export async function registrarDocumentoUrl(
  projetoId: string,
  url: string,
  path: string,
  nome: string,
  tipo: string,
  tamanho: number
) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('documentos_diario')
    .insert({ projeto_id: projetoId, arquivo_url: url, arquivo_path: path, arquivo_nome: nome, tipo, tamanho })
    .select()
    .single()
  revalidatePath(`/diario-obra/${projetoId}`)
  return { data: data as any, error: error?.message ?? null }
}

export async function deleteDocumento(id: string, projetoId: string, path: string) {
  const admin = adminClient()
  await admin.storage.from('documentos-diario').remove([path])
  await admin.from('documentos_diario').delete().eq('id', id)
  revalidatePath(`/diario-obra/${projetoId}`)
  return { error: null }
}

// ── Atualiza campos extras do projeto ────────────────────────────────────────

export async function updateProjetoDetalhes(
  id: string,
  fields: {
    titulo_publico?: string
    tipo_obra?: string
    status_projeto?: string
    ativo?: boolean
    cep?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    data_inicio?: string | null
    data_previsao_fim?: string | null
    progresso_manual?: number
    responsavel_tecnico?: string
    art_rrt?: string
    foto_capa?: string
  }
) {
  const admin = adminClient()
  const { error } = await admin.from('projetos_diario').update(fields).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/diario-obra')
  revalidatePath(`/diario-obra/${id}`)
  revalidatePath(`/diario-obra/${id}/editar`)
  return { error: null }
}

// ── Upload foto capa do projeto ───────────────────────────────────────────────

export async function prepareFotoCapaUpload(projetoId: string, fileName: string) {
  const admin = adminClient()
  await ensureDiarioBucket()
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `capas/${projetoId}/${Date.now()}.${ext}`
  const { data, error } = await admin.storage.from('diario-obras').createSignedUploadUrl(path)
  if (error || !data) return { error: error?.message ?? 'Erro ao gerar URL', signedUrl: null, publicUrl: null, path: null }
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/diario-obras/${path}`
  return { error: null, signedUrl: data.signedUrl, token: data.token, path, publicUrl }
}

export async function registrarFotoCapa(projetoId: string, url: string) {
  const admin = adminClient()
  const { error } = await admin.from('projetos_diario').update({ foto_capa: url }).eq('id', projetoId)
  if (error) return { error: error.message }
  revalidatePath('/diario-obra')
  revalidatePath(`/diario-obra/${projetoId}`)
  revalidatePath(`/diario-obra/${projetoId}/editar`)
  return { error: null }
}
