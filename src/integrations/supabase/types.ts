export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_config: {
        Row: {
          id: string
          max_tokens: number | null
          model: string
          provider: string
          system_prompt: string | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          id: string
          max_tokens?: number | null
          model: string
          provider?: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          max_tokens?: number | null
          model?: string
          provider?: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_admins: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      content_experiments: {
        Row: {
          created_at: string
          dimension: string
          hypothesis: string | null
          id: string
          measured_at: string | null
          measured_engagement: number | null
          proposal_id: string | null
          variant: string
        }
        Insert: {
          created_at?: string
          dimension: string
          hypothesis?: string | null
          id?: string
          measured_at?: string | null
          measured_engagement?: number | null
          proposal_id?: string | null
          variant: string
        }
        Update: {
          created_at?: string
          dimension?: string
          hypothesis?: string | null
          id?: string
          measured_at?: string | null
          measured_engagement?: number | null
          proposal_id?: string | null
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_experiments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_advice: {
        Row: {
          advice_date: string
          content: string
          created_at: string | null
          evidence: Json | null
          id: string
        }
        Insert: {
          advice_date: string
          content: string
          created_at?: string | null
          evidence?: Json | null
          id?: string
        }
        Update: {
          advice_date?: string
          content?: string
          created_at?: string | null
          evidence?: Json | null
          id?: string
        }
        Relationships: []
      }
      dialogue_messages: {
        Row: {
          agent: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          session_id: string | null
          turn: number
        }
        Insert: {
          agent: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          turn?: number
        }
        Update: {
          agent?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          turn?: number
        }
        Relationships: [
          {
            foreignKeyName: "dialogue_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dialogue_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dialogue_sessions: {
        Row: {
          buyer_persona: string | null
          created_at: string | null
          final_proposal: string | null
          id: string
          metadata: Json | null
          status: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_persona?: string | null
          created_at?: string | null
          final_proposal?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_persona?: string | null
          created_at?: string | null
          final_proposal?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      doc_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: string | null
          embedding: string | null
          id: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          file_path: string
          file_type: string
          id: string
          processing_error: string | null
          processing_status: string
          title: string
          word_count: number | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          file_path: string
          file_type: string
          id?: string
          processing_error?: string | null
          processing_status?: string
          title: string
          word_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          file_path?: string
          file_type?: string
          id?: string
          processing_error?: string | null
          processing_status?: string
          title?: string
          word_count?: number | null
        }
        Relationships: []
      }
      historial_cache: {
        Row: {
          acciones_manuales: Json
          id: number
          posts: Json
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          acciones_manuales?: Json
          id?: number
          posts?: Json
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          acciones_manuales?: Json
          id?: number
          posts?: Json
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inbox_items: {
        Row: {
          account_id: string
          archived: boolean
          attachment_url: string | null
          author_is_follower: boolean | null
          author_name: string | null
          author_username: string | null
          direction: string
          external_id: string
          id: string
          item_time: string | null
          kind: string
          platform: string
          replied_at: string | null
          sentiment: string | null
          sentiment_note: string | null
          synced_at: string
          text: string | null
          thread_id: string
        }
        Insert: {
          account_id: string
          archived?: boolean
          attachment_url?: string | null
          author_is_follower?: boolean | null
          author_name?: string | null
          author_username?: string | null
          direction?: string
          external_id: string
          id?: string
          item_time?: string | null
          kind: string
          platform: string
          replied_at?: string | null
          sentiment?: string | null
          sentiment_note?: string | null
          synced_at?: string
          text?: string | null
          thread_id: string
        }
        Update: {
          account_id?: string
          archived?: boolean
          attachment_url?: string | null
          author_is_follower?: boolean | null
          author_name?: string | null
          author_username?: string | null
          direction?: string
          external_id?: string
          id?: string
          item_time?: string | null
          kind?: string
          platform?: string
          replied_at?: string | null
          sentiment?: string | null
          sentiment_note?: string | null
          synced_at?: string
          text?: string | null
          thread_id?: string
        }
        Relationships: []
      }
      inbox_sync_state: {
        Row: {
          id: number
          last_error: string | null
          last_synced_at: string | null
        }
        Insert: {
          id?: number
          last_error?: string | null
          last_synced_at?: string | null
        }
        Update: {
          id?: number
          last_error?: string | null
          last_synced_at?: string | null
        }
        Relationships: []
      }
      insight_feedback: {
        Row: {
          created_at: string | null
          id: string
          insight_id: string
          useful: boolean
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          insight_id: string
          useful: boolean
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          insight_id?: string
          useful?: boolean
          week_start?: string
        }
        Relationships: []
      }
      insights_cache: {
        Row: {
          generated_at: string | null
          id: string
          insights: Json
          model: string | null
          week_start: string
        }
        Insert: {
          generated_at?: string | null
          id?: string
          insights: Json
          model?: string | null
          week_start: string
        }
        Update: {
          generated_at?: string | null
          id?: string
          insights?: Json
          model?: string | null
          week_start?: string
        }
        Relationships: []
      }
      metrics: {
        Row: {
          clicks: number | null
          comments: number | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          likes: number | null
          measured_at: string | null
          post_id: string | null
          proposal_id: string | null
          reach: number | null
          saves: number | null
          shares: number | null
        }
        Insert: {
          clicks?: number | null
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          measured_at?: string | null
          post_id?: string | null
          proposal_id?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
        }
        Update: {
          clicks?: number | null
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          measured_at?: string | null
          post_id?: string | null
          proposal_id?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_comments: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          proposal_id: string
        }
        Insert: {
          author?: string
          body: string
          created_at?: string
          id?: string
          proposal_id: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_comments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          body: string
          buyer_persona: string | null
          created_at: string | null
          cta: string | null
          dimension: string | null
          format: string
          hashtags: string[] | null
          hook: string | null
          id: string
          instagram_post_id: string | null
          is_test: boolean
          metadata: Json | null
          oferta: string | null
          published_at: string | null
          rejection_reason: string | null
          rendered_image_path: string | null
          scheduled_at: string | null
          session_id: string | null
          status: string | null
          title: string
          zernio_post_id: string | null
        }
        Insert: {
          body: string
          buyer_persona?: string | null
          created_at?: string | null
          cta?: string | null
          dimension?: string | null
          format: string
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          instagram_post_id?: string | null
          is_test?: boolean
          metadata?: Json | null
          oferta?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          rendered_image_path?: string | null
          scheduled_at?: string | null
          session_id?: string | null
          status?: string | null
          title: string
          zernio_post_id?: string | null
        }
        Update: {
          body?: string
          buyer_persona?: string | null
          created_at?: string | null
          cta?: string | null
          dimension?: string | null
          format?: string
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          instagram_post_id?: string | null
          is_test?: boolean
          metadata?: Json | null
          oferta?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          rendered_image_path?: string | null
          scheduled_at?: string | null
          session_id?: string | null
          status?: string | null
          title?: string
          zernio_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dialogue_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      run_log: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          metadata: Json | null
          proposal_id: string | null
          source: string
          status: string
          step: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json | null
          proposal_id?: string | null
          source: string
          status: string
          step: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json | null
          proposal_id?: string | null
          source?: string
          status?: string
          step?: string
        }
        Relationships: []
      }
      success_rules: {
        Row: {
          action: Json
          condition: Json
          confidence: number | null
          created_at: string | null
          evidence: string | null
          id: string
          rule_type: string
          success_rate: number | null
          times_applied: number | null
          updated_at: string | null
        }
        Insert: {
          action: Json
          condition: Json
          confidence?: number | null
          created_at?: string | null
          evidence?: string | null
          id?: string
          rule_type: string
          success_rate?: number | null
          times_applied?: number | null
          updated_at?: string | null
        }
        Update: {
          action?: Json
          condition?: Json
          confidence?: number | null
          created_at?: string | null
          evidence?: string | null
          id?: string
          rule_type?: string
          success_rate?: number | null
          times_applied?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          created_at: string | null
          format: string
          id: string
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          format: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          format?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_app_admin: { Args: never; Returns: boolean }
      match_documents: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      scheduled_day_utc: { Args: { ts: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
