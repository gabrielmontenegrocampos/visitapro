'use client'

import { useState } from 'react'
import { X, Phone, Mail, MapPin, MessageSquare, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime, SOURCE_LABELS } from '@/lib/utils'
import type { PipelineStage, Lead } from '@/types/database'

interface LeadModalProps {
  lead: Lead & {
    pipeline_stages: PipelineStage | null
    profiles: { id: string; full_name: string; avatar_url: string | null } | null
  }
  stages: PipelineStage[]
  onClose: () => void
  onUpdate: (lead: Partial<Lead>) => void
}

export default function LeadModal({ lead, stages, onClose, onUpdate }: LeadModalProps) {
  const supabase = createClient()
  const [note, setNote] = useState('')
  const [sendingNote, setSendingNote] = useState(false)
  const [activities, setActivities] = useState<{ id: string; content: string; type: string; created_at: string }[]>([])
  const [loadedActivities, setLoadedActivities] = useState(false)
  const [stageId, setStageId] = useState(lead.stage_id ?? '')

  async function loadActivities() {
    if (loadedActivities) return
    const { data } = await supabase
      .from('activities')
      .select('id, content, type, created_at')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setActivities(data ?? [])
    setLoadedActivities(true)
  }

  async function handleStageChange(newStageId: string) {
    setStageId(newStageId)
    await supabase.from('leads').update({ stage_id: newStageId }).eq('id', lead.id)
    const stage = stages.find((s) => s.id === newStageId)
    await supabase.from('activities').insert({
      lead_id: lead.id,
      type: 'status_change',
      content: `Estágio alterado para: ${stage?.name}`,
    })
    onUpdate({ stage_id: newStageId })
  }

  async function handleSendNote() {
    if (!note.trim()) return
    setSendingNote(true)
    await supabase.from('activities').insert({
      lead_id: lead.id,
      type: 'nota',
      content: note.trim(),
    })
    setActivities((prev) => [{
      id: Date.now().toString(),
      content: note.trim(),
      type: 'nota',
      created_at: new Date().toISOString(),
    }, ...prev])
    setNote('')
    setSendingNote(false)
  }

  const typeIcon: Record<string, string> = {
    nota: '📝',
    ligacao: '📞',
    email: '📧',
    whatsapp: '💬',
    visita: '🏠',
    proposta: '📋',
    status_change: '🔄',
    sistema: '⚙️',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] md:max-h-[90vh] flex flex-col z-10">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{lead.name}</h2>
            <span className="text-sm text-gray-500">{SOURCE_LABELS[lead.source]}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3">
            {lead.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">{lead.phone}</a>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline truncate">{lead.email}</a>
              </div>
            )}
            {(lead.city || lead.address) && (
              <div className="flex items-center gap-2 text-sm col-span-2">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-600">
                  {[lead.address, lead.neighborhood, lead.city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Stage selector */}
          <div>
            <label className="label">Estágio do Pipeline</label>
            <select
              value={stageId}
              onChange={(e) => handleStageChange(e.target.value)}
              className="input"
            >
              <option value="">Sem estágio</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div>
              <label className="label">Observações</label>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{lead.notes}</p>
            </div>
          )}

          {/* Activity feed */}
          <div>
            <button
              onClick={loadActivities}
              className="label flex items-center gap-2 w-full text-left"
            >
              <MessageSquare className="w-4 h-4" />
              Histórico de Atividades
            </button>

            <div className="mt-2 flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Adicionar nota, ligação, WhatsApp..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendNote()}
              />
              <button
                onClick={handleSendNote}
                disabled={sendingNote || !note.trim()}
                className="btn-primary px-3 flex items-center gap-1"
              >
                {sendingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {activities.map((a) => (
                <div key={a.id} className="flex gap-2 text-sm">
                  <span>{typeIcon[a.type] ?? '•'}</span>
                  <div className="flex-1">
                    <p className="text-gray-700">{a.content}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(a.created_at)}</p>
                  </div>
                </div>
              ))}
              {loadedActivities && activities.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma atividade registrada</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
