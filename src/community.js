// Shared player levels, stored in Supabase (see supabase-levels.sql).
import { SUPABASE_URL, SUPABASE_KEY, online } from './leaderboard.js';
import { normalizeLevel } from './levels.js';

const H = () => { const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }; if (!SUPABASE_KEY.startsWith('sb_')) h.Authorization = 'Bearer ' + SUPABASE_KEY; return h; };
const clean = (t, n) => String(t || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
export const communityOnline = online;

export async function publishLevel(lv, author) {
  if (!online()) throw new Error('Online sharing is not set up');
  const level = normalizeLevel(lv); delete level.cid;
  if (level.items.length < 3) throw new Error('Add at least 3 items first');
  const row = { name: clean(level.name, 40) || 'My level', author: clean(author, 16), length: level.length, items: level.items.length, data: level };
  if (!row.author) throw new Error('Please enter your name');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/levels?select=id`, { method: 'POST', headers: { ...H(), Prefer: 'return=representation' }, body: JSON.stringify(row) });
  if (!r.ok) throw new Error('Upload failed (' + r.status + ')');
  return (await r.json())[0]?.id;
}
export async function listLevels(sort = 'new') {
  const order = sort === 'plays' ? 'plays.desc,created_at.desc' : sort === 'likes' ? 'likes.desc,created_at.desc' : 'created_at.desc';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/levels?select=id,name,author,length,items,plays,likes,created_at&order=${order}&limit=60`, { headers: H() });
  if (!r.ok) throw new Error('Could not load levels (' + r.status + ')');
  return r.json();
}
export async function fetchLevel(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/levels?select=id,name,author,data&id=eq.${+id}`, { headers: H() });
  if (!r.ok) throw new Error('Could not load level');
  const row = (await r.json())[0]; if (!row) throw new Error('Level not found');
  const lv = normalizeLevel({ ...row.data, name: row.name }); lv.cid = row.id; lv.author = row.author;
  return lv;
}
const rpc = (fn, id) => fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H(), body: JSON.stringify({ lid: +id }) }).catch(() => {});
export const countPlay = (id) => rpc('play_level', id);
export function likeLevel(id) {
  let liked = []; try { liked = JSON.parse(localStorage.getItem('cubi_liked') || '[]'); } catch (e) {}
  if (liked.includes(+id)) return false;
  liked.push(+id); try { localStorage.setItem('cubi_liked', JSON.stringify(liked)); } catch (e) {}
  rpc('like_level', id); return true;
}
export function hasLiked(id) { try { return JSON.parse(localStorage.getItem('cubi_liked') || '[]').includes(+id); } catch (e) { return false; } }
