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
      client_units: {
        Row: {
          active: boolean
          address: string | null
          billing_notes: string | null
          city: string | null
          client_id: string
          cnpj: string | null
          created_at: string
          created_by: string
          default_displacement_rate_cents: number | null
          default_displacement_type: string | null
          distance_km_from_base: number | null
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          phone: string | null
          responsible_name: string | null
          sector: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          billing_notes?: string | null
          city?: string | null
          client_id: string
          cnpj?: string | null
          created_at?: string
          created_by: string
          default_displacement_rate_cents?: number | null
          default_displacement_type?: string | null
          distance_km_from_base?: number | null
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          responsible_name?: string | null
          sector?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          billing_notes?: string | null
          city?: string | null
          client_id?: string
          cnpj?: string | null
          created_at?: string
          created_by?: string
          default_displacement_rate_cents?: number | null
          default_displacement_type?: string | null
          distance_km_from_base?: number | null
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          responsible_name?: string | null
          sector?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_units_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          responsible_name: string | null
          segment: string | null
          state: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          responsible_name?: string | null
          segment?: string | null
          state?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          responsible_name?: string | null
          segment?: string | null
          state?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_order_attachments: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          created_by: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          service_order_id: string
          technician_id: string | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          service_order_id: string
          technician_id?: string | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          service_order_id?: string
          technician_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_attachments_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_attachments_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_financials: {
        Row: {
          created_at: string
          displacement_count: number
          displacement_km_total: number
          displacement_notes: string | null
          displacement_rate_cents: number
          displacement_total_cents: number
          displacement_type: Database["public"]["Enums"]["displacement_type"]
          finalized_at: string | null
          finalized_by: string | null
          grand_total_cents: number
          labor_entries_adjusted_at: string | null
          labor_entries_adjusted_by: string | null
          materials_total_cents: number
          notes: string | null
          service_order_id: string
          total_labor_cents: number
          total_labor_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          displacement_count?: number
          displacement_km_total?: number
          displacement_notes?: string | null
          displacement_rate_cents?: number
          displacement_total_cents?: number
          displacement_type?: Database["public"]["Enums"]["displacement_type"]
          finalized_at?: string | null
          finalized_by?: string | null
          grand_total_cents?: number
          labor_entries_adjusted_at?: string | null
          labor_entries_adjusted_by?: string | null
          materials_total_cents?: number
          notes?: string | null
          service_order_id: string
          total_labor_cents?: number
          total_labor_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          displacement_count?: number
          displacement_km_total?: number
          displacement_notes?: string | null
          displacement_rate_cents?: number
          displacement_total_cents?: number
          displacement_type?: Database["public"]["Enums"]["displacement_type"]
          finalized_at?: string | null
          finalized_by?: string | null
          grand_total_cents?: number
          labor_entries_adjusted_at?: string | null
          labor_entries_adjusted_by?: string | null
          materials_total_cents?: number
          notes?: string | null
          service_order_id?: string
          total_labor_cents?: number
          total_labor_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_financials_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_labor_entries: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          end_time: string
          hourly_rate_cents: number
          id: string
          role: string | null
          service_order_id: string
          start_time: string
          subtotal_cents: number
          technician_id: string | null
          updated_at: string
          work_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes: number
          end_time: string
          hourly_rate_cents: number
          id?: string
          role?: string | null
          service_order_id: string
          start_time: string
          subtotal_cents: number
          technician_id?: string | null
          updated_at?: string
          work_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          end_time?: string
          hourly_rate_cents?: number
          id?: string
          role?: string | null
          service_order_id?: string
          start_time?: string
          subtotal_cents?: number
          technician_id?: string | null
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_labor_entries_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_labor_entries_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_notifications: {
        Row: {
          created_at: string
          created_by: string | null
          dismissed_at: string | null
          id: string
          message: string | null
          metadata: Json
          read_at: string | null
          service_order_id: string
          technician_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dismissed_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          read_at?: string | null
          service_order_id: string
          technician_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dismissed_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          read_at?: string | null
          service_order_id?: string
          technician_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_notifications_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_notifications_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_signatures: {
        Row: {
          collected_by: string | null
          created_at: string
          device_info: Json | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          ip_address: string | null
          metadata: Json | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          service_order_id: string
          signature_data_url: string | null
          signature_hash: string | null
          signature_path: string | null
          signed_at: string
          signed_by_name: string
          signed_by_role: string | null
          user_agent: string | null
        }
        Insert: {
          collected_by?: string | null
          created_at?: string
          device_info?: Json | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          service_order_id: string
          signature_data_url?: string | null
          signature_hash?: string | null
          signature_path?: string | null
          signed_at?: string
          signed_by_name: string
          signed_by_role?: string | null
          user_agent?: string | null
        }
        Update: {
          collected_by?: string | null
          created_at?: string
          device_info?: Json | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          service_order_id?: string
          signature_data_url?: string | null
          signature_hash?: string | null
          signature_path?: string | null
          signed_at?: string
          signed_by_name?: string
          signed_by_role?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_signatures_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_technicians: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          is_primary: boolean
          role: string | null
          service_order_id: string
          technician_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: string | null
          service_order_id: string
          technician_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: string | null
          service_order_id?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_technicians_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_technicians_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_time_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          end_reason: string | null
          ended_at: string | null
          id: string
          kind: string
          metadata: Json | null
          notes: string | null
          pause_notes: string | null
          pause_reason: string | null
          service_order_id: string
          source: string
          started_at: string
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          kind: string
          metadata?: Json | null
          notes?: string | null
          pause_notes?: string | null
          pause_reason?: string | null
          service_order_id: string
          source?: string
          started_at?: string
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          kind?: string
          metadata?: Json | null
          notes?: string | null
          pause_notes?: string | null
          pause_reason?: string | null
          service_order_id?: string
          source?: string
          started_at?: string
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_time_sessions_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_time_sessions_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          approved_at: string | null
          billed_at: string | null
          billing_notes: string | null
          billing_status: Database["public"]["Enums"]["billing_status"]
          client_id: string | null
          client_unit_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          finished_at: string | null
          hour_rate: number | null
          id: string
          invoice_reference: string | null
          location: string | null
          number: number
          opened_at: string
          priority: Database["public"]["Enums"]["service_priority"] | null
          requester_name: string | null
          scheduled_for: string | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          service_type_other: string | null
          signature_waived_at: string | null
          signature_waived_by: string | null
          signature_waiver_reason: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["service_order_status"]
          technician_id: string | null
          title: string
          updated_at: string
          worked_minutes: number | null
        }
        Insert: {
          approved_at?: string | null
          billed_at?: string | null
          billing_notes?: string | null
          billing_status?: Database["public"]["Enums"]["billing_status"]
          client_id?: string | null
          client_unit_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          finished_at?: string | null
          hour_rate?: number | null
          id?: string
          invoice_reference?: string | null
          location?: string | null
          number?: number
          opened_at?: string
          priority?: Database["public"]["Enums"]["service_priority"] | null
          requester_name?: string | null
          scheduled_for?: string | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          service_type_other?: string | null
          signature_waived_at?: string | null
          signature_waived_by?: string | null
          signature_waiver_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          technician_id?: string | null
          title: string
          updated_at?: string
          worked_minutes?: number | null
        }
        Update: {
          approved_at?: string | null
          billed_at?: string | null
          billing_notes?: string | null
          billing_status?: Database["public"]["Enums"]["billing_status"]
          client_id?: string | null
          client_unit_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          finished_at?: string | null
          hour_rate?: number | null
          id?: string
          invoice_reference?: string | null
          location?: string | null
          number?: number
          opened_at?: string
          priority?: Database["public"]["Enums"]["service_priority"] | null
          requester_name?: string | null
          scheduled_for?: string | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          service_type_other?: string | null
          signature_waived_at?: string | null
          signature_waived_by?: string | null
          signature_waiver_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_order_status"]
          technician_id?: string | null
          title?: string
          updated_at?: string
          worked_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_client_unit_id_fkey"
            columns: ["client_unit_id"]
            isOneToOne: false
            referencedRelation: "client_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      technician_rate_history: {
        Row: {
          created_at: string
          created_by: string | null
          hourly_rate_100_cents: number | null
          hourly_rate_50_cents: number | null
          hourly_rate_cents: number | null
          id: string
          notes: string | null
          starts_at: string
          technician_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hourly_rate_100_cents?: number | null
          hourly_rate_50_cents?: number | null
          hourly_rate_cents?: number | null
          id?: string
          notes?: string | null
          starts_at?: string
          technician_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hourly_rate_100_cents?: number | null
          hourly_rate_50_cents?: number | null
          hourly_rate_cents?: number | null
          id?: string
          notes?: string | null
          starts_at?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_rate_history_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          active: boolean
          cpf: string | null
          created_at: string
          created_by: string
          default_availability: string | null
          email: string | null
          full_name: string
          hourly_rate_100_cents: number | null
          hourly_rate_50_cents: number | null
          hourly_rate_cents: number | null
          id: string
          internal_notes: string | null
          kind: string | null
          phone: string | null
          pricing_notes: string | null
          role: string | null
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          cpf?: string | null
          created_at?: string
          created_by: string
          default_availability?: string | null
          email?: string | null
          full_name: string
          hourly_rate_100_cents?: number | null
          hourly_rate_50_cents?: number | null
          hourly_rate_cents?: number | null
          id?: string
          internal_notes?: string | null
          kind?: string | null
          phone?: string | null
          pricing_notes?: string | null
          role?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          cpf?: string | null
          created_at?: string
          created_by?: string
          default_availability?: string | null
          email?: string | null
          full_name?: string
          hourly_rate_100_cents?: number | null
          hourly_rate_50_cents?: number | null
          hourly_rate_cents?: number | null
          id?: string
          internal_notes?: string | null
          kind?: string | null
          phone?: string | null
          pricing_notes?: string | null
          role?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_is_order_technician: {
        Args: { _order_id: string }
        Returns: boolean
      }
      user_owns_order: { Args: { _order_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operador" | "tecnico"
      billing_status: "pending" | "ready" | "billed" | "cancelled"
      displacement_type: "none" | "per_km" | "fixed"
      service_order_status:
        | "pending"
        | "dispatched"
        | "transit"
        | "running"
        | "finished"
        | "review"
        | "approved"
        | "cancelled"
      service_priority: "baixa" | "media" | "alta" | "urgente"
      service_type:
        | "mecanica"
        | "eletrica"
        | "automacao"
        | "montagem"
        | "instalacao"
        | "visita"
        | "emergencia"
        | "outro"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "operador", "tecnico"],
      billing_status: ["pending", "ready", "billed", "cancelled"],
      displacement_type: ["none", "per_km", "fixed"],
      service_order_status: [
        "pending",
        "dispatched",
        "transit",
        "running",
        "finished",
        "review",
        "approved",
        "cancelled",
      ],
      service_priority: ["baixa", "media", "alta", "urgente"],
      service_type: [
        "mecanica",
        "eletrica",
        "automacao",
        "montagem",
        "instalacao",
        "visita",
        "emergencia",
        "outro",
      ],
    },
  },
} as const
