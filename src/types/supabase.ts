export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      app_media: {
        Row: {
          app_id: string;
          created_at: string;
          kind: string;
          label: string | null;
          position: number;
          storage_path: string;
        };
        Insert: {
          app_id: string;
          created_at?: string;
          kind: string;
          label?: string | null;
          position: number;
          storage_path: string;
        };
        Update: {
          app_id?: string;
          created_at?: string;
          kind?: string;
          label?: string | null;
          position?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'app_media_app_id_fkey';
            columns: ['app_id'];
            isOneToOne: false;
            referencedRelation: 'apps';
            referencedColumns: ['id'];
          },
        ];
      };
      app_prompts: {
        Row: {
          answer: string;
          app_id: string;
          created_at: string;
          prompt_id: string;
          slot: number;
        };
        Insert: {
          answer: string;
          app_id: string;
          created_at?: string;
          prompt_id: string;
          slot: number;
        };
        Update: {
          answer?: string;
          app_id?: string;
          created_at?: string;
          prompt_id?: string;
          slot?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'app_prompts_app_id_fkey';
            columns: ['app_id'];
            isOneToOne: false;
            referencedRelation: 'apps';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'app_prompts_prompt_id_fkey';
            columns: ['prompt_id'];
            isOneToOne: false;
            referencedRelation: 'prompts';
            referencedColumns: ['id'];
          },
        ];
      };
      apps: {
        Row: {
          builder_role: string | null;
          builder_style: string | null;
          category: string;
          cover_path: string | null;
          created_at: string;
          feedback_wanted: string[];
          hue: number;
          icon_path: string | null;
          id: string;
          ideal_users: Json;
          is_primary: boolean;
          layout: string[];
          links: Json;
          listed_until: string | null;
          name: string;
          owner_id: string;
          platform: string;
          published_at: string | null;
          shot_layout: string;
          slug: string;
          stage: string;
          store_url: string | null;
          subtitle: string;
          test_code: string | null;
          updated_at: string;
        };
        Insert: {
          builder_role?: string | null;
          builder_style?: string | null;
          category: string;
          cover_path?: string | null;
          created_at?: string;
          feedback_wanted?: string[];
          hue?: number;
          icon_path?: string | null;
          id?: string;
          ideal_users?: Json;
          is_primary?: boolean;
          layout?: string[];
          links?: Json;
          listed_until?: string | null;
          name: string;
          owner_id: string;
          platform?: string;
          published_at?: string | null;
          shot_layout?: string;
          slug?: string;
          stage: string;
          store_url?: string | null;
          subtitle?: string;
          test_code?: string | null;
          updated_at?: string;
        };
        Update: {
          builder_role?: string | null;
          builder_style?: string | null;
          category?: string;
          cover_path?: string | null;
          created_at?: string;
          feedback_wanted?: string[];
          hue?: number;
          icon_path?: string | null;
          id?: string;
          ideal_users?: Json;
          is_primary?: boolean;
          layout?: string[];
          links?: Json;
          listed_until?: string | null;
          name?: string;
          owner_id?: string;
          platform?: string;
          published_at?: string | null;
          shot_layout?: string;
          slug?: string;
          stage?: string;
          store_url?: string | null;
          subtitle?: string;
          test_code?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'apps_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apps_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      feedback: {
        Row: {
          app_id: string;
          best_moment: string | null;
          bug: string | null;
          bug_shot: string | null;
          confusion: string | null;
          created_at: string;
          from_user_id: string;
          helpful: string | null;
          id: string;
          keep: string | null;
          match_id: string;
          opt_in: boolean;
          price: string | null;
          stars: number;
          summary: string;
          to_user_id: string;
        };
        Insert: {
          app_id: string;
          best_moment?: string | null;
          bug?: string | null;
          bug_shot?: string | null;
          confusion?: string | null;
          created_at?: string;
          from_user_id: string;
          helpful?: string | null;
          id?: string;
          keep?: string | null;
          match_id: string;
          opt_in?: boolean;
          price?: string | null;
          stars: number;
          summary: string;
          to_user_id: string;
        };
        Update: {
          app_id?: string;
          best_moment?: string | null;
          bug?: string | null;
          bug_shot?: string | null;
          confusion?: string | null;
          created_at?: string;
          from_user_id?: string;
          helpful?: string | null;
          id?: string;
          keep?: string | null;
          match_id?: string;
          opt_in?: boolean;
          price?: string | null;
          stars?: number;
          summary?: string;
          to_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'feedback_app_id_fkey';
            columns: ['app_id'];
            isOneToOne: false;
            referencedRelation: 'apps';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_from_user_id_fkey';
            columns: ['from_user_id'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_from_user_id_fkey';
            columns: ['from_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_to_user_id_fkey';
            columns: ['to_user_id'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_to_user_id_fkey';
            columns: ['to_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      heys: {
        Row: {
          created_at: string;
          follow_up_at: string | null;
          follow_up_note: string | null;
          from_app_id: string;
          from_user_id: string;
          id: string;
          note: string | null;
          pass_reason: string | null;
          status: string;
          target_label: string;
          target_type: string;
          to_app_id: string;
          to_user_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          follow_up_at?: string | null;
          follow_up_note?: string | null;
          from_app_id: string;
          from_user_id: string;
          id?: string;
          note?: string | null;
          pass_reason?: string | null;
          status?: string;
          target_label?: string;
          target_type: string;
          to_app_id: string;
          to_user_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          follow_up_at?: string | null;
          follow_up_note?: string | null;
          from_app_id?: string;
          from_user_id?: string;
          id?: string;
          note?: string | null;
          pass_reason?: string | null;
          status?: string;
          target_label?: string;
          target_type?: string;
          to_app_id?: string;
          to_user_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'heys_from_app_id_fkey';
            columns: ['from_app_id'];
            isOneToOne: false;
            referencedRelation: 'apps';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'heys_from_user_id_fkey';
            columns: ['from_user_id'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'heys_from_user_id_fkey';
            columns: ['from_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'heys_to_app_id_fkey';
            columns: ['to_app_id'];
            isOneToOne: false;
            referencedRelation: 'apps';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'heys_to_user_id_fkey';
            columns: ['to_user_id'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'heys_to_user_id_fkey';
            columns: ['to_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      invite_codes: {
        Row: {
          code: string;
          created_at: string;
          expires_at: string | null;
          max_redemptions: number;
          owner_id: string | null;
          redemption_count: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          expires_at?: string | null;
          max_redemptions?: number;
          owner_id?: string | null;
          redemption_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          expires_at?: string | null;
          max_redemptions?: number;
          owner_id?: string | null;
          redemption_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'invite_codes_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invite_codes_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      invite_redemptions: {
        Row: {
          bonus_granted_at: string | null;
          code: string;
          id: string;
          invited_user_id: string;
          redeemed_at: string;
          referrer_id: string | null;
        };
        Insert: {
          bonus_granted_at?: string | null;
          code: string;
          id?: string;
          invited_user_id: string;
          redeemed_at?: string;
          referrer_id?: string | null;
        };
        Update: {
          bonus_granted_at?: string | null;
          code?: string;
          id?: string;
          invited_user_id?: string;
          redeemed_at?: string;
          referrer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invite_redemptions_code_fkey';
            columns: ['code'];
            isOneToOne: false;
            referencedRelation: 'invite_codes';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'invite_redemptions_invited_user_id_fkey';
            columns: ['invited_user_id'];
            isOneToOne: true;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invite_redemptions_invited_user_id_fkey';
            columns: ['invited_user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invite_redemptions_referrer_id_fkey';
            columns: ['referrer_id'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invite_redemptions_referrer_id_fkey';
            columns: ['referrer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      matches: {
        Row: {
          app_a: string;
          app_b: string;
          created_at: string;
          expires_at: string;
          hidden_by_a: boolean;
          hidden_by_b: boolean;
          id: string;
          last_message_at: string;
          reason: string | null;
          trade_a: string;
          trade_b: string;
          updated_at: string;
          user_a: string;
          user_b: string;
        };
        Insert: {
          app_a: string;
          app_b: string;
          created_at?: string;
          expires_at?: string;
          hidden_by_a?: boolean;
          hidden_by_b?: boolean;
          id?: string;
          last_message_at?: string;
          reason?: string | null;
          trade_a?: string;
          trade_b?: string;
          updated_at?: string;
          user_a: string;
          user_b: string;
        };
        Update: {
          app_a?: string;
          app_b?: string;
          created_at?: string;
          expires_at?: string;
          hidden_by_a?: boolean;
          hidden_by_b?: boolean;
          id?: string;
          last_message_at?: string;
          reason?: string | null;
          trade_a?: string;
          trade_b?: string;
          updated_at?: string;
          user_a?: string;
          user_b?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'matches_app_a_fkey';
            columns: ['app_a'];
            isOneToOne: false;
            referencedRelation: 'apps';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_app_b_fkey';
            columns: ['app_b'];
            isOneToOne: false;
            referencedRelation: 'apps';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_user_a_fkey';
            columns: ['user_a'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_user_a_fkey';
            columns: ['user_a'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_user_b_fkey';
            columns: ['user_b'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_user_b_fkey';
            columns: ['user_b'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string | null;
          created_at: string;
          feedback: Json | null;
          id: string;
          kind: string;
          match_id: string;
          media: Json;
          read_at: string | null;
          sender_id: string | null;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          feedback?: Json | null;
          id?: string;
          kind?: string;
          match_id: string;
          media?: Json;
          read_at?: string | null;
          sender_id?: string | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          feedback?: Json | null;
          id?: string;
          kind?: string;
          match_id?: string;
          media?: Json;
          read_at?: string | null;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      passes: {
        Row: {
          app_id: string;
          created_at: string;
          reason: string | null;
          user_id: string;
        };
        Insert: {
          app_id: string;
          created_at?: string;
          reason?: string | null;
          user_id: string;
        };
        Update: {
          app_id?: string;
          created_at?: string;
          reason?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'passes_app_id_fkey';
            columns: ['app_id'];
            isOneToOne: false;
            referencedRelation: 'apps';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'passes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'passes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          app_interests: string[];
          bonus_matches: number;
          created_at: string;
          display_pref: string;
          id: string;
          is_demo: boolean;
          job: string | null;
          life_tags: string[];
          links: Json;
          looking_for: string[];
          onboarded_at: string | null;
          own_words: Json;
          photo_url: string | null;
          plan: string;
          plan_expires_at: string | null;
          real_name: string | null;
          referral_code: string;
          referred_by: string | null;
          role_tags: string[];
          test_devices: string[];
          theme_pref: string;
          updated_at: string;
          username: string | null;
          visibility: Json;
          workplace: string | null;
        };
        Insert: {
          app_interests?: string[];
          bonus_matches?: number;
          created_at?: string;
          display_pref?: string;
          id: string;
          is_demo?: boolean;
          job?: string | null;
          life_tags?: string[];
          links?: Json;
          looking_for?: string[];
          onboarded_at?: string | null;
          own_words?: Json;
          photo_url?: string | null;
          plan?: string;
          plan_expires_at?: string | null;
          real_name?: string | null;
          referral_code: string;
          referred_by?: string | null;
          role_tags?: string[];
          test_devices?: string[];
          theme_pref?: string;
          updated_at?: string;
          username?: string | null;
          visibility?: Json;
          workplace?: string | null;
        };
        Update: {
          app_interests?: string[];
          bonus_matches?: number;
          created_at?: string;
          display_pref?: string;
          id?: string;
          is_demo?: boolean;
          job?: string | null;
          life_tags?: string[];
          links?: Json;
          looking_for?: string[];
          onboarded_at?: string | null;
          own_words?: Json;
          photo_url?: string | null;
          plan?: string;
          plan_expires_at?: string | null;
          real_name?: string | null;
          referral_code?: string;
          referred_by?: string | null;
          role_tags?: string[];
          test_devices?: string[];
          theme_pref?: string;
          updated_at?: string;
          username?: string | null;
          visibility?: Json;
          workplace?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_referred_by_fkey';
            columns: ['referred_by'];
            isOneToOne: false;
            referencedRelation: 'builders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profiles_referred_by_fkey';
            columns: ['referred_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      prompts: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          sort_order: number;
          tag: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          label: string;
          sort_order: number;
          tag: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          sort_order?: number;
          tag?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      builders: {
        Row: {
          app_interests: string[] | null;
          created_at: string | null;
          display_pref: string | null;
          id: string | null;
          job: string | null;
          life_tags: string[] | null;
          links: Json | null;
          looking_for: string[] | null;
          own_words: Json | null;
          photo_url: string | null;
          real_name: string | null;
          role_tags: string[] | null;
          username: string | null;
          workplace: string | null;
        };
        Insert: {
          app_interests?: string[] | null;
          created_at?: string | null;
          display_pref?: string | null;
          id?: string | null;
          job?: never;
          life_tags?: string[] | null;
          links?: Json | null;
          looking_for?: string[] | null;
          own_words?: Json | null;
          photo_url?: string | null;
          real_name?: never;
          role_tags?: string[] | null;
          username?: string | null;
          workplace?: never;
        };
        Update: {
          app_interests?: string[] | null;
          created_at?: string | null;
          display_pref?: string | null;
          id?: string | null;
          job?: never;
          life_tags?: string[] | null;
          links?: Json | null;
          looking_for?: string[] | null;
          own_words?: Json | null;
          photo_url?: string | null;
          real_name?: never;
          role_tags?: string[] | null;
          username?: string | null;
          workplace?: never;
        };
        Relationships: [];
      };
    };
    Functions: {
      demo_feedback: { Args: { p_match_id: string }; Returns: Json };
      demo_hey_me: { Args: never; Returns: Json };
      demo_reply: {
        Args: { p_body?: string; p_match_id: string };
        Returns: Json;
      };
      discover_deck: { Args: { p_limit?: number }; Returns: Json };
      follow_up_hey: {
        Args: { p_hey_id: string; p_note: string };
        Returns: Json;
      };
      hey_back: {
        Args: { p_from_app_id?: string; p_hey_id: string };
        Returns: Json;
      };
      hide_thread: { Args: { p_match_id: string }; Returns: Json };
      invite_code_status: { Args: { p_code: string }; Returns: Json };
      leave_feedback: {
        Args: {
          p_best_moment?: string;
          p_bug?: string;
          p_bug_shot?: string;
          p_confusion?: string;
          p_keep?: string;
          p_match_id: string;
          p_opt_in?: boolean;
          p_price?: string;
          p_stars: number;
          p_summary: string;
        };
        Returns: Json;
      };
      listing_by_slug: { Args: { p_slug: string }; Returns: Json };
      mark_thread_read: { Args: { p_match_id: string }; Returns: Json };
      my_counters: { Args: never; Returns: Json };
      my_feedback: { Args: never; Returns: Json };
      my_heys: { Args: never; Returns: Json };
      my_threads: { Args: never; Returns: Json };
      pass_hey: {
        Args: { p_hey_id: string; p_reason?: string };
        Returns: Json;
      };
      redeem_invite: { Args: { p_code: string }; Returns: Json };
      say_hey: {
        Args: {
          p_from_app_id: string;
          p_note?: string;
          p_target_label?: string;
          p_target_type?: string;
          p_to_app_id: string;
        };
        Returns: Json;
      };
      send_message: {
        Args: { p_body?: string; p_match_id: string; p_media?: Json };
        Returns: Json;
      };
      set_trade_status: {
        Args: { p_match_id: string; p_status: string };
        Returns: Json;
      };
      username_available: { Args: { p_username: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
