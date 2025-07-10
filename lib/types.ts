export interface SpouseProfile {
  id: string
  user_id: string
  name: string
  nickname?: string
  display_nickname?: boolean
  photo_url?: string
  birthday?: string
  anniversary?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CustomField {
  id: string
  user_id: string
  profile_id: string
  category: 'clothing' | 'favorites' | 'places' | 'gifts' | 'health'
  label: string
  value?: string
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  user_id: string
  profile_id: string
  type: 'birthday' | 'anniversary' | 'custom'
  title: string
  date: string
  enabled: boolean
  advance_notice_days: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email?: string
  created_at: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface Database {
  public: {
    Tables: {
      spouse_profiles: {
        Row: SpouseProfile
        Insert: Omit<SpouseProfile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SpouseProfile, 'id' | 'created_at' | 'updated_at'>>
      }
      custom_fields: {
        Row: CustomField
        Insert: Omit<CustomField, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CustomField, 'id' | 'created_at' | 'updated_at'>>
      }
      reminders: {
        Row: Reminder
        Insert: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Reminder, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}