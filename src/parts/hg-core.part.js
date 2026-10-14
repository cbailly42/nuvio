/* Home Glass – glassmorphism dashboard components for Home Assistant
 * Plik: /local/home-glass/home-glass.js   (generowany z www/*.part.js przez build.py)
 * Karty: hg-page, hg-energy-card, hg-ac-card, hg-light-card, hg-switch-card,
 *        hg-solar-card, hg-bars-card, hg-media-card, hg-person-card, hg-link-card
 */
/* binary_sensor: stany wg device_class (zapas, gdy HA nie zwróci tłumaczenia) */
const HG_BIN_PL = { battery: ['niski', 'normalny'], battery_charging: ['ładowanie', 'nie ładuje'], carbon_monoxide: ['wykryto', 'brak'], cold: ['zimno', 'normalnie'], connectivity: ['połączono', 'rozłączono'],
  door: ['otwarte', 'zamknięte'], garage_door: ['otwarte', 'zamknięte'], gas: ['wykryto', 'brak'], heat: ['gorąco', 'normalnie'], light: ['wykryto światło', 'brak światła'], lock: ['otwarte', 'zamknięte'],
  moisture: ['mokro', 'sucho'], motion: ['wykryto', 'brak'], moving: ['w ruchu', 'nieruchome'], occupancy: ['wykryto', 'brak'], opening: ['otwarte', 'zamknięte'], plug: ['podłączono', 'odłączono'],
  power: ['wykryto', 'brak'], presence: ['w domu', 'poza domem'], problem: ['problem', 'ok'], running: ['działa', 'nie działa'], safety: ['niebezpiecznie', 'bezpiecznie'], smoke: ['wykryto', 'brak'],
  sound: ['wykryto', 'brak'], tamper: ['naruszenie', 'brak'], update: ['dostępna aktualizacja', 'aktualne'], vibration: ['wykryto', 'brak'], window: ['otwarte', 'zamknięte'] };
const HG_VER = '1.0.0';
const HG_BUILD = '__HG_BUILD__';   /* build.py wstawia hash paczki = ?v= zasobu */
/* kontrola wersji: zasób Lovelace wskazuje nowszy ?v= niż wczytany kod (stara karta przeglądarki, kiosk, cache aplikacji)
   -> mały toast „Nowa wersja – odśwież”. Sprawdzane przy starcie i po powrocie do karty (najwyżej co 5 min). */
const HGVer = window.__hgVer || {
  t: 0, shown: false,
  async check(hass, force) {
    if (!hass || !hass.callWS || this.shown || window.__hgNoVer || HG_BUILD.startsWith('__') || (window.__hgLocal && !window.__hgVerTest)) return;   // testy lokalne: kod celowo nowszy niż zasób
    if (!force && Date.now() - this.t < 300000) return;
    this.t = Date.now();
    try {
      const res = await hass.callWS({ type: 'lovelace/resources' });
      const r = (res || []).find((x) => /home-glass\.js/.test(x.url || ''));
      const v = r && (/[?&]v=([^&]+)/.exec(r.url) || [])[1];
      if (v && v !== HG_BUILD) this.toast(v);
    } catch (e) { /* brak uprawnień admina do listy zasobów -> bez kontroli */ }
  },
  toast(v) {
    if (this.shown || document.getElementById('hg-ver-toast')) return;
    this.shown = true;
    const d = document.createElement('div'); d.id = 'hg-ver-toast'; d.setAttribute('role', 'status');
    const dark = document.documentElement.getAttribute('data-hg-scheme') === 'dark';
    d.style.cssText = `position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:100000;display:flex;align-items:center;gap:12px;
      padding:8px 8px 8px 16px;border-radius:24px;font:400 14px/1.2 'HG DM Sans',system-ui,sans-serif;box-shadow:var(--hg-sh);
      -webkit-backdrop-filter:blur(20px) saturate(140%);backdrop-filter:blur(20px) saturate(140%);
      background:${dark ? 'rgba(40,40,44,.88)' : 'rgba(255,255,255,.9)'};color:${dark ? '#fff' : '#1C1C1E'};border:1px solid ${dark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.7)'}`;
    d.innerHTML = `<span>${hgTr('Nowa wersja panelu', 'New dashboard version')}</span><button type="button" data-r style="font:inherit;font-weight:600;border:0;border-radius:16px;padding:0 16px;height:40px;cursor:pointer;background:${dark ? '#fff' : '#1C1C1E'};color:${dark ? '#1C1C1E' : '#fff'}">${hgTr('Odśwież', 'Reload')}</button><button type="button" data-x aria-label="${hgTr('Zamknij', 'Close')}" style="border:0;background:none;color:inherit;opacity:.6;cursor:pointer;padding:6px;display:flex"><ha-icon icon="mdi:close" style="--mdc-icon-size:18px;width:18px;height:18px;pointer-events:none"></ha-icon></button>`;
    d.querySelector('[data-r]').onclick = () => location.reload();
    d.querySelector('[data-x]').onclick = () => d.remove();
    document.body.appendChild(d);
    console.info('home-glass: wczytany', HG_BUILD, 'zasób', v);
  },
};
window.__hgVer = HGVer;
(function hgFonts() {
  if (document.getElementById('hg-fonts')) return;
  const s = document.createElement('style');
  s.id = 'hg-fonts';
  const b = HG_ASSET + 'nuvio-font-';
  s.textContent = `
@font-face{font-family:'HG DM Sans';font-style:normal;font-weight:100 700;font-display:swap;src:url(${b}dmsans-latin-ext.woff2) format('woff2')${typeof hgCdn === 'function' && hgCdn(b + 'dmsans-latin-ext.woff2') ? `, url(${hgCdn(b + 'dmsans-latin-ext.woff2')}) format('woff2')` : ''};unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF;}
@font-face{font-family:'HG DM Sans';font-style:normal;font-weight:100 700;font-display:swap;src:url(${b}dmsans-latin.woff2) format('woff2')${typeof hgCdn === 'function' && hgCdn(b + 'dmsans-latin.woff2') ? `, url(${hgCdn(b + 'dmsans-latin.woff2')}) format('woff2')` : ''};unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}`;
  document.head.appendChild(s);
})();

/* "12u" -> calc(var(--k) * 12): jednostka skalowana względem referencji (912x597) */
/* słownik zapasowy stanów (surowe wartości i angielskie formy z HA bez tłumaczenia) */
const hgStN = (v) => String(v).trim().toLowerCase().replace(/[\s-]+/g, '_');
const HG_PL = {
  normal: 'normalny', fault: 'błąd', standby: 'czuwanie', waiting: 'oczekiwanie', idle: 'bezczynny', charging: 'ładowanie', charged: 'naładowany', discharging: 'rozładowanie',
  cleaning: 'sprzątanie', docked: 'w stacji', returning: 'powrót do stacji', returning_home: 'powrót do stacji', paused: 'wstrzymany', error: 'błąd', mowing: 'koszenie',
  online: 'online', offline: 'offline', connected: 'połączony', disconnected: 'rozłączony', home: 'w domu', not_home: 'poza domem', away: 'poza domem',
  on: 'wł.', off: 'wył.', open: 'otwarte', closed: 'zamknięte', opening: 'otwieranie', closing: 'zamykanie', locked: 'zamknięty', unlocked: 'otwarty', jammed: 'zablokowany',
  unavailable: 'niedostępne', unknown: 'nieznany', playing: 'odtwarza', buffering: 'buforowanie', heating: 'grzanie', cooling: 'chłodzenie', drying: 'osuszanie',
  fan: 'wentylator', fan_only: 'wentylator', heat: 'grzanie', cool: 'chłodzenie', dry: 'osuszanie', auto: 'auto', heat_cool: 'grzanie/chłodzenie', preheating: 'podgrzewanie',
  detected: 'wykryto', clear: 'brak', running: 'pracuje', stopped: 'zatrzymany', sleeping: 'uśpiony', sleep: 'uśpiony', ok: 'OK', low: 'niski', medium: 'średni', high: 'wysoki',
  above_horizon: 'nad horyzontem', below_horizon: 'pod horyzontem', recording: 'nagrywa', streaming: 'transmisja', armed: 'uzbrojony', disarmed: 'rozbrojony',
  pending: 'oczekiwanie', starting: 'uruchamianie', finished: 'zakończono', completed: 'zakończono', ready: 'gotowy', working: 'pracuje', busy: 'zajęty',
  upgrading: 'aktualizacja', provisioning: 'konfiguracja', heartbeat_missed: 'brak odpowiedzi', adopting: 'adopcja', firmware_mismatch: 'niezgodne oprogramowanie', isolated: 'odizolowany',
  sunny: 'słonecznie', cloudy: 'pochmurno', partlycloudy: 'częściowe zachmurzenie', rainy: 'deszcz', clear_night: 'pogodna noc', none: 'brak', true: 'tak', false: 'nie', yes: 'tak', no: 'nie',
};
const U = (css) => css.replace(/(-?\d+(?:\.\d+)?)u\b/g, (m, n) => `calc(var(--k) * ${n})`);

/* ukryta karta przeglądarki: wstrzymaj animacje ciągłe (zmienna dziedziczona przez wszystkie shadow DOM) */
(function hgPlay() {
  const f = () => document.documentElement.style.setProperty('--hg-play', document.hidden ? 'paused' : 'running');
  document.addEventListener('visibilitychange', f); f();
})();

/* język interfejsu kart (pl / en): wybór z kreatora (dane użytkownika), inaczej język profilu HA.
   hgTr('tekst PL', 'text EN') – para tłumaczeń w miejscu użycia; HG_LOC() – locale do liczb i dat */
const hgCurLang = () => { const w = window.__hgL && window.__hgL.data && window.__hgL.data.wiz; return hgLang(window.__hgHass, (w && w.lang) || window.__hgLang); };
const hgTr = (pl, en) => (hgCurLang() === 'en' ? en : pl);
const HG_LOC = () => (hgCurLang() === 'en' ? 'en-GB' : 'pl-PL');
const H = {
  st: (hass, e) => (hass && e ? hass.states[e] : undefined),
  ok: (s) => !!s && !['unavailable', 'unknown'].includes(s.state),
  num: (hass, e) => { const s = H.st(hass, e); const v = s ? parseFloat(s.state) : NaN; return isFinite(v) ? v : null; },
  esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  /* adres do CSS url('…') w atrybucie style: znaki zamykające url() / cudzysłów kodowane procentowo, potem escape HTML */
  cssUrl: (u) => H.esc(String(u ?? '').replace(/['"()\\\s]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))),
  fire: (node, type, detail) => node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true })),
  navigate: (path) => {
    const nav = () => { history.pushState(null, '', path); window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } })); };
    return typeof HGNav !== 'undefined' ? HGNav.go(path, nav) : nav();
  },
  /* jedyne miejsce wywołań usług; window.__hgDryRun=true -> tylko zapis (testy bez przełączania urządzeń) */
  call: (hass, domain, service, data) => {
    if (window.__hgDryRun) { (window.__hgCalls = window.__hgCalls || []).push([domain, service, data]); return Promise.resolve(); }
    return hass.callService(domain, service, data);
  },
  /* wibracja: aplikacja HA (zdarzenie „haptic” na window, jak forwardHaptic we frontendzie HA), w przeglądarce navigator.vibrate */
  haptic: (t = 'selection') => {
    try { window.dispatchEvent(new CustomEvent('haptic', { detail: t })); } catch (e) { /* */ }
    const app = window.externalApp || (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.externalBus);
    if (!app && navigator.vibrate && matchMedia('(pointer: coarse)').matches) try { navigator.vibrate(t === 'selection' ? 6 : t === 'heavy' ? 30 : 14); } catch (e) { /* */ }
  },
  icon: (i, cls = '') => `<ha-icon class="${cls}" icon="${H.esc(i)}"></ha-icon>`,
  name: (hass, e, fb) => { const s = H.st(hass, e); return (s && s.attributes.friendly_name) || fb || e; },
  action(node, hass, a) {
    if (!a) return;
    if (window.__hgDryRun && !a.navigate && !a.back) { (window.__hgActions = window.__hgActions || []).push(a); }
    if (a.navigate) return H.navigate(a.navigate);
    if (a.url) return a.url.startsWith('/') ? H.navigate(a.url) : window.open(a.url, '_blank', 'noopener');
    if (a.more_info) return H.fire(node, 'hass-more-info', { entityId: a.more_info });
    if (a.notifications) return H.fire(node, 'hass-show-notifications');
    if (a.quickbar) {
      // HA czyta e.composedPath() -> zdarzenie klawiatury musi być w trakcie dispatchu
      const fwd = (ev) => window.dispatchEvent(new CustomEvent('hass-quick-bar-trigger', { detail: ev }));
      node.addEventListener('keydown', fwd, { once: true });
      node.dispatchEvent(new KeyboardEvent('keydown', { key: a.quickbar, bubbles: false, composed: false }));
      return;
    }
    if (a.back) return history.length > 1 ? history.back() : H.navigate(a.fallback || '/');
    if (a.service) { const [d, s] = a.service.split('.'); return H.call(hass, d, s, a.data || {}); }
  },
  sig: (hass, ents) => ents.map((e) => { const s = H.st(hass, e); return s ? e + s.state + JSON.stringify(s.attributes) : e + '-'; }).join('|'),
  fmt: (v, d = 1) => (v == null ? '–' : Number(v).toLocaleString(HG_LOC(), { maximumFractionDigits: d, minimumFractionDigits: 0 })),
  get DAYS() { return hgTr(['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']); },
  stateLabel: (s) => hgCurLang() === 'en' ? ({ on: 'On', off: 'Off', unavailable: 'unavailable', unknown: 'unknown', playing: 'Playing', paused: 'Paused', idle: 'Idle',
    standby: 'Standby', buffering: 'Buffering', home: 'Home', not_home: 'Away', disarmed: 'Disarmed', armed_home: 'Armed (home)', armed_away: 'Armed (away)', armed_night: 'Armed (night)',
    armed_vacation: 'Armed (vacation)', arming: 'Arming', pending: 'Pending', triggered: 'Triggered!' }[s] || String(s).replace(/_/g, ' ')) : ({ on: 'Włączone', off: 'Wyłączone', unavailable: 'niedostępne', unknown: 'nieznany', playing: 'Odtwarza', paused: 'Pauza', idle: 'Bezczynny',
    standby: 'Czuwanie', buffering: 'Buforowanie', home: 'W domu', not_home: 'Poza domem', disarmed: 'Rozbrojony', armed_home: 'Uzbrojony (w domu)',
    armed_away: 'Uzbrojony (poza domem)', armed_night: 'Uzbrojony (noc)', armed_vacation: 'Uzbrojony (urlop)', arming: 'Uzbrajanie', pending: 'Oczekiwanie', triggered: 'Alarm!' }[s] || HG_PL[hgStN(s)] || s),
  /* stan encji po polsku: tłumaczenia HA (formatEntityState / formatEntityAttributeValue), a gdy integracja ich nie ma – słownik HG_PL; małe litery do wstawiania w zdania */
  t: (h, so, attr) => {
    const en = hgCurLang() === 'en';
    if (!so) return en ? 'unavailable' : 'niedostępne';
    const raw = attr ? so.attributes[attr] : so.state;
    if (raw == null) return '';
    let r = String(raw); h = h || window.__hgHass;
    try { r = attr ? (h && h.formatEntityAttributeValue ? h.formatEntityAttributeValue(so, attr) : r) : (h && h.formatEntityState ? h.formatEntityState(so) : r); } catch (e) { /* starsze HA */ }
    if (en) return (r === String(raw) ? r.replace(/_/g, ' ') : r).replace(/^[A-Z][a-z]+$/, (x) => x.toLowerCase());   // EN: tłumaczenie HA, bez słownika PL
    if (!attr && so.entity_id && so.entity_id.startsWith('binary_sensor.') && (raw === 'on' || raw === 'off')) {
      if (r !== raw) return r.toLowerCase();                                    // tłumaczenie HA zależne od device_class
      const bm = HG_BIN_PL[so.attributes.device_class]; if (bm) return bm[raw === 'on' ? 0 : 1];
    }
    const pl = HG_PL[hgStN(raw)] || HG_PL[hgStN(r)];
    if (pl) return pl;
    return /^[A-Z][a-z]/.test(r) && !/\d/.test(r) && r === String(raw) ? r.toLowerCase() : r;
  },
  /* samodzielna wartość (kafel/wiersz): wielka litera na początku */
  T: (h, so, attr) => { const r = H.t(h, so, attr); return r && r !== 'wł.' && r !== 'wył.' ? r.charAt(0).toUpperCase() + r.slice(1) : r === 'wł.' ? 'Włączone' : r === 'wył.' ? 'Wyłączone' : r; },
  dayKey: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
};
window.__hg = H;

/* zamrożenie przerysowań na czas animacji panelu (ukryj/pokaż) – po zwolnieniu zaległe karty odświeżają się raz */
const HG_FREEZE = window.__hgFreezeObj || (window.__hgFreezeObj = { on: false, q: new Set(),
  release() { this.on = false; const q = [...this.q]; this.q.clear(); for (const c of q) if (c.isConnected) c._doUpdate(false); } });
class HGBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    hgSelWatch(this.shadowRoot);
    this._sig = null;
    const down = () => { this._touching = true; clearTimeout(this._tt); this._tt = setTimeout(up, 1500); };
    const up = () => { clearTimeout(this._tt); this._tt = setTimeout(() => { this._touching = false; if (this._pendingUpd) { this._pendingUpd = false; this._update(true); } }, 60); };
    this.shadowRoot.addEventListener('pointerdown', down, { passive: true });
    this.shadowRoot.addEventListener('pointerup', up, { passive: true });
    this.shadowRoot.addEventListener('pointercancel', up, { passive: true });
    this.shadowRoot.addEventListener('click', (e) => {
      const t = e.composedPath().find((n) => n.dataset && n.dataset.act);
      if (!t || t.hasAttribute('disabled')) return;
      e.stopPropagation();
      this.onAct(t.dataset.act, t, e);
    });
  }
  defaults() { return {}; }
  setConfig(c) {
    if (!c) throw new Error(hgTr('Brak konfiguracji', 'Missing configuration'));
    this._config = Object.assign({}, this.defaults(), c);
    this._sig = null; this._entsC = null; this._prevStates = null; this._html = null;
    if (!this._styled) {
      const st = document.createElement('style');
      st.textContent = HG_BASE + (typeof hgUI !== 'undefined' ? hgUI.css() : '') + this.css();
      this.shadowRoot.appendChild(st);
      this.$ = document.createElement('div');
      this.$.className = 'root';
      this.$.style.height = '100%';
      this.shadowRoot.appendChild(this.$);
      this._styled = true;
    }
    if (this._hass) this._update();
  }
  set hass(h) { this._hass = h; window.__hgHass = h; if (typeof HGTheme !== 'undefined') HGTheme.pick(h); this._update(); }
  get hass() { return this._hass; }
  ents() { return [this._config.entity].filter(Boolean); }
  /* szybka ścieżka: HA podmienia obiekt stanu tylko dla zmienionej encji -> porównanie referencji, bez JSON */
  _changed() {
    const ents = this._entsC || (this._entsC = this.ents());
    const st = this._hass.states, prev = this._prevStates;
    const ex = JSON.stringify(this._extraSig ? this._extraSig() : '');
    let ch = !prev || ex !== this._prevEx;
    if (!ch) for (let i = 0; i < ents.length; i++) if (st[ents[i]] !== prev[i]) { ch = true; break; }
    if (ch) { this._prevStates = ents.map((e) => st[e]); this._prevEx = ex; }
    return ch;
  }
  /* rAF: kilka zmian hass w jednej klatce -> jedno przerysowanie; pierwsze malowanie synchronicznie (View Transition czeka na gotowy widok).
     Odłączona karta (ukryty widok w pamięci HA) nie liczy niczego; nadrabia przy ponownym podłączeniu. */
  _update(force) {
    if (!this._config || !this._hass || this._busy) return;
    if (this._html != null && !this.isConnected) { this._stale = true; return; }
    if (this._html != null && !force) {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this._doUpdate(false); });
      return;
    }
    this._doUpdate(force);
  }
  connectedCallback() { if (this._stale) { this._stale = false; this._update(true); } }
  _doUpdate(force) {
    if (!this._config || !this._hass || this._busy) return;
    if (HG_FREEZE.on && !this._hgPv) { HG_FREEZE.q.add(this); return; }           // panel w trakcie animacji: przerysuj po jej końcu
    if (!force && !this._changed()) return;
    // nie podmieniaj DOM pod palcem: przerysuj dopiero po puszczeniu
    if (this._touching) { this._pendingUpd = true; return; }
    const html = this.render();
    if (html === this._html) return;      // treść bez zmian (np. zmienił się tylko atrybut GPS) -> zero pracy DOM
    const first = this._html == null; this._html = html;
    /* na żywo: łatanie istniejących węzłów (ui/morph). Węzły przeżywają aktualizację, więc afterRender musi być idempotentne:
       nasłuchiwanie podpina się raz na węzeł przez this._once(el), a resztę (wartości, obserwatory) może powtarzać bez szkody. */
    if (first || this.constructor.noMorph || typeof hgMorph === 'undefined') this.$.innerHTML = html;
    else hgMorph(this.$, html);
    if (this.afterRender) this.afterRender();
  }
  rerender() { this._prevStates = null; this._update(true); }
  /* true tylko za pierwszym razem dla danego węzła i klucza: podpinanie nasłuchiwania w afterRender bez dublowania po łataniu */
  _once(el, k = 'b') { if (!el) return false; const s = el.__hgOnce || (el.__hgOnce = new Set()); if (s.has(k)) return false; s.add(k); return true; }
  onAct() {}
  css() { return ''; }
  render() { return ''; }
  getCardSize() { return 3; }
  getGridOptions() { return { columns: 6, rows: 3 }; }
  toggleHtml(on, act, disabled, label) {
    return `<button class="tg ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${H.esc(label || hgTr('przełącz', 'toggle'))}" data-act="${act}" ${disabled ? 'disabled' : ''}><i></i></button>`;
  }
}
window.customCards = window.customCards || [];
const hgReg = (tag, cls, name, desc) => {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  if (!window.customCards.find((c) => c.type === tag)) window.customCards.push({ type: tag, name, description: desc, preview: false });
};
