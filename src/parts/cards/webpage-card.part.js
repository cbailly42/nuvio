/* ===================== STRONA WWW: dowolny adres w ramce (jak karta iframe w HA), proporcje albo stała wysokość ===================== */
class HGWebpageCard extends HGBase {
  static getStubConfig() { return { url: 'https://www.home-assistant.io', aspect_ratio: '16:9' }; }
  defaults() { return { url: null, title: null, aspect_ratio: '16:9', height: null }; }
  ents() { return []; }
  css() { return HG_NV_CSS + U(`
.fr{ position:relative; width:100%; border-radius:var(--r-md); overflow:hidden; background:var(--hg-inner-bg); flex:1; min-height:120u; }
.fr iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; display:block; background:transparent; }
`); }
  url() { const u = String(this._config.url || '').trim(); return /^(https?:\/\/|\/)/i.test(u) ? u : ''; }
  render() { const c = this._config, u = this.url();
    if (!u) return `<ha-card class="glass"><span class="nv-empty">${hgT('cards.webpage.enter_a_page_address')}</span></ha-card>`;
    const ar = String(c.aspect_ratio || '').match(/^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/), st = c.height ? `height:${Math.max(80, +c.height || 0)}px` : ar ? `aspect-ratio:${ar[1]} / ${ar[2]}` : 'aspect-ratio:16 / 9';
    return `<ha-card class="glass">${c.title ? hgUI.header(c.title, { icon: 'mdi:web', right: hgUI.iconBtn('mdi:open-in-new', 'open', hgT('cards.webpage.open_in_a_new'), { bare: true, size: 'sm' }) }) : ''}<div class="fr" data-own style="${st}"></div></ha-card>`; }
  /* ramka powstaje raz na adres: aktualizacje stanu jej nie przeładowują */
  afterRender() { const fr = this.$.querySelector('.fr'), u = this.url(); if (!fr || !u) return; const f = fr.querySelector('iframe'); if (f && f.dataset.u === u) return;
    const n = document.createElement('iframe'); n.dataset.u = u; n.src = u; n.loading = 'lazy'; n.referrerPolicy = 'no-referrer'; n.title = this._config.title || u;
    n.setAttribute('allow', 'fullscreen'); fr.textContent = ''; fr.appendChild(n); }
  onAct(a) { if (a === 'open') window.open(this.url(), '_blank', 'noopener'); }
  getGridOptions() { return { columns: 12, rows: 4 }; }
}
hgReg('hg-webpage-card', HGWebpageCard, hgTLazy('cards.webpage.picker_name'), hgTLazy('cards.webpage.picker_description'));
