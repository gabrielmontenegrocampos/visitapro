import Link from 'next/link'
import { Users } from 'lucide-react'
import { formatDate, SOURCE_LABELS } from '@/lib/utils'

interface Lead {
  id: string
  name: string
  phone: string | null
  source: string
  created_at: string
  stage_id: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipeline_stages: any
}

interface RecentLeadsProps {
  leads: Lead[]
}

export default function RecentLeads({ leads }: RecentLeadsProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Leads Recentes</h3>
        <Link href="/leads" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Ver todos
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum lead cadastrado ainda</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-3 font-medium text-gray-500 text-xs uppercase">Nome</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs uppercase">Telefone</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs uppercase">Origem</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs uppercase">Estágio</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs uppercase">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="py-3 text-gray-500">{lead.phone ?? '—'}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {SOURCE_LABELS[lead.source] ?? lead.source}
                    </span>
                  </td>
                  <td className="py-3">
                    {lead.pipeline_stages ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: Array.isArray(lead.pipeline_stages) ? lead.pipeline_stages[0]?.color : lead.pipeline_stages.color }}
                      >
                        {Array.isArray(lead.pipeline_stages) ? lead.pipeline_stages[0]?.name : lead.pipeline_stages.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 text-gray-500">{formatDate(lead.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
