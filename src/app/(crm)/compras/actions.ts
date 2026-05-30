'use server'

import { createClient as adminCreate } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return adminCreate(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function getFornecedores() {
  const admin = adminClient()
  const { data, error } = await admin
    .from('fornecedores')
    .select('*')
    .eq('ativo', true)
    .order('nome')
  return { data: data ?? [], error }
}

export async function createFornecedor(input: {
  nome: string
  nome_fantasia?: string
  cnpj_cpf?: string
  categoria: string
  responsavel?: string
  telefone?: string
  email?: string
  site?: string
  cep?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  forma_pagamento?: string
  prazo_pagamento?: string
  pix?: string
  observacoes?: string
}) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('fornecedores')
    .insert(input)
    .select()
    .single()
  revalidatePath('/compras')
  return { data, error: error?.message }
}

export async function updateFornecedor(id: string, input: Partial<Parameters<typeof createFornecedor>[0]>) {
  const admin = adminClient()
  const { error } = await admin
    .from('fornecedores')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/compras')
  return { error: error?.message }
}

export async function deleteFornecedor(id: string) {
  const admin = adminClient()
  const { error } = await admin
    .from('fornecedores')
    .update({ ativo: false })
    .eq('id', id)
  revalidatePath('/compras')
  return { error: error?.message }
}

export async function getOrdensCompra() {
  const admin = adminClient()
  const { data, error } = await admin
    .from('ordens_compra')
    .select(`
      *,
      fornecedores(id, nome),
      itens_ordem_compra(*)
    `)
    .order('created_at', { ascending: false })

  const withTotal = (data ?? []).map((o: any) => ({
    ...o,
    total: (o.itens_ordem_compra ?? []).reduce((s: number, i: any) => s + Number(i.valor_total ?? 0), 0),
  }))

  return { data: withTotal, error }
}

export async function createOrdemCompra(input: {
  fornecedor_id?: string
  projeto_id?: string
  descricao: string
  data_pedido: string
  data_entrega_prevista?: string
  forma_pagamento?: string
  observacoes?: string
  created_by?: string
  itens: { descricao: string; quantidade: number; unidade?: string; valor_unitario: number }[]
}) {
  const admin = adminClient()
  const { itens, ...ordemData } = input

  const { data: ordem, error } = await admin
    .from('ordens_compra')
    .insert({ ...ordemData, status: 'solicitado' })
    .select()
    .single()

  if (error || !ordem) return { error: error?.message, data: null }

  if (itens.length > 0) {
    const itensData = itens.map(i => ({
      ordem_id: ordem.id,
      descricao: i.descricao,
      quantidade: i.quantidade,
      unidade: i.unidade || null,
      valor_unitario: i.valor_unitario,
    }))
    await admin.from('itens_ordem_compra').insert(itensData)
  }

  const { data: ordemCompleta } = await admin
    .from('ordens_compra')
    .select('*, fornecedores(id, nome), itens_ordem_compra(*)')
    .eq('id', ordem.id)
    .single()

  revalidatePath('/compras')
  return {
    data: ordemCompleta
      ? {
          ...ordemCompleta,
          projetos_diario: null, // enriquecido no cliente via prop projetos
          total: (ordemCompleta.itens_ordem_compra ?? []).reduce((s: number, i: any) => s + Number(i.valor_total ?? 0), 0),
        }
      : null,
    error: null,
  }
}

export async function updateOrdemStatus(id: string, status: string, data_recebimento?: string) {
  const admin = adminClient()

  const updateData: any = { status, updated_at: new Date().toISOString() }
  if (data_recebimento) updateData.data_recebimento = data_recebimento

  const { data: ordem, error } = await admin
    .from('ordens_compra')
    .update(updateData)
    .eq('id', id)
    .select(`*, fornecedores(nome), itens_ordem_compra(*)`)
    .single()

  if (error) return { error: error.message }

  if (status === 'recebido' && ordem) {
    const total = (ordem.itens_ordem_compra ?? []).reduce(
      (s: number, i: any) => s + Number(i.valor_total ?? 0),
      0
    )

    if (total > 0) {
      const { data: cat } = await admin
        .from('categorias_financeiras')
        .select('id')
        .eq('tipo', 'despesa')
        .eq('divisao', (ordem as any).projeto_id ? 'obra' : 'administracao')
        .ilike('nome', '%material%')
        .maybeSingle()

      const { data: catFallback } = !cat
        ? await admin
            .from('categorias_financeiras')
            .select('id')
            .eq('tipo', 'despesa')
            .eq('divisao', (ordem as any).projeto_id ? 'obra' : 'administracao')
            .limit(1)
            .maybeSingle()
        : { data: null }

      const categoriaId = cat?.id ?? catFallback?.id

      const { data: lancamento } = await admin
        .from('lancamentos_financeiros')
        .insert({
          categoria_id: categoriaId ?? null,
          tipo: 'despesa',
          divisao: (ordem as any).projeto_id ? 'obra' : 'administracao',
          descricao: `Compra: ${(ordem as any).descricao}${(ordem as any).fornecedores ? ` — ${(ordem as any).fornecedores.nome}` : ''}`,
          valor: total,
          data: data_recebimento ?? new Date().toISOString().split('T')[0],
          status: 'pago',
          projeto_id: (ordem as any).projeto_id ?? null,
        })
        .select()
        .single()

      if (lancamento) {
        await admin
          .from('ordens_compra')
          .update({ lancamento_id: lancamento.id })
          .eq('id', id)
      }
    }
  }

  revalidatePath('/compras')
  revalidatePath('/financeiro')
  return { error: null }
}

export async function deleteOrdemCompra(id: string) {
  const admin = adminClient()
  const { error } = await admin.from('ordens_compra').delete().eq('id', id)
  revalidatePath('/compras')
  return { error: error?.message }
}
