import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zxctytgyjzjatbzbufzb.supabase.co"
const supabaseAnonKey  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Y3R5dGd5anpqYXRiemJ1ZnpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQwMzgsImV4cCI6MjA3NTI4MDAzOH0.LSRWU_VRZ_9U8_6XEDvY7V4y9TI6F3SVaFe337be9iU"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
