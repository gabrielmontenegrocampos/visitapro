'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  subtitle?: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const MIN_WIDTH = 220

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = options.filter((o) => {
    const q = search.toLowerCase()
    return (
      o.label.toLowerCase().includes(q) ||
      (o.subtitle ?? '').toLowerCase().includes(q)
    )
  })

  const openDropdown = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const width = Math.max(rect.width, MIN_WIDTH)
    const spaceBelow = window.innerHeight - rect.bottom
    const estimatedHeight = Math.min(filtered.length * 44 + 56, 300)

    // Prevent overflow on right edge
    const left = Math.min(rect.left, window.innerWidth - width - 8)

    const base: React.CSSProperties = { position: 'fixed', width, left, zIndex: 9999 }

    if (spaceBelow >= estimatedHeight || spaceBelow >= 160) {
      setDropdownStyle({ ...base, top: rect.bottom + 4 })
    } else {
      setDropdownStyle({ ...base, bottom: window.innerHeight - rect.top + 4 })
    }

    setOpen(true)
    setSearch('')
    setTimeout(() => searchRef.current?.focus(), 30)
  }, [filtered.length])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className={cn('input flex items-center justify-between gap-2 text-left w-full', className)}
      >
        <span className={cn('flex-1 min-w-0 truncate', !selected && 'text-gray-400')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn('w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          style={dropdownStyle}
          className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-[240px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Nenhum resultado</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors',
                    opt.value === value && 'bg-blue-50'
                  )}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn('truncate font-medium leading-tight', opt.value === value ? 'text-blue-700' : 'text-gray-800')}>
                      {opt.label}
                    </p>
                    {opt.subtitle && (
                      <p className="truncate text-xs text-gray-400 mt-0.5 leading-tight">{opt.subtitle}</p>
                    )}
                  </div>
                  {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0 text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
