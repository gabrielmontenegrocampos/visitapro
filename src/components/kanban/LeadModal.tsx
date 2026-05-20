'use client'

import { useState, useEffect } from 'react'
import { X, Phone, Mail, MapPin, Send, Loader2 } from 'lucide-react'
import { moveLeadStage, addActivity } from '@/app/(crm)/pipeline/actions'
import { formatDateTime, SOURCE_LABELS, mapsUrl } from '@/lib/utils'
import type { PipelineStage, Lead } from '@/types/database'

type LeadWithRelations = Lead & {
  pipeline_stages: PipelineStage | null
  profiles: { id: string; full_name: string; avatar_url: string | null } | null
}

const ACTIVITY_TYPES = [
  { value: 'nota',      label: 'Nota',      emoji: '📝' },
  { value: 'ligacao',   label: 'Ligação',   emoji: '📞' },
  { value: 'whatsapp',  label: 'WhatsApp',  emoji: '💬' },
  { value: 'email',     label: 'Email',     emoji: '📧' },
  { value: 'visita',    label: 'Visita',    emoji: '🏠' },
]

const typeEmoji: Record<string, string> = {
  nota: '📝', ligacao: '📞', email: '📧', whatsapp: '💬',
  visita: '🏠', proposta: '📋', status_change: '🔄', sistema: '⚙️',
}

interface LeadModalProps {
  lead: LeadWithRelations
  stages: PipelineStage[]
  onClose: () => void
  onUpdate: (updates: Partial<LeadWithRelations>) => void
}

export default function LeadModal({ lead, stages, onClose, onUpdate }: LeadModalProps) {
  const [stageId, setStageId]       = useState(lead.stage_id ?? '')
  const [note, setNote]             = useState('')
  const [noteType, setNoteType]     = useState('nota')
  const [sendingNote, setSendingNote] = useState(false)
  const [movingStage, setMovingStage] = useState(false)
  const [activities, setActivities] = useState<{ id: string; content: string; type: string; created_at: string }[]>([])
  const [mobileTab, setMobileTab]   = useState<'info' | 'historico'>('info')

  useEffect(() => { loadActivities() }, [])

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
    setActivities((prev) => [{ id: Date.now().toString(), content, type: noteType, created_at: new Date().toISOString() }, ...prev])
    setNote('')
    setSendingNote(false)
  }

  const currentStage = stages.find((s) => s.id === stageId)
  const addressText = [lead.address, (lead as Lead & { number?: string | null }).number, lead.neighborhood, lead.city].filter(Boolean).join(', ')
  const addressUrl  = mapsUrl([lead.address, lead.neighborhood, lead.city])

  /* ── Info panel (shared between desktop-left and mobile-info tab) ── */
  const InfoPanel = (
    <div className="flex flex-col gap-4 h-full">
      {/* Stage pills */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Estágio</p>
        <div className="flex flex-wrap gap-1.5">
          {stages.map((s) => (
            <button
              key={s.id}
              onClick={() => stageId !== s.id && handleStageChange(s.id)}
              disabled={movingStage}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
              style={stageId === s.id
                ? { backgroundColor: s.color, color: '#fff', borderColor: s.color }
                : { backgroundColor: s.color + '18', color: s.color, borderColor: s.color + '40' }
              }
            >
              {stageId === s.id && <span className="w-1.5 h-1.5 bg-white rounded-full shrink-0" />}
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Contato</p>
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="flex items-center gap-2.5 text-sm text-blue-600 hover:text-blue-700">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-blue-500" />
            </div>
            {lead.phone}
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 text-sm text-blue-600 hover:text-blue-700 truncate">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-blue-500" />
            </div>
            <span className="truncate">{lead.email}</span>
          </a>
        )}
        {addressText && (
          <a href={addressUrl ?? '#'} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-sm text-blue-600 hover:text-blue-700">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>
            <span className="truncate">{addressText}</span>
          </a>
        )}
        {lead.notes && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-sm text-gray-700">
            {lead.notes}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="mt-auto pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">Origem: <span className="text-gray-600">{SOURCE_LABELS[lead.source]}</span></p>
        {currentStage && (
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            Estágio atual:
            <span className="inline-flex items-center gap-1 font-medium" style={{ color: currentStage.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStage.color }} />
              {currentStage.name}
            </span>
          </p>
        )}
      </div>
    </div>
  )

  /* ── Activity panel (shared between desktop-right and mobile-historico tab) ── */
  const ActivityPanel = (
    <div className="flex flex-col h-full gap-3">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Registrar atividade</p>

      {/* Type selector */}
      <div className="flex gap-1.5 shrink-0 flex-wrap">
        {ACTIVITY_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setNoteType(t.value)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              noteType === t.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 shrink-0">
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

      {/* Feed */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Histórico</p>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhuma atividade ainda</p>
        ) : (
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="flex gap-2.5">
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
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* ── Desktop modal: two columns, no scroll ── */}
      <div className="relative hidden md:flex bg-white w-full max-w-2xl rounded-2xl shadow-2xl z-10 flex-col"
        style={{ height: 'min(640px, 88vh)' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0 pr-3">
            <h2 className="text-lg font-bold text-gray-900 truncate">{lead.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 min-h-0 divide-x divide-gray-100">
          <div className="w-[42%] px-6 py-4 overflow-hidden flex flex-col">
            {InfoPanel}
          </div>
          <div className="flex-1 px-6 py-4 flex flex-col min-h-0">
            {ActivityPanel}
          </div>
        </div>
      </div>

      {/* ── Mobile modal: bottom sheet with tabs ── */}
      <div className="relative md:hidden bg-white w-full rounded-t-2xl shadow-2xl z-10 flex flex-col"
        style={{ height: '88vh' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="min-w-0 pr-3">
            <h2 className="text-base font-bold text-gray-900 truncate">{lead.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 px-5">
          {(['info', 'historico'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                mobileTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'info' ? 'Informações' : 'Histórico'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mobileTab === 'info' ? InfoPanel : ActivityPanel}
        </div>
      </div>
    </div>
  )
}
