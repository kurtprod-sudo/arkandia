// =============================================================================
// ARKANDIA — Supabase Database Types
// Gerado manualmente para corresponder ao schema em supabase/migrations/001_initial_schema.sql
// Substitua este arquivo pelo output de:
//   npx supabase gen types typescript --project-id SEU_PROJECT_ID > types/database.types.ts
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          role: Database['public']['Enums']['user_role']
          created_at: string
        }
        Insert: {
          id: string
          username: string
          role?: Database['public']['Enums']['user_role']
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          role?: Database['public']['Enums']['user_role']
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      characters: {
        Row: {
          id: string
          user_id: string
          name: string
          level: number
          xp: number
          xp_to_next_level: number
          status: Database['public']['Enums']['character_status']
          title: string | null
          profession: Database['public']['Enums']['profession_type']
          archetype: Database['public']['Enums']['archetype_type'] | null
          class_id: string | null
          society_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          level?: number
          xp?: number
          xp_to_next_level?: number
          status?: Database['public']['Enums']['character_status']
          title?: string | null
          profession: Database['public']['Enums']['profession_type']
          archetype?: Database['public']['Enums']['archetype_type'] | null
          class_id?: string | null
          society_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          level?: number
          xp?: number
          xp_to_next_level?: number
          status?: Database['public']['Enums']['character_status']
          title?: string | null
          profession?: Database['public']['Enums']['profession_type']
          archetype?: Database['public']['Enums']['archetype_type'] | null
          class_id?: string | null
          society_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'characters_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'characters_class_id_fkey'
            columns: ['class_id']
            isOneToOne: false
            referencedRelation: 'classes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'characters_society_id_fkey'
            columns: ['society_id']
            isOneToOne: false
            referencedRelation: 'societies'
            referencedColumns: ['id']
          }
        ]
      }
      character_attributes: {
        Row: {
          character_id: string
          ataque: number
          magia: number
          eter_max: number
          eter_atual: number
          defesa: number
          vitalidade: number
          hp_max: number
          hp_atual: number
          velocidade: number
          precisao: number
          tenacidade: number
          capitania: number
          moral: number
          attribute_points: number
          updated_at: string
        }
        Insert: {
          character_id: string
          ataque?: number
          magia?: number
          eter_max?: number
          eter_atual?: number
          defesa?: number
          vitalidade?: number
          hp_max?: number
          hp_atual?: number
          velocidade?: number
          precisao?: number
          tenacidade?: number
          capitania?: number
          moral?: number
          attribute_points?: number
          updated_at?: string
        }
        Update: {
          character_id?: string
          ataque?: number
          magia?: number
          eter_max?: number
          eter_atual?: number
          defesa?: number
          vitalidade?: number
          hp_max?: number
          hp_atual?: number
          velocidade?: number
          precisao?: number
          tenacidade?: number
          capitania?: number
          moral?: number
          attribute_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'character_attributes_character_id_fkey'
            columns: ['character_id']
            isOneToOne: true
            referencedRelation: 'characters'
            referencedColumns: ['id']
          }
        ]
      }
      character_wallet: {
        Row: {
          character_id: string
          libras: number
          essencia: number
          premium_currency: number
          updated_at: string
        }
        Insert: {
          character_id: string
          libras?: number
          essencia?: number
          premium_currency?: number
          updated_at?: string
        }
        Update: {
          character_id?: string
          libras?: number
          essencia?: number
          premium_currency?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'character_wallet_character_id_fkey'
            columns: ['character_id']
            isOneToOne: true
            referencedRelation: 'characters'
            referencedColumns: ['id']
          }
        ]
      }
      professions: {
        Row: {
          id: string
          name: Database['public']['Enums']['profession_type']
          description: string
          base_attributes: Json
          bonuses: Json
        }
        Insert: {
          id?: string
          name: Database['public']['Enums']['profession_type']
          description?: string
          base_attributes?: Json
          bonuses?: Json
        }
        Update: {
          id?: string
          name?: Database['public']['Enums']['profession_type']
          description?: string
          base_attributes?: Json
          bonuses?: Json
        }
        Relationships: []
      }
      archetypes: {
        Row: {
          id: string
          name: Database['public']['Enums']['archetype_type']
          description: string
          lore_text: string
          passives: Json
        }
        Insert: {
          id?: string
          name: Database['public']['Enums']['archetype_type']
          description?: string
          lore_text?: string
          passives?: Json
        }
        Update: {
          id?: string
          name?: Database['public']['Enums']['archetype_type']
          description?: string
          lore_text?: string
          passives?: Json
        }
        Relationships: []
      }
      classes: {
        Row: {
          id: string
          name: string
          description: string
          allowed_professions: Json
          base_skill_ids: Json
        }
        Insert: {
          id?: string
          name: string
          description?: string
          allowed_professions?: Json
          base_skill_ids?: Json
        }
        Update: {
          id?: string
          name?: string
          description?: string
          allowed_professions?: Json
          base_skill_ids?: Json
        }
        Relationships: []
      }
      skills: {
        Row: {
          id: string
          name: string
          description: string
          type: Database['public']['Enums']['skill_type']
          damage_formula: Json | null
          is_true_damage: boolean
          defense_penetration: number
          eter_cost: number
          cooldown_turns: number
          effect_duration_turns: number | null
          range_state: Database['public']['Enums']['range_state']
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          type?: Database['public']['Enums']['skill_type']
          damage_formula?: Json | null
          is_true_damage?: boolean
          defense_penetration?: number
          eter_cost?: number
          cooldown_turns?: number
          effect_duration_turns?: number | null
          range_state?: Database['public']['Enums']['range_state']
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          type?: Database['public']['Enums']['skill_type']
          damage_formula?: Json | null
          is_true_damage?: boolean
          defense_penetration?: number
          eter_cost?: number
          cooldown_turns?: number
          effect_duration_turns?: number | null
          range_state?: Database['public']['Enums']['range_state']
          created_at?: string
        }
        Relationships: []
      }
      societies: {
        Row: {
          id: string
          name: string
          description: string
          leader_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          leader_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          leader_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'societies_leader_id_fkey'
            columns: ['leader_id']
            isOneToOne: false
            referencedRelation: 'characters'
            referencedColumns: ['id']
          }
        ]
      }
      society_members: {
        Row: {
          society_id: string
          character_id: string
          role: Database['public']['Enums']['society_member_role']
          joined_at: string
        }
        Insert: {
          society_id: string
          character_id: string
          role?: Database['public']['Enums']['society_member_role']
          joined_at?: string
        }
        Update: {
          society_id?: string
          character_id?: string
          role?: Database['public']['Enums']['society_member_role']
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'society_members_society_id_fkey'
            columns: ['society_id']
            isOneToOne: false
            referencedRelation: 'societies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'society_members_character_id_fkey'
            columns: ['character_id']
            isOneToOne: false
            referencedRelation: 'characters'
            referencedColumns: ['id']
          }
        ]
      }
      events: {
        Row: {
          id: string
          type: string
          actor_id: string | null
          target_id: string | null
          metadata: Json
          is_public: boolean
          narrative_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          actor_id?: string | null
          target_id?: string | null
          metadata?: Json
          is_public?: boolean
          narrative_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          actor_id?: string | null
          target_id?: string | null
          metadata?: Json
          is_public?: boolean
          narrative_text?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'characters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_target_id_fkey'
            columns: ['target_id']
            isOneToOne: false
            referencedRelation: 'characters'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: Database['public']['Enums']['user_role']
      }
      get_my_character_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      increment_attribute: {
        Args: {
          p_character_id: string
          p_attribute: string
          p_amount: number
        }
        Returns: undefined
      }
      gm_grant_currency: {
        Args: {
          p_character_id: string
          p_currency: string
          p_amount: number
        }
        Returns: undefined
      }
    }
    Enums: {
      user_role: 'player' | 'gm'
      character_status: 'active' | 'injured' | 'dead'
      profession_type:
        | 'comerciante'
        | 'militar'
        | 'clerigo'
        | 'explorador'
        | 'artesao'
        | 'erudito'
        | 'nobre'
        | 'mercenario'
      archetype_type:
        | 'ordem'
        | 'caos'
        | 'tempo'
        | 'espaco'
        | 'materia'
        | 'vida'
        | 'morte'
        | 'vontade'
        | 'sonho'
        | 'guerra'
        | 'vinculo'
        | 'ruina'
      skill_type: 'active' | 'passive'
      range_state: 'curto' | 'medio' | 'longo' | 'all'
      society_member_role: 'leader' | 'officer' | 'member'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
