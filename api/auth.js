import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, inviteCode } = req.body || {};
  const redirectTo = process.env.VITE_APP_URL || 'https://moa-web-app.vercel.app';

  if (action === 'magic-link') {
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email requis' });
    }
    const cleanEmail = email.trim().toLowerCase();

    try {
      // Check if user already exists
      const { data: listData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const userExists = (listData?.users || []).some(
        u => u.email && u.email.toLowerCase() === cleanEmail
      );

      if (!userExists) {
        // New user: require invitation code
        const expectedCode = process.env.INVITE_CODE || '';
        if (!expectedCode) {
          return res.status(500).json({ error: 'INVITE_CODE non configure sur le serveur' });
        }
        if (!inviteCode || inviteCode.trim() !== expectedCode.trim()) {
          return res.status(403).json({ error: 'invite_invalid' });
        }
        // Create user via admin API (email pre-confirmed so magic link works)
        const { error: createErr } = await adminClient.auth.admin.createUser({
          email: cleanEmail,
          email_confirm: true,
        });
        if (createErr) {
          if (createErr.message && createErr.message.includes('already')) {
            // Race condition: user was just created, proceed
          } else {
            return res.status(500).json({ error: createErr.message });
          }
        }
      }

      // Send magic link via anon client (uses Supabase built-in email)
      const { error: otpErr } = await anonClient.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
      });
      if (otpErr) {
        return res.status(500).json({ error: otpErr.message });
      }

      return res.status(200).json({ ok: true, isNewUser: !userExists });
    } catch (err) {
      console.error('[auth]', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Action inconnue' });
}
