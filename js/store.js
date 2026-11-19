import { CFG } from './config.js';
const K = 'jodo:';
let sb = null;
if (CFG.url && CFG.key) {
  const m = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  sb = m.createClient(CFG.url, CFG.key);
}
export const cloud = !!sb;
const ls = (k, d) => JSON.parse(localStorage.getItem(K + k) || 'null') ?? d;
const sv = (k, v) => localStorage.setItem(K + k, JSON.stringify(v));
const uid = () => crypto.randomUUID();
const ok = ({ error }) => { if (error) throw error; };

export const auth = {
  async user() {
    if (!sb) return ls('user', null);
    const { data } = await sb.auth.getUser(), u = data.user;
    return u && { id: u.id, email: u.email, name: u.user_metadata?.name || u.email, isAdmin: !!u.user_metadata?.is_admin };
  },
  async signUp(email, password, name) {            // true = сразу вошёл
    if (!sb) { sv('user', { id: uid(), email, name, isAdmin: false }); return true; }
    const r = await sb.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: location.href.split('#')[0] } });
    ok(r); return !!r.data.session;
  },
  async signIn(email, password) {
    if (!sb) { const u = ls('user', null); sv('user', { id: u?.id || uid(), email, name: u?.name || email.split('@')[0], isAdmin: u?.isAdmin || false }); return; }
    ok(await sb.auth.signInWithPassword({ email, password }));
  },
  async signOut() { sb ? await sb.auth.signOut() : localStorage.removeItem(K + 'user'); }
};

export const db = {
  async list() {
    if (!sb) return ls('tasks', []);
    const r = await sb.from('tasks').select('*').order('due'); ok(r); return r.data;
  },
  async add(t) {
    if (!sb) { const r = { ...t, id: uid(), done: false, deleted_at: null }; sv('tasks', [...ls('tasks', []), r]); return r; }
    const r = await sb.from('tasks').insert(t).select().single(); ok(r); return r.data;
  },
  async patch(id, p) {
    if (!sb) return sv('tasks', ls('tasks', []).map(t => t.id == id ? { ...t, ...p } : t));
    ok(await sb.from('tasks').update(p).eq('id', id));
  },
  async remove(id) {
    if (!sb) return sv('tasks', ls('tasks', []).filter(t => t.id != id));
    ok(await sb.from('tasks').delete().eq('id', id));
  }
};

export const chat = {
  async mine(user) {
    if (!sb) return ls('chat', []);
    const r = await sb.from('messages').select('*').eq('user_id', user.id).order('created_at'); ok(r); return r.data;
  },
  async send(user, body) {
    const row = { user_id: user.id, sender: 'user', user_name: user.name, user_email: user.email, body };
    if (!sb) { const l = ls('chat', []); l.push({ ...row, id: uid(), created_at: new Date().toISOString() }); sv('chat', l); return; }
    ok(await sb.from('messages').insert(row));
  },
  async threads() {                                 // для админа: последний диалог каждого пользователя
    if (!sb) return [];
    const r = await sb.from('messages').select('*').order('created_at'); ok(r);
    const m = new Map();
    r.data.forEach(x => m.set(x.user_id, x));
    return [...m.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async thread(userId) {
    if (!sb) return [];
    const r = await sb.from('messages').select('*').eq('user_id', userId).order('created_at'); ok(r); return r.data;
  },
  async reply(userId, body) {
    if (!sb) return;
    ok(await sb.from('messages').insert({ user_id: userId, sender: 'admin', body }));
  }
};

export const notices = {
  async list() {
    if (!sb) return [];
    const r = await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(30); ok(r); return r.data;
  },
  async send(body, targetUserId) {
    if (!sb) throw new Error('Рассылка доступна только при подключённой базе Supabase.');
    ok(await sb.from('notifications').insert({ body, target_user_id: targetUserId || null }));
  }
};
