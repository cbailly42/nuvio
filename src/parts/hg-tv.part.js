/* ===== Telewizor: parowanie aplikacji Nuvio TV (strona ustawień, System).
   Kolejność w kliknięciu Sparuj: (1) synchronicznie, przed pierwszym await, window.open('', 'nuvio-tv-pair') zachowuje gest użytkownika (iOS Safari i inne blokują okna otwierane po await),
   (2) token długoterminowy powstaje w HA, (3) ukryty formularz POST z target=nuvio-tv-pair nawiguje to okno do telewizora w sieci domowej,
   (4) połączenie potwierdza znacznik nuvio_tv_seen, który telewizor zapisuje w danych użytkownika HA (frontend/set_user_data).
   Gdy przeglądarka zablokuje okno (window.open daje null): token powstaje po pierwszym kliknięciu i czeka w pamięci, a drugie kliknięcie (przycisk tv-send) wysyła formularz
   synchronicznie z target=_blank. Niewysłany token jest kasowany po 2 minutach, po zamknięciu panelu i po ponownym otwarciu panelu.
   Czyste funkcje: hg-tvlogic.part.js. Wartości pól trzyma obiekt (s), bo _eLook() kasuje wpisany tekst. Token żyje tylko w zmiennej lokalnej pair(), w this.ready między dwoma kliknięciami i w polu formularza w pamięci. ===== */
const HGTv = window.__hgTv || (window.__hgTv = {
  FIELDS: [['tv-addr', 'addr'], ['tv-code', 'code'], ['tv-ha', 'ha']],
  WIN: 'nuvio-tv-pair', HOLD_MS: 120000,
  s: { addr: '', code: '', ha: '' }, err: {}, status: 'idle', list: null, seen: {}, listErr: false, loading: false, _sheet: undefined, ready: null,
  clock: { now: () => Date.now(), sleep: (ms) => new Promise((r) => setTimeout(r, ms)) },
  now: () => new Date(),
  working() { return this.status === 'working' || this.status === 'waiting' || this.status === 'ready'; },
  redraw(p) { if (p._eSheetEl && p._eSheetEl.querySelector('.lk')) p._eLook(); },
  fmt(iso) { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(HG_LOC(), { dateStyle: 'medium', timeStyle: 'short' }); },
  errText(k) {
    switch (k + ':' + this.err[k]) {
      case 'addr:bad': return hgT('tv.err_addr');
      case 'addr:private': return hgT('tv.err_private');
      case 'code:bad': return hgT('tv.err_code');
      case 'ha:bad': return hgT('tv.err_ha');
      default: return '';
    }
  },
  statusText() {
    switch (this.status) {
      case 'working': return hgT('tv.working');
      case 'ready': return hgT('tv.ready');
      case 'waiting': return hgT('tv.waiting');
      case 'done': return H.icon('mdi:check-circle') + hgT('tv.connected');
      case 'timeout': return hgT('tv.timeout');
      case 'expired': return hgT('tv.expired');
      case 'err_create': return hgT('tv.err_create');
      case 'err_id': return hgT('tv.err_id');
      case 'err_send': return hgT('tv.err_send');
      default: return '';
    }
  },
  async prep(p) {
    if (this.loading) return; this.loading = true; const h = p._hass;
    try {
      const list = HGTvLogic.tokens(await h.callWS({ type: 'auth/refresh_tokens' }));
      let seen = {}; try { seen = HGTvLogic.parseSeen((await h.callWS({ type: 'frontend/get_user_data', key: HGTvLogic.SEEN_KEY })).value); } catch (e) { seen = {}; }
      this.list = list; this.seen = seen; this.listErr = false;
    } catch (e) { this.list = null; this.listErr = true; }
    this.loading = false; this.redraw(p);
  },
  listHtml() {
    if (this.listErr) return `<small class="nf-err" role="alert">${hgT('tv.list_failed')}</small><button type="button" class="lk-mini tv-go" data-hge="tv-reload">${hgT('tv.retry')}</button>`;
    if (this.list === null) return `<small class="lk-hn">${hgT('common.loading')}</small>`;
    if (!this.list.length) return `<small class="lk-hn">${hgT('tv.list_empty')}</small>`;
    return `<div class="tv-l">${this.list.map((t) => `<div class="tv-r"><span><b>${H.esc(t.client_name)}</b><small>${hgT('tv.created', { when: this.fmt(t.created_at) })}</small>
      <small>${this.seen[t.id] ? hgT('tv.seen', { when: this.fmt(this.seen[t.id]) }) : hgT('tv.not_seen')}</small></span>
      <button type="button" class="tv-x" data-hge="tv-del" data-id="${H.esc(t.id)}" aria-label="${H.esc(hgT('tv.delete'))}">${H.icon('mdi:trash-can-outline')}</button></div>`).join('')}</div>`;
  },
  html(p) {
    if (this._sheet !== p._eSheetEl) { this._sheet = p._eSheetEl; this.discard(p, 'idle'); if (!this.working()) { this.status = 'idle'; this.err = {}; } this.list = null; this.listErr = false; }
    if (!this.s.ha) this.s.ha = location.origin;
    if (this.list === null && !this.listErr) this.prep(p);
    const dis = this.working() ? ' disabled' : '';
    const fld = (k, label, hint, ph, extra) => hgForm.field(label, hgForm.text({ value: this.s[k], ph, a: `name="tv-${k}" aria-label="${H.esc(label)}" ${extra}${dis}` }), { hint })
      + (this.errText(k) ? `<small class="nf-err" role="alert">${this.errText(k)}</small>` : '');
    return `<section class="lk-g tv" data-tab="tv" data-pg="tv" aria-labelledby="tv-h"><style>${HG_TV_CSS}</style>
      <h4 id="tv-h">${H.icon('mdi:television')}${hgT('tv.title')}</h4>
      <small class="lk-hn">${hgT('tv.intro')}</small>
      ${fld('addr', hgT('tv.address'), hgT('tv.address_hint'), '10.0.8.117:8798', 'inputmode="url" autocapitalize="off" spellcheck="false"')}
      ${fld('code', hgT('tv.code'), hgT('tv.code_hint'), '123456', 'inputmode="numeric" maxlength="6" pattern="[0-9]*"')}
      ${fld('ha', hgT('tv.ha'), hgT('tv.ha_hint'), 'https://', 'inputmode="url" autocapitalize="off" spellcheck="false"')}
      <small class="lk-hn">${hgT('tv.plain_note')}</small>
      <button type="button" class="lk-mini tv-go" data-hge="tv-pair" ${this.working() ? 'disabled' : ''}>${hgT('tv.pair')}</button>
      <div class="tv-st" role="status" aria-live="polite">${this.statusText()}</div>
      ${this.status === 'ready' ? `<button type="button" class="lk-mini tv-go" data-hge="tv-send">${hgT('tv.send_open')}</button>` : ''}
      <h4 class="tv-lh">${H.icon('mdi:television-classic')}${hgT('tv.list_title')}</h4>
      ${this.listHtml()}
    </section>`;
  },
  /* wartości pól z DOM do obiektu; wklejony link z QR rozdziela się na adres i kod */
  sync(p) {
    const S = p._eSheetEl;
    if (S) for (const [n, k] of this.FIELDS) { const i = S.querySelector('[name=' + n + ']'); if (i) this.s[k] = i.value; }
    const l = HGTvLogic.parseLink(this.s.addr); if (l) { this.s.addr = l.addr; this.s.code = l.code; }
  },
  wire(p, S) {
    for (const [n, k] of this.FIELDS) {
      const i = S.querySelector('[name=' + n + ']'); if (!i) continue;
      i.addEventListener('input', () => {
        this.s[k] = i.value;
        const l = k === 'addr' ? HGTvLogic.parseLink(i.value) : null; if (!l) return;
        const c = S.querySelector('[name=tv-code]'); i.value = this.s.addr = l.addr; this.s.code = l.code; if (c) c.value = l.code;
      });
      i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.pair(p); } });
    }
  },
  /* pusta karta o stałej nazwie, otwierana synchronicznie w kliknięciu; null gdy zablokowana. Do karty nic nie piszemy (żadnego w.document), a w.opener zerujemy:
     bez noopener, bo formularz musi trafić w nazwane okno. Karta pokazuje wyłącznie stronę telewizora, więc ryzyko jest akceptowalne. */
  openTab() {
    let w = null; try { w = window.open('', this.WIN); } catch (e) { w = null; }
    if (w) { try { w.opener = null; } catch (e) { /* okno z innego źródła, opener i tak niedostępny */ } }
    return w || null;
  },
  shut(w) { try { if (w) w.close(); } catch (e) { /* nic do zrobienia */ } },
  /* ukryty formularz w pamięci: POST, potem usunięty; token nigdzie indziej nie trafia.
     target to nazwa karty z openTab (bez rel, bo noopener zerwałby nazwane okno) albo _blank w drugim kliknięciu (wtedy rel=noopener). */
  send(A, code, ha, token, target) {
    const f = document.createElement('form');
    f.setAttribute('action', 'http://' + A.host + ':' + A.port + '/pair'); f.setAttribute('method', 'post'); f.setAttribute('target', target); if (target === '_blank') f.setAttribute('rel', 'noopener'); f.hidden = true;
    for (const [n, v] of [['code', code], ['url', ha], ['token', token]]) { const i = document.createElement('input'); i.setAttribute('type', 'hidden'); i.setAttribute('name', n); i.setAttribute('value', v); f.appendChild(i); }
    document.body.appendChild(f);
    try { f.submit(); } finally { f.remove(); }
  },
  async drop(h, id) { try { await h.callWS({ type: 'auth/delete_refresh_token', refresh_token_id: id }); } catch (e) { /* niewykorzystany token zostanie na liście, można go usunąć ręcznie */ } },
  fail(p, status) { this.status = status; this.list = null; this.redraw(p); },
  /* niewysłany token z this.ready znika z pamięci i z HA; status ustawia wołający */
  discard(p, status) {
    const r = this.ready; if (!r) return;
    this.ready = null; r.token = null; this.status = status; this.drop(p._hass, r.id);
  },
  async pair(p) {
    if (this.working()) return;
    this.sync(p);
    const s = this.s, A = HGTvLogic.parseAddr(s.addr), ha = HGTvLogic.haUrl(s.ha), code = s.code.trim(), E = {};
    if (!A) E.addr = 'bad'; else if (!HGTvLogic.isPrivateHost(A.host)) E.addr = 'private';
    if (!HGTvLogic.validCode(code)) E.code = 'bad';
    if (!ha) E.ha = 'bad';
    this.err = E; this.status = 'idle';
    if (Object.keys(E).length || window.__hgDryRun) return p._eLook();
    const w = this.openTab();
    const h = p._hass; this.status = 'working'; p._eLook();
    let token = null, id = null, name = '';
    try {
      name = HGTvLogic.freeName(HGTvLogic.longNames(await h.callWS({ type: 'auth/refresh_tokens' })), this.now());
      token = await h.callWS({ type: 'auth/long_lived_access_token', client_name: name, lifespan: 3650 });
    } catch (e) { this.shut(w); return this.fail(p, 'err_create'); }
    try { id = HGTvLogic.tokenId(token) || HGTvLogic.idByName(await h.callWS({ type: 'auth/refresh_tokens' }), name); } catch (e) { id = null; }
    if (!id) { token = null; this.shut(w); return this.fail(p, 'err_id'); }
    if (!w) {
      this.ready = { A, code, ha, token, id }; token = null; this.status = 'ready'; p._eLook();
      this.hold(p, this.ready).catch(() => undefined);
      return undefined;
    }
    try { this.send(A, code, ha, token, this.WIN); } catch (e) { token = null; this.shut(w); await this.drop(h, id); return this.fail(p, 'err_send'); }
    token = null; this.status = 'waiting'; p._eLook();
    return this.poll(p, id);
  },
  /* drugie kliknięcie po zablokowanej karcie: formularz wychodzi synchronicznie w tym kliknięciu (świeży gest), przed jakimkolwiek await */
  sendReady(p) {
    const r = this.ready; if (!r) return undefined;
    this.ready = null;
    try { this.send(r.A, r.code, r.ha, r.token, '_blank'); } catch (e) { r.token = null; this.drop(p._hass, r.id); return this.fail(p, 'err_send'); }
    r.token = null; this.status = 'waiting'; p._eLook();
    return this.poll(p, r.id);
  },
  /* trzyma niewysłany token najwyżej 2 minuty; zamknięcie panelu albo koniec czasu kasuje go także w HA, wysłanie (this.ready zmienione) kończy pętlę */
  async hold(p, r) {
    const c = this.clock, t0 = c.now();
    while (this.ready === r && c.now() - t0 < this.HOLD_MS) {
      await c.sleep(1000);
      if (this.ready === r && !p._eSheetEl) return this.discard(p, 'idle');
    }
    if (this.ready !== r) return undefined;
    this.discard(p, 'expired'); this.list = null; return this.redraw(p);
  },
  /* co 3 s do 60 s czeka na wpis id tokenu w nuvio_tv_seen; zamknięcie panelu przerywa (token zostaje na liście), brak wpisu usuwa token */
  async poll(p, id) {
    const h = p._hass, c = this.clock, t0 = c.now(), quit = () => { this.status = 'idle'; };
    while (c.now() - t0 < 60000) {
      await c.sleep(3000);
      if (!p._eSheetEl) return quit();
      try { this.seen = HGTvLogic.parseSeen((await h.callWS({ type: 'frontend/get_user_data', key: HGTvLogic.SEEN_KEY })).value); } catch (e) { continue; }
      if (this.seen[id]) { this.status = 'done'; this.list = null; return this.redraw(p); }
    }
    if (!p._eSheetEl) return quit();
    await this.drop(h, id);
    return this.fail(p, 'timeout');
  },
  async del(p, id) {
    if (!(this.list || []).some((x) => x.id === id)) return;
    const t = this.list.find((x) => x.id === id);
    if (!(await hgOverlay.alert(hgT('tv.delete_title', { name: t.client_name }), hgT('tv.delete_text'), hgT('tv.delete')))) return;
    try { if (!window.__hgDryRun) await p._hass.callWS({ type: 'auth/delete_refresh_token', refresh_token_id: id }); p._eToast(hgT('tv.deleted')); } catch (e) { p._eToast(hgT('tv.delete_failed')); }
    this.list = null; return p._eLook();
  },
  act(p, b, a) {
    switch (a) {
      case 'tv-pair': return this.pair(p);
      case 'tv-send': return this.sendReady(p);
      case 'tv-del': return this.del(p, b.dataset.id);
      case 'tv-reload': this.list = null; this.listErr = false; return p._eLook();
      default: return undefined;
    }
  },
});
const HG_TV_CSS = `
.lk-mini.tv-go{ height:44px; padding:0 22px; align-self:flex-start; }
.tv-st{ min-height:20px; font-size:13px; line-height:1.4; display:flex; gap:6px; align-items:flex-start; } .tv-st ha-icon{ --mdc-icon-size:18px; width:18px; height:18px; flex:none; color:var(--hg-accent-tx, var(--hg-accent)); }
.tv-lh{ margin-top:8px; }
.tv-l{ display:flex; flex-direction:column; gap:6px; }
.tv-r{ display:flex; align-items:center; gap:8px; padding:8px 4px 8px 12px; border-radius:14px; background:color-mix(in srgb, var(--hg-accent) 8%, transparent); }
.tv-r > span{ flex:1; min-width:0; } .tv-r b{ display:block; overflow-wrap:anywhere; font-weight:600; } .tv-r small{ display:block; opacity:.65; font-size:12px; }
.tv-x{ all:unset; cursor:pointer; flex:none; width:44px; height:44px; display:grid; place-items:center; border-radius:50%; } .tv-x:hover{ background:rgba(255,255,255,.08); }
.tv-x:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; } .tv-x ha-icon{ --mdc-icon-size:20px; width:20px; height:20px; }
`;
window.HGTv = HGTv;
