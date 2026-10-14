/* ===== ui/avatar-stack: awatary osób zachodzące na siebie (kropka: w domu), opcjonalnie przycisk +. ===== */
hgUI.add(`
.nv-avs{ display:flex; align-items:center; }
.nv-avs .nv-av{ width:24u; height:24u; border-radius:50%; margin-left:-6u; flex:none; position:relative; display:inline-flex; align-items:center; justify-content:center;
  background: var(--hg-inner-bg) center / cover no-repeat; box-shadow: 0 0 0 2px rgba(255,255,255,.55); font-size:var(--fs-xs); font-weight:600; transition: transform var(--hg-t-fast) var(--hg-ease-out); }
.nv-avs .nv-av:first-child{ margin-left:0; }
.nv-avs .nv-av.home::after{ content:''; position:absolute; right:-1px; bottom:-1px; width:7u; height:7u; border-radius:50%; background:var(--hg-accent); box-shadow:0 0 0 2px rgba(0,0,0,.25); }
.nv-avs .nv-ib{ margin-right:6u; --nv-ib: 24u; border-radius:8u; }
@media (hover:hover) and (pointer:fine){ .nv-avs .nv-av:hover{ transform: translateY(-2px); z-index:1; } }
`);
/* hgUI.avatars([{ name, pic, home }], { add: 'act' }) */
hgUI.avatars = (people, o = {}) => `<div class="nv-avs">${o.add ? hgUI.iconBtn('mdi:plus', o.add, hgTr('Dodaj', 'Add')) : ''}${(people || []).map((p) =>
  `<span class="nv-av ${p.home ? 'home' : ''}" title="${H.esc(p.name)}" data-key="av-${H.esc(p.name)}"${p.pic ? ` style="background-image:url('${H.cssUrl(p.pic)}')"` : ''}>${p.pic ? '' : H.esc(String(p.name || '?').slice(0, 1).toUpperCase())}</span>`).join('')}</div>`;
