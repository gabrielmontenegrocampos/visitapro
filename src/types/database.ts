export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          role: 'admin' | 'gerente' | 'vendedor' | 'financeiro' | 'encarregado'
          avatar_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      pipeline_stages: {
        Row: {
          id: string
          name: string
          slug: string
          color: string
          position: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['pipeline_stages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pipeline_stages']['Insert']>
      }
      leads: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          cep: string | null
          address: string | null
          number: string | null
          complement: string | null
          city: string | null
          neighborhood: string | null
          source: 'google_ads' | 'indicacao' | 'site' | 'telefone' | 'outro'
          stage_id: string | null
          assigned_to: string | null
          notes: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
      proposals: {
        Row: {
          id: string
          lead_id: string
          title: string
          description: string | null
          value: number
          status: 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'expirada'
          sent_at: string | null
          expires_at: string | null
          bdi_tax: number | null
          bdi_insurance: number | null
          bdi_profit: number | null
          public_token: string | null
          proposal_number: string | null
          payment_terms: string | null
          client_notes: string | null
          client_refs: Array<{ id: string; name: string; company: string; phone: string }> | null
          laudo: string | null
          memorial_descritivo: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['proposals']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['proposals']['Insert']>
      }
      proposal_items: {
        Row: {
          id: string
          proposal_id: string
          item_type: 'servico' | 'material' | 'equipamento' | null
          area_name: string | null
          service_type: string | null
          description: string | null
          unit: string | null
          quantity: number
          labor_cost: number
          material_cost: number
          equipment_cost: number
          unit_price: number
          total_price: number
          measurements: Array<{ id: string; label: string; height: number; width: number }> | null
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['proposal_items']['Row'], 'id' | 'total_price' | 'created_at'>
        Update: Partial<Database['public']['Tables']['proposal_items']['Insert']>
      }
      proposal_bdi_items: {
        Row: {
          id: string
          proposal_id: string
          label: string
          percentage: number
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['proposal_bdi_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['proposal_bdi_items']['Insert']>
      }
      company_settings: {
        Row: {
          id: string
          name: string | null
          legal_name: string | null
          document: string | null
          document_type: 'cpf' | 'cnpj' | null
          state_registration: string | null
          municipal_registration: string | null
          phone: string | null
          whatsapp: string | null
          email: string | null
          cep: string | null
          address: string | null
          number: string | null
          complement: string | null
          neighborhood: string | null
          city: string | null
          state: string | null
          website: string | null
          instagram: string | null
          facebook: string | null
          youtube: string | null
          tiktok: string | null
          logo_url: string | null
          brand_color: string | null
          about_text: string | null
          proposal_tagline: string | null
          cover_photo_url: string | null
          portfolio_photos: string[] | null
          client_names: string | null
          methodology_title: string | null
          methodology_steps: Array<{ step: number; title: string; items: string[] }> | null
          closing_message: string | null
          closing_photo_url: string | null
          client_refs: Array<{ id: string; name: string; company: string; phone: string }> | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Omit<Database['public']['Tables']['company_settings']['Row'], 'id' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<Database['public']['Tables']['company_settings']['Row'], 'id' | 'created_at' | 'updated_at'>>
      }
      visits: {
        Row: {
          id: string
          lead_id: string | null
          assigned_to: string | null
          title: string
          description: string | null
          scheduled_at: string
          duration_minutes: number
          status: 'agendada' | 'realizada' | 'cancelada' | 'reagendada'
          cep: string | null
          address: string | null
          number: string | null
          complement: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['visits']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['visits']['Insert']>
      }
      activities: {
        Row: {
          id: string
          lead_id: string
          user_id: string | null
          type: 'nota' | 'ligacao' | 'email' | 'whatsapp' | 'visita' | 'proposta' | 'status_change' | 'sistema'
          content: string
          metadata: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
      }
      messages: {
        Row: {
          id: string
          lead_id: string
          sender_id: string | null
          content: string
          read_by: string[] | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
    }
    Views: {
      dashboard_metrics: {
        Row: {
          total_leads: number
          propostas_enviadas: number
          propostas_fechadas: number
          propostas_recusadas: number
          valor_fechado: number
          valor_pipeline: number
          visitas_agendadas: number
          leads_mes_atual: number
        }
      }
    }
  }
}

// Tipos de conveniência
export type Profile = Database['public']['Tables']['profiles']['Row']
export type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']
export type Proposal = Database['public']['Tables']['proposals']['Row']
export type ProposalItem    = Database['public']['Tables']['proposal_items']['Row']
export type ProposalBdiItem = Database['public']['Tables']['proposal_bdi_items']['Row']
export type Visit = Database['public']['Tables']['visits']['Row']
export type Activity = Database['public']['Tables']['activities']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type DashboardMetrics = Database['public']['Views']['dashboard_metrics']['Row']
export type CompanySettings = Database['public']['Tables']['company_settings']['Row']

export type CategoriaFinanceira = {
  id: string
  nome: string
  tipo: 'receita' | 'despesa'
  divisao: 'administracao' | 'obra'
  ativo: boolean
  created_at: string
}

export type LancamentoFinanceiro = {
  id: string
  categoria_id: string
  tipo: 'receita' | 'despesa'
  divisao: 'administracao' | 'obra'
  descricao: string
  valor: number
  data: string
  status: 'pendente' | 'pago' | 'cancelado'
  projeto_id: string | null
  observacoes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type LancamentoWithCategoria = LancamentoFinanceiro & {
  categorias_financeiras: CategoriaFinanceira | null
  projetos_diario: { id: string; nome: string } | null
  profiles: Pick<Profile, 'id' | 'full_name'> | null
}

export type ProjetoComProposta = {
  id: string
  nome: string
  proposal_id: string | null
  proposals: {
    id: string
    title: string
    value: number
    status: string
    leads: { id: string; name: string; phone: string | null } | null
  } | null
}

export type ResultadoObra = {
  projeto: ProjetoComProposta
  valorOrcado: number
  receitas: number
  despesas: number
  resultado: number
  margem: number        // %
  desvio: number        // receitas - valorOrcado
  desvioPerc: number    // %
  lancamentos: LancamentoWithCategoria[]
}

export type LeadWithStage = Lead & {
  pipeline_stages: PipelineStage | null
  profiles: Profile | null
}

export type VisitWithLead = Visit & {
  leads: Pick<Lead, 'id' | 'name' | 'phone' | 'address'> | null
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}
