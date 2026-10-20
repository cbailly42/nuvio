/* ===== ui/pill: szklana pigułka (etykieta, tryb, „Popołudnie”), opcjonalnie z ikoną; on = biała jak aktywna zakładka.
   ui/pill-tabs: rząd pigułek jako zakładki (role=tablist), aktywna biała. ===== */
hgUI.add(`
.nv-pill{ display:inline-flex; align-items:center; gap:4u; height:24u; padding:0 10u; border-radius:var(--hg-radius-pill, 999px); flex:none; white-space:nowrap;
  font-size:var(--fs-sm); font-weight:500; background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi); color:inherit;
  transition: background var(--hg-t-base) var(--hg-ease-out), color var(--hg-t-base) var(--hg-ease-out), transform var(--hg-t-fast) var(--hg-ease-out); }
.nv-pill ha-icon{ width:12u; height:12u; } .nv-pill{ max-width:100%; min-width:0; } .nv-pill > span{ min-width:0; overflow:hidden; text-overflow:ellipsis; } .nv-pill ha-icon{ flex:none; }
button.nv-pill{ cursor:pointer; } button.nv-pill:active{ transform: scale(.96); }
.nv-pill.on{ background:#fff; color:#111; box-shadow: 0 2px 10px rgba(0,0,0,.16); }
.nv-pill.acc{ background:var(--hg-accent); color:var(--hg-on-accent); box-shadow: 0 0 12px var(--hg-accent-glow); }
@media (hover:hover) and (pointer:fine){ button.nv-pill:not(.on):not(.acc):hover{ background:var(--hg-inner-bg-h); } }
.nv-pill:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.nv-tabs{ display:flex; gap:2u; padding:3u; border-radius:var(--hg-radius-pill, 999px); background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi); overflow-x:auto; scrollbar-width:none; max-width:100%; }
.nv-tabs::-webkit-scrollbar{ display:none; }
.nv-tabs .nv-pill{ background:transparent; box-shadow:none; }
.nv-tabs .nv-pill.on{ background:#fff; color:#111; box-shadow: 0 2px 10px rgba(0,0,0,.16); }
`);
/* hgUI.pill('Popołudnie', { icon, on, acc, act, data }) */
hgUI.pill = (text, o = {}) => { const tag = o.act ? 'button' : 'span';
  return `<${tag} class="nv-pill ${o.on ? 'on' : ''} ${o.acc ? 'acc' : ''}"${o.act ? ' type="button"' : ''}${o.on != null && o.act ? ` aria-pressed="${!!o.on}"` : ''}${hgUI.act(o.act, o.data)}>${o.icon ? H.icon(o.icon) : ''}${text != null ? `<span>${H.esc(text)}</span>` : ''}</${tag}>`; };
/* hgUI.tabs([{ id, label, icon }], cur, 'tab', 'Widoki') -> data-act="tab" data-id="<id>" */
hgUI.tabs = (items, cur, act, label) => `<div class="nv-tabs" role="tablist"${label ? ` aria-label="${H.esc(label)}"` : ''}>${items.map((it) =>
  `<button class="nv-pill ${it.id === cur ? 'on' : ''}" type="button" role="tab" aria-selected="${it.id === cur}" data-key="tab-${H.esc(it.id)}"${hgUI.act(act, { id: it.id })}>${it.icon ? H.icon(it.icon) : ''}<span>${H.esc(it.label)}</span></button>`).join('')}</div>`;
