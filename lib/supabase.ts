import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface CuratedGalleryRow {
  id: string;
  drive_file_id: string;
  caption: string | null;
  sort_order: number;
  is_video: boolean;
  taken_at: string | null;
  created_at: string;
}

let supabaseClient: SupabaseClient | null = null;
let supabaseServiceRoleClient: SupabaseClient | null = null;

function getSupabaseUrl(): string | null {
  return process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? null;
}

/** Supabase publishable (public) key — safe for client-side use with RLS */
function getSupabasePublishableKey(): string | null {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    null
  );
}

function getSupabaseServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

function getSupabasePublicConfig(): { url: string; key: string } | null {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  if (!url || !key) return null;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null || isSupabaseServiceRoleConfigured();
}

export function isSupabaseServiceRoleConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export function getSupabase(): SupabaseClient {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or legacy SUPABASE_ANON_KEY).'
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(config.url, config.key);
  }

  return supabaseClient;
}

export function getSupabaseServiceRole(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  if (!url || !key) {
    throw new Error(
      'Supabase service role is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  if (!supabaseServiceRoleClient) {
    supabaseServiceRoleClient = createClient(url, key);
  }

  return supabaseServiceRoleClient;
}

export async function fetchCuratedGallery(): Promise<CuratedGalleryRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('curated_gallery')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('taken_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to fetch curated gallery: ${error.message}`);
  }

  return data ?? [];
}
