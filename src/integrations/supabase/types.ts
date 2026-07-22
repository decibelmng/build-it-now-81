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
      contractor_access_links: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          is_default: boolean
          label: string | null
          property_id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string | null
          property_id: string
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string | null
          property_id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_access_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "contractor_access_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_access_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      contractor_submissions: {
        Row: {
          access_link_id: string
          add_to_contacts: boolean
          contractor_company_name: string
          contractor_contact_name: string
          contractor_email: string | null
          contractor_phone: string | null
          cost: number | null
          created_at: string
          expense_type: string | null
          id: string
          notes: string | null
          photos: string[] | null
          property_id: string
          receipt_files: string[] | null
          reviewed_at: string | null
          service_category: string
          service_date: string
          service_description: string
          status: string
          system_key: string | null
          warranty_info: string | null
        }
        Insert: {
          access_link_id: string
          add_to_contacts?: boolean
          contractor_company_name: string
          contractor_contact_name: string
          contractor_email?: string | null
          contractor_phone?: string | null
          cost?: number | null
          created_at?: string
          expense_type?: string | null
          id?: string
          notes?: string | null
          photos?: string[] | null
          property_id: string
          receipt_files?: string[] | null
          reviewed_at?: string | null
          service_category: string
          service_date: string
          service_description: string
          status?: string
          system_key?: string | null
          warranty_info?: string | null
        }
        Update: {
          access_link_id?: string
          add_to_contacts?: boolean
          contractor_company_name?: string
          contractor_contact_name?: string
          contractor_email?: string | null
          contractor_phone?: string | null
          cost?: number | null
          created_at?: string
          expense_type?: string | null
          id?: string
          notes?: string | null
          photos?: string[] | null
          property_id?: string
          receipt_files?: string[] | null
          reviewed_at?: string | null
          service_category?: string
          service_date?: string
          service_description?: string
          status?: string
          system_key?: string | null
          warranty_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_submissions_access_link_id_fkey"
            columns: ["access_link_id"]
            isOneToOne: false
            referencedRelation: "contractor_access_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_submissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "contractor_submissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_submissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          contact_id: string | null
          contractor_submission_id: string | null
          created_at: string
          description: string | null
          display_type: string
          document_date: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          home_item_id: string | null
          id: string
          is_important: boolean
          maintenance_log_id: string | null
          name: string
          property_id: string
          system_key: string | null
          tags: string[] | null
          title: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          category?: string
          contact_id?: string | null
          contractor_submission_id?: string | null
          created_at?: string
          description?: string | null
          display_type?: string
          document_date?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          home_item_id?: string | null
          id?: string
          is_important?: boolean
          maintenance_log_id?: string | null
          name: string
          property_id: string
          system_key?: string | null
          tags?: string[] | null
          title?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          contact_id?: string | null
          contractor_submission_id?: string | null
          created_at?: string
          description?: string | null
          display_type?: string
          document_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          home_item_id?: string | null
          id?: string
          is_important?: boolean
          maintenance_log_id?: string | null
          name?: string
          property_id?: string
          system_key?: string | null
          tags?: string[] | null
          title?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "home_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_contractor_submission_id_fkey"
            columns: ["contractor_submission_id"]
            isOneToOne: false
            referencedRelation: "contractor_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_home_item_id_fkey"
            columns: ["home_item_id"]
            isOneToOne: false
            referencedRelation: "home_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_maintenance_log_id_fkey"
            columns: ["maintenance_log_id"]
            isOneToOne: false
            referencedRelation: "maintenance_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      home_contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          is_archived: boolean
          is_preferred: boolean
          name: string
          notes: string | null
          phone: string | null
          property_id: string
          role: string
          share_to_directory: boolean
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_archived?: boolean
          is_preferred?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          property_id: string
          role?: string
          share_to_directory?: boolean
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_archived?: boolean
          is_preferred?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          property_id?: string
          role?: string
          share_to_directory?: boolean
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "home_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      home_item_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          home_item_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          home_item_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          home_item_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_item_attachments_home_item_id_fkey"
            columns: ["home_item_id"]
            isOneToOne: false
            referencedRelation: "home_items"
            referencedColumns: ["id"]
          },
        ]
      }
      home_items: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          data_completeness: number
          estimated_value: number | null
          expected_replacement: string | null
          id: string
          install_date: string | null
          is_active: boolean
          is_registry_skeleton: boolean
          item_type: string
          last_maintained: string | null
          last_updated_at: string | null
          last_updated_from_log_id: string | null
          model: string | null
          name: string
          notes: string | null
          property_id: string | null
          serial_number: string | null
          system_instance: number | null
          system_key: string | null
          updated_at: string
          user_id: string
          warranty_expiry: string | null
        }
        Insert: {
          brand?: string | null
          category?: string
          created_at?: string
          data_completeness?: number
          estimated_value?: number | null
          expected_replacement?: string | null
          id?: string
          install_date?: string | null
          is_active?: boolean
          is_registry_skeleton?: boolean
          item_type?: string
          last_maintained?: string | null
          last_updated_at?: string | null
          last_updated_from_log_id?: string | null
          model?: string | null
          name: string
          notes?: string | null
          property_id?: string | null
          serial_number?: string | null
          system_instance?: number | null
          system_key?: string | null
          updated_at?: string
          user_id: string
          warranty_expiry?: string | null
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          data_completeness?: number
          estimated_value?: number | null
          expected_replacement?: string | null
          id?: string
          install_date?: string | null
          is_active?: boolean
          is_registry_skeleton?: boolean
          item_type?: string
          last_maintained?: string | null
          last_updated_at?: string | null
          last_updated_from_log_id?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          property_id?: string | null
          serial_number?: string | null
          system_instance?: number | null
          system_key?: string | null
          updated_at?: string
          user_id?: string
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_items_last_updated_from_log_id_fkey"
            columns: ["last_updated_from_log_id"]
            isOneToOne: false
            referencedRelation: "maintenance_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "home_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      home_quick_refs: {
        Row: {
          category: string
          created_at: string
          id: string
          label: string
          property_id: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          label: string
          property_id: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          label?: string
          property_id?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_quick_refs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "home_quick_refs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_quick_refs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      maintenance_log_components: {
        Row: {
          component_id: string
          created_at: string | null
          id: string
          log_id: string
        }
        Insert: {
          component_id: string
          created_at?: string | null
          id?: string
          log_id: string
        }
        Update: {
          component_id?: string
          created_at?: string | null
          id?: string
          log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_log_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "home_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_log_components_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "maintenance_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          category: string
          completed_date: string | null
          component_id: string | null
          component_update_skipped: boolean
          component_updated: boolean
          contact_id: string | null
          contact_name_snapshot: string | null
          cost: number | null
          created_at: string
          description: string | null
          expense_type: string | null
          id: string
          image_url: string | null
          is_recurring: boolean | null
          property_id: string
          recurrence_interval: string | null
          reference_code: string | null
          scheduled_date: string | null
          scope: string
          status: string
          system_key: string | null
          tax_notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_date?: string | null
          component_id?: string | null
          component_update_skipped?: boolean
          component_updated?: boolean
          contact_id?: string | null
          contact_name_snapshot?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          expense_type?: string | null
          id?: string
          image_url?: string | null
          is_recurring?: boolean | null
          property_id: string
          recurrence_interval?: string | null
          reference_code?: string | null
          scheduled_date?: string | null
          scope?: string
          status?: string
          system_key?: string | null
          tax_notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_date?: string | null
          component_id?: string | null
          component_update_skipped?: boolean
          component_updated?: boolean
          contact_id?: string | null
          contact_name_snapshot?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          expense_type?: string | null
          id?: string
          image_url?: string | null
          is_recurring?: boolean | null
          property_id?: string
          recurrence_interval?: string | null
          reference_code?: string | null
          scheduled_date?: string | null
          scope?: string
          status?: string
          system_key?: string | null
          tax_notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "home_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "home_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "maintenance_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          persona: Database["public"]["Enums"]["user_persona"] | null
          phone: string | null
          share_contacts_to_directory: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          persona?: Database["public"]["Enums"]["user_persona"] | null
          phone?: string | null
          share_contacts_to_directory?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          persona?: Database["public"]["Enums"]["user_persona"] | null
          phone?: string | null
          share_contacts_to_directory?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          agent_commissions: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string
          current_estimated_value: number | null
          home_systems: Json | null
          id: string
          image_url: string | null
          latitude: number | null
          loan_term_months: number | null
          longitude: number | null
          mortgage_balance: number | null
          mortgage_document_id: string | null
          mortgage_last_updated: string | null
          mortgage_payment: number | null
          mortgage_rate: number | null
          name: string
          original_loan_amount: number | null
          property_code: string | null
          property_type: string
          purchase_closing_costs: number | null
          purchase_date: string | null
          purchase_price: number | null
          registry_completed: boolean
          sale_closing_costs: number | null
          sale_date: string | null
          sale_price: number | null
          sqft: number | null
          state: string | null
          updated_at: string
          user_id: string
          value_last_updated: string | null
          year_built: number | null
          zip: string | null
        }
        Insert: {
          address: string
          agent_commissions?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          current_estimated_value?: number | null
          home_systems?: Json | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          loan_term_months?: number | null
          longitude?: number | null
          mortgage_balance?: number | null
          mortgage_document_id?: string | null
          mortgage_last_updated?: string | null
          mortgage_payment?: number | null
          mortgage_rate?: number | null
          name: string
          original_loan_amount?: number | null
          property_code?: string | null
          property_type?: string
          purchase_closing_costs?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          registry_completed?: boolean
          sale_closing_costs?: number | null
          sale_date?: string | null
          sale_price?: number | null
          sqft?: number | null
          state?: string | null
          updated_at?: string
          user_id: string
          value_last_updated?: string | null
          year_built?: number | null
          zip?: string | null
        }
        Update: {
          address?: string
          agent_commissions?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          current_estimated_value?: number | null
          home_systems?: Json | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          loan_term_months?: number | null
          longitude?: number | null
          mortgage_balance?: number | null
          mortgage_document_id?: string | null
          mortgage_last_updated?: string | null
          mortgage_payment?: number | null
          mortgage_rate?: number | null
          name?: string
          original_loan_amount?: number | null
          property_code?: string | null
          property_type?: string
          purchase_closing_costs?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          registry_completed?: boolean
          sale_closing_costs?: number | null
          sale_date?: string | null
          sale_price?: number | null
          sqft?: number | null
          state?: string | null
          updated_at?: string
          user_id?: string
          value_last_updated?: string | null
          year_built?: number | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_mortgage_document_id_fkey"
            columns: ["mortgage_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      property_shares: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          permission: string
          property_id: string
          shared_with_email: string
          shared_with_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          permission?: string
          property_id: string
          shared_with_email: string
          shared_with_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          permission?: string
          property_id?: string
          shared_with_email?: string
          shared_with_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_shares_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_shares_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_shares_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_transfers: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          property_id: string
          status: string
          to_email: string
          to_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          property_id: string
          status?: string
          to_email: string
          to_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          property_id?: string
          status?: string
          to_email?: string
          to_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_transfers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_transfers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_transfers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_utilities: {
        Row: {
          account_number: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          monthly_cost: number | null
          notes: string | null
          property_id: string
          provider_name: string
          service_type: string
          updated_at: string
          user_id: string
          vendor_url: string | null
        }
        Insert: {
          account_number?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          monthly_cost?: number | null
          notes?: string | null
          property_id: string
          provider_name: string
          service_type?: string
          updated_at?: string
          user_id: string
          vendor_url?: string | null
        }
        Update: {
          account_number?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          monthly_cost?: number | null
          notes?: string | null
          property_id?: string
          provider_name?: string
          service_type?: string
          updated_at?: string
          user_id?: string
          vendor_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_utilities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_utilities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_utilities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_valuations: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string
          notes: string | null
          property_id: string
          source: string | null
          updated_at: string | null
          user_id: string
          valuation_date: string
          valuation_type: string
          value: number
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          notes?: string | null
          property_id: string
          source?: string | null
          updated_at?: string | null
          user_id: string
          valuation_date: string
          valuation_type?: string
          value: number
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          notes?: string | null
          property_id?: string
          source?: string | null
          updated_at?: string | null
          user_id?: string
          valuation_date?: string
          valuation_type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_valuations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      recurring_templates: {
        Row: {
          active: boolean
          category: string
          contact_id: string | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          interval_months: number
          last_created_at: string | null
          next_due_date: string
          property_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          interval_months?: number
          last_created_at?: string | null
          next_due_date: string
          property_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          interval_months?: number
          last_created_at?: string | null
          next_due_date?: string
          property_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_templates_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "home_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_templates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "cost_basis_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "recurring_templates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_templates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_equity_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      service_provider_directory: {
        Row: {
          city: string | null
          display_name: string
          first_seen_at: string
          id: string
          is_hidden: boolean
          last_seen_at: string
          normalized_name: string
          phone_normalized: string | null
          role: string | null
          source_contact_ids: string[]
          state: string | null
          times_saved: number
        }
        Insert: {
          city?: string | null
          display_name: string
          first_seen_at?: string
          id?: string
          is_hidden?: boolean
          last_seen_at?: string
          normalized_name: string
          phone_normalized?: string | null
          role?: string | null
          source_contact_ids?: string[]
          state?: string | null
          times_saved?: number
        }
        Update: {
          city?: string | null
          display_name?: string
          first_seen_at?: string
          id?: string
          is_hidden?: boolean
          last_seen_at?: string
          normalized_name?: string
          phone_normalized?: string | null
          role?: string | null
          source_contact_ids?: string[]
          state?: string | null
          times_saved?: number
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
      cost_basis_summary: {
        Row: {
          adjusted_basis: number | null
          agent_commissions: number | null
          estimated_gain: number | null
          improvement_count: number | null
          property_id: string | null
          purchase_closing_costs: number | null
          purchase_date: string | null
          purchase_price: number | null
          repair_count: number | null
          sale_closing_costs: number | null
          sale_date: string | null
          sale_price: number | null
          total_improvements: number | null
          total_repairs: number | null
          user_id: string | null
        }
        Relationships: []
      }
      property_equity_summary: {
        Row: {
          address: string | null
          appreciation: number | null
          appreciation_pct: number | null
          current_estimated_value: number | null
          equity_pct: number | null
          estimated_equity: number | null
          latest_appraisal_date: string | null
          latest_appraisal_value: number | null
          loan_term_months: number | null
          mortgage_balance: number | null
          mortgage_last_updated: string | null
          mortgage_payment: number | null
          mortgage_rate: number | null
          name: string | null
          original_loan_amount: number | null
          property_id: string | null
          purchase_date: string | null
          purchase_price: number | null
          user_id: string | null
          valuation_count: number | null
          value_last_updated: string | null
        }
        Insert: {
          address?: string | null
          appreciation?: never
          appreciation_pct?: never
          current_estimated_value?: number | null
          equity_pct?: never
          estimated_equity?: never
          latest_appraisal_date?: never
          latest_appraisal_value?: never
          loan_term_months?: number | null
          mortgage_balance?: number | null
          mortgage_last_updated?: string | null
          mortgage_payment?: number | null
          mortgage_rate?: number | null
          name?: string | null
          original_loan_amount?: number | null
          property_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          user_id?: string | null
          valuation_count?: never
          value_last_updated?: string | null
        }
        Update: {
          address?: string | null
          appreciation?: never
          appreciation_pct?: never
          current_estimated_value?: number | null
          equity_pct?: never
          estimated_equity?: never
          latest_appraisal_date?: never
          latest_appraisal_value?: never
          loan_term_months?: number | null
          mortgage_balance?: number | null
          mortgage_last_updated?: string | null
          mortgage_payment?: number | null
          mortgage_rate?: number | null
          name?: string | null
          original_loan_amount?: number | null
          property_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          user_id?: string | null
          valuation_count?: never
          value_last_updated?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_property_transfer: {
        Args: { p_transfer_id: string }
        Returns: undefined
      }
      delete_user_account: { Args: never; Returns: undefined }
      extract_house_number: { Args: { addr: string }; Returns: string }
      has_property_access: {
        Args: { p_property_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_company_name: { Args: { p_name: string }; Returns: string }
      normalize_phone: { Args: { p_phone: string }; Returns: string }
      set_directory_sharing: {
        Args: { p_enabled: boolean }
        Returns: undefined
      }
      suggest_providers: {
        Args: {
          p_city?: string
          p_limit?: number
          p_role?: string
          p_state?: string
        }
        Returns: {
          city: string
          display_name: string
          id: string
          match_rank: number
          phone_normalized: string
          role: string
          state: string
          times_saved: number
        }[]
      }
      trade_code: { Args: { category: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      user_persona: "homeowner" | "agent" | "inspector"
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
      app_role: ["admin", "moderator", "user"],
      user_persona: ["homeowner", "agent", "inspector"],
    },
  },
} as const
