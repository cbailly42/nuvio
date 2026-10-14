/* ===== ui: rejestr wspólnych klocków (prymitywów) kart. Każdy klocek to osobny plik ui/<nazwa>.part.js, który dopisuje
   swój CSS (hgUI.add) i funkcję zwracającą HTML (karty renderują szablony tekstowe). Styl każdej karty dostaje CSS wszystkich
   klocków (HGBase.setConfig), więc zmiana klocka zmienia wszystkie karty naraz. Wartości tylko z tokenów (src/theme_head.js). ===== */
const hgUI = {
  _css: [],
  add(css) { this._css.push(U(css)); this._all = null; },
  css() { return this._all || (this._all = this._css.join('\n')); },
  esc: (s) => H.esc(s),
  base: () => HG_BASE,   // galeria klocków (tests/ui-gallery.html)
  /* atrybuty akcji: data-act + reszta data-* (obsługa przez HGBase.onAct) */
  act(act, data) { if (!act) return ''; return ` data-act="${H.esc(act)}"` + Object.entries(data || {}).map(([k, v]) => ` data-${k}="${H.esc(v)}"`).join(''); },
  /* liczba, która przy zmianie płynnie się przelicza (ui/morph) */
  num(v, d = 0) { if (v == null || !isFinite(v)) return '<span class="nv-num">–</span>'; const t = (+v).toFixed(d).replace('.', hgCurLang() === 'en' ? '.' : ','); return `<span class="nv-num" data-v="${+v}">${t}</span>`; },
};
window.__hgUI = hgUI;
hgUI.add(`
/* wejście nowego elementu i wspólne przejścia */
.nv-in{ animation: nvIn var(--hg-t-slow, 320ms) var(--hg-ease-out, ease-out) both; }
@keyframes nvIn{ from{ opacity:0; transform: translateY(6px) scale(.98); } }
.nv-num{ font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: reduce){ .nv-in{ animation:none; } }
`);
