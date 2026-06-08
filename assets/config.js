export const SUPABASE_URL = "https://aojqqijrxlbblpcftevm.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvanFxaWpyeGxiYmxwY2Z0ZXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTAyODQsImV4cCI6MjA5NjQ2NjI4NH0.4CKsAWXOYAi7CrP0F8BNS1XEyB4u3tuP7gLUElydNKs";

export const APP_CONFIGURED =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.length > 40;
