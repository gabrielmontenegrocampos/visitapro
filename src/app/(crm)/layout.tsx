import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import { UserProvider } from '@/contexts/UserContext'
import type { Profile } from '@/types/database'

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Bloquear usuário inativo
  if (!profile?.active) {
    await supabase.auth.signOut()
    redirect('/login?error=inativo')
  }

  const role = profile?.role ?? 'vendedor'

  return (
    <UserProvider profile={profile as Profile}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar role={role} />

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Header profile={profile as Profile} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            {children}
          </main>
        </div>

        <BottomNav role={role} />
      </div>
    </UserProvider>
  )
}
