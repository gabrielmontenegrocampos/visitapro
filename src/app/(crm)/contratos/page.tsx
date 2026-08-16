import { getContratosList, getAcceptedProposalsWithoutContract } from './actions'
import ContratosClient from '@/components/contratos/ContratosClient'

export const dynamic = 'force-dynamic'

export default async function ContratosPage() {
  const [contratos, pendentes] = await Promise.all([
    getContratosList(),
    getAcceptedProposalsWithoutContract(),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
        <p className="text-gray-500 text-sm mt-1">Edite e gerencie os contratos de prestação de serviços</p>
      </div>
      <ContratosClient contratos={contratos as any} pendentes={pendentes as any} />
    </div>
  )
}
