'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Pencil, X, Loader2,
  ChevronDown, ChevronUp, Save,
} from 'lucide-react'
import { formatCurrency, PROPOSAL_STATUS_LABELS } from '@/lib/utils'
import {
  createProposalItem, updateProposalItem, deleteProposalItem,
  updateProposalBDI, updateProposalStatus,
} from '@/app/(crm)/propostas/[id]/actions'
import SearchableSelect from '@/components/ui/SearchableSelect'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ItemRow {
  id: string
  proposal_id: string
  area_name: string | null
  service_type: string | null
  description: string | null
  unit: string | null
  quantity: number
  labor_cost: number
  material_cost: number
  equipment_cost: number
  unit_price: number
  total_price: number
  sort_order: number
  created_at: string
}

interface ProposalRow {
  id: string
  title: string
  description: string | null
  value: number
  status: string
  bdi_tax: number | null
  bdi_insurance: number | null
  bdi_profit: number | null
  expires_at: string | null
  leads: { id: string; name: string; phone: string | null } | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVICE_SUGGESTIONS = [
  'Pintura látex', 'Pintura esmalte', 'Pintura epóxi',
  'Textura', 'Textura grafiato', 'Textura acetinada',
  'Limpeza', 'Lavagem à pressão', 'Impermeabilização',
  'Massa corrida', 'Massa acrílica', 'Primer/Selador',
  'Rejunte', 'Pintura de grade', 'Pintura de portão',
]

const AREA_SUGGESTIONS = [
  'Fachada principal', 'Fachada lateral esquerda', 'Fachada lateral direita',
  'Fachada fundos', 'Fachada 1', 'Fachada 2', 'Fachada 3',
  'Muro frontal', 'Muro lateral esquerdo', 'Muro lateral direito',
  'Grade', 'Portão', 'Teto/Laje', 'Área interna', 'Área de serviço',
]

const UNITS = ['m²', 'm', 'ml', 'un', 'vb', 'kit']

const emptyForm = {
  area_name: '', service_type: '', unit: 'm²',
  quantity: '', labor_cost: '', material_cost: '', equipment_cost: '',
  description: '',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MemoriaCalculoClient({
  proposal: initial,
  items: initialItems,
}: {
  proposal: ProposalRow
  items: ItemRow[]
}) {
  const router = useRouter()

  // -- State -----------------------------------------------------------------
  const [items, setItems]             = useState(initialItems)
  const [proposal, setProposal]       = useState(initial)
  const [showForm, setShowForm]       = useState(false)
  const [editingItem, setEditingItem] = useState<ItemRow | null>(null)
  const [form, setForm]               = useState(emptyForm)
  const [saving, setSaving]           = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)

  // BDI state
  const [bdi, setBdi] = useState({
    tax:      String(initial.bdi_tax      ?? 0),
    insurance: String(initial.bdi_insurance ?? 0),
    profit:   String(initial.bdi_profit   ?? 15),
  })
  const [bdiSaving, setBdiSaving]   = useState(false)
  const [bdiSaved, setBdiSaved]     = useState(false)

  // -- Computed --------------------------------------------------------------
  const directCost = useMemo(
    () => items.reduce((sum, i) => sum + i.total_price, 0),
    [items]
  )
  const bdiTax      = parseFloat(bdi.tax)      || 0
  const bdiInsurance = parseFloat(bdi.insurance) || 0
  const bdiProfit   = parseFloat(bdi.profit)   || 0
  const bdiTotal    = bdiTax + bdiInsurance + bdiProfit
  const bdiCoeff    = 1 + bdiTotal / 100
  const bdiValue    = directCost * (bdiCoeff - 1)
  const totalFinal  = directCost * bdiCoeff

  // Live preview in form
  const formQty      = parseFloat(form.quantity) || 0
  const formUnitCost = (parseFloat(form.labor_cost) || 0) + (parseFloat(form.material_cost) || 0) + (parseFloat(form.equipment_cost) || 0)
  const formSubtotal = formQty * formUnitCost

  // -- Handlers --------------------------------------------------------------
  function openAdd() {
    setEditingItem(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(item: ItemRow) {
    setEditingItem(item)
    setForm({
      area_name:      item.area_name     ?? '',
      service_type:   item.service_type  ?? '',
      unit:           item.unit          ?? 'm²',
      quantity:       String(item.quantity),
      labor_cost:     String(item.labor_cost),
      material_cost:  String(item.material_cost),
      equipment_cost: String(item.equipment_cost),
      description:    item.description   ?? '',
    })
    setShowForm(true)
  }

  async function handleSaveItem() {
    if (!form.area_name.trim() || !form.service_type.trim() || !form.quantity) return
    setSaving(true)

    const payload = {
      area_name:      form.area_name.trim(),
      service_type:   form.service_type.trim(),
      unit:           form.unit,
      quantity:       parseFloat(form.quantity)       || 0,
      labor_cost:     parseFloat(form.labor_cost)     || 0,
      material_cost:  parseFloat(form.material_cost)  || 0,
      equipment_cost: parseFloat(form.equipment_cost) || 0,
      description:    form.description.trim() || null,
    }
    const unitPrice  = payload.labor_cost + payload.material_cost + payload.equipment_cost
    const totalPrice = payload.quantity * unitPrice

    if (editingItem) {
      const optimistic: ItemRow = { ...editingItem, ...payload, unit_price: unitPrice, total_price: totalPrice }
      setItems((prev) => prev.map((i) => i.id === editingItem.id ? optimistic : i))
      setShowForm(false)
      setSaving(false)
      await updateProposalItem(editingItem.id, proposal.id, payload)
    } else {
      const tempId = `temp-${Date.now()}`
      const optimistic: ItemRow = {
        id: tempId, proposal_id: proposal.id, sort_order: 0,
        created_at: new Date().toISOString(),
        ...payload, unit_price: unitPrice, total_price: totalPrice,
      }
      setItems((prev) => [...prev, optimistic])
      setShowForm(false)
      setSaving(false)
      const { data } = await createProposalItem(proposal.id, payload)
      if (data) setItems((prev) => prev.map((i) => i.id === tempId ? (data as ItemRow) : i))
    }
  }

  async function handleDelete(item: ItemRow) {
    if (!confirm(`Remover "${item.area_name} — ${item.service_type}"?`)) return
    setDeletingId(item.id)
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    await deleteProposalItem(item.id, proposal.id)
    setDeletingId(null)
  }

  async function handleSaveBDI() {
    setBdiSaving(true)
    setBdiSaved(false)
    await updateProposalBDI(proposal.id, {
      tax:       bdiTax,
      insurance: bdiInsurance,
      profit:    bdiProfit,
    })
    setBdiSaving(false)
    setBdiSaved(true)
    setTimeout(() => setBdiSaved(false), 2500)
  }

  async function handleStatusChange(status: string) {
    setStatusSaving(true)
    setProposal((p) => ({ ...p, status }))
    await updateProposalStatus(proposal.id, status)
    setStatusSaving(false)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <div className="max-w-2xl mx-auto space-y-4 pb-10">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors -ml-2 shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate leading-tight">{proposal.title}</p>
            <p className="text-xs text-gray-400 truncate">{proposal.leads?.name ?? '—'}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {statusSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            <div className="w-36">
              <SearchableSelect
                value={proposal.status}
                onChange={handleStatusChange}
                options={Object.entries(PROPOSAL_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
              />
            </div>
          </div>
        </div>

        {/* ── Itens ── */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Itens — Composição de Custo
          </p>

          <div className="space-y-2">
            {items.length === 0 && (
              <div className="card p-8 text-center text-gray-400">
                <p className="text-sm">Nenhuma área adicionada ainda</p>
                <p className="text-xs mt-1">Toque em "Adicionar" para começar</p>
              </div>
            )}

            {items.map((item) => (
              <div
                key={item.id}
                className={`card p-4 transition-opacity ${deletingId === item.id ? 'opacity-40' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{item.area_name}</p>
                    <p className="text-xs text-blue-600 font-medium mt-0.5">{item.service_type}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button onClick={() => handleDelete(item)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    <span className="font-semibold text-gray-800">{item.quantity}</span> {item.unit}
                  </span>
                  <span>
                    Unit.: <span className="font-semibold text-gray-800">{formatCurrency(item.unit_price)}/{item.unit}</span>
                  </span>
                </div>

                <div className="mt-1.5 pt-1.5 border-t border-gray-100 grid grid-cols-3 text-[11px] text-gray-400 gap-1">
                  <span>MO: {formatCurrency(item.labor_cost)}</span>
                  <span className="text-center">Mat: {formatCurrency(item.material_cost)}</span>
                  <span className="text-right">Equip: {formatCurrency(item.equipment_cost)}</span>
                </div>

                <div className="mt-1.5 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Subtotal custo direto</span>
                  <span className="font-bold text-gray-900">{formatCurrency(item.total_price)}</span>
                </div>

                {item.description && (
                  <p className="mt-1.5 text-xs text-gray-400 italic">{item.description}</p>
                )}
              </div>
            ))}

            {/* Botão adicionar */}
            <button
              onClick={openAdd}
              className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
            >
              <Plus className="w-4 h-4" />
              Adicionar área / serviço
            </button>
          </div>
        </div>

        {/* ── BDI ── */}
        <div className="card overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              BDI — Benefícios e Despesas Indiretas
            </p>
          </div>

          {/* Lista de taxas */}
          <div className="divide-y divide-gray-100">
            {([
              { key: 'tax',       label: 'Imposto',         color: 'text-orange-600' },
              { key: 'insurance', label: 'Seguro',          color: 'text-yellow-600' },
              { key: 'profit',    label: 'Margem de lucro', color: 'text-green-600'  },
            ] as const).map(({ key, label, color }) => (
              <div key={key} className="flex items-center justify-between px-4 py-3 gap-4">
                <span className={`text-sm font-medium ${color}`}>{label}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    className="w-20 text-right border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    inputMode="decimal"
                    value={bdi[key]}
                    onChange={(e) => setBdi((b) => ({ ...b, [key]: e.target.value }))}
                  />
                  <span className="text-sm text-gray-400 w-4">%</span>
                </div>
              </div>
            ))}

            {/* Totais BDI */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
              <span className="text-sm font-bold text-gray-700">BDI Total</span>
              <span className="text-sm font-bold text-blue-700">{bdiTotal.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
              <span className="text-xs text-gray-500">Coeficiente multiplicador</span>
              <span className="text-xs font-semibold text-gray-700">{bdiCoeff.toFixed(4)}×</span>
            </div>
          </div>

          {/* Salvar BDI */}
          <div className="px-4 py-3 border-t border-gray-100">
            <button
              onClick={handleSaveBDI}
              disabled={bdiSaving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            >
              {bdiSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                : bdiSaved
                  ? <><Save className="w-4 h-4" /> BDI salvo!</>
                  : <><Save className="w-4 h-4" /> Salvar BDI</>
              }
            </button>
          </div>
        </div>

        {/* ── Resumo Final ── */}
        <div className="card p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo Final</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Custo direto total</span>
              <span className="font-medium text-gray-900">{formatCurrency(directCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">BDI ({bdiTotal.toFixed(1)}%)</span>
              <span className="font-medium text-gray-900">{formatCurrency(bdiValue)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200">
              <span className="font-bold text-gray-900 text-base">TOTAL DA PROPOSTA</span>
              <span className="font-bold text-blue-700 text-2xl">{formatCurrency(totalFinal)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Modal de item — centralizado no desktop, bottom sheet no mobile ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !saving && setShowForm(false)}
          />

          {/* Painel */}
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[94vh] flex flex-col">

            {/* Handle mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-bold text-gray-900 text-base">
                {editingItem ? 'Editar item' : 'Adicionar área / serviço'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Área + Serviço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Área *</label>
                  <input
                    className="input"
                    placeholder="Ex: Fachada 1"
                    value={form.area_name}
                    list="area-suggestions"
                    onChange={(e) => setForm((f) => ({ ...f, area_name: e.target.value }))}
                  />
                  <datalist id="area-suggestions">
                    {AREA_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="label">Serviço *</label>
                  <input
                    className="input"
                    placeholder="Ex: Pintura látex"
                    value={form.service_type}
                    list="service-suggestions"
                    onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}
                  />
                  <datalist id="service-suggestions">
                    {SERVICE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>
              </div>

              {/* Quantidade + Unidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Quantidade *</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Unidade</label>
                  <select
                    className="input"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Custos */}
              <div>
                <label className="label">
                  Custo por {form.unit || 'unidade'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'labor_cost',     label: 'Mão de obra' },
                    { key: 'material_cost',  label: 'Material' },
                    { key: 'equipment_cost', label: 'Equipamentos' },
                  ] as const).map(({ key, label }) => (
                    <div key={key}>
                      <p className="text-[11px] text-gray-500 mb-1 text-center">{label}</p>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 pointer-events-none">R$</span>
                        <input
                          className="input pl-6 pr-1 text-right text-sm"
                          type="number"
                          placeholder="0"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={form[key]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview em tempo real */}
              {formQty > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 space-y-1">
                  <div className="flex justify-between text-xs text-blue-600">
                    <span>Custo unitário</span>
                    <span className="font-semibold">{formatCurrency(formUnitCost)}/{form.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-700">Subtotal ({form.quantity} {form.unit})</span>
                    <span className="text-blue-700">{formatCurrency(formSubtotal)}</span>
                  </div>
                  {bdiTotal > 0 && (
                    <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-blue-100">
                      <span>Com BDI ({bdiTotal.toFixed(1)}%)</span>
                      <span className="font-medium">{formatCurrency(formSubtotal * bdiCoeff)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="label">
                  Observações <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  className="input"
                  placeholder="Ex: 2 demãos, selador de fundo..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            {/* Rodapé fixo */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary flex-1 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveItem}
                disabled={saving || !form.area_name.trim() || !form.service_type.trim() || !form.quantity}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : editingItem ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
