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
  profile = store.get(k, null) || { name: name.trim(), created: Date.now(), tests: [], sp: {}, set: { mode: 'choice', tax: false } };
  profile.set = Object.assign({ mode: 'choice', tax: false }, profile.set);
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
const custom = { parts: [1, 2], groups: [...GROUPS], count: 30, red: false };
function weakIds() {
  return Object.entries(profile.sp).filter(([, v]) => v.w > 0)
    .sort((a, b) => (b[1].w - b[1].c) - (a[1].w - a[1].c) || b[1].w - a[1].w).map(([id]) => +id).filter(id => BY_ID.has(id));
}
function viewHome() {
  scrollTo(0, 0);
  const s = profile.set;
  const seen = Object.keys(profile.sp).length;
  const weak = weakIds();
  const cover = part => img(pick(pick(PART[part]).img));
  const coverAll = () => img(pick(pick(DRUHY).img));
  const modes = [
    { id: 'full1', t: 'Celá 1. poznávačka', p: `Všech ${PART[1].length} druhů v náhodném pořadí – strunatci, ryby, obojživelníci.`, n: PART[1].length, im: cover(1) },
    { id: 'full2', t: 'Celá 2. poznávačka', p: `Všech ${PART[2].length} druhů v náhodném pořadí – plazi, ptáci, savci.`, n: PART[2].length, im: cover(2) },
    { id: 'r1', t: 'Náhodných 30 – 1. část', p: 'Rychlý test z první poznávačky.', n: 30, im: cover(1) },
    { id: 'r2', t: 'Náhodných 30 – 2. část', p: 'Rychlý test z druhé poznávačky.', n: 30, im: cover(2) },
    { id: 'r12', t: 'Náhodných 30 – obě části', p: 'Mix z obou poznávaček dohromady.', n: 30, im: coverAll() },
  ];
  if (weak.length) modes.push({ id: 'weak', t: 'Moje chyby', p: 'Druhy, ve kterých chybuješ nejčastěji.', n: Math.min(30, weak.length), im: img(BY_ID.get(weak[0]).img[0]) });
  $app.innerHTML = topbar('home') + `
  <main class="wrap">
    <div class="hello"><div><h1>Ahoj, ${esc(profile.name)}!</h1><p>Vyber test. Poznáváš podle fotky, odpověď ukáže i latinský název a zařazení.</p></div>
      <div class="stats"><span class="stat"><b>${profile.tests.length}</b>${sklon(profile.tests.length, 'test', 'testy', 'testů')}</span>
      <span class="stat"><b>${seen}/${DRUHY.length}</b>druhů viděno</span>
      <span class="stat"><b>${weak.length}</b>druhů s chybou</span></div></div>

    <div class="panel">
      <div class="opt-grid">
        <div><div class="opt-t">Jak odpovídat</div>
          <div class="seg" id="seg-mode">
            <button data-v="choice" aria-pressed="${s.mode === 'choice'}">Výběr ze 4</button>
            <button data-v="write" aria-pressed="${s.mode === 'write'}">Napsat název</button>
            <button data-v="card" aria-pressed="${s.mode === 'card'}">Kartičky</button>
          </div></div>
        <div><div class="opt-t">Zařazení</div>
          <label class="check"><input type="checkbox" id="opt-tax" ${s.tax ? 'checked' : ''}> Ptát se i na vyšší taxon (řád apod.)</label>
          <div class="muted" style="margin-top:4px">Jen u výběru ze 4 a psaní.</div></div>
      </div>
    </div>

    <div class="section-t">Testy</div>
    <div class="modes">${modes.map(m => `
      <button class="mode" data-m="${m.id}"><span class="mode-img" style="background-image:url('${m.im}')"></span>
      <span class="mode-n">${m.n} ${sklon(m.n, 'druh', 'druhy', 'druhů')}</span>
      <span class="mode-b"><h3>${m.t}</h3><p>${m.p}</p></span></button>`).join('')}
    </div>

    <div class="section-t">Vlastní test</div>
    <div class="panel" id="custom"></div>
  </main>`;
  bindTop();
  $app.querySelectorAll('#seg-mode button').forEach(b => b.onclick = () => {
    s.mode = b.dataset.v; save();
    $app.querySelectorAll('#seg-mode button').forEach(x => x.setAttribute('aria-pressed', x === b));
  });
  document.getElementById('opt-tax').onchange = e => { s.tax = e.target.checked; save(); };
  $app.querySelectorAll('.mode').forEach(b => b.onclick = () => startMode(b.dataset.m));
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
    startQuiz(shuffle(pool).slice(0, custom.count), `Vlastní test · ${parts}`, 'custom');
  };
}
function startMode(m) {
  const T = {
    full1: () => startQuiz(shuffle(PART[1]), 'Celá 1. poznávačka', m),
    full2: () => startQuiz(shuffle(PART[2]), 'Celá 2. poznávačka', m),
    r1: () => startQuiz(shuffle(PART[1]).slice(0, 30), 'Náhodných 30 · 1. část', m),
    r2: () => startQuiz(shuffle(PART[2]).slice(0, 30), 'Náhodných 30 · 2. část', m),
    r12: () => startQuiz(shuffle(DRUHY).slice(0, 30), 'Náhodných 30 · obě části', m),
    weak: () => startQuiz(shuffle(weakIds().slice(0, 30).map(id => BY_ID.get(id))), 'Moje chyby', m),
  };
  T[m]();
}

/* ---------- otázky ---------- */
const higherTax = d => d.tax.length >= 2 ? d.tax[1] : d.tax[0];
function distractors(d) {
  // co nejpodobnější druhy: stejný vyšší taxon > stejná skupina > cokoliv; bez duplicitních jmen
  const names = new Set([norm(d.cz)]);
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
      if (names.has(norm(x.cz))) continue;
      names.add(norm(x.cz)); out.push(x); taken++;
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
  // přijatelné odpovědi při psaní: celý název, varianty oddělené čárkou/lomítkem, název v závorce, latinsky
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
  d.lat.split(/[;\/]/).forEach(l => v.add(norm(l).replace(/\s*\(.*?\)/g, '').replace(/ sp\.$/, '').trim()));
  return [...v].filter(Boolean);
}
function checkWritten(d, answer) {
  const a = norm(answer);
  if (!a) return { ok: false, how: 'empty' };
  const vs = variants(d);
  if (vs.includes(a)) return { ok: true, how: 'exact' };
  const aa = bezDiakritiky(a);
  if (vs.some(v => bezDiakritiky(v) === aa)) return { ok: true, how: 'diak' };
  if (vs.some(v => v.length > 5 && lev(bezDiakritiky(v), aa) <= 2)) return { ok: false, how: 'close' };
  return { ok: false, how: 'wrong' };
}

/* ---------- test ---------- */
let Q = null;
function startQuiz(items, title, kind) {
  if (!items.length) return;
  Q = { items, title, kind, i: 0, mode: profile.set.mode, tax: profile.set.tax && profile.set.mode !== 'card', res: [], t0: Date.now() };
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
    <span class="qbar-title">${esc(Q.title)}</span>
    <span class="qcount">${Q.i + 1} / ${n}</span>
  </div><div class="progress"><i style="width:${(Q.i / n) * 100}%"></i></div></div>
  <main class="quiz"><div class="qcard">${photoBlock(d)}<div class="qbody" id="qb"></div></div></main>
  <footer class="qfoot"><div class="qfoot-in"><span class="muted" id="qhint"></span>
    <button class="btn btn-primary" id="qnext" disabled>Pokračovat</button></div></footer>`;
  bindPhoto();
  document.getElementById('qx').onclick = () => (Q.res.length ? finish() : viewHome());
  const r = { id: d.id, ok: null, tax: null, your: '' };
  Q.cur = r;
  if (Q.mode === 'choice') askChoice(d, r);
  else if (Q.mode === 'write') askWrite(d, r);
  else askCard(d, r);
}
function setNext(fn, label = 'Pokračovat') {
  const b = document.getElementById('qnext');
  b.disabled = false; b.textContent = label; b.onclick = fn; b.focus({ preventScroll: true });
}
function hint(t) { document.getElementById('qhint').textContent = t; }

function askChoice(d, r) {
  const opts = distractors(d);
  const qb = document.getElementById('qb');
  qb.innerHTML = `<div class="qprompt">Co je to za zvíře?</div>
    <div class="answers" id="ans">${opts.map((o, k) => `<button class="ans" data-id="${o.id}"><span class="k">${k + 1}</span>${esc(o.cz)}</button>`).join('')}</div>
    <div id="after"></div>`;
  hint('Klávesy 1–4 pro odpověď, Enter pro pokračování');
  const ans = qb.querySelector('#ans');
  const choose = btn => {
    if (ans.classList.contains('done')) return;
    ans.classList.add('done');
    const ok = +btn.dataset.id === d.id;
    r.ok = ok; r.your = btn.textContent.slice(1);
    ans.querySelectorAll('.ans').forEach(b => {
      if (+b.dataset.id === d.id) b.classList.add('ok'); else if (b === btn) b.classList.add('bad'); else b.classList.add('dim');
    });
    afterSpecies(d, r);
  };
  ans.querySelectorAll('.ans').forEach(b => b.onclick = () => choose(b));
  keyHandler = e => { const k = +e.key; if (k >= 1 && k <= 4 && !ans.classList.contains('done')) choose(ans.children[k - 1]); };
}
function askWrite(d, r) {
  const qb = document.getElementById('qb');
  qb.innerHTML = `<div class="qprompt">Napiš český název<small>Rodové + druhové jméno, např. „kapr obecný“. Latinsky platí taky.</small></div>
    <form class="write" id="wf"><input id="wi" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Název zvířete">
    <button class="btn btn-primary">Ověřit</button></form><div id="after"></div>`;
  hint('Enter = ověřit, další Enter = pokračovat');
  const wi = qb.querySelector('#wi'); wi.focus({ preventScroll: true });
  qb.querySelector('#wf').onsubmit = e => {
    e.preventDefault();
    if (r.ok !== null) return;
    const c = checkWritten(d, wi.value);
    r.ok = c.ok; r.your = wi.value.trim();
    wi.readOnly = true; wi.classList.add(c.ok ? 'ok' : 'bad');
    qb.querySelector('#wf button').remove();
    r.note = { diak: 'Správně, jen pozor na diakritiku.', close: 'Skoro! Ale je tam překlep – na poznávačce by to neprošlo.', empty: 'Bez odpovědi.' }[c.how] || '';
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
    <div class="answers" id="tans">${opts.map((o, k) => `<button class="ans" data-t="${esc(o)}"><span class="k">${k + 1}</span>${esc(o)}</button>`).join('')}</div>
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
  keyHandler = e => { const k = +e.key; if (k >= 1 && k <= 4 && !tans.classList.contains('done')) choose(tans.children[k - 1]); };
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
      <div class="muted">${esc(last.title)}${res.length < last.items.length ? ` · ukončeno po ${res.length} z ${last.items.length}` : ''}</div>
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
  if (w) w.onclick = () => startQuiz(shuffle(wrong.map(x => BY_ID.get(x.id))), 'Opakování chyb', 'retry');
  const a = document.getElementById('r-again');
  if (a) a.onclick = () => (last.kind === 'custom' ? startQuiz(shuffle(customPool()).slice(0, custom.count), last.title, 'custom') : startMode(last.kind));
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
  const modeName = { choice: 'výběr ze 4', write: 'psaní', card: 'kartičky' };
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
