export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type NoteVisibility = "public" | "private"
export type EditingPolicy = "edit_code" | "account" | "read_only"
export type ContentFormat = "tiptap_json" | "markdown" | "plain_text"

export interface ProfileRow {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  is_admin?: boolean
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  id?: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  is_admin?: boolean
  created_at?: string
  updated_at?: string
}

export interface NoteRow {
  id: string
  public_id: string
  owner_id: string | null
  custom_slug: string | null
  title: string
  content: Json
  content_format: ContentFormat
  /**
   * bcrypt hash of the edit code, stored by SECURITY DEFINER RPCs only.
   * Never exposed to anon/authenticated roles via grants.
   */
  edit_code_hash: string | null
  visibility: NoteVisibility
  editing_policy: EditingPolicy
  expires_at: string | null
  deleted_at: string | null
  favorite: boolean
  revision_no: number
  created_at: string
  updated_at: string
}

export interface NoteInsert {
  id?: string
  public_id?: string
  owner_id?: string | null
  custom_slug?: string | null
  title?: string
  content: Json
  content_format?: ContentFormat
  edit_code_hash?: string | null
  visibility?: NoteVisibility
  editing_policy?: EditingPolicy
  expires_at?: string | null
  deleted_at?: string | null
  favorite?: boolean
  revision_no?: number
  created_at?: string
  updated_at?: string
}

export interface NoteUpdate {
  id?: string
  public_id?: string
  owner_id?: string | null
  custom_slug?: string | null
  title?: string
  content?: Json
  content_format?: ContentFormat
  edit_code_hash?: string | null
  visibility?: NoteVisibility
  editing_policy?: EditingPolicy
  expires_at?: string | null
  deleted_at?: string | null
  favorite?: boolean
  revision_no?: number
  created_at?: string
  updated_at?: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: []
      }
      notes: {
        Row: NoteRow
        Insert: NoteInsert
        Update: NoteUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
