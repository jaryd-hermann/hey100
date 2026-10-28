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
      admin_dms: {
        Row: {
          body: string | null
          created_at: string
          from_admin: boolean
          id: string
          media: Json
          reply_to: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          from_admin: boolean
          id?: string
          media?: Json
          reply_to?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          from_admin?: boolean
          id?: string
          media?: Json
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_dms_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "admin_dms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_dms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_dms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_connection_secrets: {
        Row: {
          connection_id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          connection_id: string
          payload: Json
          updated_at?: string
        }
        Update: {
          connection_id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_connection_secrets_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "app_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      app_connections: {
        Row: {
          app_id: string
          badge: string
          checked_at: string
          created_at: string
          detail: string | null
          id: string
          label: string
          provider: string
          snapshot: Json
        }
        Insert: {
          app_id: string
          badge: string
          checked_at?: string
          created_at?: string
          detail?: string | null
          id?: string
          label: string
          provider: string
          snapshot?: Json
        }
        Update: {
          app_id?: string
          badge?: string
          checked_at?: string
          created_at?: string
          detail?: string | null
          id?: string
          label?: string
          provider?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_connections_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
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
      app_oauth_states: {
        Row: {
          app_id: string | null
          created_at: string
          id: string
          provider: string
          user_id: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          id?: string
          provider: string
          user_id: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          id?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
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
          badges: string[]
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
          onboarding: string
          owner_id: string
          pitch_path: string | null
          pitch_seconds: number | null
          platform: string
          price_from: string
          pricing_model: string
          problem_for: string
          problem_of: string
          published_at: string | null
          shot_layout: string
          slug: string
          stage: string
          store_rating: number | null
          store_rating_count: number | null
          store_url: string | null
          subtitle: string
          test_code: string | null
          updated_at: string
        }
        Insert: {
          badges?: string[]
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
          onboarding?: string
          owner_id: string
          pitch_path?: string | null
          pitch_seconds?: number | null
          platform?: string
          price_from?: string
          pricing_model?: string
          problem_for?: string
          problem_of?: string
          published_at?: string | null
          shot_layout?: string
          slug?: string
          stage: string
          store_rating?: number | null
          store_rating_count?: number | null
          store_url?: string | null
          subtitle?: string
          test_code?: string | null
          updated_at?: string
        }
        Update: {
          badges?: string[]
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
          onboarding?: string
          owner_id?: string
          pitch_path?: string | null
          pitch_seconds?: number | null
          platform?: string
          price_from?: string
          pricing_model?: string
          problem_for?: string
          problem_of?: string
          published_at?: string | null
          shot_layout?: string
          slug?: string
          stage?: string
          store_rating?: number | null
          store_rating_count?: number | null
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
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          broadcast_id: string | null
          created_at: string
          dm_id: string | null
          emoji: string
          id: string
          message_id: string | null
          user_id: string
        }
        Insert: {
          broadcast_id?: string | null
          created_at?: string
          dm_id?: string | null
          emoji: string
          id?: string
          message_id?: string | null
          user_id: string
        }
        Update: {
          broadcast_id?: string | null
          created_at?: string
          dm_id?: string | null
          emoji?: string
          id?: string
          message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "team_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "admin_dms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          app_id: string
          best_moment: string | null
          bug: string | null
          bug_shot: string | null
          confusion: string | null
          created_at: string
          from_user_id: string
          helpful: string | null
          id: string
          keep: string | null
          match_id: string
          opt_in: boolean
          price: string | null
          stars: number
          summary: string
          to_user_id: string
        }
        Insert: {
          app_id: string
          best_moment?: string | null
          bug?: string | null
          bug_shot?: string | null
          confusion?: string | null
          created_at?: string
          from_user_id: string
          helpful?: string | null
          id?: string
          keep?: string | null
          match_id: string
          opt_in?: boolean
          price?: string | null
          stars: number
          summary: string
          to_user_id: string
        }
        Update: {
          app_id?: string
          best_moment?: string | null
          bug?: string | null
          bug_shot?: string | null
          confusion?: string | null
          created_at?: string
          from_user_id?: string
          helpful?: string | null
          id?: string
          keep?: string | null
          match_id?: string
          opt_in?: boolean
          price?: string | null
          stars?: number
          summary?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      heys: {
        Row: {
          created_at: string
          follow_up_at: string | null
          follow_up_note: string | null
          from_app_id: string
          from_user_id: string
          id: string
          note: string | null
          pass_reason: string | null
          status: string
          target_label: string
          target_type: string
          to_app_id: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follow_up_at?: string | null
          follow_up_note?: string | null
          from_app_id: string
          from_user_id: string
          id?: string
          note?: string | null
          pass_reason?: string | null
          status?: string
          target_label?: string
          target_type: string
          to_app_id: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follow_up_at?: string | null
          follow_up_note?: string | null
          from_app_id?: string
          from_user_id?: string
          id?: string
          note?: string | null
          pass_reason?: string | null
          status?: string
          target_label?: string
          target_type?: string
          to_app_id?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "heys_from_app_id_fkey"
            columns: ["from_app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heys_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heys_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heys_to_app_id_fkey"
            columns: ["to_app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heys_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heys_to_user_id_fkey"
            columns: ["to_user_id"]
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
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "builders"
            referencedColumns: ["id"]
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
            referencedRelation: "builders"
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
      matches: {
        Row: {
          app_a: string
          app_b: string
          created_at: string
          expires_at: string
          hidden_by_a: boolean
          hidden_by_b: boolean
          id: string
          last_message_at: string
          reason: string | null
          share_code_a: string | null
          share_code_b: string | null
          share_url_a: string | null
          share_url_b: string | null
          trade_a: string
          trade_b: string
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          app_a: string
          app_b: string
          created_at?: string
          expires_at?: string
          hidden_by_a?: boolean
          hidden_by_b?: boolean
          id?: string
          last_message_at?: string
          reason?: string | null
          share_code_a?: string | null
          share_code_b?: string | null
          share_url_a?: string | null
          share_url_b?: string | null
          trade_a?: string
          trade_b?: string
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          app_a?: string
          app_b?: string
          created_at?: string
          expires_at?: string
          hidden_by_a?: boolean
          hidden_by_b?: boolean
          id?: string
          last_message_at?: string
          reason?: string | null
          share_code_a?: string | null
          share_code_b?: string | null
          share_url_a?: string | null
          share_url_b?: string | null
          trade_a?: string
          trade_b?: string
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_app_a_fkey"
            columns: ["app_a"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_app_b_fkey"
            columns: ["app_b"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          created_at: string
          feedback: Json | null
          id: string
          kind: string
          match_id: string
          media: Json
          read_at: string | null
          reply_to: string | null
          sender_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          kind?: string
          match_id: string
          media?: Json
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          kind?: string
          match_id?: string
          media?: Json
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      passes: {
        Row: {
          app_id: string
          created_at: string
          reason: string | null
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passes_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_secrets: {
        Row: {
          payload: Json
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          payload: Json
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          payload?: Json
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_secrets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_secrets_user_id_fkey"
            columns: ["user_id"]
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
          company_size: string | null
          created_at: string
          department: string | null
          display_pref: string
          github_commits: number | null
          github_login: string | null
          id: string
          industry: string | null
          is_admin: boolean
          is_demo: boolean
          job: string | null
          life_tags: string[]
          links: Json
          last_active_at: string | null
          looking_for: string[]
          notification_prefs: Json
          onboarded_at: string | null
          own_words: Json
          photo_url: string | null
          plan: string
          plan_expires_at: string | null
          real_name: string | null
          referral_code: string
          referred_by: string | null
          role_tags: string[]
          skills: string[]
          test_devices: string[]
          theme_pref: string
          timezone: string | null
          updated_at: string
          username: string | null
          visibility: Json
          welcome_dm_at: string | null
          workplace: string | null
          years_experience: string | null
        }
        Insert: {
          app_interests?: string[]
          bonus_matches?: number
          company_size?: string | null
          created_at?: string
          department?: string | null
          display_pref?: string
          github_commits?: number | null
          github_login?: string | null
          id: string
          industry?: string | null
          is_admin?: boolean
          is_demo?: boolean
          job?: string | null
          life_tags?: string[]
          links?: Json
          last_active_at?: string | null
          looking_for?: string[]
          notification_prefs?: Json
          onboarded_at?: string | null
          own_words?: Json
          photo_url?: string | null
          plan?: string
          plan_expires_at?: string | null
          real_name?: string | null
          referral_code: string
          referred_by?: string | null
          role_tags?: string[]
          skills?: string[]
          test_devices?: string[]
          theme_pref?: string
          timezone?: string | null
          updated_at?: string
          username?: string | null
          visibility?: Json
          welcome_dm_at?: string | null
          workplace?: string | null
          years_experience?: string | null
        }
        Update: {
          app_interests?: string[]
          bonus_matches?: number
          company_size?: string | null
          created_at?: string
          department?: string | null
          display_pref?: string
          github_commits?: number | null
          github_login?: string | null
          id?: string
          industry?: string | null
          is_admin?: boolean
          is_demo?: boolean
          job?: string | null
          life_tags?: string[]
          links?: Json
          last_active_at?: string | null
          looking_for?: string[]
          notification_prefs?: Json
          onboarded_at?: string | null
          own_words?: Json
          photo_url?: string | null
          plan?: string
          plan_expires_at?: string | null
          real_name?: string | null
          referral_code?: string
          referred_by?: string | null
          role_tags?: string[]
          skills?: string[]
          test_devices?: string[]
          theme_pref?: string
          timezone?: string | null
          updated_at?: string
          username?: string | null
          visibility?: Json
          welcome_dm_at?: string | null
          workplace?: string | null
          years_experience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
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
      sponsored_tool_votes: {
        Row: {
          tool_id: string
          updated_at: string
          user_id: string
          vote: number
        }
        Insert: {
          tool_id: string
          updated_at?: string
          user_id: string
          vote: number
        }
        Update: {
          tool_id?: string
          updated_at?: string
          user_id?: string
          vote?: number
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_tool_votes_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "sponsored_tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_tool_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_tool_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_tools: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          logo_url: string
          name: string
          sort_order: number
          subtitle: string
          url: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          logo_url?: string
          name: string
          sort_order?: number
          subtitle?: string
          url: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          logo_url?: string
          name?: string
          sort_order?: number
          subtitle?: string
          url?: string
        }
        Relationships: []
      }
      team_broadcasts: {
        Row: {
          body: string | null
          created_at: string
          id: string
          media: Json
          reply_to: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          media?: Json
          reply_to?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          media?: Json
          reply_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_broadcasts_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "team_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      builders: {
        Row: {
          app_interests: string[] | null
          created_at: string | null
          display_pref: string | null
          github_commits: number | null
          github_login: string | null
          id: string | null
          job: string | null
          life_tags: string[] | null
          links: Json | null
          looking_for: string[] | null
          own_words: Json | null
          photo_url: string | null
          real_name: string | null
          role_tags: string[] | null
          skills: string[] | null
          username: string | null
          workplace: string | null
        }
        Insert: {
          app_interests?: string[] | null
          created_at?: string | null
          display_pref?: string | null
          github_commits?: number | null
          github_login?: string | null
          id?: string | null
          job?: never
          life_tags?: string[] | null
          links?: Json | null
          looking_for?: string[] | null
          own_words?: Json | null
          photo_url?: string | null
          real_name?: never
          role_tags?: string[] | null
          skills?: string[] | null
          username?: string | null
          workplace?: never
        }
        Update: {
          app_interests?: string[] | null
          created_at?: string | null
          display_pref?: string | null
          github_commits?: number | null
          github_login?: string | null
          id?: string | null
          job?: never
          life_tags?: string[] | null
          links?: Json | null
          looking_for?: string[] | null
          own_words?: Json | null
          photo_url?: string | null
          real_name?: never
          role_tags?: string[] | null
          skills?: string[] | null
          username?: string | null
          workplace?: never
        }
        Relationships: []
      }
    }
    Functions: {
      demo_feedback: { Args: { p_match_id: string }; Returns: Json }
      demo_hey_me: { Args: never; Returns: Json }
      demo_reply: {
        Args: { p_body?: string; p_match_id: string }
        Returns: Json
      }
      discover_deck: {
        Args: { p_limit?: number; p_sort?: string }
        Returns: Json
      }
      ensure_official_builders_group: { Args: never; Returns: string | null }
      follow_up_hey: {
        Args: { p_hey_id: string; p_note: string }
        Returns: Json
      }
      group_by_id: { Args: { p_id: string }; Returns: Json }
      hey_back: {
        Args: { p_from_app_id?: string; p_hey_id: string }
        Returns: Json
      }
      hide_thread: { Args: { p_match_id: string }; Returns: Json }
      invite_code_status: { Args: { p_code: string }; Returns: Json }
      leave_feedback: {
        Args: {
          p_best_moment?: string
          p_bug?: string
          p_bug_shot?: string
          p_confusion?: string
          p_keep?: string
          p_match_id: string
          p_opt_in?: boolean
          p_price?: string
          p_stars: number
          p_summary: string
        }
        Returns: Json
      }
      listing_by_slug: { Args: { p_slug: string }; Returns: Json }
      mark_thread_read: { Args: { p_match_id: string }; Returns: Json }
      my_counters: { Args: never; Returns: Json }
      my_feedback: { Args: never; Returns: Json }
      my_heys: { Args: never; Returns: Json }
      my_threads: { Args: never; Returns: Json }
      pass_hey: { Args: { p_hey_id: string; p_reason?: string }; Returns: Json }
      redeem_invite: { Args: { p_code: string }; Returns: Json }
      record_profile_view: { Args: { p_listing_id: string }; Returns: undefined }
      my_profile_view_count: { Args: never; Returns: number }
      touch_presence: { Args: { p_timezone?: string }; Returns: undefined }
      say_hey: {
        Args: {
          p_from_app_id: string
          p_note?: string
          p_target_label?: string
          p_target_type?: string
          p_to_app_id: string
        }
        Returns: Json
      }
      send_message:
        | {
            Args: { p_body?: string; p_match_id: string; p_media?: Json }
            Returns: Json
          }
        | {
            Args: {
              p_body?: string
              p_match_id: string
              p_media?: Json
              p_reply_to?: string
            }
            Returns: Json
          }
      community_home_payload: { Args: never; Returns: Json }
      match_messages: { Args: { p_match_id: string }; Returns: Json }
      set_match_share: {
        Args: { p_code?: string | null; p_match_id: string; p_url?: string | null }
        Returns: Json
      }
      set_trade_status: {
        Args: { p_match_id: string; p_status: string }
        Returns: Json
      }
      username_available: { Args: { p_username: string }; Returns: boolean }
      sponsored_tool_vote_tallies: {
        Args: never
        Returns: { down: number; tool_id: string; up: number }[]
      }
      vote_sponsored_tool: {
        Args: { p_tool_id: string; p_vote: number }
        Returns: undefined
      }
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
