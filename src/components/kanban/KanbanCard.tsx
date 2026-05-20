'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Phone, MapPin, GripVertical } from 'lucide-react'
import { getInitials, formatDate, SOURCE_LABELS, mapsUrl, whatsappUrl } from '@/lib/utils'
import type { PipelineStage, Lead } from '@/types/database'

type LeadWithRelations = Lead & {
  pipeline_stages: PipelineStage | null
  profiles: { id: string; full_name: string; avatar_url: string | null } | null
}

interface KanbanCardProps {
  lead: LeadWithRelations
  compact?: boolean
  onClick?: () => void
  isDragging?: boolean
}

export default function KanbanCard({ lead, compact = false, onClick, isDragging }: KanbanCardProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging: isSortableDragging,
  } = useSortable({ id: lead.id })

  const dragging = isDragging || isSortableDragging

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`bg-white rounded-lg border border-gray-200 select-none transition-all
          ${dragging ? 'opacity-30 shadow-lg' : 'hover:shadow-sm hover:border-gray-300'}`}
      >
        <div className="flex items-center gap-1.5 px-2 py-2">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5 text-gray-300" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
            <p className="text-sm font-medium text-gray-900 truncate leading-tight">{lead.name}</p>
            {lead.phone && (
              <p className="text-xs text-gray-400 truncate leading-tight">{lead.phone}</p>
            )}
          </div>

          {/* Avatar */}
          {lead.profiles && (
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-white">{getInitials(lead.profiles.full_name)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm select-none
        ${dragging ? 'opacity-30 rotate-1 shadow-xl' : 'hover:shadow-md hover:border-gray-300'}
        transition-all`}
    >
      {/* Drag handle bar */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center h-5 cursor-grab active:cursor-grabbing touch-none rounded-t-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-gray-300" />
      </div>

      {/* Card content */}
      <div className="px-3 pb-3 cursor-pointer" onClick={onClick}>
        <p className="font-semibold text-gray-900 text-sm leading-tight mb-2">{lead.name}</p>

        {lead.phone && (
          <a
            href={whatsappUrl(lead.phone) ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 mb-1 hover:text-green-600 group/wa"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-3 h-3 text-gray-400 group-hover/wa:text-green-500 shrink-0" />
            <span className="text-xs text-gray-500 group-hover/wa:text-green-600">{lead.phone}</span>
          </a>
        )}

        {(lead.neighborhood || lead.city) && (() => {
          const url = mapsUrl([lead.address, lead.neighborhood, lead.city])
          return (
            <a
              href={url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 mb-1 hover:text-blue-600 group/map"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin className="w-3 h-3 text-gray-400 group-hover/map:text-blue-500 shrink-0" />
              <span className="text-xs text-gray-500 group-hover/map:text-blue-600 truncate">
                {[lead.neighborhood, lead.city].filter(Boolean).join(', ')}
              </span>
            </a>
          )
        })()}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
            {SOURCE_LABELS[lead.source]}
          </span>
          {lead.profiles ? (
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-[9px] font-bold text-white">{getInitials(lead.profiles.full_name)}</span>
            </div>
          ) : (
            <span className="text-[10px] text-gray-400">{formatDate(lead.created_at)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
