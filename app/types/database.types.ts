export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Live DBs may use BIGSERIAL (number) or Settings UUID (string). */
export type RowId = string | number

type TwoDigit =
  | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
  | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20'
  | '21' | '22' | '23' | '24' | '25' | '26' | '27' | '28' | '29' | '30'
  | '31' | '32' | '33' | '34' | '35' | '36' | '37'

export type CommonAccountSites = {
  [K in `site${TwoDigit}`]?: string | null
}

export type CommonAccountNotes = {
  [K in `note${TwoDigit}`]?: string | null
}

type Timestamps = {
  created_at: string
  updated_at?: string | null
}

export interface Database {
  public: {
    Tables: {
      article: {
        Row: {
          id: RowId
          title: string
          content: string | null
          category: string | null
          ref: string | null
          newdate: string | null
          url1: string | null
          url2: string | null
          url3: string | null
          file1: string | null
          file1name: string | null
          file1type: string | null
          file2: string | null
          file2name: string | null
          file2type: string | null
          file3: string | null
          file3name: string | null
          file3type: string | null
        } & Timestamps
        Insert: {
          id?: RowId
          title: string
          content?: string | null
          category?: string | null
          ref?: string | null
          newdate?: string | null
          url1?: string | null
          url2?: string | null
          url3?: string | null
          file1?: string | null
          file1name?: string | null
          file1type?: string | null
          file2?: string | null
          file2name?: string | null
          file2type?: string | null
          file3?: string | null
          file3name?: string | null
          file3type?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['article']['Insert']>
      }
      bank: {
        Row: {
          id: RowId
          name: string
          deposit: number | null
          site: string | null
          address: string | null
          withdrawals: number | null
          transfer: number | null
          activity: string | null
          card: string | null
          account: string | null
        } & Timestamps
        Insert: {
          id?: RowId
          name: string
          deposit?: number | null
          site?: string | null
          address?: string | null
          withdrawals?: number | null
          transfer?: number | null
          activity?: string | null
          card?: string | null
          account?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['bank']['Insert']>
      }
      commonaccount: {
        Row: {
          id: RowId
          name: string
          photohash: string | null
        } & CommonAccountSites & CommonAccountNotes & Timestamps
        Insert: {
          id?: RowId
          name: string
          photohash?: string | null
          created_at?: string
          updated_at?: string | null
        } & CommonAccountSites & CommonAccountNotes
        Update: Partial<Database['public']['Tables']['commonaccount']['Insert']>
      }
      commondocument: {
        Row: {
          id: RowId
          name: string
          file: string | null
          note: string | null
          ref: string | null
          category: string | null
          hash: string | null
          cover: string | null
        } & Timestamps
        Insert: {
          id?: RowId
          name: string
          file?: string | null
          note?: string | null
          ref?: string | null
          category?: string | null
          hash?: string | null
          cover?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['commondocument']['Insert']>
      }
      food: {
        Row: {
          id: RowId
          name: string
          amount: number | null
          price: number | null
          shop: string | null
          todate: string | null
          photo: string | null
          photohash: string | null
        } & Timestamps
        Insert: {
          id?: RowId
          name: string
          amount?: number | null
          price?: number | null
          shop?: string | null
          todate?: string | null
          photo?: string | null
          photohash?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['food']['Insert']>
      }
      image: {
        Row: {
          id: RowId
          name: string
          file: string | null
          filetype: string | null
          note: string | null
          ref: string | null
          category: string | null
          hash: string | null
          cover: string | null
        } & Timestamps
        Insert: {
          id?: RowId
          name: string
          file?: string | null
          filetype?: string | null
          note?: string | null
          ref?: string | null
          category?: string | null
          hash?: string | null
          cover?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['image']['Insert']>
      }
      music: {
        Row: {
          id: RowId
          name: string
          file: string | null
          filetype: string | null
          lyrics: string | null
          note: string | null
          ref: string | null
          category: string | null
          hash: string | null
          language: string | null
          cover: string | null
        } & Timestamps
        Insert: {
          id?: RowId
          name: string
          file?: string | null
          filetype?: string | null
          lyrics?: string | null
          note?: string | null
          ref?: string | null
          category?: string | null
          hash?: string | null
          language?: string | null
          cover?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['music']['Insert']>
      }
      podcast: {
        Row: {
          id: RowId
          name: string
          file: string | null
          filetype: string | null
          note: string | null
          ref: string | null
          category: string | null
          hash: string | null
          cover: string | null
        } & Timestamps
        Insert: {
          id?: RowId
          name: string
          file?: string | null
          filetype?: string | null
          note?: string | null
          ref?: string | null
          category?: string | null
          hash?: string | null
          cover?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['podcast']['Insert']>
      }
      push_subscriptions: {
        Row: {
          id: RowId
          endpoint: string
          p256dh: string
          auth: string
        } & Timestamps
        Insert: {
          id?: RowId
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
      }
      routine: {
        Row: {
          id: RowId
          name: string
          note: string | null
          lastdate1: string | null
          lastdate2: string | null
          lastdate3: string | null
          link: string | null
          photo: string | null
        } & Timestamps
        Insert: {
          id?: RowId
          name: string
          note?: string | null
          lastdate1?: string | null
          lastdate2?: string | null
          lastdate3?: string | null
          link?: string | null
          photo?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['routine']['Insert']>
      }
      subscription: {
        Row: {
          id: RowId
          name: string
          site: string | null
          account: string | null
          price: number | null
          nextdate: string | null
          note: string | null
          iscontinue: boolean | null
          currency: string | null
        } & Timestamps
        Insert: {
          id?: RowId
          name: string
          site?: string | null
          account?: string | null
          price?: number | null
          nextdate?: string | null
          note?: string | null
          iscontinue?: boolean | null
          currency?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['subscription']['Insert']>
      }
      video: {
        Row: {
          id: RowId
          name: string | null
          file: string | null
          filetype: string | null
          note: string | null
          ref: string | null
          category: string | null
          hash: string | null
          cover: string | null
        } & Timestamps
        Insert: {
          id?: RowId
          name?: string | null
          file?: string | null
          filetype?: string | null
          note?: string | null
          ref?: string | null
          category?: string | null
          hash?: string | null
          cover?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['video']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
