// df.clean() lab: replays profile → recover → dedupe on sample rows.
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cols = ['Transaction ID', 'Item', 'Quantity', 'Price', 'Total', 'Payment', 'Location', 'Date'];
  const raw = [
    ['TXN_1961373', 'Coffee', '2', '2.0', '4.0', 'Credit Card', 'Takeaway', '2023-09-08'],
    ['TXN_4977031', 'Cake', '4', '3.0', 'ERROR', 'Cash', 'In-store', '2023-05-16'],
    ['TXN_4271903', 'Cookie', '4', '1.0', '4.0', 'Credit Card', 'In-store', '2023-07-19'],
    ['TXN_7034554', 'UNKNOWN', '2', '5.0', '10.0', 'UNKNOWN', 'UNKNOWN', '2023-04-27'],
    ['TXN_3160411', 'Sandwich', '2', '4.0', '8.0', 'Digital Wallet', 'In-store', '2023-06-11'],
    ['TXN_2602893', 'Smoothie', '5', '4.0', '20.0', 'Credit Card', 'ERROR', '2023-03-31'],
    ['TXN_4433211', 'UNKNOWN', '3', '3.0', '9.0', 'ERROR', 'Takeaway', '2023-10-06'],
    ['TXN_6699534', 'Sandwich', '4', '4.0', '16.0', 'Cash', 'UNKNOWN', ''],
    ['TXN_4271903', 'Cookie', '4', '1.0', '4.0', 'Credit Card', 'In-store', '2023-07-19'],
    ['TXN_4717867', 'Juice', 'ERROR', '3.0', '9.0', 'Cash', 'Takeaway', '2023-12-02'],
  ];
  // Menu prices: a price that maps to exactly one item lets us recover that item.
  const uniquePriceItem = { '1.0': 'Cookie', '1.5': 'Tea', '2.0': 'Coffee', '5.0': 'Salad' };
  const BAD = new Set(['ERROR', 'UNKNOWN', '']);

  const code = [
    `<span class="c"># Load the raw export</span>
<span class="k">import</span> pandas <span class="k">as</span> pd
df = pd.<span class="f">read_csv</span>(<span class="s">"dirty_cafe_sales.csv"</span>)
df.<span class="f">head</span>(<span class="s">10</span>)`,
    `<span class="c"># 1 · Profile: placeholders are missing values too</span>
df = df.<span class="f">replace</span>([<span class="s">"ERROR"</span>, <span class="s">"UNKNOWN"</span>, <span class="s">""</span>], pd.NA)
df.<span class="f">isna</span>().<span class="f">sum</span>()
df.<span class="f">duplicated</span>().<span class="f">sum</span>()`,
    `<span class="c"># 2 · Recover only what the data supports</span>
df[<span class="s">"Total"</span>] = df[<span class="s">"Total"</span>].<span class="f">fillna</span>(df.Quantity * df.Price)
df[<span class="s">"Quantity"</span>] = df[<span class="s">"Quantity"</span>].<span class="f">fillna</span>(df.Total / df.Price)
df[<span class="s">"Item"</span>] = df[<span class="s">"Item"</span>].<span class="f">fillna</span>(df.Price.<span class="f">map</span>(unique_price_item))`,
    `<span class="c"># 3 · Drop exact duplicates, re-check</span>
df = df.<span class="f">drop_duplicates</span>()
df.<span class="f">info</span>()  <span class="c"># remaining gaps stay flagged</span>`,
  ];

  const table = document.getElementById('df');
  const codeEl = document.getElementById('code');
  const meter = document.getElementById('meter'), pct = document.getElementById('pct');
  const rowsEl = document.getElementById('rows');
  const bars = document.getElementById('issue-bars'), total = document.getElementById('issue-total');
  const stepBtns = [...document.querySelectorAll('[data-step]')];
  const runAll = document.getElementById('runall'), resetBtn = document.getElementById('reset');

  let data, state, step, busy = false;

  function init() {
    data = raw.map((r) => r.map((v) => ({ v, issue: false, fixed: false })));
    state = { profiled: false, dupe: 8, removed: false };
    step = 0;
    render(); setCode(0, true); updateStats();
    stepBtns.forEach((b, i) => { b.disabled = i !== 0; b.setAttribute('aria-pressed', 'false'); });
    runAll.disabled = false;
  }

  function render() {
    const head = `<thead><tr><th class="idx"></th>${cols.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead>`;
    const body = data.map((r, i) => {
      const cls = [state.profiled && i === state.dupe ? 'dupe' : '', state.removed && i === state.dupe ? 'gone' : ''].join(' ').trim();
      return `<tr class="${cls}"><td class="idx">${i}</td>${r.map((c) => {
        const k = c.issue ? 'issue' : c.fixed ? 'fixed' : '';
        const shown = c.issue && state.profiled && c.v === '' ? 'NaN' : (c.v === '' ? '&nbsp;' : c.v);
        return `<td class="${k}">${shown}</td>`;
      }).join('')}</tr>`;
    }).join('');
    table.innerHTML = head + `<tbody>${body}</tbody>`;
  }

  function issuesByCol() {
    const counts = cols.slice(1).map(() => 0);
    data.forEach((r, i) => {
      if (state.removed && i === state.dupe) return;
      r.slice(1).forEach((c, j) => { if (c.issue) counts[j]++; });
    });
    const dup = state.profiled && !state.removed ? 1 : 0;
    return { counts, dup };
  }

  function updateStats() {
    rowsEl.textContent = state.removed ? data.length - 1 : data.length;
    if (!state.profiled) {
      pct.textContent = '—'; meter.style.width = '0%';
      bars.innerHTML = '<p style="margin:12px 0 0;color:var(--mute);font-size:14px">Run the profile to see where the problems are.</p>';
      total.textContent = '';
      return;
    }
    const { counts, dup } = issuesByCol();
    const rows = state.removed ? data.length - 1 : data.length;
    const cells = rows * cols.length;
    const bad = counts.reduce((a, b) => a + b, 0) + dup * cols.length;
    const q = Math.round(((cells - bad) / cells) * 100);
    pct.textContent = q + '%';
    meter.style.width = q + '%';
    meter.style.background = state.removed ? 'var(--acc)' : 'var(--bad)';
    const labels = [...cols.slice(1), 'Duplicates'];
    const vals = [...counts, dup];
    const max = 3;
    bars.innerHTML = labels.map((l, i) => `<div class="hbar${vals[i] ? '' : ' zero'}"><span>${l}</span><span class="t"><i style="width:0"></i></span><b>${vals[i]}</b></div>`).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      [...bars.querySelectorAll('.t i')].forEach((el, i) => { el.style.width = vals[i] ? (vals[i] / max) * 100 + '%' : '4%'; });
    }));
    const left = vals.reduce((a, b) => a + b, 0);
    total.textContent = state.removed ? `${left} flagged` : `${left} found`;
  }

  function setCode(i, instant) {
    const html = code[i], plain = html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"');
    if (instant || reduceMotion) { codeEl.innerHTML = html; return Promise.resolve(); }
    return new Promise((done) => {
      let n = 0; codeEl.classList.add('caret');
      (function type() {
        n += 3; codeEl.textContent = plain.slice(0, n);
        if (n < plain.length) return setTimeout(type, 14);
        codeEl.innerHTML = html; codeEl.classList.remove('caret'); done();
      })();
    });
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

  async function doStep(n) {
    if (busy || n !== step + 1) return;
    busy = true;
    stepBtns.forEach((b) => (b.disabled = true));
    runAll.disabled = true;
    await setCode(n);
    if (n === 1) {
      state.profiled = true;
      data.forEach((r) => r.forEach((c, j) => { if (j > 0 && BAD.has(c.v)) c.issue = true; }));
    } else if (n === 2) {
      data.forEach((r) => {
        const [, item, qty, price, tot] = r;
        if (tot.issue && !qty.issue) { tot.v = (parseFloat(qty.v) * parseFloat(price.v)).toFixed(1); tot.issue = false; tot.fixed = true; }
        if (qty.issue && !tot.issue) { qty.v = String(Math.round(parseFloat(tot.v) / parseFloat(price.v))); qty.issue = false; qty.fixed = true; }
        if (item.issue && uniquePriceItem[price.v]) { item.v = uniquePriceItem[price.v]; item.issue = false; item.fixed = true; }
        r.forEach((c) => { if (c.issue) c.v = ''; });
      });
    } else if (n === 3) {
      state.removed = true;
    }
    render(); updateStats();
    step = n;
    stepBtns.forEach((b, i) => { b.setAttribute('aria-pressed', String(i < step)); b.disabled = i !== step; });
    runAll.disabled = step >= 3;
    busy = false;
  }

  stepBtns.forEach((b) => b.addEventListener('click', () => doStep(+b.dataset.step)));
  runAll.addEventListener('click', async () => {
    for (let n = step + 1; n <= 3; n++) { await doStep(n); await wait(700); }
  });
  resetBtn.addEventListener('click', () => { if (!busy) init(); });
  init();
})();
