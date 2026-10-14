/* ===== ui/sparkline: wykres powierzchniowy (energia słoneczna, moc) z gradientem w dół i dymkiem ostatniej wartości. ===== */
hgUI.add(`
.nv-spark{ position:relative; }
.nv-spark svg{ display:block; width:100%; height:var(--nv-sh, 70u); overflow:visible; }
.nv-spark path.a{ fill: url(#nvsg); } .nv-spark path.l{ fill:none; stroke: var(--nv-sc, var(--hg-accent)); stroke-width:2; vector-effect: non-scaling-stroke; }
.nv-spark .tip{ position:absolute; right:0; transform: translate(0, -130%); padding:3u 8u; border-radius:var(--hg-radius-pill, 999px); background:#fff; color:#111; font-size:var(--fs-xs); font-weight:600; white-space:nowrap; box-shadow: 0 4px 14px rgba(0,0,0,.2); }
.nv-spark .dot{ position:absolute; right:-4px; width:8px; height:8px; border-radius:50%; background:#fff; box-shadow: 0 0 0 3px var(--nv-sc, var(--hg-accent)); transform: translateY(-50%); }
.nv-spark .ax{ display:flex; justify-content:space-between; margin-top:5u; font-size:var(--fs-xs); opacity:.6; }
.nv-spark.solar{ --nv-sc: #F0955A; }
`);
/* hgUI.spark([v...], { tip: '12.4 kWh', axis: ['Pn', ..., 'Nd'], tone: 'solar' }) */
hgUI.spark = (vals, o = {}) => { const v = (vals || []).filter((x) => isFinite(x)); if (v.length < 2) return '';
  const mn = Math.min(...v), mx = Math.max(...v), rg = mx - mn || 1, W = 300, Hh = 100, X = (i) => (i / (v.length - 1)) * W, Y = (x) => Hh - 8 - ((x - mn) / rg) * (Hh - 16);
  const line = v.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(x).toFixed(1)}`).join('');
  const last = ((Y(v.at(-1)) / Hh) * 100).toFixed(1);
  return `<div class="nv-spark ${o.tone || ''}"><svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="nvsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--nv-sc, var(--hg-accent))" stop-opacity=".75"/><stop offset="1" stop-color="var(--nv-sc, var(--hg-accent))" stop-opacity=".05"/></linearGradient></defs><path class="a" d="${line}L${W} ${Hh}L0 ${Hh}Z"/><path class="l" d="${line}"/></svg>${o.tip ? `<span class="dot" style="top:${last}%"></span><span class="tip" style="top:${last}%">${H.esc(o.tip)}</span>` : ''}${o.axis ? `<div class="ax">${o.axis.map((a) => `<span>${H.esc(a)}</span>`).join('')}</div>` : ''}</div>`; };
