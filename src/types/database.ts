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
          role: 'admin' | 'vendedor'
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
          address: string | null
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
          description: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['proposal_items']['Row'], 'id' | 'total_price' | 'created_at'>
        Update: Partial<Database['public']['Tables']['proposal_items']['Insert']>
      }
      visits: {
        Row: {
          id: string
          lead_id: string
          assigned_to: string | null
          title: string
          description: string | null
          scheduled_at: string
          duration_minutes: number
          status: 'agendada' | 'realizada' | 'cancelada' | 'reagendada'
          address: string | null
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
export type ProposalItem = Database['public']['Tables']['proposal_items']['Row']
export type Visit = Database['public']['Tables']['visits']['Row']
export type Activity = Database['public']['Tables']['activities']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type DashboardMetrics = Database['public']['Views']['dashboard_metrics']['Row']

export type LeadWithStage = Lead & {
  pipeline_stages: PipelineStage | null
  profiles: Profile | null
}

export type VisitWithLead = Visit & {
  leads: Pick<Lead, 'id' | 'name' | 'phone' | 'address'> | null
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}
