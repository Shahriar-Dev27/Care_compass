// Generated: `supabase gen types typescript --project-id omxwrkxhslfitcailpbo`.
// Do not edit by hand — regenerate after every migration.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
  public: {
    Tables: {
      access_log: {
        Row: {
          at: string
          id: string
          user_id: string
          what: string
          who: string
        }
        Insert: {
          at?: string
          id?: string
          user_id: string
          what: string
          who: string
        }
        Update: {
          at?: string
          id?: string
          user_id?: string
          what?: string
          who?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          at: string
          created_at: string
          doctor_slug: string
          id: string
          insurance: string | null
          mode: string
          profile_id: string
          reason: string | null
          status: string
          summary: string | null
          user_id: string
        }
        Insert: {
          at: string
          created_at?: string
          doctor_slug: string
          id?: string
          insurance?: string | null
          mode: string
          profile_id: string
          reason?: string | null
          status?: string
          summary?: string | null
          user_id: string
        }
        Update: {
          at?: string
          created_at?: string
          doctor_slug?: string
          id?: string
          insurance?: string | null
          mode?: string
          profile_id?: string
          reason?: string | null
          status?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_doctor_slug_fkey'
            columns: ['doctor_slug']
            isOneToOne: false
            referencedRelation: 'doctors'
            referencedColumns: ['slug']
          },
          {
            foreignKeyName: 'appointments_user_id_profile_id_fkey'
            columns: ['user_id', 'profile_id']
            isOneToOne: false
            referencedRelation: 'patient_profiles'
            referencedColumns: ['user_id', 'id']
          },
        ]
      }
      doctors: {
        Row: {
          accessibility: string[]
          address: string | null
          ai_fit: string | null
          board_certified: string | null
          clinic_days: number[]
          credential: string
          distance: number | null
          education: string | null
          fee: number
          focus: string[]
          gender: string | null
          hours: string[]
          id: number
          in_person: boolean
          insurance: string[]
          languages: string[]
          name: string
          philosophy: string | null
          practice: string
          rating: number
          review_count: number
          reviews: Json
          slug: string
          specialty: string
          telehealth: boolean
          tint: string | null
          years: number
        }
        Insert: {
          accessibility?: string[]
          address?: string | null
          ai_fit?: string | null
          board_certified?: string | null
          clinic_days?: number[]
          credential: string
          distance?: number | null
          education?: string | null
          fee?: number
          focus?: string[]
          gender?: string | null
          hours?: string[]
          id: number
          in_person?: boolean
          insurance?: string[]
          languages?: string[]
          name: string
          philosophy?: string | null
          practice: string
          rating?: number
          review_count?: number
          reviews?: Json
          slug: string
          specialty: string
          telehealth?: boolean
          tint?: string | null
          years?: number
        }
        Update: {
          accessibility?: string[]
          address?: string | null
          ai_fit?: string | null
          board_certified?: string | null
          clinic_days?: number[]
          credential?: string
          distance?: number | null
          education?: string | null
          fee?: number
          focus?: string[]
          gender?: string | null
          hours?: string[]
          id?: number
          in_person?: boolean
          insurance?: string[]
          languages?: string[]
          name?: string
          philosophy?: string | null
          practice?: string
          rating?: number
          review_count?: number
          reviews?: Json
          slug?: string
          specialty?: string
          telehealth?: boolean
          tint?: string | null
          years?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          doctor_slug: string
          id: string
          sender: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          doctor_slug: string
          id?: string
          sender: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          doctor_slug?: string
          id?: string
          sender?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_doctor_slug_fkey'
            columns: ['doctor_slug']
            isOneToOne: false
            referencedRelation: 'doctors'
            referencedColumns: ['slug']
          },
        ]
      }
      patient_profiles: {
        Row: {
          allergies: string[]
          conditions: string[]
          created_at: string
          dob: string | null
          id: string
          insurance: string | null
          is_self: boolean
          medications: string[]
          member_id: string | null
          name: string
          relation: string
          user_id: string
        }
        Insert: {
          allergies?: string[]
          conditions?: string[]
          created_at?: string
          dob?: string | null
          id?: string
          insurance?: string | null
          is_self?: boolean
          medications?: string[]
          member_id?: string | null
          name: string
          relation?: string
          user_id: string
        }
        Update: {
          allergies?: string[]
          conditions?: string[]
          created_at?: string
          dob?: string | null
          id?: string
          insurance?: string | null
          is_self?: boolean
          medications?: string[]
          member_id?: string | null
          name?: string
          relation?: string
          user_id?: string
        }
        Relationships: []
      }
      user_prefs: {
        Row: {
          active_profile_id: string | null
          ai_suggestions: boolean
          dismissed: string[]
          follow_up: Json | null
          reminder_email: boolean
          reminder_push: boolean
          reminder_sms: boolean
          text_scale: string
          theme: string
          user_id: string
        }
        Insert: {
          active_profile_id?: string | null
          ai_suggestions?: boolean
          dismissed?: string[]
          follow_up?: Json | null
          reminder_email?: boolean
          reminder_push?: boolean
          reminder_sms?: boolean
          text_scale?: string
          theme?: string
          user_id: string
        }
        Update: {
          active_profile_id?: string | null
          ai_suggestions?: boolean
          dismissed?: string[]
          follow_up?: Json | null
          reminder_email?: boolean
          reminder_push?: boolean
          reminder_sms?: boolean
          text_scale?: string
          theme?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_prefs_user_id_active_profile_id_fkey'
            columns: ['user_id', 'active_profile_id']
            isOneToOne: false
            referencedRelation: 'patient_profiles'
            referencedColumns: ['user_id', 'id']
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          doctor_slug: string
          id: string
          profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doctor_slug: string
          id?: string
          profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          doctor_slug?: string
          id?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'waitlist_doctor_slug_fkey'
            columns: ['doctor_slug']
            isOneToOne: false
            referencedRelation: 'doctors'
            referencedColumns: ['slug']
          },
          {
            foreignKeyName: 'waitlist_user_id_profile_id_fkey'
            columns: ['user_id', 'profile_id']
            isOneToOne: false
            referencedRelation: 'patient_profiles'
            referencedColumns: ['user_id', 'id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      booked_slots: {
        Args: never
        Returns: {
          at: string
          doctor_slug: string
        }[]
      }
      log_access: { Args: { what: string; who: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
