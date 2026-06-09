export const SUPABASE_URL = "https://bbcpdrfhjvidqvuiwlft.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiY3BkcmZoanZpZHF2dWl3bGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTIxMTEsImV4cCI6MjA5NjU2ODExMX0.yQXBdYPW8HCgjYX6Ho4WWAn6he7d0unSe-SraCvyEQM";
export const APP_CONFIGURED =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.length > 40;
