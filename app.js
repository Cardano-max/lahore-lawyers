'use strict';

/* ---------------- State ---------------- */
let LAWYERS = [];
let AREAS = [];
let filtered = [];
let rendered = 0;
const BATCH = 18;
let activeChip = null;
const FILTERS = { voters:false, photo:false, phone:false };

const $ = (id) => document.getElementById(id);
const results = $('results');
const searchEl = $('search');
const clearBtn = $('clearBtn');
const statusBar = $('statusBar');
const emptyState = $('emptyState');
const noResults = $('noResults');
const loader = $('loader');
const chipsEl = $('chips');

/* ---------------- Text utils ---------------- */
function norm(s){
  return (s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}
function initials(name){
  const p = (name||'').replace(/^(mr|mrs|ms|dr|ch|malik|syed|mian|rana|sh|hafiz)\.?\s+/i,'').trim().split(/\s+/);
  return ((p[0]||'?')[0] + (p[1]? p[1][0] : '')).toUpperCase();
}
function telHref(cell){ return 'tel:' + (cell||'').replace(/[^0-9+]/g,''); }
function titleCase(s){
  return (s||'').toLowerCase().replace(/\b([a-z])/g, (m,c)=>c.toUpperCase())
    .replace(/\b(Ii|Iii|Ph|Bor|Dha|Emc?e|Pcsir|Wapda|Lda|Gt)\b/g, m=>m.toUpperCase());
}

/* ---------------- Levenshtein (for fuzzy area) ---------------- */
function lev(a,b){
  const m=a.length,n=b.length;
  if(Math.abs(m-n)>2) return 3;
  const dp=Array.from({length:m+1},(_,i)=>i===0?Array.from({length:n+1},(_,j)=>j):[i]);
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
    dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  }
  return dp[m][n];
}

/* ---------------- Search + filters ---------------- */
function anyFilterActive(){ return FILTERS.voters || FILTERS.photo || FILTERS.phone; }
function passFilters(l){
  if(FILTERS.voters && !l.v) return false;
  if(FILTERS.photo && !l.p) return false;
  if(FILTERS.phone && !l.t) return false;
  return true;
}

// Returns lawyers matching the text query, ranked. Empty query -> all (name order).
function queryMatches(qRaw){
  const q = norm(qRaw);
  if(!q) return LAWYERS.slice();
  const tokens = q.split(' ').filter(Boolean);
  const scored = [];
  for(let i=0;i<LAWYERS.length;i++){
    const s = LAWYERS[i]._s;
    let ok = true, score = 0;
    for(const t of tokens){
      if(s.indexOf(t) === -1){ ok = false; break; }
      if(s.startsWith(t) || s.indexOf(' '+t) !== -1) score += 5;
      if(LAWYERS[i]._a && LAWYERS[i]._a.indexOf(t) !== -1) score += 8;
      score += 1;
    }
    if(ok) scored.push([score, i]);
  }
  if(scored.length === 0 && tokens.length === 1 && tokens[0].length >= 4){
    const t = tokens[0];
    let bestArea = null, bestD = 3;
    for(const [name] of AREAS){
      for(const w of norm(name).split(' ')){
        if(w.length < 4) continue;
        const d = lev(t, w);
        if(d < bestD){ bestD = d; bestArea = norm(name); }
      }
    }
    if(bestArea){
      for(let i=0;i<LAWYERS.length;i++){
        if(LAWYERS[i]._s.indexOf(bestArea) !== -1) scored.push([1, i]);
      }
    }
  }
  scored.sort((a,b)=> b[0]-a[0]);
  return scored.map(x=>LAWYERS[x[1]]);
}

function apply(){
  const qRaw = searchEl.value.trim();
  const hasQuery = !!norm(qRaw);
  const hasFilter = anyFilterActive();

  if(!hasQuery && !hasFilter){
    filtered = [];
    results.innerHTML = '';
    statusBar.innerHTML = '';
    statusBar.hidden = true;
    noResults.hidden = true;
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  filtered = queryMatches(qRaw).filter(passFilters);

  results.innerHTML = '';
  rendered = 0;
  noResults.hidden = filtered.length > 0;
  statusBar.hidden = false;

  const bits = [];
  if(FILTERS.voters) bits.push('voters 2026');
  if(FILTERS.photo) bits.push('with photo');
  if(FILTERS.phone) bits.push('with phone');
  const suffix = bits.length ? ` &middot; <span style="color:var(--muted)">${bits.join(', ')}</span>` : '';
  statusBar.innerHTML = filtered.length
    ? `<b>${filtered.length.toLocaleString()}</b>&nbsp;${filtered.length===1?'lawyer':'lawyers'}${suffix}`
    : '';
  renderMore();
}
// Back-compat alias
const search = apply;

/* ---------------- Rendering ---------------- */
function cardHTML(l){
  const name = titleCase(l.n);
  const hasCell = !!l.t;
  const addr = titleCase(l.r || l.o || '');
  const photo = l.p
    ? `<img loading="lazy" src="photos/${photoShard(l.c)}/${l.c}.jpg" alt="" onerror="this.style.display='none';this.parentElement.textContent='${initials(l.n)}'">`
    : initials(l.n);
  const voted = l.v ? `<span class="voted-tag">★ Voter 2026</span>` : '';
  const father = l.f ? `<p class="father"><b>S/O · D/O:</b> ${titleCase(l.f)}</p>` : '';
  const addrBlock = addr ? `<div class="addr">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      <span>${addr}</span></div>` : '';
  const call = hasCell
    ? `<a class="call-btn" href="${telHref(l.t)}">
         <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg>
         <span>Call&nbsp;<span class="num">${l.t}</span></span></a>`
    : `<span class="call-btn disabled">No phone number</span>`;

  return `<div class="card">
    <div class="card-top">
      <div class="avatar">${photo}</div>
      <div class="info">
        <p class="name">${name}</p>
        <div class="subline"><span class="title-tag">Advocate</span>${voted}</div>
        ${father}
      </div>
    </div>
    ${addrBlock}
    <div class="card-actions">${call}</div>
  </div>`;
}
function photoShard(comp){ const n = parseInt(comp,10); return isNaN(n) ? 'x' : String(Math.floor(n/1000)); }

function renderMore(){
  const next = filtered.slice(rendered, rendered + BATCH);
  if(!next.length) return;
  const frag = document.createElement('div');
  frag.innerHTML = next.map(cardHTML).join('');
  while(frag.firstChild) results.appendChild(frag.firstChild);
  rendered += next.length;
}

/* ---------------- Chips ---------------- */
const PREFERRED_CHIPS = [
  'Model Town','M.A. Johar Town','Gulberg','DHA (Defence)','Allama Iqbal Town',
  'Township','Garden Town','Faisal Town','Wapda Town','Samanabad','Shadman',
  'Cantt','Green Town','Sabzazar','Muslim Town'
];
function buildChips(){
  chipsEl.innerHTML = '';
  const have = new Map(AREAS);
  const ordered = [];
  PREFERRED_CHIPS.forEach(n=>{ if(have.has(n)){ ordered.push(n); have.delete(n); }});
  [...have.keys()].slice(0, 14 - ordered.length).forEach(n=> ordered.push(n));
  ordered.slice(0, 14).map(n=>[n]).forEach(([name])=>{
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = name;
    b.addEventListener('click', ()=>{
      if(activeChip === b){ // toggle off
        activeChip = null; b.classList.remove('active');
        searchEl.value=''; clearBtn.hidden=true; search('');
        return;
      }
      document.querySelectorAll('.chip.active').forEach(c=>c.classList.remove('active'));
      b.classList.add('active'); activeChip = b;
      searchEl.value = name; clearBtn.hidden = false;
      search(name);
      window.scrollTo({top:0});
    });
    chipsEl.appendChild(b);
  });
}

/* ---------------- Filters ---------------- */
function initFilters(){
  document.querySelectorAll('.filter-pill').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.f;
      FILTERS[key] = !FILTERS[key];
      btn.classList.toggle('active', FILTERS[key]);
      apply();
      window.scrollTo({top:0});
    });
  });
}

/* ---------------- Events ---------------- */
let debounce;
searchEl.addEventListener('input', (e)=>{
  clearBtn.hidden = !e.target.value;
  if(activeChip){ activeChip.classList.remove('active'); activeChip=null; }
  clearTimeout(debounce);
  debounce = setTimeout(()=>search(e.target.value), 110);
});
clearBtn.addEventListener('click', ()=>{
  searchEl.value=''; clearBtn.hidden=true; searchEl.focus();
  if(activeChip){ activeChip.classList.remove('active'); activeChip=null; }
  search('');
});

const io = new IntersectionObserver((entries)=>{
  if(entries[0].isIntersecting) renderMore();
},{rootMargin:'600px'});
io.observe($('sentinel'));

/* ---------------- Boot ---------------- */
async function boot(){
  try{
    const res = await fetch('data/lawyers.json');
    const data = await res.json();
    AREAS = data.areas || [];
    LAWYERS = data.lawyers || [];
    for(const l of LAWYERS){
      l._s = norm(l.n + ' ' + (l.f||'') + ' ' + (l.o||'') + ' ' + (l.r||'') + ' ' + (l.a||''));
      l._a = norm(l.a||'');
    }
    buildChips();
    initFilters();
    const tb = document.getElementById('totalBadge');
    if(tb) tb.textContent = LAWYERS.length.toLocaleString() + ' lawyers in the directory';
    loader.classList.add('hidden');
    searchEl.focus();
    startPhotoPrecache();
    setTimeout(maybeShowIosHint, 1500);
  }catch(err){
    loader.innerHTML = '<p style="color:#b33">Could not load the directory.<br>Please reopen the app.</p>';
    console.error(err);
  }
}
boot();

/* ---------------- Service worker ---------------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=> navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
window.addEventListener('offline', ()=>showBanner('You are offline — directory still works'));
function showBanner(msg){
  const b = $('offlineBanner');
  b.innerHTML = `<span class="dot"></span>${msg}`;
  b.hidden = false;
  setTimeout(()=> b.hidden = true, 3200);
}

/* --------- iOS "Add to Home Screen" hint --------- */
function maybeShowIosHint(){
  try{
    const ua = navigator.userAgent || '';
    const isIos = /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    if(!isIos || standalone) return;
    if(localStorage.getItem('iosHintDismissed') === '1') return;
    const el = document.createElement('div');
    el.className = 'ios-hint';
    el.innerHTML = `
      <button class="ios-hint-x" aria-label="Close">&times;</button>
      <div class="ios-hint-body">
        <b>Install this app on your phone</b>
        <span>Tap <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0 4 4m-4-4L8 8"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg> Share, then <b>Add to Home Screen</b></span>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('.ios-hint-x').addEventListener('click', ()=>{
      el.remove(); localStorage.setItem('iosHintDismissed','1');
    });
  }catch(e){/* non-fatal */}
}

/* --------- Background precache of photos for full offline --------- */
function startPhotoPrecache(){
  try{
    if(localStorage.getItem('photosCached') === '1') return;
    const conn = navigator.connection || {};
    if(conn.saveData) return;                 // respect Data Saver
    if(!navigator.onLine) return;
    const urls = [];
    for(const l of LAWYERS){
      if(l.p) urls.push(`photos/${photoShard(l.c)}/${l.c}.jpg`);
    }
    if(!urls.length) return;
    const pill = $('offlineBanner');
    let done = 0, i = 0, active = 0;
    const total = urls.length;
    const CONC = 3;
    function tick(){
      pill.innerHTML = `<span class="dot"></span>Saving photos for offline… ${Math.round(done/total*100)}%`;
      pill.hidden = false;
    }
    function next(){
      if(i >= total){
        if(active === 0){
          localStorage.setItem('photosCached','1');
          pill.innerHTML = `<span class="dot"></span>✓ Ready to use offline`;
          setTimeout(()=> pill.hidden = true, 2500);
        }
        return;
      }
      const url = urls[i++]; active++;
      fetch(url).catch(()=>{}).finally(()=>{
        active--; done++;
        if(done % 200 === 0) tick();
        next();
      });
    }
    // start after an idle period so first paint & searches stay snappy
    setTimeout(()=>{ tick(); for(let k=0;k<CONC;k++) next(); }, 6000);
  }catch(e){/* non-fatal */}
}
