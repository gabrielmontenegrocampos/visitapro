'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  KanbanSquare,
  Calendar,
  Users,
  FileText,
  UserCircle,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/pipeline',   label: 'Pipeline',    icon: KanbanSquare },
  { href: '/agenda',     label: 'Agenda',      icon: Calendar },
  { href: '/leads',      label: 'Leads',       icon: Users },
  { href: '/propostas',  label: 'Propostas',   icon: FileText },
  { href: '/vendedores', label: 'Vendedores',  icon: UserCircle },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-200">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-lg">VisitaPro</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-blue-600' : 'text-gray-400')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">Pintura & Reforma</p>
      </div>
    </aside>
  )
}
