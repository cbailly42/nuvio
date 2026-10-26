/* Wygaszacz „Wschód słońca": powolna zmiana gradientu nieba wg pory dnia, arc słońca/księżyca, zegar. */
HGWall.xsDef('sunrise', hgTLazy('wallx.styles.sunrise'), false, {
  cls: 'sr',
  css: `
.nx-sr{
  background:linear-gradient(180deg, var(--sr-top,${K(10,10,40,1)}) 0%, var(--sr-bottom,${K(20,20,60,1)}) 100%);
  transition:background 120s ease;
  overflow:hidden;
  color:${K(255,255,255,1)};
}
.nx-sr[data-rm=true]{
  transition:none;
}
.nx-sr-sky{
  position:absolute;
  inset:0;
  background:linear-gradient(180deg, var(--sr-top,${K(10,10,40,1)}) 0%, var(--sr-bottom,${K(20,20,60,1)}) 100%);
  transition:background 120s ease;
  z-index:0;
}
.nx-sr[data-rm=true] .nx-sr-sky{
  transition:none;
}
.nx-sr-disc{
  position:absolute;
  width:clamp(48px,9vmin,100px);
  aspect-ratio:1;
  border-radius:50%;
  background:var(--sr-disc,${K(255,220,80,1)});
  box-shadow:0 0 clamp(16px,4vmin,60px) clamp(8px,2vmin,30px) var(--sr-glow,${K(255,200,60,.5)});
  left:var(--sr-x,50%);
  bottom:var(--sr-y,20%);
  transform:translate(-50%,50%);
  transition:left 120s ease, bottom 120s ease, background 120s ease, box-shadow 120s ease;
  z-index:1;
}
.nx-sr[data-rm=true] .nx-sr-disc{
  transition:none;
}
.nx-sr-horizon{
  position:absolute;
  bottom:0; left:0; right:0;
  height:clamp(2px,0.5vmin,6px);
  background:var(--sr-horiz,${K(255,180,60,.4)});
  transition:background 120s ease;
  z-index:1;
}
.nx-sr[data-rm=true] .nx-sr-horizon{
  transition:none;
}
.nx-sr-in{
  position:relative;
  z-index:2;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:clamp(8px,1.6vmin,20px);
}
.nx-sr .nx-t{
  font-size:clamp(80px,22vmin,260px);
  font-weight:300;
  letter-spacing:-.04em;
  line-height:.9;
  color:${K(255,255,255,1)};
  text-shadow:0 2px 24px ${K(0,0,0,.38)}, 0 0 60px ${K(0,0,0,.18)};
}
.nx-sr .nx-t small{
  font-size:.22em;
  font-weight:500;
  letter-spacing:.04em;
  margin-left:.3em;
  vertical-align:.25em;
  opacity:.7;
}
.nx-sr .nx-dt{
  margin:0;
  font-size:clamp(14px,2.6vmin,26px);
  font-weight:500;
  color:${K(255,255,255,1)};
  text-shadow:0 1px 8px ${K(0,0,0,.4)};
  opacity:.92;
}
.nx-sr .nx-dt::first-letter{ text-transform:uppercase; }
.nx-sr .nx-wx{
  display:inline-flex;
  align-items:center;
  gap:clamp(6px,1.2vmin,12px);
  font-size:clamp(13px,2.2vmin,21px);
  font-weight:500;
  color:${K(255,255,255,1)};
  text-shadow:0 1px 6px ${K(0,0,0,.4)};
  opacity:.9;
}
.nx-sr .nx-wx[hidden]{ display:none; }
.nx-sr .nx-wx img{ width:clamp(34px,5vmin,52px); height:clamp(34px,5vmin,52px); margin:-8px -3px; }
.nx-sr .nx-wx b{ font-size:1.4em; font-weight:300; letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
@media (prefers-reduced-motion:reduce){
  .nx-sr, .nx-sr-sky, .nx-sr-disc, .nx-sr-horizon{ transition:none; }
}
`,
  body() {
    return `<div class="nx-sr-sky" aria-hidden="true"></div><div class="nx-sr-disc" aria-hidden="true"></div><div class="nx-sr-horizon" aria-hidden="true"></div><div class="nx-sr-in"><time class="nx-t"></time><p class="nx-dt"></p><div class="nx-wx" hidden></div></div>`;
  },
  /* Pure sun/moon position: returns { angle (deg, 0=horizon E, 180=horizon W), pct (0..1 above horizon), palette } */
  srPos(hours) {
    /* hours: 0..24 float */
    /* Sun travels from sunrise ~6h to sunset ~18h; arc peak at 12h */
    const RISE = 6, SET = 18, PEAK = 12;
    const dayLen = SET - RISE;
    /* fraction of day arc: 0 at sunrise, 1 at sunset */
    if (hours >= RISE && hours <= SET) {
      const frac = (hours - RISE) / dayLen; /* 0..1 */
      const angle = frac * 180; /* 0=E horizon, 90=south zenith, 180=W horizon */
      const pct = Math.sin(frac * Math.PI); /* 0 at rise/set, 1 at noon */
      /* palette based on frac */
      let palette;
      if (frac < 0.08 || frac > 0.92) palette = 'dawn';
      else if (frac < 0.15 || frac > 0.85) palette = 'dusk';
      else palette = 'day';
      return { angle, pct, palette, isMoon: false };
    } else {
      /* Night: moon arc from 18h to 30h (next 6h), peak at 24h */
      const h = hours < RISE ? hours + 24 : hours; /* normalize night hours: 18..30 */
      const MRISE = SET, MSET = RISE + 24; /* 18..30 */
      const MPEAK = (MRISE + MSET) / 2; /* 24 */
      const frac = (h - MRISE) / (MSET - MRISE);
      const pct = Math.sin(frac * Math.PI) * 0.7; /* moon goes lower */
      const angle = frac * 180;
      return { angle, pct, palette: 'night', isMoon: true };
    }
  },
  /* Sky palette colours per phase */
  srPalette(palette) {
    if (palette === 'day') return {
      top:    K(30,120,220,1),
      bottom: K(100,180,255,1),
      disc:   K(255,240,180,1),
      glow:   K(255,230,100,.6),
      horiz:  K(200,230,255,.3),
    };
    if (palette === 'dawn') return {
      top:    K(30,40,100,1),
      bottom: K(220,130,60,1),
      disc:   K(255,200,80,1),
      glow:   K(255,150,40,.7),
      horiz:  K(255,160,60,.5),
    };
    if (palette === 'dusk') return {
      top:    K(20,30,80,1),
      bottom: K(200,90,50,1),
      disc:   K(255,160,40,1),
      glow:   K(255,100,30,.7),
      horiz:  K(220,120,60,.5),
    };
    /* night */
    return {
      top:    K(5,8,28,1),
      bottom: K(12,18,50,1),
      disc:   K(230,235,255,1),
      glow:   K(200,210,255,.3),
      horiz:  K(30,40,80,.3),
    };
  },
  draw(root, T, d, rm) {
    root.dataset.rm = rm ? 'true' : 'false';
    const hours = d.getHours() + d.getMinutes() / 60;
    const pos = this.srPos(hours);
    const pal = this.srPalette(pos.palette);
    /* sky CSS vars */
    root.style.setProperty('--sr-top', pal.top);
    root.style.setProperty('--sr-bottom', pal.bottom);
    root.style.setProperty('--sr-disc', pal.disc);
    root.style.setProperty('--sr-glow', pal.glow);
    root.style.setProperty('--sr-horiz', pal.horiz);
    /* Also update the .nx-sr-sky background so the gradient updates */
    const sky = root.querySelector('.nx-sr-sky');
    if (sky) sky.style.background = `linear-gradient(180deg, ${pal.top} 0%, ${pal.bottom} 100%)`;
    /* disc position: x follows angle (0=left horizon 10%, 90=center 50%, 180=right 90%), y follows pct */
    const xPct = 10 + pos.angle / 180 * 80; /* 10%..90% */
    const yPct = 8 + pos.pct * 60; /* 8%..68% from bottom */
    root.style.setProperty('--sr-x', xPct.toFixed(1) + '%');
    root.style.setProperty('--sr-y', yPct.toFixed(1) + '%');
    /* clock */
    const t = root.querySelector('.nx-t');
    if (t) {
      const H_esc = typeof H !== 'undefined' ? H.esc : (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const html = `${H_esc(T.t)}${T.ap ? `<small>${H_esc(T.ap)}</small>` : ''}`;
      if (t.dataset.k !== html) { t.dataset.k = html; t.innerHTML = html; }
    }
  },
});
