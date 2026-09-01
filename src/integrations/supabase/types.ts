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
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          active: boolean
          address: string
          city: string
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          address: string
          city: string
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          address?: string
          city?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      cargos_tabelle_codifica: {
        Row: {
          codice: string
          created_at: string
          descrizione: string
          id: string
          raw: string | null
          tabella_id: number
          updated_at: string
        }
        Insert: {
          codice: string
          created_at?: string
          descrizione?: string
          id?: string
          raw?: string | null
          tabella_id: number
          updated_at?: string
        }
        Update: {
          codice?: string
          created_at?: string
          descrizione?: string
          id?: string
          raw?: string | null
          tabella_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      cargos_transmissions: {
        Row: {
          ambiente: string
          created_at: string
          errore: Json | null
          id: string
          last_attempt_at: string | null
          next_attempt_at: string | null
          payload: string
          reservation_id: string
          sent_at: string | null
          stato: string
          tentativi: number
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          ambiente?: string
          created_at?: string
          errore?: Json | null
          id?: string
          last_attempt_at?: string | null
          next_attempt_at?: string | null
          payload?: string
          reservation_id: string
          sent_at?: string | null
          stato?: string
          tentativi?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          ambiente?: string
          created_at?: string
          errore?: Json | null
          id?: string
          last_attempt_at?: string | null
          next_attempt_at?: string | null
          payload?: string
          reservation_id?: string
          sent_at?: string | null
          stato?: string
          tentativi?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargos_transmissions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          updated_at: string
          used_count: number
          valid_from: string
          valid_to: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_to?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_to?: string
        }
        Relationships: []
      }
      customer_login_requests: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string
          auth_user_id: string | null
          birth_date: string | null
          blacklist_reason: string | null
          blacklisted: boolean
          consenso_marketing: boolean
          consenso_privacy_at: string | null
          consenso_profilazione: boolean
          created_at: string
          driving_license_expiry: string | null
          driving_license_number: string
          email: string
          fiscal_code: string
          full_name: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string
          auth_user_id?: string | null
          birth_date?: string | null
          blacklist_reason?: string | null
          blacklisted?: boolean
          consenso_marketing?: boolean
          consenso_privacy_at?: string | null
          consenso_profilazione?: boolean
          created_at?: string
          driving_license_expiry?: string | null
          driving_license_number?: string
          email?: string
          fiscal_code?: string
          full_name: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          auth_user_id?: string | null
          birth_date?: string | null
          blacklist_reason?: string | null
          blacklisted?: boolean
          consenso_marketing?: boolean
          consenso_privacy_at?: string | null
          consenso_profilazione?: boolean
          created_at?: string
          driving_license_expiry?: string | null
          driving_license_number?: string
          email?: string
          fiscal_code?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      damage_components: {
        Row: {
          active: boolean
          code: string
          created_at: string
          damage_type_id: string
          default_view: string | null
          id: string
          label_it: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          damage_type_id: string
          default_view?: string | null
          id?: string
          label_it: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          damage_type_id?: string
          default_view?: string | null
          id?: string
          label_it?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "damage_components_damage_type_id_fkey"
            columns: ["damage_type_id"]
            isOneToOne: false
            referencedRelation: "damage_types"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_price_config: {
        Row: {
          category_id: string
          component_id: string
          created_at: string
          id: string
          prezzo_consigliato: number
          prezzo_max: number
          prezzo_min: number
          severity_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          component_id: string
          created_at?: string
          id?: string
          prezzo_consigliato?: number
          prezzo_max?: number
          prezzo_min?: number
          severity_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          component_id?: string
          created_at?: string
          id?: string
          prezzo_consigliato?: number
          prezzo_max?: number
          prezzo_min?: number
          severity_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_price_config_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_price_config_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "damage_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_price_config_severity_id_fkey"
            columns: ["severity_id"]
            isOneToOne: false
            referencedRelation: "damage_severities"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_severities: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          label_it: string
          livello: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          label_it: string
          livello?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label_it?: string
          livello?: number
        }
        Relationships: []
      }
      damage_types: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          label_it: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          label_it: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label_it?: string
          sort_order?: number
        }
        Relationships: []
      }
      documenti_prenotazione: {
        Row: {
          caricato_at: string
          created_at: string
          id: string
          reservation_id: string
          storage_path: string
          tipo: string
        }
        Insert: {
          caricato_at?: string
          created_at?: string
          id?: string
          reservation_id: string
          storage_path: string
          tipo: string
        }
        Update: {
          caricato_at?: string
          created_at?: string
          id?: string
          reservation_id?: string
          storage_path?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documenti_prenotazione_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      extras: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          label_en: string
          label_it: string
          max_qty: number
          price_per_day: number
          price_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          label_en: string
          label_it: string
          max_qty?: number
          price_per_day?: number
          price_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label_en?: string
          label_it?: string
          max_qty?: number
          price_per_day?: number
          price_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      insurance_package_components: {
        Row: {
          created_at: string
          id: string
          insurance_package_id: string
          insurance_spec_id: string
          valore_override: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          insurance_package_id: string
          insurance_spec_id: string
          valore_override?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          insurance_package_id?: string
          insurance_spec_id?: string
          valore_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_package_components_insurance_package_id_fkey"
            columns: ["insurance_package_id"]
            isOneToOne: false
            referencedRelation: "insurance_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_package_components_insurance_spec_id_fkey"
            columns: ["insurance_spec_id"]
            isOneToOne: false
            referencedRelation: "insurance_specs"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_packages: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          descrizione: string | null
          franchigia_residua: number
          id: string
          nome: string
          prezzo_giorno: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          descrizione?: string | null
          franchigia_residua?: number
          id?: string
          nome: string
          prezzo_giorno?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          descrizione?: string | null
          franchigia_residua?: number
          id?: string
          nome?: string
          prezzo_giorno?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_packages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_specs: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label_it: string
          tipo: string
          updated_at: string
          valore_default: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label_it: string
          tipo: string
          updated_at?: string
          valore_default?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label_it?: string
          tipo?: string
          updated_at?: string
          valore_default?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          anno: number
          cliente_denominazione: string
          cliente_piva_cf: string
          created_at: string
          data_emissione: string
          id: string
          imponibile: number
          iva: number
          numero_fattura: string
          pdf_url: string | null
          progressivo: number
          reservation_id: string
          stato: string
          totale: number
          updated_at: string
        }
        Insert: {
          anno?: number
          cliente_denominazione?: string
          cliente_piva_cf?: string
          created_at?: string
          data_emissione?: string
          id?: string
          imponibile?: number
          iva?: number
          numero_fattura: string
          pdf_url?: string | null
          progressivo?: number
          reservation_id: string
          stato?: string
          totale?: number
          updated_at?: string
        }
        Update: {
          anno?: number
          cliente_denominazione?: string
          cliente_piva_cf?: string
          created_at?: string
          data_emissione?: string
          id?: string
          imponibile?: number
          iva?: number
          numero_fattura?: string
          pdf_url?: string | null
          progressivo?: number
          reservation_id?: string
          stato?: string
          totale?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          content_md: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          published: boolean
          slug: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content_md: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
          version: number
        }
        Update: {
          content_md?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      loyalty_tiers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          nome: string
          sconto_percentuale: number
          soglia_noleggi_12_mesi: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          nome: string
          sconto_percentuale?: number
          soglia_noleggi_12_mesi?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          nome?: string
          sconto_percentuale?: number
          soglia_noleggi_12_mesi?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_order_lines: {
        Row: {
          created_at: string
          data_completamento: string | null
          descrizione_lavoro: string
          id: string
          importo: number
          record_id: string
          stato_riga: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_completamento?: string | null
          descrizione_lavoro?: string
          id?: string
          importo?: number
          record_id: string
          stato_riga?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_completamento?: string | null
          descrizione_lavoro?: string
          id?: string
          importo?: number
          record_id?: string
          stato_riga?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_order_lines_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          created_at: string
          data_apertura: string
          id: string
          note: string | null
          officina: string
          request_id: string
          stato: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_apertura?: string
          id?: string
          note?: string | null
          officina?: string
          request_id: string
          stato?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_apertura?: string
          id?: string
          note?: string | null
          officina?: string
          request_id?: string
          stato?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          created_at: string
          created_by: string | null
          data_segnalazione: string
          descrizione: string
          fermo_al: string | null
          fermo_dal: string | null
          id: string
          origine: string
          origine_id: string | null
          stato: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_segnalazione?: string
          descrizione?: string
          fermo_al?: string | null
          fermo_dal?: string | null
          id?: string
          origine?: string
          origine_id?: string | null
          stato?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_segnalazione?: string
          descrizione?: string
          fermo_al?: string | null
          fermo_dal?: string | null
          id?: string
          origine?: string
          origine_id?: string | null
          stato?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          canale: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          dedupe_key: string | null
          destinatario_email: string | null
          destinatario_telefono: string | null
          errore: string | null
          id: string
          payload: Json
          riferimento_id: string | null
          riferimento_tipo: string | null
          scheduled_for: string
          sent_at: string | null
          stato: Database["public"]["Enums"]["notification_status"]
          tipo: Database["public"]["Enums"]["notification_type"]
          updated_at: string
        }
        Insert: {
          canale?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          dedupe_key?: string | null
          destinatario_email?: string | null
          destinatario_telefono?: string | null
          errore?: string | null
          id?: string
          payload?: Json
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          scheduled_for?: string
          sent_at?: string | null
          stato?: Database["public"]["Enums"]["notification_status"]
          tipo: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Update: {
          canale?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          dedupe_key?: string | null
          destinatario_email?: string | null
          destinatario_telefono?: string | null
          errore?: string | null
          id?: string
          payload?: Json
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          scheduled_for?: string
          sent_at?: string | null
          stato?: Database["public"]["Enums"]["notification_status"]
          tipo?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Relationships: []
      }
      partner_leads: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          email: string
          fleet_size: string
          id: string
          message: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_name?: string
          created_at?: string
          email?: string
          fleet_size?: string
          id?: string
          message?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          fleet_size?: string
          id?: string
          message?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          discount_pct: number
          email: string
          id: string
          notes: string | null
          phone: string
          status: string
          vat_number: string
        }
        Insert: {
          company_name: string
          contact_name?: string
          created_at?: string
          discount_pct?: number
          email?: string
          id?: string
          notes?: string | null
          phone?: string
          status?: string
          vat_number?: string
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          discount_pct?: number
          email?: string
          id?: string
          notes?: string | null
          phone?: string
          status?: string
          vat_number?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          provider: string
          provider_payment_id: string | null
          receipt_path: string | null
          receipt_sent_at: string | null
          reservation_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          provider?: string
          provider_payment_id?: string | null
          receipt_path?: string | null
          receipt_sent_at?: string | null
          reservation_id: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          provider?: string
          provider_payment_id?: string | null
          receipt_path?: string | null
          receipt_sent_at?: string | null
          reservation_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          assigned_branch_id: string | null
          branch_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          active?: boolean
          assigned_branch_id?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
        }
        Update: {
          active?: boolean
          assigned_branch_id?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_branch_id_fkey"
            columns: ["assigned_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_plans: {
        Row: {
          active: boolean
          branch_id: string | null
          category_id: string
          created_at: string
          daily_rate: number
          extra_km_rate: number | null
          id: string
          included_km_per_day: number | null
          name: string
          updated_at: string
          valid_from: string
          valid_to: string
          weekly_rate: number | null
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          category_id: string
          created_at?: string
          daily_rate?: number
          extra_km_rate?: number | null
          id?: string
          included_km_per_day?: number | null
          name: string
          updated_at?: string
          valid_from?: string
          valid_to?: string
          weekly_rate?: number | null
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          category_id?: string
          created_at?: string
          daily_rate?: number
          extra_km_rate?: number | null
          id?: string
          included_km_per_day?: number | null
          name?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string
          weekly_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_plans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_extras: {
        Row: {
          created_at: string
          extra_id: string
          id: string
          qty: number
          reservation_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          extra_id: string
          id?: string
          qty?: number
          reservation_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          extra_id?: string
          id?: string
          qty?: number
          reservation_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservation_extras_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_extras_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          branch_id: string | null
          checkin_at: string | null
          checkin_data_confirmed_at: string | null
          checkin_equipment: string[]
          checkin_fuel_liters: number | null
          checkin_km: number | null
          checkin_signature_data_url: string | null
          checkin_signed_at: string | null
          checkout_at: string | null
          checkout_data_confirmed_at: string | null
          checkout_equipment: string[]
          checkout_fuel_liters: number | null
          checkout_km: number | null
          code: string
          consenso_marketing: boolean
          consenso_privacy: boolean
          consenso_profilazione: boolean
          contract_accepted_at: string | null
          contract_version: number | null
          coupon_code: string | null
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          damage_charge_amount: number
          date_from: string
          date_to: string
          discount_amount: number
          driver_age: string | null
          extra_km_amount: number
          extras_amount: number
          fuel_penalty_amount: number
          id: string
          insurance_amount: number
          insurance_package_id: string | null
          is_demo: boolean
          notes: string | null
          partner_id: string | null
          privacy_accepted_at: string | null
          signature_data_url: string | null
          signed_at: string | null
          status: string
          terms_accepted_at: string | null
          terms_version: number | null
          total_amount: number
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          vehicle_id: string | null
          verbale_consegna_url: string | null
          verbale_rientro_url: string | null
          vexatious_accepted_at: string | null
        }
        Insert: {
          branch_id?: string | null
          checkin_at?: string | null
          checkin_data_confirmed_at?: string | null
          checkin_equipment?: string[]
          checkin_fuel_liters?: number | null
          checkin_km?: number | null
          checkin_signature_data_url?: string | null
          checkin_signed_at?: string | null
          checkout_at?: string | null
          checkout_data_confirmed_at?: string | null
          checkout_equipment?: string[]
          checkout_fuel_liters?: number | null
          checkout_km?: number | null
          code: string
          consenso_marketing?: boolean
          consenso_privacy?: boolean
          consenso_profilazione?: boolean
          contract_accepted_at?: string | null
          contract_version?: number | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string
          damage_charge_amount?: number
          date_from: string
          date_to: string
          discount_amount?: number
          driver_age?: string | null
          extra_km_amount?: number
          extras_amount?: number
          fuel_penalty_amount?: number
          id?: string
          insurance_amount?: number
          insurance_package_id?: string | null
          is_demo?: boolean
          notes?: string | null
          partner_id?: string | null
          privacy_accepted_at?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          status?: string
          terms_accepted_at?: string | null
          terms_version?: number | null
          total_amount?: number
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_id?: string | null
          verbale_consegna_url?: string | null
          verbale_rientro_url?: string | null
          vexatious_accepted_at?: string | null
        }
        Update: {
          branch_id?: string | null
          checkin_at?: string | null
          checkin_data_confirmed_at?: string | null
          checkin_equipment?: string[]
          checkin_fuel_liters?: number | null
          checkin_km?: number | null
          checkin_signature_data_url?: string | null
          checkin_signed_at?: string | null
          checkout_at?: string | null
          checkout_data_confirmed_at?: string | null
          checkout_equipment?: string[]
          checkout_fuel_liters?: number | null
          checkout_km?: number | null
          code?: string
          consenso_marketing?: boolean
          consenso_privacy?: boolean
          consenso_profilazione?: boolean
          contract_accepted_at?: string | null
          contract_version?: number | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          damage_charge_amount?: number
          date_from?: string
          date_to?: string
          discount_amount?: number
          driver_age?: string | null
          extra_km_amount?: number
          extras_amount?: number
          fuel_penalty_amount?: number
          id?: string
          insurance_amount?: number
          insurance_package_id?: string | null
          is_demo?: boolean
          notes?: string | null
          partner_id?: string | null
          privacy_accepted_at?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          status?: string
          terms_accepted_at?: string | null
          terms_version?: number | null
          total_amount?: number
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_id?: string | null
          verbale_consegna_url?: string | null
          verbale_rientro_url?: string | null
          vexatious_accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_insurance_package_id_fkey"
            columns: ["insurance_package_id"]
            isOneToOne: false
            referencedRelation: "insurance_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_categories: {
        Row: {
          active: boolean
          code: string
          created_at: string
          damage_penalty: number
          damage_schema_image_url: string | null
          deposit_pct: number
          extra_km_rate: number
          fuel_price_per_liter: number
          id: string
          included_km_per_day: number
          label_en: string
          label_it: string
          macro_class: string
          payment_mode: string
          theft_penalty: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          damage_penalty?: number
          damage_schema_image_url?: string | null
          deposit_pct?: number
          extra_km_rate?: number
          fuel_price_per_liter?: number
          id?: string
          included_km_per_day?: number
          label_en: string
          label_it: string
          macro_class?: string
          payment_mode?: string
          theft_penalty?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          damage_penalty?: number
          damage_schema_image_url?: string | null
          deposit_pct?: number
          extra_km_rate?: number
          fuel_price_per_liter?: number
          id?: string
          included_km_per_day?: number
          label_en?: string
          label_it?: string
          macro_class?: string
          payment_mode?: string
          theft_penalty?: number
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_damages: {
        Row: {
          charge_amount: number
          charge_note: string | null
          component_id: string | null
          damage_type: string
          description: string | null
          id: string
          out_of_service: boolean
          phase: string
          pos_x: number
          pos_y: number
          reported_at: string
          reported_by: string | null
          reservation_id: string | null
          severity: string
          severity_id: string | null
          status: string
          vehicle_id: string
          view: string
        }
        Insert: {
          charge_amount?: number
          charge_note?: string | null
          component_id?: string | null
          damage_type?: string
          description?: string | null
          id?: string
          out_of_service?: boolean
          phase?: string
          pos_x?: number
          pos_y?: number
          reported_at?: string
          reported_by?: string | null
          reservation_id?: string | null
          severity?: string
          severity_id?: string | null
          status?: string
          vehicle_id: string
          view?: string
        }
        Update: {
          charge_amount?: number
          charge_note?: string | null
          component_id?: string | null
          damage_type?: string
          description?: string | null
          id?: string
          out_of_service?: boolean
          phase?: string
          pos_x?: number
          pos_y?: number
          reported_at?: string
          reported_by?: string | null
          reservation_id?: string | null
          severity?: string
          severity_id?: string | null
          status?: string
          vehicle_id?: string
          view?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_damages_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "damage_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_damages_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_damages_severity_id_fkey"
            columns: ["severity_id"]
            isOneToOne: false
            referencedRelation: "damage_severities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_damages_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_expirations: {
        Row: {
          created_at: string
          data_esecuzione: string | null
          data_scadenza: string | null
          eseguita: boolean
          id: string
          km_scadenza: number | null
          note: string | null
          priorita: string
          tipo: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          data_esecuzione?: string | null
          data_scadenza?: string | null
          eseguita?: boolean
          id?: string
          km_scadenza?: number | null
          note?: string | null
          priorita?: string
          tipo: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          data_esecuzione?: string | null
          data_scadenza?: string | null
          eseguita?: boolean
          id?: string
          km_scadenza?: number | null
          note?: string | null
          priorita?: string
          tipo?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_expirations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          branch_id: string | null
          category: string
          category_id: string | null
          created_at: string
          daily_rate: number
          fuel_capacity_liters: number
          id: string
          mileage: number
          model: string
          next_service_date: string | null
          plate: string
          status: string
        }
        Insert: {
          branch_id?: string | null
          category: string
          category_id?: string | null
          created_at?: string
          daily_rate?: number
          fuel_capacity_liters?: number
          id?: string
          mileage?: number
          model: string
          next_service_date?: string | null
          plate: string
          status?: string
        }
        Update: {
          branch_id?: string | null
          category?: string
          category_id?: string | null
          created_at?: string
          daily_rate?: number
          fuel_capacity_liters?: number
          id?: string
          mileage?: number
          model?: string
          next_service_date?: string | null
          plate?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_operate: { Args: { _user_id: string }; Returns: boolean }
      cron_token: { Args: { _name: string }; Returns: string }
      current_customer_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "responsabile_sede"
        | "front_desk"
        | "manutentore"
        | "contabilita"
      notification_channel: "email" | "whatsapp"
      notification_status: "in_coda" | "inviata" | "fallita"
      notification_type:
        | "scadenza_veicolo"
        | "fine_noleggio_imminente"
        | "documento_in_scadenza"
        | "conferma_prenotazione"
        | "altro"
        | "verbale_consegna"
        | "verbale_rientro"
        | "ricevuta_pagamento"
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
      app_role: [
        "super_admin",
        "admin",
        "responsabile_sede",
        "front_desk",
        "manutentore",
        "contabilita",
      ],
      notification_channel: ["email", "whatsapp"],
      notification_status: ["in_coda", "inviata", "fallita"],
      notification_type: [
        "scadenza_veicolo",
        "fine_noleggio_imminente",
        "documento_in_scadenza",
        "conferma_prenotazione",
        "altro",
        "verbale_consegna",
        "verbale_rientro",
        "ricevuta_pagamento",
      ],
    },
  },
} as const
