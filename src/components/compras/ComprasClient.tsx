'use client'

import { useState } from 'react'
import { ShoppingCart, Building2 } from 'lucide-react'
import OrdensCompraTab from './OrdensCompraTab'
import FornecedoresTab from './FornecedoresTab'

interface Props {
  ordens: any[]
  fornecedores: any[]
  projetos: { id: string; nome: string }[]
}

export default function ComprasClient({ ordens, fornecedores, projetos }: Props) {
  const [activeTab, setActiveTab] = useState<'ordens' | 'fornecedores'>('ordens')

  const tabs = [
    {
      key: 'ordens' as const,
      label: 'Ordens de compra',
      icon: ShoppingCart,
      count: ordens.filter(o => o.status !== 'cancelado').length,
    },
    {
      key: 'fornecedores' as const,
      label: 'Fornecedores',
      icon: Building2,
      count: fornecedores.length,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'ordens' && (
        <OrdensCompraTab ordens={ordens} fornecedores={fornecedores} projetos={projetos} />
      )}
      {activeTab === 'fornecedores' && <FornecedoresTab fornecedores={fornecedores} />}
    </div>
  )
}
