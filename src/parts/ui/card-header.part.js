/* ===== ui/card-header: nagłówek karty: tytuł (+ mały podpis), a po prawej przełącznik, rozwiń albo ⋮. ===== */
hgUI.add(`
.nv-hd{ display:flex; align-items:center; gap:var(--s1); min-height:24u; position:relative; z-index:2; }
.nv-hd .nv-tt{ flex:1; min-width:0; font-size:var(--fs-md); font-weight:500; letter-spacing:-.005em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nv-hd .nv-tt small{ font-size:var(--fs-xs); font-weight:400; opacity:.6; margin-left:4u; }
.nv-hd > ha-icon{ width:13u; height:13u; flex:none; opacity:.85; }
`);
/* hgUI.header('Salon', { icon, sub, right: html }) */
hgUI.header = (title, o = {}) => `<div class="nv-hd">${o.icon ? H.icon(o.icon) : ''}<div class="nv-tt">${H.esc(title)}${o.sub ? `<small>${H.esc(o.sub)}</small>` : ''}</div>${o.right || ''}</div>`;
