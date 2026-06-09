export const SUPABASE_URL = "https://oxwzymcziijwyrhgaczx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94d3p5bWN6aWlqd3lyaGdhY3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTQzMzIsImV4cCI6MjA5NjU3MDMzMn0.U-D0YcFgxFX_JZZQVczZmqLZDiNyuTG9Su_CcwWNNqg";
export const APP_CONFIGURED =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.length > 40;
