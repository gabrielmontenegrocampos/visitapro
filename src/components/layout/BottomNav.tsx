'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, KanbanSquare, Calendar, Users, FileText, BookOpen } from 'lucide-react'

const navItems = [
  { href: '/dashboard',   label: 'Inicio',    icon: LayoutDashboard },
  { href: '/pipeline',    label: 'Pipeline',  icon: KanbanSquare },
  { href: '/agenda',      label: 'Agenda',    icon: Calendar },
  { href: '/leads',       label: 'Leads',     icon: Users },
  { href: '/propostas',   label: 'Propostas', icon: FileText },
  { href: '/diario-obra', label: 'Diario',    icon: BookOpen },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/97 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] md:hidden">
      <div className="flex items-stretch justify-around px-1" style={{ height: '60px' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className="flex-1 flex items-center justify-center">
              <div className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-2xl transition-all ${
                active ? 'bg-gradient-to-br from-blue-950 to-blue-700 shadow-md' : ''
              }`}>
                <Icon
                  className={`transition-colors ${active ? 'text-white' : 'text-gray-400'}`}
                  style={{ width: 20, height: 20 }}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className={`text-[9px] font-semibold transition-colors leading-tight ${active ? 'text-white' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)', background: 'inherit' }} />
    </nav>
  )
}
