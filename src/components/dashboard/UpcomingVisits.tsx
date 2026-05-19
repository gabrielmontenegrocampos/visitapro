import { Calendar, MapPin } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface Visit {
  id: string
  title: string
  scheduled_at: string
  status: string
  // Supabase returns joins as arrays or objects depending on the relationship
  leads: { name: string } | { name: string }[] | null
  profiles: { full_name: string } | { full_name: string }[] | null
}

interface UpcomingVisitsProps {
  visits: Visit[]
}

export default function UpcomingVisits({ visits }: UpcomingVisitsProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Próximas Visitas</h3>
        <Link href="/agenda" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Ver agenda
        </Link>
      </div>

      {visits.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhuma visita agendada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <div key={visit.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{Array.isArray(visit.leads) ? visit.leads[0]?.name : visit.leads?.name ?? 'Cliente'}</p>
                <p className="text-xs text-gray-500 truncate">{visit.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">{formatDateTime(visit.scheduled_at)}</span>
                </div>
                {visit.profiles && (
                  <p className="text-xs text-blue-600 mt-0.5">
                    {Array.isArray(visit.profiles) ? visit.profiles[0]?.full_name : visit.profiles.full_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
