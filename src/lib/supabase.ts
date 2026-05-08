import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Persistence will fall back to local storage.');
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
