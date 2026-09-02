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

export type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export type ProfileInsert = {
  id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  is_admin?: boolean
  created_at?: string
  updated_at?: string
}

export type ProfileUpdate = {
  id?: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  is_admin?: boolean
  created_at?: string
  updated_at?: string
}

export type NoteRow = {
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
  meta_title: string | null
  meta_description: string | null
  canonical_url: string | null
  social_image_path: string | null
  created_at: string
  updated_at: string
}

export type NoteInsert = {
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
  meta_title?: string | null
  meta_description?: string | null
  canonical_url?: string | null
  social_image_path?: string | null
  created_at?: string
  updated_at?: string
}

export type NoteUpdate = {
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
  meta_title?: string | null
  meta_description?: string | null
  canonical_url?: string | null
  social_image_path?: string | null
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
    Functions: {
      create_guest_note: {
        Args: {
          p_title: string
          p_content: unknown
          p_content_format: string
          p_editing_policy: string
          p_edit_code: string | null
          p_expires_at: string | null
          p_visibility: string
        }
        Returns: string
      }
      save_note: {
        Args: {
          p_public_id: string
          p_title: string
          p_content: unknown
          p_content_format: string
          p_token: string | null
        }
        Returns: number
      }
      verify_edit_code: {
        Args: {
          p_public_id: string
          p_code: string
          p_token: string
          p_ip_hash: string
        }
        Returns: unknown
      }
      create_user_note: {
        Args: {
          p_title: string
          p_content: unknown
          p_content_format: string
          p_expires_at: string | null
          p_visibility: string
        }
        Returns: string
      }
      claim_note: {
        Args: { p_public_id: string; p_code: string }
        Returns: unknown
      }
      check_edit_session: {
        Args: { p_public_id: string; p_token: string }
        Returns: boolean
      }
      revoke_edit_session: {
        Args: { p_public_id: string; p_token: string }
        Returns: boolean
      }
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      restore_revision: {
        Args: { p_public_id: string; p_revision_no: number }
        Returns: number
      }
      create_share_link: {
        Args: {
          p_public_id: string
          p_permission: string
          p_expires_at: string
        }
        Returns: unknown
      }
      list_share_links: {
        Args: { p_public_id: string }
        Returns: unknown
      }
      revoke_share_link: {
        Args: { p_public_id: string; p_share_id: string }
        Returns: boolean
      }
      get_public_note: {
        Args: { p_public_id: string }
        Returns: unknown
      }
      redeem_share: {
        Args: { p_token: string; p_session_token: string }
        Returns: unknown
      }
      claim_slug: {
        Args: { p_public_id: string; p_slug: string }
        Returns: unknown
      }
      get_note_by_slug: {
        Args: { p_slug: string }
        Returns: unknown
      }
      save_own_gemini_key: {
        Args: { p_ciphertext: string }
        Returns: unknown
      }
      load_own_gemini_key: {
        Args: Record<string, never>
        Returns: string | null
      }
      clear_own_gemini_key: {
        Args: Record<string, never>
        Returns: unknown
      }
      admin_list_users: {
        Args: { p_limit?: number }
        Returns: unknown
      }
      admin_list_notes: {
        Args: { p_limit?: number }
        Returns: unknown
      }
      admin_set_note_deleted: {
        Args: { p_public_id: string; p_deleted: boolean }
        Returns: unknown
      }
      admin_clear_lockout: {
        Args: { p_public_id: string }
        Returns: unknown
      }
      admin_stats: {
        Args: Record<string, never>
        Returns: unknown
      }
      log_admin_probe: {
        Args: { p_ip_hash: string; p_path: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
