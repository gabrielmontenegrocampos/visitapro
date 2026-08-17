'use client'

import '@casualoffice/docs/styles.css'
import { useRef, useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { saveContratoDocx, updateContratoStatus, updateContratoTitle, deleteContrato } from '@/app/(crm)/contratos/actions'

// DocxEditor is browser-only — no SSR
const DocxEditor = dynamic(
  () => import('@casualoffice/docs').then(m => m.DocxEditor),
  { ssr: false, loading: () => <EditorLoading /> }
)

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function EditorLoading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Carregando editor...</span>
      </div>
    </div>
  )
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(binary)
}

interface Props {
  contrato: {
    id: string
    title: string
    contract_number: string
    status: string
    docx_path?: string | null
  }
  docxUrl: string | null
}

export default function ContratoEditorPage({ contrato, docxUrl }: Props) {
  const editorRef = useRef<any>(null)
  const [docBuffer, setDocBuffer] = useState<ArrayBuffer | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [title, setTitle] = useState(contrato.title)
  const [status, setStatus] = useState(contrato.status)
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load DOCX from signed URL
  useEffect(() => {
    if (!docxUrl) {
      setLoadError('Arquivo do contrato não encontrado. Recarregue a página.')
      return
    }
    fetch(docxUrl)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.arrayBuffer()
      })
      .then(buf => setDocBuffer(buf))
      .catch(err => setLoadError(`Erro ao carregar o contrato: ${err.message}`))
  }, [docxUrl])

  const [saveError, setSaveError] = useState<string | null>(null)

  const save = useCallback(async () => {
    if (!editorRef.current) return
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const buf: ArrayBuffer | null = await editorRef.current.save()
      if (!buf) { setSaveStatus('idle'); return }
      const base64 = arrayBufferToBase64(buf)
      const result = await saveContratoDocx(contrato.id, base64)
      if (result.error) {
        console.error('[save] Server action error:', result.error)
        setSaveError(result.error)
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        setLastSaved(new Date())
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[save] Exception:', msg)
      setSaveError(msg)
      setSaveStatus('error')
    }
  }, [contrato.id])

  // Auto-save every 60 seconds
  useEffect(() => {
    autoSaveTimer.current = setInterval(save, 60_000)
    return () => { if (autoSaveTimer.current) clearInterval(autoSaveTimer.current) }
  }, [save])

  const handleTitleBlur = async () => {
    if (title !== contrato.title) await updateContratoTitle(contrato.id, title)
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus)
    await updateContratoStatus(contrato.id, newStatus)
  }

  const statusOptions = [
    { value: 'rascunho', label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
    { value: 'enviado', label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
    { value: 'assinado', label: 'Assinado', color: 'bg-green-100 text-green-700' },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  ]
  const currentStatus = statusOptions.find(s => s.value === status) ?? statusOptions[0]

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: '#f1f5f9' }}>

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 bg-white border-b border-gray-200 shrink-0" style={{ height: 52 }}>
        <Link href="/contratos" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Contratos</span>
        </Link>

        <div className="w-px h-5 bg-gray-200" />

        <FileText className="w-4 h-4 text-gray-400 shrink-0" />

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="flex-1 min-w-0 text-sm font-medium text-gray-800 bg-transparent border-none outline-none truncate"
          placeholder="Título do contrato"
        />

        {/* Status selector */}
        <div className="relative group">
          <button
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${currentStatus.color} cursor-pointer`}
          >
            {currentStatus.label}
          </button>
          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 hidden group-hover:block w-36">
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${opt.value === status ? 'font-bold' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0 w-28 justify-end">
          {saveStatus === 'saving' && <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Salvando…</span></>}
          {saveStatus === 'saved' && <><CheckCircle className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600">Salvo</span></>}
          {saveStatus === 'error' && <><AlertCircle className="w-3.5 h-3.5 text-red-500" title={saveError ?? 'Erro desconhecido'} /><span className="text-red-600 truncate max-w-[180px]" title={saveError ?? ''}>{saveError ? saveError.slice(0, 40) : 'Erro'}</span></>}
          {saveStatus === 'idle' && lastSaved && <span>{lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>

        <button
          onClick={save}
          disabled={saveStatus === 'saving'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          Salvar
        </button>
      </header>

      {/* ── Editor area ── */}
      <div className="flex-1 min-h-0 relative">
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-3 text-center p-8">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-gray-600 max-w-sm">{loadError}</p>
            </div>
          </div>
        )}

        {!loadError && !docBuffer && <EditorLoading />}

        {!loadError && docBuffer && (
          <DocxEditor
            ref={editorRef}
            documentBuffer={docBuffer}
            onReady={(api: any) => api.focus?.()}
            ai={{ enabled: false }}
            onError={() => {}}
          />
        )}
      </div>
    </div>
  )
}
