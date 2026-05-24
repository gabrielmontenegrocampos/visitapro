'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Wallet, Clock,
  ArrowUpRight, ArrowDownRight, Plus, List, Tag,
} from 'lucide-react'
import type { CategoriaFinanceira } from '@/types/database'
import LancamentoModal from './LancamentoModal'

interface DashboardData {
  receitas: number
  despesas: number
  saldo: number
  aReceber: number
  aPagar: number
  meses: { mes: string; receitas: number; despesas: number }[]
  recentes: any[]
}

interface Props {
  dashboard: DashboardData
  categorias: CategoriaFinanceira[]
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function FinanceiroDashboard({ dashboard, categorias }: Props) {
  const [showModal, setShowModal] = useState(false)

  const maxBar = Math.max(...dashboard.meses.map(m => Math.max(m.receitas, m.despesas)), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral do ano atual</p>
        </div>
        <div className="flex gap-2">
          <Link href="/financeiro/lancamentos"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors">
            <List size={15} />
            Lançamentos
          </Link>
          <Link href="/financeiro/categorias"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors">
            <Tag size={15} />
            Categorias
          </Link>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
            <Plus size={15} />
            Novo lançamento
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Receitas (pagas)"
          value={fmt(dashboard.receitas)}
          icon={<TrendingUp size={18} />}
          color="text-green-600 bg-green-50"
          trend="up"
        />
        <KpiCard
          label="Despesas (pagas)"
          value={fmt(dashboard.despesas)}
          icon={<TrendingDown size={18} />}
          color="text-red-500 bg-red-50"
          trend="down"
        />
        <KpiCard
          label="Saldo"
          value={fmt(dashboard.saldo)}
          icon={<Wallet size={18} />}
          color={dashboard.saldo >= 0 ? 'text-blue-600 bg-blue-50' : 'text-red-500 bg-red-50'}
        />
        <KpiCard
          label="A receber"
          value={fmt(dashboard.aReceber)}
          icon={<Clock size={18} />}
          color="text-amber-600 bg-amber-50"
          sub={dashboard.aPagar > 0 ? `A pagar: ${fmt(dashboard.aPagar)}` : undefined}
        />
      </div>

      {/* Chart + Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Gráfico de barras */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Receitas vs Despesas — últimos 6 meses</h2>
          <div className="flex items-end gap-3 h-40">
            {dashboard.meses.map((m) => (
              <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end" style={{ height: '120px' }}>
                  <div
                    className="flex-1 bg-green-400 rounded-t-md transition-all"
                    style={{ height: `${(m.receitas / maxBar) * 100}%`, minHeight: m.receitas > 0 ? '4px' : '0' }}
                    title={`Receitas: ${fmt(m.receitas)}`}
                  />
                  <div
                    className="flex-1 bg-red-400 rounded-t-md transition-all"
                    style={{ height: `${(m.despesas / maxBar) * 100}%`, minHeight: m.despesas > 0 ? '4px' : '0' }}
                    title={`Despesas: ${fmt(m.despesas)}`}
                  />
                </div>
                <span className="text-[10px] text-gray-400 capitalize">{m.mes}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-green-400" /> Receitas
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-red-400" /> Despesas
            </div>
          </div>
        </div>

        {/* Últimos lançamentos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Últimos lançamentos</h2>
            <Link href="/financeiro/lancamentos" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-2.5">
            {dashboard.recentes.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Nenhum lançamento ainda</p>
            )}
            {dashboard.recentes.map((l: any) => (
              <div key={l.id} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${l.tipo === 'receita' ? 'bg-green-50' : 'bg-red-50'}`}>
                  {l.tipo === 'receita'
                    ? <ArrowUpRight size={13} className="text-green-600" />
                    : <ArrowDownRight size={13} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{l.descricao}</p>
                  <p className="text-[10px] text-gray-400">{l.categorias_financeiras?.nome}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                    {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
                  </p>
                  <StatusBadge status={l.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <LancamentoModal
          categorias={categorias}
          projetos={[]}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); window.location.reload() }}
        />
      )}
    </div>
  )
}

function KpiCard({ label, value, icon, color, trend, sub }: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  trend?: 'up' | 'down'
  sub?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pago: 'bg-green-100 text-green-700',
    pendente: 'bg-amber-100 text-amber-700',
    cancelado: 'bg-gray-100 text-gray-500',
  }
  const label: Record<string, string> = {
    pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado',
  }
  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${map[status] ?? ''}`}>
      {label[status] ?? status}
    </span>
  )
}
