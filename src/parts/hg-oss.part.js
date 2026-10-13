/* ===== home-glass (wersja dystrybucyjna): baza zasobów, ścieżki, i18n, strategia pulpitu, kreator pierwszego uruchomienia ===== */
const HG_ASSET = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return s.replace(/[^/]*(\?.*)?$/, ''); } catch (e) { /* brak */ }
  const r = [...document.querySelectorAll('script[src*="home-glass"]')].map((x) => x.src)[0]; return r ? r.replace(/[^/]*(\?.*)?$/, '') : '/hacsfiles/home-glass/'; })();
window.__hgNoVer = true;   /* wersję pilnuje HACS (hacstag) – bez własnego komunikatu o nowej wersji */
const HG_DASH = () => (location.pathname.split('/')[1] || 'home-glass');
const HG_P = (v) => `/${HG_DASH()}/${v}`;
/* domyślne tło: zdjęcie CC0 dostarczane z pakietem (assets/bg, CREDITS.md); gdy się nie wczyta – gradient */
const HG_DEFAULT_BG_FB = window.HG_DEFAULT_BG_FB = { kind: 'gradient', v: '#' + '2E4257', v2: '#' + '0C1117' };
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
  opt = opt || {}; let wiz = null;
  try { const r = await hass.callWS({ type: 'frontend/get_user_data', key: 'home_glass_layout' }); wiz = r && r.value && r.value.wiz; } catch (e) { /* brak */ }
  const lang = hgLang(hass, (wiz && wiz.lang) || opt.language), t = (k) => hgI(lang, k), M = await HGModel.load(hass);
  const want = (v) => !wiz || !wiz.views || wiz.views.includes(v);
  const V = [['dashboard', t('panel'), 'mdi:view-dashboard-outline', true], ['rooms', t('rooms'), 'mdi:sofa-outline', Object.keys(M.areas).length > 0],
    ['multimedia', t('media'), 'mdi:play-box-multiple-outline', M.media.length > 0], ['kamery', t('cams'), 'mdi:cctv', M.cams.length > 0],
    ['family', t('family'), 'mdi:account-group-outline', M.persons.length > 0], ['energia', t('energy'), 'mdi:lightning-bolt-outline', M.power.length > 0]].filter((x) => x[3] && want(x[0]));
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
  return { title: brand, views, _hgWizard: !wiz };
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
