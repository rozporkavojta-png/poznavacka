'use strict';
/* Poznávačka obratlovců – procvičování podle fotek.
   Výsledky se ukládají jen v prohlížeči (localStorage), každý profil zvlášť. */

const $app = document.getElementById('app');
const GROUPS = ['Bezlebeční a pláštěnci', 'Kruhoústí', 'Paryby', 'Ryby', 'Obojživelníci', 'Plazi', 'Ptáci', 'Savci'];
const BY_ID = new Map(DRUHY.map(d => [d.id, d]));
const PART = { 1: DRUHY.filter(d => d.part === 1), 2: DRUHY.filter(d => d.part === 2) };

/* ---------- pomocné ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function rnd(n) { // kryptograficky náhodné celé číslo 0..n-1
  const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n;
}
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick = arr => arr[rnd(arr.length)];
const img = f => 'img/' + f;
const bezDiakritiky = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = s => s.toLowerCase().replace(/[„“"”*]/g, '').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
const sklon = (n, a, b, c) => n === 1 ? a : (n >= 2 && n <= 4 ? b : c);

/* ---------- úložiště ---------- */
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* soukromé okno apod. */ } },
  del(k) { try { localStorage.removeItem(k); } catch { } }
};
const keyOf = name => 'pzn:profil:' + bezDiakritiky(norm(name));
let profile = null;
function loadProfile(name) {
  const k = keyOf(name);
  profile = store.get(k, null) || { name: name.trim(), created: Date.now(), tests: [], sp: {}, set: {} };
  profile.set = Object.assign({ lang: 'both', diak: 'strict', tax: false }, profile.set);
  const list = store.get('pzn:profily', []);
  if (!list.includes(k)) { list.push(k); store.set('pzn:profily', list); }
  store.set('pzn:aktivni', k);
  save();
}
function save() { if (profile) store.set(keyOf(profile.name), profile); }
function logout() { store.del('pzn:aktivni'); profile = null; viewLogin(); }

/* ---------- přihlášení ---------- */
function viewLogin() {
  const list = store.get('pzn:profily', []).map(k => store.get(k, null)).filter(Boolean);
  $app.innerHTML = `
  <main class="login"><div class="login-card">
    <div class="brand"><span class="brand-mark">P</span>Poznávačka obratlovců</div>
    <h1>Kdo se bude učit?</h1>
    <p>Zadej své jméno. Výsledky a chyby se ukládají jen v tomhle prohlížeči a každý má svoje.</p>
    <form id="lf"><label class="field"><span class="opt-t">Jméno</span>
      <input id="ln" autocomplete="nickname" maxlength="40" placeholder="např. Vojta" required></label>
      <button class="btn btn-primary btn-block" style="margin-top:14px">Pokračovat</button></form>
    ${list.length ? `<div class="profiles"><h3>Profily na tomto zařízení</h3>${list.map(p => `
      <button class="profile-row" data-n="${esc(p.name)}"><span class="avatar">${esc(p.name[0].toUpperCase())}</span>
      <span><b>${esc(p.name)}</b><small>${p.tests.length} ${sklon(p.tests.length, 'test', 'testy', 'testů')}</small></span></button>`).join('')}</div>` : ''}
    <p class="note">${DRUHY.length} druhů · 1. část ${PART[1].length} · 2. část ${PART[2].length}</p>
  </div></main>`;
  const inp = document.getElementById('ln'); inp.focus();
  document.getElementById('lf').onsubmit = e => { e.preventDefault(); if (inp.value.trim()) { loadProfile(inp.value); viewHome(); } };
  $app.querySelectorAll('.profile-row').forEach(b => b.onclick = () => { loadProfile(b.dataset.n); viewHome(); });
}

/* ---------- horní lišta ---------- */
function topbar(active) {
  return `<header class="top"><div class="top-in">
    <button class="brand" data-go="home"><span class="brand-mark">P</span><span>Poznávačka</span></button>
    <nav class="nav">
      <button data-go="home" ${active === 'home' ? 'aria-current="page"' : ''}>Testy</button>
      <button data-go="atlas" ${active === 'atlas' ? 'aria-current="page"' : ''}>Atlas</button>
      <button data-go="hist" ${active === 'hist' ? 'aria-current="page"' : ''}>Výsledky</button>
    </nav>
    <span class="top-sp"></span>
    <span class="user-chip"><span class="avatar">${esc(profile.name[0].toUpperCase())}</span><button class="link" data-go="logout">Odhlásit</button></span>
  </div></header>`;
}
function bindTop() {
  $app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => ({ home: viewHome, atlas: viewAtlas, hist: viewHist, logout })[b.dataset.go]());
}

/* ---------- domovská stránka ---------- */
const custom = { parts: [1, 2], groups: [...GROUPS], count: 30, red: false, mode: 'write' };
const MODE_NAME = { write: 'psaní', choice: 'ABCD', choiceLat: 'ABCD latinsky', card: 'kartičky' };
function weakIds() {
  return Object.entries(profile.sp).filter(([, v]) => v.w > 0)
    .sort((a, b) => (b[1].w - b[1].c) - (a[1].w - a[1].c) || b[1].w - a[1].w).map(([id]) => +id).filter(id => BY_ID.has(id));
}
// definice testů: klíč -> [název, () => druhy]
const TESTS = {
  full1: ['Celá 1. poznávačka', () => shuffle(PART[1])],
  full2: ['Celá 2. poznávačka', () => shuffle(PART[2])],
  r1: ['Náhodných 30 · 1. část', () => shuffle(PART[1]).slice(0, 30)],
  r2: ['Náhodných 30 · 2. část', () => shuffle(PART[2]).slice(0, 30)],
  r12: ['Náhodných 30 · obě části', () => shuffle(DRUHY).slice(0, 30)],
  r50: ['Náhodných 50 · obě části', () => shuffle(DRUHY).slice(0, 50)],
  lat30: ['Latinské názvy · 30 náhodných', () => shuffle(DRUHY).slice(0, 30)],
  lat1: ['Latinské názvy · celá 1. část', () => shuffle(PART[1])],
  lat2: ['Latinské názvy · celá 2. část', () => shuffle(PART[2])],
  red: ['Červené rody (−10 bodů)', () => shuffle(DRUHY.filter(d => d.red))],
  weak: ['Moje chyby', () => shuffle(weakIds().slice(0, 30).map(id => BY_ID.get(id)))],
};
GROUPS.forEach((g, i) => { TESTS['g' + i] = [g, () => shuffle(DRUHY.filter(d => d.g === g))]; });
function card(key, mode, desc, imPart) {
  const [t, fn] = TESTS[key];
  const n = fn().length;
  const pool = key[0] === 'g' ? DRUHY.filter(d => d.g === t) : key === 'red' ? DRUHY.filter(d => d.red) : imPart ? PART[imPart] : DRUHY;
  const im = key === 'weak' ? img(BY_ID.get(weakIds()[0]).img[0]) : img(pick(pick(pool).img));
  return `<button class="mode" data-m="${key}" data-mode="${mode}"><span class="mode-img" style="background-image:url('${im}')"></span>
    <span class="mode-n">${n} ${sklon(n, 'druh', 'druhy', 'druhů')}</span>
    <span class="mode-b"><h3>${t}</h3><p>${desc}</p></span></button>`;
}
function viewHome() {
  scrollTo(0, 0);
  const s = profile.set;
  const seen = Object.keys(profile.sp).length;
  const weak = weakIds();
  const W = 'write', C = 'choice';
  $app.innerHTML = topbar('home') + `
  <main class="wrap">
    <div class="hello"><div><h1>Ahoj, ${esc(profile.name)}!</h1><p>Poznáš zvíře podle fotky a napíšeš jeho název česky nebo latinsky – přesně, jako na poznávačce.</p></div>
      <div class="stats"><span class="stat"><b>${profile.tests.length}</b>${sklon(profile.tests.length, 'test', 'testy', 'testů')}</span>
      <span class="stat"><b>${seen}/${DRUHY.length}</b>druhů viděno</span>
      <span class="stat"><b>${weak.length}</b>druhů s chybou</span></div></div>

    <div class="panel">
      <div class="opt-grid">
        <div><div class="opt-t">Při psaní uznávat</div>
          <div class="seg" id="seg-lang">
            <button data-v="both" aria-pressed="${s.lang === 'both'}">Česky nebo latinsky</button>
            <button data-v="cz" aria-pressed="${s.lang === 'cz'}">Jen česky</button>
            <button data-v="lat" aria-pressed="${s.lang === 'lat'}">Jen latinsky</button>
          </div></div>
        <div><div class="opt-t">Diakritika (háčky, čárky)</div>
          <div class="seg" id="seg-diak">
            <button data-v="strict" aria-pressed="${s.diak === 'strict'}">Musí být správně</button>
            <button data-v="loose" aria-pressed="${s.diak === 'loose'}">Tolerovat</button>
          </div></div>
        <div><div class="opt-t">Zařazení</div>
          <label class="check"><input type="checkbox" id="opt-tax" ${s.tax ? 'checked' : ''}> Ptát se i na vyšší taxon (řád apod.)</label></div>
      </div>
    </div>

    <div class="section-t">Testy – napiš název česky nebo latinsky</div>
    <div class="modes">
      ${card('full1', W, 'Všech 110 druhů – strunatci, ryby, obojživelníci.', 1)}
      ${card('full2', W, 'Všech 454 druhů – plazi, ptáci, savci.', 2)}
      ${card('r1', W, 'Rychlý test z první poznávačky.', 1)}
      ${card('r2', W, 'Rychlý test z druhé poznávačky.', 2)}
      ${card('r12', W, 'Mix z obou poznávaček.')}
      ${card('red', W, 'Rody, za jejichž chybu se strhává 10 bodů.')}
      ${weak.length ? card('weak', W, 'Druhy, ve kterých chybuješ nejčastěji.') : ''}
    </div>

    <div class="section-t">ABCD testy – výběr ze 4 (česky i latinsky)</div>
    <div class="modes">
      ${card('full1', C, 'Celá první poznávačka s výběrem odpovědí.', 1)}
      ${card('full2', C, 'Celá druhá poznávačka s výběrem odpovědí.', 2)}
      ${card('r1', C, '30 náhodných z 1. části.', 1)}
      ${card('r2', C, '30 náhodných z 2. části.', 2)}
      ${card('r12', C, '30 náhodných z obou částí.')}
      ${card('r50', C, '50 náhodných z obou částí.')}
      ${card('lat30', 'choiceLat', 'Možnosti jen latinsky – poznáš správný latinský název?')}
      ${card('lat1', 'choiceLat', 'Celá 1. část, možnosti jen latinsky.', 1)}
      ${card('lat2', 'choiceLat', 'Celá 2. část, možnosti jen latinsky.', 2)}
      ${card('red', C, 'Jen „červené“ rody.')}
      ${GROUPS.map((g, i) => card('g' + i, C, 'Celá skupina, chytáky z ní.')).join('')}
    </div>

    <div class="section-t">Vlastní test</div>
    <div class="panel" id="custom"></div>
  </main>`;
  bindTop();
  const seg = (id, key) => $app.querySelectorAll(`#${id} button`).forEach(b => b.onclick = () => {
    s[key] = b.dataset.v; save();
    $app.querySelectorAll(`#${id} button`).forEach(x => x.setAttribute('aria-pressed', x === b));
  });
  seg('seg-lang', 'lang'); seg('seg-diak', 'diak');
  document.getElementById('opt-tax').onchange = e => { s.tax = e.target.checked; save(); };
  $app.querySelectorAll('.mode').forEach(b => b.onclick = () => startMode(b.dataset.m, b.dataset.mode));
  renderCustom();
}
function customPool() {
  return DRUHY.filter(d => custom.parts.includes(d.part) && custom.groups.includes(d.g) && (!custom.red || d.red));
}
function renderCustom() {
  const el = document.getElementById('custom');
  const pool = customPool();
  const avail = GROUPS.filter(g => DRUHY.some(d => d.g === g && custom.parts.includes(d.part)));
  el.innerHTML = `
    <div class="opt-grid">
      <div><div class="opt-t">Způsob</div><div class="seg" id="c-mode">
        ${Object.entries(MODE_NAME).map(([k, v]) => `<button data-v="${k}" aria-pressed="${custom.mode === k}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div>
      <div><div class="opt-t">Část</div><div class="chips">
        ${[1, 2].map(p => `<button class="chip" data-part="${p}" aria-pressed="${custom.parts.includes(p)}">${p}. poznávačka</button>`).join('')}</div>
        <label class="check"><input type="checkbox" id="c-red" ${custom.red ? 'checked' : ''}> Jen „červené“ rody (−10 bodů)</label></div>
      <div><div class="opt-t">Počet otázek</div>
        <input class="num" id="c-count" type="number" min="1" max="${DRUHY.length}" value="${custom.count}">
        <button class="link" id="c-all">všechny</button></div>
    </div>
    <div class="opt-t" style="margin-top:16px">Skupiny</div>
    <div class="chips">${avail.map(g => `<button class="chip" data-g="${g}" aria-pressed="${custom.groups.includes(g)}">${g} <span class="muted">${DRUHY.filter(d => d.g === g && custom.parts.includes(d.part)).length}</span></button>`).join('')}</div>
    <div class="custom-foot"><span class="muted">Vybráno ${pool.length} ${sklon(pool.length, 'druh', 'druhy', 'druhů')}, test bude mít ${Math.min(custom.count, pool.length)} otázek.</span>
      <button class="btn btn-primary" id="c-go" ${pool.length ? '' : 'disabled'}>Spustit vlastní test</button></div>`;
  el.querySelectorAll('#c-mode button').forEach(b => b.onclick = () => { custom.mode = b.dataset.v; renderCustom(); });
  el.querySelectorAll('[data-part]').forEach(b => b.onclick = () => {
    const p = +b.dataset.part;
    custom.parts = custom.parts.includes(p) ? custom.parts.filter(x => x !== p) : [...custom.parts, p];
    renderCustom();
  });
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
    const g = b.dataset.g;
    custom.groups = custom.groups.includes(g) ? custom.groups.filter(x => x !== g) : [...custom.groups, g];
    renderCustom();
  });
  el.querySelector('#c-red').onchange = e => { custom.red = e.target.checked; renderCustom(); };
  el.querySelector('#c-count').onchange = e => { custom.count = Math.max(1, +e.target.value || 1); renderCustom(); };
  el.querySelector('#c-all').onclick = () => { custom.count = DRUHY.length; renderCustom(); };
  el.querySelector('#c-go').onclick = () => {
    const parts = custom.parts.length === 2 ? 'obě části' : custom.parts[0] + '. část';
    startQuiz(shuffle(pool).slice(0, custom.count), `Vlastní test · ${parts}`, 'custom', custom.mode);
  };
}
function startMode(m, mode) {
  const [t, fn] = TESTS[m];
  startQuiz(fn(), t, m, mode);
}

/* ---------- otázky ---------- */
const higherTax = d => d.tax.length >= 2 ? d.tax[1] : d.tax[0];
const ABCD = ['A', 'B', 'C', 'D'];
const keyIdx = e => { const k = e.key.length === 1 ? 'abcd1234'.indexOf(e.key.toLowerCase()) : -1; return k < 0 ? -1 : k % 4; };
function distractors(d, latOnly) {
  // co nejpodobnější druhy: stejný nižší taxon > stejný vyšší taxon > stejná skupina > cokoliv; bez duplicitních jmen
  const key = x => norm(latOnly ? x.lat : x.cz);
  const names = new Set([key(d)]);
  const out = [];
  const tiers = [
    DRUHY.filter(x => x.id !== d.id && x.tax[0] === d.tax[0]),
    DRUHY.filter(x => x.id !== d.id && higherTax(x) === higherTax(d)),
    DRUHY.filter(x => x.id !== d.id && x.g === d.g),
    DRUHY,
  ];
  // z nejbližší úrovně nanejvýš 2, ať se nedá hádat podle „jediného jiného“
  const limits = [2, 2, 3, 3];
  tiers.forEach((t, i) => {
    let taken = 0;
    for (const x of shuffle(t)) {
      if (out.length >= 3 || taken >= limits[i]) break;
      if (names.has(key(x))) continue;
      names.add(key(x)); out.push(x); taken++;
    }
  });
  return shuffle([d, ...out]);
}
function taxOptions(d) {
  const right = higherTax(d);
  const pool = shuffle([...new Set(DRUHY.filter(x => x.g === d.g).map(higherTax))].filter(t => t !== right));
  const extra = shuffle([...new Set(DRUHY.map(higherTax))].filter(t => t !== right && !pool.includes(t)));
  return shuffle([right, ...pool.concat(extra).slice(0, 3)]);
}
function variants(d) {
  // přijatelné české odpovědi: celý název, varianty oddělené čárkou/lomítkem, název v závorce
  const v = new Set();
  const base = norm(d.cz);
  const noPar = base.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const genus = noPar.split(/[ ,;\/]/)[0];
  const add = p => { p = p.replace(/^=\s*/, '').replace(/^\S{1,2}\.\s*/, '').trim(); if (!p) return;
    v.add(p.includes(' ') || p === genus ? p : genus + ' ' + p); // zkratky jako „ž. obrovská“ → „želva obrovská“
  };
  v.add(noPar);
  noPar.split(/[,;\/]/).forEach(add);
  (base.match(/\((.*?)\)/g) || []).forEach(m => {
    const inner = m.slice(1, -1).replace(/^=\s*/, '').trim();
    if (/^[a-záčďéěíňóřšťúůýž]+$/.test(inner) && !/(á|ý|í)$/.test(inner)) v.add(inner); // samostatný název, např. „dodo“
    else inner.split(/[,;\/]/).forEach(add);
  });
  return [...v].filter(Boolean);
}
function latVariants(d) {
  // latinsky: celý název, u „Gekko sp.“ stačí rod; „G. giraffa“ se rozepíše na celý rod
  const v = new Set();
  const parts = d.lat.split(/[;\/]/).map(l => norm(l).replace(/\s*\(.*?\)/g, '').replace(/\s+–.*$/, '').trim());
  const genus = parts[0].split(' ')[0];
  parts.forEach(l => {
    l = l.replace(/^[a-z]\.\s+/, genus + ' ');
    v.add(l); v.add(l.replace(/ sp\.$/, '')); v.add(l.replace(/ (m|f)\. .*$/, '')); // „Salmo trutta m. fario“ → i „Salmo trutta“
  });
  return [...v].filter(Boolean);
}
function checkWritten(d, answer, lang = 'both', diak = 'strict') {
  const a = norm(answer);
  if (!a) return { ok: false, how: 'empty' };
  const vs = [...(lang !== 'lat' ? variants(d) : []), ...(lang !== 'cz' ? latVariants(d) : [])];
  if (vs.includes(a)) return { ok: true, how: 'exact' };
  const aa = bezDiakritiky(a);
  if (vs.some(v => bezDiakritiky(v) === aa)) return diak === 'loose' ? { ok: true, how: 'diak' } : { ok: false, how: 'diakBad' };
  // napsal latinsky, i když se chce jen česky (nebo naopak)
  const other = lang === 'cz' ? latVariants(d) : lang === 'lat' ? variants(d) : [];
  if (other.some(v => bezDiakritiky(v) === aa)) return { ok: false, how: 'lang' };
  if (vs.some(v => v.length > 5 && lev(bezDiakritiky(v), aa) <= 2)) return { ok: false, how: 'close' };
  return { ok: false, how: 'wrong' };
}

/* ---------- test ---------- */
let Q = null;
function startQuiz(items, title, kind, mode = 'write') {
  if (!items.length) return;
  Q = { items, title, kind, i: 0, mode, tax: profile.set.tax && mode !== 'card', res: [], t0: Date.now() };
  renderQ();
}
function preload(d) { if (d) d.img.forEach(f => { const i = new Image(); i.src = img(f); }); }
function photoBlock(d) {
  const order = shuffle(d.img);
  return `<div class="photo" id="photo" data-imgs='${esc(JSON.stringify(order))}'>
    <img src="${img(order[0])}" alt="Fotka zvířete k poznání">
    <span class="zoom-hint">klikni pro zvětšení</span>
    ${order.length > 1 ? `<div class="photo-nav">${order.map((_, k) => `<button aria-label="Fotka ${k + 1}" aria-current="${k === 0}" data-k="${k}"></button>`).join('')}</div>` : ''}
  </div>`;
}
function bindPhoto() {
  const p = document.getElementById('photo'); if (!p) return;
  const imgs = JSON.parse(p.dataset.imgs); const im = p.querySelector('img');
  im.onclick = () => openLightbox(im.src);
  p.querySelectorAll('.photo-nav button').forEach(b => b.onclick = () => {
    im.src = img(imgs[+b.dataset.k]);
    p.querySelectorAll('.photo-nav button').forEach(x => x.setAttribute('aria-current', x === b));
  });
}
function labelHtml(d, verdict, cls) {
  return `<div class="label ${cls}">
    ${verdict}
    <div class="cz">${esc(d.cz)}</div>
    <div class="lat">${esc(d.lat)}</div>
    <ul class="tax">${d.tax.map((t, k) => { const l = d.tax.length === 1 ? 'vyšší taxon: ' : (['nižší taxon: ', 'vyšší taxon: '][k] || ''); return `<li>${l}<b>${esc(t)}</b></li>`; }).join('')}</ul>
    ${d.red ? '<span class="redflag">Červený rod – při chybě −10 bodů</span>' : ''}
  </div>`;
}
function renderQ() {
  const d = Q.items[Q.i];
  preload(Q.items[Q.i + 1]);
  const n = Q.items.length;
  $app.innerHTML = `
  <div class="qbar"><div class="qbar-in">
    <button class="xbtn" id="qx" aria-label="Ukončit test">✕</button>
    <span class="qbar-title">${esc(Q.title)} · ${MODE_NAME[Q.mode]}</span>
    <span class="qcount">${Q.i + 1} / ${n}</span>
  </div><div class="progress"><i style="width:${(Q.i / n) * 100}%"></i></div></div>
  <main class="quiz"><div class="qcard">${photoBlock(d)}<div class="qbody" id="qb"></div></div></main>
  <footer class="qfoot"><div class="qfoot-in"><span class="muted" id="qhint"></span>
    <button class="btn btn-primary" id="qnext" disabled>Pokračovat</button></div></footer>`;
  bindPhoto();
  document.getElementById('qx').onclick = () => (Q.res.length ? finish() : viewHome());
  const r = { id: d.id, ok: null, tax: null, your: '' };
  Q.cur = r;
  if (Q.mode === 'choice' || Q.mode === 'choiceLat') askChoice(d, r, Q.mode === 'choiceLat');
  else if (Q.mode === 'write') askWrite(d, r);
  else askCard(d, r);
}
function setNext(fn, label = 'Pokračovat') {
  const b = document.getElementById('qnext');
  b.disabled = false; b.textContent = label; b.onclick = fn; b.focus({ preventScroll: true });
}
function hint(t) { document.getElementById('qhint').textContent = t; }

function askChoice(d, r, latOnly) {
  const opts = distractors(d, latOnly);
  const qb = document.getElementById('qb');
  qb.innerHTML = `<div class="qprompt">${latOnly ? 'Jaký je latinský název?' : 'Co je to za zvíře?'}</div>
    <div class="answers" id="ans">${opts.map((o, k) => `<button class="ans" data-id="${o.id}"><span class="k">${ABCD[k]}</span>
      <span class="ans-t">${latOnly ? `<span class="lat ans-main">${esc(o.lat)}</span>` : `${esc(o.cz)}<span class="lat ans-sub">${esc(o.lat)}</span>`}</span></button>`).join('')}</div>
    <div id="after"></div>`;
  hint('Klávesy A–D (nebo 1–4) pro odpověď, Enter pro pokračování');
  const ans = qb.querySelector('#ans');
  const choose = btn => {
    if (ans.classList.contains('done')) return;
    ans.classList.add('done');
    const ok = +btn.dataset.id === d.id;
    r.ok = ok; r.your = latOnly ? BY_ID.get(+btn.dataset.id).lat : BY_ID.get(+btn.dataset.id).cz;
    ans.querySelectorAll('.ans').forEach(b => {
      if (+b.dataset.id === d.id) b.classList.add('ok'); else if (b === btn) b.classList.add('bad'); else b.classList.add('dim');
    });
    afterSpecies(d, r);
  };
  ans.querySelectorAll('.ans').forEach(b => b.onclick = () => choose(b));
  keyHandler = e => { const k = keyIdx(e); if (k >= 0 && !ans.classList.contains('done')) choose(ans.children[k]); };
}
function askWrite(d, r) {
  const qb = document.getElementById('qb');
  const lang = profile.set.lang;
  const prompt = { both: ['Napiš název česky nebo latinsky', 'Rodové + druhové jméno, např. „kapr obecný“ nebo „Cyprinus carpio“.'],
    cz: ['Napiš český název', 'Rodové + druhové jméno, např. „kapr obecný“.'],
    lat: ['Napiš latinský název', 'Rod + druh, např. „Cyprinus carpio“. U rodu se „sp.“ stačí rod.'] }[lang];
  qb.innerHTML = `<div class="qprompt">${prompt[0]}<small>${prompt[1]}${profile.set.diak === 'strict' && lang !== 'lat' ? ' Diakritika musí být správně.' : ''}</small></div>
    <form class="write" id="wf"><input id="wi" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Název zvířete">
    <button class="btn btn-primary">Ověřit</button></form><div id="after"></div>`;
  hint('Enter = ověřit, další Enter = pokračovat');
  const wi = qb.querySelector('#wi'); wi.focus({ preventScroll: true });
  qb.querySelector('#wf').onsubmit = e => {
    e.preventDefault();
    if (r.ok !== null) return;
    const c = checkWritten(d, wi.value, lang, profile.set.diak);
    r.ok = c.ok; r.your = wi.value.trim();
    wi.readOnly = true; wi.classList.add(c.ok ? 'ok' : 'bad');
    qb.querySelector('#wf button').remove();
    r.note = { diak: 'Správně, jen pozor na diakritiku.', diakBad: 'Špatná diakritika – na poznávačce by to neprošlo', close: 'Skoro! Ale je tam překlep – na poznávačce by to neprošlo', lang: lang === 'cz' ? 'Má být český název' : 'Má být latinský název', empty: 'Bez odpovědi' }[c.how] || '';
    afterSpecies(d, r);
  };
  keyHandler = null;
}
function askCard(d, r) {
  const qb = document.getElementById('qb');
  qb.innerHTML = `<div class="qprompt">Víš, co to je?<small>Řekni si odpověď nahlas (i se zařazením), pak ji odkryj.</small></div>
    <button class="btn btn-ghost btn-block flip" id="flip">Ukázat odpověď</button><div id="after"></div>`;
  hint('Mezerník = ukázat, 1 = věděl/a, 2 = nevěděl/a');
  const show = () => {
    qb.querySelector('#flip').remove();
    document.getElementById('after').innerHTML = labelHtml(d, '', '') + `
      <div class="selfgrade"><button class="btn ok" id="sg1">Věděl/a jsem</button><button class="btn bad" id="sg2">Nevěděl/a jsem</button></div>`;
    const grade = ok => { r.ok = ok; record(r); next(); };
    document.getElementById('sg1').onclick = () => grade(true);
    document.getElementById('sg2').onclick = () => grade(false);
    keyHandler = e => { if (e.key === '1') grade(true); if (e.key === '2') grade(false); };
  };
  qb.querySelector('#flip').onclick = show;
  keyHandler = e => { if (e.key === ' ') { e.preventDefault(); show(); } };
}
function afterSpecies(d, r) {
  const after = document.getElementById('after');
  const verdict = r.ok ? `<div class="verdict ${r.note ? 'warn' : 'ok'}">${r.note || 'Správně'}</div>`
    : `<div class="verdict bad">${r.note || 'Špatně'}${r.your ? ' – tvoje odpověď: ' + esc(r.your) : ''}</div>`;
  if (!Q.tax) {
    after.innerHTML = labelHtml(d, verdict, r.ok ? 'ok' : 'bad');
    record(r); setNext(next);
    return;
  }
  // druhý krok: vyšší taxon
  const opts = taxOptions(d);
  after.innerHTML = `<div class="verdict ${r.ok ? 'ok' : 'bad'}" style="margin-top:14px">${r.ok ? 'Druh správně' : 'Druh špatně – je to ' + esc(d.cz)}</div>
    <div class="qprompt" style="margin-top:10px">Kam patří (vyšší taxon)?</div>
    <div class="answers" id="tans">${opts.map((o, k) => `<button class="ans" data-t="${esc(o)}"><span class="k">${ABCD[k]}</span>${esc(o)}</button>`).join('')}</div>
    <div id="after2"></div>`;
  const tans = after.querySelector('#tans');
  const choose = btn => {
    if (tans.classList.contains('done')) return;
    tans.classList.add('done');
    r.tax = btn.dataset.t === higherTax(d);
    tans.querySelectorAll('.ans').forEach(b => {
      if (b.dataset.t === higherTax(d)) b.classList.add('ok'); else if (b === btn) b.classList.add('bad'); else b.classList.add('dim');
    });
    const both = r.ok && r.tax;
    after.querySelector('#after2').innerHTML = labelHtml(d, `<div class="verdict ${both ? 'ok' : 'bad'}">${both ? 'Všechno správně' : (r.tax ? 'Zařazení správně' : 'Zařazení špatně')}</div>`, both ? 'ok' : 'bad');
    record(r); setNext(next);
  };
  tans.querySelectorAll('.ans').forEach(b => b.onclick = () => choose(b));
  keyHandler = e => { const k = keyIdx(e); if (k >= 0 && !tans.classList.contains('done')) choose(tans.children[k]); };
}
function record(r) {
  if (Q.res.includes(r)) return;
  Q.res.push(r);
  const s = profile.sp[r.id] || (profile.sp[r.id] = { c: 0, w: 0 });
  if (r.ok && r.tax !== false) s.c++; else s.w++;
  save();
}
function next() {
  Q.i++;
  if (Q.i >= Q.items.length) finish(); else { scrollTo(0, 0); renderQ(); }
}
function znamka(p) { return p >= 90 ? 'Výborně (1)' : p >= 75 ? 'Chvalitebně (2)' : p >= 55 ? 'Dobře (3)' : p >= 35 ? 'Dostatečně (4)' : 'Nedostatečně (5)'; }
function finish() {
  keyHandler = null;
  const res = Q.res;
  const okN = res.filter(x => x.ok).length;
  const taxN = res.filter(x => x.tax === true).length;
  const pct = res.length ? Math.round(okN / res.length * 100) : 0;
  const wrong = res.filter(x => !x.ok || x.tax === false);
  profile.tests.unshift({ d: Date.now(), t: Q.title, n: res.length, of: Q.items.length, ok: okN, tax: Q.tax ? taxN : null, mode: Q.mode, sec: Math.round((Date.now() - Q.t0) / 1000) });
  profile.tests = profile.tests.slice(0, 200);
  save();
  const last = Q;
  $app.innerHTML = topbar('') + `
  <main class="wrap narrow">
    <div class="panel result-hero">
      <div class="muted">${esc(last.title)} · ${MODE_NAME[last.mode]}${res.length < last.items.length ? ` · ukončeno po ${res.length} z ${last.items.length}` : ''}</div>
      <div class="score">${okN}<small> / ${res.length}</small></div>
      <div class="grade">${pct} % · ${znamka(pct)}</div>
      ${last.tax ? `<div class="muted" style="margin-top:8px">Zařazení správně: ${taxN} / ${res.length}</div>` : ''}
      <div class="result-actions">
        ${wrong.length ? '<button class="btn btn-primary" id="r-wrong">Procvičit chyby znovu</button>' : ''}
        ${last.kind !== 'retry' ? '<button class="btn btn-ghost" id="r-again">Nový test stejného typu</button>' : ''}
        <button class="btn btn-ghost" id="r-home">Zpět na testy</button>
      </div>
    </div>
    <div class="section-t">${wrong.length ? `Chyby (${wrong.length})` : 'Bez chyby, paráda!'}</div>
    <div class="mist">${wrong.map(x => { const d = BY_ID.get(x.id); return `
      <div class="mcard"><div class="im" data-src="${img(d.img[0])}" style="background-image:url('${img(d.img[0])}')"></div>
      <div class="t"><b>${esc(d.cz)}</b><span class="lat">${esc(d.lat)}</span><div class="muted">${esc(higherTax(d))}</div>
      ${x.your && !x.ok ? `<div class="you">tvoje: ${esc(x.your)}</div>` : ''}${x.ok && x.tax === false ? '<div class="you">špatné zařazení</div>' : ''}</div></div>`; }).join('')}</div>
  </main>`;
  bindTop();
  $app.querySelectorAll('.mcard .im').forEach(e => e.onclick = () => openLightbox(e.dataset.src));
  const w = document.getElementById('r-wrong');
  if (w) w.onclick = () => startQuiz(shuffle(wrong.map(x => BY_ID.get(x.id))), 'Opakování chyb', 'retry', last.mode);
  const a = document.getElementById('r-again');
  if (a) a.onclick = () => (last.kind === 'custom' ? startQuiz(shuffle(customPool()).slice(0, custom.count), last.title, 'custom', last.mode) : startMode(last.kind, last.mode));
  document.getElementById('r-home').onclick = viewHome;
  scrollTo(0, 0);
}

/* ---------- atlas ---------- */
let atlasPart = 1;
function viewAtlas() {
  $app.innerHTML = topbar('atlas') + `
  <main class="wrap">
    <div class="hello"><div><h1>Atlas druhů</h1><p>Všechny druhy z obou poznávaček. Klikni na kartu pro zvětšení fotky.</p></div>
    <div class="seg" id="ap">${[1, 2].map(p => `<button data-p="${p}" aria-pressed="${atlasPart === p}">${p}. část</button>`).join('')}</div></div>
    <input class="search" id="aq" type="search" placeholder="Hledat česky nebo latinsky…">
    <div class="atlas" id="al"></div>
  </main>`;
  bindTop();
  const draw = () => {
    const q = bezDiakritiky(norm(document.getElementById('aq').value));
    const list = (q ? DRUHY : PART[atlasPart]).filter(d => !q || bezDiakritiky(norm(d.cz + ' ' + d.lat + ' ' + d.tax.join(' '))).includes(q));
    let g = '';
    document.getElementById('al').innerHTML = list.length ? list.map(d => {
      const h = d.g !== g ? `<div class="atlas-h">${(g = d.g)}</div>` : '';
      return h + `<button class="acard" data-src="${img(d.img[0])}"><span class="im" style="display:block;background-image:url('${img(d.img[0])}')"></span>
      <span class="t" style="display:block"><b>${esc(d.cz)}</b><span class="lat">${esc(d.lat)}</span><span class="muted" style="display:block">${esc(higherTax(d))}</span></span></button>`;
    }).join('') : '<p class="empty">Nic nenalezeno.</p>';
    document.querySelectorAll('.acard').forEach(b => b.onclick = () => openLightbox(b.dataset.src));
  };
  document.querySelectorAll('#ap button').forEach(b => b.onclick = () => { atlasPart = +b.dataset.p; viewAtlas(); });
  document.getElementById('aq').oninput = draw;
  draw();
}

/* ---------- historie ---------- */
function viewHist() {
  const t = profile.tests;
  const weak = weakIds().slice(0, 12);
  const modeName = MODE_NAME;
  $app.innerHTML = topbar('hist') + `
  <main class="wrap">
    <div class="hello"><div><h1>Moje výsledky</h1><p>Uloženo jen v tomto prohlížeči pro profil ${esc(profile.name)}.</p></div>
      <button class="btn btn-ghost" id="h-reset">Smazat moje výsledky</button></div>
    ${t.length ? `<div class="panel table-wrap"><table class="hist"><thead><tr><th>Datum</th><th>Test</th><th>Režim</th><th class="r">Výsledek</th><th class="r">%</th></tr></thead><tbody>
      ${t.map(x => `<tr><td>${new Date(x.d).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
      <td>${esc(x.t)}</td><td>${modeName[x.mode] || ''}${x.tax !== null && x.tax !== undefined ? ' + zařazení' : ''}</td>
      <td class="r">${x.ok}/${x.n}</td><td class="r">${x.n ? Math.round(x.ok / x.n * 100) : 0}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="empty">Zatím žádný test. Hurá do toho!</p>'}
    ${weak.length ? `<div class="section-t">Nejčastější chyby</div><div class="mist">${weak.map(id => { const d = BY_ID.get(id), s = profile.sp[id]; return `
      <div class="mcard"><div class="im" data-src="${img(d.img[0])}" style="background-image:url('${img(d.img[0])}')"></div>
      <div class="t"><b>${esc(d.cz)}</b><span class="lat">${esc(d.lat)}</span><div class="you">${s.w}× špatně, ${s.c}× dobře</div></div></div>`; }).join('')}</div>` : ''}
  </main>`;
  bindTop();
  $app.querySelectorAll('.mcard .im').forEach(e => e.onclick = () => openLightbox(e.dataset.src));
  const rb = document.getElementById('h-reset');
  rb.onclick = () => {
    if (rb.dataset.sure) { profile.tests = []; profile.sp = {}; save(); viewHist(); }
    else { rb.dataset.sure = '1'; rb.textContent = 'Opravdu smazat? Klikni znovu'; }
  };
}

/* ---------- lightbox a klávesy ---------- */
const lb = document.getElementById('lightbox');
function openLightbox(src) { lb.querySelector('img').src = src; lb.hidden = false; }
lb.onclick = () => { lb.hidden = true; };
let keyHandler = null;
document.addEventListener('keydown', e => {
  if (!lb.hidden) { if (e.key === 'Escape') lb.hidden = true; return; }
  if (e.target.tagName === 'INPUT' && e.target.id !== 'wi') return;
  if (e.target.id === 'wi' && !e.target.readOnly) return;
  if (e.key === 'Enter') {
    const b = document.getElementById('qnext');
    if (b && !b.disabled && document.activeElement !== b) { e.preventDefault(); b.click(); return; }
  }
  if (keyHandler) keyHandler(e);
});

/* ---------- start ---------- */
(function init() {
  const k = store.get('pzn:aktivni', null);
  const p = k && store.get(k, null);
  if (p) { loadProfile(p.name); viewHome(); } else viewLogin();
})();
