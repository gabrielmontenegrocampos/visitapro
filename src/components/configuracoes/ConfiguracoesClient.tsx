'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Building2, Phone, Mail, MapPin, Globe, AtSign,
  Upload, Loader2, CheckCircle2, AlertCircle, X, Camera, Hash,
  FileText,
} from 'lucide-react'
import { saveCompanySettings, uploadLogo } from '@/app/(crm)/configuracoes/actions'
import type { CompanySettings } from '@/types/database'
import ProposalSettingsTab, { type ProposalForm, type MethodologyStep } from './ProposalSettingsTab'

// ── Máscaras ─────────────────────────────────────────────────────────────────

function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

function maskDocument(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function rawDigits(v: string) { return v.replace(/\D/g, '') }

// ── Defaults da metodologia ───────────────────────────────────────────────────

const DEFAULT_STEPS: MethodologyStep[] = [
  { title: 'Levantamentos',   items: 'Visita técnica\nAnálises preliminares' },
  { title: 'Proposta',        items: 'Apresentação da proposta\nAssinatura do contrato\nPlanejamento da obra\nCronograma' },
  { title: 'Início da Obra',  items: 'Materiais\nMobilização\nInício da execução' },
  { title: 'Execução',        items: 'Acompanhamento\nRelatórios semanais' },
  { title: 'Entrega',         items: 'Finalização\nRevisão\nEntrega ao cliente' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type EmpresaForm = {
  name: string; legal_name: string; document: string
  state_registration: string; municipal_registration: string
  phone: string; whatsapp: string; email: string
  cep: string; address: string; number: string
  complement: string; neighborhood: string; city: string; state: string
  website: string; instagram: string; facebook: string
  youtube: string; tiktok: string; logo_url: string
  brand_color: string
}

function toEmpresaForm(s: CompanySettings | null): EmpresaForm {
  return {
    name:                  s?.name ?? '',
    legal_name:            s?.legal_name ?? '',
    document:              s?.document ? maskDocument(s.document) : '',
    state_registration:    s?.state_registration ?? '',
    municipal_registration: s?.municipal_registration ?? '',
    phone:                 s?.phone ? maskPhone(s.phone) : '',
    whatsapp:              s?.whatsapp ? maskPhone(s.whatsapp) : '',
    email:                 s?.email ?? '',
    cep:                   s?.cep ? maskCEP(s.cep) : '',
    address:               s?.address ?? '',
    number:                s?.number ?? '',
    complement:            s?.complement ?? '',
    neighborhood:          s?.neighborhood ?? '',
    city:                  s?.city ?? '',
    state:                 s?.state ?? '',
    website:               s?.website ?? '',
    instagram:             s?.instagram ?? '',
    facebook:              s?.facebook ?? '',
    youtube:               s?.youtube ?? '',
    tiktok:                s?.tiktok ?? '',
    logo_url:              s?.logo_url ?? '',
    brand_color:           s?.brand_color ?? '#1d4ed8',
  }
}

function toProposalForm(s: CompanySettings | null): ProposalForm {
  return {
    about_text:        s?.about_text ?? '',
    proposal_tagline:  s?.proposal_tagline ?? '',
    cover_photo_url:   s?.cover_photo_url ?? '',
    portfolio_photos:  s?.portfolio_photos ?? [],
    client_names:      s?.client_names ?? '',
    methodology_title: s?.methodology_title ?? "Nosso Processo de Trabalho",
    methodology_steps: s?.methodology_steps?.length
      ? s.methodology_steps.map(st => ({ title: st.title, items: st.items.join('\n') }))
      : DEFAULT_STEPS,
    closing_message:   s?.closing_message ?? '',
    closing_photo_url: s?.closing_photo_url ?? '',
    client_refs:       s?.client_refs ?? [],
  }
}

// ── Sub-componentes (fora do pai) ─────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
        <div className="text-blue-600">{icon}</div>
        <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ConfiguracoesClient({ settings }: { settings: CompanySettings | null }) {
  const [activeTab, setActiveTab] = useState<'empresa' | 'proposta'>('empresa')

  const [empresa, setEmpresa]       = useState<EmpresaForm>(toEmpresaForm(settings))
  const [proposta, setProposta]     = useState<ProposalForm>(toProposalForm(settings))

  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoPreview, setLogoPreview]     = useState<string | null>(settings?.logo_url ?? null)
  const [dragOver, setDragOver]           = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function setE(field: keyof EmpresaForm, value: string) {
    setEmpresa(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function setP(field: keyof ProposalForm, value: ProposalForm[keyof ProposalForm]) {
    setProposta(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  // ── CEP lookup ────────────────────────────────────────────────────────────
  async function lookupCEP(cep: string) {
    const digits = rawDigits(cep)
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setEmpresa(prev => ({
          ...prev,
          address:      data.logradouro ?? prev.address,
          neighborhood: data.bairro     ?? prev.neighborhood,
          city:         data.localidade ?? prev.city,
          state:        data.uf         ?? prev.state,
        }))
      }
    } catch {}
    setCepLoading(false)
  }

  // ── Logo upload ───────────────────────────────────────────────────────────
  const handleLogoFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setLogoUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadLogo(fd)
      if (res.error) throw new Error(res.error)
      setLogoPreview(res.url!)
      setE('logo_url', res.url!)
    } catch (e: any) {
      setError(`Erro ao enviar logo: ${e.message ?? e}`)
    }
    setLogoUploading(false)
  }, [])

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)
    const res = await saveCompanySettings({
      // Empresa
      name:                  empresa.name || null,
      legal_name:            empresa.legal_name || null,
      document:              rawDigits(empresa.document) || null,
      document_type:         rawDigits(empresa.document).length <= 11 ? 'cpf' : 'cnpj',
      state_registration:    empresa.state_registration || null,
      municipal_registration: empresa.municipal_registration || null,
      phone:                 rawDigits(empresa.phone) || null,
      whatsapp:              rawDigits(empresa.whatsapp) || null,
      email:                 empresa.email || null,
      cep:                   rawDigits(empresa.cep) || null,
      address:               empresa.address || null,
      number:                empresa.number || null,
      complement:            empresa.complement || null,
      neighborhood:          empresa.neighborhood || null,
      city:                  empresa.city || null,
      state:                 empresa.state || null,
      website:               empresa.website || null,
      instagram:             empresa.instagram || null,
      facebook:              empresa.facebook || null,
      youtube:               empresa.youtube || null,
      tiktok:                empresa.tiktok || null,
      logo_url:              empresa.logo_url || null,
      brand_color:           empresa.brand_color || null,
      // Proposta
      about_text:        proposta.about_text || null,
      proposal_tagline:  proposta.proposal_tagline || null,
      cover_photo_url:   proposta.cover_photo_url || null,
      portfolio_photos:  proposta.portfolio_photos.filter(Boolean),
      client_names:      proposta.client_names || null,
      methodology_title: proposta.methodology_title || null,
      methodology_steps: proposta.methodology_steps
        .filter(s => s.title.trim())
        .map((s, i) => ({
          step: i + 1,
          title: s.title.trim(),
          items: s.items.split('\n').map(x => x.trim()).filter(Boolean),
        })),
      closing_message:   proposta.closing_message || null,
      closing_photo_url: proposta.closing_photo_url || null,
      client_refs:       proposta.client_refs.filter(r => r.name.trim()),
    })
    if (res.error) setError(res.error)
    else setSaved(true)
    setSaving(false)
  }

  const docDigits = rawDigits(empresa.document)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Dados da empresa e personalização das propostas</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 px-5">
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            : saved
            ? <><CheckCircle2 className="w-4 h-4" /> Salvo</>
            : 'Salvar'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setActiveTab('empresa')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'empresa' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 className="w-4 h-4" /> Empresa
        </button>
        <button
          onClick={() => setActiveTab('proposta')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'proposta' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" /> Proposta
        </button>
      </div>

      {/* ═══════════════ ABA EMPRESA ═══════════════ */}
      {activeTab === 'empresa' && (
        <>
          {/* Logomarca */}
          <Section icon={<Camera className="w-4 h-4" />} title="Logomarca">
            <div className="flex items-center gap-5">
              <div
                className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center shrink-0 overflow-hidden transition-colors cursor-pointer ${
                  dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setDragOver(false)
                  const f = e.dataTransfer.files[0]
                  if (f) handleLogoFile(f)
                }}
              >
                {logoUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                ) : logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="text-center p-2">
                    <Upload className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                    <span className="text-[10px] text-gray-400">Logo</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 font-medium mb-2">Logomarca da empresa</p>
                <p className="text-xs text-gray-400 mb-3">PNG, JPG ou SVG — máx. 5 MB</p>
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Enviar arquivo
                  </button>
                  {logoPreview && (
                    <button onClick={() => { setLogoPreview(null); setE('logo_url', '') }} className="text-xs px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }} />
          </Section>

          {/* Cor da marca */}
          <Section icon={<Globe className="w-4 h-4" />} title="Aparência">
            <Field label="Cor principal da marca" hint="Usada no cabeçalho e detalhes das propostas enviadas ao cliente">
              <div className="flex items-center gap-3 flex-wrap">
                <input type="color" value={empresa.brand_color} onChange={e => setE('brand_color', e.target.value)}
                  className="w-12 h-10 rounded-xl border border-gray-200 cursor-pointer p-1 bg-white" />
                <input className="input font-mono text-sm w-32" placeholder="#1d4ed8" value={empresa.brand_color}
                  onChange={e => setE('brand_color', e.target.value)} maxLength={7} />
                <div className="flex gap-2">
                  {['#1d4ed8','#0f766e','#7c3aed','#dc2626','#ea580c','#16a34a','#111827'].map(c => (
                    <button key={c} onClick={() => setE('brand_color', c)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${empresa.brand_color === c ? 'border-gray-700 scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              </div>
            </Field>
          </Section>

          {/* Identificação */}
          <Section icon={<Building2 className="w-4 h-4" />} title="Identificação">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nome fantasia *">
                <input className="input" placeholder="Ex: Pintura & Reforma" value={empresa.name}
                  onChange={e => setE('name', e.target.value)} />
              </Field>
              <Field label="Razão social">
                <input className="input" placeholder="Ex: Empresa Ltda" value={empresa.legal_name}
                  onChange={e => setE('legal_name', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={docDigits.length > 11 ? 'CNPJ' : docDigits.length === 11 ? 'CPF' : 'CPF / CNPJ'}
                hint="Digite os números — a máscara é aplicada automaticamente">
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input pl-9" placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    value={empresa.document} onChange={e => setE('document', maskDocument(e.target.value))} inputMode="numeric" />
                </div>
              </Field>
              <Field label="Inscrição estadual">
                <input className="input" placeholder="Isento ou nº" value={empresa.state_registration}
                  onChange={e => setE('state_registration', e.target.value)} />
              </Field>
            </div>
            <Field label="Inscrição municipal">
              <input className="input" placeholder="Nº de alvará / inscrição municipal" value={empresa.municipal_registration}
                onChange={e => setE('municipal_registration', e.target.value)} />
            </Field>
          </Section>

          {/* Contato */}
          <Section icon={<Phone className="w-4 h-4" />} title="Contato">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Telefone / Celular">
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input pl-9" placeholder="(11) 99999-9999" value={empresa.phone} inputMode="numeric"
                    onChange={e => setE('phone', maskPhone(e.target.value))} />
                </div>
              </Field>
              <Field label="WhatsApp">
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input pl-9" placeholder="(11) 99999-9999" value={empresa.whatsapp} inputMode="numeric"
                    onChange={e => setE('whatsapp', maskPhone(e.target.value))} />
                </div>
              </Field>
            </div>
            <Field label="E-mail">
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-9" type="email" placeholder="contato@empresa.com"
                  value={empresa.email} onChange={e => setE('email', e.target.value)} />
              </div>
            </Field>
          </Section>

          {/* Endereço */}
          <Section icon={<MapPin className="w-4 h-4" />} title="Endereço">
            <div className="grid grid-cols-2 gap-4">
              <Field label="CEP" hint="Preenchimento automático ao digitar o CEP">
                <div className="relative">
                  <input className="input pr-10" placeholder="00000-000" value={empresa.cep} inputMode="numeric"
                    onChange={e => setE('cep', maskCEP(e.target.value))}
                    onBlur={e => lookupCEP(e.target.value)} />
                  {cepLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500 absolute right-3 top-1/2 -translate-y-1/2" />}
                </div>
              </Field>
              <Field label="Estado">
                <input className="input" placeholder="SP" maxLength={2} value={empresa.state}
                  onChange={e => setE('state', e.target.value.toUpperCase())} />
              </Field>
            </div>
            <Field label="Logradouro">
              <input className="input" placeholder="Rua, Avenida..." value={empresa.address}
                onChange={e => setE('address', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Número">
                <input className="input" placeholder="123" value={empresa.number}
                  onChange={e => setE('number', e.target.value)} />
              </Field>
              <Field label="Complemento">
                <input className="input" placeholder="Sala, Andar..." value={empresa.complement}
                  onChange={e => setE('complement', e.target.value)} />
              </Field>
              <Field label="Bairro">
                <input className="input" placeholder="Bairro" value={empresa.neighborhood}
                  onChange={e => setE('neighborhood', e.target.value)} />
              </Field>
            </div>
            <Field label="Cidade">
              <input className="input" placeholder="São Paulo" value={empresa.city}
                onChange={e => setE('city', e.target.value)} />
            </Field>
          </Section>

          {/* Presença digital */}
          <Section icon={<Globe className="w-4 h-4" />} title="Presença Digital">
            <Field label="Website">
              <div className="relative">
                <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-9" placeholder="https://www.empresa.com.br"
                  value={empresa.website} onChange={e => setE('website', e.target.value)} />
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'instagram', label: 'Instagram', placeholder: '@empresa ou URL completa' },
                { key: 'facebook',  label: 'Facebook',  placeholder: 'facebook.com/empresa' },
                { key: 'youtube',   label: 'YouTube',   placeholder: '@canal ou URL completa' },
                { key: 'tiktok',    label: 'TikTok',    placeholder: '@empresa ou URL completa' },
              ].map(({ key, label, placeholder }) => (
                <Field key={key} label={label}>
                  <div className="relative">
                    <AtSign className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="input pl-9" placeholder={placeholder}
                      value={(empresa as any)[key]}
                      onChange={e => setE(key as keyof EmpresaForm, e.target.value)} />
                  </div>
                </Field>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ═══════════════ ABA PROPOSTA ═══════════════ */}
      {activeTab === 'proposta' && (
        <ProposalSettingsTab
          form={proposta}
          onChange={setP}
          onError={setError}
        />
      )}

      {/* Botão salvar bottom */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Configurações salvas
          </span>
        )}
        <div className="ml-auto">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 px-6 py-2.5">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar configurações'}
          </button>
        </div>
      </div>
    </div>
  )
}
