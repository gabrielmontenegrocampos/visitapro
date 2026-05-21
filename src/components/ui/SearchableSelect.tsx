'use client'

import { useState, useRef, useEffect } from 'react'
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

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  className,
}: SearchableSelectProps) {
  const [open, setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const [pos, setPos]     = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef  = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered  = options.filter((o) => {
    const q = search.toLowerCase()
    return o.label.toLowerCase().includes(q) || (o.subtitle ?? '').toLowerCase().includes(q)
  })

  function openDropdown() {
    if (!triggerRef.current) return
    const rect   = triggerRef.current.getBoundingClientRect()
    const width  = Math.max(rect.width, 240)
    // clamp so dropdown never overflows right or left edge
    const left   = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    const spaceBelow = window.innerHeight - rect.bottom

    if (spaceBelow >= 160) {
      setPos({ top: rect.bottom + 4, left, width })
    } else {
      setPos({ bottom: window.innerHeight - rect.top + 4, left, width })
    }
    setOpen(true)
    setSearch('')
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!isTouch) setTimeout(() => searchRef.current?.focus(), 30)
  }

  function close() { setOpen(false) }

  function select(v: string) {
    onChange(v)
    close()
  }

  // Keep positions in sync on scroll/resize while open
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (triggerRef.current) {
        const rect  = triggerRef.current.getBoundingClientRect()
        const width = Math.max(rect.width, 240)
        const left  = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
        if ('bottom' in pos) {
          setPos({ bottom: window.innerHeight - rect.top + 4, left, width })
        } else {
          setPos({ top: rect.bottom + 4, left, width })
        }
      }
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Invisible full-screen overlay — closes dropdown on any outside click/touch */}
      {open && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 9998 }}
          onMouseDown={close}
          onTouchStart={close}
        />
      )}

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => open ? close() : openDropdown()}
          className={cn('input flex items-center justify-between gap-2 text-left w-full', className)}
        >
          <span className={cn('flex-1 min-w-0 truncate', !selected && 'text-gray-400')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150', open && 'rotate-180')} />
        </button>

        {open && (
          <div
            className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ ...pos, zIndex: 9999 }}
          >
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-[240px] overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Nenhum resultado</p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors',
                      opt.value === value && 'bg-blue-50'
                    )}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => select(opt.value)}
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
    </>
  )
}
