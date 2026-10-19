/* ===================== POWITANIE (hero): „Hej, Krzysztof!” + hasło, opcjonalnie zdjęcie i stan encji ===================== */
class HGHeroCard extends HGBase {
  static getStubConfig() { return {}; }
  defaults() { return { title: null, subtitle: null, image: null, entity: null, glass: false }; }
  css() { return HG_NV_CSS + U(`
ha-card.hero{ background:none; box-shadow:none; -webkit-backdrop-filter:none; backdrop-filter:none; justify-content:flex-end; gap:4u; padding:var(--s3) var(--s2); color:white; text-shadow:0 1px 10px color-mix(in srgb, black 35%, transparent); }
/* napis leży na zdjęciu tła, więc zawsze biały z cieniem (jak powitanie na stronie Nuvio), także w schemacie jasnym */
ha-card.hero.img{ background: linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.55)) , var(--img) center / cover no-repeat; color:#fff; text-shadow:0 1px 8px rgba(0,0,0,.35); box-shadow:var(--hg-edge), var(--hg-shadow-lg); }
.t{ font-size:var(--hg-fs-6, 40px); font-weight:600; letter-spacing:-.03em; line-height:1.05; margin:0; }
.s{ font-size:var(--hg-fs-5, 24px); font-weight:var(--hg-fw-num, 300); letter-spacing:-.02em; line-height:1.15; margin:0; opacity:.92; }
.st{ margin-top:6u; } .st .nv-pill{ background:color-mix(in srgb, black 28%, transparent); color:white; box-shadow:none; -webkit-backdrop-filter:var(--hg-bfo, blur(12px)); backdrop-filter:var(--hg-bfo, blur(12px)); }
@container (max-width: 300px){ .t{ font-size:var(--hg-fs-5, 24px); } .s{ font-size:var(--hg-fs-3, 15px); } }
@container (min-width: 560px){ .t{ font-size:56px; } .s{ font-size:32px; } }
`); }
  render() { const c = this._config, h = this._hass, nm = hgFirstName(h), s = c.entity ? H.st(h, c.entity) : null;
    const T = c.title ?? hgTr('Hej, {name}!', 'Hey, {name}!'), Sb = c.subtitle ?? hgTr('Cały dom w jednym miejscu', 'Your whole home in one place');
    const fill = (x) => String(x || '').replace(/\{name\}/g, nm).replace(/,\s*!/, '!').replace(/\s+!/, '!');
    const st = s ? `<div class="st">${hgUI.pill(`${H.name(h, c.entity)}: ${H.t(h, s)}`, { icon: s.attributes.icon || 'mdi:information-outline', act: 'more' })}</div>` : '';
    return `<ha-card class="${c.glass ? 'glass' : 'glass hero'}${c.image ? ' img' : ''}"${c.image ? ` style="--img:url('${H.cssUrl(c.image)}')"` : ''}><h1 class="t">${H.esc(fill(T))}</h1>${Sb ? `<p class="s">${H.esc(fill(Sb))}</p>` : ''}${st}</ha-card>`; }
  onAct(a) { if (a === 'more' && this._config.entity) H.fire(this, 'hass-more-info', { entityId: this._config.entity }); }
  getGridOptions() { return { columns: 12, rows: 2 }; }
}
hgReg('hg-hero-card', HGHeroCard, hgTr('Nuvio – Powitanie', 'Nuvio – Greeting'), hgTr('Duże powitanie z imieniem i hasłem', 'Large greeting with your name and a tagline'));
