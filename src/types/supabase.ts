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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_media: {
        Row: {
          app_id: string
          created_at: string
          kind: string
          label: string | null
          position: number
          storage_path: string
        }
        Insert: {
          app_id: string
          created_at?: string
          kind: string
          label?: string | null
          position: number
          storage_path: string
        }
        Update: {
          app_id?: string
          created_at?: string
          kind?: string
          label?: string | null
          position?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_media_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_prompts: {
        Row: {
          answer: string
          app_id: string
          created_at: string
          prompt_id: string
          slot: number
        }
        Insert: {
          answer: string
          app_id: string
          created_at?: string
          prompt_id: string
          slot: number
        }
        Update: {
          answer?: string
          app_id?: string
          created_at?: string
          prompt_id?: string
          slot?: number
        }
        Relationships: [
          {
            foreignKeyName: "app_prompts_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_prompts_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          builder_role: string | null
          builder_style: string | null
          category: string
          cover_path: string | null
          created_at: string
          feedback_wanted: string[]
          hue: number
          icon_path: string | null
          id: string
          ideal_users: Json
          is_primary: boolean
          layout: string[]
          links: Json
          listed_until: string | null
          name: string
          owner_id: string
          platform: string
          published_at: string | null
          shot_layout: string
          slug: string
          stage: string
          store_url: string | null
          subtitle: string
          test_code: string | null
          updated_at: string
        }
        Insert: {
          builder_role?: string | null
          builder_style?: string | null
          category: string
          cover_path?: string | null
          created_at?: string
          feedback_wanted?: string[]
          hue?: number
          icon_path?: string | null
          id?: string
          ideal_users?: Json
          is_primary?: boolean
          layout?: string[]
          links?: Json
          listed_until?: string | null
          name: string
          owner_id: string
          platform?: string
          published_at?: string | null
          shot_layout?: string
          slug?: string
          stage: string
          store_url?: string | null
          subtitle?: string
          test_code?: string | null
          updated_at?: string
        }
        Update: {
          builder_role?: string | null
          builder_style?: string | null
          category?: string
          cover_path?: string | null
          created_at?: string
          feedback_wanted?: string[]
          hue?: number
          icon_path?: string | null
          id?: string
          ideal_users?: Json
          is_primary?: boolean
          layout?: string[]
          links?: Json
          listed_until?: string | null
          name?: string
          owner_id?: string
          platform?: string
          published_at?: string | null
          shot_layout?: string
          slug?: string
          stage?: string
          store_url?: string | null
          subtitle?: string
          test_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          max_redemptions: number
          owner_id: string | null
          redemption_count: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          max_redemptions?: number
          owner_id?: string | null
          redemption_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          max_redemptions?: number
          owner_id?: string | null
          redemption_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_redemptions: {
        Row: {
          bonus_granted_at: string | null
          code: string
          id: string
          invited_user_id: string
          redeemed_at: string
          referrer_id: string | null
        }
        Insert: {
          bonus_granted_at?: string | null
          code: string
          id?: string
          invited_user_id: string
          redeemed_at?: string
          referrer_id?: string | null
        }
        Update: {
          bonus_granted_at?: string | null
          code?: string
          id?: string
          invited_user_id?: string
          redeemed_at?: string
          referrer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_redemptions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invite_redemptions_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_redemptions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          app_interests: string[]
          bonus_matches: number
          created_at: string
          display_pref: string
          id: string
          job: string | null
          life_tags: string[]
          links: Json
          looking_for: string[]
          onboarded_at: string | null
          own_words: Json
          photo_url: string | null
          plan: string
          plan_expires_at: string | null
          real_name: string | null
          referral_code: string
          referred_by: string | null
          role_tags: string[]
          test_devices: string[]
          theme_pref: string
          updated_at: string
          username: string | null
          visibility: Json
          workplace: string | null
        }
        Insert: {
          app_interests?: string[]
          bonus_matches?: number
          created_at?: string
          display_pref?: string
          id: string
          job?: string | null
          life_tags?: string[]
          links?: Json
          looking_for?: string[]
          onboarded_at?: string | null
          own_words?: Json
          photo_url?: string | null
          plan?: string
          plan_expires_at?: string | null
          real_name?: string | null
          referral_code: string
          referred_by?: string | null
          role_tags?: string[]
          test_devices?: string[]
          theme_pref?: string
          updated_at?: string
          username?: string | null
          visibility?: Json
          workplace?: string | null
        }
        Update: {
          app_interests?: string[]
          bonus_matches?: number
          created_at?: string
          display_pref?: string
          id?: string
          job?: string | null
          life_tags?: string[]
          links?: Json
          looking_for?: string[]
          onboarded_at?: string | null
          own_words?: Json
          photo_url?: string | null
          plan?: string
          plan_expires_at?: string | null
          real_name?: string | null
          referral_code?: string
          referred_by?: string | null
          role_tags?: string[]
          test_devices?: string[]
          theme_pref?: string
          updated_at?: string
          username?: string | null
          visibility?: Json
          workplace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          tag: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          label: string
          sort_order: number
          tag: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          tag?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      invite_code_status: { Args: { p_code: string }; Returns: Json }
      redeem_invite: { Args: { p_code: string }; Returns: Json }
      username_available: { Args: { p_username: string }; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
