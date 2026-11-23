import { auth, db, cloud, chat, notices } from './store.js';
import { CITY } from './config.js';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const QUOTES = [['Первый шаг — начало большого пути', ''], ['Чтобы дойти до цели, нужно прежде всего идти', 'Оноре де Бальзак'], ['Два самых могущественных воина — терпение и время', 'Лев Толстой'], ['Каждый день — это новое начало', 'Джонатан Локвуд Хьюи'], ['Путь в тысячу ли начинается с первого шага', 'Лао-цзы'], ['Единственный способ делать великие дела — любить то, что ты делаешь', 'Стив Джобс'], ['Сделано лучше, чем идеально', 'Шерил Сэндберг'], ['Дорогу осилит идущий', 'Русская пословица'], ['Большое дело начинается с маленького шага', ''], ['Не нужно делать всё. Нужно начать', '']];
let qi = 0;
const pickQ = () => { const l = +ck('jodo_q') || 0; qi = (l + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length; ck('jodo_q', qi); };
const HEAD = { today: ['Сегодня', 'Задачи на сегодня'], calendar: ['Календарь', 'Расписание на неделю'], tasks: ['Задачи', 'Все ваши задачи в одном списке'], plans: ['Планы', 'Ваше пространство для планов'] };
const ck = (k, v) => {
  if (v === undefined) { const m = document.cookie.match('(?:^|; )' + k + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : ''; }
  document.cookie = `${k}=${encodeURIComponent(v)}; max-age=31536000; path=${location.pathname.replace(/[^/]*$/, '')}; SameSite=Lax${location.protocol == 'https:' ? '; Secure' : ''}`;
};
const S = { user: null, tasks: [], notices: [], view: 'today', wk: 0, profTab: 'data', inboxUser: null, set: { notify: true, compact: false, monday: true, theme: 'dark', accent: '#2563eb', bgcolor: '#1e2128', sidecolor: '#181b20', panelcolor: '#1a1d24', textcolor: '#e8ebf1', ...JSON.parse(ck('jodo_set') || '{}') } };
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const pl = (n, a, b, c) => { const m = n % 10, h = n % 100; return n + ' ' + (m == 1 && h != 11 ? a : m > 1 && m < 5 && (h < 10 || h > 20) ? b : c); };
const live = () => S.tasks.filter(t => !t.deleted_at), act = l => (l || live()).filter(t => !t.done);
const d0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const same = (a, b) => +d0(a) == +d0(b);
const hm = d => d.toTimeString().slice(0, 5);
const when = s => { const d = new Date(s), n = Math.round((d0(d) - d0(new Date())) / 864e5); return (n == 0 ? 'Сегодня' : n == 1 ? 'Завтра' : d.toLocaleDateString('ru', { day: 'numeric', month: 'long' })) + ', ' + hm(d); };
const meta = t => when(t.due) + (t.project ? ` <span class="lb">${esc(t.project)}</span>` : '');
const row = t => `<div class="t ${t.done ? 'done' : ''}"><input type="checkbox" data-act="done" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Отметить как выполненную"><div><b>${esc(t.title)}</b><small>${meta(t)}</small></div><button class="x" data-act="del" data-id="${t.id}">Удалить</button></div>`;
const sec = (a, b, l) => `<div class="sec"><span>${a}</span><span>${b}</span></div>${l.map(row).join('')}`;
const empty = () => { const [q, a] = QUOTES[qi]; return `<div class="empty"><h2>${a ? '«' + q + '»' : q}</h2><p>${a ? '— ' + a : ''}</p><button class="btn" data-act="add">+ Добавить задачу</button></div>`; };
const wkStart = () => { const d = d0(new Date()); d.setDate(d.getDate() - (d.getDay() + (S.set.monday ? 6 : 0)) % 7 + 7 * S.wk); return d; };

const V = {
  today() { const l = live().filter(t => same(new Date(t.due), new Date())); return l.length ? sec('Фокус на сегодня', pl(act(l).length, 'активная', 'активные', 'активных'), l) : empty(); },
  tasks() { const l = live(), a = act(l), c = l.filter(t => t.done); return l.length ? sec('Активные задачи', pl(a.length, 'активная', 'активные', 'активных'), a) + (c.length ? sec('Завершённые', pl(c.length, 'задача', 'задачи', 'задач'), c) : '') : empty(); },
  plans() { const t0 = d0(new Date()); return Array.from({ length: 14 }, (_, i) => { const d = new Date(t0); d.setDate(d.getDate() + i); const l = live().filter(t => same(new Date(t.due), d)); return `<div class="day ${i ? '' : 'now'}"><div class="dn">${d.getDate()}<small>${i == 0 ? 'Сегодня' : i == 1 ? 'Завтра' : d.toLocaleDateString('ru', { weekday: 'long' })}</small></div><div>${l.length ? l.map(row).join('') : '<small>Нет задач</small>'}</div></div>`; }).join(''); },
  calendar() {
    const s = wkStart(), days = Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; }), e = days[6];
    let h = `<div class="wk"><button data-act="prev" aria-label="Назад">‹</button><b>${s.getDate()} ${s.toLocaleDateString('ru', { month: 'long' })} — ${e.getDate()} ${e.toLocaleDateString('ru', { month: 'long' })}</b><button data-act="next" aria-label="Вперёд">›</button></div><div class="cal"><div class="ch">Время</div>` + days.map(d => `<div class="ch ${same(d, new Date()) ? 'now' : ''}">${d.toLocaleDateString('ru', { weekday: 'short' })} ${d.getDate()}</div>`).join('');
    for (let H = 8; H < 20; H++) h += `<div class="hr">${String(H).padStart(2, '0')}:00</div>` + days.map(d => `<div class="cell">${live().filter(x => { const z = new Date(x.due); return same(z, d) && z.getHours() == H; }).map(x => `<div class="ev ${x.done ? 'done' : ''}">${hm(new Date(x.due))} ${esc(x.title)}</div>`).join('')}</div>`).join('');
    return h + '</div>';
  }
};
function render() {
  $$('.nav [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v == S.view));
  $('#h').textContent = HEAD[S.view][0]; $('#sub').textContent = HEAD[S.view][1];
  $('#main').innerHTML = V[S.view]();
  const lb = [...new Set(live().map(t => t.project).filter(Boolean))];
  $('.projs').hidden = !lb.length;
  $('#proj').innerHTML = lb.map(p => `<div><i></i>${esc(p)}<em>${act().filter(t => t.project == p).length}</em></div>`).join('');
  $('#lbls').innerHTML = lb.map(p => `<option value="${esc(p)}">`).join('');
  document.body.classList.toggle('compact', S.set.compact);
}
function trash() {
  const l = S.tasks.filter(t => t.deleted_at);
  $('#tl').innerHTML = l.length ? l.map(t => `<div class="t"><div><b>${esc(t.title)}</b><small>${meta(t)}</small></div><button data-act="restore" data-id="${t.id}">Вернуть</button><button class="x" data-act="purge" data-id="${t.id}">Удалить навсегда</button></div>`).join('') : '<div class="empty"><h3>Корзина пуста</h3><small>Удалённые задачи будут временно храниться здесь.</small></div>';
}
let tt;
function toast(m, lbl, fn) {
  const el = $('#toast'); el.innerHTML = esc(m) + (lbl ? ` <button id="tu">${lbl}</button>` : ''); el.hidden = false;
  if (lbl) $('#tu').onclick = () => { fn(); el.hidden = true; };
  clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 5000);
}
const find = id => S.tasks.find(t => t.id == id);
async function patch(id, p, msg, lbl, undo) { await db.patch(id, p); Object.assign(find(id), p); render(); if ($('#mTrash').open) trash(); if (msg) toast(msg, lbl, undo); }


const CUSTOM = { accent: ['--acc', '#2563eb'], bgcolor: ['--bg', '#1e2128'], sidecolor: ['--side', '#181b20'], panelcolor: ['--panel', '#1a1d24'], textcolor: ['--tx', '#e8ebf1'] };
function applyTheme() {
  const r = document.documentElement, st = r.style;
  r.dataset.theme = S.set.theme || 'dark';
  const all = [...Object.values(CUSTOM).map(v => v[0]), '--line', '--nav', '--mu', '--dk'];
  if (S.set.theme === 'custom') {
    for (const [k, [v, d]] of Object.entries(CUSTOM)) st.setProperty(v, S.set[k] || d);
    st.setProperty('--line', 'color-mix(in srgb, var(--tx) 14%, var(--panel))');
    st.setProperty('--mu', 'color-mix(in srgb, var(--tx) 55%, var(--bg))');
    st.setProperty('--nav', 'color-mix(in srgb, var(--acc) 22%, var(--side))');
    st.setProperty('--dk', 'color-mix(in srgb, var(--bg) 70%, #000)');
  } else all.forEach(v => st.removeProperty(v));
}
async function loadNotices() {
  if (!S.set.notify) { $('#badge').hidden = true; return; }
  try { S.notices = await notices.list(); } catch { return; }
  const seen = ck('jodo_seen') || '';
  const unread = S.notices.filter(x => x.created_at > seen).length;
  $('#badge').textContent = unread; $('#badge').hidden = !unread;
  $('#pb').innerHTML = S.notices.length
    ? S.notices.slice(0, 5).map(x => `<div class="ntf"><small>${when(x.created_at)}</small><p>${esc(x.body)}</p></div>`).join('')
    : '<small>Новых уведомлений нет.</small>';
}
const TABS_BASE = [['data', 'Мои данные'], ['support', 'Поддержка'], ['contacts', 'Контакты']];
const TABS_ADMIN = [['notify', 'Уведомления'], ['inbox', 'Чат поддержки']];
const profTabs = () => S.user.isAdmin ? [...TABS_BASE, ...TABS_ADMIN] : TABS_BASE;
let chatPoll = null;
function openProfile() {
  S.profTab = 'data'; S.inboxUser = null;
  $('#profTitle').textContent = S.user.isAdmin ? 'Панель администратора' : 'Профиль';
  $('#profTabs').innerHTML = profTabs().map(([k, l]) => `<button class="tb" data-tab="${k}">${l}</button>`).join('');
  renderProfTab(); $('#mProfile').showModal();
}
async function renderProfTab() {
  $$('#profTabs .tb').forEach(b => b.classList.toggle('on', b.dataset.tab == S.profTab));
  clearInterval(chatPoll);
  const body = $('#profBody');
  if (S.profTab == 'data') {
    body.innerHTML = `<div class="kv"><b>Имя</b><span>${esc(S.user.name)}</span></div><div class="kv"><b>Почта</b><span>${esc(S.user.email)}</span></div><div class="kv"><b>Город</b><span>${CITY}</span></div><div class="kv"><b>Роль</b><span>${S.user.isAdmin ? 'Админчик' : 'Пользователь'}</span></div>`;
  } else if (S.profTab == 'contacts') {
    body.innerHTML = `<div class="kv"><b>Telegram</b><span>@jodo_support</span></div><div class="kv"><b>Почта поддержки</b><span>support@jodo.app</span></div><p class="hint">Ответы приходят в течении 5-10 минут.</p>`;
  } else if (S.profTab == 'support') {
    body.innerHTML = `<div class="chat" id="chatBox"></div><form id="chatForm" class="chatform"><input name="m" placeholder="Напишите сообщение..." maxlength="500" autocomplete="off"><button class="btn">➤</button></form>`;
    loadOwnChat(); chatPoll = setInterval(loadOwnChat, 4000);
    $('#chatForm').onsubmit = async e => {
      e.preventDefault(); const f = e.target.elements, t = f.m.value.trim(); if (!t) return;
      f.m.value = ''; try { await chat.send(S.user, t); loadOwnChat(); } catch { toast('Не удалось отправить сообщение. Проверьте подключение и попробуйте ещё раз.'); }
    };
  } else if (S.profTab == 'notify') {
    body.innerHTML = `<form id="notifyForm"><label>Кому<select name="to"><option value="">Всем пользователям</option></select></label><label>Текст уведомления<input name="b" maxlength="200" placeholder="Например: скоро новая функция"></label><p class="err" id="nerr"></p><button class="btn">Отправить</button></form>`;
    chat.threads().then(l => { const sel = $('#notifyForm [name=to]'); l.forEach(t => sel.insertAdjacentHTML('beforeend', `<option value="${t.user_id}">${esc(t.user_name || t.user_email || t.user_id)}</option>`)); });
    $('#notifyForm').onsubmit = async e => {
      e.preventDefault(); const f = e.target.elements, err = $('#nerr'), b = f.b.value.trim();
      if (!b) return err.textContent = 'Введите текст уведомления.';
      try { await notices.send(b, f.to.value || null); f.b.value = ''; err.textContent = ''; toast('Уведомление отправлено.'); }
      catch { err.textContent = 'Не удалось отправить. Проверьте подключение и попробуйте ещё раз.'; }
    };
  } else if (S.profTab == 'inbox') {
    renderInbox();
  }
}
async function loadOwnChat() {
  try {
    const l = await chat.mine(S.user);
    $('#chatBox').innerHTML = l.length ? l.map(m => `<div class="msg ${m.sender}"><span>${esc(m.body)}</span></div>`).join('') : '<p class="hint">Напишите нам, если нужна помощь.</p>';
    $('#chatBox').scrollTop = 1e9;
  } catch {}
}
async function renderInbox() {
  const body = $('#profBody');
  if (!S.inboxUser) {
    const l = await chat.threads();
    body.innerHTML = l.length
      ? l.map(t => `<button class="thread" data-u="${t.user_id}" data-n="${esc(t.user_name || t.user_email || 'Пользователь')}"><b>${esc(t.user_name || t.user_email || 'Пользователь')}</b><small>${esc(t.body).slice(0, 50)}</small></button>`).join('')
      : '<p class="hint">Пока нет обращений в поддержку.</p>';
  } else {
    body.innerHTML = `<button type="button" class="link" id="backInbox">← Все обращения</button><div class="chat" id="chatBox"></div><form id="chatForm" class="chatform"><input name="m" placeholder="Ответ пользователю..." autocomplete="off"><button class="btn">➤</button></form>`;
    const draw = async () => { const l = await chat.thread(S.inboxUser.id); $('#chatBox').innerHTML = l.map(m => `<div class="msg ${m.sender}"><span>${esc(m.body)}</span></div>`).join(''); $('#chatBox').scrollTop = 1e9; };
    await draw();
    $('#backInbox').onclick = () => { S.inboxUser = null; clearInterval(chatPoll); renderInbox(); };
    $('#chatForm').onsubmit = async e => {
      e.preventDefault(); const f = e.target.elements, t = f.m.value.trim(); if (!t) return;
      f.m.value = ''; try { await chat.reply(S.inboxUser.id, t); await draw(); } catch { toast('Не удалось отправить ответ.'); }
    };
    chatPoll = setInterval(draw, 4000);
  }
}

document.addEventListener('click', async e => {
  if (!e.target.closest('.pop,[data-act=bell],[data-act=ava]')) $$('.pop').forEach(p => p.hidden = true);
  if (e.target.matches('dialog')) e.target.close();
  if (e.target.closest('[data-close]')) return e.target.closest('dialog').close();
  if (e.target.closest('.tb')) { S.profTab = e.target.closest('.tb').dataset.tab; S.inboxUser = null; return renderProfTab(); }
  if (e.target.closest('.thread')) { const el = e.target.closest('.thread'); S.inboxUser = { id: el.dataset.u, name: el.dataset.n }; return renderInbox(); }
  if (e.target.closest('#themeReset')) {
    for (const [k, [, d]] of Object.entries(CUSTOM)) { S.set[k] = d; $('#mSet [name=' + k + ']').value = d; }
    ck('jodo_set', JSON.stringify(S.set)); applyTheme(); return;
  }
  if (e.target.closest('#themeSeg button')) {
    const bt = e.target.closest('button'); S.set.theme = bt.dataset.theme; ck('jodo_set', JSON.stringify(S.set));
    $$('#themeSeg button').forEach(x => x.classList.toggle('on', x === bt)); $('#themeCustom').hidden = bt.dataset.theme !== 'custom'; applyTheme(); return;
  }
  const b = e.target.closest('[data-act],[data-v]'); if (!b) return;
  if (b.dataset.v) { S.view = b.dataset.v; pickQ(); return render(); }
  const a = b.dataset.act, id = b.dataset.id;
  try {
    if (a == 'done') { const t = find(id); await patch(id, { done: !t.done }, !t.done && 'Задача выполнена. Отличная работа!'); }
    else if (a == 'del') await patch(id, { deleted_at: new Date().toISOString() }, 'Задача удалена.', 'Отменить', () => patch(id, { deleted_at: null }));
    else if (a == 'restore') await patch(id, { deleted_at: null });
    else if (a == 'purge') { await db.remove(id); S.tasks = S.tasks.filter(t => t.id != id); trash(); render(); }
    else if (a == 'add') openAdd();
    else if (a == 'prev' || a == 'next') { S.wk += a == 'next' ? 1 : -1; render(); }
    else if (a == 'trash') { $$('.pop').forEach(p => p.hidden = true); trash(); $('#mTrash').showModal(); }
    else if (a == 'settings') { $$('.pop').forEach(p => p.hidden = true); $('#mSet').showModal(); }
    else if (a == 'profile') { $$('.pop').forEach(p => p.hidden = true); openProfile(); }
    else if (a == 'bell') {
      $('#pa').hidden = true; $('#pb').hidden = !$('#pb').hidden;
      if (!$('#pb').hidden) { ck('jodo_seen', new Date().toISOString()); $('#badge').hidden = true; }
    }
    else if (a == 'ava') { $('#pb').hidden = true; $('#pa').hidden = !$('#pa').hidden; }
    else if (a == 'logout') { await auth.signOut(); S.tasks = []; boot(); }
  } catch { toast('Не удалось выполнить действие. Проверьте данные и попробуйте ещё раз.'); }
});

function openAdd() {
  const f = $('#fTask').elements, n = new Date();
  f.t.value = ''; f.p.value = ''; f.d.value = new Date(n - n.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  f.tm.value = String(Math.min(23, n.getHours() + 1)).padStart(2, '0') + ':00'; $('#err').textContent = '';
  $('#mTask').showModal(); f.t.focus();
}
$('#fTask').onsubmit = async e => {
  e.preventDefault(); const f = e.target.elements, err = $('#err'), title = f.t.value.trim();
  if (!title) return err.textContent = 'Введите название задачи, чтобы сохранить её.';
  const due = new Date(f.d.value + 'T' + f.tm.value);
  if (due < new Date()) return err.textContent = 'Это время уже прошло. Выберите другое время.';
  try { S.tasks.push(await db.add({ title, due: due.toISOString(), project: f.p.value.trim() })); $('#mTask').close(); render(); }
  catch { err.textContent = 'Не удалось сохранить задачу. Проверьте подключение и попробуйте ещё раз.'; }
};
$('#mSet').addEventListener('change', e => { if (e.target.type !== 'checkbox') return; S.set[e.target.name] = e.target.checked; ck('jodo_set', JSON.stringify(S.set)); render(); });
$('#mSet').addEventListener('input', e => { if (e.target.type !== 'color') return; S.set[e.target.name] = e.target.value; ck('jodo_set', JSON.stringify(S.set)); applyTheme(); });
$('#mProfile').addEventListener('close', () => clearInterval(chatPoll));

let reg = false;
$('#sw').onclick = () => {
  reg = !reg; $('#at').textContent = reg ? 'Регистрация' : 'Вход'; $('#ab').textContent = reg ? 'Создать аккаунт' : 'Войти';
  $('#sw').textContent = reg ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'; $('#fAuth').elements.nm.hidden = !reg; $('#fAuth').elements.nm.required = reg; $('#aerr').textContent = '';
};
$('#fAuth').onsubmit = async e => {
  e.preventDefault(); const f = e.target.elements, m = $('#aerr'); m.textContent = '';
  try {
    if (reg) { if (!await auth.signUp(f.email.value, f.pw.value, f.nm.value.trim())) return m.textContent = 'Мы отправили письмо. Подтвердите почту и войдите.'; }
    else await auth.signIn(f.email.value, f.pw.value);
    boot();
  } catch (x) {
    const t = x.message || '';
    m.textContent = /invalid login/i.test(t) ? 'Неверная почта или пароль. Проверьте данные и попробуйте ещё раз.'
      : /already|registered|exists/i.test(t) ? 'Эта почта уже зарегистрирована. Войдите в аккаунт или подтвердите её по письму.'
      : /confirm/i.test(t) ? 'Подтвердите почту по ссылке из письма, затем войдите.'
      : /rate limit/i.test(t) ? 'Слишком много попыток. Подождите немного и попробуйте снова.'
      : 'Не удалось выполнить действие. Проверьте данные и попробуйте ещё раз.';
  }
};
async function boot() {
  S.user = await auth.user(); $('#demo').hidden = cloud; $('#auth').hidden = !!S.user; $('#app').hidden = !S.user; if (!S.user) return; pickQ();
  try { S.tasks = await db.list(); } catch { toast('Не удалось загрузить задачи. Проверьте подключение и попробуйте ещё раз.'); }
  $('#ava').textContent = S.user.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  $('#pn').textContent = S.user.name; $('#pc').textContent = (S.user.isAdmin ? 'Админчик' : 'Пользователь') + ' · ' + CITY;
  $('#profBtn').textContent = S.user.isAdmin ? 'Властвовать' : 'Открыть профиль';
  $$('#mSet input[type=checkbox]').forEach(i => i.checked = S.set[i.name]);
  $$('#themeSeg button').forEach(b => b.classList.toggle('on', b.dataset.theme == (S.set.theme || 'dark')));
  $('#themeCustom').hidden = (S.set.theme || 'dark') !== 'custom';
  for (const [k, [, d]] of Object.entries(CUSTOM)) $('#mSet [name=' + k + ']').value = S.set[k] || d;
  applyTheme(); render(); loadNotices();
}
const told = new Set();
setInterval(() => {
  if (!S.user) return;
  loadNotices();
  if (!S.set.notify) return;
  act().forEach(t => { const m = (new Date(t.due) - Date.now()) / 6e4; if (m > 0 && m <= 15 && !told.has(t.id)) { told.add(t.id); toast('Через 15 минут: ' + t.title); } });
}, 30000);
applyTheme();
boot();
if (!ck('jodo_ok')) $('#ck').hidden = false;
$('#ckb').onclick = () => { ck('jodo_ok', '1'); $('#ck').hidden = true; };
