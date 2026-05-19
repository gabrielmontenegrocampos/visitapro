'use client'

import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import LeadModal from './LeadModal'
import type { PipelineStage, Lead } from '@/types/database'

interface KanbanBoardProps {
  stages: PipelineStage[]
  leads: (Lead & {
    pipeline_stages: PipelineStage | null
    profiles: { id: string; full_name: string; avatar_url: string | null } | null
  })[]
}

export default function KanbanBoard({ stages, leads: initialLeads }: KanbanBoardProps) {
  const supabase = createClient()
  const [leads, setLeads] = useState(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<typeof initialLeads[0] | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const getLeadsForStage = useCallback(
    (stageId: string) => leads.filter((l) => l.stage_id === stageId),
    [leads]
  )

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
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

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, stage_id: targetStageId, pipeline_stages: targetStage }
          : l
      )
    )

    await supabase
      .from('leads')
      .update({ stage_id: targetStageId })
      .eq('id', leadId)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full overflow-x-auto kanban-scroll px-6 pb-6 pt-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={getLeadsForStage(stage.id)}
              onLeadClick={setSelectedLead}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <KanbanCard lead={activeLead} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          stages={stages}
          onClose={() => setSelectedLead(null)}
          onUpdate={(updated) => {
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)))
            setSelectedLead(null)
          }}
        />
      )}
    </>
  )
}
