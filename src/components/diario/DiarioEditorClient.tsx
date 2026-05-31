'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Save, Trash2, AlertTriangle, Loader2, Plus, X,
  Camera, Lock, MessageSquare, ClipboardList, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  updateRegistro, deleteRegistro, prepareUpload, registrarFotoUrl, removeFoto, updateFotoLegenda,
} from '@/app/(crm)/diario-obra/actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Foto { url: string; legenda: string; ordem: number }
interface MembroEquipe { id: string; nome: string; funcao: string; horas: string }
interface Atividade { id: string; area: string; descricao: string; status: 'feito' | 'em_andamento' | 'pendente' }
interface Material { id: string; nome: string; quantidade: string; unidade: string }

interface Registro {
  id: string; projeto_id: string; data: string; clima: string; status_obra: string;
  responsavel: string | null;
  equipe: MembroEquipe[] | null;
  atividades: Atividade[] | null;
  materiais: Material[] | null;
  ocorrencias: string | null;
  notas_cliente: string | null;
  proximas_atividades: string | null;
  fotos: Foto[] | null;
  percentual_concluido: number | null;
}
interface Projeto {
  id: string;
  proposals: { title: string; leads: { name: string } | null } | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CLIMA_OPTIONS = [
  { value: 'ensolarado',          label: 'Ensolarado',           emoji: '☀️' },
  { value: 'parcialmente_nublado',label: 'Parcialmente nublado', emoji: '⛅' },
  { value: 'nublado',             label: 'Nublado',              emoji: '☁️' },
  { value: 'chuvoso',             label: 'Chuvoso',              emoji: '🌧️' },
  { value: 'tempestade',          label: 'Tempestade',           emoji: '⛈️' },
]
const STATUS_OPTIONS = [
  { value: 'iniciando',    label: 'Iniciando',    color: 'bg-blue-100 text-blue-700 ring-blue-300' },
  { value: 'em_andamento', label: 'Em andamento', color: 'bg-yellow-100 text-yellow-700 ring-yellow-300' },
  { value: 'concluindo',   label: 'Concluindo',   color: 'bg-green-100 text-green-700 ring-green-300' },
  { value: 'paralisada',   label: 'Paralisada',   color: 'bg-red-100 text-red-700 ring-red-300' },
]
const ATIVIDADE_STATUS = [
  { value: 'feito',        label: 'Feito',        emoji: '✅', color: 'bg-green-100 text-green-700' },
  { value: 'em_andamento', label: 'Em andamento', emoji: '🔄', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'pendente',     label: 'Pendente',     emoji: '⏳', color: 'bg-gray-100 text-gray-600' },
]
const AREA_SUGESTOES = [
  'Fachada frontal', 'Fachada lateral esq.', 'Fachada lateral dir.',
  'Fachada fundos', 'Muro frontal', 'Muro lateral', 'Teto', 'Área interna',
  'Grade', 'Portão', 'Garagem',
]
const UNIDADES = ['litros', 'kg', 'm²', 'unidades', 'sacas', 'metros', 'latas']

function newId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Section — definido FORA do componente principal para evitar remount
// a cada re-render (causaria perda de foco nos inputs)
// ---------------------------------------------------------------------------
function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DiarioEditorClient({
  projeto,
  registro: initial,
}: {
  projeto: Projeto
  registro: Registro
}) {
  // Basic fields
  const [data, setData]           = useState(initial.data)
  const [responsavel, setResponsavel] = useState(initial.responsavel ?? '')
  const [clima, setClima]         = useState(initial.clima)
  const [statusObra, setStatusObra] = useState(initial.status_obra)
  const [percentual, setPercentual] = useState(initial.percentual_concluido ?? 0)
  // Lists
  const [equipe, setEquipe]       = useState<MembroEquipe[]>(initial.equipe ?? [])
  const [atividades, setAtividades] = useState<Atividade[]>(initial.atividades ?? [])
  const [materiais, setMateriais] = useState<Material[]>(initial.materiais ?? [])
  // Texts
  const [ocorrencias, setOcorrencias]             = useState(initial.ocorrencias ?? '')
  const [notasCliente, setNotasCliente]           = useState(initial.notas_cliente ?? '')
  const [proximasAtividades, setProximasAtividades] = useState(initial.proximas_atividades ?? '')
  // Photos
  const [fotos, setFotos]         = useState<Foto[]>(initial.fotos ?? [])
  // { name, progress 0-100 } por arquivo em upload
  const [uploadQueue, setUploadQueue] = useState<{ name: string; progress: number }[]>([])
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const uploadingFotos = uploadQueue.length > 0
  const uploadProgress = uploadQueue.length > 0
    ? Math.round(uploadQueue.reduce((s, f) => s + f.progress, 0) / uploadQueue.length)
    : 0

  function setFileProgress(name: string, progress: number) {
    setUploadQueue(prev => prev.map(f => f.name === name ? { ...f, progress } : f))
  }
  // UI
  const [saved, setSaved]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---------------------------------------------------------------------------
  // Auto-save helpers
  // ---------------------------------------------------------------------------
  const flashSaved = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  const debounceSave = useCallback((fields: Record<string, unknown>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      await updateRegistro(initial.id, projeto.id, fields)
      setSaving(false)
      flashSaved()
    }, 800)
  }, [initial.id, projeto.id, flashSaved])

  // Immediate save (for pills, lists)
  const saveNow = useCallback(async (fields: Record<string, unknown>) => {
    setSaving(true)
    await updateRegistro(initial.id, projeto.id, fields)
    setSaving(false)
    flashSaved()
  }, [initial.id, projeto.id, flashSaved])

  // ---------------------------------------------------------------------------
  // Equipe
  // ---------------------------------------------------------------------------
  function addMembro() {
    const novo: MembroEquipe = { id: newId(), nome: '', funcao: '', horas: '' }
    const next = [...equipe, novo]
    setEquipe(next)
    saveNow({ equipe: next })
  }
  function updateMembro(id: string, field: keyof MembroEquipe, val: string) {
    const next = equipe.map(m => m.id === id ? { ...m, [field]: val } : m)
    setEquipe(next)
    debounceSave({ equipe: next })
  }
  function removeMembro(id: string) {
    const next = equipe.filter(m => m.id !== id)
    setEquipe(next)
    saveNow({ equipe: next })
  }

  // ---------------------------------------------------------------------------
  // Atividades
  // ---------------------------------------------------------------------------
  function addAtividade() {
    const nova: Atividade = { id: newId(), area: '', descricao: '', status: 'em_andamento' }
    const next = [...atividades, nova]
    setAtividades(next)
    saveNow({ atividades: next })
  }
  function updateAtividade(id: string, field: keyof Atividade, val: string) {
    const next = atividades.map(a => a.id === id ? { ...a, [field]: val } : a)
    setAtividades(next)
    debounceSave({ atividades: next })
  }
  function removeAtividade(id: string) {
    const next = atividades.filter(a => a.id !== id)
    setAtividades(next)
    saveNow({ atividades: next })
  }
  function addAreaSugestao(area: string) {
    const nova: Atividade = { id: newId(), area, descricao: '', status: 'em_andamento' }
    const next = [...atividades, nova]
    setAtividades(next)
    saveNow({ atividades: next })
  }

  // ---------------------------------------------------------------------------
  // Materiais
  // ---------------------------------------------------------------------------
  function addMaterial() {
    const novo: Material = { id: newId(), nome: '', quantidade: '', unidade: 'litros' }
    const next = [...materiais, novo]
    setMateriais(next)
    saveNow({ materiais: next })
  }
  function updateMaterial(id: string, field: keyof Material, val: string) {
    const next = materiais.map(m => m.id === id ? { ...m, [field]: val } : m)
    setMateriais(next)
    debounceSave({ materiais: next })
  }
  function removeMaterial(id: string) {
    const next = materiais.filter(m => m.id !== id)
    setMateriais(next)
    saveNow({ materiais: next })
  }

  // ---------------------------------------------------------------------------
  // Fotos
  // ---------------------------------------------------------------------------
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    // Inicia fila com progresso 0
    setUploadQueue(files.map(f => ({ name: f.name, progress: 0 })))

    for (const file of files) {
      try {
        // 1. Servidor gera signed upload URL com service role
        const prep = await prepareUpload(initial.id, file.name)
        if (prep.error || !prep.signedUrl || !prep.publicUrl) {
          console.error('Erro ao preparar upload:', prep.error)
          setUploadQueue(prev => prev.filter(f => f.name !== file.name))
          continue
        }

        // 2. XHR com progresso real — sem passar pelo Vercel
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', prep.signedUrl!)
          xhr.setRequestHeader('Content-Type', file.type)

          xhr.upload.addEventListener('progress', ev => {
            if (ev.lengthComputable) {
              const pct = Math.round((ev.loaded / ev.total) * 100)
              setFileProgress(file.name, pct)
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`HTTP ${xhr.status}`))
          })
          xhr.addEventListener('error', () => reject(new Error('Erro de rede')))
          xhr.send(file)
        })

        // 3. Registra a URL pública no banco
        await registrarFotoUrl(initial.id, projeto.id, prep.publicUrl)
        setFotos(prev => [...prev, { url: prep.publicUrl!, legenda: '', ordem: prev.length }])
      } catch (err) {
        console.error('Erro ao fazer upload:', err)
      }

      // Remove da fila ao concluir
      setUploadQueue(prev => prev.filter(f => f.name !== file.name))
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleRemoveFoto(url: string) {
    setFotos(prev => prev.filter(f => f.url !== url))
    await removeFoto(initial.id, projeto.id, url)
  }

  async function handleLegenda(url: string, legenda: string) {
    setFotos(prev => prev.map(f => f.url === url ? { ...f, legenda } : f))
    await updateFotoLegenda(initial.id, projeto.id, url, legenda)
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  async function handleDelete() {
    setDeleting(true)
    await deleteRegistro(initial.id, projeto.id)
  }

  const clientName = projeto.proposals?.leads?.name ?? '—'

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 sticky top-0 bg-gray-50 z-10 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-gray-200 mb-6">
        <Link href={`/diario-obra/${projeto.id}`} className="p-2 hover:bg-white rounded-xl -ml-2 shrink-0">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {clientName} · {formatDate(data)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          {saved && !saving && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <Save className="w-3.5 h-3.5" /> Salvo
            </span>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
            title="Excluir registro"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Bloco 1 — Situação */}
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">Situação do Dia</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data</label>
              <input
                type="date"
                className="input"
                value={data}
                onChange={e => { setData(e.target.value); debounceSave({ data: e.target.value }) }}
              />
            </div>
            <div>
              <label className="label">Responsável</label>
              <input
                className="input"
                placeholder="Nome do responsável"
                value={responsavel}
                onChange={e => { setResponsavel(e.target.value); debounceSave({ responsavel: e.target.value }) }}
              />
            </div>
          </div>

          <div>
            <label className="label mb-2">Clima</label>
            <div className="flex flex-wrap gap-2">
              {CLIMA_OPTIONS.map(c => (
                <button
                  key={c.value}
                  onClick={() => { setClima(c.value); saveNow({ clima: c.value }) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    clima === c.value
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span>{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-2">Status da Obra</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => { setStatusObra(s.value); saveNow({ status_obra: s.value }) }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    statusObra === s.value
                      ? `${s.color} ring-2`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Avanço físico acumulado */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">Avanço físico acumulado</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} max={100} step={1}
                  value={percentual}
                  onChange={e => {
                    const v = Math.min(100, Math.max(0, Number(e.target.value)))
                    setPercentual(v)
                    debounceSave({ percentual_concluido: v })
                  }}
                  className="w-16 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-600">%</span>
              </div>
            </div>
            <input
              type="range" min={0} max={100} step={1}
              value={percentual}
              onChange={e => {
                const v = Number(e.target.value)
                setPercentual(v)
                debounceSave({ percentual_concluido: v })
              }}
              className="w-full h-2 rounded-full accent-blue-600 cursor-pointer"
            />
            <div className="relative mt-1">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    percentual === 100 ? 'bg-green-500' :
                    percentual >= 75  ? 'bg-blue-500'  :
                    percentual >= 50  ? 'bg-blue-400'  :
                    percentual >= 25  ? 'bg-amber-400' : 'bg-amber-300'
                  }`}
                  style={{ width: `${percentual}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-300">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Informe o avanço real da obra nesta data — este valor prevalece sobre a contagem de atividades
            </p>
          </div>
        </div>

        {/* Bloco 2 — Equipe */}
        <Section title="Equipe do Dia" icon={ClipboardList}>
          <div className="space-y-2">
            {equipe.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Nome</th>
                      <th className="text-left pb-2 font-medium px-2">Função</th>
                      <th className="text-left pb-2 font-medium px-2">Horas</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {equipe.map(m => (
                      <tr key={m.id}>
                        <td className="py-1.5 pr-2">
                          <input
                            className="input text-sm py-1"
                            placeholder="Nome"
                            value={m.nome}
                            onChange={e => updateMembro(m.id, 'nome', e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            className="input text-sm py-1"
                            placeholder="Pintor, Ajudante..."
                            value={m.funcao}
                            onChange={e => updateMembro(m.id, 'funcao', e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            className="input text-sm py-1 w-16"
                            placeholder="8"
                            value={m.horas}
                            onChange={e => updateMembro(m.id, 'horas', e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 pl-1">
                          <button onClick={() => removeMembro(m.id)} className="p-1 text-gray-300 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={addMembro} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-4 h-4" /> Adicionar membro
            </button>
          </div>
        </Section>

        {/* Bloco 3 — Atividades */}
        <Section title="Atividades Realizadas" icon={ClipboardList}>
          <div className="space-y-3">
            {/* Sugestões de área */}
            {atividades.length === 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-gray-400">Sugestões:</span>
                {AREA_SUGESTOES.slice(0, 6).map(a => (
                  <button
                    key={a}
                    onClick={() => addAreaSugestao(a)}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    + {a}
                  </button>
                ))}
              </div>
            )}

            {atividades.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Área</th>
                      <th className="text-left pb-2 font-medium px-2">Descrição</th>
                      <th className="text-left pb-2 font-medium px-2">Status</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {atividades.map(a => {
                      const s = ATIVIDADE_STATUS.find(x => x.value === a.status) ?? ATIVIDADE_STATUS[0]
                      return (
                        <tr key={a.id}>
                          <td className="py-1.5 pr-2">
                            <input
                              className="input text-sm py-1"
                              placeholder="Fachada frontal..."
                              value={a.area}
                              onChange={e => updateAtividade(a.id, 'area', e.target.value)}
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              className="input text-sm py-1"
                              placeholder="Descrição..."
                              value={a.descricao}
                              onChange={e => updateAtividade(a.id, 'descricao', e.target.value)}
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <div className="flex gap-1">
                              {ATIVIDADE_STATUS.map(st => (
                                <button
                                  key={st.value}
                                  onClick={() => updateAtividade(a.id, 'status', st.value)}
                                  title={st.label}
                                  className={`text-base p-1 rounded-lg transition-all ${
                                    a.status === st.value ? `${st.color} ring-2 ring-offset-1` : 'opacity-30 hover:opacity-70'
                                  }`}
                                >
                                  {st.emoji}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-1.5 pl-1">
                            <button onClick={() => removeAtividade(a.id)} className="p-1 text-gray-300 hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={addAtividade} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-4 h-4" /> Adicionar atividade
            </button>
          </div>
        </Section>

        {/* Bloco 4 — Materiais */}
        <Section title="Materiais Utilizados" icon={ClipboardList} defaultOpen={false}>
          <div className="space-y-2">
            {materiais.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Material</th>
                      <th className="text-left pb-2 font-medium px-2 w-20">Qtde</th>
                      <th className="text-left pb-2 font-medium px-2 w-28">Unidade</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {materiais.map(m => (
                      <tr key={m.id}>
                        <td className="py-1.5 pr-2">
                          <input
                            className="input text-sm py-1"
                            placeholder="Tinta látex..."
                            value={m.nome}
                            onChange={e => updateMaterial(m.id, 'nome', e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            className="input text-sm py-1"
                            placeholder="18"
                            value={m.quantidade}
                            onChange={e => updateMaterial(m.id, 'quantidade', e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <select
                            className="input text-sm py-1"
                            value={m.unidade}
                            onChange={e => updateMaterial(m.id, 'unidade', e.target.value)}
                          >
                            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 pl-1">
                          <button onClick={() => removeMaterial(m.id)} className="p-1 text-gray-300 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={addMaterial} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-4 h-4" /> Adicionar material
            </button>
          </div>
        </Section>

        {/* Bloco 5 — Fotos */}
        <Section title="Fotos do Dia" icon={Camera}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {fotos.map((f, i) => (
                <div key={f.url} className="space-y-1">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                    <img
                      src={f.url}
                      alt={f.legenda || `Foto ${i + 1}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setLightboxUrl(f.url)}
                    />
                    <button
                      onClick={() => handleRemoveFoto(f.url)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    className="text-xs w-full px-1.5 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                    placeholder="Legenda..."
                    value={f.legenda}
                    onChange={e => setFotos(prev => prev.map(x => x.url === f.url ? { ...x, legenda: e.target.value } : x))}
                    onBlur={e => handleLegenda(f.url, e.target.value)}
                  />
                </div>
              ))}

              {/* Upload button / progresso */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFotos}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
              >
                {uploadingFotos ? (
                  <>
                    {/* Barra de progresso no fundo */}
                    <div
                      className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300 rounded-b-xl"
                      style={{ width: `${uploadProgress}%` }}
                    />
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span className="text-xs font-bold text-blue-600">{uploadProgress}%</span>
                    {uploadQueue.length > 1 && (
                      <span className="text-[10px] text-gray-400">
                        {uploadQueue.length} fotos
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    <span className="text-xs font-medium">Adicionar</span>
                  </>
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-gray-400">Clique em uma foto para ver em tamanho completo</p>
          </div>
        </Section>

        {/* Bloco 6 — Ocorrências internas */}
        <Section title="Ocorrências Internas" icon={Lock} defaultOpen={false}>
          <div className="space-y-2">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Não visível para o cliente
            </p>
            <textarea
              className="input resize-none w-full"
              rows={4}
              placeholder="Problemas, imprevistos, conflitos, observações internas..."
              value={ocorrencias}
              onChange={e => { setOcorrencias(e.target.value); debounceSave({ ocorrencias: e.target.value }) }}
            />
          </div>
        </Section>

        {/* Bloco 7 — Mensagem para o cliente */}
        <Section title="Mensagem para o Cliente" icon={MessageSquare}>
          <div className="space-y-2">
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
              📢 Aparece no link público da obra
            </p>
            <textarea
              className="input resize-none w-full"
              rows={4}
              placeholder="Ex: Ótimo dia de trabalho! Clima favorável ajudou no rendimento..."
              value={notasCliente}
              onChange={e => { setNotasCliente(e.target.value); debounceSave({ notas_cliente: e.target.value }) }}
            />
          </div>
        </Section>

        {/* Bloco 8 — Próximas atividades */}
        <Section title="Planejamento — Próximo Dia" icon={ClipboardList} defaultOpen={false}>
          <div className="space-y-2">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Interno — não visível ao cliente
            </p>
            <textarea
              className="input resize-none w-full"
              rows={3}
              placeholder="O que será feito amanhã..."
              value={proximasAtividades}
              onChange={e => { setProximasAtividades(e.target.value); debounceSave({ proximas_atividades: e.target.value }) }}
            />
          </div>
        </Section>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Foto"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl z-10 p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Excluir registro?</p>
                <p className="text-sm text-gray-500 mt-1">
                  O registro de {formatDate(data)} e todas as fotos serão removidos permanentemente.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
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
