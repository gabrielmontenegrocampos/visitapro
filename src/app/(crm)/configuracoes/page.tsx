import { getCompanySettings } from './actions'
import ConfiguracoesClient from '@/components/configuracoes/ConfiguracoesClient'

export const dynamic = 'force-dynamic'

export default async function ConfiguracoesPage() {
  const settings = await getCompanySettings()
  return <ConfiguracoesClient settings={settings} />
}
