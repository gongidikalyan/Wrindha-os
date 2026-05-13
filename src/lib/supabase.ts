import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lbthopvezqjcynkfpcnn.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidGhvcHZlenFqY3lua2ZwY25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTg4NDgsImV4cCI6MjA5Mzc5NDg0OH0.-fCSsMSyk1Ay_dDb0juQWhCObfKtzo6L01NhqueY7J8';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.log('Supabase credentials missing. Using default demo environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  const isPlaceholder = supabaseUrl.includes('your_') || supabaseUrl.includes('placeholder');
  return !!supabaseUrl && !!supabaseAnonKey && !isPlaceholder;
};

export const getSupabaseError = () => {
  if (!supabaseUrl || supabaseUrl.includes('your_project_url')) return "Supabase URL is missing.";
  if (!supabaseAnonKey || supabaseAnonKey.includes('your_anon_key')) return "Supabase Anon Key is missing.";
  if (supabaseAnonKey.startsWith('sb_')) return "You provided a Stripe key (sb_...) instead of a Supabase anon key (eyJ...).";
  return null;
};
