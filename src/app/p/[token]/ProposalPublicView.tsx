'use client'

import { useState } from 'react'
import { Copy, CheckCircle2, Printer, Phone, Mail, Globe, AtSign, MapPin } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Measurement { id: string; label: string; height: number; width: number }

interface ServiceItem {
  id: string
  item_type: string | null
  area_name: string | null
  service_type: string | null
  description: string | null
  unit: string | null
  quantity: number
  total_price: number
  measurements: Measurement[] | null
}

interface BdiItem { id: string; label: string; percentage: number }

interface ClientRef { id: string; name: string; company: string; phone: string }

interface Proposal {
  id: string; title: string; proposal_number: string | null; value: number
  status: string; payment_terms: string | null; client_notes: string | null
  expires_at: string | null; sent_at: string | null; created_at: string
  client_refs: ClientRef[] | null
  laudo: string | null
  memorial_descritivo: string | null
  leads: { id: string; name: string; address: string | null; city: string | null; phone: string | null } | null
}

interface CompanySettings {
  name: string | null; legal_name: string | null; document: string | null
  document_type: 'cpf' | 'cnpj' | null; phone: string | null; whatsapp: string | null
  email: string | null; address: string | null; number: string | null
  complement: string | null; neighborhood: string | null; city: string | null
  state: string | null; website: string | null; instagram: string | null
  logo_url: string | null; brand_color: string | null
  about_text: string | null; proposal_tagline: string | null; cover_photo_url: string | null
  portfolio_photos: string[] | null; client_names: string | null
  methodology_title: string | null
  methodology_steps: Array<{ step: number; title: string; items: string[] }> | null
  closing_message: string | null
  closing_photo_url: string | null
  client_refs: ClientRef[] | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtPhone(p: string | null) {
  if (!p) return null
  const d = p.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return p
}

function fmtDoc(doc: string | null, type: 'cpf' | 'cnpj' | null) {
  if (!doc) return null
  const d = doc.replace(/\D/g, '')
  if (type === 'cnpj' || d.length > 11)
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ProposalPublicView({
  proposal, items, bdiItems, settings,
}: {
  proposal: Proposal
  items: ServiceItem[]
  bdiItems: BdiItem[]
  settings: CompanySettings | null
  token: string
}) {
  const [copied, setCopied] = useState(false)

  const brand      = settings?.brand_color ?? '#1d4ed8'
  const serviceItems = items.filter(i => !i.item_type || i.item_type === 'servico')
  const directCost = serviceItems.reduce((s, i) => s + i.total_price, 0)
  const bdiTotal   = bdiItems.reduce((s, b) => s + b.percentage, 0)
  const totalFinal = directCost * (1 + bdiTotal / 100)
  const lead       = proposal.leads

  const addrParts   = [settings?.address, settings?.number ? `nº ${settings.number}` : null, settings?.city, settings?.state].filter(Boolean)
  const companyAddr = addrParts.join(', ')

  const hasAbout     = !!settings?.about_text
  const hasPortfolio = !!(settings?.portfolio_photos?.length)
  const hasMethod    = !!(settings?.methodology_steps?.length)
  // Referências: usa as da proposta (customizadas) ou as das configurações globais
  const activeRefs   = proposal.client_refs ?? settings?.client_refs ?? []
  const hasRefs      = activeRefs.length > 0
  const hasPayment   = !!(proposal.payment_terms || proposal.client_notes)
  const hasLaudo     = !!proposal.laudo
  const hasMemorial  = !!proposal.memorial_descritivo

  const clientNames = settings?.client_names
    ? settings.client_names.split(',').map(s => s.trim()).filter(Boolean)
    : []

  // Group service items by area_name for Detalhamento
  const etapaMap = new Map<string, ServiceItem[]>()
  serviceItems.forEach(item => {
    const key = item.area_name ?? 'Outros'
    if (!etapaMap.has(key)) etapaMap.set(key, [])
    etapaMap.get(key)!.push(item)
  })
  const etapas = Array.from(etapaMap.entries())

  // Closing photo fallback
  const closingPhoto = settings?.closing_photo_url ?? settings?.cover_photo_url ?? settings?.portfolio_photos?.[0] ?? null

  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ── Shared styles ─────────────────────────────────────────────────────────

  const tableHeaderStyle: React.CSSProperties = {
    background: '#111827', color: 'white', fontWeight: 700,
    fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '8px 14px', textAlign: 'center',
  }
  const tableRowStyle = (idx: number): React.CSSProperties => ({
    background: idx % 2 === 0 ? 'white' : '#f3f4f6',
    borderBottom: '1px solid #e5e7eb',
    padding: '10px 14px',
  })

  return (
    <>
      {/* ── Estilos globais A4 ── */}
      <style>{`
        .a4 {
          width: 210mm;
          background: white;
          margin: 0 auto;
          position: relative;
          box-shadow: 0 2px 32px rgba(0,0,0,0.18);
        }
        .a4-full { height: 297mm; overflow: hidden; }
        .a4-content {
          min-height: 297mm; padding: 22mm 20mm;
          box-sizing: border-box; display: flex; flex-direction: column;
        }
        .a4-split {
          min-height: 297mm; display: grid;
          grid-template-columns: 1fr 1fr; overflow: hidden;
        }
        @media screen and (max-width: 840px) {
          .a4 { width: 100%; box-shadow: none; }
          .a4-full { height: auto; min-height: 100vw; }
          .a4-content { min-height: 0; padding: 10vw 8vw; }
          .a4-split { grid-template-columns: 1fr; min-height: 0; }
          .a4-split-reverse { order: -1; min-height: 60vw; }
        }
        @media print {
          .no-print   { display: none !important; }
          .print-break { break-after: page; page-break-after: always; }
          .a4 { width: 100%; box-shadow: none; margin: 0; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      {/* ── Barra de ação flutuante ── */}
      <div className="no-print sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
        <div style={{ maxWidth: '210mm', margin: '0 auto' }} className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="h-7 w-auto object-contain shrink-0" />}
            <span className="font-semibold text-gray-800 text-sm truncate">{settings?.name ?? 'Proposta Comercial'}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${copied ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all">
              <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Wrapper cinza (estilo visualizador PDF) ── */}
      <div className="no-print-bg min-h-screen py-8 print:py-0" style={{ backgroundColor: '#525659' }}>
      <style>{`
        @media print { .no-print-bg { background: white !important; padding: 0 !important; } }
      `}</style>

        {/* ════════════════════════════════════════
            P1 — CAPA
        ════════════════════════════════════════ */}
        <div className="a4 a4-full print-break">
          {settings?.cover_photo_url ? (
            <>
              <img src={settings.cover_photo_url} alt="Capa"
                style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.05) 100%)' }} />
            </>
          ) : (
            <div style={{ position:'absolute', inset:0, background:`linear-gradient(140deg, ${brand} 0%, #0f172a 100%)` }} />
          )}
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'8mm', backgroundColor: brand, zIndex:2 }} />
          <div style={{ position:'relative', zIndex:3, height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'18mm 18mm 16mm 22mm' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              {settings?.logo_url ? (
                <div style={{ background:'white', borderRadius:'10px', padding:'8px 12px', boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}>
                  <img src={settings.logo_url} alt="Logo" style={{ height:'40px', width:'auto', objectFit:'contain' }} />
                </div>
              ) : (
                <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:'10px', padding:'8px 16px' }}>
                  <span style={{ color:'white', fontWeight:'bold', fontSize:'18px' }}>{settings?.name ?? ''}</span>
                </div>
              )}
              {proposal.proposal_number && (
                <span style={{ background:'rgba(255,255,255,0.2)', backdropFilter:'blur(8px)', color:'white', fontSize:'11px', fontWeight:'bold', padding:'4px 12px', borderRadius:'20px', letterSpacing:'0.05em' }}>
                  {proposal.proposal_number}
                </span>
              )}
            </div>
            <div>
              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'9px', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'8px' }}>
                {fmtDate(proposal.sent_at)}
              </p>
              <h1 style={{ color:'white', fontWeight:900, fontSize:'clamp(36px, 8vw, 52px)', lineHeight:1, margin:0 }}>PROPOSTA</h1>
              <h1 style={{ fontWeight:900, fontSize:'clamp(36px, 8vw, 52px)', lineHeight:1, margin:'0 0 12px 0', color: settings?.cover_photo_url ? 'white' : 'rgba(255,255,255,0.4)' }}>COMERCIAL</h1>
              {settings?.proposal_tagline && (
                <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'12px', marginBottom:'16px', maxWidth:'320px' }}>
                  {settings.proposal_tagline}
                </p>
              )}
              <div style={{ width:'48px', height:'3px', backgroundColor: brand, borderRadius:'2px', marginBottom:'16px' }} />
              <div style={{ display:'flex', flexWrap:'wrap', gap:'16px' }}>
                {fmtPhone(settings?.whatsapp ?? settings?.phone ?? null) && (
                  <span style={{ color:'rgba(255,255,255,0.8)', fontSize:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <Phone style={{ width:'13px', height:'13px' }} />{fmtPhone(settings?.whatsapp ?? settings?.phone ?? null)}
                  </span>
                )}
                {settings?.email && (
                  <span style={{ color:'rgba(255,255,255,0.8)', fontSize:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <Mail style={{ width:'13px', height:'13px' }} />{settings.email}
                  </span>
                )}
                {settings?.website && (
                  <span style={{ color:'rgba(255,255,255,0.8)', fontSize:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <Globe style={{ width:'13px', height:'13px' }} />{settings.website.replace(/^https?:\/\//, '')}
                  </span>
                )}
                {settings?.instagram && (
                  <span style={{ color:'rgba(255,255,255,0.8)', fontSize:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <AtSign style={{ width:'13px', height:'13px' }} />{settings.instagram.replace(/^@/, '')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            P2 — QUEM SOMOS
        ════════════════════════════════════════ */}
        {hasAbout && (
          <div className="a4 a4-split print-break" style={{ marginTop:'24px' }}>
            <div style={{ padding:'20mm 12mm 20mm 18mm', display:'flex', flexDirection:'column', justifyContent:'center', borderRight:'1px solid #f0f0f0' }}>
              {settings?.website && (
                <span style={{ display:'inline-block', marginBottom:'20px', fontSize:'10px', fontWeight:600, color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:'20px', padding:'4px 12px', width:'fit-content' }}>
                  {settings.website.replace(/^https?:\/\//, '')}
                </span>
              )}
              <h2 style={{ fontSize:'44px', fontWeight:900, color:'#111827', lineHeight:1.05, marginBottom:'24px' }}>Quem<br />Somos</h2>
              <p style={{ color:'#4b5563', lineHeight:1.7, fontSize:'13px', whiteSpace:'pre-line' }}>{settings!.about_text}</p>
            </div>
            <div className="a4-split-reverse" style={{ position:'relative', overflow:'hidden', minHeight:'200px' }}>
              {settings?.cover_photo_url ? (
                <img src={settings.cover_photo_url} alt="Empresa"
                  style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} />
              ) : (
                <div style={{ width:'100%', height:'100%', background:`linear-gradient(135deg, ${brand}22, ${brand}44)` }} />
              )}
              <div style={{ position:'absolute', bottom:0, left:0, borderBottom:'60px solid white', borderRight:'60px solid transparent' }} />
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            P3 — OBRAS REALIZADAS
        ════════════════════════════════════════ */}
        {hasPortfolio && (
          <div className="a4 a4-split print-break" style={{ marginTop:'24px' }}>
            <div style={{ padding:'20mm 12mm 20mm 18mm', display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div style={{ width:'40px', height:'4px', backgroundColor: brand, borderRadius:'2px', marginBottom:'20px' }} />
              <h2 style={{ fontSize:'44px', fontWeight:900, color:'#111827', lineHeight:1.05, marginBottom:'20px' }}>Obras<br />Realizadas</h2>
              <p style={{ color:'#6b7280', fontSize:'12px', lineHeight:1.7, marginBottom:'24px' }}>
                Experiência comprovada em projetos de pintura e reforma, garantindo qualidade e satisfação em cada entrega.
              </p>
              {clientNames.length > 0 && (
                <div>
                  <p style={{ fontSize:'10px', fontWeight:700, color:'#9ca3af', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'10px' }}>Clientes</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                    {clientNames.map((c, i) => (
                      <span key={i} style={{ padding:'4px 10px', background:'#f3f4f6', borderRadius:'6px', fontSize:'11px', fontWeight:600, color:'#374151' }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {settings?.website && (
                <p style={{ fontSize:'10px', color:'#d1d5db', marginTop:'auto', paddingTop:'24px' }}>{settings.website.replace(/^https?:\/\//, '')}</p>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'repeat(3, 1fr)', gap:'2px', overflow:'hidden' }}>
              {settings!.portfolio_photos!.slice(0, 6).map((url, i) => (
                <div key={i} style={{ overflow:'hidden', ...(i === 0 ? { gridRow:'span 2' } : {}) }}>
                  <img src={url} alt={`Obra ${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover', minHeight:'80px', display:'block' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            P4 — NOSSO PROCESSO (snake flow)
        ════════════════════════════════════════ */}
        {hasMethod && (() => {
          const allSteps = settings!.methodology_steps!
          const chunks: typeof allSteps[] = []
          for (let i = 0; i < allSteps.length; i += 3) chunks.push(allSteps.slice(i, i + 3))

          const ArrowRight = () => (
            <div style={{ display:'flex', alignItems:'center', flexShrink:0, padding:'0 3px' }}>
              <div style={{ width:'10px', height:'1.5px', background: brand }} />
              <div style={{ borderLeft:`7px solid ${brand}`, borderTop:'4px solid transparent', borderBottom:'4px solid transparent' }} />
            </div>
          )
          const ArrowLeft = () => (
            <div style={{ display:'flex', alignItems:'center', flexShrink:0, padding:'0 3px' }}>
              <div style={{ borderRight:`7px solid ${brand}`, borderTop:'4px solid transparent', borderBottom:'4px solid transparent' }} />
              <div style={{ width:'10px', height:'1.5px', background: brand }} />
            </div>
          )

          return (
            <div className="a4 print-break" style={{ marginTop:'24px', height:'297mm', display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ background:'#111827', padding:'10mm 18mm 8mm', flexShrink:0 }}>
                <p style={{ color: brand, fontSize:'9px', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', margin:'0 0 4px 0' }}>NOSSO TRABALHO</p>
                <h2 style={{ color:'white', fontWeight:900, fontSize:'28px', margin:0, lineHeight:1.05 }}>
                  {settings?.methodology_title ?? 'Nosso Processo'}
                </h2>
              </div>
              <div style={{ height:'4px', backgroundColor: brand, flexShrink:0 }} />
              <div style={{ flex:1, padding:'8mm 10mm', display:'flex', flexDirection:'column', gap:'0', overflow:'hidden', backgroundImage:'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize:'18px 18px' }}>
                {chunks.map((chunk, rowIdx) => {
                  const isReverse = rowIdx % 2 === 1
                  const displaySteps = isReverse ? [...chunk].reverse() : chunk
                  const fillerCount  = 3 - chunk.length
                  const fillersBefore = isReverse ? fillerCount : 0
                  const fillersAfter  = isReverse ? 0 : fillerCount
                  return (
                    <div key={rowIdx} style={{ display:'flex', flexDirection:'column', flex:1 }}>
                      <div style={{ display:'flex', alignItems:'stretch', flex:1 }}>
                        {Array.from({ length: fillersBefore }).map((_, i) => <div key={`fl-${i}`} style={{ flex:1 }} />)}
                        {displaySteps.flatMap((step, i) => [
                          i > 0 && (
                            <div key={`arr-${step.step}`} style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
                              {isReverse ? <ArrowLeft /> : <ArrowRight />}
                            </div>
                          ),
                          <div key={step.step} style={{ flex:1, background:'white', borderRadius:'10px', padding:'5mm 4mm 4mm', border:`1.5px solid #e5e7eb`, boxShadow:'0 2px 8px rgba(0,0,0,0.07)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'5px' }}>
                              <div style={{ width:'22px', height:'22px', borderRadius:'50%', backgroundColor: brand, color:'white', fontWeight:900, fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{step.step}</div>
                              <p style={{ fontWeight:800, fontSize:'9.5px', color:'#111827', margin:0, lineHeight:1.3, flex:1 }}>{step.title}</p>
                            </div>
                            <div style={{ height:'1.5px', background:`${brand}20`, marginBottom:'5px', borderRadius:'1px' }} />
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'3px', alignContent:'flex-start', flex:1 }}>
                              {step.items.map((item, j) => (
                                <span key={j} style={{ fontSize:'7.5px', color:'#374151', background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:'4px', padding:'2px 5px', lineHeight:1.5 }}>{item}</span>
                              ))}
                            </div>
                          </div>,
                        ])}
                        {Array.from({ length: fillersAfter }).map((_, i) => <div key={`fr-${i}`} style={{ flex:1 }} />)}
                      </div>
                      {rowIdx < chunks.length - 1 && (
                        <div style={{ height:'10mm', position:'relative', flexShrink:0 }}>
                          <div style={{ position:'absolute', top:0, bottom:0, ...(isReverse ? { left:'8px' } : { right:'8px' }), display:'flex', flexDirection:'column', alignItems:'center', width:'12px' }}>
                            <div style={{ flex:1, width:'1.5px', background: brand }} />
                            <div style={{ borderTop:`6px solid ${brand}`, borderLeft:'4px solid transparent', borderRight:'4px solid transparent', flexShrink:0 }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ padding:'4mm 18mm', borderTop:'1px solid #f3f4f6', flexShrink:0 }}>
                <span style={{ fontSize:'8px', color:'#d1d5db' }}>{settings?.website?.replace(/^https?:\/\//, '') ?? ''}</span>
              </div>
            </div>
          )
        })()}

        {/* ════════════════════════════════════════
            P5 — DETALHAMENTO
        ════════════════════════════════════════ */}
        {etapas.length > 0 && (
          <div className="a4 print-break" style={{ marginTop:'24px', minHeight:'297mm', display:'flex', flexDirection:'column' }}>
            {/* Header */}
            <div style={{ padding:'14mm 18mm 10mm', flexShrink:0 }}>
              <h2 style={{ fontSize:'42px', fontWeight:900, color:'#111827', margin:0, lineHeight:1.05 }}>Detalhamento</h2>
            </div>

            {/* Table */}
            <div style={{ flex:1, padding:'0 18mm 14mm', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                <thead>
                  <tr>
                    <th style={{ ...tableHeaderStyle, width:'38%', textAlign:'left', borderRight:'1px solid #374151' }}>Etapa</th>
                    <th style={{ ...tableHeaderStyle, textAlign:'left' }}>Serviços</th>
                  </tr>
                </thead>
                <tbody>
                  {etapas.map(([etapa, etapaItems], idx) => (
                    <tr key={idx}>
                      <td style={{ ...tableRowStyle(idx), fontWeight:700, color:'#111827', verticalAlign:'middle', borderRight:'1px solid #e5e7eb', textTransform:'uppercase', fontSize:'11px' }}>
                        {etapa}
                      </td>
                      <td style={{ ...tableRowStyle(idx), verticalAlign:'top' }}>
                        <ul style={{ margin:0, padding:'0 0 0 14px', display:'flex', flexDirection:'column', gap:'3px' }}>
                          {etapaItems.map((item, j) => (
                            <li key={j} style={{ fontSize:'11px', color:'#374151', lineHeight:1.4 }}>
                              {item.service_type ?? item.description ?? item.area_name}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding:'6mm 18mm', borderTop:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              {settings?.logo_url && <img src={settings.logo_url} alt="Logo" style={{ height:'22px', opacity:0.35 }} />}
              <span style={{ fontSize:'9px', color:'#d1d5db' }}>{settings?.name ?? ''}</span>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            P6 — INVESTIMENTO
        ════════════════════════════════════════ */}
        <div className="a4 print-break" style={{ marginTop:'24px', minHeight:'297mm', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14mm 18mm 10mm', flexShrink:0 }}>
            <h2 style={{ fontSize:'42px', fontWeight:900, color:'#111827', margin:0, lineHeight:1.05 }}>Investimento</h2>
          </div>

          <div style={{ flex:1, padding:'0 18mm 14mm', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr>
                  <th style={{ ...tableHeaderStyle }}>Serviços</th>
                </tr>
              </thead>
              <tbody>
                {serviceItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ ...tableRowStyle(idx), textAlign:'center', fontWeight: idx % 2 === 1 ? 700 : 500, textTransform:'uppercase', letterSpacing:'0.04em', color:'#111827' }}>
                      {item.area_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div style={{ marginTop:'24px', display:'grid', gridTemplateColumns:'1fr 1fr', borderRadius:'6px', overflow:'hidden' }}>
              <div style={{ background: brand, color:'white', fontWeight:900, fontSize:'16px', letterSpacing:'0.08em', padding:'14px 18px', textAlign:'center', textTransform:'uppercase' }}>
                TOTAL
              </div>
              <div style={{ background: brand, color:'white', fontWeight:900, fontSize:'16px', padding:'14px 18px', textAlign:'center', opacity:0.9 }}>
                {formatCurrency(totalFinal || proposal.value)}
              </div>
            </div>

            {bdiItems.length > 0 && (
              <p style={{ fontSize:'9px', color:'#9ca3af', marginTop:'8px', textAlign:'center' }}>
                Inclui {bdiItems.map(b => `${b.label} (${b.percentage}%)`).join(', ')}
              </p>
            )}
          </div>

          <div style={{ padding:'6mm 18mm', borderTop:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            {settings?.logo_url && <img src={settings.logo_url} alt="Logo" style={{ height:'22px', opacity:0.35 }} />}
            <span style={{ fontSize:'9px', color:'#d1d5db' }}>{proposal.proposal_number ?? ''}</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            P7 — REFERÊNCIAS
        ════════════════════════════════════════ */}
        {hasRefs && (
          <div className="a4 print-break" style={{ marginTop:'24px', minHeight:'297mm', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'14mm 18mm 10mm', flexShrink:0 }}>
              <h2 style={{ fontSize:'42px', fontWeight:900, color:'#111827', margin:0, lineHeight:1.05 }}>Referências</h2>
            </div>

            <div style={{ flex:1, padding:'0 18mm 14mm', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                <thead>
                  <tr>
                    <th style={{ ...tableHeaderStyle, borderRight:'1px solid #374151', width:'33%' }}>Nome</th>
                    <th style={{ ...tableHeaderStyle, borderRight:'1px solid #374151', width:'33%' }}>Empresa</th>
                    <th style={{ ...tableHeaderStyle, width:'34%' }}>Contato</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRefs.map((ref, idx) => (
                    <tr key={ref.id}>
                      <td style={{ ...tableRowStyle(idx), borderRight:'1px solid #e5e7eb', textAlign:'center', fontWeight: idx % 2 === 1 ? 600 : 400 }}>{ref.name}</td>
                      <td style={{ ...tableRowStyle(idx), borderRight:'1px solid #e5e7eb', textAlign:'center', fontWeight: idx % 2 === 1 ? 600 : 400 }}>{ref.company}</td>
                      <td style={{ ...tableRowStyle(idx), textAlign:'center', color:'#374151', fontWeight: idx % 2 === 1 ? 600 : 400 }}>{ref.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding:'6mm 18mm', borderTop:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              {settings?.logo_url && <img src={settings.logo_url} alt="Logo" style={{ height:'22px', opacity:0.35 }} />}
              <span style={{ fontSize:'9px', color:'#d1d5db' }}>{settings?.name ?? ''}</span>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            P8 — FORMA DE PAGAMENTO
        ════════════════════════════════════════ */}
        {hasPayment && (
          <div className="a4 print-break" style={{ marginTop:'24px', minHeight:'297mm', display:'flex', flexDirection:'column' }}>
            {/* Dark header */}
            <div style={{ background:'#111827', padding:'14mm 18mm 12mm', flexShrink:0 }}>
              <h2 style={{ color:'white', fontWeight:900, fontSize:'36px', margin:0, lineHeight:1.1 }}>Forma de<br />Pagamento</h2>
            </div>
            <div style={{ height:'4px', backgroundColor: brand, flexShrink:0 }} />

            <div style={{ flex:1, padding:'12mm 18mm', display:'flex', flexDirection:'column', gap:'10mm' }}>
              {proposal.payment_terms && (
                <div>
                  <p style={{ fontSize:'9px', fontWeight:700, color:'#9ca3af', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'10px' }}>Condições de Pagamento</p>
                  {proposal.payment_terms.split('\n').map((line, i) => {
                    const isHeader = line.includes(':') && line.split(':')[0].length < 40
                    return line.trim() ? (
                      <p key={i} style={{ fontSize: isHeader ? '13px' : '12px', fontWeight: isHeader ? 700 : 400, color: isHeader ? '#111827' : '#374151', margin:'0 0 6px', lineHeight:1.5 }}>
                        {line}
                      </p>
                    ) : <div key={i} style={{ height:'8px' }} />
                  })}
                </div>
              )}

              {proposal.client_notes && (
                <div>
                  <p style={{ fontSize:'9px', fontWeight:700, color:'#9ca3af', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'10px' }}>Observações</p>
                  <p style={{ color:'#4b5563', lineHeight:1.7, fontSize:'13px', marginBottom:'8px' }}>
                    {proposal.client_notes.split('\n')[0]}
                  </p>
                  {proposal.client_notes.split('\n').slice(1).filter(Boolean).map((line, i) => (
                    <p key={i} style={{ fontSize:'12px', color:'#374151', margin:'0 0 5px', lineHeight:1.5 }}>{line}</p>
                  ))}
                </div>
              )}

              {proposal.expires_at && (
                <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', padding:'10px 14px' }}>
                  <p style={{ fontSize:'12px', color:'#92400e', margin:0, fontWeight:600 }}>
                    Proposta válida até <strong>{fmtDate(proposal.expires_at)}</strong>
                  </p>
                </div>
              )}

              {/* Assinatura */}
              <div style={{ marginTop:'auto', paddingTop:'12mm', borderTop:'1px solid #f3f4f6' }}>
                <p style={{ fontSize:'9px', fontWeight:700, color:'#9ca3af', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'14mm' }}>Aceite da Proposta</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20mm' }}>
                  <div>
                    <div style={{ borderBottom:'1.5px solid #374151', marginBottom:'8px', height:'32px' }} />
                    <p style={{ fontSize:'12px', fontWeight:600, color:'#374151', margin:'0 0 3px' }}>{lead?.name ?? 'Cliente'}</p>
                    <p style={{ fontSize:'10px', color:'#9ca3af', margin:0 }}>Data: ____/____/________</p>
                  </div>
                  <div>
                    <div style={{ borderBottom:'1.5px solid #374151', marginBottom:'8px', height:'32px' }} />
                    <p style={{ fontSize:'12px', fontWeight:600, color:'#374151', margin:'0 0 3px' }}>{settings?.name ?? 'Empresa'}</p>
                    <p style={{ fontSize:'10px', color:'#9ca3af', margin:0 }}>{fmtDoc(settings?.document ?? null, settings?.document_type ?? null) ?? ''}</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding:'6mm 18mm', background:'#f9fafb', borderTop:'1px solid #f3f4f6', flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  {settings?.logo_url && <img src={settings.logo_url} alt="Logo" style={{ height:'24px', opacity:0.45 }} />}
                  <span style={{ fontSize:'10px', color:'#6b7280', fontWeight:600 }}>{settings?.name ?? ''}</span>
                </div>
                <div style={{ textAlign:'right' }}>
                  {fmtPhone(settings?.whatsapp ?? settings?.phone ?? null) && <p style={{ fontSize:'9px', color:'#9ca3af', margin:'0 0 1px' }}>{fmtPhone(settings?.whatsapp ?? settings?.phone ?? null)}</p>}
                  {settings?.email && <p style={{ fontSize:'9px', color:'#9ca3af', margin:0 }}>{settings.email}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            P9 — LAUDO TÉCNICO
        ════════════════════════════════════════ */}
        {hasLaudo && (
          <div className="a4 print-break" style={{ marginTop:'24px', minHeight:'297mm', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'14mm 18mm 2mm', flexShrink:0 }}>
              <p style={{ fontSize:'9px', fontWeight:700, color: brand, letterSpacing:'0.15em', textTransform:'uppercase', margin:'0 0 6px' }}>DOCUMENTO TÉCNICO</p>
              <h2 style={{ fontSize:'36px', fontWeight:900, color:'#111827', margin:'0 0 4mm', lineHeight:1.05 }}>Laudo Técnico</h2>
              <div style={{ height:'3px', width:'48px', backgroundColor: brand, borderRadius:'2px', marginBottom:'8mm' }} />
            </div>

            <div style={{ flex:1, padding:'0 18mm 14mm', overflow:'hidden' }}>
              <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'8mm', minHeight:'100px' }}>
                <p style={{ color:'#374151', lineHeight:1.8, fontSize:'12px', whiteSpace:'pre-line', margin:0 }}>
                  {proposal.laudo}
                </p>
              </div>
            </div>

            <div style={{ padding:'6mm 18mm', borderTop:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              {settings?.logo_url && <img src={settings.logo_url} alt="Logo" style={{ height:'22px', opacity:0.35 }} />}
              <span style={{ fontSize:'9px', color:'#d1d5db' }}>{settings?.name ?? ''}</span>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            P10 — MEMORIAL DESCRITIVO
        ════════════════════════════════════════ */}
        {hasMemorial && (
          <div className="a4 print-break" style={{ marginTop:'24px', minHeight:'297mm', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'14mm 18mm 2mm', flexShrink:0 }}>
              <p style={{ fontSize:'9px', fontWeight:700, color: brand, letterSpacing:'0.15em', textTransform:'uppercase', margin:'0 0 6px' }}>ESPECIFICAÇÃO</p>
              <h2 style={{ fontSize:'32px', fontWeight:900, color:'#111827', margin:'0 0 4mm', lineHeight:1.05 }}>Memorial Descritivo<br />de Materiais</h2>
              <div style={{ height:'3px', width:'48px', backgroundColor: brand, borderRadius:'2px', marginBottom:'8mm' }} />
            </div>

            <div style={{ flex:1, padding:'0 18mm 14mm', overflow:'hidden' }}>
              <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'8mm' }}>
                {proposal.memorial_descritivo!.split('\n').map((line, i) => {
                  const trimmed = line.trim()
                  if (!trimmed) return <div key={i} style={{ height:'6px' }} />
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'6px' }}>
                      <div style={{ width:'6px', height:'6px', borderRadius:'50%', backgroundColor: brand, flexShrink:0, marginTop:'5px' }} />
                      <p style={{ color:'#374151', fontSize:'12px', lineHeight:1.6, margin:0 }}>{trimmed}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ padding:'6mm 18mm', borderTop:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              {settings?.logo_url && <img src={settings.logo_url} alt="Logo" style={{ height:'22px', opacity:0.35 }} />}
              <span style={{ fontSize:'9px', color:'#d1d5db' }}>{settings?.name ?? ''}</span>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            P11 — MUITO OBRIGADO
        ════════════════════════════════════════ */}
        <div className="a4 a4-full print-break" style={{ marginTop:'24px' }}>
          {/* Foto de fundo */}
          {closingPhoto ? (
            <>
              <img src={closingPhoto} alt="Encerramento"
                style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%)' }} />
            </>
          ) : (
            <div style={{ position:'absolute', inset:0, background:`linear-gradient(140deg, #111827 0%, #1f2937 100%)` }} />
          )}

          {/* Faixa lateral brand color */}
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'8mm', backgroundColor: brand, zIndex:2 }} />

          {/* Card flutuante na parte inferior */}
          <div style={{ position:'relative', zIndex:3, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'0 18mm 16mm 22mm' }}>
            <div style={{ background:'white', borderRadius:'16px', padding:'10mm 10mm 8mm', boxShadow:'0 8px 40px rgba(0,0,0,0.25)', maxWidth:'140mm' }}>
              {/* Tag */}
              <div style={{ width:'32px', height:'3px', backgroundColor: brand, borderRadius:'2px', marginBottom:'6mm' }} />

              <h2 style={{ fontSize:'32px', fontWeight:900, color:'#111827', margin:'0 0 4mm', lineHeight:1.05 }}>Muito<br />Obrigado!</h2>

              {settings?.closing_message ? (
                <p style={{ color:'#4b5563', fontSize:'12px', lineHeight:1.7, marginBottom:'8mm', whiteSpace:'pre-line' }}>
                  {settings.closing_message}
                </p>
              ) : (
                <p style={{ color:'#4b5563', fontSize:'12px', lineHeight:1.7, marginBottom:'8mm' }}>
                  Estamos prontos para transformar seu projeto em realidade, cuidando de cada detalhe com a dedicação e qualidade que você merece.
                </p>
              )}

              {/* Empresa + contatos */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'10px', borderTop:'1px solid #f3f4f6', paddingTop:'6mm' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  {settings?.logo_url && (
                    <img src={settings.logo_url} alt="Logo" style={{ height:'36px', width:'auto', objectFit:'contain' }} />
                  )}
                  {!settings?.logo_url && settings?.name && (
                    <p style={{ fontWeight:900, fontSize:'13px', color:'#111827', margin:0 }}>{settings.name}</p>
                  )}
                </div>
                <div style={{ textAlign:'right' }}>
                  {settings?.email && (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'5px', marginBottom:'3px' }}>
                      <Mail style={{ width:'11px', height:'11px', color:'#9ca3af' }} />
                      <span style={{ fontSize:'10px', color:'#374151' }}>{settings.email}</span>
                    </div>
                  )}
                  {fmtPhone(settings?.whatsapp ?? settings?.phone ?? null) && (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'5px' }}>
                      <Phone style={{ width:'11px', height:'11px', color:'#9ca3af' }} />
                      <span style={{ fontSize:'10px', color:'#374151' }}>{fmtPhone(settings?.whatsapp ?? settings?.phone ?? null)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="no-print" style={{ height:'32px' }} />
      </div>
    </>
  )
}
