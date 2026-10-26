/* ===== Telewizor: parowanie aplikacji Nuvio TV (strona ustawień, System).
   Kolejność w kliknięciu Sparuj: (1) synchronicznie, przed pierwszym await, window.open('', 'nuvio-tv-pair') zachowuje gest użytkownika (iOS Safari i inne blokują okna otwierane po await),
   (2) token długoterminowy powstaje w HA, (3) ukryty formularz POST z target=nuvio-tv-pair nawiguje to okno do telewizora w sieci domowej,
   (4) połączenie potwierdza znacznik nuvio_tv_seen, który telewizor zapisuje w danych użytkownika HA (frontend/set_user_data).
   Gdy przeglądarka zablokuje okno (window.open daje null): token powstaje po pierwszym kliknięciu i czeka w pamięci, a drugie kliknięcie (przycisk tv-send) wysyła formularz
   synchronicznie z target=_blank. Niewysłany token jest kasowany po 2 minutach, po zamknięciu panelu i po ponownym otwarciu panelu.
   Gdy sama strona jest serwowana przez http: (typowy Home Assistant w sieci domowej), nie ma karty ani formularza: po utworzeniu tokenu idzie fetch POST (CORS) prosto do telewizora,
   a odpowiedź 200, 403, 429 lub inna (albo wynik nieznany przy TypeError i przerwaniu) wybiera dalszy ciąg (sendDirect). Przy https: karta zamyka się sama po potwierdzeniu znacznikiem.
   Przed utworzeniem tokenu (po synchronicznym openTab) jawna zgoda na wysyłkę po http:// do TV. Adres TV buduje wyłącznie HGTvLogic.pairUrl (walidacja host:port, bez schematu i ścieżki).
   Czyste funkcje: hg-tvlogic.part.js. Wartości pól trzyma obiekt (s), bo _eLook() kasuje wpisany tekst. Token żyje tylko w zmiennej lokalnej pair(), w this.ready między dwoma kliknięciami i w polu formularza w pamięci. ===== */
const HGTv = window.__hgTv || (window.__hgTv = {
  FIELDS: [['tv-addr', 'addr'], ['tv-code', 'code'], ['tv-ha', 'ha']],
  /* domeny encji w pokoju na TV (zgodne z nuvio-tv buildLayout; input_boolean → switch) */
  ROOM_DOMS: ['light', 'climate', 'cover', 'media_player', 'switch', 'input_boolean', 'sensor'],
  WIN: 'nuvio-tv-pair', HOLD_MS: 120000,
  /* czas oczekiwania na znacznik: przy adresie HA http spoza sieci prywatnej telewizor najpierw pyta o zgodę na połączenie bez szyfrowania (klik pilotem), więc dwa razy dłużej;
     w sieci prywatnej pomija to pytanie, więc 60 s. Znacznik sprawdzamy co POLL_MS, wysyłka fetch ma limit FETCH_MS */
  WAIT_MS: 60000, WAIT_HTTP_MS: 120000, POLL_MS: 1000, FETCH_MS: 8000,
  s: { addr: '', code: '', ha: '' }, err: {}, status: 'idle', list: null, seen: {}, listErr: false, loading: false, rid: 0, wait: 60000, _sheet: undefined, ready: null,
  /* layout treści TV (nuvio_tv_layout): draft === null = jeszcze nie wczytany */
  draft: null, layoutErr: false, layoutLoading: false, layoutSaving: false, layoutSaved: false, layoutRid: 0, openRoom: null,
  clock: { now: () => Date.now(), sleep: (ms) => new Promise((r) => setTimeout(r, ms)) },
  now: () => new Date(),
  working() { return this.status === 'working' || this.status === 'accepted' || this.status === 'waiting' || this.status === 'ready'; },
  redraw(p) { if (p._eSheetEl && p._eSheetEl.querySelector('.lk')) p._eLook(); },
  fmt(iso) { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(HG_LOC(), { dateStyle: 'medium', timeStyle: 'short' }); },
  errText(k) {
    switch (k + ':' + this.err[k]) {
      case 'addr:bad': return hgT('tv.err_addr');
      case 'addr:private': return hgT('tv.err_private');
      case 'code:bad': return hgT('tv.err_code');
      case 'ha:bad': return hgT('tv.err_ha');
      default: return '';
    }
  },
  statusText() {
    switch (this.status) {
      case 'working': return hgT('tv.working');
      case 'ready': return hgT('tv.ready');
      case 'accepted': return hgT('tv.accepted');
      case 'waiting': return hgT('tv.waiting', { seconds: this.wait / 1000 });
      case 'done': return H.icon('mdi:check-circle') + hgT('tv.connected');
      case 'timeout': return hgT('tv.timeout');
      case 'expired': return hgT('tv.expired');
      case 'err_create': return hgT('tv.err_create');
      case 'err_id': return hgT('tv.err_id');
      case 'err_send': return hgT('tv.err_send');
      case 'err_wrong': return hgT('tv.err_wrong');
      case 'err_limit': return hgT('tv.err_limit');
      case 'err_rejected': return hgT('tv.err_rejected');
      default: return '';
    }
  },
  /* lista do ponownego wczytania; trwające wczytywanie traci ważność (jego spóźniona odpowiedź jest odrzucana, bo mogła zawierać już usunięty token) */
  invalidate() { this.rid += 1; this.loading = false; this.list = null; },
  layoutInvalidate() { this.layoutRid += 1; this.layoutLoading = false; this.draft = null; this.layoutErr = false; this.layoutSaved = false; this.openRoom = null; },
  async prep(p) {
    if (this.loading) return; this.loading = true; const h = p._hass, my = ++this.rid;
    try {
      const list = HGTvLogic.tokens(await h.callWS({ type: 'auth/refresh_tokens' }));
      let seen = {}; try { seen = HGTvLogic.parseSeen((await h.callWS({ type: 'frontend/get_user_data', key: HGTvLogic.SEEN_KEY })).value); } catch (e) { seen = {}; }
      if (my !== this.rid) return;
      this.list = list; this.seen = seen; this.listErr = false;
    } catch (e) { if (my !== this.rid) return; this.list = null; this.listErr = true; }
    this.loading = false; this.redraw(p);
  },
  async prepLayout(p) {
    if (this.layoutLoading) return; this.layoutLoading = true; const h = p._hass, my = ++this.layoutRid;
    try {
      const r = await h.callWS({ type: 'frontend/get_user_data', key: HGTvLogic.LAYOUT_KEY });
      if (my !== this.layoutRid) return;
      this.draft = this.seedDraft(h, HGTvLogic.parseLayout(r && r.value));
      this.layoutErr = false; this.layoutSaved = false;
    } catch (e) { if (my !== this.layoutRid) return; this.draft = null; this.layoutErr = true; }
    this.layoutLoading = false; this.redraw(p);
  },
  /* domeny dopuszczalne w whitelist pokoju TV (katalog + sensory binarne / zamki itd.) */
  TV_ROOM_DOMS: ['light', 'climate', 'cover', 'media_player', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'fan', 'lock', 'camera', 'humidifier', 'vacuum', 'valve', 'siren'],
  /* siatka pokoi jak hg-areas-card._rooms: wiz.areas + HGL scope „rooms” (kolejność, ukryte, dodane, nazwy).
     _none → __other__ (id TV). Bez modelu HGAreas → fallback catalog().rooms. */
  dashboardRooms(h) {
    let m = null;
    try {
      if (typeof HGAreas !== 'undefined' && HGAreas.model) {
        m = HGAreas.model(h, typeof HGAreas.glob === 'function' ? HGAreas.glob() : undefined);
      }
    } catch (e) { m = null; }
    if (!m || !m.byId) return this.catalog(h).rooms.map((r) => ({ id: r.id, name: r.name }));
    const L = (typeof HGL !== 'undefined' && HGL.get) ? HGL.get('rooms') : { order: [], hidden: [], added: [], conf: {} };
    const hid = new Set(L.hidden || []);
    const base = Array.isArray(m.rooms) ? m.rooms.slice() : (m.list || []);
    const inBase = new Set(base.map((a) => a.id));
    const add = (L.added || []).map((x) => x && m.byId[x.e]).filter((a) => a && !inBase.has(a.id));
    const sort = (typeof HGL !== 'undefined' && HGL.sort) ? (items, key, order) => HGL.sort(items, key, order) : (items) => items;
    const rooms = sort([...base, ...add].filter((a) => a && !hid.has(a.id)), (a) => a.id, L.order || []);
    return rooms.map((a) => {
      const cf = (L.conf && L.conf[a.id]) || {};
      return {
        id: a.id === '_none' ? HGTvLogic.OTHER_ROOM : a.id,
        name: cf.n || a.name || a.id,
      };
    });
  },
  /* encje pokoju jak na dashboardzie: HGAreas (room_hide/assign) + HGL room:<id> (hidden/order/added); nie używać HGRoomCard.ents().
     Klucze bloków = HG_SEC[1] (jak w HGRoomCard.render) albo id encji / chips. */
  dashboardRoomEntities(h, areaId) {
    const aid = areaId === HGTvLogic.OTHER_ROOM ? '_none' : areaId;
    const okDom = (e) => this.TV_ROOM_DOMS.includes(e.slice(0, e.indexOf('.')));
    let a = null;
    try {
      if (typeof HGAreas !== 'undefined' && HGAreas.model) {
        const m = HGAreas.model(h, typeof HGAreas.glob === 'function' ? HGAreas.glob() : undefined);
        a = (m.byId && m.byId[aid]) || null;
      }
    } catch (e) { a = null; }
    if (!a || !a.sec) {
      const cat = this.catalog(h).rooms.find((r) => r.id === areaId);
      return cat ? cat.ents.map((x) => x.id).filter(okDom) : [];
    }
    const RL = (typeof HGL !== 'undefined' && HGL.get) ? HGL.get('room:' + aid) : { order: [], hidden: [], added: [] };
    const hid = new Set(RL.hidden || []);
    /* bez HG_SEC (testy): klucz = id sekcji; produkcja używa HG_SEC[1] jak zapis układu */
    const secs = (typeof HG_SEC !== 'undefined' && Array.isArray(HG_SEC))
      ? HG_SEC.map((x) => [x[0], x[1]])
      : ['light', 'clim', 'media', 'cover', 'sw', 'sens', 'mot', 'door', 'cam', 'rob', 'misc'].map((k) => [k, k]);
    const S = a.sec, blocks = [];
    const push = (sid, key, ents) => {
      const list = (ents || []).filter((e) => typeof e === 'string');
      if (!list.length) return;
      if (sid === 'clim' || sid === 'media' || sid === 'cam' || sid === 'rob') for (const e of list) blocks.push({ k: e, ents: [e] });
      else blocks.push({ k: key, ents: list });
    };
    for (const [sid, key] of secs) {
      if (sid === 'misc' || sid === 'mot' || sid === 'door') continue;
      push(sid, key, S[sid]);
    }
    const chips = [...(S.mot || []), ...(S.door || [])].filter((e) => typeof e === 'string');
    if (chips.length) blocks.push({ k: 'chips', ents: chips });
    for (const g of S.misc || []) {
      if (!g || typeof g !== 'object') continue;
      const ents = (g.ents || []).filter((e) => typeof e === 'string');
      if (ents.length) blocks.push({ k: g.d || ents[0], ents });
    }
    for (const x of RL.added || []) if (x && typeof x.e === 'string') blocks.push({ k: x.e, ents: [x.e] });
    const sort = (typeof HGL !== 'undefined' && HGL.sort) ? (items, key, order) => HGL.sort(items, key, order) : (items) => items;
    const visible = sort(blocks.filter((b) => !hid.has(b.k)), (b) => b.k, RL.order || []);
    const out = [], seen = new Set();
    for (const b of visible) for (const e of b.ents) {
      if (!okDom(e) || seen.has(e)) continue;
      seen.add(e); out.push(e);
    }
    return out;
  },
  /* katalog jak nuvio-tv buildLayout: obszar z rejestru encji/urządzenia; bez obszaru → __other__ (nie HGAreas._none, które pomija sensory) */
  catalog(h) {
    const st = h.states || {}, reg = h.entities || {}, dev = h.devices || {}, areasReg = h.areas || {};
    const coll = new Intl.Collator(HG_LOC());
    const nm = (e) => H.name(h, e, e);
    const sortIds = (ids) => ids.slice().sort((a, b) => coll.compare(nm(a), nm(b)));
    const ents = (pred) => sortIds(Object.keys(st).filter(pred)).map((id) => ({ id, name: nm(id) }));
    const cameras = ents((e) => e.startsWith('camera.'));
    const scenes = ents((e) => e.startsWith('scene.') || e.startsWith('script.'));
    const alarms = ents((e) => e.startsWith('alarm_control_panel.'));
    const buckets = new Map();
    for (const e of Object.keys(st)) {
      const dom = e.slice(0, e.indexOf('.'));
      if (!this.ROOM_DOMS.includes(dom)) continue;
      const r = reg[e];
      if (r && (r.hidden || r.entity_category)) continue;
      const deviceArea = r && r.device_id && dev[r.device_id] ? dev[r.device_id].area_id : null;
      const candidate = (r && r.area_id) || deviceArea || null;
      const areaId = candidate && areasReg[candidate] ? candidate : HGTvLogic.OTHER_ROOM;
      const list = buckets.get(areaId) || [];
      list.push(e);
      buckets.set(areaId, list);
    }
    const rooms = [];
    for (const a of Object.values(areasReg)) {
      const list = buckets.get(a.area_id);
      if (!list || !list.length) continue;
      rooms.push({ id: a.area_id, name: a.name, ents: sortIds(list).map((id) => ({ id, name: nm(id) })) });
    }
    const other = buckets.get(HGTvLogic.OTHER_ROOM);
    if (other && other.length) {
      rooms.push({
        id: HGTvLogic.OTHER_ROOM,
        name: hgT('tv.layout_unassigned'),
        ents: sortIds(other).map((id) => ({ id, name: nm(id) })),
      });
    }
    return { cameras, scenes, alarms, rooms };
  },
  /* wybór encji w checklistie pokoju: najpierw curacja dashboardu, potem reszta z katalogu HA */
  roomEntityChoices(h, roomId) {
    const nm = (e) => H.name(h, e, e);
    const dash = this.dashboardRoomEntities(h, roomId);
    const cat = this.catalog(h).rooms.find((r) => r.id === roomId);
    const seen = new Set(dash);
    const out = dash.map((id) => ({ id, name: nm(id) }));
    for (const e of (cat && cat.ents) || []) {
      if (seen.has(e.id)) continue;
      seen.add(e.id); out.push(e);
    }
    return out;
  },
  /* wiersz pokoju: nazwa + whitelist z dashboardu (gdy brak ręcznej listy) */
  roomDraftRow(h, id, entities) {
    const dash = this.dashboardRooms(h).find((r) => r.id === id);
    const ents = entities && entities.length ? entities.slice() : this.dashboardRoomEntities(h, id);
    const row = { id };
    if (dash && dash.name) row.name = dash.name;
    if (ents.length) row.entities = ents;
    return row;
  },
  /* brak zapisanego layoutu → kamery/sceny/alarmy z katalogu HA, pokoje = siatka dashboardu;
     zapisany → kamery/sceny/alarmy z dokumentu; pokoje: zachowaj whitelist encji dla id nadal na dashboardzie,
     zestaw i kolejność pokoi zawsze jak dashboard (ukryte na siatce znikają z TV). */
  seedDraft(h, parsed) {
    const cat = this.catalog(h);
    const dash = this.dashboardRooms(h);
    const prev = new Map((parsed && parsed.rooms || []).map((r) => [r.id, r]));
    const rooms = dash.map((r) => this.roomDraftRow(h, r.id, prev.get(r.id) && prev.get(r.id).entities));
    if (!parsed) {
      return {
        v: 1,
        cameras: cat.cameras.map((x) => x.id),
        rooms,
        scenes: cat.scenes.map((x) => x.id),
        alarms: cat.alarms.map((x) => x.id),
      };
    }
    return {
      v: 1,
      cameras: parsed.cameras.slice(),
      rooms,
      scenes: parsed.scenes.slice(),
      alarms: parsed.alarms.slice(),
    };
  },
  /* pełna synchronizacja pokoi z siatki dashboardu (set + kolejność + encje) */
  syncDraftFromDashboard(h) {
    const d = this.draft; if (!d) return;
    d.rooms = this.dashboardRooms(h).map((r) => this.roomDraftRow(h, r.id));
    this.layoutSaved = false;
  },
  /* po zapisie układu dashboardu: odśwież set/kolejność/encje pokoi w istniejącym nuvio_tv_layout */
  async pushDashboardRooms(h) {
    if (!h || !h.connection || window.__hgDryRun) return;
    let parsed;
    try {
      const r = await h.callWS({ type: 'frontend/get_user_data', key: HGTvLogic.LAYOUT_KEY });
      parsed = HGTvLogic.parseLayout(r && r.value);
    } catch (e) { return; }
    if (!parsed) return;
    const rooms = this.dashboardRooms(h).map((r) => this.roomDraftRow(h, r.id));
    const value = HGTvLogic.normLayout(Object.assign({}, parsed, { rooms }));
    try { await h.callWS({ type: 'frontend/set_user_data', key: HGTvLogic.LAYOUT_KEY, value }); } catch (e) { return; }
    if (this.draft) this.draft = this.seedDraft(h, value);
  },
  listHtml() {
    if (this.listErr) return `<small class="nf-err" role="alert">${hgT('tv.list_failed')}</small><button type="button" class="lk-mini tv-go" data-hge="tv-reload">${hgT('tv.retry')}</button>`;
    if (this.list === null) return `<small class="lk-hn">${hgT('common.loading')}</small>`;
    if (!this.list.length) return `<small class="lk-hn">${hgT('tv.list_empty')}</small>`;
    return `<div class="tv-l">${this.list.map((t) => `<div class="tv-r"><span><b>${H.esc(t.client_name)}</b><small>${hgT('tv.created', { when: this.fmt(t.created_at) })}</small>
      <small>${this.seen[t.id] ? hgT('tv.seen', { when: this.fmt(this.seen[t.id]) }) : hgT('tv.not_seen')}</small></span>
      <button type="button" class="tv-x" data-hge="tv-del" data-id="${H.esc(t.id)}" aria-label="${H.esc(hgT('tv.delete'))}">${H.icon('mdi:trash-can-outline')}</button></div>`).join('')}</div>`;
  },
  /* wiersz checklisty: przełącznik + opcjonalne strzałki kolejności kamer */
  layRow(label, on, act, id, extra) {
    return `<div class="tv-lr"><button type="button" class="tv-sw" role="switch" data-hge="${act}" data-id="${H.esc(id)}" aria-checked="${on}" aria-label="${H.esc(label)}"><i></i></button>
      <span class="tv-lt"><b>${H.esc(label)}</b></span>${extra || ''}</div>`;
  },
  layoutHtml(p) {
    if (this.layoutErr) return `<small class="nf-err" role="alert">${hgT('tv.layout_failed')}</small><button type="button" class="lk-mini tv-go" data-hge="tv-lreload">${hgT('tv.retry')}</button>`;
    if (this.draft === null) return `<small class="lk-hn">${hgT('common.loading')}</small>`;
    const cat = this.catalog(p._hass), d = this.draft;
    const camSet = new Set(d.cameras);
    const ordered = d.cameras.filter((id) => cat.cameras.some((c) => c.id === id))
      .concat(cat.cameras.map((c) => c.id).filter((id) => !camSet.has(id)));
    const camRows = ordered.map((id, i) => {
      const c = cat.cameras.find((x) => x.id === id); if (!c) return '';
      const on = camSet.has(id);
      const ord = on ? `<span class="tv-ord"><button type="button" class="tv-ob" data-hge="tv-cup" data-id="${H.esc(id)}" ${i ? '' : 'disabled'} aria-label="${H.esc(hgT('tv.layout_up'))}">${H.icon('mdi:chevron-up')}</button>
        <button type="button" class="tv-ob" data-hge="tv-cdn" data-id="${H.esc(id)}" ${i < d.cameras.length - 1 ? '' : 'disabled'} aria-label="${H.esc(hgT('tv.layout_down'))}">${H.icon('mdi:chevron-down')}</button></span>` : '';
      return this.layRow(c.name, on, 'tv-cam', id, ord);
    }).join('');
    const dashRooms = this.dashboardRooms(p._hass);
    const roomRows = dashRooms.map((r) => {
      const row = d.rooms.find((x) => x.id === r.id), on = !!row, op = this.openRoom === r.id;
      const entSet = row && row.entities ? new Set(row.entities) : null;
      const roomEnts = this.roomEntityChoices(p._hass, r.id);
      const head = `<div class="tv-lr"><button type="button" class="tv-sw" role="switch" data-hge="tv-room" data-id="${H.esc(r.id)}" aria-checked="${on}" aria-label="${H.esc(r.name)}"><i></i></button>
        <button type="button" class="tv-rop" data-hge="tv-rop" data-id="${H.esc(r.id)}" aria-expanded="${op}"><b>${H.esc(r.name)}</b><small>${hgT('tv.layout_ents', { count: roomEnts.length })}</small></button></div>`;
      if (!op || !on) return head;
      const ents = roomEnts.map((e) => {
        const eOn = !entSet || entSet.has(e.id);
        return this.layRow(e.name, eOn, 'tv-rent', e.id, '').replace('data-hge="tv-rent"', `data-hge="tv-rent" data-r="${H.esc(r.id)}"`);
      }).join('');
      return head + `<div class="tv-re">${ents}<small class="lk-hn">${hgT('tv.layout_ents_hint')}</small></div>`;
    }).join('');
    const sceneRows = cat.scenes.map((x) => this.layRow(x.name, d.scenes.includes(x.id), 'tv-sc', x.id)).join('');
    const alarmRows = cat.alarms.map((x) => this.layRow(x.name, d.alarms.includes(x.id), 'tv-al', x.id)).join('');
    const empty = (rows, msg) => rows || `<small class="lk-hn">${msg}</small>`;
    return `<div class="tv-lay">
      <h5>${H.icon('mdi:cctv')}${hgT('tv.layout_cameras')}</h5>${empty(camRows, hgT('tv.layout_no_cameras'))}
      <h5>${H.icon('mdi:floor-plan')}${hgT('tv.layout_rooms')}</h5>${empty(roomRows, hgT('tv.layout_no_rooms'))}
      <h5>${H.icon('mdi:palette')}${hgT('tv.layout_scenes')}</h5>${empty(sceneRows, hgT('tv.layout_no_scenes'))}
      <h5>${H.icon('mdi:shield-home')}${hgT('tv.layout_alarms')}</h5>${empty(alarmRows, hgT('tv.layout_no_alarms'))}
      <div class="tv-lact">
        <button type="button" class="lk-mini tv-go" data-hge="tv-lsync" ${this.layoutSaving ? 'disabled' : ''}>${hgT('tv.layout_sync')}</button>
        <button type="button" class="lk-mini tv-go" data-hge="tv-lsave" ${this.layoutSaving ? 'disabled' : ''}>${hgT('tv.layout_save')}</button>
      </div>
      ${this.layoutSaved ? `<small class="tv-lok" role="status">${hgT('tv.layout_saved')}</small>` : ''}
    </div>`;
  },
  html(p) {
    if (this._sheet !== p._eSheetEl) { this._sheet = p._eSheetEl; this.discard(p, 'idle'); if (!this.working()) { this.status = 'idle'; this.err = {}; } this.invalidate(); this.listErr = false; this.layoutInvalidate(); }
    if (!this.s.ha) this.s.ha = location.origin;
    if (this.list === null && !this.listErr) this.prep(p);
    if (this.draft === null && !this.layoutErr) this.prepLayout(p);
    const dis = this.working() ? ' disabled' : '';
    const fld = (k, label, hint, ph, extra) => hgForm.field(label, hgForm.text({ value: this.s[k], ph, a: `name="tv-${k}" aria-label="${H.esc(label)}" ${extra}${dis}` }), { hint })
      + (this.errText(k) ? `<small class="nf-err" role="alert">${this.errText(k)}</small>` : '');
    return `<section class="lk-g tv" data-tab="tv" data-pg="tv" aria-labelledby="tv-h"><style>${HG_TV_CSS}</style>
      <h4 id="tv-h">${H.icon('mdi:television')}${hgT('tv.title')}<b class="tv-beta">${hgT('tv.beta')}</b></h4>
      <small class="lk-hn">${hgT('tv.intro')}</small>
      ${fld('addr', hgT('tv.address'), hgT('tv.address_hint'), '10.0.8.117:8798', 'inputmode="url" autocapitalize="off" spellcheck="false"')}
      ${fld('code', hgT('tv.code'), hgT('tv.code_hint'), '123456', 'inputmode="numeric" maxlength="6" pattern="[0-9]*"')}
      ${fld('ha', hgT('tv.ha'), hgT('tv.ha_hint'), 'https://', 'inputmode="url" autocapitalize="off" spellcheck="false"')}
      <small class="lk-hn">${hgT('tv.plain_note')}</small>
      <button type="button" class="lk-mini tv-go" data-hge="tv-pair" ${this.working() ? 'disabled' : ''}>${hgT('tv.pair')}</button>
      <div class="tv-st" role="status" aria-live="polite">${this.statusText()}</div>
      ${this.status === 'ready' ? `<button type="button" class="lk-mini tv-go" data-hge="tv-send">${hgT('tv.send_open')}</button>` : ''}
      <h4 class="tv-lh">${H.icon('mdi:television-classic')}${hgT('tv.list_title')}</h4>
      ${this.listHtml()}
      <h4 class="tv-lh">${H.icon('mdi:view-dashboard-edit-outline')}${hgT('tv.layout_title')}</h4>
      <small class="lk-hn">${hgT('tv.layout_intro')}</small>
      ${this.layoutHtml(p)}
    </section>`;
  },
  /* wartości pól z DOM do obiektu; wklejony link z QR rozdziela się na adres i kod */
  sync(p) {
    const S = p._eSheetEl;
    if (S) for (const [n, k] of this.FIELDS) { const i = S.querySelector('[name=' + n + ']'); if (i) this.s[k] = i.value; }
    const l = HGTvLogic.parseLink(this.s.addr); if (l) { this.s.addr = l.addr; this.s.code = l.code; }
  },
  wire(p, S) {
    for (const [n, k] of this.FIELDS) {
      const i = S.querySelector('[name=' + n + ']'); if (!i) continue;
      i.addEventListener('input', () => {
        this.s[k] = i.value;
        const l = k === 'addr' ? HGTvLogic.parseLink(i.value) : null; if (!l) return;
        const c = S.querySelector('[name=tv-code]'); i.value = this.s.addr = l.addr; this.s.code = l.code; if (c) c.value = l.code;
      });
      i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.pair(p); } });
    }
  },
  /* pusta karta o stałej nazwie, otwierana synchronicznie w kliknięciu; null gdy zablokowana. Do karty nic nie piszemy (żadnego w.document), a w.opener zerujemy:
     bez noopener, bo formularz musi trafić w nazwane okno. Karta pokazuje wyłącznie stronę telewizora, więc ryzyko jest akceptowalne. */
  openTab() {
    let w = null; try { w = window.open('', this.WIN); } catch (e) { w = null; }
    if (w) { try { w.opener = null; } catch (e) { /* okno z innego źródła, opener i tak niedostępny */ } }
    return w || null;
  },
  /* zamyka kartę tylko gdy mamy uchwyt i nie jest już zamknięta (użytkownik mógł ją zamknąć sam) */
  shut(w) { try { if (w && !w.closed) w.close(); } catch (e) { /* nic do zrobienia */ } },
  /* ukryty formularz w pamięci: POST, potem usunięty; token nigdzie indziej nie trafia.
     target to nazwa karty z openTab (bez rel, bo noopener zerwałby nazwane okno) albo _blank w drugim kliknięciu (wtedy rel=noopener).
     action tylko z pairUrl (host:port już sprawdzone; schemat i ścieżka odrzucone). */
  send(A, code, ha, token, target) {
    const url = HGTvLogic.pairUrl(A); if (!url) throw new Error('bad addr');
    const f = document.createElement('form');
    f.setAttribute('action', url); f.setAttribute('method', 'post'); f.setAttribute('target', target); if (target === '_blank') f.setAttribute('rel', 'noopener'); f.hidden = true;
    for (const [n, v] of [['code', code], ['url', ha], ['token', token]]) { const i = document.createElement('input'); i.setAttribute('type', 'hidden'); i.setAttribute('name', n); i.setAttribute('value', v); f.appendChild(i); }
    document.body.appendChild(f);
    try { f.submit(); } finally { f.remove(); }
  },
  async drop(h, id) { try { await h.callWS({ type: 'auth/delete_refresh_token', refresh_token_id: id }); } catch (e) { /* niewykorzystany token zostanie na liście, można go usunąć ręcznie */ } },
  fail(p, status) { this.status = status; this.invalidate(); this.redraw(p); },
  /* niewysłany token z this.ready znika z pamięci i z HA; status ustawia wołający */
  discard(p, status) {
    const r = this.ready; if (!r) return;
    this.ready = null; r.token = null; this.status = status; this.drop(p._hass, r.id);
  },
  /* jawna zgoda na wysyłkę tokenu po http:// do TV (sieć domowa, bez szyfrowania); anulowanie nie tworzy tokenu */
  async consentPlain() {
    return !!(await hgOverlay.alert(hgT('tv.plain_title'), hgT('tv.plain_text'), hgT('tv.plain_ok')));
  },
  async pair(p) {
    if (this.working()) return;
    this.sync(p);
    const s = this.s, A = HGTvLogic.parseAddr(s.addr), ha = HGTvLogic.haUrl(s.ha), code = s.code.trim(), E = {};
    if (!A || !HGTvLogic.pairUrl(A)) E.addr = 'bad'; else if (!HGTvLogic.isPrivateHost(A.host)) E.addr = 'private';
    if (!HGTvLogic.validCode(code)) E.code = 'bad';
    if (!ha) E.ha = 'bad';
    this.err = E; this.status = 'idle';
    if (Object.keys(E).length || window.__hgDryRun) return p._eLook();
    /* openTab synchronicznie przed zgodą i await, żeby zachować gest; przy anulowaniu zamykamy pustą kartę */
    const direct = HGTvLogic.direct(location.protocol), w = direct ? null : this.openTab();
    if (!(await this.consentPlain())) { this.shut(w); return undefined; }
    const h = p._hass; this.status = 'working'; p._eLook();
    let token = null, id = null, name = '';
    try {
      name = HGTvLogic.freeName(HGTvLogic.longNames(await h.callWS({ type: 'auth/refresh_tokens' })), this.now());
      token = await h.callWS({ type: 'auth/long_lived_access_token', client_name: name, lifespan: HGTvLogic.LIFESPAN });
    } catch (e) { this.shut(w); return this.fail(p, 'err_create'); }
    try { id = HGTvLogic.tokenId(token) || HGTvLogic.idByName(await h.callWS({ type: 'auth/refresh_tokens' }), name); } catch (e) { id = null; }
    if (!id) { token = null; this.shut(w); return this.fail(p, 'err_id'); }
    if (direct) return this.sendDirect(p, A, code, ha, token, id);
    if (!w) {
      this.ready = { A, code, ha, token, id }; token = null; this.status = 'ready'; p._eLook();
      this.hold(p, this.ready).catch(() => undefined);
      return undefined;
    }
    try { this.send(A, code, ha, token, this.WIN); } catch (e) { token = null; this.shut(w); await this.drop(h, id); return this.fail(p, 'err_send'); }
    token = null; this.wait = this.waitMs(ha); this.status = 'waiting'; p._eLook();
    return this.poll(p, id, w);
  },
  /* strona przez http: POST fetch prosto do telewizora, bez karty i bez formularza; token jest wyłącznie w treści żądania.
     Telewizor odpowiada z nagłówkiem CORS: 200 przyjęto, 403 zły kod, 429 za dużo prób, reszta odrzucono (w trzech ostatnich token kasujemy).
     Wyjątek (TypeError, przerwanie po FETCH_MS) to wynik nieznany: żądanie mogło dotrzeć (stara aplikacja bez nagłówka CORS), więc czekamy na znacznik jak przy karcie */
  async post(A, code, ha, token) {
    const url = HGTvLogic.pairUrl(A); if (!url) return 'rejected';
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), this.FETCH_MS);
    try {
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, url: ha, token }).toString(),
        mode: 'cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl.signal,
      });
      return HGTvLogic.outcome(r.status);
    } catch (e) { return 'unknown'; } finally { clearTimeout(t); }
  },
  async sendDirect(p, A, code, ha, token, id) {
    const out = await this.post(A, code, ha, token); token = null;
    if (out === 'wrong' || out === 'limit' || out === 'rejected') { await this.drop(p._hass, id); return this.fail(p, 'err_' + out); }
    this.wait = this.waitMs(ha); this.status = out === 'ok' ? 'accepted' : 'waiting'; p._eLook();
    return this.poll(p, id, null);
  },
  /* drugie kliknięcie po zablokowanej karcie: formularz wychodzi synchronicznie w tym kliknięciu (świeży gest), przed jakimkolwiek await */
  sendReady(p) {
    const r = this.ready; if (!r) return undefined;
    this.ready = null;
    try { this.send(r.A, r.code, r.ha, r.token, '_blank'); } catch (e) { r.token = null; this.drop(p._hass, r.id); return this.fail(p, 'err_send'); }
    r.token = null; this.wait = this.waitMs(r.ha); this.status = 'waiting'; p._eLook();
    return this.poll(p, r.id, null);
  },
  /* trzyma niewysłany token najwyżej 2 minuty; zamknięcie panelu albo koniec czasu kasuje go także w HA, wysłanie (this.ready zmienione) kończy pętlę */
  async hold(p, r) {
    const c = this.clock, t0 = c.now();
    while (this.ready === r && c.now() - t0 < this.HOLD_MS) {
      await c.sleep(1000);
      if (this.ready === r && !p._eSheetEl) return this.discard(p, 'idle');
    }
    if (this.ready !== r) return undefined;
    this.discard(p, 'expired'); this.invalidate(); return this.redraw(p);
  },
  waitMs(ha) { return HGTvLogic.needsConfirm(ha) ? this.WAIT_HTTP_MS : this.WAIT_MS; },
  /* co POLL_MS do limitu this.wait (60 s, przy http spoza sieci prywatnej 120 s; ustawia go wołający przed pokazaniem statusu) czeka na wpis id tokenu w nuvio_tv_seen;
     potwierdzenie zamyka kartę w, jeśli ją mamy; zamknięcie panelu przerywa (token zostaje na liście, karta otwarta), brak wpisu usuwa token (karta zostaje, użytkownik czyta stronę błędu telewizora) */
  async poll(p, id, w) {
    const h = p._hass, c = this.clock, t0 = c.now(), limit = this.wait, quit = () => { this.status = 'idle'; };
    while (c.now() - t0 < limit) {
      await c.sleep(this.POLL_MS);
      if (!p._eSheetEl) return quit();
      try { this.seen = HGTvLogic.parseSeen((await h.callWS({ type: 'frontend/get_user_data', key: HGTvLogic.SEEN_KEY })).value); } catch (e) { continue; }
      if (this.seen[id]) { this.shut(w); this.status = 'done'; this.invalidate(); return this.redraw(p); }
    }
    if (!p._eSheetEl) return quit();
    await this.drop(h, id);
    return this.fail(p, 'timeout');
  },
  async del(p, id) {
    if (!(this.list || []).some((x) => x.id === id)) return;
    const t = this.list.find((x) => x.id === id);
    if (!(await hgOverlay.alert(hgT('tv.delete_title', { name: t.client_name }), hgT('tv.delete_text'), hgT('tv.delete')))) return;
    try { if (!window.__hgDryRun) await p._hass.callWS({ type: 'auth/delete_refresh_token', refresh_token_id: id }); p._eToast(hgT('tv.deleted')); } catch (e) { p._eToast(hgT('tv.delete_failed')); }
    this.invalidate(); return p._eLook();
  },
  /* przełącznik na liście stringów w draft */
  togList(key, id) {
    const d = this.draft; if (!d) return;
    const i = d[key].indexOf(id);
    if (i >= 0) d[key].splice(i, 1); else d[key].push(id);
    this.layoutSaved = false;
  },
  togRoom(p, id) {
    const d = this.draft; if (!d) return;
    const i = d.rooms.findIndex((r) => r.id === id);
    if (i >= 0) { d.rooms.splice(i, 1); if (this.openRoom === id) this.openRoom = null; }
    else d.rooms.push({ id });
    this.layoutSaved = false; return p._eLook();
  },
  togRoomEnt(p, roomId, entId) {
    const d = this.draft; if (!d) return;
    const row = d.rooms.find((r) => r.id === roomId); if (!row) return;
    const all = this.roomEntityChoices(p._hass, roomId).map((e) => e.id);
    let set = new Set(row.entities || all);
    if (set.has(entId)) set.delete(entId); else set.add(entId);
    const next = all.filter((e) => set.has(e));
    if (!next.length) { d.rooms = d.rooms.filter((r) => r.id !== roomId); this.openRoom = null; }
    else if (next.length === all.length) row.entities = this.dashboardRoomEntities(p._hass, roomId);
    else row.entities = next;
    this.layoutSaved = false; return p._eLook();
  },
  moveCam(p, id, dir) {
    const d = this.draft; if (!d) return;
    const i = d.cameras.indexOf(id); if (i < 0) return;
    const j = i + dir; if (j < 0 || j >= d.cameras.length) return;
    const t = d.cameras[i]; d.cameras[i] = d.cameras[j]; d.cameras[j] = t;
    this.layoutSaved = false; return p._eLook();
  },
  async saveLayout(p) {
    if (!this.draft || this.layoutSaving) return;
    const value = HGTvLogic.normLayout(this.draft);
    this.layoutSaving = true; this.layoutSaved = false; p._eLook();
    try {
      if (!window.__hgDryRun) await p._hass.callWS({ type: 'frontend/set_user_data', key: HGTvLogic.LAYOUT_KEY, value });
      this.draft = this.seedDraft(p._hass, value);
      this.layoutSaved = true;
      p._eToast(hgT('tv.layout_saved'));
    } catch (e) { p._eToast(hgT('tv.layout_save_failed')); }
    this.layoutSaving = false; return p._eLook();
  },
  async syncLayoutFromDashboard(p) {
    if (!this.draft || this.layoutSaving) return;
    this.syncDraftFromDashboard(p._hass);
    return this.saveLayout(p);
  },
  act(p, b, a) {
    switch (a) {
      case 'tv-pair': return this.pair(p);
      case 'tv-send': return this.sendReady(p);
      case 'tv-del': return this.del(p, b.dataset.id);
      case 'tv-reload': this.invalidate(); this.listErr = false; return p._eLook();
      case 'tv-lreload': this.layoutInvalidate(); return p._eLook();
      case 'tv-lsync': return this.syncLayoutFromDashboard(p);
      case 'tv-lsave': return this.saveLayout(p);
      case 'tv-cam': this.togList('cameras', b.dataset.id); return p._eLook();
      case 'tv-sc': this.togList('scenes', b.dataset.id); return p._eLook();
      case 'tv-al': this.togList('alarms', b.dataset.id); return p._eLook();
      case 'tv-room': return this.togRoom(p, b.dataset.id);
      case 'tv-rop': this.openRoom = this.openRoom === b.dataset.id ? null : b.dataset.id; return p._eLook();
      case 'tv-rent': return this.togRoomEnt(p, b.dataset.r, b.dataset.id);
      case 'tv-cup': return this.moveCam(p, b.dataset.id, -1);
      case 'tv-cdn': return this.moveCam(p, b.dataset.id, 1);
      default: return undefined;
    }
  },
});
const HG_TV_CSS = `
.lk-mini.tv-go{ height:var(--hg-btn-touch); padding:0 22px; align-self:flex-start; }
.tv-st{ min-height:20px; font-size:var(--hg-fs-2); line-height:1.4; display:flex; gap:6px; align-items:flex-start; } .tv-st ha-icon{ --mdc-icon-size:18px; width:18px; height:18px; flex:none; color:var(--hg-accent-tx, var(--hg-accent)); }
.tv-beta{ flex:none; margin-left:8px; padding:2px 8px; border-radius:var(--hg-radius-pill); font-size:var(--hg-fs-1); font-weight:700; letter-spacing:.08em; background:color-mix(in srgb, var(--hg-accent) 18%, transparent); color:var(--hg-accent-tx, var(--hg-accent)); vertical-align:middle; }
.tv-lh{ margin-top:8px; }
.tv-l{ display:flex; flex-direction:column; gap:6px; }
.tv-r{ display:flex; align-items:center; gap:8px; padding:8px 4px 8px 12px; border-radius:var(--hg-radius-in); background:color-mix(in srgb, var(--hg-accent) 8%, transparent); }
.tv-r > span{ flex:1; min-width:0; } .tv-r b{ display:block; overflow-wrap:anywhere; font-weight:600; } .tv-r small{ display:block; opacity:.65; font-size:var(--hg-fs-1); }
.tv-x{ all:unset; cursor:pointer; flex:none; width:var(--hg-btn-touch); height:var(--hg-btn-touch); display:grid; place-items:center; border-radius:var(--hg-radius-pill); } .tv-x:hover{ background:color-mix(in srgb, var(--hg-accent) 14%, transparent); }
.tv-x:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; } .tv-x ha-icon{ --mdc-icon-size:20px; width:20px; height:20px; }
.tv-lay{ display:flex; flex-direction:column; gap:4px; } .tv-lay h5{ display:flex; align-items:center; gap:6px; margin:12px 0 4px; font-size:var(--hg-fs-2); font-weight:600; } .tv-lay h5 ha-icon{ --mdc-icon-size:18px; width:18px; height:18px; }
.tv-lr{ display:flex; align-items:center; gap:8px; min-height:var(--hg-btn-touch); padding:2px 0; }
.tv-lt{ flex:1; min-width:0; } .tv-lt b{ font-weight:500; overflow-wrap:anywhere; }
.tv-rop{ all:unset; cursor:pointer; flex:1; min-width:0; } .tv-rop b{ display:block; font-weight:600; } .tv-rop small{ display:block; opacity:.65; font-size:var(--hg-fs-1); }
.tv-re{ margin:0 0 4px 40px; display:flex; flex-direction:column; gap:2px; }
.tv-sw{ all:unset; cursor:pointer; flex:none; width:44px; height:26px; border-radius:999px; background:rgba(120,120,128,.30); position:relative; } .tv-sw[aria-checked=true]{ background:var(--hg-accent, #63D71E); }
.tv-sw i{ position:absolute; top:2px; left:2px; width:22px; height:22px; border-radius:50%; background:#fff; transition:transform .2s; } .tv-sw[aria-checked=true] i{ transform:translateX(18px); }
.tv-sw:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.tv-ord{ display:flex; flex:none; gap:2px; } .tv-ob{ all:unset; cursor:pointer; width:36px; height:36px; display:grid; place-items:center; border-radius:var(--hg-radius-pill); } .tv-ob:hover{ background:color-mix(in srgb, var(--hg-accent) 14%, transparent); } .tv-ob:disabled{ opacity:.35; cursor:default; } .tv-ob ha-icon{ --mdc-icon-size:20px; width:20px; height:20px; }
.tv-lok{ color:var(--hg-accent-tx, var(--hg-accent)); font-size:var(--hg-fs-1); }
.tv-lact{ display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
`;
window.HGTv = HGTv;
