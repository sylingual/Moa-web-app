import { getSupabase, getAccessToken } from './storage.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

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

function sb() { return getSupabase(); }

export function initTracking(userSyncId, interfaceLang, targetLang) {
  if (!sb() || !userSyncId) return;
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

function detectDevice() {
  const ua = navigator.userAgent || '';
  const mobile = /Mobi|Android|iPhone|iPod/i.test(ua);
  const tablet = /iPad|Android(?!.*Mobi)/i.test(ua);
  const device_type = tablet ? 'tablet' : mobile ? 'mobile' : 'desktop';
  let os = 'other';
  if (/iPhone|iPad|iPod|Macintosh.*like Mac/i.test(ua)) os = 'iOS';
  else if (/Macintosh|Mac OS/i.test(ua) && !mobile) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  let browser = 'other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  return { device_type, os, browser };
}

async function startSession(interfaceLang, targetLang) {
  if (!sb() || !syncId) return;
  try {
    const { device_type, os, browser } = detectDevice();
    const id = crypto.randomUUID();
    const { error } = await sb()
      .from('sessions')
      .insert({
        id,
        sync_id: syncId,
        started_at: new Date().toISOString(),
        interface_lang: interfaceLang || null,
        target_lang: targetLang || null,
        user_agent: navigator.userAgent || null,
        device_type,
        os,
        browser,
        screen_width: window.screen?.width || null,
        screen_height: window.screen?.height || null,
      });
    if (!error) sessionId = id;
    else console.error('[tracking] startSession insert error:', error);
  } catch (e) {
    console.error('[tracking] startSession:', e);
  }
}

async function heartbeat() {
  if (!sb() || !sessionId || sessionEnded) return;
  try {
    await sb()
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (e) {
    console.error('[tracking] heartbeat:', e);
  }
}

async function endSession() {
  if (!sb() || !sessionId || sessionEnded) return;
  sessionEnded = true;
  await flushEvents();
  try {
    const now = new Date().toISOString();
    await sb()
      .from('sessions')
      .update({ ended_at: now })
      .eq('id', sessionId);
  } catch (e) {
    console.error('[tracking] endSession:', e);
  }
}

async function getAuthHeaders() {
  const token = await getAccessToken();
  const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return {
    'Content-Type': 'application/json',
    'apikey': apikey,
    'Authorization': `Bearer ${token || apikey}`,
    'Prefer': 'return=minimal',
  };
}

async function endSessionHandler() {
  if (!sb() || !sessionId || sessionEnded) return;
  sessionEnded = true;
  const now = new Date().toISOString();
  const pending = eventBuffer.splice(0);
  const headers = await getAuthHeaders();
  if (pending.length) {
    fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST', headers, keepalive: true,
      body: JSON.stringify(pending.map(ev => ({
        session_id: sessionId, sync_id: syncId, ts: ev.ts, type: ev.type, data: ev.data,
      }))),
    }).catch(() => {});
  }
  fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`, {
    method: 'PATCH', headers, keepalive: true,
    body: JSON.stringify({ ended_at: now }),
  }).catch(() => {});
}

export function trackEvent(type, data = {}) {
  if (!sb() || !syncId) return;
  eventBuffer.push({ ts: new Date().toISOString(), type, data });
}

async function flushEvents() {
  if (!sb() || !sessionId || !eventBuffer.length) return;
  const batch = eventBuffer.splice(0);
  try {
    await sb().from('events').insert(
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

async function onVisibilityChange() {
  if (document.hidden) {
    flushEvents();
    if (sb() && sessionId && !sessionEnded) {
      const now = new Date().toISOString();
      const headers = await getAuthHeaders();
      fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`, {
        method: 'PATCH', headers, keepalive: true,
        body: JSON.stringify({ ended_at: now }),
      }).catch(() => {});
    }
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
  if (!sb() || !sessionId || sessionEnded) return;
  sb()
    .from('sessions')
    .update({ interface_lang: interfaceLang, target_lang: targetLang })
    .eq('id', sessionId)
    .then(() => {});
}
