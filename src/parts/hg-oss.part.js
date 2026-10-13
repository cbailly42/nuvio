/* ===== home-glass (wersja dystrybucyjna): baza zasobów, ścieżki, i18n, strategia pulpitu, kreator pierwszego uruchomienia ===== */
const HG_ASSET = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return s.replace(/[^/]*(\?.*)?$/, ''); } catch (e) { /* brak */ }
  const r = [...document.querySelectorAll('script[src*="home-glass"]')].map((x) => x.src)[0]; return r ? r.replace(/[^/]*(\?.*)?$/, '') : '/hacsfiles/home-glass/'; })();
window.__hgNoVer = true;   /* wersję pilnuje HACS (hacstag) – bez własnego komunikatu o nowej wersji */
const HG_DASH = () => (location.pathname.split('/')[1] || 'home-glass');
const HG_P = (v) => `/${HG_DASH()}/${v}`;
/* domyślne tło: zdjęcie CC0 dostarczane z pakietem (assets/bg, CREDITS.md); gdy się nie wczyta – gradient */
const HG_DEFAULT_BG_FB = window.HG_DEFAULT_BG_FB = { kind: 'gradient', v: '#' + '2E4257', v2: '#' + '0C1117' };
/* 10 teł do wyboru (CC0, assets/backgrounds/CREDITS.md); pierwsze = domyślne. Miniatury ~5 KB, pełne zdjęcia wczytywane dopiero po wyborze */
const HG_BG_SET = window.HG_BG_SET = window.HG_BG_SET || [['dom-w-lesie', 'Dom w lesie'], ['domek-nad-woda', 'Domek nad wodą'], ['gwiazdzista-noc', 'Gwiaździsta noc'], ['zachod-slonca', 'Zachód słońca'], ['las-o-zmierzchu', 'Las o zmierzchu'],
  ['jasny-salon', 'Jasny salon'], ['drewniane-wnetrze', 'Drewniane wnętrze'], ['kuchnia', 'Kuchnia'], ['mglisty-las', 'Mglisty las'], ['nad-mgla', 'Nad mgłą']]
  .map(([id, l], i) => { const b = HG_ASSET + 'assets/backgrounds/' + id; return i ? [b + '-wide.webp', l, b + '-portrait.webp', b + '-thumb.webp'] : ['', l, '', b + '-thumb.webp']; });
const HG_DEFAULT_BG = window.HG_DEFAULT_BG = window.HG_DEFAULT_BG || { kind: 'image', v: HG_ASSET + 'assets/bg/default-wide.webp', v2p: HG_ASSET + 'assets/bg/default-portrait.webp' };

const HG_I18N = {
  pl: { panel: 'Panel', rooms: 'Pokoje', room: 'Pokój', media: 'Multimedia', cams: 'Kamery', family: 'Rodzina', energy: 'Energia', settings: 'Ustawienia', profile: 'Profil',
    hello: 'Witaj, {name}!', hello_sub: 'Steruj domem w jednym miejscu', rooms_sub: 'Każdy pokój w zasięgu ręki', media_sub: 'Co gra w domu', cams_sub: 'Podgląd na żywo po dotknięciu',
    family_sub: 'Kto jest teraz w domu', energy_sub: 'Moc na żywo', scenes: 'Sceny', power: 'Moc teraz', outside: 'Na zewnątrz', more: 'Więcej', home: 'Dom', climate: 'Klimatyzacja',
    wiz_t: 'Witaj w home-glass', wiz_s: 'Zbudujemy pulpit z Twoich obszarów, urządzeń i encji. Wszystko zmienisz później w trybie edycji.', wiz_lang: 'Język', wiz_views: 'Widoki', wiz_rooms: 'Pokoje',
    wiz_go: 'Utwórz pulpit', wiz_skip: 'Pomiń', wiz_none: 'Nie znaleziono obszarów – pokoje dodasz w Ustawieniach HA → Obszary.', ents: 'encji',
    hub: 'Domownicy', hub_sub: 'Kto jest teraz w domu' },
  en: { panel: 'Home', rooms: 'Rooms', room: 'Room', media: 'Media', cams: 'Cameras', family: 'Family', energy: 'Energy', settings: 'Settings', profile: 'Profile',
    hello: 'Welcome, {name}!', hello_sub: 'Your whole home in one place', rooms_sub: 'Every room at your fingertips', media_sub: 'What is playing', cams_sub: 'Tap for live view',
    family_sub: 'Who is home right now', energy_sub: 'Live power', scenes: 'Scenes', power: 'Power now', outside: 'Outside', more: 'More', home: 'Home', climate: 'Climate',
    wiz_t: 'Welcome to home-glass', wiz_s: 'We will build a dashboard from your areas, devices and entities. You can change everything later in edit mode.', wiz_lang: 'Language', wiz_views: 'Views', wiz_rooms: 'Rooms',
    wiz_go: 'Create dashboard', wiz_skip: 'Skip', wiz_none: 'No areas found – add rooms in HA Settings → Areas.', ents: 'entities',
    hub: 'Household', hub_sub: 'Who is home right now' },
};
const hgLang = (h, pref) => { const l = pref || (h && ((h.locale && h.locale.language) || h.language)) || navigator.language || 'en'; return /^pl/i.test(l) ? 'pl' : 'en'; };
const hgI = (lang, k) => (HG_I18N[lang] || HG_I18N.en)[k] || HG_I18N.en[k] || k;

/* --- model domu z rejestrów HA (bez żadnych encji „na sztywno”) --- */
const HGModel = {
  async load(hass) {
    let areas = hass.areas, devices = hass.devices, ents = hass.entities;
    try { if (!areas || !Object.keys(areas).length) { const a = await hass.callWS({ type: 'config/area_registry/list' }); areas = Object.fromEntries(a.map((x) => [x.area_id, x])); } } catch (e) { areas = areas || {}; }
    try { if (!ents || !Object.keys(ents).length) { const a = await hass.callWS({ type: 'config/entity_registry/list_for_display' }); ents = Object.fromEntries((a.entities || []).map((x) => [x.ei, { entity_id: x.ei, area_id: x.ai, device_id: x.di, hidden: !!x.hb, entity_category: x.ec != null ? x.ec : null }])); } } catch (e) { ents = ents || {}; }
    devices = devices || {};
    const ok = (e) => { const s = hass.states[e]; const r = ents[e]; return s && s.state !== 'unavailable' && !(r && (r.hidden || r.entity_category)); };
    const all = Object.keys(hass.states).filter(ok), dom = (d) => all.filter((e) => e.startsWith(d + '.'));
    const num = (e) => isFinite(Number(hass.states[e].state));
    const power = dom('sensor').filter((e) => { const a = hass.states[e].attributes; return a.device_class === 'power' && num(e) && /^(k?W)$/.test(a.unit_of_measurement || ''); })
      .sort((a, b) => Math.abs(Number(hass.states[b].state)) - Math.abs(Number(hass.states[a].state)));
    const areaOf = (e) => { const r = ents[e]; return r && (r.area_id || (r.device_id && devices[r.device_id] && devices[r.device_id].area_id)) || null; };
    const roomCount = {}; for (const e of all) { const a = areaOf(e); if (a) roomCount[a] = (roomCount[a] || 0) + 1; }
    return { areas, devices, ents, all, roomCount, weather: dom('weather')[0] || null, climate: dom('climate'), media: dom('media_player'), cams: dom('camera'), persons: dom('person'),
      scenes: [...dom('scene'), ...dom('script')].slice(0, 6), power, vacuums: dom('vacuum'), alarm: dom('alarm_control_panel')[0] || null, sun: hass.states['sun.sun'] ? 'sun.sun' : null };
  },
};

/* --- generator konfiguracji (strategia pulpitu) --- */
async function hgGenerate(hass, opt) {
  opt = opt || {}; let wiz = opt._wiz || null;   /* _wiz: tylko testy */
  if (!wiz) try { const r = await hass.callWS({ type: 'frontend/get_user_data', key: 'home_glass_layout' }); wiz = r && r.value && r.value.wiz; } catch (e) { /* brak */ }
  const lang = hgLang(hass, (wiz && wiz.lang) || opt.language), t = (k) => hgI(lang, k), M = await HGModel.load(hass);
  const want = (v) => !wiz || !wiz.views || wiz.views.includes(v);
  const V = [['dashboard', t('panel'), 'mdi:view-dashboard-outline', true], ['rooms', t('rooms'), 'mdi:sofa-outline', Object.keys(M.areas).length > 0],
    ['multimedia', t('media'), 'mdi:play-box-multiple-outline', M.media.length > 0], ['kamery', t('cams'), 'mdi:cctv', M.cams.length > 0],
    ['family', t('family'), 'mdi:account-group-outline', M.persons.length > 0], ['energia', t('energy'), 'mdi:lightning-bolt-outline', M.power.length > 0]]
    /* jawna lista z kreatora / Wyglądu: kolejność wg listy, widok włączony nawet bez encji; bez listy – tylko dostępne */
    .filter((x) => (wiz && wiz.views ? x[0] === 'dashboard' || wiz.views.includes(x[0]) : x[3])).sort((a, b) => (wiz && wiz.views ? (a[0] === 'dashboard' ? -1 : b[0] === 'dashboard' ? 1 : wiz.views.indexOf(a[0]) - wiz.views.indexOf(b[0])) : 0));
  const nav = (v) => ({ icon: v[2], label: v[1], action: { navigate: HG_P(v[0]) }, match: v[0] === 'rooms' ? [HG_P('rooms'), HG_P('pokoj')] : HG_P(v[0]) });
  const tabs = V.slice(0, 5).map((v) => ({ label: v[1], icon: v[2], path: HG_P(v[0]), ...(v[0] === 'rooms' ? { match: [HG_P('rooms'), HG_P('pokoj')] } : {}) }));
  const set = { icon: 'mdi:cog-outline', label: t('settings'), action: { navigate: '/config' }, match: '/config' };
  const rail = [...V.map(nav), set], phone = { main: V.slice(0, 4).map(nav), more: [...V.slice(4).map(nav), set] };
  const areasCfg = { hide: (wiz && wiz.hiddenRooms) || [] };
  const weather = M.weather ? { entity: M.weather, sun: M.sun, hours: 24, variant: 'hero', title: t('outside') } : null;
  const brand = (hass.config && hass.config.location_name) || t('home');
  const base = (view, title, sub, cards, panel, extra) => ({ type: 'custom:hg-page', view, brand, title, subtitle: sub, user: {}, tabs, rail, phone_nav: phone, rail_overflow: V.slice(5).map((v) => v[1]),
    menu: [{ label: t('profile'), icon: 'mdi:account-circle-outline', action: { navigate: '/profile' } }, { label: t('settings'), icon: 'mdi:cog-outline', action: { navigate: '/config/dashboard' } }],
    hub: M.persons.length ? { title: t('hub'), subtitle: t('hub_sub'), persons: M.persons.slice(0, 6), ...(want('family') ? { plus: { navigate: HG_P('family') } } : {}) } : null,
    back: { back: true, fallback: HG_P('dashboard') }, panel, cards, panel_backdrop: true, background: {}, _hgAuto: true, _hgLang: lang, ...(extra || {}) });
  const scroll = { scroll: true, columns: '1fr 1fr', auto_rows: 'auto', phone_columns: '1fr', tablet: { columns: '1fr 1fr' } };
  const one = (a) => ({ wide: true, scroll: true, columns: '1fr', auto_rows: 'auto', areas: `"${a}"`, phone_areas: `"${a}"`, phone_columns: '1fr', tablet: { columns: '1fr' } });
  const dash = [];
  if (M.climate[0]) dash.push({ type: 'custom:hg-ac-card', entity: M.climate[0], title: t('climate'), min_h: 253 });
  if (M.scenes.length) dash.push({ type: 'custom:hg-scenes-card', title: t('scenes'), min_h: 0, scripts: M.scenes.map((e) => ({ entity: e, name: (hass.states[e].attributes.friendly_name || e), icon: hass.states[e].attributes.icon || (e.startsWith('scene.') ? 'mdi:palette' : 'mdi:play') })) });
  if (M.power.length) dash.push({ type: 'custom:hg-power-card', title: t('power'), min_h: 130, entities: [M.power[0]], max_power: 10000, hours: 6, ...(want('energia') ? { expand: { navigate: HG_P('energia') } } : {}) });
  const views = [];
  const view = (path, title, card, sub) => ({ title, path, type: 'panel', ...(sub ? { subview: true } : {}), cards: [card] });
  views.push(view('dashboard', t('panel'), base('dashboard', t('hello'), t('hello_sub'), dash, scroll, weather ? { weather } : {})));
  if (V.some((v) => v[0] === 'rooms')) {
    views.push(view('rooms', t('rooms'), base('rooms', t('rooms'), t('rooms_sub'), [{ type: 'custom:hg-areas-card', area: 'grid', min_h: 200, room_path: HG_P('pokoj'), areas: areasCfg }], one('grid'))));
    views.push(view('pokoj', t('room'), base('pokoj', t('room'), '', [{ type: 'custom:hg-room-card', area: 'room', min_h: 200, areas: areasCfg }], one('room'), { room_back: HG_P('rooms') }), true));
  }
  if (V.some((v) => v[0] === 'multimedia')) views.push(view('multimedia', t('media'), base('multimedia', t('media'), t('media_sub'), [{ type: 'custom:hg-players-card', area: 'm', entities: M.media }], one('m'))));
  if (V.some((v) => v[0] === 'kamery')) views.push(view('kamery', t('cams'), base('kamery', t('cams'), t('cams_sub'), [{ type: 'custom:hg-cameras-card', area: 'c', entities: M.cams }], one('c'))));
  if (V.some((v) => v[0] === 'family')) views.push(view('family', t('family'), base('family', t('family'), t('family_sub'), M.persons.map((p) => ({ type: 'custom:hg-person-card', entity: p })), scroll)));
  if (V.some((v) => v[0] === 'energia')) views.push(view('energia', t('energy'), base('energia', t('energy'), t('energy_sub'), M.power.slice(0, 4).map((e) => ({ type: 'custom:hg-power-card', title: hass.states[e].attributes.friendly_name || e, entities: [e], max_power: 10000, hours: 24 })), scroll)));
  views.sort((a, b) => (a.subview ? 1 : 0) - (b.subview ? 1 : 0) || V.findIndex((v) => v[0] === a.path) - V.findIndex((v) => v[0] === b.path));
  return { title: brand, views, _hgWizard: !wiz, ...(opt.kiosk_mode ? { kiosk_mode: opt.kiosk_mode } : {}) };
}
class HGStrategy extends HTMLElement { static async generate(config, hass) { return hgGenerate(hass, config || {}); } }
if (!customElements.get('ll-strategy-dashboard-home-glass')) customElements.define('ll-strategy-dashboard-home-glass', HGStrategy);
window.hgGenerate = hgGenerate;

/* --- kreator pierwszego uruchomienia (widoczny, gdy pulpit z strategii i brak zapisanych wyborów) --- */
const HGWizard = {
  async open(page) {
    const h = page._hass; if (!h || document.getElementById('hg-wiz')) return; const M = await HGModel.load(h);
    let lang = hgLang(h); const all = [['dashboard', 'panel'], ['rooms', 'rooms'], ['multimedia', 'media'], ['kamery', 'cams'], ['family', 'family'], ['energia', 'energy']];
    const has = { dashboard: true, rooms: Object.keys(M.areas).length > 0, multimedia: M.media.length > 0, kamery: M.cams.length > 0, family: M.persons.length > 0, energia: M.power.length > 0 };
    const sel = new Set(all.map((x) => x[0]).filter((v) => has[v])), hid = new Set();
    const d = document.createElement('div'); d.id = 'hg-wiz'; document.body.appendChild(d);
    const draw = () => { const t = (k) => hgI(lang, k);
      const areas = Object.values(M.areas).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      d.innerHTML = `<style>
#hg-wiz{ position:fixed; inset:0; z-index:9999; display:grid; place-items:center; background:rgba(6,9,12,.55); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); font-family:'DM Sans',system-ui,sans-serif; color:#EEF2F5; }
#hg-wiz .w{ width:min(560px, calc(100vw - 24px)); max-height:calc(100dvh - 24px); overflow:auto; box-sizing:border-box; padding:22px; border-radius:28px; background:rgba(30,36,44,.72); box-shadow:inset 0 0 0 1px rgba(255,255,255,.12), 0 24px 60px rgba(0,0,0,.4); display:flex; flex-direction:column; gap:16px; }
#hg-wiz h2{ margin:0; font-size:22px; font-weight:600; } #hg-wiz p{ margin:0; opacity:.75; font-size:14px; line-height:1.45; }
#hg-wiz h3{ margin:0 0 8px; font-size:12px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; opacity:.65; }
#hg-wiz .r{ display:flex; flex-wrap:wrap; gap:8px; } #hg-wiz button{ all:unset; cursor:pointer; box-sizing:border-box; height:38px; padding:0 14px; border-radius:999px; background:rgba(255,255,255,.08); box-shadow:inset 0 0 0 1px rgba(255,255,255,.12); font-size:14px; display:inline-flex; align-items:center; gap:6px; }
#hg-wiz button[aria-pressed=true]{ background:var(--hg-accent,#63D71E); color:var(--hg-on-accent,#0B0F0A); box-shadow:none; font-weight:600; } #hg-wiz button:disabled{ opacity:.35; cursor:default; }
#hg-wiz button:focus-visible{ outline:2px solid var(--hg-accent,#63D71E); outline-offset:2px; }
#hg-wiz .f{ display:flex; justify-content:flex-end; gap:10px; } #hg-wiz .ok{ background:var(--hg-accent,#63D71E); color:var(--hg-on-accent,#0B0F0A); font-weight:600; height:44px; padding:0 22px; box-shadow:none; } #hg-wiz .gh{ height:44px; }
#hg-wiz small{ opacity:.6; font-size:12px; }</style>
<div class="w" role="dialog" aria-modal="true" aria-label="${t('wiz_t')}"><h2>${t('wiz_t')}</h2><p>${t('wiz_s')}</p>
<div><h3>${t('wiz_lang')}</h3><div class="r"><button data-l="pl" aria-pressed="${lang === 'pl'}">Polski</button><button data-l="en" aria-pressed="${lang === 'en'}">English</button></div></div>
<div><h3>${t('wiz_views')}</h3><div class="r">${all.map(([v, k]) => `<button data-v="${v}" aria-pressed="${sel.has(v)}" ${has[v] && v !== 'dashboard' ? '' : 'disabled'}>${t(k)}</button>`).join('')}</div></div>
<div><h3>${t('wiz_rooms')}</h3>${areas.length ? `<div class="r">${areas.map((a) => `<button data-a="${H.esc(a.area_id)}" aria-pressed="${!hid.has(a.area_id)}">${H.esc(a.name)} <small>${M.roomCount[a.area_id] || 0}</small></button>`).join('')}</div>` : `<p>${t('wiz_none')}</p>`}</div>
<div class="f"><button class="gh" data-x="skip">${t('wiz_skip')}</button><button class="ok" data-x="go">${t('wiz_go')}</button></div></div>`; };
    draw();
    d.addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.l) { lang = b.dataset.l; return draw(); }
      if (b.dataset.v) { sel.has(b.dataset.v) ? sel.delete(b.dataset.v) : sel.add(b.dataset.v); return draw(); }
      if (b.dataset.a) { hid.has(b.dataset.a) ? hid.delete(b.dataset.a) : hid.add(b.dataset.a); return draw(); }
      if (b.dataset.x) { HGL.data.wiz = b.dataset.x === 'go' ? { lang, views: [...sel], hiddenRooms: [...hid], ts: Date.now() } : { lang, ts: Date.now() };
        await HGL.save(page._hass); d.remove(); if (!window.__hgDryRun) location.reload(); } });
  },
};
window.HGWizard = HGWizard;

/* --- Wygląd → „Widoki” (włącz / wyłącz / kolejność, także widoki bez pasujących encji) i „Integracje” (opcjonalne pakiety HACS) --- */
const HG_VIEW_DEF = [['dashboard', 'panel', 'mdi:view-dashboard-outline', ''], ['rooms', 'rooms', 'mdi:sofa-outline', 'obszarów (Ustawienia → Obszary)'],
  ['multimedia', 'media', 'mdi:play-box-multiple-outline', 'odtwarzacza (media_player)'], ['kamery', 'cams', 'mdi:cctv', 'kamery (camera)'],
  ['family', 'family', 'mdi:account-group-outline', 'osób (person)'], ['energia', 'energy', 'mdi:lightning-bolt-outline', 'czujnika mocy (sensor, W/kW)']];
const hgViewHas = (M) => ({ dashboard: true, rooms: Object.keys(M.areas || {}).length > 0, multimedia: M.media.length > 0, kamery: M.cams.length > 0, family: M.persons.length > 0, energia: M.power.length > 0 });
/* pakiety: wykrycie po zarejestrowanym zasobie ORAZ faktycznie wczytanym kodzie (globalna / element) */
const HG_PKGS = [
  { id: 'kiosk', name: 'Kiosk Mode', re: /kiosk-mode/i, live: () => !!window.KioskMode, icon: 'mdi:monitor-shimmer', hint: 'Ukrywa nagłówek i pasek boczny HA. Zainstaluj „Kiosk Mode” z HACS → Frontend.' },
  { id: 'sidebar', name: 'Custom Sidebar', re: /custom-sidebar/i, live: () => !!window.CustomSidebar, icon: 'mdi:dock-left', hint: 'Własna kolejność i ukrywanie pozycji panelu bocznego. Zainstaluj „Custom Sidebar” z HACS → Frontend.' },
  { id: 'cardmod', name: 'card-mod', re: /card-mod/i, live: () => !!customElements.get('card-mod'), icon: 'mdi:brush-variant', hint: 'Dodatkowe style CSS kart. Zainstaluj „card-mod” z HACS → Frontend.' },
];
const HGLookX = {
  M: null, res: null, pend: null, kio: null, busy: false,
  async prep(page) { if (this.busy) return; this.busy = true; const h = page._hass;
    try { this.M = await HGModel.load(h); } catch (e) { this.M = null; }
    try { this.res = (await h.callWS({ type: 'lovelace/resources' })).map((r) => r.url || ''); } catch (e) { this.res = []; }
    try { const c = await h.callWS({ type: 'lovelace/config', url_path: HG_DASH() }); this.dash = c; this.kio = (c && c.strategy && c.strategy.kiosk_mode) || {}; } catch (e) { this.dash = null; this.kio = {}; }
    this.busy = false; if (page._eSheetEl && page._eSheetEl.querySelector('.lk')) page._eLook(); },
  views() { const w = (HGL.data && HGL.data.wiz) || {}, has = this.M ? hgViewHas(this.M) : {};
    if (this.pend) return this.pend;
    const on = w.views ? w.views.slice() : HG_VIEW_DEF.map((v) => v[0]).filter((v) => has[v]);
    const ord = [...on, ...HG_VIEW_DEF.map((v) => v[0]).filter((v) => !on.includes(v))].filter((v) => v !== 'dashboard');
    return { order: ['dashboard', ...ord], on: new Set(['dashboard', ...on]) }; },
  pkg(p) { const reg = (this.res || []).some((u) => p.re.test(u)); let live = false; try { live = p.live(); } catch (e) { live = false; } return { reg, live, ok: reg && live }; },
  html(page) {
    if (!this.M || !this.res) { this.prep(page); return `<section class="lk-g"><h4>${H.icon('mdi:view-carousel-outline')}Widoki</h4><small class="lk-hn">Wczytywanie…</small></section>`; }
    const lang = hgLang(page._hass, (HGL.data.wiz || {}).lang), t = (k) => hgI(lang, k), has = hgViewHas(this.M), V = this.views(), D = Object.fromEntries(HG_VIEW_DEF.map((v) => [v[0], v]));
    const auto = !!(page._config && page._config._hgAuto);
    const rows = V.order.map((v, i) => { const d = D[v], on = V.on.has(v), fx = v === 'dashboard';
      return `<div class="lx-r${on ? ' on' : ''}${has[v] ? '' : ' na'}"><span class="lx-i">${H.icon(d[2])}</span><span class="lx-t"><b>${t(d[1])}</b><small>${has[v] ? (fx ? 'Zawsze widoczny' : on ? 'Widoczny' : 'Ukryty') : 'Brak encji – wymaga ' + d[3]}</small></span>
        ${fx ? '' : `<button class="lx-a" data-hge="lx-up" data-v="${v}" aria-label="W górę" ${i <= 1 ? 'disabled' : ''}>${H.icon('mdi:chevron-up')}</button><button class="lx-a" data-hge="lx-dn" data-v="${v}" aria-label="W dół" ${i === V.order.length - 1 ? 'disabled' : ''}>${H.icon('mdi:chevron-down')}</button>`}
        <button class="lx-sw" role="switch" data-hge="lx-v" data-v="${v}" aria-checked="${on}" aria-label="${t(d[1])}" ${fx ? 'disabled' : ''}><i></i></button></div>`; }).join('');
    const kio = this.kio || {}, P = Object.fromEntries(HG_PKGS.map((p) => [p.id, this.pkg(p)]));
    const tg = (k, l, sub, val) => `<div class="lx-r on"><span class="lx-t"><b>${l}</b><small>${sub}</small></span><button class="lx-sw" role="switch" data-hge="lx-k" data-k="${k}" aria-checked="${!!val}" aria-label="${l}"><i></i></button></div>`;
    const pk = HG_PKGS.map((p) => { const st = P[p.id];
      const head = `<div class="lx-r${st.ok ? ' on' : ' na'}"><span class="lx-i">${H.icon(p.icon)}</span><span class="lx-t"><b>${p.name}</b><small>${st.ok ? 'Zainstalowany' : st.reg ? 'Zasób zarejestrowany, ale się nie wczytał – odśwież stronę lub sprawdź adres' : p.hint}</small></span>${st.ok ? `<span class="lx-ok">${H.icon('mdi:check')}</span>` : ''}</div>`;
      if (!st.ok) return head;
      if (p.id === 'kiosk') return head + `<div class="lx-sub">${tg('hide_header', 'Ukryj nagłówek HA', 'Pasek z tytułem pulpitu', kio.hide_header)}${tg('hide_sidebar', 'Ukryj panel boczny HA', 'Menu po lewej stronie', kio.hide_sidebar)}${tg('kiosk_users', 'Kiosk dla nie-administratorów', 'Nagłówek i panel ukryte dla zwykłych użytkowników', kio.non_admin_settings && kio.non_admin_settings.kiosk)}</div>`;
      if (p.id === 'sidebar') return head + `<div class="lx-sub"><div class="lx-r on"><span class="lx-t"><b>Nuvio na górze panelu bocznego</b><small>Konfiguracja Custom Sidebar to plik /config/www/custom-sidebar-config.yaml – skopiuj gotowy fragment</small></span><button class="lk-mini" data-hge="lx-cs">Kopiuj</button></div></div>`;
      return head; }).join('');
    return `<section class="lk-g lx"><h4>${H.icon('mdi:view-carousel-outline')}Widoki</h4><small class="lk-hn">${auto ? 'Włącz, wyłącz i ułóż karty pulpitu. Widoki bez encji też możesz włączyć.' : 'Ten pulpit ma własną konfigurację – widokami zarządzasz w jego YAML.'}</small>
      ${auto ? `<div class="lx-l">${rows}</div>${this.pend ? '<button class="lk-mini lx-ap" data-hge="lx-apply">Zastosuj widoki</button>' : ''}` : ''}</section>
      <section class="lk-g lx"><h4>${H.icon('mdi:puzzle-outline')}Integracje</h4><small class="lk-hn">Opcjonalne dodatki z HACS – Nuvio działa bez nich</small><div class="lx-l">${pk}</div>${this.kpend ? '<button class="lk-mini lx-ap" data-hge="lx-kapply">Zapisz ustawienia kiosku</button>' : ''}</section>
      <style>.lx-l{ display:flex; flex-direction:column; gap:6px; } .lx-r{ display:flex; align-items:center; gap:10px; min-height:52px; padding:6px 8px 6px 6px; border-radius:16px; background:color-mix(in srgb, var(--hg-tile-bg) 80%, transparent); }
      .lx-r.na{ opacity:.62; } .lx-r.na .lx-t small{ font-style:italic; } .lx-sub{ display:flex; flex-direction:column; gap:6px; margin:-2px 0 4px 18px; } .lx-sub .lx-r{ min-height:46px; padding-left:12px; }
      .lx-i{ flex:none; width:38px; height:38px; border-radius:50%; display:grid; place-items:center; background:var(--hg-tile-bg); } .lx-r.on:not(.na) > .lx-i{ background:color-mix(in srgb, var(--hg-accent) 22%, transparent); color:var(--hg-accent-tx, var(--hg-accent)); }
      .lx-i ha-icon{ width:20px; height:20px; } .lx-t{ flex:1; min-width:0; display:flex; flex-direction:column; } .lx-t b{ font-weight:600; font-size:14px; } .lx-t small{ opacity:.66; font-size:12px; line-height:1.3; }
      .lx-a{ all:unset; cursor:pointer; flex:none; width:32px; height:32px; border-radius:50%; display:grid; place-items:center; } .lx-a:disabled{ opacity:.25; cursor:default; } .lx-a:not(:disabled):hover{ background:var(--hg-tile-bg); } .lx-a ha-icon{ width:20px; height:20px; }
      .lx-sw{ all:unset; cursor:pointer; flex:none; width:46px; height:28px; border-radius:999px; background:color-mix(in srgb, currentColor 22%, transparent); position:relative; transition:background .18s; } .lx-sw i{ position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:white; box-shadow:0 1px 4px rgba(0,0,0,.3); transition:transform .18s; }
      .lx-sw[aria-checked=true]{ background:var(--hg-accent); } .lx-sw[aria-checked=true] i{ transform:translateX(18px); } .lx-sw:disabled{ opacity:.45; cursor:default; } .lx-sw:focus-visible, .lx-a:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
      .lx-ok{ flex:none; width:26px; height:26px; border-radius:50%; display:grid; place-items:center; background:var(--hg-accent); color:var(--hg-on-accent); margin-right:8px; } .lx-ok ha-icon{ width:16px; height:16px; } .lx-ap{ align-self:flex-end; height:38px; padding:0 16px; margin:0; }</style>`; },
  async act(page, b, a) { const h = page._hass;
    if (a === 'lx-v' || a === 'lx-up' || a === 'lx-dn') { const V = this.views(), v = b.dataset.v, o = V.order.slice(), on = new Set(V.on), i = o.indexOf(v);
      if (a === 'lx-v') on.has(v) ? on.delete(v) : on.add(v);
      if (a === 'lx-up' && i > 1) [o[i - 1], o[i]] = [o[i], o[i - 1]];
      if (a === 'lx-dn' && i < o.length - 1) [o[i + 1], o[i]] = [o[i], o[i + 1]];
      this.pend = { order: o, on }; return page._eLook(); }
    if (a === 'lx-apply' && this.pend) { const w = HGL.data.wiz || { lang: hgLang(h), ts: Date.now() };
      HGL.data.wiz = Object.assign({}, w, { views: this.pend.order.filter((v) => this.pend.on.has(v)), ts: Date.now() }); this.pend = null; await HGL.save(h);
      page._eToast('Zapisano widoki – odświeżanie…'); if (!window.__hgDryRun) setTimeout(() => location.reload(), 600); return page._eLook(); }
    if (a === 'lx-k') { const k = this.kio = Object.assign({}, this.kio || {}), key = b.dataset.k;
      if (key === 'kiosk_users') { const n = Object.assign({}, k.non_admin_settings || {}); n.kiosk = !n.kiosk; if (!n.kiosk) delete n.kiosk; if (Object.keys(n).length) k.non_admin_settings = n; else delete k.non_admin_settings; }
      else { k[key] = !k[key]; if (!k[key]) delete k[key]; }
      this.kpend = true; return page._eLook(); }
    if (a === 'lx-kapply') { this.kpend = false; const c = this.dash;
      if (!c || !c.strategy) { page._eToast('Ten pulpit nie korzysta ze strategii Nuvio – dodaj kiosk_mode w jego YAML'); return page._eLook(); }
      const nc = { ...c, strategy: { ...c.strategy } }; if (Object.keys(this.kio || {}).length) nc.strategy.kiosk_mode = this.kio; else delete nc.strategy.kiosk_mode;
      if (!window.__hgDryRun) { try { await h.callWS({ type: 'lovelace/config/save', url_path: HG_DASH(), config: nc }); this.dash = nc; } catch (e) { page._eToast('Nie udało się zapisać (' + ((e && e.message) || e) + ')'); return page._eLook(); } } else this.dash = nc;
      page._eToast('Zapisano ustawienia kiosku – odświeżanie…'); if (!window.__hgDryRun) setTimeout(() => location.reload(), 600); return page._eLook(); }
    if (a === 'lx-cs') {
      const y = `# /config/www/custom-sidebar-config.yaml (Custom Sidebar)\norder:\n  - item: ${JSON.stringify('/' + HG_DASH())}\n    match: href\n    order: 1\n`;
      try { await navigator.clipboard.writeText(y); page._eToast('Skopiowano – wklej do /config/www/custom-sidebar-config.yaml'); } catch (e) { page._eToast('Skopiuj ręcznie: ' + y.replace(/\n/g, ' ')); } return; }
  },
};
window.HGLookX = HGLookX;

/* kiosk: drawer fix */
/* Kiosk Mode chowa <ha-sidebar>, ale nowy ha-drawer HA dalej rezerwuje --mdc-drawer-width (256px) -> ciemny pas. Zerujemy szerokość, gdy panel jest ukryty. */
(() => { if (window.__hgKfix) return; window.__hgKfix = 1;
  const tick = () => { try { const m = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main'); if (!m) return; const sb = m.shadowRoot?.querySelector('ha-sidebar');
    const hid = !!sb && getComputedStyle(sb).display === 'none'; const on = m.dataset.hgKfix === '1';
    if (hid && !on) { m.style.setProperty('--mdc-drawer-width', '0px'); m.dataset.hgKfix = '1'; } else if (!hid && on) { m.style.removeProperty('--mdc-drawer-width'); delete m.dataset.hgKfix; } } catch (e) { /* brak HA */ } };
  setInterval(tick, 1200); tick(); })();
