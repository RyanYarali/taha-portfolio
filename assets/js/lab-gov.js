// Governance page: expandable issue cards + RACI role focus.
(() => {
  document.querySelectorAll('.issue-card').forEach((c) => c.addEventListener('click', () => {
    c.setAttribute('aria-expanded', String(c.getAttribute('aria-expanded') !== 'true'));
  }));

  const notes = {
    1: '<b>Data owner</b> · The business lead who is accountable for the data and approves the standards and access rules.',
    2: '<b>Data steward</b> · Does the day-to-day quality work: definitions, the data dictionary, reconciliation and checks.',
    3: '<b>IT / systems</b> · Connects the systems, controls versions and puts the privacy safeguards in place.',
    4: '<b>Sales</b> · Creates customer and order records, so they are consulted on standards and kept informed.',
    5: '<b>Finance</b> · Accountable for revenue figures being reconciled and correct before they are reported.',
  };
  const table = document.getElementById('raci'), note = document.getElementById('role-note');
  const btns = [...table.querySelectorAll('th button')];
  btns.forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b && on)));
    table.classList.toggle('focus', on);
    const col = +b.dataset.col;
    table.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => td.classList.toggle('on', on && i === col)));
    note.innerHTML = on ? notes[col] : "Tap a role above to see what they're responsible for.";
  }));
})();
