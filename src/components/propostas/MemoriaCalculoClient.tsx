'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Pencil, X, Loader2, Save,
  Hammer, Package, Wrench, Percent, CheckCircle2, AlertTriangle,
  FileText, Copy, ExternalLink, Users, BookOpen, ClipboardList,
  CreditCard, Calendar,
} from 'lucide-react'
import { formatCurrency, PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_CONFIG } from '@/lib/utils'
import {
  createProposalItem, updateProposalItem, deleteProposalItem,
  createBdiItem, updateBdiItem, deleteBdiItem,
  updateProposalStatus, deleteProposal, generateProposal,
  saveProposalDetails,
  type Measurement, type ClientRef,
} from '@/app/(crm)/propostas/[id]/actions'
import SearchableSelect from '@/components/ui/SearchableSelect'
import InlineEditTitle from '@/components/propostas/InlineEditTitle'

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
  payment_terms: string | null
  client_notes: string | null
  expires_at: string | null
  client_refs: ClientRef[] | null
  laudo: string | null
  memorial_descritivo: string | null
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
const UNITS_SERVICE  = ['m²', 'm linear', 'm', 'un', 'dia', 'hora', 'andar', 'cômodo', 'vb', 'ml']
const UNITS_MATERIAL = ['un', 'lata', 'saco', 'kg', 'L', 'm²', 'm', 'rolo', 'caixa']
const UNITS_EQUIP    = ['dia', 'semana', 'mês', 'un', 'hora']

// ---------------------------------------------------------------------------

export default function MemoriaCalculoClient({
  proposal: initial,
  items: initialItems,
  bdiItems: initialBdi,
  settingsRefs = [],
}: {
  proposal: ProposalRow
  items: ItemRow[]
  bdiItems: BdiItemRow[]
  settingsRefs?: ClientRef[]
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
  const [itemError,  setItemError]    = useState<string | null>(null)
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
  const [bdiError,      setBdiError]      = useState<string | null>(null)
  const [lastSaved,     setLastSaved]     = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)

  // Modal gerar proposta comercial
  const [showGenModal,     setShowGenModal]     = useState(false)
  const [genPaymentTerms,  setGenPaymentTerms]  = useState('')
  const [genClientNotes,   setGenClientNotes]   = useState('')
  const [genExpiresAt,     setGenExpiresAt]     = useState('')
  const [genSaving,        setGenSaving]        = useState(false)
  const [genError,         setGenError]         = useState<string | null>(null)
  const [genResult,        setGenResult]        = useState<{ url: string; proposalNumber: string } | null>(null)
  const [copied,           setCopied]           = useState(false)

  // Dados comerciais da proposta (variáveis)
  const [detPayment,  setDetPayment]  = useState(initial.payment_terms ?? '')
  const [detNotes,    setDetNotes]    = useState(initial.client_notes ?? '')
  const [detExpires,  setDetExpires]  = useState(initial.expires_at?.split('T')[0] ?? '')
  // Se a proposta ainda não tem refs customizadas, herda todas as globais das configurações
  const [detRefs,     setDetRefs]     = useState<ClientRef[]>(initial.client_refs ?? settingsRefs)
  const [detLaudo,    setDetLaudo]    = useState(initial.laudo ?? '')
  const [detMemorial, setDetMemorial] = useState(initial.memorial_descritivo ?? '')
  const [detSaving,   setDetSaving]   = useState(false)
  const [detSaved,    setDetSaved]    = useState(false)
  const [detError,    setDetError]    = useState<string | null>(null)

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

  // -- Utilitário salvo ------------------------------------------------------
  function markSaved() {
    const now = new Date()
    setLastSaved(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`)
  }

  // -- Abrir modais ----------------------------------------------------------
  function openAddService() {
    setEditingItem(null); setSvcArea(''); setSvcType(''); setSvcUnit('m²')
    setSvcMoCost(''); setSvcNotes(''); setMeas([newMeas()]); setItemError(null); setModalType('servico')
  }
  function openAddSimple(type: 'material' | 'equipamento') {
    setEditingItem(null); setSimName(''); setSimQty('')
    setSimUnit(type === 'material' ? 'un' : 'dia')
    setSimPrice(''); setSimNotes(''); setItemError(null); setModalType(type)
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
    setItemError(null)
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
        const snap = items
        const opt: ItemRow = { ...editingItem, ...payload, unit_price: unitPrice, total_price: totalPrice }
        setItems(prev => prev.map(i => i.id === editingItem.id ? opt : i))
        setItemSaving(false)
        const res = await updateProposalItem(editingItem.id, proposal.id, payload)
        if (res.error) { setItems(snap); setItemError(`Erro: ${res.error}`) }
        else { setModalType(null); markSaved() }
      } else {
        const tempId = `t${Date.now()}`
        const opt: ItemRow = { id: tempId, proposal_id: proposal.id, ...payload, unit_price: unitPrice, total_price: totalPrice, service_type: svcType.trim(), created_at: '' }
        setItems(prev => [...prev, opt])
        setItemSaving(false)
        const res = await createProposalItem(proposal.id, payload)
        if (res.error) { setItems(prev => prev.filter(i => i.id !== tempId)); setItemError(`Erro: ${res.error}`) }
        else { if (res.data) setItems(prev => prev.map(i => i.id === tempId ? (res.data as ItemRow) : i)); setModalType(null); markSaved() }
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
        const snap = items
        const opt: ItemRow = { ...editingItem, ...payload, labor_cost: 0, service_type: null, measurements: [], unit_price: payload.unit_price, total_price: totalPrice }
        setItems(prev => prev.map(i => i.id === editingItem.id ? opt : i))
        setItemSaving(false)
        const res = await updateProposalItem(editingItem.id, proposal.id, payload)
        if (res.error) { setItems(snap); setItemError(`Erro: ${res.error}`) }
        else { setModalType(null); markSaved() }
      } else {
        const tempId = `t${Date.now()}`
        const opt: ItemRow = { id: tempId, proposal_id: proposal.id, ...payload, labor_cost: 0, service_type: null, measurements: [], unit_price: payload.unit_price, total_price: totalPrice, created_at: '' }
        setItems(prev => [...prev, opt])
        setItemSaving(false)
        const res = await createProposalItem(proposal.id, payload)
        if (res.error) { setItems(prev => prev.filter(i => i.id !== tempId)); setItemError(`Erro: ${res.error}`) }
        else { if (res.data) setItems(prev => prev.map(i => i.id === tempId ? (res.data as ItemRow) : i)); setModalType(null); markSaved() }
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
    setBdiError(null)
    const data = { label: bdiForm.label.trim(), percentage: parseFloat(bdiForm.percentage) || 0 }
    if (editingBdi) {
      const prev_snapshot = bdiItems
      setBdiItems(prev => prev.map(b => b.id === editingBdi.id ? { ...b, ...data } : b))
      setShowBdiAdd(false); setBdiSaving(false)
      const res = await updateBdiItem(editingBdi.id, proposal.id, data)
      if (res.error) {
        setBdiItems(prev_snapshot)  // rollback
        setBdiError(`Erro ao atualizar: ${res.error}`)
        setShowBdiAdd(true)
      } else {
        markSaved()
      }
    } else {
      const tempId = `t${Date.now()}`
      setBdiItems(prev => [...prev, { id: tempId, proposal_id: proposal.id, sort_order: 0, created_at: '', ...data }])
      setShowBdiAdd(false); setBdiSaving(false)
      const res = await createBdiItem(proposal.id, data)
      if (res.error) {
        setBdiItems(prev => prev.filter(b => b.id !== tempId))  // rollback
        setBdiError(`Erro ao salvar: ${res.error}`)
        setShowBdiAdd(true)
      } else {
        if (res.data) setBdiItems(prev => prev.map(b => b.id === tempId ? (res.data as BdiItemRow) : b))
        markSaved()
      }
    }
  }

  async function handleDeleteBdi(b: BdiItemRow) {
    setDeletingBdi(b.id)
    const prev_snapshot = bdiItems
    setBdiItems(prev => prev.filter(x => x.id !== b.id))
    const res = await deleteBdiItem(b.id, proposal.id)
    if (res.error) {
      setBdiItems(prev_snapshot)  // rollback
      setBdiError(`Erro ao remover: ${res.error}`)
    }
    setDeletingBdi(null)
  }

  async function handleStatusChange(status: string) {
    setStatusSaving(true); setProposal(p => ({ ...p, status }))
    await updateProposalStatus(proposal.id, status)
    setStatusSaving(false)
  }

  async function handleDeleteProposal() {
    setDeleting(true)
    const res = await deleteProposal(proposal.id)
    if (res.error) { setDeleting(false); setConfirmDelete(false); return }
    router.push('/propostas')
  }

  async function handleSaveDetails() {
    setDetSaving(true); setDetError(null); setDetSaved(false)
    const res = await saveProposalDetails(proposal.id, {
      payment_terms:      detPayment,
      client_notes:       detNotes,
      expires_at:         detExpires || null,
      client_refs:        detRefs,
      laudo:              detLaudo,
      memorial_descritivo: detMemorial,
    })
    setDetSaving(false)
    if (res.error) setDetError(res.error)
    else { setDetSaved(true); markSaved() }
  }

  function addRef() {
    setDetRefs(prev => [...prev, { id: `r${Date.now()}`, name: '', company: '', phone: '' }])
    setDetSaved(false)
  }
  function updateRef(id: string, field: keyof ClientRef, value: string) {
    setDetRefs(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    setDetSaved(false)
  }
  function removeRef(id: string) {
    setDetRefs(prev => prev.filter(r => r.id !== id))
    setDetSaved(false)
  }

  function openGenModal() {
    setGenError(null); setGenResult(null); setCopied(false)
    // Pré-preenche com dados já salvos
    setGenPaymentTerms(detPayment); setGenClientNotes(detNotes); setGenExpiresAt(detExpires)
    setShowGenModal(true)
  }

  async function handleGenerateProposal() {
    setGenSaving(true); setGenError(null)
    const res = await generateProposal(proposal.id, {
      payment_terms: genPaymentTerms,
      client_notes:  genClientNotes,
      expires_at:    genExpiresAt || null,
    })
    if (res.error) { setGenError(res.error); setGenSaving(false); return }
    setGenResult({ url: res.url!, proposalNumber: res.proposalNumber! })
    setProposal(p => ({ ...p, status: 'enviada' }))
    setGenSaving(false)
  }

  async function handleCopyUrl() {
    if (!genResult) return
    await navigator.clipboard.writeText(genResult.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            <InlineEditTitle
              proposalId={proposal.id}
              title={proposal.title}
              onSaved={t => setProposal(p => ({ ...p, title: t }))}
              className="font-bold text-gray-900 leading-tight max-w-full"
              inputClassName="w-48 sm:w-72"
            />
            <p className="text-xs text-gray-400 truncate">{proposal.leads?.name ?? '—'}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {lastSaved && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Salvo {lastSaved}
              </span>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
              title="Excluir proposta"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {statusSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            <div className="w-36">
              <SearchableSelect
                value={proposal.status}
                onChange={handleStatusChange}
                options={Object.entries(PROPOSAL_STATUS_LABELS).map(([k, v]) => ({
                  value: k,
                  label: v,
                  dot: PROPOSAL_STATUS_CONFIG[k]?.hex,
                }))}
              />
            </div>
          </div>
        </div>

        {/* ── Diário de Obra ── */}
        {proposal.status === 'aceita' && (
          <div className="card p-4 border border-amber-100 bg-amber-50/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Diário de Obra</p>
                <p className="text-xs text-gray-500">Acompanhe a execução diária desta obra</p>
              </div>
            </div>
            <a
              href="/diario-obra"
              className="shrink-0 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" /> Abrir
            </a>
          </div>
        )}

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

          {bdiError && (
            <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start justify-between gap-3">
              <p className="text-xs text-red-700 font-medium">{bdiError}</p>
              <button onClick={() => setBdiError(null)} className="shrink-0 text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

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

        {/* ── Dados Comerciais da Proposta ── */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-gray-800 text-sm">Dados Comerciais da Proposta</h3>
            <span className="ml-auto text-[10px] text-gray-400 font-medium">Aparecem nas páginas da proposta</span>
          </div>

          <div className="p-4 space-y-4">

            {/* Condições de Pagamento */}
            <div>
              <label className="label flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-gray-400" /> Forma de Pagamento</label>
              <textarea
                className="input resize-none text-sm"
                rows={3}
                placeholder={"Entrada: R$ X\n2 parcelas quinzenais: R$ X\nEntrega da obra: R$ X"}
                value={detPayment}
                onChange={e => { setDetPayment(e.target.value); setDetSaved(false) }}
              />
            </div>

            {/* Observações */}
            <div>
              <label className="label flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 text-gray-400" /> Observações ao Cliente</label>
              <textarea
                className="input resize-none text-sm"
                rows={3}
                placeholder={"Estão inclusos no valor:\n• ART de obra\n• Materiais necessários\n• Todos os impostos"}
                value={detNotes}
                onChange={e => { setDetNotes(e.target.value); setDetSaved(false) }}
              />
            </div>

            {/* Validade */}
            <div>
              <label className="label flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" /> Validade da Proposta</label>
              <input type="date" className="input text-sm" value={detExpires}
                onChange={e => { setDetExpires(e.target.value); setDetSaved(false) }} />
            </div>

            {/* Referências Comerciais — CRUD completo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label flex items-center gap-1.5 mb-0">
                  <Users className="w-3.5 h-3.5 text-gray-400" /> Referências Comerciais
                </label>
                <div className="flex items-center gap-2">
                  {settingsRefs.length > 0 && (
                    <button
                      onClick={() => { setDetRefs(settingsRefs); setDetSaved(false) }}
                      className="text-[11px] text-gray-400 hover:text-blue-600 font-medium transition-colors"
                      title="Restaurar lista original das Configurações"
                    >
                      Restaurar padrão
                    </button>
                  )}
                  <button
                    onClick={addRef}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
              </div>

              {detRefs.length > 0 ? (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_34px] bg-gray-800 text-white text-[10px] font-bold uppercase tracking-wider">
                    <div className="px-3 py-2 border-r border-gray-700">Nome</div>
                    <div className="px-3 py-2 border-r border-gray-700">Empresa</div>
                    <div className="px-3 py-2 border-r border-gray-700">Contato</div>
                    <div />
                  </div>
                  {detRefs.map((ref, idx) => (
                    <div
                      key={ref.id}
                      className={`grid grid-cols-[1fr_1fr_1fr_34px] items-stretch border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <input
                        className="px-3 py-2 text-xs text-gray-800 bg-transparent outline-none border-r border-gray-100 focus:bg-blue-50 focus:border-blue-200 transition-colors min-w-0"
                        placeholder="Nome"
                        value={ref.name}
                        onChange={e => updateRef(ref.id, 'name', e.target.value)}
                      />
                      <input
                        className="px-3 py-2 text-xs text-gray-600 bg-transparent outline-none border-r border-gray-100 focus:bg-blue-50 focus:border-blue-200 transition-colors min-w-0"
                        placeholder="Empresa"
                        value={ref.company}
                        onChange={e => updateRef(ref.id, 'company', e.target.value)}
                      />
                      <input
                        className="px-3 py-2 text-xs text-gray-600 bg-transparent outline-none border-r border-gray-100 focus:bg-blue-50 focus:border-blue-200 transition-colors min-w-0"
                        placeholder="(11) 99999-9999"
                        value={ref.phone}
                        onChange={e => updateRef(ref.id, 'phone', e.target.value)}
                      />
                      <button
                        onClick={() => removeRef(ref.id)}
                        className="flex items-center justify-center hover:bg-red-50 transition-colors"
                        title="Remover"
                      >
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 py-4 px-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">Nenhuma referência nesta proposta.</p>
                  {settingsRefs.length > 0 && (
                    <button
                      onClick={() => { setDetRefs(settingsRefs); setDetSaved(false) }}
                      className="text-xs text-blue-500 hover:text-blue-700 font-medium shrink-0"
                    >
                      Carregar do cadastro
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Laudo */}
            <div>
              <label className="label flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-gray-400" /> Laudo Técnico <span className="text-gray-400 font-normal">(opcional)</span></label>
              <textarea
                className="input resize-none text-sm"
                rows={4}
                placeholder="Descreva o laudo técnico da obra, condições encontradas, diagnóstico..."
                value={detLaudo}
                onChange={e => { setDetLaudo(e.target.value); setDetSaved(false) }}
              />
            </div>

            {/* Memorial Descritivo */}
            <div>
              <label className="label flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 text-gray-400" /> Memorial Descritivo de Materiais <span className="text-gray-400 font-normal">(opcional)</span></label>
              <textarea
                className="input resize-none text-sm"
                rows={4}
                placeholder={"Tinta: Coral Sol e Chuva 18L\nTextura: Textura Acrílica 25kg\nPrimer: Selador Acrílico 18L\n..."}
                value={detMemorial}
                onChange={e => { setDetMemorial(e.target.value); setDetSaved(false) }}
              />
            </div>

            {detError && <p className="text-xs text-red-500">{detError}</p>}

            <button
              onClick={handleSaveDetails}
              disabled={detSaving}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${detSaved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}
            >
              {detSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : detSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {detSaving ? 'Salvando...' : detSaved ? 'Dados salvos!' : 'Salvar Dados Comerciais'}
            </button>
          </div>
        </div>

        {/* ── Botões finais ── */}
        <div className="space-y-3 pt-2 pb-4">
          {/* Gerar Proposta Comercial */}
          <button
            onClick={openGenModal}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-sm transition-all text-sm"
          >
            <FileText className="w-4 h-4" />
            Gerar Proposta Comercial
          </button>

          <div className="flex items-center justify-between gap-3">
            {lastSaved ? (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Salvo às {lastSaved}
              </span>
            ) : (
              <span className="text-xs text-gray-400">Itens salvos automaticamente</span>
            )}
            <button
              onClick={() => router.push('/propostas')}
              className="btn-secondary px-5 py-2 text-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Concluir
            </button>
          </div>
        </div>
      </div>

      {/* ══ Modal confirmar exclusão ══ */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Excluir proposta?</p>
                <p className="text-sm text-gray-500 mt-1">
                  "<span className="font-medium">{proposal.title}</span>" e todos os seus itens serão removidos permanentemente.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteProposal}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Gerar Proposta Comercial ══ */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !genSaving && !genResult && setShowGenModal(false)} />
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 max-h-[94vh] flex flex-col">

            <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="font-bold text-gray-900">Gerar Proposta Comercial</h2>
              </div>
              {!genResult && (
                <button onClick={() => setShowGenModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

              {/* Resultado após geração */}
              {genResult ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center text-center gap-2 py-3">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-1">
                      <CheckCircle2 className="w-7 h-7 text-green-600" />
                    </div>
                    <p className="font-bold text-gray-900 text-lg">Proposta gerada!</p>
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold text-blue-600">{genResult.proposalNumber}</span> · Status: <span className="text-cyan-600 font-medium">Enviada</span>
                    </p>
                  </div>

                  {/* Link copyable */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
                    <p className="flex-1 text-xs text-gray-600 font-mono truncate">{genResult.url}</p>
                    <button
                      onClick={handleCopyUrl}
                      className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>

                  {/* Ações */}
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Olá! Segue a proposta ${genResult.proposalNumber}: ${genResult.url}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl text-sm transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      WhatsApp
                    </a>
                    <a
                      href={genResult.url}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-sm transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Ver proposta
                    </a>
                  </div>

                  <button
                    onClick={() => setShowGenModal(false)}
                    className="w-full btn-secondary text-sm py-2.5"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-blue-700 font-medium">{proposal.title}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{proposal.leads?.name ?? '—'} · Total: <span className="font-bold">{formatCurrency(totalFinal)}</span></p>
                  </div>

                  <div>
                    <label className="label">Condições de pagamento</label>
                    <textarea
                      className="input resize-none text-sm"
                      rows={3}
                      placeholder="Ex: 50% na assinatura do contrato, 50% na conclusão dos serviços"
                      value={genPaymentTerms}
                      onChange={e => setGenPaymentTerms(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label">Observações para o cliente <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <textarea
                      className="input resize-none text-sm"
                      rows={3}
                      placeholder="Ex: Proposta válida para as condições do imóvel na data da visita técnica"
                      value={genClientNotes}
                      onChange={e => setGenClientNotes(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label">Validade da proposta <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input
                      type="date"
                      className="input text-sm"
                      value={genExpiresAt}
                      onChange={e => setGenExpiresAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </div>

                  {genError && (
                    <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-2">
                      <p className="text-xs text-red-700 font-medium">{genError}</p>
                      <button onClick={() => setGenError(null)}><X className="w-3.5 h-3.5 text-red-400 shrink-0" /></button>
                    </div>
                  )}
                </>
              )}
            </div>

            {!genResult && (
              <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
                <button onClick={() => setShowGenModal(false)} className="btn-secondary flex-1 text-sm" disabled={genSaving}>Cancelar</button>
                <button
                  onClick={handleGenerateProposal}
                  disabled={genSaving}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  {genSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><FileText className="w-4 h-4" /> Gerar proposta</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
                    <select
                      value={svcUnit}
                      onChange={e => setSvcUnit(e.target.value)}
                      className="input bg-white"
                    >
                      {UNITS_SERVICE.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
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

            {/* Erro */}
            {itemError && (
              <div className="mx-5 mb-1 px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-2 shrink-0">
                <p className="text-xs text-red-700 font-medium">{itemError}</p>
                <button onClick={() => setItemError(null)}><X className="w-3.5 h-3.5 text-red-400 shrink-0" /></button>
              </div>
            )}

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
