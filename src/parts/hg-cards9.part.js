/* ===================== POKOJE (obszary HA) ===================== */
/* Model pokoi: rejestr obszarów + rejestr encji/urządzeń z hass (hass.areas / hass.entities / hass.devices, bez dodatkowych zapytań).
   Encja należy do obszaru: CFG assign (tylko wyświetlanie, rejestr HA bez zmian) > area_id encji > area_id urządzenia; merge łączy duplikaty obszarów.
   Pomijane: ukryte, diagnostyczne/konfiguracyjne (entity_category), wyłączone (nie ma ich w hass.entities), platformy z exclude_platforms. */
const HG_AREA_ICONS = [[/salon|living|wypoczyn/, 'mdi:sofa-outline'], [/kuchni|kitchen/, 'mdi:countertop-outline'], [/lazienk|bath|toalet|\bwc\b/, 'mdi:shower-head'],
  [/sypialni|bedroom/, 'mdi:bed-king-outline'], [/biur|office|gabinet/, 'mdi:desk'], [/garaz|garage/, 'mdi:garage-variant'], [/ogrod|garden/, 'mdi:flower-outline'],
  [/taras|balkon|balcony/, 'mdi:balcony'], [/ganek|weranda|porch/, 'mdi:home-import-outline'], [/wejsc|entrance|przedpok|hall/, 'mdi:door-open'],
  [/piwnic|basement/, 'mdi:stairs-down'], [/pralni|laundry/, 'mdi:washing-machine'], [/korytarz|schod|stairs/, 'mdi:stairs'], [/parter|ground/, 'mdi:home-floor-0'],
  [/pietro|poddasz|floor/, 'mdi:home-floor-1'], [/eliann|dziec|kids/, 'mdi:teddy-bear'], [/siec|network/, 'mdi:lan'], [/jadal|dining/, 'mdi:silverware-fork-knife']];
const hgNorm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
const HG_SKIP_DOM = new Set(['event', 'notify', 'update', 'device_tracker', 'tts', 'stt', 'conversation', 'ai_task', 'assist_satellite', 'infrared', 'zone', 'person',
  'automation', 'script', 'sun', 'weather', 'calendar', 'image', 'todo', 'wake_word', 'tag', 'input_text', 'input_datetime', 'input_number', 'input_select', 'counter',
  'timer', 'schedule', 'remote', 'group', 'persistent_notification', 'alarm_control_panel', 'date', 'time', 'datetime']);
const HG_CTRL_DOM = new Set(['light', 'switch', 'climate', 'cover', 'fan', 'lock', 'humidifier', 'media_player', 'vacuum', 'water_heater', 'valve', 'lawn_mower', 'siren', 'camera']);
const HG_LIGHTISH = /(swiatl|swiatel|oswietl|lamp|\bled\b|light|wlacznik|zarowk|kinkiet|zyrandol)/;
const HG_TEMP_BAD = /(water|woda|wody|kettle|czajnik|boiler|bojler|heater|cpu|chip|procesor|battery|bateri|inverter|falownik|motor|silnik|pralk|washer|dryer|suszark|lodowk|fridge|zamrazark|freezer|piekarnik|oven|soc\b|core)/;
const HG_SEC = [['light', 'Światła', 'mdi:lightbulb-group-outline', 'Lights'], ['clim', 'Klimatyzacja', 'mdi:thermostat', 'Climate'], ['media', 'Media', 'mdi:speaker', 'Media'],
  ['cover', 'Rolety', 'mdi:window-shutter', 'Covers'], ['sw', 'Przełączniki', 'mdi:toggle-switch-outline', 'Switches'], ['sens', 'Czujniki', 'mdi:gauge', 'Sensors'],
  ['mot', 'Ruch i obecność', 'mdi:motion-sensor', 'Motion & presence'], ['door', 'Drzwi i okna', 'mdi:door', 'Doors & windows'], ['cam', 'Kamery', 'mdi:cctv', 'Cameras'], ['rob', 'Roboty', 'mdi:robot-vacuum', 'Robots'],
  ['misc', 'Inne', 'mdi:tune-variant', 'Other']];
const HG_DC_ICON = { temperature: 'mdi:thermometer', humidity: 'mdi:water-percent', illuminance: 'mdi:brightness-5', power: 'mdi:flash-outline', energy: 'mdi:lightning-bolt-outline',
  battery: 'mdi:battery-outline', voltage: 'mdi:sine-wave', current: 'mdi:current-ac', pm25: 'mdi:blur', pm10: 'mdi:blur', carbon_dioxide: 'mdi:molecule-co2',
  volatile_organic_compounds: 'mdi:air-filter', pressure: 'mdi:gauge', aqi: 'mdi:air-filter', duration: 'mdi:timer-outline', timestamp: 'mdi:clock-outline',
  signal_strength: 'mdi:wifi', moisture: 'mdi:water', water: 'mdi:water', gas: 'mdi:meter-gas-outline', problem: 'mdi:alert-circle-outline', running: 'mdi:play-circle-outline',
  plug: 'mdi:power-plug-outline', power_factor: 'mdi:angle-acute', connectivity: 'mdi:lan-connect', heat: 'mdi:fire', lock: 'mdi:lock-outline' };
const HG_DOM_ICON = { light: 'mdi:lightbulb-outline', switch: 'mdi:toggle-switch-outline', fan: 'mdi:fan', humidifier: 'mdi:air-humidifier', lock: 'mdi:lock-outline',
  valve: 'mdi:valve', siren: 'mdi:bullhorn-outline', input_boolean: 'mdi:toggle-switch-outline', water_heater: 'mdi:water-boiler', media_player: 'mdi:speaker',
  cover: 'mdi:window-shutter', camera: 'mdi:cctv', vacuum: 'mdi:robot-vacuum', lawn_mower: 'mdi:robot-mower', sensor: 'mdi:eye-outline', binary_sensor: 'mdi:checkbox-blank-circle-outline',
  climate: 'mdi:thermostat', select: 'mdi:form-dropdown', number: 'mdi:numeric', button: 'mdi:gesture-tap-button', text: 'mdi:form-textbox', scene: 'mdi:palette-outline' };
const hgPl = (n, one, few, many, en1, enN) => en1 && hgCurLang() === 'en' ? `${n} ${n === 1 ? en1 : enN || en1 + 's'}` : `${n} ${n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many}`;

const HGAreas = {
  _memo: new WeakMap(), _e: {}, _sc: { s: null, n: 0, t: 0 },
  /* liczba encji w stanach: liczona najwyżej co 5 s (nowy obiekt hass.states przy każdej zmianie stanu – bez Object.keys przy każdej aktualizacji) */
  _cnt(h) { const c = this._sc; if (c.s !== h.states && Date.now() - c.t > 5000) { c.s = h.states; c.n = Object.keys(h.states).length; c.t = Date.now(); } return c.n; },
  /* model liczony tylko gdy zmieni się rejestr (obiekty hass.entities / devices / areas), konfiguracja albo liczba encji */
  model(h, cfg) {
    cfg = cfg || this._e;
    const key = [h.entities, h.devices, h.areas, this._cnt(h)];
    const m0 = this._memo.get(cfg);
    if (m0 && m0.key.every((x, i) => x === key[i])) return m0;
    const reg = h.entities || {}, dev = h.devices || {}, areasReg = h.areas || {};
    const merge = cfg.merge || {}, assign = Object.assign({}, cfg.assign || {}), names = cfg.names || {}, icons = cfg.icons || {};
    const exP = new Set(cfg.exclude_platforms || ['browser_mod']);
    const exc = (cfg.exclude || []).map(hgGlob), unEx = (cfg.unassigned_exclude || []).map(hgGlob);
    const list = [], byId = {};
    const add = (id, name, icon, virtual) => {
      if (byId[id] || (cfg.hide || []).includes(id)) return;
      const a = { id, name, icon: icon || (HG_AREA_ICONS.find(([re]) => re.test(hgNorm(name) + ' ' + id)) || [0, 'mdi:home-outline'])[1], virtual: !!virtual, ents: [], strip: [name] };
      byId[id] = a; list.push(a);
    };
    for (const a of Object.values(areasReg)) if (!merge[a.area_id]) add(a.area_id, names[a.area_id] || a.name, icons[a.area_id] || a.icon);
    for (const [from, to] of Object.entries(merge)) { const a = areasReg[from]; if (a && byId[to]) byId[to].strip.push(a.name); }
    for (const v of cfg.virtual || []) add(v.id, v.name, v.icon, true);
    for (const v of cfg.virtual || []) for (const e of v.entities || []) if (!assign[e]) assign[e] = v.id;
    const un = [];
    for (const e of Object.keys(h.states)) {
      const dom = e.slice(0, e.indexOf('.')), r = reg[e];
      const forced = assign[e];
      if (!forced) {
        if (!r || r.hidden || r.entity_category || exP.has(r.platform) || HG_SKIP_DOM.has(dom) || exc.some((x) => x.test(e))) continue;
      }
      let aid = forced || (r && (r.area_id || (r.device_id && dev[r.device_id] && dev[r.device_id].area_id))) || null;
      if (aid && merge[aid]) aid = merge[aid];
      if (aid && byId[aid]) byId[aid].ents.push(e);
      else if (!aid && HG_CTRL_DOM.has(dom) && !unEx.some((x) => x.test(e))) un.push(e);
    }
    if (cfg.unassigned !== false && un.length) { add('_none', hgTr('Bez pokoju', 'No room'), 'mdi:help-box-multiple-outline', true); byId._none.ents = un; }
    for (const a of list) this._classify(h, a, cfg);
    const coll = new Intl.Collator(HG_LOC());
    const ord = cfg.order || [];
    list.sort((a, b) => {
      const oa = ord.indexOf(a.id), ob = ord.indexOf(b.id);
      if (oa >= 0 || ob >= 0) return (oa < 0 ? 999 : oa) - (ob < 0 ? 999 : ob);
      const ta = a.id === '_none' ? 3 : a.id === 'siec' ? 2 : a.ents.length ? 0 : 1, tb = b.id === '_none' ? 3 : b.id === 'siec' ? 2 : b.ents.length ? 0 : 1;
      return ta - tb || coll.compare(a.name, b.name);
    });
    // stała lista pokoi z CFG (kolejność jak w CFG); bez niej – wszystkie obszary
    const rooms = Array.isArray(cfg.rooms) ? cfg.rooms.map((id) => byId[id]).filter(Boolean) : list;
    const inRoom = new Set(rooms.flatMap((a) => a.ents));
    const others = (cfg.others || []).filter((e, i, arr) => h.states[e] && arr.indexOf(e) === i && !inRoom.has(e));
    const m = { key, list, byId, rooms, others };
    this._memo.set(cfg, m);
    return m;
  },
  _classify(h, a, cfg) {
    const reg = h.entities || {}, sec = {};
    for (const [k] of HG_SEC) sec[k] = [];
    const robDev = new Set(a.ents.filter((e) => /^(vacuum|lawn_mower)\./.test(e)).map((e) => reg[e] && reg[e].device_id).filter(Boolean));
    const misc = new Map(), inA = new Set(a.ents);
    // ta sama fizyczna lampa raz: grupa (light z atrybutem entity_id) pomijana, gdy jej członek jest w tym pokoju
    a.ents = a.ents.filter((e) => { const m = e.startsWith('light.') && h.states[e].attributes.entity_id; return !(Array.isArray(m) && m.some((x) => x !== e && inA.has(x))); });
    for (const e of a.ents) {
      const s = h.states[e], dom = e.slice(0, e.indexOf('.')), r = reg[e] || {}, at = s.attributes, dc = at.device_class;
      const nmN = hgNorm((at.friendly_name || '') + ' ' + e);
      if (r.device_id && robDev.has(r.device_id) && dom !== 'vacuum' && dom !== 'lawn_mower') continue;     // robot: jedna pozycja zamiast kilkudziesięciu encji
      if (cfg.room_robots === false && (dom === 'vacuum' || dom === 'lawn_mower')) continue;               // roboty tylko w widoku Roboty
      let k = 'misc';
      if (dom === 'light') k = 'light';
      else if (dom === 'switch') k = HG_LIGHTISH.test(nmN) ? 'light' : 'sw';
      else if (['fan', 'humidifier', 'input_boolean', 'lock', 'valve', 'siren'].includes(dom)) k = 'sw';
      else if (dom === 'climate' || dom === 'water_heater') k = 'clim';
      else if (dom === 'media_player') k = 'media';
      else if (dom === 'cover') k = 'cover';
      else if (dom === 'camera') k = 'cam';
      else if (dom === 'vacuum' || dom === 'lawn_mower') k = 'rob';
      else if (dom === 'binary_sensor') k = ['motion', 'occupancy', 'presence'].includes(dc) ? 'mot' : ['door', 'window', 'opening', 'garage_door'].includes(dc) ? 'door' : 'sens';
      else if (dom === 'sensor') k = dc || at.unit_of_measurement || isFinite(parseFloat(s.state)) ? 'sens' : 'misc';
      if (k === 'misc') {
        const g = r.device_id || e;
        if (!misc.has(g)) misc.set(g, { dev: r.device_id || null, ents: [] });
        misc.get(g).ents.push(e);
      } else sec[k].push(e);
    }
    sec.misc = [...misc.values()];
    // to samo urządzenie pod kilkoma encjami o tej samej (pełnej) nazwie (np. TV w dwóch integracjach) -> jedna pozycja, dostępna ma pierwszeństwo
    for (const k of ['light', 'sw', 'media']) {
      const best = new Map();
      const fn = (e) => hgNorm((cfg.entity_names && cfg.entity_names[e]) || H.name(h, e, e));   // pełna nazwa: różne urządzenia o tej samej nazwie po obcięciu pokoju zostają
      for (const e of sec[k]) { const n = fn(e), b = best.get(n); if (!b || (!H.ok(h.states[b]) && H.ok(h.states[e]))) best.set(n, e); }
      sec[k] = sec[k].filter((e) => best.get(fn(e)) === e);
    }
    a.sec = sec;
    // temperatura / wilgotność pokoju: nadpisanie z CFG > czujnik otoczenia > bieżąca temperatura klimatyzacji/grzejnika
    const ov = (cfg.sensors || {})[a.id] || {};
    const pick = (dcx) => sec.sens.filter((e) => e.startsWith('sensor.') && h.states[e].attributes.device_class === dcx && !HG_TEMP_BAD.test(hgNorm(h.states[e].attributes.friendly_name + ' ' + e)));
    const ts = pick('temperature'), hs = pick('humidity');
    const cl = sec.clim.filter((e) => e.startsWith('climate.'));
    a.temp = ov.temperature ? { e: ov.temperature } : ts.length ? { e: ts[0] } : cl.length ? { e: cl[0], attr: 'current_temperature' } : null;
    a.hum = ov.humidity ? { e: ov.humidity } : hs.length ? { e: hs[0] } : cl.length ? { e: cl[0], attr: 'current_humidity' } : null;
    if (a.id === '_none') { a.temp = null; a.hum = null; }
    const devs = new Set(a.ents.map((e) => (reg[e] && reg[e].device_id) || e)); a.devN = devs.size;
    a.lights = sec.light;
    a.watch = [...new Set([...sec.light, ...sec.mot, ...cl, a.temp && a.temp.e, a.hum && a.hum.e].filter(Boolean))];
  },
  val(h, ref) {
    if (!ref) return null;
    const s = h.states[ref.e]; if (!H.ok(s)) return null;
    const v = parseFloat(ref.attr ? s.attributes[ref.attr] : s.state);
    return isFinite(v) ? v : null;
  },
  env(h, a) {
    const t = this.val(h, a.temp), u = this.val(h, a.hum);
    return { t, u, txt: [t != null ? `${H.fmt(t, 1)}°` : '', u != null ? `${H.fmt(u, 0)}%` : ''].filter(Boolean) };
  },
  /* nazwa bez prefiksu pokoju („Biuro Lampa” -> „Lampa”); pusta -> etykieta zastępcza */
  name(h, e, a, cfg, fb) {
    const n0 = (cfg && cfg.entity_names && cfg.entity_names[e]) || H.name(h, e, e);
    let n = n0;
    // prefiks nazwy urządzenia („Mi Air Purifier 3/3H Temperatura” -> „Temperatura”), jeśli coś zostaje
    const r = !(cfg && cfg.entity_names && cfg.entity_names[e]) && h.entities && h.entities[e], d = r && r.device_id && h.devices && h.devices[r.device_id];
    const dn = d && (d.name_by_user || d.name);
    if (dn && n.toLowerCase().startsWith(dn.toLowerCase() + ' ')) { const rest = n.slice(dn.length).replace(/^[\s\-–·:*]+/, ''); if (rest) n = rest; }
    n = n.replace(/^\*\s*/, '').replace(/\s\*\s/g, ' ');
    for (const p of (a && a.strip) || []) {
      const re = new RegExp('^\\s*' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\-–·:_]*', 'i');
      n = n.replace(re, '');
    }
    for (const p of (a && a.strip) || []) n = n.replace(new RegExp('\\s+[-–·:]?\\s*' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)', 'ig'), ' ');
    n = n.replace(/\s+(zajętość|occupancy|contact|kontakt)$/i, '').replace(/\b(\p{L}+)\s+\1$/iu, '$1').replace(/^[\s\-–·:]+|[\s\-–·:]+$/g, '');
    n = n.replace(/\s{2,}/g, ' ').trim();
    if (!n) n = fb || n0;
    return n.charAt(0).toUpperCase() + n.slice(1);
  },
  areaFromUrl() { try { return new URLSearchParams(location.search).get('area'); } catch (e) { return null; } },
};
window.__hgAreas = HGAreas;

/* --- siatka pokoi --- */
class HGAreasCard extends HGBase {
  defaults() { return { room_path: HG_P('pokoj'), areas: {} }; }
  constructor() {
    super();
    this.shadowRoot.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.act === 'open') { e.preventDefault(); this.onAct('open', e.target); }
    });
  }
  _m() { return HGAreas.model(this._hass, this._config.areas); }
  connectedCallback() { super.connectedCallback(); this._lsub = this._lsub || (() => { this._entsC = null; this.rerender(); }); HGL.subs.add(this._lsub); }
  disconnectedCallback() { if (this._lsub) HGL.subs.delete(this._lsub); }
  _extraSig() { return HGL.data.s.rooms || null; }
  /* pokoje po nadpisaniach układu: kolejność, ukryte, dodane obszary HA */
  _rooms(m) { const L = HGL.get('rooms'), hid = new Set(L.hidden);
    const add = L.added.map((x) => m.byId[x.e]).filter((a) => a && !m.rooms.includes(a));
    return HGL.sort([...m.rooms, ...add].filter((a) => !hid.has(a.id)), (a) => a.id, L.order).map((a) => { const cf = L.conf[a.id]; if (!cf) return a;
      const o = Object.assign({}, a, cf.temp ? { temp: { e: cf.temp } } : {}, cf.hum ? { hum: { e: cf.hum } } : {}, cf.n ? { name: cf.n } : {}, cf.i ? { icon: cf.i } : {}, { mode: cf.t || '' });
      o.watch = [...new Set([...(a.watch || []), cf.temp, cf.hum].filter(Boolean))]; return o; }); }
  ents() { if (!this._hass) return []; const m = this._m(); return [...this._rooms(m).flatMap((a) => a.watch || []), ...m.others]; }
  _changed() { const m = this._mm; this._mm = this._m(); if (m !== this._mm) { this._entsC = null; this._prevStates = null; } return super._changed(); }
  css() {
    return U(`
:host{ height:auto; container-type:inline-size; }
.grid{ display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:var(--s2); }
@container (min-width: 700px){ .grid{ grid-template-columns:repeat(3, minmax(0, 1fr)); } }
@container (min-width: 1000px){ .grid{ grid-template-columns:repeat(4, minmax(0, 1fr)); } }
.tile{ position:relative; display:grid; grid-template-columns:1fr auto; grid-template-rows:auto auto auto 1fr; column-gap:var(--s1); min-width:0; height:max(calc(var(--k) * 116), 150px); padding:var(--s2); border-radius:var(--r-md); cursor:pointer;
  background: var(--hg-glass-lite, var(--hg-glass-bg)); border:0; box-shadow: var(--hg-card-sh, 0 6px 20px var(--hg-glass-sh));
  color:#1E2023; text-align:left; transition: transform .25s cubic-bezier(.2,0,0,1), box-shadow .25s, background .4s; -webkit-tap-highlight-color:transparent; touch-action:manipulation; outline:none; }
.tile:active{ transform: scale(.98); }
.tile.hgm-compact{ height:auto; min-height:104px; grid-template-rows:auto auto auto; } .tile.hgm-compact .mt{ display:none; } .tile.hgm-compact .env .t{ font-size:24px; }
.tile.hgm-minimal{ height:auto; min-height:72px; grid-template-rows:auto auto; align-items:center; } .tile.hgm-minimal .env, .tile.hgm-minimal .mt{ display:none; } .tile.hgm-minimal .nm{ margin-top:6px; }
.tile.hgsz-m{ grid-column:span 2; } .tile.hgsz-l{ grid-column:1 / -1; }
.tile:focus-visible{ box-shadow: 0 0 0 2px var(--hg-accent); }
.tile *{ pointer-events:none; } .tile button, .tile button *{ pointer-events:auto; } .tile button ha-icon{ pointer-events:none; }
.ic{ grid-column:1; grid-row:1; position:relative; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--hg-tile-bg); color:#2A2D31; transition: background .2s, color .2s; }
.ic ha-icon{ width:20px; height:20px; }
.tile.lit .ic{ background:var(--hg-accent-soft); color:var(--hg-accent-tx); }
.tr{ grid-column:2; grid-row:1; display:flex; align-items:center; gap:6px; }
.pr{ width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.04); color:#7A7E84; transition: background .2s, color .2s; }
.pr ha-icon{ width:18px; height:18px; } .pr.on{ background:var(--hg-accent); color:var(--hg-on-accent); }
.lb{ position:relative; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.05); color:#3A3D42; transition: background .2s, color .2s; }
.lb ha-icon{ width:20px; height:20px; } .lb.on{ background:var(--hg-accent); color:var(--hg-on-accent); }
.lb:active{ transform:scale(.92); }
.nm{ grid-column:1 / -1; grid-row:2; margin-top:var(--s1); font-size:var(--fs-md); font-weight:500; letter-spacing:-.005em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.25; }
.env{ grid-column:1 / -1; grid-row:3; display:flex; align-items:baseline; gap:10px; min-width:0; margin-top:2px; white-space:nowrap; font-variant-numeric:tabular-nums; }
.env .t{ display:inline-flex; align-items:center; gap:2px; font-size:clamp(28px, calc(var(--k) * 24), 36px); font-weight:200; color:#1E2023; letter-spacing:-.02em; line-height:1.15; }
.env .u{ display:inline-flex; align-items:center; gap:2px; font-size:var(--fs-sm); font-weight:400; color:#4A4E54; line-height:1.15; }
.env ha-icon{ align-self:center; } .env .t ha-icon{ display:none; } .env .u ha-icon{ width:14px; height:14px; color:inherit; }
.mt{ grid-column:1 / -1; grid-row:4; align-self:end; display:flex; align-items:center; gap:5u; min-width:0; height:max(14u, 17px); font-size:var(--fs-sm); color:#4A4E54; font-variant-numeric:tabular-nums; white-space:nowrap; overflow:hidden; }
.mt > span{ overflow:hidden; text-overflow:ellipsis; min-width:0; }
.mt .lt{ color:var(--hg-accent-tx); } .mt .xp{ margin-left:auto; flex:none; width:16px; height:16px; opacity:.8; transition:transform .25s cubic-bezier(.2,0,0,1), opacity .25s; } @media (hover:hover) and (pointer:fine){ .tile:hover .xp{ opacity:1; transform:translate(2px,-2px); } }
.dot{ width:7px; height:7px; border-radius:50%; flex:none; background:var(--c); }
.cl{ display:inline-flex; align-items:center; gap:4u; flex:none; color:#3A3D42; }
.oth{ display:flex; flex-wrap:wrap; align-items:center; gap:var(--s1); margin-top:var(--s2); font-size:var(--fs-sm); color:#4A4E54; }
.oth b{ font-weight:600; color:#2A2D31; margin-right:2u; display:inline-flex; align-items:center; height:32px; padding:0 var(--s2); border-radius:16px; background:var(--hg-glass-lite, var(--hg-glass-bg)); }
.oth button{ display:inline-flex; align-items:center; gap:6px; height:40px; padding:0 var(--s2) 0 10px; border-radius:20px; background:var(--hg-glass-lite, var(--hg-glass-bg)); border:1px solid var(--hg-glass-bd); color:#2A2D31; font-size:var(--fs-sm); font-weight:600; cursor:pointer; -webkit-tap-highlight-color:transparent; touch-action:manipulation; transition: background .2s, color .2s; }
.oth button ha-icon{ width:20px; height:20px; pointer-events:none; } .oth button span{ pointer-events:none; }
.oth button.on{ background:var(--hg-accent); border-color:transparent; color:var(--hg-on-accent); }
.oth button:disabled{ opacity:.5; cursor:default; }
.oth button:active{ transform:scale(.97); }
`);
  }
  render() {
    const h = this._hass, c = this._config, m = this._m();
    const lbl = hgTr({ cool: 'Chłodzi', heat: 'Grzeje', fan_only: 'Wentyluje', dry: 'Osusza', heat_cool: 'Auto', auto: 'Auto' }, { cool: 'Cooling', heat: 'Heating', fan_only: 'Fan', dry: 'Drying', heat_cool: 'Auto', auto: 'Auto' });
    const tiles = [], rest = [];
    const LZ = HGL.get('rooms').size;
    for (const a of this._rooms(m)) {
      const env = HGAreas.env(h, a);
      const okL = a.lights.filter((e) => H.ok(h.states[e]));
      const on = a.lights.filter((e) => h.states[e].state === 'on').length;
      const cl = a.sec.clim.map((e) => h.states[e]).find((s) => s.entity_id.startsWith('climate.') && H.ok(s) && s.state !== 'off');
      const clm = cl && (HG_AC_MODE[cl.state] || HG_AC_MODE.cool);
      // pokój bez niczego, co da się pokazać lub obsłużyć -> zwinięty do wiersza "Pozostałe"
      // obecność / ruch: tylko prawdziwe, dostępne czujniki pokoju (occupancy/presence ma pierwszeństwo przed motion)
      const prs = a.sec.mot.filter((e) => H.ok(h.states[e]));
      const occ = prs.some((e) => ['occupancy', 'presence'].includes(h.states[e].attributes.device_class));
      const prOn = prs.some((e) => h.states[e].state === 'on');
      const pr = prs.length ? `<span class="pr ${prOn ? 'on' : ''}" role="img" aria-label="${H.esc(prOn ? (occ ? hgTr('Ktoś jest w pokoju', 'Someone is in the room') : hgTr('Wykryto ruch', 'Motion detected')) : (occ ? hgTr('Brak obecności', 'No presence') : hgTr('Brak ruchu', 'No motion')))}" title="${prOn ? (occ ? hgTr('Obecność', 'Presence') : hgTr('Ruch', 'Motion')) : (occ ? hgTr('Brak obecności', 'No presence') : hgTr('Brak ruchu', 'No motion'))}">${H.icon(occ ? (prOn ? 'mdi:account' : 'mdi:account-outline') : 'mdi:motion-sensor')}</span>` : '';
      const envH = env.t != null || env.u != null ? `<div class="env">${env.t != null ? `<span class="t">${H.icon('mdi:thermometer')}${H.fmt(env.t, 1)}°</span>` : ''}${env.u != null ? `<span class="u">${H.icon('mdi:water-percent')}${H.fmt(env.u, 0)}%</span>` : ''}</div>` : '';
      const mt = [on ? `<span class="lt">${hgPl(on, 'światło', 'światła', 'świateł', 'light', 'lights')}</span>` : '',
        cl ? `<span class="cl"><i class="dot" style="--c:${clm.c}"></i>${H.esc(lbl[cl.state] || H.stateLabel(cl.state))}</span>` : ''].filter(Boolean).join('<span aria-hidden="true">·</span>');
      const lb = okL.length ? `<button class="lb ${on ? 'on' : ''}" data-act="lights" data-a="${H.esc(a.id)}" aria-pressed="${!!on}" aria-label="${H.esc(hgTr(`Światła: ${a.name} – ${on ? 'wyłącz' : 'włącz'}`, `Lights: ${a.name} – ${on ? 'turn off' : 'turn on'}`))}" title="${on ? hgTr('Wyłącz światła', 'Turn off lights') : hgTr('Włącz światła', 'Turn on lights')}">${H.icon(on ? 'mdi:lightbulb-on' : 'mdi:lightbulb-outline')}</button>` : '';
      const al = [a.name, ...env.txt, on ? hgPl(on, 'światło włączone', 'światła włączone', 'świateł włączonych', 'light on', 'lights on') : '', prs.length ? (prOn ? (occ ? hgTr('obecność', 'presence') : hgTr('ruch', 'motion')) : '') : '', cl ? (lbl[cl.state] || cl.state) : ''].filter(Boolean).join(', ');
      tiles.push(`<div class="tile lift ${on ? 'lit' : ''} ${HGL.szc(LZ[a.id])} ${a.mode ? 'hgm-' + a.mode : ''}" data-hgk="${H.esc(a.id)}" role="button" tabindex="0" data-act="open" data-a="${H.esc(a.id)}" aria-label="${H.esc(al)}">
        <span class="ic">${H.icon(a.icon)}</span><span class="tr">${pr}${lb}</span><b class="nm">${H.esc(a.name)}</b>${envH}<div class="mt">${mt}<span class="xp">${H.icon('mdi:arrow-top-right')}</span></div></div>`);
    }
    // „Pozostałe”: kompaktowe przełączniki encji spoza 6 pokoi (każda raz)
    const oth = m.others.length ? `<div class="oth" role="group" aria-label="${hgTr('Pozostałe', 'Other')}"><b>${hgTr('Pozostałe', 'Other')}</b>${m.others.map((e) => {
      const s = h.states[e], ok = H.ok(s), on = s.state === 'on', nm = HGAreas.name(h, e, null, c.areas);
      const ic = /schod|stair/.test(e) ? 'mdi:stairs-down' : /taras|balkon|balcony|terrace/.test(e) ? 'mdi:balcony' : 'mdi:lightbulb-outline';
      return `<button class="pl ${on ? 'on' : ''}" data-act="tog" data-e="${H.esc(e)}" ${ok ? '' : 'disabled'} aria-pressed="${on}" aria-label="${H.esc(`${nm} – ${ok ? (on ? hgTr('wyłącz', 'turn off') : hgTr('włącz', 'turn on')) : hgTr('niedostępne', 'unavailable')}`)}">${H.icon(ic)}<span>${H.esc(nm)}</span></button>`;
    }).join('')}</div>` : '';
    return `<div class="grid" role="list" aria-label="${hgTr('Pokoje', 'Rooms')}" data-hgl="rooms" data-hgsz="1">${tiles.join('')}</div>${oth}`;
  }
  onAct(act, t) {
    const h = this._hass, c = this._config;
    if (act === 'tog') { const e = t.dataset.e, s = h.states[e]; if (!H.ok(s)) return; return H.call(h, 'homeassistant', s.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: e }); }
    const a = this._m().byId[t.dataset.a]; if (!a) return;
    if (act === 'open') return H.navigate(`${c.room_path}?area=${encodeURIComponent(a.id)}`);
    if (act === 'lights') {
      const on = a.lights.filter((e) => h.states[e].state === 'on'), av = a.lights.filter((e) => H.ok(h.states[e]));
      if (on.length) return H.call(h, 'homeassistant', 'turn_off', { entity_id: on });
      if (av.length) return H.call(h, 'homeassistant', 'turn_on', { entity_id: av });
    }
  }
  getCardSize() { return 8; }
}
hgReg('hg-areas-card', HGAreasCard, 'Home Glass – Pokoje', 'Wszystkie obszary HA: temperatura, wilgotność, światła, ruch, klimatyzacja');

/* --- komponenty urządzeń w widoku pokoju: jedna karta na fizyczne urządzenie (rejestr urządzeń), encje połączone wizualnie ---
   Profile (czajnik, poidełko, frytkownica, oczyszczacz) dobierane po modelu/nazwie urządzenia; pozostałe urządzenia: karta ogólna
   (główny przełącznik + do 3 kluczowych odczytów + „Więcej”). Pokazywane tylko dostępne encje z prawdziwymi wartościami. */
const HG_ST_PL = { standby: 'Gotowość', idle: 'Bezczynny', heating: 'Grzeje', boiling: 'Gotuje', 'keep warm': 'Utrzymuje temperaturę', 'keep-warm': 'Utrzymuje temperaturę',
  warming: 'Utrzymuje temperaturę', cooking: 'Gotuje', preheat: 'Rozgrzewa', preheating: 'Rozgrzewa', appointment: 'Zaplanowane', reservation: 'Zaplanowane', paused: 'Pauza', pause: 'Pauza',
  completed: 'Gotowe', done: 'Gotowe', finished: 'Gotowe', running: 'Pracuje', working: 'Pracuje', shutdown: 'Wyłączone', off: 'Wyłączone', on: 'Włączone', auto: 'Automatyczny',
  silent: 'Cichy', sleep: 'Nocny', favorite: 'Ulubiony', manual: 'Ręczny', normal: 'Normalny', smart: 'Inteligentny', 'intermittent': 'Przerywany' };
const HG_ST_EN = { standby: 'Standby', idle: 'Idle', heating: 'Heating', boiling: 'Boiling', 'keep warm': 'Keeping warm', 'keep-warm': 'Keeping warm',
  warming: 'Keeping warm', cooking: 'Cooking', preheat: 'Preheating', preheating: 'Preheating', appointment: 'Scheduled', reservation: 'Scheduled', paused: 'Paused', pause: 'Paused',
  completed: 'Done', done: 'Done', finished: 'Done', running: 'Running', working: 'Running', shutdown: 'Off', off: 'Off', on: 'On', auto: 'Auto',
  silent: 'Silent', sleep: 'Sleep', favorite: 'Favorite', manual: 'Manual', normal: 'Normal', smart: 'Smart', 'intermittent': 'Intermittent' };
const HG_FAULT_OK = /^(0|no ?errors?|no ?faults?|none|normal|ok|brak)$/i;
const HG_DEV_PROF = [
  { id: 'washer', re: /washer|pralk|DA_WM/i, icon: 'mdi:washing-machine', name: 'Pralka', nameEn: 'Washer', metrics: [] },
  { id: 'kettle', re: /kettle|czajnik/i, icon: 'mdi:kettle-outline', name: 'Czajnik', nameEn: 'Kettle', main: /(_on_p_|switch_status)/, status: /_status_p_|status$/, fault: /fault/,
    metrics: [{ re: /_temperature_p_2_3|current.*water.*temp/, dom: 'sensor', label: 'Woda', en: 'Water', big: true }, { re: /target_temperature/, label: 'Cel', en: 'Target' }, { re: /keep_warm_temperature/, label: 'Utrzymanie', en: 'Keep warm' }],
    warn: [{ re: /kettle_lifting/, on: 'Zdjęty z podstawy', en: 'Lifted off base', icon: 'mdi:arrow-up-bold-box-outline' }] },
  { id: 'fountain', re: /pet_waterer|fountain|poidl/i, icon: 'mdi:fountain', name: 'Poidełko', nameEn: 'Pet fountain', main: /_on_p_/, status: /_mode_p_/, fault: /fault/,
    metrics: [{ re: /filter_left_time/, label: 'Filtr', en: 'Filter' }, { re: /cotton_left_time/, label: 'Wkład', en: 'Cartridge' }, { re: /remain_clean_time/, label: 'Do mycia', en: 'Until cleaning' }],
    warn: [{ re: /no_water_flag/, on: 'Brak wody', en: 'No water', icon: 'mdi:water-off-outline' }, { re: /pump_block/, on: 'Pompa zablokowana', en: 'Pump blocked', icon: 'mdi:pump-off' }, { re: /lid_up/, on: 'Pokrywa otwarta', en: 'Lid open', icon: 'mdi:alert-outline' }] },
  { id: 'fryer', re: /fryer|frytk/i, icon: 'mdi:pot-steam-outline', name: 'Frytkownica', nameEn: 'Air fryer', status: /_status_p_|status$/, fault: /fault/,
    metrics: [{ re: /_left_time_p_/, label: 'Pozostało', en: 'Remaining', active: true, big: true }, { re: /target_temperature/, label: 'Temperatura', en: 'Temperature' }, { re: /target_time/, label: 'Czas', en: 'Time' }] },
  { id: 'purifier', re: /airpurifier|air_purifier|purifier|oczyszcz/i, icon: 'mdi:air-purifier', name: 'Oczyszczacz', nameEn: 'Air purifier', mainDom: 'fan', fault: /fault/,
    metrics: [{ dc: 'pm25', label: 'PM2,5', en: 'PM2.5', big: true }, { re: /filter_life_level/, label: 'Filtr', en: 'Filter' }, { dc: 'temperature', label: 'Temperatura', en: 'Temperature' }, { dc: 'humidity', label: 'Wilgotność', en: 'Humidity' }] },
];
const HGDev = {
  /* grupy urządzeń z encji pokoju (bez świateł, mediów, klimatyzacji, kamer, robotów – te mają własne komponenty) */
  groups(h, a, skipDev) {
    const reg = h.entities || {}, S = a.sec, g = new Map(), loose = [];
    const pool = [...S.sw, ...S.sens, ...S.misc.flatMap((x) => x.ents)];
    for (const e of pool) {
      const d = reg[e] && reg[e].device_id;
      if (d && skipDev.has(d)) continue;                       // np. Apple TV: czujnik „keyboard focus” należy do odtwarzacza
      if (!d) { loose.push(e); continue; }
      if (!g.has(d)) g.set(d, []);
      g.get(d).push(e);
    }
    return { devs: [...g.entries()].map(([d, ents]) => ({ d, ents })), loose };
  },
  prof(h, d, ents) {
    const dv = (h.devices || {})[d] || {}, key = [dv.model, dv.name, dv.name_by_user, ...ents].join(' ');
    return HG_DEV_PROF.find((p) => p.re.test(key)) || null;
  },
  ok: (s) => H.ok(s) && s.state !== '',
  stPl: (v) => hgTr(HG_ST_PL, HG_ST_EN)[String(v).toLowerCase()] || String(v),
};


/* --- pralka (SmartThings): bęben animowany wg fazy; tylko istniejące encje --- */
const HG_WM_JOB = { wash: 'Pranie', ai_wash: 'Pranie AI', pre_wash: 'Pranie wstępne', air_wash: 'Odświeżanie', rinse: 'Płukanie', ai_rinse: 'Płukanie AI', spin: 'Wirowanie', ai_spin: 'Wirowanie AI',
  drying: 'Suszenie', cooling: 'Chłodzenie', weight_sensing: 'Ważenie prania', delay_wash: 'Opóźniony start', wrinkle_prevent: 'Ochrona przed zagnieceniem', freeze_protection: 'Ochrona przed mrozem', finish: 'Zakończone', none: '' };
const HG_WM_JOB_EN = { wash: 'Washing', ai_wash: 'AI wash', pre_wash: 'Pre-wash', air_wash: 'Air wash', rinse: 'Rinsing', ai_rinse: 'AI rinse', spin: 'Spinning', ai_spin: 'AI spin',
  drying: 'Drying', cooling: 'Cooling', weight_sensing: 'Weighing load', delay_wash: 'Delayed start', wrinkle_prevent: 'Wrinkle prevention', freeze_protection: 'Freeze protection', finish: 'Finished', none: '' };
const HG_WM_MS = { run: 'Pracuje', pause: 'Pauza', stop: 'Zatrzymana' };
const HG_WM_MS_EN = { run: 'Running', pause: 'Paused', stop: 'Stopped' };
const HG_WM_ANIM = { wash: 'wash', ai_wash: 'wash', pre_wash: 'wash', air_wash: 'wash', weight_sensing: 'wash', rinse: 'rinse', ai_rinse: 'rinse', spin: 'spin', ai_spin: 'spin', drying: 'wash', cooling: 'wash', wrinkle_prevent: 'wash' };
/* --- szczegóły pokoju (<pulpit>/pokoj?area=<id>) --- */
class HGRoomCard extends HGBase {
  defaults() { return { areas: {}, robots_path: HG_P('roboty') }; }
  constructor() {
    super();
    this._ac = new Map();
    this._onLoc = () => { if (this._aid !== HGAreas.areaFromUrl()) { this._showUn = false; this.rerender(); } };
    this.shadowRoot.addEventListener('change', (e) => {
      const t = e.target; if (t.dataset && t.dataset.act === 'vol') return H.call(this._hass, 'media_player', 'volume_set', { entity_id: t.dataset.e, volume_level: Number(t.value) / 100 });
      if (!t.dataset || t.dataset.act !== 'bri') return;
      const v = Number(t.value), en = t.dataset.e;
      return v <= 0 ? H.call(this._hass, 'light', 'turn_off', { entity_id: en }) : H.call(this._hass, 'light', 'turn_on', { entity_id: en, brightness_pct: v });
    });
    this.shadowRoot.addEventListener('input', (e) => { const t = e.target; if (t.dataset && (t.dataset.act === 'bri' || t.dataset.act === 'vol')) { t.style.setProperty('--v', t.value + '%'); const o = t.parentNode.querySelector('output'); if (o) o.textContent = t.value + '%'; } }, { passive: true });
  }
  connectedCallback() {
    window.addEventListener('location-changed', this._onLoc); window.addEventListener('popstate', this._onLoc);
    super.connectedCallback(); this._onLoc();
    this._lsub = this._lsub || (() => { this._entsC = null; this.rerender(); }); HGL.subs.add(this._lsub);
  }
  disconnectedCallback() { if (this._lsub) HGL.subs.delete(this._lsub); window.removeEventListener('location-changed', this._onLoc); window.removeEventListener('popstate', this._onLoc); clearInterval(this._stT); this._stT = 0; clearInterval(this._mpT); this._mpT = 0; }
  set hass(h) { super.hass = h; for (const el of this._ac.values()) el.hass = h; if (this._cams) for (const el of this._cams.values()) el.hass = h; }
  get hass() { return this._hass; }
  _area() { const m = HGAreas.model(this._hass, this._config.areas); this._aid = HGAreas.areaFromUrl(); return m.byId[this._aid] || null; }
  ents() {
    if (!this._hass) return [];
    const a = this._area(); if (!a) return [];
    const ad = HGL.get('room:' + a.id).added.map((x) => x.e).filter((e) => !/^(climate|camera)\./.test(e));
    return [...new Set([...a.ents.filter((e) => !e.startsWith('climate.') && !e.startsWith('camera.')), ...ad, a.temp && a.temp.e, a.hum && a.hum.e].filter(Boolean))];
  }
  _extraSig() { const id = HGAreas.areaFromUrl(); return [id, !!this._showUn, [...(this._devOpen || [])].join(','), HGL.data.s['room:' + id] || null]; }
  _changed() { const m = this._mm; this._mm = HGAreas.model(this._hass, this._config.areas); if (m !== this._mm || this._lastAid !== HGAreas.areaFromUrl()) { this._lastAid = HGAreas.areaFromUrl(); this._entsC = null; this._prevStates = null; } return super._changed(); }
  css() {
    return U(`
:host{ height:auto; }
.wrap{ column-width: max(280px, calc(var(--k) * 250)); column-gap:11u; }
.blk{ break-inside:avoid; -webkit-column-break-inside:avoid; display:block; margin:0 0 11u; }
.wrap.gsz{ columns:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, max(280px, calc(var(--k) * 250))), 1fr)); gap:11u; align-items:start; }
.wrap.gsz > .blk{ margin:0; min-width:0; } .wrap.gsz > .blk.hgsz-m{ grid-column:span 2; } .wrap.gsz > .blk.hgsz-l{ grid-column:1 / -1; }
@container (max-width: 600px){ .wrap.gsz > .blk.hgsz-m{ grid-column:1 / -1; } }
${HG_TILE_CSS}
.tg2.one{ grid-template-columns:1fr; }
.blk.hgm-compact ha-card{ padding:10px !important; } .blk.hgm-compact .row, .blk.hgm-compact .lt, .blk.hgm-compact .sc{ min-height:44px; padding-top:4px; padding-bottom:4px; } .blk.hgm-compact .tx span, .blk.hgm-compact .ltx span{ display:none; }
.blk.hgm-minimal .sh{ display:none; } .blk.hgm-minimal .tx span, .blk.hgm-minimal .ltx span, .blk.hgm-minimal .st2 small{ display:none; } .blk.hgm-minimal ha-card{ padding:8px !important; }
.blk > ha-card.glass{ height:auto; min-height:0; display:flex; flex-direction:column; gap:4u; padding:var(--s2) var(--s2); }
.acslot{ min-height:0; }
.camslot{ height:auto; } .camslot > *{ display:block; height:auto; }
/* stan pokoju: chipy */
/* światła: kafle (dotknięcie = przełącz), jasność pod spodem gdy włączone */
.lg{ display:grid; grid-template-columns:repeat(auto-fill, minmax(min(176px, 100%), 1fr)); gap:var(--s1); }
.lt{ position:relative; display:flex; flex-direction:column; border-radius:var(--r-sm); background:rgba(255,255,255,.30); box-shadow:inset 0 0 0 1px var(--hg-glass-bd); transition:background .3s cubic-bezier(.2,0,0,1), box-shadow .3s; min-width:0; }
.lt.on{ background:rgba(255,255,255,.55); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--hg-accent) 40%, transparent); }
.ltb{ display:flex; align-items:center; gap:10px; min-height:60px; padding:10px 36px 10px 10px; background:none; color:inherit; text-align:left; border-radius:inherit; min-width:0; transition:transform .15s cubic-bezier(.2,0,0,1); }
.ltb:active{ transform:scale(.96); }
.lti{ flex:none; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--hg-tile-bg); color:#4A4E54; box-shadow:none; transition:background .3s, color .3s; }
.lti ha-icon{ width:20px; height:20px; } .lt.on .lti{ background:var(--hg-accent); color:var(--hg-on-accent); box-shadow:0 2px 10px color-mix(in srgb, var(--hg-accent) 45%, transparent); }
.ltx{ display:flex; flex-direction:column; gap:1px; min-width:0; } .ltx b{ font-size:var(--fs-sm); font-weight:600; color:#1E2023; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .ltx span{ font-size:var(--fs-xs); color:#4A4E54; white-space:nowrap; }
.ltm{ position:absolute; top:6px; right:4px; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:none; color:#6A6E74; }
.ltm ha-icon{ width:18px; height:18px; } @media (pointer:coarse){ .ltm::before{ content:''; position:absolute; inset:-6px; } }
.lt .br{ padding:0 12px 8px 12px; }
/* niedostępne: cicha zwijana linia bez karty */
.unb > ha-card.quiet{ background:none !important; border:0 !important; box-shadow:none !important; padding:0 !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; margin:0 !important; width:100% !important; }
.unb > ha-card.quiet::after, .unb > ha-card.quiet::before{ display:none !important; }
.unb .unh{ min-height:40px; padding:0 var(--s3); font-size:var(--fs-sm); color:#fff; opacity:.85; text-shadow:0 1px 2px rgba(0,0,0,.35); }
.unb .unh ha-icon{ color:inherit; }
/* odtwarzacz */
ha-card.mpc{ position:relative; overflow:hidden; display:flex; flex-direction:column; gap:var(--s2); padding:var(--s3); }
.mpbg{ position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity 1s; background:radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--mt) 34%, transparent), color-mix(in srgb, var(--mt) 8%, transparent) 60%, transparent); }
.mpc[style*="--mt"] .mpbg{ opacity:1; }
.mpc > *:not(.mpbg){ position:relative; }
.mph{ display:flex; align-items:center; gap:var(--s2); min-width:0; }
.mpa{ width:72px; height:72px; border-radius:14px; flex:none; object-fit:cover; box-shadow:0 8px 24px rgba(0,0,0,.18); background:rgba(255,255,255,.55); transition:transform .5s cubic-bezier(.2,.7,.2,1); }
.mpc.pl .mpa{ transform:scale(1.04); } .mpa.ic{ display:grid; place-items:center; color:#3A3D42; --mdc-icon-size:34px; }
.mpi{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; text-align:left; color:inherit; }
.mpi .mpd{ font-size:var(--fs-xs); color:#4A4E54; font-weight:600; letter-spacing:.02em; }
.mpc .mpi b{ font-size:calc(var(--fs-md) * 1.35); font-weight:700; line-height:1.2; color:#111111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mpc .mpi > span:last-child{ font-size:var(--fs-sm); color:#3A3D42; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mpg{ display:flex; flex-direction:column; gap:4px; }
.mpt{ height:5px; border-radius:3px; background:rgba(0,0,0,.12); overflow:hidden; } .mpt i{ display:block; height:100%; background:#1E2023; transform-origin:left; transition:transform 1s linear; }
.mpn{ display:flex; justify-content:space-between; font-size:var(--fs-xs); color:#4A4E54; font-variant-numeric:tabular-nums; }
.mpk{ display:flex; align-items:center; justify-content:center; gap:var(--s3); }
.mb{ width:44px; height:44px; border-radius:50%; display:grid; place-items:center; color:#1E2023; background:transparent; flex:none; transition:transform .15s, background .2s; }
.mb:active{ transform:scale(.92); } .mb:hover{ background:rgba(0,0,0,.06); }
.mb.big{ width:56px; height:56px; background:#1E2023; color:#FFFFFF; --mdc-icon-size:30px; box-shadow:0 6px 18px rgba(0,0,0,.18); } .mb.big:hover{ background:#2C2F33; }
.mpf{ display:flex; align-items:center; gap:var(--s2); flex-wrap:wrap; }
.mpv{ flex:1 1 220px; display:flex; align-items:center; gap:var(--s1); min-width:0; color:#3A3D42; }
.mpv input{ flex:1; min-width:0; height:24px; -webkit-appearance:none; appearance:none; background:transparent; }
.mpc .mpv input[type=range]::-webkit-slider-runnable-track{ height:5px; border-radius:3px; background:linear-gradient(90deg, #1E2023 var(--v), rgba(0,0,0,.14) var(--v)); }
.mpc .mpv input[type=range]::-moz-range-progress{ background:#1E2023; }
.mpc .mpv input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:18px; height:18px; margin-top:-6.5px; border-radius:50%; background:var(--hg-thumb); box-shadow:var(--hg-thumb-sh); }
.mpv output{ width:3.2em; text-align:right; font-size:var(--fs-xs); color:#4A4E54; font-variant-numeric:tabular-nums; }
.mpch{ display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 12px; border-radius:999px; background:rgba(255,255,255,.45); box-shadow:inset 0 0 0 1px var(--hg-glass-bd); font-size:var(--fs-xs); font-weight:600; color:#1E2023; --mdc-icon-size:16px; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mpc.off .mpa{ filter:grayscale(1); opacity:.7; }
.mb ha-icon{ width:24px; height:24px; } .mb.big ha-icon{ width:30px; height:30px; } .mb.sm{ width:40px; height:40px; background:transparent !important; box-shadow:none !important; border:0 !important; } .mb.sm ha-icon{ width:20px; height:20px; }
.mpa.ic ha-icon{ width:34px; height:34px; } .mpch ha-icon{ width:16px; height:16px; flex:none; } .mpv > ha-icon{ width:20px; height:20px; }
@media (max-width:600px){ .mpa{ width:60px; height:60px; } .mpk{ gap:var(--s2); } }
@media (prefers-reduced-motion: reduce){ .mpa, .mpt i, .mpbg{ transition:none; } }
/* schody – dwie karty lamp (Dół/Góra) + tor sekwencji między nimi, chipy czujników, przełącznik grupy i automatyzacji; jeden akcent */
.stb{ column-span:all; } ha-card.stc{ display:flex; flex-direction:column; gap:var(--s2); padding:var(--s3); }
.sth{ display:flex; align-items:center; gap:var(--s2); } .sth > div{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.sth b{ font-size:var(--fs-md); font-weight:500; letter-spacing:-.01em; } .stf{ font-size:var(--fs-xs); opacity:.62; font-variant-numeric:tabular-nums; }
.lit .stf{ color:var(--hg-accent-tx); opacity:1; }
.sgl{ display:inline-flex; align-items:center; gap:var(--s1); font-size:var(--fs-sm); opacity:.9; }
.stl{ display:grid; grid-template-columns:minmax(0,1fr) minmax(48px, 120px) minmax(0,1fr); align-items:center; gap:var(--s2); }
.lp{ position:relative; overflow:hidden; isolation:isolate; display:flex; flex-direction:column; gap:var(--s2); padding:var(--s3); border-radius:var(--r-md); background:var(--hg-tile-bg); min-width:0; cursor:pointer; text-align:left; color:inherit; }
.lp::before{ content:''; position:absolute; inset:-30%; z-index:-1; background:radial-gradient(50% 50% at 30% 20%, var(--hg-accent-soft), transparent 70%); opacity:0; transform:scale(.7); transition:opacity 1.8s cubic-bezier(.25,.6,.3,1), transform 1.8s cubic-bezier(.25,.6,.3,1); }
.lp.on::before{ opacity:var(--g); transform:scale(1); }
.lp .lh{ display:flex; align-items:center; gap:10px; }
.lp .li{ width:36px; height:36px; flex:none; border-radius:50%; display:grid; place-items:center; background:var(--hg-tile-bg); transition:background 1.2s, color 1.2s; } .lp .li ha-icon{ width:20px; height:20px; }
.lp.on .li{ background:var(--hg-accent-soft); color:var(--hg-accent-tx); }
.lp .ln2{ flex:1; min-width:0; display:flex; flex-direction:column; } .lp .ln2 b{ font-size:var(--fs-sm); font-weight:500; } .lp .ln2 small{ font-size:var(--fs-xs); opacity:.62; }
.lp .lv{ font-size:calc(var(--fs-md) * 2.6); font-weight:200; letter-spacing:-.04em; line-height:1; font-variant-numeric:tabular-nums; } .lp .lv small{ font-size:.38em; font-weight:300; opacity:.62; margin-left:2px; letter-spacing:0; }
.lp .gb{ position:relative; height:10px; border-radius:999px; overflow:hidden; background:repeating-linear-gradient(-55deg, rgba(128,134,140,.30) 0 2px, transparent 2px 6px); }
.lp .gb i{ position:absolute; left:0; top:0; bottom:0; width:calc(var(--b) * 100%); border-radius:999px; background:linear-gradient(90deg, var(--hg-accent), var(--hg-accent-hi)); transition:width 1.8s cubic-bezier(.25,.6,.3,1); }
.lp.na{ opacity:.45; cursor:default; }
.lp .tg{ pointer-events:none; }
.trk2{ position:relative; height:4px; border-radius:2px; background:rgba(128,134,140,.25); }
.trk2 .f{ position:absolute; top:0; bottom:0; border-radius:2px; background:var(--hg-accent); opacity:0; transition:opacity 1.8s cubic-bezier(.25,.6,.3,1); }
.trk2 .f.a{ left:0; width:50%; } .trk2 .f.b{ right:0; width:50%; } .trk2 .f.on{ opacity:.85; }
.trk2 .dt{ position:absolute; top:50%; width:10px; height:10px; margin:-5px 0 0 -5px; border-radius:50%; background:var(--hg-accent); box-shadow:0 0 10px var(--hg-accent-glow); opacity:0; }
.trk2.up .dt{ animation:var(--hg-sc-anim, stTr 1.8s cubic-bezier(.4,0,.2,1) infinite); } .trk2.dn .dt{ animation:var(--hg-sc-anim, stTr 1.8s cubic-bezier(.4,0,.2,1) infinite reverse); }
.trk2 .ar{ position:absolute; left:50%; top:-18px; transform:translateX(-50%); width:16px; height:16px; opacity:.5; } .trk2.dn .ar{ transform:translateX(-50%) scaleX(-1); }
@keyframes stTr{ 0%{ left:0; opacity:0 } 15%{ opacity:1 } 85%{ opacity:1 } 100%{ left:100%; opacity:0 } }
.str{ position:relative; width:40px; height:40px; flex:none; display:grid; place-items:center; }
.str svg{ position:absolute; inset:0; width:100%; height:100%; transform:rotate(-90deg); }
.str .rb{ fill:none; stroke:rgba(128,134,140,.25); stroke-width:3; }
.str .rf{ fill:none; stroke:var(--hg-accent); stroke-width:3; stroke-linecap:round; stroke-dasharray:100; stroke-dashoffset:var(--o0); animation:stRing linear forwards; }
@keyframes stRing{ from{ stroke-dashoffset:var(--o0) } to{ stroke-dashoffset:100 } }
.stn{ position:absolute; inset:0; display:grid; place-items:center; line-height:1; font-size:var(--fs-sm); font-weight:300; font-variant-numeric:tabular-nums; }
.stg{ display:grid; grid-template-columns:repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap:var(--s1); }
.sm, .sta.tl{ position:relative; display:flex; align-items:center; gap:10px; min-height:52px; padding:8px 14px; border-radius:999px; background:var(--hg-tile-bg); color:inherit; text-align:left; min-width:0; }
.sta.tl{ justify-content:space-between; font-size:var(--fs-sm); }
.sm > ha-icon{ width:18px; height:18px; flex:none; opacity:.7; } .sm.on > ha-icon{ color:var(--hg-accent-tx); opacity:1; }
.sm > span{ flex:1; display:flex; flex-direction:column; min-width:0; } .sm b{ font-size:var(--fs-sm); font-weight:500; } .sm small{ font-size:var(--fs-xs); opacity:.62; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sm.on small{ color:var(--hg-accent-tx); opacity:1; } .sm > i{ width:6px; height:6px; border-radius:50%; flex:none; background:var(--hg-accent); opacity:0; } .sm.on > i{ opacity:1; }
@container (max-width: 560px){ .stl{ grid-template-columns:1fr; } .trk2{ width:4px; height:40px; justify-self:center; } .trk2 .f.a{ top:auto; bottom:0; left:0; right:0; width:auto; height:50%; } .trk2 .f.b{ top:0; bottom:auto; left:0; right:0; width:auto; height:50%; } .trk2 .ar{ display:none; } .trk2 .dt{ left:50% !important; animation-name:stTrV !important; } }
@keyframes stTrV{ 0%{ top:100%; opacity:0 } 15%{ opacity:1 } 85%{ opacity:1 } 100%{ top:0; opacity:0 } }
ha-card.stc{ container-type:inline-size; }
@media (prefers-reduced-motion: reduce){ .lp::before, .lp .gb i, .trk2 .f{ transition:none; } .trk2 .dt, .str .rf{ animation:none; } }

.sv3{ position:relative; border-radius:var(--r-md); background:var(--hg-tile-bg); padding:var(--s2); overflow:hidden; }
.sv3 svg{ display:block; width:100%; max-width:720px; margin:0 auto; max-height:320px; overflow:visible; }
.sv3 .tread{ fill:currentColor; fill-opacity:.26; } .sv3 .riser{ fill:currentColor; fill-opacity:.12; } .sv3 .side{ fill:currentColor; fill-opacity:.06; }
.sv3 .edge{ stroke:currentColor; stroke-opacity:.35; stroke-width:1; fill:none; }
.sv3 .gl{ fill:var(--hg-accent); opacity:0; transition:opacity 1.2s cubic-bezier(.25,.6,.3,1); transition-delay:var(--d, 0s); }
.sv3 .gl.on{ opacity:var(--o); }
.sv3 .cone{ opacity:0; transition:opacity 1.8s cubic-bezier(.25,.6,.3,1); } .sv3 .lmp.on .cone{ opacity:calc(var(--g) * .8); }
.sv3 .halo{ opacity:0; transform-box:fill-box; transform-origin:center; transform:scale(.5); transition:opacity 1.8s, transform 1.8s cubic-bezier(.25,.6,.3,1); } .sv3 .lmp.on .halo{ opacity:var(--g); transform:scale(1); }
.sv3 .bulb{ fill:currentColor; fill-opacity:.3; stroke:currentColor; stroke-opacity:.25; stroke-width:1.5; transition:fill 1.8s, fill-opacity 1.8s; } .sv3 .lmp.on .bulb{ fill:var(--hg-accent-hi); fill-opacity:1; stroke:var(--hg-accent); stroke-opacity:1; }
.sv3 .lmp{ cursor:pointer; } .sv3 .lmp .hit{ fill:transparent; } .sv3 .lmp:focus-visible .bulb{ stroke-width:3; }
.sv3 text{ fill:currentColor; font-size:11px; } .sv3 .tl{ fill-opacity:.9; font-weight:500; } .sv3 .ts{ fill-opacity:.55; font-size:10px; } .sv3 .mk.on .ts{ fill:var(--hg-accent-tx); fill-opacity:1; }
.sv3 .mk .dt{ fill:currentColor; fill-opacity:.35; } .sv3 .mk.on .dt{ fill:var(--hg-accent); fill-opacity:1; }
.sv3 .mk .rp{ fill:none; stroke:var(--hg-accent); stroke-width:1.5; opacity:0; transform-box:fill-box; transform-origin:center; } .sv3 .mk.on .rp{ animation:var(--hg-sc-anim, scRipple 1.8s cubic-bezier(.2,0,0,1) infinite); } .sv3 .mk.on .rp.r2{ animation-delay:.9s; }
.stg2{ display:flex; flex-wrap:wrap; justify-content:flex-start; align-items:center; gap:var(--s1); }
.stg2 .cp{ flex:0 0 auto; width:auto; justify-content:flex-start; gap:10px; }
.cp{ display:inline-flex; align-items:center; gap:8px; min-height:44px; padding:0 6px 0 14px; border-radius:999px; background:var(--hg-tile-bg); font-size:var(--fs-sm); color:inherit; }
.cp b{ font-weight:500; } .cp small{ font-size:var(--fs-xs); opacity:.62; font-variant-numeric:tabular-nums; } .cp.on small{ color:var(--hg-accent-tx); opacity:1; }
@media (prefers-reduced-motion: reduce){ .sv3 .gl, .sv3 .cone, .sv3 .halo{ transition:none; } }

ha-card.cwc{ display:flex; flex-direction:column; gap:var(--s2); padding:var(--s3); container-type:inline-size; }
.cwm{ display:grid; grid-template-columns:auto minmax(200px,1fr) minmax(0,1.3fr); min-height:150px; gap:var(--s3); align-items:center; }
@container (max-width: 560px){ .cwm{ grid-template-columns:auto 1fr; } .cwi{ grid-column:1 / -1; } }
.cwt{ position:relative; width:56px; height:150px; border-radius:28px; background:repeating-linear-gradient(-55deg, rgba(128,134,140,.22) 0 2px, transparent 2px 6px), var(--hg-tile-bg); overflow:hidden; }
.cwt .fl{ position:absolute; left:0; right:0; bottom:0; height:calc(var(--f) * 100%); background:linear-gradient(0deg, var(--hg-accent), var(--hg-accent-hi)); border-radius:0 0 28px 28px; transition:height 1.2s cubic-bezier(.2,.8,.2,1); box-shadow:0 0 18px var(--hg-accent-glow); }
.cwt .tg2{ position:absolute; left:8px; right:8px; bottom:calc(var(--tf) * 100%); height:2px; border-radius:1px; background:var(--hg-thumb, #fff); opacity:.9; box-shadow:0 0 0 1px rgba(0,0,0,.08); }
.cwt .bb{ position:absolute; bottom:6px; width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,.75); animation:var(--hg-sc-anim, cwB 2.4s ease-in infinite); }
.cwt .b1{ left:14px; } .cwt .b2{ left:26px; animation-delay:.8s; } .cwt .b3{ left:38px; animation-delay:1.6s; }
@keyframes cwB{ 0%{ transform:translateY(0) scale(.6); opacity:0 } 20%{ opacity:.9 } 100%{ transform:translateY(calc(var(--f) * -150px)) scale(1); opacity:0 } }
.cwv{ display:flex; flex-direction:column; gap:6px; min-width:0; }
.cwn{ font-size:calc(var(--fs-md) * 4.4); font-weight:200; letter-spacing:-.05em; line-height:.95; font-variant-numeric:tabular-nums; } .cwn sup{ font-size:.28em; font-weight:300; vertical-align:1.9em; margin-left:2px; letter-spacing:0; opacity:.7; }
.cws{ display:inline-flex; align-items:center; gap:4px; font-size:var(--fs-sm); opacity:.7; } .cws ha-icon{ width:16px; height:16px; } .heat .cws{ color:var(--hg-accent-tx); opacity:1; } .heat .cws ha-icon{ animation:var(--hg-sc-anim, hgwave 1.6s ease-in-out infinite); }
.cwa{ display:inline-flex; align-items:center; gap:6px; margin-top:4px; padding:4px; border-radius:999px; background:var(--hg-tile-bg); align-self:flex-start; }
.cv2{ width:40px; height:40px; border-radius:50%; display:grid; place-items:center; background:var(--hg-tile-bg); } .cv2 ha-icon{ width:18px; height:18px; } .cv2:active{ transform:scale(.92); } .cv2[disabled]{ opacity:.35; }
.cwg{ display:flex; flex-direction:column; align-items:center; min-width:56px; line-height:1.1; } .cwg small{ font-size:var(--fs-xs); opacity:.6; } .cwg b{ font-size:var(--fs-md); font-weight:400; font-variant-numeric:tabular-nums; }
.cwi{ display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:var(--s1); align-self:stretch; align-content:center; }
.cwi > div{ container-type:inline-size; overflow:hidden; display:flex; flex-direction:column; justify-content:center; gap:4px; min-height:96px; padding:14px 16px; border-radius:var(--r-sm); background:var(--hg-tile-bg); min-width:0; }
.cwi b{ font-size:calc(var(--fs-md) * 1.3); font-weight:300; letter-spacing:-.02em; font-variant-numeric:tabular-nums; } .cwi small{ font-size:var(--fs-xs); opacity:.6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cwi .cwp b{ font-size:min(calc(var(--fs-md) * 2.2), 28cqi); white-space:nowrap; font-weight:200; letter-spacing:-.04em; line-height:1; } .cwi .cwp b em{ font-style:normal; font-size:.4em; font-weight:300; opacity:.65; margin-left:3px; letter-spacing:0; } .cwi .cwp.on b{ color:var(--hg-accent-tx); }
.stg2 .cwl{ align-self:center; font-size:var(--fs-xs); opacity:.6; text-transform:uppercase; letter-spacing:.08em; margin-right:4px; }
.cwc.off .cwt .fl{ opacity:.35; box-shadow:none; }
@media (prefers-reduced-motion: reduce){ .cwt .bb{ animation:none; display:none; } .cwt .fl{ transition:none; } }
/* czujniki pokoju: kafle z animowaną ikoną stanu (drzwi/okno uchylają się, obecność – „oddychający” pierścień, ruch – fale) */
ha-card.chips{ display:grid; grid-template-columns:repeat(auto-fill, minmax(min(210px, 100%), 1fr)); gap:var(--s1); padding:var(--s2); }
.sc{ position:relative; display:flex; align-items:center; gap:12px; min-height:64px; padding:10px 14px 10px 10px; border-radius:var(--r-sm); background:var(--hg-tile-bg); box-shadow:none; color:#3A3D42; text-align:left; min-width:0; overflow:hidden; isolation:isolate;
  transition:background .3s cubic-bezier(.2,0,0,1), box-shadow .3s cubic-bezier(.2,0,0,1), transform .15s cubic-bezier(.2,0,0,1); --c:transparent; }
.sc::before{ content:''; position:absolute; inset:0; z-index:-1; border-radius:inherit; opacity:0; transition:opacity .4s cubic-bezier(.2,0,0,1);
  background:radial-gradient(120% 140% at 0% 50%, color-mix(in srgb, var(--c) 22%, transparent), transparent 60%); }
.sc.opn{ --c:var(--hg-accent); } .sc.act{ --c:var(--hg-accent); }
.sc.opn, .sc.act{ box-shadow:none; background:var(--hg-tile-bg); } .sc.opn::before, .sc.act::before{ opacity:0; } .sc.opn::after, .sc.act::after{ content:''; position:absolute; top:10px; right:10px; width:6px; height:6px; border-radius:50%; background:var(--hg-accent); }
.sb{ position:relative; flex:none; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--hg-tile-bg); color:#4A4E54; box-shadow:none; transition:background .3s cubic-bezier(.2,0,0,1), color .3s; }
.sb ha-icon{ width:22px; height:22px; transition:transform .5s cubic-bezier(.2,0,0,1); }
.sc.opn .sb{ background:var(--hg-accent-soft); color:var(--hg-accent-tx); box-shadow:none; }
.sc.act .sb{ background:var(--hg-accent-soft); color:var(--hg-accent-tx); box-shadow:none; }
.rg{ position:absolute; inset:0; border-radius:50%; border:1.5px solid var(--c); opacity:0; pointer-events:none; }
.st2{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.st2 b{ font-size:var(--fs-md); font-weight:600; color:#1E2023; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; letter-spacing:-.01em; }
.st2 > span{ display:flex; align-items:baseline; gap:6px; min-width:0; font-size:var(--fs-xs); white-space:nowrap; }
.st2 em{ font-style:normal; font-weight:600; color:#4A4E54; } .st2 small{ font-size:inherit; color:#6A6E74; overflow:hidden; text-overflow:ellipsis; font-variant-numeric:tabular-nums; }
.sc.opn .st2 em, .sc.act .st2 em{ color:var(--hg-accent-tx); }
/* animacje stanu (transform/opacity) */
.sc.opn.k-door .sb ha-icon{ animation:var(--hg-sc-anim, scSwing 2.8s cubic-bezier(.45,0,.55,1) infinite); transform-origin:30% 50%; }
.sc.act.k-occ .rg{ animation:var(--hg-sc-anim, scBreath 3s cubic-bezier(.2,0,0,1) infinite); }
.sc.act.k-mot .rg{ animation:var(--hg-sc-anim, scRipple 2s cubic-bezier(.2,0,0,1) infinite); } .sc.act.k-mot .rg.r2{ animation-delay:1s; }
@keyframes scSwing{ 0%,100%{ transform:perspective(60px) rotateY(0deg); } 50%{ transform:perspective(60px) rotateY(-28deg); } }
@keyframes scBreath{ 0%{ transform:scale(1); opacity:.7; } 70%,100%{ transform:scale(1.55); opacity:0; } }
@keyframes scRipple{ 0%{ transform:scale(1); opacity:.8; } 100%{ transform:scale(1.8); opacity:0; } }
@media (hover:hover) and (pointer:fine){ .sc:hover{ background:rgba(255,255,255,.42); } }
.sc:active{ transform:scale(.96); }
@media (prefers-reduced-motion: reduce){ .sc *, .sc{ animation:none !important; transition:none !important; } }
/* komponent urządzenia */
ha-card.dv{ display:flex; flex-direction:column; gap:var(--s2); padding:var(--s2) var(--s3); }
.dh{ display:flex; align-items:center; gap:var(--s2); min-width:0; }
.dh .ri{ width:40px; height:40px; border-radius:50%; flex:none; }
.dv.on .dh .ri{ background:var(--hg-accent); color:var(--hg-on-accent); }
.dh .tx{ flex:1; min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:2px; background:none; padding:0; text-align:left; color:inherit; cursor:pointer; }
.dh .tx b{ font-size:var(--fs-md); font-weight:600; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dh .tx span{ font-size:var(--fs-sm); color:#4A4E54; }
.mx{ display:grid; grid-template-columns:repeat(auto-fit, minmax(92px, 1fr)); gap:var(--s1); }
.m{ display:flex; flex-direction:column; align-items:flex-start; gap:2px; padding:10px 12px; border-radius:var(--r-sm); background:rgba(0,0,0,.035); text-align:left; color:inherit; min-width:0; }
.m b{ font-size:20px; font-weight:600; letter-spacing:-.02em; font-variant-numeric:tabular-nums; white-space:nowrap; } .m b em{ font-style:normal; font-size:var(--fs-sm); font-weight:400; color:#4A4E54; margin-left:2px; }
.m span{ font-size:var(--fs-xs); color:#4A4E54; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.wr{ display:flex; flex-wrap:wrap; gap:6px; }
.wc{ display:inline-flex; align-items:center; gap:5px; min-height:28px; padding:0 10px; border-radius:14px; background:#FFE3DE; color:#8A1C0C; font-size:var(--fs-sm); font-weight:600; }
.wc ha-icon{ width:16px; height:16px; }
.mr{ align-self:flex-start; display:inline-flex; align-items:center; gap:4px; min-height:32px; padding:0 4px; margin:-4px 0; background:none; color:#4A4E54; font-size:var(--fs-sm); font-weight:600; }
.mr ha-icon{ width:18px; height:18px; }
.row.sub{ min-height:44px; } .row.sub .tx b{ font-weight:400; }
.lnk.sm{ align-self:flex-start; font-size:var(--fs-sm); }
.sh{ display:flex; align-items:center; gap:var(--s1); font-size:var(--fs-xs); font-weight:600; color:#6A6E74; text-transform:uppercase; letter-spacing:.06em; margin:0 0 4u; }
.sh ha-icon{ width:12u; height:12u; } .sh i{ font-style:normal; font-weight:400; color:#9AA0A6; margin-left:auto; text-transform:none; letter-spacing:0; }
.row{ position:relative; display:flex; align-items:center; gap:var(--s1); min-height:max(calc(var(--k) * 40), 44px); padding:3u 0; border-radius:var(--r-sm); }
.row + .row, .lw + .lw, .row + .lw, .lw + .row{ border-top:1px solid rgba(0,0,0,.06); }
.ri{ position:relative; width:28u; height:28u; border-radius:var(--r-sm); flex:none; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.7); color:#4A4E54; }
.ri ha-icon{ width:15u; height:15u; }
.on .ri{ background:var(--hg-accent); color:var(--hg-on-accent); } .act .ri, .opn .ri{ background:var(--hg-alert-bg); color:var(--hg-alert-ic); }
.tx{ flex:1; min-width:0; display:flex; flex-direction:column; gap:1u; text-align:left; padding:4u 0; }
.tx b{ font-size:var(--fs-sm); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tx span{ font-size:var(--fs-xs); color:#6A6E74; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.v{ font-size:var(--fs-sm); font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; color:#1E2023; } .v em{ font-style:normal; font-weight:400; font-size:var(--fs-xs); color:#6A6E74; margin-left:2u; }
.chev{ width:14u; height:14u; color:#9AA0A6; flex:none; }
.un{ opacity:.55; }
.lw .br{ display:flex; align-items:center; gap:var(--s1); padding:0 0 var(--s1) 37u; }
.br output{ font-size:var(--fs-xs); color:#6A6E74; min-width:28u; text-align:right; font-variant-numeric:tabular-nums; }
input[type=range]{ -webkit-appearance:none; appearance:none; flex:1; height:max(calc(var(--k) * 22), 28px); background:none; margin:0; touch-action:pan-y; }
input[type=range]::-webkit-slider-runnable-track{ height:4u; border-radius:2u; background:linear-gradient(90deg, var(--hg-accent) var(--v), rgba(0,0,0,.1) var(--v)); }
input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:16u; height:16u; margin-top:-6u; border-radius:50%; background:var(--hg-thumb); box-shadow:var(--hg-thumb-sh); }
input[type=range]::-moz-range-track{ height:5u; border-radius:3u; background:rgba(0,0,0,.1); } input[type=range]::-moz-range-progress{ height:5u; border-radius:3u; background:var(--hg-accent); }
input[type=range]::-moz-range-thumb{ width:18u; height:18u; border:0; border-radius:50%; background:var(--hg-thumb); box-shadow:var(--hg-thumb-sh); }
.bt{ position:relative; width:30u; height:30u; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.7); color:#1E2023; }
.bt ha-icon{ width:15u; height:15u; } .bts{ display:flex; gap:5u; }
@media (pointer:coarse){ .bt::before{ content:''; position:absolute; inset:-7px; } }
.art{ width:34u; height:34u; border-radius:var(--r-sm); flex:none; object-fit:cover; background:rgba(255,255,255,.7); }
.cams{ display:grid; gap:var(--s1); }
.cam{ position:relative; display:block; width:100%; aspect-ratio:16/9; border-radius:var(--r-sm); overflow:hidden; background:#2B3038; }
.cam img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
.cam span{ position:absolute; left:8u; bottom:7u; padding:2u var(--s1); border-radius:var(--r-sm); background:rgba(0,0,0,.45); color:#fff; font-size:var(--fs-xs); }
.cam span:not(.ph){ display:none; }
.cam .ph{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,.65); font-size:var(--fs-sm); background:none; padding:0; left:0; bottom:0; }
.empty{ display:flex; flex-direction:column; align-items:flex-start; gap:var(--s1); padding:var(--s1) 2u; font-size:var(--fs-sm); color:#4A4E54; }
.lnk{ position:relative; display:inline-flex; align-items:center; gap:5u; height:max(calc(var(--k) * 30), 40px); padding:0 var(--s2); border-radius:var(--r-md); background:rgba(255,255,255,.75); color:#1E2023; font-size:var(--fs-sm); font-weight:400; }
.lnk ha-icon{ width:13u; height:13u; }
.unh{ display:flex; align-items:center; gap:var(--s1); width:100%; min-height:44px; font-size:var(--fs-sm); color:#4A4E54; }
.unh ha-icon{ width:14u; height:14u; margin-left:auto; color:#9AA0A6; }

/* pralka: hero – drzwi front-loadera (SVG) + duży czas, faza jako pigułka, ciche statystyki; animacje tylko transform/opacity */
ha-card.wmc{ gap:var(--s2); }
.wmh{ display:flex; align-items:center; gap:var(--s1); min-height:40px; }
.wmh b{ flex:1; min-width:0; font-size:var(--fs-md); font-weight:600; background:none; padding:0; text-align:left; color:inherit; cursor:pointer; }
.wmr{ display:grid; grid-template-columns:clamp(124px, 38%, 168px) minmax(0, 1fr); align-items:center; gap:var(--s3); }
.wmv{ position:relative; aspect-ratio:1; }
.wmv svg{ width:100%; height:100%; display:block; overflow:visible; }
.wmi{ display:flex; flex-direction:column; align-items:flex-start; gap:var(--s1); min-width:0; }
.wmt{ font-size:clamp(26px, 2.4vw, 34px); font-weight:600; letter-spacing:-.02em; line-height:1.05; font-variant-numeric:tabular-nums; color:#1E2023; }
.wmt small{ font-size:.55em; font-weight:400; color:#4A4E54; margin:0 .18em 0 .08em; letter-spacing:0; }
.wme{ font-size:var(--fs-sm); color:#4A4E54; font-variant-numeric:tabular-nums; margin-top:-4px; }
.wmp{ display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 12px 0 10px; border-radius:14px; background:rgba(0,0,0,.05); color:#3A3D42; font-size:var(--fs-sm); font-weight:600; white-space:nowrap; }
.wmp i{ width:7px; height:7px; border-radius:50%; background:currentColor; opacity:.8; }
.run .wmp{ background:rgba(255,255,255,.62); box-shadow:inset 0 0 0 1px var(--hg-accent-soft); color:var(--hg-accent-tx); } .fin .wmp{ background:var(--hg-accent-faint); color:var(--hg-accent-tx); }
.wsr{ display:flex; flex-wrap:wrap; gap:4px var(--s2); margin-top:2px; }
.wsr button{ display:inline-flex; align-items:center; gap:5px; min-height:32px; padding:0; background:none; color:#3A3D42; font-size:var(--fs-sm); font-variant-numeric:tabular-nums; white-space:nowrap; cursor:pointer; }
.wsr ha-icon{ width:16px; height:16px; color:#6A6E74; }
.wmb{ width:44px; height:44px; } .wmb:active{ transform:scale(.96); }
@media (max-width:380px){ .wmr{ grid-template-columns:116px minmax(0, 1fr); gap:var(--s2); } }
/* ilustracja */
.wm-dr, .wm-cl, .wm-wt, .wm-bb circle, .wm-str{ transform-box:view-box; transform-origin:60px 60px; }
.wm-trk{ fill:none; stroke:rgba(0,0,0,.07); stroke-width:2.5; }
.wm-prg{ fill:none; stroke:var(--hg-accent); stroke-width:2.5; stroke-linecap:round; transform:rotate(-90deg); transform-origin:60px 60px; transition:stroke-dashoffset .6s cubic-bezier(.2,0,0,1); }
.fin .wm-prg{ stroke:var(--hg-accent); }
.wm-str{ opacity:0; }
.wm-bb circle{ opacity:0; }
.wm-chk{ opacity:0; transform:scale(.25); transform-origin:92px 92px; transition:opacity .3s cubic-bezier(.2,0,0,1), transform .3s cubic-bezier(.2,0,0,1); }
.wm-glow{ opacity:0; transition:opacity .4s; }
.wm-wt{ transform:translateY(var(--wy, 40px)); }
.ph-wash{ --wy:10px; } .ph-rinse{ --wy:0px; } .ph-pause{ --wy:10px; --hg-play:paused; } .ph-spin, .ph-done, .ph-idle{ --wy:44px; }
.ph-wash .wm-dr{ animation:wmr 3.6s linear infinite; } .ph-wash .wm-cl{ animation:var(--hg-wm-tumble, wmt 3.6s cubic-bezier(.45,0,.55,1) infinite); } .ph-wash .wm-wt{ animation:var(--hg-wm-slosh, wms 2.4s cubic-bezier(.45,0,.55,1) infinite); }
.ph-rinse .wm-dr{ animation:wmr 5s linear infinite; } .ph-rinse .wm-cl{ animation:var(--hg-wm-tumble, wmt 5s cubic-bezier(.45,0,.55,1) infinite); } .ph-rinse .wm-wt{ animation:var(--hg-wm-slosh, wms 1.8s cubic-bezier(.45,0,.55,1) infinite); }
.ph-rinse .wm-bb circle{ animation:var(--hg-wm-bub, wmb 2.4s ease-in infinite); } .ph-rinse .wm-bb circle:nth-child(2){ animation-delay:.8s; } .ph-rinse .wm-bb circle:nth-child(3){ animation-delay:1.6s; } .ph-rinse .wm-bb circle:nth-child(4){ animation-delay:.4s; }
.ph-spin .wm-dr, .ph-spin .wm-cl, .ph-spin .wm-str{ animation:wmr var(--spd, .4s) linear infinite; } .ph-spin .wm-str{ opacity:1; } .ph-spin .wm-cl{ transform:none; }
.ph-pause .wm-dr, .ph-pause .wm-cl{ animation:wmr 3.6s linear infinite; }
.ph-done .wm-chk{ opacity:1; transform:scale(1); } .ph-done .wm-glow{ opacity:1; }
.ph-idle svg{ opacity:.6; }
@keyframes wmr{ to{ transform:rotate(360deg); } }
@keyframes wmt{ 0%,100%{ transform:rotate(-30deg) translateY(3px); } 50%{ transform:rotate(25deg) translateY(-7px); } }
@keyframes wms{ 0%,100%{ transform:translate(-5px, var(--wy)) rotate(-3deg); } 50%{ transform:translate(5px, var(--wy)) rotate(3deg); } }
@keyframes wmb{ 0%{ opacity:0; transform:translateY(0); } 25%{ opacity:.9; } 100%{ opacity:0; transform:translateY(-24px); } }
@media (prefers-reduced-motion: reduce){ .wmv *, .wmv{ animation:none !important; transition:none !important; } }
`);
  }
  _nm(e, fb) { return HGAreas.name(this._hass, e, this._a, this._config.areas, fb); }
  _num(s) {
    const at = s.attributes, u = at.unit_of_measurement || '', v = parseFloat(s.state);
    if (!isFinite(v) || !/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(String(s.state).trim())) {
      if (at.device_class === 'timestamp') { const d = new Date(s.state); if (!isNaN(d)) return [typeof hgRel === 'function' ? hgRel(d) : d.toLocaleString(HG_LOC()), '']; }
      return [H.T(this._hass, s), ''];
    }
    if ((u === 's' && v >= 3600) || (u === 'min' && v >= 120)) return [H.fmt(u === 's' ? v / 3600 : v / 60, 0), 'h'];
    const d = ['W', '%', 'lx', 'ppm', 'µg/m³', 'dB', 'dBm', 's', 'min'].includes(u) ? 0 : Math.abs(v) >= 100 ? 0 : 1;
    return [H.fmt(v, d), u];
  }
  _washer(g, av, dv) {
    const h = this._hass, st = (e) => h.states[e], f = (re) => av.find((e) => re.test(e));
    const eMs = f(/^sensor\..*machine_state$/), eJob = f(/^sensor\..*job_state$/), eEnd = f(/^sensor\..*completion_time$/), eP = f(/^sensor\..*_moc$|^sensor\..*_power$/),
      eSel = f(/^select\.washer$/), eSpin = f(/^select\..*spin_level$/), eTemp = f(/^select\..*water_temperature$/), eRem = f(/^binary_sensor\..*remote_control$/), ePw = f(/^binary_sensor\..*zasilanie$/);
    const ms = eMs ? st(eMs).state : null, job = eJob ? st(eJob).state : null;
    const lab = (e, map) => { const v = st(e).state; return map[v] != null ? map[v] : H.T(h, st(e)); };
    const run = ms === 'run', pause = ms === 'pause', done = !run && !pause && job === 'finish';
    const off = ePw && st(ePw).state === 'off';
    const ph = run ? (HG_WM_ANIM[job] || 'wash') : pause ? 'pause' : done ? 'done' : 'idle';
    const phase = eJob && job !== 'none' ? lab(eJob, hgTr(HG_WM_JOB, HG_WM_JOB_EN)) : '';
    const msL = eMs ? lab(eMs, hgTr(HG_WM_MS, HG_WM_MS_EN)) : '';
    const status = done ? hgTr('Pranie zakończone', 'Wash complete') : run || pause ? [msL, phase].filter(Boolean).join(' · ') : off ? hgTr('Wyłączona', 'Off') : hgTr('Gotowa', 'Ready');
    // czas i postęp: koniec z completion_time; start = pierwsza zmiana machine_state na „run” w tym cyklu (prawdziwe dane, bez zgadywania)
    let rem = '', endT = '', pct = null;
    const wmS = this._wmS || (this._wmS = new Map());    // pierwszy start cyklu: wznowienie po pauzie zmienia last_changed, nie zeruje postępu
    if (!run && !pause) wmS.delete(eMs); else if (run && !wmS.has(eMs)) wmS.set(eMs, +new Date(st(eMs).last_changed));
    if (eEnd && (run || pause)) { const d = new Date(st(eEnd).state), m = Math.round((d - Date.now()) / 60000);
      if (!isNaN(d) && m > 0) { rem = m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`; endT = d.toLocaleTimeString(HG_LOC(), { hour: '2-digit', minute: '2-digit' });
        if (run) { const s0 = wmS.get(eMs), tot = d - s0; if (tot > 60000) pct = Math.max(0, Math.min(1, (Date.now() - s0) / tot)); } } }
    if (done) pct = 1;
    const spinV = eSpin ? parseInt(st(eSpin).state, 10) : NaN, spd = isFinite(spinV) ? (1.1 - Math.min(spinV, 1600) / 1600 * .85).toFixed(2) : '.45';
    const remote = eRem && st(eRem).state === 'on';
    const ctl = eSel && remote && (run || pause) ? `<button class="bt wmb" data-act="wm" data-e="${H.esc(eSel)}" data-o="${run ? 'pause' : 'run'}" aria-label="${run ? hgTr('Wstrzymaj', 'Pause') : hgTr('Wznów', 'Resume')}">${H.icon(run ? 'mdi:pause' : 'mdi:play')}</button>` : '';
    const title = dv.name_by_user || hgTr('Pralka', 'Washer');
    // ciche statystyki (tylko istniejące encje)
    const sr = [];
    if (eTemp && H.ok(st(eTemp)) && st(eTemp).state !== 'none') { const v = st(eTemp).state; sr.push([eTemp, 'mdi:thermometer', v === 'cold' ? hgTr('Zimna woda', 'Cold water') : /^\d+$/.test(v) ? `${v}°C` : H.T(h, st(eTemp)), hgTr('Temperatura wody', 'Water temperature')]); }
    if (eSpin && H.ok(st(eSpin))) { const v = st(eSpin).state; sr.push([eSpin, 'mdi:rotate-right', /^\d+$/.test(v) ? `${v} ${hgTr('obr./min', 'rpm')}` : v === 'no_spin' ? hgTr('Bez wirowania', 'No spin') : v === 'rinse_hold' ? hgTr('Wstrzymane', 'Rinse hold') : H.T(h, st(eSpin)), hgTr('Wirowanie', 'Spin')]); }
    if (eP && (run || pause)) { const v = parseFloat(st(eP).state); if (isFinite(v)) sr.push([eP, 'mdi:flash-outline', `${H.fmt(v, 0)} W`, hgTr('Moc', 'Power')]); }
    // duży tekst: pozostały czas, albo stan
    let big;
    if (rem) { const m = rem.match(/^(\d+) h (\d+) min$/) || null, mm = rem.match(/^(\d+) min$/);
      big = m ? `${+m[1]}<small>h</small>${+m[2]}<small>min</small>` : mm ? `${mm[1]}<small>min</small>` : H.esc(rem); }
    else big = H.esc(done ? hgTr('Wyprane', 'Done') : pause ? hgTr('Pauza', 'Paused') : run ? hgTr('Pracuje', 'Running') : off ? hgTr('Wyłączona', 'Off') : hgTr('Gotowa', 'Ready'));
    const pill = (run || pause) ? (phase || msL) + (pause && phase ? hgTr(' · pauza', ' · paused') : '') : '';
    const C = 2 * Math.PI * 55, prg = pct == null ? '' : `<circle class="wm-trk" cx="60" cy="60" r="55"/><circle class="wm-prg" cx="60" cy="60" r="55" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}"/>`;
    const svg = `<svg viewBox="0 0 120 120" role="img" aria-label="${H.esc(status)}"><defs>
      <linearGradient id="wmg-ch" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(220 10% 97%)"/><stop offset=".45" stop-color="hsl(220 6% 78%)"/><stop offset=".55" stop-color="hsl(220 8% 88%)"/><stop offset="1" stop-color="hsl(220 6% 62%)"/></linearGradient>
      <radialGradient id="wmg-gl" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="hsl(212 30% 30%)"/><stop offset=".75" stop-color="hsl(214 28% 16%)"/><stop offset="1" stop-color="hsl(216 30% 9%)"/></radialGradient>
      <radialGradient id="wmg-sh" cx=".5" cy=".5" r=".5"><stop offset=".78" stop-color="hsl(0 0% 0% / 0)"/><stop offset="1" stop-color="hsl(0 0% 0% / .55)"/></radialGradient>
      <radialGradient id="wmg-glow" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="hsl(140 60% 50% / .45)"/><stop offset="1" stop-color="hsl(140 60% 50% / 0)"/></radialGradient>
      <clipPath id="wmcp"><circle cx="60" cy="60" r="36"/></clipPath></defs>
      <circle class="wm-glow" cx="60" cy="60" r="60" fill="url(#wmg-glow)"/>${prg}
      <circle cx="60" cy="62" r="49" fill="hsl(0 0% 0% / .10)"/>
      <circle cx="60" cy="60" r="49" fill="url(#wmg-ch)"/><circle cx="60" cy="60" r="44" fill="hsl(220 8% 70%)"/><circle cx="60" cy="60" r="42.5" fill="hsl(220 6% 24%)"/>
      <circle cx="60" cy="60" r="36" fill="url(#wmg-gl)"/>
      <g clip-path="url(#wmcp)">
        <g class="wm-dr"><circle cx="60" cy="60" r="31" fill="none" stroke="hsl(210 20% 80% / .16)" stroke-width="1.6" stroke-dasharray=".1 4.2" stroke-linecap="round"/><circle cx="60" cy="60" r="25" fill="none" stroke="hsl(210 20% 80% / .12)" stroke-width="1.6" stroke-dasharray=".1 4.2" stroke-linecap="round"/>
          <path d="M60 26v6M60 88v6M26 60h6M88 60h6" stroke="hsl(210 20% 85% / .22)" stroke-width="2.4" stroke-linecap="round"/></g>
        <g class="wm-str"><path d="M30 48a32 32 0 0 1 22-20M90 72a32 32 0 0 1-22 20" fill="none" stroke="hsl(210 30% 90% / .28)" stroke-width="5" stroke-linecap="round"/></g>
        <g class="wm-cl"><path d="M42 72c3-8 14-10 20-4 3 4-1 10-8 11-7 1-14-2-12-7z" fill="hsl(18 62% 66%)"/><path d="M58 78c5-7 15-6 18 0 2 5-4 9-10 8-6 0-10-3-8-8z" fill="hsl(210 50% 68%)"/><path d="M48 83c3-4 10-4 12 0 1 3-3 6-7 5-3 0-6-2-5-5z" fill="hsl(40 30% 90%)"/></g>
        <path class="wm-wt" d="M14 64 Q37 58 60 64 T106 64 V110 H14 Z" fill="hsl(206 70% 62% / .42)"/>
        <g class="wm-bb" fill="hsl(0 0% 100% / .7)"><circle cx="46" cy="86" r="2"/><circle cx="62" cy="90" r="1.6"/><circle cx="73" cy="84" r="2.4"/><circle cx="54" cy="92" r="1.4"/></g>
      </g>
      <circle cx="60" cy="60" r="36" fill="url(#wmg-sh)"/>
      <path d="M36 50a26 26 0 0 1 20-20" fill="none" stroke="hsl(0 0% 100% / .55)" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="74" cy="38" rx="4" ry="2.2" fill="hsl(0 0% 100% / .35)" transform="rotate(30 74 38)"/>
      <g class="wm-chk"><circle cx="92" cy="92" r="13" fill="hsl(140 55% 42%)"/><path d="M86 92l4 4 8-8" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
    return `<div class="blk"><ha-card class="glass dv wmc ${run ? 'run' : done ? 'fin' : ''}">
      <div class="wmh"><b role="button" tabindex="0" data-act="${eMs ? 'more' : 'dev'}" ${eMs ? `data-e="${H.esc(eMs)}"` : `data-d="${H.esc(g.d)}"`} aria-label="${H.esc(title + ', ' + status)}">${H.esc(title)}</b>${ctl}</div>
      <div class="wmr"><div class="wmv ph-${ph}" style="--spd:${spd}s">${svg}</div>
        <div class="wmi"><div class="wmt" aria-label="${H.esc(rem ? hgTr('Pozostało ', 'Remaining ') + rem : big)}">${big}</div>${endT ? `<div class="wme">${hgTr('Koniec', 'Ends')} ${H.esc(endT)}</div>` : ''}
          ${pill ? `<span class="wmp"><i></i>${H.esc(pill)}</span>` : ''}
          ${sr.length ? `<div class="wsr">${sr.map(([e, ic, v, l]) => `<button data-act="more" data-e="${H.esc(e)}" title="${H.esc(l)}" aria-label="${H.esc(l + ': ' + v)}">${H.icon(ic)}${H.esc(v)}</button>`).join('')}</div>` : ''}</div></div>
    </ha-card></div>`;
  }
  /* schody: widok z boku, dwie żarówki w rzeczywistych miejscach (świecą wg jasności/koloru, płynne przejście), czujniki ruchu dół/góra z falami,
     odliczanie do zgaszenia (delay s po ustaniu ruchu na obu czujnikach – z last_changed), przełącznik automatyzacji */
  /* kotłownia: bojler CWU – temperatura (duża), pionowy wskaźnik zbiornika, nastawa ±, tryb, animacja grzania, przełączniki */
  /* CWU góra: czujnik temperatury zbiornika + gniazdko grzałki (stan = przełącznik) */
  _cwuUp(U2) {
    const h = this._hass, st = (e) => e && h.states[e], num = (e) => { const s = st(e); return H.ok(s) && !isNaN(Number(s.state)) && Number(s.state) > -100 ? Number(s.state) : null; };
    const t = num(U2.tank), sw = st(U2.switch), swOn = H.ok(sw) && sw.state === 'on', pw = num(U2.power), on = swOn && pw != null && pw > 0, fr = t != null ? Math.max(0, Math.min(1, (t - 20) / 55)) : 0;
    const info = U2.co.map(([e, l]) => { const v = num(e); return v != null ? [`${H.fmt(v, 1)}°`, l] : null; }).filter(Boolean);
    return `<div class="blk stb"><ha-card class="glass cwc ${on ? 'heat' : ''}" style="--f:${fr.toFixed(3)};--tf:0">
      <div class="sth"><div><b>${H.esc(U2.title)}</b><span class="stf">${hgTr('Zbiornik ciepłej wody', 'Hot water tank')}</span></div><button class="ib" data-act="more" data-e="${H.esc(U2.tank)}" aria-label="${hgTr('Historia temperatury', 'Temperature history')}">${H.icon('mdi:arrow-top-right')}</button></div>
      <div class="cwm"><div class="cwt" role="img" aria-label="${hgTr('Zbiornik CWU góra', 'Hot water tank, top')}: ${t != null ? H.fmt(t, 0) + '°C' : hgTr('brak danych', 'no data')}"><i class="fl"></i>${on ? '<i class="bb b1"></i><i class="bb b2"></i><i class="bb b3"></i>' : ''}</div>
        <div class="cwv"><span class="cwn">${t != null ? H.fmt(t, 0) : '–'}<sup>°C</sup></span><span class="cws">${on ? `${H.icon('mdi:heat-wave')}${hgTr('Grzeje', 'Heating')}` : !swOn ? hgTr('Wyłączony', 'Off') : hgTr('Nie grzeje', 'Not heating')}</span></div>
        <div class="cwi">${pw != null ? `<div class="cwp ${on ? 'on' : ''}"><b>${H.fmt(pw, 0)}<em>W</em></b><small>${hgTr('Moc grzania', 'Heating power')}</small></div>` : ''}</div></div>
      ${H.ok(sw) ? `<div class="stg2"><label class="cp ${swOn ? 'on' : ''}"><b>${hgTr('Zasilanie', 'Power')}</b>${this.toggleHtml(swOn, 'cwus', false, hgTr('CWU góra: zasilanie', 'Hot water top: power')).replace('data-act="cwus"', `data-act="cwus" data-e="${H.esc(U2.switch)}"`)}</label></div>` : ''}
    </ha-card></div>`;
  }
  _cwu(CW) {
    const f2 = (v) => Number(v).toFixed(3);
    const h = this._hass, st = (e) => e && h.states[e], num = (e) => { const s = st(e); return H.ok(s) && !isNaN(Number(s.state)) ? Number(s.state) : null; };
    const w = st(CW.heater); if (!H.ok(w)) return `<div class="blk"><ha-card class="glass"><div class="ph"><b>${hgTr('Bojler niedostępny', 'Water heater unavailable')}</b></div></ha-card></div>`;
    const A = w.attributes, cur = A.current_temperature != null ? Number(A.current_temperature) : num(CW.tank), tgt = Number(A.temperature ?? A.target_temperature), mn = A.min_temp || 30, mx = A.max_temp || 75;
    const on = w.state !== 'off', heat = st(CW.heating) ? st(CW.heating).state === 'on' : !!A.heating, keep = st(CW.keep) && st(CW.keep).state === 'on';
    const fr = cur != null ? Math.max(0, Math.min(1, (cur - mn) / (mx - mn))) : 0, tf = !isNaN(tgt) ? Math.max(0, Math.min(1, (tgt - mn) / (mx - mn))) : null;
    const mode = !on ? hgTr('Wyłączony', 'Off') : A.whole_tank_heating ? hgTr('Grzanie całego zbiornika', 'Whole tank heating') : A.variable_heating ? hgTr('Grzanie zmienne', 'Variable heating') : hgTr('Grzanie standardowe', 'Standard heating');
    const state = !on ? hgTr('Wyłączony', 'Off') : heat ? hgTr('Grzeje', 'Heating') : keep ? hgTr('Utrzymuje temperaturę', 'Keeping warm') : hgTr('Gotowy', 'Ready');
    const pw = num(CW.power), rem = num(CW.remaining), tank = num(CW.tank), cons = num(CW.consumption);
    const E = H.esc(CW.heater), dis = !on ? 'disabled' : '';
    const info = [pw != null ? [H.fmt(pw, 0), 'W', hgTr('Moc grzania', 'Heating power'), heat && pw > 0] : null, rem != null && heat ? [String(rem), 'min', hgTr('Do końca', 'Remaining')] : null,       cons != null ? [H.fmt(cons, 0), 'l', hgTr('Zużycie wody', 'Water usage')] : null].filter(Boolean);
    const sws = CW.switches.map(([e, l]) => { const s = st(e); if (!H.ok(s)) return ''; const o = s.state === 'on'; return `<label class="cp ${o ? 'on' : ''}"><b>${H.esc(l)}</b>${this.toggleHtml(o, 'cwus', false, l).replace('data-act="cwus"', `data-act="cwus" data-e="${H.esc(e)}"`)}</label>`; }).join('');
    return `<div class="blk stb"><ha-card class="glass cwc ${heat ? 'heat' : ''} ${on ? '' : 'off'}" style="--f:${f2(fr)};--tf:${tf != null ? f2(tf) : 0}">
      <div class="sth"><div><b>${H.esc(CW.title || hgTr('Ciepła woda', 'Hot water'))}</b><span class="stf">${H.esc(mode)}</span></div><button class="ib" data-act="more" data-e="${E}" aria-label="${hgTr('Szczegóły bojlera', 'Water heater details')}">${H.icon('mdi:arrow-top-right')}</button></div>
      <div class="cwm">
        <div class="cwt" role="img" aria-label="${hgTr('Zbiornik', 'Tank')}: ${cur != null ? H.fmt(cur, 0) + '°C' : hgTr('brak danych', 'no data')}"><i class="fl"></i><i class="tg2"></i>${heat ? '<i class="bb b1"></i><i class="bb b2"></i><i class="bb b3"></i>' : ''}</div>
        <div class="cwv"><span class="cwn">${cur != null ? H.fmt(cur, 0) : '–'}<sup>°C</sup></span><span class="cws" aria-live="polite">${heat ? `${H.icon('mdi:heat-wave')}${hgTr('Grzeje', 'Heating')}${isNaN(tgt) ? '' : hgTr(` do ${H.fmt(tgt, 0)}°`, ` to ${H.fmt(tgt, 0)}°`)}` : H.esc(state)}</span>
          <div class="cwa"><button class="cv2" data-act="cwut" data-e="${E}" data-d="-1" ${dis} aria-label="${hgTr('Obniż nastawę', 'Lower setpoint')}">${H.icon('mdi:minus')}</button><span class="cwg"><small>${hgTr('Nastawa', 'Setpoint')}</small><b>${isNaN(tgt) ? '–' : H.fmt(tgt, 0) + '°'}</b></span><button class="cv2" data-act="cwut" data-e="${E}" data-d="1" ${dis} aria-label="${hgTr('Podwyższ nastawę', 'Raise setpoint')}">${H.icon('mdi:plus')}</button></div></div>
        <div class="cwi">${info.map(([v, u, l, hot]) => `<div class="cwp ${hot ? 'on' : ''}"><b>${H.esc(v)}<em>${H.esc(u)}</em></b><small>${H.esc(l)}</small></div>`).join('')}</div>
      </div>
      <div class="stg2">${sws}</div></ha-card></div>`;
  }
  _stairs(ST) {
    const h = this._hass, st = (e) => h.states[e], f = (v) => Number(v).toFixed(2);
    const ago = (s) => { if (!s) return ''; const m = Math.max(0, Math.round((Date.now() - new Date(s.last_changed)) / 60000)); const x = m < 1 ? '' : m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h` : `${Math.floor(m / 1440)} d`; return hgTr(x ? `od ${x}` : 'od chwili', x ? `for ${x}` : 'for <1 min'); };
    const lt = (k) => { const e = ST[k].light, s = st(e), ok = H.ok(s), on = ok && s.state === 'on';
      const b = on ? (s.attributes.brightness != null ? s.attributes.brightness / 255 : 1) : 0;
      return { e, s, ok, on, b, g: on ? Math.max(.5, Math.min(1, .4 + b * .6)) : 0 }; };
    const L = { bottom: lt('bottom'), top: lt('top') }, nm = hgTr({ bottom: 'Dół', top: 'Góra' }, { bottom: 'Bottom', top: 'Top' });
    const mb = st(ST.bottom.motion), mt = st(ST.top.motion), mbOn = H.ok(mb) && mb.state === 'on', mtOn = H.ok(mt) && mt.state === 'on';
    const anyOn = L.bottom.on || L.top.on;
    const N = 8, RU = 30, RI = 18, DX = 24, DY = -10, X0 = 100, Y0 = 196, LO = 46;
    const dir = mbOn ? 'up' : mtOn ? 'dn' : (L.top.on && !L.bottom.on ? 'dn' : 'up');
    const P = (pts) => pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
    let geo = '', glow = '';
    for (let i = 0; i < N; i++) {
      const x = X0 + i * RU, yb = Y0 - i * RI, yt = yb - RI, tr = [[x, yt], [x + RU, yt], [x + RU + DX, yt + DY], [x + DX, yt + DY]];
      geo += `<polygon class="riser" points="${P([[x, yb], [x + RU, yb], [x + RU, yt], [x, yt]])}"/><polygon class="tread" points="${P(tr)}"/><polyline class="edge" points="${P([[x, yt], [x + RU, yt]])}"/>`;
      const t = i / (N - 1), o = Math.max(L.bottom.g * (1 - t * .9), L.top.g * (.1 + t * .9));
      glow += `<polygon class="gl ${o > 0 ? 'on' : ''}" style="--o:${f(o * .6)};--d:${f((dir === 'up' ? i : N - 1 - i) * .12)}s" points="${P(tr)}"/>`;
    }
    const XT = X0 + N * RU, YT = Y0 - N * RI;
    geo = `<polygon class="side" points="${P([[X0, Y0], [XT, Y0], [XT, YT]])}"/>` + geo;
    // lampy: ta sama odległość LO nad środkiem własnego stopnia (pierwszy / ostatni), etykiety na zewnątrz (symetrycznie)
    const tc = (i) => [X0 + i * RU + RU / 2 + DX / 2, Y0 - (i + 1) * RI + DY / 2];
    const lampSvg = (k, i, side, ms, mOn) => { const o = L[k], p = Math.round(o.b * 100), [sx, sy] = tc(i), cx = sx, cy = sy - LO, tx = side < 0 ? cx - 16 : cx + 16, an = side < 0 ? 'end' : 'start';
      return `<g class="lmp ${o.on ? 'on' : ''}" style="--g:${f(o.g)}" data-act="stb" data-e="${H.esc(o.e)}" role="button" tabindex="0" aria-label="${H.esc(hgTr(`Żarówka ${nm[k].toLowerCase()}: ${o.ok ? (o.on ? `włączona ${p}%` : 'wyłączona') : 'niedostępna'}`, `${nm[k]} bulb: ${o.ok ? (o.on ? `on ${p}%` : 'off') : 'unavailable'}`))}">
        <polygon class="cone" fill="url(#stcone)" points="${P([[cx - 5, cy + 6], [cx + 5, cy + 6], [sx + RU * .9, sy], [sx - RU * .9, sy]])}"/>
        <circle class="halo" cx="${cx}" cy="${cy}" r="40" fill="url(#sthalo)"/><circle class="bulb" cx="${cx}" cy="${cy}" r="7"/>
        <text class="tl" x="${tx}" y="${cy - 6}" text-anchor="${an}">${nm[k]}</text><text class="ts" x="${tx}" y="${cy + 7}" text-anchor="${an}">${o.ok ? (o.on ? `${p || 1}%` : hgTr('Wył.', 'Off')) : '—'}</text>
        <circle class="hit" cx="${cx}" cy="${cy}" r="24"/></g>
        ${H.ok(ms) ? `<g class="mk ${mOn ? 'on' : ''}"><circle class="rp" cx="${side < 0 ? tx - 3 : tx + 3}" cy="${cy + 19}" r="4"/><circle class="dt" cx="${side < 0 ? tx - 3 : tx + 3}" cy="${cy + 19}" r="3"/><text class="ts" x="${side < 0 ? tx - 11 : tx + 11}" y="${cy + 22}" text-anchor="${an}">${mOn ? hgTr('Ruch teraz', 'Motion now') : hgTr('Ruch ', 'No motion ') + ago(ms)}</text></g>` : ''}`; };
    const svg = `<div class="sv3"><svg viewBox="0 ${YT - LO - 26} 440 ${Y0 - YT + LO + 34}" aria-hidden="false"><defs>
      <radialGradient id="sthalo"><stop offset="0" style="stop-color:var(--hg-accent)" stop-opacity=".6"/><stop offset=".5" style="stop-color:var(--hg-accent)" stop-opacity=".15"/><stop offset="1" style="stop-color:var(--hg-accent)" stop-opacity="0"/></radialGradient>
      <linearGradient id="stcone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hg-accent)" stop-opacity=".45"/><stop offset="1" style="stop-color:var(--hg-accent)" stop-opacity="0"/></linearGradient></defs>
      ${geo}${glow}${lampSvg('bottom', 0, -1, mb, mbOn)}${lampSvg('top', N - 1, 1, mt, mtOn)}</svg></div>`;
    let fade = null;
    if (anyOn && H.ok(mb) && H.ok(mt) && !mbOn && !mtOn) { const t = Math.max(new Date(mb.last_changed), new Date(mt.last_changed)) + ST.delay * 1000; if (t > Date.now()) fade = t; }
    this._stFade = fade;
    const rem = fade ? Math.ceil((fade - Date.now()) / 1000) : 0, fr = fade ? Math.max(0, Math.min(1, (fade - Date.now()) / (ST.delay * 1000))) : 0;
    const ring = fade ? `<div class="str" role="timer" aria-label="${hgTr(`Gaśnie za ${rem} s`, `Turning off in ${rem} s`)}"><svg viewBox="0 0 40 40"><circle class="rb" cx="20" cy="20" r="17" pathLength="100"/><circle class="rf" cx="20" cy="20" r="17" pathLength="100" style="--o0:${f(100 - fr * 100)};animation-duration:${f((fade - Date.now()) / 1000)}s"/></svg><span class="stn">${rem}</span></div>` : '';
    const gp = ST.group && st(ST.group), gOn = H.ok(gp) && gp.state === 'on';
    const grp = H.ok(gp) ? `<label class="sgl"><span>${hgTr('Wszystkie', 'All')}</span>${this.toggleHtml(gOn, 'stb', false, hgTr('Światła schody', 'Stair lights')).replace('data-act="stb"', `data-act="stb" data-e="${H.esc(ST.group)}"`)}</label>` : '';
    const au = st(ST.automation), auOn = au && au.state === 'on';
    const chip = (k, lab, s, on) => H.ok(s) ? `<button class="sm ${on ? 'on' : ''}" data-act="more" data-e="${H.esc(ST[k].motion)}" aria-label="${H.esc(`${lab}: ${on ? hgTr('ruch', 'motion') : hgTr('brak ruchu ', 'no motion ') + ago(s)}`)}">${H.icon(on ? 'mdi:motion-sensor' : 'mdi:motion-sensor-off')}<span><b>${lab}</b><small>${on ? hgTr('Ruch teraz', 'Motion now') : `${hgTr('Brak ruchu', 'No motion')} ${ago(s)}`}</small></span><i></i></button>` : '';
    return `<div class="blk stb"><ha-card class="glass stc ${anyOn ? 'lit' : 'idle'}">
      <div class="sth"><div><b>${hgTr('Oświetlenie schodów', 'Stair lighting')}</b><span class="stf" aria-live="polite">${fade ? hgTr(`Gaśnie za ${rem} s`, `Turning off in ${rem} s`) : anyOn ? hgTr('Świeci', 'On') : hgTr('Wyłączone', 'Off')}</span></div>${ring}</div>
      ${svg}
      <div class="stg2">${['bottom', 'top'].map((k) => { const o = L[k]; return o.ok ? `<label class="cp ${o.on ? 'on' : ''}"><b>${nm[k]}</b><small>${o.on ? Math.round(o.b * 100) + '%' : hgTr('Wył.', 'Off')}</small>${this.toggleHtml(o.on, 'stb', false, hgTr('Żarówka ' + nm[k].toLowerCase(), nm[k] + ' bulb')).replace('data-act="stb"', `data-act="stb" data-e="${H.esc(o.e)}"`)}</label>` : ''; }).join('')}
        ${H.ok(gp) ? `<label class="cp ${gOn ? 'on' : ''}"><b>${hgTr('Wszystkie', 'All')}</b>${this.toggleHtml(gOn, 'stb', false, hgTr('Światła schody', 'Stair lights')).replace('data-act="stb"', `data-act="stb" data-e="${H.esc(ST.group)}"`)}</label>` : ''}
        ${au ? `<label class="cp ${auOn ? 'on' : ''}"><b>${hgTr('Automatyczne', 'Automatic')}</b>${this.toggleHtml(auOn, 'sta', false, hgTr('Automatyzacja schodów', 'Stairs automation')).replace('data-act="sta"', `data-act="sta" data-e="${H.esc(ST.automation)}"`)}</label>` : ''}</div>
    </ha-card></div>`;
  }
  /* odtwarzacz w stylu „Teraz odtwarzane”: okładka (entity_picture) z tłem barwionym kolorem okładki, tytuł/wykonawca/aplikacja,
     postęp z media_position/duration (na żywo), sterowanie wg supported_features, głośność + wyciszenie, źródło */
  _player(e) {
    const h = this._hass, s = h.states[e], at = s.attributes, f = at.supported_features || 0, nm = this._nm(e, hgTr('Odtwarzacz', 'Player')), E = H.esc(e);
    const pl = s.state === 'playing', act = ['playing', 'paused', 'buffering'].includes(s.state), off = ['off', 'standby'].includes(s.state);
    const tv = at.device_class === 'tv' || /tv|telewiz/i.test(nm + e);
    const ST = hgTr({ playing: 'Odtwarza', paused: 'Wstrzymano', idle: 'Bezczynny', on: 'Włączony', off: 'Wyłączony', standby: 'Czuwanie', buffering: 'Buforowanie' }, { playing: 'Playing', paused: 'Paused', idle: 'Idle', on: 'On', off: 'Off', standby: 'Standby', buffering: 'Buffering' });
    const app = at.app_name && !/^[a-z]+\.[a-z0-9.]+$/i.test(at.app_name) ? at.app_name : '', src = at.source || '';
    const title = at.media_title || app || ST[s.state] || H.stateLabel(s.state);
    const sub = [at.media_title ? (at.media_artist || at.media_album_name || app) : '', at.media_series_title].filter(Boolean).join(' · ') || (at.media_title || app ? ST[s.state] || '' : nm);
    const art = at.entity_picture ? `<img class="mpa" src="${H.esc(at.entity_picture)}" alt="" loading="lazy"${/^\/(?!\/)/.test(at.entity_picture) ? ' crossorigin="anonymous"' : ''}>` : `<span class="mpa ic">${H.icon(tv ? 'mdi:television-play' : 'mdi:speaker')}</span>`;
    const dur = Number(at.media_duration) || 0, has = dur > 0 && at.media_position != null && (f & 2 || true);
    const pos = has ? Math.min(dur, Number(at.media_position) + (pl && at.media_position_updated_at ? (Date.now() - new Date(at.media_position_updated_at)) / 1000 : 0)) : 0;
    const tm = (x) => { x = Math.max(0, Math.round(x)); const hh = Math.floor(x / 3600), m = Math.floor(x / 60) % 60, ss = String(x % 60).padStart(2, '0'); return hh ? `${hh}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`; };
    const prog = has ? `<div class="mpg" data-dur="${dur}" data-pos="${pos.toFixed(1)}" data-t="${Date.now()}" data-pl="${pl ? 1 : 0}"><div class="mpt"><i style="transform:scaleX(${(pos / dur).toFixed(4)})"></i></div><div class="mpn"><span>${tm(pos)}</span><span>-${tm(dur - pos)}</span></div></div>` : '';
    const B = (a, ic, lab, big) => `<button class="mb ${big ? 'big' : ''}" data-act="${a}" data-e="${E}" aria-label="${lab}">${H.icon(ic)}</button>`;
    const ctl = act || s.state === 'idle' || s.state === 'on' ? [f & 16 ? B('mpprev', 'mdi:skip-previous', hgTr('Poprzedni', 'Previous')) : '', (pl ? f & 1 : f & 16384) ? B('mpp', pl ? 'mdi:pause' : 'mdi:play', pl ? hgTr('Pauza', 'Pause') : hgTr('Odtwarzaj', 'Play'), 1) : '', f & 32 ? B('mpnext', 'mdi:skip-next', hgTr('Następny', 'Next')) : ''].join('') : '';
    const vl = at.volume_level, mu = !!at.is_volume_muted, vp = vl != null ? Math.round(vl * 100) : null;
    const vol = !off && (f & 4) && vp != null ? `<div class="mpv">${f & 8 ? `<button class="mb sm" data-act="mpmu" data-e="${E}" aria-label="${mu ? hgTr('Wyłącz wyciszenie', 'Unmute') : hgTr('Wycisz', 'Mute')}" aria-pressed="${mu}">${H.icon(mu || vp === 0 ? 'mdi:volume-off' : vp < 40 ? 'mdi:volume-medium' : 'mdi:volume-high')}</button>` : H.icon('mdi:volume-high')}
      <input type="range" min="0" max="100" step="1" value="${vp}" style="--v:${vp}%" data-act="vol" data-e="${E}" aria-label="${H.esc(hgTr('Głośność: ', 'Volume: ') + nm)}"><output>${vp}%</output></div>` : '';
    const pw = f & 384 ? B('mpw', 'mdi:power', off ? `${hgTr('Włącz', 'Turn on')}: ${H.esc(nm)}` : `${hgTr('Wyłącz', 'Turn off')}: ${H.esc(nm)}`) : '';
    const chip = src || app ? `<span class="mpch">${H.icon(tv ? 'mdi:television' : 'mdi:music-note')}${H.esc(src || app)}</span>` : '';
    return `<div class="blk"><ha-card class="glass mpc ${pl ? 'pl' : ''} ${off ? 'off' : ''}">
      <div class="mpbg" aria-hidden="true"></div>
      <div class="mph">${art}<button class="mpi" data-act="more" data-e="${E}"><span class="mpd">${H.esc(nm)} · ${H.esc(ST[s.state] || H.stateLabel(s.state))}</span><b>${H.esc(title)}</b><span>${H.esc(sub)}</span></button>${pw}</div>
      ${prog}${ctl ? `<div class="mpk">${ctl}</div>` : ''}${vol || chip ? `<div class="mpf">${vol}${chip}</div>` : ''}
    </ha-card></div>`;
  }
  _devCard(g, a) {
    const h = this._hass, dv = (h.devices || {})[g.d] || {}, P = HGDev.prof(h, g.d, g.ents), st = (e) => h.states[e];
    const av = g.ents.filter((e) => HGDev.ok(st(e)));
    if (!av.length) return null;
    if (P && P.id === 'washer') return this._washer(g, av, dv);
    const used = new Set(), num = (e) => /^(sensor|number|input_number)\./.test(e) && isFinite(parseFloat(st(e).state)) && /^-?\d+(\.\d+)?$/.test(String(st(e).state).trim());
    const raw = dv.name_by_user || dv.name || '';
    const strip = HGAreas.name({ states: { x: { attributes: { friendly_name: raw || hgTr('Urządzenie', 'Device') } } } }, 'x', a, null, '');
    let title = dv.name_by_user || (P && hgTr(P.name, P.nameEn)) || strip || hgTr('Urządzenie', 'Device');
    // główny przełącznik
    const SW = /^(switch|fan|humidifier|light|valve|input_boolean)\./;
    let main = null;
    if (P && P.mainDom) main = av.find((e) => e.startsWith(P.mainDom + '.'));
    if (!main && P && P.main) main = av.find((e) => SW.test(e) && P.main.test(e));
    if (!main && !P) { const sws = av.filter((e) => SW.test(e)); main = sws.find((e) => /^(fan|humidifier)\./.test(e)) || sws.find((e) => /(_on_p_|_on$|power$|_switch_1$|switch$)/.test(e)) || (sws.length === 1 ? sws[0] : null); }
    if (main) used.add(main);
    // stan
    let status = '', se = null;
    if (P && P.status) se = av.find((e) => /^(sensor|select)\./.test(e) && P.status.test(e) && !num(e));
    if (!se && !P) se = av.find((e) => e.startsWith('sensor.') && /(_status|_state)(_p_\d|$)/.test(e) && !num(e));
    if (se) { used.add(se); status = HGDev.stPl(st(se).state); }
    else if (main) { const ms = st(main); const oo = ms.state === 'on' ? hgTr('Włączony', 'On') : hgTr('Wyłączony', 'Off'); status = ms.attributes.preset_mode ? `${oo} · ${HGDev.stPl(ms.attributes.preset_mode)}` : oo; }
    // ostrzeżenia
    const warns = [];
    const fe = av.find((e) => e.startsWith('sensor.') && /fault|error/.test(e) && !num(e) || (e.startsWith('sensor.') && /_fault_p_/.test(e)));
    if (fe) { used.add(fe); const v = String(st(fe).state).trim(); if (!HG_FAULT_OK.test(v)) warns.push(['mdi:alert-circle-outline', hgTr('Błąd: ', 'Error: ') + HGDev.stPl(v)]); }
    for (const w of (P && P.warn) || []) { const e = av.find((x) => w.re.test(x)); if (e) { used.add(e); if (st(e).state === 'on') warns.push([w.icon, hgTr(w.on, w.en)]); } }
    for (const e of av) if (!used.has(e) && e.startsWith('binary_sensor.') && st(e).attributes.device_class === 'problem') { used.add(e); if (st(e).state === 'on') warns.push(['mdi:alert-outline', this._nm(e, 'Problem')]); }
    // kluczowe odczyty
    const met = [], active = se ? !/^(standby|idle|off|shutdown|completed|done|finished)$/i.test(st(se).state) : true;
    if (P) for (const m of P.metrics) {
      if (m.active && !active) continue;
      const e = av.find((x) => !used.has(x) && (!m.dom || x.startsWith(m.dom + '.')) && (m.re ? m.re.test(x) : st(x).attributes.device_class === m.dc) && num(x));
      if (e) { used.add(e); met.push([e, hgTr(m.label, m.en)]); }
    } else {
      const RK = { temperature: 0, humidity: 1, pm25: 2, carbon_dioxide: 3, power: 4, energy: 5, illuminance: 6, battery: 7 };
      av.filter((x) => !used.has(x) && x.startsWith('sensor.') && num(x) && (st(x).attributes.device_class || st(x).attributes.unit_of_measurement))
        .sort((x, y) => (RK[st(x).attributes.device_class] ?? 9) - (RK[st(y).attributes.device_class] ?? 9)).slice(0, 3)
        .forEach((e) => { used.add(e); met.push([e, this._nm(e, hgTr('Odczyt', 'Reading'))]); });
    }
    if (!P && main && !met.length && !dv.name_by_user) title = this._nm(main, title);   // np. samo gniazdko: nazwa encji zamiast nazwy modułu
    // czujnik klimatu nazwany jak pokój -> nazwa rodzajowa
    if (!P && !main && met.length && met.every(([e]) => ['temperature', 'humidity', 'pressure'].includes(st(e).attributes.device_class)) && (!strip || title.toLowerCase() === a.name.toLowerCase() || title.toLowerCase().includes(a.name.toLowerCase().split(' ')[0]))) title = hgTr('Czujnik klimatu', 'Climate sensor');
    const rest = av.filter((e) => !used.has(e) && !/^(text|button|update|event|image)\./.test(e) && !(e.startsWith('sensor.') && !num(e) && String(st(e).state).length > 28));
    const icon = (P && P.icon) || (main && HG_DOM_ICON[main.split('.')[0]]) || (met[0] && HG_DC_ICON[st(met[0][0]).attributes.device_class]) || 'mdi:devices';
    const on = main ? ['on', 'open', 'unlocked'].includes(st(main).state) : active && !!se;
    const U = { d: hgTr('dni', 'd'), min: 'min', h: 'h', s: 's' };
    const mx = met.map(([e, l]) => { const [v, u] = this._num(st(e)); return `<button class="m" data-act="more" data-e="${H.esc(e)}" aria-label="${H.esc(`${l}: ${v} ${u}`)}"><b>${H.esc(v)}<em>${H.esc(U[u] || u)}</em></b><span>${H.esc(l)}</span></button>`; }).join('');
    const open = this._devOpen && this._devOpen.has(g.d);
    const rows = open ? rest.map((e) => {
      const s = st(e), dom = e.split('.')[0], nm = this._nm(e, e);
      if (/^(switch|fan|humidifier|light|input_boolean|valve)$/.test(dom)) { const o = s.state === 'on' || s.state === 'open';
        return `<div class="row sub ${o ? 'on' : ''}"><button class="tx" data-act="more" data-e="${H.esc(e)}"><b>${H.esc(nm)}</b></button>${this.toggleHtml(o, 'tgl', false, nm).replace('data-act="tgl"', `data-act="tgl" data-e="${H.esc(e)}"`)}</div>`; }
      const [v, u] = dom === 'binary_sensor' ? [s.state === 'on' ? hgTr('Tak', 'Yes') : hgTr('Nie', 'No'), ''] : dom === 'select' ? [HGDev.stPl(s.state), ''] : this._num(s);
      return `<button class="row sub" data-act="more" data-e="${H.esc(e)}" style="width:100%"><span class="tx"><b>${H.esc(nm)}</b></span><span class="v">${H.esc(v)}${u ? `<em>${H.esc(U[u] || u)}</em>` : ''}</span></button>`;
    }).join('') + `<button class="lnk sm" data-act="dev" data-d="${H.esc(g.d)}">${H.icon('mdi:cog-outline')}${hgTr('Ustawienia urządzenia', 'Device settings')}</button>` : '';
    const tg = main ? this.toggleHtml(['on', 'open'].includes(st(main).state), 'tgl', false, title).replace('data-act="tgl"', `data-act="tgl" data-e="${H.esc(main)}"`) : '';
    return `<div class="blk"><ha-card class="glass dv ${on ? 'on' : ''}">
      <div class="dh"><span class="ri">${H.icon(icon)}</span><button class="tx" data-act="${main ? 'more' : 'dev'}" ${main ? `data-e="${H.esc(main)}"` : `data-d="${H.esc(g.d)}"`} aria-label="${H.esc(title + (status ? ', ' + status : ''))}"><b>${H.esc(title)}</b>${status ? `<span>${H.esc(status)}</span>` : ''}</button>${tg}</div>
      ${mx ? `<div class="mx">${mx}</div>` : ''}${warns.length ? `<div class="wr">${warns.map(([i, t]) => `<span class="wc">${H.icon(i)}${H.esc(t)}</span>`).join('')}</div>` : ''}
      ${rest.length ? `<button class="mr" data-act="dmore" data-d="${H.esc(g.d)}" aria-expanded="${!!open}">${open ? hgTr('Mniej', 'Less') : `${hgTr('Więcej', 'More')} · ${rest.length}`}${H.icon(open ? 'mdi:chevron-up' : 'mdi:chevron-down')}</button>${rows}` : ''}</ha-card></div>`;
  }
  render() {
    const h = this._hass, a = this._area(); this._a = a;
    if (!a) return `<ha-card class="glass"><div class="empty"><b>${hgTr('Nie znaleziono pokoju', 'Room not found')}</b>${hgTr('Ten pokój nie istnieje albo został usunięty.', 'This room does not exist or has been deleted.')}<button class="lnk" data-act="rooms">${H.icon('mdi:chevron-left')}${hgTr('Wszystkie pokoje', 'All rooms')}</button></div></ha-card>`;
    const ST = (this._config.areas || {}).stairs, isSt = ST && ST.room === a.id;
    const CW = (this._config.areas || {}).cwu, isCw = CW && CW.room === a.id;
    const SX = new Set(isSt ? [ST.group, ST.bottom.light, ST.top.light, ST.bottom.motion, ST.top.motion] : []);
    if (isCw) [CW.heater, CW.heating, CW.keep, CW.power, CW.remaining, CW.consumption, ...CW.switches.map((x) => x[0]), ...(CW.up ? [CW.up.tank, CW.up.switch, CW.up.power, ...CW.up.co.map((x) => x[0])] : [])].forEach((e) => SX.add(e));
    const RS = 'room:' + a.id, RL = HGL.get(RS), SWP = RL.conf._swap || {};
    const S0 = isSt || isCw ? Object.fromEntries(Object.entries(a.sec).map(([k, v]) => [k, Array.isArray(v) ? v.filter((e) => typeof e !== 'string' || !SX.has(e)) : v])) : a.sec, ok = (e) => H.ok(h.states[e]);
    const S = Object.keys(SWP).length ? Object.fromEntries(Object.entries(S0).map(([k, v]) => [k, Array.isArray(v) ? v.map((e) => (typeof e === 'string' && SWP[e] && h.states[SWP[e]] ? SWP[e] : e)) : v])) : S0;
    const blocks = [];
    if (isSt) blocks.push(this._stairs(ST));
    if (isCw) { blocks.push(this._cwu(CW)); if (CW.up) blocks.push(this._cwuUp(CW.up)); }
    // stan pokoju: obecność / ruch i drzwi / okna jako chipy
    const CH = [...S.mot, ...S.door].filter(ok);
    if (CH.length) blocks.push(`<div class="blk"><ha-card class="glass chips">${CH.map((e) => { const s = h.states[e], dc = s.attributes.device_class, on = s.state === 'on', isD = S.door.includes(e), nm = this._nm(e, hgTr('Czujnik', 'Sensor'));
      const occ = ['occupancy', 'presence'].includes(dc), lab = isD ? (on ? hgTr('otwarte', 'open') : hgTr('zamknięte', 'closed')) : on ? (occ ? hgTr('obecność', 'presence') : hgTr('ruch', 'motion')) : (occ ? hgTr('brak obecności', 'no presence') : hgTr('brak ruchu', 'no motion'));
      const ic = isD ? (dc === 'window' ? (on ? 'mdi:window-open-variant' : 'mdi:window-closed-variant') : on ? 'mdi:door-open' : 'mdi:door-closed') : occ ? (on ? 'mdi:account' : 'mdi:account-outline') : on ? 'mdi:motion-sensor' : 'mdi:motion-sensor-off';
      const t = /^(obecność|ruch|czujnik|presence|occupancy|motion|sensor)$/i.test(nm) ? (occ ? hgTr('Obecność', 'Presence') : hgTr('Ruch', 'Motion')) : nm, st = isD ? (on ? hgTr('Otwarte', 'Open') : hgTr('Zamknięte', 'Closed')) : on ? hgTr('Wykryto', 'Detected') : (occ ? hgTr('Brak obecności', 'No presence') : hgTr('Brak ruchu', 'No motion'));
      const mn = Math.max(0, Math.round((Date.now() - new Date(s.last_changed)) / 60000)), dur = mn < 1 ? hgTr('chwilę', 'a moment') : mn < 60 ? `${mn} min` : mn < 1440 ? `${Math.floor(mn / 60)} h` : `${Math.floor(mn / 1440)} ${Math.floor(mn / 1440) === 1 ? hgTr('dzień', 'day') : hgTr('dni', 'days')}`;
      const rel = isNaN(mn) ? '' : mn < 1 ? hgTr('przed chwilą', 'just now') : on ? hgTr(`od ${dur}`, `for ${dur}`) : hgTr(`${dur} temu`, `${dur} ago`);
      const kind = isD ? 'door' + (dc === 'window' ? ' win' : '') : occ ? 'occ' : 'mot';
      return `<button class="sc k-${kind.split(' ')[0]} ${kind.includes('win') ? 'k-win' : ''} ${on ? (isD ? 'opn' : 'act') : ''}" data-act="more" data-e="${H.esc(e)}" aria-label="${H.esc(t + ': ' + st + (rel ? ', ' + rel : ''))}"><span class="sb"><i class="rg"></i><i class="rg r2"></i>${H.icon(ic)}</span><span class="st2"><b>${H.esc(t)}</b><span><em>${H.esc(st)}</em>${rel ? `<small>${H.esc(rel)}</small>` : ''}</span></span></button>`; }).join('')}</ha-card></div>`);
    const blk = (k, rows, n) => { const d = HG_SEC.find((x) => x[0] === k); blocks.push(`<div class="blk" data-hgk="${H.esc(d[1])}"><ha-card class="glass"><div class="sh">${H.icon(d[2])}${hgTr(d[1], d[3])}<i>${n}</i></div>${rows}</ha-card></div>`); };
    const dimm = (s) => (s.attributes.supported_color_modes || []).some((x) => x !== 'onoff') || s.attributes.brightness != null;
    // światła
    const L = S.light.filter(ok);
    if (L.length) { const d = HG_SEC.find((x) => x[0] === 'light'), nOn = L.filter((e) => h.states[e].state === 'on').length;
      blocks.push(`<div class="blk" data-hgk="${H.esc(d[1])}"><ha-card class="glass"><div class="sh">${H.icon(d[2])}${hgTr(d[1], d[3])}<i>${nOn ? hgTr(`${nOn} z ${L.length} wł.`, `${nOn} of ${L.length} on`) : L.length}</i></div><div class="lg">${L.map((e) => {
      const s = h.states[e], on = s.state === 'on', dom = e.split('.')[0], nm = this._nm(e, hgTr('Światło', 'Light'));
      const pct = on && s.attributes.brightness != null ? Math.round(s.attributes.brightness / 2.55) : on ? 100 : 0, dm = dom === 'light' && dimm(s);
      const br = dm && on ? `<div class="br"><input type="range" min="0" max="100" step="1" value="${pct}" style="--v:${pct}%" data-act="bri" data-e="${H.esc(e)}" aria-label="${H.esc(hgTr('Jasność: ', 'Brightness: ') + nm)}"><output>${pct}%</output></div>` : '';
      return `<div class="lt ${on ? 'on' : ''}"><button class="ltb" data-act="tgl" data-e="${H.esc(e)}" aria-pressed="${on}" aria-label="${H.esc(nm + ': ' + (on ? hgTr('włączone', 'on') : hgTr('wyłączone', 'off')))}"><span class="lti">${H.icon(on ? 'mdi:lightbulb-on' : 'mdi:lightbulb-outline')}</span><span class="ltx"><b>${H.esc(nm)}</b><span>${on ? (dm ? `${hgTr('Włączone', 'On')} · ${pct}%` : hgTr('Włączone', 'On')) : hgTr('Wyłączone', 'Off')}</span></span></button><button class="ltm" data-act="more" data-e="${H.esc(e)}" aria-label="${H.esc(nm + hgTr(' – szczegóły', ' – details'))}">${H.icon('mdi:dots-horizontal')}</button>${br}</div>`;
    }).join('')}</div></ha-card></div>`); }
    // klimatyzacja (karta hg-ac-card wstawiana po renderze) + bojler/podgrzewacz jako wiersz
    for (const e of S.clim.filter((x) => x.startsWith('climate.') && ok(x))) blocks.push(`<div class="blk"><div class="acslot" data-ac="${H.esc(e)}"></div></div>`);
    const WH = S.clim.filter((x) => !x.startsWith('climate.') && ok(x));
    if (WH.length) blk('clim', WH.map((e) => { const s = h.states[e], ct = s.attributes.current_temperature, nm = this._nm(e, hgTr('Podgrzewacz', 'Water heater'));
      return `<div class="row ${s.state !== 'off' ? 'on' : ''}"><span class="ri">${H.icon('mdi:water-boiler')}</span><button class="tx" data-act="more" data-e="${H.esc(e)}"><b>${H.esc(nm)}</b><span>${H.esc(H.T(this._hass, s))}${s.attributes.temperature != null ? hgTr(' · cel ', ' · target ') + H.fmt(s.attributes.temperature) + '°' : ''}</span></button>${ct != null ? `<span class="v">${H.fmt(ct, 0)}<em>°C</em></span>` : ''}</div>`; }).join(''), WH.length);
    // media
    const M = S.media.filter(ok);
    for (const e of M) blocks.push(this._player(e));
    // rolety
    const C = S.cover.filter(ok);
    if (C.length) blk('cover', C.map((e) => { const s = h.states[e], nm = this._nm(e, hgTr('Roleta', 'Cover')), p = s.attributes.current_position, cf = s.attributes.supported_features ?? 11;
      const st = hgTr({ open: 'Otwarta', closed: 'Zamknięta', opening: 'Otwiera się', closing: 'Zamyka się' }, { open: 'Open', closed: 'Closed', opening: 'Opening', closing: 'Closing' })[s.state] || H.stateLabel(s.state);
      return `<div class="row ${s.state === 'open' ? 'opn' : ''}"><span class="ri">${H.icon(s.state === 'closed' ? 'mdi:window-shutter' : 'mdi:window-shutter-open')}</span><button class="tx" data-act="more" data-e="${H.esc(e)}"><b>${H.esc(nm)}</b><span>${H.esc(st)}${p != null ? ' · ' + p + '%' : ''}</span></button>
        <div class="bts">${cf & 1 ? `<button class="bt" data-act="cov" data-s="open_cover" data-e="${H.esc(e)}" aria-label="${hgTr('Otwórz', 'Open')}">${H.icon('mdi:arrow-up')}</button>` : ''}${cf & 8 ? `<button class="bt" data-act="cov" data-s="stop_cover" data-e="${H.esc(e)}" aria-label="${hgTr('Zatrzymaj', 'Stop')}">${H.icon('mdi:stop')}</button>` : ''}${cf & 2 ? `<button class="bt" data-act="cov" data-s="close_cover" data-e="${H.esc(e)}" aria-label="${hgTr('Zamknij', 'Close')}">${H.icon('mdi:arrow-down')}</button>` : ''}</div></div>`; }).join(''), C.length);
    // kamery: osadzona karta kamery (miniatura, podgląd na żywo, pełny ekran)
    for (const e of S.cam) if (ok(e)) blocks.push(`<div class="blk"><div class="camslot" data-cam="${H.esc(e)}"></div></div>`);
    // urządzenia: jedna karta na urządzenie (encje mediów/klimatyzacji/kamer należą do swoich komponentów)
    const reg = h.entities || {}, skipDev = new Set([...S.media, ...S.clim, ...S.cam].map((e) => reg[e] && reg[e].device_id).filter(Boolean));
    if (isCw) [CW.heater, ...(CW.up ? [CW.up.tank, CW.up.switch, CW.up.power, ...CW.up.co.map((x) => x[0])] : [])].forEach((e) => { const d = reg[e] && reg[e].device_id; if (d) skipDev.add(d); });
    const DG = HGDev.groups(h, a, skipDev), unDev = [];
    if (isCw) DG.loose = DG.loose.filter((e) => !SX.has(e));
    const EV = HGAreas.env(h, a), envDC = ['temperature', 'humidity', 'battery', 'voltage', 'signal_strength'];
    const envOnly = (g) => (EV.t != null || EV.u != null) && g.ents.length && g.ents.every((e) => e.startsWith('sensor.') && envDC.includes(((h.states[e] || {}).attributes || {}).device_class));
    for (const g of DG.devs) { if (envOnly(g)) continue; const html = this._devCard(g, a); if (html) blocks.push(html); else unDev.push(g); }
    // encje bez urządzenia: przełączniki i odczyty jako listy
    const LW = DG.loose.filter((e) => ok(e) && S.sw.includes(e));
    if (LW.length) blk('sw', LW.map((e) => { const s = h.states[e], dom = e.split('.')[0], nm = this._nm(e, hgTr('Przełącznik', 'Switch'));
      const on = dom === 'lock' ? s.state === 'unlocked' : ['on', 'open'].includes(s.state);
      const sub = dom === 'lock' ? (s.state === 'locked' ? hgTr('Zamknięty', 'Locked') : hgTr('Otwarty', 'Unlocked')) : on ? hgTr('Włączone', 'On') : hgTr('Wyłączone', 'Off');
      return `<div class="row ${on ? 'on' : ''}"><span class="ri">${H.icon(s.attributes.icon || HG_DOM_ICON[dom] || 'mdi:toggle-switch-outline')}</span><button class="tx" data-act="more" data-e="${H.esc(e)}"><b>${H.esc(nm)}</b><span>${sub}</span></button>
        ${this.toggleHtml(on, 'tgl', false, nm).replace('data-act="tgl"', `data-act="tgl" data-e="${H.esc(e)}"`)}</div>`; }).join(''), LW.length);
    const LS = DG.loose.filter((e) => ok(e) && S.sens.includes(e));
    if (LS.length) blk('sens', LS.map((e) => { const s = h.states[e], dc = s.attributes.device_class, bin = e.startsWith('binary_sensor.'), nm = this._nm(e, hgTr('Czujnik', 'Sensor'));
      const [v, u] = bin ? [H.T(this._hass, s), ''] : this._num(s);
      return `<button class="row ${bin && s.state === 'on' ? 'act' : ''}" data-act="more" data-e="${H.esc(e)}" style="width:100%"><span class="ri">${H.icon(s.attributes.icon || HG_DC_ICON[dc] || HG_DOM_ICON[e.split('.')[0]])}</span><span class="tx"><b>${H.esc(nm)}</b></span><span class="v">${H.esc(v)}${u ? `<em>${H.esc(u)}</em>` : ''}</span></button>`; }).join(''), LS.length);
    // niedostępne: zwinięte (całe urządzenia jako jedna pozycja)
    const UNI = [...DG.loose.filter((e) => !ok(e) && !S.misc.some((g) => g.ents.includes(e))).map((e) => ({ e, n: this._nm(e, e), i: HG_DOM_ICON[e.split('.')[0]] || 'mdi:help-circle-outline' })),
      ...[...S.light, ...S.media, ...S.clim.filter((x) => x.startsWith('climate.'))].filter((e) => !ok(e)).map((e) => ({ e, n: this._nm(e, e), i: HG_DOM_ICON[e.split('.')[0]] || 'mdi:help-circle-outline' })),
      ...unDev.map((g) => { const dv = (h.devices || {})[g.d] || {}, P = HGDev.prof(h, g.d, g.ents); return { d: g.d, n: dv.name_by_user || (P && hgTr(P.name, P.nameEn)) || dv.name || hgTr('Urządzenie', 'Device'), i: (P && P.icon) || 'mdi:devices' }; })];
    if (UNI.length) blocks.push(`<div class="blk ${this._showUn ? "" : "unb"}"><ha-card class="glass ${this._showUn ? "" : "quiet"}"><button class="unh" data-act="unv" aria-expanded="${!!this._showUn}">${hgTr('Niedostępne', 'Unavailable')} · ${UNI.length}${H.icon(this._showUn ? 'mdi:chevron-up' : 'mdi:chevron-down')}</button>
      ${this._showUn ? UNI.map((x) => `<button class="row un" ${x.d ? `data-act="dev" data-d="${H.esc(x.d)}"` : `data-act="more" data-e="${H.esc(x.e)}"`} style="width:100%"><span class="ri">${H.icon(x.i)}</span><span class="tx"><b>${H.esc(x.n)}</b><span>${hgTr('Niedostępne', 'Unavailable')}</span></span></button>`).join('') : ''}</ha-card></div>`);
    // tryb edycji: encje dodane do pokoju (klimat/kamera jako osadzone karty, reszta jako kafelki)
    for (const x of RL.added) if (h.states[x.e]) { const k = HG_TILE_KIND(x.e);
      blocks.push(`<div class="blk" data-hgk="${H.esc(x.e)}">${k === 'clim' ? `<div class="acslot" data-ac="${H.esc(x.e)}"></div>` : k === 'cam' ? `<div class="camslot" data-cam="${H.esc(x.e)}"></div>` : `<div class="tg2 one">${hgTileHtml(h, x.e).replace(/ data-hgk="[^"]*"/, '')}</div>`}</div>`); }
    // klucze bloków (stałe między renderami): encja/urządzenie z pierwszego atrybutu albo rodzaj sekcji
    const seenK = {};
    const keyed = blocks.map((b) => { const m0 = b.match(/^\s*<div class="blk[^"]*" data-hgk="([^"]+)"/); let k = m0 && m0[1];
      if (!k) { const m1 = b.match(/data-(?:ac|cam|d)="([^"]+)"/) || b.match(/class="sh">[\s\S]*?<\/ha-icon>([^<]+)/) || b.match(/data-e="([^"]+)"/) || b.match(/class="(cwu|stw|chips|unh)/); k = m1 ? m1[1].trim() : 'b'; }
      seenK[k] = (seenK[k] || 0) + 1; if (seenK[k] > 1) k += '#' + seenK[k];
      const html = m0 ? b : b.replace(/^(\s*<div class="blk[^"]*")/, `$1 data-hgk="${H.esc(k)}"`);
      const nmO = RL.names && RL.names[k]; const html2 = nmO ? html.replace(/(class="sh">[\s\S]*?<\/ha-icon>)([^<]+)/, (m0, a1) => a1 + H.esc(nmO)) : html;
      const cf = RL.conf[k] || {}; let html3 = cf.i ? html2.replace(/(class="sh">\s*<ha-icon class="[^"]*" icon=")[^"]*/, `$1${H.esc(cf.i)}`) : html2;
      if (cf.t) html3 = html3.replace(/^(\s*<div class="blk)/, `$1 hgm-${cf.t}`);
      return { k, html: RL.size[k] ? html3.replace(/^(\s*<div class="blk)/, `$1 ${HGL.szc(RL.size[k])}`) : html3 }; });
    const hidR = new Set(RL.hidden);
    blocks.length = 0; for (const x of HGL.sort(keyed.filter((x) => !hidR.has(x.k)), (x) => x.k, RL.order)) blocks.push(x.html);
    if (!blocks.length) return `<ha-card class="glass"><div class="empty"><b>${hgTr('Brak urządzeń w tym pokoju', 'No devices in this room')}</b>${hgTr(`Przypisz urządzenia do obszaru „${H.esc(a.name)}” w ustawieniach Home Assistant.`, `Assign devices to the “${H.esc(a.name)}” area in Home Assistant settings.`)}
      ${a.virtual ? '' : `<button class="lnk" data-act="area" data-a="${H.esc(a.id)}">${H.icon('mdi:cog-outline')}${hgTr('Ustawienia obszaru', 'Area settings')}</button>`}</div></ha-card>`;
    return `<div class="wrap ${Object.keys(RL.size).length ? 'gsz' : ''}" data-hgl="${H.esc(RS)}" data-hgsz="1">${blocks.join('')}</div>`;
  }
  afterRender() {
    clearInterval(this._stT); this._stT = 0; clearInterval(this._mpT); this._mpT = 0;
    const tmf = (x) => { x = Math.max(0, Math.round(x)); const hh = Math.floor(x / 3600), m = Math.floor(x / 60) % 60, ss = String(x % 60).padStart(2, '0'); return hh ? `${hh}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`; };
    if (this.$.querySelector('.mpg[data-pl="1"]')) this._mpT = setInterval(() => { for (const g of this.$.querySelectorAll('.mpg[data-pl="1"]')) { const d = +g.dataset.dur, p = Math.min(d, +g.dataset.pos + (Date.now() - +g.dataset.t) / 1000);
      g.querySelector('i').style.transform = `scaleX(${(p / d).toFixed(4)})`; const n = g.querySelectorAll('.mpn span'); n[0].textContent = tmf(p); n[1].textContent = '-' + tmf(d - p); } }, 1000);
    for (const im of this.$.querySelectorAll('img.mpa:not([data-t])')) { im.dataset.t = 1; const go = () => { try { const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 8, 8); const d = x.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4, cd = im.closest('.mpc'); if (cd) cd.style.setProperty('--mt', `rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`); } catch (_) {} }; im.complete && im.naturalWidth ? go() : im.addEventListener('load', go, { once: true }); }
    if (this._stFade) this._stT = setInterval(() => { const el = this.$.querySelector('.stf'), r = Math.ceil((this._stFade - Date.now()) / 1000);
      if (!el || r <= 0) { clearInterval(this._stT); this._stT = 0; this._stFade = null; if (el) el.textContent = hgTr('Gaśnie…', 'Turning off…'); return; } el.textContent = hgTr(`Gaśnie za ${r} s`, `Turning off in ${r} s`); const n = this.$.querySelector('.stn'); if (n) n.textContent = r; }, 1000);
    const h = this._hass, keep = new Set();
    for (const slot of this.$.querySelectorAll('.acslot[data-ac]')) {
      const e = slot.dataset.ac; keep.add(e);
      let el = this._ac.get(e);
      if (!el) { el = document.createElement('hg-ac-card'); el.setConfig({ entity: e, title: this._nm(e, hgTr('Klimatyzacja', 'Air conditioning')), compact: true }); this._ac.set(e, el); }
      slot.appendChild(el); el.hass = h;
    }
    for (const k of [...this._ac.keys()]) if (!keep.has(k)) this._ac.delete(k);
    this._cams = this._cams || new Map(); const kc = new Set();
    for (const slot of this.$.querySelectorAll('.camslot[data-cam]')) {
      const e = slot.dataset.cam; kc.add(e);
      let el = this._cams.get(e);
      if (!el) { el = document.createElement('hg-camera-card'); const A = this._config.areas || {}, fs = (A.camera_fs || {})[e], fb = (A.camera_fb || {})[e], rf = (A.camera_refresh || {})[e];
        el.setConfig({ entity: e, name: ((this._config.areas || {}).entity_names || {})[e] || this._nm(e, hgTr('Kamera', 'Camera')), embedded: true, ...(fs ? { fs_entity: fs } : {}), ...(fb ? { fallback: fb } : {}), ...(rf ? { refresh: rf } : {}) }); this._cams.set(e, el); }
      slot.appendChild(el); el.hass = h;
    }
    for (const k of [...this._cams.keys()]) if (!kc.has(k)) this._cams.delete(k);
  }
  onAct(act, t) {
    const h = this._hass, e = t.dataset.e;
    if (act[0] === 't' && hgTileAct(this, act, t)) return;
    if (act === 'more') return H.fire(this, 'hass-more-info', { entityId: e });
    if (act === 'tgl') {
      const dom = e.split('.')[0], s = h.states[e];
      if (dom === 'lock') return H.call(h, 'lock', s.state === 'locked' ? 'unlock' : 'lock', { entity_id: e });
      return H.call(h, ['light', 'switch', 'fan', 'input_boolean', 'humidifier', 'siren', 'valve'].includes(dom) ? dom : 'homeassistant', 'toggle', { entity_id: e });
    }
    if (act === 'stb') { const st = h.states[e]; if (!H.ok(st)) return H.fire(this, 'hass-more-info', { entityId: e }); return H.call(h, 'light', 'toggle', { entity_id: e }); }
    if (act === 'cwut') { const e = t.dataset.e, w = h.states[e]; if (!H.ok(w)) return; const a2 = w.attributes, v = Math.max(a2.min_temp || 30, Math.min(a2.max_temp || 75, Number(a2.temperature || a2.target_temperature || 50) + Number(t.dataset.d))); return H.call(h, 'water_heater', 'set_temperature', { entity_id: e, temperature: v }); }
    if (act === 'cwus') { const e = t.dataset.e; return H.call(h, 'switch', h.states[e] && h.states[e].state === 'on' ? 'turn_off' : 'turn_on', { entity_id: e }); }
    if (act === 'sta') return H.call(h, 'automation', h.states[e].state === 'on' ? 'turn_off' : 'turn_on', { entity_id: e });
    if (act === 'wm') return H.call(h, 'select', 'select_option', { entity_id: e, option: t.dataset.o });
    if (act === 'mpp') return H.call(h, 'media_player', h.states[e].state === 'playing' && (h.states[e].attributes.supported_features & 1) ? 'media_pause' : 'media_play', { entity_id: e });
    if (act === 'mpprev') return H.call(h, 'media_player', 'media_previous_track', { entity_id: e });
    if (act === 'mpnext') return H.call(h, 'media_player', 'media_next_track', { entity_id: e });
    if (act === 'mpmu') return H.call(h, 'media_player', 'volume_mute', { entity_id: e, is_volume_muted: !h.states[e].attributes.is_volume_muted });
    if (act === 'mpw') return H.call(h, 'media_player', ['off', 'standby'].includes(h.states[e].state) ? 'turn_on' : 'turn_off', { entity_id: e });
    if (act === 'cov') return H.call(h, 'cover', t.dataset.s, { entity_id: e });
    if (act === 'robots') return H.navigate(this._config.robots_path);
    if (act === 'dev') return H.navigate('/config/devices/device/' + t.dataset.d);
    if (act === 'area') return H.navigate('/config/areas/area/' + t.dataset.a);
    if (act === 'rooms') return H.navigate(HG_P('rooms'));
    if (act === 'unv') { this._showUn = !this._showUn; return this.rerender(); }
    if (act === 'dmore') { const d = t.dataset.d, o = this._devOpen = this._devOpen || new Set(); o.has(d) ? o.delete(d) : o.add(d); return this.rerender(); }
  }
  getCardSize() { return 10; }
}
hgReg('hg-room-card', HGRoomCard, 'Home Glass – Pokój', 'Wszystkie encje pokoju pogrupowane wg rodzaju (adres ?area=<id>)');
