'use client'

import { useState } from 'react'
import { X, Pencil, Trash2, MapPin, Phone, User, Clock, Calendar, FileText, Loader2 } from 'lucide-react'
import { updateVisit, deleteVisit } from '@/app/(crm)/agenda/actions'
import { formatDateTime, mapsUrl, whatsappUrl, VISIT_STATUS_LABELS } from '@/lib/utils'
import type { Visit } from '@/types/database'

interface VisitWithRelations extends Visit {
  leads: { id: string; name: string; phone: string | null; address: string | null } | null
  profiles: { id: string; full_name: string } | null
}

interface VisitViewModalProps {
  visit: VisitWithRelations
  onClose: () => void
  onEdit: () => void
  onDeleted: (id: string) => void
  onStatusChanged: (visit: VisitWithRelations) => void
}

const STATUS_CONFIG = {
  agendada:   { label: 'Agendada',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  realizada:  { label: 'Realizada',  color: 'bg-green-100 text-green-700 border-green-200' },
  cancelada:  { label: 'Cancelada',  color: 'bg-red-100 text-red-700 border-red-200' },
  reagendada: { label: 'Reagendada', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
} as const

type Status = keyof typeof STATUS_CONFIG

export default function VisitViewModal({ visit, onClose, onEdit, onDeleted, onStatusChanged }: VisitViewModalProps) {
  const [status, setStatus] = useState<Status>(visit.status as Status)
  const [changingStatus, setChangingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleStatusChange(newStatus: Status) {
    if (newStatus === status) return
    setChangingStatus(true)
    const { data, error } = await updateVisit(visit.id, { status: newStatus })
    if (!error && data) {
      setStatus(newStatus)
      const leads = Array.isArray((data as Record<string,unknown>).leads)
        ? (((data as Record<string,unknown>).leads as unknown[])[0] ?? null)
        : (data as Record<string,unknown>).leads
      const profiles = Array.isArray((data as Record<string,unknown>).profiles)
        ? (((data as Record<string,unknown>).profiles as unknown[])[0] ?? null)
        : (data as Record<string,unknown>).profiles
      onStatusChanged({ ...data, leads, profiles } as unknown as VisitWithRelations)
    }
    setChangingStatus(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await deleteVisit(visit.id)
    onDeleted(visit.id)
  }

  const addressUrl = mapsUrl([visit.address, visit.leads?.address])
  const displayAddress = visit.address || visit.leads?.address

  const scheduled = new Date(visit.scheduled_at)
  const endTime = new Date(scheduled.getTime() + visit.duration_minutes * 60000)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[92vh] flex flex-col">

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="font-bold text-gray-900 truncate">{visit.title || visit.leads?.name || 'Visita'}</h2>
            {visit.leads?.name && visit.title && (
              <p className="text-xs text-gray-500 mt-0.5">{visit.leads.name}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Status pills */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={changingStatus}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    status === s
                      ? STATUS_CONFIG[s].color + ' ring-2 ring-offset-1 ring-current'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {changingStatus && status !== s ? STATUS_CONFIG[s].label : STATUS_CONFIG[s].label}
                  {status === s && changingStatus && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-gray-800">{formatDateTime(visit.scheduled_at)}</p>
                <p className="text-xs text-gray-400">até {endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {visit.duration_minutes} min</p>
              </div>
            </div>

            {visit.leads?.phone && (
              <a href={whatsappUrl(visit.leads.phone) ?? '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-blue-500" />
                </div>
                {visit.leads.phone}
              </a>
            )}

            {visit.profiles && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                {visit.profiles.full_name}
              </div>
            )}

            {displayAddress && (
              <a
                href={addressUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700"
              >
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-blue-500" />
                </div>
                <span className="truncate">{displayAddress}</span>
              </a>
            )}

            {visit.notes && (
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                <p className="leading-relaxed">{visit.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100">
          {confirmDelete ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-gray-700 font-medium">Excluir este agendamento?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1 text-sm">Cancelar</button>
                <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1 text-sm flex items-center justify-center gap-2">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'Excluindo...' : 'Confirmar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn-secondary flex items-center gap-2 text-sm px-3"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
              <button onClick={onEdit} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
                <Pencil className="w-4 h-4" />
                Editar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
