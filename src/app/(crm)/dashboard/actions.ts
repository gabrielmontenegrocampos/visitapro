'use server'

import { createClient as adminCreate } from '@supabase/supabase-js'

function adminClient() {
  return adminCreate(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function getDashboardMetrics(inicio?: string, fim?: string) {
  const admin = adminClient()
  const hasFilter = !!(inicio && fim)

  // Total leads (all-time, never filtered) + upcoming visits + pipeline value always-current
  const [totalLeadsRes, visitsRes, pipelineRes] = await Promise.all([
    admin.from('leads').select('id', { count: 'exact', head: true }),
    admin.from('visits')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_at', new Date().toISOString())
      .in('status', ['agendada', 'reagendada']),
    admin.from('proposals').select('value').in('status', ['enviada']),
  ])

  // Leads created in period (or current month when no filter)
  let leadsQuery = admin.from('leads').select('id', { count: 'exact', head: true })
  if (hasFilter) {
    leadsQuery = leadsQuery
      .gte('created_at', inicio + 'T00:00:00')
      .lte('created_at', fim + 'T23:59:59')
  } else {
    const mesInicio = new Date()
    mesInicio.setDate(1)
    mesInicio.setHours(0, 0, 0, 0)
    leadsQuery = leadsQuery.gte('created_at', mesInicio.toISOString())
  }
  const leadsNoPeriodoRes = await leadsQuery

  // Proposals filtered by period
  let propostasQuery = admin.from('proposals').select('status, value')
  if (hasFilter) {
    propostasQuery = propostasQuery
      .gte('created_at', inicio + 'T00:00:00')
      .lte('created_at', fim + 'T23:59:59')
  }
  const { data: propostas } = await propostasQuery
  const ps = propostas ?? []

  return {
    total_leads: totalLeadsRes.count ?? 0,
    propostas_enviadas: ps.filter(p => p.status === 'enviada').length,
    propostas_fechadas: ps.filter(p => p.status === 'aceita').length,
    propostas_recusadas: ps.filter(p => p.status === 'recusada').length,
    valor_fechado: ps.filter(p => p.status === 'aceita').reduce((s, p) => s + Number(p.value ?? 0), 0),
    valor_pipeline: (pipelineRes.data ?? []).reduce((s, p) => s + Number(p.value ?? 0), 0),
    visitas_agendadas: visitsRes.count ?? 0,
    leads_mes_atual: leadsNoPeriodoRes.count ?? 0,
  }
}
