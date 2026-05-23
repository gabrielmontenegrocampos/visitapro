'use client'

import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { updateProposalTitle } from '@/app/(crm)/propostas/[id]/actions'

interface Props {
  proposalId: string
  title: string
  onSaved?: (newTitle: string) => void
  className?: string
  inputClassName?: string
}

export default function InlineEditTitle({ proposalId, title, onSaved, className = '', inputClassName = '' }: Props) {
  const [editing, setEditing]   = useState(false)
  const [value, setValue]       = useState(title)
  const [saving, setSaving]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setValue(title) }, [title])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function save() {
    const trimmed = value.trim()
    if (!trimmed || trimmed === title) { setEditing(false); setValue(title); return }
    setSaving(true)
    const res = await updateProposalTitle(proposalId, trimmed)
    setSaving(false)
    if (!res.error) { onSaved?.(trimmed); setEditing(false) }
    else { setValue(title); setEditing(false) }
  }

  function cancel() { setValue(title); setEditing(false) }

  if (!editing) {
    return (
      <span className={`group inline-flex items-center gap-1.5 ${className}`}>
        <span className="truncate">{value}</span>
        <button
          onClick={e => { e.stopPropagation(); e.preventDefault(); setEditing(true) }}
          className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-all"
          title="Editar título"
        >
          <Pencil className="w-3 h-3 text-gray-400" />
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1" onClick={e => { e.stopPropagation(); e.preventDefault() }}>
      <input
        ref={inputRef}
        className={`border border-blue-400 rounded-lg px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white ${inputClassName}`}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
        onBlur={save}
      />
      {saving
        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
        : (
          <>
            <button onMouseDown={e => { e.preventDefault(); save() }} className="p-0.5 hover:bg-green-100 rounded">
              <Check className="w-3.5 h-3.5 text-green-600" />
            </button>
            <button onMouseDown={e => { e.preventDefault(); cancel() }} className="p-0.5 hover:bg-red-100 rounded">
              <X className="w-3.5 h-3.5 text-red-500" />
            </button>
          </>
        )
      }
    </span>
  )
}
