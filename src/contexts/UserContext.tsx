'use client'

import { createContext, useContext } from 'react'
import type { Profile } from '@/types/database'
import { can, type AppRole } from '@/lib/roles'

interface UserContextValue {
  profile: Profile
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) {
  return (
    <UserContext.Provider value={{ profile }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx.profile
}

export function useRole() {
  const profile = useUser()
  const role = profile.role as AppRole
  return {
    role,
    isAdmin:       role === 'admin',
    isGerente:     role === 'gerente',
    isVendedor:    role === 'vendedor',
    isFinanceiro:  role === 'financeiro',
    isEncarregado: role === 'encarregado',
    can: (permission: Parameters<typeof can>[1]) => can(role, permission),
  }
}
