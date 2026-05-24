'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, Plus, Copy, Eye, EyeOff, ChevronRight,
  ExternalLink, Search, X, Loader2, Building2, Calendar, Trash2, AlertTriangle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { createProjeto, updateProjeto, deleteProjeto } from '@/app/(crm)/diario-obra/actions'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://visitapro.vercel.app'

const STATUS_LABELS: Record<string, string> = {
  iniciando: 'Iniciando', em_andamento: 'Em andamento',
  concluindo: 'Concluindo', paralisada: 'Paralisada',
}
const STATUS_COLORS: Record<string, string> = {
  iniciando: 'bg-blue-100 text-blue-700',
  em_andamento: 'bg-yellow-100 text-yellow-700',
  concluindo: 'bg-green-100 text-green-700',
  paralisada: 'bg-red-100 text-red-700',
}
const CLIMA_EMOJI: Record<string, string> = {
  ensolarado: '☀️', parcialmente_nublado: '⛅', nublado: '☁️', chuvoso: '🌧️', tempestade: '⛈️',
}

interface ProposalOption {
  id: string; title: string; value: number;
  leads: { name: string; phone: string | null } | null
}
interface Registro {
  id: string; projeto_id: string; data: string; status_obra: string;
  atividades: Array<{ status: string }> | null
}
interface Projeto {
  id: string; proposal_id: string; public_token: string; titulo_publico: string | null;
  ativo: boolean; created_at: string;
  proposals: { id: string; title: string; value: number; leads: { name: string; phone: string | null } | null } | null
}

function calcProgress(registros: Registro[], projetoId: string) {
  const regs = registros.filter(r => r.projeto_id === projetoId)
  const all = regs.flatMap(r => r.atividades ?? [])
  if (!all.length) return 0
  const done = all.filter(a => a.status === 'feito').length
  return Math.round((done / all.length) * 100)
}

function getLastStatus(registros: Registro[], projetoId: string) {
  return registros.find(r => r.projeto_id === projetoId)?.status_obra ?? 'em_andamento'
}

function getLastDate(registros: Registro[], projetoId: string) {
  const r = registros.find(x => x.projeto_id === projetoId)
  if (!r) return null
  const d = new Date(r.data + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function getCount(registros: Registro[], projetoId: string) {
  return registros.filter(r => r.projeto_id === projetoId).length
}

export default function DiarioListClient({
  projetos: initialProjetos,
  proposals,
  registros,
}: {
  projetos: Projeto[]
  proposals: ProposalOption[]
  registros: Registro[]
}) {
  const router = useRouter()
  const [projetos, setProjetos] = useState(initialProjetos)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formProposal, setFormProposal] = useState('')
  const [formTitulo, setFormTitulo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = projetos.filter(p => {
    const q = search.toLowerCase()
    return !q ||
      (p.proposals?.leads?.name ?? '').toLowerCase().includes(q) ||
      (p.proposals?.title ?? '').toLowerCase().includes(q) ||
      (p.titulo_publico ?? '').toLowerCase().includes(q)
  })

  async function handleCreate() {
    if (!formProposal) return
    setSaving(true); setSaveErr('')
    const sel = proposals.find(p => p.id === formProposal)
    const titulo = formTitulo.trim() || sel?.title || ''
    const res = await createProjeto(formProposal, titulo)
    if (res.error) { setSaveErr(res.error); setSaving(false); return }
    setShowModal(false)
    setFormProposal(''); setFormTitulo('')
    router.refresh()
    setSaving(false)
  }

  async function toggleAtivo(projeto: Projeto) {
    setToggling(projeto.id)
    await updateProjeto(projeto.id, { ativo: !projeto.ativo })
    setProjetos(prev => prev.map(p => p.id === projeto.id ? { ...p, ativo: !p.ativo } : p))
    setToggling(null)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await deleteProjeto(id)
    setProjetos(prev => prev.filter(p => p.id !== id))
    setConfirmDeleteId(null)
    setDeleting(false)
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${BASE_URL}/obra/${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diário de Obra</h1>
          <p className="text-gray-500 text-sm mt-1">Acompanhamento diário das obras em execução</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Iniciar Diário</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Busca */}
      {projetos.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Buscar cliente ou obra..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Cards */}
      <div className="space-y-4">
        {filtered.map(projeto => {
          const progress = calcProgress(registros, projeto.id)
          const lastStatus = getLastStatus(registros, projeto.id)
          const lastDate = getLastDate(registros, projeto.id)
          const count = getCount(registros, projeto.id)
          const clientName = projeto.proposals?.leads?.name ?? '—'
          const propTitle = projeto.titulo_publico || projeto.proposals?.title || '—'
          const valor = projeto.proposals?.value ?? 0

          return (
            <div key={projeto.id} className="card p-5 space-y-4">
              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-lg">{clientName}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lastStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[lastStatus] ?? lastStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{propTitle} · {formatCurrency(valor)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setConfirmDeleteId(projeto.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                    title="Excluir diário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {count} {count === 1 ? 'registro' : 'registros'}
                </span>
                {lastDate && (
                  <span>Última entrada: {lastDate}</span>
                )}
              </div>

              {/* Progress bar */}
              {count > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Progresso das atividades</span>
                    <span className="font-semibold text-gray-700">{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Link do cliente */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl flex-wrap">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${projeto.ativo ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-500 truncate font-mono">
                    {BASE_URL}/obra/{projeto.public_token.slice(0, 12)}...
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyLink(projeto.public_token)}
                    className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                    title="Copiar link"
                  >
                    {copied === projeto.public_token
                      ? <span className="text-green-600 text-xs font-medium">Copiado!</span>
                      : <Copy className="w-3.5 h-3.5" />
                    }
                  </button>
                  <a
                    href={`/obra/${projeto.public_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                    title="Ver como cliente"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => toggleAtivo(projeto)}
                    disabled={toggling === projeto.id}
                    className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                    title={projeto.ativo ? 'Desativar link' : 'Ativar link'}
                  >
                    {toggling === projeto.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : projeto.ativo
                        ? <Eye className="w-3.5 h-3.5 text-green-600" />
                        : <EyeOff className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>

              {/* Abrir diário */}
              <div className="pt-1 border-t border-gray-100">
                <Link
                  href={`/diario-obra/${projeto.id}`}
                  className="flex items-center justify-between w-full text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <span>Abrir diário</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-amber-500" />
            </div>
            <p className="font-semibold text-gray-900 text-lg">
              {search ? 'Nenhuma obra encontrada' : 'Nenhum diário iniciado'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {search
                ? 'Tente outro termo de busca'
                : 'Inicie um diário para acompanhar a execução de uma obra'}
            </p>
            {!search && proposals.length > 0 && (
              <button onClick={() => setShowModal(true)} className="btn-primary mt-4 text-sm">
                Iniciar Diário de Obra
              </button>
            )}
            {!search && proposals.length === 0 && (
              <p className="text-xs text-gray-400 mt-3">
                Nenhuma proposta aceita disponível. Aceite uma proposta para iniciar o diário.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal — novo projeto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl z-10">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Iniciar Diário de Obra</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">Selecione a proposta aceita para iniciar o acompanhamento.</p>
              <div>
                <label className="label">Proposta *</label>
                <SearchableSelect
                  value={formProposal}
                  onChange={setFormProposal}
                  placeholder="Selecione a proposta..."
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...proposals.map(p => ({
                      value: p.id,
                      label: `${p.leads?.name ?? '—'} — ${p.title}`,
                    })),
                  ]}
                />
                {proposals.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Todas as propostas aceitas já possuem diário.
                  </p>
                )}
              </div>
              <div>
                <label className="label">Título público (visível ao cliente)</label>
                <input
                  className="input"
                  placeholder="Ex: Pintura Fachada Casa João"
                  value={formTitulo}
                  onChange={e => setFormTitulo(e.target.value)}
                />
              </div>
              {saveErr && <p className="text-sm text-red-600">{saveErr}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formProposal}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Criando...' : 'Iniciar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmDeleteId && (() => {
        const p = projetos.find(x => x.id === confirmDeleteId)
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setConfirmDeleteId(null)} />
            <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">Excluir diário?</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Todos os registros e fotos de <span className="font-medium">{p?.proposals?.leads?.name}</span> serão removidos permanentemente.
                  </p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button onClick={() => setConfirmDeleteId(null)} disabled={deleting} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(confirmDeleteId)}
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
        )
      })()}
    </>
  )
}
