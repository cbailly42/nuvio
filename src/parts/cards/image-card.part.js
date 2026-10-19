/* --- obraz / strona (iframe) --- */
const hgSafeUrl = (u) => (/^(https?:\/\/|\/local\/|\/api\/|\/hacsfiles\/|\/media\/)/.test(String(u || '').trim()) ? String(u).trim() : '');
class HGImageCard extends HGBase {
  defaults() { return { url: '', mode: 'image', title: null, fit: 'cover', ratio: '16/9', refresh: 0 }; }
  ents() { return []; }
  css() { return HG_G14_CSS + U(`ha-card.glass{ padding:0; overflow:hidden; gap:0; } .fr{ position:relative; flex:1; min-height:120px; aspect-ratio:var(--ar, 16/9); } .fr img, .fr iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; display:block; } .ttl{ position:absolute; left:12px; bottom:10px; padding:4px 10px; border-radius:999px; font-size:12.5px; font-weight:600; color:#fff; background:rgba(0,0,0,.42); -webkit-backdrop-filter:var(--hg-bfo, blur(8px)); backdrop-filter:var(--hg-bfo, blur(8px)); } .ph{ padding:14px; }`); }
  connectedCallback() { super.connectedCallback(); clearInterval(this._ti); const r = +((this._config || {}).refresh) || 0; if (r >= 5) this._ti = setInterval(() => { this._bust = Date.now(); this.rerender(); }, r * 1000); }
  disconnectedCallback() { clearInterval(this._ti); }
  render() { const c = this._config, u = hgSafeUrl(c.url), ar = /^\d+(\.\d+)?\/\d+(\.\d+)?$/.test(String(c.ratio || '')) ? c.ratio : '16/9';
    if (!u) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Podaj adres', 'Enter an address')}</b>${hgTr('https://… lub /local/…', 'https://… or /local/…')}</div></ha-card>`;
    const src = this._bust && c.mode !== 'iframe' ? u + (u.includes('?') ? '&' : '?') + '_t=' + this._bust : u;
    return `<ha-card class="glass"><div class="fr" style="--ar:${ar}">${c.mode === 'iframe' ? `<iframe src="${H.esc(src)}" title="${H.esc(c.title || hgTr('Strona', 'Page'))}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>` : `<img src="${H.esc(src)}" alt="${H.esc(c.title || '')}" loading="lazy" decoding="async" style="object-fit:${c.fit === 'contain' ? 'contain' : 'cover'}">`}${c.title ? `<span class="ttl">${H.esc(c.title)}</span>` : ''}</div></ha-card>`; }
  getGridOptions() { return { columns: 6, rows: 4 }; }
}
hgReg('hg-image-card', HGImageCard, hgTr('Home Glass – Obraz lub strona', 'Home Glass – Image or page'), hgTr('Zdjęcie, wykres z adresu albo strona w ramce', 'Picture, chart from a URL or a page in a frame'));
