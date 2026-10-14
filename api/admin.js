import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { syncId } = req.body || {};
  if (!syncId || syncId !== process.env.ADMIN_SYNC_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now - 7 * 86400000).toISOString();
    const monthAgo = new Date(now - 30 * 86400000).toISOString();
    const twoMonthsAgo = new Date(now - 60 * 86400000).toISOString();

    const [
      sessionsAll,
      eventsAll,
      sessionsRecent,
    ] = await Promise.all([
      supabase.from('sessions').select('id, sync_id, started_at, ended_at, interface_lang, target_lang, device_type, os, browser, screen_width, screen_height').order('started_at', { ascending: false }).limit(5000),
      supabase.from('events').select('id, session_id, sync_id, ts, type, data').order('ts', { ascending: false }).limit(10000),
      supabase.from('sessions').select('sync_id, started_at, ended_at, device_type, os, browser, interface_lang, target_lang').gte('started_at', twoMonthsAgo).order('started_at', { ascending: false }).limit(5000),
    ]);

    const sessions = sessionsAll.data || [];
    const events = eventsAll.data || [];
    const recentSessions = sessionsRecent.data || [];

    // --- SESSIONS ---
    const sessionsToday = sessions.filter(s => s.started_at?.startsWith(todayStr)).length;
    const sessionsWeek = sessions.filter(s => s.started_at >= weekAgo).length;
    const sessionsMonth = sessions.filter(s => s.started_at >= monthAgo).length;

    // --- ACTIVE USERS ---
    const uniqueToday = new Set(sessions.filter(s => s.started_at?.startsWith(todayStr)).map(s => s.sync_id)).size;
    const uniqueWeek = new Set(sessions.filter(s => s.started_at >= weekAgo).map(s => s.sync_id)).size;
    const uniqueMonth = new Set(sessions.filter(s => s.started_at >= monthAgo).map(s => s.sync_id)).size;

    // --- DEVICE / OS / BROWSER ---
    const deviceCounts = {};
    const osCounts = {};
    const browserCounts = {};
    sessions.forEach(s => {
      deviceCounts[s.device_type || 'unknown'] = (deviceCounts[s.device_type || 'unknown'] || 0) + 1;
      osCounts[s.os || 'unknown'] = (osCounts[s.os || 'unknown'] || 0) + 1;
      browserCounts[s.browser || 'unknown'] = (browserCounts[s.browser || 'unknown'] || 0) + 1;
    });

    // --- AVG SESSION DURATION ---
    const durations = sessions
      .filter(s => s.started_at && s.ended_at)
      .map(s => (new Date(s.ended_at) - new Date(s.started_at)) / 1000)
      .filter(d => d > 0 && d < 86400);
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // --- EVENTS BY TYPE ---
    const eventTypeCounts = {};
    events.forEach(e => {
      eventTypeCounts[e.type] = (eventTypeCounts[e.type] || 0) + 1;
    });

    // --- EXERCISES ---
    const exerciseStarts = events.filter(e => e.type === 'exercise_start');
    const exerciseTypeCounts = {};
    exerciseStarts.forEach(e => {
      const t = e.data?.exercise_type || 'unknown';
      exerciseTypeCounts[t] = (exerciseTypeCounts[t] || 0) + 1;
    });
    const exerciseEnds = events.filter(e => e.type === 'exercise_end');
    const completedExercises = exerciseEnds.filter(e => e.data?.completed).length;

    // --- CARDS ---
    const cardAdds = events.filter(e => e.type === 'card_add');
    const cardAddSources = {};
    cardAdds.forEach(e => {
      const src = e.data?.source || 'unknown';
      cardAddSources[src] = (cardAddSources[src] || 0) + 1;
    });

    // --- CARDS PER DAY (last 30 days) ---
    const cardsPerDay = {};
    cardAdds.filter(e => e.ts >= monthAgo).forEach(e => {
      const day = e.ts?.slice(0, 10);
      if (day) cardsPerDay[day] = (cardsPerDay[day] || 0) + 1;
    });

    // --- AI MESSAGES ---
    const aiMessages = events.filter(e => e.type === 'ai_message');
    const aiByContext = {};
    aiMessages.forEach(e => {
      const ctx = e.data?.context || 'unknown';
      aiByContext[ctx] = (aiByContext[ctx] || 0) + 1;
    });

    // --- IMAGE GEN ---
    const imageGens = events.filter(e => e.type === 'image_gen').length;

    // --- LINK CLICKS ---
    const linkClicks = events.filter(e => e.type === 'link_click');
    const clicksByContext = {};
    linkClicks.forEach(e => {
      const ctx = e.data?.context || 'unknown';
      clicksByContext[ctx] = (clicksByContext[ctx] || 0) + 1;
    });

    // --- GOALS ---
    const goalEvents = events.filter(e => e.type === 'goal_update');
    const goalsByStatus = {};
    goalEvents.forEach(e => {
      const st = e.data?.status || 'unknown';
      goalsByStatus[st] = (goalsByStatus[st] || 0) + 1;
    });

    // --- REVIEW COMPLETION ---
    const reviewCompletions = events.filter(e => e.type === 'review_completion').length;

    // --- TABS ---
    const tabViews = events.filter(e => e.type === 'tab_view');
    const tabCounts = {};
    tabViews.forEach(e => {
      const tab = e.data?.tab || 'unknown';
      tabCounts[tab] = (tabCounts[tab] || 0) + 1;
    });

    // --- LANGUAGES ---
    const langCounts = {};
    const targetLangCounts = {};
    sessions.forEach(s => {
      if (s.interface_lang) langCounts[s.interface_lang] = (langCounts[s.interface_lang] || 0) + 1;
      if (s.target_lang) targetLangCounts[s.target_lang] = (targetLangCounts[s.target_lang] || 0) + 1;
    });

    // --- SESSIONS PER DAY (last 30 days) ---
    const sessionsPerDay = {};
    sessions.filter(s => s.started_at >= monthAgo).forEach(s => {
      const day = s.started_at?.slice(0, 10);
      if (day) sessionsPerDay[day] = (sessionsPerDay[day] || 0) + 1;
    });

    // --- PER USER SUMMARY ---
    const userMap = {};
    sessions.forEach(s => {
      if (!userMap[s.sync_id]) userMap[s.sync_id] = { sessions: 0, firstSeen: s.started_at, lastSeen: s.started_at, devices: new Set(), totalDuration: 0 };
      const u = userMap[s.sync_id];
      u.sessions++;
      if (s.started_at < u.firstSeen) u.firstSeen = s.started_at;
      if (s.started_at > u.lastSeen) u.lastSeen = s.started_at;
      if (s.device_type) u.devices.add(s.device_type);
      if (s.started_at && s.ended_at) {
        const dur = (new Date(s.ended_at) - new Date(s.started_at)) / 1000;
        if (dur > 0 && dur < 86400) u.totalDuration += dur;
      }
    });
    const userEvents = {};
    events.forEach(e => {
      if (!userEvents[e.sync_id]) userEvents[e.sync_id] = { cards_added: 0, exercises: 0, ai_messages: 0, image_gens: 0 };
      const ue = userEvents[e.sync_id];
      if (e.type === 'card_add') ue.cards_added++;
      if (e.type === 'exercise_end') ue.exercises++;
      if (e.type === 'ai_message') ue.ai_messages++;
      if (e.type === 'image_gen') ue.image_gens++;
    });
    const users = Object.entries(userMap).map(([id, u]) => ({
      sync_id: id,
      sessions: u.sessions,
      first_seen: u.firstSeen,
      last_seen: u.lastSeen,
      devices: [...u.devices],
      avg_duration_sec: u.sessions ? Math.round(u.totalDuration / u.sessions) : 0,
      ...(userEvents[id] || { cards_added: 0, exercises: 0, ai_messages: 0, image_gens: 0 }),
    }));

    // --- HOURLY PATTERN ---
    const hourCounts = new Array(24).fill(0);
    sessions.forEach(s => {
      if (s.started_at) {
        const h = new Date(s.started_at).getHours();
        hourCounts[h]++;
      }
    });

    // --- DAY OF WEEK ---
    const dowCounts = new Array(7).fill(0);
    sessions.forEach(s => {
      if (s.started_at) {
        const d = new Date(s.started_at).getDay();
        dowCounts[d]++;
      }
    });

    return res.status(200).json({
      overview: {
        total_sessions: sessions.length,
        sessions_today: sessionsToday,
        sessions_week: sessionsWeek,
        sessions_month: sessionsMonth,
        dau: uniqueToday,
        wau: uniqueWeek,
        mau: uniqueMonth,
        avg_duration_sec: avgDuration,
        total_users: Object.keys(userMap).length,
      },
      devices: deviceCounts,
      os: osCounts,
      browsers: browserCounts,
      exercises: {
        by_type: exerciseTypeCounts,
        total_started: exerciseStarts.length,
        total_completed: completedExercises,
      },
      cards: {
        total_added: cardAdds.length,
        by_source: cardAddSources,
        per_day: cardsPerDay,
      },
      ai: {
        total_messages: aiMessages.length,
        by_context: aiByContext,
        image_gens: imageGens,
      },
      links: {
        total_clicks: linkClicks.length,
        by_context: clicksByContext,
      },
      goals: goalsByStatus,
      review_completions: reviewCompletions,
      tabs: tabCounts,
      languages: { interface: langCounts, target: targetLangCounts },
      sessions_per_day: sessionsPerDay,
      hourly_pattern: hourCounts,
      day_of_week: dowCounts,
      event_types: eventTypeCounts,
      users,
    });
  } catch (err) {
    console.error('[admin]', err);
    return res.status(500).json({ error: err.message });
  }
}
