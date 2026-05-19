'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import KanbanCard from './KanbanCard'
import type { PipelineStage, Lead } from '@/types/database'

interface KanbanColumnProps {
  stage: PipelineStage
  leads: (Lead & {
    pipeline_stages: PipelineStage | null
    profiles: { id: string; full_name: string; avatar_url: string | null } | null
  })[]
  onLeadClick: (lead: KanbanColumnProps['leads'][0]) => void
}

export default function KanbanColumn({ stage, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
        <h3 className="font-semibold text-gray-800 text-sm">{stage.name}</h3>
        <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
          {leads.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl p-2 space-y-2 transition-colors min-h-[200px]',
          isOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : 'bg-gray-100/60'
        )}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-gray-400">Arraste um lead aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}
