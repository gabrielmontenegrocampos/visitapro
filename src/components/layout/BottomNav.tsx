'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, KanbanSquare, Calendar, Users, FileText } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Início',    icon: LayoutDashboard },
  { href: '/pipeline',  label: 'Pipeline',  icon: KanbanSquare },
  { href: '/agenda',    label: 'Agenda',    icon: Calendar },
  { href: '/leads',     label: 'Leads',     icon: Users },
  { href: '/propostas', label: 'Propostas', icon: FileText },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/97 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] md:hidden">
      {/* Safe area support for iPhone home indicator */}
      <div className="flex items-center justify-around px-1" style={{ height: '72px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex items-center justify-center h-full"
            >
              <div className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all ${
                active ? 'bg-gradient-to-br from-blue-950 to-blue-700 shadow-md' : ''
              }`}>
                <Icon
                  className={`transition-colors ${active ? 'text-white' : 'text-gray-400'}`}
                  style={{ width: 24, height: 24 }}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className={`text-[11px] font-semibold transition-colors leading-none ${active ? 'text-white' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
