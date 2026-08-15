import { createClient } from '@supabase/supabase-js';

// These are safe to expose - they are public anon keys (row-level security protects the data)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const LOCAL_KEY = 'moa-app-data';

const DEFAULT_PROFILE = {
  gender: '',
  age: '',
  nationality: '',
  level: '',
  interests: '',
  goals: '',
  notes: '',
};

const DEFAULT_DATA = {
  cards: [],
  lang: 'fr',
  profile: { ...DEFAULT_PROFILE },
  summaries: [],
};

// ---- LOCAL FALLBACK ----
function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { ...DEFAULT_DATA, profile: { ...DEFAULT_PROFILE } };
    const parsed = JSON.parse(raw);
    // Merge with defaults so old data without profile/summaries still works
    return {
      ...DEFAULT_DATA,
      ...parsed,
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) },
      summaries: parsed.summaries || [],
    };
  } catch {
    return { ...DEFAULT_DATA, profile: { ...DEFAULT_PROFILE } };
  }
}

function saveLocal(data) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('localStorage error:', e);
  }
}

// ---- SUPABASE ----
// Table: moa_data
// Columns: id (uuid, default gen_random_uuid()), user_id (text), data (jsonb), updated_at (timestamptz)

async function loadFromSupabase(userId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('moa_data')
      .select('data')
      .eq('user_id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // no row found
      console.error('Supabase load error:', error);
      return null;
    }
    return data?.data || null;
  } catch (e) {
    console.error('Supabase load error:', e);
    return null;
  }
}

async function saveToSupabase(userId, appData) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('moa_data')
      .upsert(
        { user_id: userId, data: appData, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) console.error('Supabase save error:', error);
  } catch (e) {
    console.error('Supabase save error:', e);
  }
}

// ---- PUBLIC API ----
// userId is a simple passphrase the user sets (no auth needed for a personal app)

export async function loadData(userId) {
  if (userId && supabase) {
    const remote = await loadFromSupabase(userId);
    if (remote) {
      // Merge with defaults for backward compat
      const merged = {
        ...DEFAULT_DATA,
        ...remote,
        profile: { ...DEFAULT_PROFILE, ...(remote.profile || {}) },
        summaries: remote.summaries || [],
      };
      saveLocal(merged);
      return merged;
    }
  }
  return loadLocal();
}

export async function saveData(data, userId) {
  saveLocal(data);
  if (userId && supabase) {
    await saveToSupabase(userId, data);
  }
}

export function isSupabaseConfigured() {
  return !!supabase;
}

export { DEFAULT_DATA, DEFAULT_PROFILE };
