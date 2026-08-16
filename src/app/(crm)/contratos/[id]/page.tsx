import { notFound } from 'next/navigation'
import { getContrato } from '../actions'
import ContratoEditorPage from '@/components/contratos/ContratoEditorPage'

export const dynamic = 'force-dynamic'

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const contrato = await getContrato(id)
  if (!contrato) notFound()
  return <ContratoEditorPage contrato={contrato as any} />
}
