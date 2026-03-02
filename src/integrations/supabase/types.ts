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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          branch_id: string | null
          created_at: string
          email: string
          event_type: Database["public"]["Enums"]["access_event_type"]
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          email: string
          event_type: Database["public"]["Enums"]["access_event_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          email?: string
          event_type?: Database["public"]["Enums"]["access_event_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      add_age_suggestions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_age: number | null
          min_age: number
          suggested_add: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_age?: number | null
          min_age: number
          suggested_add: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_age?: number | null
          min_age?: number
          suggested_add?: number
        }
        Relationships: []
      }
      add_clinical_config: {
        Row: {
          add_max: number
          add_min: number
          add_step: number
          created_at: string
          edad_minima_add: number
          id: string
          mostrar_sugerencia_add: boolean
          permitir_add_menores: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          add_max?: number
          add_min?: number
          add_step?: number
          created_at?: string
          edad_minima_add?: number
          id?: string
          mostrar_sugerencia_add?: boolean
          permitir_add_menores?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          add_max?: number
          add_min?: number
          add_step?: number
          created_at?: string
          edad_minima_add?: number
          id?: string
          mostrar_sugerencia_add?: boolean
          permitir_add_menores?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_authorization_requests: {
        Row: {
          action_data: Json | null
          action_type: Database["public"]["Enums"]["authorization_action_type"]
          admin_comment: string | null
          approved_at: string | null
          approved_by_user_id: string | null
          comment: string | null
          created_at: string
          executed_at: string | null
          expires_at: string | null
          id: string
          requested_by_role: string
          requested_by_user_id: string
          resource_description: string | null
          resource_id: string | null
          resource_type: string
          status: Database["public"]["Enums"]["authorization_request_status"]
          updated_at: string
        }
        Insert: {
          action_data?: Json | null
          action_type: Database["public"]["Enums"]["authorization_action_type"]
          admin_comment?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          comment?: string | null
          created_at?: string
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          requested_by_role: string
          requested_by_user_id: string
          resource_description?: string | null
          resource_id?: string | null
          resource_type: string
          status?: Database["public"]["Enums"]["authorization_request_status"]
          updated_at?: string
        }
        Update: {
          action_data?: Json | null
          action_type?: Database["public"]["Enums"]["authorization_action_type"]
          admin_comment?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          comment?: string | null
          created_at?: string
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          requested_by_role?: string
          requested_by_user_id?: string
          resource_description?: string | null
          resource_id?: string | null
          resource_type?: string
          status?: Database["public"]["Enums"]["authorization_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      admin_reset_otp: {
        Row: {
          attempts_left: number
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone_sent_to: string | null
          used: boolean
          user_id: string
        }
        Insert: {
          attempts_left?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code: string
          phone_sent_to?: string | null
          used?: boolean
          user_id: string
        }
        Update: {
          attempts_left?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone_sent_to?: string | null
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      admin_reset_rate_limit: {
        Row: {
          attempt_type: string
          attempted_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempt_type?: string
          attempted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attempt_type?: string
          attempted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_campaign_segments: {
        Row: {
          branch_id: string | null
          created_at: string | null
          criteria: Json
          description: string | null
          id: string
          is_active: boolean | null
          justification: string | null
          last_calculated_at: string | null
          name: string
          patient_count: number | null
          segment_type: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          criteria: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          justification?: string | null
          last_calculated_at?: string | null
          name: string
          patient_count?: number | null
          segment_type: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean | null
          justification?: string | null
          last_calculated_at?: string | null
          name?: string
          patient_count?: number | null
          segment_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_campaign_segments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          created_at: string
          error_message: string | null
          id: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          booked_by: string | null
          booking_source: string
          branch_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          delivery_responsible_name_snapshot: string | null
          delivery_responsible_type: string | null
          delivery_responsible_user_id: string | null
          doctor_id: string
          end_time: string
          id: string
          lab_order_id: string | null
          notes: string | null
          patient_email: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          reason: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          sale_id: string | null
          start_time: string
          started_at: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          booked_by?: string | null
          booking_source?: string
          branch_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivery_responsible_name_snapshot?: string | null
          delivery_responsible_type?: string | null
          delivery_responsible_user_id?: string | null
          doctor_id: string
          end_time: string
          id?: string
          lab_order_id?: string | null
          notes?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          reason?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          sale_id?: string | null
          start_time: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          booked_by?: string | null
          booking_source?: string
          branch_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivery_responsible_name_snapshot?: string | null
          delivery_responsible_type?: string | null
          delivery_responsible_user_id?: string | null
          doctor_id?: string
          end_time?: string
          id?: string
          lab_order_id?: string | null
          notes?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          reason?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          sale_id?: string | null
          start_time?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lab_order_id_fkey"
            columns: ["lab_order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_message_logs: {
        Row: {
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          message_content: string
          message_type: Database["public"]["Enums"]["auto_message_type"]
          patient_id: string | null
          recipient_name: string | null
          recipient_phone: string
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          variables_used: Json | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content: string
          message_type: Database["public"]["Enums"]["auto_message_type"]
          patient_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          variables_used?: Json | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content?: string
          message_type?: Database["public"]["Enums"]["auto_message_type"]
          patient_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_message_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "auto_message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_message_templates: {
        Row: {
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message_type: Database["public"]["Enums"]["auto_message_type"]
          name: string
          template_content: string
          trigger_config: Json | null
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message_type: Database["public"]["Enums"]["auto_message_type"]
          name: string
          template_content: string
          trigger_config?: Json | null
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message_type?: Database["public"]["Enums"]["auto_message_type"]
          name?: string
          template_content?: string
          trigger_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      automated_message_log: {
        Row: {
          automated_message_id: string | null
          channel: string
          created_at: string
          error_message: string | null
          id: string
          message_content: string
          patient_id: string | null
          recipient: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          automated_message_id?: string | null
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content: string
          patient_id?: string | null
          recipient: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          automated_message_id?: string | null
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content?: string
          patient_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automated_message_log_automated_message_id_fkey"
            columns: ["automated_message_id"]
            isOneToOne: false
            referencedRelation: "automated_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automated_message_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_messages: {
        Row: {
          branch_id: string | null
          channels: string[] | null
          created_at: string
          created_by: string | null
          days_offset: number | null
          id: string
          is_active: boolean | null
          message_template: string
          name: string
          send_time: string | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          channels?: string[] | null
          created_at?: string
          created_by?: string | null
          days_offset?: number | null
          id?: string
          is_active?: boolean | null
          message_template: string
          name: string
          send_time?: string | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          channels?: string[] | null
          created_at?: string
          created_by?: string | null
          days_offset?: number | null
          id?: string
          is_active?: boolean | null
          message_template?: string
          name?: string
          send_time?: string | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automated_messages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string
          account_type: string
          bank_name: string
          branch_id: string | null
          clabe: string | null
          created_at: string
          currency: string
          current_balance: number
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_number: string
          account_type?: string
          bank_name: string
          branch_id?: string | null
          clabe?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_type?: string
          bank_name?: string
          branch_id?: string | null
          clabe?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          cash_register_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          notes: string | null
          reconciled: boolean
          reconciled_at: string | null
          reconciled_by: string | null
          reference: string | null
          sale_id: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          cash_register_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          notes?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference?: string | null
          sale_id?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          cash_register_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          notes?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference?: string | null
          sale_id?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_slots: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          doctor_id: string
          end_datetime: string
          id: string
          reason: string | null
          start_datetime: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id: string
          end_datetime: string
          id?: string
          reason?: string | null
          start_datetime: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string
          end_datetime?: string
          id?: string
          reason?: string | null
          start_datetime?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          colony: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_main: boolean
          manager: string | null
          name: string
          phone: string | null
          state: string | null
          updated_at: string
          whatsapp_number: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          colony?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          manager?: string | null
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          colony?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          manager?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      campaign_audit_log: {
        Row: {
          action: string
          campaign_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: string | null
          notes: string | null
          performed_by: string
          performed_by_role: string
          previous_status: string | null
        }
        Insert: {
          action: string
          campaign_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          performed_by: string
          performed_by_role: string
          previous_status?: string | null
        }
        Update: {
          action?: string
          campaign_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          performed_by?: string
          performed_by_role?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_audit_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_exclusions: {
        Row: {
          channel: string
          excluded_at: string | null
          excluded_by: string | null
          id: string
          patient_id: string
          reason: string | null
        }
        Insert: {
          channel: string
          excluded_at?: string | null
          excluded_by?: string | null
          id?: string
          patient_id: string
          reason?: string | null
        }
        Update: {
          channel?: string
          excluded_at?: string | null
          excluded_by?: string | null
          id?: string
          patient_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_exclusions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_messages: {
        Row: {
          campaign_id: string
          channel: string
          content: string
          created_at: string
          id: string
          media_url: string | null
          sort_order: number | null
          subject: string | null
          template_variables: Json | null
        }
        Insert: {
          campaign_id: string
          channel: string
          content: string
          created_at?: string
          id?: string
          media_url?: string | null
          sort_order?: number | null
          subject?: string | null
          template_variables?: Json | null
        }
        Update: {
          campaign_id?: string
          channel?: string
          content?: string
          created_at?: string
          id?: string
          media_url?: string | null
          sort_order?: number | null
          subject?: string | null
          template_variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          channel: string
          clicked_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          patient_id: string | null
          recipient_address: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id: string
          channel: string
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          patient_id?: string | null
          recipient_address: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string
          channel?: string
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          patient_id?: string | null
          recipient_address?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          branch_id: string | null
          channel: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_ai_generated: boolean | null
          name: string
          subject: string | null
          template_type: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          branch_id?: string | null
          channel: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_ai_generated?: boolean | null
          name: string
          subject?: string | null
          template_type: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          branch_id?: string | null
          channel?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_ai_generated?: boolean | null
          name?: string
          subject?: string | null
          template_type?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_templates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_counts: {
        Row: {
          bills_100: number | null
          bills_1000: number | null
          bills_20: number | null
          bills_200: number | null
          bills_50: number | null
          bills_500: number | null
          cash_register_id: string
          coins_1: number | null
          coins_10: number | null
          coins_2: number | null
          coins_20: number | null
          coins_5: number | null
          coins_50c: number | null
          count_date: string
          count_type: string
          counted_by: string
          created_at: string
          difference: number
          expected_amount: number
          id: string
          notes: string | null
          total_counted: number
        }
        Insert: {
          bills_100?: number | null
          bills_1000?: number | null
          bills_20?: number | null
          bills_200?: number | null
          bills_50?: number | null
          bills_500?: number | null
          cash_register_id: string
          coins_1?: number | null
          coins_10?: number | null
          coins_2?: number | null
          coins_20?: number | null
          coins_5?: number | null
          coins_50c?: number | null
          count_date?: string
          count_type?: string
          counted_by: string
          created_at?: string
          difference?: number
          expected_amount?: number
          id?: string
          notes?: string | null
          total_counted?: number
        }
        Update: {
          bills_100?: number | null
          bills_1000?: number | null
          bills_20?: number | null
          bills_200?: number | null
          bills_50?: number | null
          bills_500?: number | null
          cash_register_id?: string
          coins_1?: number | null
          coins_10?: number | null
          coins_2?: number | null
          coins_20?: number | null
          coins_5?: number | null
          coins_50c?: number | null
          count_date?: string
          count_type?: string
          counted_by?: string
          created_at?: string
          difference?: number
          expected_amount?: number
          id?: string
          notes?: string | null
          total_counted?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_counts_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          cash_register_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          movement_type: string
          payment_method: string | null
          reference_id: string | null
          reference_type: string | null
          sale_id: string | null
        }
        Insert: {
          amount: number
          cash_register_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          movement_type: string
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sale_id?: string | null
        }
        Update: {
          amount?: number
          cash_register_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          movement_type?: string
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          branch_id: string | null
          closed_by: string | null
          closing_amount: number | null
          closing_date: string | null
          created_at: string
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_by: string
          opening_amount: number
          opening_date: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          closing_date?: string | null
          created_at?: string
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_by: string
          opening_amount?: number
          opening_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          closing_date?: string | null
          created_at?: string
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_by?: string
          opening_amount?: number
          opening_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_ai_audit: {
        Row: {
          action_type: string
          created_at: string
          final_content: Json | null
          id: string
          notes: string | null
          patient_id: string
          prescription_id: string | null
          resolved_at: string | null
          status: string
          suggestion_content: Json
          user_id: string
          visual_exam_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          final_content?: Json | null
          id?: string
          notes?: string | null
          patient_id: string
          prescription_id?: string | null
          resolved_at?: string | null
          status?: string
          suggestion_content: Json
          user_id: string
          visual_exam_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          final_content?: Json | null
          id?: string
          notes?: string | null
          patient_id?: string
          prescription_id?: string | null
          resolved_at?: string | null
          status?: string
          suggestion_content?: Json
          user_id?: string
          visual_exam_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_ai_audit_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_audit_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "patient_prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_audit_visual_exam_id_fkey"
            columns: ["visual_exam_id"]
            isOneToOne: false
            referencedRelation: "visual_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_ai_learning: {
        Row: {
          action_type: string
          actual_timing: string | null
          approved_message: string | null
          created_at: string | null
          feedback_score: number | null
          id: string
          metadata: Json | null
          opportunity_type: string
          original_message: string | null
          patient_responded: boolean | null
          patient_visited: boolean | null
          sale_amount: number | null
          suggested_timing: Json | null
          was_approved: boolean
        }
        Insert: {
          action_type: string
          actual_timing?: string | null
          approved_message?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          metadata?: Json | null
          opportunity_type: string
          original_message?: string | null
          patient_responded?: boolean | null
          patient_visited?: boolean | null
          sale_amount?: number | null
          suggested_timing?: Json | null
          was_approved: boolean
        }
        Update: {
          action_type?: string
          actual_timing?: string | null
          approved_message?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          metadata?: Json | null
          opportunity_type?: string
          original_message?: string | null
          patient_responded?: boolean | null
          patient_visited?: boolean | null
          sale_amount?: number | null
          suggested_timing?: Json | null
          was_approved?: boolean
        }
        Relationships: []
      }
      clinical_form_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          form_schema: Json
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          form_schema: Json
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          form_schema?: Json
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_marketing_actions: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by: string | null
          approved_message: string | null
          campaign_id: string | null
          channel: string
          created_at: string | null
          id: string
          opportunity_id: string
          patient_id: string
          patient_visited: boolean | null
          response_received: boolean | null
          sale_attributed: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          suggested_message: string
          suggested_send_window: Json | null
          suggested_subject: string | null
          updated_at: string | null
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          approved_by?: string | null
          approved_message?: string | null
          campaign_id?: string | null
          channel: string
          created_at?: string | null
          id?: string
          opportunity_id: string
          patient_id: string
          patient_visited?: boolean | null
          response_received?: boolean | null
          sale_attributed?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          suggested_message: string
          suggested_send_window?: Json | null
          suggested_subject?: string | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by?: string | null
          approved_message?: string | null
          campaign_id?: string | null
          channel?: string
          created_at?: string | null
          id?: string
          opportunity_id?: string
          patient_id?: string
          patient_visited?: boolean | null
          response_received?: boolean | null
          sale_attributed?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          suggested_message?: string
          suggested_send_window?: Json | null
          suggested_subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_marketing_actions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_marketing_actions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "clinical_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_marketing_actions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_marketing_audit: {
        Row: {
          action_id: string | null
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          new_status: string | null
          opportunity_id: string | null
          performed_by: string
          performed_by_role: string
          previous_status: string | null
        }
        Insert: {
          action_id?: string | null
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          new_status?: string | null
          opportunity_id?: string | null
          performed_by: string
          performed_by_role: string
          previous_status?: string | null
        }
        Update: {
          action_id?: string | null
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          new_status?: string | null
          opportunity_id?: string | null
          performed_by?: string
          performed_by_role?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_marketing_audit_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "clinical_marketing_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_marketing_audit_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "clinical_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_opportunities: {
        Row: {
          branch_id: string | null
          clinical_details: Json | null
          clinical_summary: string
          created_at: string | null
          detected_at: string | null
          detected_by_model: string | null
          discard_reason: string | null
          discarded_at: string | null
          discarded_by: string | null
          id: string
          marketing_action_id: string | null
          opportunity_type: string
          patient_id: string
          priority: string
          status: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          clinical_details?: Json | null
          clinical_summary: string
          created_at?: string | null
          detected_at?: string | null
          detected_by_model?: string | null
          discard_reason?: string | null
          discarded_at?: string | null
          discarded_by?: string | null
          id?: string
          marketing_action_id?: string | null
          opportunity_type: string
          patient_id: string
          priority?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          clinical_details?: Json | null
          clinical_summary?: string
          created_at?: string | null
          detected_at?: string | null
          detected_by_model?: string | null
          discard_reason?: string | null
          discarded_at?: string | null
          discarded_by?: string | null
          id?: string
          marketing_action_id?: string | null
          opportunity_type?: string
          patient_id?: string
          priority?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_opportunities_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_opportunities_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_assignments: {
        Row: {
          amount_collected: number
          assigned_at: string
          assigned_by: string | null
          collector_id: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          patient_id: string
          priority: string
          sale_id: string
          status: string
          total_due: number
          updated_at: string
        }
        Insert: {
          amount_collected?: number
          assigned_at?: string
          assigned_by?: string | null
          collector_id: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          priority?: string
          sale_id: string
          status?: string
          total_due: number
          updated_at?: string
        }
        Update: {
          amount_collected?: number
          assigned_at?: string
          assigned_by?: string | null
          collector_id?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: string
          sale_id?: string
          status?: string
          total_due?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_assignments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_visits: {
        Row: {
          address_visited: string | null
          amount_collected: number | null
          assignment_id: string
          collector_id: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          payment_method: string | null
          photo_url: string | null
          promise_date: string | null
          result: string
          visit_date: string
        }
        Insert: {
          address_visited?: string | null
          amount_collected?: number | null
          assignment_id: string
          collector_id: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          payment_method?: string | null
          photo_url?: string | null
          promise_date?: string | null
          result: string
          visit_date?: string
        }
        Update: {
          address_visited?: string | null
          amount_collected?: number | null
          assignment_id?: string
          collector_id?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          payment_method?: string | null
          photo_url?: string | null
          promise_date?: string | null
          result?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_visits_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "collection_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_name: string
          corporate_patients_enabled: boolean
          created_at: string
          cross_branch_payments_enabled: boolean
          currency: string
          date_format: string
          email: string | null
          id: string
          language: string
          logo_url: string | null
          otp_security_phone: string | null
          phone: string | null
          printer_density: string
          printer_paper_size: string
          printer_speed: string
          rfc: string | null
          slogan: string | null
          tax_rate: number
          test_mode: boolean
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          company_name?: string
          corporate_patients_enabled?: boolean
          created_at?: string
          cross_branch_payments_enabled?: boolean
          currency?: string
          date_format?: string
          email?: string | null
          id?: string
          language?: string
          logo_url?: string | null
          otp_security_phone?: string | null
          phone?: string | null
          printer_density?: string
          printer_paper_size?: string
          printer_speed?: string
          rfc?: string | null
          slogan?: string | null
          tax_rate?: number
          test_mode?: boolean
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_name?: string
          corporate_patients_enabled?: boolean
          created_at?: string
          cross_branch_payments_enabled?: boolean
          currency?: string
          date_format?: string
          email?: string | null
          id?: string
          language?: string
          logo_url?: string | null
          otp_security_phone?: string | null
          phone?: string | null
          printer_density?: string
          printer_paper_size?: string
          printer_speed?: string
          rfc?: string | null
          slogan?: string | null
          tax_rate?: number
          test_mode?: boolean
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contact_events: {
        Row: {
          channel: string
          created_at: string
          event_type: string
          id: string
          patient_id: string
          phone_used: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          event_type: string
          id?: string
          patient_id: string
          phone_used?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          patient_id?: string
          phone_used?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lens_fittings: {
        Row: {
          branch_id: string | null
          care_solution: string | null
          created_at: string
          fitted_by: string | null
          fitting_date: string
          id: string
          notes: string | null
          od_add: number | null
          od_axis: number | null
          od_bc: number | null
          od_brand: string | null
          od_centration: string | null
          od_color: string | null
          od_comfort: number | null
          od_coverage: string | null
          od_cylinder: number | null
          od_diameter: number | null
          od_material: string | null
          od_movement: string | null
          od_over_refraction: string | null
          od_replacement: string | null
          od_sphere: number | null
          od_type: string | null
          oi_add: number | null
          oi_axis: number | null
          oi_bc: number | null
          oi_brand: string | null
          oi_centration: string | null
          oi_color: string | null
          oi_comfort: number | null
          oi_coverage: string | null
          oi_cylinder: number | null
          oi_diameter: number | null
          oi_material: string | null
          oi_movement: string | null
          oi_over_refraction: string | null
          oi_replacement: string | null
          oi_sphere: number | null
          oi_type: string | null
          patient_id: string
          updated_at: string
          visual_exam_id: string | null
          wearing_schedule: string | null
        }
        Insert: {
          branch_id?: string | null
          care_solution?: string | null
          created_at?: string
          fitted_by?: string | null
          fitting_date?: string
          id?: string
          notes?: string | null
          od_add?: number | null
          od_axis?: number | null
          od_bc?: number | null
          od_brand?: string | null
          od_centration?: string | null
          od_color?: string | null
          od_comfort?: number | null
          od_coverage?: string | null
          od_cylinder?: number | null
          od_diameter?: number | null
          od_material?: string | null
          od_movement?: string | null
          od_over_refraction?: string | null
          od_replacement?: string | null
          od_sphere?: number | null
          od_type?: string | null
          oi_add?: number | null
          oi_axis?: number | null
          oi_bc?: number | null
          oi_brand?: string | null
          oi_centration?: string | null
          oi_color?: string | null
          oi_comfort?: number | null
          oi_coverage?: string | null
          oi_cylinder?: number | null
          oi_diameter?: number | null
          oi_material?: string | null
          oi_movement?: string | null
          oi_over_refraction?: string | null
          oi_replacement?: string | null
          oi_sphere?: number | null
          oi_type?: string | null
          patient_id: string
          updated_at?: string
          visual_exam_id?: string | null
          wearing_schedule?: string | null
        }
        Update: {
          branch_id?: string | null
          care_solution?: string | null
          created_at?: string
          fitted_by?: string | null
          fitting_date?: string
          id?: string
          notes?: string | null
          od_add?: number | null
          od_axis?: number | null
          od_bc?: number | null
          od_brand?: string | null
          od_centration?: string | null
          od_color?: string | null
          od_comfort?: number | null
          od_coverage?: string | null
          od_cylinder?: number | null
          od_diameter?: number | null
          od_material?: string | null
          od_movement?: string | null
          od_over_refraction?: string | null
          od_replacement?: string | null
          od_sphere?: number | null
          od_type?: string | null
          oi_add?: number | null
          oi_axis?: number | null
          oi_bc?: number | null
          oi_brand?: string | null
          oi_centration?: string | null
          oi_color?: string | null
          oi_comfort?: number | null
          oi_coverage?: string | null
          oi_cylinder?: number | null
          oi_diameter?: number | null
          oi_material?: string | null
          oi_movement?: string | null
          oi_over_refraction?: string | null
          oi_replacement?: string | null
          oi_sphere?: number | null
          oi_type?: string | null
          patient_id?: string
          updated_at?: string
          visual_exam_id?: string | null
          wearing_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_lens_fittings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_lens_fittings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_lens_fittings_visual_exam_id_fkey"
            columns: ["visual_exam_id"]
            isOneToOne: false
            referencedRelation: "visual_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_payments: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          id: string
          is_cross_branch: boolean
          is_voided: boolean
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_number: number
          received_by: string | null
          reference: string | null
          replaced_by_payment_id: string | null
          sale_branch_id: string | null
          sale_id: string
          voided_at: string | null
          voided_by: string | null
          voided_reason: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string
          id?: string
          is_cross_branch?: boolean
          is_voided?: boolean
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_number: number
          received_by?: string | null
          reference?: string | null
          replaced_by_payment_id?: string | null
          sale_branch_id?: string | null
          sale_id: string
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          is_cross_branch?: boolean
          is_voided?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_number?: number
          received_by?: string | null
          reference?: string | null
          replaced_by_payment_id?: string | null
          sale_branch_id?: string | null
          sale_id?: string
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_replaced_by_payment_id_fkey"
            columns: ["replaced_by_payment_id"]
            isOneToOne: false
            referencedRelation: "credit_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_sale_branch_id_fkey"
            columns: ["sale_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_settings: {
        Row: {
          admin_down_payment_exception: boolean
          admin_exception_only: boolean
          allow_only_payments_when_blocked: boolean
          block_moroso_30plus: boolean
          block_sales_to_morosos: boolean
          created_at: string
          id: string
          min_down_payment_amount: number | null
          min_down_payment_percent: number
          updated_at: string
        }
        Insert: {
          admin_down_payment_exception?: boolean
          admin_exception_only?: boolean
          allow_only_payments_when_blocked?: boolean
          block_moroso_30plus?: boolean
          block_sales_to_morosos?: boolean
          created_at?: string
          id?: string
          min_down_payment_amount?: number | null
          min_down_payment_percent?: number
          updated_at?: string
        }
        Update: {
          admin_down_payment_exception?: boolean
          admin_exception_only?: boolean
          allow_only_payments_when_blocked?: boolean
          block_moroso_30plus?: boolean
          block_sales_to_morosos?: boolean
          created_at?: string
          id?: string
          min_down_payment_amount?: number | null
          min_down_payment_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_credit_scores: {
        Row: {
          available_credit: number
          average_days_late: number | null
          created_at: string
          credit_limit: number
          defaults: number
          id: string
          last_calculated_at: string | null
          late_payments: number
          notes: string | null
          on_time_payments: number
          patient_id: string
          risk_level: string
          score: number
          total_credit_used: number
          updated_at: string
        }
        Insert: {
          available_credit?: number
          average_days_late?: number | null
          created_at?: string
          credit_limit?: number
          defaults?: number
          id?: string
          last_calculated_at?: string | null
          late_payments?: number
          notes?: string | null
          on_time_payments?: number
          patient_id: string
          risk_level?: string
          score?: number
          total_credit_used?: number
          updated_at?: string
        }
        Update: {
          available_credit?: number
          average_days_late?: number | null
          created_at?: string
          credit_limit?: number
          defaults?: number
          id?: string
          last_calculated_at?: string | null
          late_payments?: number
          notes?: string | null
          on_time_payments?: number
          patient_id?: string
          risk_level?: string
          score?: number
          total_credit_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_credit_scores_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty: {
        Row: {
          created_at: string
          current_points: number | null
          enrollment_date: string | null
          id: string
          is_active: boolean | null
          last_activity_date: string | null
          lifetime_points: number | null
          patient_id: string
          program_id: string
          referral_code: string | null
          referred_by: string | null
          tier_id: string | null
          updated_at: string
          wallet_balance: number | null
        }
        Insert: {
          created_at?: string
          current_points?: number | null
          enrollment_date?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_date?: string | null
          lifetime_points?: number | null
          patient_id: string
          program_id: string
          referral_code?: string | null
          referred_by?: string | null
          tier_id?: string | null
          updated_at?: string
          wallet_balance?: number | null
        }
        Update: {
          created_at?: string
          current_points?: number | null
          enrollment_date?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_date?: string | null
          lifetime_points?: number | null
          patient_id?: string
          program_id?: string
          referral_code?: string | null
          referred_by?: string | null
          tier_id?: string | null
          updated_at?: string
          wallet_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "customer_loyalty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      database_reset_audit: {
        Row: {
          branch_id: string | null
          error_message: string | null
          executed_at: string
          executed_by: string
          executed_by_name: string | null
          id: string
          ip_address: string | null
          modules_cleaned: Json
          reason: string | null
          rows_deleted: Json
          success: boolean
        }
        Insert: {
          branch_id?: string | null
          error_message?: string | null
          executed_at?: string
          executed_by: string
          executed_by_name?: string | null
          id?: string
          ip_address?: string | null
          modules_cleaned?: Json
          reason?: string | null
          rows_deleted?: Json
          success?: boolean
        }
        Update: {
          branch_id?: string | null
          error_message?: string | null
          executed_at?: string
          executed_by?: string
          executed_by_name?: string | null
          id?: string
          ip_address?: string | null
          modules_cleaned?: Json
          reason?: string | null
          rows_deleted?: Json
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "database_reset_audit_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_ai_audit: {
        Row: {
          action_taken: string | null
          action_type: string
          created_at: string
          delivery_id: string
          id: string
          metadata: Json | null
          patient_id: string | null
          recommendation: string | null
          risk_reasons: string[] | null
          risk_score: number | null
          user_id: string
          user_role: string
        }
        Insert: {
          action_taken?: string | null
          action_type: string
          created_at?: string
          delivery_id: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          recommendation?: string | null
          risk_reasons?: string[] | null
          risk_score?: number | null
          user_id: string
          user_role: string
        }
        Update: {
          action_taken?: string | null
          action_type?: string
          created_at?: string
          delivery_id?: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          recommendation?: string | null
          risk_reasons?: string[] | null
          risk_score?: number | null
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_ai_audit_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_ai_audit_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_prescriptions: {
        Row: {
          branch_id: string | null
          contact_lens_fitting_id: string | null
          created_at: string
          created_by: string | null
          doctor_license: string | null
          doctor_signature: string | null
          expiry_date: string | null
          id: string
          issue_date: string
          notes: string | null
          patient_id: string
          pdf_path: string | null
          prescription_data: Json
          prescription_id: string | null
          prescription_number: string
          prescription_type: string
          status: string
        }
        Insert: {
          branch_id?: string | null
          contact_lens_fitting_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_license?: string | null
          doctor_signature?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          patient_id: string
          pdf_path?: string | null
          prescription_data: Json
          prescription_id?: string | null
          prescription_number: string
          prescription_type: string
          status?: string
        }
        Update: {
          branch_id?: string | null
          contact_lens_fitting_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_license?: string | null
          doctor_signature?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          patient_id?: string
          pdf_path?: string | null
          prescription_data?: Json
          prescription_id?: string | null
          prescription_number?: string
          prescription_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_prescriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_prescriptions_contact_lens_fitting_id_fkey"
            columns: ["contact_lens_fitting_id"]
            isOneToOne: false
            referencedRelation: "contact_lens_fittings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_prescriptions_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "patient_prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_schedules: {
        Row: {
          branch_id: string | null
          created_at: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          is_active: boolean
          slot_duration: number
          start_time: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          is_active?: boolean
          slot_duration?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          slot_duration?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          branch_id: string | null
          created_at: string
          draft_data: Json
          entity_id: string | null
          form_type: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          draft_data?: Json
          entity_id?: string | null
          form_type: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          draft_data?: Json
          entity_id?: string | null
          form_type?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_detection_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          match_reasons: string[]
          patient_id_matched: string
          patient_id_new: string | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          match_reasons?: string[]
          patient_id_matched: string
          patient_id_new?: string | null
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          match_reasons?: string[]
          patient_id_matched?: string
          patient_id_new?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_detection_events_patient_id_matched_fkey"
            columns: ["patient_id_matched"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_detection_events_patient_id_new_fkey"
            columns: ["patient_id_new"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          branch_id: string | null
          cash_register_id: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          expense_date: string
          expense_number: string
          id: string
          invoice_number: string | null
          notes: string | null
          payment_method: string
          receipt_url: string | null
          status: string
          subcategory: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          branch_id?: string | null
          cash_register_id?: string | null
          category: string
          created_at?: string
          created_by: string
          description: string
          expense_date?: string
          expense_number: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          status?: string
          subcategory?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          branch_id?: string | null
          cash_register_id?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          expense_number?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          status?: string
          subcategory?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_reminder_log: {
        Row: {
          auto_message_log_id: string | null
          channel: string
          created_at: string
          days_overdue_at_send: number | null
          delinquency_level: number | null
          error_message: string | null
          id: string
          installment_id: string | null
          message_content: string
          patient_id: string | null
          phone: string | null
          plan_id: string | null
          sale_id: string | null
          sent_at: string | null
          status: string
          template_key: string
        }
        Insert: {
          auto_message_log_id?: string | null
          channel?: string
          created_at?: string
          days_overdue_at_send?: number | null
          delinquency_level?: number | null
          error_message?: string | null
          id?: string
          installment_id?: string | null
          message_content: string
          patient_id?: string | null
          phone?: string | null
          plan_id?: string | null
          sale_id?: string | null
          sent_at?: string | null
          status?: string
          template_key: string
        }
        Update: {
          auto_message_log_id?: string | null
          channel?: string
          created_at?: string
          days_overdue_at_send?: number | null
          delinquency_level?: number | null
          error_message?: string | null
          id?: string
          installment_id?: string | null
          message_content?: string
          patient_id?: string | null
          phone?: string | null
          plan_id?: string | null
          sale_id?: string | null
          sent_at?: string | null
          status?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_reminder_log_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "payment_plan_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_reminder_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_reminder_log_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_reminder_settings: {
        Row: {
          created_at: string
          days_after_due: number
          days_before_due: number
          id: string
          is_enabled: boolean
          level_cooldown_days: number
          max_hour: number
          max_per_patient_per_week: number
          min_hour: number
          overdue_repeat_interval_days: number
          send_hour: number
          template_before: string
          template_level1: string
          template_level2: string
          template_level3: string
          template_overdue: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_after_due?: number
          days_before_due?: number
          id?: string
          is_enabled?: boolean
          level_cooldown_days?: number
          max_hour?: number
          max_per_patient_per_week?: number
          min_hour?: number
          overdue_repeat_interval_days?: number
          send_hour?: number
          template_before?: string
          template_level1?: string
          template_level2?: string
          template_level3?: string
          template_overdue?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_after_due?: number
          days_before_due?: number
          id?: string
          is_enabled?: boolean
          level_cooldown_days?: number
          max_hour?: number
          max_per_patient_per_week?: number
          min_hour?: number
          overdue_repeat_interval_days?: number
          send_hour?: number
          template_before?: string
          template_level1?: string
          template_level2?: string
          template_level3?: string
          template_overdue?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          last_count_date: string | null
          last_count_quantity: number | null
          location: string | null
          product_id: string
          quantity: number
          reserved_quantity: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          last_count_date?: string | null
          last_count_quantity?: number | null
          location?: string | null
          product_id: string
          quantity?: number
          reserved_quantity?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          last_count_date?: string | null
          last_count_quantity?: number | null
          location?: string | null
          product_id?: string
          quantity?: number
          reserved_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          new_stock: number
          notes: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          total_cost: number | null
          transfer_branch_id: string | null
          unit_cost: number | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          new_stock: number
          notes?: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          transfer_branch_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          transfer_branch_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_transfer_branch_id_fkey"
            columns: ["transfer_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          lab_order_id: string
          new_status: string
          notes: string | null
          previous_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lab_order_id: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lab_order_id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_order_status_history_lab_order_id_fkey"
            columns: ["lab_order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          actual_delivery_date: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          estado_lab: string
          estimated_delivery_date: string | null
          fitting_height: number | null
          frame_brand: string | null
          frame_color: string | null
          frame_model: string | null
          frame_size: string | null
          id: string
          internal_notes: string | null
          laboratory_cost: number | null
          laboratory_name: string | null
          last_notified_by: string | null
          lens_color: string | null
          lens_material: string | null
          lens_treatment: string | null
          lens_type: string | null
          location: string
          notification_phone: string | null
          notification_sent_at: string | null
          notify_channel: string | null
          notify_count: number | null
          od_add: number | null
          od_axis: number | null
          od_cylinder: number | null
          od_prism: number | null
          od_prism_base: string | null
          od_sphere: number | null
          oi_add: number | null
          oi_axis: number | null
          oi_cylinder: number | null
          oi_prism: number | null
          oi_prism_base: string | null
          oi_sphere: number | null
          order_number: string
          order_type: string
          patient_id: string
          patient_phone: string | null
          pd_left: number | null
          pd_right: number | null
          pd_total: number | null
          prescription_id: string | null
          priority: string
          sale_id: string | null
          special_instructions: string | null
          status: string
          updated_at: string
          whatsapp_notification_sent: boolean | null
        }
        Insert: {
          actual_delivery_date?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          estado_lab?: string
          estimated_delivery_date?: string | null
          fitting_height?: number | null
          frame_brand?: string | null
          frame_color?: string | null
          frame_model?: string | null
          frame_size?: string | null
          id?: string
          internal_notes?: string | null
          laboratory_cost?: number | null
          laboratory_name?: string | null
          last_notified_by?: string | null
          lens_color?: string | null
          lens_material?: string | null
          lens_treatment?: string | null
          lens_type?: string | null
          location?: string
          notification_phone?: string | null
          notification_sent_at?: string | null
          notify_channel?: string | null
          notify_count?: number | null
          od_add?: number | null
          od_axis?: number | null
          od_cylinder?: number | null
          od_prism?: number | null
          od_prism_base?: string | null
          od_sphere?: number | null
          oi_add?: number | null
          oi_axis?: number | null
          oi_cylinder?: number | null
          oi_prism?: number | null
          oi_prism_base?: string | null
          oi_sphere?: number | null
          order_number: string
          order_type?: string
          patient_id: string
          patient_phone?: string | null
          pd_left?: number | null
          pd_right?: number | null
          pd_total?: number | null
          prescription_id?: string | null
          priority?: string
          sale_id?: string | null
          special_instructions?: string | null
          status?: string
          updated_at?: string
          whatsapp_notification_sent?: boolean | null
        }
        Update: {
          actual_delivery_date?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          estado_lab?: string
          estimated_delivery_date?: string | null
          fitting_height?: number | null
          frame_brand?: string | null
          frame_color?: string | null
          frame_model?: string | null
          frame_size?: string | null
          id?: string
          internal_notes?: string | null
          laboratory_cost?: number | null
          laboratory_name?: string | null
          last_notified_by?: string | null
          lens_color?: string | null
          lens_material?: string | null
          lens_treatment?: string | null
          lens_type?: string | null
          location?: string
          notification_phone?: string | null
          notification_sent_at?: string | null
          notify_channel?: string | null
          notify_count?: number | null
          od_add?: number | null
          od_axis?: number | null
          od_cylinder?: number | null
          od_prism?: number | null
          od_prism_base?: string | null
          od_sphere?: number | null
          oi_add?: number | null
          oi_axis?: number | null
          oi_cylinder?: number | null
          oi_prism?: number | null
          oi_prism_base?: string | null
          oi_sphere?: number | null
          order_number?: string
          order_type?: string
          patient_id?: string
          patient_phone?: string | null
          pd_left?: number | null
          pd_right?: number | null
          pd_total?: number | null
          prescription_id?: string | null
          priority?: string
          sale_id?: string | null
          special_instructions?: string | null
          status?: string
          updated_at?: string
          whatsapp_notification_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "patient_prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          min_redemption_points: number | null
          name: string
          peso_per_point: number | null
          points_per_peso: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_redemption_points?: number | null
          name?: string
          peso_per_point?: number | null
          points_per_peso?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_redemption_points?: number | null
          name?: string
          peso_per_point?: number | null
          points_per_peso?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_tiers: {
        Row: {
          benefits: Json | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          max_points: number | null
          min_points: number
          multiplier: number | null
          name: string
          program_id: string | null
          sort_order: number | null
        }
        Insert: {
          benefits?: Json | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          max_points?: number | null
          min_points?: number
          multiplier?: number | null
          name: string
          program_id?: string | null
          sort_order?: number | null
        }
        Update: {
          benefits?: Json | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          max_points?: number | null
          min_points?: number
          multiplier?: number | null
          name?: string
          program_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_tiers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          balance_after: number | null
          created_at: string
          created_by: string | null
          customer_loyalty_id: string
          description: string | null
          expires_at: string | null
          id: string
          multiplier_applied: number | null
          points: number | null
          reference_id: string | null
          reference_type: string | null
          sale_amount: number | null
          transaction_type: string
          wallet_amount: number | null
          wallet_balance_after: number | null
        }
        Insert: {
          balance_after?: number | null
          created_at?: string
          created_by?: string | null
          customer_loyalty_id: string
          description?: string | null
          expires_at?: string | null
          id?: string
          multiplier_applied?: number | null
          points?: number | null
          reference_id?: string | null
          reference_type?: string | null
          sale_amount?: number | null
          transaction_type: string
          wallet_amount?: number | null
          wallet_balance_after?: number | null
        }
        Update: {
          balance_after?: number | null
          created_at?: string
          created_by?: string | null
          customer_loyalty_id?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          multiplier_applied?: number | null
          points?: number | null
          reference_id?: string | null
          reference_type?: string | null
          sale_amount?: number | null
          transaction_type?: string
          wallet_amount?: number | null
          wallet_balance_after?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_loyalty_id_fkey"
            columns: ["customer_loyalty_id"]
            isOneToOne: false
            referencedRelation: "customer_loyalty"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          ai_generated: boolean | null
          ai_segment_id: string | null
          ai_suggestions: Json | null
          appointments_generated: number | null
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          campaign_type: string
          clicked_count: number | null
          completed_at: string | null
          converted_count: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          objective: string | null
          opened_count: number | null
          responses_count: number | null
          roi_estimated: number | null
          sales_attributed: number | null
          scheduled_at: string | null
          scheduled_send_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          target_audience: Json | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          ai_segment_id?: string | null
          ai_suggestions?: Json | null
          appointments_generated?: number | null
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          campaign_type: string
          clicked_count?: number | null
          completed_at?: string | null
          converted_count?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          objective?: string | null
          opened_count?: number | null
          responses_count?: number | null
          roi_estimated?: number | null
          sales_attributed?: number | null
          scheduled_at?: string | null
          scheduled_send_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          target_audience?: Json | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          ai_segment_id?: string | null
          ai_suggestions?: Json | null
          appointments_generated?: number | null
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          campaign_type?: string
          clicked_count?: number | null
          completed_at?: string | null
          converted_count?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          objective?: string | null
          opened_count?: number | null
          responses_count?: number | null
          roi_estimated?: number | null
          sales_attributed?: number | null
          scheduled_at?: string | null
          scheduled_send_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          target_audience?: Json | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      moroso_sale_exceptions: {
        Row: {
          created_at: string
          dias_atraso: number
          id: string
          patient_id: string
          reason: string
          saldo_pendiente: number
          sale_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dias_atraso?: number
          id?: string
          patient_id: string
          reason: string
          saldo_pendiente?: number
          sale_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dias_atraso?: number
          id?: string
          patient_id?: string
          reason?: string
          saldo_pendiente?: number
          sale_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moroso_sale_exceptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moroso_sale_exceptions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_read: boolean
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      package_items: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_required: boolean
          item_type: string
          label: string | null
          package_id: string
          product_id: string | null
          quantity: number
          sort_order: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          item_type: string
          label?: string | null
          package_id: string
          product_id?: string | null
          quantity?: number
          sort_order?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          item_type?: string
          label?: string | null
          package_id?: string
          product_id?: string | null
          quantity?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      package_prices_by_branch: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          package_id: string
          price: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          package_id: string
          price: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          package_id?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_prices_by_branch_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_prices_by_branch_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          base_price: number | null
          branch_scope: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          package_type: string
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          branch_scope?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          package_type?: string
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          branch_scope?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          package_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_attachments: {
        Row: {
          category: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          patient_id: string
          uploaded_at: string
          uploaded_by: string | null
          visit_id: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          patient_id: string
          uploaded_at?: string
          uploaded_by?: string | null
          visit_id?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          patient_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_attachments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_attachments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "patient_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_auth_codes: {
        Row: {
          attempts: number
          channel: string
          code: string
          created_at: string
          expires_at: string
          id: string
          patient_id: string | null
          phone_e164: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          channel?: string
          code: string
          created_at?: string
          expires_at: string
          id?: string
          patient_id?: string | null
          phone_e164: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          channel?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          patient_id?: string | null
          phone_e164?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "patient_auth_codes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_clinical_forms: {
        Row: {
          completed_at: string
          completed_by: string | null
          form_data: Json
          id: string
          notes: string | null
          patient_id: string
          template_id: string
          visit_id: string | null
        }
        Insert: {
          completed_at?: string
          completed_by?: string | null
          form_data: Json
          id?: string
          notes?: string | null
          patient_id: string
          template_id: string
          visit_id?: string | null
        }
        Update: {
          completed_at?: string
          completed_by?: string | null
          form_data?: Json
          id?: string
          notes?: string | null
          patient_id?: string
          template_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinical_forms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_clinical_forms_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "clinical_form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_clinical_forms_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "patient_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_deletion_audit: {
        Row: {
          appointments_count: number | null
          deleted_at: string
          deleted_by_user_id: string
          id: string
          lab_orders_count: number | null
          patient_id: string
          patient_name_snapshot: string
          payments_count: number | null
          reason: string
          saldo_pendiente_snapshot: number | null
          sales_count: number | null
        }
        Insert: {
          appointments_count?: number | null
          deleted_at?: string
          deleted_by_user_id: string
          id?: string
          lab_orders_count?: number | null
          patient_id: string
          patient_name_snapshot: string
          payments_count?: number | null
          reason: string
          saldo_pendiente_snapshot?: number | null
          sales_count?: number | null
        }
        Update: {
          appointments_count?: number | null
          deleted_at?: string
          deleted_by_user_id?: string
          id?: string
          lab_orders_count?: number | null
          patient_id?: string
          patient_name_snapshot?: string
          payments_count?: number | null
          reason?: string
          saldo_pendiente_snapshot?: number | null
          sales_count?: number | null
        }
        Relationships: []
      }
      patient_portal_audit: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          patient_id: string | null
          phone_e164: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          phone_e164?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          phone_e164?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_portal_audit_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_portal_config: {
        Row: {
          id: string
          max_otp_attempts: number
          otp_channel: string
          otp_expiry_minutes: number
          otp_template: string
          portal_link_template: string
          send_mode: string
          session_duration_days: number
          sms_sender: string | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_enabled: boolean
          updated_at: string
          updated_by: string | null
          whatsapp_sender: string | null
        }
        Insert: {
          id?: string
          max_otp_attempts?: number
          otp_channel?: string
          otp_expiry_minutes?: number
          otp_template?: string
          portal_link_template?: string
          send_mode?: string
          session_duration_days?: number
          sms_sender?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          whatsapp_sender?: string | null
        }
        Update: {
          id?: string
          max_otp_attempts?: number
          otp_channel?: string
          otp_expiry_minutes?: number
          otp_template?: string
          portal_link_template?: string
          send_mode?: string
          session_duration_days?: number
          sms_sender?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          whatsapp_sender?: string | null
        }
        Relationships: []
      }
      patient_portal_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_ip: string | null
          last_user_agent: string | null
          patient_id: string
          revoked: boolean
          session_token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          last_ip?: string | null
          last_user_agent?: string | null
          patient_id: string
          revoked?: boolean
          session_token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_ip?: string | null
          last_user_agent?: string | null
          patient_id?: string
          revoked?: boolean
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_portal_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_portal_tokens: {
        Row: {
          attempts_left: number
          created_at: string
          expires_at: string
          id: string
          patient_id: string
          patient_name: string | null
          phone_e164: string
          token: string
          used: boolean
        }
        Insert: {
          attempts_left?: number
          created_at?: string
          expires_at?: string
          id?: string
          patient_id: string
          patient_name?: string | null
          phone_e164: string
          token: string
          used?: boolean
        }
        Update: {
          attempts_left?: number
          created_at?: string
          expires_at?: string
          id?: string
          patient_id?: string
          patient_name?: string | null
          phone_e164?: string
          token?: string
          used?: boolean
        }
        Relationships: []
      }
      patient_prescriptions: {
        Row: {
          branch_id: string | null
          created_at: string
          diagnosis: string | null
          edit_reason: string | null
          edited_at: string | null
          edited_by: string | null
          exam_date: string
          examined_by: string | null
          id: string
          lens_material: string | null
          lens_treatment: string | null
          lens_type: string | null
          notes: string | null
          od_add: number | null
          od_axis: number | null
          od_cylinder: number | null
          od_prism: number | null
          od_prism_base: string | null
          od_pupil_distance: number | null
          od_sphere: number | null
          od_va_cc: string | null
          od_va_sc: string | null
          oi_add: number | null
          oi_axis: number | null
          oi_cylinder: number | null
          oi_prism: number | null
          oi_prism_base: string | null
          oi_pupil_distance: number | null
          oi_sphere: number | null
          oi_va_cc: string | null
          oi_va_sc: string | null
          patient_id: string
          previous_prescription_id: string | null
          recommendations: string | null
          status: Database["public"]["Enums"]["prescription_status"]
          total_pd: number | null
          updated_at: string
          visual_exam_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          diagnosis?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          edited_by?: string | null
          exam_date?: string
          examined_by?: string | null
          id?: string
          lens_material?: string | null
          lens_treatment?: string | null
          lens_type?: string | null
          notes?: string | null
          od_add?: number | null
          od_axis?: number | null
          od_cylinder?: number | null
          od_prism?: number | null
          od_prism_base?: string | null
          od_pupil_distance?: number | null
          od_sphere?: number | null
          od_va_cc?: string | null
          od_va_sc?: string | null
          oi_add?: number | null
          oi_axis?: number | null
          oi_cylinder?: number | null
          oi_prism?: number | null
          oi_prism_base?: string | null
          oi_pupil_distance?: number | null
          oi_sphere?: number | null
          oi_va_cc?: string | null
          oi_va_sc?: string | null
          patient_id: string
          previous_prescription_id?: string | null
          recommendations?: string | null
          status?: Database["public"]["Enums"]["prescription_status"]
          total_pd?: number | null
          updated_at?: string
          visual_exam_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          diagnosis?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          edited_by?: string | null
          exam_date?: string
          examined_by?: string | null
          id?: string
          lens_material?: string | null
          lens_treatment?: string | null
          lens_type?: string | null
          notes?: string | null
          od_add?: number | null
          od_axis?: number | null
          od_cylinder?: number | null
          od_prism?: number | null
          od_prism_base?: string | null
          od_pupil_distance?: number | null
          od_sphere?: number | null
          od_va_cc?: string | null
          od_va_sc?: string | null
          oi_add?: number | null
          oi_axis?: number | null
          oi_cylinder?: number | null
          oi_prism?: number | null
          oi_prism_base?: string | null
          oi_pupil_distance?: number | null
          oi_sphere?: number | null
          oi_va_cc?: string | null
          oi_va_sc?: string | null
          patient_id?: string
          previous_prescription_id?: string | null
          recommendations?: string | null
          status?: Database["public"]["Enums"]["prescription_status"]
          total_pd?: number | null
          updated_at?: string
          visual_exam_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_prescriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_prescriptions_previous_prescription_id_fkey"
            columns: ["previous_prescription_id"]
            isOneToOne: false
            referencedRelation: "patient_prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_prescriptions_visual_exam_id_fkey"
            columns: ["visual_exam_id"]
            isOneToOne: false
            referencedRelation: "visual_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_transfer_requests: {
        Row: {
          from_branch_id: string
          id: string
          notes: string | null
          patient_id: string
          reason: string
          requested_at: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          to_branch_id: string
          transfer_id: string | null
        }
        Insert: {
          from_branch_id: string
          id?: string
          notes?: string | null
          patient_id: string
          reason: string
          requested_at?: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_branch_id: string
          transfer_id?: string | null
        }
        Update: {
          from_branch_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string
          requested_at?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_branch_id?: string
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_transfer_requests_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfer_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfer_requests_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfer_requests_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "patient_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_transfers: {
        Row: {
          from_branch_id: string
          id: string
          keep_credit_owner: boolean
          notes: string | null
          patient_id: string
          pending_balance: number | null
          reason: string
          status: string
          to_branch_id: string
          transferred_at: string
          transferred_by: string
        }
        Insert: {
          from_branch_id: string
          id?: string
          keep_credit_owner?: boolean
          notes?: string | null
          patient_id: string
          pending_balance?: number | null
          reason: string
          status?: string
          to_branch_id: string
          transferred_at?: string
          transferred_by: string
        }
        Update: {
          from_branch_id?: string
          id?: string
          keep_credit_owner?: boolean
          notes?: string | null
          patient_id?: string
          pending_balance?: number | null
          reason?: string
          status?: string
          to_branch_id?: string
          transferred_at?: string
          transferred_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_visits: {
        Row: {
          attended_by: string | null
          branch_id: string | null
          chief_complaint: string | null
          created_at: string
          diagnosis: string | null
          examination_notes: string | null
          id: string
          next_visit_date: string | null
          next_visit_notes: string | null
          notes: string | null
          patient_id: string
          prescription_id: string | null
          symptoms: string | null
          treatment_plan: string | null
          updated_at: string
          visit_date: string
          visit_type: string
        }
        Insert: {
          attended_by?: string | null
          branch_id?: string | null
          chief_complaint?: string | null
          created_at?: string
          diagnosis?: string | null
          examination_notes?: string | null
          id?: string
          next_visit_date?: string | null
          next_visit_notes?: string | null
          notes?: string | null
          patient_id: string
          prescription_id?: string | null
          symptoms?: string | null
          treatment_plan?: string | null
          updated_at?: string
          visit_date?: string
          visit_type?: string
        }
        Update: {
          attended_by?: string | null
          branch_id?: string | null
          chief_complaint?: string | null
          created_at?: string
          diagnosis?: string | null
          examination_notes?: string | null
          id?: string
          next_visit_date?: string | null
          next_visit_notes?: string | null
          notes?: string | null
          patient_id?: string
          prescription_id?: string | null
          symptoms?: string | null
          treatment_plan?: string | null
          updated_at?: string
          visit_date?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_visits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_visits_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "patient_prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          address_reference_notes: string | null
          allergies: string | null
          anamnesis: string | null
          antecedentes_familiares: string | null
          antecedentes_personales: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          between_streets_1: string | null
          between_streets_2: string | null
          birth_date: string | null
          blood_type: string | null
          branch_id: string | null
          city: string | null
          created_at: string
          created_by: string | null
          curp: string | null
          current_branch_id: string | null
          current_medications: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          email: string | null
          first_name: string
          gender: string | null
          home_branch_id: string | null
          id: string
          is_active: boolean
          is_corporate_patient: boolean
          is_deleted: boolean
          last_name: string
          latitude: number | null
          longitude: number | null
          medical_conditions: string | null
          mobile: string | null
          neighborhood: string | null
          notes: string | null
          occupation: string | null
          origin_branch_id: string | null
          payment_probability_score: number | null
          payment_risk_level: string | null
          phone: string | null
          phone_e164: string | null
          referido_promotor_id: string | null
          referred_by: string | null
          rfc: string | null
          state: string | null
          status: Database["public"]["Enums"]["patient_status"]
          street: string | null
          street_number: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_opted_in: boolean
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_reference_notes?: string | null
          allergies?: string | null
          anamnesis?: string | null
          antecedentes_familiares?: string | null
          antecedentes_personales?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          between_streets_1?: string | null
          between_streets_2?: string | null
          birth_date?: string | null
          blood_type?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          curp?: string | null
          current_branch_id?: string | null
          current_medications?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          home_branch_id?: string | null
          id?: string
          is_active?: boolean
          is_corporate_patient?: boolean
          is_deleted?: boolean
          last_name: string
          latitude?: number | null
          longitude?: number | null
          medical_conditions?: string | null
          mobile?: string | null
          neighborhood?: string | null
          notes?: string | null
          occupation?: string | null
          origin_branch_id?: string | null
          payment_probability_score?: number | null
          payment_risk_level?: string | null
          phone?: string | null
          phone_e164?: string | null
          referido_promotor_id?: string | null
          referred_by?: string | null
          rfc?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          street?: string | null
          street_number?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_opted_in?: boolean
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_reference_notes?: string | null
          allergies?: string | null
          anamnesis?: string | null
          antecedentes_familiares?: string | null
          antecedentes_personales?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          between_streets_1?: string | null
          between_streets_2?: string | null
          birth_date?: string | null
          blood_type?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          curp?: string | null
          current_branch_id?: string | null
          current_medications?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          home_branch_id?: string | null
          id?: string
          is_active?: boolean
          is_corporate_patient?: boolean
          is_deleted?: boolean
          last_name?: string
          latitude?: number | null
          longitude?: number | null
          medical_conditions?: string | null
          mobile?: string | null
          neighborhood?: string | null
          notes?: string | null
          occupation?: string | null
          origin_branch_id?: string | null
          payment_probability_score?: number | null
          payment_risk_level?: string | null
          phone?: string | null
          phone_e164?: string | null
          referido_promotor_id?: string | null
          referred_by?: string | null
          rfc?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          street?: string | null
          street_number?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_opted_in?: boolean
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_current_branch_id_fkey"
            columns: ["current_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_home_branch_id_fkey"
            columns: ["home_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_origin_branch_id_fkey"
            columns: ["origin_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_referido_promotor_id_fkey"
            columns: ["referido_promotor_id"]
            isOneToOne: false
            referencedRelation: "comisiones_pendientes_resumen"
            referencedColumns: ["promotor_id"]
          },
          {
            foreignKeyName: "patients_referido_promotor_id_fkey"
            columns: ["referido_promotor_id"]
            isOneToOne: false
            referencedRelation: "promotor_ranking_mensual"
            referencedColumns: ["promotor_id"]
          },
          {
            foreignKeyName: "patients_referido_promotor_id_fkey"
            columns: ["referido_promotor_id"]
            isOneToOne: false
            referencedRelation: "promotores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_audit_log: {
        Row: {
          amount: number | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          new_payment_id: string | null
          old_payment_id: string | null
          patient_id: string | null
          payment_id: string | null
          performed_by: string
          reason: string | null
          sale_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_payment_id?: string | null
          old_payment_id?: string | null
          patient_id?: string | null
          payment_id?: string | null
          performed_by: string
          reason?: string | null
          sale_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_payment_id?: string | null
          old_payment_id?: string | null
          patient_id?: string | null
          payment_id?: string | null
          performed_by?: string
          reason?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_log_new_payment_id_fkey"
            columns: ["new_payment_id"]
            isOneToOne: false
            referencedRelation: "credit_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_log_old_payment_id_fkey"
            columns: ["old_payment_id"]
            isOneToOne: false
            referencedRelation: "credit_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_log_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "credit_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_log_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plan_installments: {
        Row: {
          amount: number
          created_at: string
          days_overdue: number | null
          due_date: string
          id: string
          installment_number: number
          paid_amount: number
          paid_at: string | null
          payment_plan_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          days_overdue?: number | null
          due_date: string
          id?: string
          installment_number: number
          paid_amount?: number
          paid_at?: string | null
          payment_plan_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          days_overdue?: number | null
          due_date?: string
          id?: string
          installment_number?: number
          paid_amount?: number
          paid_at?: string | null
          payment_plan_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plan_installments_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          created_at: string
          created_by: string | null
          down_payment: number
          id: string
          installment_amount: number
          interest_rate: number | null
          number_of_installments: number
          patient_id: string
          plan_type: string
          sale_id: string
          start_date: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          down_payment?: number
          id?: string
          installment_amount: number
          interest_rate?: number | null
          number_of_installments: number
          patient_id: string
          plan_type?: string
          sale_id: string
          start_date: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          down_payment?: number
          id?: string
          installment_amount?: number
          interest_rate?: number | null
          number_of_installments?: number
          patient_id?: string
          plan_type?: string
          sale_id?: string
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminder_log: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_message_log_id: string | null
          channel: string
          created_at: string
          dias_sin_pago: number
          error_message: string | null
          id: string
          message_content: string | null
          patient_id: string
          saldo_pendiente: number
          sale_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auto_message_log_id?: string | null
          channel?: string
          created_at?: string
          dias_sin_pago?: number
          error_message?: string | null
          id?: string
          message_content?: string | null
          patient_id: string
          saldo_pendiente?: number
          sale_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auto_message_log_id?: string | null
          channel?: string
          created_at?: string
          dias_sin_pago?: number
          error_message?: string | null
          id?: string
          message_content?: string | null
          patient_id?: string
          saldo_pendiente?: number
          sale_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminder_log_auto_message_log_id_fkey"
            columns: ["auto_message_log_id"]
            isOneToOne: false
            referencedRelation: "auto_message_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminder_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminder_log_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminder_settings: {
        Row: {
          created_at: string
          id: string
          interval_days: number
          is_enabled: boolean
          max_daily_per_patient: number
          mode: string
          send_hour: number
          template_content: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_days?: number
          is_enabled?: boolean
          max_daily_per_patient?: number
          mode?: string
          send_hour?: number
          template_content?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_days?: number
          is_enabled?: boolean
          max_daily_per_patient?: number
          mode?: string
          send_hour?: number
          template_content?: string
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      prescription_ai_analysis: {
        Row: {
          created_at: string
          findings: Json
          findings_count: number
          id: string
          patient_id: string
          prescription_id: string | null
          reviewed_at: string | null
          severity: string
          user_id: string
          was_reviewed: boolean
        }
        Insert: {
          created_at?: string
          findings?: Json
          findings_count?: number
          id?: string
          patient_id: string
          prescription_id?: string | null
          reviewed_at?: string | null
          severity: string
          user_id: string
          was_reviewed?: boolean
        }
        Update: {
          created_at?: string
          findings?: Json
          findings_count?: number
          id?: string
          patient_id?: string
          prescription_id?: string | null
          reviewed_at?: string | null
          severity?: string
          user_id?: string
          was_reviewed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "prescription_ai_analysis_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_ai_analysis_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "patient_prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      price_change_log: {
        Row: {
          branch_id: string | null
          changed_at: string
          changed_by: string | null
          id: string
          new_price: number
          previous_price: number | null
          product_id: string
        }
        Insert: {
          branch_id?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_price: number
          previous_price?: number | null
          product_id: string
        }
        Update: {
          branch_id?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_price?: number
          previous_price?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_change_log_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_change_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          requires_prescription: boolean
          updated_at: string
        }
        Insert: {
          category_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          requires_prescription?: boolean
          updated_at?: string
        }
        Update: {
          category_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          requires_prescription?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices_by_branch: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          price: number
          product_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          price: number
          product_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          price?: number
          product_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_by_branch_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_by_branch_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          category_id: string | null
          color: string | null
          controls_stock: boolean
          cost_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_serialized: boolean
          margin_percent: number | null
          material: string | null
          max_stock: number | null
          min_stock: number
          model: string | null
          name: string
          product_type: string
          reorder_point: number
          requires_prescription: boolean
          sale_price: number
          size: string | null
          sku: string
          specifications: Json | null
          updated_at: string
          utility: number | null
          wholesale_price: number | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          color?: string | null
          controls_stock?: boolean
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_serialized?: boolean
          margin_percent?: number | null
          material?: string | null
          max_stock?: number | null
          min_stock?: number
          model?: string | null
          name: string
          product_type?: string
          reorder_point?: number
          requires_prescription?: boolean
          sale_price?: number
          size?: string | null
          sku: string
          specifications?: Json | null
          updated_at?: string
          utility?: number | null
          wholesale_price?: number | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          color?: string | null
          controls_stock?: boolean
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_serialized?: boolean
          margin_percent?: number | null
          material?: string | null
          max_stock?: number | null
          min_stock?: number
          model?: string | null
          name?: string
          product_type?: string
          reorder_point?: number
          requires_prescription?: boolean
          sale_price?: number
          size?: string | null
          sku?: string
          specifications?: Json | null
          updated_at?: string
          utility?: number | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          default_branch_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          professional_license: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          default_branch_id?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          professional_license?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          default_branch_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          professional_license?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_branch_id_fkey"
            columns: ["default_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_usage: {
        Row: {
          applied_at: string
          applied_by: string | null
          discount_applied: number
          id: string
          promotion_id: string
          sale_id: string | null
          sale_item_id: string | null
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          discount_applied: number
          id?: string
          promotion_id: string
          sale_id?: string | null
          sale_item_id?: string | null
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          discount_applied?: number
          id?: string
          promotion_id?: string
          sale_id?: string | null
          sale_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_usage_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usage_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to: string
          branch_id: string | null
          branch_scope: string
          category_id: string | null
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id: string
          is_active: boolean
          is_combinable: boolean
          max_uses: number | null
          name: string
          package_id: string | null
          product_id: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          applies_to: string
          branch_id?: string | null
          branch_scope?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id?: string
          is_active?: boolean
          is_combinable?: boolean
          max_uses?: number | null
          name: string
          package_id?: string | null
          product_id?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          branch_id?: string | null
          branch_scope?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean
          is_combinable?: boolean
          max_uses?: number | null
          name?: string
          package_id?: string | null
          product_id?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      promotor_alert_thresholds: {
        Row: {
          activo: boolean
          alert_type: string
          created_at: string
          description: string | null
          id: string
          threshold_value: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          alert_type: string
          created_at?: string
          description?: string | null
          id?: string
          threshold_value: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          threshold_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      promotor_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          current_value: number
          id: string
          periodo: string
          promotor_id: string
          threshold_value: number
          triggered: boolean
          triggered_at: string | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          current_value?: number
          id?: string
          periodo: string
          promotor_id: string
          threshold_value: number
          triggered?: boolean
          triggered_at?: string | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          current_value?: number
          id?: string
          periodo?: string
          promotor_id?: string
          threshold_value?: number
          triggered?: boolean
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotor_alerts_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "comisiones_pendientes_resumen"
            referencedColumns: ["promotor_id"]
          },
          {
            foreignKeyName: "promotor_alerts_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "promotor_ranking_mensual"
            referencedColumns: ["promotor_id"]
          },
          {
            foreignKeyName: "promotor_alerts_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "promotores"
            referencedColumns: ["id"]
          },
        ]
      }
      promotor_comisiones: {
        Row: {
          created_at: string
          id: string
          monto_comision: number
          monto_venta: number
          paid_at: string | null
          paid_by: string | null
          payment_notes: string | null
          periodo: string
          promotor_id: string
          sale_id: string
          status: string
          tipo_comision: string
          updated_at: string
          valor_aplicado: number
        }
        Insert: {
          created_at?: string
          id?: string
          monto_comision: number
          monto_venta: number
          paid_at?: string | null
          paid_by?: string | null
          payment_notes?: string | null
          periodo: string
          promotor_id: string
          sale_id: string
          status?: string
          tipo_comision: string
          updated_at?: string
          valor_aplicado: number
        }
        Update: {
          created_at?: string
          id?: string
          monto_comision?: number
          monto_venta?: number
          paid_at?: string | null
          paid_by?: string | null
          payment_notes?: string | null
          periodo?: string
          promotor_id?: string
          sale_id?: string
          status?: string
          tipo_comision?: string
          updated_at?: string
          valor_aplicado?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotor_comisiones_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "comisiones_pendientes_resumen"
            referencedColumns: ["promotor_id"]
          },
          {
            foreignKeyName: "promotor_comisiones_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "promotor_ranking_mensual"
            referencedColumns: ["promotor_id"]
          },
          {
            foreignKeyName: "promotor_comisiones_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "promotores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotor_comisiones_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      promotor_commission_config: {
        Row: {
          activo: boolean
          created_at: string
          created_by: string | null
          fecha_inicio: string
          id: string
          promotor_id: string | null
          tipo_comision: string
          updated_at: string
          valor_comision: number
        }
        Insert: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          fecha_inicio?: string
          id?: string
          promotor_id?: string | null
          tipo_comision?: string
          updated_at?: string
          valor_comision?: number
        }
        Update: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          fecha_inicio?: string
          id?: string
          promotor_id?: string | null
          tipo_comision?: string
          updated_at?: string
          valor_comision?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotor_commission_config_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "comisiones_pendientes_resumen"
            referencedColumns: ["promotor_id"]
          },
          {
            foreignKeyName: "promotor_commission_config_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "promotor_ranking_mensual"
            referencedColumns: ["promotor_id"]
          },
          {
            foreignKeyName: "promotor_commission_config_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "promotores"
            referencedColumns: ["id"]
          },
        ]
      }
      promotores: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre_completo: string
          observaciones: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre_completo: string
          observaciones?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre_completo?: string
          observaciones?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          discount_percent: number | null
          id: string
          notes: string | null
          product_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          subtotal: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number
          subtotal: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          subtotal?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number
          expected_date: string | null
          id: string
          internal_notes: string | null
          is_auto_generated: boolean | null
          notes: string | null
          order_date: string
          order_number: string
          payment_due_date: string | null
          payment_status: string | null
          received_date: string | null
          shipping_cost: number | null
          status: string
          subtotal: number
          supplier_id: string
          tax_amount: number
          tax_rate: number | null
          total: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          expected_date?: string | null
          id?: string
          internal_notes?: string | null
          is_auto_generated?: boolean | null
          notes?: string | null
          order_date?: string
          order_number: string
          payment_due_date?: string | null
          payment_status?: string | null
          received_date?: string | null
          shipping_cost?: number | null
          status?: string
          subtotal?: number
          supplier_id: string
          tax_amount?: number
          tax_rate?: number | null
          total?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          expected_date?: string | null
          id?: string
          internal_notes?: string | null
          is_auto_generated?: boolean | null
          notes?: string | null
          order_date?: string
          order_number?: string
          payment_due_date?: string | null
          payment_status?: string | null
          received_date?: string | null
          shipping_cost?: number | null
          status?: string
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          tax_rate?: number | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_reception_items: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          lot_number: string | null
          order_item_id: string
          product_id: string
          quality_notes: string | null
          quality_status: string | null
          quantity_accepted: number
          quantity_received: number
          quantity_rejected: number
          reception_id: string
          rejection_reason: string | null
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          lot_number?: string | null
          order_item_id: string
          product_id: string
          quality_notes?: string | null
          quality_status?: string | null
          quantity_accepted: number
          quantity_received: number
          quantity_rejected?: number
          reception_id: string
          rejection_reason?: string | null
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          lot_number?: string | null
          order_item_id?: string
          product_id?: string
          quality_notes?: string | null
          quality_status?: string | null
          quantity_accepted?: number
          quantity_received?: number
          quantity_rejected?: number
          reception_id?: string
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_reception_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_reception_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_reception_items_reception_id_fkey"
            columns: ["reception_id"]
            isOneToOne: false
            referencedRelation: "purchase_receptions"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receptions: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          notes: string | null
          purchase_order_id: string
          received_by: string | null
          reception_date: string
          reception_number: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          purchase_order_id: string
          received_by?: string | null
          reception_date?: string
          reception_number: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          purchase_order_id?: string
          received_by?: string | null
          reception_date?: string
          reception_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receptions_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          category_id: string | null
          category_name: string | null
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          prescription_data: Json | null
          product_code: string | null
          product_name: string
          product_type: string
          profit_amount: number | null
          quantity: number
          sale_id: string
          subtotal: number
          unit_cost: number | null
          unit_price: number
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          prescription_data?: Json | null
          product_code?: string | null
          product_name: string
          product_type: string
          profit_amount?: number | null
          quantity?: number
          sale_id: string
          subtotal: number
          unit_cost?: number | null
          unit_price: number
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          prescription_data?: Json | null
          product_code?: string | null
          product_name?: string
          product_type?: string
          profit_amount?: number | null
          quantity?: number
          sale_id?: string
          subtotal?: number
          unit_cost?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_initial_payment: boolean | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_by: string | null
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_initial_payment?: boolean | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_by?: string | null
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_initial_payment?: boolean | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          received_by?: string | null
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          balance: number
          branch_id: string | null
          created_at: string
          credit_due_date: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number
          discount_percent: number | null
          id: string
          is_credit: boolean
          next_payment_amount: number | null
          next_payment_date: string | null
          next_payment_note: string | null
          notes: string | null
          offline_id: string | null
          package_id: string | null
          patient_id: string | null
          prescription_id: string | null
          promotor_id: string
          promotor_nombre: string | null
          sale_channel: string
          sale_number: string
          sale_responsible_name_snapshot: string | null
          sale_responsible_type: string | null
          sale_responsible_user_id: string | null
          seller_id: string
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          synced_at: string | null
          tax_amount: number
          total: number
          total_profit: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance?: number
          branch_id?: string | null
          created_at?: string
          credit_due_date?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number
          discount_percent?: number | null
          id?: string
          is_credit?: boolean
          next_payment_amount?: number | null
          next_payment_date?: string | null
          next_payment_note?: string | null
          notes?: string | null
          offline_id?: string | null
          package_id?: string | null
          patient_id?: string | null
          prescription_id?: string | null
          promotor_id?: string
          promotor_nombre?: string | null
          sale_channel?: string
          sale_number: string
          sale_responsible_name_snapshot?: string | null
          sale_responsible_type?: string | null
          sale_responsible_user_id?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          synced_at?: string | null
          tax_amount?: number
          total?: number
          total_profit?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance?: number
          branch_id?: string | null
          created_at?: string
          credit_due_date?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number
          discount_percent?: number | null
          id?: string
          is_credit?: boolean
          next_payment_amount?: number | null
          next_payment_date?: string | null
          next_payment_note?: string | null
          notes?: string | null
          offline_id?: string | null
          package_id?: string | null
          patient_id?: string | null
          prescription_id?: string | null
          promotor_id?: string
          promotor_nombre?: string | null
          sale_channel?: string
          sale_number?: string
          sale_responsible_name_snapshot?: string | null
          sale_responsible_type?: string | null
          sale_responsible_user_id?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          synced_at?: string | null
          tax_amount?: number
          total?: number
          total_profit?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "patient_prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "comisiones_pendientes_resumen"
            referencedColumns: ["promotor_id"]
          },
          {
            foreignKeyName: "sales_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "promotor_ranking_mensual"
            referencedColumns: ["promotor_id"]
          },
          {
            foreignKeyName: "sales_promotor_id_fkey"
            columns: ["promotor_id"]
            isOneToOne: false
            referencedRelation: "promotores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          alert_type: string
          branch_id: string
          created_at: string
          current_quantity: number
          id: string
          is_resolved: boolean
          product_id: string
          resolved_at: string | null
          resolved_by: string | null
          threshold_quantity: number
        }
        Insert: {
          alert_type: string
          branch_id: string
          created_at?: string
          current_quantity: number
          id?: string
          is_resolved?: boolean
          product_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          threshold_quantity: number
        }
        Update: {
          alert_type?: string
          branch_id?: string
          created_at?: string
          current_quantity?: number
          id?: string
          is_resolved?: boolean
          product_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          threshold_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          created_at: string
          id: string
          is_preferred: boolean | null
          last_purchase_date: string | null
          last_purchase_price: number | null
          lead_time_days: number | null
          min_order_quantity: number | null
          product_id: string
          supplier_id: string
          supplier_price: number
          supplier_sku: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_preferred?: boolean | null
          last_purchase_date?: string | null
          last_purchase_price?: number | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          product_id: string
          supplier_id: string
          supplier_price: number
          supplier_sku?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_preferred?: boolean | null
          last_purchase_date?: string | null
          last_purchase_price?: number | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          product_id?: string
          supplier_id?: string
          supplier_price?: number
          supplier_sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          city: string | null
          clabe: string | null
          code: string
          contact_name: string | null
          country: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          is_active: boolean
          legal_name: string | null
          mobile: string | null
          name: string
          notes: string | null
          payment_terms: number | null
          phone: string | null
          rfc: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          city?: string | null
          clabe?: string | null
          code: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          mobile?: string | null
          name: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          rfc?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          city?: string | null
          clabe?: string | null
          code?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          mobile?: string | null
          name?: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          rfc?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      system_version_log: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          title: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          title: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          title?: string
          version?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_exams: {
        Row: {
          branch_id: string | null
          convergence_near_point: string | null
          cover_test: string | null
          created_at: string
          diagnosis: string | null
          ductions: string | null
          exam_date: string
          examined_by: string | null
          icd_codes: string[] | null
          id: string
          iop_method: string | null
          iop_time: string | null
          notes: string | null
          od_amplitude_accommodation: number | null
          od_anterior_segment: string | null
          od_corneal_astig: number | null
          od_cup_disc_ratio: number | null
          od_fundus: string | null
          od_iop: number | null
          od_k_avg: number | null
          od_k1: number | null
          od_k1_axis: number | null
          od_k2: number | null
          od_k2_axis: number | null
          od_pupil_size: number | null
          oi_amplitude_accommodation: number | null
          oi_anterior_segment: string | null
          oi_corneal_astig: number | null
          oi_cup_disc_ratio: number | null
          oi_fundus: string | null
          oi_iop: number | null
          oi_k_avg: number | null
          oi_k1: number | null
          oi_k1_axis: number | null
          oi_k2: number | null
          oi_k2_axis: number | null
          oi_pupil_size: number | null
          patient_id: string
          prescription_id: string | null
          pupil_reaction: string | null
          updated_at: string
          versions: string | null
          visual_field_notes: string | null
        }
        Insert: {
          branch_id?: string | null
          convergence_near_point?: string | null
          cover_test?: string | null
          created_at?: string
          diagnosis?: string | null
          ductions?: string | null
          exam_date?: string
          examined_by?: string | null
          icd_codes?: string[] | null
          id?: string
          iop_method?: string | null
          iop_time?: string | null
          notes?: string | null
          od_amplitude_accommodation?: number | null
          od_anterior_segment?: string | null
          od_corneal_astig?: number | null
          od_cup_disc_ratio?: number | null
          od_fundus?: string | null
          od_iop?: number | null
          od_k_avg?: number | null
          od_k1?: number | null
          od_k1_axis?: number | null
          od_k2?: number | null
          od_k2_axis?: number | null
          od_pupil_size?: number | null
          oi_amplitude_accommodation?: number | null
          oi_anterior_segment?: string | null
          oi_corneal_astig?: number | null
          oi_cup_disc_ratio?: number | null
          oi_fundus?: string | null
          oi_iop?: number | null
          oi_k_avg?: number | null
          oi_k1?: number | null
          oi_k1_axis?: number | null
          oi_k2?: number | null
          oi_k2_axis?: number | null
          oi_pupil_size?: number | null
          patient_id: string
          prescription_id?: string | null
          pupil_reaction?: string | null
          updated_at?: string
          versions?: string | null
          visual_field_notes?: string | null
        }
        Update: {
          branch_id?: string | null
          convergence_near_point?: string | null
          cover_test?: string | null
          created_at?: string
          diagnosis?: string | null
          ductions?: string | null
          exam_date?: string
          examined_by?: string | null
          icd_codes?: string[] | null
          id?: string
          iop_method?: string | null
          iop_time?: string | null
          notes?: string | null
          od_amplitude_accommodation?: number | null
          od_anterior_segment?: string | null
          od_corneal_astig?: number | null
          od_cup_disc_ratio?: number | null
          od_fundus?: string | null
          od_iop?: number | null
          od_k_avg?: number | null
          od_k1?: number | null
          od_k1_axis?: number | null
          od_k2?: number | null
          od_k2_axis?: number | null
          od_pupil_size?: number | null
          oi_amplitude_accommodation?: number | null
          oi_anterior_segment?: string | null
          oi_corneal_astig?: number | null
          oi_cup_disc_ratio?: number | null
          oi_fundus?: string | null
          oi_iop?: number | null
          oi_k_avg?: number | null
          oi_k1?: number | null
          oi_k1_axis?: number | null
          oi_k2?: number | null
          oi_k2_axis?: number | null
          oi_pupil_size?: number | null
          patient_id?: string
          prescription_id?: string | null
          pupil_reaction?: string | null
          updated_at?: string
          versions?: string | null
          visual_field_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visual_exams_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_exams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_exams_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "patient_prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_room: {
        Row: {
          appointment_id: string
          branch_id: string | null
          called_at: string | null
          checked_in_at: string
          created_at: string
          id: string
          notes: string | null
          patient_id: string | null
          patient_name: string
          priority: number | null
          status: string
        }
        Insert: {
          appointment_id: string
          branch_id?: string | null
          called_at?: string | null
          checked_in_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name: string
          priority?: number | null
          status?: string
        }
        Update: {
          appointment_id?: string
          branch_id?: string | null
          called_at?: string | null
          checked_in_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string
          priority?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiting_room_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_room_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_room_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      comisiones_pendientes_resumen: {
        Row: {
          comisiones_pendientes: number | null
          nombre_completo: string | null
          promotor_id: string | null
          total_pendiente: number | null
        }
        Relationships: []
      }
      promotor_ranking_mensual: {
        Row: {
          nombre_completo: string | null
          num_ventas: number | null
          periodo: string | null
          promotor_id: string | null
          total_comisiones: number | null
          total_ventas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_transfer_request: {
        Args: { p_request_id: string; p_review_notes?: string }
        Returns: Json
      }
      archive_patient: {
        Args: { p_patient_id: string; p_reason: string }
        Returns: Json
      }
      calculate_cash_register_expected: {
        Args: { p_cash_register_id: string }
        Returns: number
      }
      calculate_contact_lens_bc: { Args: { p_k_avg: number }; Returns: number }
      calculate_credit_score: {
        Args: { p_patient_id: string }
        Returns: number
      }
      calculate_payment_probability: {
        Args: { p_patient_id: string }
        Returns: Json
      }
      calculate_promotor_commission: {
        Args: {
          p_monto_venta: number
          p_promotor_id: string
          p_sale_id: string
        }
        Returns: number
      }
      can_access_branch: { Args: { p_branch_id: string }; Returns: boolean }
      check_action_authorization: {
        Args: {
          p_action_type: Database["public"]["Enums"]["authorization_action_type"]
          p_resource_id?: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: {
          approved_request_id: string
          is_authorized: boolean
          pending_request_id: string
        }[]
      }
      check_stock_alerts: {
        Args: { p_branch_id: string; p_product_id: string }
        Returns: undefined
      }
      cleanup_expired_notifications: { Args: never; Returns: undefined }
      consume_portal_token_attempt: {
        Args: { p_token: string }
        Returns: boolean
      }
      create_payment_plan: {
        Args: {
          p_created_by?: string
          p_down_payment: number
          p_interest_rate?: number
          p_number_of_installments: number
          p_patient_id: string
          p_plan_type: string
          p_sale_id: string
          p_start_date?: string
          p_total_amount: number
        }
        Returns: string
      }
      create_portal_token: {
        Args: {
          p_expires_minutes?: number
          p_patient_id: string
          p_patient_name: string
          p_phone_e164: string
          p_token: string
        }
        Returns: string
      }
      current_user_branch_id: { Args: never; Returns: string }
      earn_loyalty_points: {
        Args: { p_patient_id: string; p_sale_amount: number; p_sale_id: string }
        Returns: number
      }
      find_patient_by_phone_portal: {
        Args: { p_phone: string }
        Returns: {
          first_name: string
          id: string
          last_name: string
        }[]
      }
      generate_auto_purchase_order: {
        Args: { p_branch_id: string; p_created_by: string }
        Returns: string
      }
      generate_branch_code: { Args: never; Returns: string }
      generate_expense_number: { Args: never; Returns: string }
      generate_lab_order_number: { Args: never; Returns: string }
      generate_po_number: { Args: never; Returns: string }
      generate_prescription_number: { Args: never; Returns: string }
      generate_product_sku: { Args: never; Returns: string }
      generate_reception_number: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_sale_number: { Args: never; Returns: string }
      generate_supplier_code: { Args: never; Returns: string }
      get_active_draft: {
        Args: {
          p_branch_id: string
          p_entity_id?: string
          p_form_type: string
          p_user_id: string
        }
        Returns: {
          draft_data: Json
          id: string
          updated_at: string
        }[]
      }
      get_add_suggestion_by_age: { Args: { p_age: number }; Returns: number }
      get_applicable_promotions: {
        Args: {
          p_branch_id?: string
          p_category_id?: string
          p_package_id?: string
          p_product_id?: string
        }
        Returns: {
          applies_to: string
          discount_type: string
          discount_value: number
          id: string
          is_combinable: boolean
          name: string
        }[]
      }
      get_available_slots: {
        Args: { p_branch_id: string; p_date: string; p_doctor_id: string }
        Returns: {
          slot_end: string
          slot_time: string
        }[]
      }
      get_birthday_users: {
        Args: never
        Returns: {
          birth_date: string
          full_name: string
          phone: string
          user_id: string
        }[]
      }
      get_effective_price: {
        Args: { p_branch_id: string; p_product_id: string }
        Returns: number
      }
      get_pending_auth_requests_count: { Args: never; Returns: number }
      get_product_stock: {
        Args: { p_product_id: string }
        Returns: {
          available_quantity: number
          branch_id: string
          branch_name: string
          quantity: number
          reserved_quantity: number
        }[]
      }
      get_profile_by_email: {
        Args: { _email: string }
        Returns: {
          default_branch_id: string
          full_name: string
          is_active: boolean
          user_id: string
        }[]
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_birthday: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
      log_access_event: {
        Args: {
          _branch_id?: string
          _email: string
          _event_type: Database["public"]["Enums"]["access_event_type"]
          _ip_address?: string
          _metadata?: Json
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      mark_authorization_executed: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      mark_portal_token_used: { Args: { p_token: string }; Returns: undefined }
      normalize_phone_mx: { Args: { p_phone: string }; Returns: string }
      process_reception_item: {
        Args: {
          p_branch_id: string
          p_received_by: string
          p_reception_item_id: string
        }
        Returns: undefined
      }
      reactivate_patient: { Args: { p_patient_id: string }; Returns: Json }
      redeem_loyalty_points: {
        Args: {
          p_customer_loyalty_id: string
          p_description?: string
          p_points: number
        }
        Returns: number
      }
      reject_transfer_request: {
        Args: { p_request_id: string; p_review_notes?: string }
        Returns: Json
      }
      resolve_draft: {
        Args: { p_draft_id: string; p_status: string }
        Returns: boolean
      }
      set_user_roles: {
        Args: { p_roles: Json; p_target_user_id: string }
        Returns: Json
      }
      soft_delete_patient: {
        Args: { p_patient_id: string; p_reason: string }
        Returns: Json
      }
      spherical_equivalent: {
        Args: { p_cylinder: number; p_sphere: number }
        Returns: number
      }
      transfer_patient: {
        Args: {
          p_keep_credit_owner?: boolean
          p_notes?: string
          p_patient_id: string
          p_reason: string
          p_to_branch_id: string
        }
        Returns: Json
      }
      transpose_cylinder: {
        Args: { p_axis: number; p_cylinder: number; p_sphere: number }
        Returns: {
          new_axis: number
          new_cylinder: number
          new_sphere: number
        }[]
      }
      update_customer_tier: {
        Args: { p_customer_loyalty_id: string }
        Returns: string
      }
      update_inventory: {
        Args: {
          p_branch_id: string
          p_created_by?: string
          p_movement_type: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reference_id?: string
          p_reference_type?: string
          p_transfer_branch_id?: string
          p_unit_cost?: number
        }
        Returns: string
      }
      update_overdue_installments: { Args: never; Returns: undefined }
      update_promotor_alerts: {
        Args: { p_promotor_id: string }
        Returns: undefined
      }
      upsert_draft: {
        Args: {
          p_branch_id: string
          p_draft_data: Json
          p_entity_id: string
          p_form_type: string
          p_user_id: string
        }
        Returns: string
      }
      validate_portal_token: {
        Args: { p_token: string }
        Returns: {
          attempts_left: number
          patient_id: string
          patient_name: string
          phone_e164: string
          valid: boolean
        }[]
      }
      void_payment: {
        Args: { p_payment_id: string; p_reason: string; p_voided_by: string }
        Returns: Json
      }
    }
    Enums: {
      access_event_type:
        | "login_success"
        | "login_failed"
        | "logout"
        | "password_reset_requested"
        | "password_reset_completed"
        | "session_expired"
        | "account_locked"
        | "permission_denied"
      app_role:
        | "admin"
        | "doctor"
        | "asistente"
        | "vendedor"
        | "cobrador"
        | "super_admin"
        | "gerente"
        | "optometrista"
        | "tecnico"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "waiting"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      appointment_type:
        | "exam"
        | "follow_up"
        | "contact_lens"
        | "emergency"
        | "other"
        | "delivery"
      authorization_action_type:
        | "CHANGE_PRICE"
        | "APPLY_DISCOUNT"
        | "EDIT_USER"
        | "DELETE_USER"
        | "EDIT_PATIENT"
        | "DELETE_PATIENT"
        | "EDIT_PRODUCT"
        | "DELETE_PRODUCT"
        | "INVENTORY_ADJUSTMENT"
        | "CHANGE_CREDIT_SETTINGS"
        | "CHANGE_CONFIG"
      authorization_request_status:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "EXPIRED"
      auto_message_type:
        | "order_ready"
        | "appointment_reminder"
        | "post_sale_followup"
        | "birthday_greeting"
        | "order_delayed"
        | "payment_reminder"
      message_channel: "whatsapp" | "sms"
      patient_status: "active" | "inactive" | "archived"
      payment_method: "cash" | "card" | "transfer" | "check" | "credit"
      prescription_status: "VIGENTE" | "CORREGIDA"
      sale_status:
        | "pending"
        | "completed"
        | "cancelled"
        | "refunded"
        | "partial"
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
      access_event_type: [
        "login_success",
        "login_failed",
        "logout",
        "password_reset_requested",
        "password_reset_completed",
        "session_expired",
        "account_locked",
        "permission_denied",
      ],
      app_role: [
        "admin",
        "doctor",
        "asistente",
        "vendedor",
        "cobrador",
        "super_admin",
        "gerente",
        "optometrista",
        "tecnico",
      ],
      appointment_status: [
        "scheduled",
        "confirmed",
        "waiting",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      appointment_type: [
        "exam",
        "follow_up",
        "contact_lens",
        "emergency",
        "other",
        "delivery",
      ],
      authorization_action_type: [
        "CHANGE_PRICE",
        "APPLY_DISCOUNT",
        "EDIT_USER",
        "DELETE_USER",
        "EDIT_PATIENT",
        "DELETE_PATIENT",
        "EDIT_PRODUCT",
        "DELETE_PRODUCT",
        "INVENTORY_ADJUSTMENT",
        "CHANGE_CREDIT_SETTINGS",
        "CHANGE_CONFIG",
      ],
      authorization_request_status: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "EXPIRED",
      ],
      auto_message_type: [
        "order_ready",
        "appointment_reminder",
        "post_sale_followup",
        "birthday_greeting",
        "order_delayed",
        "payment_reminder",
      ],
      message_channel: ["whatsapp", "sms"],
      patient_status: ["active", "inactive", "archived"],
      payment_method: ["cash", "card", "transfer", "check", "credit"],
      prescription_status: ["VIGENTE", "CORREGIDA"],
      sale_status: ["pending", "completed", "cancelled", "refunded", "partial"],
    },
  },
} as const
