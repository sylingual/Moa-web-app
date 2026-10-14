import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const HEARTBEAT_INTERVAL = 60_000;
const FLUSH_INTERVAL = 10_000;
const INACTIVITY_TIMEOUT = 20 * 60_000;

let sessionId = null;
let syncId = null;
let eventBuffer = [];
let heartbeatTimer = null;
let flushTimer = null;
let inactivityTimer = null;
let lastActivity = Date.now();
let sessionEnded = false;

export function initTracking(userSyncId, interfaceLang, targetLang) {
  if (!supabase || !userSyncId) return;
  syncId = userSyncId;
  sessionEnded = false;
  startSession(interfaceLang, targetLang);
  heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL);
  flushTimer = setInterval(flushEvents, FLUSH_INTERVAL);
  resetInactivityTimer();
  window.addEventListener('beforeunload', endSessionHandler);
  document.addEventListener('visibilitychange', onVisibilityChange);
  ['click', 'keydown', 'scroll', 'touchstart'].forEach(e =>
    document.addEventListener(e, onUserActivity, { passive: true })
  );
}

export function stopTracking() {
  endSession();
  clearInterval(heartbeatTimer);
  clearInterval(flushTimer);
  clearTimeout(inactivityTimer);
  window.removeEventListener('beforeunload', endSessionHandler);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  ['click', 'keydown', 'scroll', 'touchstart'].forEach(e =>
    document.removeEventListener(e, onUserActivity)
  );
}

async function startSession(interfaceLang, targetLang) {
  if (!supabase || !syncId) return;
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        sync_id: syncId,
        started_at: new Date().toISOString(),
        interface_lang: interfaceLang || null,
        target_lang: targetLang || null,
        user_agent: navigator.userAgent || null,
      })
      .select('id')
      .single();
    if (!error && data) sessionId = data.id;
  } catch (e) {
    console.error('[tracking] startSession:', e);
  }
}

async function heartbeat() {
  if (!supabase || !sessionId || sessionEnded) return;
  try {
    await supabase
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (e) {
    console.error('[tracking] heartbeat:', e);
  }
}

async function endSession() {
  if (!supabase || !sessionId || sessionEnded) return;
  sessionEnded = true;
  await flushEvents();
  try {
    const now = new Date().toISOString();
    await supabase
      .from('sessions')
      .update({ ended_at: now })
      .eq('id', sessionId);
  } catch (e) {
    console.error('[tracking] endSession:', e);
  }
}

const supaHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=minimal',
};

function endSessionHandler() {
  if (!supabase || !sessionId || sessionEnded) return;
  sessionEnded = true;
  const now = new Date().toISOString();
  const pending = eventBuffer.splice(0);
  if (pending.length) {
    fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST', headers: supaHeaders, keepalive: true,
      body: JSON.stringify(pending.map(ev => ({
        session_id: sessionId, sync_id: syncId, ts: ev.ts, type: ev.type, data: ev.data,
      }))),
    }).catch(() => {});
  }
  fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`, {
    method: 'PATCH', headers: supaHeaders, keepalive: true,
    body: JSON.stringify({ ended_at: now }),
  }).catch(() => {});
}

export function trackEvent(type, data = {}) {
  if (!supabase || !syncId) return;
  eventBuffer.push({ ts: new Date().toISOString(), type, data });
}

async function flushEvents() {
  if (!supabase || !sessionId || !eventBuffer.length) return;
  const batch = eventBuffer.splice(0);
  try {
    await supabase.from('events').insert(
      batch.map(ev => ({
        session_id: sessionId,
        sync_id: syncId,
        ts: ev.ts,
        type: ev.type,
        data: ev.data,
      }))
    );
  } catch (e) {
    eventBuffer.unshift(...batch);
    console.error('[tracking] flush:', e);
  }
}

function onUserActivity() {
  lastActivity = Date.now();
  resetInactivityTimer();
  if (sessionEnded) {
    sessionEnded = false;
    startSession();
  }
}

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    endSession();
  }, INACTIVITY_TIMEOUT);
}

function onVisibilityChange() {
  if (document.hidden) {
    flushEvents();
  } else {
    lastActivity = Date.now();
    resetInactivityTimer();
    if (sessionEnded) {
      sessionEnded = false;
      startSession();
    }
  }
}

export function updateSessionLangs(interfaceLang, targetLang) {
  if (!supabase || !sessionId || sessionEnded) return;
  supabase
    .from('sessions')
    .update({ interface_lang: interfaceLang, target_lang: targetLang })
    .eq('id', sessionId)
    .then(() => {});
}
