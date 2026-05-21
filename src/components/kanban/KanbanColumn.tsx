'use client'

import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, X, Search } from 'lucide-react'
import { moveLeadStage } from '@/app/(crm)/pipeline/actions'
import KanbanCard from './KanbanCard'
import type { PipelineStage, Lead } from '@/types/database'

type LeadWithRelations = Lead & {
  pipeline_stages: PipelineStage | null
  profiles: { id: string; full_name: string; avatar_url: string | null } | null
}

interface KanbanColumnProps {
  stage: PipelineStage
  leads: LeadWithRelations[]
  allLeads: LeadWithRelations[]
  compact: boolean
  onLeadClick: (lead: LeadWithRelations) => void
  onLeadMoved: (lead: LeadWithRelations, stageId: string, stage: PipelineStage) => void
}

export default function KanbanColumn({ stage, leads, allLeads, compact, onLeadClick, onLeadMoved }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const [adding, setAdding] = useState(false)
  const [query, setQuery]   = useState('')
  const [saving, setSaving] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const inputRef    = useRef<HTMLInputElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  const candidates = allLeads.filter((l) => l.stage_id !== stage.id)
  const filtered   = query.trim()
    ? candidates.filter((l) =>
        l.name.toLowerCase().includes(query.toLowerCase()) ||
        (l.phone ?? '').includes(query)
      )
    : candidates.slice(0, 8)

  // Position dropdown via fixed coords relative to the search box
  useEffect(() => {
    if (!adding || !searchBoxRef.current) return
    const rect  = searchBoxRef.current.getBoundingClientRect()
    const width = Math.max(rect.width, 240)
    const left  = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    setDropdownStyle({
      position: 'fixed',
      top:   rect.bottom + 2,
      left,
      width,
      zIndex: 9999,
    })
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!isTouch) inputRef.current?.focus()
  }, [adding])

  async function handleSelect(lead: LeadWithRelations) {
    setSaving(true)
    await moveLeadStage(lead.id, stage.id)
    onLeadMoved(lead, stage.id, stage)
    setQuery('')
    setAdding(false)
    setSaving(false)
  }

  function cancel() {
    setAdding(false)
    setQuery('')
  }

  return (
    <>
      {/* Transparent overlay to close dropdown on outside click */}
      {adding && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 9998 }}
          onMouseDown={cancel}
          onTouchStart={cancel}
        />
      )}

      <div className={`flex flex-col shrink-0 ${compact ? 'w-[220px]' : 'w-[272px]'}`}>
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl"
          style={{ backgroundColor: stage.color + '18' }}
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
          <h3 className="font-semibold text-gray-800 text-sm flex-1 truncate">{stage.name}</h3>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full text-white shrink-0"
            style={{ backgroundColor: stage.color }}
          >
            {leads.length}
          </span>
        </div>

        {/* Drop zone */}
        <div
          ref={setNodeRef}
          className={`flex-1 rounded-b-xl p-2 transition-all min-h-[120px] ${compact ? 'space-y-1.5' : 'space-y-2'}`}
          style={{
            backgroundColor: isOver ? stage.color + '20' : '#f3f4f680',
            border: isOver ? `2px dashed ${stage.color}` : '2px solid transparent',
            boxShadow: isOver ? `inset 0 0 0 1px ${stage.color}40` : 'none',
          }}
        >
          <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {leads.map((lead) => (
              <KanbanCard key={lead.id} lead={lead} compact={compact} onClick={() => onLeadClick(lead)} />
            ))}
          </SortableContext>

          {leads.length === 0 && !adding && (
            <div className="flex items-center justify-center h-12 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-xs text-gray-400">Vazio</p>
            </div>
          )}

          {/* Search input box (anchor for dropdown) */}
          {adding && (
            <div
              ref={searchBoxRef}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 shadow-sm"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                className="flex-1 min-w-0 text-sm outline-none placeholder-gray-400"
                placeholder="Buscar lead..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && cancel()}
                disabled={saving}
              />
              <button
                onMouseDown={(e) => { e.stopPropagation(); cancel() }}
                className="p-0.5 hover:bg-gray-100 rounded shrink-0"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          )}

          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar lead
            </button>
          )}
        </div>
      </div>

      {/* Fixed dropdown list — renders outside column, no clipping */}
      {adding && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
          style={dropdownStyle}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                {query ? 'Nenhum lead encontrado' : 'Todos os leads já estão nesta coluna'}
              </p>
            ) : (
              filtered.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => handleSelect(lead)}
                  disabled={saving}
                  className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{lead.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {lead.phone ?? lead.city ?? 'Sem detalhes'}
                      {lead.pipeline_stages && (
                        <span className="ml-1" style={{ color: lead.pipeline_stages.color }}>
                          · {lead.pipeline_stages.name}
                        </span>
                      )}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
