import { createClient } from '@supabase/supabase-js';

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
  spokenLanguages: '',
  languages: [],        // [{ lang: string, level: 'native'|'bilingual'|'advanced'|'intermediate' }]
  dream: '',
  level: '',
  interests: '',
  goals: '',
  notes: '',            // teacher/AI notes (learner does not edit these)
  learnerNotes: '',     // the learner's own notes
  dailyCount: 5,        // cards suggested each day in the "Today" band
  // Detailed questionnaire (filled later, rewards points)
  favFilms: '',
  favMusic: '',
  favSports: '',
  favFood: '',
  favBooks: '',
  favHobbies: '',
  dreamJobs: '',
  otherTools: '',
  bestMemory: '',
  worstMemory: '',
  // Gamification
  points: 0,
  onboarded: false,
  detailedDone: false,
};

const DEFAULT_DATA = {
  cards: [],
  lang: 'fr',
  profile: { ...DEFAULT_PROFILE },
  summaries: [],
};

function mergeWithDefaults(raw) {
  if (!raw) return null;
  return {
    ...DEFAULT_DATA,
    ...raw,
    profile: { ...DEFAULT_PROFILE, ...(raw.profile || {}) },
    summaries: raw.summaries || [],
  };
}

// ---- LOCAL ----
function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { ...DEFAULT_DATA, profile: { ...DEFAULT_PROFILE } };
    return mergeWithDefaults(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_DATA, profile: { ...DEFAULT_PROFILE } };
  }
}

function saveLocal(data) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); }
  catch (e) { console.error('localStorage error:', e); }
}

// ---- SUPABASE ----
// Returns { data, source: "remote" } or { data: null, error: "..." }
async function loadFromSupabase(userId) {
  if (!supabase) return { data: null, error: 'not_configured' };
  try {
    const { data, error } = await supabase
      .from('moa_data')
      .select('data')
      .eq('user_id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null }; // no row, not an error
      return { data: null, error: error.message };
    }
    return { data: data?.data || null, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// Returns { ok: true } or { ok: false, error: "..." }
async function saveToSupabase(userId, appData) {
  if (!supabase) return { ok: false, error: 'not_configured' };
  try {
    const { error } = await supabase
      .from('moa_data')
      .upsert(
        { user_id: userId, data: appData, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ---- PUBLIC API ----

// syncData: connect with a code
// - If remote data exists for this code: load it
// - If no remote data (new code): create a fresh empty account
// Returns { ok: true, data, source: "remote"|"new" } or { ok: false, error: "..." }
export async function syncData(userId, localData) {
  if (!supabase) {
    return { ok: false, error: 'Supabase non configuré (variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes)' };
  }

  // Try to load remote data
  const remote = await loadFromSupabase(userId);
  if (remote.error) {
    return { ok: false, error: remote.error };
  }

  if (remote.data) {
    // Remote data exists: use it
    const merged = mergeWithDefaults(remote.data);
    saveLocal(merged);
    return { ok: true, data: merged, source: 'remote' };
  } else {
    // No remote data: fresh account with DEFAULT_DATA
    const fresh = { ...DEFAULT_DATA, profile: { ...DEFAULT_PROFILE } };
    const result = await saveToSupabase(userId, fresh);
    if (!result.ok) return { ok: false, error: result.error };
    saveLocal(fresh);
    return { ok: true, data: fresh, source: 'new' };
  }
}

// connectData: load an existing account without creating one
export async function connectData(userId) {
  if (!supabase) {
    return { ok: false, error: 'Supabase non configuré (variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes)' };
  }

  const remote = await loadFromSupabase(userId);
  if (remote.error) return { ok: false, error: remote.error };
  if (!remote.data) return { ok: false, error: 'account_not_found' };

  const data = mergeWithDefaults(remote.data);
  saveLocal(data);
  return { ok: true, data, source: 'remote' };
}

// loadData: called on app start
export async function loadData(userId) {
  if (userId && supabase) {
    const remote = await loadFromSupabase(userId);
    if (!remote.error && remote.data) {
      const merged = mergeWithDefaults(remote.data);
      saveLocal(merged);
      return merged;
    }
  }
  return loadLocal();
}

// saveData: called on every data change
export async function saveData(data, userId) {
  saveLocal(data);
  if (userId && supabase) {
    const result = await saveToSupabase(userId, data);
    if (!result.ok) console.error('Sync save error:', result.error);
  }
}

export function isSupabaseConfigured() {
  return !!supabase;
}

export { DEFAULT_DATA, DEFAULT_PROFILE };
