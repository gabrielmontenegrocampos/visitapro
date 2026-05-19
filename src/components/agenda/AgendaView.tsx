'use client'

import { useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { EventClickArg } from '@fullcalendar/core'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VisitModal from './VisitModal'
import type { Visit } from '@/types/database'

interface Vendedor { id: string; full_name: string }
interface Lead { id: string; name: string; phone: string | null; address: string | null; city: string | null }
interface VisitWithRelations extends Visit {
  leads: Pick<Lead, 'id' | 'name' | 'phone' | 'address'> | null
  profiles: { id: string; full_name: string } | null
}

interface AgendaViewProps {
  visits: VisitWithRelations[]
  vendedores: Vendedor[]
  leads: Lead[]
  currentUserId: string
}

const VENDEDOR_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1',
]

export default function AgendaView({ visits: initialVisits, vendedores, leads, currentUserId }: AgendaViewProps) {
  const supabase = createClient()
  const calendarRef = useRef<FullCalendar>(null)
  const [visits, setVisits] = useState(initialVisits)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<VisitWithRelations | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [filterVendedor, setFilterVendedor] = useState<string>('todos')

  const vendedorColorMap = Object.fromEntries(
    vendedores.map((v, i) => [v.id, VENDEDOR_COLORS[i % VENDEDOR_COLORS.length]])
  )

  const filteredVisits = filterVendedor === 'todos'
    ? visits
    : visits.filter((v) => v.assigned_to === filterVendedor)

  const events = filteredVisits.map((v) => ({
    id: v.id,
    title: v.leads?.name ?? v.title,
    start: v.scheduled_at,
    end: new Date(new Date(v.scheduled_at).getTime() + v.duration_minutes * 60000).toISOString(),
    backgroundColor: v.assigned_to ? vendedorColorMap[v.assigned_to] ?? '#3b82f6' : '#9ca3af',
    borderColor: 'transparent',
    textColor: '#fff',
    extendedProps: { visitId: v.id },
  }))

  function handleDateClick(info: { dateStr: string }) {
    setSelectedDate(info.dateStr)
    setSelectedVisit(null)
    setModalOpen(true)
  }

  function handleEventClick(info: EventClickArg) {
    const visitId = info.event.extendedProps['visitId'] as string
    const visit = visits.find((v) => v.id === visitId)
    if (visit) {
      setSelectedVisit(visit)
      setSelectedDate(null)
      setModalOpen(true)
    }
  }

  async function handleSave(data: Partial<Visit>) {
    if (selectedVisit) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated } = await supabase
        .from('visits')
        .update(data as any)
        .eq('id', selectedVisit.id)
        .select('*, leads(id, name, phone, address), profiles(id, full_name)')
        .single()
      if (updated) setVisits((prev) => prev.map((v) => (v.id === updated.id ? updated as VisitWithRelations : v)))
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: created } = await supabase
        .from('visits')
        .insert({ ...data, created_by: currentUserId } as any)
        .select('*, leads(id, name, phone, address), profiles(id, full_name)')
        .single()
      if (created) setVisits((prev) => [...prev, created as VisitWithRelations])
    }
    setModalOpen(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('visits').delete().eq('id', id)
    setVisits((prev) => prev.filter((v) => v.id !== id))
    setModalOpen(false)
  }

  return (
    <>
      <div className="card p-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterVendedor('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterVendedor === 'todos' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            {vendedores.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setFilterVendedor(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterVendedor === v.id ? 'text-white' : 'text-gray-700 hover:opacity-80'
                }`}
                style={filterVendedor === v.id
                  ? { backgroundColor: VENDEDOR_COLORS[i % VENDEDOR_COLORS.length] }
                  : { backgroundColor: VENDEDOR_COLORS[i % VENDEDOR_COLORS.length] + '22', color: VENDEDOR_COLORS[i % VENDEDOR_COLORS.length] }
                }
              >
                {v.full_name.split(' ')[0]}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setSelectedVisit(null); setSelectedDate(null); setModalOpen(true) }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Visita
          </button>
        </div>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={ptBrLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          nowIndicator
          height="auto"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        />
      </div>

      {modalOpen && (
        <VisitModal
          visit={selectedVisit}
          defaultDate={selectedDate}
          vendedores={vendedores}
          leads={leads}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
