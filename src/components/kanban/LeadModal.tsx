'use client'

import { useState, useEffect } from 'react'
import { X, Phone, Mail, MapPin, Send, Loader2, ChevronRight } from 'lucide-react'
import { moveLeadStage, addActivity } from '@/app/(crm)/pipeline/actions'
import { formatDateTime, SOURCE_LABELS, mapsUrl } from '@/lib/utils'
import type { PipelineStage, Lead } from '@/types/database'

type LeadWithRelations = Lead & {
  pipeline_stages: PipelineStage | null
  profiles: { id: string; full_name: string; avatar_url: string | null } | null
}

const ACTIVITY_TYPES = [
  { value: 'nota', label: 'Nota', emoji: '📝' },
  { value: 'ligacao', label: 'Ligação', emoji: '📞' },
  { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { value: 'email', label: 'Email', emoji: '📧' },
  { value: 'visita', label: 'Visita', emoji: '🏠' },
]

interface LeadModalProps {
  lead: LeadWithRelations
  stages: PipelineStage[]
  onClose: () => void
  onUpdate: (updates: Partial<LeadWithRelations>) => void
}

export default function LeadModal({ lead, stages, onClose, onUpdate }: LeadModalProps) {
  const [stageId, setStageId] = useState(lead.stage_id ?? '')
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState('nota')
  const [sendingNote, setSendingNote] = useState(false)
  const [activities, setActivities] = useState<{ id: string; content: string; type: string; created_at: string }[]>([])
  const [movingStage, setMovingStage] = useState(false)

  useEffect(() => {
    loadActivities()
  }, [])

  async function loadActivities() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase
      .from('activities')
      .select('id, content, type, created_at')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setActivities(data ?? [])
  }

  async function handleStageChange(newStageId: string) {
    setMovingStage(true)
    setStageId(newStageId)
    const stage = stages.find((s) => s.id === newStageId)
    await moveLeadStage(lead.id, newStageId)
    await addActivity(lead.id, 'status_change', `Estágio alterado para: ${stage?.name ?? newStageId}`)
    onUpdate({ stage_id: newStageId, pipeline_stages: stage ?? null })
    setMovingStage(false)
  }

  async function handleSendNote() {
    if (!note.trim()) return
    setSendingNote(true)
    const content = note.trim()
    await addActivity(lead.id, noteType, content)
    setActivities((prev) => [{
      id: Date.now().toString(),
      content,
      type: noteType,
      created_at: new Date().toISOString(),
    }, ...prev])
    setNote('')
    setSendingNote(false)
  }

  const currentStage = stages.find((s) => s.id === stageId)
  const typeEmoji: Record<string, string> = {
    nota: '📝', ligacao: '📞', email: '📧', whatsapp: '💬',
    visita: '🏠', proposta: '📋', status_change: '🔄', sistema: '⚙️',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[94vh] md:max-h-[88vh] flex flex-col z-10">

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-lg font-bold text-gray-900 truncate">{lead.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{SOURCE_LABELS[lead.source]}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Stage selector — Trello style */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Estágio</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {stages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => stageId !== s.id && handleStageChange(s.id)}
                  disabled={movingStage}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
                  style={stageId === s.id
                    ? { backgroundColor: s.color, color: '#fff', borderColor: s.color }
                    : { backgroundColor: s.color + '15', color: s.color, borderColor: s.color + '40' }
                  }
                >
                  {stageId === s.id && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Contact info */}
          <div className="px-5 py-4 space-y-2 border-b border-gray-100">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-blue-500" />
                </div>
                {lead.phone}
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700 truncate">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-blue-500" />
                </div>
                <span className="truncate">{lead.email}</span>
              </a>
            )}
            {(lead.city || lead.address) && (() => {
              const url = mapsUrl([lead.address, lead.neighborhood, lead.city])
              const text = [lead.address, lead.neighborhood, lead.city].filter(Boolean).join(', ')
              return (
                <a
                  href={url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="truncate">{text}</span>
                </a>
              )
            })()}
            {lead.notes && (
              <div className="mt-2 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-sm text-gray-700">
                {lead.notes}
              </div>
            )}
          </div>

          {/* Activity input */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Registrar atividade</p>

            {/* Type selector */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
              {ACTIVITY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setNoteType(t.value)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    noteType === t.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Digite uma observação..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendNote()}
              />
              <button
                onClick={handleSendNote}
                disabled={sendingNote || !note.trim()}
                className="btn-primary px-3 shrink-0"
              >
                {sendingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Activity feed */}
          <div className="px-5 py-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Histórico</p>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma atividade ainda</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <span className="text-base shrink-0 mt-0.5">{typeEmoji[a.type] ?? '•'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">{a.content}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer shortcut */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {currentStage && (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStage.color }} />
                {currentStage.name}
              </span>
            )}
          </span>
          <button onClick={onClose} className="text-sm text-blue-600 font-medium flex items-center gap-1">
            Fechar <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
