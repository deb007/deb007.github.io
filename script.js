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
if (window.lucide) lucide.createIcons();
