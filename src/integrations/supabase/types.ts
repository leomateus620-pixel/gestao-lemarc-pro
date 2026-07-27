export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      client_units: {
        Row: {
          active: boolean;
          address: string | null;
          billing_notes: string | null;
          city: string | null;
          client_id: string;
          cnpj: string | null;
          created_at: string;
          created_by: string;
          default_displacement_rate_cents: number | null;
          default_displacement_type: string | null;
          distance_km_from_base: number | null;
          id: string;
          is_primary: boolean;
          name: string;
          notes: string | null;
          phone: string | null;
          responsible_name: string | null;
          sector: string | null;
          state: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address?: string | null;
          billing_notes?: string | null;
          city?: string | null;
          client_id: string;
          cnpj?: string | null;
          created_at?: string;
          created_by: string;
          default_displacement_rate_cents?: number | null;
          default_displacement_type?: string | null;
          distance_km_from_base?: number | null;
          id?: string;
          is_primary?: boolean;
          name: string;
          notes?: string | null;
          phone?: string | null;
          responsible_name?: string | null;
          sector?: string | null;
          state?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: string | null;
          billing_notes?: string | null;
          city?: string | null;
          client_id?: string;
          cnpj?: string | null;
          created_at?: string;
          created_by?: string;
          default_displacement_rate_cents?: number | null;
          default_displacement_type?: string | null;
          distance_km_from_base?: number | null;
          id?: string;
          is_primary?: boolean;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          responsible_name?: string | null;
          sector?: string | null;
          state?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_units_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          active: boolean;
          address: string | null;
          city: string | null;
          cnpj: string | null;
          created_at: string;
          created_by: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          responsible_name: string | null;
          segment: string | null;
          state: string | null;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address?: string | null;
          city?: string | null;
          cnpj?: string | null;
          created_at?: string;
          created_by: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          responsible_name?: string | null;
          segment?: string | null;
          state?: string | null;
          unit?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: string | null;
          city?: string | null;
          cnpj?: string | null;
          created_at?: string;
          created_by?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          responsible_name?: string | null;
          segment?: string | null;
          state?: string | null;
          unit?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_send_log: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: string;
          message_id: string | null;
          metadata: Json | null;
          recipient_email: string;
          status: string;
          template_name: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          recipient_email: string;
          status: string;
          template_name: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          recipient_email?: string;
          status?: string;
          template_name?: string;
        };
        Relationships: [];
      };
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number;
          batch_size: number;
          id: number;
          retry_after_until: string | null;
          send_delay_ms: number;
          transactional_email_ttl_minutes: number;
          updated_at: string;
        };
        Insert: {
          auth_email_ttl_minutes?: number;
          batch_size?: number;
          id?: number;
          retry_after_until?: string | null;
          send_delay_ms?: number;
          transactional_email_ttl_minutes?: number;
          updated_at?: string;
        };
        Update: {
          auth_email_ttl_minutes?: number;
          batch_size?: number;
          id?: number;
          retry_after_until?: string | null;
          send_delay_ms?: number;
          transactional_email_ttl_minutes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_unsubscribe_tokens: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          token: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          token: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      service_order_attachments: {
        Row: {
          caption: string | null;
          category: string | null;
          created_at: string;
          created_by: string | null;
          file_path: string;
          file_size: number | null;
          file_type: string | null;
          id: string;
          service_order_id: string;
          technician_id: string | null;
        };
        Insert: {
          caption?: string | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          file_path: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          service_order_id: string;
          technician_id?: string | null;
        };
        Update: {
          caption?: string | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          file_path?: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          service_order_id?: string;
          technician_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "service_order_attachments_service_order_id_fkey";
            columns: ["service_order_id"];
            isOneToOne: false;
            referencedRelation: "service_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_order_attachments_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technicians";
            referencedColumns: ["id"];
          },
        ];
      };
      service_order_financials: {
        Row: {
          created_at: string;
          displacement_count: number;
          displacement_km_total: number;
          displacement_notes: string | null;
          displacement_rate_cents: number;
          displacement_total_cents: number;
          displacement_type: Database["public"]["Enums"]["displacement_type"];
          finalized_at: string | null;
          finalized_by: string | null;
          grand_total_cents: number;
          labor_entries_adjusted_at: string | null;
          labor_entries_adjusted_by: string | null;
          materials_total_cents: number;
          notes: string | null;
          service_order_id: string;
          total_labor_cents: number;
          total_labor_minutes: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          displacement_count?: number;
          displacement_km_total?: number;
          displacement_notes?: string | null;
          displacement_rate_cents?: number;
          displacement_total_cents?: number;
          displacement_type?: Database["public"]["Enums"]["displacement_type"];
          finalized_at?: string | null;
          finalized_by?: string | null;
          grand_total_cents?: number;
          labor_entries_adjusted_at?: string | null;
          labor_entries_adjusted_by?: string | null;
          materials_total_cents?: number;
          notes?: string | null;
          service_order_id: string;
          total_labor_cents?: number;
          total_labor_minutes?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          displacement_count?: number;
          displacement_km_total?: number;
          displacement_notes?: string | null;
          displacement_rate_cents?: number;
          displacement_total_cents?: number;
          displacement_type?: Database["public"]["Enums"]["displacement_type"];
          finalized_at?: string | null;
          finalized_by?: string | null;
          grand_total_cents?: number;
          labor_entries_adjusted_at?: string | null;
          labor_entries_adjusted_by?: string | null;
          materials_total_cents?: number;
          notes?: string | null;
          service_order_id?: string;
          total_labor_cents?: number;
          total_labor_minutes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_order_financials_service_order_id_fkey";
            columns: ["service_order_id"];
            isOneToOne: true;
            referencedRelation: "service_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      service_order_labor_entries: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          duration_minutes: number;
          end_time: string;
          hourly_rate_cents: number;
          id: string;
          role: string | null;
          service_order_id: string;
          start_time: string;
          subtotal_cents: number;
          technician_id: string | null;
          updated_at: string;
          work_date: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          duration_minutes: number;
          end_time: string;
          hourly_rate_cents: number;
          id?: string;
          role?: string | null;
          service_order_id: string;
          start_time: string;
          subtotal_cents: number;
          technician_id?: string | null;
          updated_at?: string;
          work_date: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          duration_minutes?: number;
          end_time?: string;
          hourly_rate_cents?: number;
          id?: string;
          role?: string | null;
          service_order_id?: string;
          start_time?: string;
          subtotal_cents?: number;
          technician_id?: string | null;
          updated_at?: string;
          work_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_order_labor_entries_service_order_id_fkey";
            columns: ["service_order_id"];
            isOneToOne: false;
            referencedRelation: "service_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_order_labor_entries_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technicians";
            referencedColumns: ["id"];
          },
        ];
      };
      service_order_material_attachments: {
        Row: {
          caption: string | null;
          created_at: string;
          created_by: string | null;
          file_name: string;
          file_path: string;
          file_size: number | null;
          id: string;
          service_order_id: string;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          file_name: string;
          file_path: string;
          file_size?: number | null;
          id?: string;
          service_order_id: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          file_name?: string;
          file_path?: string;
          file_size?: number | null;
          id?: string;
          service_order_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_order_material_attachments_service_order_id_fkey";
            columns: ["service_order_id"];
            isOneToOne: false;
            referencedRelation: "service_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      service_order_notifications: {
        Row: {
          created_at: string;
          created_by: string | null;
          dismissed_at: string | null;
          id: string;
          message: string | null;
          metadata: Json;
          read_at: string | null;
          service_order_id: string;
          technician_id: string;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          dismissed_at?: string | null;
          id?: string;
          message?: string | null;
          metadata?: Json;
          read_at?: string | null;
          service_order_id: string;
          technician_id: string;
          title: string;
          type?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          dismissed_at?: string | null;
          id?: string;
          message?: string | null;
          metadata?: Json;
          read_at?: string | null;
          service_order_id?: string;
          technician_id?: string;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_order_notifications_service_order_id_fkey";
            columns: ["service_order_id"];
            isOneToOne: false;
            referencedRelation: "service_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_order_notifications_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technicians";
            referencedColumns: ["id"];
          },
        ];
      };
      service_order_signatures: {
        Row: {
          collected_by: string | null;
          created_at: string;
          device_info: Json | null;
          geo_lat: number | null;
          geo_lng: number | null;
          id: string;
          ip_address: string | null;
          metadata: Json | null;
          revoke_reason: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          service_order_id: string;
          signature_data_url: string | null;
          signature_hash: string | null;
          signature_path: string | null;
          signed_at: string;
          signed_by_name: string;
          signed_by_role: string | null;
          user_agent: string | null;
        };
        Insert: {
          collected_by?: string | null;
          created_at?: string;
          device_info?: Json | null;
          geo_lat?: number | null;
          geo_lng?: number | null;
          id?: string;
          ip_address?: string | null;
          metadata?: Json | null;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          service_order_id: string;
          signature_data_url?: string | null;
          signature_hash?: string | null;
          signature_path?: string | null;
          signed_at?: string;
          signed_by_name: string;
          signed_by_role?: string | null;
          user_agent?: string | null;
        };
        Update: {
          collected_by?: string | null;
          created_at?: string;
          device_info?: Json | null;
          geo_lat?: number | null;
          geo_lng?: number | null;
          id?: string;
          ip_address?: string | null;
          metadata?: Json | null;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          service_order_id?: string;
          signature_data_url?: string | null;
          signature_hash?: string | null;
          signature_path?: string | null;
          signed_at?: string;
          signed_by_name?: string;
          signed_by_role?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "service_order_signatures_service_order_id_fkey";
            columns: ["service_order_id"];
            isOneToOne: false;
            referencedRelation: "service_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      service_order_technicians: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          created_at: string;
          id: string;
          is_primary: boolean;
          role: string | null;
          service_order_id: string;
          technician_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          role?: string | null;
          service_order_id: string;
          technician_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          role?: string | null;
          service_order_id?: string;
          technician_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_order_technicians_service_order_id_fkey";
            columns: ["service_order_id"];
            isOneToOne: false;
            referencedRelation: "service_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_order_technicians_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technicians";
            referencedColumns: ["id"];
          },
        ];
      };
      service_order_time_sessions: {
        Row: {
          created_at: string;
          created_by: string | null;
          duration_minutes: number | null;
          end_reason: string | null;
          ended_at: string | null;
          id: string;
          kind: string;
          metadata: Json | null;
          notes: string | null;
          pause_notes: string | null;
          pause_reason: string | null;
          service_order_id: string;
          source: string;
          started_at: string;
          technician_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          duration_minutes?: number | null;
          end_reason?: string | null;
          ended_at?: string | null;
          id?: string;
          kind: string;
          metadata?: Json | null;
          notes?: string | null;
          pause_notes?: string | null;
          pause_reason?: string | null;
          service_order_id: string;
          source?: string;
          started_at?: string;
          technician_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          duration_minutes?: number | null;
          end_reason?: string | null;
          ended_at?: string | null;
          id?: string;
          kind?: string;
          metadata?: Json | null;
          notes?: string | null;
          pause_notes?: string | null;
          pause_reason?: string | null;
          service_order_id?: string;
          source?: string;
          started_at?: string;
          technician_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_order_time_sessions_service_order_id_fkey";
            columns: ["service_order_id"];
            isOneToOne: false;
            referencedRelation: "service_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_order_time_sessions_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technicians";
            referencedColumns: ["id"];
          },
        ];
      };
      service_orders: {
        Row: {
          approved_at: string | null;
          billed_at: string | null;
          billing_notes: string | null;
          billing_status: Database["public"]["Enums"]["billing_status"];
          client_id: string | null;
          client_unit_id: string | null;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          finished_at: string | null;
          hour_rate: number | null;
          id: string;
          invoice_reference: string | null;
          location: string | null;
          number: number;
          opened_at: string;
          priority: Database["public"]["Enums"]["service_priority"] | null;
          requester_name: string | null;
          scheduled_for: string | null;
          service_type: Database["public"]["Enums"]["service_type"] | null;
          service_type_other: string | null;
          signature_waived_at: string | null;
          signature_waived_by: string | null;
          signature_waiver_reason: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["service_order_status"];
          technician_id: string | null;
          title: string;
          updated_at: string;
          worked_minutes: number | null;
        };
        Insert: {
          approved_at?: string | null;
          billed_at?: string | null;
          billing_notes?: string | null;
          billing_status?: Database["public"]["Enums"]["billing_status"];
          client_id?: string | null;
          client_unit_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          finished_at?: string | null;
          hour_rate?: number | null;
          id?: string;
          invoice_reference?: string | null;
          location?: string | null;
          number?: number;
          opened_at?: string;
          priority?: Database["public"]["Enums"]["service_priority"] | null;
          requester_name?: string | null;
          scheduled_for?: string | null;
          service_type?: Database["public"]["Enums"]["service_type"] | null;
          service_type_other?: string | null;
          signature_waived_at?: string | null;
          signature_waived_by?: string | null;
          signature_waiver_reason?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["service_order_status"];
          technician_id?: string | null;
          title: string;
          updated_at?: string;
          worked_minutes?: number | null;
        };
        Update: {
          approved_at?: string | null;
          billed_at?: string | null;
          billing_notes?: string | null;
          billing_status?: Database["public"]["Enums"]["billing_status"];
          client_id?: string | null;
          client_unit_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          finished_at?: string | null;
          hour_rate?: number | null;
          id?: string;
          invoice_reference?: string | null;
          location?: string | null;
          number?: number;
          opened_at?: string;
          priority?: Database["public"]["Enums"]["service_priority"] | null;
          requester_name?: string | null;
          scheduled_for?: string | null;
          service_type?: Database["public"]["Enums"]["service_type"] | null;
          service_type_other?: string | null;
          signature_waived_at?: string | null;
          signature_waived_by?: string | null;
          signature_waiver_reason?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["service_order_status"];
          technician_id?: string | null;
          title?: string;
          updated_at?: string;
          worked_minutes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_orders_client_unit_id_fkey";
            columns: ["client_unit_id"];
            isOneToOne: false;
            referencedRelation: "client_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_orders_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technicians";
            referencedColumns: ["id"];
          },
        ];
      };
      suppressed_emails: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          metadata: Json | null;
          reason: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          metadata?: Json | null;
          reason: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          metadata?: Json | null;
          reason?: string;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      technician_rate_history: {
        Row: {
          created_at: string;
          created_by: string | null;
          hourly_rate_100_cents: number | null;
          hourly_rate_50_cents: number | null;
          hourly_rate_cents: number | null;
          id: string;
          notes: string | null;
          starts_at: string;
          technician_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          hourly_rate_100_cents?: number | null;
          hourly_rate_50_cents?: number | null;
          hourly_rate_cents?: number | null;
          id?: string;
          notes?: string | null;
          starts_at?: string;
          technician_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          hourly_rate_100_cents?: number | null;
          hourly_rate_50_cents?: number | null;
          hourly_rate_cents?: number | null;
          id?: string;
          notes?: string | null;
          starts_at?: string;
          technician_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "technician_rate_history_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technicians";
            referencedColumns: ["id"];
          },
        ];
      };
      technicians: {
        Row: {
          active: boolean;
          cpf: string | null;
          created_at: string;
          created_by: string;
          default_availability: string | null;
          email: string | null;
          full_name: string;
          hourly_rate_100_cents: number | null;
          hourly_rate_50_cents: number | null;
          hourly_rate_cents: number | null;
          id: string;
          internal_notes: string | null;
          kind: string | null;
          phone: string | null;
          pricing_notes: string | null;
          role: string | null;
          specialty: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          active?: boolean;
          cpf?: string | null;
          created_at?: string;
          created_by: string;
          default_availability?: string | null;
          email?: string | null;
          full_name: string;
          hourly_rate_100_cents?: number | null;
          hourly_rate_50_cents?: number | null;
          hourly_rate_cents?: number | null;
          id?: string;
          internal_notes?: string | null;
          kind?: string | null;
          phone?: string | null;
          pricing_notes?: string | null;
          role?: string | null;
          specialty?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          active?: boolean;
          cpf?: string | null;
          created_at?: string;
          created_by?: string;
          default_availability?: string | null;
          email?: string | null;
          full_name?: string;
          hourly_rate_100_cents?: number | null;
          hourly_rate_50_cents?: number | null;
          hourly_rate_cents?: number | null;
          id?: string;
          internal_notes?: string | null;
          kind?: string | null;
          phone?: string | null;
          pricing_notes?: string | null;
          role?: string | null;
          specialty?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      user_module_access: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          financial_access: boolean;
          id: string;
          module_key: Database["public"]["Enums"]["app_module"];
          module_role: Database["public"]["Enums"]["wire_tray_module_role"] | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          financial_access?: boolean;
          id?: string;
          module_key: Database["public"]["Enums"]["app_module"];
          module_role?: Database["public"]["Enums"]["wire_tray_module_role"] | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          financial_access?: boolean;
          id?: string;
          module_key?: Database["public"]["Enums"]["app_module"];
          module_role?: Database["public"]["Enums"]["wire_tray_module_role"] | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      wire_tray_audit_events: {
        Row: {
          actor_user_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id: string;
          idempotency_key: string | null;
          metadata: Json;
        };
        Insert: {
          actor_user_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id?: string;
          idempotency_key?: string | null;
          metadata?: Json;
        };
        Update: {
          actor_user_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          event_type?: string;
          id?: string;
          idempotency_key?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      wire_tray_documents: {
        Row: {
          caption: string | null;
          created_at: string;
          created_by: string;
          document_type: Database["public"]["Enums"]["wire_tray_document_type"];
          entity_id: string;
          entity_type: string;
          file_name: string;
          file_size: number;
          id: string;
          mime_type: string;
          status: string;
          storage_path: string;
          visibility: Database["public"]["Enums"]["wire_tray_document_visibility"];
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          created_by: string;
          document_type: Database["public"]["Enums"]["wire_tray_document_type"];
          entity_id: string;
          entity_type: string;
          file_name: string;
          file_size: number;
          id?: string;
          mime_type: string;
          status?: string;
          storage_path: string;
          visibility?: Database["public"]["Enums"]["wire_tray_document_visibility"];
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          created_by?: string;
          document_type?: Database["public"]["Enums"]["wire_tray_document_type"];
          entity_id?: string;
          entity_type?: string;
          file_name?: string;
          file_size?: number;
          id?: string;
          mime_type?: string;
          status?: string;
          storage_path?: string;
          visibility?: Database["public"]["Enums"]["wire_tray_document_visibility"];
        };
        Relationships: [];
      };
      wire_tray_notifications: {
        Row: {
          created_at: string;
          dismissed_at: string | null;
          id: string;
          message: string | null;
          metadata: Json;
          notification_type: string;
          order_id: string | null;
          read_at: string | null;
          route: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          dismissed_at?: string | null;
          id?: string;
          message?: string | null;
          metadata?: Json;
          notification_type: string;
          order_id?: string | null;
          read_at?: string | null;
          route?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          dismissed_at?: string | null;
          id?: string;
          message?: string | null;
          metadata?: Json;
          notification_type?: string;
          order_id?: string | null;
          read_at?: string | null;
          route?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_notifications_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_operation_requests: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          idempotency_key: string;
          operation: string;
          response: Json | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          idempotency_key: string;
          operation: string;
          response?: Json | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          idempotency_key?: string;
          operation?: string;
          response?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      wire_tray_order_financials: {
        Row: {
          billed_by: string | null;
          billing_notes: string | null;
          created_at: string;
          created_by: string;
          currency: string;
          id: string;
          invoice_reference: string | null;
          order_id: string;
          total_cents: number;
          updated_at: string;
        };
        Insert: {
          billed_by?: string | null;
          billing_notes?: string | null;
          created_at?: string;
          created_by: string;
          currency?: string;
          id?: string;
          invoice_reference?: string | null;
          order_id: string;
          total_cents?: number;
          updated_at?: string;
        };
        Update: {
          billed_by?: string | null;
          billing_notes?: string | null;
          created_at?: string;
          created_by?: string;
          currency?: string;
          id?: string;
          invoice_reference?: string | null;
          order_id?: string;
          total_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_order_financials_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "wire_tray_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_order_item_financials: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          order_item_id: string;
          total_cents: number;
          unit_price_cents: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          order_item_id: string;
          total_cents: number;
          unit_price_cents: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          order_item_id?: string;
          total_cents?: number;
          unit_price_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_order_item_financials_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: true;
            referencedRelation: "wire_tray_order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_order_items: {
        Row: {
          category_snapshot: Database["public"]["Enums"]["wire_tray_product_category"];
          checked_quantity: number;
          created_at: string;
          dispatched_quantity: number;
          id: string;
          notes: string | null;
          order_id: string;
          produced_quantity: number;
          product_id: string;
          product_name_snapshot: string;
          product_sku_snapshot: string | null;
          production_required_quantity: number;
          requested_quantity: number;
          reserved_quantity: number;
          separated_quantity: number;
          sort_order: number;
          unit_snapshot: Database["public"]["Enums"]["wire_tray_unit"];
          updated_at: string;
        };
        Insert: {
          category_snapshot: Database["public"]["Enums"]["wire_tray_product_category"];
          checked_quantity?: number;
          created_at?: string;
          dispatched_quantity?: number;
          id?: string;
          notes?: string | null;
          order_id: string;
          produced_quantity?: number;
          product_id: string;
          product_name_snapshot: string;
          product_sku_snapshot?: string | null;
          production_required_quantity?: number;
          requested_quantity: number;
          reserved_quantity?: number;
          separated_quantity?: number;
          sort_order?: number;
          unit_snapshot: Database["public"]["Enums"]["wire_tray_unit"];
          updated_at?: string;
        };
        Update: {
          category_snapshot?: Database["public"]["Enums"]["wire_tray_product_category"];
          checked_quantity?: number;
          created_at?: string;
          dispatched_quantity?: number;
          id?: string;
          notes?: string | null;
          order_id?: string;
          produced_quantity?: number;
          product_id?: string;
          product_name_snapshot?: string;
          product_sku_snapshot?: string | null;
          production_required_quantity?: number;
          requested_quantity?: number;
          reserved_quantity?: number;
          separated_quantity?: number;
          sort_order?: number;
          unit_snapshot?: Database["public"]["Enums"]["wire_tray_unit"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_products";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_orders: {
        Row: {
          billed_at: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          client_id: string;
          client_name_snapshot: string;
          client_unit_id: string | null;
          client_unit_name_snapshot: string | null;
          commercial_responsible_id: string | null;
          completed_at: string | null;
          confirmed_at: string | null;
          created_at: string;
          created_by: string;
          customer_order_reference: string | null;
          dispatched_at: string | null;
          expected_delivery_date: string | null;
          id: string;
          number: number;
          operational_notes: string | null;
          priority: Database["public"]["Enums"]["service_priority"];
          quotation_reference: string | null;
          ready_for_billing_at: string | null;
          status: Database["public"]["Enums"]["wire_tray_order_status"];
          updated_at: string;
          version: number;
        };
        Insert: {
          billed_at?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          client_id: string;
          client_name_snapshot: string;
          client_unit_id?: string | null;
          client_unit_name_snapshot?: string | null;
          commercial_responsible_id?: string | null;
          completed_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          created_by: string;
          customer_order_reference?: string | null;
          dispatched_at?: string | null;
          expected_delivery_date?: string | null;
          id?: string;
          number?: number;
          operational_notes?: string | null;
          priority?: Database["public"]["Enums"]["service_priority"];
          quotation_reference?: string | null;
          ready_for_billing_at?: string | null;
          status?: Database["public"]["Enums"]["wire_tray_order_status"];
          updated_at?: string;
          version?: number;
        };
        Update: {
          billed_at?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          client_id?: string;
          client_name_snapshot?: string;
          client_unit_id?: string | null;
          client_unit_name_snapshot?: string | null;
          commercial_responsible_id?: string | null;
          completed_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          created_by?: string;
          customer_order_reference?: string | null;
          dispatched_at?: string | null;
          expected_delivery_date?: string | null;
          id?: string;
          number?: number;
          operational_notes?: string | null;
          priority?: Database["public"]["Enums"]["service_priority"];
          quotation_reference?: string | null;
          ready_for_billing_at?: string | null;
          status?: Database["public"]["Enums"]["wire_tray_order_status"];
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_orders_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_orders_client_unit_id_fkey";
            columns: ["client_unit_id"];
            isOneToOne: false;
            referencedRelation: "client_units";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_production_entries: {
        Row: {
          created_at: string;
          created_by: string;
          entry_type: Database["public"]["Enums"]["wire_tray_production_entry_type"];
          evidence_document_id: string | null;
          id: string;
          idempotency_key: string | null;
          notes: string | null;
          production_order_id: string;
          quantity: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          entry_type: Database["public"]["Enums"]["wire_tray_production_entry_type"];
          evidence_document_id?: string | null;
          id?: string;
          idempotency_key?: string | null;
          notes?: string | null;
          production_order_id: string;
          quantity?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          entry_type?: Database["public"]["Enums"]["wire_tray_production_entry_type"];
          evidence_document_id?: string | null;
          id?: string;
          idempotency_key?: string | null;
          notes?: string | null;
          production_order_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_production_entries_evidence_document_id_fkey";
            columns: ["evidence_document_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_production_entries_production_order_id_fkey";
            columns: ["production_order_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_production_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_production_orders: {
        Row: {
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string;
          destination_location_id: string;
          generation_reason: string | null;
          id: string;
          number: number;
          order_id: string | null;
          order_item_id: string | null;
          origin_type: Database["public"]["Enums"]["wire_tray_production_origin"];
          pause_reason: string | null;
          planned_completion_date: string | null;
          planned_quantity: number;
          priority: Database["public"]["Enums"]["service_priority"];
          produced_quantity: number;
          product_id: string;
          responsible_user_id: string | null;
          scrap_quantity: number;
          started_at: string | null;
          status: Database["public"]["Enums"]["wire_tray_production_status"];
          technical_instructions: string | null;
          updated_at: string;
          version: number;
        };
        Insert: {
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by: string;
          destination_location_id: string;
          generation_reason?: string | null;
          id?: string;
          number?: number;
          order_id?: string | null;
          order_item_id?: string | null;
          origin_type: Database["public"]["Enums"]["wire_tray_production_origin"];
          pause_reason?: string | null;
          planned_completion_date?: string | null;
          planned_quantity: number;
          priority?: Database["public"]["Enums"]["service_priority"];
          produced_quantity?: number;
          product_id: string;
          responsible_user_id?: string | null;
          scrap_quantity?: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["wire_tray_production_status"];
          technical_instructions?: string | null;
          updated_at?: string;
          version?: number;
        };
        Update: {
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          destination_location_id?: string;
          generation_reason?: string | null;
          id?: string;
          number?: number;
          order_id?: string | null;
          order_item_id?: string | null;
          origin_type?: Database["public"]["Enums"]["wire_tray_production_origin"];
          pause_reason?: string | null;
          planned_completion_date?: string | null;
          planned_quantity?: number;
          priority?: Database["public"]["Enums"]["service_priority"];
          produced_quantity?: number;
          product_id?: string;
          responsible_user_id?: string | null;
          scrap_quantity?: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["wire_tray_production_status"];
          technical_instructions?: string | null;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_production_orders_destination_location_id_fkey";
            columns: ["destination_location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["default_location_record_id"];
          },
          {
            foreignKeyName: "wire_tray_production_orders_destination_location_id_fkey";
            columns: ["destination_location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_stock_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_production_orders_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_production_orders_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_production_orders_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_production_orders_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_products";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_products: {
        Row: {
          active: boolean;
          automatic_replenishment: boolean;
          category: Database["public"]["Enums"]["wire_tray_product_category"];
          created_at: string;
          created_by: string;
          default_location_id: string | null;
          finish: string | null;
          height_mm: number | null;
          id: string;
          length_mm: number | null;
          material: string | null;
          minimum_production_batch: number;
          minimum_stock: number;
          name: string;
          replenishment_notes: string | null;
          short_description: string | null;
          sku: string | null;
          target_stock: number | null;
          technical_notes: string | null;
          unit: Database["public"]["Enums"]["wire_tray_unit"];
          updated_at: string;
          width_mm: number | null;
        };
        Insert: {
          active?: boolean;
          automatic_replenishment?: boolean;
          category: Database["public"]["Enums"]["wire_tray_product_category"];
          created_at?: string;
          created_by: string;
          default_location_id?: string | null;
          finish?: string | null;
          height_mm?: number | null;
          id?: string;
          length_mm?: number | null;
          material?: string | null;
          minimum_production_batch?: number;
          minimum_stock?: number;
          name: string;
          replenishment_notes?: string | null;
          short_description?: string | null;
          sku?: string | null;
          target_stock?: number | null;
          technical_notes?: string | null;
          unit?: Database["public"]["Enums"]["wire_tray_unit"];
          updated_at?: string;
          width_mm?: number | null;
        };
        Update: {
          active?: boolean;
          automatic_replenishment?: boolean;
          category?: Database["public"]["Enums"]["wire_tray_product_category"];
          created_at?: string;
          created_by?: string;
          default_location_id?: string | null;
          finish?: string | null;
          height_mm?: number | null;
          id?: string;
          length_mm?: number | null;
          material?: string | null;
          minimum_production_batch?: number;
          minimum_stock?: number;
          name?: string;
          replenishment_notes?: string | null;
          short_description?: string | null;
          sku?: string | null;
          target_stock?: number | null;
          technical_notes?: string | null;
          unit?: Database["public"]["Enums"]["wire_tray_unit"];
          updated_at?: string;
          width_mm?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_products_default_location_id_fkey";
            columns: ["default_location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["default_location_record_id"];
          },
          {
            foreignKeyName: "wire_tray_products_default_location_id_fkey";
            columns: ["default_location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_stock_locations";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_reservations: {
        Row: {
          consumed_at: string | null;
          consumed_quantity: number;
          created_at: string;
          created_by: string;
          id: string;
          location_id: string;
          order_id: string;
          order_item_id: string;
          product_id: string;
          quantity: number;
          released_at: string | null;
          released_quantity: number;
          remaining_quantity: number | null;
          status: Database["public"]["Enums"]["wire_tray_reservation_status"];
          updated_at: string;
        };
        Insert: {
          consumed_at?: string | null;
          consumed_quantity?: number;
          created_at?: string;
          created_by: string;
          id?: string;
          location_id: string;
          order_id: string;
          order_item_id: string;
          product_id: string;
          quantity: number;
          released_at?: string | null;
          released_quantity?: number;
          remaining_quantity?: number | null;
          status?: Database["public"]["Enums"]["wire_tray_reservation_status"];
          updated_at?: string;
        };
        Update: {
          consumed_at?: string | null;
          consumed_quantity?: number;
          created_at?: string;
          created_by?: string;
          id?: string;
          location_id?: string;
          order_id?: string;
          order_item_id?: string;
          product_id?: string;
          quantity?: number;
          released_at?: string | null;
          released_quantity?: number;
          remaining_quantity?: number | null;
          status?: Database["public"]["Enums"]["wire_tray_reservation_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_reservations_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["default_location_record_id"];
          },
          {
            foreignKeyName: "wire_tray_reservations_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_stock_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_reservations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_reservations_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_reservations_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_reservations_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_products";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_separation_entries: {
        Row: {
          created_at: string;
          created_by: string;
          difference_quantity: number;
          entry_type: Database["public"]["Enums"]["wire_tray_separation_entry_type"];
          evidence_document_id: string | null;
          id: string;
          idempotency_key: string | null;
          order_id: string;
          order_item_id: string;
          quantity: number;
          reason: string | null;
          reservation_id: string | null;
          resolves_entry_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          difference_quantity?: number;
          entry_type: Database["public"]["Enums"]["wire_tray_separation_entry_type"];
          evidence_document_id?: string | null;
          id?: string;
          idempotency_key?: string | null;
          order_id: string;
          order_item_id: string;
          quantity?: number;
          reason?: string | null;
          reservation_id?: string | null;
          resolves_entry_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          difference_quantity?: number;
          entry_type?: Database["public"]["Enums"]["wire_tray_separation_entry_type"];
          evidence_document_id?: string | null;
          id?: string;
          idempotency_key?: string | null;
          order_id?: string;
          order_item_id?: string;
          quantity?: number;
          reason?: string | null;
          reservation_id?: string | null;
          resolves_entry_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_separation_entries_evidence_document_id_fkey";
            columns: ["evidence_document_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_separation_entries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_separation_entries_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_separation_entries_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_separation_entries_resolves_entry_id_fkey";
            columns: ["resolves_entry_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_separation_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_stock_balances: {
        Row: {
          available_quantity: number | null;
          id: string;
          location_id: string;
          physical_quantity: number;
          product_id: string;
          reserved_quantity: number;
          updated_at: string;
          version: number;
        };
        Insert: {
          available_quantity?: number | null;
          id?: string;
          location_id: string;
          physical_quantity?: number;
          product_id: string;
          reserved_quantity?: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          available_quantity?: number | null;
          id?: string;
          location_id?: string;
          physical_quantity?: number;
          product_id?: string;
          reserved_quantity?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_stock_balances_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["default_location_record_id"];
          },
          {
            foreignKeyName: "wire_tray_stock_balances_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_stock_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_balances_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_balances_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_products";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_stock_locations: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wire_tray_stock_movements: {
        Row: {
          counterpart_movement_id: string | null;
          created_at: string;
          created_by: string;
          evidence_document_id: string | null;
          id: string;
          idempotency_key: string | null;
          location_id: string;
          movement_type: Database["public"]["Enums"]["wire_tray_movement_type"];
          new_physical: number;
          new_reserved: number;
          order_id: string | null;
          order_item_id: string | null;
          physical_delta: number;
          previous_physical: number;
          previous_reserved: number;
          product_id: string;
          production_order_id: string | null;
          quantity: number;
          reason: string;
          reservation_id: string | null;
          reserved_delta: number;
        };
        Insert: {
          counterpart_movement_id?: string | null;
          created_at?: string;
          created_by: string;
          evidence_document_id?: string | null;
          id?: string;
          idempotency_key?: string | null;
          location_id: string;
          movement_type: Database["public"]["Enums"]["wire_tray_movement_type"];
          new_physical: number;
          new_reserved: number;
          order_id?: string | null;
          order_item_id?: string | null;
          physical_delta?: number;
          previous_physical: number;
          previous_reserved: number;
          product_id: string;
          production_order_id?: string | null;
          quantity: number;
          reason: string;
          reservation_id?: string | null;
          reserved_delta?: number;
        };
        Update: {
          counterpart_movement_id?: string | null;
          created_at?: string;
          created_by?: string;
          evidence_document_id?: string | null;
          id?: string;
          idempotency_key?: string | null;
          location_id?: string;
          movement_type?: Database["public"]["Enums"]["wire_tray_movement_type"];
          new_physical?: number;
          new_reserved?: number;
          order_id?: string | null;
          order_item_id?: string | null;
          physical_delta?: number;
          previous_physical?: number;
          previous_reserved?: number;
          product_id?: string;
          production_order_id?: string | null;
          quantity?: number;
          reason?: string;
          reservation_id?: string | null;
          reserved_delta?: number;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_stock_movements_counterpart_movement_id_fkey";
            columns: ["counterpart_movement_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_stock_movements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_movements_evidence_document_id_fkey";
            columns: ["evidence_document_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_movements_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["default_location_record_id"];
          },
          {
            foreignKeyName: "wire_tray_stock_movements_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_stock_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_movements_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_movements_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_movements_production_order_id_fkey";
            columns: ["production_order_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_production_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_movements_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_reservations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      wire_tray_inventory_catalog: {
        Row: {
          active: boolean | null;
          automatic_replenishment: boolean | null;
          available_quantity: number | null;
          balance_updated_at: string | null;
          category: Database["public"]["Enums"]["wire_tray_product_category"] | null;
          created_at: string | null;
          default_location_active: boolean | null;
          default_location_code: string | null;
          default_location_description: string | null;
          default_location_id: string | null;
          default_location_name: string | null;
          default_location_record_id: string | null;
          default_location_updated_at: string | null;
          finish: string | null;
          height_mm: number | null;
          id: string | null;
          in_production_quantity: number | null;
          incoming_stock_quantity: number | null;
          length_mm: number | null;
          material: string | null;
          minimum_production_batch: number | null;
          minimum_stock: number | null;
          name: string | null;
          physical_quantity: number | null;
          projected_quantity: number | null;
          replenishment_notes: string | null;
          reserved_quantity: number | null;
          short_description: string | null;
          sku: string | null;
          stock_health: string | null;
          target_stock: number | null;
          technical_notes: string | null;
          unit: Database["public"]["Enums"]["wire_tray_unit"] | null;
          updated_at: string | null;
          width_mm: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_products_default_location_id_fkey";
            columns: ["default_location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["default_location_record_id"];
          },
          {
            foreignKeyName: "wire_tray_products_default_location_id_fkey";
            columns: ["default_location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_stock_locations";
            referencedColumns: ["id"];
          },
        ];
      };
      wire_tray_projected_inventory: {
        Row: {
          available_quantity: number | null;
          balance_id: string | null;
          in_production_quantity: number | null;
          location_id: string | null;
          physical_quantity: number | null;
          product_id: string | null;
          projected_quantity: number | null;
          reserved_quantity: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wire_tray_stock_balances_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["default_location_record_id"];
          },
          {
            foreignKeyName: "wire_tray_stock_balances_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_stock_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_balances_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_inventory_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wire_tray_stock_balances_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "wire_tray_products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string };
        Returns: boolean;
      };
      email_queue_dispatch: { Args: never; Returns: undefined };
      enqueue_email: {
        Args: { payload: Json; queue_name: string };
        Returns: number;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
      move_to_dlq: {
        Args: {
          dlq_name: string;
          message_id: number;
          payload: Json;
          source_queue: string;
        };
        Returns: number;
      };
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number };
        Returns: {
          message: Json;
          msg_id: number;
          read_ct: number;
        }[];
      };
      user_is_order_technician: {
        Args: { _order_id: string };
        Returns: boolean;
      };
      user_owns_order: { Args: { _order_id: string }; Returns: boolean };
      wire_tray_assert_evidence_document: {
        Args: {
          _allowed_document_types?: Database["public"]["Enums"]["wire_tray_document_type"][];
          _allowed_entity_types: string[];
          _document_id: string;
          _entity_id: string;
        };
        Returns: undefined;
      };
      wire_tray_assert_role: {
        Args: {
          _roles: Database["public"]["Enums"]["wire_tray_module_role"][];
        };
        Returns: Database["public"]["Enums"]["wire_tray_module_role"];
      };
      wire_tray_can_access_document_path: {
        Args: { _storage_path: string };
        Returns: boolean;
      };
      wire_tray_can_view_document_visibility: {
        Args: {
          _visibility: Database["public"]["Enums"]["wire_tray_document_visibility"];
        };
        Returns: boolean;
      };
      wire_tray_can_view_financials: { Args: never; Returns: boolean };
      wire_tray_cancel_order: {
        Args: { _order_id: string; _reason: string };
        Returns: Json;
      };
      wire_tray_confirm_order: {
        Args: { _idempotency_key: string; _order_id: string };
        Returns: Json;
      };
      wire_tray_create_production_order: {
        Args: {
          _destination_location_id: string;
          _idempotency_key: string;
          _order_item_id: string;
          _planned_completion_date: string;
          _planned_quantity: number;
          _priority: Database["public"]["Enums"]["service_priority"];
          _product_id: string;
          _responsible_user_id: string;
          _technical_instructions: string;
        };
        Returns: Json;
      };
      wire_tray_current_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["wire_tray_module_role"];
      };
      wire_tray_current_role_in: {
        Args: {
          _roles: Database["public"]["Enums"]["wire_tray_module_role"][];
        };
        Returns: boolean;
      };
      wire_tray_dispatch_order: {
        Args: {
          _idempotency_key: string;
          _order_id: string;
          _receipt_document_id: string;
          _transport_note: string;
        };
        Returns: Json;
      };
      wire_tray_document_entity_exists: {
        Args: { _entity_id: string; _entity_type: string };
        Returns: boolean;
      };
      wire_tray_has_access: { Args: never; Returns: boolean };
      wire_tray_insert_movement: {
        Args: {
          _counterpart_movement_id?: string;
          _evidence_document_id?: string;
          _idempotency_key?: string;
          _location_id: string;
          _movement_id: string;
          _movement_type: Database["public"]["Enums"]["wire_tray_movement_type"];
          _new_physical: number;
          _new_reserved: number;
          _order_id?: string;
          _order_item_id?: string;
          _physical_delta: number;
          _previous_physical: number;
          _previous_reserved: number;
          _product_id: string;
          _production_order_id?: string;
          _quantity: number;
          _reason: string;
          _reservation_id?: string;
          _reserved_delta: number;
        };
        Returns: string;
      };
      wire_tray_is_global_admin: { Args: never; Returns: boolean };
      wire_tray_list_access_users: {
        Args: never;
        Returns: {
          active: boolean;
          email: string;
          financial_access: boolean;
          full_name: string;
          module_role: Database["public"]["Enums"]["wire_tray_module_role"];
          updated_at: string;
          user_id: string;
        }[];
      };
      wire_tray_mark_billed: {
        Args: {
          _billing_notes: string;
          _invoice_reference: string;
          _order_id: string;
        };
        Returns: Json;
      };
      wire_tray_mark_notification_read: {
        Args: { _dismiss?: boolean; _notification_id: string };
        Returns: boolean;
      };
      wire_tray_record_production_entry: {
        Args: {
          _entry_type: Database["public"]["Enums"]["wire_tray_production_entry_type"];
          _evidence_document_id: string;
          _idempotency_key: string;
          _notes: string;
          _production_order_id: string;
          _quantity: number;
        };
        Returns: Json;
      };
      wire_tray_record_separation: {
        Args: {
          _difference_quantity: number;
          _entry_type: Database["public"]["Enums"]["wire_tray_separation_entry_type"];
          _evidence_document_id: string;
          _idempotency_key: string;
          _order_id: string;
          _order_item_id: string;
          _quantity: number;
          _reason: string;
          _resolves_entry_id: string;
        };
        Returns: Json;
      };
      wire_tray_record_stock_movement: {
        Args: {
          _destination_location_id: string;
          _evidence_document_id: string;
          _idempotency_key: string;
          _location_id: string;
          _movement_type: Database["public"]["Enums"]["wire_tray_movement_type"];
          _product_id: string;
          _quantity: number;
          _reason: string;
        };
        Returns: Json;
      };
      wire_tray_release_for_dispatch: {
        Args: { _order_id: string };
        Returns: Json;
      };
      wire_tray_release_order_reservations_internal: {
        Args: { _order_id: string; _reason: string };
        Returns: number;
      };
      wire_tray_release_reservation: {
        Args: { _reason: string; _reservation_id: string };
        Returns: Json;
      };
      wire_tray_save_order_draft: {
        Args: { _idempotency_key: string; _order_id: string; _payload: Json };
        Returns: Json;
      };
      wire_tray_set_module_access: {
        Args: {
          _active: boolean;
          _financial_access?: boolean;
          _module_role: Database["public"]["Enums"]["wire_tray_module_role"];
          _user_id: string;
        };
        Returns: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          financial_access: boolean;
          id: string;
          module_key: Database["public"]["Enums"]["app_module"];
          module_role: Database["public"]["Enums"]["wire_tray_module_role"] | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "user_module_access";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      wire_tray_trigger_replenishment: {
        Args: { _product_id: string };
        Returns: string;
      };
      wire_tray_trigger_replenishment_internal: {
        Args: { _product_id: string; _reason: string };
        Returns: string;
      };
      wire_tray_write_audit: {
        Args: {
          _after_data?: Json;
          _before_data?: Json;
          _entity_id: string;
          _entity_type: string;
          _event_type: string;
          _idempotency_key?: string;
          _metadata?: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      app_module: "os" | "wire_trays";
      app_role: "admin" | "operador" | "tecnico";
      billing_status: "pending" | "ready" | "billed" | "cancelled";
      displacement_type: "none" | "per_km" | "fixed";
      service_order_status:
        | "pending"
        | "dispatched"
        | "transit"
        | "running"
        | "finished"
        | "review"
        | "approved"
        | "cancelled";
      service_priority: "baixa" | "media" | "alta" | "urgente";
      service_type:
        | "mecanica"
        | "eletrica"
        | "automacao"
        | "montagem"
        | "instalacao"
        | "visita"
        | "emergencia"
        | "outro";
      wire_tray_document_type:
        | "quotation"
        | "customer_order"
        | "technical_drawing"
        | "production_instruction"
        | "invoice"
        | "dispatch_receipt"
        | "photo"
        | "other";
      wire_tray_document_visibility: "operational" | "commercial" | "financial" | "admin_only";
      wire_tray_module_role:
        | "admin"
        | "gestor"
        | "comercial"
        | "producao"
        | "estoque"
        | "faturamento"
        | "consulta";
      wire_tray_movement_type:
        | "stock_entry"
        | "stock_exit"
        | "transfer_out"
        | "transfer_in"
        | "return"
        | "loss"
        | "adjustment"
        | "reservation"
        | "reservation_release"
        | "reservation_consumption"
        | "production_entry"
        | "dispatch";
      wire_tray_order_status:
        | "draft"
        | "confirmed"
        | "stock_reserved"
        | "production_pending"
        | "in_production"
        | "separating"
        | "awaiting_check"
        | "ready_for_billing"
        | "billed"
        | "ready_for_dispatch"
        | "dispatched"
        | "completed"
        | "cancelled";
      wire_tray_product_category:
        | "straight_tray"
        | "curve"
        | "branch"
        | "reduction"
        | "splice"
        | "support"
        | "cover"
        | "accessory"
        | "other";
      wire_tray_production_entry_type:
        | "start"
        | "progress"
        | "pause"
        | "resume"
        | "scrap"
        | "complete"
        | "cancel";
      wire_tray_production_origin: "customer_order" | "replenishment" | "manual_stock";
      wire_tray_production_status:
        | "planned"
        | "released"
        | "in_progress"
        | "paused"
        | "awaiting_check"
        | "completed"
        | "cancelled";
      wire_tray_reservation_status:
        | "active"
        | "partially_consumed"
        | "consumed"
        | "released"
        | "cancelled";
      wire_tray_separation_entry_type: "separation" | "checking" | "discrepancy" | "resolution";
      wire_tray_unit: "piece" | "meter" | "kilogram" | "set";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_module: ["os", "wire_trays"],
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
      wire_tray_document_type: [
        "quotation",
        "customer_order",
        "technical_drawing",
        "production_instruction",
        "invoice",
        "dispatch_receipt",
        "photo",
        "other",
      ],
      wire_tray_document_visibility: ["operational", "commercial", "financial", "admin_only"],
      wire_tray_module_role: [
        "admin",
        "gestor",
        "comercial",
        "producao",
        "estoque",
        "faturamento",
        "consulta",
      ],
      wire_tray_movement_type: [
        "stock_entry",
        "stock_exit",
        "transfer_out",
        "transfer_in",
        "return",
        "loss",
        "adjustment",
        "reservation",
        "reservation_release",
        "reservation_consumption",
        "production_entry",
        "dispatch",
      ],
      wire_tray_order_status: [
        "draft",
        "confirmed",
        "stock_reserved",
        "production_pending",
        "in_production",
        "separating",
        "awaiting_check",
        "ready_for_billing",
        "billed",
        "ready_for_dispatch",
        "dispatched",
        "completed",
        "cancelled",
      ],
      wire_tray_product_category: [
        "straight_tray",
        "curve",
        "branch",
        "reduction",
        "splice",
        "support",
        "cover",
        "accessory",
        "other",
      ],
      wire_tray_production_entry_type: [
        "start",
        "progress",
        "pause",
        "resume",
        "scrap",
        "complete",
        "cancel",
      ],
      wire_tray_production_origin: ["customer_order", "replenishment", "manual_stock"],
      wire_tray_production_status: [
        "planned",
        "released",
        "in_progress",
        "paused",
        "awaiting_check",
        "completed",
        "cancelled",
      ],
      wire_tray_reservation_status: [
        "active",
        "partially_consumed",
        "consumed",
        "released",
        "cancelled",
      ],
      wire_tray_separation_entry_type: ["separation", "checking", "discrepancy", "resolution"],
      wire_tray_unit: ["piece", "meter", "kilogram", "set"],
    },
  },
} as const;
