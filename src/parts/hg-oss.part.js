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
const HG_WZ_T = {
  pl: { hero: 'Witaj w Nuvio', heroS: 'Szklany pulpit dla Home Assistant – zbudujemy go z Twoich obszarów, urządzeń i encji w mniej niż minutę.', start: 'Zaczynamy', skip: 'Pomiń kreator', back: 'Wstecz', next: 'Dalej', go: 'Utwórz pulpit',
    s: ['Język', 'Widoki', 'Pokoje', 'Wygląd', 'Podsumowanie'], langS: 'W jakim języku ma mówić pulpit?', viewsS: 'Wybierz widoki w menu. Panel jest zawsze włączony.', roomsS: 'Które pokoje pokazać? Ukryte możesz przywrócić później.',
    lookS: 'Kolor akcentu i tło – podgląd zmienia się na żywo.', sumS: 'Wszystko gotowe. Każdy wybór zmienisz później w trybie edycji.', acc: 'Akcent', bg: 'Tło', none: 'Nie znaleziono obszarów – pokoje dodasz w Ustawieniach HA → Obszary.',
    ents: 'encji', rooms: 'pokoi', na: 'brak encji', always: 'zawsze', shown: 'widocznych', step: 'Krok', of: 'z', pv: 'Podgląd', views: 'Widoki', look: 'Wygląd' },
  en: { hero: 'Welcome to Nuvio', heroS: 'A glass dashboard for Home Assistant – built from your areas, devices and entities in under a minute.', start: 'Get started', skip: 'Skip setup', back: 'Back', next: 'Next', go: 'Create dashboard',
    s: ['Language', 'Views', 'Rooms', 'Appearance', 'Summary'], langS: 'Which language should the dashboard speak?', viewsS: 'Pick the views in the menu. Home is always on.', roomsS: 'Which rooms should be shown? Hidden ones can be restored later.',
    lookS: 'Accent colour and background – the preview updates live.', sumS: 'All set. You can change every choice later in edit mode.', acc: 'Accent', bg: 'Background', none: 'No areas found – add rooms in HA Settings → Areas.',
    ents: 'entities', rooms: 'rooms', na: 'no entities', always: 'always', shown: 'shown', step: 'Step', of: 'of', pv: 'Preview', views: 'Views', look: 'Appearance' } };
const HG_WZ_AREA_IC = [[/salon|living|dzienn/i, 'mdi:sofa'], [/kuch|kitchen/i, 'mdi:stove'], [/sypial|bed/i, 'mdi:bed'], [/łaz|lazien|bath/i, 'mdi:shower'], [/biur|office|gabinet/i, 'mdi:desk'], [/gara/i, 'mdi:garage'], [/ogr|garden|taras/i, 'mdi:flower'], [/dzieci|kid|pok[oó]j/i, 'mdi:teddy-bear'], [/korytarz|hall|przedpok|schod/i, 'mdi:door'], [/kot[lł]own|piwn|basement/i, 'mdi:water-boiler']];
const HGWizard = {
  async open(page) {
    const h = page._hass; if (!h || document.getElementById('hg-wiz')) return; const M = await HGModel.load(h);
    let lang = hgLang(h) === 'en' ? 'en' : 'pl', step = 0, dir = 1; const app = Object.assign({}, (HGL.data && HGL.data.app) || {});
    const all = [['dashboard', 'panel', 'mdi:view-dashboard-outline'], ['rooms', 'rooms', 'mdi:sofa-outline'], ['multimedia', 'media', 'mdi:play-box-multiple-outline'], ['kamery', 'cams', 'mdi:cctv'], ['family', 'family', 'mdi:account-group-outline'], ['energia', 'energy', 'mdi:lightning-bolt-outline']];
    const cnt = { dashboard: (M.climate.length ? 1 : 0) + M.scenes.length + (M.power.length ? 1 : 0), rooms: Object.keys(M.areas).length, multimedia: M.media.length, kamery: M.cams.length, family: M.persons.length, energia: M.power.length };
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
#hg-wiz.lt .hero .im::after{ background:linear-gradient(180deg, transparent 30%, rgba(246,248,250,.98)); } #hg-wiz .hero .lg{ position:absolute; left:28px; top:24px; width:52px; height:52px; border-radius:18px; display:grid; place-items:center; background:var(--a); color:var(--on,#0B0F0A); box-shadow:0 10px 30px rgba(0,0,0,.3); }
#hg-wiz .hero .tx{ padding:0 28px 8px; margin-top:-58px; position:relative; } #hg-wiz .hero h2{ text-shadow:0 2px 14px rgba(0,0,0,.45); } #hg-wiz .hero h2{ font-size:32px; } #hg-wiz .chips{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:6px; } #hg-wiz .chips span{ font-size:13px; padding:6px 12px; border-radius:999px; background:rgba(127,127,127,.16); display:inline-flex; gap:6px; align-items:center; } #hg-wiz .chips ha-icon{ width:16px; height:16px; --mdc-icon-size:16px; flex:none; color:var(--a); }
#hg-wiz .g{ display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; } #hg-wiz .g.two{ grid-template-columns:repeat(2, minmax(0,1fr)); } @media (max-width:560px){ #hg-wiz .g{ grid-template-columns:repeat(2, minmax(0,1fr)); } #hg-wiz .bd, #hg-wiz .ft, #hg-wiz .pr{ padding-left:18px; padding-right:18px; } #hg-wiz h2{ font-size:22px; } #hg-wiz .hero .tx{ padding:0 18px; } #hg-wiz .ft .b{ padding:0 16px; } }
#hg-wiz .c{ position:relative; display:flex; flex-direction:column; gap:6px; padding:10px; border-radius:22px; background:rgba(127,127,127,.12); box-shadow:inset 0 0 0 1px rgba(127,127,127,.2); transition:transform .18s, box-shadow .18s, background .18s; }
#hg-wiz .c:hover:not([aria-disabled=true]){ transform:translateY(-2px); } #hg-wiz .c[aria-pressed=true]{ box-shadow:inset 0 0 0 2px var(--a), 0 10px 26px color-mix(in srgb, var(--a) 22%, transparent); background:color-mix(in srgb, var(--a) 10%, rgba(127,127,127,.1)); } #hg-wiz .c[aria-disabled=true]{ opacity:.42; cursor:default; }
#hg-wiz .c b{ font-size:15px; font-weight:600; display:flex; gap:8px; align-items:center; } #hg-wiz .c small{ font-size:12.5px; opacity:.65; } #hg-wiz .c b ha-icon{ width:20px; height:20px; --mdc-icon-size:20px; color:var(--a); }
#hg-wiz .ck{ position:absolute; right:10px; top:10px; width:24px; height:24px; border-radius:50%; display:grid; place-items:center; background:rgba(127,127,127,.25); transition:background .18s; z-index:1; } #hg-wiz .c[aria-pressed=true] .ck{ background:var(--a); color:var(--on,#0B0F0A); } #hg-wiz .ck ha-icon{ width:16px; height:16px; --mdc-icon-size:16px; } #hg-wiz .c:not([aria-pressed=true]) .ck ha-icon{ opacity:0; }
#hg-wiz .mv{ height:78px; border-radius:14px; background:rgba(0,0,0,.18); display:grid; gap:4px; padding:7px; box-sizing:border-box; } #hg-wiz .mv i{ border-radius:6px; background:rgba(255,255,255,.16); } #hg-wiz.lt .mv{ background:rgba(0,0,0,.06); } #hg-wiz.lt .mv i{ background:rgba(0,0,0,.09); } #hg-wiz .mv i.a{ background:color-mix(in srgb, var(--a) 70%, transparent); }
#hg-wiz .ai{ width:46px; height:46px; border-radius:16px; display:grid; place-items:center; background:color-mix(in srgb, var(--a) 18%, transparent); color:var(--a); margin-bottom:4px; } #hg-wiz .ai ha-icon{ width:26px; height:26px; --mdc-icon-size:26px; }
#hg-wiz .lg2 .c{ flex-direction:row; align-items:center; gap:14px; padding:16px; } #hg-wiz .fl{ font-size:30px; line-height:1; }
#hg-wiz .lk{ display:grid; grid-template-columns:1fr 1.1fr; gap:18px; } @media (max-width:560px){ #hg-wiz .lk{ grid-template-columns:1fr; } }
#hg-wiz .sw{ display:flex; flex-wrap:wrap; gap:10px; margin:6px 0 16px; } #hg-wiz .sw button{ width:38px; height:38px; border-radius:50%; background:var(--c); display:grid; place-items:center; box-shadow:inset 0 0 0 2px rgba(255,255,255,.25); transition:transform .15s; } #hg-wiz .sw button[aria-pressed=true]{ box-shadow:0 0 0 3px rgba(24,30,38,.9), 0 0 0 5px var(--c); transform:scale(1.05); } #hg-wiz .sw ha-icon{ width:20px; height:20px; color:#0B0F0A; }
#hg-wiz .bgs{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:8px; } #hg-wiz .bgs button{ aspect-ratio:1.25; border-radius:12px; background-size:cover; background-position:center; box-shadow:inset 0 0 0 1px rgba(255,255,255,.2); } #hg-wiz .bgs button[aria-pressed=true]{ box-shadow:0 0 0 2px var(--a); }
#hg-wiz .lbl{ font-size:12px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; opacity:.6; }
#hg-wiz .pv{ border-radius:22px; overflow:hidden; aspect-ratio:16/11; background-size:cover; background-position:center; position:relative; padding:14px; box-sizing:border-box; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:auto 1fr 1fr; gap:8px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.2); transition:background-image .4s; }
#hg-wiz .pv .tp{ grid-column:1 / -1; display:flex; gap:6px; align-items:center; } #hg-wiz .pv .tp i{ height:16px; border-radius:8px; background:rgba(255,255,255,.35); width:46px; } #hg-wiz .pv .tp i.a{ background:var(--a); width:30px; } #hg-wiz .pv .tp b{ color:#fff; font-size:13px; text-shadow:0 1px 6px rgba(0,0,0,.5); flex:1; }
#hg-wiz .pv .t{ border-radius:14px; background:rgba(30,36,44,.55); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); padding:10px; color:#fff; display:flex; flex-direction:column; justify-content:space-between; font-size:12px; } #hg-wiz .pv .t ha-icon{ width:18px; height:18px; } #hg-wiz .pv .t.on ha-icon{ color:var(--a); } #hg-wiz .pv .t .bar{ height:5px; border-radius:3px; background:rgba(255,255,255,.2); } #hg-wiz .pv .t .bar i{ display:block; height:100%; width:62%; border-radius:3px; background:var(--a); }
#hg-wiz .pv .t .tg{ align-self:flex-end; width:30px; height:18px; border-radius:9px; background:var(--a); position:relative; } #hg-wiz .pv .t .tg::after{ content:''; position:absolute; right:2px; top:2px; width:14px; height:14px; border-radius:50%; background:white; }
#hg-wiz .sm{ display:grid; gap:10px; } #hg-wiz .sm > div{ display:flex; gap:14px; align-items:center; padding:14px 16px; border-radius:18px; background:rgba(127,127,127,.12); } #hg-wiz .sm .ai{ margin:0; flex:none; } #hg-wiz .sm b{ display:block; font-size:15px; } #hg-wiz .sm small{ opacity:.68; font-size:13px; } #hg-wiz .sm .e{ margin-left:auto; } #hg-wiz .sm .dot{ display:inline-block; width:14px; height:14px; border-radius:50%; background:var(--a); vertical-align:-2px; margin-right:6px; }
</style>`;
    const MV = { dashboard: '<div class="mv" style="grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr"><i style="grid-row:span 2"></i><i class="a"></i><i></i><i></i><i></i></div>', rooms: '<div class="mv" style="grid-template-columns:repeat(3,1fr)"><i></i><i class="a"></i><i></i><i></i><i></i><i></i></div>', multimedia: '<div class="mv" style="grid-template-columns:1.4fr 1fr"><i class="a"></i><i></i></div>', kamery: '<div class="mv" style="grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr"><i></i><i class="a"></i><i></i><i></i></div>', family: '<div class="mv" style="grid-template-columns:repeat(3,1fr)"><i style="border-radius:50%;aspect-ratio:1;align-self:center" class="a"></i><i style="border-radius:50%;aspect-ratio:1;align-self:center"></i><i style="border-radius:50%;aspect-ratio:1;align-self:center"></i></div>', energia: '<div class="mv" style="grid-template-rows:1fr 2fr"><i class="a" style="width:60%"></i><i></i></div>' };
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
          <div><span class="lbl">${T.pv}</span><div class="pv" style="${bgCss};margin-top:6px"><div class="tp"><i class="a"></i><b>${H.esc((h.config && h.config.location_name) || 'Dom')}</b><i></i></div><div class="t on">${ic('mdi:lightbulb-on-outline')}<span>${lang === 'pl' ? 'Salon' : 'Living room'}</span><span class="tg"></span></div><div class="t">${ic('mdi:thermometer')}<span>21,5°</span><div class="bar"><i></i></div></div><div class="t">${ic('mdi:lightning-bolt-outline')}<span>1,8 kW</span><div class="bar"><i style="width:35%"></i></div></div><div class="t on">${ic('mdi:play-circle-outline')}<span>${lang === 'pl' ? 'Muzyka' : 'Music'}</span><span class="tg"></span></div></div></div></div>`;
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
      .lx-sw{ all:unset; cursor:pointer; flex:none; width:46px; height:28px; border-radius:999px; background:rgba(128,134,142,.38); box-shadow:inset 0 0 0 1px rgba(255,255,255,.22); backdrop-filter:blur(6px); position:relative; transition:background .18s; } .lx-sw i{ position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:white; box-shadow:0 1px 4px rgba(0,0,0,.3); transition:transform .18s; }
      .lx-sw[aria-checked=true]{ background:var(--hg-accent); box-shadow:none; } .lx-sw[aria-checked=true] i{ transform:translateX(18px); } .lx-sw:disabled{ opacity:.45; cursor:default; } .lx-sw:focus-visible, .lx-a:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
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
