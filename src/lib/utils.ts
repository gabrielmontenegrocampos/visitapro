import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export const SOURCE_LABELS: Record<string, string> = {
  google_ads: 'Google Ads',
  indicacao: 'Indicação',
  site: 'Site',
  telefone: 'Telefone',
  outro: 'Outro',
}

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviada:  'Enviada',
  aceita:   'Aceita',
  recusada: 'Recusada',
  expirada: 'Expirada',
}

// Cores alinhadas com o pipeline (mesmos hex das pipeline_stages)
export const PROPOSAL_STATUS_CONFIG: Record<string, {
  badge: string   // classes Tailwind para o badge
  hex: string     // cor do pipeline correspondente
  pipelineSlug: string | null  // slug da stage que o lead deve ir
}> = {
  rascunho: { badge: 'bg-gray-100 text-gray-700',        hex: '#6b7280', pipelineSlug: null              },
  enviada:  { badge: 'bg-cyan-100 text-cyan-700',        hex: '#06b6d4', pipelineSlug: 'proposta_enviada' },
  aceita:   { badge: 'bg-emerald-100 text-emerald-700',  hex: '#10b981', pipelineSlug: 'fechado_ganho'    },
  recusada: { badge: 'bg-red-100 text-red-700',          hex: '#ef4444', pipelineSlug: 'fechado_perdido'  },
  expirada: { badge: 'bg-amber-100 text-amber-700',      hex: '#f59e0b', pipelineSlug: 'fechado_perdido'  },
}

export function whatsappUrl(phone: string | null | undefined) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${number}`
}

export function mapsUrl(parts: (string | null | undefined)[]) {
  const q = parts.filter(Boolean).join(', ')
  if (!q) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`
}

export const VISIT_STATUS_LABELS: Record<string, string> = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
  reagendada: 'Reagendada',
}
