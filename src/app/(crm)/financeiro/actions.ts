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

// ─── Categorias ────────────────────────────────────────────────

export async function getCategorias() {
  const admin = adminClient()
  const { data } = await admin
    .from('categorias_financeiras')
    .select('*')
    .eq('ativo', true)
    .order('divisao')
    .order('tipo')
    .order('nome')
  return data ?? []
}

export async function createCategoria(input: {
  nome: string
  tipo: 'receita' | 'despesa'
  divisao: 'administracao' | 'obra'
}) {
  const admin = adminClient()
  const { error } = await admin.from('categorias_financeiras').insert({
    nome: input.nome,
    tipo: input.tipo,
    divisao: input.divisao,
    ativo: true,
  })
  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  return { error: null }
}

export async function updateCategoria(id: string, input: {
  nome: string
  tipo: 'receita' | 'despesa'
  divisao: 'administracao' | 'obra'
}) {
  const admin = adminClient()
  const { error } = await admin
    .from('categorias_financeiras')
    .update({ nome: input.nome, tipo: input.tipo, divisao: input.divisao })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  return { error: null }
}

export async function deleteCategoria(id: string) {
  const admin = adminClient()
  const { error } = await admin
    .from('categorias_financeiras')
    .update({ ativo: false })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  return { error: null }
}

// ─── Lançamentos ───────────────────────────────────────────────

export async function getLancamentos(filters?: {
  divisao?: 'administracao' | 'obra'
  tipo?: 'receita' | 'despesa'
  status?: string
  dataInicio?: string
  dataFim?: string
}) {
  const admin = adminClient()
  let q = admin
    .from('lancamentos_financeiros')
    .select(`
      *,
      categorias_financeiras(id, nome, tipo, divisao)
    `)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.divisao) q = q.eq('divisao', filters.divisao)
  if (filters?.tipo) q = q.eq('tipo', filters.tipo)
  if (filters?.status) q = q.eq('status', filters.status)
  if (filters?.dataInicio) q = q.gte('data', filters.dataInicio)
  if (filters?.dataFim) q = q.lte('data', filters.dataFim)

  const { data, error } = await q
  if (error) console.error('[getLancamentos] erro:', error.message, error.details)
  return data ?? []
}

export async function createLancamento(input: {
  categoria_id: string
  tipo: 'receita' | 'despesa'
  divisao: 'administracao' | 'obra'
  descricao: string
  valor: number
  data: string
  status: 'pendente' | 'pago' | 'cancelado'
  projeto_id?: string | null
  observacoes?: string | null
  recorrente?: boolean
  recorrenciaMeses?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const admin = adminClient()
  const base = {
    categoria_id: input.categoria_id,
    tipo: input.tipo,
    divisao: input.divisao,
    descricao: input.descricao,
    valor: input.valor,
    status: input.status,
    projeto_id: input.projeto_id ?? null,
    observacoes: input.observacoes ?? null,
    created_by: user.id,
  }

  if (input.recorrente && input.recorrenciaMeses && input.recorrenciaMeses > 1) {
    // Gera ID de grupo para identificar a série
    const grupoId = crypto.randomUUID()
    const rows = []
    for (let i = 0; i < input.recorrenciaMeses; i++) {
      const d = new Date(input.data + 'T12:00:00')
      d.setMonth(d.getMonth() + i)
      rows.push({
        ...base,
        data: d.toISOString().split('T')[0],
        // Primeiro mês mantém o status escolhido; os demais ficam pendentes
        status: i === 0 ? input.status : 'pendente',
        recorrencia_grupo_id: grupoId,
        recorrencia_mes: i + 1,
      })
    }
    const { error } = await admin.from('lancamentos_financeiros').insert(rows)
    if (error) return { error: error.message }
  } else {
    const { error } = await admin.from('lancamentos_financeiros').insert({
      ...base,
      data: input.data,
    })
    if (error) return { error: error.message }
  }

  revalidatePath('/financeiro')
  revalidatePath('/financeiro/lancamentos')
  return { error: null }
}

export async function cancelarRecorrencia(grupoId: string) {
  const admin = adminClient()
  // Cancela apenas os futuros (pendentes) da série
  const hoje = new Date().toISOString().split('T')[0]
  const { error } = await admin
    .from('lancamentos_financeiros')
    .update({ status: 'cancelado' })
    .eq('recorrencia_grupo_id', grupoId)
    .eq('status', 'pendente')
    .gt('data', hoje)
  if (error) return { error: error.message }
  revalidatePath('/financeiro/lancamentos')
  return { error: null }
}

export async function updateLancamento(id: string, input: {
  categoria_id?: string
  tipo?: 'receita' | 'despesa'
  divisao?: 'administracao' | 'obra'
  descricao?: string
  valor?: number
  data?: string
  status?: 'pendente' | 'pago' | 'cancelado'
  projeto_id?: string | null
  observacoes?: string | null
}) {
  const admin = adminClient()
  const { error } = await admin
    .from('lancamentos_financeiros')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  revalidatePath('/financeiro/lancamentos')
  return { error: null }
}

export async function deleteLancamento(id: string) {
  const admin = adminClient()
  const { error } = await admin
    .from('lancamentos_financeiros')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  revalidatePath('/financeiro/lancamentos')
  return { error: null }
}

export async function deleteLancamentoEProximos(id: string, grupoId: string, data: string) {
  const admin = adminClient()
  // Deleta este lançamento + todos os pendentes futuros do mesmo grupo
  const { error } = await admin
    .from('lancamentos_financeiros')
    .delete()
    .eq('recorrencia_grupo_id', grupoId)
    .eq('status', 'pendente')
    .gte('data', data)
  if (error) return { error: error.message }
  revalidatePath('/financeiro')
  revalidatePath('/financeiro/lancamentos')
  return { error: null }
}

export async function getDashboardFinanceiro() {
  const admin = adminClient()

  // Busca todos lançamentos do ano atual
  const anoAtual = new Date().getFullYear()
  const { data: lancamentos } = await admin
    .from('lancamentos_financeiros')
    .select('tipo, divisao, valor, data, status, projeto_id, categorias_financeiras(nome)')
    .gte('data', `${anoAtual}-01-01`)
    .lte('data', `${anoAtual}-12-31`)
    .neq('status', 'cancelado')

  const todos = lancamentos ?? []

  const sum = (arr: typeof todos) => arr.reduce((s, l) => s + Number(l.valor), 0)

  // Totais por status
  const receitasPagas    = sum(todos.filter(l => l.tipo === 'receita' && l.status === 'pago'))
  const receitasPendente = sum(todos.filter(l => l.tipo === 'receita' && l.status === 'pendente'))
  const despesasPagas    = sum(todos.filter(l => l.tipo === 'despesa' && l.status === 'pago'))
  const despesasPendente = sum(todos.filter(l => l.tipo === 'despesa' && l.status === 'pendente'))

  // Totais lançados (pago + pendente)
  const receitasTotal = receitasPagas + receitasPendente
  const despesasTotal = despesasPagas + despesasPendente

  // Split administração vs obra — pago + pendente
  const adm   = todos.filter(l => l.divisao === 'administracao')
  const obras = todos.filter(l => l.divisao === 'obra')

  const admRec  = sum(adm.filter(l => l.tipo === 'receita' && l.status === 'pago'))
  const admRecP = sum(adm.filter(l => l.tipo === 'receita' && l.status === 'pendente'))
  const admDesp = sum(adm.filter(l => l.tipo === 'despesa' && l.status === 'pago'))
  const admDespP= sum(adm.filter(l => l.tipo === 'despesa' && l.status === 'pendente'))

  const obraRec  = sum(obras.filter(l => l.tipo === 'receita' && l.status === 'pago'))
  const obraRecP = sum(obras.filter(l => l.tipo === 'receita' && l.status === 'pendente'))
  const obraDesp = sum(obras.filter(l => l.tipo === 'despesa' && l.status === 'pago'))
  const obraDespP= sum(obras.filter(l => l.tipo === 'despesa' && l.status === 'pendente'))

  // Resumo por projeto (obras vinculadas) — inclui pendentes
  const projetoIds = [...new Set(obras.filter(l => l.projeto_id).map(l => l.projeto_id as string))]
  let porProjeto: { id: string; nome: string; receitas: number; despesas: number; saldo: number; aReceber: number; aPagar: number }[] = []
  if (projetoIds.length > 0) {
    const { data: projetos } = await admin
      .from('projetos_diario')
      .select('id, titulo_publico, proposals(title, leads(name))')
      .in('id', projetoIds)
    porProjeto = (projetos ?? []).map((p: any) => {
      const pl = obras.filter(l => l.projeto_id === p.id)
      const pr  = sum(pl.filter(l => l.tipo === 'receita' && l.status === 'pago'))
      const pd  = sum(pl.filter(l => l.tipo === 'despesa' && l.status === 'pago'))
      const prP = sum(pl.filter(l => l.tipo === 'receita' && l.status === 'pendente'))
      const pdP = sum(pl.filter(l => l.tipo === 'despesa' && l.status === 'pendente'))
      const nome = p.titulo_publico || p.proposals?.leads?.name || p.proposals?.title || 'Projeto sem nome'
      return { id: p.id, nome, receitas: pr, despesas: pd, saldo: pr - pd, aReceber: prP, aPagar: pdP }
    })
  }

  // Dados por mês (últimos 6 meses) — barras: pago; linha fina: pendente
  const meses: { mes: string; receitas: number; despesas: number; receitasPendente: number; despesasPendente: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    const ml = todos.filter(l => l.data?.startsWith(`${ano}-${mes}`))
    meses.push({
      mes: label,
      receitas:          sum(ml.filter(l => l.tipo === 'receita' && l.status === 'pago')),
      despesas:          sum(ml.filter(l => l.tipo === 'despesa' && l.status === 'pago')),
      receitasPendente:  sum(ml.filter(l => l.tipo === 'receita' && l.status === 'pendente')),
      despesasPendente:  sum(ml.filter(l => l.tipo === 'despesa' && l.status === 'pendente')),
    })
  }

  // Últimos 8 lançamentos
  const { data: recentes } = await admin
    .from('lancamentos_financeiros')
    .select('*, categorias_financeiras(id, nome, tipo, divisao)')
    .order('created_at', { ascending: false })
    .limit(8)

  return {
    // compatibilidade com campos antigos
    receitas: receitasPagas,
    despesas: despesasPagas,
    saldo: receitasPagas - despesasPagas,
    aReceber: receitasPendente,
    aPagar: despesasPendente,
    // novos campos
    receitasTotal,
    despesasTotal,
    saldoProjetado: receitasTotal - despesasTotal,
    meses,
    recentes: recentes ?? [],
    adm: {
      receitas: admRec, receitasPendente: admRecP,
      despesas: admDesp, despesasPendente: admDespP,
      saldo: admRec - admDesp,
    },
    obras: {
      receitas: obraRec, receitasPendente: obraRecP,
      despesas: obraDesp, despesasPendente: obraDespP,
      saldo: obraRec - obraDesp,
    },
    porProjeto,
  }
}

// ─── Resultado detalhado por obra ──────────────────────────────

export async function getResultadoObra(projetoId: string) {
  const admin = adminClient()

  // Projeto + proposta vinculada
  const { data: projetoRaw } = await admin
    .from('projetos_diario')
    .select('id, titulo_publico, proposal_id, proposals(id, title, value, status, leads(id, name, phone))')
    .eq('id', projetoId)
    .single()

  if (!projetoRaw) return null

  // Deriva nome sem depender da coluna `nome`
  const projeto = {
    ...projetoRaw,
    nome: (projetoRaw as any).titulo_publico
      || (projetoRaw as any).proposals?.leads?.name
      || (projetoRaw as any).proposals?.title
      || 'Projeto sem nome',
  }

  // Lançamentos da obra
  const { data: lancamentos } = await admin
    .from('lancamentos_financeiros')
    .select('*, categorias_financeiras(id, nome, tipo, divisao), profiles!created_by(id, full_name)')
    .eq('projeto_id', projetoId)
    .order('data', { ascending: false })

  const todos = (lancamentos ?? []) as any[]
  const pagos = todos.filter((l: any) => l.status !== 'cancelado')

  const receitas  = pagos.filter((l: any) => l.tipo === 'receita'  && l.status === 'pago').reduce((s: number, l: any) => s + Number(l.valor), 0)
  const despesas  = pagos.filter((l: any) => l.tipo === 'despesa'  && l.status === 'pago').reduce((s: number, l: any) => s + Number(l.valor), 0)
  const aReceber  = pagos.filter((l: any) => l.tipo === 'receita'  && l.status === 'pendente').reduce((s: number, l: any) => s + Number(l.valor), 0)
  const aPagar    = pagos.filter((l: any) => l.tipo === 'despesa'  && l.status === 'pendente').reduce((s: number, l: any) => s + Number(l.valor), 0)

  const valorOrcado = Number((projeto as any).proposals?.value ?? 0)
  const resultado   = receitas - despesas
  const margem      = receitas > 0 ? (resultado / receitas) * 100 : 0
  const desvio      = receitas - valorOrcado
  const desvioPerc  = valorOrcado > 0 ? (desvio / valorOrcado) * 100 : 0

  return {
    projeto: projeto as any,
    valorOrcado,
    receitas,
    despesas,
    resultado,
    margem,
    desvio,
    desvioPerc,
    aReceber,
    aPagar,
    lancamentos: todos,
  }
}

export async function updateLancamentosStatusBulk(ids: string[], status: 'pendente' | 'pago' | 'cancelado') {
  const admin = adminClient()
  const { error } = await admin
    .from('lancamentos_financeiros')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', ids)
  revalidatePath('/financeiro')
  return { error: error?.message }
}

export async function updateLancamentoStatus(id: string, status: 'pendente' | 'pago' | 'cancelado') {
  const admin = adminClient()
  const { error } = await admin
    .from('lancamentos_financeiros')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/financeiro')
  return { error: error?.message }
}

// ─── Projetos disponíveis para lançamentos ────────────────────

export async function getProjetosParaLancamento() {
  const admin = adminClient()
  const { data } = await admin
    .from('projetos_diario')
    .select('id, titulo_publico, proposal_id, proposals(id, title, value, status, leads(id, name))')
    .order('created_at', { ascending: false })
  // Deriva o campo `nome` a partir de titulo_publico ou nome do lead/proposta
  return (data ?? []).map((p: any) => ({
    ...p,
    nome: p.titulo_publico || p.proposals?.leads?.name || p.proposals?.title || 'Projeto sem nome',
  })) as any[]
}
