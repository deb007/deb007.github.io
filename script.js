/* ==========================================================================
   deb007.github.io — script.js
   Vanilla JS. One rAF-throttled scroll loop drives the header state, the
   statement word reveal and the capabilities rail; IntersectionObserver
   handles reveals, nav state and in-view checks. Everything degrades to
   static, fully visible content under prefers-reduced-motion or without JS.
   ========================================================================== */

const CONFIG = {
  name: "Debjyoti Aich",
  email: atob("YWljaDMwQGdtYWlsLmNvbQ=="),
  socials: [
    { name: "GitHub", url: "https://github.com/deb007" },
    { name: "LinkedIn", url: "https://linkedin.com/in/deb007" },
    { name: "Twitter/X", url: "https://twitter.com/deb007" }
  ],
  roles: ["LLM Wrangler", "AI Builder", "Product Thinker", "Solution Architect", "Open Source Contributor"]
};

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Escape text before interpolating it into HTML strings
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* --------------------------------------------------------------------------
   Theme toggle
   -------------------------------------------------------------------------- */
const themeToggle = $('#theme-toggle');
const themeMeta = $('meta[name="theme-color"]');

function applyTheme(theme, persist) {
  root.setAttribute('data-theme', theme);
  if (persist) {
    try { localStorage.setItem('theme', theme); } catch (_) { /* private mode */ }
  }
  themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  if (themeMeta) themeMeta.setAttribute('content', theme === 'light' ? '#f3f2ee' : '#050505');
}

applyTheme(root.getAttribute('data-theme') || 'dark', false);
themeToggle.addEventListener('click', () => {
  applyTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
});

/* --------------------------------------------------------------------------
   Config-driven content: email, socials, year
   -------------------------------------------------------------------------- */
$$('[data-mailto]').forEach(el => { el.href = `mailto:${CONFIG.email}`; });
$$('[data-email-text]').forEach(el => { el.textContent = CONFIG.email; });

const socialRow = $('#social-row');
if (socialRow) {
  socialRow.innerHTML = CONFIG.socials.map(s =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener me">${esc(s.name)} <span class="arrow" aria-hidden="true">↗</span></a></li>`
  ).join('');
}

const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* --------------------------------------------------------------------------
   Hero: role swap + IST clock
   -------------------------------------------------------------------------- */
const roleText = $('#role-text');
const roleSr = $('#role-sr');
if (roleSr) roleSr.textContent = `Also known as: ${CONFIG.roles.join(', ')}.`;

if (roleText) {
  let roleIdx = 0;
  roleText.textContent = CONFIG.roles[0];
  if (!reducedMotion.matches) {
    setInterval(() => {
      if (document.hidden) return;
      roleText.classList.add('is-out');
      setTimeout(() => {
        roleIdx = (roleIdx + 1) % CONFIG.roles.length;
        roleText.textContent = CONFIG.roles[roleIdx];
        roleText.classList.remove('is-out');
        roleText.classList.add('is-pre');
        void roleText.offsetWidth; // reflow so the next state transitions
        roleText.classList.remove('is-pre');
      }, 380);
    }, 2800);
  }
}

const clockEl = $('#clock');
if (clockEl) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const tick = () => {
    const t = fmt.format(new Date());
    clockEl.textContent = t;
    clockEl.setAttribute('datetime', `${t}+05:30`);
  };
  tick();
  setInterval(tick, 1000);
}

/* --------------------------------------------------------------------------
   Reveal on scroll (rise 24px + fade, ~60ms stagger per batch)
   -------------------------------------------------------------------------- */
const revealObserver = ('IntersectionObserver' in window) ? new IntersectionObserver((entries, obs) => {
  const incoming = entries.filter(e => e.isIntersecting).map(e => e.target);
  incoming.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
  incoming.forEach((el, i) => {
    el.style.setProperty('--i', Math.min(i, 8));
    el.classList.add('is-in');
    obs.unobserve(el);
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;

function observeReveals(scope = document) {
  const els = $$('[data-reveal]:not(.is-in)', scope);
  if (!revealObserver || !root.classList.contains('motion')) {
    els.forEach(el => el.classList.add('is-in'));
    return;
  }
  els.forEach(el => revealObserver.observe(el));
}
observeReveals();

/* --------------------------------------------------------------------------
   Header state + active nav link
   -------------------------------------------------------------------------- */
const header = $('#site-header');

function updateHeader() {
  header.classList.toggle('is-scrolled', window.scrollY > 24);
}

const navLinks = $$('[data-nav-link]');
if ('IntersectionObserver' in window) {
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const key = entry.target.dataset.nav;
      navLinks.forEach(a => {
        if (a.dataset.navLink === key) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('section[data-nav]').forEach(s => navObserver.observe(s));

  // Clear the active state while the hero / statement are in the band
  const clearObserver = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) navLinks.forEach(a => a.removeAttribute('aria-current'));
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['#top', '#statement'].forEach(id => { const el = $(id); if (el) clearObserver.observe(el); });
}

/* --------------------------------------------------------------------------
   Mobile overlay menu — Esc closes, focus trapped, body scroll locked
   -------------------------------------------------------------------------- */
const menuToggle = $('#menu-toggle');
const menu = $('#menu-overlay');
const menuClose = $('#menu-close');
let menuCloseTimer = null;

$$('.menu-overlay__list li', menu).forEach((li, i) => li.style.setProperty('--i', i));

function focusables(scope) {
  return $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', scope)
    .filter(el => el.offsetParent !== null);
}

function openMenu() {
  clearTimeout(menuCloseTimer);
  menu.hidden = false;
  root.classList.add('menu-open');
  menuToggle.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => menu.classList.add('is-open'));
  menuClose.focus();
  document.addEventListener('keydown', onMenuKey);
}

function closeMenu(returnFocus = true) {
  if (menu.hidden) return;
  menu.classList.remove('is-open');
  root.classList.remove('menu-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  document.removeEventListener('keydown', onMenuKey);
  const hide = () => { menu.hidden = true; };
  if (reducedMotion.matches) hide();
  else menuCloseTimer = setTimeout(hide, 400);
  if (returnFocus) menuToggle.focus();
}

function onMenuKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
  if (e.key !== 'Tab') return;
  const items = focusables(menu);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!menu.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}

menuToggle.addEventListener('click', openMenu);
menuClose.addEventListener('click', () => closeMenu());
// Navigating from the menu: close first so the anchor scroll isn't locked
$$('a', menu).forEach(a => a.addEventListener('click', () => closeMenu(false)));
window.matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) closeMenu(false); });

/* --------------------------------------------------------------------------
   Statement — split into words that light up with scroll progress
   -------------------------------------------------------------------------- */
const statement = $('#statement');
const statementText = $('#statement-text');
let statementWords = [];
let statementLit = -1;

if (statementText && root.classList.contains('motion')) {
  // Keep a clean copy for assistive tech; the split version is visual only
  const srCopy = document.createElement('p');
  srCopy.className = 'sr-only';
  srCopy.textContent = statementText.textContent.replace(/\s+/g, ' ').trim();
  statementText.before(srCopy);
  statementText.setAttribute('aria-hidden', 'true');

  const splitNode = node => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const span = document.createElement('span');
          span.className = 'w';
          span.textContent = part;
          frag.appendChild(span);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        splitNode(child);
      }
    });
  };
  splitNode(statementText);
  statementWords = $$('.w', statementText);
}

function updateStatement(vh) {
  if (!statementWords.length) return;
  const rect = statement.getBoundingClientRect();
  if (rect.bottom < -vh || rect.top > vh * 2) return;
  let p;
  if (rect.height > vh * 1.5) {
    // Pinned (desktop): progress through the sticky runway
    p = -rect.top / (rect.height - vh);
  } else {
    // Unpinned: progress as the paragraph crosses the viewport
    const t = statementText.getBoundingClientRect();
    p = (vh * 0.85 - t.top) / (t.height + vh * 0.35);
  }
  const lit = Math.round(clamp(p * 1.15, 0, 1) * statementWords.length);
  if (lit === statementLit) return;
  statementLit = lit;
  statementWords.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
}

/* --------------------------------------------------------------------------
   01 / Reference architecture — tablist stepper + SVG highlights
   -------------------------------------------------------------------------- */
const STAGES = [
  {
    desc: 'Skill selection and intent classification route a plain-language question to the right domain skill — order cuts, inventory positions, late-trip root cause.',
    chips: ['LangGraph', 'Agent skills', 'PepGenX LLM'],
    nodes: ['client', 'intent', 'llm'],
    edges: ['client-intent', 'llm-intent']
  },
  {
    desc: 'A tool-calling planner turns the question into an explicit sequence of calls against the plug-in agent-skills framework.',
    chips: ['Tool calling', 'Planner / executor'],
    nodes: ['intent', 'planner', 'llm'],
    edges: ['intent-planner', 'llm-planner']
  },
  {
    desc: 'The executor runs purpose-built, pre-validated metric tools over streaming SQL (RisingWave on Kafka) — no free-form LLM-generated SQL, so no injection surface. Redis handles checkpointing and caching.',
    chips: ['Metric tools', 'RisingWave', 'Kafka', 'Redis'],
    nodes: ['planner', 'executor', 'tools', 'kafka', 'redis'],
    edges: ['planner-executor', 'executor-tools', 'tools-kafka', 'tools-redis']
  },
  {
    desc: 'Azure-hosted LLM services (PepGenX) compose the tool results into a single grounded answer.',
    chips: ['Azure OpenAI / PepGenX'],
    nodes: ['tools', 'synth', 'llm'],
    edges: ['tools-synth', 'llm-synth']
  },
  {
    desc: 'A deterministic critique stage checks the draft before it is released — repeatable and auditable.',
    chips: ['Deterministic checks'],
    nodes: ['synth', 'critique'],
    edges: ['synth-critique']
  },
  {
    desc: 'An executive summary streams back over Server-Sent Events from FastAPI on AKS, with traces and telemetry in Cosmos DB.',
    chips: ['FastAPI', 'SSE', 'AKS', 'Cosmos DB'],
    nodes: ['critique', 'summary', 'cosmos', 'client'],
    edges: ['critique-summary', 'summary-cosmos', 'summary-client']
  }
];

(function initArchitecture() {
  const section = $('#architecture');
  const stepper = $('#arch-stepper');
  const tabs = $$('[role="tab"]', stepper);
  const panel = $('#arch-panel');
  const panelK = $('#arch-panel-k');
  const panelDesc = $('#arch-panel-desc');
  const panelChips = $('#arch-panel-chips');
  const svg = $('#arch-svg');
  const dashes = $$('#arch-progress li');
  const STAGE_MS = 5200;
  let current = 0;
  let timer = null;
  let inView = false;
  let hovering = false;
  let focusWithin = false;
  let userStopped = false;
  let swapTimer = null;

  section.style.setProperty('--stage-ms', `${STAGE_MS}ms`);

  function highlight(i) {
    const s = STAGES[i];
    $$('.node', svg).forEach(n => n.classList.toggle('is-active', s.nodes.includes(n.dataset.node)));
    $$('.edge', svg).forEach(e => e.classList.toggle('is-active', s.edges.includes(e.dataset.edge)));
  }

  function renderPanel(i) {
    const s = STAGES[i];
    panelK.textContent = `Stage ${String(i + 1).padStart(2, '0')} / ${String(STAGES.length).padStart(2, '0')}`;
    panelDesc.textContent = s.desc;
    panelChips.innerHTML = s.chips.map(c => `<li>${esc(c)}</li>`).join('');
  }

  function setStage(i, { focus = false } = {}) {
    current = (i + STAGES.length) % STAGES.length;
    tabs.forEach((t, idx) => {
      const on = idx === current;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tabs[current].id);
    if (focus) tabs[current].focus();

    // Restart the dash progress animation on the active stage
    dashes.forEach((d, idx) => {
      d.classList.remove('is-active');
      d.classList.toggle('is-done', idx < current);
    });
    void section.offsetWidth;
    dashes[current].classList.add('is-active');

    highlight(current);
    clearTimeout(swapTimer);
    if (root.classList.contains('motion')) {
      panel.classList.add('is-swapping');
      swapTimer = setTimeout(() => { renderPanel(current); panel.classList.remove('is-swapping'); }, 180);
    } else {
      renderPanel(current);
    }
    schedule();
  }

  // Auto-advance only while in view, not hovered/focused, motion allowed
  function schedule() {
    clearTimeout(timer);
    const running = !userStopped && inView && !hovering && !focusWithin && !reducedMotion.matches;
    section.classList.toggle('is-auto', !userStopped && !reducedMotion.matches);
    section.classList.toggle('is-paused', !running);
    if (running) timer = setTimeout(() => setStage(current + 1), STAGE_MS);
  }

  function userSelect(i, focus) {
    userStopped = true; // explicit choice stops the carousel for good
    setStage(i, { focus });
  }

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => userSelect(idx, false));
    tab.addEventListener('keydown', e => {
      const map = { ArrowDown: current + 1, ArrowRight: current + 1, ArrowUp: current - 1, ArrowLeft: current - 1, Home: 0, End: STAGES.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      userSelect(map[e.key], true);
    });
  });

  // Clicking a node jumps to the first stage that features it
  $$('.node', svg).forEach(node => {
    node.style.cursor = 'pointer';
    node.addEventListener('click', () => {
      const idx = STAGES.findIndex(s => s.nodes.includes(node.dataset.node));
      if (idx > -1) userSelect(idx, false);
    });
  });

  section.addEventListener('mouseenter', () => { hovering = true; schedule(); });
  section.addEventListener('mouseleave', () => { hovering = false; schedule(); });
  section.addEventListener('focusin', () => { focusWithin = true; schedule(); });
  section.addEventListener('focusout', e => {
    if (!section.contains(e.relatedTarget)) { focusWithin = false; schedule(); }
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      schedule();
    }, { threshold: 0.35 }).observe($('.arch__grid', section));
  }
  reducedMotion.addEventListener('change', schedule);

  highlight(0);
  schedule();
})();

/* --------------------------------------------------------------------------
   02 / Capabilities — scroll-driven horizontal rail (desktop only)
   -------------------------------------------------------------------------- */
const cap = {
  section: $('#capabilities'),
  viewport: $('#cap-viewport'),
  track: $('#cap-track'),
  cards: $$('.cap-card'),
  tabs: $$('#cap-tabs button'),
  mq: window.matchMedia('(min-width: 1024px) and (min-height: 640px)'),
  distance: 0,
  active: -1,
  rail: false
};

function measureRail() {
  const want = cap.mq.matches && !reducedMotion.matches;
  cap.rail = want;
  cap.section.classList.toggle('is-rail', want);
  if (!want) {
    cap.section.style.height = '';
    cap.track.style.transform = '';
    cap.cards.forEach(c => c.classList.remove('is-active'));
    cap.active = -1;
    return;
  }
  cap.distance = Math.max(0, cap.track.scrollWidth - cap.viewport.clientWidth);
  cap.section.style.height = `${window.innerHeight + cap.distance}px`;
  cap.active = -1;
  updateRail(window.innerHeight);
}

function railProgress() {
  const rect = cap.section.getBoundingClientRect();
  return cap.distance > 0 ? clamp(-rect.top / cap.distance, 0, 1) : 0;
}

function updateRail(vh) {
  if (!cap.rail) return;
  const rect = cap.section.getBoundingClientRect();
  if (rect.bottom < -vh || rect.top > vh * 2) return;
  const p = railProgress();
  cap.track.style.transform = `translate3d(${(-p * cap.distance).toFixed(1)}px, 0, 0)`;
  const idx = Math.round(p * (cap.cards.length - 1));
  if (idx !== cap.active) {
    cap.active = idx;
    cap.cards.forEach((c, i) => c.classList.toggle('is-active', i === idx));
    cap.tabs.forEach((t, i) => {
      if (i === idx) t.setAttribute('aria-current', 'true');
      else t.removeAttribute('aria-current');
    });
  }
}

function scrollToCap(i) {
  if (cap.rail) {
    const top = cap.section.getBoundingClientRect().top + window.scrollY;
    const y = top + (i / (cap.cards.length - 1)) * cap.distance;
    window.scrollTo({ top: Math.round(y) + 1, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  } else {
    cap.cards[i].scrollIntoView({ block: 'center' });
  }
}

cap.tabs.forEach((t, i) => t.addEventListener('click', () => scrollToCap(i)));
// Keyboard users tabbing into an off-screen card: bring it into the rail
cap.cards.forEach((card, i) => card.addEventListener('focusin', () => {
  if (cap.rail && cap.active !== i) {
    const top = cap.section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.round(top + (i / (cap.cards.length - 1)) * cap.distance) + 1 });
  }
}));

cap.mq.addEventListener('change', measureRail);
reducedMotion.addEventListener('change', measureRail);

/* --------------------------------------------------------------------------
   Scroll / resize loop
   -------------------------------------------------------------------------- */
let ticking = false;

function frame() {
  ticking = false;
  const vh = window.innerHeight;
  updateHeader();
  updateStatement(vh);
  updateRail(vh);
}

function requestFrame() {
  if (!ticking) { ticking = true; requestAnimationFrame(frame); }
}

let resizeTimer = null;
window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { measureRail(); requestFrame(); }, 120);
}, { passive: true });

measureRail();
frame();
// Web fonts change card widths; re-measure once they're in
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measureRail(); requestFrame(); });

/* --------------------------------------------------------------------------
   03 / Engagements — accordion
   -------------------------------------------------------------------------- */
function setEng(li, open) {
  const btn = $('.eng__btn', li);
  if (open) li.setAttribute('data-open', '');
  else li.removeAttribute('data-open');
  btn.setAttribute('aria-expanded', String(open));
}

$$('.eng').forEach(li => {
  $('.eng__btn', li).addEventListener('click', () => setEng(li, !li.hasAttribute('data-open')));
});

// Links elsewhere on the page (capability cards) open their engagement
$$('[data-open-eng]').forEach(a => a.addEventListener('click', () => {
  const li = document.getElementById(a.dataset.openEng);
  if (li) setEng(li, true);
}));

/* --------------------------------------------------------------------------
   05 / Projects — portfolio.json
   -------------------------------------------------------------------------- */
const workGrid = $('#work-grid');
const projFilters = $('#proj-filters');
const projCount = $('#proj-count');
const CATEGORY_LABELS = { genai: 'GenAI', tooling: 'Tooling', backend: 'Backend', personal: 'Personal' };

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function projectYear(repo) {
  const t = repo.timeline || {};
  if (t.startDate) return String(t.startDate).slice(0, 4);
  if (t.lastCommit) return String(t.lastCommit).slice(0, 4);
  return '—';
}

function projectCard(repo, i) {
  const status = repo.status === 'active' ? 'Active' : repo.status === 'wip' ? 'In progress' : 'Archived';
  const statusMod = repo.status === 'active' ? ' proj-card__status--active' : '';
  const cat = repo.category || '';
  const tags = [...(repo.techStack || []), ...(repo.tags || [])];
  const url = repo.links && repo.links.github;
  const idx = String(i + 1).padStart(2, '0');
  return `
    <article class="proj-card" data-cat="${esc(cat)}" data-reveal>
      <div class="proj-card__meta">
        <span class="proj-card__status${statusMod}">${status}</span>
        ${repo.featured ? '<span class="proj-card__feat">Featured</span>' : ''}
        ${cat ? `<span>${esc(CATEGORY_LABELS[cat] || cat)}</span>` : ''}
        <span class="proj-card__year">${esc(projectYear(repo))}</span>
      </div>
      <h3 class="proj-card__title">${esc(repo.name)}</h3>
      <p class="proj-card__desc">${esc(repo.description || '')}</p>
      ${tags.length ? `<ul class="chips">${tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${url ? `<a class="text-link proj-card__link" href="${esc(url)}" target="_blank" rel="noopener" aria-label="View ${esc(repo.name)} on GitHub">View <span class="arrow" aria-hidden="true">↗</span></a>` : ''}
      <span class="ghost-num" aria-hidden="true">${idx}</span>
    </article>`;
}

function setCount(shown, total) {
  projCount.textContent = shown === total
    ? `${String(total).padStart(2, '0')} projects`
    : `Showing ${String(shown).padStart(2, '0')} of ${String(total).padStart(2, '0')}`;
}

function renderFilters(visible) {
  const counts = {};
  visible.forEach(r => { if (r.category) counts[r.category] = (counts[r.category] || 0) + 1; });
  const cats = Object.keys(CATEGORY_LABELS).filter(c => counts[c])
    .concat(Object.keys(counts).filter(c => !(c in CATEGORY_LABELS)));
  if (cats.length < 2) return;

  projFilters.innerHTML = [`<button type="button" class="filter" data-filter="all" aria-pressed="true">All<sup>${visible.length}</sup></button>`]
    .concat(cats.map(c => `<button type="button" class="filter" data-filter="${esc(c)}" aria-pressed="false">${esc(CATEGORY_LABELS[c] || c)}<sup>${counts[c]}</sup></button>`))
    .join('');
  projFilters.hidden = false;

  projFilters.addEventListener('click', e => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    const f = btn.dataset.filter;
    $$('.filter', projFilters).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    let shown = 0;
    $$('.proj-card', workGrid).forEach(card => {
      const on = f === 'all' || card.dataset.cat === f;
      card.hidden = !on;
      if (on) shown++;
    });
    setCount(shown, visible.length);
  });
}

async function loadProjects() {
  try {
    const res = await fetch('portfolio.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const repos = data.repos || [];
    // Featured first, shuffled within each group; hidden repos skipped
    const visible = repos.filter(r => !(r.visibility && !r.visibility.showOnPortfolio));
    const ordered = [...shuffle(visible.filter(r => r.featured)), ...shuffle(visible.filter(r => !r.featured))];
    if (!ordered.length) throw new Error('No projects to show');

    workGrid.innerHTML = ordered.map(projectCard).join('');
    setCount(ordered.length, ordered.length);
    renderFilters(ordered);
    observeReveals(workGrid);
    renderLanguages(repos);
  } catch (err) {
    console.warn('Projects failed to load:', err);
    workGrid.innerHTML = `
      <div class="fallback" role="alert">
        <p>Couldn’t load the project list (portfolio.json). The code is all on GitHub.</p>
        <a class="text-link" href="https://github.com/deb007" target="_blank" rel="noopener">Browse repositories <span class="arrow" aria-hidden="true">↗</span></a>
      </div>`;
    projCount.textContent = '';
    const langs = $('#gh-langs');
    if (langs) langs.innerHTML = '<p class="label">Top languages &amp; tools</p><p class="fallback">Unavailable — project data failed to load.</p>';
  }
}

/* --------------------------------------------------------------------------
   06 / Open source — GitHub activity
   -------------------------------------------------------------------------- */
async function loadGitHubActivity() {
  const username = 'deb007';
  const calEl = $('#gh-calendar');
  const tooltipEl = $('#gh-tooltip');

  try {
    const [contribRes, userRes] = await Promise.all([
      fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`),
      fetch(`https://api.github.com/users/${username}`)
    ]);

    if (userRes.ok) {
      const user = await userRes.json();
      const el = $('#gh-repos-count');
      if (el && user.public_repos != null) el.textContent = user.public_repos;
    }

    if (contribRes.ok) {
      const data = await contribRes.json();
      const contribs = data.contributions || [];
      const total = contribs.reduce((s, d) => s + d.count, 0);

      const countEl = $('#gh-contrib-count');
      if (countEl) countEl.textContent = total.toLocaleString();

      renderContribAnalytics(contribs);
      renderContribCalendar(calEl, contribs, tooltipEl, total);
    } else {
      showCalendarFallback(calEl, username);
    }
  } catch (_) {
    showCalendarFallback(calEl, username);
  }
}

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function renderContribAnalytics(contributions) {
  const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const todayStr = localDateStr(new Date());

  const activeDays = contributions.filter(d => d.count > 0 && d.date <= todayStr);
  const totalContribs = activeDays.reduce((s, d) => s + d.count, 0);

  // Avg per active day
  const avg = activeDays.length > 0 ? (totalContribs / activeDays.length).toFixed(1) : '0';
  const avgEl = $('#gh-avg-count');
  if (avgEl) avgEl.textContent = avg;

  // Best day of week by total contribution count
  const dowCounts = Array(7).fill(0);
  activeDays.forEach(d => { dowCounts[new Date(d.date + 'T12:00:00').getDay()] += d.count; });
  const dowEl = $('#gh-bestdow');
  if (dowEl && activeDays.length) dowEl.textContent = DOW_NAMES[dowCounts.indexOf(Math.max(...dowCounts))];

  // Best month by total contribution count
  const monthCounts = Array(12).fill(0);
  activeDays.forEach(d => { monthCounts[new Date(d.date + 'T12:00:00').getMonth()] += d.count; });
  const monthEl = $('#gh-bestmonth');
  if (monthEl && activeDays.length) monthEl.textContent = MONTH_NAMES[monthCounts.indexOf(Math.max(...monthCounts))];

  // Active weeks: weeks (out of the last 52) with ≥1 contribution
  const weekSet = new Set();
  activeDays.forEach(d => {
    const dt = new Date(d.date + 'T12:00:00');
    const monday = new Date(dt);
    monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    weekSet.add(localDateStr(monday));
  });
  const activeWeeksEl = $('#gh-activeweeks');
  if (activeWeeksEl) activeWeeksEl.textContent = `${weekSet.size} / 52`;
}

function renderContribCalendar(container, contributions, tooltipEl, total) {
  if (!container) return;

  const map = Object.fromEntries(contributions.map(d => [d.date, d]));
  const today = new Date();
  const todayStr = localDateStr(today);
  const NUM_WEEKS = 53;
  const CELL = 12;
  const GAP = 3;
  const STEP = CELL + GAP;

  // Align start to the Sunday that begins the 53-week window
  const start = new Date(today);
  start.setDate(start.getDate() - NUM_WEEKS * 7 + 1);
  start.setDate(start.getDate() - start.getDay());

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weeks = [];
  const monthLabels = [];
  let lastMonth = -1;
  const cur = new Date(start);

  for (let w = 0; w < NUM_WEEKS; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const ds = localDateStr(cur);
      const contrib = map[ds];
      const isFuture = ds > todayStr;
      const level = Math.min(Math.max(contrib?.level ?? 0, 0), 4);
      week.push({ date: ds, count: contrib?.count ?? 0, level, future: isFuture });

      if (d === 0 && !isFuture) {
        const m = cur.getMonth();
        if (m !== lastMonth) {
          monthLabels.push({ col: w, label: MONTH_NAMES[m] });
          lastMonth = m;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const gridWidth = weeks.length * STEP - GAP;
  // Drop a first label that would collide with the second
  if (monthLabels.length > 1 && monthLabels[1].col - monthLabels[0].col < 3) monthLabels.shift();

  container.innerHTML = `
    <div class="calendar-wrap" role="img" aria-label="${(total ?? 0).toLocaleString()} GitHub contributions in the last year">
      <div class="cal-months" style="width:${gridWidth}px" aria-hidden="true">
        ${monthLabels.map(ml => `<span class="cal-month-lbl" style="left:${ml.col * STEP}px">${ml.label}</span>`).join('')}
      </div>
      <div class="calendar-grid" style="width:${gridWidth}px" aria-hidden="true">
        ${weeks.map(week => `<div class="cal-week">${week.map(day => day.future
          ? '<div class="cal-day cal-day--future"></div>'
          : `<div class="cal-day" data-level="${day.level}" data-date="${day.date}" data-count="${day.count}"></div>`
        ).join('')}</div>`).join('')}
      </div>
      <div class="calendar-legend" aria-hidden="true">
        <span class="cal-legend-txt">Less</span>
        ${[0, 1, 2, 3, 4].map(l => `<div class="cal-day" data-level="${l}"></div>`).join('')}
        <span class="cal-legend-txt">More</span>
      </div>
    </div>`;

  // Hover tooltips (one delegated listener; clamped inside the viewport)
  if (!tooltipEl) return;
  const grid = $('.calendar-grid', container);
  grid.addEventListener('mouseover', e => {
    const cell = e.target.closest('.cal-day[data-date]');
    if (!cell) return;
    const count = +cell.dataset.count;
    const fmt = new Date(cell.dataset.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    tooltipEl.textContent = count > 0 ? `${count} contribution${count !== 1 ? 's' : ''} on ${fmt}` : `No contributions on ${fmt}`;
    tooltipEl.style.display = 'block';
  });
  grid.addEventListener('mousemove', e => {
    const w = tooltipEl.offsetWidth;
    tooltipEl.style.left = `${clamp(e.clientX + 14, 8, window.innerWidth - w - 8)}px`;
    tooltipEl.style.top = `${e.clientY - 42}px`;
  });
  grid.addEventListener('mouseleave', () => { tooltipEl.style.display = 'none'; });
}

function showCalendarFallback(container, username) {
  if (!container) return;
  container.innerHTML = `
    <div class="fallback" role="status">
      <p>Could not load contribution calendar.</p>
      <a class="text-link" href="https://github.com/${username}" target="_blank" rel="noopener">View activity on GitHub <span class="arrow" aria-hidden="true">↗</span></a>
    </div>`;
}

function renderLanguages(repos) {
  const langsEl = $('#gh-langs');
  if (!langsEl || !repos.length) return;

  const counts = {};
  let n = 0;
  repos.forEach(r => {
    if (r.visibility && r.visibility.showOnPortfolio === false) return;
    n++;
    (r.techStack || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!sorted.length) return;
  const max = sorted[0][1];

  langsEl.innerHTML = `
    <p class="label">Top languages &amp; tools — across ${n} projects</p>
    <div class="lang-bars">
      ${sorted.map(([name, count]) => `
        <div class="lang-row">
          <span class="lang-name">${esc(name)}</span>
          <div class="lang-bar-bg" aria-hidden="true"><div class="lang-bar-fill" data-w="${Math.round((count / max) * 100)}"></div></div>
          <span class="lang-pct">${count} repo${count !== 1 ? 's' : ''}</span>
        </div>`).join('')}
    </div>`;

  // Grow the bars when the block scrolls into view
  const fill = () => $$('.lang-bar-fill', langsEl).forEach(bar => { bar.style.width = `${bar.dataset.w}%`; });
  if (!('IntersectionObserver' in window)) { fill(); return; }
  const barsObserver = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { fill(); barsObserver.disconnect(); }
  }, { threshold: 0.1 });
  barsObserver.observe(langsEl);
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
loadProjects();
loadGitHubActivity();
