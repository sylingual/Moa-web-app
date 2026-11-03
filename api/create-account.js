import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_auth.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const DEFAULT_PROFILE = {
  gender: '', age: '', nationality: '', spokenLanguages: '',
  languages: [], dream: '', level: '', interests: '', goals: '',
  notes: '', learnerNotes: '', dailyCount: 5,
  favFilms: '', favMusic: '', favSports: '', favFood: '',
  favBooks: '', favHobbies: '', dreamJobs: '', otherTools: '',
  bestMemory: '', worstMemory: '',
  points: 0, onboarded: false, detailedDone: false, tutorialDone: false,
};

const DEFAULT_DATA = {
  cards: [],
  lang: 'fr',
  profile: { ...DEFAULT_PROFILE },
  langProfiles: {},
  summaries: [],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyAuth(req, { skipMoaCheck: true });
  if (!auth.user) return res.status(401).json({ error: 'Non authentifie' });

  const { inviteCode } = req.body || {};
  const expectedCode = process.env.INVITATION_CODE || '';
  if (!expectedCode || !inviteCode || inviteCode.trim() !== expectedCode.trim()) {
    return res.status(403).json({ error: 'invite_invalid' });
  }

  try {
    const { data: existing } = await supabase
      .from('moa_data')
      .select('user_id')
      .eq('user_id', auth.user.id)
      .single();

    if (existing) {
      return res.status(200).json({ ok: true, source: 'existing' });
    }

    const fresh = { ...DEFAULT_DATA, profile: { ...DEFAULT_PROFILE } };
    const { error } = await supabase
      .from('moa_data')
      .insert({ user_id: auth.user.id, data: fresh, updated_at: new Date().toISOString() });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, data: fresh, source: 'new' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
