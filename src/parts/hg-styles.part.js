/* ===== WSPÓLNE STYLE kart Home Glass (szkło, nagłówek karty, przełącznik, animacje ikon) ===== */
const HG_BASE = U(`
:host{ --k: var(--hg-u, 1.3px); --r-lg:24u; --r-md:16u; --r-sm:12u; --s1:8u; --s2:12u; --s3:16u; --s4:24u; --fs-xs:var(--hg-fs-xs, 8.5u); --fs-sm:var(--hg-fs-sm, 10u); --fs-md:var(--hg-fs-md, 12u); display:block; font-family:'HG DM Sans','DM Sans',-apple-system,system-ui,'Segoe UI',Roboto,sans-serif;
  -webkit-font-smoothing:antialiased; color:#1E2023; height:100%; font-weight:400; }
*{ box-sizing:border-box; }
button{ font:inherit; color:inherit; background:none; border:0; padding:0; margin:0; cursor:pointer; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
button *, [data-act] ha-icon{ pointer-events:none; }
ha-icon{ display:inline-flex; --mdc-icon-size: 100%; }
/* szkło: domyślnie jasnoszare, .warm = kremowo-beżowe jak Energy/AC w projekcie */
ha-card.glass{ position:relative; height:100%; min-height:var(--hg-min-h, 0px); overflow:hidden; border-radius:var(--hg-card-r, 18u);
  /* szkło: przezroczyste wypełnienie + delikatny refleks (135°, biel -> przezroczystość 40%), bez kolorowych gradientów */
  background: var(--hg-glass-lite, var(--hg-glass-bg));
  /* bez własnego backdrop-filter: karta leży na szklanym panelu, który już rozmywa tło (jedno rozmycie zamiast zagnieżdżonych) */
  border:0;
  /* własne rozmycie tylko gdy panel nie ma tła (panel_backdrop: false) */
  -webkit-backdrop-filter: var(--hg-card-bf, none); backdrop-filter: var(--hg-card-bf, none);
  box-shadow: var(--hg-card-sh, 0 6px 20px var(--hg-glass-sh));
  color:#1E2023; padding:var(--s2); contain: layout paint style; }
ha-card.glass.warm{
  background: var(--hg-warm-lite, var(--hg-warm-bg)); }
.hd{ display:flex; align-items:center; gap:var(--s1); min-height:20u; position:relative; z-index:2; }
.hd .ic{ width:12u; height:12u; color:#2A2D31; flex:none; }
.hd .tt{ font-size:var(--fs-md); font-weight:600; letter-spacing:-.005em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hd .tt small{ font-size:var(--fs-xs); font-weight:400; color:#5A5E64; margin-left:4u; }
.hd .sp{ flex:1; }
/* wspólny wiersz listy: min. 44px, odstęp tokenowy, separator 1px między wierszami */
.lr{ display:flex; align-items:center; gap:var(--s2); min-height:max(calc(var(--k) * 34), 44px); padding:var(--s1) 0; }
.lr + .lr{ border-top:1px solid rgba(0,0,0,.06); }
.note{ font-size:var(--fs-xs); color:#8A8E94; white-space:nowrap; }
.ib{ width:30u; height:30u; margin:-5u; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:#1E2023; position:relative; flex:none; }
.ib ha-icon{ width:15u; height:15u; }
/* wspólny hover kafli szklanych: lekkie uniesienie, minimalnie jaśniejsze szkło, mocniejszy miękki cień; tylko mysz (bez „przyklejonego” hovera na dotyku) */
.lift{ transition: transform .16s ease, box-shadow .16s ease; }
.lift::after{ content:''; position:absolute; inset:0; border-radius:inherit; background:var(--hg-hover-fill); opacity:0; transition:opacity .16s ease; pointer-events:none; }
@media (hover:hover) and (pointer:fine){ .lift:hover{ transform:translateY(-2px); box-shadow: var(--hg-sh-hover); } .lift:hover::after{ opacity:1; } }
.ib:hover{ background:rgba(0,0,0,.05); }
.kebab{ width:24u; } .kebab ha-icon{ width:15u; height:15u; }
/* przełącznik jak w projekcie: pomarańczowy włączony, biało-szary wyłączony */
.tg{ position:relative; width:34u; height:20u; border-radius:999px; flex:none; transition: background .25s ease;
  background:rgba(120,120,128,.24); box-shadow:none; }
.tg i{ position:absolute; top:2u; left:2u; width:16u; height:16u; border-radius:50%; background:#fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.2), 0 0 0 .5px rgba(0,0,0,.04); transition: transform .25s cubic-bezier(.3,.7,.3,1); }
.tg.on{ background:var(--hg-accent); box-shadow:0 0 10px var(--hg-accent-glow); }
.tg.on i{ transform: translateX(14u); }
.tg[disabled]{ opacity:.5; cursor:not-allowed; }
@media (pointer:coarse){ .tg::before{ content:''; position:absolute; inset:-13px -6px; } .ib::before{ content:''; position:absolute; inset:-4px; } }
.ph{ display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:3u; height:calc(100% - 24u); color:#6A6E74; font-size:var(--fs-sm); }
.ph b{ font-size:var(--fs-sm); color:#1E2023; font-weight:400; }
@keyframes hgspin{ to{ transform: rotate(360deg); } }
@keyframes hgpulse{ 0%,100%{ transform:scale(1); opacity:1 } 50%{ transform:scale(1.15); opacity:.75 } }
@keyframes hgflick{ 0%,100%{ transform: scale(1) rotate(0) } 25%{ transform: scale(1.1,.94) rotate(-4deg) } 50%{ transform: scale(.95,1.08) rotate(3deg) } 75%{ transform: scale(1.05,.97) rotate(-2deg) } }
@keyframes hgwave{ 0%,100%{ transform: translateX(0) } 50%{ transform: translateX(2u) } }
@keyframes hgglow{ 0%,100%{ filter: drop-shadow(0 0 0 var(--hg-accent-faint)) } 50%{ filter: drop-shadow(0 0 3u var(--hg-accent)) } }
*, *::before, *::after{ animation-play-state: var(--hg-play, running) !important; }
@media (prefers-reduced-motion: reduce){ *{ animation:none !important; transition:none !important; } }
`);
