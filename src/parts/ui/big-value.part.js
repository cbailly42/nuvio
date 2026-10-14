/* ===== ui/big-value: duża cienka liczba (23°, 62%) z jednostką i małym szarym podpisem obok lub pod spodem. ===== */
hgUI.add(`
.nv-big{ display:flex; align-items:baseline; gap:5u; flex-wrap:wrap; min-width:0; }
.nv-big .nv-v{ font-size:var(--nv-big, 30u); font-weight:var(--hg-fw-num, 300); line-height:1; letter-spacing:-.03em; white-space:nowrap; }
.nv-big .nv-v sup{ font-size:.42em; vertical-align:top; position:relative; top:.08em; margin-left:1u; }
.nv-big .nv-c{ font-size:var(--fs-sm); opacity:.65; }
.nv-big.col{ flex-direction:column; align-items:center; gap:4u; }
.nv-big.xl{ --nv-big: 48u; } .nv-big.sm{ --nv-big: 20u; }
@container (max-width: 220px){ .nv-big{ --nv-big: 22u; } .nv-big.xl{ --nv-big: 34u; } }
`);
/* hgUI.big(23.4, { d: 0, unit: '°', sup: true, caption: 'Średnio', size: 'xl'|'sm', col }) */
hgUI.big = (v, o = {}) => `<div class="nv-big ${o.size || ''} ${o.col ? 'col' : ''}"><span class="nv-v">${hgUI.num(v, o.d || 0)}${o.unit ? (o.sup ? `<sup>${H.esc(o.unit)}</sup>` : `<small style="font-size:.5em;margin-left:2px">${H.esc(o.unit)}</small>`) : ''}</span>${o.caption ? `<span class="nv-c">${H.esc(o.caption)}</span>` : ''}</div>`;
