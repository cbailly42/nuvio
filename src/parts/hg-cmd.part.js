/* ===== Polecenia z automatyzacji HA do tabletu ściennego (#47): wybudź, wygaszacz, zablokuj PIN-em, pokaż widok – bez browser_mod.
   Każde urządzenie ma własną nazwę zapisaną w tej przeglądarce (localStorage home-glass:wall-device), jak „Wygaszacz na tym urządzeniu”.
   Dwie drogi, obie dla wybranej nazwy:
   • zdarzenie HA `nuvio_command` z danymi {device, action, view} – wymaga konta administratora (tylko admin może subskrybować własne zdarzenia);
   • encja pomocnika `input_text.*` z atrybutami device, action i view – działa na każdym koncie, także bez uprawnień administratora.
   Encja jest wspólna dla wszystkich przeglądarek, które ją wybrały, i pamięta ostatnie polecenie: Nuvio wykonuje je przy każdej zmianie
   i raz po wczytaniu strony, chyba że to samo polecenie już widziało (localStorage home-glass:wall-device-seen).
   Akcje: wake, screensaver, lock, navigate (z view). Lista widoków do „pokaż widok” pochodzi z konfiguracji dashboardu (karty hg-page). */
const HGDeviceCmd = {
  DK: 'home-glass:wall-device', IK: 'home-glass:wall-device-entity', SK: 'home-glass:wall-device-seen',
  ACTS: ['wake', 'screensaver', 'lock', 'navigate'],
  rd(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
  wr(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* pamięć zablokowana: polecenia działają w tej sesji po nazwie domyślnej */ } },
  /* nazwa -> klucz do porównania: małe litery, bez znaków diakrytycznych (Ł, ą, ž…) i bez znaków spoza a-z 0-9 */
  slug(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0142\u0111\u00f8\u00e6\u0153\u00fe]/g, (ch) => ({ '\u0142': 'l', '\u0111': 'd', '\u00f8': 'o', '\u00e6': 'ae', '\u0153': 'oe', '\u00fe': 'th' })[ch]).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); },
  /* ---- nazwa tego urządzenia ---- */
  device() { return HGDeviceCmd.rd(HGDeviceCmd.DK); },
  /* własna nazwa; pusta czyści, a bez nazwy polecenia nie trafiają na to urządzenie */
  setDevice(v) { const d = HGDeviceCmd.slug(v); HGDeviceCmd.wr(HGDeviceCmd.DK, d); HGDeviceCmd.wr(HGDeviceCmd.SK, ''); return d; },
  defDevice(h) { const n = (h && h.user && (h.user.name || h.user.id)) || 'tablet';
    const s = HGDeviceCmd.slug(n).replace(/^nuvio-/, '') || 'tablet'; return 'nuvio-' + s; },
  /* nazwa do karty polecenia w automatyzacji: nazwa urządzenia, a gdy jej nie ma, ta proponowana */
  suggest(h) { return HGDeviceCmd.device() || HGDeviceCmd.defDevice(h); },
  /* ---- encja pomocnika ---- */
  entity() { const e = HGDeviceCmd.rd(HGDeviceCmd.IK); return /^input_text\.[a-z0-9_]+$/.test(e) ? e : ''; },
  setEntity(v) { const s = String(v || '').trim(), e = !s ? '' : s.includes('.') ? s : 'input_text.' + s;
    HGDeviceCmd.wr(HGDeviceCmd.IK, /^input_text\.[a-z0-9_]+$/.test(e) ? e : ''); HGDeviceCmd.wr(HGDeviceCmd.SK, '');
    HGDeviceCmd.sub(true); return HGDeviceCmd.entity(); },
  entities(h) { const nm = (e) => HGDeviceCmd.name(h, e);
    return Object.keys((h && h.states) || {}).filter((e) => e.startsWith('input_text.')).sort((a, b) => nm(a).localeCompare(nm(b), HG_LOC())); },
  name(h, e) { const s = h && h.states && h.states[e]; return (s && s.attributes && s.attributes.friendly_name) || e; },
  /* ---- widoki dashboardu: ścieżki kart hg-page (także przekierowań i widoków zapisanych w innym miejscu) ---- */
  page() { return (window.__hgPage && window.__hgPage.isConnected && window.__hgPage) || (HGShell.root && HGShell.root.isConnected ? HGShell.root : null) || null; },
  views() {
    const vs = HGShell._views() || [], out = [];
    for (const [i, v] of vs.entries()) {
      const cc = v && Array.isArray(v.cards) && v.cards.length === 1 ? v.cards[0] : null;
      const p = (v && v.path) || (cc && cc.type === 'custom:hg-page' && cc.view) || (i === 0 ? 'dashboard' : '');
      if (p && !out.some((x) => x[0] === p)) out.push([p, (v && v.title) || p]);
    }
    return out;
  },
  /* ścieżka do widoku: pełny adres, /dashboard/widok, widok albo jego tytuł (nazwa z zakładki) */
  path(view) {
    const v = String(view == null ? '' : view).trim(); if (!v) return '';
    if (/^\//.test(v)) return v;
    const V = HGDeviceCmd.views(), s = HGDeviceCmd.slug(v);
    const hit = V.find(([p]) => p === v) || V.find(([p]) => HGDeviceCmd.slug(p) === s) || V.find(([, t]) => HGDeviceCmd.slug(t) === s)
      || V.find(([p]) => p.startsWith(v)) || V.find(([p]) => v.startsWith(p));
    if (hit) return HG_P(hit[0]);
    return '/';   /* nieznany widok: HA pokaże pierwszy widok dashboardu */
  },
  /* ---- wykonanie polecenia ---- */
  /* c = { action, view }: 'wake' | 'screensaver' | 'lock' | 'navigate'. Zwraca true, gdy polecenie zostało wykonane. */
  run(c) {
    if (!c || typeof c !== 'object' || !HGDeviceCmd.ACTS.includes(c.action)) return false;
    const W = window.HGWall, pg = HGDeviceCmd.page();
    const arm = () => { if (W) { W.hass = W.hass || (pg && pg._hass); W.page = W.page || pg; W.last = Date.now(); } };
    try {
      if (c.action === 'wake') { if (!W) return false; if (W.active) W.wake('command'); return true; }
      if (c.action === 'screensaver') { if (!W) return false; arm(); W.show(); return true; }
      if (c.action === 'lock') { if (!W) return false; arm();
        /* blokada bez włączonego PIN-u tylko chowa treść za wygaszaczem (jak „Zablokuj ekran” w menu profilu) */
        W.show(); if (W.lockOn && W.lockOn()) W.lockNow(); return true; }
      if (c.action === 'navigate') { if (!pg) return false; const p = HGDeviceCmd.path(c.view), go = () => H.action(pg, pg._hass, { navigate: p });
        /* otwarty wygaszacz najpierw się zamyka (animacja), a widok zmienia się po niej; zablokowany nic nie robi */
        if (W && W.active) { if (W.locked) return false; W.wake('command'); setTimeout(go, 500); return true; }
        return go() !== false; }
    } catch (e) { return false; }
    return false;
  },
  /* ---- odbiór z HA ---- */
  /* zdarzenie nuvio_command (admin): dane {device, action, view}; nazwa urządzenia musi się zgadzać */
  onEvent(ev) { const d = (ev && ev.data) || {}, act = d.action == null ? '' : String(d.action).trim();
    if (d.device == null || HGDeviceCmd.slug(d.device) !== HGDeviceCmd.device()) return false;
    return HGDeviceCmd.run({ action: act, view: d.view }); },
  /* stan encji pomocnika: device, action i view z atrybutów (albo z wartości tekstowej „action [view]”) */
  parse(st) {
    if (!st || !st.state || st.state === 'unknown' || st.state === 'unavailable') return null;
    const a = st.attributes || {}, txt = String(st.state || '').trim().split(/\s+/);
    /* wartość encji ma pierwszeństwo (wpis w automatyzacji bywa pusty w atrybutach); sama liczba/tekst bez akcji to nie polecenie */
    const had = HGDeviceCmd.ACTS.includes(String(a.action || '').toLowerCase());
    const action = String((had ? a.action : (txt[0] || '')) || '').trim().toLowerCase();
    const view = a.view != null && a.view !== '' ? a.view : (txt.length > 1 || !had ? txt.slice(1).join(' ') : '');
    return { device: a.device == null ? '' : String(a.device), action, view: String(view) };
  },
  /* polecenie z encji: sprawdza nazwę urządzenia i pomija to samo polecenie widziane już w tej przeglądarce
     (stan encji to ostatnie polecenie – przy odświeżeniu strony nie może się powtórzyć) */
  onState(eid, st) {
    const e = HGDeviceCmd.entity(); if (!e || eid !== e) return false;
    const c = HGDeviceCmd.parse(st); if (!c) return false;
    if (HGDeviceCmd.slug(c.device) !== HGDeviceCmd.device()) return false;
    const sig = JSON.stringify([st.state, st.last_changed || st.last_updated || '', c.device, c.action, c.view]);
    if (HGDeviceCmd.rd(HGDeviceCmd.SK) === sig) return false;
    const ok = HGDeviceCmd.run(c); HGDeviceCmd.wr(HGDeviceCmd.SK, sig); return ok;
  },
  /* nasłuch: zawsze zmiana wybranej encji (hass.states), a zdarzenie nuvio_command tylko gdy wybrano nazwę i konto jest adminem */
  sub(reset) {
    const h = this.hass;
    if (reset && this._ev) { try { this._ev(); } catch (e) { /* już odpięte */ } this._ev = null; this._evp = null; }
    const want = !!(h && h.connection && HGDeviceCmd.device() && h.user && h.user.is_admin);
    if (this._evp || !want) return;
    this._evp = h.connection.subscribeEvents((ev) => HGDeviceCmd.onEvent(ev), 'nuvio_command')
      .then((u) => { this._ev = u; }, () => { this._evp = null; });
  },
  tick(h) { this.hass = h; HGDeviceCmd.sub(); },
  /* polecenie czekające na wczytanie strony (przycisk w ustawieniach); zdarzenie i encja działają same w tick() */
  fire(action, view) { return HGDeviceCmd.run({ action, view }); },
  /* ---- UI: karta w sekcji Tryb tabletu ściennego ---- */
  html(p) { if (!HGWall.admin(p)) return ''; const c = HGWall.get(), h = p._hass, dv = HGDeviceCmd.device(), sug = HGDeviceCmd.defDevice(h);
    const en = HGDeviceCmd.entities(h), cur = HGDeviceCmd.entity();
    const V = HGDeviceCmd.views().slice(0, 12);
    return `<div class="wl-f" role="group" aria-labelledby="wl-cm"><span id="wl-cm">${hgT('cmdc.device_name')}</span>
      <span class="hs-s lk-url">${H.icon('mdi:tablet-dashboard')}<input class="hs-in" name="wl-devname" value="${H.esc(dv)}" placeholder="${H.esc(sug)}" autocomplete="off" spellcheck="false" aria-label="${hgT('cmdc.device_name')}"></span>
      <small class="wl-warn">${H.esc(dv ? hgT('cmdc.device_hint', { device: dv }) : hgT('cmdc.device_empty_hint', { device: sug }))}</small></div>
      <div class="wl-f" role="group" aria-labelledby="wl-cme"><span id="wl-cme">${hgT('cmdc.entity')}</span>
      <span class="hs-s lk-url">${H.icon('mdi:form-textbox')}<input class="hs-in" name="wl-cmdent" list="wl-cmdents" value="${H.esc(cur)}" placeholder="input_text.nuvio_tablet" autocomplete="off" spellcheck="false" aria-label="${hgT('cmdc.entity')}"></span>
      <datalist id="wl-cmdents">${en.map((e) => `<option value="${H.esc(e)}">${H.esc(HGDeviceCmd.name(h, e))}</option>`).join('')}</datalist>
      <small class="wl-warn">${H.esc(h && h.user && h.user.is_admin ? hgT('cmdc.entity_hint') : hgT('cmdc.entity_hint_noadmin'))}</small></div>
      ${c.on && V.length ? `<div class="wl-f" role="group" aria-labelledby="wl-cmt"><span id="wl-cmt">${hgT('cmdc.test')}</span><div class="wl-seg" style="--n:${Math.min(3, V.length)}">
        ${V.slice(0, 3).map(([p, t]) => `<button type="button" data-hge="wl-cmdnav" data-v="${H.esc(p)}">${hgT('cmdc.show_view', { view: H.esc(t) })}</button>`).join('')}</div></div>` : ''}
      <small class="wl-warn">${hgT('cmdc.sender_note')}</small>`;
  },
  wire(p, S) {
    const dn = S.querySelector('[name=wl-devname]'); if (dn) { dn.addEventListener('change', () => { const v = HGDeviceCmd.setDevice(dn.value); dn.value = v; HGDeviceCmd.sub(true); p._eToast(v ? hgT('cmdc.device_saved', { device: v }) : hgT('cmdc.device_cleared')); return p._eLook(); });
      dn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); dn.dispatchEvent(new Event('change')); } }); }
    const ce = S.querySelector('[name=wl-cmdent]'); if (ce) { ce.addEventListener('change', () => { const v = HGDeviceCmd.setEntity(ce.value); ce.value = v; p._eToast(v ? hgT('cmdc.entity_saved', { entity: v }) : hgT('cmdc.entity_cleared')); return p._eLook(); });
      ce.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ce.dispatchEvent(new Event('change')); } }); }
  },
  act(p, b, a) { if (!HGWall.admin(p)) return false;
    if (a === 'wl-cmdnav') { HGWall.hass = HGWall.hass || p._hass; HGWall.page = HGWall.page || p; HGDeviceCmd.fire('navigate', b.dataset.v); return true; }
    return false; },
};
window.HGDeviceCmd = HGDeviceCmd;
