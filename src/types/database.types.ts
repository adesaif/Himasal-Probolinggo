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
  public: {
    Tables: {
      alumni: {
        Row: {
          alamat: string | null
          angkatan: number | null
          created_at: string
          id: string
          profile_id: string | null
          status_keanggotaan: string
          tanggal_lahir: string | null
          tempat_lahir: string | null
          updated_at: string
          wilayah_id: string | null
        }
        Insert: {
          alamat?: string | null
          angkatan?: number | null
          created_at?: string
          id?: string
          profile_id?: string | null
          status_keanggotaan?: string
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          updated_at?: string
          wilayah_id?: string | null
        }
        Update: {
          alamat?: string | null
          angkatan?: number | null
          created_at?: string
          id?: string
          profile_id?: string | null
          status_keanggotaan?: string
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          updated_at?: string
          wilayah_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_wilayah_id_fkey"
            columns: ["wilayah_id"]
            isOneToOne: false
            referencedRelation: "wilayah"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          alumni_id: string
          created_at: string
          event_id: string
          id: string
          notes: string | null
          recorded_by: string | null
          scanned_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alumni_id: string
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          scanned_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          alumni_id?: string
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          scanned_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_qr_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string
          expires_at: string
          id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_qr_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_qr_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendance_closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          id: string
          is_mandatory: boolean
          location: string | null
          start_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attendance_closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          is_mandatory?: boolean
          location?: string | null
          start_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attendance_closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          is_mandatory?: boolean
          location?: string | null
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_published: boolean
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_published?: boolean
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          alt_text: string
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          alt_text: string
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      masayikh: {
        Row: {
          created_at: string
          deskripsi: string | null
          display_order: number
          foto_url: string | null
          id: string
          is_active: boolean
          nama: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          display_order?: number
          foto_url?: string | null
          id?: string
          is_active?: boolean
          nama: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          display_order?: number
          foto_url?: string | null
          id?: string
          is_active?: boolean
          nama?: string
          updated_at?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          author_name: string | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          published_at: string | null
          slug: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          slug: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          slug?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_profile: {
        Row: {
          deskripsi: string | null
          id: string
          misi: string | null
          sejarah: string | null
          tujuan: string | null
          updated_at: string
          visi: string | null
        }
        Insert: {
          deskripsi?: string | null
          id?: string
          misi?: string | null
          sejarah?: string | null
          tujuan?: string | null
          updated_at?: string
          visi?: string | null
        }
        Update: {
          deskripsi?: string | null
          id?: string
          misi?: string | null
          sejarah?: string | null
          tujuan?: string | null
          updated_at?: string
          visi?: string | null
        }
        Relationships: []
      }
      organization_structure: {
        Row: {
          created_at: string
          display_order: number
          foto_url: string | null
          id: string
          is_active: boolean
          jabatan: string
          nama: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          foto_url?: string | null
          id?: string
          is_active?: boolean
          jabatan: string
          nama: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          foto_url?: string | null
          id?: string
          is_active?: boolean
          jabatan?: string
          nama?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          member_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          member_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          member_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          alamat: string | null
          email: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          maps_embed_url: string | null
          nama_organisasi: string | null
          tagline: string | null
          telepon: string | null
          tiktok_url: string | null
          updated_at: string
          whatsapp: string | null
          youtube_url: string | null
        }
        Insert: {
          alamat?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          maps_embed_url?: string | null
          nama_organisasi?: string | null
          tagline?: string | null
          telepon?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Update: {
          alamat?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          maps_embed_url?: string | null
          nama_organisasi?: string | null
          tagline?: string | null
          telepon?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      wilayah: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kode: string | null
          nama: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kode?: string | null
          nama: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kode?: string | null
          nama?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_close_event_attendance: {
        Args: { p_event_id: string }
        Returns: number
      }
      admin_generate_event_qr: {
        Args: { p_event_id: string; p_ttl_minutes?: number }
        Returns: {
          created_at: string
          created_by: string | null
          event_id: string
          expires_at: string
          id: string
          revoked_at: string | null
          token: string
        }
        SetofOptions: {
          from: "*"
          to: "event_qr_tokens"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_revoke_event_qr: { Args: { p_event_id: string }; Returns: number }
      admin_set_alumni_status: {
        Args: { p_alumni_id: string; p_status: string }
        Returns: {
          alamat: string | null
          angkatan: number | null
          created_at: string
          id: string
          profile_id: string | null
          status_keanggotaan: string
          tanggal_lahir: string | null
          tempat_lahir: string | null
          updated_at: string
          wilayah_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "alumni"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          member_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_alumni: {
        Args: {
          p_alamat?: string
          p_alumni_id: string
          p_angkatan?: number
          p_full_name?: string
          p_phone?: string
          p_tanggal_lahir?: string
          p_tempat_lahir?: string
          p_wilayah_id?: string
        }
        Returns: {
          alamat: string | null
          angkatan: number | null
          created_at: string
          id: string
          profile_id: string | null
          status_keanggotaan: string
          tanggal_lahir: string | null
          tempat_lahir: string | null
          updated_at: string
          wilayah_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "alumni"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      alumni_stats: {
        Args: never
        Returns: {
          aktif: number
          nonaktif: number
          total: number
        }[]
      }
      alumni_stats_by_wilayah: {
        Args: never
        Returns: {
          total: number
          wilayah_id: string
          wilayah_nama: string
        }[]
      }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      monitoring_available_years: {
        Args: never
        Returns: {
          year: number
        }[]
      }
      monitoring_overview: {
        Args: { p_event_id?: string; p_wilayah_id?: string; p_year?: number }
        Returns: {
          total_alumni_aktif: number
          total_alumni_nonaktif: number
          total_events: number
          total_hadir: number
          total_izin: number
          total_mandatory_events: number
          total_sakit: number
          total_tidak_hadir: number
        }[]
      }
      monitoring_period_stats: {
        Args: { p_event_id?: string; p_wilayah_id?: string; p_year?: number }
        Returns: {
          hadir: number
          izin: number
          month: number
          sakit: number
          tidak_hadir: number
          total_events: number
          total_mandatory_events: number
        }[]
      }
      monitoring_recent_events: {
        Args: { p_limit?: number; p_wilayah_id?: string; p_year?: number }
        Returns: {
          belum_absen: number
          hadir: number
          id: string
          is_mandatory: boolean
          izin: number
          sakit: number
          start_at: string
          status: string
          tidak_hadir: number
          title: string
        }[]
      }
      public_stats: {
        Args: never
        Returns: {
          total_alumni_aktif: number
          total_wilayah: number
        }[]
      }
      submit_attendance: {
        Args: { p_token: string }
        Returns: {
          alumni_id: string
          created_at: string
          event_id: string
          id: string
          notes: string | null
          recorded_by: string | null
          scanned_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_own_alumni_profile: {
        Args: {
          p_alamat?: string
          p_tanggal_lahir?: string
          p_tempat_lahir?: string
          p_wilayah_id?: string
        }
        Returns: {
          alamat: string | null
          angkatan: number | null
          created_at: string
          id: string
          profile_id: string | null
          status_keanggotaan: string
          tanggal_lahir: string | null
          tempat_lahir: string | null
          updated_at: string
          wilayah_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "alumni"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_own_profile: {
        Args: { p_avatar_url?: string; p_full_name?: string; p_phone?: string }
        Returns: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          member_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "alumni" | "admin" | "super_admin"
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
    Enums: {
      app_role: ["alumni", "admin", "super_admin"],
    },
  },
} as const
