import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_auth.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyAuth(req);
  if (!auth.user) return res.status(401).json({ error: 'Non authentifie' });

  const { syncId, action, targetUserId } = req.body || {};
  if (!syncId || syncId !== process.env.ADMIN_SYNC_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    if (action === 'delete' && targetUserId) {
      if (targetUserId === syncId) {
        return res.status(400).json({ error: 'Cannot delete your own admin account' });
      }
      const [evDel, sessDel, dataDel] = await Promise.all([
        supabase.from('events').delete().eq('sync_id', targetUserId),
        supabase.from('sessions').delete().eq('sync_id', targetUserId),
        supabase.from('moa_data').delete().eq('user_id', targetUserId),
      ]);
      const errors = [evDel.error, sessDel.error, dataDel.error].filter(Boolean);
      if (errors.length) {
        return res.status(500).json({ error: errors.map(e => e.message).join('; ') });
      }
      return res.status(200).json({ ok: true, deleted: targetUserId });
    }

    // Default action: list users
    const [moaData, sessionsData, eventsData] = await Promise.all([
      supabase.from('moa_data').select('user_id, data, updated_at'),
      supabase.from('sessions').select('sync_id, started_at, ended_at, device_type').order('started_at', { ascending: false }).limit(5000),
      supabase.from('events').select('sync_id, type, ts').order('ts', { ascending: false }).limit(10000),
    ]);

    const moaMap = {};
    (moaData.data || []).forEach(row => {
      moaMap[row.user_id] = {
        points: row.data?.profile?.points || 0,
        cards: (row.data?.cards || []).length,
        name: row.data?.profile?.name || '',
        updated_at: row.updated_at,
      };
    });

    const userMap = {};
    const allSyncIds = new Set();
    (sessionsData.data || []).forEach(s => {
      if (!s.sync_id) return;
      allSyncIds.add(s.sync_id);
      if (!userMap[s.sync_id]) userMap[s.sync_id] = { sessions: 0, last_seen: null, devices: new Set(), ai_messages: 0 };
      userMap[s.sync_id].sessions++;
      if (!userMap[s.sync_id].last_seen || s.started_at > userMap[s.sync_id].last_seen) {
        userMap[s.sync_id].last_seen = s.started_at;
      }
      if (s.device_type) userMap[s.sync_id].devices.add(s.device_type);
    });

    (eventsData.data || []).forEach(e => {
      if (!e.sync_id) return;
      allSyncIds.add(e.sync_id);
      if (!userMap[e.sync_id]) userMap[e.sync_id] = { sessions: 0, last_seen: null, devices: new Set(), ai_messages: 0 };
      if (e.type === 'ai_message') userMap[e.sync_id].ai_messages++;
    });

    // Also include users from moa_data that might not have sessions
    Object.keys(moaMap).forEach(uid => allSyncIds.add(uid));

    const users = [...allSyncIds].map(uid => ({
      sync_id: uid,
      name: moaMap[uid]?.name || '',
      points: moaMap[uid]?.points || 0,
      cards: moaMap[uid]?.cards || 0,
      sessions: userMap[uid]?.sessions || 0,
      ai_messages: userMap[uid]?.ai_messages || 0,
      last_seen: userMap[uid]?.last_seen || moaMap[uid]?.updated_at || null,
      devices: userMap[uid]?.devices ? [...userMap[uid].devices] : [],
      has_data: !!moaMap[uid],
    })).sort((a, b) => (b.last_seen || '').localeCompare(a.last_seen || ''));

    return res.status(200).json({ users });
  } catch (err) {
    console.error('[admin-users]', err);
    return res.status(500).json({ error: err.message });
  }
}
