'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, ChevronDown, MapPin, UserCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import { ROLE_LABELS, ROLE_COLORS, type AppRole } from '@/lib/roles'
import InstallButton from './InstallButton'
import type { Profile } from '@/types/database'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/pipeline':     'Pipeline',
  '/agenda':       'Agenda de Visitas',
  '/leads':        'Leads',
  '/propostas':    'Propostas',
  '/diario-obra':  'Diário de Obra',
  '/financeiro':   'Financeiro',
  '/equipe':       'Equipe',
  '/vendedores':   'Equipe',
  '/configuracoes':'Configurações',
  '/perfil':       'Meu Perfil',
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 border border-white/20 shrink-0">
        <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-white font-bold text-base tracking-tight">Visita<span className="text-blue-300">Pro</span></span>
        <span className="text-blue-300/70 text-[10px] font-medium tracking-widest uppercase">CRM</span>
      </div>
    </div>
  )
}

export default function Header({ profile }: { profile: Profile | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const name      = profile?.full_name ?? 'Usuário'
  const role      = (profile?.role ?? 'vendedor') as AppRole
  const roleLabel = ROLE_LABELS[role] ?? role
  const roleBadge = ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600'

  // Resolve page title (handles dynamic routes like /propostas/[id])
  const pageTitle = (() => {
    const exact = PAGE_TITLES[pathname]
    if (exact) return exact
    for (const [key, val] of Object.entries(PAGE_TITLES)) {
      if (pathname.startsWith(key + '/')) return val
    }
    return 'VisitaPro'
  })()

  return (
    <header className="h-[64px] md:h-[72px] bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 shadow-[0_4px_20px_rgba(0,0,0,0.18)] flex items-center justify-between px-4 md:px-6 shrink-0 gap-4">

      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="md:hidden"><Logo /></div>
        <h1 className="hidden md:block font-semibold text-white text-lg tracking-tight truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Center (mobile) */}
      <h2 className="md:hidden text-white/80 text-sm font-medium truncate flex-1 text-center">
        {pageTitle}
      </h2>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <InstallButton />

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 hover:bg-white/10 rounded-xl px-2 py-1.5 transition-colors"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={name} className="w-9 h-9 rounded-full object-cover border-2 border-white/30 shrink-0" />
            ) : (
              <div className="w-9 h-9 bg-white/20 border border-white/30 rounded-full flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-white">{getInitials(name)}</span>
              </div>
            )}
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white leading-none">{name}</p>
              <p className="text-xs text-blue-200 mt-0.5">{roleLabel}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-blue-200 hidden sm:block" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-12 w-52 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-1">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{name}</p>
                  <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge}`}>
                    {roleLabel}
                  </span>
                </div>
                <button
                  onClick={() => { setOpen(false); router.push('/perfil') }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-gray-400" />
                  Meu Perfil
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair da conta
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
