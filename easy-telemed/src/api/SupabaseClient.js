import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://mfrkmntxoldarcvhosrp.supabase.co"
const supabaseAnonKey  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcmttbnR4b2xkYXJjdmhvc3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MzczMzYsImV4cCI6MjA3NTUxMzMzNn0.5ge9CPo3aKPPf1YHtEy5eqID_qGxV7v9faMwMmh9gcI"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
