/* ===== ui/arc: łuk z kreskami (jasność, prędkość wentylatora). Aktywne kreski w kolorze akcentu, kropka na końcu wartości.
   Kolor kresek przechodzi płynnie przy zmianie (ui/morph zmienia tylko klasę). ===== */
hgUI.add(`
.nv-arc{ display:block; width:100%; height:auto; overflow:visible; }
.nv-arc line{ stroke: color-mix(in srgb, currentColor 30%, transparent); stroke-width:3; stroke-linecap:round; transition: stroke var(--hg-t-base) var(--hg-ease-out); }
.nv-arc line.on{ stroke: var(--hg-accent); filter: drop-shadow(0 0 3px var(--hg-accent-glow)); }
.nv-arc circle{ fill: var(--hg-accent); stroke:#fff; stroke-width:2; filter: drop-shadow(0 0 6px var(--hg-accent-glow)); transition: cx var(--hg-t-slow) var(--hg-ease-out), cy var(--hg-t-slow) var(--hg-ease-out); }
.nv-arc text{ fill: currentColor; opacity:.5; font-size:11px; }
`);
/* hgUI.arc(86, { ticks: 17, label }) – półokrąg od lewej do prawej */
hgUI.arc = (pct, o = {}) => { const n = o.ticks || 17, p = Math.max(0, Math.min(100, +pct || 0)), on = Math.round((p / 100) * (n - 1));
  const R = 80, r = 64, cx = 100, cy = 96; let s = '';
  for (let i = 0; i < n; i++) { const a = Math.PI - (i / (n - 1)) * Math.PI, c = Math.cos(a), si = Math.sin(a);
    s += `<line class="${i <= on && p > 0 ? 'on' : ''}" x1="${(cx + c * r).toFixed(1)}" y1="${(cy - si * r).toFixed(1)}" x2="${(cx + c * R).toFixed(1)}" y2="${(cy - si * R).toFixed(1)}"/>`; }
  const a = Math.PI - (p / 100) * Math.PI;
  return `<svg class="nv-arc" viewBox="0 0 200 104" role="img" aria-label="${H.esc(o.label || '')} ${H.pct(Math.round(p))}">${s}<circle cx="${(cx + Math.cos(a) * (R + 8)).toFixed(1)}" cy="${(cy - Math.sin(a) * (R + 8)).toFixed(1)}" r="5"/></svg>`; };
