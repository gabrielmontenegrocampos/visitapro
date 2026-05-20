'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, Loader2, MapPin } from 'lucide-react'
import type { Visit } from '@/types/database'
import CepField, { type CepResult } from '@/components/ui/CepField'
import { maskCep } from '@/lib/masks'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface Vendedor { id: string; full_name: string }
interface Lead { id: string; name: string; phone: string | null; cep: string | null; address: string | null; number: string | null; complement: string | null; neighborhood: string | null; city: string | null }

interface VisitModalProps {
  visit: (Visit & { leads: { id: string; name: string } | null; profiles: { id: string; full_name: string } | null }) | null
  defaultDate: string | null
  vendedores: Vendedor[]
  leads: Lead[]
  onClose: () => void
  onSave: (data: Partial<Visit>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  saveError?: string | null
}

export default function VisitModal({ visit, defaultDate, vendedores, leads, onClose, onSave, onDelete, saveError }: VisitModalProps) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const todayAt9 = new Date()
  todayAt9.setHours(9, 0, 0, 0)
  const fallback = `${todayAt9.toISOString().slice(0, 10)}T09:00`

  const defaultDatetime = defaultDate
    ? `${defaultDate.split('T')[0]}T09:00`
    : visit?.scheduled_at
      ? new Date(visit.scheduled_at).toISOString().slice(0, 16)
      : fallback

  const [form, setForm] = useState({
    title: visit?.title ?? '',
    lead_id: visit?.lead_id ?? '',
    assigned_to: visit?.assigned_to ?? '',
    scheduled_at: defaultDatetime,
    duration_minutes: visit?.duration_minutes ?? 60,
    status: visit?.status ?? 'agendada',
    cep: maskCep(visit?.cep ?? ''),
    address: visit?.address ?? '',
    number: visit?.number ?? '',
    complement: visit?.complement ?? '',
    notes: visit?.notes ?? '',
  })

  function set(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Auto-fill address/cep from lead when selected
  useEffect(() => {
    if (!form.lead_id) return
    const lead = leads.find((l) => l.id === form.lead_id)
    if (!lead) return
    setForm((prev) => ({
      ...prev,
      cep: maskCep(lead.cep ?? '') || prev.cep,
      address: lead.address ?? prev.address,
      number: lead.number ?? prev.number,
      complement: lead.complement ?? prev.complement,
      title: prev.title || lead.name,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.lead_id])

  function handleCepFound(result: CepResult) {
    setForm((prev) => ({
      ...prev,
      address: result.logradouro,
    }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave({
      title: form.title,
      lead_id: form.lead_id || undefined,
      assigned_to: form.assigned_to || undefined,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: form.duration_minutes,
      status: form.status,
      cep: form.cep.trim() || null,
      address: form.address.trim() || null,
      number: form.number.trim() || null,
      complement: form.complement.trim() || null,
      notes: form.notes,
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{visit ? 'Editar Visita' : 'Nova Visita'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          <div>
            <label className="label">Lead / Cliente</label>
            <SearchableSelect
              value={form.lead_id}
              onChange={(v) => set('lead_id', v)}
              placeholder="Selecione o lead"
              options={[
                { value: '', label: 'Selecione o lead' },
                ...leads.map((l) => ({
                  value: l.id,
                  label: l.name,
                  subtitle: [l.phone, l.city].filter(Boolean).join(' · '),
                })),
              ]}
            />
            {(() => {
              const lead = leads.find((l) => l.id === form.lead_id)
              if (!lead) return null
              const parts = [lead.neighborhood, lead.city].filter(Boolean).join(', ')
              return (
                <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {parts || lead.address || 'Endereço preenchido abaixo'}
                </p>
              )
            })()}
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
            <SearchableSelect
              value={form.assigned_to}
              onChange={(v) => set('assigned_to', v)}
              placeholder="Sem responsável"
              options={[
                { value: '', label: 'Sem responsável' },
                ...vendedores.map((v) => ({ value: v.id, label: v.full_name })),
              ]}
            />
          </div>

          <div>
            <label className="label">Status</label>
            <SearchableSelect
              value={form.status}
              onChange={(v) => set('status', v)}
              options={[
                { value: 'agendada', label: 'Agendada' },
                { value: 'realizada', label: 'Realizada' },
                { value: 'cancelada', label: 'Cancelada' },
                { value: 'reagendada', label: 'Reagendada' },
              ]}
            />
          </div>

          <CepField
            value={form.cep}
            onChange={(v) => set('cep', v)}
            onFound={handleCepFound}
          />

          <div>
            <label className="label">Logradouro</label>
            <input
              className="input"
              placeholder="Rua / Av..."
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Número</label>
              <input
                className="input"
                placeholder="Ex: 100"
                value={form.number}
                onChange={(e) => set('number', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Complemento</label>
              <input
                className="input"
                placeholder="Apto, sala..."
                value={form.complement}
                onChange={(e) => set('complement', e.target.value)}
              />
            </div>
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

        {saveError && (
          <div className="px-5 pt-3">
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
          </div>
        )}

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
