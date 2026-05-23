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

/** Recalcula proposals.value = sum(item.total_price) × BDI */
async function recalculateValue(proposalId: string) {
  const admin = adminClient()
  const [itemsRes, proposalRes] = await Promise.all([
    admin.from('proposal_items').select('total_price').eq('proposal_id', proposalId),
    admin.from('proposals').select('bdi_tax, bdi_insurance, bdi_profit').eq('id', proposalId).single(),
  ])
  const items    = (itemsRes.data ?? []) as { total_price: number }[]
  const proposal = proposalRes.data as { bdi_tax: number | null; bdi_insurance: number | null; bdi_profit: number | null } | null
  if (!proposal) return

  const directCost = items.reduce((s, i) => s + (i.total_price ?? 0), 0)
  const bdiPct     = ((proposal.bdi_tax ?? 0) + (proposal.bdi_insurance ?? 0) + (proposal.bdi_profit ?? 0)) / 100
  const totalValue = directCost * (1 + bdiPct)

  await admin.from('proposals').update({ value: totalValue }).eq('id', proposalId)
}

// ---------------------------------------------------------------------------

export interface ItemPayload {
  area_name: string
  service_type: string
  unit: string
  quantity: number
  labor_cost: number
  material_cost: number
  equipment_cost: number
  description?: string | null
}

export async function createProposalItem(proposalId: string, data: ItemPayload) {
  const admin     = adminClient()
  const unitPrice = data.labor_cost + data.material_cost + data.equipment_cost
  const totalPrice = data.quantity * unitPrice

  const { data: item, error } = await admin
    .from('proposal_items')
    .insert({
      proposal_id:    proposalId,
      area_name:      data.area_name,
      service_type:   data.service_type,
      description:    data.description ?? null,
      unit:           data.unit,
      quantity:       data.quantity,
      labor_cost:     data.labor_cost,
      material_cost:  data.material_cost,
      equipment_cost: data.equipment_cost,
      unit_price:     unitPrice,
      total_price:    totalPrice,
      sort_order:     0,
    })
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  await recalculateValue(proposalId)
  revalidatePath(`/propostas/${proposalId}`)
  return { error: null, data: item }
}

export async function updateProposalItem(itemId: string, proposalId: string, data: ItemPayload) {
  const admin      = adminClient()
  const unitPrice  = data.labor_cost + data.material_cost + data.equipment_cost
  const totalPrice = data.quantity * unitPrice

  const { error } = await admin
    .from('proposal_items')
    .update({
      area_name:      data.area_name,
      service_type:   data.service_type,
      description:    data.description ?? null,
      unit:           data.unit,
      quantity:       data.quantity,
      labor_cost:     data.labor_cost,
      material_cost:  data.material_cost,
      equipment_cost: data.equipment_cost,
      unit_price:     unitPrice,
      total_price:    totalPrice,
    })
    .eq('id', itemId)

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

export async function updateProposalBDI(
  proposalId: string,
  bdi: { tax: number; insurance: number; profit: number }
) {
  const admin = adminClient()
  const { error } = await admin
    .from('proposals')
    .update({ bdi_tax: bdi.tax, bdi_insurance: bdi.insurance, bdi_profit: bdi.profit })
    .eq('id', proposalId)

  if (error) return { error: error.message }
  await recalculateValue(proposalId)
  revalidatePath(`/propostas/${proposalId}`)
  revalidatePath('/propostas')
  return { error: null }
}

export async function updateProposalStatus(proposalId: string, status: string) {
  const admin = adminClient()
  const { error } = await admin
    .from('proposals')
    .update({
      status,
      sent_at: status === 'enviada' ? new Date().toISOString() : undefined,
    })
    .eq('id', proposalId)

  if (error) return { error: error.message }
  revalidatePath(`/propostas/${proposalId}`)
  revalidatePath('/propostas')
  return { error: null }
}
