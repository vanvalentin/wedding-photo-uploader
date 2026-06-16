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

function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function getSupabase(): SupabaseClient {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_* equivalents).'
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(config.url, config.key);
  }

  return supabaseClient;
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
