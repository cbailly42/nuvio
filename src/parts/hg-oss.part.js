/* ===== home-glass (wersja dystrybucyjna): baza zasobów, ścieżki, i18n, strategia pulpitu, kreator pierwszego uruchomienia ===== */
const HG_ASSET = (() => { try { const u = import.meta.url; if (u) return u.replace(/[^/]*([?#].*)?$/, ''); } catch (e) { /* brak */ }
  try { const s = document.currentScript && document.currentScript.src; if (s) return s.replace(/[^/]*(\?.*)?$/, ''); } catch (e) { /* brak */ }
  const r = [...document.querySelectorAll('script[src*="home-glass"]')].map((x) => x.src)[0]; return r ? r.replace(/[^/]*(\?.*)?$/, '') : '/hacsfiles/home-glass/'; })();
/* zapas z CDN (jsDelivr, przypięty do tagu działającej wersji): gdy plik obok paczki się nie wczyta; lokalny pierwszy (offline) */
const hgCdn = window.hgCdn = (u) => { try { const v = String(HG_BUILD).split('+')[0]; if (!/^\d+\.\d+\.\d+$/.test(v) || typeof u !== 'string' || !u.startsWith(HG_ASSET)) return '';
  return 'https://cdn.jsdelivr.net/gh/kczepiec/nuvio@v' + v + '/dist/' + u.slice(HG_ASSET.length).replace(/[?#].*$/, ''); } catch (e) { return ''; } };
window.__hgNoVer = true;   /* wersję pilnuje HACS (hacstag) – bez własnego komunikatu o nowej wersji */
const HG_DASH = () => (location.pathname.split('/')[1] || 'home-glass');
const HG_P = (v) => `/${HG_DASH()}/${v}`;
/* domyślne tło: zdjęcie CC0 dostarczane z pakietem (dist/nuvio-bg-default-*.webp, CREDITS.md); gdy się nie wczyta – gradient */
const HG_DEFAULT_BG_FB = window.HG_DEFAULT_BG_FB = { kind: 'gradient', v: '#' + '2E4257', v2: '#' + '0C1117' };
/* 10 teł do wyboru (CC0, dist/CREDITS.md); pierwsze = domyślne. Miniatury ~5 KB, pełne zdjęcia wczytywane dopiero po wyborze */
/* nazwa tła rozwiązywana przy użyciu (String(l) / szablon) – hgTr powstaje dopiero w hg-core */
const hgTrLazy = (pl, en) => ({ toString: () => (typeof hgTr === 'function' ? hgTr(pl, en) : pl) });
const HG_BG_SET = window.HG_BG_SET = window.HG_BG_SET || [['dom-w-lesie', 'Dom w lesie', 'House in the woods'], ['domek-nad-woda', 'Domek nad wodą', 'Lakeside cabin'], ['gwiazdzista-noc', 'Gwiaździsta noc', 'Starry night'], ['zachod-slonca', 'Zachód słońca', 'Sunset'], ['las-o-zmierzchu', 'Las o zmierzchu', 'Forest at dusk'],
  ['jasny-salon', 'Jasny salon', 'Bright living room'], ['drewniane-wnetrze', 'Drewniane wnętrze', 'Wooden interior'], ['kuchnia', 'Kuchnia', 'Kitchen'], ['mglisty-las', 'Mglisty las', 'Misty forest'], ['nad-mgla', 'Nad mgłą', 'Above the fog']]
  .map(([id, pl, en], i) => { const l = hgTrLazy(pl, en), b = HG_ASSET + 'nuvio-bg-' + id; return i ? [b + '-wide.webp', l, b + '-portrait.webp', b + '-thumb.webp'] : ['', l, '', b + '-thumb.webp']; });
const HG_DEFAULT_BG = window.HG_DEFAULT_BG = window.HG_DEFAULT_BG || { kind: 'image', v: HG_ASSET + 'nuvio-bg-default-wide.webp', v2p: HG_ASSET + 'nuvio-bg-default-portrait.webp' };

const HG_I18N = {
  pl: { map: 'Mapa', map_sub: 'Gdzie są domownicy', calendar: 'Kalendarz', cal_sub: 'Wydarzenia z Twoich kalendarzy', panel: 'Panel', rooms: 'Pokoje', room: 'Pokój', media: 'Multimedia', cams: 'Kamery', family: 'Rodzina', energy: 'Energia', settings: 'Ustawienia', profile: 'Profil',
    hello: 'Witaj, {name}!', hello_sub: 'Steruj domem w jednym miejscu', rooms_sub: 'Każdy pokój w zasięgu ręki', media_sub: 'Co gra w domu', cams_sub: 'Podgląd na żywo po dotknięciu',
    family_sub: 'Kto jest teraz w domu', energy_sub: 'Moc na żywo', scenes: 'Sceny', power: 'Moc teraz', outside: 'Na zewnątrz', more: 'Więcej', home: 'Dom', climate: 'Klimatyzacja',
    wiz_t: 'Witaj w home-glass', wiz_s: 'Zbudujemy pulpit z Twoich obszarów, urządzeń i encji. Wszystko zmienisz później w trybie edycji.', wiz_lang: 'Język', wiz_views: 'Widoki', wiz_rooms: 'Pokoje',
    wiz_go: 'Utwórz pulpit', wiz_skip: 'Pomiń', wiz_none: 'Nie znaleziono obszarów – pokoje dodasz w Ustawieniach HA → Obszary.', ents: 'encji',
    hub: 'Domownicy', hub_sub: 'Kto jest teraz w domu', na_req: 'Brak encji, wymaga {x}', req_rooms: 'obszarów (Ustawienia → Obszary)', req_media: 'odtwarzacza (media_player)', req_cams: 'kamery (camera)', req_family: 'osób (person)',
    req_energy: 'czujnika mocy (sensor, W/kW)', req_map: 'osoby lub urządzenia z lokalizacją', req_cal: 'kalendarza (calendar)' },
  en: { map: 'Map', map_sub: 'Where everyone is', calendar: 'Calendar', cal_sub: 'Events from your calendars', panel: 'Home', rooms: 'Rooms', room: 'Room', media: 'Media', cams: 'Cameras', family: 'Family', energy: 'Energy', settings: 'Settings', profile: 'Profile',
    hello: 'Welcome, {name}!', hello_sub: 'Your whole home in one place', rooms_sub: 'Every room at your fingertips', media_sub: 'What is playing', cams_sub: 'Tap for live view',
    family_sub: 'Who is home right now', energy_sub: 'Live power', scenes: 'Scenes', power: 'Power now', outside: 'Outside', more: 'More', home: 'Home', climate: 'Climate',
    wiz_t: 'Welcome to home-glass', wiz_s: 'We will build a dashboard from your areas, devices and entities. You can change everything later in edit mode.', wiz_lang: 'Language', wiz_views: 'Views', wiz_rooms: 'Rooms',
    wiz_go: 'Create dashboard', wiz_skip: 'Skip', wiz_none: 'No areas found – add rooms in HA Settings → Areas.', ents: 'entities',
    hub: 'Household', hub_sub: 'Who is home right now', na_req: 'No entities, needs {x}', req_rooms: 'areas (Settings → Areas)', req_media: 'a media player (media_player)', req_cams: 'a camera (camera)', req_family: 'people (person)',
    req_energy: 'a power sensor (sensor, W/kW)', req_map: 'a person or a device with location', req_cal: 'a calendar (calendar)' },
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
    return { areas, devices, ents, all, roomCount, weather: dom('weather')[0] || null, climate: dom('climate'), media: dom('media_player'), cams: dom('camera'), persons: dom('person'), trackers: dom('device_tracker'), zones: dom('zone'), calendars: dom('calendar'),
      scenes: [...dom('scene'), ...dom('script')].slice(0, 6), power, vacuums: dom('vacuum'), alarm: dom('alarm_control_panel')[0] || null, sun: hass.states['sun.sun'] ? 'sun.sun' : null };
  },
};

/* układ własnego widoku: siatka / kolumny / masonry / panel (hero jak strona główna) + kolumny na telefon / tablet / komputer i maks. szerokość */
const HG_LAYS = [['grid', hgTrLazy('Siatka', 'Grid'), 'mdi:view-grid-outline', hgTrLazy('Równe rzędy kart', 'Even rows of cards')], ['cols', hgTrLazy('Kolumny', 'Columns'), 'mdi:view-column-outline', hgTrLazy('Karty ułożone od góry, bez wyrównania rzędów', 'Cards stacked from the top, rows not aligned')],
  ['masonry', 'Masonry', 'mdi:view-dashboard-variant-outline', hgTrLazy('Karty dopasowane wysokością, bez pustych miejsc', 'Cards fitted by height, no gaps')], ['panel', 'Panel', 'mdi:view-agenda-outline', hgTrLazy('Jak strona główna: pogoda u góry, karty pod spodem', 'Like the home page: weather on top, cards below')]];
const hgViewLay = (c, one) => { const n = (k, d) => Math.max(1, Math.min(6, +c[k] || d)), r = (k) => `repeat(${k}, minmax(0, 1fr))`, cm = n('cm', 1), ct = n('ct', 2), cd = n('cd', c.lay === 'panel' ? 2 : 3);
  return { scroll: true, columns: r(cd), auto_rows: 'auto', phone_columns: r(cm), tablet: { columns: r(ct) }, ...(c.lay === 'cols' ? { align: 'start' } : {}), ...(c.lay === 'masonry' ? { masonry: true } : {}), ...(+c.mw ? { max_w: +c.mw } : {}) }; };
/* --- generator konfiguracji (strategia pulpitu) --- */
async function hgGenerate(hass, opt) {
  opt = opt || {}; let wiz = opt._wiz || null;   /* _wiz: tylko testy */
  if (!wiz) try { const r = await hass.callWS({ type: 'frontend/get_user_data', key: 'home_glass_layout' }); wiz = r && r.value && r.value.wiz; } catch (e) { /* brak */ }
  const lang = hgLang(hass, (wiz && wiz.lang) || opt.language), t = (k) => hgI(lang, k), M0 = await HGModel.load(hass);
  /* _empty: tylko testy – symulacja instancji bez danych */
  const M = opt._empty ? Object.assign({}, M0, { weather: null, sun: null, climate: [], scenes: [], power: [], persons: [], media: [], cams: [], trackers: [], calendars: [] }) : M0;
  const want = (v) => !wiz || !wiz.views || wiz.views.includes(v);
  const V = [['dashboard', t('panel'), 'mdi:view-dashboard-outline', true], ['rooms', t('rooms'), 'mdi:sofa-outline', Object.keys(M.areas).length > 0],
    ['multimedia', t('media'), 'mdi:play-box-multiple-outline', M.media.length > 0], ['kamery', t('cams'), 'mdi:cctv', M.cams.length > 0],
    ['family', t('family'), 'mdi:account-group-outline', M.persons.length > 0], ['energia', t('energy'), 'mdi:lightning-bolt-outline', M.power.length > 0],
    ['mapa', t('map'), 'mdi:map-outline', M.persons.length + M.trackers.length > 0], ['kalendarz', t('calendar'), 'mdi:calendar-month-outline', M.calendars.length > 0],
    ...((wiz && wiz.custom) || []).map((c) => [c.p, c.n, c.i || 'mdi:view-grid-outline', true])]
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
const hint = (k) => ({ type: 'custom:hg-hint-card', hint: k });
    if (!M.weather) dash.push(hint('weather'));
  if (M.climate[0]) dash.push({ type: 'custom:hg-ac-card', entity: M.climate[0], title: t('climate'), min_h: 253 });
  if (M.scenes.length) dash.push({ type: 'custom:hg-scenes-card', _hgid: 'scenes', title: t('scenes'), min_h: 0, scripts: M.scenes.map((e) => ({ entity: e, name: (hass.states[e].attributes.friendly_name || e), icon: hass.states[e].attributes.icon || (e.startsWith('scene.') ? 'mdi:palette' : 'mdi:play') })) });
  if (M.power.length) dash.push({ type: 'custom:hg-power-card', _hgid: 'power', title: t('power'), min_h: 130, entities: [M.power[0]], max_power: 10000, hours: 6, ...(want('energia') ? { expand: { navigate: HG_P('energia') } } : {}) });
  if (!M.scenes.length) dash.push(hint('scenes'));
  if (!M.power.length) dash.push(hint('power'));
  if (!M.persons.length) dash.push(hint('people'));
  const views = [];
  const view = (path, title, card, sub) => ({ title, path, type: 'panel', ...(sub ? { subview: true } : {}), cards: [card] });
  views.push(view('dashboard', t('panel'), base('dashboard', t('hello'), t('hello_sub'), dash, scroll, weather ? { weather } : {})));
  if (V.some((v) => v[0] === 'rooms')) {
    views.push(view('rooms', t('rooms'), base('rooms', t('rooms'), t('rooms_sub'), [{ type: 'custom:hg-areas-card', area: 'grid', min_h: 200, room_path: HG_P('pokoj'), areas: areasCfg }], one('grid'))));
    views.push(view('pokoj', t('room'), base('pokoj', t('room'), '', [{ type: 'custom:hg-room-card', area: 'room', min_h: 200, areas: areasCfg }], one('room'), { room_back: HG_P('rooms') }), true));
  }
  if (V.some((v) => v[0] === 'multimedia')) views.push(view('multimedia', t('media'), base('multimedia', t('media'), t('media_sub'), [M.media.length ? { type: 'custom:hg-players-card', area: 'm', entities: M.media } : { ...hint('media'), area: 'm' }], one('m'))));
  if (V.some((v) => v[0] === 'kamery')) views.push(view('kamery', t('cams'), base('kamery', t('cams'), t('cams_sub'), [M.cams.length ? { type: 'custom:hg-cameras-card', area: 'c', entities: M.cams } : { ...hint('cams'), area: 'c' }], one('c'))));
  if (V.some((v) => v[0] === 'family')) views.push(view('family', t('family'), base('family', t('family'), t('family_sub'), (M.persons.length ? M.persons.map((p) => ({ type: 'custom:hg-person-card', entity: p })) : [hint('people')]), scroll)));
  if (V.some((v) => v[0] === 'energia')) views.push(view('energia', t('energy'), base('energia', t('energy'), t('energy_sub'), (M.power.length ? M.power.slice(0, 4).map((e) => ({ type: 'custom:hg-power-card', title: hass.states[e].attributes.friendly_name || e, entities: [e], max_power: 10000, hours: 24 })) : [hint('power')]), scroll)));
  if (V.some((v) => v[0] === 'mapa')) { const ents = [...M.persons, ...M.trackers.slice(0, 12), ...(M.zones.includes('zone.home') ? ['zone.home'] : [])];
    views.push(view('mapa', t('map'), base('mapa', t('map'), t('map_sub'), [ents.length ? { type: 'custom:hg-map-card', area: 'm', min_h: 560, title: t('map'), entities: ents, theme_mode: 'auto', hours_to_show: 0 } : { ...hint('map'), area: 'm' }], one('m')))); }
  if (V.some((v) => v[0] === 'kalendarz')) views.push(view('kalendarz', t('calendar'), base('kalendarz', t('calendar'), t('cal_sub'), (M.calendars.length
    ? [{ type: 'custom:hg-month-card', calendars: M.calendars.slice(0, 6), min_h: 380 }, { type: 'custom:hg-agenda-card', calendars: M.calendars.slice(0, 6), days: 14, min_h: 380 }] : [hint('calendar')]), scroll)));
  for (const c of (wiz && wiz.custom) || []) if (V.some((v) => v[0] === c.p)) views.push(view(c.p, c.n, base(c.p, c.n, c.s || '', [{ ...hint('custom'), hint_sc: c.p + ':tiles', min_h: 150, span: 'full' }], hgViewLay(c, one), c.lay === 'panel' && weather ? { weather } : {})));
  views.sort((a, b) => (a.subview ? 1 : 0) - (b.subview ? 1 : 0) || V.findIndex((v) => v[0] === a.path) - V.findIndex((v) => v[0] === b.path));
  return { title: brand, views, _hgWizard: !wiz, ...(opt.kiosk_mode ? { kiosk_mode: opt.kiosk_mode } : {}) };
}

/* --- puste stany: zamiast pustego szkła podpowiedź, co dodać (integracja, krótki opis, przyciski) --- */
const HG_HINTS = {
  weather: { icon: 'mdi:weather-partly-cloudy', t: hgTrLazy('Pogoda', 'Weather'), d: hgTrLazy('Dodaj integrację Met.no (bezpłatna, bez klucza API) albo dowolną encję weather.*.', 'Add the Met.no integration (free, no API key) or any weather.* entity.'), domain: 'met', comp: 'weather' },
  power: { icon: 'mdi:lightning-bolt-outline', t: hgTrLazy('Zużycie energii', 'Energy usage'), d: hgTrLazy('Potrzebny czujnik mocy (W) z licznika, falownika lub gniazdka. Możesz też skonfigurować panel Energia w HA.', 'Needs a power sensor (W) from a meter, inverter or smart plug. You can also set up the Energy dashboard in HA.'), href: '/config/energy', hl: hgTrLazy('Panel Energia', 'Energy dashboard'), comp: 'power' },
  scenes: { icon: 'mdi:palette-outline', t: hgTrLazy('Sceny i skrypty', 'Scenes and scripts'), d: hgTrLazy('Utwórz scenę lub skrypt w HA, a pojawią się tu jako przyciski.', 'Create a scene or script in HA and it will show up here as a button.'), href: '/config/scene/dashboard', hl: hgTrLazy('Utwórz scenę', 'Create scene'), comp: 'scenes' },
  climate: { icon: 'mdi:thermostat', t: hgTrLazy('Klimat', 'Climate'), d: hgTrLazy('Dodaj termostat lub klimatyzator (encja climate.*), np. przez integrację producenta.', 'Add a thermostat or air conditioner (climate.* entity), e.g. through the manufacturer integration.'), comp: 'climate' },
  media: { icon: 'mdi:play-box-multiple-outline', t: hgTrLazy('Multimedia', 'Media'), d: hgTrLazy('Dodaj odtwarzacz: Google Cast, Sonos, Spotify lub telewizor (encje media_player.*).', 'Add a player: Google Cast, Sonos, Spotify or a TV (media_player.* entities).'), domain: 'cast', comp: 'players' },
  cams: { icon: 'mdi:cctv', t: hgTrLazy('Kamery', 'Cameras'), d: hgTrLazy('Dodaj kamerę przez ONVIF, integrację producenta lub Generic Camera (encje camera.*).', 'Add a camera via ONVIF, the manufacturer integration or Generic Camera (camera.* entities).'), domain: 'onvif', comp: 'cameras' },
  people: { icon: 'mdi:account-group-outline', t: hgTrLazy('Domownicy', 'Household'), d: hgTrLazy('Dodaj osoby w HA i przypisz im telefon z aplikacją Home Assistant, by widzieć, kto jest w domu.', 'Add people in HA and assign them a phone with the Home Assistant app to see who is home.'), href: '/config/person', hl: hgTrLazy('Dodaj osobę', 'Add person'), comp: 'people' },
  map: { icon: 'mdi:map-outline', t: hgTrLazy('Mapa', 'Map'), d: hgTrLazy('Dodaj osoby z aplikacją Home Assistant na telefonie albo urządzenia z lokalizacją (device_tracker), a pojawią się na mapie.', 'Add people with the Home Assistant app on their phone or devices with location (device_tracker) and they will appear on the map.'), href: '/config/person', hl: hgTrLazy('Dodaj osobę', 'Add person'), comp: 'map' },
  calendar: { icon: 'mdi:calendar-month-outline', t: hgTrLazy('Kalendarz', 'Calendar'), d: hgTrLazy('Dodaj Kalendarz lokalny albo Google Calendar (encje calendar.*), a wydarzenia pojawią się w agendzie i widoku miesiąca.', 'Add Local Calendar or Google Calendar (calendar.* entities) and events will appear in the agenda and month view.'), domain: 'local_calendar', comp: 'agenda' },
  custom: { icon: 'mdi:view-grid-plus-outline', t: hgTrLazy('Pusty widok', 'Empty view'), s: hgTrLazy('Twój własny widok', 'Your own view'), d: hgTrLazy('Dodaj dowolne widżety: kafelki encji, grupy, kamery, mapę, kalendarz i inne. Kolejność i rozmiar zmienisz w trybie edycji.', 'Add any widgets: entity tiles, groups, cameras, a map, a calendar and more. Change order and size in edit mode.'), add: 1 },
  fuel: { icon: 'mdi:gas-station-outline', t: hgTrLazy('Ceny paliw', 'Fuel prices'), d: hgTrLazy('Potrzebny czujnik z ceną (np. sensor z integracji REST lub Scrape, jednostka zł/l).', 'Needs a price sensor (e.g. a sensor from the REST or Scrape integration, unit zł/l).'), href: '/config/integrations/dashboard', hl: hgTrLazy('Integracje', 'Integrations') },
};
const HG_HINT_CSS = `:host{ display:block; } .hn{ box-sizing:border-box; height:100%; min-height:150px; display:flex; flex-direction:column; gap:12px; padding:16px; border-radius:16px; color:var(--primary-text-color, inherit);
  background:var(--hg-glass-lite, var(--hg-glass-bg, rgba(255,255,255,.12))); -webkit-backdrop-filter:blur(calc(var(--hg-glass-blur, 14px) * var(--hg-bf, 1))) saturate(var(--hg-glass-sat, 180%)); backdrop-filter:blur(calc(var(--hg-glass-blur, 14px) * var(--hg-bf, 1))) saturate(var(--hg-glass-sat, 180%)); box-shadow:var(--hg-card-sh, 0 10px 30px rgba(0,0,0,.18)); font-family:'DM Sans', system-ui, sans-serif; }
.hd{ display:flex; gap:12px; align-items:center; } .ic{ flex:none; width:36px; height:36px; border-radius:10px; display:grid; place-items:center; background:color-mix(in srgb, var(--hg-accent, #63D71E) 18%, transparent); color:var(--hg-accent-tx, var(--hg-accent, #63D71E)); } .ic ha-icon{ width:24px; height:24px; --mdc-icon-size:24px; }
b{ font-size:15px; font-weight:600; } small{ display:block; font-size:12px; opacity:.66; margin-top:2px; } p{ margin:0; font-size:13px; line-height:1.5; opacity:.8; flex:1; text-wrap:pretty; }
.bt{ display:flex; flex-wrap:wrap; gap:8px; } button, a{ all:unset; cursor:pointer; box-sizing:border-box; height:36px; padding:0 16px; border-radius:999px; display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:500; background:color-mix(in srgb, currentColor 8%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent); transition:background-color 150ms, transform 150ms; } button:active, a:active{ transform:scale(.96); }
.ok{ background:var(--hg-accent, #63D71E); color:var(--hg-on-accent, #0B0F0A); font-weight:600; box-shadow:none; } .gh{ background:none; box-shadow:none; opacity:.7; margin-left:auto; } button:focus-visible, a:focus-visible{ outline:2px solid var(--hg-accent, #63D71E); outline-offset:2px; } ha-icon{ width:18px; height:18px; --mdc-icon-size:18px; }`;
class HGHintCard extends HTMLElement {
  setConfig(c) { this._c = c || {}; this._r = 0; if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); }
  getCardSize() { return 3; }
  _hk() { return this._c.hint_sc && typeof HGL !== 'undefined' && HGL.data ? ((HGL.get(this._c.hint_sc).added || []).length ? 1 : 0) : 0; }
  set hass(h) { this._h = h; const k = this._hk(); if (!this._r || k !== this._k) { this._k = k; this._r = 0; this._draw(); } }
  connectedCallback() { if (this._h) { this._r = 0; this._k = this._hk(); requestAnimationFrame(() => this._draw()); } }
  _hidden() { const w = (typeof HGL !== 'undefined' && HGL.data && HGL.data.wiz) || {}; return !!(w.hints && w.hints[this._c.hint] === 0); }
  _wrap(v) { const w = this.parentElement; if (this._c.hint_sc && w && w.classList.contains('cw')) w.style.display = v; }
  _draw() { const c = this._c, D = Object.assign({}, HG_HINTS[c.hint] || {}, c), h = this._h; if (!h) return; this._r = 1;
    if (this._hidden() || (c.hint_sc && typeof HGL !== 'undefined' && HGL.data && (HGL.get(c.hint_sc).added || []).length)) { this.style.display = 'none'; this.shadowRoot.innerHTML = ''; this._wrap('none'); return; } this.style.display = ''; this._wrap('');
    const C = D.comp && typeof HG_COMP !== 'undefined' && HG_COMP.find((x) => x.id === D.comp), sl = C && C.slots.find((x) => x.req), pick = sl && typeof hgSlotCands === 'function' && hgSlotCands(h, sl).length;
    const admin = h.user && h.user.is_admin;
    this.shadowRoot.innerHTML = `<style>${HG_HINT_CSS}</style><div class="hn" role="note"><div class="hd"><span class="ic">${H.icon(D.icon || 'mdi:information-outline')}</span><span><b>${H.esc(D.t || '')}</b><small>${H.esc(D.s || hgTr('Brak danych do wyświetlenia', 'Nothing to show yet'))}</small></span></div><p>${H.esc(D.d || '')}</p>
      ${admin ? `<div class="bt">${D.add ? `<button class="ok" data-a="add">${H.icon('mdi:plus')}${hgTr('Dodaj widżet', 'Add widget')}</button>` : ''}${pick ? `<button class="ok" data-a="pick">${H.icon('mdi:swap-horizontal')}${hgTr('Wybierz encję', 'Choose entity')}</button>` : ''}${D.domain ? `<a class="${pick ? '' : 'ok'}" href="https://my.home-assistant.io/redirect/config_flow_start/?domain=${encodeURIComponent(D.domain)}" target="_blank" rel="noopener">${H.icon('mdi:plus')}${hgTr('Dodaj integrację', 'Add integration')}</a>` : ''}${D.href ? `<button class="${pick || D.domain ? '' : 'ok'}" data-a="go">${H.icon('mdi:cog-outline')}${H.esc(D.hl || hgTr('Skonfiguruj', 'Configure'))}</button>` : ''}${D.hacs ? `<button data-a="hacs">${H.icon('mdi:download')}${hgTr('Zainstaluj w HACS', 'Install in HACS')}</button>` : ''}${D.add ? '' : `<button class="gh" data-a="hide">${hgTr('Ukryj', 'Hide')}</button>`}</div>` : ''}</div>`;
    if (!this._wired) { this._wired = 1; this.shadowRoot.addEventListener('click', (e) => this._click(e)); } }
  async _click(e) { const D = Object.assign({}, HG_HINTS[this._c.hint] || {}, this._c), h = this._h; { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'go') { history.pushState(null, '', D.href); window.dispatchEvent(new CustomEvent('location-changed')); }
      if (a === 'hacs') hgHacsOpen(h, D.hacs.rid, D.hacs.repo);
      if (a === 'hide' && !D.add) { const w = HGL.data.wiz = Object.assign({}, HGL.data.wiz || {}); w.hints = Object.assign({}, w.hints, { [D.hint]: 0 }); this._r = 0; this._draw(); try { await HGL.save(h); } catch (er) { /* offline */ } }
      if (a === 'add') { let n = this; while (n && n.tagName !== 'HG-PAGE' && n.tagName !== 'NUVIO-PAGE') n = n.parentNode || n.host; if (!n || !n._editEnter) return; n._editEnter(); n._eGallery(null, this._c.hint_sc || (n._pageScope() + ':tiles')); return; }
      if (a === 'pick') { let n = this; while (n && n.tagName !== 'HG-PAGE' && n.tagName !== 'NUVIO-PAGE') n = n.parentNode || n.host; if (!n || !n._editEnter) return; n._editEnter(); n._eGalSc = n._pageScope() + ':tiles'; n._eGalCt = null; n._eComp(D.comp); } } }
}
queueMicrotask(() => hgReg('hg-hint-card', HGHintCard, hgTr('Home Glass – Podpowiedź', 'Home Glass – Hint'), hgTr('Pusty stan z instrukcją, co dodać', 'Empty state explaining what to add')));
class HGStrategy extends HTMLElement { static async generate(config, hass) { return hgGenerate(hass, config || {}); } }
if (!customElements.get('ll-strategy-dashboard-home-glass')) customElements.define('ll-strategy-dashboard-home-glass', HGStrategy);
window.hgGenerate = hgGenerate;

/* --- kreator pierwszego uruchomienia (widoczny, gdy pulpit z strategii i brak zapisanych wyborów) --- */
const HG_WZ_T = {
  pl: { hero: 'Witaj w Nuvio', heroS: 'Szklany pulpit dla Home Assistant – zbudujemy go z Twoich obszarów, urządzeń i encji w mniej niż minutę.', start: 'Zaczynamy', skip: 'Pomiń kreator', back: 'Wstecz', next: 'Dalej', go: 'Utwórz pulpit',
    s: ['Język', 'Widoki', 'Pokoje', 'Wygląd', 'Podsumowanie'], langS: 'W jakim języku ma mówić pulpit?', viewsS: 'Wybierz widoki w menu. Panel jest zawsze włączony.', roomsS: 'Które pokoje pokazać? Ukryte możesz przywrócić później.',
    lookS: 'Kolor akcentu i tło – podgląd zmienia się na żywo.', sumS: 'Wszystko gotowe. Każdy wybór zmienisz później w trybie edycji.', acc: 'Akcent', bg: 'Tło', none: 'Nie znaleziono obszarów – pokoje dodasz w Ustawieniach HA → Obszary.',
    ents: 'encji', rooms: 'pokoi', na: 'brak encji', always: 'zawsze', shown: 'widocznych', step: 'Krok', of: 'z', pv: 'Podgląd', views: 'Widoki', look: 'Wygląd', pvRoom: 'Salon', pvMusic: 'Muzyka' },
  en: { hero: 'Welcome to Nuvio', heroS: 'A glass dashboard for Home Assistant – built from your areas, devices and entities in under a minute.', start: 'Get started', skip: 'Skip setup', back: 'Back', next: 'Next', go: 'Create dashboard',
    s: ['Language', 'Views', 'Rooms', 'Appearance', 'Summary'], langS: 'Which language should the dashboard speak?', viewsS: 'Pick the views in the menu. Home is always on.', roomsS: 'Which rooms should be shown? Hidden ones can be restored later.',
    lookS: 'Accent colour and background – the preview updates live.', sumS: 'All set. You can change every choice later in edit mode.', acc: 'Accent', bg: 'Background', none: 'No areas found – add rooms in HA Settings → Areas.',
    ents: 'entities', rooms: 'rooms', na: 'no entities', always: 'always', shown: 'shown', step: 'Step', of: 'of', pv: 'Preview', views: 'Views', look: 'Appearance', pvRoom: 'Living room', pvMusic: 'Music' } };
const HG_WZ_AREA_IC = [[/salon|living|dzienn/i, 'mdi:sofa'], [/kuch|kitchen/i, 'mdi:stove'], [/sypial|bed/i, 'mdi:bed'], [/łaz|lazien|bath/i, 'mdi:shower'], [/biur|office|gabinet/i, 'mdi:desk'], [/gara/i, 'mdi:garage'], [/ogr|garden|taras/i, 'mdi:flower'], [/dzieci|kid|pok[oó]j/i, 'mdi:teddy-bear'], [/korytarz|hall|przedpok|schod/i, 'mdi:door'], [/kot[lł]own|piwn|basement/i, 'mdi:water-boiler']];
const HGWizard = {
  async open(page) {
    const h = page._hass; if (!h || document.getElementById('hg-wiz')) return; const M = await HGModel.load(h);
    let lang = hgLang(h) === 'en' ? 'en' : 'pl', step = 0, dir = 1; const app = Object.assign({}, (HGL.data && HGL.data.app) || {});
    const all = [['dashboard', 'panel', 'mdi:view-dashboard-outline'], ['rooms', 'rooms', 'mdi:sofa-outline'], ['multimedia', 'media', 'mdi:play-box-multiple-outline'], ['kamery', 'cams', 'mdi:cctv'], ['family', 'family', 'mdi:account-group-outline'], ['energia', 'energy', 'mdi:lightning-bolt-outline'], ['mapa', 'map', 'mdi:map-outline'], ['kalendarz', 'calendar', 'mdi:calendar-month-outline']];
    const cnt = { mapa: M.persons.length + M.trackers.length, kalendarz: M.calendars.length, dashboard: (M.climate.length ? 1 : 0) + M.scenes.length + (M.power.length ? 1 : 0), rooms: Object.keys(M.areas).length, multimedia: M.media.length, kamery: M.cams.length, family: M.persons.length, energia: M.power.length };
    const has = Object.fromEntries(all.map(([v]) => [v, v === 'dashboard' || cnt[v] > 0]));
    const sel = new Set(all.map((x) => x[0]).filter((v) => has[v])), hid = new Set();
    const areas = Object.values(M.areas).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const aIc = (a) => a.icon || (HG_WZ_AREA_IC.find(([re]) => re.test(a.name || '')) || [0, 'mdi:home-outline'])[1];
    const ACC = typeof HG_ACCENTS !== 'undefined' ? HG_ACCENTS : [['#' + '63D71E', 'Lime']], BGS = HG_BG_SET;
    const accOf = () => (app.accent || ACC[0][0]), bgOf = () => (app.bg && app.bg.v) || '', bgUrl = () => bgOf() || HG_DEFAULT_BG.v;
    const d = document.createElement('div'); d.id = 'hg-wiz'; document.body.appendChild(d);
    const css = `<style>
#hg-wiz{ position:fixed; inset:0; z-index:9999; display:grid; place-items:center; font-family:'DM Sans',system-ui,sans-serif; color:#EEF2F5; --a:#63D71E; }
#hg-wiz .bgx{ position:absolute; inset:0; background-size:cover; background-position:center; transition:background-image .5s; } #hg-wiz .bgx::after{ content:''; position:absolute; inset:0; background:linear-gradient(180deg, rgba(6,9,12,.35), rgba(6,9,12,.7)); backdrop-filter:blur(14px) saturate(1.1); -webkit-backdrop-filter:blur(14px); }
#hg-wiz .w{ position:relative; width:min(760px, calc(100vw - 24px)); max-height:calc(100dvh - 24px); box-sizing:border-box; border-radius:32px; background:rgba(24,30,38,.66); box-shadow:inset 0 0 0 1px rgba(255,255,255,.14), 0 30px 80px rgba(0,0,0,.45); display:flex; flex-direction:column; overflow:hidden; }
#hg-wiz.lt{ color:#14181D; } #hg-wiz.lt .w{ background:rgba(246,248,250,.78); box-shadow:inset 0 0 0 1px rgba(255,255,255,.7), 0 30px 80px rgba(0,0,0,.25); } #hg-wiz.lt .bgx::after{ background:linear-gradient(180deg, rgba(240,244,248,.25), rgba(240,244,248,.55)); }
#hg-wiz .bd{ padding:26px 28px 8px; overflow:auto; flex:1; min-height:0; } #hg-wiz .ft{ display:flex; gap:10px; align-items:center; padding:16px 28px 22px; } #hg-wiz .ft .sp{ flex:1; }
#hg-wiz .pg{ animation:wzin .38s cubic-bezier(.2,.8,.2,1) both; } #hg-wiz .pg.bk{ animation-name:wzbk; } @keyframes wzin{ from{ opacity:0; transform:translateX(28px); } } @keyframes wzbk{ from{ opacity:0; transform:translateX(-28px); } }
@media (prefers-reduced-motion:reduce){ #hg-wiz .pg{ animation:none; } }
#hg-wiz h2{ margin:0 0 6px; font-size:26px; font-weight:600; letter-spacing:-.01em; } #hg-wiz p{ margin:0 0 18px; opacity:.72; font-size:14.5px; line-height:1.5; }
#hg-wiz button{ all:unset; cursor:pointer; box-sizing:border-box; font:inherit; } #hg-wiz button:focus-visible{ outline:2px solid var(--a); outline-offset:3px; }
#hg-wiz .b{ height:46px; padding:0 22px; border-radius:999px; display:inline-flex; align-items:center; gap:8px; font-size:15px; background:rgba(127,127,127,.16); box-shadow:inset 0 0 0 1px rgba(127,127,127,.22); }
#hg-wiz .b.ok{ background:var(--a); color:var(--on,#0B0F0A); font-weight:600; box-shadow:0 8px 24px color-mix(in srgb, var(--a) 40%, transparent); } #hg-wiz .b ha-icon{ width:20px; height:20px; --mdc-icon-size:20px; }
#hg-wiz .pr{ display:flex; gap:6px; padding:20px 28px 0; align-items:center; } #hg-wiz .pr i{ flex:1; height:4px; border-radius:4px; background:rgba(127,127,127,.25); overflow:hidden; position:relative; } #hg-wiz .pr i.on::after{ content:''; position:absolute; inset:0; background:var(--a); animation:wzbar .4s ease both; } @keyframes wzbar{ from{ transform:scaleX(0); transform-origin:left; } }
#hg-wiz .pr small{ font-size:12px; opacity:.6; margin-left:8px; white-space:nowrap; } #hg-wiz .sl{ font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--a); margin-bottom:6px; display:block; }
#hg-wiz .hero{ position:relative; padding:0; } #hg-wiz .hero .im{ height:230px; background-size:cover; background-position:center; position:relative; } #hg-wiz .hero .im::after{ content:''; position:absolute; inset:0; background:linear-gradient(180deg, rgba(24,30,38,.05) 20%, rgba(24,30,38,.6) 62%, rgba(24,30,38,.98)); }
#hg-wiz.lt .hero .im::after{ background:linear-gradient(180deg, transparent 30%, rgba(246,248,250,.98)); } #hg-wiz .hero .lg{ position:absolute; left:28px; top:24px; width:52px; height:52px; border-radius:16px; display:grid; place-items:center; background:var(--a); color:var(--on,#0B0F0A); box-shadow:0 10px 30px rgba(0,0,0,.3); }
#hg-wiz .hero .tx{ padding:0 28px 8px; margin-top:-58px; position:relative; } #hg-wiz .hero h2{ text-shadow:0 2px 14px rgba(0,0,0,.45); } #hg-wiz .hero h2{ font-size:32px; } #hg-wiz .chips{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:6px; } #hg-wiz .chips span{ font-size:13px; padding:6px 12px; border-radius:999px; background:rgba(127,127,127,.16); display:inline-flex; gap:6px; align-items:center; } #hg-wiz .chips ha-icon{ width:16px; height:16px; --mdc-icon-size:16px; flex:none; color:var(--a); }
#hg-wiz .g{ display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; } #hg-wiz .g.two{ grid-template-columns:repeat(2, minmax(0,1fr)); } @media (max-width:560px){ #hg-wiz .g{ grid-template-columns:repeat(2, minmax(0,1fr)); } #hg-wiz .bd, #hg-wiz .ft, #hg-wiz .pr{ padding-left:18px; padding-right:18px; } #hg-wiz h2{ font-size:22px; } #hg-wiz .hero .tx{ padding:0 18px; } #hg-wiz .ft .b{ padding:0 16px; } }
#hg-wiz .c{ position:relative; display:flex; flex-direction:column; gap:6px; padding:10px; border-radius:24px; background:rgba(127,127,127,.12); box-shadow:inset 0 0 0 1px rgba(127,127,127,.2); transition:transform .18s, box-shadow .18s, background .18s; }
#hg-wiz .c:hover:not([aria-disabled=true]){ transform:translateY(-2px); } #hg-wiz .c[aria-pressed=true]{ box-shadow:inset 0 0 0 2px var(--a), 0 10px 26px color-mix(in srgb, var(--a) 22%, transparent); background:color-mix(in srgb, var(--a) 10%, rgba(127,127,127,.1)); } #hg-wiz .c[aria-disabled=true]{ opacity:.42; cursor:default; }
#hg-wiz .c b{ font-size:15px; font-weight:600; display:flex; gap:8px; align-items:center; } #hg-wiz .c small{ font-size:12.5px; opacity:.65; } #hg-wiz .c b ha-icon{ width:20px; height:20px; --mdc-icon-size:20px; color:var(--a); }
#hg-wiz .ck{ position:absolute; right:10px; top:10px; width:24px; height:24px; border-radius:50%; display:grid; place-items:center; background:rgba(127,127,127,.25); transition:background .18s; z-index:1; } #hg-wiz .c[aria-pressed=true] .ck{ background:var(--a); color:var(--on,#0B0F0A); } #hg-wiz .ck ha-icon{ width:16px; height:16px; --mdc-icon-size:16px; } #hg-wiz .c:not([aria-pressed=true]) .ck ha-icon{ opacity:0; }
#hg-wiz .mv{ height:78px; border-radius:12px; background:rgba(0,0,0,.18); display:grid; gap:4px; padding:7px; box-sizing:border-box; } #hg-wiz .mv i{ border-radius:6px; background:rgba(255,255,255,.16); } #hg-wiz.lt .mv{ background:rgba(0,0,0,.06); } #hg-wiz.lt .mv i{ background:rgba(0,0,0,.09); } #hg-wiz .mv i.a{ background:color-mix(in srgb, var(--a) 70%, transparent); } #hg-wiz .mv b.a{ background:var(--a); }
#hg-wiz .ai{ width:46px; height:46px; border-radius:16px; display:grid; place-items:center; background:color-mix(in srgb, var(--a) 18%, transparent); color:var(--a); margin-bottom:4px; } #hg-wiz .ai ha-icon{ width:26px; height:26px; --mdc-icon-size:26px; }
#hg-wiz .lg2 .c{ flex-direction:row; align-items:center; gap:14px; padding:16px; } #hg-wiz .fl{ font-size:30px; line-height:1; }
#hg-wiz .lk{ display:grid; grid-template-columns:1fr 1.1fr; gap:18px; } @media (max-width:560px){ #hg-wiz .lk{ grid-template-columns:1fr; } }
#hg-wiz .sw{ display:flex; flex-wrap:wrap; gap:10px; margin:6px 0 16px; } #hg-wiz .sw button{ width:38px; height:38px; border-radius:50%; background:var(--c); display:grid; place-items:center; box-shadow:inset 0 0 0 2px rgba(255,255,255,.25); transition:transform .15s; } #hg-wiz .sw button[aria-pressed=true]{ box-shadow:0 0 0 3px rgba(24,30,38,.9), 0 0 0 5px var(--c); transform:scale(1.05); } #hg-wiz .sw ha-icon{ width:20px; height:20px; color:#0B0F0A; }
#hg-wiz .bgs{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:8px; } #hg-wiz .bgs button{ aspect-ratio:1.25; border-radius:12px; background-size:cover; background-position:center; box-shadow:inset 0 0 0 1px rgba(255,255,255,.2); } #hg-wiz .bgs button[aria-pressed=true]{ box-shadow:0 0 0 2px var(--a); }
#hg-wiz .lbl{ font-size:12px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; opacity:.6; }
#hg-wiz .pv{ border-radius:24px; overflow:hidden; aspect-ratio:16/11; background-size:cover; background-position:center; position:relative; padding:14px; box-sizing:border-box; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:auto 1fr 1fr; gap:8px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.2); transition:background-image .4s; }
#hg-wiz .pv .tp{ grid-column:1 / -1; display:flex; gap:6px; align-items:center; } #hg-wiz .pv .tp i{ height:16px; border-radius:8px; background:rgba(255,255,255,.35); width:46px; } #hg-wiz .pv .tp i.a{ background:var(--a); width:30px; } #hg-wiz .pv .tp b{ color:#fff; font-size:13px; text-shadow:0 1px 6px rgba(0,0,0,.5); flex:1; }
#hg-wiz .pv .t{ border-radius:12px; background:rgba(30,36,44,.55); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); padding:10px; color:#fff; display:flex; flex-direction:column; justify-content:space-between; font-size:12px; } #hg-wiz .pv .t ha-icon{ width:18px; height:18px; } #hg-wiz .pv .t.on ha-icon{ color:var(--a); } #hg-wiz .pv .t .bar{ height:5px; border-radius:3px; background:rgba(255,255,255,.2); } #hg-wiz .pv .t .bar i{ display:block; height:100%; width:62%; border-radius:3px; background:var(--a); }
#hg-wiz .pv .t .tg{ align-self:flex-end; width:30px; height:18px; border-radius:9px; background:var(--a); position:relative; } #hg-wiz .pv .t .tg::after{ content:''; position:absolute; right:2px; top:2px; width:14px; height:14px; border-radius:50%; background:white; }
#hg-wiz .sm{ display:grid; gap:10px; } #hg-wiz .sm > div{ display:flex; gap:14px; align-items:center; padding:14px 16px; border-radius:16px; background:rgba(127,127,127,.12); } #hg-wiz .sm .ai{ margin:0; flex:none; } #hg-wiz .sm b{ display:block; font-size:15px; } #hg-wiz .sm small{ opacity:.68; font-size:13px; } #hg-wiz .sm .e{ margin-left:auto; } #hg-wiz .sm .dot{ display:inline-block; width:14px; height:14px; border-radius:50%; background:var(--a); vertical-align:-2px; margin-right:6px; }
</style>`;
    const MV = { dashboard: '<div class="mv" style="grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr"><i style="grid-row:span 2"></i><i class="a"></i><i></i><i></i><i></i></div>', rooms: '<div class="mv" style="grid-template-columns:repeat(3,1fr)"><i></i><i class="a"></i><i></i><i></i><i></i><i></i></div>', multimedia: '<div class="mv" style="grid-template-columns:1.4fr 1fr"><i class="a"></i><i></i></div>', kamery: '<div class="mv" style="grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr"><i></i><i class="a"></i><i></i><i></i></div>', family: '<div class="mv" style="grid-template-columns:repeat(3,1fr)"><i style="border-radius:50%;aspect-ratio:1;align-self:center" class="a"></i><i style="border-radius:50%;aspect-ratio:1;align-self:center"></i><i style="border-radius:50%;aspect-ratio:1;align-self:center"></i></div>', energia: '<div class="mv" style="grid-template-rows:1fr 2fr"><i class="a" style="width:60%"></i><i></i></div>', mapa: '<div class="mv" style="grid-template-columns:1fr"><i style="position:relative"><b class="a" style="position:absolute;left:38%;top:30%;width:14px;height:14px;border-radius:50%"></b><b class="a" style="position:absolute;left:62%;top:55%;width:10px;height:10px;border-radius:50%;opacity:.7"></b></i></div>', kalendarz: '<div class="mv" style="grid-template-columns:repeat(7,1fr);grid-template-rows:repeat(3,1fr)">' + Array.from({ length: 21 }, (_, i) => `<i${i === 9 ? ' class="a"' : ''}></i>`).join('') + '</div>' };
    const draw = () => { const T = HG_WZ_T[lang], t = (k) => hgI(lang, k), N = T.s.length, a = accOf(), on = (typeof HGApp !== 'undefined' && HGApp.tokens(a)) ? HGApp.tokens(a).dark['--hg-on-accent'] : '#' + '0B0F0A';
      const dk = !(window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches); d.className = dk ? '' : 'lt'; d.style.setProperty('--a', a); d.style.setProperty('--on', on);
      const ic = (x) => H.icon(x), ck = `<span class="ck">${ic('mdi:check')}</span>`, bgCss = `background-image:url('${bgUrl()}')`;
      let body = '', foot = '';
      if (step === 0) { body = `<div class="hero pg"><div class="im" style="${bgCss}"></div><div class="lg">${ic('mdi:home-variant-outline')}</div><div class="tx"><h2>${T.hero}</h2><p>${T.heroS}</p><div class="chips"><span>${ic('mdi:sofa-outline')}${areas.length} ${T.rooms}</span><span>${ic('mdi:devices')}${Object.keys(h.states).length} ${T.ents}</span><span>${ic('mdi:clock-fast')}~1 min</span></div></div></div>`;
        foot = `<button class="b" data-x="skip">${T.skip}</button><span class="sp"></span><button class="b ok" data-x="next">${T.start}${ic('mdi:arrow-right')}</button>`; }
      else { const k = step - 1; let inner = '';
        if (k === 0) inner = `<div class="g two lg2">${[['pl', 'Polski', '🇵🇱', 'Interfejs po polsku'], ['en', 'English', '🇬🇧', 'English interface']].map(([l, n, f, s2]) => `<button class="c" data-l="${l}" aria-pressed="${lang === l}">${ck}<span class="fl">${f}</span><span><b>${n}</b><small>${s2}</small></span></button>`).join('')}</div>`;
        if (k === 1) inner = `<div class="g">${all.map(([v, kk, i]) => `<button class="c" data-v="${v}" aria-pressed="${sel.has(v)}" ${has[v] && v !== 'dashboard' ? '' : 'aria-disabled="true"'}>${ck}${MV[v]}<b>${ic(i)}${t(kk)}</b><small>${v === 'dashboard' ? T.always : cnt[v] ? cnt[v] + ' ' + (v === 'rooms' ? T.rooms : T.ents) : T.na}</small></button>`).join('')}</div>`;
        if (k === 2) inner = areas.length ? `<div class="g">${areas.map((x) => `<button class="c" data-a="${H.esc(x.area_id)}" aria-pressed="${!hid.has(x.area_id)}">${ck}<span class="ai">${ic(aIc(x))}</span><b>${H.esc(x.name)}</b><small>${M.roomCount[x.area_id] || 0} ${T.ents}</small></button>`).join('')}</div>` : `<p>${T.none}</p>`;
        if (k === 3) inner = `<div class="lk"><div><span class="lbl">${T.acc}</span><div class="sw">${ACC.map(([c, l]) => `<button data-c="${c}" style="--c:${c}" aria-pressed="${a.toUpperCase() === c.toUpperCase()}" aria-label="${l}">${a.toUpperCase() === c.toUpperCase() ? ic('mdi:check') : ''}</button>`).join('')}</div><span class="lbl">${T.bg}</span><div class="bgs" style="margin-top:6px">${BGS.map(([u, l, p, th], i) => `<button data-b="${i}" title="${H.esc(l)}" aria-label="${H.esc(l)}" aria-pressed="${(u || '') === bgOf()}" style="background-image:url('${th}')"></button>`).join('')}</div></div>
          <div><span class="lbl">${T.pv}</span><div class="pv" style="${bgCss};margin-top:6px"><div class="tp"><i class="a"></i><b>${H.esc((h.config && h.config.location_name) || t('home'))}</b><i></i></div><div class="t on">${ic('mdi:lightbulb-on-outline')}<span>${T.pvRoom}</span><span class="tg"></span></div><div class="t">${ic('mdi:thermometer')}<span>21,5°</span><div class="bar"><i></i></div></div><div class="t">${ic('mdi:lightning-bolt-outline')}<span>1,8 kW</span><div class="bar"><i style="width:35%"></i></div></div><div class="t on">${ic('mdi:play-circle-outline')}<span>${T.pvMusic}</span><span class="tg"></span></div></div></div></div>`;
        if (k === 4) { const vs = all.filter(([v]) => sel.has(v)), bi = Math.max(0, BGS.findIndex(([u]) => (u || '') === bgOf()));
          inner = `<div class="sm"><div><span class="ai">${ic('mdi:translate')}</span><span><b>${T.s[0]}</b><small>${lang === 'pl' ? 'Polski' : 'English'}</small></span></div><div><span class="ai">${ic('mdi:view-grid-outline')}</span><span><b>${T.views} · ${vs.length}</b><small>${vs.map(([, kk]) => t(kk)).join(' · ')}</small></span></div><div><span class="ai">${ic('mdi:sofa-outline')}</span><span><b>${T.s[2]} · ${areas.length - hid.size}/${areas.length}</b><small>${areas.filter((x) => !hid.has(x.area_id)).map((x) => H.esc(x.name)).slice(0, 6).join(' · ')}${areas.length - hid.size > 6 ? ' …' : ''}</small></span></div><div><span class="ai">${ic('mdi:palette-outline')}</span><span><b>${T.look}</b><small><span class="dot"></span>${H.esc((ACC.find(([c]) => c.toUpperCase() === a.toUpperCase()) || [0, a])[1])} · ${H.esc(BGS[bi][1])}</small></span></div></div>`; }
        body = `<div class="pr" aria-label="${T.step} ${step} ${T.of} ${N}">${T.s.map((_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}<small>${step} / ${N}</small></div><div class="bd"><div class="pg ${dir < 0 ? 'bk' : ''}"><span class="sl">${T.step} ${step} · ${T.s[k]}</span><h2>${[T.s[0], T.s[1], T.s[2], T.s[3], T.s[4]][k]}</h2><p>${[T.langS, T.viewsS, T.roomsS, T.lookS, T.sumS][k]}</p>${inner}</div></div>`;
        foot = `<button class="b" data-x="back">${ic('mdi:arrow-left')}${T.back}</button><span class="sp"></span>${step < N ? `<button class="b ok" data-x="next">${T.next}${ic('mdi:arrow-right')}</button>` : `<button class="b ok" data-x="go">${ic('mdi:check')}${T.go}</button>`}`; }
      d.innerHTML = `${css}<div class="bgx" style="${bgCss}"></div><div class="w" role="dialog" aria-modal="true" aria-label="${T.hero}">${step === 0 ? body : body}<div class="ft">${foot}</div></div>`; };
    draw(); this._dbg = { go: (n) => { dir = n >= step ? 1 : -1; step = n; draw(); } };
    d.addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b || b.getAttribute('aria-disabled') === 'true') return;
      if (b.dataset.l) { lang = b.dataset.l; return draw(); }
      if (b.dataset.v) { sel.has(b.dataset.v) ? sel.delete(b.dataset.v) : sel.add(b.dataset.v); return draw(); }
      if (b.dataset.a) { hid.has(b.dataset.a) ? hid.delete(b.dataset.a) : hid.add(b.dataset.a); return draw(); }
      if (b.dataset.c) { app.accent = b.dataset.c; return draw(); }
      if (b.dataset.b != null) { const x = BGS[+b.dataset.b]; app.bg = x[0] ? { kind: 'image', v: x[0], v2p: x[2] || '' } : null; if (!app.bg) delete app.bg; return draw(); }
      if (b.dataset.x === 'next') { dir = 1; step++; return draw(); } if (b.dataset.x === 'back') { dir = -1; step--; return draw(); }
      if (b.dataset.x === 'go' || b.dataset.x === 'skip') { HGL.data.wiz = b.dataset.x === 'go' ? { lang, views: [...sel], hiddenRooms: [...hid], ts: Date.now() } : { lang, ts: Date.now() };
        if (b.dataset.x === 'go') { HGL.data.app = app; if (typeof HGApp !== 'undefined') HGApp.apply(); }
        await HGL.save(page._hass); d.remove(); if (!window.__hgDryRun) location.reload(); } });
  },
};
window.HGWizard = HGWizard;

/* --- Wygląd → „Widoki” (włącz / wyłącz / kolejność, także widoki bez pasujących encji) i „Integracje” (opcjonalne pakiety HACS) --- */
/* [ścieżka, klucz nazwy, ikona, klucz HG_I18N wymagania (gdy brak encji)] */
const HG_VIEW_DEF = [['dashboard', 'panel', 'mdi:view-dashboard-outline', ''], ['rooms', 'rooms', 'mdi:sofa-outline', 'req_rooms'],
  ['multimedia', 'media', 'mdi:play-box-multiple-outline', 'req_media'], ['kamery', 'cams', 'mdi:cctv', 'req_cams'],
  ['family', 'family', 'mdi:account-group-outline', 'req_family'], ['energia', 'energy', 'mdi:lightning-bolt-outline', 'req_energy'],
  ['mapa', 'map', 'mdi:map-outline', 'req_map'], ['kalendarz', 'calendar', 'mdi:calendar-month-outline', 'req_cal']];
const hgViewHas = (M) => ({ dashboard: true, rooms: Object.keys(M.areas || {}).length > 0, multimedia: M.media.length > 0, kamery: M.cams.length > 0, family: M.persons.length > 0, energia: M.power.length > 0, mapa: M.persons.length + (M.trackers || []).length > 0, kalendarz: (M.calendars || []).length > 0 });
/* pakiety: wykrycie po zarejestrowanym zasobie ORAZ faktycznie wczytanym kodzie (globalna / element) */
/* HACS: strona repozytorium w aplikacji (/hacs/repository/<id GitHub>); bez HACS -> GitHub w nowej karcie */
const hgHasHacs = (h) => !!(h && h.panels && h.panels.hacs);
const hgHacsOpen = (h, rid, repo) => { if (hgHasHacs(h) && rid) { history.pushState(null, '', '/hacs/repository/' + rid); window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } })); return true; }
  window.open('https://github.com/' + repo, '_blank', 'noopener'); return false; };
window.hgHacsOpen = hgHacsOpen;
const HG_PKGS = [
  { id: 'kiosk', name: 'Kiosk Mode', repo: 'NemesisRE/kiosk-mode', rid: 497319128, re: /kiosk-mode/i, live: () => !!window.KioskMode, icon: 'mdi:monitor-shimmer', hint: hgTrLazy('Ukrywa nagłówek i pasek boczny HA. Zainstaluj „Kiosk Mode” z HACS → Frontend.', 'Hides the HA header and sidebar. Install “Kiosk Mode” from HACS → Frontend.') },
  { id: 'sidebar', name: 'Custom Sidebar', repo: 'elchininet/custom-sidebar', rid: 737780218, re: /custom-sidebar/i, live: () => !!window.CustomSidebar, icon: 'mdi:dock-left', hint: hgTrLazy('Własna kolejność i ukrywanie pozycji panelu bocznego. Zainstaluj „Custom Sidebar” z HACS → Frontend.', 'Custom order and hiding of sidebar items. Install “Custom Sidebar” from HACS → Frontend.') },
  { id: 'cardmod', name: 'card-mod', repo: 'thomasloven/lovelace-card-mod', rid: 190927524, re: /card-mod/i, live: () => !!customElements.get('card-mod'), icon: 'mdi:brush-variant', hint: hgTrLazy('Dodatkowe style CSS kart. Zainstaluj „card-mod” z HACS → Frontend.', 'Extra CSS styles for cards. Install “card-mod” from HACS → Frontend.') },
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
    const all = [...HG_VIEW_DEF.map((v) => v[0]), ...(w.custom || []).map((c) => c.p)];
    const on = w.views ? w.views.filter((v) => all.includes(v)) : all.filter((v) => has[v] || (w.custom || []).some((c) => c.p === v));
    const ord = [...on, ...all.filter((v) => !on.includes(v))].filter((v) => v !== 'dashboard');
    return { order: ['dashboard', ...ord], on: new Set(['dashboard', ...on]) }; },
  cvForm() { const c = this.cv, ed = !!c.old, L = HG_LAYS, num = (k, l, d) => `<label class="lcv-n"><span>${l}</span><select data-cv="${k}">${[1, 2, 3, 4, 5, 6].map((i) => `<option ${(+c[k] || d) === i ? 'selected' : ''}>${i}</option>`).join('')}</select></label>`;
    const IC = ['mdi:view-grid-outline', 'mdi:star-outline', 'mdi:home-outline', 'mdi:sofa-outline', 'mdi:garage', 'mdi:flower-outline', 'mdi:thermometer', 'mdi:lightbulb-outline', 'mdi:shield-home-outline', 'mdi:television', 'mdi:baby-face-outline', 'mdi:briefcase-outline'];
    return `<div class="lcv" role="group" aria-label="${ed ? hgTr('Edytuj widok', 'Edit view') : hgTr('Nowy widok', 'New view')}"><b class="lcv-h">${H.icon(ed ? 'mdi:pencil-outline' : 'mdi:plus')}${ed ? hgTr('Edytuj widok', 'Edit view') : hgTr('Nowy widok', 'New view')}</b>
      <label class="lcv-f"><span>${hgTr('Nazwa', 'Name')} <em>${(c.n || '').length}/24</em></span><input data-cv="n" maxlength="24" value="${H.esc(c.n || '')}" placeholder="${hgTr('np. Ogród', 'e.g. Garden')}" autocomplete="off"></label>
      <label class="lcv-f"><span>${hgTr('Podtytuł (opcjonalnie)', 'Subtitle (optional)')}</span><input data-cv="s" maxlength="48" value="${H.esc(c.s || '')}" placeholder="${hgTr('np. Podlewanie i oświetlenie', 'e.g. Watering and lighting')}" autocomplete="off"></label>
      <div class="lcv-f"><span>${hgTr('Ikona', 'Icon')}</span><div class="lcv-ic">${IC.map((i) => `<button data-hge="lx-ci" data-i="${i}" aria-pressed="${c.i === i}" aria-label="${i}">${H.icon(i)}</button>`).join('')}<input data-cv="i" value="${H.esc(c.i || '')}" placeholder="mdi:…" autocomplete="off" aria-label="${hgTr('Własna ikona', 'Custom icon')}"></div></div>
      <label class="lcv-f"><span>${hgTr('Ścieżka', 'Path')}</span><span class="lcv-p">/${H.esc(HG_DASH())}/<input data-cv="p" maxlength="32" value="${H.esc(c.p || '')}" placeholder="${hgTr('ogrod', 'garden')}" autocomplete="off" ${ed ? 'disabled' : ''}></span></label>
      <div class="lcv-f"><span>${hgTr('Układ', 'Layout')}</span><div class="lcv-l">${L.map(([k, l, i, d]) => `<button data-hge="lx-cl" data-l="${k}" aria-pressed="${(c.lay || 'grid') === k}">${H.icon(i)}<b>${l}</b><small>${d}</small></button>`).join('')}</div></div>
      <div class="lcv-f"><span>${hgTr('Kolumny na urządzeniach', 'Columns per device')}</span><div class="lcv-r">${num('cm', hgTr('Telefon', 'Phone'), 1)}${num('ct', 'Tablet', 2)}${num('cd', hgTr('Komputer', 'Desktop'), c.lay === 'panel' ? 2 : 3)}<label class="lcv-n"><span>${hgTr('Maks. szerokość', 'Max width')}</span><select data-cv="mw">${[['0', hgTr('Pełna', 'Full')], ['960', '960 px'], ['1200', '1200 px'], ['1440', '1440 px']].map(([v, l]) => `<option value="${v}" ${String(c.mw || 0) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div></div>
      ${c.err ? `<p class="lcv-e" role="alert">${H.esc(c.err)}</p>` : ''}
      <div class="lcv-a">${ed ? `<button class="lx-hbtn lcv-del" data-hge="lx-cd">${H.icon('mdi:trash-can-outline')}${c.del ? hgTr('Na pewno usunąć?', 'Delete for sure?') : hgTr('Usuń widok', 'Delete view')}</button>` : ''}<button class="lx-hbtn" data-hge="lx-cx">${hgTr('Anuluj', 'Cancel')}</button><button class="lx-hbtn ok" data-hge="lx-cs2">${H.icon('mdi:check')}${ed ? hgTr('Zapisz', 'Save') : hgTr('Utwórz widok', 'Create view')}</button></div></div>
      <style>.lx-new{ align-self:flex-start; margin-top:8px; } .lcv{ display:flex; flex-direction:column; gap:12px; margin-top:10px; padding:14px; border-radius:20px; background:color-mix(in srgb, var(--hg-tile-bg) 80%, transparent); box-shadow:inset 0 0 0 1.5px color-mix(in srgb, var(--hg-accent) 45%, transparent); }
      .lcv-h{ display:flex; gap:8px; align-items:center; font-size:15px; } .lcv-h ha-icon{ width:20px; height:20px; } .lcv-f{ display:flex; flex-direction:column; gap:6px; } .lcv-f > span{ font-size:12px; opacity:.72; display:flex; justify-content:space-between; } .lcv-f em{ font-style:normal; }
      .lcv input, .lcv select{ font:inherit; color:inherit; box-sizing:border-box; height:40px; padding:0 12px; border-radius:12px; border:0; background:var(--hg-tile-bg); outline:none; min-width:0; } .lcv input:focus-visible, .lcv select:focus-visible{ box-shadow:0 0 0 2px var(--hg-accent); } .lcv select option{ color:#111; }
      .lcv-p{ display:flex; align-items:center; gap:2px; font-size:13px; opacity:.85; } .lcv-p input{ flex:1; } .lcv-ic{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; } .lcv-ic button{ all:unset; cursor:pointer; width:38px; height:38px; border-radius:12px; display:grid; place-items:center; background:var(--hg-tile-bg); }
      .lcv-ic button[aria-pressed=true]{ box-shadow:inset 0 0 0 1.5px var(--hg-accent); color:var(--hg-accent-tx, var(--hg-accent)); } .lcv-ic ha-icon{ width:20px; height:20px; } .lcv-ic input{ flex:1; min-width:120px; }
      .lcv-l{ display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px; } .lcv-l button{ all:unset; cursor:pointer; box-sizing:border-box; padding:10px; border-radius:14px; background:var(--hg-tile-bg); display:grid; grid-template-columns:auto 1fr; column-gap:8px; align-items:center; }
      .lcv-l button small{ grid-column:1 / -1; font-size:11.5px; opacity:.66; margin-top:4px; line-height:1.3; } .lcv-l button[aria-pressed=true]{ box-shadow:inset 0 0 0 1.5px var(--hg-accent); } .lcv-l ha-icon{ width:20px; height:20px; }
      .lcv-r{ display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px; } @media (max-width:520px){ .lcv-r{ grid-template-columns:repeat(2, minmax(0, 1fr)); } .lcv-l{ grid-template-columns:1fr; } } .lcv-n{ display:flex; flex-direction:column; gap:4px; font-size:11.5px; } .lcv-n span{ opacity:.66; }
      .lcv-e{ margin:0; font-size:13px; color:var(--error-color, #E5484D); } .lcv-a{ display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; } .lcv-del{ margin-right:auto; color:var(--error-color, #E5484D); } .lcv button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }</style>`; },
  cvSync(page) { const S = page._eSheetEl, c = this.cv; if (!S || !c) return; for (const n of S.querySelectorAll('[data-cv]')) if (!n.disabled) c[n.dataset.cv] = n.value.trim(); },
  pkg(p) { const reg = (this.res || []).some((u) => p.re.test(u)); let live = false; try { live = p.live(); } catch (e) { live = false; } return { reg, live, ok: reg && live }; },
  html(page) {
    if (!this.M || !this.res) { this.prep(page); return `<section class="lk-g"><h4>${H.icon('mdi:view-carousel-outline')}${hgTr('Widoki', 'Views')}</h4><small class="lk-hn">${hgTr('Wczytywanie…', 'Loading…')}</small></section>`; }
    const lang = hgLang(page._hass, (HGL.data.wiz || {}).lang), t = (k) => hgI(lang, k), has = hgViewHas(this.M), V = this.views(), CU = (HGL.data.wiz || {}).custom || [], D = Object.fromEntries([...HG_VIEW_DEF.map((v) => [v[0], v]), ...CU.map((c) => [c.p, [c.p, '', c.i || 'mdi:view-grid-outline', '', c]])]);
    for (const c of CU) has[c.p] = true; const tl = (d) => (d[4] ? H.esc(d[4].n) : t(d[1]));
    const auto = !!(page._config && page._config._hgAuto);
    const rows = V.order.map((v, i) => { const d = D[v], on = V.on.has(v), fx = v === 'dashboard';
      return `<div class="lx-r${on ? ' on' : ''}${has[v] ? '' : ' na'}"><span class="lx-i">${H.icon(d[2])}</span><span class="lx-t"><b>${tl(d)}</b><small>${d[4] ? `${hgTr('Własny widok', 'Custom view')} · ${H.esc((HG_LAYS.find((x) => x[0] === d[4].lay) || HG_LAYS[0])[1])} · /${H.esc(d[4].p)}${on ? '' : hgTr(' · ukryty', ' · hidden')}` : has[v] ? (fx ? hgTr('Zawsze widoczny', 'Always visible') : on ? hgTr('Widoczny', 'Visible') : hgTr('Ukryty', 'Hidden')) : t('na_req').replace('{x}', t(d[3]))}</small></span>${d[4] ? `<button class="lx-a" data-hge="lx-ce" data-v="${v}" aria-label="${hgTr('Edytuj widok', 'Edit view')}">${H.icon('mdi:pencil-outline')}</button>` : ''}
        ${fx ? '' : `<button class="lx-a" data-hge="lx-up" data-v="${v}" aria-label="${hgTr('W górę', 'Move up')}" ${i <= 1 ? 'disabled' : ''}>${H.icon('mdi:chevron-up')}</button><button class="lx-a" data-hge="lx-dn" data-v="${v}" aria-label="${hgTr('W dół', 'Move down')}" ${i === V.order.length - 1 ? 'disabled' : ''}>${H.icon('mdi:chevron-down')}</button>`}
        <button class="lx-sw" role="switch" data-hge="lx-v" data-v="${v}" aria-checked="${on}" aria-label="${tl(d)}" ${fx ? 'disabled' : ''}><i></i></button></div>`; }).join('');
    const h = page._hass, kio = this.kio || {}, P = Object.fromEntries(HG_PKGS.map((p) => [p.id, this.pkg(p)]));
    const tg = (k, l, sub, val) => `<div class="lx-r on"><span class="lx-t"><b>${l}</b><small>${sub}</small></span><button class="lx-sw" role="switch" data-hge="lx-k" data-k="${k}" aria-checked="${!!val}" aria-label="${l}"><i></i></button></div>`;
    const pk = HG_PKGS.map((p) => { const st = P[p.id];
      const head = `<div class="lx-r${st.ok ? ' on' : ' na'}"><span class="lx-i">${H.icon(p.icon)}</span><span class="lx-t"><b>${p.name}</b><small>${st.ok ? hgTr('Zainstalowany', 'Installed') : st.reg ? hgTr('Zasób zarejestrowany, ale się nie wczytał – odśwież stronę lub sprawdź adres', 'Resource registered but not loaded – reload the page or check the URL') : p.hint}</small></span>${st.ok ? `<span class="lx-ok">${H.icon('mdi:check')}</span>` : ''}</div>${st.ok ? '' : `<div class="lx-hb">${this.hacsGo && this.hacsGo[p.id] ? `<button class="lx-hbtn" data-hge="lx-rf">${H.icon('mdi:refresh')}${hgTr('Odśwież, aby wykryć', 'Reload to detect')}</button>` : ''}<button class="lx-hbtn ok" data-hge="lx-hacs" data-p="${p.id}">${H.icon(hgHasHacs(h) ? 'mdi:download' : 'mdi:github')}${hgHasHacs(h) ? hgTr('Zainstaluj w HACS', 'Install in HACS') : hgTr('Otwórz na GitHub', 'Open on GitHub')}</button>${hgHasHacs(h) ? '' : `<a class="lx-hl" href="https://hacs.xyz/docs/use/" target="_blank" rel="noopener">${hgTr('Jak zainstalować HACS', 'How to install HACS')}</a>`}</div>`}`;
      if (!st.ok) return head;
      if (p.id === 'kiosk') return head + `<div class="lx-sub">${tg('hide_header', hgTr('Ukryj nagłówek HA', 'Hide HA header'), hgTr('Pasek z tytułem pulpitu', 'The bar with the dashboard title'), kio.hide_header)}${tg('hide_sidebar', hgTr('Ukryj panel boczny HA', 'Hide HA sidebar'), hgTr('Menu po lewej stronie', 'The menu on the left'), kio.hide_sidebar)}${tg('kiosk_users', hgTr('Kiosk dla nie-administratorów', 'Kiosk for non-admins'), hgTr('Nagłówek i panel ukryte dla zwykłych użytkowników', 'Header and sidebar hidden for regular users'), kio.non_admin_settings && kio.non_admin_settings.kiosk)}</div>`;
      if (p.id === 'sidebar') return head + `<div class="lx-sub"><div class="lx-r on"><span class="lx-t"><b>${hgTr('Nuvio na górze panelu bocznego', 'Nuvio at the top of the sidebar')}</b><small>${hgTr('Konfiguracja Custom Sidebar to plik /config/www/custom-sidebar-config.yaml – skopiuj gotowy fragment', 'Custom Sidebar is configured in /config/www/custom-sidebar-config.yaml – copy a ready-made snippet')}</small></span><button class="lk-mini" data-hge="lx-cs">${hgTr('Kopiuj', 'Copy')}</button></div></div>`;
      return head; }).join('');
    return `<section class="lk-g lx"><h4>${H.icon('mdi:view-carousel-outline')}${hgTr('Widoki', 'Views')}</h4><small class="lk-hn">${auto ? hgTr('Włącz, wyłącz i ułóż karty pulpitu. Widoki bez encji też możesz włączyć.', 'Turn dashboard views on or off and reorder them. Views without entities can be turned on too.') : hgTr('Ten pulpit ma własną konfigurację – widokami zarządzasz w jego YAML.', 'This dashboard has its own configuration – manage its views in its YAML.')}</small>
      ${auto ? `<div class="lx-l">${rows}</div>${this.cv ? this.cvForm() : `<button class="lx-hbtn lx-new" data-hge="lx-cn">${H.icon('mdi:plus')}${hgTr('Nowy widok', 'New view')}</button>`}${this.pend ? `<button class="lk-mini lx-ap" data-hge="lx-apply">${hgTr('Zastosuj widoki', 'Apply views')}</button>` : ''}` : ''}</section>
      <section class="lk-g lx"><h4>${H.icon('mdi:puzzle-outline')}${hgTr('Integracje', 'Integrations')}</h4><small class="lk-hn">${hgTr('Opcjonalne dodatki z HACS – Nuvio działa bez nich', 'Optional add-ons from HACS – Nuvio works without them')}</small><div class="lx-l">${pk}</div>${this.kpend ? `<button class="lk-mini lx-ap" data-hge="lx-kapply">${hgTr('Zapisz ustawienia kiosku', 'Save kiosk settings')}</button>` : ''}</section>
      <style>.lx-l{ display:flex; flex-direction:column; gap:6px; } .lx-r{ display:flex; align-items:center; gap:10px; min-height:52px; padding:6px 8px 6px 6px; border-radius:16px; background:color-mix(in srgb, var(--hg-tile-bg) 80%, transparent); }
      .lx-r.na{ opacity:.62; } .lx-r.na .lx-t small{ font-style:italic; } .lx-sub{ display:flex; flex-direction:column; gap:6px; margin:-2px 0 4px 18px; } .lx-sub .lx-r{ min-height:46px; padding-left:12px; }
      .lx-i{ flex:none; width:38px; height:38px; border-radius:50%; display:grid; place-items:center; background:var(--hg-tile-bg); } .lx-r.on:not(.na) > .lx-i{ background:color-mix(in srgb, var(--hg-accent) 22%, transparent); color:var(--hg-accent-tx, var(--hg-accent)); }
      .lx-i ha-icon{ width:20px; height:20px; } .lx-t{ flex:1; min-width:0; display:flex; flex-direction:column; } .lx-t b{ font-weight:600; font-size:14px; } .lx-t small{ opacity:.66; font-size:12px; line-height:1.3; }
      .lx-a{ all:unset; cursor:pointer; flex:none; width:32px; height:32px; border-radius:50%; display:grid; place-items:center; } .lx-a:disabled{ opacity:.25; cursor:default; } .lx-a:not(:disabled):hover{ background:var(--hg-tile-bg); } .lx-a ha-icon{ width:20px; height:20px; }
      .lx-sw{ all:unset; cursor:pointer; flex:none; width:46px; height:28px; border-radius:999px; background:rgba(128,134,142,.38); box-shadow:inset 0 0 0 1px rgba(255,255,255,.22); backdrop-filter:blur(6px); position:relative; transition:background .18s; } .lx-sw i{ position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:white; box-shadow:0 1px 4px rgba(0,0,0,.3); transition:transform .18s; }
      .lx-sw[aria-checked=true]{ background:var(--hg-accent); box-shadow:none; } .lx-sw[aria-checked=true] i{ transform:translateX(18px); } .lx-sw:disabled{ opacity:.45; cursor:default; } .lx-sw:focus-visible, .lx-a:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
      .lx-hb{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:flex-end; margin:-2px 0 6px 50px; } .lx-hbtn{ all:unset; cursor:pointer; box-sizing:border-box; border-radius:999px; background:var(--hg-tile-bg); height:36px; padding:0 14px; display:inline-flex; gap:6px; align-items:center; font-size:13px; } .lx-hbtn ha-icon{ width:18px; height:18px; } .lx-hbtn.ok{ background:var(--hg-accent); color:var(--hg-on-accent); font-weight:600; } .lx-hbtn:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; } .lx-hl{ font-size:12px; opacity:.7; color:inherit; }
      .lx-ok{ flex:none; width:26px; height:26px; border-radius:50%; display:grid; place-items:center; background:var(--hg-accent); color:var(--hg-on-accent); margin-right:8px; } .lx-ok ha-icon{ width:16px; height:16px; } .lx-ap{ align-self:flex-end; height:38px; padding:0 16px; margin:0; }</style>`; },
  async act(page, b, a) { const h = page._hass;
    if (a.startsWith('lx-c') && a !== 'lx-cs') { const slug = (x) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
      if (a === 'lx-cn') { this.cv = { n: '', s: '', i: 'mdi:view-grid-outline', p: '', lay: 'grid', cm: 1, ct: 2, cd: 3, mw: 0 }; return page._eLook(); }
      if (a === 'lx-ce') { const c = ((HGL.data.wiz || {}).custom || []).find((x) => x.p === b.dataset.v); if (c) this.cv = Object.assign({}, c, { old: c.p }); return page._eLook(); }
      this.cvSync(page); const c = this.cv; if (!c) return;
      if (a === 'lx-cx') { this.cv = null; return page._eLook(); }
      if (a === 'lx-ci') { c.i = b.dataset.i; return page._eLook(); }
      if (a === 'lx-cl') { c.lay = b.dataset.l; return page._eLook(); }
      const w = HGL.data.wiz = Object.assign({ lang: hgLang(h), ts: Date.now() }, HGL.data.wiz || {}), CU = (w.custom || []).slice(), cur = this.views();
      if (a === 'lx-cd') { if (!c.del) { c.del = 1; return page._eLook(); }
        w.custom = CU.filter((x) => x.p !== c.old); w.views = cur.order.filter((v) => cur.on.has(v) && v !== c.old && v !== 'dashboard'); w.ts = Date.now(); this.cv = null; this.pend = null; await HGL.save(h);
        page._eToast(hgTr('Usunięto widok: ', 'View deleted: ') + c.n); if (!window.__hgDryRun) setTimeout(() => location.reload(), 600); return page._eLook(); }
      if (a === 'lx-cs2') { c.n = (c.n || '').slice(0, 24); c.p = c.old || slug(c.p || c.n); const taken = [...HG_VIEW_DEF.map((v) => v[0]), 'pokoj', ...CU.map((x) => x.p).filter((x) => x !== c.old)];
        c.err = !c.n ? hgTr('Podaj nazwę widoku.', 'Enter a view name.') : !c.p ? hgTr('Podaj ścieżkę (litery i cyfry).', 'Enter a path (letters and digits).') : taken.includes(c.p) ? hgTr(`Ścieżka /${c.p} jest już zajęta.`, `The path /${c.p} is already taken.`) : !/^mdi:[a-z0-9-]+$/.test(c.i || 'mdi:x') ? hgTr('Ikona w formacie mdi:nazwa.', 'Icon must be in the mdi:name format.') : '';
        if (c.err) return page._eLook();
        const rec = { p: c.p, n: c.n, ...(c.s ? { s: c.s.slice(0, 48) } : {}), i: c.i || 'mdi:view-grid-outline', lay: c.lay || 'grid', cm: +c.cm || 1, ct: +c.ct || 2, cd: +c.cd || 3, ...(+c.mw ? { mw: +c.mw } : {}) };
        const j = CU.findIndex((x) => x.p === c.old); if (j >= 0) CU[j] = rec; else CU.push(rec); w.custom = CU;
        const on = cur.order.filter((v) => cur.on.has(v) && v !== 'dashboard'); if (!c.old) on.push(rec.p); w.views = on; w.ts = Date.now(); this.cv = null; this.pend = null; await HGL.save(h);
        page._eToast((c.old ? hgTr('Zapisano widok: ', 'View saved: ') : hgTr('Utworzono widok: ', 'View created: ')) + rec.n + hgTr(' (odświeżanie…)', ' (reloading…)')); if (!window.__hgDryRun) setTimeout(() => location.reload(), 600); return page._eLook(); } }
    if (a === 'lx-hacs') { const p = HG_PKGS.find((x) => x.id === b.dataset.p); if (!p) return; this.hacsGo = Object.assign({}, this.hacsGo, { [p.id]: 1 }); if (!window.__hgDryRun) { if (hgHacsOpen(h, p.rid, p.repo)) page._editExit && page._editExit(false); } else page._eLook(); return; }
    if (a === 'lx-rf') { if (!window.__hgDryRun) location.reload(); return; }
    if (a === 'lx-v' || a === 'lx-up' || a === 'lx-dn') { const V = this.views(), v = b.dataset.v, o = V.order.slice(), on = new Set(V.on), i = o.indexOf(v);
      if (a === 'lx-v') on.has(v) ? on.delete(v) : on.add(v);
      if (a === 'lx-up' && i > 1) [o[i - 1], o[i]] = [o[i], o[i - 1]];
      if (a === 'lx-dn' && i < o.length - 1) [o[i + 1], o[i]] = [o[i], o[i + 1]];
      this.pend = { order: o, on }; return page._eLook(); }
    if (a === 'lx-apply' && this.pend) { const w = HGL.data.wiz || { lang: hgLang(h), ts: Date.now() };
      HGL.data.wiz = Object.assign({}, w, { views: this.pend.order.filter((v) => this.pend.on.has(v)), ts: Date.now() }); this.pend = null; await HGL.save(h);
      page._eToast(hgTr('Zapisano widoki – odświeżanie…', 'Views saved – reloading…')); if (!window.__hgDryRun) setTimeout(() => location.reload(), 600); return page._eLook(); }
    if (a === 'lx-k') { const k = this.kio = Object.assign({}, this.kio || {}), key = b.dataset.k;
      if (key === 'kiosk_users') { const n = Object.assign({}, k.non_admin_settings || {}); n.kiosk = !n.kiosk; if (!n.kiosk) delete n.kiosk; if (Object.keys(n).length) k.non_admin_settings = n; else delete k.non_admin_settings; }
      else { k[key] = !k[key]; if (!k[key]) delete k[key]; }
      this.kpend = true; return page._eLook(); }
    if (a === 'lx-kapply') { this.kpend = false; const c = this.dash;
      if (!c || !c.strategy) { page._eToast(hgTr('Ten pulpit nie korzysta ze strategii Nuvio – dodaj kiosk_mode w jego YAML', 'This dashboard does not use the Nuvio strategy – add kiosk_mode in its YAML')); return page._eLook(); }
      const nc = { ...c, strategy: { ...c.strategy } }; if (Object.keys(this.kio || {}).length) nc.strategy.kiosk_mode = this.kio; else delete nc.strategy.kiosk_mode;
      if (!window.__hgDryRun) { try { await h.callWS({ type: 'lovelace/config/save', url_path: HG_DASH(), config: nc }); this.dash = nc; } catch (e) { page._eToast(hgTr('Nie udało się zapisać (', 'Could not save (') + ((e && e.message) || e) + ')'); return page._eLook(); } } else this.dash = nc;
      page._eToast(hgTr('Zapisano ustawienia kiosku – odświeżanie…', 'Kiosk settings saved – reloading…')); if (!window.__hgDryRun) setTimeout(() => location.reload(), 600); return page._eLook(); }
    if (a === 'lx-cs') {
      const y = `# /config/www/custom-sidebar-config.yaml (Custom Sidebar)\norder:\n  - item: ${JSON.stringify('/' + HG_DASH())}\n    match: href\n    order: 1\n`;
      try { await navigator.clipboard.writeText(y); page._eToast(hgTr('Skopiowano – wklej do /config/www/custom-sidebar-config.yaml', 'Copied – paste into /config/www/custom-sidebar-config.yaml')); } catch (e) { page._eToast(hgTr('Skopiuj ręcznie: ', 'Copy manually: ') + y.replace(/\n/g, ' ')); } return; }
  },
};
window.HGLookX = HGLookX;

/* kiosk: drawer fix */
/* Kiosk Mode chowa <ha-sidebar>, ale nowy ha-drawer HA dalej rezerwuje --mdc-drawer-width (256px) -> ciemny pas. Zerujemy szerokość, gdy panel jest ukryty. */
(() => { if (window.__hgKfix) return; window.__hgKfix = 1;
  const tick = () => { if (document.hidden) return; try { const m = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main'); if (!m) return; const sb = m.shadowRoot?.querySelector('ha-sidebar');
    const hid = !!sb && getComputedStyle(sb).display === 'none'; const on = m.dataset.hgKfix === '1';
    if (hid && !on) { m.style.setProperty('--mdc-drawer-width', '0px'); m.dataset.hgKfix = '1'; } else if (!hid && on) { m.style.removeProperty('--mdc-drawer-width'); delete m.dataset.hgKfix; } } catch (e) { /* brak HA */ } };
  setInterval(tick, 1200); tick(); })();
queueMicrotask(() => { if (typeof HGL !== 'undefined') window.__hgL = HGL; });
