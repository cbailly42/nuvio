/* ===== Wygaszacz „Szkło” (2.8): dwa warianty na jednym projekcie: Karuzela (karty jadą w poziomie) i Minimal (duży zegar, pogoda, teraz gra).
   Ustawienia w HGL.data.wall: style 'glass', gl = { v ('carousel' | 'minimal'), bg { c1, c2, c3, orb, o1, o2, oi, sph, img, night, nd }, top { date, df, tabs, tl[], av },
   cards [{ id, t, e, n, n2, ic, img, ac, sz ('s' | 'm' | 'l' | 'w'), tap ('sheet' | 'toggle' | 'none'), tb }], car { spd, pause }, min { h12, cs, pos, date, wx, np },
   fam { on, who[], grey }, hint { on, t }, rm ('auto' | 'on') }. Dane użytkownika HA jak reszta „wall”, więc w eksporcie i imporcie układu bez dodatkowego kodu.
   Zegar, data, napis wybudzania i podpis „Rodzina” to zwykły tekst bez tła (DESIGN.md); szklane są tylko karty i arkusz szczegółów.
   Obrazy 3D: nuvio-3d-*.webp w dist (Fluent Emoji 3D, Microsoft, licencja MIT, dist/nuvio-3d-LICENSE.txt). Kolory przez K() i '#' + '…': tokenizer motywu ich nie zmienia. */
const HG_GL_HEX = (s) => '#' + s;
const HG_GL_TYPES = [
  ['weather', 'Pogoda', 'Weather', 'mdi:weather-partly-cloudy', ['weather'], 'l'],
  ['media', 'Multimedia', 'Media', 'mdi:play-circle-outline', ['media_player'], 'm'],
  ['camera', 'Kamera', 'Camera', 'mdi:cctv', ['camera'], 's'],
  ['thermo', 'Termostat', 'Thermostat', 'mdi:thermostat', ['climate'], 's'],
  ['boiler', 'Bojler / CWU', 'Water heater', 'mdi:water-boiler', ['water_heater', 'climate', 'sensor'], 'm'],
  ['energy', 'Energia', 'Energy', 'mdi:lightning-bolt', ['sensor'], 's'],
  ['pv', 'Fotowoltaika', 'Solar', 'mdi:solar-power-variant', ['sensor'], 's'],
  ['car', 'Samochód / EV', 'Car / EV', 'mdi:car-electric', ['sensor', 'device_tracker', 'binary_sensor'], 'm'],
  ['sensor', 'Czujnik', 'Sensor', 'mdi:gauge', ['sensor', 'binary_sensor', 'input_number', 'number'], 's'],
  ['light', 'Światła', 'Lights', 'mdi:lightbulb-group-outline', ['light', 'switch', 'group'], 's'],
  ['scene', 'Scena', 'Scene', 'mdi:palette-outline', ['scene', 'script'], 's'],
  ['person', 'Osoba', 'Person', 'mdi:account-circle-outline', ['person'], 's']];
const HG_GL_IMG = ['sun', 'partly', 'cloud', 'rain', 'storm', 'snow', 'fog', 'moon', 'wind', 'camera', 'thermo', 'car', 'plug', 'bolt', 'battery', 'bulb', 'drop', 'fire', 'hotspring', 'sparkles', 'person', 'music', 'house', 'speaker', 'gauge', 'snowflake'];
const HG_GL_DEFIMG = { weather: '', media: 'music', camera: 'camera', thermo: 'thermo', boiler: 'hotspring', energy: 'bolt', pv: 'sun', car: 'car', sensor: 'gauge', light: 'bulb', scene: 'sparkles', person: 'person' };
const HG_GL_WX = { 'clear-night': 'moon', cloudy: 'cloud', exceptional: 'storm', fog: 'fog', hail: 'snow', lightning: 'storm', 'lightning-rainy': 'storm', partlycloudy: 'partly', pouring: 'rain', rainy: 'rain', snowy: 'snow', 'snowy-rainy': 'snow', sunny: 'sun', windy: 'wind', 'windy-variant': 'wind' };
const HG_GL_WI = { 'clear-night': 'mdi:weather-night', cloudy: 'mdi:weather-cloudy', exceptional: 'mdi:alert-circle-outline', fog: 'mdi:weather-fog', hail: 'mdi:weather-hail', lightning: 'mdi:weather-lightning', 'lightning-rainy': 'mdi:weather-lightning-rainy', partlycloudy: 'mdi:weather-partly-cloudy', pouring: 'mdi:weather-pouring', rainy: 'mdi:weather-rainy', snowy: 'mdi:weather-snowy', 'snowy-rainy': 'mdi:weather-snowy-rainy', sunny: 'mdi:weather-sunny', windy: 'mdi:weather-windy', 'windy-variant': 'mdi:weather-windy-variant' };
const HG_GL_SS3 = `
.ng-bg:not(.im){ background:${K(14,16,20,1)} var(--gbg, none) var(--gbgp, 50% 50%) / cover no-repeat; }
.ng-bg:not(.im)::after{ content:''; position:absolute; inset:0; background:${K(14,16,20,.26)}; } .ng-bg:not(.im)::before{ content:''; position:absolute; inset:0; z-index:1; background:${K(6,8,12,1)}; opacity:var(--gdim, 0); }
.ng-sp{ display:none !important; }
.ng .ng-c{ background:none !important; box-shadow:none !important; border:0 !important; padding:0 !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; border-radius:var(--hg-r, 24px); overflow:visible; }
.ng .ng-c::before, .ng .ng-c::after{ display:none !important; }
.ng .ng-car{ display:flex; align-items:center; justify-content:flex-start; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x mandatory; scroll-padding-inline:var(--gpad, 40px); scrollbar-width:none; overscroll-behavior-x:contain; scroll-behavior:smooth; left:var(--gpad, 40px) !important; right:var(--gpad, 40px) !important; scroll-padding-inline:0; padding-block:48px; margin-block:-48px; box-sizing:content-box; }
.ng .ng-car::-webkit-scrollbar{ display:none; }
.ng .ng-trk{ position:relative; display:block; height:100%; width:var(--gtw, 100%); padding:0; animation:none !important; }
.ng .ng-pg{ position:absolute; top:0; bottom:0; width:var(--gpw, 100%); scroll-snap-align:start; pointer-events:none; }
.ng .ng-c{ position:absolute; left:0; top:0; height:auto !important; max-height:none; min-height:0; container-type:normal; display:block; outline:0 !important; }
.ng .ng-c:not(.lo){ visibility:hidden; }
.ng .ng-tile{ position:relative; display:block; padding:0 !important; } .ng .ng-tile > *{ display:block; width:100%; --hg-accent:${HG_GL_HEX('63D71E')}; }
.ng-dt, .ng .nw-h, .ng-mt, .ng-md, .ng-mw, .ng-mp{ background:none !important; box-shadow:none !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; text-shadow:0 1px 12px ${K(0,0,0,.35)}; }
.ng-wi{ display:grid; place-items:center; width:1.6em; height:1.6em; font-style:normal; } .ng-wi ha-icon{ --mdc-icon-size:1.4em; color:${HG_GL_HEX('63D71E')}; }
`;
const HG_GL_ACC = [['', 'Domyślny', 'Default'], [HG_GL_HEX('7CC8C8'), 'Morski', 'Teal'], [HG_GL_HEX('E8D8EE'), 'Lila', 'Lilac'], [HG_GL_HEX('2C2953'), 'Granat', 'Navy'], [HG_GL_HEX('FFB86B'), 'Bursztyn', 'Amber'], [HG_GL_HEX('8EC5FF'), 'Błękit', 'Sky'], [HG_GL_HEX('F49AC2'), 'Róż', 'Pink'], [HG_GL_HEX('63D71E'), 'Limonka', 'Lime']];
const HG_GL_SS = `
.ng{ position:absolute; inset:0; overflow:hidden; color:${K(255,255,255,1)}; font-family:'DM Sans','HG DM Sans',system-ui,sans-serif; --u:min(calc(100vw / 1280), calc(100vh / 680)); --rad:24; }
@media (orientation:portrait){ .ng{ --u:min(calc(100vw / 560), calc(100vh / 900)); } }
.ng.pv{ --u:var(--pu, .4px); }
.ng-bg{ position:absolute; inset:0; background:radial-gradient(calc(520 * var(--u)) calc(300 * var(--u)) at 96% 48%, color-mix(in srgb, var(--c2) 70%, ${K(120,130,190,.5)}), transparent 70%),
  radial-gradient(calc(700 * var(--u)) calc(360 * var(--u)) at 4% 104%, var(--c3) 0%, color-mix(in srgb, var(--c3) 70%, transparent) 35%, transparent 75%), linear-gradient(180deg, var(--c1) 0%, color-mix(in srgb, var(--c1) 55%, var(--c2)) 55%, var(--c2) 100%);
  filter:brightness(var(--nd, 1)); transition:filter 2s ease; }
.ng-bg.im{ background:center/cover no-repeat var(--im); } .ng-bg.im::after{ content:''; position:absolute; inset:0; background:${K(6,8,20,.35)}; }
.ng-sp{ position:absolute; right:calc(-160 * var(--u)); top:calc(150 * var(--u)); width:calc(420 * var(--u)); height:calc(420 * var(--u)); border-radius:50%; opacity:var(--oi);
  background:radial-gradient(circle at 30% 38%, color-mix(in srgb, var(--o2) 80%, ${K(255,255,255,.4)}), var(--o2) 45%, color-mix(in srgb, var(--o2) 60%, ${K(30,20,70,1)}) 85%); filter:brightness(var(--nd, 1)); }
.ng-orb{ position:absolute; left:calc(38 * var(--u)); bottom:calc(16 * var(--u)); width:calc(70 * var(--u)); height:calc(70 * var(--u)); border-radius:50%; opacity:calc(.35 + var(--oi) * .65); z-index:2;
  background:radial-gradient(circle at 35% 30%, ${K(255,255,255,.95)}, transparent 42%), conic-gradient(from 0deg, var(--o1), var(--o2), ${K(120,230,255,1)}, var(--o1));
  box-shadow:0 0 calc(30 * var(--u) * var(--oi)) color-mix(in srgb, var(--o1) 60%, transparent), inset 0 0 calc(12 * var(--u)) ${K(255,255,255,.4)}; animation:ngorb 9s linear infinite; }
@keyframes ngorb{ to{ transform:rotate(360deg); } }
.ng-top{ position:absolute; left:0; right:0; top:0; height:calc(124 * var(--u)); pointer-events:none; text-shadow:0 1px 3px ${K(0,0,0,.45)}, 0 2px 18px ${K(0,0,0,.35)}; z-index:1; }
.ng-dt{ position:absolute; left:calc(44 * var(--u)); top:calc(46 * var(--u)); font-size:calc(25 * var(--u)); font-weight:400; letter-spacing:.005em; white-space:nowrap; }
.ng-dt::first-letter{ text-transform:uppercase; }
.ng-tb{ position:absolute; left:50%; transform:translateX(-50%); top:calc(39 * var(--u)); display:flex; align-items:center; gap:calc(44 * var(--u)); pointer-events:auto; max-width:calc(100% - 300 * var(--u)); overflow-x:auto; scrollbar-width:none; }
.ng-tb::-webkit-scrollbar{ display:none; }
.ng-tb > i{ flex:none; width:calc(46 * var(--u)); height:calc(46 * var(--u)); border-radius:50%; box-shadow:inset 0 0 0 1.5px ${K(255,255,255,.28)}; display:grid; place-items:center; margin-right:calc(-16 * var(--u)); }
.ng-tb > i ha-icon{ --mdc-icon-size:calc(16 * var(--u)); width:calc(16 * var(--u)); height:calc(16 * var(--u)); }
.ng-tb button{ all:unset; cursor:pointer; flex:none; font-size:calc(21 * var(--u)); font-weight:400; color:${K(255,255,255,.55)}; white-space:nowrap; min-height:calc(46 * var(--u)); display:flex; align-items:center; }
.ng-tb button[aria-pressed=true]{ color:${K(255,255,255,1)}; font-weight:500; }
.ng-av{ display:grid; place-items:center; font-style:normal; font-size:calc(17 * var(--u)); font-weight:600; position:absolute; right:calc(48 * var(--u)); top:calc(42 * var(--u)); width:calc(40 * var(--u)); height:calc(40 * var(--u)); border-radius:50%; background:center/cover ${K(255,255,255,.18)}; box-shadow:0 2px 10px ${K(0,0,0,.3)}; }
.ng-fam{ position:absolute; right:calc(48 * var(--u)); bottom:calc(32 * var(--u)); display:flex; align-items:center; gap:calc(24 * var(--u)); font-size:calc(20 * var(--u)); font-weight:500; text-shadow:0 1px 3px ${K(0,0,0,.5)}, 0 2px 14px ${K(0,0,0,.4)}; }
.ng-fam > span{ display:flex; gap:calc(15 * var(--u)); }
.ng-fam i{ width:calc(40 * var(--u)); height:calc(40 * var(--u)); border-radius:50%; background:center/cover ${K(255,255,255,.2)}; box-shadow:0 0 0 calc(2 * var(--u)) ${K(255,255,255,.75)}; display:grid; place-items:center; font-style:normal; font-size:calc(15 * var(--u)); font-weight:600; transition:filter .6s ease; }
.ng-fam i.aw{ filter:grayscale(1) brightness(.7); }
.ng .nw-h{ bottom:calc(10 * var(--u) + env(safe-area-inset-bottom, 0px)); font-size:calc(15 * var(--u)); z-index:1; }
.ng.nh .nw-h{ display:none; }
.ng-st{ position:absolute; inset:0; transition:transform .5s cubic-bezier(.2,.8,.2,1), filter .5s ease; transform-origin:50% 40%; }
.ng.so .ng-st{ transform:scale(.97); filter:brightness(.62); }
.ng-car{ position:absolute; left:0; right:0; top:calc(123 * var(--u)); height:calc(100% - 264 * var(--u)); overflow:hidden;  }
.ng-trk{ display:flex; gap:calc(18 * var(--u)); width:max-content; padding-left:calc(55 * var(--u)); height:100%; animation:ngroll var(--dur, 80s) linear infinite; }
.ng-trk.off{ animation:none; } .ng-car.hold .ng-trk{ animation-play-state:paused; }
@keyframes ngroll{ to{ transform:translateX(calc(-50% - 9 * var(--u))); } }
.ng-col{ display:flex; flex-direction:column; gap:calc(18 * var(--u)); height:100%; }
.ng-c{ position:relative; flex:none; box-sizing:border-box; border-radius:calc(var(--rad) * var(--u)); overflow:hidden; container-type:size; cursor:pointer; -webkit-tap-highlight-color:transparent; touch-action:manipulation;
  background:linear-gradient(170deg, color-mix(in srgb, var(--ac, ${K(54,50,95,1)}) 92%, ${K(255,255,255,1)}) 0%, var(--ac, ${K(44,41,83,1)}) 45%, color-mix(in srgb, var(--ac, ${K(42,33,67,1)}) 85%, ${K(0,0,0,1)}) 100%);
  box-shadow:inset 0 1px 0 ${K(255,255,255,.12)}, inset 0 0 0 1px ${K(255,255,255,.05)}, 0 calc(14 * var(--u)) calc(40 * var(--u)) ${K(0,0,0,.28)}; transition:transform .2s ease; }
.ng-c:active{ transform:scale(.98); } .ng-c:focus-visible{ outline:2px solid ${K(255,255,255,.9)}; outline-offset:3px; }
.ng-c.s{ width:calc(225 * var(--u)); height:calc(50% - 9 * var(--u)); } .ng-c.m{ width:calc(360 * var(--u)); height:100%; } .ng-c.l{ width:calc(380 * var(--u)); height:100%; } .ng-c.w{ width:calc(560 * var(--u)); height:100%; }
.ng-c.na{ opacity:.55; }
.ng-ci{ position:absolute; inset:0; font-size:min(calc(100cqw / 36), calc(100cqh / 41.5)); }
.ng-c.s .ng-ci{ font-size:min(calc(100cqw / 22.5), calc(100cqh / 19.9)); }
.ng-c.w .ng-ci{ font-size:min(calc(100cqw / 56), calc(100cqh / 41.5)); }
.ng-c.l .ng-ci{ font-size:min(calc(100cqw / 38), calc(100cqh / 41.5)); }
.ng-ci h3{ position:absolute; left:1em; top:.88em; right:.6em; margin:0; font-size:3.4em; line-height:1.12; font-weight:300; white-space:nowrap; }
.ng-ci h3 b{ display:block; font-weight:700; overflow:hidden; text-overflow:ellipsis; } .ng-ci h3 span{ display:block; overflow:hidden; text-overflow:ellipsis; }
.ng-c.s .ng-ci h3{ font-size:1.9em; left:.95em; top:.8em; right:45%; white-space:normal; }
.ng-im{ position:absolute; object-fit:contain; filter:drop-shadow(0 1.6em 1.6em ${K(0,0,0,.45)}); pointer-events:none; user-select:none; }
.ng-ics{ position:absolute; left:3.4em; top:12.2em; display:flex; gap:1.4em; }
.ng-ics i{ width:5.5em; height:5.5em; border-radius:50%; box-shadow:inset 0 0 0 1.3px ${K(255,255,255,.3)}; display:grid; place-items:center; font-style:normal; }
.ng-ics i.on{ background:${K(255,255,255,.16)}; } .ng-ics ha-icon{ --mdc-icon-size:1.9em; width:1.9em; height:1.9em; }
.ng-bar{ position:absolute; left:4.2em; right:3.4em; bottom:7.3em; height:.4em; border-radius:.2em; background:${K(255,255,255,.12)}; }
.ng-bar i{ position:absolute; left:0; top:0; bottom:0; border-radius:inherit; background:linear-gradient(90deg, ${K(43,127,208,1)}, ${K(74,163,240,1)}); transition:width .8s ease; }
.ng-ft{ position:absolute; left:4.2em; bottom:2.5em; display:flex; align-items:center; gap:.6em; font-size:1.9em; font-weight:700; white-space:nowrap; } .ng-ft small{ font-weight:400; } .ng-ft ha-icon{ --mdc-icon-size:1em; width:1em; height:1em; }
.ng-pl{ position:absolute; right:4.2em; bottom:2.55em; height:2em; padding:0 1.2em; border-radius:1em; background:${K(255,255,255,1)}; color:${K(29,27,51,1)}; font-size:.85em; font-weight:700; letter-spacing:.06em; display:flex; align-items:center; text-transform:uppercase; white-space:nowrap; }
.ng-c.s .ng-ft{ left:.95em; bottom:.75em; font-size:2.6em; font-weight:300; } .ng-c.s .ng-ft ha-icon{ display:none; } .ng-c.s .ng-pl{ right:1.4em; bottom:1.5em; font-size:1.1em; } .ng-c.s .ng-bar{ left:1.4em; right:1.4em; bottom:5.4em; }
.ng-emp{ position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; padding:0 1.6em; gap:.4em; } .ng-emp b{ font-size:1.8em; } .ng-emp small{ font-size:1.3em; opacity:.7; }
.ng-c.t-weather{ background:none; box-shadow:none; overflow:visible; }
.t-weather .ng-im{ left:0; top:1.6em; width:23em; height:15em; object-position:left top; filter:drop-shadow(0 1.2em 1.4em ${K(0,0,0,.35)}); z-index:0; }
.ng-pill{ position:absolute; left:13.5em; top:12.8em; width:19.5em; height:28.2em; border-radius:9.8em 9.8em 6.2em 6.2em; z-index:1;
  background:linear-gradient(180deg, ${K(175,182,205,.62)} 0%, ${K(110,112,160,.32)} 22%, ${K(60,52,120,.2)} 55%, ${K(52,40,110,.28)} 100%); box-shadow:inset 0 0 0 1px ${K(255,255,255,.16)}, inset 0 1px 0 ${K(255,255,255,.25)};
  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); }
.ng-pill b{ position:absolute; left:.31em; top:.58em; font-size:9.2em; font-weight:200; line-height:1; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.ng-pill b sup{ position:absolute; top:.04em; right:-.17em; width:.12em; height:.12em; border:.02em solid currentColor; border-radius:50%; font-size:1em; }
.ng-pill p{ position:absolute; left:1.5em; right:1em; top:7.85em; margin:0; font-size:2em; font-weight:700; line-height:1.25; }
.ng-pill small{ position:absolute; left:2em; right:1em; top:14.4em; font-size:1.5em; font-weight:500; opacity:.72; }
.ng-fc{ position:absolute; left:36em; right:1.5em; top:14em; display:grid; grid-template-columns:repeat(3, 1fr); gap:.4em; font-size:1.6em; text-align:center; }
.ng-fc span{ display:flex; flex-direction:column; opacity:.85; } .ng-fc b{ font-size:1.3em; font-weight:600; }
.ng-c.s.t-weather .ng-ci{ font-size:min(calc(100cqw / 38), calc(100cqh / 41.5)); }
.t-media .ng-art{ position:absolute; left:0; right:0; top:0; height:58%; background:center/cover no-repeat var(--art, none), linear-gradient(160deg, ${K(64,72,140,1)}, ${K(30,36,80,1)}); }
.t-media .ng-art.no{ display:grid; place-items:center; } .t-media .ng-art.no img{ width:40%; }
.t-media .ng-pn{ position:absolute; left:0; right:0; top:53.5%; bottom:0; background:linear-gradient(180deg, ${K(104,102,138,.96)}, ${K(58,58,96,.97)} 55%, ${K(48,49,86,.98)}); }
.t-media h4{ position:absolute; left:2.5em; right:5em; top:1.8em; margin:0; font-size:2.1em; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.t-media .ng-ar{ position:absolute; left:2.5em; right:5em; top:4.4em; font-size:1.6em; font-weight:500; opacity:.45; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.t-media .ng-ht{ position:absolute; right:2.6em; top:2.6em; } .t-media .ng-ht ha-icon{ --mdc-icon-size:2.2em; width:2.2em; height:2.2em; }
.t-media .ng-pr{ position:absolute; left:2.5em; right:2.5em; top:9.8em; height:1px; background:${K(255,255,255,.18)}; } .t-media .ng-pr i{ position:absolute; left:0; top:0; height:1px; background:${K(255,255,255,1)}; }
.t-media .ng-pr b{ position:absolute; top:-.5em; width:1.1em; height:1.1em; margin-left:-.55em; border-radius:50%; background:${K(255,255,255,1)}; }
.t-media .ng-ct{ position:absolute; left:0; right:0; top:11.6em; display:flex; justify-content:center; align-items:center; gap:5.2em; }
.t-media .ng-ct button{ all:unset; cursor:pointer; display:grid; place-items:center; } .t-media .ng-ct ha-icon{ --mdc-icon-size:2.4em; width:2.4em; height:2.4em; }
.t-media .ng-ct .pp{ width:5.8em; height:5.8em; border-radius:50%; background:${K(255,255,255,1)}; color:${K(29,28,51,1)}; }
.ng-c.s.t-media .ng-art{ height:100%; } .ng-c.s.t-media .ng-pn{ top:auto; height:46%; } .ng-c.s.t-media .ng-ct, .ng-c.s.t-media .ng-pr, .ng-c.s.t-media .ng-ht{ display:none; }
.ng-c.s.t-media h4{ top:.9em; left:1.2em; right:1.2em; font-size:1.7em; } .ng-c.s.t-media .ng-ar{ top:3.6em; left:1.5em; right:1.5em; font-size:1.3em; }

.t-camera .ng-im{ left:24%; top:4%; width:60%; height:64%; } .t-camera .ng-snap{ position:absolute; inset:0; background:center/cover no-repeat var(--snap); }
.ng-bd{ position:absolute; left:1.8em; bottom:1.6em; right:1em; display:flex; gap:1.2em; }
.ng-bd span{ height:2.2em; padding:0 1em; border-radius:1.1em; background:${K(244,246,247,1)}; color:${K(110,124,135,1)}; font-size:.95em; font-weight:700; letter-spacing:.06em; display:flex; align-items:center; text-transform:uppercase; white-space:nowrap; overflow:hidden; }
.ng-bd span.al{ color:${K(220,60,60,1)}; }

.ng-dial{ position:absolute; right:6%; top:15%; width:min(64cqw, 74cqh); aspect-ratio:1; border-radius:50%;
  background:conic-gradient(from 200deg, ${K(250,250,252,1)}, ${K(150,152,160,1)} 20%, ${K(235,236,240,1)} 45%, ${K(120,122,130,1)} 70%, ${K(250,250,252,1)}); box-shadow:0 1.4em 2.6em ${K(60,40,90,.35)}, inset 0 0 0 .2em ${K(255,255,255,.6)}; }
.ng-dial::before{ content:''; position:absolute; inset:9%; border-radius:50%; background:radial-gradient(circle at 40% 35%, ${K(52,52,60,1)}, ${K(14,14,18,1)} 70%); box-shadow:inset 0 .3em .9em ${K(0,0,0,.6)}; }
.ng-dial::after{ content:''; position:absolute; inset:9%; border-radius:50%; background:conic-gradient(from 225deg, var(--rc) 0 calc(var(--pc, 0) * .75%), transparent 0); -webkit-mask:radial-gradient(farthest-side, transparent calc(100% - .45em), ${K(0,0,0,1)} calc(100% - .4em)); mask:radial-gradient(farthest-side, transparent calc(100% - .45em), ${K(0,0,0,1)} calc(100% - .4em)); }
.ng-dial b{ position:absolute; inset:0; display:grid; place-items:center; color:${K(255,255,255,1)}; font-size:2.7em; font-weight:500; font-variant-numeric:tabular-nums; z-index:1; }
.ng-dial ha-icon{ position:absolute; left:50%; bottom:20%; transform:translateX(-50%); --mdc-icon-size:1.2em; width:1.2em; height:1.2em; color:${K(110,220,90,1)}; z-index:1; }


.t-boiler .ng-im, .t-car .ng-im, .t-pv .ng-im, .t-energy .ng-im, .t-sensor .ng-im, .t-light .ng-im, .t-scene .ng-im{ left:28%; top:41%; width:46%; height:30%; }
.t-car .ng-im{ left:6%; width:92%; }
.ng-c.s .ng-im{ left:auto; right:6%; top:10%; width:40%; height:44%; } .ng-c.s .ng-ics{ display:none; }
.ng-c.w .ng-im{ left:48%; top:12%; width:48%; height:70%; } .ng-c.w .ng-bar{ right:55%; } .ng-c.w .ng-pl{ right:auto; left:30em; }
.t-person .ng-ph{ position:absolute; left:50%; top:12%; width:40%; aspect-ratio:1; transform:translateX(-50%); border-radius:50%; background:center/cover var(--ph, none), ${K(255,255,255,.18)}; box-shadow:0 0 0 .3em ${K(255,255,255,.75)}; display:grid; place-items:center; font-size:3em; font-weight:600; }
.t-person.aw .ng-ph{ filter:grayscale(1) brightness(.75); }
.t-person .ng-pn2{ position:absolute; left:0; right:0; bottom:1.2em; text-align:center; } .t-person .ng-pn2 b{ display:block; font-size:1.9em; font-weight:600; } .t-person .ng-pn2 small{ font-size:1.3em; opacity:.7; }
.ng-c.t-light.on, .ng-c.t-scene.on{ box-shadow:inset 0 0 0 1.5px ${K(255,220,140,.6)}, 0 0 calc(40 * var(--u)) ${K(255,200,100,.25)}; }
.ng-mn{ position:absolute; left:calc(72 * var(--u)); top:50%; transform:translateY(-50%); text-shadow:0 2px 6px ${K(0,0,0,.35)}, 0 4px 40px ${K(0,0,0,.4)}; max-width:calc(100% - 140 * var(--u)); }
.ng-mn.c{ left:50%; transform:translate(-50%, -50%); text-align:center; } .ng-mn.c .ng-mw, .ng-mn.c .ng-mp{ justify-content:center; }
.ng-mt{ font-size:calc(190 * var(--u) * var(--cs, 1)); font-weight:200; letter-spacing:-.04em; line-height:1; font-variant-numeric:tabular-nums; white-space:nowrap; } .ng-mt small{ font-size:.25em; font-weight:400; letter-spacing:0; margin-left:.2em; }
.ng-md{ margin-top:calc(14 * var(--u)); font-size:calc(25 * var(--u) * max(1, var(--cs, 1) * .8)); font-weight:400; opacity:.85; } .ng-md::first-letter{ text-transform:uppercase; }
.ng-mw{ display:flex; align-items:center; gap:calc(16 * var(--u)); margin-top:calc(30 * var(--u)); } .ng-mw img{ width:calc(84 * var(--u)); height:calc(84 * var(--u)); object-fit:contain; filter:drop-shadow(0 6px 16px ${K(0,0,0,.35)}); }
.ng-mw b{ display:block; font-size:calc(46 * var(--u)); font-weight:300; } .ng-mw small{ font-size:calc(17 * var(--u)); opacity:.8; }
.ng-mp{ display:flex; align-items:center; gap:calc(14 * var(--u)); margin-top:calc(26 * var(--u)); } .ng-mp i{ flex:none; width:calc(52 * var(--u)); height:calc(52 * var(--u)); border-radius:calc(14 * var(--u)); background:center/cover ${K(255,255,255,.15)}; box-shadow:0 6px 18px ${K(0,0,0,.35)}; }
.ng-mp b{ display:block; font-size:calc(17 * var(--u)); font-weight:600; max-width:calc(520 * var(--u)); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .ng-mp small{ font-size:calc(14 * var(--u)); opacity:.6; }
@media (orientation:portrait){
  .ng-tb{ left:calc(24 * var(--u)); right:calc(24 * var(--u)); transform:none; top:calc(104 * var(--u)); max-width:none; gap:calc(30 * var(--u)); }
  .ng-tb > i{ display:none; } .ng-car{ top:calc(200 * var(--u)); height:calc(100% - 380 * var(--u)); } .ng-trk{ padding-left:calc(28 * var(--u)); --edge:calc(28 * var(--u)); }
  .ng-c.m{ width:calc(440 * var(--u)); } .ng-c.l{ width:calc(470 * var(--u)); } .ng-c.w{ width:calc(600 * var(--u)); } .ng-c.s{ width:calc(300 * var(--u)); }
  .ng-fam{ right:auto; left:50%; transform:translateX(-50%); bottom:calc(70 * var(--u)); } .ng-mn{ left:calc(36 * var(--u)); top:44%; } .ng-mn.c{ left:50%; }
  .ng-mt{ font-size:calc(170 * var(--u) * var(--cs, 1)); } .ng-dt{ left:calc(28 * var(--u)); } .ng-av{ right:calc(28 * var(--u)); } .ng-orb{ bottom:calc(70 * var(--u)); left:calc(26 * var(--u)); }
}
.ng-sh{ position:absolute; left:0; right:0; top:calc(156 * var(--u)); bottom:0; border-radius:calc(52 * var(--u)) calc(52 * var(--u)) 0 0; overflow:hidden; z-index:5; font-size:calc(10 * var(--u)); cursor:default;
  background:radial-gradient(60em 38em at 26% 18%, ${K(98,94,128,.5)}, transparent 70%), radial-gradient(70em 42em at 78% 40%, ${K(92,90,124,.55)}, transparent 70%), linear-gradient(180deg, ${K(59,56,89,1)}, ${K(54,51,79,1)} 45%, ${K(43,40,67,1)});
  box-shadow:0 -10px 40px ${K(0,0,0,.35)}, inset 0 1px 0 ${K(255,255,255,.12)}; transform:translateY(105%); transition:transform .45s cubic-bezier(.3,.7,.3,1); }
.ng.so .ng-sh{ transform:none; }
.ng-sh h2{ position:absolute; left:1.5em; top:.52em; margin:0; font-size:5em; line-height:1.12; font-weight:300; max-width:60%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .ng-sh h2 b{ display:block; font-weight:700; overflow:hidden; text-overflow:ellipsis; }
.ng-sh .ng-ics{ left:auto; right:16em; top:4.4em; } .ng-sh .ng-ics i{ width:6em; height:6em; }
.ng-shx{ all:unset; cursor:pointer; position:absolute; right:7em; top:4.4em; width:4.4em; height:4.4em; display:grid; place-items:center; border-radius:50%; }
.ng-shx:focus-visible{ outline:2px solid ${K(255,255,255,.9)}; } .ng-shx ha-icon{ --mdc-icon-size:3em; width:3em; height:3em; }
.ng-sa{ position:absolute; left:5.17em; top:13.9em; font-size:1.45em; line-height:1.35; opacity:.9; max-width:34em; }
.ng-sv{ position:absolute; left:1.79em; top:6.7em; font-size:4.2em; font-weight:700; letter-spacing:-.01em; } .ng-sv small{ font-weight:400; font-size:.95em; }
.ng-sd{ position:absolute; left:7.5em; width:47em; top:35.2em; height:1px; background:${K(255,255,255,.16)}; }
.ng-ss{ position:absolute; left:4.69em; top:23.1em; display:flex; gap:4.5em; font-size:1.6em; font-weight:700; } .ng-ss small{ font-weight:400; opacity:.85; }
.ng-sb{ position:absolute; left:6.6em; top:41.9em; width:41.8em; height:3em; border-radius:1.5em; background:${K(28,23,47,1)}; }
.ng-sb i{ position:absolute; left:0; top:0; bottom:0; border-radius:inherit; background:linear-gradient(90deg, ${K(24,128,176,1)}, ${K(58,167,220,1)} 70%, ${K(102,195,238,1)}); }
.ng-sb b{ position:absolute; top:.7em; height:1.6em; width:4.4em; margin-left:-5em; border-radius:.8em; background:${K(37,52,88,1)}; font-size:.85em; font-weight:600; display:grid; place-items:center; }
.ng-sh .ng-im{ left:64em; top:10em; width:40em; height:34em; filter:drop-shadow(0 3em 3em ${K(0,0,0,.5)}); }
.ng-sh .ng-snapb{ position:absolute; left:58em; top:9em; width:56em; height:32em; border-radius:2.4em; background:center/cover no-repeat var(--snap), ${K(0,0,0,.3)}; }
@media (orientation:portrait){ .ng-sh{ top:calc(240 * var(--u)); font-size:calc(11 * var(--u)); } .ng-sh h2{ left:.8em; max-width:70%; } .ng-sh .ng-ics{ left:4em; right:auto; top:15em; } .ng-sh .ng-shx{ right:3em; }
  .ng-sh .ng-im, .ng-sh .ng-snapb{ left:auto; right:3em; top:auto; bottom:4em; width:22em; height:22em; } .ng-sd{ left:4em; top:36em; width:24em; } .ng-sa{ left:2.76em; top:15.9em; } .ng-sv{ left:.95em; top:6.9em; } .ng-ss{ left:2.5em; top:23.4em; gap:2em; } .ng-sb{ left:3.6em; width:26em; top:43em; } }
@media (prefers-reduced-motion:reduce){ .ng-orb, .ng-trk{ animation:none; } .ng-st, .ng-sh, .ng-bar i{ transition:opacity .2s ease; } .ng-sh{ transform:none; opacity:0; pointer-events:none; } .ng.so .ng-sh{ opacity:1; pointer-events:auto; } }
.ng.rm .ng-orb, .ng.rm .ng-trk{ animation:none; } .ng.rm .ng-st, .ng.rm .ng-sh{ transition:opacity .2s ease; } .ng.rm .ng-sh{ transform:none; opacity:0; pointer-events:none; } .ng.rm.so .ng-sh{ opacity:1; pointer-events:auto; }
`;
Object.assign(HGWall, {
  /* ---- ustawienia wariantu „Szkło” (wall.gl), zawsze znormalizowane ---- */
  gget() { const w = (window.__hgL && window.__hgL.data && window.__hgL.data.wall) || {}, g = w.gl && typeof w.gl === 'object' ? w.gl : {}, o = (x) => (x && typeof x === 'object' ? x : {});
    const n = (v, a, b, d) => { v = Number(v); return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; }, col = (v, d) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d);
    const tx = (v, m, d) => (typeof v === 'string' ? v.replace(/[<>]/g, '').slice(0, m) : d), url = (v) => (typeof v === 'string' && /^(\/|https?:\/\/)/.test(v) && !/[\s"'()<>\\]/.test(v) ? v : '');
    const bg = o(g.bg), tp = o(g.top), cr = o(g.car), mn = o(g.min), fm = o(g.fam), hi = o(g.hint);
    const tl0 = [hgTr('Wszystko', 'All'), hgTr('Klimat', 'Climate'), hgTr('Multimedia', 'Media'), hgTr('Energia', 'Energy')], tl = Array.isArray(tp.tl) ? tp.tl.slice(0, 6).map((x, i) => tx(x, 24, tl0[i] || '')) : tl0;
    const card = (c) => { c = o(c); const T = HG_GL_TYPES.find((x) => x[0] === c.t); if (!T) return null;
      return { id: typeof c.id === 'string' && /^[a-z0-9]{1,12}$/.test(c.id) ? c.id : Math.random().toString(36).slice(2, 8), t: T[0], e: typeof c.e === 'string' && /^[a-z_]+\.[a-z0-9_]+$/.test(c.e) ? c.e : '',
        n: tx(c.n, 40, ''), n2: tx(c.n2, 40, ''), ic: typeof c.ic === 'string' && /^[a-z]+:[a-z0-9-]+$/.test(c.ic) ? c.ic : '', img: HG_GL_IMG.includes(c.img) || c.img === '-' ? c.img : url(c.img),
        ac: col(c.ac, ''), sz: ['s', 'm', 'l', 'w'].includes(c.sz) ? c.sz : T[5], tap: ['sheet', 'toggle', 'none'].includes(c.tap) ? c.tap : 'sheet', tb: n(c.tb, 0, 5, 0) | 0, pw: typeof c.pw === 'string' && /^sensor\.[a-z0-9_]+$/.test(c.pw) ? c.pw : '' }; };
    return { v: g.v === 'minimal' ? 'minimal' : 'carousel',   /* zapisane 'bento' (usunięte w 2.8) przechodzi na Karuzelę */
      bg: { c1: col(bg.c1, HG_GL_HEX('101529')), c2: col(bg.c2, HG_GL_HEX('2a1563')), c3: col(bg.c3, HG_GL_HEX('2d355d')), orb: bg.orb !== false, o1: col(bg.o1, HG_GL_HEX('8a6bff')), o2: col(bg.o2, HG_GL_HEX('4f7dff')), oi: n(bg.oi, 0, 1, 0.7),
        sph: bg.sph === true, orbA: bg.orbA !== false, img: url(bg.img), night: bg.night !== false, nd: n(bg.nd, 0, 0.8, 0.4) },
      top: { date: tp.date !== false, df: ['long', 'short', 'num'].includes(tp.df) ? tp.df : 'long', tabs: tp.tabs !== false, tl: tl.length ? tl : tl0, av: tp.av !== false },
      cards: Array.isArray(g.cards) ? g.cards.slice(0, 24).map(card).filter(Boolean) : null,
      car: { spd: [0, 40, 80, 140].includes(Number(cr.spd)) ? Number(cr.spd) : 80, pause: cr.pause !== false },
      min: { h12: ['auto', '24', '12'].includes(mn.h12) ? mn.h12 : 'auto', cs: n(mn.cs, 0.6, 1.4, 1), pos: mn.pos === 'center' ? 'center' : 'left', date: mn.date !== false, wx: mn.wx !== false, np: mn.np !== false },
      fam: { on: fm.on !== false, who: Array.isArray(fm.who) ? fm.who.filter((x) => typeof x === 'string' && /^person\.[a-z0-9_]+$/.test(x)) : [], grey: fm.grey !== false },
      hint: { on: hi.on !== false, t: tx(hi.t, 60, '') }, rm: g.rm === 'on' ? 'on' : 'auto' }; },
  gset(p) { const G = this.gget(), w = (HGL.data && HGL.data.wall) || {}, raw = w.gl && typeof w.gl === 'object' ? w.gl : {};
    const nx = Object.assign({}, raw, { v: G.v }); for (const k of Object.keys(p)) nx[k] = p[k] && typeof p[k] === 'object' && !Array.isArray(p[k]) ? Object.assign({}, G[k], p[k]) : p[k];
    this.set({ gl: nx }); if (this.active && this.el && this.el.classList.contains('gl')) this.gl(true); },
  glass() { const w = (window.__hgL && window.__hgL.data && window.__hgL.data.wall) || {}; return w.style === 'glass'; },
  /* karty domyślne, gdy użytkownik jeszcze nic nie ułożył: po jednej encji z każdego rodzaju, który jest w HA */
  gauto(h) { const S = (h && h.states) || {}, ids = Object.keys(S).filter((e) => H.ok(S[e])).sort(), f = (p, t) => ids.find((e) => e.startsWith(p) && (!t || t(S[e].attributes || {}, e)));
    const R = [], add = (t, e, x) => { if (e) R.push(Object.assign({ id: 'a' + R.length, t, e, n: '', n2: '', ic: '', img: '', ac: '', sz: (HG_GL_TYPES.find((y) => y[0] === t) || [])[5] || 's', tap: 'sheet', tb: 0 }, x || {})); };
    add('weather', f('weather.')); add('media', ids.find((e) => e.startsWith('media_player.') && typeof hgMpActive === 'function' && hgMpActive(S[e])) || f('media_player.'), { tb: 2 });
    add('camera', f('camera.')); add('thermo', f('climate.'), { tb: 1 }); add('boiler', f('water_heater.'), { tb: 1 });
    add('energy', f('sensor.', (a) => a.device_class === 'power' && !/pv|solar/i.test(a.friendly_name || '')), { tb: 3 }); add('pv', f('sensor.', (a, e) => (a.device_class === 'power' || a.device_class === 'energy') && /pv|solar|fotowolt/i.test(e + ' ' + (a.friendly_name || ''))), { tb: 3 });
    add('car', f('sensor.', (a) => a.device_class === 'battery' && /car|auto|ev\b|tesla|samoch/i.test(a.friendly_name || '')), { tb: 3 });
    add('light', f('light.', (a) => Array.isArray(a.entity_id)) || f('light.')); add('scene', f('scene.'));
    return R; },
  gcards(h, G) { G = G || this.gget(); return G.cards || this.gauto(h); },
  gst(v) { const M = { on: ['Włączone', 'On'], off: ['Wyłączone', 'Off'], idle: ['Gotowa', 'Idle'], eco: ['Eko', 'Eco'], heat: ['Grzanie', 'Heating'], home: ['W domu', 'Home'], not_home: ['Poza domem', 'Away'], playing: ['Gra', 'Playing'], paused: ['Pauza', 'Paused'], scening: ['Aktywna', 'Active'], recording: ['Nagrywa', 'Recording'], streaming: ['Na żywo', 'Live'], electric: ['Grzałka', 'Electric'], heat_pump: ['Pompa ciepła', 'Heat pump'], gas: ['Gaz', 'Gas'], performance: ['Wydajny', 'Performance'], high_demand: ['Duży pobór', 'High demand'], heating: ['Grzanie', 'Heating'] }; return M[v] ? hgTr(M[v][0], M[v][1]) : v; },
  gpw(h, e) { if (!e) return ''; const o = e.split('.')[1], S = h.states; return Object.keys(S).find((x) => x.startsWith('sensor.') && (S[x].attributes || {}).device_class === 'power' && x.split('.')[1].startsWith(o)) || ''; },
  /* karta wygaszacza = prawdziwy kafel pulpitu (ten sam komponent, szkło i odstępy) */
  gmk(c, h) { const e = c.e || '', T = {
      weather: ['hg-weather-card', { entity: e }], media: ['hg-media-card', { entity: e }], camera: ['hg-camera-card', { entity: e }],
      thermo: ['hg-thermo-card', { entity: e }], boiler: ['hg-cwu-card', { cwu: { heater: e, power: c.pw || this.gpw(h, e) || null } }],
      energy: ['hg-value-card', { entity: e }], pv: ['hg-pv-card', { power: e }], car: ['hg-value-card', { entity: e }], sensor: ['hg-value-card', { entity: e }],
      light: ['hg-lamp-card', { entity: e }], scene: ['hg-scenes-card', { scripts: e ? [e] : [] }], person: ['hg-person-card', { entity: e }] }[c.t];
    if (!T || !e) return null; if (c.n) T[1].name = c.n; return T; },
  gmount(root, h) { const M = (root._gel = root._gel || {}), seen = {};
    root.querySelectorAll('[data-mk]').forEach((slot, n) => { const c = (this._gC || []).find((x) => x.id === slot.dataset.mk); if (!c) return; const T = this.gmk(c, h); if (!T) return;
      const key = c.id + '#' + n, sig = JSON.stringify(T); seen[key] = 1; let el = M[key];
      if (!el || el._sig !== sig) { try { el = document.createElement(T[0]); el.setConfig(Object.assign({ type: 'custom:' + T[0] }, T[1])); el._sig = sig; M[key] = el; } catch (x) { return; } }
      if (el.parentNode !== slot) slot.replaceChildren(el); if (el.hass !== h) el.hass = h; const sr = el.shadowRoot; if (sr && !sr.querySelector('style[data-ngb]')) { const st = document.createElement('style'); st.dataset.ngb = '1'; st.textContent = 'ha-card{ display:block; }'; sr.appendChild(st); } });
    Object.keys(M).forEach((k) => { if (!seen[k]) delete M[k]; }); },
  /* tło pulpitu: dokładnie to, co pulpit (HGApp: wybrane tło lub domyślne, kopia z CDN po błędzie, przyciemnienie) */
  gbg() { const A = (window.HGApp && HGApp.get()) || {}, port = window.innerHeight > window.innerWidth; let B = A.bg || window.HG_DEFAULT_BG;
    if (B && B._st === 'bad') B = window.HG_DEFAULT_BG_FB; const M = window.__hgBgAlt || {};
    if (A.bg && A.bg.kind === 'image' && M[A.bg.v]) B = Object.assign({}, A.bg, { v: M[A.bg.v] });
    const u = B ? (port && B.v2p ? HGApp.bgImg({ kind: 'image', v: B.v2p }) : HGApp.bgImg(B)) : null;
    const d = A.dim != null ? Math.max(0, Math.min(1, A.dim)) : 0;
    return { img: u || 'linear-gradient(160deg, ' + ((window.HG_DEFAULT_BG_FB || {}).v || HG_GL_HEX('16202B')) + ', ' + ((window.HG_DEFAULT_BG_FB || {}).v2 || HG_GL_HEX('05070A')) + ')', pos: (A.bg && A.bg.pos) || '50% 50%', dim: (1 - (1 - d * 0.65) * (1 - d * 0.45)).toFixed(3) }; },
  /* układ jak widok pulpitu (masonry): naturalna wysokość kafli, kafel do najkrótszej kolumny; strony po wysokości ekranu, przewijanie stronami */
  glayout(root) { const car = root.querySelector('.ng-car'), trk = car && car.querySelector('.ng-trk'); if (!trk) return; const Hh = car.clientHeight - 96, W0 = root.clientWidth; if (!W0 || !Hh) return;
    const gap = Math.round(Math.max(10, Math.min(16, W0 * 0.011))), pad = Math.round(Math.max(16, Math.min(56, W0 * 0.04))), W = W0 - 2 * pad;
    const n = Math.max(1, Math.round((W + gap) / (300 + gap))), cw = (W - (n - 1) * gap) / n;
    car.style.setProperty('--gpad', pad + 'px'); const C = [...trk.querySelectorAll(':scope > .ng-c')];
    C.forEach((c) => { const sp = Math.min(n, c.classList.contains('w') || c.classList.contains('l') ? 2 : 1); c._sp = sp; c.style.width = (cw * sp + gap * (sp - 1)) + 'px'; });
    const P = []; let H = new Array(n).fill(0), pg = [];
    const flush = () => { if (pg.length) P.push({ L: pg, h: Math.max(...H) - gap }); H = new Array(n).fill(0); pg = []; };
    C.forEach((c) => { const h = Math.ceil(c.offsetHeight), sp = c._sp; let col = 0, best = Infinity;
      for (let k = 0; k + sp <= n; k++) { const t = Math.max(...H.slice(k, k + sp)); if (t < best) { best = t; col = k; } }
      if (pg.length && best + h > Hh) { flush(); col = 0; best = 0; }
      for (let k = col; k < col + sp; k++) H[k] = best + h + gap; pg.push([c, col, best]); });
    flush(); const stride = W + 2 * pad;
    P.forEach((p, i) => { const off = Math.max(0, (Hh - p.h) / 2); p.L.forEach(([c, col, top]) => { c.style.transform = `translate(${i * stride + col * (cw + gap)}px, ${off + top}px)`; c.classList.add('lo'); }); });
    trk.style.setProperty('--gtw', (P.length * stride - 2 * pad) + 'px'); trk.style.setProperty('--gpw', W + 'px');
    trk.querySelectorAll(':scope > .ng-pg').forEach((x) => x.remove());
    P.forEach((p, i) => { const d = document.createElement('i'); d.className = 'ng-pg'; d.style.left = (i * stride) + 'px'; trk.appendChild(d); });
    car._step = stride;
    if (!trk._ro && window.ResizeObserver) { trk._ro = new ResizeObserver(() => { cancelAnimationFrame(trk._rf); trk._rf = requestAnimationFrame(() => this.glayout(root)); }); }
    if (trk._ro) C.forEach((c) => { if (!c._ob) { c._ob = 1; trk._ro.observe(c); } }); },
  gauto2(root, G) { clearInterval(this._gai); const car = root.querySelector('.ng-car'); if (!car || !G.car.spd || G.rm === 'on' || root.classList.contains('pv')) return;
    this._gai = setInterval(() => { if (this._ghold || this._gsh || !car.isConnected) return; const end = car.scrollLeft + car.clientWidth >= car.scrollWidth - 4;
      if (end) car.scrollTo({ left: 0 }); else car.scrollBy({ left: car._step || 300 }); }, Math.max(5, G.car.spd / 8) * 1000); },
  gimg(k) { return k && k !== '-' ? (HG_GL_IMG.includes(k) ? HG_ASSET + 'nuvio-3d-' + k + '.webp' : k) : ''; },
  gtf(G) { const l = G.min.h12 !== 'auto' ? G.min.h12 : this.hass && this.hass.locale ? this.hass.locale.time_format : null; return new Intl.DateTimeFormat(HG_LOC(), Object.assign({ hour: '2-digit', minute: '2-digit' }, l === '12' ? { hour12: true } : l === '24' ? { hour12: false } : {})); },
  gdate(G, d) { return new Intl.DateTimeFormat(HG_LOC(), G.top.df === 'num' ? { weekday: 'short', day: '2-digit', month: '2-digit' } : G.top.df === 'short' ? { weekday: 'short', day: 'numeric', month: 'short' } : { weekday: 'long', day: 'numeric', month: 'long' }).format(d || new Date()); },
  /* treść jednej karty: { cls, html, sheet } (sheet = arkusz szczegółów po dotknięciu) */
  gcard(c, h, G) { const s = c.e && h.states[c.e], A = (s && s.attributes) || {}, T = HG_GL_TYPES.find((x) => x[0] === c.t), nm = c.n || (s ? H.name(h, c.e, hgTr(T[1], T[2])) : hgTr(T[1], T[2]));
    const im = this.gimg(c.img || (c.t === 'weather' ? (s && HG_GL_WX[s.state]) || 'partly' : HG_GL_DEFIMG[c.t])), img = im ? `<img class="ng-im" src="${H.esc(im)}" alt="" draggable="false" loading="lazy">` : '';
    const ic = c.ic || T[3], num = (v, d) => (isFinite(parseFloat(v)) ? H.esc(H.fmt(parseFloat(v), d)) : '–'), unit = (x) => H.esc(x.unit_of_measurement || '');
    const h3 = (a, b) => `<h3><b>${H.esc(a)}</b>${b && String(b).trim().toLowerCase() !== String(a).trim().toLowerCase() ? `<span>${H.esc(b)}</span>` : ''}</h3>`, st = (x) => H.esc(s ? (h.formatEntityState ? h.formatEntityState(s) : x || this.gst(s.state)) : hgTr('Brak encji', 'No entity'));
    const on = !!s && ['on', 'playing', 'heat', 'heating', 'home', 'open', 'unlocked'].includes(s.state);
    const sh = (big, sub, about, pr) => ({ t: nm, t2: c.n2 || hgTr(T[1], T[2]), big, sub, about, pr, img: im });
    let html = '', sheet = null, cls = '';
    if (!s && c.t !== 'weather') { html = `${img}<div class="ng-emp"><b>${H.esc(nm)}</b><small>${c.e ? hgTr('Encja niedostępna', 'Entity unavailable') : hgTr('Wybierz encję w ustawieniach', 'Pick an entity in settings')}</small></div>`; return { cls: 'na', html, sheet }; }
    if (c.t === 'weather') { const u = A.temperature_unit || '°C', cn = s && typeof HGWx !== 'undefined' && HGWx.cn ? HGWx.cn(s.state) : s ? s.state : '', F = this._fc && this._fc.id === c.e && this._fc.daily ? this._fc.daily.slice(1, 4) : [];
      if (s && this.fc && h.callWS) this.fc(h, c.e);
      const hum = c.n2 || (A.humidity != null ? hgTr('Wilgotność ', 'Humidity ') + H.fmt(A.humidity, 0) + '%' : ''), tmp = s ? num(A.temperature, 0) : '–';
      if (c.sz === 'w') { const D = (this._fc && this._fc.id === c.e && this._fc.daily ? this._fc.daily.slice(1, 6) : []), wd = (f) => new Intl.DateTimeFormat(HG_LOC(), { weekday: 'short' }).format(new Date(f.datetime));
        html = `<div class="wx-w${D.length ? '' : ' nf'}">${img}<div class="wx-t"><b>${tmp}<sup>°</sup></b><p>${H.esc(c.n || cn)}</p>${hum ? `<small>${H.esc(hum)}</small>` : ''}</div>
          ${D.length ? `<div class="wx-f">${D.map((f) => `<span><em>${H.esc(wd(f))}</em><img src="${H.esc(this.gimg(HG_GL_WX[f.condition] || 'partly'))}" alt="" loading="lazy"><b>${num(f.temperature, 0)}°</b>${f.templow != null ? `<small>${num(f.templow, 0)}°</small>` : ''}</span>`).join('')}</div>` : ''}</div>`; }
      else html = `<div class="ng-pill">${img}<b>${tmp}<sup></sup></b><p>${H.esc(c.n || cn)}</p><small>${H.esc(hum)}</small></div>`;
      sheet = s ? sh(num(A.temperature, 1) + '<small>' + H.esc(u) + '</small>', cn, [A.humidity != null ? hgTr('Wilgotność ', 'Humidity ') + H.fmt(A.humidity, 0) + '%' : '', A.wind_speed != null ? hgTr('Wiatr ', 'Wind ') + H.fmt(A.wind_speed, 0) + ' ' + (A.wind_speed_unit || '') : '', A.pressure != null ? hgTr('Ciśnienie ', 'Pressure ') + H.fmt(A.pressure, 0) + ' ' + (A.pressure_unit || '') : ''].filter(Boolean).join(' · '), null) : null; }
    else if (c.t === 'media') { const pl = s.state === 'playing', pic = pl || s.state === 'paused' ? A.entity_picture_local || A.entity_picture || '' : '', dur = Number(A.media_duration) || 0, pos = Number(A.media_position) || 0, el = pl && A.media_position_updated_at ? (Date.now() - Date.parse(A.media_position_updated_at)) / 1000 : 0, pc = dur ? Math.min(100, ((pos + el) / dur) * 100) : 0;
      html = `<div class="ng-art${pic ? '' : ' no'}"${pic ? ` style="--art:url(&quot;${H.esc(pic)}&quot;)"` : ''}>${pic ? '' : img}</div><div class="ng-pn"><h4>${H.esc(A.media_title || c.n || nm)}</h4><div class="ng-ar">${H.esc(A.media_artist || A.app_name || (c.n ? '' : hgTr('Nic nie gra', 'Nothing playing')))}</div><span class="ng-ht">${H.icon('mdi:heart-outline')}</span>
        <div class="ng-pr"><i style="width:${pc.toFixed(1)}%"></i><b style="left:${pc.toFixed(1)}%"></b></div><div class="ng-ct"><button type="button" data-gm="media_previous_track" aria-label="${hgTr('Poprzedni', 'Previous')}">${H.icon('mdi:skip-previous')}</button><button type="button" class="pp" data-gm="media_play_pause" aria-label="${pl ? hgTr('Pauza', 'Pause') : hgTr('Odtwórz', 'Play')}">${H.icon(pl ? 'mdi:pause' : 'mdi:play')}</button><button type="button" data-gm="media_next_track" aria-label="${hgTr('Następny', 'Next')}">${H.icon('mdi:skip-next')}</button></div></div>`;
      sheet = sh(H.esc(A.media_title || st()), A.media_artist || '', H.name(h, c.e, ''), dur ? pc : null); }
    else if (c.t === 'camera') { const snap = c.img ? '' : A.entity_picture || '', live = ['streaming', 'recording', 'idle'].includes(s.state);
      html = `${snap ? `<div class="ng-snap" style="--snap:url(&quot;${H.esc(snap)}&quot;)"></div><div class="ng-scrim"></div>` : img}${h3(nm, c.n2 || '')}<div class="ng-bd"><span class="${s.state === 'unavailable' ? 'al' : live ? 'lv' : ''}">${live ? '<i></i>' : ''}${st()}</span></div>`;
      cls = snap ? 'snap' : ''; sheet = Object.assign(sh(st(), '', c.n2 || '', null), { snap: A.entity_picture || '' }); }
    else if (c.t === 'thermo' || c.t === 'boiler') { const cur = A.current_temperature, tg = A.temperature != null ? A.temperature : A.target_temp_high, mi = Number(A.min_temp) || (c.t === 'boiler' ? 30 : 5), mx = Number(A.max_temp) || (c.t === 'boiler' ? 70 : 35);
      const p = tg != null ? Math.max(0, Math.min(100, ((tg - mi) / (mx - mi)) * 100)) : 0, pw = this.gpw(h, c.e), pwv = pw ? parseFloat(h.states[pw].state) * (/^kW$/i.test(h.states[pw].attributes.unit_of_measurement || '') ? 1000 : 1) : NaN;
      const ht = A.hvac_action === 'heating' || ['heat', 'heating', 'electric', 'performance', 'high_demand'].includes(s.state) || pwv > 5, mode = st();
      const tgt = tg != null ? `<small class="ng-tg">${hgTr('cel', 'target')} ${num(tg, c.t === 'boiler' ? 0 : 1)}°</small>` : '';
      const pwr = ht && isFinite(pwv) ? `<span class="ng-pw">${H.icon('mdi:lightning-bolt')}${pwv >= 1000 ? num(pwv / 1000, 1) + ' kW' : num(pwv, 0) + ' W'}</span>` : '';
      const dial = `<div class="ng-dial" style="--pc:${p.toFixed(0)};--rc:${ht ? K(255,140,60,1) : K(110,200,255,1)}"><b>${num(tg != null ? tg : cur, 0)}°</b>${H.icon(ht ? 'mdi:fire' : 'mdi:leaf')}</div>`;
      html = `${c.t === 'thermo' && !c.img ? dial : img}${h3(nm, c.n2 || mode)}<div class="ng-ft ng-tv">${num(cur, c.t === 'boiler' ? 0 : 1)}°${tgt}</div>${pwr}`; cls = ht ? 'on ht' : '';
      sheet = sh(num(cur, 1) + '<small>°</small>', tg != null ? hgTr('Cel ', 'Target ') + num(tg, 1) + '°' : mode, mode + (pwr && isFinite(pwv) ? ' · ' + (pwv >= 1000 ? H.fmt(pwv / 1000, 1) + ' kW' : H.fmt(pwv, 0) + ' W') : ''), c.t === 'boiler' && cur != null ? Math.max(0, Math.min(100, ((cur - mi) / (mx - mi)) * 100)) : null); }
    else if (c.t === 'person') { const pic = A.entity_picture || '', aw = s.state !== 'home', zn = s.state === 'home' ? hgTr('W domu', 'Home') : s.state === 'not_home' ? hgTr('Poza domem', 'Away') : s.state;
      html = `<div class="ng-ph"${pic ? ` style="--ph:url(&quot;${H.esc(pic)}&quot;)"` : ''}>${pic ? '' : H.esc((nm[0] || '?').toUpperCase())}</div><div class="ng-pn2"><b>${H.esc(nm)}</b><small>${H.esc(zn)}</small></div>`; cls = aw ? 'aw' : '';
      sheet = sh(H.esc(zn), '', '', null); }
    else { const v = parseFloat(s.state), isN = isFinite(v), u = unit(A), bat = A.device_class === 'battery' || /%/.test(u), pc = bat && isN ? Math.max(0, Math.min(100, v)) : c.t === 'boiler' && isN ? Math.max(0, Math.min(100, ((v - 20) / 50) * 100)) : null;
      const val = isN ? `${num(v, u === '%' || Math.abs(v) >= 100 ? 0 : 1)}<small>${u ? ' ' + u : ''}</small>` : st(), lg = c.t === 'light' || c.t === 'scene';
      const ics = false ? `<div class="ng-ics"><i class="${on ? 'on' : ''}">${H.icon(ic)}</i>${lg ? '' : `<i>${H.icon(c.t === 'car' ? 'mdi:ev-station' : c.t === 'pv' ? 'mdi:white-balance-sunny' : 'mdi:chart-bell-curve')}</i>`}</div>` : '';
      html = `${img}${h3(nm, c.n2 || (lg ? '' : c.sz === 's' ? '' : st()))}${ics}${pc != null ? `<div class="ng-bar"><i style="width:${pc.toFixed(0)}%"></i></div>` : ''}<div class="ng-ft">${H.icon(ic)}${lg ? st() : val}</div>${c.t === 'light' ? `<span class="ng-pl">${on ? hgTr('Wł.', 'On') : hgTr('Wył.', 'Off')}</span>` : ''}`;
      cls = lg && on ? 'on' : ''; sheet = sh(lg ? st() : val, A.device_class ? '' : '', H.name(h, c.e, ''), pc); }
    return { cls, html, sheet }; },
  /* dotknięcie karty: przełącz (światło, scena, odtwarzacz) */
  gtog(h, c) { const s = c.e && h.states[c.e]; if (!s) return; const d = c.e.split('.')[0];
    if (d === 'scene' || d === 'script') return H.call(h, d, 'turn_on', { entity_id: c.e });
    if (d === 'media_player') return H.call(h, d, 'media_play_pause', { entity_id: c.e });
    if (['light', 'switch', 'fan', 'input_boolean', 'group', 'climate', 'water_heater'].includes(d)) return H.call(h, d === 'group' ? 'homeassistant' : d, 'toggle', { entity_id: c.e }); },
});
const HG_GL_SS2 = `.ng-dm{ position:absolute; inset:0; background:${K(0,0,0,1)}; opacity:calc(var(--nw-dim, 0) * .55); pointer-events:none; z-index:4; transition:opacity 1s ease; }
.ng .ng-c{ --p:calc(26 * var(--u)); } .ng .ng-c.s{ --p:calc(20 * var(--u)); }
.ng .ng-ci h3{ left:var(--p); top:var(--p); right:var(--p); } .ng .ng-c.s .ng-ci h3{ right:42%; }
.ng .ng-ft{ left:var(--p); bottom:var(--p); gap:.45em; } .ng .ng-ft small{ margin-left:.2em; font-size:.8em; }
.ng .ng-pl{ right:var(--p); bottom:var(--p); } .ng .ng-bar{ left:var(--p); right:var(--p); } .ng .ng-c.w .ng-bar{ right:55%; } .ng .ng-ics{ left:var(--p); }
.ng .ng-bd{ left:var(--p); bottom:var(--p); right:var(--p); } .ng .ng-emp{ padding:0 var(--p); }
.ng .t-media h4, .ng .t-media .ng-ar{ left:var(--p); right:calc(var(--p) + 3.4em); } .ng .t-media .ng-pr{ left:var(--p); right:var(--p); } .ng .t-media .ng-ht{ right:var(--p); }
.ng .t-media .ng-ct{ left:var(--p); right:var(--p); justify-content:space-between; gap:0; } .ng .ng-c.s.t-media h4, .ng .ng-c.s.t-media .ng-ar{ left:var(--p); right:var(--p); }
.ng .ng-car .ng-c.l.t-weather{ width:calc(300 * var(--u)); } .ng .ng-car .ng-c.l.t-weather .ng-ci{ font-size:min(calc(100cqw / 30), calc(100cqh / 41.5)); } .ng .ng-car .t-weather .ng-pill{ left:8em; }
.ng .t-weather .ng-pill .ng-im{ left:-7.5em; top:-8.6em; width:19em; height:12.4em; object-position:center bottom; z-index:2; }
.ng .ng-orb{ border:0; padding:0; margin:0; font:inherit; color:inherit; -webkit-appearance:none; appearance:none; outline:none; pointer-events:none; transition:scale .15s ease, filter .15s ease; }
.ng .ng-orb.ia{ pointer-events:auto; cursor:pointer; } .ng .ng-orb.ia:active, .ng .ng-orb.pr{ scale:.88; filter:brightness(1.3) saturate(1.2); } .ng .ng-orb.ia:focus-visible{ outline:2px solid ${K(255,255,255,.9)}; outline-offset:4px; }
.ng .ng-c.s{ --is:calc(58 * var(--u)); }
.ng .ng-c.s .ng-ci h3{ left:var(--p); top:var(--p); right:calc(var(--p) + var(--is) + 8 * var(--u)); font-size:1.75em; line-height:1.15; }
.ng .ng-c.s .ng-ci h3 span{ font-weight:400; opacity:.7; font-size:.82em; margin-top:.15em; }
.ng .ng-c.s .ng-im{ left:auto; right:var(--p); top:var(--p); width:var(--is); height:var(--is); }
.ng .ng-ft{ align-items:baseline; } .ng .ng-ft ha-icon{ align-self:center; } .ng .ng-ft small{ margin-left:.12em; font-size:.55em; font-weight:500; opacity:.8; }
.ng .ng-c.s .ng-ft{ left:var(--p); bottom:var(--p); line-height:1; } .ng .ng-c.s .ng-pl{ right:var(--p); bottom:var(--p); }
.ng .ng-c.s .ng-bar{ left:var(--p); right:var(--p); bottom:calc(var(--p) + 4em); }
.ng .ng-c.on.on{ box-shadow:inset 0 0 0 1.5px ${K(255,255,255,.3)}, inset 0 1px 0 ${K(255,255,255,.14)}, 0 calc(14 * var(--u)) calc(40 * var(--u)) ${K(0,0,0,.28)}; }
.ng .ng-c.w.t-weather{ overflow:hidden; background:linear-gradient(165deg, ${K(92,86,160,.62)}, ${K(52,44,112,.5)} 55%, ${K(40,32,92,.55)}); box-shadow:inset 0 0 0 1px ${K(255,255,255,.12)}, inset 0 1px 0 ${K(255,255,255,.2)}, 0 calc(14 * var(--u)) calc(40 * var(--u)) ${K(0,0,0,.28)}; -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); }
.wx-w{ position:absolute; inset:0; }
.wx-w > .ng-im{ left:auto; right:var(--p); top:calc(var(--p) * .4); width:44%; height:46%; object-position:right top; filter:drop-shadow(0 1.4em 1.6em ${K(0,0,0,.35)}); }
.wx-t{ position:absolute; left:var(--p); top:var(--p); right:46%; }
.wx-t b{ display:block; font-size:10.5em; font-weight:200; line-height:.9; letter-spacing:-.03em; font-variant-numeric:tabular-nums; } .wx-t b sup{ font-size:.42em; font-weight:300; vertical-align:top; margin-left:.04em; position:relative; top:.08em; }
.wx-t p{ margin:.5em 0 0; font-size:2.2em; font-weight:600; line-height:1.2; } .wx-t small{ display:block; margin-top:.4em; font-size:1.55em; opacity:.72; }
.wx-f{ position:absolute; left:var(--p); right:var(--p); bottom:var(--p); height:31%; display:grid; grid-template-columns:repeat(auto-fit, minmax(0, 1fr)); gap:1em; }
.wx-f span{ display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:1em .4em; border-radius:1.6em; background:${K(255,255,255,.08)}; box-shadow:inset 0 0 0 1px ${K(255,255,255,.08)}; min-width:0; }
.wx-f em{ font-style:normal; font-size:1.4em; font-weight:500; opacity:.8; text-transform:capitalize; } .wx-f img{ width:4.6em; height:4.6em; object-fit:contain; } .wx-f b{ font-size:1.9em; font-weight:600; line-height:1; } .wx-f small{ font-size:1.3em; opacity:.6; }
.wx-w.nf .wx-t{ top:50%; transform:translateY(-50%); } .wx-w.nf > .ng-im{ top:50%; transform:translateY(-50%); height:70%; }
.ng .t-camera .ng-snap{ position:absolute; inset:0; background:center/cover no-repeat var(--snap); }
.ng .t-camera .ng-scrim{ position:absolute; inset:0; background:linear-gradient(180deg, ${K(10,12,30,.55)}, transparent 38%, transparent 55%, ${K(10,12,30,.6)}); }
.ng .ng-c.s.t-camera .ng-im{ right:var(--p); top:var(--p); } .ng .t-camera .ng-bd span{ display:inline-flex; align-items:center; gap:.5em; }
.ng .t-camera .ng-bd span.lv i{ width:.7em; height:.7em; border-radius:50%; background:${K(99,215,30,1)}; box-shadow:0 0 0 .2em ${K(99,215,30,.25)}; }
.ng .ng-c.t-thermo .ng-dial{ right:var(--p); top:auto; bottom:var(--p); width:min(46cqw, 56cqh); }
.ng .ng-c.t-thermo .ng-dial b{ font-size:2em; } .ng .ng-c.t-thermo .ng-dial ha-icon{ bottom:16%; }
.ng .ng-c.s.t-thermo .ng-ci h3{ right:var(--p); }
.ng .ng-tv{ font-size:4.6em; font-weight:200; line-height:1; flex-wrap:wrap; column-gap:.1em; } .ng .ng-c.s .ng-tv{ font-size:3.2em; }
.ng .ng-tv .ng-tg{ flex-basis:100%; order:-1; margin:0 0 .35em; font-size:.3em; font-weight:500; opacity:.7; letter-spacing:.02em; }
.ng .ng-pw{ position:absolute; right:var(--p); bottom:var(--p); display:inline-flex; align-items:center; gap:.3em; height:2.6em; padding:0 1em; border-radius:1.3em; background:${K(99,215,30,.16)}; color:${K(163,230,53,1)}; font-size:1.25em; font-weight:700; white-space:nowrap; }
.ng .ng-pw ha-icon{ --mdc-icon-size:1.2em; width:1.2em; height:1.2em; }
.ng .ng-c.m.t-boiler .ng-im, .ng .ng-c.l.t-boiler .ng-im, .ng .ng-c.m.t-car .ng-im{ left:var(--p); right:auto; top:30%; width:calc(100% - 2 * var(--p)); height:34%; }
.ng .ng-c.ht.on{ box-shadow:inset 0 0 0 1.5px ${K(255,170,90,.35)}, inset 0 1px 0 ${K(255,255,255,.14)}, 0 calc(14 * var(--u)) calc(40 * var(--u)) ${K(0,0,0,.28)}; }
.ng-sh, .ng-orb{ z-index:6; } .ng-c *{ pointer-events:none; } .ng-c [data-gm]{ pointer-events:auto; }`;
Object.assign(HGWall, {
  glShell() { return `<style>${HG_WALL_SS}${HG_GL_SS}${HG_GL_SS2}${HG_GL_SS3}</style><div class="ng"><div class="ng-st"><div class="ng-bg" aria-hidden="true"></div><div class="ng-sp" aria-hidden="true"></div>
    <div class="ng-top"><time class="ng-dt"></time><nav class="ng-tb" aria-label="${hgTr('Karty', 'Cards')}"></nav><i class="ng-av" aria-hidden="true"></i></div><div class="ng-mid"></div><div class="ng-fam"></div>
    <p class="nw-h"></p></div><div class="ng-dm" aria-hidden="true"></div><button type="button" class="ng-orb" aria-label="${H.esc(hgTr('Otwórz Assist', 'Open Assist'))}"></button><section class="ng-sh" role="dialog" aria-modal="false" aria-hidden="true"></section></div>`; },
  glStart() { const el = this.el; el.classList.add('gl'); this._gk = {}; this._gsh = null; this._gtab = 0; this.gl(true); },
  /* odświeżenie z HA co najwyżej co 2 s; force = od razu */
  gl(force) { const el = this.el, h = this.hass; if (!el || !h || !el.classList.contains('gl')) return;
    const now = Date.now(); if (!force && now - (this._glt || 0) < 2000) { if (!this._glq) this._glq = setTimeout(() => { this._glq = null; this.gl(true); }, 2000 - (now - (this._glt || 0))); return; }
    this._glt = now; const G = this.gget(), root = el.querySelector('.ng'); el.style.setProperty('--nw-dim', this.get().dim); this.glRender(root, G, h, {}); },
  glNight(h) { const s = h && h.states['sun.sun']; if (s) return s.state === 'below_horizon'; const hr = new Date().getHours(); return hr >= 22 || hr < 6; },
  glPut(root, sel, html, key) { const n = root.querySelector(sel); if (!n) return null; const k = key || sel; root._gk = root._gk || {}; if (root._gk[k] !== html) { root._gk[k] = html; n.innerHTML = html; } return n; },
  glPeople(h, G) { const S = h.states, L = G.fam.who.length ? G.fam.who : Object.keys(S).filter((e) => e.startsWith('person.')).sort(); return L.filter((e) => S[e]); },
  glRender(root, G, h, o) { const B = G.bg, pv = !!o.pv, rm = G.rm === 'on';
    root.classList.toggle('rm', rm); root.classList.toggle('nh', !G.hint.on || pv); root.classList.toggle('pv', pv);
    root.style.cssText = `--c1:${B.c1};--c2:${B.c2};--c3:${B.c3};--o1:${B.o1};--o2:${B.o2};--oi:${B.oi};--rad:24;--nd:${B.night && this.glNight(h) ? (1 - B.nd).toFixed(2) : 1}${o.pu ? ';--pu:' + o.pu : ''}`;
    const bg = root.querySelector('.ng-bg'); bg.classList.toggle('im', !!B.img); bg.style.setProperty('--im', B.img ? `url("${B.img}")` : 'none');
    root.querySelector('.ng-sp').hidden = !B.sph || !!B.img; const orb = root.querySelector('.ng-orb'); orb.hidden = !B.orb; orb.classList.toggle('ia', B.orbA && !pv); orb.tabIndex = B.orbA && !pv ? 0 : -1; if (!B.orbA || pv) orb.setAttribute('aria-hidden', 'true'); else orb.removeAttribute('aria-hidden');
    const d = new Date(), dt = root.querySelector('.ng-dt'); dt.hidden = !G.top.date || G.v === 'minimal'; dt.textContent = this.gdate(G, d);
    const tabs = G.top.tabs && G.v !== 'minimal' ? G.top.tl.filter(Boolean) : [], tab = Math.min(this._gtab || 0, Math.max(0, tabs.length - 1));
    const tb = this.glPut(root, '.ng-tb', tabs.length ? `<i>${H.icon('mdi:view-grid-outline')}</i>` + tabs.map((t, i) => `<button type="button" data-gtab="${i}" aria-pressed="${i === tab}">${H.esc(t)}</button>`).join('') : ''); tb.hidden = !tabs.length;
    const me = h.user && Object.keys(h.states).find((e) => e.startsWith('person.') && h.states[e].attributes.user_id === h.user.id), pic = me && h.states[me].attributes.entity_picture;
    const av = root.querySelector('.ng-av'); av.hidden = !G.top.av; av.style.backgroundImage = pic ? `url("${pic}")` : ''; av.textContent = pic ? '' : ((h.user && h.user.name) || '?')[0].toUpperCase();
    const P = G.fam.on ? this.glPeople(h, G) : [];
    this.glPut(root, '.ng-fam', P.length ? `${hgTr('Rodzina', 'Family')}<span>${P.map((e) => { const a = h.states[e].attributes, aw = G.fam.grey && h.states[e].state !== 'home', n = a.friendly_name || e;
      return `<i class="${aw ? 'aw' : ''}" title="${H.esc(n)}"${a.entity_picture ? ` style="background-image:url(&quot;${H.esc(a.entity_picture)}&quot;)"` : ''}>${a.entity_picture ? '' : H.esc((n[0] || '?').toUpperCase())}</i>`; }).join('')}</span>` : '');
    const hi = root.querySelector('.nw-h'); if (!root.closest('.nw.lk')) hi.textContent = G.hint.t || hgTr('Dotknij ekranu, aby wybudzić', 'Touch the screen to wake');
    const all = this.gcards(h, G), C = tab ? all.filter((c) => c.tb === tab) : all; this._gC = all;
    const one = (c) => { const r = { cls: '' }; return `<div class="ng-c ${c.sz} t-${c.t}" data-gc="${H.esc(c.id)}" role="button" tabindex="-1" aria-label="${H.esc(c.n || H.name(h, c.e, ''))}"${c.ac ? ` style="--ac:${c.ac}"` : ''}><div class="ng-ci ng-tile" data-mk="${H.esc(c.id)}"></div></div>`; };
    let mid = '';
    if (G.v === 'carousel') { const cols = []; for (let i = 0; i < C.length; i++) cols.push(one(C[i])); /* jeden równy rząd kafli */
      const off = true, L = cols;
      mid = `<div class="ng-car${this._ghold ? ' hold' : ''}"><div class="ng-trk${off ? ' off' : ''}" style="--dur:${G.car.spd * Math.max(1, cols.length / 4)}s">${L.join('')}</div></div>`; }
    else { const tf = this.gtf(G), parts = tf.formatToParts(d), t = parts.filter((x) => x.type !== 'dayPeriod').map((x) => x.value).join('').trim(), ap = (parts.find((x) => x.type === 'dayPeriod') || {}).value;
      const wc = all.find((c) => c.t === 'weather'), wid = (wc && wc.e) || Object.keys(h.states).find((e) => e.startsWith('weather.')), w = wid && h.states[wid];
      const mp = Object.keys(h.states).find((e) => e.startsWith('media_player.') && h.states[e].state === 'playing' && h.states[e].attributes.media_title), M = mp && h.states[mp].attributes;
      mid = `<div class="ng-mn${G.min.pos === 'center' ? ' c' : ''}" style="--cs:${G.min.cs}"><div class="ng-mt">${H.esc(t)}${ap ? `<small>${H.esc(ap)}</small>` : ''}</div>${G.min.date ? `<div class="ng-md">${H.esc(this.gdate(G, d))}</div>` : ''}
        ${G.min.wx && w && H.ok(w) ? `<div class="ng-mw"><i class="ng-wi">${H.icon(HG_GL_WI[w.state] || 'mdi:weather-partly-cloudy')}</i><div><b>${H.esc(H.fmt(parseFloat(w.attributes.temperature), 0))}°</b><small>${H.esc(typeof HGWx !== 'undefined' && HGWx.cn ? HGWx.cn(w.state) : w.state)}</small></div></div>` : ''}
        ${G.min.np && M ? `<div class="ng-mp"><i${M.entity_picture ? ` style="background-image:url(&quot;${H.esc(M.entity_picture)}&quot;)"` : ''}></i><div><b>${H.esc(M.media_title)}</b><small>${H.esc(M.media_artist || H.name(h, mp, ''))}</small></div></div>` : ''}</div>`; }
    const mk = root._gk && root._gk['.ng-mid']; this.glPut(root, '.ng-mid', mid); this.gmount(root, h); this.glayout(root); if (mk !== mid || !this._gai) this.gauto2(root, G);
    if (!root._gro && window.ResizeObserver) { root._gro = new ResizeObserver(() => this.glayout(root)); root._gro.observe(root); }
    const gb = this.gbg(); root.style.setProperty('--gbg', gb.img); root.style.setProperty('--gbgp', gb.pos); root.style.setProperty('--gdim', gb.dim);
    const sh = root.querySelector('.ng-sh'), sc = this._gsh && all.find((c) => c.id === this._gsh);
    root.classList.toggle('so', !!sc); sh.setAttribute('aria-hidden', String(!sc));
    if (sc) { const r = this.gcard(sc, h, G).sheet || { t: sc.n || H.name(h, sc.e, ''), t2: '', big: '', sub: '', about: '', pr: null }, ics = HG_GL_TYPES.find((x) => x[0] === sc.t);
      this.glPut(root, '.ng-sh', `<h2><b>${H.esc(r.t)}</b>${H.esc(r.t2 || '')}</h2><div class="ng-ics"><i class="on">${H.icon(sc.ic || ics[3])}</i></div><button type="button" class="ng-shx" data-gx="1" aria-label="${hgTr('Zamknij', 'Close')}">${H.icon('mdi:close')}</button>
        ${r.about && r.about !== r.t ? `<div class="ng-sa">${H.esc(r.about)}</div>` : ''}<div class="ng-sv">${r.big || ''}</div><div class="ng-sd"></div><div class="ng-ss">${r.sub ? `<span>${H.esc(r.sub)}</span>` : ''}${sc.e ? `<small>${H.esc(sc.e)}</small>` : ''}</div>
        ${r.pr != null ? `<div class="ng-sb"><i style="width:${Math.max(8, r.pr).toFixed(0)}%"></i><b style="left:${Math.max(8, r.pr).toFixed(0)}%">${r.pr.toFixed(0)}%</b></div>` : ''}
        ${r.snap ? `<div class="ng-snapb" style="--snap:url(&quot;${H.esc(r.snap)}&quot;)"></div>` : r.img ? `<img class="ng-im" src="${H.esc(r.img)}" alt="">` : ''}`, 'sh'); } },
  /* dotknięcie w nakładce: true = obsłużone (nie budzi ekranu) */
  glTap(e) { const el = this.el; if (!el || !el.classList.contains('gl')) return false; const t = e.target, h = this.hass, G = this.gget(), C = this._gC || [];
    const ob = t.closest && t.closest('.ng-orb.ia'); if (ob && !this._gsh) { ob.classList.add('pr'); const pg = this.page;
      setTimeout(() => { this.wake('touch'); if (window.HGAssistUI) setTimeout(() => HGAssistUI.open(pg && pg.shadowRoot ? pg : null, 'saver'), 80); }, 160); return true; }
    const tbb = t.closest && t.closest('[data-gtab]'); if (tbb) { this._gtab = Number(tbb.dataset.gtab) || 0; this.gl(true); return true; }
    if (this._gsh) { if (t.closest('[data-gx]') || !t.closest('.ng-sh')) this.glClose(); return true; }
    const gm = t.closest && t.closest('[data-gm]'), cd = t.closest && t.closest('[data-gc]'), c = cd && C.find((x) => x.id === cd.dataset.gc); if (!c) return false;
    this.glHold(G);
    return true; /* kafel pulpitu obsługuje własne sterowanie (klik trafia do komponentu) */
    if (gm && c.e) { H.call(h, 'media_player', gm.dataset.gm, { entity_id: c.e }); setTimeout(() => this.gl(true), 600); return true; }
    if (c.tap === 'none') return false;
    if (c.tap === 'toggle') { this.gtog(h, c); setTimeout(() => this.gl(true), 600); return true; }
    this._gsh = c.id; this.gl(true); const x = el.querySelector('.ng-shx'); if (x) setTimeout(() => x.focus({ preventScroll: true }), 50); return true; },
  glHold(G) { if (!G.car.pause) return; this._ghold = true; const c = this.el && this.el.querySelector('.ng-car'); if (c) c.classList.add('hold');
    clearTimeout(this._ghT); this._ghT = setTimeout(() => { if (this._gsh) return; this._ghold = false; const k = this.el && this.el.querySelector('.ng-car'); if (k) k.classList.remove('hold'); }, 6000); },
  glClose() { this._gsh = null; this.gl(true); this.glHold(this.gget()); },
});
const HG_GL_CSS = `
.wg-pv{ position:relative; width:100%; aspect-ratio:1280 / 680; border-radius:18px; overflow:hidden; margin:4px 0 2px; box-shadow:0 6px 20px rgba(0,0,0,.18); isolation:isolate; }
@media (orientation:portrait){ .wg-pv{ aspect-ratio:560 / 900; max-height:62vh; width:auto; margin-inline:auto; } }
.wg-pv .ng{ pointer-events:none; }
.wg-gal{ display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap:16px; }
@media (max-width:600px){ .wg-gal{ grid-template-columns:minmax(0, 1fr); gap:12px; } }
.wg-gt{ all:unset; cursor:pointer; box-sizing:border-box; display:flex; flex-direction:column; gap:10px; padding:10px; border-radius:20px; background:linear-gradient(160deg, rgba(255,255,255,.1), rgba(255,255,255,.03)); box-shadow:inset 0 0 0 1px rgba(255,255,255,.1), 0 6px 18px rgba(0,0,0,.2); -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px); transition:box-shadow .2s ease, transform .2s ease; min-width:0; }
.wg-gt:hover{ transform:translateY(-1px); } .wg-gt:focus-visible{ outline:2px solid #63d71e; outline-offset:2px; }
.wg-gt[aria-checked=true]{ box-shadow:inset 0 0 0 2px #63d71e, 0 0 0 3px rgba(99,215,30,.18), 0 6px 18px rgba(0,0,0,.2); }
.wg-gp{ position:relative; display:block; width:100%; aspect-ratio:16 / 10; border-radius:12px; overflow:hidden; isolation:isolate; pointer-events:none; background:${K(5,7,11,1)}; }
.wg-gs{ position:absolute; left:0; top:0; transform-origin:0 0; contain:strict; }
.wg-gs .nw{ position:absolute !important; inset:0; z-index:0; opacity:1; } .wg-gs *{ animation-play-state:paused !important; }
.wg-gl{ display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; padding:0 4px 2px; } .wg-gl ha-icon{ --mdc-icon-size:16px; color:#63d71e; } .wg-pv .ng-orb{ animation:none; }
.wg-vs{ display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; }
.wg-vs button{ all:unset; cursor:pointer; box-sizing:border-box; padding:10px 8px; border-radius:14px; text-align:center; background:var(--hg-surface-2, rgba(127,127,127,.12)); display:flex; flex-direction:column; align-items:center; gap:4px; font-size:13px; font-weight:600; }
.wg-vs button small{ font-weight:400; opacity:.7; font-size:11px; } .wg-vs button[aria-pressed=true]{ box-shadow:inset 0 0 0 2px var(--hg-accent, #6c7cff); }
.wg-vs button:focus-visible, .wg-it button:focus-visible, .wg-ty button:focus-visible, .wg-im button:focus-visible, .wg-ac button:focus-visible{ outline:2px solid var(--hg-accent, #6c7cff); outline-offset:2px; }
.wg-h{ margin:14px 0 2px; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; opacity:.6; }
.wg-it{ display:flex; align-items:center; gap:8px; padding:8px 8px 8px 10px; border-radius:14px; background:var(--hg-surface-2, rgba(127,127,127,.1)); margin-top:6px; }
.wg-it.ed{ box-shadow:inset 0 0 0 2px var(--hg-accent, #6c7cff); } .wg-it > img{ width:30px; height:30px; object-fit:contain; flex:none; } .wg-it > ha-icon{ flex:none; width:30px; text-align:center; }
.wg-it > span{ flex:1; min-width:0; display:flex; flex-direction:column; } .wg-it b{ font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .wg-it small{ font-size:12px; opacity:.65; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.wg-it button{ all:unset; cursor:pointer; width:34px; height:34px; display:grid; place-items:center; border-radius:50%; flex:none; } .wg-it button:hover{ background:rgba(127,127,127,.15); } .wg-it button[disabled]{ opacity:.3; cursor:default; }
.wg-ty, .wg-im{ display:grid; grid-template-columns:repeat(auto-fill, minmax(92px, 1fr)); gap:6px; margin-top:6px; }
.wg-im{ grid-template-columns:repeat(auto-fill, minmax(52px, 1fr)); }
.wg-ty button, .wg-im button{ all:unset; cursor:pointer; box-sizing:border-box; border-radius:12px; padding:8px 4px; display:flex; flex-direction:column; align-items:center; gap:4px; font-size:12px; text-align:center; background:var(--hg-surface-2, rgba(127,127,127,.1)); }
.wg-im button{ aspect-ratio:1; padding:5px; justify-content:center; font-size:11px; overflow:hidden; } .wg-im img{ width:100%; height:100%; object-fit:contain; } .wg-im button[aria-pressed=true]{ box-shadow:inset 0 0 0 2px var(--hg-accent, #6c7cff); }
.wg-im .bg{ aspect-ratio:16 / 10; padding:0; overflow:hidden; } .wg-im .bg img{ object-fit:cover; }
.wg-ed{ border-radius:16px; padding:10px 12px 12px; margin-top:6px; background:var(--hg-surface-2, rgba(127,127,127,.08)); box-shadow:inset 0 0 0 1px rgba(127,127,127,.18); }
.wg-ed .wl-f{ margin-top:10px; }
.wg-ac{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.wg-ac button{ all:unset; cursor:pointer; width:30px; height:30px; border-radius:50%; box-shadow:inset 0 0 0 1px rgba(127,127,127,.4); background:var(--c); }
.wg-ac button.df{ background:linear-gradient(135deg, #36325f, #2a2143); } .wg-ac button[aria-pressed=true]{ box-shadow:0 0 0 2px var(--hg-bg, #fff), 0 0 0 4px var(--hg-accent, #6c7cff); }
.wg-cl{ display:flex; flex-wrap:wrap; gap:10px; } .wg-cl label{ display:flex; align-items:center; gap:6px; font-size:13px; }
.wg-cl input[type=color], .wg-ac input[type=color]{ width:36px; height:30px; padding:0; border:0; border-radius:8px; background:none; cursor:pointer; }
.wg-tl{ display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:6px; } .wg-tl .hs-s, .wg-tl .hs-in{ min-width:0; } .wg-row{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.wg-row .wl-tb{ margin:0; }
`;
Object.assign(HGWall, {
  /* ---- arkusz Wygląd > Wygaszacz, wariant „Szkło” ---- */
  glHtml(c, h) { const G = this.gget(), C = this.gcards(h, G), L = (pl, en) => H.esc(hgTr(pl, en));
    const seg = (path, list, cur) => `<div class="wl-seg" style="--n:${list.length}">${list.map(([k, pl, en]) => `<button type="button" data-hge="wl-g-s" data-v="${H.esc(path + '=' + k)}" aria-pressed="${String(cur) === String(k)}">${L(pl, en)}</button>`).join('')}</div>`;
    const sw = (path, on, pl, en, spl, sen) => `<button type="button" class="wl-sw" role="switch" data-hge="wl-g-b" data-v="${H.esc(path)}" aria-checked="${!!on}"><span>${L(pl, en)}${spl ? `<small>${L(spl, sen)}</small>` : ''}</span><i aria-hidden="true"></i></button>`;
    const rg = (path, v, mi, mx, st, pl, en, fmt) => `<div class="wl-f"><span>${L(pl, en)}<em class="wg-rv">${H.esc(fmt(v))}</em></span><input class="lk-rg" type="range" min="${mi}" max="${mx}" step="${st}" name="wg:${path}" value="${v}" data-fmt="${fmt === this._pc ? 'pc' : fmt === this._px ? 'px' : 'x'}" style="--v:${((v - mi) / (mx - mi)) * 100}%" aria-label="${L(pl, en)}"></div>`;
    let s = `<div class="wl-f"><span>${L('Podgląd na żywo', 'Live preview')}</span>
      <div class="wg-pv" aria-label="${L('Podgląd na żywo', 'Live preview')}" role="img">${this.glShell().replace(/^<style>[\s\S]*?<\/style>/, '')}</div></div>`;
    if (G.v !== 'minimal') {
      s += `<div class="wg-h">${L('Karty', 'Cards')}${G.cards ? '' : ' · ' + L('automatyczne', 'automatic')}</div>`;
      s += C.map((x, i) => { const T = HG_GL_TYPES.find((y) => y[0] === x.t), im = this.gimg(x.img || HG_GL_DEFIMG[x.t] || (x.t === 'weather' ? 'partly' : '')), ed = this._ged === x.id;
        return `<div class="wg-it${ed ? ' ed' : ''}">${im ? `<img src="${H.esc(im)}" alt="">` : H.icon(x.ic || T[3])}<span><b>${H.esc(x.n || (x.e && h.states[x.e] ? H.name(h, x.e, '') : hgTr(T[1], T[2])))}</b><small>${L(T[1], T[2])} · ${x.sz.toUpperCase()}${x.e ? ' · ' + H.esc(x.e) : ''}</small></span>
          <button type="button" data-hge="wl-g-up" data-v="${x.id}" ${i ? '' : 'disabled'} aria-label="${L('W górę', 'Move up')}">${H.icon('mdi:chevron-up')}</button><button type="button" data-hge="wl-g-dn" data-v="${x.id}" ${i < C.length - 1 ? '' : 'disabled'} aria-label="${L('W dół', 'Move down')}">${H.icon('mdi:chevron-down')}</button>
          <button type="button" data-hge="wl-g-ed" data-v="${x.id}" aria-expanded="${ed}" aria-label="${L('Edytuj kartę', 'Edit card')}">${H.icon('mdi:pencil-outline')}</button><button type="button" data-hge="wl-g-rm" data-v="${x.id}" aria-label="${L('Usuń kartę', 'Remove card')}">${H.icon('mdi:close')}</button></div>${ed ? this.glEd(x, h, G) : ''}`; }).join('');
      s += `<div class="wg-row" style="margin-top:8px"><button type="button" class="wl-tb" data-hge="wl-g-add" aria-expanded="${!!this._gadd}">${H.icon('mdi:plus')}<span>${L('Dodaj kartę', 'Add card')}</span></button>${G.cards ? `<button type="button" class="wl-tb" data-hge="wl-g-auto">${H.icon('mdi:auto-fix')}<span>${L('Przywróć automatyczne', 'Back to automatic')}</span></button>` : ''}</div>`;
      if (this._gadd) s += `<div class="wg-ty">${HG_GL_TYPES.map(([k, pl, en, ic]) => { const im = this.gimg(HG_GL_DEFIMG[k] || 'partly'); return `<button type="button" data-hge="wl-g-new" data-v="${k}"><img src="${H.esc(im)}" alt="" style="width:34px;height:34px;object-fit:contain">${L(pl, en)}</button>`; }).join('')}</div>`; }
    if (G.v === 'carousel') s += `<div class="wg-h">${L('Karuzela', 'Carousel')}</div><div class="wl-f"><span>${L('Prędkość', 'Speed')}</span>${seg('car.spd', [[0, 'Stoi', 'Off'], [140, 'Wolno', 'Slow'], [80, 'Średnio', 'Medium'], [40, 'Szybko', 'Fast']], G.car.spd)}</div>${sw('car.pause', G.car.pause, 'Pauza po dotknięciu', 'Pause on touch', 'Karty stają, gdy dotkniesz karty', 'Cards stop when you touch a card')}`;
    if (G.v === 'minimal') s += `<div class="wg-h">${L('Zegar', 'Clock')}</div><div class="wl-f"><span>${L('Format', 'Format')}</span>${seg('min.h12', [['auto', 'Jak w HA', 'As in HA'], ['24', '24 h', '24 h'], ['12', '12 h', '12 h']], G.min.h12)}</div>
      ${rg('min.cs', G.min.cs, 0.6, 1.4, 0.1, 'Wielkość zegara', 'Clock size', this._pc)}<div class="wl-f"><span>${L('Położenie', 'Position')}</span>${seg('min.pos', [['left', 'Z lewej', 'Left'], ['center', 'Na środku', 'Centre']], G.min.pos)}</div>
      ${sw('min.date', G.min.date, 'Data', 'Date')}${sw('min.wx', G.min.wx, 'Pogoda', 'Weather')}${sw('min.np', G.min.np, 'Teraz gra', 'Now playing')}`;
    const B = G.bg, gal = (typeof hgBgList === 'function' ? hgBgList() : []).map((x) => [x[0] || HG_ASSET + 'nuvio-bg-default-wide.webp', x[1], x[3] || x[0] || HG_ASSET + 'nuvio-bg-default-wide.webp']).slice(0, 18);
    s += `<div class="wg-h">${L('Tło', 'Background')}</div><div class="wl-f"><span>${L('Gradient', 'Gradient')}</span><div class="wg-cl">${[['c1', 'Góra', 'Top'], ['c2', 'Dół', 'Bottom'], ['c3', 'Poświata', 'Glow']].map(([k, pl, en]) => `<label><input type="color" name="wg:bg.${k}" value="${B[k]}">${L(pl, en)}</label>`).join('')}</div></div>
      ${sw('bg.orb', B.orb, 'Kula asystenta', 'Assistant orb')}${B.orb ? `${sw('bg.orbA', B.orbA, 'Dotknięcie kuli otwiera Assist', 'Tapping the orb opens Assist', 'Wybudza ekran i od razu pokazuje okno Assist', 'Wakes the screen and opens the Assist dialog')}<div class="wl-f"><span>${L('Kolory kuli', 'Orb colours')}</span><div class="wg-cl">${['o1', 'o2'].map((k, i) => `<label><input type="color" name="wg:bg.${k}" value="${B[k]}">${i + 1}</label>`).join('')}</div></div>${rg('bg.oi', B.oi, 0, 1, 0.05, 'Intensywność', 'Intensity', this._pc)}` : ''}
      ${sw('bg.sph', B.sph, 'Sfera w tle', 'Background sphere')}
      <div class="wl-f"><span>${L('Własne zdjęcie', 'Own image')}</span><div class="wg-im"><button type="button" data-hge="wl-g-s" data-v="bg.img=" aria-pressed="${!B.img}">${L('Gradient', 'Gradient')}</button>${gal.map(([u, n, th]) => `<button type="button" class="bg" data-hge="wl-g-s" data-v="${H.esc('bg.img=' + u)}" aria-pressed="${B.img === u}" title="${H.esc(n)}"><img src="${H.esc(th)}" alt="${H.esc(n)}" loading="lazy"></button>`).join('')}</div>
        <div class="wg-row" style="margin-top:6px"><button type="button" class="wl-tb" data-hge="wl-g-file" data-v="@bg">${H.icon('mdi:upload')}<span>${L('Prześlij', 'Upload')}</span></button></div></div>
      ${sw('bg.night', B.night, 'Ciemniej w nocy', 'Dimmer at night', 'Po zachodzie słońca', 'After sunset')}${B.night ? rg('bg.nd', B.nd, 0, 0.8, 0.05, 'Przyciemnienie nocne', 'Night dimming', this._pc) : ''}`;
    const T = G.top; s += `<div class="wg-h">${L('Górny pasek', 'Top bar')}</div>${sw('top.date', T.date, 'Data', 'Date')}${T.date ? `<div class="wl-f"><span>${L('Format daty', 'Date format')}</span>${seg('top.df', [['long', 'Długi', 'Long'], ['short', 'Krótki', 'Short'], ['num', 'Liczbowy', 'Numeric']], T.df)}</div>` : ''}
      ${sw('top.tabs', T.tabs, 'Zakładki', 'Tabs', 'Filtrują karty: ustaw zakładkę w edycji karty', 'Filter cards: set the tab in the card editor')}${T.tabs ? `<div class="wg-tl">${[0, 1, 2, 3, 4, 5].map((i) => `<span class="hs-s"><input class="hs-in" name="wg:top.tl.${i}" value="${H.esc(T.tl[i] || '')}" placeholder="${L('Zakładka ', 'Tab ') + (i + 1)}" maxlength="24" aria-label="${L('Nazwa zakładki ', 'Tab name ') + (i + 1)}"></span>`).join('')}</div>` : ''}${sw('top.av', T.av, 'Awatar', 'Avatar')}`;
    const F = G.fam, P = Object.keys(h.states).filter((e) => e.startsWith('person.')).sort();
    s += `<div class="wg-h">${L('Rodzina', 'Family')}</div>${sw('fam.on', F.on, 'Pokaż domowników', 'Show household')}${F.on ? `${this.pk('glf', (F.who.length ? F.who : P).map((e) => ({ k: e, l: H.name(h, e, e), s: e, ic: 'mdi:account', fix: !F.who.length })), P.filter((e) => F.who.length && !F.who.includes(e)).map((e) => ({ k: e, l: H.name(h, e, e), s: e, ic: 'mdi:account' })), { add: hgTr('Dodaj osobę', 'Add person') })}
      ${F.who.length ? `<button type="button" class="wl-tb" data-hge="wl-g-s" data-v="fam.who=*">${H.icon('mdi:account-multiple')}<span>${L('Wszyscy', 'Everyone')}</span></button>` : `<button type="button" class="wl-tb" data-hge="wl-g-s" data-v="fam.who=+">${H.icon('mdi:account-edit-outline')}<span>${L('Wybierz osoby', 'Choose people')}</span></button>`}${sw('fam.grey', F.grey, 'Szare poza domem', 'Grey when away')}` : ''}`;
    s += `<div class="wg-h">${L('Napis i ruch', 'Hint and motion')}</div>${sw('hint.on', G.hint.on, 'Napis na dole', 'Bottom hint')}${G.hint.on ? `<span class="hs-s">${H.icon('mdi:format-text')}<input class="hs-in" name="wg:hint.t" value="${H.esc(G.hint.t)}" maxlength="60" placeholder="${L('Dotknij ekranu, aby wybudzić', 'Touch the screen to wake')}" aria-label="${L('Tekst napisu', 'Hint text')}"></span>` : ''}
      <div class="wl-f"><span>${L('Animacje', 'Motion')}</span>${seg('rm', [['auto', 'Jak w systemie', 'As system'], ['on', 'Ograniczone', 'Reduced']], G.rm)}</div><small class="lk-hn">${L('Opóźnienie startu ustawisz wyżej: „Włącz po bezczynności”.', 'Set the start delay above: “Start after inactivity”.')}</small>
      <input type="file" accept="image/*" name="wg-file" hidden>`;
    return s; },
  /* galeria wygaszaczy (zamiast przełącznika): kafle z żywym podglądem */
  GAL: [['photo', 'Zegar na zdjęciu', 'Clock on photo'], ['board', 'Tablica', 'Board'], ['glass:carousel', 'Karuzela', 'Carousel'], ['glass:minimal', 'Minimal', 'Minimal']],
  galHtml(style) { const cur = style === 'glass' ? 'glass:' + this.gget().v : style;
    return `<style>${HG_GL_SS}${HG_GL_SS2}${HG_GL_SS3}${HG_GL_CSS}</style><div class="wg-gal" role="radiogroup" aria-label="${H.esc(hgTr('Wygaszacze', 'Screensavers'))}">${this.GAL.map(([k, pl, en]) => `<button type="button" class="wg-gt" role="radio" data-hge="wl-g-gal" data-v="${k}" aria-checked="${cur === k}">
      <span class="wg-gp" data-gp="${k}"><span class="wg-gs" aria-hidden="true"></span></span><span class="wg-gl">${cur === k ? H.icon('mdi:check-circle') : ''}${H.esc(hgTr(pl, en))}</span></button>`).join('')}</div>`; },
  /* każdy kafel to prawdziwy wygaszacz w rozmiarze ekranu, pomniejszony transformacją (position:fixed liczy się wtedy względem kafla) */
  galWire(S, h) { const W = innerWidth, Hh = innerHeight, G0 = this.gget(), keep = this.el, d = new Date();
    for (const g of S.querySelectorAll('[data-gp]')) { const k = g.dataset.gp, box = g.querySelector('.wg-gs'), r = g.getBoundingClientRect(); if (!r.width) continue; const sc = Math.min(r.width / W, r.height / Hh);   /* cały ekran w kaflu 16:10, bez przycinania */
      box.style.cssText = `width:${W}px;height:${Hh}px;left:${((r.width - W * sc) / 2).toFixed(1)}px;top:${((r.height - Hh * sc) / 2).toFixed(1)}px;transform:scale(${sc.toFixed(5)})`;
      if (box._k === k && box.firstChild) continue; box._k = k;
      const el = document.createElement('div'); el.className = 'nw in'; el.style.setProperty('--nw-dim', this.get().dim); box.replaceChildren(el);
      try { this.el = el;
        if (k.startsWith('glass')) { el.innerHTML = this.glShell(); el.classList.add('gl'); this.glRender(el.querySelector('.ng'), Object.assign({}, G0, { v: k.slice(6), rm: 'on' }), h, {}); }
        else if (k === 'board' && this.bdShell) { el.innerHTML = this.bdShell(); el.classList.add('bd'); this._bdk = {}; const q = this.hass; this.hass = h; this.bd(true); this.hass = q; }
        else { el.innerHTML = `<style>${HG_WALL_SS}</style><div class="nw-bg on" aria-hidden="true"></div><div class="nw-bg" aria-hidden="true"></div><div class="nw-sh" aria-hidden="true"></div><div class="nw-c"><div class="nw-g"><time class="nw-t"></time><div class="nw-d"></div></div></div><div class="nw-r"><div class="nw-p nw-w" hidden></div><div class="nw-p nw-e" hidden></div></div><p class="nw-h">${H.esc(hgTr('Dotknij ekranu, aby wybudzić', 'Touch the screen to wake'))}</p>`;
          el.querySelector('.nw-bg').style.backgroundImage = this.imgs()[0]; const l = h && h.locale ? h.locale.time_format : null;
          el.querySelector('.nw-t').textContent = new Intl.DateTimeFormat(HG_LOC(), Object.assign({ hour: '2-digit', minute: '2-digit' }, l === '12' ? { hour12: true } : l === '24' ? { hour12: false } : {})).format(d);
          el.querySelector('.nw-d').textContent = new Intl.DateTimeFormat(HG_LOC(), { weekday: 'long', day: 'numeric', month: 'long' }).format(d); const q = this.hass; this.hass = h; this.wx(); this.hass = q; } }
      catch (e) { /* podgląd pomocniczy */ } finally { this.el = keep; } } },
  _pc(v) { return Math.round(v * 100) + '%'; }, _px(v) { return v + ' px'; },
  /* edytor jednej karty */
  glEd(x, h, G) { const T = HG_GL_TYPES.find((y) => y[0] === x.t), L = (pl, en) => H.esc(hgTr(pl, en)), cs = (f, k) => H.esc(x.id + '|' + f + '=' + k);
    const seg = (f, list, cur) => `<div class="wl-seg" style="--n:${list.length}">${list.map(([k, pl, en]) => `<button type="button" data-hge="wl-g-cs" data-v="${cs(f, k)}" aria-pressed="${String(cur) === String(k)}">${L(pl, en)}</button>`).join('')}</div>`;
    const E = Object.keys(h.states).filter((e) => T[4].includes(e.split('.')[0])).sort(), nm = (e) => H.name(h, e, e);
    const imgs = (x.t === 'weather' ? [] : HG_GL_IMG).map((k) => `<button type="button" data-hge="wl-g-cs" data-v="${cs('img', k)}" aria-pressed="${x.img === k}" title="${k}"><img src="${H.esc(this.gimg(k))}" alt="${k}" loading="lazy"></button>`).join('');
    return `<div class="wg-ed" role="group" aria-label="${L('Edycja karty', 'Card editor')}">
      <div class="wl-f"><span>${L('Rodzaj', 'Type')}</span><select class="hs-in" name="wgc:t" data-id="${x.id}" aria-label="${L('Rodzaj karty', 'Card type')}">${HG_GL_TYPES.map(([k, pl, en]) => `<option value="${k}"${k === x.t ? ' selected' : ''}>${L(pl, en)}</option>`).join('')}</select></div>
      <div class="wl-f"><span>${L('Encja', 'Entity')}</span>${this.pk('gle', x.e ? [{ k: x.e, l: nm(x.e), s: x.e, ic: T[3], fix: true }] : [], E.filter((e) => e !== x.e).map((e) => ({ k: e, l: nm(e), s: e, ic: T[3] })), { one: true, add: x.e ? hgTr('Zmień', 'Change') : hgTr('Wybierz encję', 'Choose entity') })}</div>
      <div class="wl-f"><span>${L('Tytuł i druga linia', 'Title and second line')}</span><div class="wg-tl"><span class="hs-s"><input class="hs-in" name="wgc:n" data-id="${x.id}" value="${H.esc(x.n)}" maxlength="40" placeholder="${H.esc(x.e ? nm(x.e) : hgTr(T[1], T[2]))}" aria-label="${L('Tytuł', 'Title')}"></span><span class="hs-s"><input class="hs-in" name="wgc:n2" data-id="${x.id}" value="${H.esc(x.n2)}" maxlength="40" placeholder="${L('Druga linia', 'Second line')}" aria-label="${L('Druga linia', 'Second line')}"></span></div></div>
      <div class="wl-f"><span>${L('Ikona', 'Icon')}</span><div class="hs-fl"><span class="hs-s">${H.icon(x.ic || T[3])}<input class="hs-in" name="i" data-id="${x.id}" value="${H.esc(x.ic)}" placeholder="${H.esc(T[3])}" autocomplete="off" aria-label="${L('Ikona', 'Icon')}"></span></div></div>
      ${x.t === 'boiler' ? `<div class="wl-f"><span>${L('Czujnik mocy (W)', 'Power sensor (W)')}</span>${this.pk('glp', x.pw ? [{ k: x.pw, l: nm(x.pw), s: x.pw, ic: 'mdi:lightning-bolt', fix: true }] : [], Object.keys(h.states).filter((e) => e.startsWith('sensor.') && e !== x.pw).sort().map((e) => ({ k: e, l: nm(e), s: e, ic: 'mdi:lightning-bolt' })), { one: true, add: x.pw ? hgTr('Zmień', 'Change') : hgTr('Wybierz czujnik', 'Choose sensor') })}</div>` : ''}
      <div class="wl-f"><span>${L('Rozmiar', 'Size')}</span>${seg('sz', [['s', 'S', 'S'], ['m', 'M', 'M'], ['l', 'L', 'L'], ['w', 'Szeroka', 'Wide']], x.sz)}</div>
      <div class="wl-f"><span>${L('Po dotknięciu', 'On tap')}</span>${seg('tap', [['sheet', 'Szczegóły', 'Details'], ['toggle', 'Przełącz', 'Toggle'], ['none', 'Nic', 'Nothing']], x.tap)}</div>
      ${G.top.tabs ? `<div class="wl-f"><span>${L('Zakładka', 'Tab')}</span>${seg('tb', G.top.tl.map((t, i) => [i, t || '#' + (i + 1), t || '#' + (i + 1)]).filter((y) => y[1]), x.tb)}</div>` : ''}
      <button type="button" class="wl-tb" data-hge="wl-g-ed" data-v="${x.id}">${H.icon('mdi:check')}<span>${L('Gotowe', 'Done')}</span></button></div>`; },
  gmod(id, fn) { const h = this.hass || window.__hgHass, L = this.gcards(h).map((c) => Object.assign({}, c)), i = L.findIndex((c) => c.id === id); if (i < 0) return; const r = fn(L, i); if (r !== false) this.gset({ cards: L }); },
  gpatch(path, val) { const [a, b, c] = path.split('.'); if (!b) return this.gset({ [a]: val }); const G = this.gget(); if (c != null) { const arr = (G[a][b] || []).slice(); arr[Number(c)] = val; return this.gset({ [a]: { [b]: arr } }); } this.gset({ [a]: { [b]: val } }); },
  glAct(p, b, a) { if (!a.startsWith('wl-g-') && !((a === 'wl-pk-add' || a === 'wl-pk-rm') && /^gl[efp]\|/.test(b.dataset.v || ''))) return false;
    const v = b.dataset.v || '', G = this.gget(), h = p._hass; this.hass = this.hass || h;
    if (a === 'wl-pk-add' || a === 'wl-pk-rm') { const id = v.slice(0, 3), k = v.slice(4); this._dd = '';
      if (id === 'glp') this.gmod(this._ged, (L, i) => { L[i].pw = a === 'wl-pk-add' ? k : ''; });
      else if (id === 'gle') this.gmod(this._ged, (L, i) => { L[i].e = a === 'wl-pk-add' ? k : ''; });
      else { const P = Object.keys(h.states).filter((e) => e.startsWith('person.')).sort(), cur = G.fam.who.length ? G.fam.who : P; this.gpatch('fam.who', a === 'wl-pk-add' ? [...new Set([...cur, k])] : cur.filter((x) => x !== k)); } }
    else if (a === 'wl-g-b') { const [x, y] = v.split('.'); this.gpatch(v, !G[x][y]); }
    else if (a === 'wl-g-s') { const i = v.indexOf('='), path = v.slice(0, i); let val = v.slice(i + 1);
      if (path === 'fam.who') val = val === '+' ? Object.keys(h.states).filter((e) => e.startsWith('person.')).sort() : [];
      else if (/^car\.spd$/.test(path)) val = Number(val);
      this.gpatch(path, val); }
    else if (a === 'wl-g-gal') { const [st, gv] = v.split(':'); this.last = Date.now(); this.set({ style: st }); if (gv) this.gpatch('v', gv); }
    else if (a === 'wl-g-add') this._gadd = !this._gadd;
    else if (a === 'wl-g-new') { const T = HG_GL_TYPES.find((x) => x[0] === v); if (!T) return true; const id = Math.random().toString(36).slice(2, 8), L = this.gcards(h).slice();
      L.push({ id, t: v, e: (Object.keys(h.states).find((e) => T[4].includes(e.split('.')[0])) || ''), n: '', n2: '', ic: '', img: '', ac: '', sz: T[5], tap: 'sheet', tb: 0 }); this.gset({ cards: L }); this._gadd = false; this._ged = id; }
    else if (a === 'wl-g-ed') this._ged = this._ged === v ? '' : v;
    else if (a === 'wl-g-rm') { this.gset({ cards: this.gcards(h).filter((c) => c.id !== v) }); if (this._ged === v) this._ged = ''; }
    else if (a === 'wl-g-up') this.gmod(v, (L, i) => { if (!i) return false; [L[i - 1], L[i]] = [L[i], L[i - 1]]; });
    else if (a === 'wl-g-dn') this.gmod(v, (L, i) => { if (i >= L.length - 1) return false; [L[i + 1], L[i]] = [L[i], L[i + 1]]; });
    else if (a === 'wl-g-file') { const S = b.closest('section') || p._eSheetEl, f = S && S.querySelector('[name=wg-file]'); if (f) { f.dataset.tg = v; f.click(); } return true; }
    else if (a === 'wl-g-auto') { this.gset({ cards: null }); this._ged = ''; }
    else if (a === 'wl-g-cs') { const i = v.indexOf('|'), j = v.indexOf('='), id = v.slice(0, i), f = v.slice(i + 1, j), val = v.slice(j + 1); this.gmod(id, (L, k) => { L[k][f] = f === 'tb' ? Number(val) : val; }); }
    p._eLook(); return true; },
  glUpload(p, f, tg) { const h = p._hass; if (!f || !h || !h.fetchWithAuth) return p._eToast(hgTr('Brak sesji, nie można przesłać', 'No session, cannot upload'));
    const fd = new FormData(); fd.append('file', f, f.name); p._eToast(hgTr('Przesyłanie…', 'Uploading…'));
    h.fetchWithAuth('/api/image/upload', { method: 'POST', body: fd }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((j) => { const u = `/api/image/serve/${j.id}/original`;
      if (tg === '@bg') this.gpatch('bg.img', u); else this.gmod(tg, (L, i) => { L[i].img = u; }); p._eToast(hgTr('Obraz zapisany', 'Image saved')); p._eLook(); }, (e) => p._eToast(hgTr('Nie udało się przesłać (', 'Upload failed (') + e + ')')); },
  glWire(p, S) { const h = p._hass; this.hass = this.hass || h; if (S.querySelector('.wg-gal')) { requestAnimationFrame(() => this.galWire(S, h)); setTimeout(() => this.galWire(S, h), 300); }
    const pv = S.querySelector('.wg-pv'); if (!pv) return;
    const draw = () => { const r = pv.getBoundingClientRect(), port = matchMedia('(orientation: portrait)').matches, root = pv.querySelector('.ng'); if (!root || !r.width) return; root._gk = {};
      this.glRender(root, this.gget(), h, { pv: true, pu: (r.width / (port ? 560 : 1280)).toFixed(4) + 'px' }); };
    draw(); requestAnimationFrame(draw);
    const live = (fn) => { clearTimeout(this._gwt); this._gwt = setTimeout(() => { fn(); draw(); }, 250); };
    for (const i of S.querySelectorAll('input[name^="wg:"]')) { const path = i.name.slice(3);
      if (i.type === 'range') i.addEventListener('input', () => { const mi = +i.min, mx = +i.max, v = +i.value; i.style.setProperty('--v', ((v - mi) / (mx - mi)) * 100 + '%'); const em = i.parentNode.querySelector('.wg-rv'); if (em) em.textContent = i.dataset.fmt === 'pc' ? this._pc(v) : this._px(v); live(() => this.gpatch(path, v)); });
      else if (i.type === 'color') i.addEventListener('input', () => live(() => this.gpatch(path, i.value)));
      else i.addEventListener('change', () => { this.gpatch(path, i.value.trim()); draw(); }); }
    for (const i of S.querySelectorAll('[name^="wgc:"]')) { const f = i.name.slice(4), id = i.dataset.id, ev = i.type === 'color' ? 'input' : 'change';
      i.addEventListener(ev, () => { const v = i.value.trim(); if (f === 'img' && v && !/^(\/|https?:\/\/)/.test(v)) return p._eToast(hgTr('Podaj adres https:// lub /local/…', 'Enter an https:// or /local/… address'));
        live(() => this.gmod(id, (L, k) => { L[k][f] = v; if (f === 't') { const T = HG_GL_TYPES.find((y) => y[0] === v); if (T && L[k].e && !T[4].includes(L[k].e.split('.')[0])) L[k].e = ''; } })); if (f === 't') setTimeout(() => p._eLook(), 300); }); }
    const ic = S.querySelector('.wg-ed input[name=i]'); if (ic) { if (typeof hgIcWire === 'function') hgIcWire(S); const sv = () => { const v = ic.value.trim(); if (!v || /^[a-z]+:[a-z0-9-]+$/.test(v)) live(() => this.gmod(ic.dataset.id, (L, k) => { L[k].ic = v; })); }; ic.addEventListener('change', sv); ic.addEventListener('input', sv); }
    const fi = S.querySelector('[name=wg-file]'); if (fi) fi.addEventListener('change', () => { const f = fi.files && fi.files[0]; fi.value = ''; if (f) this.glUpload(p, f, fi.dataset.tg || '@bg'); }); },
});
