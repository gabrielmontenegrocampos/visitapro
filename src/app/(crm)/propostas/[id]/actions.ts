'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** Recalcula proposals.value usando itens + BDI flexível */
async function recalculateValue(proposalId: string) {
  const admin = adminClient()
  const [itemsRes, bdiRes] = await Promise.all([
    admin.from('proposal_items').select('total_price').eq('proposal_id', proposalId),
    admin.from('proposal_bdi_items').select('percentage').eq('proposal_id', proposalId),
  ])
  const items    = (itemsRes.data ?? []) as { total_price: number }[]
  const bdiItems = (bdiRes.data   ?? []) as { percentage: number }[]

  const directCost = items.reduce((s, i) => s + (i.total_price ?? 0), 0)
  const bdiPct     = bdiItems.reduce((s, b) => s + (b.percentage ?? 0), 0) / 100
  const totalValue = directCost * (1 + bdiPct)

  await admin.from('proposals').update({ value: totalValue }).eq('id', proposalId)
}

// ---------------------------------------------------------------------------
// Proposal Items
// ---------------------------------------------------------------------------

export type Measurement = { id: string; label: string; height: number; width: number }

export interface ServiceItemPayload {
  item_type: 'servico'
  area_name: string
  service_type: string
  unit: string
  measurements: Measurement[]
  quantity: number          // total m² = sum(h×w)
  labor_cost: number        // custo MO por unidade
  description?: string | null
}

export interface SimpleItemPayload {
  item_type: 'material' | 'equipamento'
  area_name: string         // nome do item
  unit: string
  quantity: number
  unit_price: number
  description?: string | null
}

export type ItemPayload = ServiceItemPayload | SimpleItemPayload

export async function createProposalItem(proposalId: string, data: ItemPayload) {
  const admin = adminClient()

  let unitPrice: number
  let totalPrice: number
  let row: Record<string, unknown>

  if (data.item_type === 'servico') {
    unitPrice  = data.labor_cost
    totalPrice = data.quantity * unitPrice
    row = {
      proposal_id:  proposalId,
      item_type:    'servico',
      area_name:    data.area_name,
      service_type: data.service_type,
      description:  data.description ?? null,
      unit:         data.unit,
      quantity:     data.quantity,
      labor_cost:   data.labor_cost,
      material_cost: 0,
      equipment_cost: 0,
      unit_price:   unitPrice,
      total_price:  totalPrice,
      measurements: data.measurements,
      sort_order:   0,
    }
  } else {
    unitPrice  = data.unit_price
    totalPrice = data.quantity * unitPrice
    row = {
      proposal_id:  proposalId,
      item_type:    data.item_type,
      area_name:    data.area_name,
      description:  data.description ?? null,
      unit:         data.unit,
      quantity:     data.quantity,
      labor_cost:   0,
      material_cost: 0,
      equipment_cost: 0,
      unit_price:   unitPrice,
      total_price:  totalPrice,
      measurements: [],
      sort_order:   0,
    }
  }

  const { data: item, error } = await admin
    .from('proposal_items')
    .insert(row)
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  await recalculateValue(proposalId)
  revalidatePath(`/propostas/${proposalId}`)
  return { error: null, data: item }
}

export async function updateProposalItem(itemId: string, proposalId: string, data: ItemPayload) {
  const admin = adminClient()

  let unitPrice: number
  let totalPrice: number
  let updates: Record<string, unknown>

  if (data.item_type === 'servico') {
    unitPrice  = data.labor_cost
    totalPrice = data.quantity * unitPrice
    updates = {
      area_name:    data.area_name,
      service_type: data.service_type,
      description:  data.description ?? null,
      unit:         data.unit,
      quantity:     data.quantity,
      labor_cost:   data.labor_cost,
      material_cost: 0,
      equipment_cost: 0,
      unit_price:   unitPrice,
      total_price:  totalPrice,
      measurements: data.measurements,
    }
  } else {
    unitPrice  = data.unit_price
    totalPrice = data.quantity * unitPrice
    updates = {
      area_name:    data.area_name,
      description:  data.description ?? null,
      unit:         data.unit,
      quantity:     data.quantity,
      labor_cost:   0,
      material_cost: 0,
      equipment_cost: 0,
      unit_price:   unitPrice,
      total_price:  totalPrice,
      measurements: [],
    }
  }

  const { error } = await admin.from('proposal_items').update(updates).eq('id', itemId)
  if (error) return { error: error.message }
  await recalculateValue(proposalId)
  revalidatePath(`/propostas/${proposalId}`)
  return { error: null }
}

export async function deleteProposalItem(itemId: string, proposalId: string) {
  const admin = adminClient()
  const { error } = await admin.from('proposal_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  await recalculateValue(proposalId)
  revalidatePath(`/propostas/${proposalId}`)
  return { error: null }
}

// ---------------------------------------------------------------------------
// BDI Items (flexíveis)
// ---------------------------------------------------------------------------

export async function createBdiItem(proposalId: string, data: { label: string; percentage: number }) {
  const admin = adminClient()
  const { data: item, error } = await admin
    .from('proposal_bdi_items')
    .insert({ proposal_id: proposalId, label: data.label, percentage: data.percentage })
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  await recalculateValue(proposalId)
  revalidatePath(`/propostas/${proposalId}`)
  return { error: null, data: item }
}

export async function updateBdiItem(itemId: string, proposalId: string, data: { label: string; percentage: number }) {
  const admin = adminClient()
  const { error } = await admin
    .from('proposal_bdi_items')
    .update({ label: data.label, percentage: data.percentage })
    .eq('id', itemId)

  if (error) return { error: error.message }
  await recalculateValue(proposalId)
  revalidatePath(`/propostas/${proposalId}`)
  return { error: null }
}

export async function deleteBdiItem(itemId: string, proposalId: string) {
  const admin = adminClient()
  const { error } = await admin.from('proposal_bdi_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  await recalculateValue(proposalId)
  revalidatePath(`/propostas/${proposalId}`)
  return { error: null }
}

// ---------------------------------------------------------------------------
// Delete proposal
// ---------------------------------------------------------------------------

export async function deleteProposal(proposalId: string) {
  const admin = adminClient()
  const { error } = await admin.from('proposals').delete().eq('id', proposalId)
  if (error) return { error: error.message }
  revalidatePath('/propostas')
  revalidatePath('/memoria-calculo')
  return { error: null }
}

// ---------------------------------------------------------------------------
// Proposal title
// ---------------------------------------------------------------------------

export async function updateProposalTitle(proposalId: string, title: string) {
  const admin = adminClient()
  const { error } = await admin.from('proposals').update({ title }).eq('id', proposalId)
  if (error) return { error: error.message }
  revalidatePath(`/propostas/${proposalId}`)
  revalidatePath('/propostas')
  revalidatePath('/memoria-calculo')
  return { error: null }
}

// ---------------------------------------------------------------------------
// Proposal status
// ---------------------------------------------------------------------------

export async function updateProposalStatus(proposalId: string, status: string) {
  const admin = adminClient()

  // Atualiza status da proposta
  const { error } = await admin
    .from('proposals')
    .update({ status, sent_at: status === 'enviada' ? new Date().toISOString() : undefined })
    .eq('id', proposalId)
  if (error) return { error: error.message }

  // Busca lead_id e título da proposta
  const { data: proposal } = await admin
    .from('proposals')
    .select('lead_id, title')
    .eq('id', proposalId)
    .single()

  if (proposal?.lead_id) {
    // Mapeamento status → slug do pipeline
    const slugMap: Record<string, string | null> = {
      rascunho: null,
      enviada:  'proposta_enviada',
      aceita:   'fechado_ganho',
      recusada: 'fechado_perdido',
      expirada: 'fechado_perdido',
    }
    const targetSlug = slugMap[status] ?? null

    // Move o lead para a stage correspondente
    if (targetSlug) {
      const { data: stage } = await admin
        .from('pipeline_stages')
        .select('id, name')
        .eq('slug', targetSlug)
        .single()

      if (stage) {
        await admin.from('leads').update({ stage_id: stage.id }).eq('id', proposal.lead_id)
      }
    }

    // Labels amigáveis para o histórico
    const statusLabels: Record<string, string> = {
      rascunho: 'Rascunho',
      enviada:  'Enviada',
      aceita:   'Aceita',
      recusada: 'Recusada',
      expirada: 'Expirada',
    }

    // Registra atividade no histórico do lead
    await admin.from('activities').insert({
      lead_id: proposal.lead_id,
      type:    'proposta',
      content: `Status da proposta "${proposal.title}" alterado para ${statusLabels[status] ?? status}`,
    })
  }

  revalidatePath(`/propostas/${proposalId}`)
  revalidatePath('/propostas')
  revalidatePath('/pipeline')
  revalidatePath('/leads')
  return { error: null }
}
