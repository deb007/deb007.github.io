const CONFIG = {
  name: "Debjyoti Aich",
  email: atob("YWljaDMwQGdtYWlsLmNvbQ=="),
  socials: [
    { name: "GitHub", url: "https://github.com/deb007" },
    { name: "LinkedIn", url: "https://linkedin.com/in/deb007" },
    { name: "Twitter/X", url: "https://twitter.com/deb007" }
  ],
  roles: ["LLM Wrangler", "AI Builder", "Product Thinker", "Solution Architect", "Open Source Contributor"],
  skills: ["Python", "TypeScript", "Node.js", "PostgreSQL", "FastAPI", "Azure OpenAI", "Supabase", "Docker", "TailwindCSS"]
};

const DEVICON_MAP = {
  "Python": "devicon-python-plain colored",
  "TypeScript": "devicon-typescript-plain colored",
  "Node.js": "devicon-nodejs-plain colored",
  "React Native": "devicon-react-original colored",
  "PostgreSQL": "devicon-postgresql-plain colored",
  "FastAPI": "devicon-fastapi-plain colored",
  "Azure OpenAI": "devicon-azure-plain colored",
  "Supabase": "devicon-supabase-plain colored",
  "Docker": "devicon-docker-plain colored",
  "TailwindCSS": "devicon-tailwindcss-original colored"
};

// DOM Elements
const roleTextElement = document.getElementById('role-text');
const workGrid = document.getElementById('work-grid');
const stackTrack = document.getElementById('stack-track');
const socialRow = document.getElementById('social-row');
const nav = document.getElementById('nav');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

// Setup Config Data
document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('email-btn').href = `mailto:${CONFIG.email}`;
document.getElementById('email-text').innerHTML = `<i data-lucide="mail" style="width:18px;height:18px;margin-right:8px;vertical-align:middle;"></i>${CONFIG.email}`;

// Social Links
socialRow.innerHTML = CONFIG.socials.map((social, idx) => {
  const isLast = idx === CONFIG.socials.length - 1;
  const iconMap = { "GitHub": "github", "LinkedIn": "linkedin", "Twitter/X": "twitter" };
  const icon = iconMap[social.name] ? `<i data-lucide="${iconMap[social.name]}" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;"></i>` : '';
  return `<a href="${social.url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;">${icon}${social.name}</a>${!isLast ? '<span class="dot">·</span>' : ''}`;
}).join('');

// Stack Chips
const chipsHTML = CONFIG.skills.map(s => {
  const iconClass = DEVICON_MAP[s];
  const iconHtml = iconClass ? `<i class="${iconClass}" style="margin-right:6px;font-size:16px;vertical-align:middle;"></i>` : '';
  return `<span class="chip">${iconHtml}${s}</span>`;
}).join('');
stackTrack.innerHTML = chipsHTML + chipsHTML; // Duplicate for infinite scroll

// Word Swap Animation
let currentRoleIndex = 0;
roleTextElement.textContent = CONFIG.roles[0];

setInterval(() => {
  const nextIndex = (currentRoleIndex + 1) % CONFIG.roles.length;
  roleTextElement.classList.add('out');

  setTimeout(() => {
    roleTextElement.textContent = CONFIG.roles[nextIndex];
    roleTextElement.classList.remove('out');
    roleTextElement.classList.add('prepare');

    // Force reflow
    void roleTextElement.offsetWidth;

    roleTextElement.classList.remove('prepare');
    currentRoleIndex = nextIndex;
  }, 400);
}, 2500);

// Scroll Observer for reveals
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const observer = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Nav Scroll & Active Link
const sections = document.querySelectorAll('section');
const navItems = document.querySelectorAll('.nav-link[href^="#"]');

window.addEventListener('scroll', () => {
  // Nav blur border
  if (window.scrollY > 20) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }

  // Active link
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (window.scrollY >= (sectionTop - sectionHeight / 3)) {
      current = section.getAttribute('id');
    }
  });

  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href') === `#${current}`) {
      item.classList.add('active');
    }
  });
});

// Mobile Menu
menuToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuToggle.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', isOpen);
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

// Load Projects
async function loadProjects() {
  try {
    const res = await fetch('portfolio.json');
    if (!res.ok) throw new Error("Not found");
    const data = await res.json();
    const repos = data.repos || [];
    const shuffle = arr => arr.slice().sort(() => Math.random() - 0.5);
    const featured = shuffle(repos.filter(r => r.featured));
    const rest = shuffle(repos.filter(r => !r.featured));
    repos.length = 0;
    repos.push(...featured, ...rest);

    if (repos.length === 0) throw new Error("Empty repos");

    workGrid.innerHTML = repos.map(repo => {
      if (repo.visibility && !repo.visibility.showOnPortfolio) return '';

      const isFeatured = repo.featured ? 'featured' : '';
      const featureBadge = repo.featured ? `<span style="display:inline-flex;align-items:center;gap:4px;color:var(--warning);margin-right:8px;"><i data-lucide="star" style="width:12px;height:12px;color:var(--warning)"></i> Featured</span>` : '';
      const year = repo.timeline?.startDate ? repo.timeline.startDate.split('-')[0] : '2026';
      const statusClass = repo.status === 'active' ? 'active' : repo.status === 'wip' ? 'wip' : '';
      const statusText = repo.status || 'Archived';

      const allTags = [...(repo.techStack || []), ...(repo.tags || [])];
      const tags = allTags.map(t => {
        const iconClass = DEVICON_MAP[t];
        const iconHtml = iconClass ? `<i class="${iconClass}" style="margin-right:4px;"></i>` : '';
        return `<span class="tag" style="display:inline-flex;align-items:center;">${iconHtml}${t}</span>`;
      }).join('');
      const repoUrl = repo.links?.github || '#';

      return `
            <article class="card ${isFeatured} reveal">
              <a href="${repoUrl}" target="_blank" rel="noopener" class="card-link" aria-label="View ${repo.name}"></a>
              <div class="card-header">
                <div class="status ${statusClass}">${featureBadge}<span class="status-dot"></span>${statusText}</div>
                <div class="year">${year}</div>
              </div>
              <h3 class="card-title">${repo.name}</h3>
              <p class="card-desc">${repo.description || ''}</p>
              <div class="card-tags">${tags}</div>
              <div class="card-cta" aria-hidden="true">View Project <i data-lucide="arrow-right" class="cta-icon" style="width:14px;height:14px;vertical-align:middle;"></i></div>
            </article>
          `;
    }).join('');

    // Re-observe new cards
    document.querySelectorAll('.card.reveal').forEach(el => observer.observe(el));
    setupCardSpotlight();
    if (window.lucide) lucide.createIcons();

    // Populate language bars from loaded repo data
    renderLanguages(repos);

  } catch (err) {
    workGrid.innerHTML = `
          <article class="card reveal">
            <div class="card-header">
              <div class="status active"><span class="status-dot"></span>Active</div>
              <div class="year">2024</div>
            </div>
            <h3 class="card-title">
              <a href="#" class="card-link">Project Placeholder</a>
            </h3>
            <p class="card-desc">portfolio.json not found or invalid. Please ensure the file exists in the root directory.</p>
            <div class="card-tags"><span class="tag">HTML</span><span class="tag">CSS</span></div>
            <div class="card-cta" aria-hidden="true">View Project ↗</div>
          </article>
        `;
    document.querySelectorAll('.card.reveal').forEach(el => observer.observe(el));
  }
}

// ── GitHub Activity ──────────────────────────────────────────────────────────

async function loadGitHubActivity() {
  const username = 'deb007';
  const calEl = document.getElementById('gh-calendar');
  const tooltipEl = document.getElementById('gh-tooltip');

  try {
    const [contribRes, userRes] = await Promise.all([
      fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`),
      fetch(`https://api.github.com/users/${username}`)
    ]);

    if (userRes.ok) {
      const user = await userRes.json();
      const el = document.getElementById('gh-repos-count');
      if (el) el.textContent = user.public_repos;
    }

    if (contribRes.ok) {
      const data = await contribRes.json();
      const contribs = data.contributions || [];
      const total = contribs.reduce((s, d) => s + d.count, 0);

      const countEl = document.getElementById('gh-contrib-count');
      if (countEl) countEl.textContent = total.toLocaleString();

      renderContribAnalytics(contribs);
      renderContribCalendar(calEl, contribs, tooltipEl);
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
  const avgEl = document.getElementById('gh-avg-count');
  if (avgEl) avgEl.textContent = avg;

  // Best day of week by total contribution count
  const dowCounts = Array(7).fill(0);
  activeDays.forEach(d => {
    const dow = new Date(d.date + 'T12:00:00').getDay();
    dowCounts[dow] += d.count;
  });
  const bestDow = dowCounts.indexOf(Math.max(...dowCounts));
  const dowEl = document.getElementById('gh-bestdow');
  if (dowEl) dowEl.textContent = DOW_NAMES[bestDow];

  // Best month by total contribution count
  const monthCounts = Array(12).fill(0);
  activeDays.forEach(d => {
    const month = new Date(d.date + 'T12:00:00').getMonth();
    monthCounts[month] += d.count;
  });
  const bestMonth = monthCounts.indexOf(Math.max(...monthCounts));
  const monthEl = document.getElementById('gh-bestmonth');
  if (monthEl) monthEl.textContent = MONTH_NAMES[bestMonth];

  // Active weeks: number of ISO weeks (out of the last 52) with ≥1 contribution
  const weekSet = new Set();
  activeDays.forEach(d => {
    // Get Monday of the week containing this date
    const dt = new Date(d.date + 'T12:00:00');
    const day = dt.getDay(); // 0=Sun
    const monday = new Date(dt);
    monday.setDate(dt.getDate() - ((day + 6) % 7));
    weekSet.add(localDateStr(monday));
  });
  const activeWeeksEl = document.getElementById('gh-activeweeks');
  if (activeWeeksEl) activeWeeksEl.textContent = `${weekSet.size} / 52`;
}

function renderContribCalendar(container, contributions, tooltipEl) {
  if (!container) return;

  const LEVEL_COLORS = [
    'var(--bg-overlay)',
    'rgba(110,231,247,0.12)',
    'rgba(110,231,247,0.32)',
    'rgba(110,231,247,0.60)',
    'var(--accent)'
  ];

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

  container.innerHTML = `
    <div class="calendar-wrap">
      <div class="cal-months" style="min-width:${gridWidth}px">
        ${monthLabels.map(ml =>
    `<span class="cal-month-lbl" style="left:${ml.col * STEP}px">${ml.label}</span>`
  ).join('')}
      </div>
      <div class="calendar-grid" style="min-width:${gridWidth}px">
        ${weeks.map(week =>
    `<div class="cal-week">${week.map(day =>
      `<div class="cal-day${day.future ? ' cal-day--future' : ''}"
              style="background:${day.future ? 'transparent' : LEVEL_COLORS[day.level]}"
              ${!day.future ? `data-date="${day.date}" data-count="${day.count}"` : ''}></div>`
    ).join('')}</div>`
  ).join('')}
      </div>
      <div class="calendar-legend">
        <span class="cal-legend-txt">Less</span>
        ${LEVEL_COLORS.map(c =>
    `<div class="cal-day cal-day--legend" style="background:${c}"></div>`
  ).join('')}
        <span class="cal-legend-txt">More</span>
      </div>
    </div>`;

  // Hover tooltips
  if (tooltipEl) {
    container.querySelectorAll('.cal-day[data-date]').forEach(cell => {
      cell.addEventListener('mouseenter', () => {
        const count = +cell.dataset.count;
        const ds = cell.dataset.date;
        const fmt = new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        tooltipEl.textContent = count > 0
          ? `${count} contribution${count !== 1 ? 's' : ''} on ${fmt}`
          : `No contributions on ${fmt}`;
        tooltipEl.style.display = 'block';
      });
      cell.addEventListener('mousemove', e => {
        tooltipEl.style.left = (e.clientX + 14) + 'px';
        tooltipEl.style.top = (e.clientY - 42) + 'px';
      });
      cell.addEventListener('mouseleave', () => {
        tooltipEl.style.display = 'none';
      });
    });
  }
}

function showCalendarFallback(container, username) {
  if (!container) return;
  container.innerHTML = `
    <div class="calendar-wrap" style="text-align:center;padding:32px 24px;">
      <p style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--text-muted);margin-bottom:12px;">Could not load contribution calendar.</p>
      <a href="https://github.com/${username}" target="_blank" rel="noopener"
        style="color:var(--accent);font-family:var(--font-mono);font-size:var(--text-sm);">View activity on GitHub ↗</a>
    </div>`;
}

const LANG_COLORS = {
  'Python': '#3572A5',
  'TypeScript': '#2b7489',
  'JavaScript': '#f1e05a',
  'Node.js': '#41873F',
  'FastAPI': '#059669',
  'React': '#61dafb',
  'React Native': '#61dafb',
  'PostgreSQL': '#336791',
  'Docker': '#2496ED',
  'Azure OpenAI': '#0078d4',
  'Supabase': '#3ECF8E',
  'TailwindCSS': '#38bdf8'
};

function renderLanguages(repos) {
  const langsEl = document.getElementById('gh-langs');
  if (!langsEl || !repos.length) return;

  const counts = {};
  repos.forEach(r => {
    if (r.visibility && r.visibility.showOnPortfolio === false) return;
    (r.techStack || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!sorted.length) return;

  const max = sorted[0][1];

  langsEl.innerHTML = `
    <div class="gh-langs-title">Top Languages &amp; Tools</div>
    <div class="lang-bars">
      ${sorted.map(([name, count]) => {
    const pct = Math.round((count / max) * 100);
    const color = LANG_COLORS[name] || 'var(--accent)';
    return `<div class="lang-row">
          <span class="lang-name">${name}</span>
          <div class="lang-bar-bg">
            <div class="lang-bar-fill" data-w="${pct}" style="background:${color}"></div>
          </div>
          <span class="lang-pct">${count} repo${count !== 1 ? 's' : ''}</span>
        </div>`;
  }).join('')}
    </div>`;

  // Animate bars when section scrolls into view
  const barsObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        langsEl.querySelectorAll('.lang-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.w + '%';
        });
        barsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  barsObserver.observe(langsEl);
}

// ─────────────────────────────────────────────────────────────────────────────

// Card Spotlight
function setupCardSpotlight() {
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
    });
  });
}

// Initialize
loadProjects();
loadGitHubActivity();
if (window.lucide) lucide.createIcons();
