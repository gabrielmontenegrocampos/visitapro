'use client'

import { getInitials } from '@/lib/utils'
import { Users, Calendar, UserCheck, UserX } from 'lucide-react'
import type { Profile } from '@/types/database'

type ProfileWithCounts = Profile & { leadsCount: number; visitsCount: number }

export default function VendedoresClient({ profiles }: { profiles: ProfileWithCounts[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {profiles.map((p) => (
        <div key={p.id} className="card p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">{getInitials(p.full_name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{p.full_name}</p>
              <p className="text-sm text-gray-500 truncate">{p.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  p.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {p.role === 'admin' ? 'Admin' : 'Vendedor'}
                </span>
                {p.active ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    <UserCheck className="w-3 h-3" /> Ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    <UserX className="w-3 h-3" /> Inativo
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Leads</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{p.leadsCount}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Próx. Visitas</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{p.visitsCount}</p>
            </div>
          </div>

          {p.phone && (
            <a
              href={`tel:${p.phone}`}
              className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {p.phone}
            </a>
          )}
        </div>
      ))}

      {profiles.length === 0 && (
        <div className="col-span-3 text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum vendedor cadastrado ainda</p>
        </div>
      )}
    </div>
  )
}
