import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lbthopvezqjcynkfpcnn.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidGhvcHZlenFqY3lua2ZwY25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTg4NDgsImV4cCI6MjA5Mzc5NDg0OH0.-fCSsMSyk1Ay_dDb0juQWhCObfKtzo6L01NhqueY7J8';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.log('Supabase credentials missing. App will run in local mode.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export const isSupabaseConfigured = () => {
  const isPlaceholder = supabaseUrl === 'your_supabase_project_url' || !supabaseUrl;
  const isStripeKey = supabaseAnonKey?.startsWith('sb_');
  return !!supabaseUrl && !!supabaseAnonKey && !isPlaceholder && !isStripeKey;
};

export const getSupabaseError = () => {
  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url') return "Supabase URL is missing.";
  if (!supabaseAnonKey) return "Supabase Anon Key is missing.";
  if (supabaseAnonKey.startsWith('sb_')) return "You provided a Stripe key (sb_...) instead of a Supabase anon key (eyJ...).";
  return null;
};
