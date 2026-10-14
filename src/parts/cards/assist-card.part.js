/* --- Assist: rozmowa z Home Assistant Assist w szklanej karcie, odpowiedź w dymkach na miejscu ---
   tekst -> assist_pipeline/run (intent, opcjonalnie tts) albo conversation/process; conversation_id ciągnie rozmowę;
   mikrofon: rozpoznawanie mowy przeglądarki (Web Speech API), gdy jest dostępne. window.__hgDryRun: odpowiedź próbna, bez wysyłania. */
class HGAssistCard extends HGBase {
  defaults() { return { title: null, pipeline: null, tts: false, mic: true, show_pipeline: true, suggestions: null, placeholder: null, min_h: 320 }; }
  ents() { return []; }
  css() { if (!this._config.embedded) return HG_G14_CSS + U(`ha-card.glass{ padding:10px; min-height:0; justify-content:center; }
.lg{ all:unset; box-sizing:border-box; cursor:pointer; display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px; border-radius:var(--r-md); transition:background .15s; } .lg:hover{ background:color-mix(in srgb, currentColor 7%, transparent); }
.lg:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; } .lg .gn{ flex:1; min-width:0; } .lg .gic{ flex:none; }`);
    return HG_G14_CSS + U(`:host{ display:block; height:100%; } ha-card.glass{ height:100%; min-height:0 !important; padding:16px; gap:10px; background:transparent !important; box-shadow:none !important; -webkit-backdrop-filter:none !important; backdrop-filter:none !important; border-radius:0; }
.hd2 .x{ flex:none; } .hd2 .ps{ flex:0 1 250px; }
ha-card.glass.legacy-unused{ gap:10px; min-height:var(--hg-min-h, 320px); isolation:isolate; background:linear-gradient(var(--hg-assist-veil, rgba(12,16,24,.42)), var(--hg-assist-veil, rgba(12,16,24,.42))), var(--hg-glass-lite, var(--hg-glass-bg)); -webkit-backdrop-filter:blur(24px) saturate(150%); backdrop-filter:blur(24px) saturate(150%); box-shadow:inset 0 0 0 1px rgba(255,255,255,.08), var(--hg-card-sh, 0 6px 20px var(--hg-glass-sh)); }
.hd2 .gn small{ opacity:.78; } .cv{ background:rgba(0,0,0,.14); border-radius:var(--r-md); padding:8px !important; }
.hd2{ display:flex; align-items:center; gap:10px; min-width:0; } .hd2 .gn{ flex:1 1 auto; min-width:70px; } .hd2 .ps{ flex:0 1 210px; min-width:0; }
.cv{ flex:1; min-height:120px; overflow:auto; display:flex; flex-direction:column; gap:8px; padding:2px; scroll-behavior:smooth; overscroll-behavior:contain; }
.b{ max-width:84%; padding:9px 13px; border-radius:var(--r-md); font-size:14px; line-height:1.4; overflow-wrap:anywhere; animation:bin .28s cubic-bezier(.2,.8,.2,1) both; }
.b.u{ align-self:flex-end; background:var(--hg-accent); color:var(--hg-on-accent, #000); box-shadow:0 2px 8px rgba(0,0,0,.18); border-bottom-right-radius:6px; font-weight:500; }
.b.a{ align-self:flex-start; background:rgba(28,34,46,.86); color:#F2F5F8; box-shadow:inset 0 0 0 1px rgba(255,255,255,.10), 0 2px 8px rgba(0,0,0,.18); border-bottom-left-radius:6px; }
.b.e{ color:#FF8A7A; } .b .pl{ all:unset; cursor:pointer; margin-left:6px; vertical-align:-3px; opacity:.75; } .b .pl ha-icon{ width:16px; height:16px; } .b .pl:focus-visible{ outline:2px solid var(--hg-accent); border-radius:6px; }
.ty{ display:inline-flex; gap:4px; } .ty i{ width:6px; height:6px; border-radius:50%; background:currentColor; opacity:.5; animation:dot 1s ease-in-out infinite; } .ty i:nth-child(2){ animation-delay:.15s; } .ty i:nth-child(3){ animation-delay:.3s; }
@keyframes dot{ 0%, 100%{ transform:translateY(0); opacity:.35; } 50%{ transform:translateY(-3px); opacity:.9; } } @keyframes bin{ from{ opacity:0; transform:translateY(6px) scale(.98); } }
.em{ margin:auto; text-align:center; font-size:13px; opacity:.7; display:flex; flex-direction:column; align-items:center; gap:6px; padding:8px; } .em ha-icon{ width:30px; height:30px; color:var(--hg-accent-tx, var(--hg-accent)); opacity:1; }
.sg{ display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; padding:1px; } .sg::-webkit-scrollbar{ display:none; }
.sg button{ all:unset; cursor:pointer; flex:none; font-size:12.5px; padding:6px 12px; border-radius:999px; background:rgba(28,34,46,.72); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent); transition:background .15s; white-space:nowrap; }
.sg button:hover{ background:color-mix(in srgb, var(--hg-accent) 20%, transparent); } .sg button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.in{ display:flex; align-items:center; gap:6px; padding:4px; border-radius:999px; background:rgba(20,25,35,.80); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent); transition:box-shadow .15s; }
.in:focus-within{ box-shadow:inset 0 0 0 1px var(--hg-accent), 0 0 0 3px color-mix(in srgb, var(--hg-accent) 25%, transparent); }
.in input{ all:unset; flex:1; min-width:0; font-size:14px; padding:0 10px; height:38px; } .in input::placeholder{ color:inherit; opacity:.68; }
.in .gb.r{ width:38px; height:38px; } .in .gb.r.ok{ background:var(--hg-accent); color:var(--hg-on-accent); } .mic.on{ background:#FF6B57 !important; color:#fff !important; animation:pul 1.2s ease-in-out infinite; }
@keyframes pul{ 0%, 100%{ box-shadow:0 0 0 0 rgba(255,107,87,.5); } 50%{ box-shadow:0 0 0 7px rgba(255,107,87,0); } }
@media (prefers-reduced-motion: reduce){ .b, .ty i, .mic.on{ animation:none !important; } .cv{ scroll-behavior:auto; } }
@container (max-width: 300px){ .hd2 .ps{ display:none; } .b{ max-width:92%; font-size:13px; } }`); }
  setConfig(c) { super.setConfig(c); this._msgs = this._msgs || []; }
  _sugg() { const s = this._config.suggestions; return Array.isArray(s) && s.length ? s : typeof s === 'string' && s.trim() ? s.split(',').map((x) => x.trim()).filter(Boolean)
    : [hgTr('Jaka jest temperatura w salonie?', 'What is the temperature in the living room?'), hgTr('Które światła są włączone?', 'Which lights are on?'), hgTr('Jaka będzie pogoda jutro?', 'What will the weather be tomorrow?'), hgTr('Która godzina?', 'What time is it?')]; }
  async _pipes() { const h = this._hass; if (this._pl || this._plL || !h || !h.callWS) return; this._plL = true;
    try { const r = await h.callWS({ type: 'assist_pipeline/pipeline/list' }); this._pl = r.pipelines || []; this._pref = r.preferred_pipeline; } catch (e) { this._pl = []; } this._plL = false; this.rerender(); }
  render() { const c = this._config, h = this._hass, M = this._msgs || [];
    if (!c.embedded) return `<ha-card class="glass"><button class="lg" data-act="open" aria-haspopup="dialog" aria-label="${hgTr('Otwórz Assist', 'Open Assist')}"><span class="gic on">${H.icon('mdi:microphone-message')}</span><span class="gn"><b id="as-t">${H.esc(c.title || c.name || 'Assist')}</b><small>${hgTr('Zapytaj albo wydaj polecenie', 'Ask or give a command')}</small></span>${H.icon('mdi:chevron-right')}</button></ha-card>`;
    if (!this._pl) setTimeout(() => this._pipes(), 0);
    const cur = this._pipe || c.pipeline || this._pref || '', SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const sel = c.show_pipeline !== false && this._pl && this._pl.length > 1 ? `<span class="ps"><select data-k="pipe" aria-label="${hgTr('Asystent', 'Assistant')}">${this._pl.map((p) => `<option value="${H.esc(p.id)}"${p.id === cur ? ' selected' : ''}>${H.esc(p.name)}</option>`).join('')}</select></span>` : '';
    const bub = M.map((m, i) => `<div class="b ${m.r}${m.err ? ' e' : ''}"${m.r === 'a' && i === M.length - 1 ? ' aria-live="polite"' : ''}>${m.wait ? `<span class="ty" aria-label="${hgTr('Asystent pisze', 'Assistant is typing')}"><i></i><i></i><i></i></span>` : H.esc(m.t)}${m.tts ? `<button class="pl" data-act="play" data-i="${i}" aria-label="${hgTr('Odtwórz odpowiedź', 'Play reply')}">${H.icon('mdi:volume-high')}</button>` : ''}</div>`).join('');
    return `<ha-card class="glass"><div class="hd2"><span class="gic on">${H.icon('mdi:microphone-message')}</span><span class="gn"><b>${H.esc(c.title || c.name || 'Assist')}</b><small>${this._busy2 ? hgTr('Myślę…', 'Thinking…') : hgTr('Zapytaj albo wydaj polecenie', 'Ask or give a command')}</small></span>${sel}${M.length ? `<button class="gb r" data-act="clr" aria-label="${hgTr('Nowa rozmowa', 'New conversation')}" title="${hgTr('Nowa rozmowa', 'New conversation')}">${H.icon('mdi:restore')}</button>` : ''}<button class="gb r x" data-act="close" aria-label="${hgTr('Zamknij', 'Close')}" title="${hgTr('Zamknij', 'Close')}">${H.icon('mdi:close')}</button></div>
      <div class="cv" role="log" aria-label="${hgTr('Rozmowa z asystentem', 'Conversation with the assistant')}">${bub || `<div class="em">${H.icon('mdi:chat-processing-outline')}<b>${hgTr('Porozmawiaj z domem', 'Talk to your home')}</b>${hgTr('Napisz pytanie albo wybierz podpowiedź poniżej', 'Type a question or pick a suggestion below')}</div>`}</div>
      <div class="sg" role="list">${this._sugg().map((s) => `<button role="listitem" data-act="sug" data-t="${H.esc(s)}">${H.esc(s)}</button>`).join('')}</div>
      <form class="in" data-k="f"><input data-k="q" type="text" enterkeyhint="send" autocomplete="off" placeholder="${H.esc(c.placeholder || hgTr('Napisz do asystenta…', 'Message the assistant…'))}" aria-label="${hgTr('Wiadomość', 'Message')}" value="${H.esc(this._draft || '')}">
        ${c.mic !== false && SR ? `<button type="button" class="gb r mic${this._rec ? ' on' : ''}" data-act="mic" aria-pressed="${!!this._rec}" aria-label="${hgTr('Mów', 'Speak')}">${H.icon('mdi:microphone')}</button>` : ''}
        <button type="submit" class="gb r ok" data-act="send" aria-label="${hgTr('Wyślij', 'Send')}"${this._busy2 ? ' disabled' : ''}>${H.icon('mdi:send')}</button></form></ha-card>`; }
  afterRender() { const q = this.$.querySelector('[data-k=q]'), f = this.$.querySelector('[data-k=f]'), s = this.$.querySelector('[data-k=pipe]'), cv = this.$.querySelector('.cv');
    if (q) { if (this._once(q)) q.addEventListener('input', () => { this._draft = q.value; }); if (this._focusQ) { this._focusQ = false; q.focus({ preventScroll: true }); } }
    if (f && this._once(f)) f.addEventListener('submit', (e) => { e.preventDefault(); const qq = this.$.querySelector('[data-k=q]'); this._send(qq ? qq.value : ''); });
    if (s && this._once(s)) s.addEventListener('change', () => { this._pipe = s.value; this._cid = null; });
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
    if (window.__hgDryRun && !window.__hgAssistLive) { setTimeout(() => done(hgTr('(podgląd) Tak odpowie Assist z Home Assistant.', '(preview) Home Assistant Assist replies here.')), 500); return; }
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
        done(reply || hgTr('Brak odpowiedzi', 'No reply'), url ? { tts: url } : {}); if (url) this._play(url); return; }
      const r = await h.callWS(Object.assign({ type: 'conversation/process', text: txt, conversation_id: this._cid || null, language: lang }, c.agent_id ? { agent_id: c.agent_id } : {}));
      if (r.conversation_id) this._cid = r.conversation_id; done(((((r.response || {}).speech || {}).plain || {}).speech) || hgTr('Brak odpowiedzi', 'No reply'));
    } catch (e) { done(hgTr('Nie udało się połączyć z Assist: ', 'Could not reach Assist: ') + (e && e.message ? e.message : e), { err: true }); } }
  getGridOptions() { return this._config && this._config.embedded ? { columns: 12, rows: 5 } : { columns: 6, rows: 1 }; }
}
hgReg('hg-assist-card', HGAssistCard, hgTr('Home Glass – Assist', 'Home Glass – Assist'), hgTr('Rozmowa z Assist z odpowiedzią na miejscu', 'Talk to Assist with the reply inline'));
