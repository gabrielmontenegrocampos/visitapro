'use client'

import { useRef, useCallback } from 'react'
import { Upload, Loader2, X, Plus, Image, Trash2, Users } from 'lucide-react'
import { uploadProposalAsset } from '@/app/(crm)/configuracoes/actions'

// ── Sub-componentes fora do pai para evitar remount ──────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="pb-1 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type MethodologyStep = { title: string; items: string }

export type ClientRef = { id: string; name: string; company: string; phone: string }

export type ProposalForm = {
  about_text: string
  proposal_tagline: string
  cover_photo_url: string
  portfolio_photos: string[]
  client_names: string
  methodology_title: string
  methodology_steps: MethodologyStep[]
  closing_message: string
  closing_photo_url: string
  client_refs: ClientRef[]
}

type Props = {
  form: ProposalForm
  onChange: (field: keyof ProposalForm, value: ProposalForm[keyof ProposalForm]) => void
  onError: (msg: string) => void
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ProposalSettingsTab({ form, onChange, onError }: Props) {
  const coverInputRef    = useRef<HTMLInputElement>(null)
  const portfolioInputRef = useRef<HTMLInputElement>(null)
  const closingInputRef  = useRef<HTMLInputElement>(null)

  // -- Upload foto de capa --------------------------------------------------
  const handleCoverUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadProposalAsset(fd, 'cover')
    if (res.error) { onError(`Erro ao enviar capa: ${res.error}`); return }
    onChange('cover_photo_url', res.url!)
  }, [onChange, onError])

  // -- Upload foto de encerramento -----------------------------------------
  const handleClosingUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadProposalAsset(fd, 'closing')
    if (res.error) { onError(`Erro ao enviar foto: ${res.error}`); return }
    onChange('closing_photo_url', res.url!)
  }, [onChange, onError])

  // -- Upload foto portfólio ------------------------------------------------
  const handlePortfolioUpload = useCallback(async (files: FileList) => {
    const current = form.portfolio_photos
    if (current.length + files.length > 6) {
      onError('Máximo de 6 fotos no portfólio'); return
    }
    const newUrls: string[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadProposalAsset(fd, 'portfolio')
      if (res.error) { onError(`Erro: ${res.error}`); continue }
      newUrls.push(res.url!)
    }
    onChange('portfolio_photos', [...current, ...newUrls])
  }, [form.portfolio_photos, onChange, onError])

  function removePortfolioPhoto(idx: number) {
    onChange('portfolio_photos', form.portfolio_photos.filter((_, i) => i !== idx))
  }

  function addRef() {
    const newRef: ClientRef = { id: `r${Date.now()}`, name: '', company: '', phone: '' }
    onChange('client_refs', [...form.client_refs, newRef])
  }
  function updateRef(id: string, field: keyof ClientRef, value: string) {
    onChange('client_refs', form.client_refs.map(r => r.id === id ? { ...r, [field]: value } : r))
  }
  function removeRef(id: string) {
    onChange('client_refs', form.client_refs.filter(r => r.id !== id))
  }

  function updateStep(idx: number, field: keyof MethodologyStep, value: string) {
    const updated = form.methodology_steps.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s
    )
    onChange('methodology_steps', updated)
  }

  function addStep() {
    if (form.methodology_steps.length >= 7) return
    onChange('methodology_steps', [...form.methodology_steps, { title: '', items: '' }])
  }

  function removeStep(idx: number) {
    onChange('methodology_steps', form.methodology_steps.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-5">

      {/* ── Foto de capa ── */}
      <Section title="Foto de Capa">
        <p className="text-xs text-gray-500">Aparece como fundo da capa da proposta (foto de um prédio, fachada, obra, etc.).</p>

        <div className="flex items-start gap-4">
          {/* Preview */}
          <div
            className="w-32 h-24 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 cursor-pointer hover:border-blue-300 transition-colors shrink-0"
            onClick={() => coverInputRef.current?.click()}
          >
            {form.cover_photo_url ? (
              <img src={form.cover_photo_url} alt="Capa" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-2">
                <Image className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                <span className="text-[10px] text-gray-400">Capa</span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => coverInputRef.current?.click()}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Enviar foto
              </button>
              {form.cover_photo_url && (
                <button
                  onClick={() => onChange('cover_photo_url', '')}
                  className="text-xs px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  Remover
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">JPG, PNG ou WEBP — recomendado 1200×800px, máx. 5MB</p>
          </div>
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f) }} />
      </Section>

      {/* ── Quem Somos ── */}
      <Section title="Quem Somos">
        <Field label="Tagline / slogan" hint="Frase curta que aparece como subtítulo na capa">
          <input className="input text-sm" placeholder="Ex: Especialistas em fachadas e reformas prediais"
            value={form.proposal_tagline}
            onChange={e => onChange('proposal_tagline', e.target.value)} />
        </Field>
        <Field label="Sobre a empresa" hint="Texto da seção 'Quem Somos' da proposta">
          <textarea
            className="input resize-none text-sm"
            rows={5}
            placeholder="Ex: A empresa é especialista em transformar ambientes..."
            value={form.about_text}
            onChange={e => onChange('about_text', e.target.value)}
          />
        </Field>
      </Section>

      {/* ── Portfólio ── */}
      <Section title="Portfólio — Obras Realizadas">
        <p className="text-xs text-gray-500">Até 6 fotos de obras realizadas. Aparecem na proposta como galeria.</p>

        <div className="grid grid-cols-3 gap-2">
          {form.portfolio_photos.map((url, idx) => (
            <div key={idx} className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100">
              <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removePortfolioPhoto(idx)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {form.portfolio_photos.length < 6 && (
            <button
              onClick={() => portfolioInputRef.current?.click()}
              className="aspect-video rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px]">Adicionar</span>
            </button>
          )}
        </div>

        <input ref={portfolioInputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { if (e.target.files?.length) handlePortfolioUpload(e.target.files) }} />

        <Field label="Clientes / parceiros" hint="Nomes separados por vírgula — aparecem abaixo das fotos">
          <input className="input text-sm" placeholder="Ex: Direcional, MRV, Novolar, Patrimar"
            value={form.client_names}
            onChange={e => onChange('client_names', e.target.value)} />
        </Field>
      </Section>

      {/* ── Referências Comerciais ── */}
      <Section title="Referências Comerciais">
        <p className="text-xs text-gray-500">
          Clientes que servem como referência. Aparecem nas propostas — você pode remover individualmente em cada proposta.
        </p>

        {/* Cabeçalho da tabela */}
        {form.client_refs.length > 0 && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <div className="grid grid-cols-[1fr_1fr_1fr_32px] bg-gray-800 text-white text-[10px] font-bold uppercase tracking-wider">
              <div className="px-3 py-2">Nome</div>
              <div className="px-3 py-2">Empresa</div>
              <div className="px-3 py-2">Contato</div>
              <div />
            </div>
            {form.client_refs.map((ref, idx) => (
              <div key={ref.id} className={`grid grid-cols-[1fr_1fr_1fr_32px] items-center border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <input
                  className="text-xs px-3 py-2 bg-transparent outline-none border-r border-gray-100 focus:bg-blue-50 transition-colors"
                  placeholder="Nome"
                  value={ref.name}
                  onChange={e => updateRef(ref.id, 'name', e.target.value)}
                />
                <input
                  className="text-xs px-3 py-2 bg-transparent outline-none border-r border-gray-100 focus:bg-blue-50 transition-colors"
                  placeholder="Empresa"
                  value={ref.company}
                  onChange={e => updateRef(ref.id, 'company', e.target.value)}
                />
                <input
                  className="text-xs px-3 py-2 bg-transparent outline-none border-r border-gray-100 focus:bg-blue-50 transition-colors"
                  placeholder="(11) 99999-9999"
                  value={ref.phone}
                  onChange={e => updateRef(ref.id, 'phone', e.target.value)}
                />
                <button
                  onClick={() => removeRef(ref.id)}
                  className="flex items-center justify-center h-full hover:bg-red-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={addRef}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-all"
        >
          <Plus className="w-4 h-4" /> Adicionar referência
        </button>
      </Section>

      {/* ── Metodologia ── */}
      <Section title="Metodologia / Processo de Trabalho">
        <p className="text-xs text-gray-500">Aparece na proposta como os passos do seu método de trabalho.</p>

        <Field label="Título da seção">
          <input className="input text-sm" placeholder="Ex: Gestão 5P's / Nosso Processo"
            value={form.methodology_title}
            onChange={e => onChange('methodology_title', e.target.value)} />
        </Field>

        <div className="space-y-3">
          {form.methodology_steps.map((step, idx) => (
            <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-gray-800 text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  className="input text-sm flex-1"
                  placeholder={`Título do passo ${idx + 1}`}
                  value={step.title}
                  onChange={e => updateStep(idx, 'title', e.target.value)}
                />
                <button onClick={() => removeStep(idx)} className="p-1.5 hover:bg-red-50 rounded-lg shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
              <textarea
                className="input text-xs resize-none"
                rows={2}
                placeholder="Itens (um por linha): Levantamentos, Análises..."
                value={step.items}
                onChange={e => updateStep(idx, 'items', e.target.value)}
              />
            </div>
          ))}
        </div>

        {form.methodology_steps.length < 7 && (
          <button onClick={addStep} className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-all">
            <Plus className="w-4 h-4" /> Adicionar passo
          </button>
        )}
      </Section>

      {/* ── Página de Encerramento ── */}
      <Section title="Página de Encerramento — Muito Obrigado">
        <p className="text-xs text-gray-500">Última página da proposta. Foto de fundo + mensagem de encerramento.</p>

        {/* Foto de fundo */}
        <div className="flex items-start gap-4">
          <div
            className="w-32 h-24 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 cursor-pointer hover:border-blue-300 transition-colors shrink-0"
            onClick={() => closingInputRef.current?.click()}
          >
            {form.closing_photo_url ? (
              <img src={form.closing_photo_url} alt="Encerramento" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-2">
                <Image className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                <span className="text-[10px] text-gray-400">Foto de fundo</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => closingInputRef.current?.click()}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Enviar foto
              </button>
              {form.closing_photo_url && (
                <button
                  onClick={() => onChange('closing_photo_url', '')}
                  className="text-xs px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  Remover
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Usa foto da capa se não for enviada. Recomendado 1200×800px.</p>
          </div>
        </div>
        <input ref={closingInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleClosingUpload(f) }} />

        {/* Mensagem */}
        <Field label="Mensagem de encerramento" hint="Texto que aparece na página 'Muito Obrigado'">
          <textarea
            className="input resize-none text-sm"
            rows={4}
            placeholder="Ex: A empresa está pronta para transformar seu projeto em realidade, cuidando de cada detalhe com a dedicação e qualidade que você merece..."
            value={form.closing_message}
            onChange={e => onChange('closing_message', e.target.value)}
          />
        </Field>
      </Section>

    </div>
  )
}
