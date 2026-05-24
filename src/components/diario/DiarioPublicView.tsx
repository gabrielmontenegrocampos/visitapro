'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

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
  em_andamento: 'bg-amber-100 text-amber-700',
  concluindo: 'bg-green-100 text-green-700',
  paralisada: 'bg-red-100 text-red-700',
}
const ATIV_EMOJI: Record<string, string> = {
  feito: '✅', em_andamento: '🔄', pendente: '⏳',
}

interface Atividade { area: string; descricao: string; status: string }
interface Foto { url: string; legenda: string }
interface Registro {
  id: string; data: string; clima: string; status_obra: string;
  atividades: Atividade[] | null;
  notas_cliente: string | null;
  fotos: Foto[] | null;
}
interface Projeto {
  id: string; titulo_publico: string | null; created_at: string;
  proposals: { title: string; leads: { name: string; phone: string | null } | null } | null
}
interface Settings {
  name: string | null; logo_url: string | null;
  whatsapp: string | null; phone: string | null; brand_color: string | null
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export default function DiarioPublicView({
  projeto,
  registros,
  settings,
}: {
  projeto: Projeto
  registros: Registro[]
  settings: Settings | null
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const brand = settings?.brand_color || '#1d4ed8'
  const clientName = projeto.proposals?.leads?.name ?? '—'
  const propTitle = projeto.titulo_publico || projeto.proposals?.title || '—'

  // Progress
  const allAtiv = registros.flatMap(r => r.atividades ?? [])
  const donePct = allAtiv.length
    ? Math.round(allAtiv.filter(a => a.status === 'feito').length / allAtiv.length * 100)
    : 0

  const lastStatus = registros[0]?.status_obra ?? 'em_andamento'

  // WhatsApp link
  const phone = (settings?.whatsapp || settings?.phone || '').replace(/\D/g, '')
  const waLink = phone ? `https://wa.me/55${phone}` : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixo */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={settings.name ?? ''} className="h-9 w-auto object-contain" />
          ) : (
            <div
              className="h-9 px-3 rounded-xl flex items-center text-white text-sm font-bold"
              style={{ background: brand }}
            >
              {settings?.name?.slice(0, 2).toUpperCase() ?? 'VO'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">{clientName}</p>
            <p className="text-xs text-gray-500 truncate">{propTitle}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[lastStatus] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[lastStatus] ?? lastStatus}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Progress card */}
        {allAtiv.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800 text-sm">Progresso da Obra</span>
              <span
                className="text-lg font-bold"
                style={{ color: brand }}
              >
                {donePct}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${donePct}%`, background: brand }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {allAtiv.filter(a => a.status === 'feito').length} de {allAtiv.length} atividades concluídas
              · {registros.length} {registros.length === 1 ? 'dia registrado' : 'dias registrados'}
            </p>
          </div>
        )}

        {/* Registros */}
        {registros.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-semibold text-gray-700">Nenhum registro ainda</p>
            <p className="text-sm text-gray-400 mt-1">Os registros diários aparecerão aqui</p>
          </div>
        ) : (
          registros.map(reg => {
            const ativs = reg.atividades ?? []
            const fotosReg = reg.fotos ?? []
            const ativsVisiveis = ativs.filter(a => a.status !== 'pendente' || a.area)

            return (
              <div key={reg.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Card header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">
                      📅 {formatDateFull(reg.data)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {CLIMA_EMOJI[reg.clima] ?? '☀️'} {CLIMA_LABEL[reg.clima] ?? reg.clima}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[reg.status_obra] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[reg.status_obra] ?? reg.status_obra}
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Atividades */}
                  {ativsVisiveis.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Realizado hoje
                      </p>
                      <div className="space-y-1.5">
                        {ativsVisiveis.map((a, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-base shrink-0 leading-tight">{ATIV_EMOJI[a.status] ?? '•'}</span>
                            <span className="text-gray-700">
                              <span className="font-medium text-gray-900">{a.area}</span>
                              {a.descricao ? (
                                <span className="text-gray-500"> — {a.descricao}</span>
                              ) : null}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensagem da equipe */}
                  {reg.notas_cliente && reg.notas_cliente.trim() && (
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <p className="text-xs font-semibold text-amber-700 mb-1">💬 Mensagem da equipe</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{reg.notas_cliente}</p>
                    </div>
                  )}

                  {/* Fotos */}
                  {fotosReg.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        📸 Fotos do dia ({fotosReg.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {fotosReg.map((f, i) => (
                          <div key={i} className="space-y-1">
                            <div
                              className="aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
                              onClick={() => setLightboxUrl(f.url)}
                            >
                              <img
                                src={f.url}
                                alt={f.legenda || `Foto ${i + 1}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            {f.legenda && (
                              <p className="text-xs text-gray-500 text-center leading-tight">{f.legenda}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="" className="h-7 w-auto object-contain" />
            ) : null}
            <span className="text-xs text-gray-500 font-medium">{settings?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                style={{ background: '#25D366' }}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Falar conosco
              </a>
            )}
          </div>
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)', background: 'inherit' }} />
      </footer>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Foto"
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
