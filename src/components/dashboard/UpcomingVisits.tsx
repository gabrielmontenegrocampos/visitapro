'use client'

import { useState } from 'react'
import { Calendar, User } from 'lucide-react'
import Link from 'next/link'
import VisitViewModal from '@/components/agenda/VisitViewModal'
import type { Visit } from '@/types/database'

interface VisitWithRelations extends Visit {
  leads: { id: string; name: string; phone: string | null; address: string | null } | { id: string; name: string; phone: string | null; address: string | null }[] | null
  profiles: { id: string; full_name: string } | { id: string; full_name: string }[] | null
}

function normalizeLead(leads: VisitWithRelations['leads']) {
  if (!leads) return null
  return Array.isArray(leads) ? (leads[0] ?? null) : leads
}

function normalizeProfile(profiles: VisitWithRelations['profiles']) {
  if (!profiles) return null
  return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles
}

function normalizeVisit(v: VisitWithRelations) {
  return { ...v, leads: normalizeLead(v.leads), profiles: normalizeProfile(v.profiles) }
}

function getStatusColor(scheduledAt: string) {
  const diffHours = (new Date(scheduledAt).getTime() - Date.now()) / 3600000
  if (diffHours < 0) return 'bg-red-500'
  if (diffHours <= 3) return 'bg-yellow-400'
  return 'bg-green-500'
}

function formatVisitTime(scheduledAt: string, durationMinutes: number) {
  const start = new Date(scheduledAt)
  const end = new Date(start.getTime() + durationMinutes * 60000)
  const date = start.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  const startTime = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const endTime = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return { date, time: `${startTime} – ${endTime}` }
}

export default function UpcomingVisits({ visits }: { visits: VisitWithRelations[] }) {
  const [selected, setSelected] = useState<ReturnType<typeof normalizeVisit> | null>(null)
  const [localVisits, setLocalVisits] = useState(visits)

  return (
    <>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Próximas Visitas</h3>
          <Link href="/agenda" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Ver agenda
          </Link>
        </div>

        {localVisits.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma visita agendada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {localVisits.map((visit) => {
              const norm = normalizeVisit(visit)
              const { date, time } = formatVisitTime(visit.scheduled_at, visit.duration_minutes)
              const dot = getStatusColor(visit.scheduled_at)
              const vendedor = norm.profiles?.full_name

              return (
                <button
                  key={visit.id}
                  onClick={() => setSelected(norm)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-blue-50 active:bg-blue-100 transition-colors text-left w-full"
                >
                  <div className="shrink-0 flex flex-col items-center gap-1 w-10">
                    <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                    <span className="text-[10px] text-gray-400 leading-tight text-center">{date}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {norm.leads?.name ?? visit.title ?? 'Visita'}
                    </p>
                    <p className="text-xs text-gray-500">{time}</p>
                  </div>

                  {vendedor && (
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-xs text-gray-600 max-w-[72px] truncate">
                        {vendedor.split(' ')[0]}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <VisitViewModal
          visit={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setSelected(null); window.location.href = '/agenda' }}
          onDeleted={(id) => {
            setLocalVisits((prev) => prev.filter((v) => v.id !== id))
            setSelected(null)
          }}
          onStatusChanged={(updated) => {
            setLocalVisits((prev) =>
              prev.map((v) => v.id === updated.id ? { ...v, status: updated.status } : v)
            )
            setSelected(updated)
          }}
        />
      )}
    </>
  )
}
