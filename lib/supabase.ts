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
let supabaseAdminClient: SupabaseClient | null = null;

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

/** Supabase secret (server-only) key — replaces legacy service_role JWT */
function getSupabaseSecretKey(): string | null {
  return (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    null
  );
}

function getSupabasePublicConfig(): { url: string; key: string } | null {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  if (!url || !key) return null;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null || isSupabaseAdminConfigured();
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

/** @deprecated Prefer isSupabaseAdminConfigured */
export const isSupabaseServiceRoleConfigured = isSupabaseAdminConfigured;

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

export function getSupabaseAdmin(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey();

  if (!url || !key) {
    throw new Error(
      'Supabase secret key is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).'
    );
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(url, key);
  }

  return supabaseAdminClient;
}

/** @deprecated Prefer getSupabaseAdmin */
export const getSupabaseServiceRole = getSupabaseAdmin;

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
