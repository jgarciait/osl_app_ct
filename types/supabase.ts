export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      comites: {
        Row: {
          created_at: string
          id: string
          nombre: string
          tipo: string
        }
        Insert: {
          nombre: string
          tipo: string
          id?: string
        }
        Update: {
          nombre?: string
          tipo?: string
          id?: string
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          clave: string
          created_at: string
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          clave: string
          valor: string
          id?: string
        }
        Update: {
          clave?: string
          id?: string
          valor?: string
        }
        Relationships: []
      }
      documento_etiquetas: {
        Row: {
          created_at: string
          documento_id: string
          etiqueta_id: string
          id: string
        }
        Insert: {
          documento_id: string
          etiqueta_id: string
          id?: string
        }
        Update: {
          documento_id?: string
          etiqueta_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_etiquetas_documento_id_fkey"
            columns: ["documento_id"]
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_etiquetas_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            referencedRelation: "etiquetas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          created_at: string
          expresion_id: string
          id: string
          nombre: string
          ruta: string
          tamano: number | null
          tipo: string | null
        }
        Insert: {
          expresion_id: string
          nombre: string
          ruta: string
          tamano?: number | null
          tipo?: string | null
          id?: string
        }
        Update: {
          expresion_id?: string
          nombre?: string
          ruta?: string
          tamano?: number | null
          tipo?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_expresion_id_fkey"
            columns: ["expresion_id"]
            referencedRelation: "expresiones"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetas: {
        Row: {
          color: string | null
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          color?: string | null
          descripcion?: string | null
          nombre: string
          id?: string
        }
        Update: {
          color?: string | null
          descripcion?: string | null
          nombre?: string
          id?: string
        }
        Relationships: []
      }
      expresion_comites: {
        Row: {
          comite_id: string
          created_at: string
          expresion_id: string
        }
        Insert: {
          comite_id: string
          expresion_id: string
        }
        Update: {
          comite_id?: string
          expresion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expresion_comites_comite_id_fkey"
            columns: ["comite_id"]
            referencedRelation: "comites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expresion_comites_expresion_id_fkey"
            columns: ["expresion_id"]
            referencedRelation: "expresiones"
            referencedColumns: ["id"]
          },
        ]
      }
      expresiones: {
        Row: {
          ano: number
          archivado: boolean
          assigned_to: string | null
          created_at: string
          email: string
          fecha_recibido: string | null
          id: string
          mes: number
          notas: string | null
          nombre: string
          numero: string
          propuesta: string | null
          respuesta: string | null
          sequence: number
          tema: string | null
          tramite: string | null
          updated_at: string
        }
        Insert: {
          ano: number
          archivado?: boolean
          assigned_to?: string | null
          email: string
          fecha_recibido?: string | null
          id?: string
          mes: number
          notas?: string | null
          nombre: string
          numero: string
          propuesta?: string | null
          respuesta?: string | null
          sequence: number
          tema?: string | null
          tramite?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number
          archivado?: boolean
          assigned_to?: string | null
          email?: string
          fecha_recibido?: string | null
          id?: string
          mes?: number
          notas?: string | null
          nombre?: string
          numero?: string
          propuesta?: string | null
          respuesta?: string | null
          sequence?: number
          tema?: string | null
          tramite?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apellido: string | null
          created_at: string
          email: string | null
          id: string
          nombre: string | null
          role: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          apellido?: string | null
          created_at?: string
          email?: string | null
          id: string
          nombre?: string | null
          role?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          apellido?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string | null
          role?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      secuencia: {
        Row: {
          created_at: string
          id: string
          valor: string
          updated_at: string
        }
        Insert: {
          id: string
          valor: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          valor?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      temas: {
        Row: {
          abreviatura: string | null
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          abreviatura?: string | null
          nombre: string
          id?: string
        }
        Update: {
          abreviatura?: string | null
          nombre?: string
          id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          apellido: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          invitation_code: string
          nombre: string
          role: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          apellido?: string | null
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          invitation_code: string
          nombre: string
          role?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          apellido?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_code?: string
          nombre?: string
          role?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          status: string
          priority: string
          screenshot_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          status?: string
          priority?: string
          screenshot_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          status?: string
          priority?: string
          screenshot_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: Record<string, unknown>[]
      }
    }
    Functions: {
      [_: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      [_: string]: string[]
    }
    CompositeTypes: {
      [_: string]: {
        [_: string]: unknown
      }
    }
  }
}
