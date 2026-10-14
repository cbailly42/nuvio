/* ===== ui/icon-button: okrągły szklany przycisk z ikoną (lupa, plus, minus, X, rozwiń, ⋮). on = aktywny (biały). ===== */
hgUI.add(`
.nv-ib{ position:relative; width:var(--nv-ib, 30u); height:var(--nv-ib, 30u); flex:none; display:inline-flex; align-items:center; justify-content:center; border-radius:50%;
  background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi); color:inherit; cursor:pointer;
  transition: background var(--hg-t-base) var(--hg-ease-out), transform var(--hg-t-fast) var(--hg-ease-out), color var(--hg-t-base) var(--hg-ease-out); }
.nv-ib ha-icon{ width:45%; height:45%; }
.nv-ib.bare{ background:transparent; box-shadow:none; }
.nv-ib.sm{ --nv-ib: 22u; } .nv-ib.lg{ --nv-ib: 36u; }
.nv-ib.on{ background:#fff; color:#111; box-shadow: 0 2px 10px rgba(0,0,0,.18); }
@media (hover:hover) and (pointer:fine){ .nv-ib:not(.on):hover{ background:var(--hg-inner-bg-h); } }
.nv-ib:active{ transform: scale(.94); }
.nv-ib:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.nv-ib[disabled]{ opacity:.45; cursor:default; }
@media (pointer:coarse){ .nv-ib::before{ content:''; position:absolute; inset:-6px; } }
`);
/* hgUI.iconBtn('mdi:magnify', 'search', 'Szukaj', { on, size: 'sm'|'lg', bare, data }) */
hgUI.iconBtn = (icon, act, label, o = {}) => `<button class="nv-ib ${o.on ? 'on' : ''} ${o.size || ''} ${o.bare ? 'bare' : ''}" type="button" aria-label="${H.esc(label || '')}"${label && o.tip !== false ? ` data-nv-tip="${H.esc(label)}"` : ''}${o.on != null ? ` aria-pressed="${!!o.on}"` : ''}${hgUI.act(act, o.data)}${o.disabled ? ' disabled' : ''}>${H.icon(icon)}</button>`;
