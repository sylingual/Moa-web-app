import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export async function verifyAuth(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { user: null, error: 'missing_token' };
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return { user: null, error: error?.message || 'invalid_token' };
    return { user: data.user, error: null };
  } catch (e) {
    return { user: null, error: e.message };
  }
}
