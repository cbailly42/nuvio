/* ===== ui/progress: gruby pasek z limonkowym gradientem i poświatą, reszta kreskowana; pod spodem min i max.
   Szerokość przez --p, więc przy zmianie wartości pasek dojeżdża przejściem (ui/morph zmienia tylko styl). ===== */
hgUI.add(`
.nv-prog{ position:relative; height:var(--nv-ph, 22u); border-radius:9u; overflow:hidden;
  background: repeating-linear-gradient(-55deg, color-mix(in srgb, currentColor 22%, transparent) 0 1.5u, transparent 1.5u 6u); }
.nv-prog > i{ position:absolute; inset:0 auto 0 0; width:var(--p, 0%); min-width:var(--nv-ph, 22u); border-radius:inherit;
  background: linear-gradient(90deg, var(--hg-accent-hi), var(--hg-accent)); box-shadow: 0 0 14u var(--hg-accent-glow), inset 0 1px 0 rgba(255,255,255,.35);
  transition: width var(--hg-t-slow) var(--hg-ease-out), background var(--hg-t-base) var(--hg-ease-out); }
.nv-prog.warn > i{ background: linear-gradient(90deg, #FFD36B, #FF9F43); box-shadow: 0 0 14u rgba(255,159,67,.35); }
.nv-prog.bad > i{ background: linear-gradient(90deg, #FF8A7A, #FF5B4F); box-shadow: 0 0 14u rgba(255,91,79,.35); }
.nv-prog-l{ display:flex; justify-content:space-between; margin-top:5u; font-size:var(--fs-xs); opacity:.65; }
@media (prefers-reduced-motion: reduce){ .nv-prog > i{ transition:none; } }
`);
/* hgUI.progress(62, { min: '0', max: '100%', tone: 'warn'|'bad', label }) */
hgUI.progress = (pct, o = {}) => { const p = Math.max(0, Math.min(100, +pct || 0));
  return `<div class="nv-prog ${o.tone || ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}"${o.label ? ` aria-label="${H.esc(o.label)}"` : ''} style="--p:${p.toFixed(1)}%"><i></i></div>${o.min != null || o.max != null ? `<div class="nv-prog-l"><span>${H.esc(o.min ?? '')}</span><span>${H.esc(o.max ?? '')}</span></div>` : ''}`; };
