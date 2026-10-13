// Shared behaviour for every page: theme, nav, reveals, counters, small interactions.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Theme toggle ----------
   Two visible states: follow the system, or the opposite of what the system shows.
   Choosing the scheme the system already uses clears the stored override. */
const meta = $('meta[name="color-scheme"]');
const sysDark = matchMedia('(prefers-color-scheme: dark)');
const store = {
  get() { try { return localStorage.getItem('color-scheme'); } catch { return null; } },
  set(v) { try { v ? localStorage.setItem('color-scheme', v) : localStorage.removeItem('color-scheme'); } catch {} },
};
function rendered() {
  const v = meta.content;
  return v === 'light' || v === 'dark' ? v : (sysDark.matches ? 'dark' : 'light');
}
function toggleTheme() {
  const target = rendered() === 'dark' ? 'light' : 'dark';
  const system = sysDark.matches ? 'dark' : 'light';
  const next = target === system ? null : target;
  const apply = () => { store.set(next); meta.content = next ?? 'light dark'; };
  if (document.startViewTransition && !reduce) document.startViewTransition(apply);
  else apply();
}
$$('.theme-toggle').forEach((b) => b.addEventListener('click', toggleTheme));
addEventListener('storage', (e) => { if (e.key === 'color-scheme') meta.content = e.newValue ?? 'light dark'; });

/* ---------- Nav ---------- */
const nav = $('.nav');
if (nav) {
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const btn = $('.menu-btn'), menu = $('.mobile-menu');
  const setOpen = (open) => {
    nav.toggleAttribute('data-open', open);
    btn?.setAttribute('aria-expanded', String(open));
    btn?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu?.toggleAttribute('inert', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menu?.setAttribute('inert', '');
  btn?.addEventListener('click', () => setOpen(!nav.hasAttribute('data-open')));
  menu?.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.hasAttribute('data-open')) { setOpen(false); btn.focus(); } });
  matchMedia('(min-width: 900px)').addEventListener('change', (e) => e.matches && setOpen(false));

  // Highlight the section in view
  const links = $$('.nav-links a[href^="#"]');
  if (links.length) {
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a === map.get(en.target.id)));
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }
}

/* ---------- Count-up ---------- */
function countUp(el) {
  const to = +el.dataset.count, from = +(el.dataset.from || 0);
  if (reduce) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 1400;
  (function tick(t) {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.round(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

/* ---------- Reveal + "in view" hooks ---------- */
const seen = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (!en.isIntersecting) return;
  const el = en.target; seen.unobserve(el);
  el.classList.add('in');
  $$('[data-count]', el).forEach(countUp);
  el.dispatchEvent(new CustomEvent('inview'));
}), { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
$$('.rv, [data-inview]').forEach((el) => seen.observe(el));

/* ---------- Statement: words light up as you scroll ---------- */
const statement = $('.statement');
if (statement) {
  const wrapWords = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createElement('span');
        frag.innerHTML = n.textContent.replace(/(\S+)/g, '<span class="w">$1</span>');
        n.replaceWith(...frag.childNodes);
      } else if (n.nodeType === 1) wrapWords(n);
    });
  };
  wrapWords(statement);
  const words = $$('.w', statement);
  if (reduce) words.forEach((w) => w.classList.add('on'));
  else {
    let ticking = false;
    const update = () => {
      const r = statement.getBoundingClientRect(), vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.3)));
      words.forEach((w, i) => w.classList.toggle('on', i < p * words.length + 1));
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }
}

/* ---------- Hero: split name into letters, glow follows pointer ---------- */
$$('.hero h1 .ln').forEach((ln, l) => {
  const text = ln.textContent;
  ln.setAttribute('aria-hidden', 'true');
  ln.innerHTML = [...text].map((c, i) => `<span class="ch" style="--i:${l * 5 + i}">${c}</span>`).join('');
});
const hero = $('.hero'), glow = $('.hero-bg .glow');
if (hero && glow && matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    glow.style.setProperty('--gx', ((e.clientX - r.left) / r.width) * 100 + '%');
    glow.style.setProperty('--gy', ((e.clientY - r.top) / r.height) * 100 + '%');
  });
}

/* ---------- Device tilt on project cards ---------- */
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
  $$('.project').forEach((card) => {
    const dev = $('.device', card);
    if (!dev) return;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      dev.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 10 + 'deg');
      dev.style.setProperty('--rx', ((e.clientY - r.top) / r.height - 0.5) * -8 + 'deg');
    });
    card.addEventListener('pointerleave', () => { dev.style.setProperty('--rx', '0deg'); dev.style.setProperty('--ry', '0deg'); });
  });
}

/* ---------- Journey chart ↔ experience cards ---------- */
const journey = $('.journey');
if (journey) {
  const tip = $('.journey-tip', journey);
  const pts = $$('.pt', journey);
  const pick = (pt) => {
    pts.forEach((p) => p.classList.toggle('on', p === pt));
    tip.innerHTML = pt.dataset.note;
    $$('.job').forEach((j) => j.classList.toggle('hl', j.id === pt.dataset.job));
  };
  pts.forEach((pt) => {
    pt.addEventListener('click', () => pick(pt));
    pt.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(pt); } });
  });
}

/* ---------- Education progress (computed from today's date) ---------- */
const prog = $('[data-progress]');
if (prog) {
  const start = new Date(prog.dataset.start), end = new Date(prog.dataset.end);
  const pct = Math.round(Math.min(1, Math.max(0, (Date.now() - start) / (end - start))) * 100);
  $('.pct', prog).textContent = pct + '%';
  prog.addEventListener('inview', () => { $('.progress-track i', prog).style.width = pct + '%'; });
}

/* ---------- Copy email ---------- */
const toast = $('.toast');
const say = (msg) => { if (!toast) return; toast.textContent = msg; toast.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('show'), 2000); };
$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); say('Email copied'); b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1800); }
  catch { location.href = 'mailto:' + b.dataset.copy; }
}));

/* ---------- Footer year ---------- */
$$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
