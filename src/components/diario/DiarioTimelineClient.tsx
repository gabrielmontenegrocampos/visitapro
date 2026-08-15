'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Copy, Pencil, Trash2,
  AlertTriangle, Loader2, Camera, ChevronRight, FileText,
  MapPin, Navigation, Calendar, DollarSign, HardHat, Settings,
} from 'lucide-react'
import { createRegistro, deleteRegistro } from '@/app/(crm)/diario-obra/actions'
import { formatCurrency } from '@/lib/utils'
import AtividadesProjeto, { type AtividadeObra } from '@/components/diario/AtividadesProjeto'
import DocumentosDiario, { type DocumentoDiario } from '@/components/diario/DocumentosDiario'
import EditarObraModal from '@/components/diario/EditarObraModal'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://visitapro.vercel.app'

const CLIMA_EMOJI: Record<string, string> = {
  ensolarado: '☀️', parcialmente_nublado: '⛅', nublado: '☁️', chuvoso: '🌧️', tempestade: '⛈️',
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
const ATIV_STATUS: Record<string, { label: string; emoji: string }> = {
  feito:        { label: 'Feito',        emoji: '✅' },
  em_andamento: { label: 'Em andamento', emoji: '🔄' },
  pendente:     { label: 'Pendente',     emoji: '⏳' },
}

interface Atividade { area: string; descricao: string; status: string }
interface Registro {
  id: string; projeto_id: string; data: string; clima: string; status_obra: string;
  responsavel: string | null; temperatura: number | null; turno: string | null;
  equipe: Array<{ nome: string; horas: string }> | null;
  atividades: Atividade[] | null;
  fotos: any[] | null;
  notas_cliente: string | null;
  percentual_concluido: number | null;
}
interface Projeto {
  id: string; public_token: string; titulo_publico: string | null; ativo: boolean;
  foto_capa: string | null;
  tipo_obra: string | null;
  status_projeto: string | null;
  cep: string | null;
  logradouro: string | null; numero: string | null; complemento: string | null;
  bairro: string | null; cidade: string | null; estado: string | null;
  data_inicio: string | null; data_previsao_fim: string | null;
  responsavel_tecnico: string | null; art_rrt: string | null;
  proposals: {
    id: string; title: string; value: number; proposal_number: string | null;
    leads: { name: string; company: string | null; phone: string | null } | null
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
function formatDateBR(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function getEndereco(p: Projeto) {
  return [p.logradouro, p.numero, p.bairro, p.cidade, p.estado].filter(Boolean).join(', ')
}

export default function DiarioTimelineClient({
  projeto, registros: initialRegistros, atividades, documentos,
}: {
  projeto: Projeto
  registros: Registro[]
  atividades: AtividadeObra[]
  documentos: DocumentoDiario[]
}) {
  const router = useRouter()
  const [registros, setRegistros] = useState(initialRegistros)
  const [projetoState, setProjetoState] = useState(projeto)
  const [showEdit, setShowEdit] = useState(false)
  const [copied, setCopied] = useState(false)
  const [creating, startCreate] = useTransition()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickedDate, setPickedDate] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const [duplicateId, setDuplicateId] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0] })()

  const clientName =
    projetoState.proposals?.leads?.company ??
    projetoState.proposals?.leads?.name ??
    projetoState.titulo_publico ??
    projetoState.responsavel_tecnico ??
    '—'
  const propTitle = projetoState.titulo_publico || projetoState.proposals?.title || '—'
  const valor = projetoState.proposals?.value ?? 0
  const publicLink = `${BASE_URL}/obra/${projetoState.public_token}`
  const endereco = getEndereco(projetoState)
  const mapsUrl = endereco
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`
    : null

  function copyLink() {
    navigator.clipboard.writeText(publicLink)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function openDatePicker() {
    setShowDatePicker(true)
    setPickedDate('')
    setShowCustom(false)
    setCustomDate('')
    setDuplicateId(null)
  }

  function checkAndCreate(date: string) {
    setPickedDate(date)
    setDuplicateId(null)
    const existing = registros.find(r => r.data === date)
    if (existing) {
      setDuplicateId(existing.id)
    } else {
      doCreate(date)
    }
  }

  function doCreate(date: string) {
    setShowDatePicker(false)
    setDuplicateId(null)
    startCreate(() => createRegistro(projeto.id, date) as any)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await deleteRegistro(id, projeto.id)
    setRegistros(prev => prev.filter(r => r.id !== id))
    setConfirmDeleteId(null); setDeleting(false)
  }

  return (
    <>
      <div className="space-y-4">

      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Link href="/diario-obra" className="p-2 hover:bg-gray-100 rounded-xl -ml-2 shrink-0">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{clientName}</h1>
          {projetoState.tipo_obra && <p className="text-xs text-gray-400">{projetoState.tipo_obra}</p>}
        </div>
        <button onClick={() => setShowEdit(true)}
          className="p-2 hover:bg-gray-100 rounded-xl shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* ── Foto + informações lado a lado ───────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Foto */}
          <div className="sm:w-2/5 shrink-0">
            {projetoState.foto_capa ? (
              <img src={projetoState.foto_capa} alt={clientName}
                className="w-full h-44 sm:h-full object-cover" style={{ minHeight: '160px' }} />
            ) : (
              <div className="w-full h-44 sm:h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center" style={{ minHeight: '160px' }}>
                <HardHat className="w-12 h-12 text-white/20" />
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="flex-1 p-4 space-y-3">
            {/* Endereço */}
            {endereco && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700 flex-1 leading-snug">{endereco}</p>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                    <Navigation className="w-3 h-3" /> Rota
                  </a>
                )}
              </div>
            )}

            {/* Período + Contrato */}
            {(projetoState.data_inicio || projetoState.data_previsao_fim || valor > 0) && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                {(projetoState.data_inicio || projetoState.data_previsao_fim) && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Período
                    </p>
                    <p className="text-sm font-medium text-gray-800">
                      {projetoState.data_inicio ? formatDateBR(projetoState.data_inicio) : '—'}
                      {projetoState.data_previsao_fim && <span className="text-gray-400"> → {formatDateBR(projetoState.data_previsao_fim)}</span>}
                    </p>
                  </div>
                )}
                {valor > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Contrato
                    </p>
                    <p className="text-sm font-medium text-gray-800">{formatCurrency(valor)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Proposta */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">Proposta</p>
              <p className="text-sm text-gray-700 mt-0.5">{propTitle}</p>
            </div>

            {/* Responsável técnico */}
            {projetoState.responsavel_tecnico && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">Responsável técnico</p>
                <p className="text-sm text-gray-700 mt-0.5">{projetoState.responsavel_tecnico}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Botões de ação ────────────────────────────────────────────── */}
      <div className="flex gap-2 relative">
        <button onClick={openDatePicker} disabled={creating}
          className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span className="font-semibold">Novo Registro</span>
        </button>
        <button onClick={copyLink}
          className="btn-secondary flex items-center gap-1.5 px-4 py-3 text-sm font-medium">
          <Copy className="w-4 h-4" />
          <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Link'}</span>
        </button>
        <Link href={`/diario-obra/${projeto.id}/relatorio`}
          className="btn-secondary flex items-center gap-1.5 px-4 py-3 text-sm font-medium">
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">PDF</span>
        </Link>

        {/* Date picker popover */}
        {showDatePicker && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowDatePicker(false)} />
            <div className="absolute left-0 top-full mt-2 z-40 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-72">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Para qual data?</p>

              <div className="flex gap-2 mb-3">
                {[
                  { label: 'Hoje',  date: todayStr },
                  { label: 'Ontem', date: yesterdayStr },
                ].map(({ label, date }) => (
                  <button
                    key={date}
                    onClick={() => { setShowCustom(false); checkAndCreate(date) }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      pickedDate === date && !duplicateId
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => { setShowCustom(c => !c); setPickedDate(''); setDuplicateId(null) }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    showCustom ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Outra
                </button>
              </div>

              {showCustom && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="date"
                    max={todayStr}
                    value={customDate}
                    onChange={e => { setCustomDate(e.target.value); setPickedDate(''); setDuplicateId(null) }}
                    className="input flex-1 text-sm"
                  />
                  <button
                    onClick={() => customDate && checkAndCreate(customDate)}
                    disabled={!customDate}
                    className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
                  >
                    OK
                  </button>
                </div>
              )}

              {duplicateId && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2.5">
                  <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Já existe um registro para {formatDateShort(pickedDate)}
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/diario-obra/${projeto.id}/${duplicateId}`}
                      className="flex-1 text-center py-1.5 text-xs font-medium bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      Ver existente
                    </Link>
                    <button
                      onClick={() => doCreate(pickedDate)}
                      className="flex-1 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Criar mesmo assim
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Checklist e Documentos ────────────────────────────────────── */}
      <AtividadesProjeto projetoId={projeto.id} initial={atividades} canEdit={true} />
      <DocumentosDiario projetoId={projeto.id} initial={documentos} canEdit={true} />

      {/* ── Timeline ──────────────────────────────────────────────────── */}
      {registros.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <Camera className="w-7 h-7 text-amber-500" />
          </div>
          <p className="font-semibold text-gray-900">Nenhum registro ainda</p>
          <p className="text-sm text-gray-500 mt-1">Clique em "Novo Registro" para iniciar o diário do dia</p>
          <button onClick={openDatePicker} disabled={creating} className="btn-primary mt-4 text-sm">
            {creating ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            Criar primeiro registro
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200 hidden sm:block" />

          <div className="space-y-3">
            {registros.map(reg => {
              const ativs = reg.atividades ?? []
              const fotos = reg.fotos ?? []
              const equipe = reg.equipe ?? []
              const isToday = new Date(reg.data + 'T12:00:00').toDateString() === new Date().toDateString()

              return (
                <div key={reg.id} className="sm:pl-14 relative">
                  {/* Dot da timeline */}
                  <div className={`hidden sm:flex absolute left-3 top-5 w-5 h-5 rounded-full border-2 items-center justify-center ${
                    isToday ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                  }`}>
                    {isToday && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <div className="card overflow-hidden hover:shadow-md transition-shadow">
                    {/* Cabeçalho do card */}
                    <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {isToday && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                        <span className="font-semibold text-gray-900 text-sm">
                          {formatDateShort(reg.data)}
                        </span>
                        {reg.clima && (
                          <span className="text-base">{CLIMA_EMOJI[reg.clima] ?? ''}</span>
                        )}
                        {reg.temperatura && (
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {reg.temperatura}°C
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[reg.status_obra] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[reg.status_obra] ?? reg.status_obra}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Link href={`/diario-obra/${projeto.id}/${reg.id}`}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-300 hover:text-blue-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => setConfirmDeleteId(reg.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Nota para o cliente */}
                    {reg.notas_cliente && (
                      <div className="px-4 pb-2">
                        <p className="text-xs text-gray-600 line-clamp-2">{reg.notas_cliente}</p>
                      </div>
                    )}

                    {/* Atividades (max 3) */}
                    {ativs.length > 0 && (
                      <div className="px-4 pb-2 space-y-0.5">
                        {ativs.slice(0, 3).map((a, i) => {
                          const s = ATIV_STATUS[a.status] ?? ATIV_STATUS['pendente']
                          return (
                            <div key={i} className="flex items-start gap-1.5 text-xs">
                              <span className="shrink-0">{s.emoji}</span>
                              <span className="text-gray-600">
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

                    {/* Fotos preview */}
                    {fotos.length > 0 && (
                      <div className="px-4 pb-2 grid grid-cols-4 gap-1">
                        {fotos.slice(0, 4).map((f: any, i: number) => (
                          <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <img src={f.url} alt={f.legenda || `Foto ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-50 bg-gray-50/50">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {fotos.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3" /> {fotos.length}
                          </span>
                        )}
                        {equipe.length > 0 && (
                          <span className="truncate max-w-[120px]">
                            {equipe.map(m => m.nome).filter(Boolean).join(', ')}
                          </span>
                        )}
                        {reg.responsavel && (
                          <span className="hidden sm:inline truncate max-w-[100px]">{reg.responsavel}</span>
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

      </div>{/* end space-y-4 */}

      {/* Modal editar obra */}
      {showEdit && (
        <EditarObraModal
          projeto={projetoState}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false)
            router.refresh()
          }}
        />
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
                <p className="text-sm text-gray-500 mt-1">Este registro e suas fotos serão removidos permanentemente.</p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setConfirmDeleteId(null)} disabled={deleting} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={() => handleDelete(confirmDeleteId)} disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2">
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
