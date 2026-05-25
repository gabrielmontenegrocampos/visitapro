export type AppRole = 'admin' | 'gerente' | 'vendedor' | 'financeiro' | 'encarregado'

export const ROLE_LABELS: Record<AppRole, string> = {
  admin:       'Administrador',
  gerente:     'Gerente',
  vendedor:    'Vendedor',
  financeiro:  'Financeiro',
  encarregado: 'Encarregado',
}

export const ROLE_COLORS: Record<AppRole, string> = {
  admin:       'bg-purple-100 text-purple-700',
  gerente:     'bg-blue-100 text-blue-700',
  vendedor:    'bg-green-100 text-green-700',
  financeiro:  'bg-amber-100 text-amber-700',
  encarregado: 'bg-orange-100 text-orange-700',
}

// ──────────────────────────────────────────────
// Permissões por módulo
// ──────────────────────────────────────────────

const P = {
  pipeline:          ['admin', 'gerente', 'vendedor'],
  leads:             ['admin', 'gerente', 'vendedor'],
  agenda:            ['admin', 'gerente', 'vendedor'],
  propostas_view:    ['admin', 'gerente', 'vendedor', 'financeiro', 'encarregado'],
  propostas_edit:    ['admin', 'gerente', 'vendedor'],
  diario_view:       ['admin', 'gerente', 'encarregado'],
  diario_edit:       ['admin', 'gerente', 'encarregado'],
  financeiro_view:   ['admin', 'gerente', 'financeiro'],
  financeiro_edit:   ['admin', 'gerente', 'financeiro'],
  equipe:            ['admin'],
  compras:           ['admin', 'gerente', 'financeiro', 'encarregado'],
  configuracoes_view:['admin', 'gerente'],
  configuracoes_edit:['admin'],
} as const

export function can(role: string, permission: keyof typeof P): boolean {
  return (P[permission] as readonly string[]).includes(role)
}

// Atalho: verificar se tem acesso à rota
export function canAccessRoute(role: string, href: string): boolean {
  const map: Record<string, keyof typeof P> = {
    '/pipeline':      'pipeline',
    '/leads':         'leads',
    '/agenda':        'agenda',
    '/propostas':     'propostas_view',
    '/diario-obra':   'diario_view',
    '/financeiro':    'financeiro_view',
    '/compras':       'compras',
    '/equipe':        'equipe',
    '/vendedores':    'equipe',
    '/configuracoes': 'configuracoes_view',
  }
  const perm = map[href]
  if (!perm) return true // dashboard e outros abertos
  return can(role, perm)
}
