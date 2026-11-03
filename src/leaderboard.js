// Ranking list: online via Supabase (when configured below), otherwise kept on this device.
// The publishable/anon key is meant to be public: the database only allows reading and adding scores (see supabase.sql).
export const SUPABASE_URL = 'https://nfvfdxzitewjulbyvyep.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_9n-ztK_-24kc5WTFfMifGQ_AzP1NYAE';
export const online = () => !!(SUPABASE_URL && SUPABASE_KEY);

const headers = () => {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (!SUPABASE_KEY.startsWith('sb_')) h.Authorization = 'Bearer ' + SUPABASE_KEY;    // legacy JWT anon key
  return h;
};
const LOCAL = 'cubi_scores';
const loadLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL) || '[]'); } catch (e) { return []; } };
const saveLocal = (a) => { try { localStorage.setItem(LOCAL, JSON.stringify(a.slice(-300))); } catch (e) {} };

export function cleanName(n) { return String(n || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
export function savedName() { try { return localStorage.getItem('cubi_name') || ''; } catch (e) { return ''; } }

// score: pearls are worth the most, distance counts, finishing gives a bonus plus extra for hearts left
export function computeScore({ pearls, distance, won, lives }) { return pearls * 100 + Math.floor(distance) + (won ? 1000 + lives * 300 : 0); }

export async function submitScore(entry) {
  const row = { name: cleanName(entry.name), level: entry.level, score: Math.round(entry.score), pearls: entry.pearls, distance: Math.floor(entry.distance), won: !!entry.won };
  if (!row.name) throw new Error('Please enter a name');
  try { localStorage.setItem('cubi_name', row.name); } catch (e) {}
  const local = loadLocal(); local.push({ ...row, created_at: new Date().toISOString(), mine: true }); saveLocal(local);
  if (!online()) return { ok: true, online: false };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/scores`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify(row) });
    if (!r.ok) { console.warn('Ranking upload failed', r.status, await r.text().catch(() => '')); return { ok: true, online: false, failed: r.status }; }
    return { ok: true, online: true };
  } catch (e) { console.warn('Ranking upload failed', e); return { ok: true, online: false, failed: 'network' }; }
}

export async function topScores(level, limit = 10) {
  if (online()) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/scores?select=name,score,pearls,won,created_at&level=eq.${level}&order=score.desc,created_at.asc&limit=${limit}`, { headers: headers() });
      if (r.ok) return { rows: await r.json(), online: true };
    } catch (e) { /* offline: fall back to this device */ }
  }
  const rows = loadLocal().filter(s => s.level === level).sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at)).slice(0, limit);
  return { rows, online: false };
}
