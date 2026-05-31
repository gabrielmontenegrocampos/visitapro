'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Copy, ExternalLink, Pencil, Trash2,
  AlertTriangle, Loader2, Camera, ChevronRight,
} from 'lucide-react'
import { createRegistro, deleteRegistro } from '@/app/(crm)/diario-obra/actions'
import { formatCurrency } from '@/lib/utils'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://visitapro.vercel.app'

const CLIMA_EMOJI: Record<string, string> = {
  ensolarado: '☀️', parcialmente_nublado: '⛅', nublado: '☁️', chuvoso: '🌧️', tempestade: '⛈️',
}
const CLIMA_LABEL: Record<string, string> = {
  ensolarado: 'Ensolarado', parcialmente_nublado: 'Parcialmente nublado',
  nublado: 'Nublado', chuvoso: 'Chuvoso', tempestade: 'Tempestade',
}
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
const ATIV_STATUS: Record<string, { label: string; emoji: string; color: string }> = {
  feito:        { label: 'Feito',        emoji: '✅', color: 'text-green-600' },
  em_andamento: { label: 'Em andamento', emoji: '🔄', color: 'text-yellow-600' },
  pendente:     { label: 'Pendente',     emoji: '⏳', color: 'text-gray-400' },
}

interface Atividade { area: string; descricao: string; status: string }
interface Registro {
  id: string; projeto_id: string; data: string; clima: string; status_obra: string;
  responsavel: string | null; equipe: Array<{ nome: string; horas: string }> | null;
  atividades: Atividade[] | null; fotos: any[] | null; notas_cliente: string | null;
  percentual_concluido: number | null;
}
interface Projeto {
  id: string; public_token: string; titulo_publico: string | null; ativo: boolean;
  proposals: {
    id: string; title: string; value: number; proposal_number: string | null;
    leads: { name: string; phone: string | null } | null
  } | null
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', weekday: 'long', year: 'numeric' })
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', weekday: 'short' })
}

export default function DiarioTimelineClient({
  projeto,
  registros: initialRegistros,
}: {
  projeto: Projeto
  registros: Registro[]
}) {
  const router = useRouter()
  const [registros, setRegistros] = useState(initialRegistros)
  const [copied, setCopied] = useState(false)
  const [creating, startCreate] = useTransition()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const clientName = projeto.proposals?.leads?.name ?? '—'
  const propTitle = projeto.titulo_publico || projeto.proposals?.title || '—'
  const valor = projeto.proposals?.value ?? 0
  const propNum = projeto.proposals?.proposal_number
  const publicLink = `${BASE_URL}/obra/${projeto.public_token}`

  function copyLink() {
    navigator.clipboard.writeText(publicLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCreate() {
    startCreate(() => createRegistro(projeto.id) as any)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await deleteRegistro(id, projeto.id)
    setRegistros(prev => prev.filter(r => r.id !== id))
    setConfirmDeleteId(null)
    setDeleting(false)
  }

  // Progresso: usa percentual_concluido manual (mais recente com valor > 0)
  // Fallback: contagem de atividades se nenhum percentual foi informado
  const percentuaisInformados = registros
    .map(r => r.percentual_concluido ?? 0)
    .filter(p => p > 0)
  const allAtiv = registros.flatMap(r => r.atividades ?? [])
  const donePct = percentuaisInformados.length > 0
    ? Math.max(...percentuaisInformados)
    : allAtiv.length
      ? Math.round(allAtiv.filter(a => a.status === 'feito').length / allAtiv.length * 100)
      : 0
  const usandoPercentualManual = percentuaisInformados.length > 0

  return (
    <>
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Link href="/diario-obra" className="p-2 hover:bg-gray-100 rounded-xl -ml-2 shrink-0 mt-0.5">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{clientName}</h1>
            <p className="text-sm text-gray-500 truncate">
              {propTitle}{propNum ? ` · Proposta #${propNum}` : ''} · {formatCurrency(valor)}
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary flex items-center gap-2 text-sm shrink-0"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">Novo Registro</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>

        {/* Link público */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl flex-wrap">
          <div className={`w-2 h-2 rounded-full shrink-0 ${projeto.ativo ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-xs text-gray-500 font-mono flex-1 truncate min-w-0">
            {publicLink}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={copyLink}
              className="px-2 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
            >
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
            <a
              href={`/obra/${projeto.public_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-blue-600 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Ver
            </a>
          </div>
        </div>

        {/* Progress */}
        {(donePct > 0 || allAtiv.length > 0) && (
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Avanço físico da obra</span>
              <div className="flex items-center gap-2">
                {usandoPercentualManual && (
                  <span className="text-[10px] text-blue-500 font-medium bg-blue-50 px-1.5 py-0.5 rounded">informado</span>
                )}
                <span className={`text-lg font-bold ${
                  donePct === 100 ? 'text-green-600' :
                  donePct >= 75  ? 'text-blue-600'  :
                  donePct >= 50  ? 'text-blue-500'  :
                  donePct >= 25  ? 'text-amber-500' : 'text-gray-700'
                }`}>{donePct}%</span>
              </div>
            </div>

            {/* Barra principal */}
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  donePct === 100 ? 'bg-green-500' :
                  donePct >= 75  ? 'bg-blue-500'  :
                  donePct >= 50  ? 'bg-blue-400'  :
                  donePct >= 25  ? 'bg-amber-400' : 'bg-amber-300'
                }`}
                style={{ width: `${donePct}%` }}
              />
            </div>

            {/* Marcações de referência */}
            <div className="flex justify-between text-[10px] text-gray-300">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>

            {/* Sub-info */}
            {allAtiv.length > 0 && (
              <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-0.5 border-t border-gray-50">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0"/>
                  {allAtiv.filter(a => a.status === 'feito').length} concluídas
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"/>
                  {allAtiv.filter(a => a.status === 'em_andamento').length} em andamento
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0"/>
                  {allAtiv.filter(a => a.status === 'pendente').length} pendentes
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      {registros.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <Camera className="w-7 h-7 text-amber-500" />
          </div>
          <p className="font-semibold text-gray-900">Nenhum registro ainda</p>
          <p className="text-sm text-gray-500 mt-1">Clique em "Novo Registro" para iniciar o diário do dia</p>
          <button onClick={handleCreate} disabled={creating} className="btn-primary mt-4 text-sm">
            {creating ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            Criar primeiro registro
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Linha vertical da timeline */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200 hidden sm:block" />

          <div className="space-y-4">
            {registros.map((reg, idx) => {
              const ativs = reg.atividades ?? []
              const fotos = reg.fotos ?? []
              const equipe = reg.equipe ?? []
              const isToday = new Date(reg.data + 'T12:00:00').toDateString() === new Date().toDateString()

              return (
                <div key={reg.id} className="sm:pl-14 relative">
                  {/* Dot */}
                  <div className={`hidden sm:flex absolute left-3 top-5 w-5 h-5 rounded-full border-2 items-center justify-center ${
                    isToday ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                  }`}>
                    {isToday && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <div className="card overflow-hidden hover:shadow-md transition-shadow">
                    {/* Header do card */}
                    <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {isToday && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                        <span className="font-semibold text-gray-900 text-sm">
                          {formatDateShort(reg.data)}
                        </span>
                        {reg.clima && <span className="text-sm">{CLIMA_EMOJI[reg.clima] ?? ''}</span>}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[reg.status_obra] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[reg.status_obra] ?? reg.status_obra}
                        </span>
                        {reg.responsavel && (
                          <span className="text-xs text-gray-400 hidden sm:inline">· {reg.responsavel}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Link href={`/diario-obra/${projeto.id}/${reg.id}`}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-300 hover:text-blue-600 transition-colors" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => setConfirmDeleteId(reg.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Atividades (max 3) */}
                    {ativs.length > 0 && (
                      <div className="px-4 pb-2 space-y-0.5">
                        {ativs.slice(0, 3).map((a, i) => {
                          const s = ATIV_STATUS[a.status] ?? ATIV_STATUS['pendente']
                          return (
                            <div key={i} className="flex items-start gap-1.5 text-xs">
                              <span className="shrink-0 leading-tight">{s.emoji}</span>
                              <span className="text-gray-600 leading-tight">
                                <span className="font-medium text-gray-700">{a.area}</span>
                                {a.descricao ? ` — ${a.descricao}` : ''}
                              </span>
                            </div>
                          )
                        })}
                        {ativs.length > 3 && (
                          <p className="text-xs text-gray-400 pl-5">+{ativs.length - 3} atividades</p>
                        )}
                      </div>
                    )}

                    {/* Fotos preview (max 4) */}
                    {fotos.length > 0 && (
                      <div className="px-4 pb-2 grid grid-cols-4 gap-1">
                        {fotos.slice(0, 4).map((f: any, i: number) => (
                          <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <img src={f.url} alt={f.legenda || `Foto ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer: metadados + link editar */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-50 bg-gray-50/50">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {fotos.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            {fotos.length}
                          </span>
                        )}
                        {equipe.length > 0 && (
                          <span className="truncate max-w-[120px]">
                            {equipe.map(m => m.nome).filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                      <Link href={`/diario-obra/${projeto.id}/${reg.id}`}
                        className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-800 shrink-0">
                        Editar <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setConfirmDeleteId(null)} />
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Excluir registro?</p>
                <p className="text-sm text-gray-500 mt-1">
                  Este registro e suas fotos serão removidos permanentemente.
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
      )}
    </>
  )
}
