import { valley as content } from '../content/valley.js';
import {
  newGame, migrate, validate, settle, getActions, perform, band, MAX_SUPPLIES,
  clockText, partOfDay, isNight, peopleAt, day,
} from '../engine/index.js';
import { createSaves } from './save.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const saves = createSaves();
let state = null;
let lastOut = [];
let closer = false;
let tab = 'journal';
let dialog = null;

const OPENING_QUESTION = 'Why does the valley glow at night?';

// --- Scene ------------------------------------------------------------------

const ANCHORS = { brookhold: [95, 182], meadow: [215, 196], woodland: [318, 160], forest: [420, 132], slopes: [500, 92] };

function scene() {
  const pod = partOfDay(state.minutes);
  const sky = { dawn: ['#f2c9a0', '#9fb7c9'], morning: ['#cfe3ea', '#9cc3d4'], afternoon: ['#d9e8e3', '#a6c7cf'], evening: ['#e7a97a', '#5d6f8e'], night: ['#0b1623', '#182c3a'] }[pod];
  const night = isNight(state.minutes);
  let lights = '';
  let n = 0;
  for (const [id, [x, y]] of Object.entries(ANCHORS)) {
    const env = state.locations[id];
    const amber = env.disturbance >= 35;
    const count = 3 + Math.round(env.vegetation / 20);
    for (let i = 0; i < count; i++) {
      const dx = ((i * 37 + n * 11) % 60) - 30, dy = ((i * 23 + n * 7) % 24) - 12;
      const c = amber && i % 2 === 0 ? 'var(--amber)' : 'var(--glow)';
      lights += `<circle class="lt" cx="${x + dx}" cy="${y + dy}" r="${night ? 1.8 : 1.1}" fill="${c}" style="animation-delay:${(i * 0.37) % 3}s;opacity:${night ? 0.9 : 0.35}"/>`;
    }
    n++;
  }
  const [px, py] = ANCHORS[state.player.loc];
  const lineOn = night && state.player.facts.f_line;
  return `<svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The valley, ${pod}">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[0]}"/></linearGradient>
    <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--hill1)"/><stop offset="1" stop-color="var(--hill2)"/></linearGradient></defs>
    <rect width="600" height="220" fill="url(#sky)"/>
    ${night ? Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 600}" cy="${(i * 53) % 90}" r="${i % 5 ? 0.6 : 1.1}" fill="#dfe9f2" opacity="0.7"/>`).join('') : ''}
    <path d="M330 220 L470 70 L505 40 L520 16 L540 44 L560 30 L600 70 L600 220Z" fill="var(--far)"/>
    <path d="M520 16 L527 30 L515 34 Z M560 30 L566 42 L553 44Z" fill="var(--snow)" opacity="0.85"/>
    ${night ? `<circle cx="520" cy="14" r="${lineOn ? 4 : 2.5}" fill="var(--glow)" class="lt"/>` : ''}
    ${lineOn ? '<path d="M500 92 Q510 60 520 16" stroke="var(--glow)" stroke-width="1" fill="none" stroke-dasharray="2 3" opacity="0.8"/>' : ''}
    <path d="M0 220 L0 150 Q120 120 250 150 T430 110 T600 120 L600 220Z" fill="url(#hill)" opacity="0.75"/>
    <path d="M0 220 L0 175 Q90 160 180 185 T380 165 T600 175 L600 220Z" fill="var(--near)"/>
    <path d="M150 220 Q190 200 230 205 T320 220" stroke="var(--river)" stroke-width="5" fill="none" opacity="0.7"/>
    ${[60, 85, 110, 128].map((x, i) => `<rect x="${x}" y="${178 - (i % 2) * 4}" width="12" height="9" fill="var(--house)"/><path d="M${x - 2} ${178 - (i % 2) * 4} l8 -7 l8 7z" fill="var(--roof)"/>${night ? `<rect x="${x + 4}" y="${181 - (i % 2) * 4}" width="3" height="3" fill="var(--amber)"/>` : ''}`).join('')}
    ${lights}
    <g transform="translate(${px} ${py - 16})"><circle r="9" fill="none" stroke="var(--ink-scene)" stroke-width="1.5" opacity="0.8"/><circle r="2.5" fill="var(--ink-scene)"/></g>
  </svg>`;
}

// --- Rendering ----------------------------------------------------------------

function msgHtml(m) {
  if (typeof m === 'string') return `<p>${esc(m)}</p>`;
  if (m.kind === 'insight') return `<div class="card insight"><div class="tag">Insight</div><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p><p class="unlock">${esc(m.unlocks)}</p><p class="q">New question: ${esc(m.question)}</p></div>`;
  if (m.kind === 'fact') return `<div class="card fact"><div class="tag">Noted in your journal</div><p>${esc(m.text)}</p></div>`;
  if (m.kind === 'news') return `<p class="news">${esc(m.text)}</p>`;
  if (m.kind === 'rescue') return `<div class="card rescue"><p>${esc(m.text)}</p></div>`;
  if (m.kind === 'choice') return `<div class="card choice"><p>${esc(m.text)}</p></div>`;
  if (m.kind === 'error') return `<p class="err">${esc(m.text)}</p>`;
  return `<p>${esc(m.text)}</p>`;
}

function btn(a, extra = '') {
  const cost = a.detail || (a.minutes ? `${a.minutes} min` : '');
  return `<button class="act ${extra}" data-act="${esc(a.id)}" ${a.disabled ? `aria-disabled="true" title="${esc(a.disabled)}"` : ''}>
    <span>${esc(a.label)}</span>${cost ? `<small>${esc(cost)}</small>` : ''}${a.disabled ? `<small class="why">${esc(a.disabled)}</small>` : ''}</button>`;
}

function personName(id) {
  const r = state.relations[id];
  const role = content.people[id].role;
  return r.met ? content.people[id].name : `${/^[aeiou]/i.test(role) ? 'An' : 'A'} ${role}`;
}

function renderMain() {
  const p = state.player;
  const loc = content.locations[p.loc];
  const place = loc.places[p.place];
  const actions = getActions(state, content);
  const here = actions.filter((a) => a.group === 'here');
  const moves = actions.filter((a) => a.group === 'move');
  const travel = actions.filter((a) => a.group === 'travel');
  const people = peopleAt(state, p.loc, p.place);

  const st = Math.round(p.stress);
  const bandName = band(p.stress);
  $('#status').innerHTML = `
    <div class="clock"><b>${esc(clockText(state.minutes))}</b><span>${esc(partOfDay(state.minutes))}</span></div>
    <div class="meter" title="Stress"><span>Stress <b>${st}</b> · ${esc(bandName)}</span><i><em class="${bandName}" style="width:${st}%"></em></i></div>
    <div class="pill" title="Supplies">Supplies <b>${p.supplies}/${MAX_SUPPLIES}</b></div>
    <div class="pill" title="Coin">Coin <b>${p.coin}</b></div>`;

  $('#scene').innerHTML = scene();

  const line = content.locations[p.loc].places[p.place];
  $('#place').innerHTML = `
    <div class="where">${esc(content.region.name)} › ${esc(loc.name)}</div>
    <h1>${esc(place.name)}</h1>
    <p class="line">${esc(line.line)} <span class="sub">${esc(loc.line)}</span></p>
    ${closer ? `<p class="flavour">${esc(place.flavour)}</p>` : ''}
    <button class="link" data-ui="closer">${closer ? 'Look away' : 'Look closer'}</button>`;

  const out = lastOut.length ? lastOut : [];
  $('#feed').innerHTML = out.length ? out.map(msgHtml).join('') : '<p class="dim">Choose what to do.</p>';

  $('#here').innerHTML = here.map((a) => btn(a)).join('');

  $('#people').innerHTML = people.length ? people.map((id) => {
    const acts = actions.filter((a) => a.person === id);
    const r = state.relations[id];
    const main = acts.filter((a) => !a.id.startsWith('ask:'));
    const asks = acts.filter((a) => a.id.startsWith('ask:'));
    return `<div class="person">
      <div class="pname"><b>${esc(personName(id))}</b>${r.met ? `<span>${esc(content.people[id].role)}</span>` : ''}${state.player.owes === id ? '<span class="owe">you owe a favour</span>' : ''}</div>
      <div class="row">${main.map((a) => btn(a)).join('')}</div>
      <div class="row asks">${asks.map((a) => btn(a, 'small')).join('')}</div>
    </div>`;
  }).join('') : '<p class="dim">No one else is here.</p>';

  $('#moves').innerHTML = moves.map((a) => btn(a)).join('') || '<p class="dim">Nowhere else nearby.</p>';
  $('#travel').innerHTML = travel.map((a) => btn(a)).join('');

  $('#done').hidden = !state.flags.sliceDone;
}

function renderSide() {
  document.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
  const p = state.player;
  let html = '';
  if (tab === 'journal') {
    const ins = Object.keys(p.insights).map((id) => content.insights[id]);
    const open = [OPENING_QUESTION, ...ins.map((i) => i.question)];
    const answered = ins.length; // each insight answers the question before it
    html += '<h2>Questions</h2><ul class="qs">' + open.map((q, i) => {
      const latest = i === open.length - 1;
      const hint = latest && i > 0 ? ins[i - 1].hint : latest ? 'The reeds by the river, after dark. And Ilse, the herbalist, knows the old sayings.' : '';
      return `<li class="${i < answered ? 'done' : ''}">${esc(q)}${hint ? `<small>${esc(hint)}</small>` : ''}</li>`;
    }).join('') + '</ul>';
    html += '<h2>Insights</h2>' + (ins.length ? ins.map((i) => `<div class="j insight"><b>${esc(i.name)}</b><p>${esc(i.text)}</p></div>`).join('') : '<p class="dim">None yet. Gather facts, then reflect somewhere quiet.</p>');
    const facts = Object.keys(p.facts);
    html += '<h2>Facts</h2>' + (facts.length ? facts.map((f) => `<div class="j">${esc(content.facts[f].text)}<small>Day ${p.facts[f]}</small></div>`).join('') : '<p class="dim">Nothing noted yet. Observe places, and ask people.</p>');
  } else if (tab === 'people') {
    const met = Object.entries(state.relations).filter(([, r]) => r.met);
    html += '<h2>People you know</h2>' + (met.length ? met.map(([id, r]) => {
      const st = state.people[id];
      const where = st.loc ? `${content.locations[st.loc].places[st.place].name}, ${content.locations[st.loc].name}` : 'at home';
      return `<div class="j person-j"><b>${esc(content.people[id].name)}</b> <span class="dim">${esc(content.people[id].role)}</span>
        <div class="bars"><label>Knows you<i><em style="width:${r.familiarity}%"></em></i></label><label>Trust<i><em style="width:${Math.max(0, r.trust)}%"></em></i></label></div>
        ${p.owes === id ? '<small class="owe">You owe them a favour. Help them to repay it.</small>' : ''}
        <small>Last seen: ${esc(where)}</small></div>`;
    }).join('') : '<p class="dim">You haven\'t met anyone yet. Chat to people to get to know them.</p>');
    const heard = state.news.filter((n) => p.heardNews.includes(n.id)).slice(-8).reverse();
    html += '<h2>What you\'ve heard</h2>' + (heard.length ? heard.map((n) => `<div class="j">${esc(n.text)}<small>${esc(clockText(n.minutes))}</small></div>`).join('') : '<p class="dim">Ask people for news once they know you.</p>');
  } else {
    const s = saves.status();
    const where = { account: 'Saved to your Claude account. It follows you to other devices.', browser: 'Saved in this browser only. Sign in to claude.ai to save to your account.', none: 'Saving isn\'t available here. Download your save to keep it.', starting: 'Connecting…' }[s.mode];
    html += `<h2>Saving</h2><p>${esc(where)} ${s.writing ? '<span class="dim">Saving…</span>' : ''}</p>${s.error ? `<p class="err">${esc(s.error)}</p>` : ''}
      <div class="col"><button class="act" data-ui="export"><span>Download save file</span></button>
      <label class="act file"><span>Load a save file</span><input type="file" accept=".json,application/json" id="import"></label>
      <button class="act" data-ui="new"><span>Start a new game</span></button></div>
      <h2>How to play</h2>
      <p>Observe places and ask people to gather facts. Reflect somewhere quiet to connect them into insights. Stress limits what you can do; rest, sleep and good company bring it down. Supplies are spent on the road and sleeping rough.</p>
      <p class="dim">Frontier slice 1, save version ${state.version}.</p>`;
  }
  $('#side').innerHTML = html;
  $('#import')?.addEventListener('change', onImport);
}

function renderDialog() {
  const d = $('#dialog');
  if (!dialog) { d.hidden = true; d.innerHTML = ''; return; }
  d.hidden = false;
  d.innerHTML = `<div class="box" role="dialog" aria-modal="true"><p>${esc(dialog.text)}</p>
    ${dialog.textarea ? `<textarea readonly rows="8">${esc(dialog.textarea)}</textarea><button class="act" data-ui="copy"><span>Copy</span></button>` : ''}
    <div class="row">${dialog.confirm ? `<button class="act primary" data-ui="ok"><span>${esc(dialog.confirm)}</span></button>` : ''}<button class="act" data-ui="cancel"><span>${dialog.confirm ? 'Cancel' : 'Close'}</span></button></div></div>`;
  d.querySelector('[data-ui="ok"], [data-ui="cancel"]')?.focus();
}

function render() {
  renderMain(); renderSide(); renderDialog();
}

// --- Input --------------------------------------------------------------------

function showError(err) {
  lastOut = [{ kind: 'error', text: `Something went wrong: ${err?.message || err}. Your last save is safe. Please tell Claude what you were doing.` }];
  try { renderMain(); } catch { $('#feed').innerHTML = msgHtml(lastOut[0]); }
}

window.addEventListener('error', (e) => showError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));

function doAction(id) {
  try { runAction(id); } catch (err) { showError(err); }
}

function runAction(id) {
  const before = state.player.loc + state.player.place;
  lastOut = perform(state, content, id);
  if (before !== state.player.loc + state.player.place) closer = false;
  saves.save(state);
  render();
  $('#feed').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function startNew(saveNow = true) {
  state = newGame(content, (Math.random() * 2 ** 32) >>> 0);
  settle(state, content);
  lastOut = ['You arrive in Brookhold with a little coin, a light pack and a question nobody here seems to ask: why does the valley glow at night?'];
  if (saveNow) saves.save(state);
  render();
}

function loadState(s, note) {
  const migrated = migrate(s);
  const problems = validate(migrated, content);
  if (problems.length) throw new Error(`This save doesn't fit the current game (${problems.join(', ')}).`);
  state = migrated;
  settle(state, content);
  lastOut = [note];
  render();
}

async function onImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    migrate(parsed);
    dialog = { text: `Load this save (${clockText(parsed.minutes)})? It replaces your current game.`, confirm: 'Load it', onOk: () => { loadState(parsed, 'Save loaded.'); saves.save(state); } };
  } catch (err) {
    dialog = { text: `That file couldn't be loaded: ${err.message}` };
  }
  renderDialog();
}

document.addEventListener('click', async (e) => {
  const act = e.target.closest('[data-act]');
  if (act) {
    if (act.getAttribute('aria-disabled') === 'true') { lastOut = [{ kind: 'error', text: act.title }]; renderMain(); return; }
    doAction(act.dataset.act);
    return;
  }
  const t = e.target.closest('[data-tab]');
  if (t) { tab = t.dataset.tab; renderSide(); return; }
  const ui = e.target.closest('[data-ui]')?.dataset.ui;
  if (!ui) return;
  if (ui === 'closer') { closer = !closer; renderMain(); }
  if (ui === 'new') { dialog = { text: 'Start a new game? Your current game will be replaced. Download a save first if you want to keep it.', confirm: 'Start again', onOk: () => startNew() }; renderDialog(); }
  if (ui === 'export') {
    const res = await saves.exportFile(state, `frontier-day${day(state.minutes)}.json`);
    if (!res.ok && !res.declined) { dialog = { text: 'Downloads aren\'t available here. Copy this text and keep it somewhere safe; you can paste it into a .json file to load later.', textarea: res.text }; renderDialog(); }
  }
  if (ui === 'copy') { try { await navigator.clipboard.writeText(dialog.textarea); e.target.closest('button').querySelector('span').textContent = 'Copied'; } catch { /* select manually */ } }
  if (ui === 'ok') { const fn = dialog.onOk; dialog = null; renderDialog(); try { fn?.(); } catch (err) { dialog = { text: err.message }; renderDialog(); } }
  if (ui === 'cancel') { dialog = null; renderDialog(); }
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dialog) { dialog = null; renderDialog(); } });

saves.onChange(() => { if (state && tab === 'menu') renderSide(); });

// --- Boot ---------------------------------------------------------------------

(async () => {
  await saves.init();
  let saved = null;
  try { saved = await saves.load(); } catch { saved = null; }
  if (saved) {
    try { loadState(saved, 'Welcome back.'); return; } catch (err) { lastOut = [{ kind: 'error', text: `Your save couldn't be loaded (${err.message}). A new game has started; the old save is untouched until you act.` }]; }
  }
  const note = lastOut;
  startNew(!note.length);
  if (note.length) { lastOut = [...note, ...lastOut]; render(); }
})();
