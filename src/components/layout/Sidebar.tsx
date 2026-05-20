'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, KanbanSquare, Calendar,
  Users, FileText, UserCircle, MapPin, PanelLeftOpen, PanelLeftClose,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/pipeline',   label: 'Pipeline',   icon: KanbanSquare },
  { href: '/agenda',     label: 'Agenda',     icon: Calendar },
  { href: '/leads',      label: 'Leads',      icon: Users },
  { href: '/propostas',  label: 'Propostas',  icon: FileText },
  { href: '/vendedores', label: 'Vendedores', icon: UserCircle },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Persist pin state
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-pinned')
    if (stored === 'true') setPinned(true)
  }, [])

  function togglePin() {
    const next = !pinned
    setPinned(next)
    localStorage.setItem('sidebar-pinned', String(next))
    if (next) setHovered(false)
  }

  const expanded = pinned || hovered

  return (
    <>
      {/* Flex placeholder — keeps layout stable */}
      <div
        className={cn(
          'hidden md:block shrink-0 transition-[width] duration-200',
          pinned ? 'w-60' : 'w-16'
        )}
      />

      {/* Actual sidebar panel — overlays when hovered but not pinned */}
      <aside
        className={cn(
          'hidden md:flex fixed top-0 left-0 h-full z-50 flex-col',
          'bg-white border-r border-gray-200',
          'transition-[width,box-shadow] duration-200',
          expanded ? 'w-60' : 'w-16',
          !pinned && hovered && 'shadow-[4px_0_24px_rgba(0,0,0,0.10)]'
        )}
        onMouseEnter={() => !pinned && setHovered(true)}
        onMouseLeave={() => !pinned && setHovered(false)}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center border-b border-gray-100 shrink-0 overflow-hidden',
          'transition-[height] duration-200',
          expanded ? 'h-[72px] px-4' : 'h-[64px] justify-center px-0'
        )}>
          {expanded ? (
            <div className="flex items-center justify-between w-full">
              {/* Logo expanded */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-950 to-blue-700 shrink-0">
                  <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-bold text-gray-900 text-base">Visita<span className="text-blue-600">Pro</span></span>
                  <span className="text-gray-400 text-[10px] font-medium tracking-widest uppercase">CRM</span>
                </div>
              </div>
              {/* Pin button */}
              <button
                onClick={togglePin}
                title={pinned ? 'Desafixar menu' : 'Fixar menu'}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                {pinned
                  ? <PanelLeftClose className="w-4 h-4" />
                  : <PanelLeftOpen className="w-4 h-4" />
                }
              </button>
            </div>
          ) : (
            /* Logo collapsed */
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-950 to-blue-700">
              <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 overflow-hidden">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                title={!expanded ? label : undefined}
                className={cn(
                  'flex items-center gap-3 mx-2 my-0.5 rounded-xl text-sm font-medium transition-all',
                  expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon
                  className={cn('shrink-0 transition-colors', expanded ? 'w-4 h-4' : 'w-5 h-5',
                    active ? 'text-blue-600' : 'text-gray-400'
                  )}
                />
                {expanded && (
                  <span className="truncate">{label}</span>
                )}
                {active && !expanded && (
                  <span className="absolute left-[56px] w-1 h-6 bg-blue-600 rounded-r-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        {expanded && (
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center truncate">Pintura & Reforma</p>
          </div>
        )}
      </aside>
    </>
  )
}
