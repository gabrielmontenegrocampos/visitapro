'use client'

import { useState, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { EventClickArg } from '@fullcalendar/core'
import { Plus } from 'lucide-react'
import { createVisit, updateVisit, deleteVisit } from '@/app/(crm)/agenda/actions'
import VisitModal from './VisitModal'
import VisitViewModal from './VisitViewModal'
import type { Visit } from '@/types/database'

interface Vendedor { id: string; full_name: string }
interface Lead { id: string; name: string; phone: string | null; address: string | null; neighborhood: string | null; city: string | null }
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

const STATUS_BORDER: Record<string, string> = {
  realizada: '#22c55e',
  cancelada: '#ef4444',
  reagendada: '#f59e0b',
}

export default function AgendaView({ visits: initialVisits, vendedores, leads, currentUserId }: AgendaViewProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const [visits, setVisits] = useState(initialVisits)
  const [viewVisit, setViewVisit] = useState<VisitWithRelations | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editVisit, setEditVisit] = useState<VisitWithRelations | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [filterVendedor, setFilterVendedor] = useState<string>('todos')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    setMounted(true)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const vendedorColorMap = Object.fromEntries(
    vendedores.map((v, i) => [v.id, VENDEDOR_COLORS[i % VENDEDOR_COLORS.length]])
  )

  const filteredVisits = filterVendedor === 'todos'
    ? visits
    : visits.filter((v) => v.assigned_to === filterVendedor)

  function getEventBgColor(v: VisitWithRelations): string {
    if (v.status !== 'agendada') {
      return v.assigned_to ? vendedorColorMap[v.assigned_to] ?? '#3b82f6' : '#9ca3af'
    }
    const diffHours = (new Date(v.scheduled_at).getTime() - Date.now()) / 3600000
    if (diffHours < 0) return '#ef4444'
    if (diffHours <= 3) return '#f59e0b'
    return '#22c55e'
  }

  const events = filteredVisits.map((v) => ({
    id: v.id,
    title: v.leads?.name ?? v.title,
    start: v.scheduled_at,
    end: new Date(new Date(v.scheduled_at).getTime() + v.duration_minutes * 60000).toISOString(),
    backgroundColor: getEventBgColor(v),
    borderColor: v.status !== 'agendada' ? (STATUS_BORDER[v.status] ?? 'transparent') : 'transparent',
    borderWidth: v.status !== 'agendada' ? 3 : 0,
    textColor: '#fff',
  }))

  function handleDateClick(info: { dateStr: string }) {
    setSelectedDate(info.dateStr)
    setEditVisit(null)
    setEditModalOpen(true)
  }

  function handleEventClick(info: EventClickArg) {
    const visit = visits.find((v) => v.id === info.event.id)
    if (visit) setViewVisit(visit)
  }

  function normalizeVisit(raw: Record<string, unknown>): VisitWithRelations {
    const leads = Array.isArray(raw.leads) ? (raw.leads[0] ?? null) : raw.leads
    const profiles = Array.isArray(raw.profiles) ? (raw.profiles[0] ?? null) : raw.profiles
    return { ...raw, leads, profiles } as unknown as VisitWithRelations
  }

  async function handleSave(data: Partial<Visit>) {
    setSaveError(null)
    try {
      if (editVisit) {
        const { data: updated, error } = await updateVisit(editVisit.id, data as Record<string, unknown>)
        if (error) { setSaveError(error); return }
        if (updated) {
          const norm = normalizeVisit(updated as Record<string, unknown>)
          setVisits((prev) => prev.map((v) => v.id === norm.id ? norm : v))
        }
      } else {
        const { data: created, error } = await createVisit({ ...data, created_by: currentUserId } as Record<string, unknown>)
        if (error) { setSaveError(error); return }
        if (created) setVisits((prev) => [...prev, normalizeVisit(created as Record<string, unknown>)])
      }
      setEditModalOpen(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erro ao salvar visita')
    }
  }

  function openEdit(visit?: VisitWithRelations) {
    setViewVisit(null)
    setEditVisit(visit ?? null)
    setSelectedDate(null)
    setEditModalOpen(true)
  }

  return (
    <>
      <div className="card p-3 md:p-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Filtro vendedores — scroll horizontal no mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0 pr-2">
            <button
              onClick={() => setFilterVendedor('todos')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterVendedor === 'todos' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Todos
            </button>
            {vendedores.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setFilterVendedor(v.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterVendedor === v.id ? 'text-white' : ''
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
            onClick={() => { setEditVisit(null); setSelectedDate(null); setEditModalOpen(true) }}
            className="btn-primary shrink-0 flex items-center gap-1.5 text-sm px-3 py-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Visita</span>
          </button>
        </div>

        {/* Calendar skeleton while detecting screen size */}
        {!mounted ? (
          <div className="h-[520px] bg-gray-50 rounded-xl animate-pulse" />
        ) : (
          <div className="fc-mobile-wrapper">
            <FullCalendar
              key={isMobile ? 'mobile' : 'desktop'}
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
              locale={ptBrLocale}
              headerToolbar={isMobile
                ? { left: 'prev,next', center: 'title', right: 'today' }
                : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }
              }
              footerToolbar={isMobile
                ? { center: 'timeGridDay,timeGridWeek,dayGridMonth' }
                : false
              }
              events={events}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              slotMinTime="07:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              nowIndicator
              height={isMobile ? 520 : 'auto'}
              eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
              slotDuration="00:30:00"
              slotLabelInterval="01:00:00"
              slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
              expandRows
            />
          </div>
        )}
      </div>

      {viewVisit && (
        <VisitViewModal
          visit={viewVisit}
          onClose={() => setViewVisit(null)}
          onEdit={() => openEdit(viewVisit)}
          onDeleted={(id) => { setVisits((prev) => prev.filter((v) => v.id !== id)); setViewVisit(null) }}
          onStatusChanged={(updated) => {
            setVisits((prev) => prev.map((v) => v.id === updated.id ? updated : v))
            setViewVisit(updated)
          }}
        />
      )}

      {editModalOpen && (
        <VisitModal
          visit={editVisit}
          defaultDate={selectedDate}
          vendedores={vendedores}
          leads={leads}
          onClose={() => { setEditModalOpen(false); setSaveError(null) }}
          onSave={handleSave}
          onDelete={async (id) => {
            await deleteVisit(id)
            setVisits((prev) => prev.filter((v) => v.id !== id))
            setEditModalOpen(false)
          }}
          saveError={saveError}
        />
      )}
    </>
  )
}
