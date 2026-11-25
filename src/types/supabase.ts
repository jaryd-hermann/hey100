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
      answer_shares: {
        Row: {
          created_at: string
          id: string
          message_id: string
          show_identity: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          show_identity?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          show_identity?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_shares_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bands: {
        Row: {
          id: string
          label: string
          max_cents: number | null
          midpoint_cents: number
          min_cents: number
          sort: number
        }
        Insert: {
          id: string
          label: string
          max_cents?: number | null
          midpoint_cents: number
          min_cents: number
          sort: number
        }
        Update: {
          id?: string
          label?: string
          max_cents?: number | null
          midpoint_cents?: number
          min_cents?: number
          sort?: number
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          message_id: string | null
          snapshot: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          message_id?: string | null
          snapshot: Json
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          message_id?: string | null
          snapshot?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_stats"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "bookmarks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          label: string
          short_label: string
          slug: string
          sort: number
        }
        Insert: {
          active?: boolean
          label: string
          short_label: string
          slug: string
          sort: number
        }
        Update: {
          active?: boolean
          label?: string
          short_label?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      category_changes: {
        Row: {
          created_at: string
          from_category: string | null
          id: string
          to_category: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_category?: string | null
          id?: string
          to_category: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_category?: string | null
          id?: string
          to_category?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_changes_from_category_fkey"
            columns: ["from_category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "category_changes_to_category_fkey"
            columns: ["to_category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "category_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_questions: {
        Row: {
          asked_by_user_id: string | null
          candidate_id: string | null
          edited_at: string | null
          group_id: string
          id: string
          published_at: string
          question_date: string
          source: string
          text: string
          theme: string | null
        }
        Insert: {
          asked_by_user_id?: string | null
          candidate_id?: string | null
          edited_at?: string | null
          group_id: string
          id?: string
          published_at?: string
          question_date: string
          source: string
          text: string
          theme?: string | null
        }
        Update: {
          asked_by_user_id?: string | null
          candidate_id?: string | null
          edited_at?: string | null
          group_id?: string
          id?: string
          published_at?: string
          question_date?: string
          source?: string
          text?: string
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_questions_asked_by_user_id_fkey"
            columns: ["asked_by_user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_questions_asked_by_user_id_fkey"
            columns: ["asked_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_questions_candidate_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "question_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_questions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_stats"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "daily_questions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_questions_theme_fkey"
            columns: ["theme"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["slug"]
          },
        ]
      }
      dm_media: {
        Row: {
          dm_message_id: string
          height: number | null
          id: string
          mime: string
          path: string
          sort: number
          width: number | null
        }
        Insert: {
          dm_message_id: string
          height?: number | null
          id?: string
          mime?: string
          path: string
          sort?: number
          width?: number | null
        }
        Update: {
          dm_message_id?: string
          height?: number | null
          id?: string
          mime?: string
          path?: string
          sort?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dm_media_dm_message_id_fkey"
            columns: ["dm_message_id"]
            isOneToOne: false
            referencedRelation: "dm_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_messages: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          hidden_at: string | null
          id: string
          quote_snapshot: Json | null
          quoted_message_id: string | null
          sender_id: string | null
          thread_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          quote_snapshot?: Json | null
          quoted_message_id?: string | null
          sender_id?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          quote_snapshot?: Json | null
          quoted_message_id?: string | null
          sender_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_quoted_message_id_fkey"
            columns: ["quoted_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_participants: {
        Row: {
          accepted_at: string | null
          hidden: boolean
          last_read_at: string | null
          muted: boolean
          thread_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          hidden?: boolean
          last_read_at?: string | null
          muted?: boolean
          thread_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          hidden?: boolean
          last_read_at?: string | null
          muted?: boolean
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_reactions: {
        Row: {
          created_at: string
          dm_message_id: string
          emoji: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dm_message_id: string
          emoji: string
          user_id: string
        }
        Update: {
          created_at?: string
          dm_message_id?: string
          emoji?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_reactions_dm_message_id_fkey"
            columns: ["dm_message_id"]
            isOneToOne: false
            referencedRelation: "dm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_official: boolean
          last_message_at: string
          status: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_official?: boolean
          last_message_at?: string
          status?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_official?: boolean
          last_message_at?: string
          status?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_threads_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_threads_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_threads_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_threads_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eavesdrops: {
        Row: {
          alerts: boolean
          created_at: string
          group_id: string
          in_tldr: boolean
          user_id: string
        }
        Insert: {
          alerts?: boolean
          created_at?: string
          group_id: string
          in_tldr?: boolean
          user_id: string
        }
        Update: {
          alerts?: boolean
          created_at?: string
          group_id?: string
          in_tldr?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eavesdrops_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_stats"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "eavesdrops_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eavesdrops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eavesdrops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_split_proposals: {
        Row: {
          band_id: string
          created_at: string
          id: string
          plan: Json
          resolved_at: string | null
          source_group_id: string
          status: string
        }
        Insert: {
          band_id: string
          created_at?: string
          id?: string
          plan: Json
          resolved_at?: string | null
          source_group_id: string
          status?: string
        }
        Update: {
          band_id?: string
          created_at?: string
          id?: string
          plan?: Json
          resolved_at?: string | null
          source_group_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_split_proposals_band_id_fkey"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_split_proposals_source_group_id_fkey"
            columns: ["source_group_id"]
            isOneToOne: false
            referencedRelation: "group_stats"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_split_proposals_source_group_id_fkey"
            columns: ["source_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          band_id: string
          category: string | null
          cohort: number
          created_at: string
          id: string
          kind: string
          parent_group_id: string | null
          split_at: string | null
          status: string
          timezone: string
        }
        Insert: {
          band_id: string
          category?: string | null
          cohort?: number
          created_at?: string
          id?: string
          kind?: string
          parent_group_id?: string | null
          split_at?: string | null
          status?: string
          timezone?: string
        }
        Update: {
          band_id?: string
          category?: string | null
          cohort?: number
          created_at?: string
          id?: string
          kind?: string
          parent_group_id?: string | null
          split_at?: string | null
          status?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_band_id_fkey"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "group_stats"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_redemptions: {
        Row: {
          code: string
          credits_granted: number
          id: string
          invitee_id: string
          inviter_id: string
          joined_at: string | null
          redeemed_at: string
        }
        Insert: {
          code: string
          credits_granted?: number
          id?: string
          invitee_id: string
          inviter_id: string
          joined_at?: string | null
          redeemed_at?: string
        }
        Update: {
          code?: string
          credits_granted?: number
          id?: string
          invitee_id?: string
          inviter_id?: string
          joined_at?: string | null
          redeemed_at?: string
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
            foreignKeyName: "invite_redemptions_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: true
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_redemptions_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_redemptions_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_redemptions_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          group_id: string
          is_primary: boolean
          joined_at: string
          last_read_at: string | null
          left_at: string | null
          left_reason: string | null
          muted: boolean
          user_id: string
        }
        Insert: {
          group_id: string
          is_primary?: boolean
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          left_reason?: string | null
          muted?: boolean
          user_id: string
        }
        Update: {
          group_id?: string
          is_primary?: boolean
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          left_reason?: string | null
          muted?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_stats"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_embeddings: {
        Row: {
          created_at: string
          embedding: string
          message_id: string
          model: string
        }
        Insert: {
          created_at?: string
          embedding: string
          message_id: string
          model: string
        }
        Update: {
          created_at?: string
          embedding?: string
          message_id?: string
          model?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_embeddings_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_media: {
        Row: {
          height: number | null
          id: string
          message_id: string
          mime: string
          path: string
          sort: number
          width: number | null
        }
        Insert: {
          height?: number | null
          id?: string
          message_id: string
          mime?: string
          path: string
          sort?: number
          width?: number | null
        }
        Update: {
          height?: number | null
          id?: string
          message_id?: string
          mime?: string
          path?: string
          sort?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "message_media_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_themes: {
        Row: {
          confidence: number | null
          created_at: string
          message_id: string
          subtopic: string | null
          theme: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          message_id: string
          subtopic?: string | null
          theme: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          message_id?: string
          subtopic?: string | null
          theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_themes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_themes_theme_fkey"
            columns: ["theme"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["slug"]
          },
        ]
      }
      messages: {
        Row: {
          also_in_group: boolean
          answered_late: boolean
          author_id: string | null
          body: string
          created_at: string
          day_question_id: string
          deleted_at: string | null
          edited_at: string | null
          group_id: string
          hidden_at: string | null
          hidden_by: string | null
          id: string
          kind: string
          parent_id: string | null
          quoted_message_id: string | null
        }
        Insert: {
          also_in_group?: boolean
          answered_late?: boolean
          author_id?: string | null
          body?: string
          created_at?: string
          day_question_id: string
          deleted_at?: string | null
          edited_at?: string | null
          group_id: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          kind: string
          parent_id?: string | null
          quoted_message_id?: string | null
        }
        Update: {
          also_in_group?: boolean
          answered_late?: boolean
          author_id?: string | null
          body?: string
          created_at?: string
          day_question_id?: string
          deleted_at?: string | null
          edited_at?: string | null
          group_id?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          kind?: string
          parent_id?: string | null
          quoted_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_day_question_id_fkey"
            columns: ["day_question_id"]
            isOneToOne: false
            referencedRelation: "daily_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_stats"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_quoted_message_id_fkey"
            columns: ["quoted_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          note: string | null
          report_id: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          report_id?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          report_id?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      peek_credit_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          invite_redemption_id: string | null
          peek_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          invite_redemption_id?: string | null
          peek_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          invite_redemption_id?: string | null
          peek_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peek_credit_ledger_peek_id_fkey"
            columns: ["peek_id"]
            isOneToOne: false
            referencedRelation: "peeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peek_credit_ledger_redemption_fkey"
            columns: ["invite_redemption_id"]
            isOneToOne: false
            referencedRelation: "invite_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peek_credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peek_credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      peeks: {
        Row: {
          created_at: string
          group_id: string
          id: string
          question_date: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          question_date: string
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          question_date?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peeks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_stats"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "peeks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peeks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peeks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          icon_path: string | null
          id: string
          name: string
          one_liner: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          icon_path?: string | null
          id?: string
          name: string
          one_liner?: string
          updated_at?: string
          url?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          icon_path?: string | null
          id?: string
          name?: string
          one_liner?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_consent_at: string | null
          avatar_path: string | null
          banned_at: string | null
          bio: string
          created_at: string
          id: string
          is_admin: boolean
          is_official: boolean
          last_active_at: string | null
          name: string
          notification_prefs: Json
          onboarded_at: string | null
          onboarding_step: string
          plan: string
          plan_expires_at: string | null
          primary_category: string | null
          show_exact_mrr: boolean
          socials: Json
          terms_accepted_at: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          ai_consent_at?: string | null
          avatar_path?: string | null
          banned_at?: string | null
          bio?: string
          created_at?: string
          id: string
          is_admin?: boolean
          is_official?: boolean
          last_active_at?: string | null
          name?: string
          notification_prefs?: Json
          onboarded_at?: string | null
          onboarding_step?: string
          plan?: string
          plan_expires_at?: string | null
          primary_category?: string | null
          show_exact_mrr?: boolean
          socials?: Json
          terms_accepted_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          ai_consent_at?: string | null
          avatar_path?: string | null
          banned_at?: string | null
          bio?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          is_official?: boolean
          last_active_at?: string | null
          name?: string
          notification_prefs?: Json
          onboarded_at?: string | null
          onboarding_step?: string
          plan?: string
          plan_expires_at?: string | null
          primary_category?: string | null
          show_exact_mrr?: boolean
          socials?: Json
          terms_accepted_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_primary_category_fkey"
            columns: ["primary_category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      question_bank: {
        Row: {
          active: boolean
          categories: string[] | null
          id: string
          max_band: string | null
          min_band: string | null
          text: string
          theme: string
          used_count: number
        }
        Insert: {
          active?: boolean
          categories?: string[] | null
          id?: string
          max_band?: string | null
          min_band?: string | null
          text: string
          theme: string
          used_count?: number
        }
        Update: {
          active?: boolean
          categories?: string[] | null
          id?: string
          max_band?: string | null
          min_band?: string | null
          text?: string
          theme?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_max_band_fkey"
            columns: ["max_band"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_min_band_fkey"
            columns: ["min_band"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_theme_fkey"
            columns: ["theme"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["slug"]
          },
        ]
      }
      question_candidates: {
        Row: {
          ai_rank: number | null
          ai_rationale: string | null
          ai_run_id: string | null
          author_user_id: string | null
          created_at: string
          for_date: string
          group_id: string
          hidden_at: string | null
          id: string
          pinned: boolean
          source: string
          status: string
          text: string
          theme: string | null
        }
        Insert: {
          ai_rank?: number | null
          ai_rationale?: string | null
          ai_run_id?: string | null
          author_user_id?: string | null
          created_at?: string
          for_date: string
          group_id: string
          hidden_at?: string | null
          id?: string
          pinned?: boolean
          source: string
          status?: string
          text: string
          theme?: string | null
        }
        Update: {
          ai_rank?: number | null
          ai_rationale?: string | null
          ai_run_id?: string | null
          author_user_id?: string | null
          created_at?: string
          for_date?: string
          group_id?: string
          hidden_at?: string | null
          id?: string
          pinned?: boolean
          source?: string
          status?: string
          text?: string
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_candidates_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_candidates_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_candidates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_stats"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "question_candidates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_candidates_theme_fkey"
            columns: ["theme"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["slug"]
          },
        ]
      }
      question_embeddings: {
        Row: {
          created_at: string
          daily_question_id: string
          embedding: string
          model: string
        }
        Insert: {
          created_at?: string
          daily_question_id: string
          embedding: string
          model: string
        }
        Update: {
          created_at?: string
          daily_question_id?: string
          embedding?: string
          model?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_embeddings_daily_question_id_fkey"
            columns: ["daily_question_id"]
            isOneToOne: true
            referencedRelation: "daily_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_votes: {
        Row: {
          candidate_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "question_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          action: string | null
          created_at: string
          id: string
          note: string | null
          reason: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject_user_id: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          id?: string
          note?: string | null
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject_user_id?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string | null
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject_user_id?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_checks: {
        Row: {
          band_id: string | null
          checked_at: string
          id: string
          mrr_cents: number | null
          provider: string
          user_id: string
        }
        Insert: {
          band_id?: string | null
          checked_at?: string
          id?: string
          mrr_cents?: number | null
          provider: string
          user_id: string
        }
        Update: {
          band_id?: string | null
          checked_at?: string
          id?: string
          mrr_cents?: number | null
          provider?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_checks_band_id_fkey"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_connections: {
        Row: {
          band_id: string | null
          below_band_since: string | null
          commits_90d: number | null
          error: string | null
          github_login: string | null
          grace_until: string | null
          is_fixture: boolean
          last_checked_at: string | null
          mrr_cents: number | null
          provider: string
          rc_project_id: string | null
          status: string
          subscriptions: number | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          band_id?: string | null
          below_band_since?: string | null
          commits_90d?: number | null
          error?: string | null
          github_login?: string | null
          grace_until?: string | null
          is_fixture?: boolean
          last_checked_at?: string | null
          mrr_cents?: number | null
          provider: string
          rc_project_id?: string | null
          status?: string
          subscriptions?: number | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          band_id?: string | null
          below_band_since?: string | null
          commits_90d?: number | null
          error?: string | null
          github_login?: string | null
          grace_until?: string | null
          is_fixture?: boolean
          last_checked_at?: string | null
          mrr_cents?: number | null
          provider?: string
          rc_project_id?: string | null
          status?: string
          subscriptions?: number | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_connections_band_id_fkey"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_oauth_states: {
        Row: {
          created_at: string
          provider: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_oauth_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_oauth_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_secrets: {
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
            foreignKeyName: "revenue_secrets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_secrets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_stats: {
        Row: {
          answer_count: number
          group_count: number
          hot: boolean
          insight: string | null
          period_end: string
          period_start: string
          theme: string
        }
        Insert: {
          answer_count?: number
          group_count?: number
          hot?: boolean
          insight?: string | null
          period_end: string
          period_start: string
          theme: string
        }
        Update: {
          answer_count?: number
          group_count?: number
          hot?: boolean
          insight?: string | null
          period_end?: string
          period_start?: string
          theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_stats_theme_fkey"
            columns: ["theme"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["slug"]
          },
        ]
      }
      themes: {
        Row: {
          blurb: string
          color: string
          label: string
          slug: string
          sort: number
        }
        Insert: {
          blurb: string
          color: string
          label: string
          slug: string
          sort: number
        }
        Update: {
          blurb?: string
          color?: string
          label?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      tldr_asks: {
        Row: {
          answer: string | null
          citations: Json
          conversation_id: string
          created_at: string
          id: string
          question: string
          suggestions: Json
          user_id: string
        }
        Insert: {
          answer?: string | null
          citations?: Json
          conversation_id: string
          created_at?: string
          id?: string
          question: string
          suggestions?: Json
          user_id: string
        }
        Update: {
          answer?: string | null
          citations?: Json
          conversation_id?: string
          created_at?: string
          id?: string
          question?: string
          suggestions?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tldr_asks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "tldr_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tldr_asks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tldr_asks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tldr_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tldr_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tldr_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tldr_items: {
        Row: {
          answer_count: number
          created_at: string
          daily_question_id: string | null
          excerpt: string | null
          group_id: string | null
          id: string
          kind: string
          message_id: string | null
          participant_mrr_cents: number
          period: string
          period_end: string
          period_start: string
          rank_score: number
          reply_count: number
          source_message_ids: string[]
          text: string
          theme: string | null
        }
        Insert: {
          answer_count?: number
          created_at?: string
          daily_question_id?: string | null
          excerpt?: string | null
          group_id?: string | null
          id?: string
          kind: string
          message_id?: string | null
          participant_mrr_cents?: number
          period: string
          period_end: string
          period_start: string
          rank_score?: number
          reply_count?: number
          source_message_ids?: string[]
          text: string
          theme?: string | null
        }
        Update: {
          answer_count?: number
          created_at?: string
          daily_question_id?: string | null
          excerpt?: string | null
          group_id?: string | null
          id?: string
          kind?: string
          message_id?: string | null
          participant_mrr_cents?: number
          period?: string
          period_end?: string
          period_start?: string
          rank_score?: number
          reply_count?: number
          source_message_ids?: string[]
          text?: string
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tldr_items_daily_question_id_fkey"
            columns: ["daily_question_id"]
            isOneToOne: false
            referencedRelation: "daily_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tldr_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_stats"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "tldr_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tldr_items_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tldr_items_theme_fkey"
            columns: ["theme"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["slug"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profile_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      group_stats: {
        Row: {
          answers_today: number | null
          combined_mrr_cents: number | null
          group_id: string | null
          label: string | null
          member_count: number | null
          peeks_today: number | null
        }
        Relationships: []
      }
      profile_cards: {
        Row: {
          avatar_path: string | null
          band_id: string | null
          bio: string | null
          created_at: string | null
          exact_mrr_cents: number | null
          id: string | null
          is_official: boolean | null
          name: string | null
          primary_category: string | null
          product_category: string | null
          product_icon_path: string | null
          product_name: string | null
          product_one_liner: string | null
          product_url: string | null
          revenue_provider: string | null
          socials: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_fkey"
            columns: ["product_category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "profiles_primary_category_fkey"
            columns: ["primary_category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Functions: {
      accept_terms: { Args: never; Returns: undefined }
      admin_claim_push_batch: { Args: { p_limit?: number }; Returns: Json }
      admin_mark_push: {
        Args: { p_id: string; p_reason?: string; p_status: string }
        Returns: undefined
      }
      admin_profile_for_push: { Args: { p_user_id: string }; Returns: Json }
      admin_scrub_user_content: { Args: { p_user: string }; Returns: Json }
      admin_set_push_config: {
        Args: { p_secret: string; p_url: string }
        Returns: undefined
      }
      invite_code_status: { Args: { p_code: string }; Returns: Json }
      me: { Args: never; Returns: Json }
      redeem_invite: { Args: { p_code: string }; Returns: Json }
      set_ai_consent: { Args: { p_consent: boolean }; Returns: undefined }
      touch_presence: { Args: { p_timezone?: string }; Returns: undefined }
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
