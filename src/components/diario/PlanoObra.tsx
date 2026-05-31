'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { updatePlanejamento, type EtapaPlano } from '@/app/(crm)/diario-obra/actions'

interface Props {
  projetoId: string
  initialEtapas: EtapaPlano[]
}

function newId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }

export default function PlanoObra({ projetoId, initialEtapas }: Props) {
  const [etapas, setEtapas] = useState<EtapaPlano[]>(initialEtapas)
  const [open, setOpen] = useState(initialEtapas.length === 0)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const totalPeso = etapas.reduce((s, e) => s + (e.peso || 0), 0)
  const progresso = etapas
    .filter(e => e.concluida)
    .reduce((s, e) => s + (e.peso || 0), 0)
  const restante = 100 - totalPeso

  async function save(next: EtapaPlano[]) {
    setSaving(true)
    await updatePlanejamento(projetoId, next)
    setSaving(false)
  }

  function addEtapa() {
    const pesoSugerido = Math.max(0, Math.floor(restante))
    const nova: EtapaPlano = {
      id: newId(),
      nome: '',
      peso: pesoSugerido,
      concluida: false,
      ordem: etapas.length,
    }
    const next = [...etapas, nova]
    setEtapas(next)
    setEditingId(nova.id)
  }

  function updateEtapa(id: string, field: keyof EtapaPlano, value: any) {
    const next = etapas.map(e => e.id === id ? { ...e, [field]: value } : e)
    setEtapas(next)
    return next
  }

  async function toggleConcluida(id: string) {
    const next = etapas.map(e => e.id === id ? { ...e, concluida: !e.concluida } : e)
    setEtapas(next)
    await save(next)
  }

  async function removeEtapa(id: string) {
    const next = etapas.filter(e => e.id !== id)
    setEtapas(next)
    await save(next)
  }

  async function handleBlur(id: string) {
    setEditingId(null)
    await save(etapas)
  }

  // Distribui pesos iguais
  async function distribuirIgual() {
    if (etapas.length === 0) return
    const peso = Math.floor(100 / etapas.length)
    const resto = 100 - peso * etapas.length
    const next = etapas.map((e, i) => ({
      ...e,
      peso: i === etapas.length - 1 ? peso + resto : peso,
    }))
    setEtapas(next)
    await save(next)
  }

  const corProgresso =
    progresso === 100 ? 'bg-green-500' :
    progresso >= 75   ? 'bg-blue-500'  :
    progresso >= 50   ? 'bg-blue-400'  :
    progresso >= 25   ? 'bg-amber-400' : 'bg-amber-300'

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header colapsável */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold text-gray-800">Plano da Obra</span>
            <span className="text-xs text-gray-400">
              {etapas.length === 0
                ? 'Nenhuma etapa definida — clique para adicionar'
                : `${etapas.filter(e => e.concluida).length}/${etapas.length} etapas · ${progresso}% concluído`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {etapas.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${corProgresso}`} style={{ width: `${progresso}%` }} />
              </div>
              <span className={`text-sm font-bold ${progresso === 100 ? 'text-green-600' : 'text-gray-700'}`}>
                {progresso}%
              </span>
            </div>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {/* Barra de progresso */}
          {etapas.length > 0 && (
            <div className="px-5 pt-4 pb-2 space-y-1.5">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${corProgresso}`} style={{ width: `${progresso}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-300">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>
          )}

          {/* Alerta soma ≠ 100 */}
          {etapas.length > 0 && totalPeso !== 100 && (
            <div className="mx-5 mb-3 flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {totalPeso < 100
                ? `Faltam ${100 - totalPeso}% para completar 100%`
                : `Total está ${totalPeso - 100}% acima de 100%`}
              <button onClick={distribuirIgual} className="ml-auto text-blue-600 font-medium hover:underline shrink-0">
                Distribuir igual
              </button>
            </div>
          )}

          {/* Lista de etapas */}
          <div className="px-5 space-y-1 pb-3">
            {etapas.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">
                Adicione as etapas da obra antes de iniciar os registros diários
              </p>
            )}

            {etapas.map((etapa, idx) => (
              <div key={etapa.id}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-colors ${
                  etapa.concluida ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-transparent hover:border-gray-200'
                }`}
              >
                {/* Checkbox */}
                <button onClick={() => toggleConcluida(etapa.id)} className="shrink-0">
                  {etapa.concluida
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />}
                </button>

                {/* Nome */}
                {editingId === etapa.id ? (
                  <input
                    autoFocus
                    value={etapa.nome}
                    onChange={e => updateEtapa(etapa.id, 'nome', e.target.value)}
                    onBlur={() => handleBlur(etapa.id)}
                    onKeyDown={e => e.key === 'Enter' && handleBlur(etapa.id)}
                    placeholder="Nome da etapa..."
                    className="flex-1 text-sm bg-white border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                ) : (
                  <span
                    onClick={() => setEditingId(etapa.id)}
                    className={`flex-1 text-sm cursor-text ${etapa.concluida ? 'line-through text-gray-400' : 'text-gray-800'} ${!etapa.nome ? 'text-gray-300 italic' : ''}`}
                  >
                    {etapa.nome || 'Clique para nomear...'}
                  </span>
                )}

                {/* Peso % */}
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number" min={0} max={100} step={1}
                    value={etapa.peso}
                    onChange={e => {
                      const next = updateEtapa(etapa.id, 'peso', Math.min(100, Math.max(0, Number(e.target.value))))
                      save(next)
                    }}
                    className="w-14 text-right text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                  />
                  <span className="text-xs text-gray-400 w-3">%</span>
                </div>

                {/* Remover */}
                <button onClick={() => removeEtapa(etapa.id)}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-gray-50/50">
            <button onClick={addEtapa}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-4 h-4" /> Adicionar etapa
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {saving && <span className="text-blue-500">Salvando...</span>}
              {etapas.length > 0 && (
                <span className={totalPeso === 100 ? 'text-green-600 font-medium' : 'text-amber-500'}>
                  Total: {totalPeso}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
