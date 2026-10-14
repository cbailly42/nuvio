/* --- mapa: natywna karta HA w szklanym kontenerze --- */
class HGMapCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(c) {
    this._config = Object.assign({ title: hgTr('Mapa', 'Map'), icon: 'mdi:map-outline', entities: [], theme_mode: 'dark', hours_to_show: 0 }, c);
    const sr = this.shadowRoot;
    sr.innerHTML = `<style>${HG_BASE}${U(`
ha-card.glass{ display:flex; flex-direction:column; padding:var(--s2) var(--s2) var(--s2); gap:var(--s2); }
.hd{ padding:0 2u; }
.mw{ position:relative; flex:1; min-height:220u; border-radius:var(--r-sm); overflow:hidden; background:#e9e5df;
  --ha-card-border-radius: 0; --ha-card-box-shadow: none; --ha-card-border-width: 0; }
.mw > *{ position:absolute; inset:0; display:block; height:100%; }
`)}</style><ha-card class="glass"><div class="hd">${H.icon(this._config.icon, 'ic')}<span class="tt">${H.esc(this._config.title)}</span><span class="sp"></span><span class="note">${this._config.entities.filter((e) => String(e).startsWith('person.')).length} ${hgTr('os.', 'people')} · ${this._config.entities.filter((e) => String(e).startsWith('zone.')).length} ${hgTr('strefy', 'zones')}</span></div><div class="mw"></div></ha-card>`;
    this._mw = sr.querySelector('.mw');
    this._make();
  }
  async _make() {
    const c = this._config;
    // theme_mode: auto -> jasna/ciemna mapa razem ze schematem dashboardu (HGTheme), przełączana na żywo
    const tm = c.theme_mode === 'auto' ? (typeof HGTheme !== 'undefined' && HGTheme.dark ? 'dark' : 'light') : c.theme_mode;
    this._tm = tm;
    if (this._map) { this._map.remove(); this._map = null; }
    const conf = { type: 'map', entities: c.entities.map((e) => (typeof e === 'string' ? { entity: e } : e)), theme_mode: tm, hours_to_show: c.hours_to_show, fit_zones: true };
    const mk = this._mk = (this._mk || 0) + 1;
    const helpers = window.loadCardHelpers ? await window.loadCardHelpers() : null;
    if (mk !== this._mk) return;
    let el;
    try { el = helpers.createCardElement(conf); } catch (e) { this._mw.innerHTML = `<div class="ph"><b>${hgTr('Mapa niedostępna', 'Map unavailable')}</b>${H.esc(e.message)}</div>`; return; }
    el.layout = 'grid'; el.setAttribute('layout', 'grid');
    this._map = el; if (this._hass) el.hass = this._hass;
    this._mw.appendChild(el);
    // wewnętrzna karta mapy ma własny współczynnik proporcji – wymuszamy wypełnienie kontenera
    const fix = () => {
      const r = el.shadowRoot; if (!r) return false;
      if (!r.getElementById('hg-fill')) { const s = document.createElement('style'); s.id = 'hg-fill';
        s.textContent = 'ha-card{height:100%!important;border-radius:0!important;border:0!important;box-shadow:none!important} #root{height:100%!important;padding-bottom:0!important} ha-map{position:absolute;inset:0;height:100%!important}';
        r.appendChild(s); }
      return true;
    };
    let n = 0; const t = setInterval(() => { if (fix() || ++n > 40) clearInterval(t); }, 150);
  }
  set hass(h) { this._hass = h; if (this._map) this._map.hass = h; }
  get hass() { return this._hass; }
  connectedCallback() {
    this._onScheme = this._onScheme || (() => { if (this._config && this._config.theme_mode === 'auto' && this._tm !== (HGTheme.dark ? 'dark' : 'light')) this._make(); });
    window.addEventListener('hg-scheme', this._onScheme); this._onScheme();
  }
  disconnectedCallback() { window.removeEventListener('hg-scheme', this._onScheme); }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, rows: 6 }; }
}
hgReg('hg-map-card', HGMapCard, 'Home Glass – Mapa', 'Natywna mapa HA w szklanej ramce');
