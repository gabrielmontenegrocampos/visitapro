'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Phone, MapPin, GripVertical } from 'lucide-react'
import { cn, getInitials, formatDate, SOURCE_LABELS } from '@/lib/utils'
import type { PipelineStage, Lead } from '@/types/database'

interface KanbanCardProps {
  lead: Lead & {
    pipeline_stages: PipelineStage | null
    profiles: { id: string; full_name: string; avatar_url: string | null } | null
  }
  onClick?: () => void
  isDragging?: boolean
}

export default function KanbanCard({ lead, onClick, isDragging }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-3 group cursor-pointer hover:shadow-md transition-all',
        (isDragging || isSortableDragging) && 'opacity-40 shadow-lg rotate-1'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-gray-300" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{lead.name}</p>

          {lead.phone && (
            <div className="flex items-center gap-1 mt-1.5">
              <Phone className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500">{lead.phone}</span>
            </div>
          )}

          {lead.city && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 truncate">{lead.neighborhood ? `${lead.neighborhood}, ` : ''}{lead.city}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{SOURCE_LABELS[lead.source]}</span>
            <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
          </div>

          {lead.profiles && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-[9px] font-bold text-blue-700">
                  {getInitials(lead.profiles.full_name)}
                </span>
              </div>
              <span className="text-xs text-gray-500 truncate">{lead.profiles.full_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
