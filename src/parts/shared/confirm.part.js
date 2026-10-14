/* shared/confirm: Okno potwierdzenia HGConfirm (karty i edytor). */
const HGConfirm = {
  ask(title, text, ok = hgTr('Potwierdź', 'Confirm'), danger = true, info = false) {
    return new Promise((res) => {
      const x = document.createElement('div'); x.className = 'hg-confirm';
      const sr = x.attachShadow({ mode: 'open' });
      sr.innerHTML = `<style>${HG_BASE}${U(`
:host{ position:fixed; inset:0; z-index:9100; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(14,16,20,.36); animation:f .16s ease; }
@keyframes f{ from{ opacity:0; } } @media (prefers-reduced-motion: reduce){ :host{ animation:none; } }
.d{ width:min(380px, 100%); box-sizing:border-box; padding:24px; border-radius:var(--r-lg); background:var(--hg-panel-flat, rgba(236,238,242,.94)); -webkit-backdrop-filter:blur(24px); backdrop-filter:blur(24px);
  border:1px solid var(--hg-glass-bd); box-shadow:var(--hg-sh); color:#1E2023; display:flex; flex-direction:column; gap:16px; }
.d b{ font-size:18px; font-weight:600; } .d p{ margin:0; font-size:var(--fs-sm); color:#4A4E54; line-height:1.45; }
.r{ display:flex; gap:8px; justify-content:flex-end; }
.r button{ height:44px; padding:0 18px; border-radius:22px; font-size:var(--fs-sm); font-weight:600; background:rgba(0,0,0,.06); color:#1E2023; }
.r button.ok{ background:${danger ? '#C62828' : '#1E2023'}; color:#fff; }
`)}</style><div class="d" role="alertdialog" aria-modal="true" aria-label="${H.esc(title)}"><b>${H.esc(title)}</b><p>${H.esc(text)}</p>
        <div class="r">${info ? '' : `<button class="no" data-v="0">${hgTr('Anuluj', 'Cancel')}</button>`}<button class="ok" data-v="1">${H.esc(ok)}</button></div></div>`;
      const done = (v) => { document.removeEventListener('keydown', key); x.remove(); res(v); };
      const key = (e) => { if (e.key === 'Escape') done(false); };
      x.addEventListener('click', (e) => { const p = e.composedPath(); if (p[0] === x) return done(false); const b = p.find((n) => n.dataset && n.dataset.v); if (b) done(b.dataset.v === '1'); });
      document.addEventListener('keydown', key); document.body.appendChild(x);
      setTimeout(() => { const n = sr.querySelector('.no') || sr.querySelector('.ok'); n && n.focus(); }, 30);
    });
  },
};
window.HGConfirm = window.HGConfirm || HGConfirm;
