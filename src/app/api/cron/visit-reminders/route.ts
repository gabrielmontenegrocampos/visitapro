import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized', env: !!process.env.CRON_SECRET }, { status: 401 })
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const supabase = adminClient()
  const now = new Date()
  // Find visits scheduled between 25 and 35 minutes from now
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + 35 * 60 * 1000)

  const { data: visits } = await supabase
    .from('visits')
    .select('id, title, scheduled_at, assigned_to, leads(name, city, address)')
    .eq('status', 'agendada')
    .gte('scheduled_at', windowStart.toISOString())
    .lte('scheduled_at', windowEnd.toISOString())

  if (!visits?.length) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const visit of visits) {
    if (!visit.assigned_to) continue

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, subscription')
      .eq('user_id', visit.assigned_to)

    if (!subs?.length) continue

    const lead = Array.isArray(visit.leads) ? visit.leads[0] : visit.leads
    const time = new Date(visit.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const title = `⏰ Visita em 30 min · ${time}`
    const body  = [visit.title || lead?.name, lead?.city || lead?.address].filter(Boolean).join(' · ')

    for (const { endpoint, subscription } of subs) {
      try {
        await webpush.sendNotification(subscription, JSON.stringify({ title, body, url: '/agenda' }))
        sent++
      } catch {
        // Subscription expired or invalid — remove it
        await supabase.from('push_subscriptions').delete()
          .eq('user_id', visit.assigned_to)
          .eq('endpoint', endpoint)
      }
    }
  }

  return NextResponse.json({ sent })
}
