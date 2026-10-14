/* ===================== STOS: kilka kart w jednym szkle, pionowo albo poziomo (karty Nuvio i zwykłe karty HA) ===================== */
/* tworzenie karty potomnej: custom:<tag> od razu, gdy element jest już zarejestrowany; karty HA przez loadCardHelpers */
const hgMakeCard = (cfg, done) => { const t = String((cfg && cfg.type) || '');
  const mk = (tag) => { const el = document.createElement(tag); try { el.setConfig(cfg); } catch (e) { el.textContent = String(e.message || e); } return el; };
  if (t.startsWith('custom:')) { const tag = t.slice(7); if (customElements.get(tag)) return done(mk(tag)); customElements.whenDefined(tag).then(() => done(mk(tag))); return; }
  if (window.loadCardHelpers) window.loadCardHelpers().then((hl) => done(hl.createCardElement(cfg))).catch(() => {});
  else customElements.whenDefined('hui-' + t + '-card').then(() => done(mk('hui-' + t + '-card'))); };
class HGStackCard extends HGBase {
  static getStubConfig(h) { return { cards: [{ type: 'custom:nuvio-toggle-card', ...HGToggleCard.getStubConfig(h) }, { type: 'custom:nuvio-progress-card', ...HGProgressCard.getStubConfig(h) }] }; }
  defaults() { return { cards: [], direction: 'vertical', glass: true, title: null }; }
  css() { return HG_NV_CSS + U(`
ha-card.glass{ gap:0; padding:var(--s1) 0; }
ha-card.flat{ background:none; box-shadow:none; padding:0; gap:var(--s2); }
.nv-hd{ padding:var(--s1) var(--s3) 0; }
.bd{ display:flex; flex-direction:column; flex:1; min-height:0; } .h .bd{ flex-direction:row; }
.sl{ min-width:0; flex:1 1 0; position:relative; }
.glass:not(.flat) .sl{ --hg-glass-sheen:none; --hg-glass-lite:transparent; --hg-glass-bg:transparent; --hg-edge:0 0 0 transparent; --hg-card-sh:none; --hg-card-bf:none; --hg-card-under:none;
  --ha-card-background:transparent; --ha-card-box-shadow:none; --ha-card-border-width:0; }
.glass:not(.flat) .sl + .sl::before{ content:''; position:absolute; left:var(--s3); right:var(--s3); top:0; height:1px; background:currentColor; opacity:.08; }
.h.glass:not(.flat) .sl + .sl::before{ left:0; right:auto; top:var(--s2); bottom:var(--s2); width:1px; height:auto; }
.flat .bd{ gap:var(--s2); }
.bd.nv-in > .sl{ animation: nvStk var(--hg-t-slow) var(--hg-ease-out) both; } .bd.nv-in > .sl:nth-child(2){ animation-delay: var(--hg-t-stagger, 30ms); } .bd.nv-in > .sl:nth-child(3){ animation-delay: calc(var(--hg-t-stagger, 30ms) * 2); }
@keyframes nvStk{ from{ opacity:0; transform: translateY(6px); } } @media (prefers-reduced-motion: reduce){ .bd.nv-in > .sl{ animation:none; } }
@container (max-width: 420px){ .h .bd{ flex-direction:column; } .h.glass:not(.flat) .sl + .sl::before{ left:var(--s3); right:var(--s3); top:0; bottom:auto; width:auto; height:1px; } }
`); }
  cards() { return this._config.cards || []; }
  key() { return 's'; }
  head() { return this._config.title ? hgUI.header(this._config.title) : ''; }
  render() { const c = this._config, L = this.cards();
    return `<ha-card class="glass ${c.glass === false ? 'flat' : ''} ${c.direction === 'horizontal' ? 'h' : ''}">${this.head()}<div class="bd ${this._anim ? 'nv-in' : ''}" data-key="bd-${this.key()}">${L.map((x, i) => `<div class="sl" data-own data-key="${this.key()}-${i}"></div>`).join('')}${L.length ? '' : `<span class="nv-empty" style="padding:var(--s3)">${hgTr('Dodaj karty do stosu', 'Add cards to the stack')}</span>`}</div></ha-card>`; }
  /* karty potomne żyją między aktualizacjami (morph zostawia gniazda data-own), tworzone raz na konfigurację */
  afterRender() { this._kids = this._kids || new Map(); const L = this.cards(), h = this._hass;
    this.$.querySelectorAll('.sl[data-own]').forEach((slot, i) => { const cfg = L[i]; if (!cfg) return; const sig = this.key() + i + JSON.stringify(cfg); let el = this._kids.get(sig);
      const put = (x) => { if (x.parentElement !== slot) { slot.textContent = ''; slot.appendChild(x); } x.hass = this._hass; };
      if (el) return put(el); this._kids.set(sig, null); hgMakeCard(cfg, (x) => { this._kids.set(sig, x); if (this.$.contains(slot)) put(x); }); });
    for (const el of this._kids.values()) if (el && el.parentElement) el.hass = h; }
  set hass(h) { this._hass = h; window.__hgHass = h; if (typeof HGTheme !== 'undefined') HGTheme.pick(h); this._update(); if (this._kids) for (const el of this._kids.values()) if (el && el.parentElement) el.hass = h; }
  get hass() { return this._hass; }
  getCardSize() { return this.cards().length * 2 || 1; }
  getGridOptions() { return { columns: 6, rows: 'auto' }; }
}
hgReg('hg-stack-card', HGStackCard, hgTr('Nuvio – Stos', 'Nuvio – Stack'), hgTr('Kilka kart w jednym szkle, pionowo albo poziomo', 'Several cards in one glass, vertical or horizontal'));
