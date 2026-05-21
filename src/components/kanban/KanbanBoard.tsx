'use client'

import { useState, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { Search, AlignJustify, LayoutGrid, X } from 'lucide-react'
import { moveLeadStage } from '@/app/(crm)/pipeline/actions'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import LeadModal from './LeadModal'
import type { PipelineStage, Lead } from '@/types/database'

type LeadWithRelations = Lead & {
  pipeline_stages: PipelineStage | null
  profiles: { id: string; full_name: string; avatar_url: string | null } | null
}

interface KanbanBoardProps {
  stages: PipelineStage[]
  leads: LeadWithRelations[]
}

export default function KanbanBoard({ stages, leads: initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null)
  const [search, setSearch] = useState('')
  const [compact, setCompact] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 12 } })
  )

  const visibleLeads = search.trim()
    ? leads.filter((l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.phone ?? '').includes(search) ||
        (l.city ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : leads

  const getLeadsForStage = useCallback(
    (stageId: string) => visibleLeads.filter((l) => l.stage_id === stageId),
    [visibleLeads]
  )

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  function vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    vibrate(40)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const leadId = active.id as string
    const targetStageId = over.id as string
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.stage_id === targetStageId) return
    const targetStage = stages.find((s) => s.id === targetStageId)
    if (!targetStage) return
    vibrate([30, 30, 60])
    setLeads((prev) =>
      prev.map((l) => l.id === leadId ? { ...l, stage_id: targetStageId, pipeline_stages: targetStage } : l)
    )
    await moveLeadStage(leadId, targetStageId)
  }

  function handleLeadMoved(lead: LeadWithRelations, stageId: string, stage: PipelineStage) {
    setLeads((prev) =>
      prev.map((l) => l.id === lead.id ? { ...l, stage_id: stageId, pipeline_stages: stage } : l)
    )
  }

  function handleLeadUpdate(leadId: string, updates: Partial<LeadWithRelations>) {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, ...updates } : l))
  }

  const totalVisible = search.trim() ? visibleLeads.length : null

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-gray-200 bg-white">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none transition-all placeholder-gray-400"
            placeholder="Buscar por nome, telefone, cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {totalVisible !== null && (
          <span className="text-xs text-gray-500 shrink-0">
            {totalVisible} resultado{totalVisible !== 1 ? 's' : ''}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setCompact(false)}
            title="Detalhado"
            className={`p-1.5 rounded-md transition-all ${!compact ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCompact(true)}
            title="Compacto"
            className={`p-1.5 rounded-md transition-all ${compact ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 h-full overflow-x-auto kanban-scroll px-4 md:px-6 pb-6 pt-3">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={getLeadsForStage(stage.id)}
              allLeads={leads}
              compact={compact}
              onLeadClick={setSelectedLead}
              onLeadMoved={handleLeadMoved}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeLead ? <KanbanCard lead={activeLead} compact={compact} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          stages={stages}
          onClose={() => setSelectedLead(null)}
          onUpdate={(updates) => {
            handleLeadUpdate(selectedLead.id, updates)
            setSelectedLead(null)
          }}
        />
      )}
    </>
  )
}
