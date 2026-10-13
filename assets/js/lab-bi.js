// BI method lab: dots stand for rows; filter fades some out, aggregate stacks
// the rest into bars, compare splits each bar into two groups.
(() => {
  const sets = [
    { name: 'Spotify Top 10,000', rows: '10,000 rows', q: 'Which genres show up most in the top 10,000, and how does that change by release decade?',
      groups: ['Pop', 'Hip-hop', 'Rock', 'Dance'], heights: [.95, .7, .55, .4], ab: ['Before 2010', '2010 and after'] },
    { name: 'Airbnb listings', rows: 'listings', q: 'How does nightly price differ by room type, and between weekdays and weekends?',
      groups: ['Entire home', 'Private', 'Shared', 'Hotel'], heights: [.95, .6, .3, .5], ab: ['Weekday', 'Weekend'] },
    { name: 'Abbotsford climate', rows: 'daily records', q: 'How do monthly temperature and precipitation compare across seasons?',
      groups: ['Winter', 'Spring', 'Summer', 'Fall'], heights: [.8, .5, .35, .7], ab: ['Earlier years', 'Recent years'] },
  ];
  const N = 120, SIZE = 10, GAP = 3;
  const field = document.getElementById('field');
  const count = document.getElementById('count'), lbls = document.getElementById('lbls');
  const question = document.getElementById('question');
  const legend = document.getElementById('legend');
  const ops = Object.fromEntries([...document.querySelectorAll('[data-op]')].map((b) => [b.dataset.op, b]));
  const tabs = [...document.querySelectorAll('[data-ds]')];

  // Seeded random so each dataset looks the same every time
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dots = Array.from({ length: N }, () => {
    const d = document.createElement('i');
    field.appendChild(d);
    return d;
  });
  let ds = 0, stage = 0, keep = [], scatter = [];

  function place(d, x, y) { d.style.transform = `translate(${x}px, ${y}px)`; }

  function layoutScatter() {
    const w = field.clientWidth - SIZE - 16, h = field.clientHeight - SIZE - 44;
    const r = rng(ds * 97 + 13);
    scatter = dots.map(() => [8 + r() * w, 36 + r() * h]);
    dots.forEach((d, i) => { d.style.setProperty('--r', Math.round(r() * 300)); place(d, ...scatter[i]); });
  }

  function layoutBars(split) {
    const set = sets[ds], w = field.clientWidth, h = field.clientHeight;
    const colW = w / set.groups.length;
    // Pick a stack width so the tallest bar fills ~65% of the field, within the column
    const maxShare = Math.max(...set.heights) / set.heights.reduce((x, y) => x + y, 0);
    const tallest = Math.ceil(keep.length * maxShare / (split ? 2 : 1));
    const fitRows = Math.max(1, Math.floor(((h - 70) * 0.65) / (SIZE + GAP)));
    const widest = Math.max(2, Math.floor((colW * 0.8) / ((SIZE + GAP) * (split ? 2 : 1))));
    const perRow = Math.min(widest, Math.max(2, Math.ceil(tallest / fitRows)));
    const base = h - 30;
    // Share kept dots between groups in proportion to bar heights
    const total = set.heights.reduce((a, b) => a + b, 0);
    let idx = 0;
    set.groups.forEach((_, g) => {
      const n = g === set.groups.length - 1 ? keep.length - idx : Math.round(keep.length * set.heights[g] / total);
      const members = keep.slice(idx, idx + n); idx += n;
      members.forEach((di, k) => {
        const d = dots[di];
        let side = 0, kk = k;
        if (split) { side = k % 2; kk = Math.floor(k / 2); }
        const col = kk % perRow, row = Math.floor(kk / perRow);
        const stackW = perRow * (SIZE + GAP);
        const x0 = g * colW + colW / 2 - (split ? stackW + 3 : stackW / 2) + side * (stackW + 6);
        place(d, x0 + col * (SIZE + GAP), base - (row + 1) * (SIZE + GAP));
        d.classList.toggle('b', split && side === 1);
      });
    });
    lbls.innerHTML = set.groups.map((g) => `<span>${g}</span>`).join('');
  }

  function reset() {
    stage = 0;
    const r = rng(ds * 31 + 7);
    keep = dots.map((_, i) => i).filter(() => r() > 0.42);
    dots.forEach((d) => d.classList.remove('out', 'b'));
    field.classList.remove('grouped');
    legend.hidden = true;
    layoutScatter();
    const s = sets[ds];
    count.textContent = `${s.name} · ${s.rows}`;
    question.innerHTML = `<span class="k">Example question</span>${s.q}`;
    ops.filter.disabled = false; ops.aggregate.disabled = true; ops.compare.disabled = true;
    Object.values(ops).forEach((b) => b.setAttribute('aria-pressed', 'false'));
  }

  function run(op) {
    if (op === 'reset') return reset();
    if (op === 'filter' && stage === 0) {
      dots.forEach((d, i) => d.classList.toggle('out', !keep.includes(i)));
      count.textContent = 'Filtered to the rows that answer the question';
      stage = 1;
    } else if (op === 'aggregate' && stage === 1) {
      field.classList.add('grouped');
      layoutBars(false);
      count.textContent = 'Grouped and summarized';
      stage = 2;
    } else if (op === 'compare' && stage === 2) {
      layoutBars(true);
      const s = sets[ds];
      document.getElementById('lg-a').textContent = s.ab[0];
      document.getElementById('lg-b').textContent = s.ab[1];
      legend.hidden = false;
      count.textContent = 'Compared side by side';
      stage = 3;
    } else return;
    ops.filter.disabled = stage >= 1; ops.aggregate.disabled = stage !== 1; ops.compare.disabled = stage !== 2;
    ops[op].setAttribute('aria-pressed', 'true');
  }

  Object.entries(ops).forEach(([k, b]) => b.addEventListener('click', () => run(k)));
  tabs.forEach((t) => t.addEventListener('click', () => {
    ds = +t.dataset.ds;
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    reset();
  }));
  let rt;
  new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (stage >= 2) layoutBars(stage === 3); else { const s = stage; layoutScatter(); if (s) stage = s; } }, 120);
  }).observe(field);
  reset();
})();
