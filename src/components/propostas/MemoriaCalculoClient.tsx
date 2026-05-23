'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Pencil, X, Loader2, Save,
  Hammer, Package, Wrench, Percent,
} from 'lucide-react'
import { formatCurrency, PROPOSAL_STATUS_LABELS } from '@/lib/utils'
import {
  createProposalItem, updateProposalItem, deleteProposalItem,
  createBdiItem, updateBdiItem, deleteBdiItem,
  updateProposalStatus,
  type Measurement,
} from '@/app/(crm)/propostas/[id]/actions'
import SearchableSelect from '@/components/ui/SearchableSelect'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ItemRow {
  id: string
  proposal_id: string
  item_type: 'servico' | 'material' | 'equipamento' | null
  area_name: string | null
  service_type: string | null
  description: string | null
  unit: string | null
  quantity: number
  labor_cost: number
  unit_price: number
  total_price: number
  measurements: Measurement[] | null
  created_at: string
}

interface BdiItemRow {
  id: string
  proposal_id: string
  label: string
  percentage: number
  created_at: string
}

interface ProposalRow {
  id: string
  title: string
  status: string
  value: number
  leads: { id: string; name: string } | null
}

type MeasForm = { id: string; label: string; height: string; width: string }
function newMeas(): MeasForm { return { id: String(Date.now() + Math.random()), label: '', height: '', width: '' } }

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const SERVICE_SUGGESTIONS = [
  'Pintura látex', 'Pintura esmalte', 'Textura', 'Textura grafiato',
  'Limpeza', 'Lavagem à pressão', 'Impermeabilização', 'Massa corrida',
  'Primer/Selador', 'Rejunte', 'Pintura de grade', 'Pintura de portão',
]
const AREA_SUGGESTIONS = [
  'Fachada principal', 'Fachada lateral esq.', 'Fachada lateral dir.',
  'Fachada fundos', 'Fachada 1', 'Fachada 2', 'Fachada 3',
  'Muro frontal', 'Muro lateral esq.', 'Muro lateral dir.',
  'Grade', 'Portão', 'Teto/Laje', 'Área interna',
]
const MATERIAL_SUGGESTIONS = [
  'Tinta látex 18L', 'Tinta esmalte 3.6L', 'Textura acrílica 25kg',
  'Primer/Selador 18L', 'Massa corrida 25kg', 'Lixa', 'Fita crepe',
  'Impermeabilizante 18L', 'Thinner', 'Aguarrás',
]
const EQUIPMENT_SUGGESTIONS = [
  'Andaime', 'Balancim', 'Rolo de pintura', 'Pistola airless',
  'Escada', 'Lona plástica', 'Compressor', 'Gerenciamento de resíduos',
]
const BDI_SUGGESTIONS = [
  'Imposto (ISS)', 'Imposto (PIS/COFINS)', 'Seguro', 'Margem de lucro',
  'Administração central', 'Garantia', 'Risco',
]
const UNITS_SERVICE  = ['m²', 'm', 'ml']
const UNITS_MATERIAL = ['un', 'lata', 'saco', 'kg', 'L', 'm²', 'm', 'rolo', 'caixa']
const UNITS_EQUIP    = ['dia', 'semana', 'mês', 'un', 'hora']

// ---------------------------------------------------------------------------

export default function MemoriaCalculoClient({
  proposal: initial,
  items: initialItems,
  bdiItems: initialBdi,
}: {
  proposal: ProposalRow
  items: ItemRow[]
  bdiItems: BdiItemRow[]
}) {
  const router = useRouter()

  // -- State principal -------------------------------------------------------
  const [items, setItems]       = useState(initialItems)
  const [bdiItems, setBdiItems] = useState(initialBdi)
  const [proposal, setProposal] = useState(initial)
  const [statusSaving, setStatusSaving] = useState(false)

  // Modal de item
  type ModalType = 'servico' | 'material' | 'equipamento' | null
  const [modalType, setModalType]     = useState<ModalType>(null)
  const [editingItem, setEditingItem] = useState<ItemRow | null>(null)
  const [itemSaving, setItemSaving]   = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  // Form serviço
  const [svcArea,    setSvcArea]    = useState('')
  const [svcType,    setSvcType]    = useState('')
  const [svcUnit,    setSvcUnit]    = useState('m²')
  const [svcMoCost,  setSvcMoCost]  = useState('')
  const [svcNotes,   setSvcNotes]   = useState('')
  const [meas, setMeas]             = useState<MeasForm[]>([newMeas()])

  // Form simples (material / equipamento)
  const [simName,    setSimName]    = useState('')
  const [simQty,     setSimQty]     = useState('')
  const [simUnit,    setSimUnit]    = useState('un')
  const [simPrice,   setSimPrice]   = useState('')
  const [simNotes,   setSimNotes]   = useState('')

  // BDI inline
  const [editingBdi,  setEditingBdi]  = useState<BdiItemRow | null>(null)
  const [bdiForm,     setBdiForm]     = useState({ label: '', percentage: '' })
  const [showBdiAdd,  setShowBdiAdd]  = useState(false)
  const [bdiSaving,   setBdiSaving]   = useState(false)
  const [deletingBdi, setDeletingBdi] = useState<string | null>(null)

  // -- Computed --------------------------------------------------------------
  const serviceItems   = items.filter(i => !i.item_type || i.item_type === 'servico')
  const materialItems  = items.filter(i => i.item_type === 'material')
  const equipItems     = items.filter(i => i.item_type === 'equipamento')
  const directCost     = items.reduce((s, i) => s + i.total_price, 0)
  const bdiTotal       = bdiItems.reduce((s, b) => s + b.percentage, 0)
  const bdiCoeff       = 1 + bdiTotal / 100
  const bdiValue       = directCost * (bdiCoeff - 1)
  const totalFinal     = directCost * bdiCoeff

  // Preview serviço
  const totalM2 = useMemo(
    () => meas.reduce((s, m) => s + (parseFloat(m.height) || 0) * (parseFloat(m.width) || 0), 0),
    [meas]
  )
  const svcSubtotal = totalM2 * (parseFloat(svcMoCost) || 0)

  // Preview simples
  const simSubtotal = (parseFloat(simQty) || 0) * (parseFloat(simPrice) || 0)

  // -- Abrir modais ----------------------------------------------------------
  function openAddService() {
    setEditingItem(null); setSvcArea(''); setSvcType(''); setSvcUnit('m²')
    setSvcMoCost(''); setSvcNotes(''); setMeas([newMeas()]); setModalType('servico')
  }
  function openAddSimple(type: 'material' | 'equipamento') {
    setEditingItem(null); setSimName(''); setSimQty('')
    setSimUnit(type === 'material' ? 'un' : 'dia')
    setSimPrice(''); setSimNotes(''); setModalType(type)
  }
  function openEdit(item: ItemRow) {
    setEditingItem(item)
    if (!item.item_type || item.item_type === 'servico') {
      setSvcArea(item.area_name ?? ''); setSvcType(item.service_type ?? '')
      setSvcUnit(item.unit ?? 'm²'); setSvcMoCost(String(item.labor_cost || item.unit_price))
      setSvcNotes(item.description ?? '')
      setMeas(
        item.measurements?.length
          ? item.measurements.map(m => ({ id: m.id, label: m.label, height: String(m.height), width: String(m.width) }))
          : [newMeas()]
      )
      setModalType('servico')
    } else {
      setSimName(item.area_name ?? ''); setSimQty(String(item.quantity))
      setSimUnit(item.unit ?? 'un'); setSimPrice(String(item.unit_price))
      setSimNotes(item.description ?? ''); setModalType(item.item_type)
    }
  }

  // -- Salvar item -----------------------------------------------------------
  async function handleSaveItem() {
    setItemSaving(true)
    const isService = modalType === 'servico'

    if (isService) {
      if (!svcArea.trim() || !svcType.trim() || totalM2 === 0) { setItemSaving(false); return }
      const measurements: Measurement[] = meas
        .filter(m => (parseFloat(m.height) || 0) * (parseFloat(m.width) || 0) > 0)
        .map(m => ({ id: m.id, label: m.label, height: parseFloat(m.height) || 0, width: parseFloat(m.width) || 0 }))
      const payload = {
        item_type: 'servico' as const,
        area_name: svcArea.trim(), service_type: svcType.trim(),
        unit: svcUnit, measurements, quantity: totalM2,
        labor_cost: parseFloat(svcMoCost) || 0,
        description: svcNotes.trim() || null,
      }
      const unitPrice  = payload.labor_cost
      const totalPrice = payload.quantity * unitPrice
      if (editingItem) {
        const opt: ItemRow = { ...editingItem, ...payload, unit_price: unitPrice, total_price: totalPrice }
        setItems(prev => prev.map(i => i.id === editingItem.id ? opt : i))
        setModalType(null); setItemSaving(false)
        await updateProposalItem(editingItem.id, proposal.id, payload)
      } else {
        const tempId = `t${Date.now()}`
        const opt: ItemRow = { id: tempId, proposal_id: proposal.id, ...payload, unit_price: unitPrice, total_price: totalPrice, service_type: svcType.trim(), created_at: '' }
        setItems(prev => [...prev, opt])
        setModalType(null); setItemSaving(false)
        const { data } = await createProposalItem(proposal.id, payload)
        if (data) setItems(prev => prev.map(i => i.id === tempId ? (data as ItemRow) : i))
      }
    } else {
      if (!simName.trim() || !simQty || !simPrice) { setItemSaving(false); return }
      const payload = {
        item_type: modalType as 'material' | 'equipamento',
        area_name: simName.trim(), unit: simUnit,
        quantity: parseFloat(simQty) || 0, unit_price: parseFloat(simPrice) || 0,
        description: simNotes.trim() || null,
      }
      const totalPrice = payload.quantity * payload.unit_price
      if (editingItem) {
        const opt: ItemRow = { ...editingItem, ...payload, labor_cost: 0, service_type: null, measurements: [], unit_price: payload.unit_price, total_price: totalPrice }
        setItems(prev => prev.map(i => i.id === editingItem.id ? opt : i))
        setModalType(null); setItemSaving(false)
        await updateProposalItem(editingItem.id, proposal.id, payload)
      } else {
        const tempId = `t${Date.now()}`
        const opt: ItemRow = { id: tempId, proposal_id: proposal.id, ...payload, labor_cost: 0, service_type: null, measurements: [], unit_price: payload.unit_price, total_price: totalPrice, created_at: '' }
        setItems(prev => [...prev, opt])
        setModalType(null); setItemSaving(false)
        const { data } = await createProposalItem(proposal.id, payload)
        if (data) setItems(prev => prev.map(i => i.id === tempId ? (data as ItemRow) : i))
      }
    }
  }

  async function handleDeleteItem(item: ItemRow) {
    if (!confirm(`Remover "${item.area_name}"?`)) return
    setDeletingId(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    await deleteProposalItem(item.id, proposal.id)
    setDeletingId(null)
  }

  // -- BDI -------------------------------------------------------------------
  function openBdiAdd() { setBdiForm({ label: '', percentage: '' }); setEditingBdi(null); setShowBdiAdd(true) }
  function openBdiEdit(b: BdiItemRow) { setBdiForm({ label: b.label, percentage: String(b.percentage) }); setEditingBdi(b); setShowBdiAdd(true) }

  async function handleSaveBdi() {
    if (!bdiForm.label.trim()) return
    setBdiSaving(true)
    const data = { label: bdiForm.label.trim(), percentage: parseFloat(bdiForm.percentage) || 0 }
    if (editingBdi) {
      setBdiItems(prev => prev.map(b => b.id === editingBdi.id ? { ...b, ...data } : b))
      setShowBdiAdd(false); setBdiSaving(false)
      await updateBdiItem(editingBdi.id, proposal.id, data)
    } else {
      const tempId = `t${Date.now()}`
      setBdiItems(prev => [...prev, { id: tempId, proposal_id: proposal.id, sort_order: 0, created_at: '', ...data }])
      setShowBdiAdd(false); setBdiSaving(false)
      const { data: saved } = await createBdiItem(proposal.id, data)
      if (saved) setBdiItems(prev => prev.map(b => b.id === tempId ? (saved as BdiItemRow) : b))
    }
  }

  async function handleDeleteBdi(b: BdiItemRow) {
    setDeletingBdi(b.id)
    setBdiItems(prev => prev.filter(x => x.id !== b.id))
    await deleteBdiItem(b.id, proposal.id)
    setDeletingBdi(null)
  }

  async function handleStatusChange(status: string) {
    setStatusSaving(true); setProposal(p => ({ ...p, status }))
    await updateProposalStatus(proposal.id, status)
    setStatusSaving(false)
  }

  // -- Helpers de render -----------------------------------------------------
  function ItemCard({ item }: { item: ItemRow }) {
    const isService = !item.item_type || item.item_type === 'servico'
    return (
      <div className={`card p-4 transition-opacity ${deletingId === item.id ? 'opacity-40' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight">{item.area_name}</p>
            {isService && item.service_type && (
              <p className="text-xs text-blue-600 font-medium mt-0.5">{item.service_type}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <button onClick={() => handleDeleteItem(item)} className="p-1.5 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>

        {isService && item.measurements && item.measurements.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {item.measurements.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-[11px] text-gray-400">
                {m.label && <span className="font-medium text-gray-500">{m.label}:</span>}
                <span>{m.height}m × {m.width}m = <span className="font-semibold text-gray-600">{(m.height * m.width).toFixed(2)} m²</span></span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500">
          <span className="font-semibold text-gray-800">{item.quantity.toFixed(2)} {item.unit}</span>
          <span>{formatCurrency(item.unit_price)}/{item.unit}</span>
        </div>

        <div className="mt-1.5 flex justify-between items-center border-t border-gray-100 pt-1.5">
          <span className="text-xs text-gray-500">Subtotal</span>
          <span className="font-bold text-gray-900">{formatCurrency(item.total_price)}</span>
        </div>
        {item.description && <p className="mt-1 text-[11px] text-gray-400 italic">{item.description}</p>}
      </div>
    )
  }

  function SectionHeader({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${color}`}>
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  return (
    <>
      <div className="max-w-2xl mx-auto space-y-5 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl -ml-2 shrink-0">
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

        {/* ── SERVIÇOS ── */}
        <div className="space-y-2">
          <SectionHeader icon={<Hammer className="w-3.5 h-3.5 text-blue-700" />} label="Serviços / Mão de Obra" color="bg-blue-50 text-blue-700" />
          {serviceItems.map(item => <ItemCard key={item.id} item={item} />)}
          {serviceItems.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhum serviço adicionado</p>}
          <button onClick={openAddService} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-200 rounded-xl text-sm text-blue-500 hover:bg-blue-50 transition-all">
            <Plus className="w-4 h-4" /> Adicionar serviço
          </button>
        </div>

        {/* ── MATERIAIS ── */}
        <div className="space-y-2">
          <SectionHeader icon={<Package className="w-3.5 h-3.5 text-green-700" />} label="Materiais" color="bg-green-50 text-green-700" />
          {materialItems.map(item => <ItemCard key={item.id} item={item} />)}
          {materialItems.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhum material adicionado</p>}
          <button onClick={() => openAddSimple('material')} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-green-200 rounded-xl text-sm text-green-600 hover:bg-green-50 transition-all">
            <Plus className="w-4 h-4" /> Adicionar material
          </button>
        </div>

        {/* ── EQUIPAMENTOS ── */}
        <div className="space-y-2">
          <SectionHeader icon={<Wrench className="w-3.5 h-3.5 text-orange-700" />} label="Equipamentos" color="bg-orange-50 text-orange-700" />
          {equipItems.map(item => <ItemCard key={item.id} item={item} />)}
          {equipItems.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhum equipamento adicionado</p>}
          <button onClick={() => openAddSimple('equipamento')} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-orange-200 rounded-xl text-sm text-orange-600 hover:bg-orange-50 transition-all">
            <Plus className="w-4 h-4" /> Adicionar equipamento
          </button>
        </div>

        {/* ── BDI ── */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 border-b border-purple-100">
            <Percent className="w-3.5 h-3.5 text-purple-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">BDI — Benefícios e Despesas Indiretas</span>
          </div>

          <div className="divide-y divide-gray-100">
            {bdiItems.map(b => (
              <div key={b.id} className={`flex items-center gap-3 px-4 py-3 transition-opacity ${deletingBdi === b.id ? 'opacity-40' : ''}`}>
                <span className="flex-1 text-sm text-gray-700 font-medium">{b.label}</span>
                <span className="font-bold text-purple-700 text-sm w-16 text-right">{b.percentage.toFixed(1)}%</span>
                <button onClick={() => openBdiEdit(b)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <Pencil className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button onClick={() => handleDeleteBdi(b)} className="p-1.5 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
            {bdiItems.length === 0 && !showBdiAdd && (
              <p className="text-xs text-gray-400 text-center py-4">Nenhuma taxa BDI adicionada</p>
            )}

            {/* Formulário inline BDI */}
            {showBdiAdd && (
              <div className="px-4 py-3 space-y-3 bg-purple-50">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Descrição</label>
                    <input
                      className="input text-sm"
                      placeholder="Ex: Margem de lucro"
                      value={bdiForm.label}
                      list="bdi-suggestions"
                      onChange={e => setBdiForm(f => ({ ...f, label: e.target.value }))}
                    />
                    <datalist id="bdi-suggestions">
                      {BDI_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="label text-xs">Percentual</label>
                    <div className="relative">
                      <input
                        className="input text-sm text-right pr-7"
                        type="number" min="0" max="100" step="0.5"
                        inputMode="decimal" placeholder="0"
                        value={bdiForm.percentage}
                        onChange={e => setBdiForm(f => ({ ...f, percentage: e.target.value }))}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowBdiAdd(false)} className="btn-secondary flex-1 text-xs py-2">Cancelar</button>
                  <button
                    onClick={handleSaveBdi}
                    disabled={bdiSaving || !bdiForm.label.trim()}
                    className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1"
                  >
                    {bdiSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    {bdiSaving ? 'Salvando...' : editingBdi ? 'Atualizar' : 'Adicionar'}
                  </button>
                </div>
              </div>
            )}

            {/* Totais */}
            {bdiItems.length > 0 && (
              <>
                <div className="flex items-center justify-between px-4 py-2.5 bg-purple-50">
                  <span className="text-sm font-bold text-gray-700">BDI Total</span>
                  <span className="font-bold text-purple-700">{bdiTotal.toFixed(1)}% — coef. {bdiCoeff.toFixed(4)}×</span>
                </div>
              </>
            )}
          </div>

          {/* Botão adicionar BDI */}
          {!showBdiAdd && (
            <div className="px-4 py-3 border-t border-gray-100">
              <button onClick={openBdiAdd} className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-purple-200 rounded-xl text-sm text-purple-600 hover:bg-purple-50 transition-all">
                <Plus className="w-4 h-4" /> Adicionar taxa BDI
              </button>
            </div>
          )}
        </div>

        {/* ── Resumo Final ── */}
        <div className="card p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo Final</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Serviços ({serviceItems.length} itens)</span>
              <span className="font-medium text-gray-900">{formatCurrency(serviceItems.reduce((s, i) => s + i.total_price, 0))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Materiais ({materialItems.length} itens)</span>
              <span className="font-medium text-gray-900">{formatCurrency(materialItems.reduce((s, i) => s + i.total_price, 0))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Equipamentos ({equipItems.length} itens)</span>
              <span className="font-medium text-gray-900">{formatCurrency(equipItems.reduce((s, i) => s + i.total_price, 0))}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
              <span className="text-gray-600 font-medium">Custo direto total</span>
              <span className="font-semibold text-gray-900">{formatCurrency(directCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">BDI ({bdiTotal.toFixed(1)}%)</span>
              <span className="font-medium text-purple-700">{formatCurrency(bdiValue)}</span>
            </div>
            <div className="flex justify-between items-center border-t-2 border-gray-200 pt-3 mt-1">
              <span className="font-bold text-gray-900 text-base">TOTAL DA PROPOSTA</span>
              <span className="font-bold text-blue-700 text-2xl">{formatCurrency(totalFinal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Modal de item ══ */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !itemSaving && setModalType(null)} />
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[94vh] flex flex-col">

            <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-bold text-gray-900">
                {editingItem ? 'Editar' : 'Adicionar'}{' '}
                {modalType === 'servico' ? 'Serviço' : modalType === 'material' ? 'Material' : 'Equipamento'}
              </h2>
              <button onClick={() => setModalType(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* ── Formulário de Serviço ── */}
              {modalType === 'servico' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Área *</label>
                      <input className="input" placeholder="Ex: Fachada 1" value={svcArea} list="area-sugg"
                        onChange={e => setSvcArea(e.target.value)} />
                      <datalist id="area-sugg">{AREA_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
                    </div>
                    <div>
                      <label className="label">Serviço *</label>
                      <input className="input" placeholder="Ex: Pintura látex" value={svcType} list="svc-sugg"
                        onChange={e => setSvcType(e.target.value)} />
                      <datalist id="svc-sugg">{SERVICE_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
                    </div>
                  </div>

                  {/* Unidade */}
                  <div>
                    <label className="label">Unidade de medida</label>
                    <div className="flex gap-2">
                      {UNITS_SERVICE.map(u => (
                        <button key={u} onClick={() => setSvcUnit(u)}
                          className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${svcUnit === u ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Medições */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label mb-0">Medições (Altura × Largura)</label>
                      <button onClick={() => setMeas(prev => [...prev, newMeas()])}
                        className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-800">
                        <Plus className="w-3 h-3" /> Sub-área
                      </button>
                    </div>

                    <div className="space-y-2">
                      {meas.map((m, idx) => {
                        const area = (parseFloat(m.height) || 0) * (parseFloat(m.width) || 0)
                        return (
                          <div key={m.id} className="flex items-center gap-2">
                            <input
                              className="input text-xs flex-1 min-w-0"
                              placeholder={`Sub-área ${idx + 1}`}
                              value={m.label}
                              onChange={e => setMeas(prev => prev.map(x => x.id === m.id ? { ...x, label: e.target.value } : x))}
                            />
                            <input
                              className="input text-sm w-20 text-center"
                              type="number" placeholder="Alt" inputMode="decimal"
                              value={m.height}
                              onChange={e => setMeas(prev => prev.map(x => x.id === m.id ? { ...x, height: e.target.value } : x))}
                            />
                            <span className="text-gray-400 text-sm shrink-0">×</span>
                            <input
                              className="input text-sm w-20 text-center"
                              type="number" placeholder="Larg" inputMode="decimal"
                              value={m.width}
                              onChange={e => setMeas(prev => prev.map(x => x.id === m.id ? { ...x, width: e.target.value } : x))}
                            />
                            <div className="w-16 text-right shrink-0">
                              <span className="text-xs font-semibold text-gray-700">{area > 0 ? area.toFixed(1) : '—'}</span>
                              <span className="text-[10px] text-gray-400"> {svcUnit}</span>
                            </div>
                            {meas.length > 1 && (
                              <button onClick={() => setMeas(prev => prev.filter(x => x.id !== m.id))}
                                className="p-1 hover:bg-red-50 rounded-lg shrink-0">
                                <X className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {totalM2 > 0 && (
                      <div className="mt-2 flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2">
                        <span className="text-xs text-blue-600 font-medium">Total medido</span>
                        <span className="font-bold text-blue-700">{totalM2.toFixed(2)} {svcUnit}</span>
                      </div>
                    )}
                  </div>

                  {/* Custo MO */}
                  <div>
                    <label className="label">Custo de mão de obra por {svcUnit}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
                      <input className="input pl-9" type="number" placeholder="0,00" min="0" step="0.01"
                        inputMode="decimal" value={svcMoCost} onChange={e => setSvcMoCost(e.target.value)} />
                    </div>
                  </div>

                  {/* Preview */}
                  {totalM2 > 0 && (parseFloat(svcMoCost) || 0) > 0 && (
                    <div className="bg-blue-50 rounded-xl p-3">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-gray-700">{totalM2.toFixed(2)} {svcUnit} × {formatCurrency(parseFloat(svcMoCost) || 0)}</span>
                        <span className="text-blue-700">{formatCurrency(svcSubtotal)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label">Observações <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input className="input" placeholder="Ex: 2 demãos..." value={svcNotes} onChange={e => setSvcNotes(e.target.value)} />
                  </div>
                </>
              )}

              {/* ── Formulário de Material / Equipamento ── */}
              {(modalType === 'material' || modalType === 'equipamento') && (
                <>
                  <div>
                    <label className="label">{modalType === 'material' ? 'Material' : 'Equipamento'} *</label>
                    <input className="input" placeholder={modalType === 'material' ? 'Ex: Tinta látex 18L' : 'Ex: Andaime'}
                      value={simName} list="sim-sugg"
                      onChange={e => setSimName(e.target.value)} />
                    <datalist id="sim-sugg">
                      {(modalType === 'material' ? MATERIAL_SUGGESTIONS : EQUIPMENT_SUGGESTIONS).map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Quantidade *</label>
                      <input className="input" type="number" placeholder="0" min="0" step="0.01" inputMode="decimal"
                        value={simQty} onChange={e => setSimQty(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Unidade</label>
                      <select className="input" value={simUnit} onChange={e => setSimUnit(e.target.value)}>
                        {(modalType === 'material' ? UNITS_MATERIAL : UNITS_EQUIP).map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">Preço unitário *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
                      <input className="input pl-9" type="number" placeholder="0,00" min="0" step="0.01" inputMode="decimal"
                        value={simPrice} onChange={e => setSimPrice(e.target.value)} />
                    </div>
                  </div>

                  {simSubtotal > 0 && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex justify-between items-center">
                      <span className="text-sm text-gray-600">Subtotal</span>
                      <span className="font-bold text-gray-900">{formatCurrency(simSubtotal)}</span>
                    </div>
                  )}

                  <div>
                    <label className="label">Observações <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input className="input" placeholder="Ex: Incluir frete..." value={simNotes} onChange={e => setSimNotes(e.target.value)} />
                  </div>
                </>
              )}
            </div>

            {/* Rodapé */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => setModalType(null)} className="btn-secondary flex-1 text-sm">Cancelar</button>
              <button
                onClick={handleSaveItem}
                disabled={itemSaving ||
                  (modalType === 'servico' && (!svcArea.trim() || !svcType.trim() || totalM2 === 0)) ||
                  (modalType !== 'servico' && (!simName.trim() || !simQty || !simPrice))
                }
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {itemSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {itemSaving ? 'Salvando...' : editingItem ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
