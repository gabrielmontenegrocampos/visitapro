'use server'

import { createClient as adminCreate } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
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

// ─── Profissionais ─────────────────────────────────────────────

export async function getProfissionais() {
  const admin = adminClient()
  const { data } = await admin
    .from('profissionais')
    .select('*')
    .order('nome')
  return data ?? []
}

export async function getProfissional(id: string) {
  const admin = adminClient()
  const { data: prof } = await admin
    .from('profissionais')
    .select('*')
    .eq('id', id)
    .single()

  const { data: obras } = await admin
    .from('profissionais_obras')
    .select('*, projetos_diario(id, titulo_publico, proposals(id, title, value, leads(name)))')
    .eq('profissional_id', id)
    .order('data_entrada', { ascending: false })

  const { data: pagamentos } = await admin
    .from('lancamentos_financeiros')
    .select('*, categorias_financeiras(id, nome)')
    .eq('profissional_id', id)
    .order('data', { ascending: false })

  // Deriva nome dos projetos
  const obrasEnriquecidas = (obras ?? []).map((o: any) => ({
    ...o,
    projetos_diario: o.projetos_diario ? {
      ...o.projetos_diario,
      nome: o.projetos_diario.titulo_publico || o.projetos_diario.proposals?.leads?.name || o.projetos_diario.proposals?.title || 'Projeto sem nome',
    } : null,
  }))

  return { prof, obras: obrasEnriquecidas, pagamentos: pagamentos ?? [] }
}

export async function createProfissional(input: {
  nome: string
  tipo: 'clt' | 'autonomo' | 'terceirizado'
  especialidade: string
  cpf: string | null
  rg: string | null
  data_nascimento: string | null
  telefone: string | null
  email: string | null
  cep: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  banco: string | null
  agencia: string | null
  conta: string | null
  pix: string | null
  salario_base: number | null
  valor_diaria: number | null
  observacoes: string | null
}) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('profissionais')
    .insert({ ...input, ativo: true })
    .select('id')
    .single()
  if (error) return { error: error.message, id: null }
  revalidatePath('/equipe')
  return { error: null, id: data.id }
}

export async function updateProfissional(id: string, input: Partial<{
  nome: string
  tipo: 'clt' | 'autonomo' | 'terceirizado'
  especialidade: string
  cpf: string | null
  rg: string | null
  data_nascimento: string | null
  telefone: string | null
  email: string | null
  cep: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  banco: string | null
  agencia: string | null
  conta: string | null
  pix: string | null
  salario_base: number | null
  valor_diaria: number | null
  foto_url: string | null
  ativo: boolean
  observacoes: string | null
}>) {
  const admin = adminClient()
  const { error } = await admin
    .from('profissionais')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/equipe')
  revalidatePath(`/equipe/profissionais/${id}`)
  return { error: null }
}

export async function deleteProfissional(id: string) {
  const admin = adminClient()
  const { error } = await admin
    .from('profissionais')
    .update({ ativo: false })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/equipe')
  return { error: null }
}

export async function uploadFotoProfissional(id: string, formData: FormData) {
  const admin = adminClient()
  const file = formData.get('file') as File
  if (!file) return { error: 'Arquivo não encontrado', url: null }
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `profissionais/${id}.${ext}`
  const bytes = await file.arrayBuffer()
  const { error: upErr } = await admin.storage
    .from('company-assets')
    .upload(path, bytes, { contentType: file.type, upsert: true })
  if (upErr) return { error: upErr.message, url: null }
  const { data } = admin.storage.from('company-assets').getPublicUrl(path)
  await admin.from('profissionais').update({ foto_url: data.publicUrl }).eq('id', id)
  revalidatePath(`/equipe/profissionais/${id}`)
  return { error: null, url: data.publicUrl }
}

// ─── Profissionais × Obras ─────────────────────────────────────

export async function vincularProfissionalObra(input: {
  profissional_id: string
  projeto_id: string
  data_entrada: string
  funcao: string | null
}) {
  const admin = adminClient()
  const { error } = await admin.from('profissionais_obras').insert(input)
  if (error) return { error: error.message }
  revalidatePath('/equipe')
  return { error: null }
}

export async function encerrarVinculoObra(id: string, data_saida: string) {
  const admin = adminClient()
  const { error } = await admin
    .from('profissionais_obras')
    .update({ data_saida })
    .eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
