
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "bookings": {
                  Row: {
                    "clinic_id": string,"created_at": string,"id": string,"quote_id": string,"status": string,"visit_dates": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "clinic_id": string,"created_at"?: string,"id"?: string,"quote_id": string,"status"?: string,"visit_dates"?: (string)[]
                  }
                  Update: {
                    "clinic_id"?: string,"created_at"?: string,"id"?: string,"quote_id"?: string,"status"?: string,"visit_dates"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["id"]
    }
                  ]
                },"clinics": {
                  Row: {
                    "address": string | null,"created_at": string,"id": string,"name": string,"name_ja": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"id"?: string,"name": string,"name_ja": string
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"name_ja"?: string
                  }
                  Relationships: [
                    
                  ]
                },"consultations": {
                  Row: {
                    "created_at": string,"doctor_id": string | null,"id": string,"intake_id": string | null,"notes": string | null,"patient_id": string,"scheduled_at": string | null,"status": string,"video_session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"doctor_id"?: string | null,"id"?: string,"intake_id"?: string | null,"notes"?: string | null,"patient_id": string,"scheduled_at"?: string | null,"status"?: string,"video_session_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"doctor_id"?: string | null,"id"?: string,"intake_id"?: string | null,"notes"?: string | null,"patient_id"?: string,"scheduled_at"?: string | null,"status"?: string,"video_session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consultations_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "doctors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consultations_intake_id_fkey"
      columns: ["intake_id"]
isOneToOne: false
      referencedRelation: "intakes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consultations_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"doctors": {
                  Row: {
                    "clinic_id": string,"created_at": string,"id": string,"name": string,"name_ja": string | null,"specialty": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "clinic_id": string,"created_at"?: string,"id"?: string,"name": string,"name_ja"?: string | null,"specialty"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "clinic_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"name_ja"?: string | null,"specialty"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "doctors_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    }
                  ]
                },"followups": {
                  Row: {
                    "alert": boolean,"booking_id": string,"created_at": string,"doctor_note": string | null,"due_day": number,"id": string,"patient_note": string | null,"photo_id": string | null,"status": string,"symptoms": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "alert"?: boolean,"booking_id": string,"created_at"?: string,"doctor_note"?: string | null,"due_day": number,"id"?: string,"patient_note"?: string | null,"photo_id"?: string | null,"status"?: string,"symptoms"?: (string)[]
                  }
                  Update: {
                    "alert"?: boolean,"booking_id"?: string,"created_at"?: string,"doctor_note"?: string | null,"due_day"?: number,"id"?: string,"patient_note"?: string | null,"photo_id"?: string | null,"status"?: string,"symptoms"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "followups_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "followups_photo_id_fkey"
      columns: ["photo_id"]
isOneToOne: false
      referencedRelation: "photos"
      referencedColumns: ["id"]
    }
                  ]
                },"intakes": {
                  Row: {
                    "concerns": (string)[],"contraindications": NonNullable<Json>,"created_at": string,"flags": (string)[],"id": string,"patient_id": string,"trip_end": string | null,"trip_start": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "concerns"?: (string)[],"contraindications"?: NonNullable<Json>,"created_at"?: string,"flags"?: (string)[],"id"?: string,"patient_id": string,"trip_end"?: string | null,"trip_start"?: string | null
                  }
                  Update: {
                    "concerns"?: (string)[],"contraindications"?: NonNullable<Json>,"created_at"?: string,"flags"?: (string)[],"id"?: string,"patient_id"?: string,"trip_end"?: string | null,"trip_start"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "intakes_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"patients": {
                  Row: {
                    "birth_year": number | null,"consented_at": string | null,"country": string,"created_at": string,"id": string,"lang": string,"name": string,"name_latin": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "birth_year"?: number | null,"consented_at"?: string | null,"country"?: string,"created_at"?: string,"id"?: string,"lang"?: string,"name": string,"name_latin"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "birth_year"?: number | null,"consented_at"?: string | null,"country"?: string,"created_at"?: string,"id"?: string,"lang"?: string,"name"?: string,"name_latin"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"photos": {
                  Row: {
                    "angle": string,"capture_batch_id": string | null,"capture_mode": string | null,"consultation_id": string | null,"created_at": string,"id": string,"intake_id": string | null,"patient_id": string,"pitch": number | null,"quality_ok": boolean | null,"source": string,"storage_path": string,"yaw": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "angle": string,"capture_batch_id"?: string | null,"capture_mode"?: string | null,"consultation_id"?: string | null,"created_at"?: string,"id"?: string,"intake_id"?: string | null,"patient_id": string,"pitch"?: number | null,"quality_ok"?: boolean | null,"source"?: string,"storage_path": string,"yaw"?: number | null
                  }
                  Update: {
                    "angle"?: string,"capture_batch_id"?: string | null,"capture_mode"?: string | null,"consultation_id"?: string | null,"created_at"?: string,"id"?: string,"intake_id"?: string | null,"patient_id"?: string,"pitch"?: number | null,"quality_ok"?: boolean | null,"source"?: string,"storage_path"?: string,"yaw"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "photos_consultation_id_fkey"
      columns: ["consultation_id"]
isOneToOne: false
      referencedRelation: "consultations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "photos_intake_id_fkey"
      columns: ["intake_id"]
isOneToOne: false
      referencedRelation: "intakes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "photos_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"quotes": {
                  Row: {
                    "consultation_id": string,"created_at": string,"id": string,"items": NonNullable<Json>,"status": string,"total_krw": number,"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consultation_id": string,"created_at"?: string,"id"?: string,"items"?: NonNullable<Json>,"status"?: string,"total_krw"?: number,"valid_until"?: string | null
                  }
                  Update: {
                    "consultation_id"?: string,"created_at"?: string,"id"?: string,"items"?: NonNullable<Json>,"status"?: string,"total_krw"?: number,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotes_consultation_id_fkey"
      columns: ["consultation_id"]
isOneToOne: false
      referencedRelation: "consultations"
      referencedColumns: ["id"]
    }
                  ]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
