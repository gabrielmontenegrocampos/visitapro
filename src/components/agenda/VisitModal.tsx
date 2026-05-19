'use client'

import { useState } from 'react'
import { X, Trash2, Loader2 } from 'lucide-react'
import type { Visit } from '@/types/database'

interface Vendedor { id: string; full_name: string }
interface Lead { id: string; name: string; phone: string | null; address: string | null; city: string | null }

interface VisitModalProps {
  visit: (Visit & { leads: { id: string; name: string } | null; profiles: { id: string; full_name: string } | null }) | null
  defaultDate: string | null
  vendedores: Vendedor[]
  leads: Lead[]
  onClose: () => void
  onSave: (data: Partial<Visit>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function VisitModal({ visit, defaultDate, vendedores, leads, onClose, onSave, onDelete }: VisitModalProps) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const defaultDatetime = defaultDate
    ? `${defaultDate.split('T')[0]}T09:00`
    : visit?.scheduled_at
      ? new Date(visit.scheduled_at).toISOString().slice(0, 16)
      : ''

  const [form, setForm] = useState({
    title: visit?.title ?? '',
    lead_id: visit?.lead_id ?? '',
    assigned_to: visit?.assigned_to ?? '',
    scheduled_at: defaultDatetime,
    duration_minutes: visit?.duration_minutes ?? 60,
    status: visit?.status ?? 'agendada',
    address: visit?.address ?? '',
    notes: visit?.notes ?? '',
  })

  function set(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave({
      ...form,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      lead_id: form.lead_id || undefined,
      assigned_to: form.assigned_to || undefined,
    } as Partial<Visit>)
    setSaving(false)
  }

  async function handleDelete() {
    if (!visit) return
    setDeleting(true)
    await onDelete(visit.id)
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{visit ? 'Editar Visita' : 'Nova Visita'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">Lead / Cliente</label>
            <select className="input" value={form.lead_id} onChange={(e) => set('lead_id', e.target.value)}>
              <option value="">Selecione o lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Título da visita</label>
            <input
              className="input"
              placeholder="Ex: Vistoria inicial, Orçamento de pintura..."
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data e hora</label>
              <input
                type="datetime-local"
                className="input"
                value={form.scheduled_at}
                onChange={(e) => set('scheduled_at', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Duração (min)</label>
              <input
                type="number"
                className="input"
                value={form.duration_minutes}
                min={15}
                step={15}
                onChange={(e) => set('duration_minutes', Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="label">Vendedor responsável</label>
            <select className="input" value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
              <option value="">Sem responsável</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="agendada">Agendada</option>
              <option value="realizada">Realizada</option>
              <option value="cancelada">Cancelada</option>
              <option value="reagendada">Reagendada</option>
            </select>
          </div>

          <div>
            <label className="label">Endereço da visita</label>
            <input
              className="input"
              placeholder="Rua, número, bairro..."
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Detalhes adicionais..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-5 border-t border-gray-100 gap-3">
          {visit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger flex items-center gap-2 text-sm"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Excluir
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
