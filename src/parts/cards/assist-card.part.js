/* --- Assist: rozmowa z Home Assistant Assist w szklanej karcie, odpowiedź w dymkach na miejscu ---
   tekst -> assist_pipeline/run (intent, opcjonalnie tts) albo conversation/process; conversation_id ciągnie rozmowę;
   mikrofon: rozpoznawanie mowy przeglądarki (Web Speech API), gdy jest dostępne. window.__hgDryRun: odpowiedź próbna, bez wysyłania. */
/* ostatnio wybrany model (potok Assist) na tym urządzeniu; w oknie Assist zapisuje się też w ustawieniach (HGAssistUI.set) */
const hgAssistPipe = (v) => { try { if (v === undefined) return localStorage.getItem('home-glass:assist-pipe') || ''; localStorage.setItem('home-glass:assist-pipe', v || ''); } catch (e) { return ''; } };
class HGAssistCard extends HGBase {
  defaults() { return { title: null, pipeline: null, tts: false, mic: true, show_pipeline: true, suggestions: null, placeholder: null, min_h: 320 }; }
  ents() { return []; }
  css() { if (!this._config.embedded) return HG_G14_CSS + U(`ha-card.glass{ padding:10px; min-height:0; justify-content:center; }
.lg{ all:unset; box-sizing:border-box; cursor:pointer; display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px; border-radius:var(--r-md); transition:background .15s; } .lg:hover{ background:color-mix(in srgb, currentColor 7%, transparent); }
.lg:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; } .lg .gn{ flex:1; min-width:0; } .lg .gic{ flex:none; }`);
    return HG_G14_CSS + U(`:host{ display:block; height:100%; }
ha-card.glass{ height:100%; min-height:0 !important; padding:16px; gap:12px; background:transparent !important; box-shadow:none !important; -webkit-backdrop-filter:none !important; backdrop-filter:none !important; border-radius:0; color:inherit; }
.hd2{ display:flex; align-items:center; gap:10px; min-width:0; } .hd2 .gn{ flex:1 1 auto; min-width:0; } .hd2 .gn small{ opacity:.7; transition:opacity var(--hg-t-base) var(--hg-ease-out); }
.hd2 .gic.on{ box-shadow:0 0 16px var(--hg-accent-glow); } .hd2 .gb.r{ width:40px; height:40px; } .hd2 .gb.r ha-icon{ width:20px; height:20px; --mdc-icon-size:20px; }
.cv{ flex:1; min-height:120px; overflow:auto; display:flex; flex-direction:column; gap:8px; padding:2px 2px 6px; scroll-behavior:smooth; overscroll-behavior:contain; }
.b{ max-width:84%; padding:10px 14px; border-radius:var(--r-lg); font-size:var(--hg-fs-3, 14px); line-height:1.45; overflow-wrap:anywhere; animation:bin var(--hg-t-slow) var(--hg-spring) both; }
.b.u{ align-self:flex-end; background:var(--hg-accent); color:var(--hg-on-accent); box-shadow:0 0 14px var(--hg-accent-glow); border-bottom-right-radius:8px; font-weight:500; transform-origin:100% 100%; }
.b.a{ align-self:flex-start; background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi); border-bottom-left-radius:8px; transform-origin:0 100%; }
.b.e{ color:var(--hg-warn); background:color-mix(in srgb, var(--hg-warn) 12%, var(--hg-inner-bg)); }
.b .pl{ all:unset; cursor:pointer; margin-left:6px; vertical-align:-3px; color:var(--hg-accent-tx, var(--hg-accent)); transition:transform var(--hg-t-fast) var(--hg-ease-out); } .b .pl:active{ transform:scale(.9); }
.b .pl ha-icon{ width:16px; height:16px; } .b .pl:focus-visible{ outline:2px solid var(--hg-accent); border-radius:6px; }
.ty{ display:inline-flex; gap:4px; padding:3px 0; } .ty i{ width:7px; height:7px; border-radius:50%; background:var(--hg-accent); animation:var(--hg-loop, dot 1s var(--hg-ease-out) infinite); } .ty i:nth-child(2){ animation-delay:.15s; } .ty i:nth-child(3){ animation-delay:.3s; }
@keyframes dot{ 0%, 100%{ transform:translateY(0); opacity:.35; } 50%{ transform:translateY(-3px); opacity:1; } }
@keyframes bin{ from{ opacity:0; transform:translateY(8px) scale(.94); } }
@keyframes rise{ from{ opacity:0; transform:translateY(6px); } }
.em{ margin:auto; text-align:center; font-size:var(--hg-fs-2, 13px); display:flex; flex-direction:column; align-items:center; gap:6px; padding:8px; animation:rise var(--hg-t-slow) var(--hg-ease-out) both; }
.em span{ opacity:.7; } .em b{ font-size:var(--hg-fs-4, 17px); font-weight:600; }
.em .gic{ width:56px; height:56px; margin-bottom:4px; box-shadow:0 0 22px var(--hg-accent-glow); } .em .gic ha-icon{ width:28px; height:28px; --mdc-icon-size:28px; }
.sg{ display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; padding:2px; margin:0 -2px; } .sg::-webkit-scrollbar{ display:none; }
.sg button{ all:unset; cursor:pointer; flex:none; font-size:var(--hg-fs-2, 13px); padding:8px 14px; border-radius:999px; background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi); white-space:nowrap;
  transition:background var(--hg-t-base) var(--hg-ease-out), color var(--hg-t-base) var(--hg-ease-out), transform var(--hg-t-fast) var(--hg-ease-out); animation:rise var(--hg-t-slow) var(--hg-ease-out) both; animation-delay:calc(var(--i, 0) * var(--hg-t-stagger, 30ms)); }
@media (hover:hover) and (pointer:fine){ .sg button:hover{ background:var(--hg-accent-soft); color:var(--hg-accent-tx, inherit); } }
.sg button:active{ transform:scale(.96); } .sg button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.inp{ display:flex; align-items:center; gap:4px; padding:4px; border-radius:999px; background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi); transition:box-shadow var(--hg-t-base) var(--hg-ease-out); }
.inp:focus-within{ box-shadow:var(--hg-inner-hi), 0 0 0 2px var(--hg-accent), 0 0 18px var(--hg-accent-glow); }
.inp input{ all:unset; flex:1 1 auto; min-width:60px; font-size:var(--hg-fs-3, 14px); padding:0 12px; height:40px; } .inp input::placeholder{ color:inherit; opacity:.6; }
.inp .ps{ flex:0 1 auto; min-width:0; max-width:min(38%, 170px); }
.inp .ps .hgs-t{ min-height:32px; height:32px; padding:0 8px 0 12px; gap:4px; border:0; border-radius:999px; font-size:var(--hg-fs-1, 12px); font-weight:500; background:transparent; box-shadow:none; opacity:.8; }
.inp .ps .hgs-t:hover{ background:var(--hg-inner-bg-h); opacity:1; } .inp .ps .hgs-t[aria-expanded=true], .inp .ps .hgs-t:focus-visible{ opacity:1; background:var(--hg-accent-soft); box-shadow:none; }
.inp .ps .hgs-v{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .inp .ps .hgs-c{ width:16px; height:16px; }
.inp .ps select{ max-width:100%; }
.inp .gb.r{ width:40px; height:40px; } .inp .gb.r ha-icon{ width:20px; height:20px; --mdc-icon-size:20px; }
.inp .gb.r.ok{ background:var(--hg-accent); color:var(--hg-on-accent); box-shadow:0 0 12px var(--hg-accent-glow); transition:transform var(--hg-t-fast) var(--hg-ease-out), opacity var(--hg-t-base); }
.inp .gb.r.ok:disabled{ opacity:.45; box-shadow:none; }
.mic{ transition:background var(--hg-t-base) var(--hg-ease-out), color var(--hg-t-base) var(--hg-ease-out); }
.mic.on{ background:var(--hg-accent) !important; color:var(--hg-on-accent) !important; animation:var(--hg-loop, pul 1.2s var(--hg-ease-out) infinite); }
@keyframes pul{ 0%, 100%{ box-shadow:0 0 0 0 var(--hg-accent-glow); } 50%{ box-shadow:0 0 0 8px transparent; } }
@media (prefers-reduced-motion: reduce){ .b, .ty i, .mic.on, .sg button, .em{ animation:none !important; } .cv{ scroll-behavior:auto; } }
@container (max-width: 360px){ .inp .ps{ max-width:96px; } .b{ max-width:92%; font-size:13px; } }`); }
  setConfig(c) { super.setConfig(c); this._msgs = this._msgs || []; }
  _sugg() { const s = this._config.suggestions; return Array.isArray(s) && s.length ? s : typeof s === 'string' && s.trim() ? s.split(',').map((x) => x.trim()).filter(Boolean)
    : [hgT('cards.assist.what_is_the_temperature'), hgT('cards.assist.which_lights_are_on'), hgT('cards.assist.what_will_the_weather'), hgT('cards.assist.what_time_is_it')]; }
  async _pipes() { const h = this._hass; if (this._pl || this._plL || !h || !h.callWS) return; this._plL = true;
    try { const r = await h.callWS({ type: 'assist_pipeline/pipeline/list' }); this._pl = r.pipelines || []; this._pref = r.preferred_pipeline; } catch (e) { this._pl = []; } this._plL = false; this.rerender(); }
  render() { const c = this._config, h = this._hass, M = this._msgs || [];
    if (!c.embedded) return `<ha-card class="glass"><button class="lg" data-act="open" aria-haspopup="dialog" aria-label="${hgT('common.open_assist')}"><span class="gic on">${H.icon('mdi:microphone-message')}</span><span class="gn"><b id="as-t">${H.esc(c.title || c.name || hgT('cards.assist.default_title'))}</b><small>${hgT('cards.assist.ask_or_give_a')}</small></span>${H.icon('mdi:chevron-right')}</button></ha-card>`;
    if (!this._pl) setTimeout(() => this._pipes(), 0);
    if (this._pipe == null && this._pl) { const m = hgAssistPipe(); this._pipe = m && this._pl.some((p) => p.id === m) ? m : ''; }   // zapamiętany model (to urządzenie)
    const cur = this._pipe || c.pipeline || this._pref || '', SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const sel = c.show_pipeline !== false && this._pl && this._pl.length > 1 ? `<span class="ps" title="${H.esc((this._pl.find((p) => p.id === cur) || {}).name || '')}"><select data-k="pipe" aria-label="${hgT('cards.assist.assistant_model')}">${this._pl.map((p) => `<option value="${H.esc(p.id)}"${p.id === cur ? ' selected' : ''}>${H.esc(p.name)}</option>`).join('')}</select></span>` : '';
    const bub = M.map((m, i) => `<div class="b ${m.r}${m.err ? ' e' : ''}"${m.r === 'a' && i === M.length - 1 ? ' aria-live="polite"' : ''}>${m.wait ? `<span class="ty" aria-label="${hgT('cards.assist.assistant_is_typing')}"><i></i><i></i><i></i></span>` : H.esc(m.t)}${m.tts ? `<button class="pl" data-act="play" data-i="${i}" aria-label="${hgT('cards.assist.play_reply')}">${H.icon('mdi:volume-high')}</button>` : ''}</div>`).join('');
    return `<ha-card class="glass"><div class="hd2"><span class="gic on">${H.icon('mdi:microphone-message')}</span><span class="gn"><b>${H.esc(c.title || c.name || hgT('cards.assist.default_title'))}</b><small>${this._busy2 ? hgT('cards.assist.thinking') : hgT('cards.assist.ask_or_give_a')}</small></span>${M.length ? `<button class="gb r" data-act="clr" aria-label="${hgT('cards.assist.new_conversation')}" title="${hgT('cards.assist.new_conversation')}">${H.icon('mdi:restore')}</button>` : ''}<button class="gb r x" data-act="close" aria-label="${hgT('common.close')}" title="${hgT('common.close')}">${H.icon('mdi:close')}</button></div>
      <div class="cv" role="log" aria-label="${hgT('cards.assist.conversation_with_the_assistant')}">${bub || `<div class="em"><span class="gic on">${H.icon('mdi:chat-processing-outline')}</span><b>${hgT('cards.assist.talk_to_your_home')}</b><span>${hgT('cards.assist.type_a_question_or')}</span></div>`}</div>
      <div class="sg" role="list">${this._sugg().map((s, i) => `<button role="listitem" data-act="sug" data-t="${H.esc(s)}" style="--i:${i}">${H.esc(s)}</button>`).join('')}</div>
      <form class="inp" data-k="f"><input data-k="q" type="text" enterkeyhint="send" autocomplete="off" placeholder="${H.esc(c.placeholder || hgT('cards.assist.message_the_assistant'))}" aria-label="${hgT('cards.assist.message')}" value="${H.esc(this._draft || '')}">${sel}
        ${c.mic !== false && SR ? `<button type="button" class="gb r mic${this._rec ? ' on' : ''}" data-act="mic" aria-pressed="${!!this._rec}" aria-label="${hgT('cards.assist.speak')}">${H.icon('mdi:microphone')}</button>` : ''}
        <button type="submit" class="gb r ok" data-act="send" aria-label="${hgT('cards.assist.send')}"${this._busy2 ? ' disabled' : ''}>${H.icon('mdi:send')}</button></form></ha-card>`; }
  afterRender() { const q = this.$.querySelector('[data-k=q]'), f = this.$.querySelector('[data-k=f]'), s = this.$.querySelector('[data-k=pipe]'), cv = this.$.querySelector('.cv');
    if (q) { if (this._once(q)) q.addEventListener('input', () => { this._draft = q.value; }); if (this._focusQ) { this._focusQ = false; q.focus({ preventScroll: true }); } }
    if (f && this._once(f)) f.addEventListener('submit', (e) => { e.preventDefault(); const qq = this.$.querySelector('[data-k=q]'); this._send(qq ? qq.value : ''); });
    if (s && this._once(s)) s.addEventListener('change', () => { this._pipe = s.value; this._cid = null; hgAssistPipe(s.value);
      if (this._config.embedded && window.HGAssistUI && HGAssistUI.card === this) HGAssistUI.set({ pipeline: s.value }); });
    if (cv) cv.scrollTop = cv.scrollHeight; }
  onAct(a, t, e) { if (a === 'open' || a === 'close') { if (window.HGAssistUI) HGAssistUI[a === 'open' ? 'open' : 'close'](null, t); return; }
    if (a === 'send') { e.preventDefault(); const q = this.$.querySelector('[data-k=q]'); return this._send(q && q.value); }
    if (a === 'sug') return this._send(t.dataset.t);
    if (a === 'clr') { this._msgs = []; this._cid = null; return this.rerender(); }
    if (a === 'play') { const m = this._msgs[+t.dataset.i]; if (m && m.tts) this._play(m.tts); }
    if (a === 'mic') return this._mic(); }
  _play(u) { try { if (this._au) this._au.pause(); this._au = new Audio(u); this._au.play().catch(() => {}); } catch (e) {} }
  _mic() { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    if (this._rec) { try { this._rec.stop(); } catch (e) {} return; }
    const r = new SR(); r.lang = (this._hass && this._hass.language) || HG_LOC(); r.interimResults = true; r.maxAlternatives = 1; this._rec = r; this.rerender();
    let fin = ''; r.onresult = (ev) => { let t = ''; for (const x of ev.results) { t += x[0].transcript; if (x.isFinal) fin = t; } const q = this.$.querySelector('[data-k=q]'); if (q) q.value = t; this._draft = t; };
    r.onerror = () => {}; r.onend = () => { this._rec = null; this.rerender(); if (fin.trim()) this._send(fin); }; try { r.start(); } catch (e) { this._rec = null; this.rerender(); } }
  async _send(txt) { txt = String(txt || '').trim(); const h = this._hass, c = this._config; if (!txt || this._busy2 || !h) return;
    this._draft = ''; this._busy2 = true; this._msgs = [...this._msgs, { r: 'u', t: txt }, { r: 'a', wait: true }]; this._focusQ = true; this.rerender();
    const done = (t, o = {}) => { this._msgs = [...this._msgs.slice(0, -1), Object.assign({ r: 'a', t }, o)]; this._busy2 = false; this.rerender(); };
    if (window.__hgDryRun && !window.__hgAssistLive) { setTimeout(() => done(hgT('cards.assist.preview_home_assistant_assist')), 500); return; }
    const pipe = this._pipe || c.pipeline || undefined, lang = h.language;
    try {
      if (h.connection && h.connection.subscribeMessage) {
        let reply = null, url = null, err = null, unsub = null; const tts = !!c.tts;
        await new Promise((res) => { const to = setTimeout(res, 30000);
          h.connection.subscribeMessage((ev) => { const d = ev.data || {};
            if (ev.type === 'intent-end') { const o = d.intent_output || {}; reply = (((o.response || {}).speech || {}).plain || {}).speech || ''; if (o.conversation_id) this._cid = o.conversation_id; if (!tts) { clearTimeout(to); res(); } }
            if (ev.type === 'tts-end') { url = (d.tts_output || {}).url || null; }
            if (ev.type === 'error') { err = d.message || d.code || 'error'; clearTimeout(to); res(); }
            if (ev.type === 'run-end') { clearTimeout(to); res(); } },
            Object.assign({ type: 'assist_pipeline/run', start_stage: 'intent', end_stage: tts ? 'tts' : 'intent', input: { text: txt }, conversation_id: this._cid || null }, pipe ? { pipeline: pipe } : {})).then((u) => { unsub = u; }).catch((e) => { err = e && (e.message || e.code) || 'error'; clearTimeout(to); res(); }); });
        if (unsub) try { unsub(); } catch (e) {}
        if (err && reply == null) throw new Error(err);
        if (url && !/^https?:/.test(url)) url = h.hassUrl ? h.hassUrl(url) : url;
        done(reply || hgT('cards.assist.no_reply'), url ? { tts: url } : {}); if (url) this._play(url); return; }
      const r = await h.callWS(Object.assign({ type: 'conversation/process', text: txt, conversation_id: this._cid || null, language: lang }, c.agent_id ? { agent_id: c.agent_id } : {}));
      if (r.conversation_id) this._cid = r.conversation_id; done(((((r.response || {}).speech || {}).plain || {}).speech) || hgT('cards.assist.no_reply'));
    } catch (e) { done(hgT('cards.assist.connect_error', { error: String(e && e.message ? e.message : e) }), { err: true }); } }
  getGridOptions() { return this._config && this._config.embedded ? { columns: 12, rows: 5 } : { columns: 6, rows: 1 }; }
}
hgReg('hg-assist-card', HGAssistCard, hgTLazy('cards.assist.picker_name'), hgTLazy('cards.assist.picker_description'));
