/* ===== Tryb edycji układu (admin): kolejność (przeciąganie + FLIP), ukrywanie/przywracanie, rozmiar S/M/L, dodawanie kafli z encji HA.
   Układ: nadpisania na bazie CFG z build.py, per zakres (widok / „rooms” / „room:<id>” / „<widok>:tiles”).
   Zapis: dane użytkownika HA (websocket frontend/set_user_data, klucz home_glass_layout – synchronizacja między urządzeniami),
   kopia w localStorage (home-glass:layout) jako zapas / natychmiastowy odczyt. */
const HG_COMP_EDIT = {
  _eHeadBtn() { const hd = this._headEl; if (!hd || hd.querySelector('.hge-hd')) return; const h1 = hd.querySelector('h1'); if (!h1) return;
    const b = document.createElement('button'); b.className = 'hge-hd'; b.dataset.hge = 'headedit'; b.setAttribute('aria-label', hgT('edit.edit_view_header')); b.title = hgT('edit.edit_view_header'); b.innerHTML = H.icon('mdi:pencil'); hd.insertBefore(b, h1.nextSibling); },
  _eHeadGet() { return Object.assign({}, this._headConf()); },
  /* domyślny tytuł i podtytuł widoku (placeholder i podgląd); w widoku pokoju {room} = nazwa pokoju, pusty podtytuł = temperatura i stan pokoju */
  _eHeadDef() { const c = this._config;
    if (c.room_head) { let rn = ''; try { const m = HGAreas.model(this._hass, c.areas || HG_NO_AREAS), a = m.byId[HGAreas.areaFromUrl()]; rn = (a && a.name) || ''; } catch (e) { /* brak obszarów */ }
      let ri = ''; try { const m = HGAreas.model(this._hass, c.areas || HG_NO_AREAS), a = m.byId[HGAreas.areaFromUrl()]; ri = (a && a.icon) || ''; } catch (e) { /* brak obszarów */ }
      return { title: '{room}', subtitle: hgT('edit.temperature_humidity_and_room'), room: rn || hgT('edit.living_room'), icon: ri || 'mdi:home-outline', iconPh: hgT('edit.room_icon'), sub0: hgT('edit.temperature_and_room_status') }; }
    return { title: c.title ?? hgT('common.welcome', { name: '{name}' }), subtitle: c.subtitle ?? hgT('edit.control_your_home_in'), room: '' }; },
  _eHead() { this._eStk = []; this._eShT = (this._eShT || 0) + 1; this._eShSnap = null; const c = this._eHeadDef(), H0 = this._eHeadGet(), ui = this._userInfo(); this._eSheet('cfg'); const S = this._eSheetEl; this._eHd = H0;
    const fld = (k, l, ph, lim) => `<label class="hs-fl"><span>${l} <em class="hd-c" data-c="${k}">${(H0[k] || '').length}/${lim}</em></span><span class="hs-s"><input class="hs-in" name="${k}" maxlength="${lim}" value="${H.esc(H0[k] || '')}" placeholder="${H.esc(ph)}" autocomplete="off"></span></label>`;
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${hgT('edit.view_header')}"><style>${HG_STY_CSS}
      .hd-c{ font-style:normal; opacity:.55; font-size:11px; margin-left:6px; } .hd-c.ov{ color:#FF6B6B; opacity:1; } .hd-pv{ display:grid; grid-template-columns:1.6fr 1.1fr .8fr; gap:10px; align-items:start; } @media (max-width:560px){ .hd-pv{ grid-template-columns:1fr; } .hd-d.d, .hd-d.t{ display:none; } }
      .hd-d{ border-radius:16px; padding:12px; background:var(--hg-tile-bg); min-width:0; } .hd-d small{ display:block; font-size:11px; opacity:.55; margin-bottom:6px; } .hd-d b{ display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; font-weight:600; line-height:1.18; } .hd-d p{ margin:4px 0 0; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; opacity:.85; line-height:1.2; }
      .hd-d.d b{ font-size:20px; } .hd-d.d p{ font-size:17px; } .hd-d.t b{ font-size:17px; } .hd-d.t p{ font-size:14px; } .hd-d.m b{ font-size:15px; } .hd-d.m p{ font-size:12.5px; }
      .hd-v{ display:none; } .hd-v.on{ display:block; } .hd-hint{ font-size:12px; opacity:.6; margin:-4px 0 4px; }
      .hd-d b ha-icon{ width:1.1em; height:1.1em; --mdc-icon-size:1.1em; margin-right:6px; vertical-align:-.12em; color:var(--hg-accent); } .hd-d.off{ opacity:.4; } .hd-d.off small::after{ content:' · ' attr(data-off); }
      .hd-vis{ display:flex; flex-direction:column; gap:6px; margin:2px 0 8px; } .hd-vr{ display:flex; align-items:center; gap:12px; min-height:48px; padding:6px 10px 6px 14px; border-radius:16px; background:var(--hg-tile-bg); }
      .hd-vr .lx-t{ flex:1; min-width:0; display:flex; flex-direction:column; } .hd-vr .lx-t b{ font-weight:600; font-size:14px; } .hd-vr .lx-t small{ opacity:.66; font-size:12px; }
      .hd-vr .lx-sw{ all:unset; cursor:pointer; flex:none; width:46px; height:28px; border-radius:999px; position:relative; transition:background .18s; } .hd-vr .lx-sw i{ position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:white; box-shadow:0 1px 4px rgba(0,0,0,.3); transition:transform .18s; }
      .hd-vr .lx-sw[aria-checked=true] i{ transform:translateX(18px); } .hd-vr .lx-sw:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }</style>
      <div class="hs-h"><b>${hgT('edit.view_header')}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgT('common.close')}">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      <div class="hs-pv"><small>${hgT('edit.preview_on_devices')}</small><div class="hd-pv"></div></div>
      <div class="hd-vis">${[['hide', hgT('edit.show_header'), hgT('edit.title_subtitle_and_icon')], ['nos', hgT('edit.show_subtitle'), hgT('edit.second_line_under_the')]].map(([k, l, d]) => `<div class="hd-vr"><span class="lx-t"><b>${l}</b><small>${d}</small></span><button class="lx-sw" role="switch" data-hge="hdvis" data-k="${k}" aria-checked="${!H0[k]}" aria-label="${H.esc(l)}"><i></i></button></div>`).join('')}</div>
      ${fld('t', hgT('edit.title'), c.title, HG_HEAD_LIM.t)}${fld('s', hgT('edit.subtitle'), c.subtitle, HG_HEAD_LIM.s)}
      <label class="hs-fl"><span>${hgT('edit.icon_next_to_the')}</span><span class="hs-s">${H.icon(H0.i || c.icon || 'mdi:shape-outline')}<input class="hs-in" name="i" value="${H.esc(H0.i || '')}" placeholder="${H.esc(c.iconPh || hgT('edit.no_icon'))}" autocomplete="off"></span></label>
      <p class="hd-hint">${hgT('edit.head_name_hint', { placeholder: '{name}', name: H.esc(ui.first || hgT('edit.head_name_none')) })}${c.room ? ' ' + hgT('edit.head_room_hint', { room: '{room}' }) : ''} ${hgT('edit.head_clock_hint', { time: '{time}', date: '{date}' })}</p>
      <button class="hs-r hs-add" data-hge="hdclock"><span class="hs-i">${H.icon('mdi:clock-outline')}</span><span class="hs-t"><b>${hgT('edit.head_clock_add')}</b><small>${hgT('edit.head_clock_add_desc')}</small></span></button>
      <button class="hs-r hs-add" data-hge="hdvar"><span class="hs-i">${H.icon('mdi:cellphone-link')}</span><span class="hs-t"><b>${hgT('edit.shorter_versions_for_phone')}</b><small>${hgT('edit.optional_empty_fields_use')}</small></span></button>
      <div class="hd-v${H0.tm || H0.sm || H0.tt || H0.st ? ' on' : ''}">${fld('tt', hgT('edit.title_tablet'), hgT('edit.same_as_main'), HG_HEAD_LIM.t)}${fld('st', hgT('edit.subtitle_tablet'), hgT('edit.same_as_main'), HG_HEAD_LIM.s)}${fld('tm', hgT('edit.title_phone'), hgT('edit.same_as_main'), 22)}${fld('sm', hgT('edit.subtitle_phone'), hgT('edit.same_as_main'), 36)}</div>
      ${this._panel ? `<div class="hs-fl"><span>${hgT('edit.panel_width')}</span>${hgPwPick(this._pwCur(), 'pw')}</div>` : ''}</div><style>${HG_PW_CSS}</style>
      <div class="hs-ac"><button class="hs-b2" data-hge="hdreset">${hgT('edit.restore_defaults')}</button><button class="hs-b" data-hge="hdok">${hgT('common.save')}</button></div></div>`;
    for (const i of S.querySelectorAll('input.hs-in')) i.addEventListener('input', () => this._eHeadPv());
    hgIcWire(S); this._eHeadPv(); },
  _eHeadVals() { const S = this._eSheetEl, o = {}; for (const i of S.querySelectorAll('input.hs-in')) { const v = i.value.trim(); if (v) o[i.name] = v; }
    if (o.i && !/^mdi:[a-z0-9-]+$/.test(o.i)) delete o.i; for (const b of S.querySelectorAll('[data-hge=hdvis]')) if (b.getAttribute('aria-checked') === 'false') o[b.dataset.k] = 1; return o; },
  _eHeadPv() { const S = this._eSheetEl, c = this._eHeadDef(), V = this._eHeadVals(), nm = this._userInfo().first || '';
    for (const i of S.querySelectorAll('input.hs-in')) { const ce = S.querySelector(`.hd-c[data-c="${i.name}"]`); if (ce) { ce.textContent = i.value.length + '/' + i.maxLength; ce.classList.toggle('ov', i.value.length >= i.maxLength); } }
    const ic = V.i || c.icon ? H.icon(V.i || c.icon) : '', off = hgT('edit.hidden'), r = (s) => H.esc(hgClockFill(String(s || '').replace(/\{name\}/g, nm).replace(/\{room\}/g, c.room), this._hass)), one = (cls, l, t, s) => `<div class="hd-d ${cls}${V.hide ? ' off' : ''}"><small data-off="${off}">${l}</small><b>${ic}${r(t)}</b>${V.nos ? '' : `<p>${r(s)}</p>`}</div>`;
    const T = V.t || c.title, Su = V.s || c.sub0 || c.subtitle;
    S.querySelector('.hd-pv').innerHTML = one('d', hgT('edit.desktop'), T, Su) + one('t', hgT('edit.tablet'), V.tt || T, V.st || Su) + one('m', hgT('edit.phone'), V.tm || T, V.sm || Su); },
  _eHeadAct(a) { const sc = this._headScope();
    if (a === 'hdvar') { this._eSheetEl.querySelector('.hd-v').classList.toggle('on'); return; }
    /* zegar: {time} na końcu podtytułu (albo tytułu, gdy podtytuł ukryty); drugi raz nic nie dopisuje */
    if (a === 'hdclock') { const S = this._eSheetEl, nos = S.querySelector('[data-hge=hdvis][data-k=nos]'), f = S.querySelector(`input.hs-in[name="${nos && nos.getAttribute('aria-checked') === 'false' ? 't' : 's'}"]`); if (!f) return;
      if (!/\{time\}/.test(f.value)) { const v = f.value.trim(); f.value = (v ? v + ' · ' : '') + '{time}'; f.dispatchEvent(new Event('input')); } f.focus(); return; }
    if (a === 'hdvis') { const b = arguments[1]; if (b) { b.setAttribute('aria-checked', String(b.getAttribute('aria-checked') === 'false')); this._eHeadPv(); } return; }
    const V = a === 'hdreset' ? {} : this._eHeadVals();
    this._eSet(sc, (L) => { if (Object.keys(V).length) L.conf._head = V; else delete L.conf._head; });
    if (sc === 'rooms:head' && HGL.data.s.null) this._eSet('null', (L) => { delete L.conf._head; });   /* stary klucz sprzed 2.10.0 */
    this._eSheet(false);
    this._paintHead(); this._eHeadBtn(); this._eToast(a === 'hdreset' ? hgT('edit.default_header_restored') : hgT('edit.header_saved')); },
  _eGhostSweep() { if (!this._eOn && !this.classList.contains('hge')) {} for (const ct of this._eConts()) for (const it of this._eItems(ct)) { const g = hgIsGhost(it), d = it.querySelector(':scope > .hge');
      if (g) { if (d) d.remove(); it.classList.add('hge-ghost'); } else if (it.classList.contains('hge-ghost')) { it.classList.remove('hge-ghost'); } } },
  /* krok 1: galeria komponentów */
  _eGallery(ct, scOver) {
    const kN = (this._eKidStk || []).length, kid = kN > 0; if (!kid) { this._eStk = []; this._eShT = (this._eShT || 0) + 1; this._eShSnap = null; }   /* galeria to poziom główny, bez szkicu; w kontenerze to krok formularza */
    const h = this._hass; this._eSheet('cfg'); const S = this._eSheetEl; const sc = scOver || (ct ? (ct.page ? ct.scope + ':tiles' : ct.scope) : (this._pageScope() + ':tiles')); this._eGalSc = sc; this._eGalCt = ct;
    const list0 = HG_COMP.filter(hgCompOk),   /* wszędzie ta sama galeria: widok, pokój i kontener */
      lay = kN >= HG_CONT_MAX ? [] : list0.filter((C) => C.cat === 'layout'), bas = list0.filter((C) => HG_COMP_BASIC.includes(C.id)), rest = list0.filter((C) => !HG_COMP_BASIC.includes(C.id) && C.cat !== 'layout'), list = [...lay, ...bas, ...rest];
    const card = (C) => { const req = C.slots.filter((x) => x.req), miss = req.find((sl) => !hgSlotCands(h, sl).length);
      const dom = miss ? H.lv(miss.l.toLowerCase(), `${miss.dom.join(', ')}${miss.dc ? ' · ' + miss.dc.join(', ') : ''}`) : '';
      return `<button class="${miss ? 'na' : ''}" role="listitem" data-hge="cgo" data-c="${C.id}"${miss ? ` title="${H.esc(hgT('edit.needs_domains', { domains: dom }))}"` : ''}><div class="th" data-th="${C.id}">${hgMockHtml(C.id)}</div><b>${H.icon(C.i)}<span>${H.esc(C.n)}</span></b><small class="cd">${H.esc(C.d)}</small>${miss ? `<small class="cna">${H.icon('mdi:link-variant-off')}<span>${hgT('edit.no_matching_entity')}</span></small><small class="cdom">${H.esc(dom)}</small>` : ''}</button>`; };
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${kid ? hgT('edit.add_to_container') : hgT('edit.add_component')}"><style>${HG_STY_CSS}${HG_COMP_CSS}${HG_MOCK_CSS}</style><div class="hs-h"><b>${kid ? hgT('edit.add_to_container') : hgT('edit.add_component')}<small style="margin-left:8px;font-weight:500;opacity:.55;font-size:12px" title="${hgT('edit.loaded_bundle_version')}">v${H.esc(String(HG_BUILD).split('+')[0])}</small></b><button class="hs-x" data-hge="sheetclose" aria-label="${hgT('common.close')}">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      ${kid ? '' : `<div class="cq"><button class="hs-r" data-hge="cgent" style="min-height:48px">${H.icon('mdi:magnify')}<span class="hs-t"><b>${hgT('edit.search_entities')}</b><small>${hgT('edit.quickly_add_a_single')}</small></span></button></div>`}
      ${lay.length ? `<h4 class="cgh">${hgT('edit.layout')}<small>${hgT('edit.containers_like_in_ha')}</small></h4><div class="cg" role="list">${lay.map(card).join('')}</div>` : ''}
      ${bas.length ? `<h4 class="cgh">${hgT('edit.basic')}<small>${hgT('edit.general_controls_for_any')}</small></h4><div class="cg" role="list">${bas.map(card).join('')}</div>` : ''}
      ${rest.length ? `<h4 class="cgh">${hgT('edit.cards')}<small>${hgT('edit.ready_made_cards_for')}</small></h4><div class="cg" role="list">${rest.map(card).join('')}</div>` : ''}</div></div>`;
    requestAnimationFrame(() => hgMkFit(S));
    /* miniatury zawsze z makiet: pomniejszone prawdziwe karty z pierwszą pasującą encją były ściśnięte, puste albo pokazywały przypadkowe urządzenie */
  },
  /* domyślne wartości slotów (pierwsze pasujące encje, listy: do 4) */
  _eCompDef(C) { const h = this._hass, v = {};
    for (const sl of C.slots) { let cs = hgSlotCands(h, sl); if (sl.auto === 'none') continue; if (sl.rank) { const m = cs.filter((e) => sl.rank.test(e + ' ' + H.name(h, e))); cs = sl.auto === 'rank' ? m : [...m, ...cs.filter((e) => !m.includes(e))]; } if (!cs.length) { if (sl.req) return null; continue; }
      v[sl.k] = sl.multi ? cs.slice(0, sl.all ? cs.length : sl.one || (sl.k === 'entities' && C.id === 'power') ? 1 : 4).map((e) => (sl.obj ? { entity: e, name: H.name(h, e), ...(h.states[e].attributes.icon ? { icon: h.states[e].attributes.icon } : {}) } : e)) : cs[0]; }
    return v; },
  /* krok 2: formularz komponentu (dodawanie i edycja – ten sam arkusz) */
  _eComp(cid, st) {
    const h = this._hass, C = HG_COMP.find((x) => x.id === cid); if (!C) return; this._eSheet('cfg'); const S = this._eSheetEl;
    if (!st && !this._eBacking && !(this._eStk || []).length) this._eSnapTake();
    const R = this._eCompR = st || { cid, sc: this._eGalSc, v: this._eCompDef(C) || {}, t: C.tile || '', n: '', i: '', z: HG_COMP_Z[C.id] || 's', ...((this._eKidStk || []).length ? { kid: 1 } : {}) };
    for (const sl of C.slots) if (sl.multi && R.v[sl.k] && !Array.isArray(R.v[sl.k])) R.v[sl.k] = [R.v[sl.k]];   /* zapis sprzed zmiany slotu na listę */
    const ed = (!!R.edit || !!R.pageK) && !R.kid, eid = (x) => (typeof x === 'string' ? x : x && x.entity), ico = (e) => (h.states[e] && h.states[e].attributes.icon) || HG_DOM_ICON2[String(e).split('.')[0]] || 'mdi:circle-outline';
    const slot = (sl) => { const v = R.v[sl.k];
      if (!sl.multi) return `<div class="hs-fl"><span>${H.esc(sl.l)}${sl.req ? '' : ''}</span><div class="hs-r hs-er"><button class="hs-eb" data-hge="cslot" data-k="${sl.k}"><span class="hs-i">${H.icon(v ? ico(v) : 'mdi:plus')}</span><span class="hs-t"><b>${H.esc(v ? H.name(h, v) : hgT('edit.choose_entity'))}</b><small>${H.esc(v || sl.dom.join(', '))}</small></span><span class="hs-p" title="${hgT('common.change')}">${H.icon(v ? 'mdi:swap-horizontal' : 'mdi:plus')}</span></button>${v && !sl.req ? `<button class="hs-del" data-hge="cdel" data-k="${sl.k}" aria-label="${hgT('edit.remove')}">${H.icon('mdi:close')}</button>` : ''}</div></div>`;
      const A = v || [];
      return `<div class="hs-fl hs-ents"><span>${H.esc(sl.l)}</span>${A.map((y, i) => `<div class="hs-r hs-er" data-ak="${sl.k}" data-ai="${i}"><span class="hs-dg" data-hgdrag role="button" tabindex="0" aria-label="${hgT('edit.drag_or_use_arrow')}">${H.icon('mdi:drag-vertical')}</span><button class="hs-eb" data-hge="cslot" data-k="${sl.k}" data-i="${i}"><span class="hs-i">${H.icon(ico(eid(y)))}</span><span class="hs-t"><b><em class="hs-ix">${i + 1}</em>${H.esc(H.name(h, eid(y)))}</b><small>${H.esc(eid(y))}</small></span><span class="hs-p">${H.icon('mdi:swap-horizontal')}</span></button><button class="hs-del" data-hge="cdel" data-k="${sl.k}" data-i="${i}" aria-label="${hgT('edit.remove')}">${H.icon('mdi:close')}</button></div>`).join('')}
        <button class="hs-r hs-add" data-hge="cslot" data-k="${sl.k}" data-i="${A.length}"><span class="hs-i">${H.icon('mdi:plus')}</span><span class="hs-t"><b>${hgT('edit.add_entity')}</b><small>${H.esc(sl.dom.join(', '))}${sl.dc ? ' · ' + H.esc(sl.dc.join(', ')) : ''}</small></span></button></div>`; };
    const main = C.tile ? R.v.e : null, T = main ? hgTypeOpts(h, main).filter(([t]) => t !== C.tile).length ? hgTypeOpts(h, main) : [[C.tile, hgT('edit.tile_type_default')]] : null;
    const okReq = C.slots.every((sl) => !sl.req || (sl.multi ? (R.v[sl.k] || []).length : R.v[sl.k]));
    /* dzieci kontenera: kolejność (uchwyt), edycja, kopia, usunięcie, w siatce szerokość */
    const kids = () => { const A = R.v.cards || [], cols = C.id === 'grid' ? Math.max(1, +((R.v.o || {}).columns) || 3) : 0;
      return `<div class="hs-fl hs-ents"><span>${hgT('edit.cards_in_the_container')}</span>${A.length ? '' : `<p class="hs-e" style="margin:2px 0 4px;opacity:.7">${hgT('edit.empty_container_add_the')}</p>`}${A.map((k, i) => { const K = HG_COMP.find((c) => c.id === k.nv_comp), sp = Math.max(1, +k.span || 1);
        return `<div class="hs-r hs-er" data-ak="cards" data-ai="${i}"><span class="hs-dg" data-hgdrag role="button" tabindex="0" aria-label="${hgT('edit.drag_or_use_arrow')}">${H.icon('mdi:drag-vertical')}</span><button class="hs-eb" data-hge="kedit" data-i="${i}"><span class="hs-i">${H.icon(hgKidIcon(k))}</span><span class="hs-t"><b><em class="hs-ix">${i + 1}</em>${H.esc(hgKidName(k))}</b><small>${H.esc(K ? K.n : String(k.type || '').replace(/^custom:/, ''))}${hgIsCont(k) ? ' · ' + hgT('edit.cards_count', { count: (k.cards || []).length }) : ''}</small></span><span class="hs-p" title="${hgT('edit.edit')}">${H.icon('mdi:pencil-outline')}</span></button>${cols > 1 ? `<button class="hs-del" data-hge="kspan" data-i="${i}" title="${hgT('edit.width_in_columns')}" aria-label="${H.lv(hgT('edit.width'), sp)}" style="font:600 12px/1 inherit;width:auto;min-width:36px;padding:0 8px">${sp}×</button>` : ''}${ed ? `<button class="hs-del" data-hge="kout" data-i="${i}" title="${hgT('edit.move_out_to_the')}" aria-label="${hgT('edit.move_out_to_the')}">${H.icon('mdi:arrow-top-left-bold-box-outline')}</button>` : ''}<button class="hs-del" data-hge="kdup" data-i="${i}" title="${hgT('edit.duplicate')}" aria-label="${hgT('edit.duplicate')}">${H.icon('mdi:content-copy')}</button><button class="hs-del" data-hge="kdel" data-i="${i}" title="${hgT('edit.remove')}" aria-label="${hgT('edit.remove')}">${H.icon('mdi:close')}</button></div>`; }).join('')}
        <button class="hs-r hs-add" data-hge="kadd"><span class="hs-i">${H.icon('mdi:plus')}</span><span class="hs-t"><b>${hgT('edit.add_card')}</b><small>${hgT('edit.any_component_tile_or')}</small></span></button></div>`; };
    const tgts = ed && R.edit ? (HGL.get(R.sc || this._eGalSc).added || []).filter((x) => x.e !== R.edit && x.v && HG_COMP.some((c) => c.id === x.comp && c.kids)) : [];
    const mv = tgts.length ? `<div class="hs-fl"><span>${hgT('edit.move_into_a_container')}</span><div class="hs-f wrap" role="group" aria-label="${hgT('edit.move_into_a_container')}">${tgts.map((x) => { const K = HG_COMP.find((c) => c.id === x.comp); return `<button data-hge="kmove" data-t="${H.esc(x.e)}">${H.icon(x.i || K.i)}${H.esc(x.n || K.n)}</button>`; }).join('')}</div></div>` : '';
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${H.esc(C.n)}"><style>${HG_STY_CSS}${HG_COMP_CSS}</style><div class="hs-h"><b>${H.icon(C.i)} ${H.esc(C.n)}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgT('common.close')}">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      <div class="hs-pv"><small>${hgT('edit.live_preview')}</small><div class="hs-pvb"></div></div>
      ${C.slots.map(slot).join('')}${C.kids ? kids() : ''}
      ${C.modes ? `<div class="hs-fl"><span>${hgT('edit.component_options')}</span><div class="hs-f wrap" role="group" aria-label="${hgT('edit.component_options')}">${C.modes.map(([m, lb, ic]) => `<button data-hge="cmod" data-m="${m}" aria-pressed="${(R.v.mode || C.modes[0][0]) === m}">${H.icon(ic)}${H.esc(lb)}</button>`).join('')}</div></div>` : ''}
      <label class="hs-fl"><span>${hgT('common.name')}</span><span class="hs-s"><input class="hs-in" name="n" value="${H.esc(R.n)}" placeholder="${H.esc(main ? H.name(h, main) : C.n)}" autocomplete="off"></span></label>
      <label class="hs-fl"><span>${hgT('edit.icon_e_g_mdi')}</span><span class="hs-s">${H.icon(R.i || C.i)}<input class="hs-in" name="i" value="${H.esc(R.i)}" placeholder="mdi:…" autocomplete="off"></span></label>
      ${(C.opts || []).map((o) => { const val = (R.v.o || {})[o.k] ?? '', l = String(o.l), a = `data-o="${o.k}"`;
        if (o.t === 'room') { const m = HGAreas.model(h); return hgForm.field(l, hgForm.select([['', hgT('edit.from_address_area')], ...m.list.map((x) => [x.id, x.name])], val, a)); }
        if (o.t === 'sel') return hgForm.field(l, hgForm.select(typeof o.choices === 'function' ? o.choices() : (o.choices || []), val, a));
        if (o.t === 'txt') return hgForm.field(l, hgForm.area({ value: val, ph: o.ph, a, code: !!o.code }));
        if (o.t === 'bool') return hgForm.toggle(l, !!val, a);
        return hgForm.field(l, hgForm.text({ value: val, ph: o.ph, a, num: o.t === 'num' })); }).join('')}
      ${C.tile ? '' : hgForm.more(hgT('edit.advanced_configuration_json'), `<small class="nf-hint">${hgT('edit.any_card_fields_e')}</small>${hgForm.area({ code: 1, rows: 6, ph: '{ }', value: R.v.x ? JSON.stringify(R.v.x, null, 2) : '', a: 'data-x="1"' }).replace('class="nf-area', 'class="hs-js nf-area')}<small class="hs-jse nf-err" hidden>${hgT('edit.invalid_json')}</small>`, !!R.v.x)}
      ${R.kid ? '' : `<div class="hs-fl"><span>${hgT('edit.size')}</span>${hgSzSeg('cz', R.z)}</div>`}${mv}
      </div><div class="hs-ac"><button class="hs-b2" data-hge="${ed ? 'sheetclose' : 'cback'}">${ed ? hgT('common.cancel') : hgT('common.back')}</button><button class="hs-b" data-hge="cok" ${okReq ? '' : 'disabled'}>${H.icon(ed || (R.kid && R.edit) ? 'mdi:check' : 'mdi:plus')}<span>${ed || (R.kid && R.edit) ? hgT('common.save') : R.kid ? hgT('edit.add_to_container') : hgT('common.add')}</span></button></div></div>`;
    for (const n of S.querySelectorAll('input[name]')) n.addEventListener('input', () => { R[n.name] = n.value.trim(); if (n.name === 'i') { const ic = n.parentElement.querySelector('ha-icon'); if (ic && /^mdi:[a-z0-9-]+$/.test(R.i)) ic.setAttribute('icon', R.i); } this._eCompPv(); });
    for (const n of S.querySelectorAll('[data-o]')) n.addEventListener(n.tagName === 'SELECT' || n.type === 'checkbox' ? 'change' : 'input', () => { R.v = Object.assign({}, R.v, { o: Object.assign({}, R.v.o || {}, { [n.dataset.o]: n.type === 'checkbox' ? n.checked : n.value.trim() }) }); this._eCompPv(); });
    for (const n of S.querySelectorAll('textarea[data-x]')) n.addEventListener('input', () => { const t = n.value.trim(), er = S.querySelector('.hs-jse'), ok = S.querySelector('[data-hge="cok"]'); let x = null, bad = false;
      if (t) try { x = JSON.parse(t); if (!x || typeof x !== 'object' || Array.isArray(x)) bad = true; } catch (e) { bad = true; }
      if (er) er.hidden = !bad; R._xBad = bad; if (ok) ok.disabled = bad || !C.slots.every((sl) => !sl.req || (sl.multi ? (R.v[sl.k] || []).length : R.v[sl.k]));
      if (!bad) { R.v = Object.assign({}, R.v); if (x && Object.keys(x).length) R.v.x = x; else delete R.v.x; this._eCompPv(); } });
    hgIcWire(S);
    requestAnimationFrame(() => this._eCompDrag()); this._eCompPv();
  },
  _eCompPv() { const R = this._eCompR, C = HG_COMP.find((x) => x.id === R.cid), h = this._hass, pv = this._eSheetEl && this._eSheetEl.querySelector('.hs-pvb'); if (!pv || !C) return;
    const n = R.n, i = /^mdi:[a-z0-9-]+$/.test(R.i || '') ? R.i : '';
    if (C.tile) { pv.className = 'hs-pvb tg2'; pv.innerHTML = R.v.e ? hgTileHtml(h, R.v.e, R.z === 's' ? 's' : R.z, { t: R.t || C.tile, n, i }) : `<p class="hs-e">${hgT('common.choose_entity')}</p>`; hgSlots({ _hass: h, $: pv }); hgPvLive(pv); return; }
    if (C.id === 'hacard' && !hgHaCard(R.v)) { pv.className = 'hs-pvb'; pv.innerHTML = `<p class="hs-e">${(R.v.o || {}).src ? hgT('edit.cannot_read_this_yaml') : hgT('edit.paste_the_card_yaml')}</p>`; return; }
    const ok = C.slots.every((sl) => !sl.req || (sl.multi ? (R.v[sl.k] || []).length : R.v[sl.k])); if (!ok) { pv.className = 'hs-pvb'; pv.innerHTML = `<p class="hs-e">${hgT('edit.choose_entities')}</p>`; return; }
    pv.className = 'hs-pvb live'; pv.innerHTML = ''; const box = document.createElement('div'); box.className = 'hs-pvf'; const cc = hgCompCard(C, R.v), el = document.createElement(cc);
    try { el.setConfig(Object.assign({ type: 'custom:' + cc }, hgCompCfg(C, R.v, h), n ? { title: n, name: n } : {}, i ? { icon: i } : {})); } catch (e) { /* pusta */ } el._hgPv = true; box.appendChild(el); pv.appendChild(box); el.hass = h; this._ePvEl = el; hgPvFit(box, el, Math.min(440, (this._panelEl && this._panelEl.clientWidth) || 420)); },
  _eCompDrag() { const S = this._eSheetEl; if (!S) return;
    for (const hd of S.querySelectorAll('[data-hgdrag]')) hd.addEventListener('pointerdown', (ev) => { const row = hd.closest('.hs-er'), key = row.dataset.ak, box = row.parentElement; ev.preventDefault(); ev.stopPropagation(); hd.setPointerCapture(ev.pointerId); row.classList.add('drag');
      const rows = () => [...box.querySelectorAll(`.hs-er[data-ak="${CSS.escape(key)}"]`)];
      const mv = (e) => { const sib = rows().filter((x) => x !== row); let ref = null; for (const x of sib) { const r = x.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { ref = x; break; } }
        const last = sib[sib.length - 1]; if (ref) { if (row.nextElementSibling !== ref) box.insertBefore(row, ref); } else if (last && last.nextElementSibling !== row) box.insertBefore(row, last.nextElementSibling); };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); row.classList.remove('drag');
        const ord = rows().map((x) => +x.dataset.ai), R = this._eCompR, A = R.v[key] || []; if (ord.every((v, i) => v === i)) return; R.v[key] = ord.map((i) => A[i]); this._eComp(R.cid, R); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); });
    /* klawiatura: strzałki góra/dół na uchwycie przesuwają encję */
    for (const hd of S.querySelectorAll('[data-hgdrag]')) hd.addEventListener('keydown', (ev) => { if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return; ev.preventDefault(); ev.stopPropagation();
      const row = hd.closest('.hs-er'), key = row.dataset.ak, i = +row.dataset.ai, j = i + (ev.key === 'ArrowUp' ? -1 : 1), R = this._eCompR, A = (R.v[key] || []).slice(); if (j < 0 || j >= A.length) return;
      [A[i], A[j]] = [A[j], A[i]]; R.v[key] = A; this._eComp(R.cid, R); const nh = this._eSheetEl && this._eSheetEl.querySelector(`.hs-er[data-ak="${CSS.escape(key)}"][data-ai="${j}"] [data-hgdrag]`); if (nh) nh.focus(); }); },
  _eCompAct(a, b) { const R = this._eCompR, h = this._hass;
    if (a[0] === 'k') return this._eKidAct(a, b);
    if (a === 'cgent') { const ct = this._eGalCt, sc = this._eGalSc; return this._eGo(() => this._eGallery(ct, sc), () => this._eSheet('add', ct, sc)); }
    if (a === 'cgo') { const ct = this._eGalCt, sc = this._eGalSc; this._eCompR = null; return this._eGo(() => this._eGallery(ct, sc), () => this._eComp(b.dataset.c)); }
    if (a === 'cback') return this._eBack();
    if (a === 'ctyp') { R.t = b.dataset.t; for (const x of b.parentElement.children) { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); } return this._eCompPv(); }
    if (a === 'cmod') { R.v = Object.assign({}, R.v, { mode: b.dataset.m }); for (const x of b.parentElement.children) x.setAttribute('aria-pressed', x === b); return this._eCompPv(); }
    if (a === 'cz') { R.z = b.dataset.z; for (const x of b.parentElement.children) x.setAttribute('aria-pressed', x === b); return this._eCompPv(); }
    const C = HG_COMP.find((x) => x.id === R.cid), sl = C && C.slots.find((x) => x.k === b.dataset.k);
    if (a === 'cdel') { if (sl.multi) { R.v[sl.k] = (R.v[sl.k] || []).slice(); R.v[sl.k].splice(+b.dataset.i, 1); } else delete R.v[sl.k]; return this._eComp(R.cid, R); }
    if (a === 'cslot') { const cur = sl.multi ? (R.v[sl.k] || []).map((y) => (typeof y === 'string' ? y : y.entity)) : [];
      const cset = new Set(hgSlotCands(h, sl)); /* raz, nie per encja (O(n²) zamrażało przeglądarkę) */
      this._eRepl = { comp: { k: sl.k, i: b.dataset.i != null ? +b.dataset.i : null }, doms: sl.dom, flt: (e) => cset.has(e), excl: cur.filter((_, i) => i !== +b.dataset.i) };
      const back = () => { this._eRepl = null; this._eComp(R.cid, this._eCompR || R); };
      return this._eGo(back, () => this._eSheet('add', null, this._eGalSc || R.sc)); }
    if (a === 'cok' && C.id === 'hacard' && !hgHaCard(R.v)) return this._eToast(hgT('edit.paste_a_valid_card'));
    if (a === 'cok' && R.kid) { if (R._xBad) return; const F = (this._eKidStk || []).pop(), kc = F && hgKidCfg(C, R, h); if (!kc) return;
      const P = F.R, A = (P.v.cards || []).slice(); if (F.i != null) { if (A[F.i] && A[F.i].span) kc.span = A[F.i].span; A[F.i] = kc; } else A.push(kc);
      P.v = Object.assign({}, P.v, { cards: A }); this._eStk.length = Math.min(this._eStk.length, F.d0); this._eRepl = null; this._eNav('b'); this._eComp(P.cid, P);
      return this._eToast(F.i != null ? hgT('edit.saved_name', { name: hgKidName(kc) }) : hgT('edit.added_to_container_name', { name: hgKidName(kc) })); }
    if (a === 'cok' && R.pageK) { if (R._xBad) return; const sc = R.sc || this._eGalSc, n = R.n, i = /^mdi:[a-z0-9-]+$/.test(R.i || '') ? R.i : '', cfg = hgCompCfg(C, R.v, h);
      /* pełne nadpisanie karty widoku: typ Nuvio, karty i opcje; wyczyszczone opcje jako null (usuwane przy scalaniu) */
      const set = { type: 'custom:' + hgCompCard(C, R.v) }; for (const q of C.opts || []) if (q.k !== 'flat' && q.k !== 'nodiv') set[q.k] = null; if (C.id !== 'grid') { set.glass = null; set.divider = null; } Object.assign(set, cfg);
      this._eSet(sc, (L) => { const cf = L.conf[R.pageK] = Object.assign({}, L.conf[R.pageK]); cf.set = Object.assign({}, cf.set || {}, set); if (n) cf.n = n; else delete cf.n; if (i) cf.i = i; else delete cf.i; delete cf.t;
        if (R.z && R.z !== this._eBaseZ(sc, R.pageK)) L.size[R.pageK] = R.z; else delete L.size[R.pageK]; });
      this._eSheet(false); this._eToast(hgT('edit.saved_name', { name: n || C.n })); this._eCompR = null; return this._eRefresh(true); }
    if (a === 'cok') { if (R._xBad) return; const sc = R.sc || this._eGalSc, n = R.n, i = /^mdi:[a-z0-9-]+$/.test(R.i || '') ? R.i : '';
      this._eSet(sc, (L) => { let key;
        if (C.tile) { const e = R.v.e; key = e; const x0 = R.edit ? L.added.find((y) => y.e === R.edit) : null, x = { e, ...(R.t && R.t !== C.tile ? { t: R.t } : R.t === C.tile && hgTypesFor(h, e)[0] !== C.tile ? { t: C.tile } : {}), ...(n ? { n } : {}), ...(i ? { i } : {}), comp: C.id };
          if (x0) Object.assign(x0, x); else if (!L.added.some((y) => y.e === e)) L.added.push(x); L.hidden = L.hidden.filter((y) => y !== e); }
        else { key = R.edit || ('c:' + C.id + ':' + Date.now().toString(36)); const x = { e: key, c: hgCompCard(C, R.v), comp: C.id, cfg: hgCompCfg(C, R.v, h), v: R.v, ...(n ? { n } : {}), ...(i ? { i } : {}) };
          const j = L.added.findIndex((y) => y.e === key); if (j >= 0) L.added[j] = x; else L.added.push(x); }
        if (R.z && R.z !== 's') L.size[key] = R.z; else delete L.size[key]; });
      this._eSheet(false); this._eToast(R.edit ? hgT('edit.saved_name', { name: n || C.n }) : hgT('edit.added_name', { name: n || C.n })); this._eCompR = null;
      return this._eRefresh(sc.endsWith(':tiles')); }
  },
  /* dzieci kontenera: dodaj (galeria jako krok), edytuj (formularz komponentu albo YAML), kopia, usuń, szerokość w siatce */
  _eKidAct(a, b) { const R = this._eCompR, A = (R.v.cards || []).slice(), i = +b.dataset.i, C = HG_COMP.find((x) => x.id === R.cid);
    const set = (X) => { R.v = Object.assign({}, R.v, { cards: X }); this._eComp(R.cid, R); };
    if (a === 'kdel') { A.splice(i, 1); return set(A); }
    const sc0 = R.sc || this._eGalSc, nm = (o) => (/^mdi:[a-z0-9-]+$/.test(o.i || '') ? { i: o.i } : {});
    /* zapis kontenera z formularza (jak Zapisz) */
    const save = (L) => { const j = L.added.findIndex((y) => y.e === R.edit); if (j < 0) return; L.added[j] = Object.assign({ e: R.edit, c: hgCompCard(C, R.v), comp: C.id, cfg: hgCompCfg(C, R.v, this._hass), v: R.v }, R.n ? { n: R.n } : {}, nm(R)); };
    if (a === 'kout') { const k = A[i]; if (!k || !R.edit) return; A.splice(i, 1); R.v = Object.assign({}, R.v, { cards: A }); const x = hgKidToAdded(k);
      this._eSet(sc0, (L) => { save(L); if (!L.added.some((y) => y.e === x.e)) L.added.push(x); L.hidden = L.hidden.filter((y) => y !== x.e); });
      this._eToast(hgT('edit.moved_out_name', { name: hgKidName(k) })); this._eComp(R.cid, R); return this._eRefresh(true); }
    if (a === 'kmove') { const kc = hgKidCfg(C, R, this._hass), te = b.dataset.t; if (!kc || !R.edit) return; let tn = '';
      this._eSet(sc0, (L) => { const T = L.added.find((y) => y.e === te), TC = T && HG_COMP.find((c) => c.id === T.comp); if (!TC) return; tn = T.n || TC.n;
        T.v = Object.assign({}, T.v, { cards: [...(T.v.cards || []), kc] }); T.cfg = hgCompCfg(TC, T.v, this._hass); L.added = L.added.filter((y) => y.e !== R.edit); delete L.size[R.edit]; });
      this._eSheet(false); this._eCompR = null; this._eToast(hgT('edit.moved_into_name', { name: tn })); return this._eRefresh(true); }
    if (a === 'kdup') { A.splice(i + 1, 0, JSON.parse(JSON.stringify(A[i]))); return set(A); }
    if (a === 'kspan') { const n = Math.max(1, +((R.v.o || {}).columns) || 3), k = Object.assign({}, A[i]), s0 = Math.max(1, +k.span || 1); if (s0 >= n) delete k.span; else k.span = s0 + 1; A[i] = k; return set(A); }
    const ct = this._eGalCt, sc = R.sc || this._eGalSc, back = () => { (this._eKidStk || []).pop(); this._eCompR = R; this._eComp(R.cid, R); };
    if (a === 'kadd') { if (!C || !C.kids) return; const d0 = this._eStk.length; (this._eKidStk = this._eKidStk || []).push({ R, i: null, d0 }); return this._eGo(back, () => this._eGallery(ct, sc)); }
    if (a === 'kedit') { const k = A[i]; if (!k) return; const K = HG_COMP.find((c) => c.id === k.nv_comp && c.id !== 'hacard');
      const st = K ? { cid: K.id, sc, v: JSON.parse(JSON.stringify(k.nv_v || {})), t: k.nv_t || K.tile || '', n: k.nv_n || '', i: k.nv_i || '', z: 's', kid: 1, edit: 1 }
        : { cid: 'hacard', sc, v: k.nv_comp === 'hacard' && k.nv_v ? JSON.parse(JSON.stringify(k.nv_v)) : { o: { src: JSON.stringify((() => { const o = {}; for (const q in k) if (!/^nv_/.test(q) && q !== 'span') o[q] = k[q]; return o; })(), null, 2) } }, t: '', n: k.nv_n || '', i: k.nv_i || '', z: 's', kid: 1, edit: 1 };
      const d0 = this._eStk.length; (this._eKidStk = this._eKidStk || []).push({ R, i, d0 }); return this._eGo(back, () => this._eComp(st.cid, st)); }
  },
  /* powrót z wyboru encji do formularza */
  _eCompPick(nv) { const R = this._eCompR, P = this._eRepl.comp, C = HG_COMP.find((x) => x.id === R.cid), sl = C.slots.find((x) => x.k === P.k), h = this._hass;
    if (sl.multi) { const A = (R.v[sl.k] || []).slice(), it = sl.obj ? { entity: nv, name: H.name(h, nv), ...(h.states[nv] && h.states[nv].attributes.icon ? { icon: h.states[nv].attributes.icon } : {}) } : nv; if (P.i != null && P.i < A.length) A[P.i] = it; else A.push(it); R.v[sl.k] = A; }
    else { R.v[sl.k] = nv; if (sl.k === 'e' && C.tile) R.t = C.tile; }
    this._eRepl = null; if ((this._eStk || []).length) this._eStk.pop(); this._eNav('b'); this._eComp(R.cid, R); },
};

/* karta dodanych kafli widoku (zakres „<widok>:tiles”) */
const HGE_CSS = `
.hge-on > .hge-ghost{ display:none !important; }
[data-hgl] > [data-hgk]{ position:relative; }
/* w układzie kolumnowym (masonry) blok jako inline-block: Chrome inaczej rysuje absolutne uchwyty i X pierwszego bloku kolumny w poprzedniej kolumnie */
.hge-on [data-hgl] > [data-hgk]:not([hidden]), [data-hgl].hge-on > [data-hgk]:not([hidden]){ display:inline-block; width:100%; vertical-align:top; break-inside:avoid; }
.hge-on [data-hgl] > [data-hgk], [data-hgl].hge-on > [data-hgk]{ outline:1.5px dashed var(--hg-accent); outline-offset:3px; border-radius:var(--r-md, 18px); animation:hgeW 1.6s ease-in-out infinite; touch-action:pan-y; user-select:none; -webkit-user-select:none; }
[data-hgl] > [data-hgk]:nth-child(2n){ animation-delay:-.8s; }
@keyframes hgeW{ 0%,100%{ rotate:-.35deg } 50%{ rotate:.35deg } }
@media (prefers-reduced-motion: reduce){ [data-hgl] > [data-hgk]{ animation:none !important; } }
:host([lite]) [data-hgl] > [data-hgk], .hge-lite [data-hgl] > [data-hgk]{ animation:none !important; }
[data-hgk].hge-drag{ animation:none !important; z-index:20; box-shadow:0 18px 48px rgba(0,0,0,.35) !important; outline-style:solid !important; cursor:grabbing; }
.hge{ position:absolute; inset:0; z-index:15; pointer-events:none; border-radius:inherit; }
.hge *{ pointer-events:auto !important; }
.hge button{ position:absolute; display:flex; align-items:center; justify-content:center; border:0; cursor:pointer; font:600 12px/1 inherit; color:var(--hg-on-accent); background:var(--hg-accent); box-shadow:0 4px 14px rgba(0,0,0,.28); -webkit-tap-highlight-color:transparent; }
.hge .hx{ top:-12px; right:12px; width:28px; height:28px; border-radius:50%; background:var(--hg-thumb, #fff); color:var(--hg-on-accent); }
.hge .hh{ top:-12px; left:12px; width:28px; height:28px; border-radius:50%; cursor:grab; touch-action:none; }
.hge .hs{ position:absolute; bottom:-12px; left:50%; transform:translateX(-50%); height:26px; padding:0 3px; border-radius:999px; background:var(--hg-thumb, #fff); color:var(--hg-on-accent); gap:2px; display:flex; align-items:center; box-shadow:0 4px 14px rgba(0,0,0,.28); }
.hge .hs i{ font-style:normal; cursor:pointer; width:24px; height:22px; border-radius:999px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; pointer-events:auto; }
.hge .hs i.on{ background:var(--hg-accent); color:var(--hg-on-accent); }
/* dotyk: większe uchwyty S / M / L i przeciągania (trafienie palcem) */
@media (pointer: coarse){ .hge .hs{ height:32px; bottom:-14px; } .hge .hs i{ width:32px; height:30px; font-size:12px; } .hge .hh, .hge .hx{ width:34px; height:34px; top:-15px; } }
.hge ha-icon{ width:18px; height:18px; --mdc-icon-size:18px; pointer-events:none; }
.hge-on > .hgtl:not(.k-clim):not(.k-cam){ padding-bottom:18px; }
.hge-cf{ position:absolute; top:26px; right:6px; z-index:3; display:flex; align-items:center; gap:6px; padding:6px 6px 6px 12px; border-radius:999px; background:var(--hg-thumb, #fff); color:var(--hg-on-accent); font:500 13px/1.2 inherit; box-shadow:0 8px 24px rgba(0,0,0,.3); max-width:calc(100% - 12px); }
.hge-cf span{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hge .hge-cf button{ position:static; height:30px; padding:0 12px; border-radius:999px; box-shadow:none; flex:none; }
.hge .hge-cf button[data-hge=cfno]{ background:rgba(0,0,0,.08); }
/* kontener dodanych kafli to nie slot: bez własnej ramki (ramki mają kafle w środku) */
.hge-on > [data-hgk="_tiles"], [data-hgl].hge-on > [data-hgk="_tiles"]{ outline:none !important; animation:none !important; }
.hge-add{ display:flex; align-items:center; justify-content:center; gap:8px; min-height:76px; border-radius:var(--r-md, 18px); border:1.5px dashed var(--hg-accent); background:var(--hg-accent-faint, rgba(160,230,60,.08)); color:inherit; font:500 15px/1 inherit; cursor:pointer; break-inside:avoid; margin:0; width:100%; box-sizing:border-box; }
.hge-addw{ min-height:76px; display:flex; align-self:start; } .hge-addw > .hge-add{ flex:1; }
.hge-add ha-icon{ width:22px; height:22px; color:var(--hg-accent-tx); }
`;

/* ===== silnik edycji (metody hg-page) ===== */

/* Ustawienia jako osobny panel z kartami: komputer = karty z lewej, telefon = przewijany pasek kart u góry */
/* Ustawienia 2.0: strony w grupach (pasek boczny), sekcje przypisane atrybutem data-pg. Stare nazwy zakładek (data-tab, _lkTab) działają dalej. */
/* Szkic ustawień w trybie edycji: zmiany tylko w HGL.data (pamięć), bez zapisu i bez przeładowania widoku.
   Zapisz: jeden zapis (HGL.save + ewentualnie konfiguracja pulpitu) i co najwyżej jedno przeładowanie. Anuluj: szkic odrzucony. */
const HG_SET_GROUPS = () => ({ general: hgT('settings.grp.general'), look: hgT('settings.grp.look'), dash: hgT('settings.grp.dash'), wall: hgT('settings.grp.wall'), sys: hgT('settings.grp.sys') });
/* stare klucze zakładek (przed 2.22) -> strony */
const HG_SET_LEGACY = { look: 'theme', head: 'header', bk: 'backup' };
/* Wyszukiwarka ustawień: tylko widoczny, przetłumaczony tekst (bez <style>, <script>, <template>, <option>), bez znaków diakrytycznych, dopasowanie od początku słowa */
const HG_LKT_CSS = (ks) => `${ks.map((k) => `.lkt[data-at=${k}] .lk-sc > [data-pg]:not([data-pg=${k}])`).join(', ')}, .lkt[data-at=__s] .lk-sc > [data-pg]:not(.hit), .lkt:not([data-at=__s]) .lk-nores{ display:none; }
.lk-side{ display:flex; flex-direction:column; gap:10px; min-height:0; overflow:auto; }
.lk-q{ display:flex; align-items:center; gap:8px; min-height:42px; padding:0 12px; border-radius:14px; background:color-mix(in srgb, var(--hg-tile-bg) 80%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 10%, transparent); }
.lk-q:focus-within{ box-shadow:inset 0 0 0 2px var(--hg-accent, #63D71E); } .lk-q ha-icon{ width:18px; height:18px; opacity:.6; flex:none; } .lk-q input{ all:unset; flex:1; min-width:0; font-size:14px; }
.lk-tabs .lk-gl{ font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; opacity:.5; padding:10px 14px 2px; } .lk-tabs .lk-gl:first-child{ padding-top:2px; }
.lk-tabs [role=tab] .lk-n{ margin-left:auto; font-size:11px; font-weight:700; min-width:20px; text-align:center; padding:1px 6px; border-radius:999px; background:color-mix(in srgb, var(--hg-accent, #63D71E) 30%, transparent); }
.lk-tabs [role=tab] .lk-ch{ display:none; margin-left:auto; opacity:.5; }
.lk-ph{ display:flex; align-items:center; gap:10px; min-height:40px; } .lk-ph b{ font-size:20px; font-weight:600; letter-spacing:-.01em; } .lk-ph small{ font-size:12px; opacity:.6; }
.lk-ph .lk-bk{ all:unset; cursor:pointer; display:none; place-items:center; width:40px; height:40px; border-radius:50%; background:color-mix(in srgb, currentColor 8%, transparent); } .lk-ph .lk-bk:focus-visible{ outline:2px solid var(--hg-accent, #63D71E); }
.lk-nores{ padding:24px; text-align:center; opacity:.65; }
.lk-adv{ border-radius:14px; background:color-mix(in srgb, currentColor 4%, transparent); } .lk-adv > summary{ cursor:pointer; list-style:none; display:flex; align-items:center; gap:8px; min-height:40px; padding:0 12px; font-size:13px; font-weight:600; }
.lk-adv > summary::-webkit-details-marker{ display:none; } .lk-adv > summary::after{ content:''; margin-left:auto; width:8px; height:8px; border-right:2px solid currentColor; border-bottom:2px solid currentColor; transform:rotate(45deg); opacity:.55; transition:transform .2s; }
.lk-adv[open] > summary::after{ transform:rotate(225deg); } .lk-adv > summary:focus-visible{ outline:2px solid var(--hg-accent, #63D71E); border-radius:14px; } .lk-adv > summary small{ font-weight:400; opacity:.6; }
.lk-adv > .rx-cl{ padding:0 12px 12px; }
.lk-ab{ display:flex; flex-direction:column; gap:8px; } .lk-ab a{ color:var(--hg-accent-tx, #63D71E); font-weight:600; text-decoration:none; } .lk-ab a:hover{ text-decoration:underline; } .lk-ab code{ font-size:12px; opacity:.75; }
@media (max-width:820px){ .lkt[data-dd=nav] .lk-sc, .lkt[data-dd=nav] .lk-ft{ display:none; } .lkt[data-dd=page] .lk-side{ display:none; } .lkt .lk-ph .lk-bk{ display:grid; }
  .lkt[data-dd=nav] .lk-side{ overflow:auto; } .lkt .lk-tabs{ flex-direction:column; overflow:visible; margin:0; } .lkt .lk-tabs [role=tab]{ min-height:52px; border-radius:14px; font-size:15px; padding:0 14px; }
  .lkt .lk-tabs [role=tab] .lk-ch{ display:inline-flex; } .lkt .lk-tabs [role=tab][aria-selected=true]{ background:transparent; box-shadow:none; font-weight:500; } }
:host([mode=phone]) .lkt[data-dd=nav] .lk-sc, :host([mode=phone]) .lkt[data-dd=nav] .lk-ft{ display:none; } :host([mode=phone]) .lkt[data-dd=page] .lk-side{ display:none; } :host([mode=phone]) .lkt .lk-ph .lk-bk{ display:grid; }
:host([mode=phone]) .lkt .lk-tabs{ flex-direction:column; overflow:visible; } :host([mode=phone]) .lkt .lk-tabs [role=tab]{ min-height:52px; border-radius:14px; font-size:15px; } :host([mode=phone]) .lkt .lk-tabs [role=tab] .lk-ch{ display:inline-flex; }
.hge-sheet.lkt{ width:min(1120px, calc(100vw - 32px)); height:min(880px, calc(100vh - 40px)); max-height:none; display:grid; grid-template-columns:232px minmax(0, 1fr); grid-template-rows:auto minmax(0, 1fr) auto; column-gap:18px; }
.lkt > .hs-h, .lkt > .lk-ft{ grid-column:1 / -1; } .lkt > .hs-h b{ display:inline-flex; align-items:center; gap:10px; font-size:18px; } .lkt > .hs-h b ha-icon{ width:22px; height:22px; color:var(--hg-accent-tx, #63D71E); }
.lk-tabs{ display:flex; flex-direction:column; gap:4px; overflow:auto; padding:2px; }
.lk-tabs [role=tab]{ all:unset; cursor:pointer; position:relative; display:flex; align-items:center; gap:10px; min-height:44px; padding:0 14px; border-radius:14px; font-size:14px; font-weight:500; opacity:.78; transition:background .2s, opacity .2s, color .2s; }
.lk-tabs [role=tab] ha-icon{ width:20px; height:20px; flex:none; } .lk-tabs [role=tab]:hover{ opacity:1; background:color-mix(in srgb, currentColor 6%, transparent); }
.lk-tabs [role=tab][aria-selected=true]{ opacity:1; font-weight:600; background:color-mix(in srgb, var(--hg-accent, #63D71E) 18%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--hg-accent, #63D71E) 40%, transparent); }
.lk-tabs [role=tab][aria-selected=true] ha-icon{ color:var(--hg-accent-tx, #63D71E); } .lk-tabs [role=tab]:focus-visible{ outline:2px solid var(--hg-accent, #63D71E); outline-offset:2px; }
.lkt .lk-sc{ container:hgsh / inline-size; display:flex; flex-direction:column; gap:12px; overflow:auto; } .lkt .lk-sc.sw > [data-tab]{ animation:lktIn .32s cubic-bezier(.2,0,0,1) both; }
@keyframes lktIn{ from{ opacity:0; transform:translateY(8px); } to{ opacity:1; transform:none; } } @media (prefers-reduced-motion: reduce){ .lkt .lk-sc.sw > [data-tab]{ animation:none; } }
@media (max-width:820px){ .hge-sheet.lkt{ grid-template-columns:minmax(0, 1fr); grid-template-rows:auto auto minmax(0, 1fr) auto; } .lk-tabs{ flex-direction:row; overflow-x:auto; scrollbar-width:none; margin:0 -4px; } .lk-tabs::-webkit-scrollbar{ display:none; } .lk-tabs [role=tab]{ flex:none; min-height:40px; padding:0 12px; font-size:13px; border-radius:999px; } }
:host([mode=phone]) .hge-sheet.lkt{ width:100vw; height:92vh; grid-template-columns:minmax(0, 1fr); grid-template-rows:auto auto minmax(0, 1fr) auto; }
:host([mode=phone]) .lk-tabs{ flex-direction:row; overflow-x:auto; scrollbar-width:none; } :host([mode=phone]) .lk-tabs [role=tab]{ flex:none; min-height:40px; padding:0 12px; font-size:13px; border-radius:999px; }
/* #2.22.1 telefon i wąski tablet: jedna kolumna (lista albo strona) na pełną szerokość, bez przewijania w poziomie, pasek akcji nad dolną nawigacją */
.lkt .lk-sc, .lkt .lk-side{ min-width:0; box-sizing:border-box; } .lkt .lk-sc{ overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; }
.lkt .lk-sc > *, .lkt .lk-sc .lk-g, .lkt .lk-sc .lk-g > *{ min-width:0; max-width:100%; box-sizing:border-box; } .lkt .lk-sc .hgs-t{ min-width:0; max-width:100%; }
@media (max-width:820px){ .hge-sheet.lkt{ grid-template-columns:minmax(0, 1fr); grid-template-rows:auto minmax(0, 1fr) auto; }
  .hge-sheet.lkt > .lk-side, .hge-sheet.lkt > .lk-sc{ grid-row:2; grid-column:1; } .hge-sheet.lkt > .lk-ft{ grid-row:3; padding-bottom:max(10px, env(safe-area-inset-bottom)); } }
:host([mode=phone]) .hge-sheet.lkt{ width:100%; max-width:100vw; height:92vh; height:calc(100dvh - max(56px, env(safe-area-inset-top) + 16px)); grid-template-columns:minmax(0, 1fr); grid-template-rows:auto minmax(0, 1fr) auto; }
:host([mode=phone]) .hge-sheet.lkt > .lk-side, :host([mode=phone]) .hge-sheet.lkt > .lk-sc{ grid-row:2; grid-column:1; } :host([mode=phone]) .hge-sheet.lkt > .lk-ft{ grid-row:3; padding-bottom:max(10px, env(safe-area-inset-bottom)); }
`;
const HG_LOOK_CSS = `
.lk{ display:flex; flex-direction:column; max-height:min(86vh, calc(100dvh - 24px)); }
.lk .lk-sc{ gap:12px; flex:1 1 auto; min-height:0; scrollbar-width:thin; scrollbar-color:color-mix(in srgb, currentColor 22%, transparent) transparent; padding:2px 4px 8px 2px; }
.lk .lk-sc::-webkit-scrollbar{ width:6px; } .lk .lk-sc::-webkit-scrollbar-thumb{ background:color-mix(in srgb, currentColor 22%, transparent); border-radius:9px; } .lk .lk-sc::-webkit-scrollbar-track{ background:transparent; }
.lk-g{ position:relative; padding:14px; border-radius:20px; background:color-mix(in srgb, var(--hg-tile-bg) 70%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 8%, transparent); display:flex; flex-direction:column; gap:12px; }
.lk-g h4{ margin:0; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; letter-spacing:.01em; } .lk-g h4 ha-icon{ width:18px; height:18px; opacity:.7; }
.lk-g h4 em{ margin-left:auto; font-style:normal; font-variant-numeric:tabular-nums; padding:3px 10px; border-radius:999px; background:var(--hg-accent); color:var(--hg-on-accent); font-size:12px; }
.lk-hn{ margin-top:-8px; opacity:.6; font-size:12px; }
.lk-sw{ display:grid; grid-template-columns:repeat(auto-fill, minmax(58px,1fr)); gap:10px 6px; }
.lk-sw button, .lk-cc{ all:unset; position:relative; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; font-size:11px; }
.lk-sw i, .lk-cc i{ width:38px; height:38px; border-radius:50%; background:var(--c); display:grid; place-items:center; color:transparent; box-shadow:0 0 0 2px transparent; transition:box-shadow .15s, transform .15s; }
.lk-cc i{ background:var(--c); color:rgba(255,255,255,.95); } .lk-cc input{ position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; }
.lk-sw ha-icon, .lk-cc ha-icon{ width:20px; height:20px; }
.lk-sw [aria-pressed=true] i, .lk-cc[aria-pressed=true] i{ color:#fff; box-shadow:0 0 0 2px var(--hg-tile-bg), 0 0 0 4px var(--c); mix-blend-mode:normal; }
.lk-sw [aria-pressed=true] i ha-icon{ filter:drop-shadow(0 1px 1px rgba(0,0,0,.35)); }
.lk-sw button:focus-visible i, .lk-cc:focus-within i{ outline:2px solid var(--hg-accent); outline-offset:3px; }
.lk-pv{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px; border-radius:16px; background:var(--hg-tile-bg); }
.lk-pc{ display:flex; align-items:center; gap:10px; min-width:0; } .lk-pi{ width:36px; height:36px; border-radius:12px; display:grid; place-items:center; flex:none; } .lk-pi ha-icon{ width:20px; height:20px; }
.lk-pt{ display:flex; flex-direction:column; font-size:13px; min-width:0; } .lk-pt small{ font-size:12px; font-weight:600; }
.lk-pb{ display:inline-flex; align-items:center; gap:4px; height:32px; padding:0 14px; border-radius:999px; font-size:13px; font-weight:600; flex:none; } .lk-pb ha-icon{ width:16px; height:16px; }
.lk-bgs{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:10px; } @media (max-width:520px){ .lk-bgs{ grid-template-columns:repeat(2, minmax(0,1fr)); } }
.lk-bgs button{ all:unset; outline:none !important; -webkit-tap-highlight-color:transparent; cursor:pointer; display:flex; flex-direction:column; gap:6px; font-size:12px; min-width:0; }
.lk-bgs span{ position:relative; display:block; aspect-ratio:16/10; border-radius:14px; overflow:hidden; box-shadow:0 0 0 1px color-mix(in srgb, currentColor 10%, transparent); transition:box-shadow .15s; }
.lk-bgs img{ width:100%; height:100%; object-fit:cover; display:block; }
.lk-bgs span ha-icon{ position:absolute; top:6px; right:6px; width:16px; height:16px; padding:3px; border-radius:50%; background:var(--hg-accent); color:var(--hg-on-accent); opacity:0; transform:scale(.6); transition:.15s; }
.lk-bgs [aria-pressed=true] span{ box-shadow:0 0 0 2px var(--hg-glass-bg, #1E242C), 0 0 0 4px var(--hg-accent, #63D71E); } .lk-bgs [aria-pressed=true] span ha-icon{ opacity:1; transform:none; }
.lk-bgs small{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.8; } .lk-bgs button:focus-visible span{ outline:none; box-shadow:0 0 0 2px var(--hg-glass-bg, #1E242C), 0 0 0 4px var(--hg-accent, #63D71E); }
.lk-bgs span[data-err]::after{ content:attr(data-et); position:absolute; inset:auto 6px 6px 6px; font-size:11px; line-height:1.2; padding:3px 6px; border-radius:8px; background:rgba(0,0,0,.45); color:#fff; text-align:center; }
.lk-row{ display:flex; gap:8px; align-items:center; } .lk-url{ flex:1 1 auto; min-width:0; }
.lk-mini{ all:unset; position:relative; z-index:1; cursor:pointer; height:32px; padding:0 12px; margin:0; border-radius:999px; background:var(--hg-accent); color:var(--hg-on-accent); font-size:13px; font-weight:600; display:grid; place-items:center; flex:none; }
.lk-up{ all:unset; cursor:pointer; height:44px; padding:0 14px; border-radius:999px; display:inline-flex; align-items:center; gap:6px; background:var(--hg-tile-bg); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 10%, transparent); font-size:13px; font-weight:600; flex:none; } .lk-up ha-icon{ width:18px; height:18px; }
.lk-grd{ display:grid; grid-template-columns:64px 1fr 1fr; grid-template-rows:auto auto; gap:8px 10px; align-items:center; }
.lk-gp{ grid-row:span 2; width:64px; height:84px; border-radius:14px; box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent); }
.lk-st{ position:relative; display:flex; align-items:center; gap:8px; height:38px; padding:0 10px 0 6px; border-radius:999px; background:var(--hg-tile-bg); font-size:13px; cursor:pointer; min-width:0; }
.lk-st i{ width:26px; height:26px; border-radius:50%; flex:none; box-shadow:inset 0 0 0 1px rgba(255,255,255,.25); } .lk-st input{ position:absolute; inset:0; opacity:0; width:100%; height:100%; cursor:pointer; }
.lk-seg{ grid-column:2 / span 2; display:grid; grid-template-columns:1fr 1fr; padding:3px; border-radius:999px; background:var(--hg-tile-bg); }
.lk-seg button{ all:unset; cursor:pointer; height:32px; border-radius:999px; text-align:center; font-size:13px; font-weight:600; }
.lk-seg [aria-pressed=true]{ background:var(--hg-accent); color:var(--hg-on-accent); }
.lk-rg{ -webkit-appearance:none; appearance:none; width:100%; height:28px; background:transparent; margin:0; cursor:pointer; }
.lk-rg::-webkit-slider-runnable-track{ height:8px; border-radius:9px; background:linear-gradient(90deg, var(--hg-accent) var(--v), color-mix(in srgb, currentColor 14%, transparent) var(--v)); }
.lk-rg::-moz-range-track{ height:8px; border-radius:9px; background:linear-gradient(90deg, var(--hg-accent) var(--v), color-mix(in srgb, currentColor 14%, transparent) var(--v)); }
.lk-rg::-webkit-slider-thumb{ -webkit-appearance:none; width:24px; height:24px; margin-top:-8px; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.3), 0 0 0 3px var(--hg-accent); }
.lk-rg::-moz-range-thumb{ width:22px; height:22px; border:0; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.3), 0 0 0 3px var(--hg-accent); }
.lk-rg:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:4px; border-radius:9px; }
.lk-ft{ position:relative; display:flex; justify-content:space-between; gap:10px; padding-top:12px; margin-top:4px; border-top:1px solid color-mix(in srgb, currentColor 8%, transparent); flex:none; }
.lk-gh, .lk-ok{ all:unset; cursor:pointer; height:44px; padding:0 18px; border-radius:999px; display:inline-flex; align-items:center; gap:6px; font-size:14px; font-weight:600; }
.lk-gh{ box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent); } .lk-gh ha-icon{ width:18px; height:18px; }
.lk-ok{ background:var(--hg-accent); color:var(--hg-on-accent); padding:0 26px; }
.lk-gh:focus-visible, .lk-ok:focus-visible, .lk-up:focus-visible, .lk-mini:focus-visible, .lk-seg button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.lk-seg.lk-lng{ grid-column:auto; grid-template-columns:repeat(auto-fit, minmax(96px, 1fr)); margin-top:12px; } .lk-seg.lk-pf{ grid-template-columns:repeat(var(--n, 3), minmax(0, 1fr)); margin-top:4px; } .lk-pf button{ padding:0 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .lk-lng button{ transition:background .2s, color .2s; }
@media (max-width:480px){ .lk-up span{ display:none; } .lk-up{ width:44px; padding:0; justify-content:center; } .lk-g{ padding:12px; } }
@media (max-height:500px){ .lk{ max-height:calc(100dvh - 16px); } .lk-bgs{ grid-template-columns:repeat(5, minmax(0,1fr)); } .lk-sw{ grid-template-columns:repeat(9, minmax(0,1fr)); } }
@media (prefers-reduced-motion: reduce){ .lk *{ transition:none !important; } }
`;
/* podgląd: karty w podglądzie omijają zamrożenie edycji i rysują się od razu */
function hgPvLive(pv) { const go = (r) => { for (const x of r.querySelectorAll('*')) { if (x.rerender && !x._hgPv) { x._hgPv = true; try { x.rerender(); } catch (e) { /* karta bez konfiguracji */ } } if (x.shadowRoot) go(x.shadowRoot); } }; go(pv); requestAnimationFrame(() => go(pv)); }
/* wybór stylu: karty z miniaturą danego stylu (ten sam komponent w „+ Dodaj” i w ustawieniach) */
function hgStyleCards(h, e, opts, cur, act, room) {
  return `<div class="hs-sty" role="radiogroup" aria-label="${hgT('edit.style')}">${opts.map(([t, l]) => { const sel = cur === t;
    const th = t === 'card' && opts === HG_GRP_TYPES ? `<div class="hs-th grp g-card" aria-hidden="true"><b></b><i></i><i></i><i></i><i></i></div>` : t.startsWith('g-') ? `<div class="hs-th grp ${t}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>` : e && h.states[e] && HG_THUMB_T.has(t) && !room ? `<div class="hs-th tile" aria-hidden="true"><div class="tg2">${hgTileHtml(h, e, 's', { t }).replace(/<(\/?)button\b/g, '<$1span').replace(/ (data-act|data-e|data-hgk)="[^"]*"/g, '')}</div></div>`
      : `<div class="hs-th sch s-${HG_SCHEMA[t] || 'n'}"><i></i><b></b><b></b><u></u></div>`;
    return `<button data-hge="${act}" data-t="${H.esc(t)}" role="radio" aria-checked="${sel}" aria-pressed="${sel}">${th}<span>${H.esc(l)}</span></button>`; }).join('')}</div>`;
}
const HG_STY_CSS = `
.hs-sty{ display:grid; grid-template-columns:repeat(auto-fill, minmax(132px, 1fr)); gap:10px; }
.hs-sty > button{ all:unset; box-sizing:border-box; cursor:pointer; display:flex; flex-direction:column; gap:8px; padding:8px 8px 10px; border-radius:18px; background:var(--hg-tile-bg); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 10%, transparent); transition:box-shadow .15s, transform .15s; min-width:0; }
.hs-sty > button > span{ font-size:13px; font-weight:600; padding:0 4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hs-sty > button[aria-checked=true]{ box-shadow:inset 0 0 0 1.5px var(--hg-accent); }
.hs-sty > button:focus{ outline:none; } .hs-sty > button:focus-visible:not([aria-checked=true]){ outline:1.5px solid var(--hg-accent); outline-offset:2px; }
.hs-th.tile ha-icon, .hs-th.tile svg{ max-width:40px; max-height:40px; } .hs-th.tile .tg2 > *{ max-height:120px; overflow:hidden; }
.hs-th.grp{ display:grid; gap:4px; padding:8px; box-sizing:border-box; } .hs-th.grp i{ border-radius:6px; background:color-mix(in srgb, currentColor 16%, transparent); } .hs-th.grp i:first-of-type{ background:color-mix(in srgb, var(--hg-accent) 70%, transparent); }
.hs-th.g-card{ grid-template-columns:1fr 1fr; grid-template-rows:8px 1fr 1fr; } .hs-th.g-card b{ grid-column:1 / -1; width:40%; border-radius:4px; background:color-mix(in srgb, currentColor 35%, transparent); }
.hs-th.g-list{ grid-template-rows:repeat(4, 1fr); } .hs-th.g-grid{ grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; }
.hs-th.g-car{ grid-auto-flow:column; grid-auto-columns:42%; overflow:hidden; } .hs-th.g-clist{ grid-template-rows:repeat(4, 1fr); gap:3px; } .hs-th.g-clist i{ border-radius:999px; width:70%; }
.hs-sty > button[aria-checked=true] > span::before{ content:''; display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--hg-accent); margin-right:6px; vertical-align:1px; }
.hs-sty > button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.hs-th{ position:relative; height:64px; border-radius:12px; overflow:hidden; pointer-events:none; background:color-mix(in srgb, currentColor 5%, transparent); }
.hs-th.tile .tg2{ display:block; width:200%; transform:scale(.5); transform-origin:0 0; padding:8px; box-sizing:border-box; }
.hs-th.tile .hgtl{ min-height:0; } .hs-th.tile span.hgtb{ display:flex; align-items:center; gap:10px; min-width:0; flex:1; } .hs-th.tile .hgtl > span:not(.hgtb):not(.tv){ display:inline-flex; }
.hs-th.sch i{ position:absolute; left:10px; top:12px; width:22px; height:22px; border-radius:7px; background:var(--hg-accent); }
.hs-th.sch b{ position:absolute; left:40px; top:14px; height:6px; width:46%; border-radius:4px; background:color-mix(in srgb, currentColor 35%, transparent); } .hs-th.sch b + b{ top:26px; width:28%; opacity:.6; }
.hs-th.sch u{ position:absolute; left:10px; right:10px; bottom:10px; height:12px; border-radius:6px; background:color-mix(in srgb, currentColor 14%, transparent); }
.hs-th.s-c i{ top:21px; } .hs-th.s-c b{ top:24px; } .hs-th.s-c b + b, .hs-th.s-c u{ display:none; }
.hs-th.s-m i{ left:calc(50% - 11px); top:14px; } .hs-th.s-m b{ left:30%; width:40%; top:44px; } .hs-th.s-m b + b, .hs-th.s-m u{ display:none; }
.hs-th.s-k u{ height:20px; background:linear-gradient(90deg, var(--hg-accent) 0 40%, color-mix(in srgb, currentColor 14%, transparent) 40%); }
.hs-th.s-v{ background:linear-gradient(135deg, color-mix(in srgb, currentColor 22%, transparent), color-mix(in srgb, currentColor 6%, transparent)); } .hs-th.s-v i{ border-radius:50%; width:10px; height:10px; background:#e33; }
.hs-ac{ display:flex !important; justify-content:flex-end !important; align-items:center; gap:10px; }
.hs-ac > button{ all:unset; box-sizing:border-box; cursor:pointer; flex:none !important; width:auto !important; height:44px; padding:0 20px; border-radius:999px; display:inline-flex !important; align-items:center; gap:6px; font-size:14px; font-weight:600; line-height:1; white-space:nowrap; }
.hs-ac > button ha-icon{ width:18px; height:18px; flex:none; }
.hs-ac > .hs-b{ background:var(--hg-accent); color:var(--hg-on-accent); }
.hs-ac > button{ min-width:104px; justify-content:center; }
@media (max-width:600px){ .hs-ac{ flex-direction:column-reverse; align-items:stretch !important; } .hs-ac > button{ width:100% !important; } }
.hs-ac > .hs-b2{ box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent); color:inherit; background:none; }
.hs-ac > button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
`;
const HG_EDIT = {
  /* otwarty podgląd na żywo: nowy stan z HA -> karta (hass) albo przerysowanie kafla (max co 1 s) */
  _ePvTick(h) {
    const pv = this._eSheetEl.querySelector('.hs-pvb'); if (!pv) return;
    if (pv.classList.contains('live') && this._ePvEl) { this._ePvEl.hass = h; return; }
    for (const x of pv.querySelectorAll('hg-ac-card, hg-camera-card')) x.hass = h;
    if (this._ePvT) return; this._ePvT = setTimeout(() => { this._ePvT = 0; const p2 = this._eSheetEl && this._eSheetEl.querySelector('.hs-pvb'); if (!p2 || p2.classList.contains('live') || p2.querySelector('hg-ac-card, hg-camera-card')) return;
      if (this._eCfgR && this._eSheetEl.querySelector('[data-hge=cfgsave]')) this._eCfgPv();
      else { const b = this._eSheetEl.querySelector('[data-hge=addt][aria-pressed=true]'); if (b && this._eAddE) { p2.innerHTML = hgTileHtml(this._hass, this._eAddE, 's', { t: b.dataset.t }); hgSlots({ _hass: this._hass, $: p2 }); hgPvLive(p2); } } }, 1000);
  },
  /* klucz karty panelu: typ + pierwsza encja/tytuł/obszar (+ numer przy powtórzeniach) */
  _keys(cards) { const seen = {}; return cards.map((cc) => { const b = `${String(cc.type || '').replace('custom:', '')}|${cc._hgid || cc.entity || (cc.entities && cc.entities[0]) || cc.title || cc.area || ''}`; seen[b] = (seen[b] || 0) + 1; return seen[b] > 1 ? `${b}#${seen[b]}` : b; }); },
  _pageScope() { const v = this._config.view; return ['rooms', 'pokoj'].includes(v) ? null : v; },
  /* bazowe karty z CFG + nadpisania: kolejność (zamiana obszarów siatki albo kolejność DOM), ukryte, rozmiar, kafle dodane */
  _applyLayout(cards) {
    const sc = this._pageScope(); this._lkeys = this._keys(cards);
    if (!sc) return cards.map((cc, i) => Object.assign({}, cc, { _k: this._lkeys[i] }));
    const L = HGL.get(sc), keys = this._lkeys, areas = !!this._config.panel.areas;
    let out = cards.map((cc, i) => Object.assign({}, cc, { _k: keys[i] }));
    /* dodane komponenty (nie proste kafle) to osobne karty panelu z kluczem „+klucz”: przesuwa się je między kartami domyślnymi (siatka z obszarami: jak dawniej, w bloku kafli) */
    /* bez obszarów siatki każda dodana pozycja (komponent i zwykły kafel, #17) jest osobną kartą panelu, w kolejności kafli (tl.order), więc da się je przeplatać; z obszarami zostaje blok kafli */
    const tl = HGL.get(sc + ':tiles'), solo = areas ? [] : HGL.sort(tl.added.filter((x) => (x.c ? customElements.get(x.c) : x.e) && !tl.hidden.includes(x.e)), (x) => x.e, tl.order);
    for (const x of solo) { const z = tl.size[x.e]; out.push({ type: 'custom:hg-tiles-card', scope: sc + ':tiles', one: x.e, _k: '+' + x.e, span: z === 'l' ? 'full' : z === 'm' ? 2 : 1, min_h: 0, _tiles: true }); }
    if (L.order.length) {
      if (areas) { const slot = out.map((c) => c.area), byK = new Map(out.map((c) => [c._k, c])); const used = new Set();
        const ord = L.order.filter((k) => byK.has(k)); if (ord.length === out.length) out = ord.map((k, i) => { used.add(k); return Object.assign({}, byK.get(k), { area: slot[i] }); }); }
      else out = HGL.sort(out, (c) => c._k, L.order);
    }
    out = out.map((c) => { const cf = L.conf[c._k]; if (!cf) return c; const o = hgSetMerge(c, cf.set);
      if (cf.n) { o.title = cf.n; o.name = cf.n; } if (cf.i) o.icon = cf.i;
      if (cf.t && cf.t.startsWith('g-')) { const st = this._hass && this._hass.states, es = []; for (const v of Object.values(o)) if (Array.isArray(v)) for (const y of v) { const e = typeof y === 'string' ? y : y && y.entity; if (e && st && st[e] && !es.includes(e)) es.push(e); }
        if (es.length) return { type: 'custom:hg-tiles-card', group: { es, lay: cf.t, n: cf.n || o.title || o.name || HG_GRP_LBL[String(o.type || '').replace(/^custom:(hg|nuvio)-|-card$/g, '')] || '', i: cf.i || o.icon || '' }, area: c.area, span: c.span, min_h: Math.min(c.min_h ?? 60, 60), _k: c._k }; return o; }
      if (cf.t && cf.t !== 'card') { const main = Object.entries(o).map(([, v]) => (typeof v === 'string' && this._hass && this._hass.states[v] ? v : Array.isArray(v) && typeof v[0] === 'string' && this._hass && this._hass.states[v[0]] ? v[0] : null)).find(Boolean);
        if (main) return { type: 'custom:hg-tiles-card', single: { e: main, t: cf.t, n: cf.n, i: cf.i }, area: c.area, span: c.span, min_h: Math.min(c.min_h ?? 60, 60), _k: c._k }; }
      return o; });
    for (const c of out) { const z = L.size[c._k]; if (z && !areas) { if (z === 'l') c.span = 'full'; else if (z === 'm') c.span = 2; else c.span = 1; } c._hid = L.hidden.includes(c._k); }
    if (areas && tl.added.length) out.push({ type: 'custom:hg-tiles-card', scope: sc + ':tiles', _k: '_tiles', span: 'full', min_h: 40, _tiles: true });
    if (tl.added.length) { const hi = out.findIndex((c) => c.hint_sc); if (hi >= 0) out.push(out.splice(hi, 1)[0]); }   /* podpowiedź pod kafelkami */   /* podpowiedź pod kafelkami */
    return out;
  },
  _isAdmin() { return !!(this._hass && this._hass.user && this._hass.user.is_admin); },
  /* edycja: admin (wspólny dashboard) albo osoba z własnym układem (HGShared.own) */
  _canEdit() { return HGL.canEdit(this._hass); },
  /* wszystkie kontenery edycji w widoku: panel (karty) + kontenery data-hgl w cieniach kart */
  _eConts() {
    const out = []; const sc = this._pageScope();
    if (sc) out.push({ el: this._panelEl, scope: sc, page: true, root: this.shadowRoot });
    const walk = (el, d) => { if (!el || !el.shadowRoot || d > 2) return; const r = el.shadowRoot;
      for (const c of r.querySelectorAll('[data-hgl]')) out.push({ el: c, scope: c.dataset.hgl, root: r, host: el, sz: !!c.dataset.hgsz });
      for (const x of r.querySelectorAll('hg-tiles-card, hg-areas-card, hg-room-card')) walk(x, d + 1); };
    for (const c of this._cards || []) walk(c, 0);
    return out;
  },
  /* karta panelu z dodanym komponentem („+klucz”): ustawienia, rozmiar i usuwanie działają na zakresie kafli widoku */
  _eMap(ct, k) { return ct.page && k && k[0] === '+' ? [Object.assign({}, ct, { scope: this._pageScope() + ':tiles', page: false, sz: true, via: ct }), k.slice(1)] : [ct, k]; },
  _eItems(ct) { return ct.page ? [...ct.el.children].filter((w) => w.classList.contains('cw') && !w.hidden && w.dataset.hgk && w.dataset.hgk !== '_tiles') : [...ct.el.children].filter((x) => x.dataset && x.dataset.hgk); },
  _editEnter() {
    /* paczka z pamięci przeglądarki starsza niż na serwerze: raz na sesję komunikat z prośbą o odświeżenie */
    if (!window.__hgVerChk && typeof HG_ASSET === 'string' && typeof HG_BUILD === 'string' && !HG_BUILD.startsWith('__')) { window.__hgVerChk = 1;
      fetch(HG_ASSET + 'nuvio.js?nocache=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).then((t) => { const m = new RegExp('HG_BUILD = ' + "'" + "([^']+)'").exec(t || '');
        if (m && m[1] !== HG_BUILD) this._eToast(hgT('edit.version_mismatch', { version: HG_BUILD.split('+')[0], server: m[1].split('+')[0] })); }).catch(() => {}); }
    if (this._editing || !this._canEdit()) return;
    this._editing = true; HGL.editing = true; this._eSnap = JSON.stringify(HGL.data);
    HGDraft.discard(this); this._eUnload = (e) => { if (this._eDirty()) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', this._eUnload);
    this._menuOpen = false; this._paintTop(true);
    this.setAttribute('editing', '');
    for (const sc of Object.keys(HGL.data.s || {})) { const L = HGL.get(sc); if (hgCleanL(L)) HGL.set(sc, L); }
    this._eWire(); this._eDecorate(); this._eGhostSweep(); this._eHeadBtn(); this._eBar();
    clearInterval(this._eGh); this._eGh = setInterval(() => { if (!this._editing) return clearInterval(this._eGh); if (this._drag && this._drag.on) return; this._eGhostSweep(); this._eDecorate(); }, 700);
  },
  _eDirty() { return this._editing && (this._eSnap !== JSON.stringify(HGL.data) || HGDraft.pending(this)); },
  _editExit(save) {
    if (!this._editing) return;
    this._editing = false; HGL.editing = false; this.removeAttribute('editing'); clearInterval(this._eGh); for (const ct of this._eConts()) for (const g of ct.el.querySelectorAll(':scope > .hge-ghost')) g.classList.remove('hge-ghost');
    if (!save) { HGL.data = JSON.parse(this._eSnap); HGL._ls(); HGDraft.discard(this); }
    if (this._eUnload) { window.removeEventListener('beforeunload', this._eUnload); this._eUnload = null; }
    const fin = () => { HG_FREEZE.on = false; HG_FREEZE.release(); this._eUnwire(); if (this._eBarEl) { this._eBarEl.remove(); this._eBarEl = null; } this._eSheet(false);
      HGL.notify(); if (this.isConnected) this._build(); if (HGLang._pend) { HGLang._pend = 0; HGLang.refresh(this); } };
    if (save) HGL.save(this._hass).then(async (w) => { try { this._eToast(w === 'ha' ? hgT('edit.layout_saved_synced_via') : hgT('edit.layout_saved_on_this')); } catch (e) { /* */ }
      let how = 'build'; try { how = await HGDraft.commit(this, this._hass); } catch (e) { this._eToast(hgT('oss.toast.save_failed', { error: String((e && e.message) || e) })); }
      if (how === 'reload' && !window.__hgDryRun) { setTimeout(() => location.reload(), 400); return; } fin(); }, fin); else fin();
  },
  /* toaster w stylu Sonner: jeden kontener na dole (safe-area), najnowszy na wierzchu, starsze schowane za nim (max 3),
     rozwija się po najechaniu / dotknięciu, przesunięcie lub dotyk zamyka, auto-zamknięcie pauzowane, identyczne komunikaty łączone (×n) */
  _eToast(t, undo, ul) { HGToast.off = this._editing ? 84 : 20; HGToast.show(t, undo, ul); },
  /* odświeżenie po zmianie układu: karty przerysowane (z odmrożeniem), dekoracje od nowa */
  _eRefresh(page) {
    HG_FREEZE.on = false;
    if (page) { this._eSkipDeco = true; return this._build().then(() => { this._eSkipDeco = false; if (this._editing) { HG_FREEZE.on = true; requestAnimationFrame(() => this._eDecorate()); } }); }
    HGL.notify(); for (const c of this._cards || []) { try { c.rerender && c.rerender(); } catch (e) {} }
    const deep = (el, d) => { if (!el || !el.shadowRoot || d > 2) return; for (const x of el.shadowRoot.querySelectorAll('hg-areas-card, hg-room-card, hg-tiles-card')) { try { x.rerender(); } catch (e) {} deep(x, d + 1); } };
    for (const c of this._cards || []) deep(c, 0);
    requestAnimationFrame(() => { if (this._editing) HG_FREEZE.on = true; this._eDecorate(); });
  },
  _eDecorate() {
    if (!this._editing) return;
    HG_FREEZE.on = true;
    const lite = this.hasAttribute('lite');
    for (const ct of this._eConts()) {
      if (!ct.root.querySelector('style[data-hge]')) { const st = document.createElement('style'); st.dataset.hge = '1'; st.textContent = HGE_CSS; ct.root.appendChild(st); }
      ct.el.classList.add('hge-on'); ct.el.classList.toggle('hge-lite', lite);
      const areas = ct.page && !!this._config.panel.areas;
      for (const it of this._eItems(ct)) {
        if (it.querySelector(':scope > .hge') || hgIsGhost(it)) continue;
        const [mc, mk] = this._eMap(ct, it.dataset.hgk), L = HGL.get(mc.scope), z = L.size[mk] || this._eBaseZ(mc.scope, mk), canSz = ct.page ? !areas : ct.sz;
        const d = document.createElement('div'); d.className = 'hge';
        d.innerHTML = `<button class="hh" data-hge="drag" aria-label="${hgT('edit.drag_or_use_arrow')}" title="${hgT('edit.drag')}">${H.icon('mdi:drag')}</button>`
          + `<button class="hx" data-hge="hide" aria-label="${hgT('edit.hide_tile')}" title="${hgT('common.hide')}">${H.icon('mdi:close')}</button>`
          + (canSz ? `<span class="hs" role="group" aria-label="${hgT('edit.size')}">${['s', 'm', 'l'].map((x) => `<i role="button" tabindex="0" class="${z === x ? 'on' : ''}" data-hge="size" data-z="${x}" aria-pressed="${z === x}" aria-label="${hgT('edit.size')} ${x.toUpperCase()}">${x.toUpperCase()}</i>`).join('')}</span>` : '');
        d._ct = ct; d._it = it; it.appendChild(d);
      }
      if (!ct.el.querySelector(':scope > .hge-addw') && (ct.page || /^(rooms|room:)/.test(ct.scope) || ct.scope.endsWith(':tiles'))) {
        if (ct.scope.endsWith(':tiles')) continue;               // „+ Dodaj” jest na poziomie widoku
        const w = document.createElement(ct.page ? 'div' : 'div'); w.className = 'hge-addw' + (ct.page ? ' cw' : '');
        if (ct.page) { w.style.gridColumn = ''; w.style.gridArea = 'auto'; }
        if (!ct.page && ct.el.classList.contains('grid')) w.style.gridColumn = '1 / -1';
        w.innerHTML = `<button class="hge-add" data-hge="add">${H.icon('mdi:plus')}<span>${hgT('common.add')}</span></button>`;
        w.firstChild._ct = ct; ct.el.appendChild(w); if (ct.page && this._masOn) requestAnimationFrame(() => this._masLay());
        if (!ct.page) ct.el.style.position = ct.el.style.position || 'relative';
      }
    }
    this._eBar();
  },
  _eUndecorate() {
    const all = this._eConts();
    for (const ct of all) { ct.el.classList.remove('hge-on'); for (const x of ct.el.querySelectorAll(':scope > [data-hgk] > .hge, :scope > .hge-addw')) x.remove(); const st = ct.root.querySelector('style[data-hge]'); if (st && ct.root !== this.shadowRoot) st.remove(); }
  },
  _eBar() {
    if (!this._editing) return;
    let b = this._eBarEl; if (b && !b.isConnected) this.shadowRoot.appendChild(b); if (!b) { b = this._eBarEl = document.createElement('div'); b.className = 'hge-bar'; b.setAttribute('role', 'toolbar'); b.setAttribute('aria-label', hgT('edit.edit_layout')); this.shadowRoot.appendChild(b); }
    const nh = this._eHidden().length;
    b.innerHTML = `<span class="hgt">${H.icon('mdi:pencil')}<b>${hgT('edit.edit_layout')}</b></span>
      <button data-hge="hidden" ${nh ? '' : 'disabled'}>${H.icon('mdi:eye-outline')}<span>${hgT('edit.restore_hidden')}${nh ? ` · ${nh}` : ''}</span></button>
      <button data-hge="look">${H.icon('mdi:palette-outline')}<span>${hgT('edit.appearance')}</span></button>
      <button data-hge="reset">${H.icon('mdi:restore')}<span>${hgT('edit.reset_to_default_layout')}</span></button>
      <button data-hge="cancel">${hgT('common.cancel')}</button><button class="ok" data-hge="done">${H.icon('mdi:check')}<span>${hgT('common.done')}</span></button>`;
  },
  /* ukryte elementy wszystkich zakresów widoku */
  _eHidden() {
    const out = []; const h = this._hass, cfgA = (this._cards || []).map((c) => c._config && c._config.areas).find(Boolean);
    const scopes = new Set(this._eConts().map((c) => c.scope)); const ps = this._pageScope(); if (ps) { scopes.add(ps); scopes.add(ps + ':tiles'); }
    for (const sc of scopes) for (const k of HGL.get(sc).hidden) {
      let n = k;
      if (h.states[k]) n = H.name(h, k);
      else if (sc === ps) { const cc = (this._config.cards || [])[this._lkeys.indexOf(k)]; n = (cc && (cc.title || (cc.entity && H.name(h, cc.entity)))) || k.split('|')[0].replace(/^hg-|-card$/g, ''); }
      else if (sc === 'rooms') { const m = cfgA && HGAreas.model(h, cfgA); n = (m && m.byId[k] && m.byId[k].name) || k; }
      else n = /^sec:/.test(k) ? hgT('edit.section_name', { name: k.slice(4) }) : k;
      out.push({ sc, k, n });
    }
    return out;
  },
  _eSet(sc, f) { const L = HGL.get(sc); f(L); HGL.set(sc, L); },
  /* rozmiar bez nadpisania: karta panelu – z domyślnego spanu (np. pełna szerokość = L), kafle – S */
  _eBaseZ(sc, k) { if (sc !== this._pageScope()) return 's'; const c0 = (this._config.cards || [])[(this._lkeys || []).indexOf(k)]; return c0 ? hgSpanZ(c0.span) : 's'; },
  _eWire() {
    const onDown = (e) => this._eDown(e), onClick = (e) => this._eClick(e), onTm = (e) => { if (this._drag && this._drag.on) e.preventDefault(); }, onKey = (e) => { if (e.key === 'Escape' && hgsOpen.size) return; if (e.key === 'Escape') { if (this._eSheetOpen) { const cf = this._eSheetEl && this._eSheetEl.querySelector('.hs-cf'); if (cf) cf.remove(); else if ((this._eStk || []).length) this._eBack(); else this._eClose(); } else if (!this._eDirty() || window.confirm(hgT('edit.discard_unsaved_layout_changes'))) this._editExit(false); }
      /* klawiatura: elementy role=button (chipy rozmiaru itd.) aktywowane Enter / Spacją */
      else if (/^Arrow(Up|Down|Left|Right)$/.test(e.key) && e.composedPath()[0] && e.composedPath()[0].dataset && e.composedPath()[0].dataset.hge === 'drag') { e.preventDefault(); this._eKeyMove(e.composedPath()[0], /Up|Left/.test(e.key) ? -1 : 1); }
      else if (e.key === 'Enter' || e.key === ' ') { const t = e.composedPath()[0]; if (t && t.tagName !== 'BUTTON' && t.getAttribute && t.getAttribute('role') === 'button' && t.dataset && t.dataset.hge) { e.preventDefault(); t.click(); } } };
    this._eL = [['pointerdown', onDown, true], ['click', onClick, true], ['touchmove', onTm, { passive: false, capture: true }], ['keydown', onKey, true]];
    for (const [t, f, o] of this._eL) window.addEventListener(t, f, o);
  },
  _eUnwire() { for (const [t, f, o] of this._eL || []) window.removeEventListener(t, f, o); this._eL = null; this._eUndecorate(); },
  _ePath(e) { const p = e.composedPath(); const ctl = p.find((n) => n.dataset && n.dataset.hge); const it = p.find((n) => n.dataset && n.dataset.hgk && n.parentElement && (n.parentElement.dataset.hgl || n.parentElement === this._panelEl));
    return { p, ctl, it, inBar: p.includes(this._eBarEl) || (this._eSheetEl && p.includes(this._eSheetEl)) }; },
  _eClick(e) {
    const { ctl, it, inBar } = this._ePath(e);
    if (ctl) { e.preventDefault(); e.stopPropagation(); return this._eCtl(ctl, e); }
    if (inBar) return;
    if (it) { e.preventDefault(); e.stopPropagation(); if (Date.now() - (this._eSwallow || 0) > 400) { const ct = this._eConts().find((c) => c.el === it.parentElement); if (ct) this._eCfg(...this._eMap(ct, it.dataset.hgk), this._eKidPath(e, it)); } }
  },
  /* klik w kartę wewnątrz stosu / siatki: indeksy gniazd od zewnętrznego kontenera do klikniętej karty */
  _eKidPath(e, it) { const p = e.composedPath(), o = []; for (const n of p) { if (n === it) break; const m = n.classList && n.classList.contains('sl') && n.dataset.own != null && /^[sgc]-(\d+)$/.exec(n.dataset.key || ''); if (m) o.unshift(+m[1]); } return o; },
  _eCtl(b, e) {
    this._eTrig = b;
    const a = b.dataset.hge;
    if (a === 'done') return this._editExit(true);
    if (a === 'cancel') return !this._eDirty() || window.confirm(hgT('edit.discard_unsaved_layout_changes')) ? this._editExit(false) : undefined;
    if (a === 'reset') { const ps = this._pageScope(); const sc = new Set(this._eConts().map((c) => c.scope)); if (ps) { sc.add(ps); sc.add(ps + ':tiles'); }
      for (const s of sc) HGL.set(s, {}); this._eToast(hgT('edit.view_layout_reset_to')); return this._eRefresh(true); }
    if (a === 'hidden') return this._eSheet('hidden');
    if (a === 'look') { this._lkDD = 'nav'; return this._eLook(); }
    /* zmiana języka w edycji: arkusz, pasek i karty od razu po nowemu; nawigację ze strategii HA generuje po wyjściu z edycji (niezapisany układ zostaje) */
    /* dopiero po wczytaniu katalogu (HGLang.set czeka na niego): bez mieszanego wyświetlania; po wyjściu z edycji w międzyczasie stronę przerysowuje hg-lang */
    if (a === 'lang') { const v = b.dataset.l || ''; if (v === HGLang.get()) return; HGLang._pend = 1;
      return Promise.resolve(HGLang.set(this._hass, v)).then(() => { if (!this._editing) return; this._eBar(); this._eLook();
        this._eToast(hgT('edit.language_toast', { name: v ? (HGLang.LIST.find((x) => x[0] === v) || [v, v])[1] : hgT('edit.automatic') }));
        return Promise.resolve(this._eRefresh(true)).then(() => { if (this._editing) { this._eBar(); this._eLook(); } }); }); }
    if (a === 'headedit') return this._eHead();
    if (a === 'pw') { const v = this._config.view; HGL.data.pw = Object.assign({}, HGL.data.pw, { [v]: b.dataset.w }); hgPwMark(b); this._panelGrid(this.getAttribute('mode')); HGL.save(this._hass); return; }
    if (a === 'hdok' || a === 'hdreset' || a === 'hdvar' || a === 'hdvis' || a === 'hdclock') return this._eHeadAct(a, b);
    if (a.startsWith('lx-') && window.HGLookX) return HGLookX.act(this, b, a);
    if (a.startsWith('rx-') && window.HGRoomsX) return HGRoomsX.act(this, b, a);
    if (a.startsWith('wl-') && window.HGWall) return HGWall.act(this, b, a);
    if (a === 'lk-look' && window.HGLooks) return HGLooks.act(this, b, a);
    if (a.startsWith('bk-') && window.HGBackup) return HGBackup.act(this, b, a);
    if (a.startsWith('us-') && window.HGUsers) return HGUsers.act(this, b, a);
    if (a.startsWith('as-') && window.HGAssistUI) return HGAssistUI.act(this, b, a);
    if (a === 'pbg' || a === 'pbgv') { const vw = this._config && this._config.view, v = b.dataset.v || '';
      this._eApp((A) => { if (a === 'pbg') { if (v === 'off') A.pbg = false; else delete A.pbg; return; }
        const M = Object.assign({}, A.pbgv || {}); if (v && vw) M[vw] = v; else delete M[vw]; if (Object.keys(M).length) A.pbgv = M; else delete A.pbgv; });
      this._pbgSync(); return this._eLook(); }
    if (a === 'perfblur' || a === 'perfeco') { HGPerf.set(a === 'perfblur' ? 'blur' : 'eco', b.dataset.v || ''); return this._eLook(); }
    if (a === 'acc') { this._eApp((A) => { A.accent = b.dataset.c; }); return this._eLook(); }
    if (a === 'bgp') { this._eApp((A) => { A.bg = b.dataset.v ? { kind: 'image', v: b.dataset.v, v2p: b.dataset.p || '' } : null; }); return this._eLook(); }
    if (a === 'bgurl') { const v = this._eSheetEl.querySelector('[name=bgurl]').value.trim(); if (!/^(\/|https:\/\/)/.test(v)) return this._eToast(hgT('edit.enter_an_https_or')); this._eApp((A) => { A.bg = { kind: 'url', v }; }); return this._eLook(); }
    if (a === 'bgcol') { const S = this._eSheetEl, c1 = S.querySelector('[name=bgc1]').value, c2 = S.querySelector('[name=bgc2]').value; this._eApp((A) => { A.bg = b.dataset.k === 'gradient' ? { kind: 'gradient', v: c1, v2: c2 } : { kind: 'color', v: c1 }; }); return this._eLook(); }
    if (a === 'bgup') return this._eSheetEl.querySelector('input[type=file]').click();
    if (a === 'lktab') return this._eSetGo(b.dataset.k);
    if (a === 'lkback') { this._lkDD = 'nav'; const sh = this._eSheetEl && this._eSheetEl.querySelector('.hge-sheet.lk'); if (sh) { sh.dataset.dd = 'nav'; const t = sh.querySelector(`#lkt-${this._lkTab}`); if (t) t.focus(); } return; }
    if (a === 'lookreset') { HGL.data.app = {}; HGApp.apply(); this._eToast(hgT('edit.appearance_reset_to_default')); return this._eLook(); }
    if (a === 'add') { const ct0 = b._ct || (b.closest('.hge-addw') && b.closest('.hge-addw').firstChild._ct); return ct0 && ct0.scope === 'rooms' ? this._eSheet('add', ct0) : this._eGallery(ct0); }
    if (/^(c(go|gent|back|typ|mod|z|del|slot|ok)|k(add|edit|dup|del|span|move|out))$/.test(a)) return this._eCompAct(a, b);
    if (a === 'restore') { this._eSet(b.dataset.sc, (L) => { L.hidden = L.hidden.filter((x) => x !== b.dataset.k); }); this._eSheet(false); return this._eRefresh(b.dataset.sc === this._pageScope()); }
    if (a === 'sback') return this._eBack();
    if (a === 'cfstay') { const c = b.closest('.hs-cf'); if (c) c.remove(); return; }
    if (a === 'cfdrop') return this._eSheet(false);
    if (a === 'sheetclose' && b.matches('.lk-ok') && window.HGRoomsX && (HGRoomsX.hdirty || HGRoomsX.dirty)) return (async () => {   /* Ustawienia → Gotowe: zapisz też niezapisane szkice (nagłówek, widoki, pokoje), zamiast je porzucać */
      const S = this._eSheetEl, pick = (k) => S && S.querySelector(`[data-hge="${k}"]`);
      if (HGRoomsX.dirty) await HGRoomsX.act(this, pick('rx-save') || b, 'rx-save'); if (HGRoomsX.hdirty) await HGRoomsX.act(this, pick('rx-hsave') || b, 'rx-hsave'); this._eSheet(false); })();
    if (a === 'sheetclose' && !b.matches('.hs-x, .hge-scrim, .hs-b2')) return this._eSheet(false);   /* przycisk główny (Gotowe) zatwierdza bez pytania */
    if (a === 'sheetclose') return (this._eStk || []).length && b.classList.contains('hs-x') ? this._eBack() : this._eClose();
    if (a === 'pick' && b.dataset.sc !== 'rooms' && !b.dataset.t) { const sc0 = this._eSc, ct0 = this._eSheetCt; return this._eGo(() => this._eSheet('add', ct0, sc0), () => this._eAddStep(b.dataset.sc, b.dataset.e, b.dataset.n)); }
    if (a === 'addt') { for (const x of b.parentElement.children) { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); } const pv = this._eSheetEl.querySelector('.hs-pvb'); pv.innerHTML = hgTileHtml(this._hass, this._eAddE, 's', { t: b.dataset.t }); hgSlots({ _hass: this._hass, $: pv }); hgPvLive(pv); return; }
    if (a === 'addok') { const t = (this._eSheetEl.querySelector('[data-hge=addt][aria-pressed=true]') || { dataset: {} }).dataset.t, T0 = hgTypesFor(this._hass, this._eAddE)[0];
      const fake = { dataset: { hge: 'pick', sc: this._eAddSc, e: this._eAddE, n: this._eAddN || '', t: t && t !== T0 ? t : 'def' } }; return this._eCtl(fake, e); }
    if (a === 'addback') return (this._eStk || []).length ? this._eBack() : this._eSheet('add', null, this._eSc);
    if (a === 'pick') { const sc = b.dataset.sc; const tt = b.dataset.t && b.dataset.t !== 'def' ? b.dataset.t : ''; this._eSet(sc, (L) => { L.hidden = L.hidden.filter((x) => x !== b.dataset.e); if (!L.added.some((x) => x.e === b.dataset.e)) L.added.push(tt ? { e: b.dataset.e, t: tt } : { e: b.dataset.e }); });
      this._eSheet(false); this._eToast(hgT('edit.added_name', { name: b.dataset.n || b.dataset.e })); return this._eRefresh(sc.endsWith(':tiles')); }
    if (a === 'repl' && this._eRepl && this._eRepl.badge && window.HGRoomsX) return HGRoomsX.pickEnt(this, b.dataset.e);
    if (a === 'repl' && this._eRepl && this._eRepl.comp) return this._eCompPick(b.dataset.e);
    if (a === 'repl') { const R = this._eRepl; this._eRepl = null; const nv = b.dataset.e; this._eCfgSet(R, nv); this._eSheet(false); this._eToast(R.add ? hgT('edit.entity_added') : hgT('edit.entity_changed'));
      const k2 = R.S.kind === 'added' ? nv : R.k, pg = R.sc === this._pageScope(); const re = () => { const ct = this._eConts().find((c) => c.scope === R.sc); if (ct) setTimeout(() => this._eCfg(ct, k2), 120); };
      const pr = this._eRefresh(pg); if (pr && pr.then) pr.then(re); else requestAnimationFrame(re); return; }
    if (a === 'cfgsave') return this._eCfgSave();
    if (a === 'cfgz' || a === 'cfgt' || a === 'cfgw') { for (const x of b.parentElement.children) { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); } if (a === 'cfgt') { const cp = this._eSheetEl.querySelector('.hs-cap'); if (cp) cp.hidden = b.dataset.t !== 'chart'; this._eCfgPv(); } return; }
    if (a === 'cfgadd') { const n = ((this._eCfgArrGet(this._eCfgR, b.dataset.k)) || []).length; this._eRepl = Object.assign({}, this._eCfgR, { path: b.dataset.k + '.' + n, old: '', add: true, doms: b.dataset.d ? b.dataset.d.split(',') : null, excl: (this._eCfgArrGet(this._eCfgR, b.dataset.k) || []).map((y) => (typeof y === 'string' ? y : y && y.entity)) }); return this._eGo(() => this._eCfgBack(), () => this._eSheet('add', null, this._eCfgR.sc)); }
    if (a === 'cfgsecadd') { const S0 = this._eCfgR.S; this._eRepl = Object.assign({}, this._eCfgR, { secAdd: b.dataset.k, add: true, old: '', doms: HG_SEC_DOMS[b.dataset.k] || null, excl: (S0.ents.find((y) => y.secAdd) || {}).excl || [] }); return this._eGo(() => this._eCfgBack(), () => this._eSheet('add', null, this._eCfgR.sc)); }
    if (a === 'cfgrm') { const R = this._eCfgR, S0 = R.S, e = b.dataset.e, rid = S0.rid; if (!rid || !e) return;
      const was = this._eSecRm(rid, e); this._eToast(was === 'man' ? hgT('edit.removed_from_room_name', { name: H.name(this._hass, e) }) : hgT('edit.hidden_in_room_name', { name: H.name(this._hass, e) }));
      const re = () => { const ct = this._eConts().find((c) => c.scope === R.sc); if (ct) setTimeout(() => this._eCfg(ct, R.k), 120); }; const pr = this._eRefresh(R.sc === this._pageScope()); if (pr && pr.then) pr.then(re); else requestAnimationFrame(re); return; }
    if (a === 'cfgdel') { const i = +b.dataset.i; return this._eCfgArr(this._eCfgR, b.dataset.k, (A) => { A.splice(i, 1); }, hgT('edit.entity_removed')); }
    if (a === 'cfgent') { const R0 = this._eCfgR, ex = R0.S && R0.S.kind === 'added' ? HGL.get(R0.sc).added.map((y) => y.e).filter((e) => e !== b.dataset.v) : null;   /* kafel dodany: bez encji już obecnych w zakresie (duplikat klucza) */
      this._eRepl = Object.assign({}, R0, { path: b.dataset.p, old: b.dataset.v }, ex ? { excl: ex } : {}); return this._eGo(() => this._eCfgBack(), () => this._eSheet('add', null, this._eCfgR.sc)); }
    if (a === 'filter') { this._eF = b.dataset.f; return this._eSheetList(); }
    const d = b._d || b.closest('.hge'); if (!d) return;
    const [ct, k] = this._eMap(d._ct, d._it.dataset.hgk), it = d._it;
    if (a === 'hide' && !b.dataset.ok) {
      const nm = (it.querySelector('.sh, .nm, .tn b, .hd b, b') || {}).textContent || hgT('edit.this_item');
      const q = document.createElement('div'); q.className = 'hge-cf'; q.innerHTML = `<span>${hgT('edit.remove_confirm', { name: H.esc(nm.trim().slice(0, 40)) })}</span><button data-hge="hide" data-ok="1">${hgT('edit.remove')}</button><button data-hge="cfno">${hgT('edit.answer_no')}</button>`;
      d.appendChild(q); for (const x of q.querySelectorAll('button')) x._d = d; return;
    }
    if (a === 'cfno') { const q = b.closest('.hge-cf'); if (q) q.remove(); return; }
    if (a === 'hide') {
      const A0 = HGL.get(ct.scope).added, ai = A0.findIndex((x) => x.e === k), added = ai >= 0, rem = added ? JSON.parse(JSON.stringify(A0[ai])) : null;
      this._eSet(ct.scope, (L) => { if (added) L.added = L.added.filter((x) => x.e !== k); else if (!L.hidden.includes(k)) L.hidden.push(k); });
      const rest = this._eItems(ct).filter((x) => x !== it); const fr = rest.map((x) => x.getBoundingClientRect());
      it.style.display = 'none'; if (ct.page || ct.via) it.hidden = true;
      this._eFlipFrom(rest, fr); this._eBar();
      this._eToast(added ? hgT('edit.tile_removed') : hgT('edit.removed_bring_it_back'), () => {
        /* cofnięcie tylko tego usunięcia – inne zmiany w zakresie z ostatnich sekund zostają */
        this._eSet(ct.scope, (L) => { if (added) { if (!L.added.some((x) => x.e === k)) L.added.splice(Math.min(ai, L.added.length), 0, rem); } else L.hidden = L.hidden.filter((x) => x !== k); });
        this._eRefresh(ct.page || !!ct.via); });
      return;
    }
    if (a === 'size') { const z = b.dataset.z;
      /* karta panelu: S zapisane jawnie, gdy domyślnie jest szersza (inaczej S przywracało domyślną szerokość) */
      const bz = this._eBaseZ(ct.scope, k); this._eSet(ct.scope, (L) => { if (z === bz) delete L.size[k]; else L.size[k] = z; });
      const its = this._eItems(ct), fr = its.map((x) => x.getBoundingClientRect());
      if (ct.page || ct.via) {
        /* szerokość z ustawień sekcji (Pełna / Połowa) wygrywała z S/M/L – wybór rozmiaru ją zastępuje; karta pamięta nowy span, więc przeliczenie siatki (_panelGrid) go nie cofa */
        const pk = it.dataset.hgk; this._eSet(this._pageScope(), (L) => { if (L.conf[pk] && L.conf[pk].w) delete L.conf[pk].w; });
        const lc = (this._lc || []).find((c) => c._k === pk); if (lc) lc.span = z === 'l' ? 'full' : z === 'm' ? 2 : 1;
        it.style.gridColumn = z === 'l' ? '1 / -1' : z === 'm' ? 'span 2' : 'span 1'; if (this._masOn) { delete it.dataset.masGc; requestAnimationFrame(() => this._masLay()); } }
      else { it.classList.remove('hgsz-m', 'hgsz-l'); if (z !== 's') it.classList.add('hgsz-' + z); }
      for (const x of d.querySelectorAll('[data-hge=size]')) { const on = x.dataset.z === z; x.setAttribute('aria-pressed', on); x.classList.toggle('on', on); }
      return this._eFlipFrom(its, fr);
    }
  },
  /* FLIP: elementy animowane z poprzedniego położenia do nowego */
  _eFlipFrom(items, before, skip) {
    if (hgReduced() || this.hasAttribute('lite')) return;
    items.forEach((x, i) => { if (x === skip || !before[i]) return; const r = x.getBoundingClientRect(), dx = before[i].left - r.left, dy = before[i].top - r.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      x.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,0,0,1)' }); });
  },
  /* przeciąganie: mysz – od razu z uchwytu albo po 6 px; dotyk – uchwyt od razu, kafel po przytrzymaniu 380 ms */
  _eDown(e) {
    if (e.button > 0 || e.isPrimary === false || (this._drag && this._drag.on)) return;   /* drugi palec nie przejmuje przeciągania */
    const { ctl, it, inBar } = this._ePath(e); if (inBar) return;
    if (ctl && ctl.dataset.hge !== 'drag') return;
    if (!it) return;
    const ct = this._eConts().find((c) => c.el === it.parentElement); if (!ct) return;
    const touch = e.pointerType !== 'mouse', handle = !!ctl;
    const D = this._drag = { it, ct, x0: e.clientX, y0: e.clientY, on: false, id: e.pointerId, tx: 0, ty: 0 };
    const start = () => { if (this._drag !== D) return; D.on = true; this._eUndense(ct); it.classList.add('hge-drag'); D.r0 = it.getBoundingClientRect(); D.nx = D.r0.left; D.ny = D.r0.top; if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) {} };
    if (handle) start(); else if (touch) D.lp = setTimeout(start, 380);
    const mv = (ev) => {
      if (ev.pointerId !== D.id) return;
      const dx = ev.clientX - D.x0, dy = ev.clientY - D.y0;
      if (!D.on) { if (touch) { if (Math.hypot(dx, dy) > 8) end(); return; } if (Math.hypot(dx, dy) > 6) start(); else return; }
      ev.preventDefault();
      D.px = ev.clientX; D.py = ev.clientY;
      if (!D.raf) D.raf = requestAnimationFrame(() => { D.raf = 0; this._eMove(D); });
    };
    const end = (ev) => {
      clearTimeout(D.lp); window.removeEventListener('pointermove', mv, true); window.removeEventListener('pointerup', end, true); window.removeEventListener('pointercancel', end, true);
      if (this._drag !== D) return; this._drag = null;
      if (!D.on) return;
      D.on = false; const cur = `translate(${D.tx}px, ${D.ty}px)`;
      it.style.transform = ''; it.classList.remove('hge-drag');
      if (!hgReduced()) it.animate([{ transform: cur }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,0,0,1)' });
      this._eCommit(ct);
      this._eSwallow = Date.now();
      const sw = (c) => { if (Date.now() - this._eSwallow < 400) { c.preventDefault(); c.stopPropagation(); } window.removeEventListener('click', sw, true); };
      window.addEventListener('click', sw, true);
    };
    window.addEventListener('pointermove', mv, true); window.addEventListener('pointerup', end, true); window.addEventListener('pointercancel', end, true);
  },
  /* klawiatura: strzałki na uchwycie „Przeciągnij” przesuwają kafel o jedno miejsce (to samo co przeciągnięcie) */
  _eKeyMove(h, dir) {
    const it = h.closest('[data-hgk]'), ct = it && this._eConts().find((c) => c.el === it.parentElement); if (!ct) return;
    this._eUndense(ct);
    const items = this._eItems(ct), i = items.indexOf(it), tg = items[i + dir]; if (i < 0 || !tg) return;
    const before = items.map((o) => o.getBoundingClientRect());
    if (ct.page && this._config.panel.areas) { const an = (x) => getComputedStyle(x).gridRowStart, a1 = an(it), a2 = an(tg); it.style.gridArea = a2; tg.style.gridArea = a1; }
    else { ct.el.insertBefore(it, dir > 0 ? tg.nextSibling : tg); if (ct.page && this._masOn) this._masLay(); }
    this._eFlipFrom(items, before); this._eCommit(ct); h.focus();
  },
  /* siatka „row dense” dosuwa wąskie kafle w dziury przed szerokimi, więc przeniesiony kafel wracał na stare miejsce.
     Przed pierwszym przesunięciem: kolejność DOM = kolejność widoczna, zapis kolejności i siatka bez „dense” (kolejność użytkownika jest ważniejsza niż dziury) */
  _eUndense(ct) {
    const el = ct.el; if ((ct.page && (this._config.panel.areas || this._masOn)) || !/dense/.test(getComputedStyle(el).gridAutoFlow)) return;
    const items = this._eItems(ct); if (items.length < 2) return;
    const vis = items.map((x) => [x, x.getBoundingClientRect()]).sort((a, b) => (Math.abs(a[1].top - b[1].top) > 2 ? a[1].top - b[1].top : a[1].left - b[1].left)).map((x) => x[0]);
    if (vis.some((x, i) => x !== items[i])) { const mk = items.map((x) => el.insertBefore(document.createComment(''), x)); vis.forEach((x, i) => mk[i].replaceWith(x)); }   /* te same miejsca w DOM, nowa kolejność */
    if (ct.page) { this._eCommit(ct); this._panelGrid(this.getAttribute('mode')); } else { el.classList.add('ord'); this._eCommit(ct); }
  },
  _eMove(D) {
    const { it, ct } = D;
    // położenie naturalne (bez transformacji) -> przesunięcie tak, by kafel był pod palcem
    const place = () => { it.style.transform = 'none'; const r = it.getBoundingClientRect(); D.tx = D.px - D.x0 + D.r0.left - r.left; D.ty = D.py - D.y0 + D.r0.top - r.top; it.style.transform = `translate(${D.tx}px, ${D.ty}px)`; };
    place();
    const items = this._eItems(ct), x = D.px, y = D.py;
    const tg = items.find((o) => { if (o === it) return false; const r = o.getBoundingClientRect(); return x > r.left && x < r.right && y > r.top && y < r.bottom; });
    if (!tg || tg === D.last) { if (!tg) D.last = null; return; }
    D.last = tg;
    const before = items.map((o) => o.getBoundingClientRect());
    if (ct.page && this._config.panel.areas) { const an = (x) => getComputedStyle(x).gridRowStart, a1 = an(it), a2 = an(tg); it.style.gridArea = a2; tg.style.gridArea = a1; }
    else { const ia = items.indexOf(it), ib = items.indexOf(tg); ct.el.insertBefore(it, ia < ib ? tg.nextSibling : tg); if (ct.page && this._masOn) this._masLay(); }
    place();
    this._eFlipFrom(items, before, it);
  },
  _eCommit(ct) {
    const items = this._eItems(ct);
    if (ct.page && this._config.panel.areas) {
      const base = (this._config.cards || []).map((c) => c.area), byArea = new Map(items.map((w) => [getComputedStyle(w).gridRowStart, w.dataset.hgk]));
      /* sloty ukrytych kart: klucz z bieżącego układu (nie bazowego), bez duplikatów – inaczej ukryta karta znikała na stałe */
      const all = this._lkeys, cur = (this._lc || []).map((c) => c._k), vis = new Set(byArea.values());
      const ord = base.map((a, i) => byArea.get(a) || (cur[i] && !vis.has(cur[i]) ? cur[i] : null));
      const miss = all.filter((k) => !ord.includes(k)), seen = new Set();
      for (let i = 0; i < ord.length; i++) { if (!ord[i] || seen.has(ord[i])) ord[i] = miss.shift() || all[i]; seen.add(ord[i]); }
      this._eSet(ct.scope, (L) => { L.order = ord; });
    } else this._eSet(ct.scope, (L) => { L.order = items.map((w) => w.dataset.hgk); });
  },
  /* arkusz: „Dodaj” (wyszukiwarka encji / pokoi) albo „Przywróć ukryte” */
  /* ===== jeden arkusz ustawień dla każdego kafelka / karty / pokoju / sekcji ===== */
  _eSubj(ct, k) {
    const h = this._hass, sc = ct.scope, L = HGL.get(sc), cf = L.conf[k] || {}, x = L.added.find((y) => y.e === k);
    const ok = (v) => typeof v === 'string' && !!h.states[v];
    const LBL = { entity: hgT('edit.main_entity'), temperature: hgT('edit.temperature'), temp: hgT('edit.temperature'), humidity: hgT('common.humidity'), hum: hgT('common.humidity'), power: hgT('edit.power'), energy: hgT('edit.energy'), climate: hgT('common.air_conditioning'), camera: hgT('edit.camera'), person: hgT('edit.person'), entities: hgT('edit.entity'), cameras: hgT('edit.camera'), camera_entity: hgT('edit.camera'), persons: hgT('edit.person'), media_players: hgT('edit.media_player'), lights: hgT('edit.light'), sensors: hgT('common.sensor') };
    if (x) return { kind: 'added', x, ents: [{ p: 'e', l: hgT('edit.entity'), v: x.e }], types: hgTypeOpts(h, x.e), t: x.t || hgTypesFor(h, x.e)[0], n: x.n || '', i: x.i || '', cap: x.cap || '', capOff: !!x.capOff, dn: H.name(h, x.e), main: x.e };
    if (sc === this._pageScope()) { const cc = (this._config.cards || [])[this._lkeys.indexOf(k)] || {}, ents = [];
      const seenE = new Set(), adds = [], eidOf = (y) => (typeof y === 'string' ? y : y && y.entity);
      for (const [key, v] of Object.entries(cc)) { const cur = hgDedupArr(cf.set && cf.set[key] !== undefined ? cf.set[key] : v);
        if (ok(cur)) { if (!seenE.has(cur)) { seenE.add(cur); ents.push({ p: key, l: LBL[key] || key, v: cur }); } continue; }
        if (!Array.isArray(cur)) continue; const valid = cur.map(eidOf).filter(ok);
        /* lista-alias (te same encje pod inną nazwą klucza) – pomijamy, żeby nie dublować */
        if (!valid.length || valid.every((e) => seenE.has(e))) continue;
        cur.forEach((y, i) => { const yy = eidOf(y); if (ok(yy) && !seenE.has(yy)) { seenE.add(yy); ents.push({ p: key + '.' + i, l: `${LBL[key] || key} ${i + 1}`, v: yy, ak: key, ai: i }); } });
        adds.push({ add: key, doms: [...new Set(valid.map((e) => e.split('.')[0]))] }); }
      ents.push(...adds);
      const main = (ents[0] || {}).v;
      const grpN = ents.filter((x) => x.ak).length, grp = grpN >= 2;
      return { kind: 'card', cc, grp, ents: ents.slice(0, 40), types: grp ? HG_GRP_TYPES : [['card', hgT('edit.tile_type_default')], ...(main ? hgTypesFor(h, main).map((t) => [t, HG_TYPES[t]]) : [])], t: (grp && cf.t && !cf.t.startsWith('g-')) ? 'card' : (cf.t || 'card'), n: cf.n || '', i: cf.i || '', dn: cc.title || cc.name || HG_GRP_LBL[k.split('|')[0].replace(/^(hg|nuvio)-|-card$/g, '')] || k.split('|')[0].replace(/^hg-|-card$/g, ''), main }; }
    if (sc === 'rooms') { const ac = (this._cards || []).map((c) => c._config && c._config.areas).find(Boolean) || {}, a = HGAreas.model(h, ac).byId[k] || {};
      return { kind: 'room', a, ents: [{ p: 'temp', l: hgT('edit.temperature'), v: cf.temp || (a.temp && a.temp.e) || '' }, { p: 'hum', l: hgT('common.humidity'), v: cf.hum || (a.hum && a.hum.e) || '' }],
        types: [['', hgT('edit.tile_type_default')], ['compact', HG_TYPES.compact], ['minimal', HG_TYPES.minimal]], t: cf.t || '', n: cf.n || '', i: cf.i || '', dn: a.name || k }; }
    const it = ct.el.querySelector(`:scope > [data-hgk="${CSS.escape(k)}"]`), sw = (L.conf._swap) || {}, seen = new Set(), ents = [];
    if (it) for (const el of it.querySelectorAll('[data-e],[data-ac],[data-cam]')) { const v = el.dataset.e || el.dataset.ac || el.dataset.cam; if (ok(v) && !seen.has(v)) { seen.add(v); ents.push({ p: 'swap', l: ents.length ? hgT('edit.entity') : hgT('edit.main_entity'), v }); } }
    const hd = it && it.querySelector('.sh'), rid = sc.startsWith('room:') ? sc.slice(5) : null, sd = HG_SEC.find((y) => y[1] === k), sk = sd && sd[0], doms = sk && HG_SEC_DOMS[sk];
    if (rid && doms) { const W = (HGL.data.wiz && HGL.data.wiz.areas) || {}, ac = (this._cards || []).map((c) => c._config && c._config.areas).find(Boolean) || {}, ra = HGAreas.model(h, ac).byId[rid];
      const man = (e) => (W.assign && W.assign[e] === rid) || (W.virtual || []).some((v) => v.id === rid && (v.entities || []).includes(e));
      const shown = new Set(ents.map((y) => y.v)), list = ((ra && ra.sec && ra.sec[sk]) || []).filter((e) => typeof e === 'string').map((e) => (sw[e] && h.states[sw[e]] ? sw[e] : e)).filter((e, i, A) => ok(e) && A.indexOf(e) === i && (shown.has(e) || man(e)));
      const rows = list.slice(0, 40).map((v, i) => ({ p: 'swap', l: i ? hgT('edit.entity') : hgT('edit.main_entity'), v, rm: man(v) ? 'man' : 'area' }));
      rows.push({ secAdd: sk, doms, excl: list });
      return { kind: 'sec', rid, sk, ents: rows, types: [['', hgT('edit.tile_type_default')], ['compact', HG_TYPES.compact], ['minimal', HG_TYPES.minimal]], t: cf.t || '', n: L.names[k] || '', i: cf.i || '', dn: hd ? hd.textContent.replace(/\d+.*$/, '').trim() : k, it }; }
    return { kind: 'sec', ents: ents.slice(0, 12), types: [['', hgT('edit.tile_type_default')], ['compact', HG_TYPES.compact], ['minimal', HG_TYPES.minimal]], t: cf.t || '', n: L.names[k] || '', i: cf.i || '', dn: hd ? hd.textContent.replace(/\d+.*$/, '').trim() : k, it };
  },
  _eCfg(ct, k, kp) { this._eStk = []; this._eKidStk = []; if (!this._eBacking) this._eSnapTake();
    { const L0 = HGL.get(ct.scope); if (hgDedupConf(JSON.parse(JSON.stringify(L0)))) this._eSet(ct.scope, (L) => { hgDedupConf(L); }); }
    /* kontener jak w HA: najpierw jego ustawienia (lista kart: dodaj, usuń, kolejność), kp = ścieżka klikniętej karty w środku, od razu jej formularz */
    const kids = () => { for (const i of kp || []) { const R = this._eCompR, C = R && HG_COMP.find((c) => c.id === R.cid); if (!C || !C.kids || !(R.v.cards || [])[i]) break; this._eKidAct('kedit', { dataset: { i } }); } };
    { const x0 = HGL.get(ct.scope).added.find((y) => y.e === k); if (x0 && x0.comp && HG_COMP.some((C) => C.id === x0.comp)) { const C = HG_COMP.find((c) => c.id === x0.comp);
      this._eGalSc = ct.scope; this._eGalCt = ct; this._eComp(C.id, { cid: C.id, sc: ct.scope, edit: k, v: x0.v ? JSON.parse(JSON.stringify(x0.v)) : { e: x0.e }, t: x0.t || C.tile || '', n: x0.n || '', i: x0.i || '', z: HGL.get(ct.scope).size[k] || 's' }); return kids(); } }
    /* stos / siatka z konfiguracji widoku (także vertical-stack, horizontal-stack, grid z HA): ten sam formularz, zapis jako nadpisanie karty (conf.set) */
    { const L0 = HGL.get(ct.scope), cc0 = ct.scope === this._pageScope() && !L0.added.some((y) => y.e === k) ? (this._config.cards || [])[(this._lkeys || []).indexOf(k)] : null;
      const cf0 = L0.conf[k] || {}, cc = cc0 && hgFromHA(hgSetMerge(cc0, cf0.set)), ty = String((cc && cc.type) || ''), cid = /-grid-card$/.test(ty) ? 'grid' : /-stack-card$/.test(ty) ? (cc.direction === 'horizontal' ? 'hstack' : 'vstack') : null;
      if (cid) { const C = HG_COMP.find((c) => c.id === cid), o = {};
        for (const q of C.opts || []) { const v = q.k === 'flat' ? cc.glass === false : q.k === 'nodiv' ? cc.divider === false : cc[q.k]; if (v != null && v !== '' && v !== false) o[q.k] = Array.isArray(v) ? v.join(', ') : v; }
        this._eGalSc = ct.scope; this._eGalCt = ct; this._eComp(cid, { cid, sc: ct.scope, pageK: k, v: { cards: JSON.parse(JSON.stringify(cc.cards || [])), o }, t: '', n: cf0.n || '', i: cf0.i || '', z: L0.size[k] || this._eBaseZ(ct.scope, k) }); return kids(); } }
    const h = this._hass, sc = ct.scope, L = HGL.get(sc), z = L.size[k] || this._eBaseZ(sc, k), canSz = ct.page ? !this._config.panel.areas : ct.sz;
    const S0 = this._eSubj(ct, k); this._eCfgR = { sc, k, ct, S: S0 }; this._eSheet('cfg');
    const S = this._eSheetEl, ttl = { added: hgT('edit.tile_settings'), card: hgT('edit.card_settings'), room: hgT('edit.room_settings'), sec: hgT('edit.section_settings') }[S0.kind]; requestAnimationFrame(() => this._eEntDrag());
    const ico = (v) => (h.states[v] && h.states[v].attributes.icon) || HG_DOM_ICON2[String(v).split('.')[0]] || 'mdi:circle-outline';
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${ttl}"><style>${HG_STY_CSS}</style><div class="hs-h"><b>${ttl}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgT('common.close')}">${H.icon('mdi:close')}</button></div>
      <div class="hs-sc">
      <div class="hs-pv"><small>${hgT('edit.live_preview')}</small><div class="hs-pvb"></div></div>
      ${S0.ents.length ? `<div class="hs-fl hs-ents"><span>${hgT('edit.entities')}</span>${S0.ents.map((x) => x.secAdd ? `<button class="hs-r hs-add" data-hge="cfgsecadd" data-k="${H.esc(x.secAdd)}"><span class="hs-i">${H.icon('mdi:plus')}</span><span class="hs-t"><b>${hgT('edit.add_entity')}</b><small>${H.esc(x.doms.join(', '))}</small></span></button>` : x.add ? `<button class="hs-r hs-add" data-hge="cfgadd" data-k="${H.esc(x.add)}" data-d="${H.esc(x.doms.join(','))}"><span class="hs-i">${H.icon('mdi:plus')}</span><span class="hs-t"><b>${hgT('edit.add_entity')}</b><small>${H.esc(x.doms.join(', '))}</small></span></button>`
        : `<div class="hs-r hs-er" ${x.ak ? `data-ak="${H.esc(x.ak)}" data-ai="${x.ai}"` : ''}>${x.ak ? `<span class="hs-dg" data-hgdrag role="button" tabindex="0" aria-label="${hgT('edit.drag_or_use_arrow')}" title="${hgT('edit.drag')}">${H.icon('mdi:drag-vertical')}</span>` : ''}<button class="hs-eb" data-hge="cfgent" data-p="${H.esc(x.p)}" data-v="${H.esc(x.v)}"><span class="hs-i">${H.icon(x.v ? ico(x.v) : 'mdi:plus')}</span><span class="hs-t"><b>${x.ak ? `<em class="hs-ix">${x.ai + 1}</em>` : ''}${H.esc(x.v ? H.name(h, x.v) : hgT('edit.choose_entity'))}</b><small>${H.esc(x.ak ? (x.v || '—') : x.l + ' · ' + (x.v || '—'))}</small></span><span class="hs-p" title="${hgT('common.change')}">${H.icon('mdi:swap-horizontal')}</span></button>${x.ak ? `<button class="hs-del" data-hge="cfgdel" data-k="${H.esc(x.ak)}" data-i="${x.ai}" aria-label="${hgT('edit.remove')}" title="${hgT('edit.remove')}">${H.icon('mdi:close')}</button>` : x.rm ? (() => { const t = x.rm === 'man' ? hgT('edit.remove_from_room') : hgT('edit.hide_in_this_room'); return `<button class="hs-del" data-hge="cfgrm" data-e="${H.esc(x.v)}" aria-label="${H.esc(H.lv(t, H.name(h, x.v)))}" title="${H.esc(t)}">${H.icon(x.rm === 'man' ? 'mdi:close' : 'mdi:eye-off-outline')}</button>`; })() : ''}</div>`).join('')}</div>` : ''}
      ${S0.types.length > 1 && S0.kind !== 'room' && S0.kind !== 'sec' ? `<div class="hs-fl"><span>${hgT('edit.display_mode')}</span>${hgStyleCards(h, S0.main || (S0.kind === 'added' ? k : ''), S0.types, S0.t, 'cfgt', false)}</div>` : ''}
      <label class="hs-fl"><span>${hgT('common.name')}</span><span class="hs-s"><input class="hs-in" name="n" value="${H.esc(S0.n)}" placeholder="${H.esc(S0.dn)}" autocomplete="off"></span></label>
      <label class="hs-fl"><span>${hgT('edit.icon_e_g_mdi')}</span><span class="hs-s">${H.icon(S0.i || 'mdi:shape-outline')}<input class="hs-in" name="i" value="${H.esc(S0.i)}" placeholder="mdi:…" autocomplete="off"></span></label>
      ${S0.kind === 'added' && S0.types.some((x) => x[0] === 'chart') ? `<div class="hs-cap"${S0.t === 'chart' ? '' : ' hidden'}>${hgForm.field(hgT('edit.chart_caption.label'), `<span class="hs-s"><input class="hs-in" name="cap" value="${H.esc(S0.cap)}" placeholder="${H.esc(hgT('edit.last_24_h'))}" autocomplete="off"></span>`, { hint: hgT('edit.chart_caption.hint') })}${hgForm.toggle(hgT('edit.chart_caption.hide'), S0.capOff, 'data-hge="cfgcapoff"')}</div>` : ''}
      ${ct.page ? (() => { const w0 = (L.conf[k] && L.conf[k].w) || '', box = (f) => `<span aria-hidden="true" style="display:flex;gap:3px;width:44px;height:22px;flex:none"><i style="flex:1;border-radius:4px;background:${f ? 'currentColor' : 'color-mix(in srgb, currentColor 40%, transparent)'}"></i>${f ? '' : '<i style="flex:1;border-radius:4px;border:1.5px dashed color-mix(in srgb, currentColor 35%, transparent)"></i>'}</span>`;
        return `<div class="hs-fl"><span>${hgT('edit.width')}</span><div class="hs-f wrap" role="radiogroup" aria-label="${hgT('edit.width')}">${[['', hgT('edit.width_automatic'), null], ['full', hgT('edit.full_width'), 1], ['half', hgT('edit.half'), 0]].map(([v, l, f]) => `<button data-hge="cfgw" data-w="${v}" role="radio" aria-pressed="${w0 === v}" aria-checked="${w0 === v}" style="gap:8px">${f == null ? '' : box(f)}${l}</button>`).join('')}</div><small style="opacity:.6;font-size:12px">${hgT('edit.on_phones_every_section')}</small></div>`; })() : ''}
      ${canSz ? `<div class="hs-fl"><span>${hgT('edit.size')}</span>${hgSzSeg('cfgz', z)}</div>` : ''}
      </div>
      <div class="hs-ac"><button class="hs-b2" data-hge="sheetclose">${hgT('common.cancel')}</button><button class="hs-b" data-hge="cfgsave">${hgT('common.save')}</button></div></div>`;
    for (const n of S.querySelectorAll('input[name]')) n.addEventListener('input', () => { if (n.name === 'i') { const ic = n.parentElement.querySelector('ha-icon'); if (ic && /^mdi:[a-z0-9-]+$/.test(n.value.trim())) ic.setAttribute('icon', n.value.trim()); } this._eCfgPv(); }); hgIcWire(S); const ckc = S.querySelector('[data-hge=cfgcapoff]'); if (ckc) ckc.addEventListener('change', () => this._eCfgPv());
    this._eCfgPv();
  },
  _eCfgVals() { const S = this._eSheetEl, g = (q) => S.querySelector(q);
    return { n: g('[name=n]').value.trim(), i: /^mdi:[a-z0-9-]+$/.test(g('[name=i]').value.trim()) ? g('[name=i]').value.trim() : '', t: (g('[data-hge=cfgt][aria-pressed=true]') || { dataset: { t: '' } }).dataset.t, cap: g('[name=cap]') ? g('[name=cap]').value.trim() : '', capOff: g('[data-hge=cfgcapoff]') ? g('[data-hge=cfgcapoff]').hasAttribute('checked') : false, w: g('[data-hge=cfgw]') ? (g('[data-hge=cfgw][aria-pressed=true]') || { dataset: { w: '' } }).dataset.w : null, z: (g('[data-hge=cfgz][aria-pressed=true]') || { dataset: {} }).dataset.z }; },
  /* podgląd: kafel (typy kafli) albo kopia bieżącego elementu z klasą trybu, nazwą i ikoną */
  _eCfgPv() {
    const R = this._eCfgR, S0 = R.S, h = this._hass, pv = this._eSheetEl && this._eSheetEl.querySelector('.hs-pvb'); if (!pv) return;
    const V = this._eCfgVals();
    if (S0.kind === 'card' && V.t && V.t.startsWith('g-')) { const es = S0.ents.filter((x) => x.ak).map((x) => x.v), tt = V.t === 'g-list' ? 'compact' : V.t === 'g-clist' ? 'minimal' : '';
      const gi = V.i || (S0.cc && S0.cc.icon) || '';
      pv.className = 'hs-pvb'; pv.innerHTML = `<div class="hgg ${V.t}"><div class="hgg-h">${gi ? H.icon(gi) : ''}<b>${H.esc(V.n || S0.dn)}</b><small>${es.length}</small></div><div class="hgg-b">${es.slice(0, 8).map((e) => `<div class="tg2 one">${hgTileHtml(h, e, 's', tt && hgTypesFor(h, e).includes(tt) ? { t: tt } : {})}</div>`).join('')}</div></div>`; hgSlots({ _hass: h, $: pv }); return; }
    if (S0.kind === 'added' || (S0.kind === 'card' && V.t && V.t !== 'card')) { pv.className = 'hs-pvb tg2'; pv.innerHTML = hgTileHtml(h, S0.main, 's', { t: V.t, n: V.n, i: V.i, cap: V.cap, capOff: V.capOff }); hgSlots({ _hass: h, $: pv }); hgPvLive(pv); return; }
    const it = R.ct.el.querySelector(`:scope > [data-hgk="${CSS.escape(R.k)}"]`); if (!it) { pv.innerHTML = ''; return; }
    if (S0.kind === 'card') { const src = [...it.querySelectorAll('*')].find((x) => x.tagName.includes('-') && x.setConfig); if (src) {
      const cf = (HGL.get(R.sc).conf[R.k] || {}), cfg = Object.assign({}, S0.cc, cf.set || {}); if (V.n) { cfg.title = V.n; cfg.name = V.n; } if (V.i) cfg.icon = V.i;
      const el = document.createElement(src.tagName.toLowerCase()); el._hgPv = true; try { el.setConfig(cfg); } catch (e) { /* zła konfiguracja – pokaż pusty */ }
      const ir = it.getBoundingClientRect();
      pv.className = 'hs-pvb live'; pv.innerHTML = ''; const box = document.createElement('div'); box.className = 'hs-pvf'; box.appendChild(el); pv.appendChild(box); el.hass = h; this._ePvEl = el; hgPvLive(pv); hgPvFit(box, el, ir.width || 0, ir.height > 40 ? Math.round(ir.height) : 0); return; } }
    /* kopia DOM nie niesie shadow DOM kart (np. klimatyzacja w sekcji): w ich miejsce świeże egzemplarze z tą samą konfiguracją */
    const cl = it.cloneNode(true), oa = [...it.querySelectorAll('*')], ca = [...cl.querySelectorAll('*')], live = [];
    oa.forEach((o, j) => { if (!o.localName.includes('-') || !o._config || !o.setConfig || !ca[j] || !cl.contains(ca[j])) return; const n = document.createElement(o.localName); n._hgPv = true; try { n.setConfig(o._config); } catch (e) { return; } ca[j].replaceWith(n); live.push(n); });
    for (const x of cl.querySelectorAll('.hge, .hge-cf')) x.remove();
    cl.classList.remove('hgm-compact', 'hgm-minimal'); if (V.t) cl.classList.add('hgm-' + V.t); cl.style.cssText = 'animation:none;outline:none;width:100%;transform:none;';
    const nmEl = cl.querySelector('.nm, .sh'); if (nmEl && V.n) { const ic0 = nmEl.querySelector('ha-icon'); nmEl.textContent = V.n; if (ic0) nmEl.prepend(ic0); }
    const icEl = cl.querySelector('.sh ha-icon') || cl.querySelector('.ic ha-icon'); if (icEl && V.i) icEl.setAttribute('icon', V.i);
    pv.className = 'hs-pvb clone'; pv.innerHTML = ''; const host = document.createElement('div'); pv.appendChild(host);
    const sr = host.attachShadow({ mode: 'open' }); const src = R.ct.root; sr.innerHTML = [...src.querySelectorAll('style')].map((x) => x.outerHTML).join('');
    const wrap = document.createElement('div'); wrap.className = R.ct.el.className.replace('hge-on', ''); wrap.style.cssText = 'display:block;columns:auto;pointer-events:none'; wrap.appendChild(cl); sr.appendChild(wrap); for (const n of live) n.hass = h;
  },
  /* tablice encji karty (sceny, kamery, …): nadpisanie cf.set[key] – dodaj / usuń / kolejność, potem odśwież widok i wróć do ustawień */
  _eCfgArrGet(R, key) { const cf = HGL.get(R.sc).conf[R.k] || {}; return hgDedupArr((cf.set && cf.set[key]) || (R.S.cc && R.S.cc[key]) || []); },
  _eCfgArr(R, key, fn, msg) { const A = this._eCfgArrGet(R, key); fn(A);
    this._eSet(R.sc, (L) => { const cf = L.conf[R.k] = L.conf[R.k] || {}; cf.set = cf.set || {}; cf.set[key] = A; });
    if (msg) this._eToast(msg); const pg = R.sc === this._pageScope(), re = () => { const ct = this._eConts().find((c) => c.scope === R.sc); if (ct) setTimeout(() => this._eCfg(ct, R.k), 120); };
    const pr = this._eRefresh(pg); if (pr && pr.then) pr.then(re); else requestAnimationFrame(re); },
  _eEntDrag() { const S = this._eSheetEl; if (!S) return;
    for (const hd of S.querySelectorAll('[data-hgdrag]')) hd.addEventListener('pointerdown', (ev) => { const row = hd.closest('.hs-er'), key = row.dataset.ak, box = row.parentElement; ev.preventDefault(); ev.stopPropagation();
      hd.setPointerCapture(ev.pointerId); row.classList.add('drag');
      const mv = (e) => { const sib = [...box.querySelectorAll(`.hs-er[data-ak="${CSS.escape(key)}"]`)].filter((x) => x !== row); let ref = null;
        for (const x of sib) { const r = x.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { ref = x; break; } }
        const last = sib[sib.length - 1]; if (ref) { if (row.nextElementSibling !== ref) box.insertBefore(row, ref); } else if (last && last.nextElementSibling !== row) box.insertBefore(row, last.nextElementSibling); };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); row.classList.remove('drag');
        const ord = [...box.querySelectorAll(`.hs-er[data-ak="${CSS.escape(key)}"]`)].map((x) => +x.dataset.ai); if (ord.every((v, i) => v === i)) return;
        this._eCfgArr(this._eCfgR, key, (A) => { const src = A.slice(); A.length = 0; for (const i of ord) A.push(src[i]); for (let i = 0; i < src.length; i++) if (!ord.includes(i)) A.push(src[i]); }, hgT('edit.order_changed')); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); });
    for (const hd of S.querySelectorAll('[data-hgdrag]')) hd.addEventListener('keydown', (ev) => { if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return; ev.preventDefault(); ev.stopPropagation();
      const row = hd.closest('.hs-er'), key = row.dataset.ak, i = +row.dataset.ai, j = i + (ev.key === 'ArrowUp' ? -1 : 1);
      if (j < 0 || j >= (this._eCfgArrGet(this._eCfgR, key) || []).length) return;
      this._eCfgArr(this._eCfgR, key, (A) => { [A[i], A[j]] = [A[j], A[i]]; }, hgT('edit.order_changed'));
      setTimeout(() => { const nh = this._eSheetEl && this._eSheetEl.querySelector(`.hs-er[data-ak="${CSS.escape(key)}"][data-ai="${j}"] [data-hgdrag]`); if (nh) nh.focus(); }, 450); });
  },
  /* układ pokoi (wiz.areas) w trybie edycji: zmiany w HGL.data, „Anuluj” przywraca migawkę, „Gotowe” zapisuje */
  _eWizA(f) { const W = HGL.data.wiz = Object.assign({}, HGL.data.wiz || {}), A = W.areas = JSON.parse(JSON.stringify(W.areas || {})); f(A); W.ts = Date.now(); },
  _eSecAdd(rid, sk, e) { this._eWizA((A) => { A.assign = Object.assign({}, A.assign, { [e]: rid }); A.sec_of = Object.assign({}, A.sec_of, { [e]: sk });
    if (A.room_hide && A.room_hide[rid]) { A.room_hide[rid] = A.room_hide[rid].filter((x) => x !== e); if (!A.room_hide[rid].length) delete A.room_hide[rid]; } }); },
  _eSecRm(rid, e) { let was = 'area'; const h = this._hass;
    this._eWizA((A) => { const V = (A.virtual || []).find((v) => v.id === rid);
      if (V && (V.entities || []).includes(e)) { V.entities = V.entities.filter((x) => x !== e); was = 'man'; }
      if (A.assign && A.assign[e] === rid) { delete A.assign[e]; was = 'man'; }
      if (A.sec_of && was === 'man') delete A.sec_of[e];
      /* z obszaru HA (także gdy było też przypisane ręcznie): ukryj tylko w tym pokoju */
      if (was === 'area' || HGAreas.areaOf(h, A, e) === rid) { const RH = A.room_hide = Object.assign({}, A.room_hide); RH[rid] = [...new Set([...(RH[rid] || []), e])]; } });
    return was; },
  _eCfgSet(R, nv) {
    if (R.secAdd) { if (R.S && R.S.rid) this._eSecAdd(R.S.rid, R.secAdd, nv); return; }
    const S0 = R.S, p = R.path;
    this._eSet(R.sc, (L) => { const cf = L.conf[R.k] = L.conf[R.k] || {};
      if (S0.kind === 'added') { const x = L.added.find((y) => y.e === R.k); if (x) { if (L.size[R.k]) { L.size[nv] = L.size[R.k]; delete L.size[R.k]; } x.e = nv; } L.order = L.order.map((k) => (k === R.k ? nv : k)); delete L.conf[R.k]; }
      else if (S0.kind === 'card') { cf.set = cf.set || {}; const [key, idx] = p.split('.'); if (idx == null) cf.set[key] = nv; else { const base = (cf.set[key] || S0.cc[key] || []).slice(); if (R.add) { const o = base.find((y) => y && typeof y === 'object'), st = this._hass.states[nv]; base.push(o ? { entity: nv, name: (st && st.attributes.friendly_name) || nv, ...(st && st.attributes.icon ? { icon: st.attributes.icon } : {}) } : nv); } else base[+idx] = typeof base[+idx] === 'object' && base[+idx] ? Object.assign({}, base[+idx], { entity: nv }) : nv; cf.set[key] = base; } }
      else if (S0.kind === 'room') cf[p] = nv;
      else { const sw = L.conf._swap = L.conf._swap || {}; sw[R.old] = nv; }
    });
  },
  _eCfgSave() {
    const R = this._eCfgR, S0 = R.S, V = this._eCfgVals();
    this._eSet(R.sc, (L) => {
      if (S0.kind === 'added') { const x = L.added.find((y) => y.e === R.k); if (x) { for (const f of ['n', 'i', 't', 'cap', 'capOff']) if (V[f]) x[f] = V[f]; else delete x[f]; } }
      else if (S0.kind === 'sec') { if (V.n) L.names[R.k] = V.n; else delete L.names[R.k]; const cf = L.conf[R.k] = L.conf[R.k] || {}; for (const f of ['i', 't']) if (V[f]) cf[f] = V[f]; else delete cf[f]; }
      else { const cf = L.conf[R.k] = L.conf[R.k] || {}; for (const f of ['n', 'i']) if (V[f]) cf[f] = V[f]; else delete cf[f]; if (V.t && V.t !== 'card') cf.t = V.t; else delete cf.t; }
      if (V.w != null) { const cw = L.conf[R.k] = L.conf[R.k] || {}; if (V.w === 'full' || V.w === 'half') cw.w = V.w; else delete cw.w; }
      if (V.z) { if (V.z === this._eBaseZ(R.sc, R.k)) delete L.size[R.k]; else L.size[R.k] = V.z; }
    });
    this._eSheet(false); this._eToast(hgT('edit.settings_saved')); return this._eRefresh(R.sc === this._pageScope());
  },
  /* krok 2 dodawania: styl widżetu z podglądem na żywo */
  _eAddStep(sc, e, n) {
    const h = this._hass, S = this._eSheetEl, T = hgTypeOpts(h, e); this._eAddE = e;
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${hgT('edit.widget_style')}"><style>${HG_STY_CSS}</style><div class="hs-h"><b>${hgT('edit.widget_style')}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgT('common.close')}">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      <div class="hs-pv"><small>${hgT('edit.live_preview')} · ${H.esc(n || H.name(h, e))}</small><div class="hs-pvb tg2">${hgTileHtml(h, e, 's', { t: T[0][0] })}</div></div>
      <div class="hs-fl"><span>${hgT('edit.style')}</span>${hgStyleCards(h, e, T, T[0][0], 'addt')}</div></div>
      <div class="hs-ac"><button class="hs-b2" data-hge="addback">${hgT('common.back')}</button><button class="hs-b" data-hge="addok">${H.icon('mdi:plus')}<span>${hgT('common.add')}</span></button></div></div>`;
    hgSlots({ _hass: h, $: S.querySelector('.hs-pvb') }); hgPvLive(S.querySelector('.hs-pvb')); this._eAddSc = sc; this._eAddN = n;
  },
  _eApp(f) { const A = Object.assign({}, HGApp.get()); f(A); HGApp.set(A); this._eBgSync(); },
  /* tło strony: nadpisanie z „Wygląd” ma pierwszeństwo przed zdjęciem z CFG (zmienne na hoście usuwane) */
  _eBgSync() { const A = HGApp.get(); if (A.bg) { this.style.removeProperty('--hg-bg-wide'); this.style.removeProperty('--hg-bg-portrait'); } else if (this._bgDef) { for (const [k, v] of this._bgDef) if (v) this.style.setProperty(k, `url('${v}')`); } this._glassRefresh && this._glassRefresh(); },
  /* Język: osobisty wybór (konto HA + to urządzenie), „Automatycznie” = ustawienie pulpitu / kreator / przeglądarka */
  _eLangHtml() {
    const sel = HGLang.get(), w = (HGL.data && HGL.data.wiz) || {}, src = window.__hgLangOpt ? hgT('edit.dashboard_setting') : hgWizLang(w) ? hgT('edit.setup_wizard') : hgT('edit.browser_language');
    const auto = hgLang(null, window.__hgLangOpt || hgWizLang(w) || ''), nm = (l) => (HGLang.LIST.find((x) => x[0] === l) || [l, l])[1];
    return `<section class="lk-g" data-tab="look" data-pg="general"><h4>${H.icon('mdi:translate')}${hgT('edit.language')}</h4><small class="lk-hn">${hgT('edit.language_auto_hint', { name: H.esc(nm(auto)), source: src })}</small>
      <div class="lk-seg lk-lng" role="group" aria-label="${hgT('edit.language')}">${[['', hgT('common.automatic')], ...[...HGLang.LIST].sort((a, b) => (a[0] === 'en') - (b[0] === 'en'))].map(([v, n]) => `<button data-hge="lang" data-l="${v}" aria-pressed="${sel === v}"${v ? ` lang="${v}"` : ''}>${H.esc(n)}</button>`).join('')}</div></section>`;
  },
  /* Wydajność (osobno na tym urządzeniu, HGPerf): rozmycie szkła i oszczędzanie baterii; „Automatycznie” pokazuje, co wybrano */
  /* tło panelu (#15): wspólne dla dashboardu + wyjątek dla bieżącego widoku */
  _ePbgHtml() { const A = HGApp.get(), g = A.pbg === false ? 'off' : 'on', vw = this._config && this._config.view, pv = (vw && A.pbgv && A.pbgv[vw]) || '';
    const seg = (act, sel, opts, lbl) => `<div class="lk-seg lk-lng lk-pf" style="--n:${opts.length}" role="group" aria-label="${H.esc(lbl)}">${opts.map(([v, n]) => `<button data-hge="${act}" data-v="${v}" aria-pressed="${sel === v}">${H.esc(n)}</button>`).join('')}</div>`;
    return `<section class="lk-g" data-tab="look" data-pg="theme"><h4>${H.icon('mdi:card-outline')}${hgT('edit.panel_backdrop')}</h4><small class="lk-hn">${hgT('edit.panel_backdrop_hint')}</small>
      ${seg('pbg', g, [['on', hgT('common.on_neut')], ['off', hgT('common.off_neut')]], hgT('edit.panel_backdrop'))}
      ${vw ? `<small class="lk-hn">${hgT('edit.panel_backdrop_view')}</small>${seg('pbgv', pv, [['', hgT('edit.panel_backdrop_as_all')], ['on', hgT('common.on_neut')], ['off', hgT('common.off_neut')]], hgT('edit.panel_backdrop_view'))}` : ''}</section>`; },
  _ePerfHtml() {
    const bs = HGPerf.blurSel(), es = HGPerf.ecoSel(), b = HGPerf.blur(), e = HGPerf.eco();
    const BN = { full: hgT('edit.full'), light: hgT('edit.blur_light'), off: hgT('common.off_neut') };
    const seg = (act, sel, opts, lbl) => `<div class="lk-seg lk-lng lk-pf" style="--n:${opts.length}" role="group" aria-label="${H.esc(lbl)}">${opts.map(([v, n]) => `<button data-hge="${act}" data-v="${v}" aria-pressed="${sel === v}">${H.esc(n)}</button>`).join('')}</div>`;
    return `<section class="lk-g" data-tab="look" data-pg="general"><h4>${H.icon('mdi:speedometer')}${hgT('edit.performance')}</h4><small class="lk-hn">${hgT('edit.saved_on_this_device')}</small>
      <small class="lk-hn">${hgT('edit.glass_blur')} · ${H.lv(hgT('common.now'), H.esc(BN[b]))}</small>
      ${seg('perfblur', bs, [['', hgT('edit.auto')], ['full', BN.full], ['light', BN.light], ['off', BN.off]], hgT('edit.glass_blur'))}
      <small class="lk-hn">${hgT('edit.power_saving_stops_looping')} · ${H.lv(hgT('common.now'), e ? hgT('edit.state_on_lower') : hgT('edit.state_off_lower'))}</small>
      ${seg('perfeco', es, [['', hgT('edit.auto')], ['1', hgT('common.on_neut')], ['0', hgT('common.off_neut')]], hgT('edit.power_saving'))}</section>`;
  },
  /* przejście na stronę ustawień (bez przebudowy arkusza): nagłówek strony, zakładki, telefon: z listy do strony */
  _eSetGo(k, keepQ) { const sh = this._eSheetEl && this._eSheetEl.querySelector('.hge-sheet.lk'); if (!sh) return; const p = HG_SET_PAGES().find((x) => x[0] === k); if (!p) return;
    this._lkTab = k; this._lkDD = 'page'; sh.dataset.at = k; sh.dataset.dd = 'page';
    if (!keepQ) { const q = sh.querySelector('[name=lkq]'); if (q) q.value = ''; for (const x of sh.querySelectorAll('.lk-sc > .hit')) x.classList.remove('hit'); for (const n of sh.querySelectorAll('.lk-tabs .lk-n')) n.remove(); }
    for (const x of sh.querySelectorAll('.lk-tabs [role=tab]')) { const on = x.dataset.k === k; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; }
    const ph = sh.querySelector('.lk-ph'); if (ph) { ph.querySelector('b').textContent = p[2]; ph.querySelector('small').textContent = HG_SET_GROUPS()[p[3]]; }
    const sc = sh.querySelector('.hs-sc'); if (sc) { sc.setAttribute('aria-labelledby', 'lkt-' + k); sc.scrollTop = 0; sc.classList.remove('sw'); void sc.offsetWidth; sc.classList.add('sw'); } },
  /* wyszukiwarka: dopasowanie wszystkich słów do treści sekcji i nazwy strony; wyniki z wielu stron naraz, licznik przy stronie */
  _eSetFind(sh, q) { const W = hgSetWords(q), names = Object.fromEntries(HG_SET_PAGES().map((p) => [p[0], p[2]]));
    for (const n of sh.querySelectorAll('.lk-tabs .lk-n')) n.remove();
    if (!W.length) { for (const x of sh.querySelectorAll('.lk-sc > .hit')) x.classList.remove('hit'); sh.dataset.at = this._lkTab; return 0; }
    const cnt = {}; let all = 0;
    for (const sec of sh.querySelectorAll('.lk-sc > [data-pg]')) { const t = (names[sec.dataset.pg] || '') + ' ' + hgSetText(sec);
      const hit = hgSetMatch(t, W); sec.classList.toggle('hit', hit); if (hit) { cnt[sec.dataset.pg] = (cnt[sec.dataset.pg] || 0) + 1; all++; } }
    for (const [k, n] of Object.entries(cnt)) { const b = sh.querySelector(`#lkt-${k}`); if (b) b.insertAdjacentHTML('beforeend', `<em class="lk-n" aria-label="${hgT('settings.results', { count: n })}">${n}</em>`); }
    sh.dataset.at = '__s'; sh.dataset.dd = 'page'; const ph = sh.querySelector('.lk-ph'); if (ph) { ph.querySelector('b').textContent = hgT('settings.results', { count: all }); ph.querySelector('small').textContent = q; }
    return all; },
  _eSetWire(S) { const sh = S.querySelector('.hge-sheet.lk'); if (!sh) return; const q = sh.querySelector('[name=lkq]');
    if (q) { q.addEventListener('input', () => this._eSetFind(sh, q.value)); q.addEventListener('keydown', (e) => { if (e.key === 'Escape' && q.value) { e.preventDefault(); e.stopPropagation(); q.value = ''; this._eSetGo(this._lkTab); } }); }
    const tl = sh.querySelector('.lk-tabs'); if (tl) tl.addEventListener('keydown', (e) => { const T = [...tl.querySelectorAll('[role=tab]')], i = T.indexOf(e.target); if (i < 0) return;
      const j = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? T.length - 1 : null; if (j == null) return; e.preventDefault(); const t = T[(j + T.length) % T.length]; t.focus(); this._eSetGo(t.dataset.k); }); },
  /* O Nuvio: wersja, linki do projektu */
  _eAboutHtml() { const v = typeof HG_BUILD === 'string' && !HG_BUILD.startsWith('__') ? HG_BUILD : '', R = 'https://github.com/kczepiec/nuvio';
    return `<section class="lk-g lk-ab" data-tab="about" data-pg="about"><h4>${H.icon('mdi:information-outline')}${hgT('settings.about_title')}</h4><small class="lk-hn">${hgT('settings.about_hint')}</small>
      <span>${hgT('settings.version')}: <code>${H.esc(v.split('+')[0] || '?')}</code>${v.includes('+') ? ` <code>${H.esc(v.split('+')[1])}</code>` : ''}</span>
      <a href="${R}#readme" target="_blank" rel="noopener">${hgT('settings.docs')}</a><a href="${R}/releases" target="_blank" rel="noopener">${hgT('settings.changelog')}</a><a href="${R}/issues/new/choose" target="_blank" rel="noopener">${hgT('settings.report')}</a><a href="https://discord.gg/rFG9y2hFMJ" target="_blank" rel="noopener">${hgT('nav.discord')}</a></section>`; },
  _eLook() {
    /* zachowaj przewinięcie i fokus między przerysowaniami (bez skoku na górę) */
    { const S0 = this._eSheetEl, sc0 = S0 && S0.querySelector('.hge-sheet.lk .hs-sc'); if (sc0) { const fe = S0.querySelector(':focus') || (S0.getRootNode && S0.getRootNode().activeElement), key = fe && fe.dataset ? ['hge', 'v', 'k', 'c'].map((x) => fe.dataset[x] || '').join('|') : ''; const top = sc0.scrollTop;
      requestAnimationFrame(() => { const S1 = this._eSheetEl, sc1 = S1 && S1.querySelector('.hge-sheet.lk .hs-sc'); if (!sc1) return; sc1.scrollTop = top; if (key) { const el = [...S1.querySelectorAll('button')].find((b) => ['hge', 'v', 'k', 'c'].map((x) => b.dataset[x] || '').join('|') === key); if (el) el.focus({ preventScroll: true }); } }); } }
    this._eSheet('cfg'); const S = this._eSheetEl, A = HGApp.get(), acc = (A.accent || ('#' + '63D71E')).toUpperCase(), bg = A.bg || null, dim = A.dim != null ? A.dim : 0.4;
    const T = HGApp.tokens(acc);
    const isC = !HG_ACCENTS.some(([c]) => c.toUpperCase() === acc), c1 = bg && (bg.kind === 'color' || bg.kind === 'gradient') ? bg.v : ('#' + '16202B'), c2 = bg && bg.v2 ? bg.v2 : ('#' + '05070A'), dv = Math.round(dim * 100);
    const ck = H.icon('mdi:check');
    const PG = HG_SET_PAGES(), GR = HG_SET_GROUPS();
    const html0 = `<div class="hs-sc lk-sc">
      ${window.HGLooks ? HGLooks.html(this) : ''}
      <section class="lk-g" data-tab="look" data-pg="theme"><h4>${H.icon('mdi:palette-outline')}${hgT('edit.accent')}</h4>
        <div class="lk-sw">${HG_ACCENTS.map(([c, l0]) => { const l = H.esc(String(l0)); return `<button data-hge="acc" data-c="${c}" aria-pressed="${acc === c.toUpperCase()}" aria-label="${l}"><i style="--c:${c}">${ck}</i><small>${l}</small></button>`; }).join('')}
        <label class="lk-cc" aria-pressed="${isC}"><i style="--c:${isC ? acc : 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)'}">${isC ? ck : H.icon('mdi:eyedropper-variant')}</i><input type="color" name="acc" value="${acc}" aria-label="${hgT('edit.custom_accent_colour')}"><small>${hgT('edit.accent_custom')}</small></label></div>
        <div class="lk-pv" aria-label="${hgT('edit.preview')}"><div class="lk-pc"><span class="lk-pi" style="background:${acc};color:${T.light['--hg-on-accent']}">${H.icon('mdi:lightbulb-on')}</span><span class="lk-pt"><b>${hgT('edit.lamp')}</b><small style="color:var(--hg-accent-tx)">${hgT('common.on_neut')} · ${H.pct(80)}</small></span></div><span class="lk-pb" style="background:${acc};color:${T.light['--hg-on-accent']}">${ck} ${hgT('edit.active')}</span></div></section>
      <section class="lk-g" data-tab="bg" data-pg="bg"><h4>${H.icon('mdi:image-outline')}${hgT('edit.background')}</h4>
        <div class="lk-bgs">${hgBgList().map(([u, l, pu, th], i) => { const on = i ? !!bg && bg.kind !== 'color' && bg.kind !== 'gradient' && bg.v === u : !bg;
          const src = th || u || (HG_DEFAULT_BG.kind === 'image' ? HG_DEFAULT_BG.v : '');
          return `<button data-hge="bgp" data-v="${i ? H.esc(u) : ''}" data-p="${H.esc(pu || '')}" aria-pressed="${on}" title="${H.esc(l)}"><span data-et="${hgT('edit.image_not_loaded')}" style="background:linear-gradient(160deg, ${HG_DEFAULT_BG_FB.v}, ${HG_DEFAULT_BG_FB.v2})">${src ? `<img alt="" loading="lazy" decoding="async" src="${H.esc(src)}" onerror="var c=!this.dataset.cdn&&window.hgCdn&&window.hgCdn(this.src);if(c){console.warn('Nuvio: local background failed, using CDN', this.src);this.dataset.cdn='1';this.src=c;}else{this.parentElement.dataset.err='1';console.warn('Nuvio: background not loaded', this.src);this.remove();}">` : ''}${ck}</span><small>${H.esc(i ? l : (l || hgT('edit.default')))}</small></button>`; }).join('')}</div>
        <div class="lk-row"><span class="hs-s lk-url">${H.icon('mdi:link-variant')}<input class="hs-in" name="bgurl" placeholder="${hgT('edit.image_url_https_or')}" value="${H.esc(bg && bg.kind === 'url' ? bg.v : '')}" autocomplete="off"><button class="lk-mini" data-hge="bgurl">${hgT('edit.set')}</button></span>
          <button class="lk-up" data-hge="bgup" title="${hgT('edit.upload_an_image_to')}">${H.icon('mdi:upload')}<span>${hgT('edit.upload')}</span></button><input type="file" accept="image/*" hidden></div>
        <div class="lk-grd"><div class="lk-gp" style="background:linear-gradient(135deg,${c1},${c2})"></div>
          <label class="lk-st"><input type="color" name="bgc1" value="${c1}" aria-label="${hgT('edit.colour_1')}"><i style="background:${c1}"></i>${hgT('edit.colour_1')}</label>
          <label class="lk-st"><input type="color" name="bgc2" value="${c2}" aria-label="${hgT('edit.colour_2')}"><i style="background:${c2}"></i>${hgT('edit.colour_2')}</label>
          <div class="lk-seg"><button data-hge="bgcol" data-k="color" aria-pressed="${!!bg && bg.kind === 'color'}">${hgT('edit.solid')}</button><button data-hge="bgcol" data-k="gradient" aria-pressed="${!!bg && bg.kind === 'gradient'}">${hgT('edit.gradient')}</button></div></div></section>
      <section class="lk-g" data-tab="look" data-pg="bg"><h4>${H.icon('mdi:brightness-6')}${hgT('edit.dimming')}<em class="dv">${H.pct(dv)}</em></h4><small class="lk-hn">${hgT('edit.applies_to_the_background')}</small>
        <input class="lk-rg" type="range" min="0" max="100" step="1" name="dim" value="${dv}" style="--v:${dv}%" aria-label="${hgT('edit.background_dimming')}"></section>
      ${this._ePbgHtml()}
      ${this._eLangHtml()}
      ${this._ePerfHtml()}
      ${window.HGLookX ? HGLookX.html(this) : ''}
      ${window.HGRoomsX ? HGRoomsX.html(this) : ''}
      ${window.HGAssistUI ? HGAssistUI.html(this) : ''}
      ${window.HGWall ? HGWall.html(this) : ''}
      ${window.HGUsers ? HGUsers.html(this) : ''}
      ${window.HGBackup ? HGBackup.html(this) : ''}
      ${this._eAboutHtml()}
      <p class="lk-nores" role="status">${hgT('settings.no_results')}</p>
      </div>`;
    const has = new Set([...html0.matchAll(/data-pg="([a-z]+)"/g)].map((m) => m[1])), pages = PG.filter((p) => has.has(p[0]));
    const at = this._lkTab = hgSetPage(this._lkTab, has), cur = pages.find((p) => p[0] === at) || pages[0], dd = this._lkDD || 'nav';
    let lg = ''; const nav = pages.map(([k, ic, l, g]) => { const gh = g !== lg ? `<div class="lk-gl" role="presentation">${H.esc(GR[g])}</div>` : ''; lg = g;
      return `${gh}<button role="tab" id="lkt-${k}" data-hge="lktab" data-k="${k}" aria-selected="${k === at}" aria-controls="lk-sc" tabindex="${k === at ? 0 : -1}">${H.icon(ic)}<span>${H.esc(l)}</span><i class="lk-ch" aria-hidden="true">${H.icon('mdi:chevron-right')}</i></button>`; }).join('');
    const html1 = html0.replace('<div class="hs-sc lk-sc">', `<div class="hs-sc lk-sc" id="lk-sc" role="tabpanel" aria-labelledby="lkt-${at}"><div class="lk-ph"><button class="lk-bk" data-hge="lkback" aria-label="${hgT('common.back')}">${H.icon('mdi:arrow-left')}</button><b>${H.esc(cur ? cur[2] : '')}</b><small>${H.esc(cur ? GR[cur[3]] : '')}</small></div>`);
    const html = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide lk lkt" data-at="${at}" data-dd="${dd}" role="dialog" aria-modal="true" aria-label="${hgT('edit.settings')}"><style>${HG_LOOK_CSS}${HG_LKT_CSS(PG.map((t) => t[0]))}</style><div class="hs-h"><b>${H.icon('mdi:cog-outline')}${hgT('edit.settings')}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgT('common.close')}">${H.icon('mdi:close')}</button></div>
      <div class="lk-side"><label class="lk-q">${H.icon('mdi:magnify')}<input type="search" name="lkq" placeholder="${hgT('settings.search')}" aria-label="${hgT('settings.search')}" autocomplete="off"></label>
      <nav class="lk-tabs" role="tablist" aria-orientation="vertical" aria-label="${hgT('edit.settings_sections')}">${nav}</nav></div>${html1}<div class="lk-ft"><button class="lk-gh" data-hge="lookreset">${H.icon('mdi:restore')}${hgT('edit.reset_to_default')}</button><button class="lk-ok" data-hge="sheetclose">${hgT('common.done')}</button></div></div>`;
    /* otwarty arkusz: aktualizacja na miejscu (bez ponownej animacji otwarcia), przewijany kontener zostaje, więc pozycja przewinięcia też */
    { const old = S.querySelector('.hge-sheet.lk'); if (old) { const tp = document.createElement('template'); tp.innerHTML = html; const nw = tp.content.querySelector('.hge-sheet');
      const oc = [...old.children], nc = [...nw.children];
      if (oc.length === nc.length) nc.forEach((n, j) => { const o = oc[j]; if (o.classList.contains('hs-sc') && n.classList.contains('hs-sc')) { const t0 = o.scrollTop; o.replaceChildren(...n.childNodes); o.scrollTop = t0; } else o.replaceWith(n); });
      else old.replaceChildren(...nw.childNodes); } else S.innerHTML = html; }
    const gu = () => { const v1 = S.querySelector('[name=bgc1]').value, v2 = S.querySelector('[name=bgc2]').value; S.querySelector('.lk-gp').style.background = `linear-gradient(135deg,${v1},${v2})`; S.querySelectorAll('.lk-st i')[0].style.background = v1; S.querySelectorAll('.lk-st i')[1].style.background = v2; };
    S.querySelectorAll('[name=bgc1],[name=bgc2]').forEach((x) => x.addEventListener('input', gu));
    S.querySelector('[name=acc]').addEventListener('change', (e) => { this._eApp((A2) => { A2.accent = e.target.value.toUpperCase(); }); this._eLook(); });
    const rg = S.querySelector('[name=dim]'); rg.addEventListener('input', () => { rg.style.setProperty('--v', rg.value + '%'); S.querySelector('.dv').textContent = H.pct(rg.value); this._eApp((A2) => { A2.dim = rg.value / 100; }); });
    S.querySelector('input[type=file]').addEventListener('change', (e) => this._eUpload(e.target.files && e.target.files[0]));
    if (window.HGWall) HGWall.wire(this, S);
    if (window.HGRoomsX) HGRoomsX.wire(this, S);
    if (window.HGAssistUI) HGAssistUI.wire(this, S);
    this._eSetWire(S);
  },
  /* przesłanie zdjęcia: integracja „image_upload” HA (/api/image/upload), serwowane z /api/image/serve/<id>/original */
  /* nawigacja w arkuszu jako stos: zagnieżdżony krok (wybór encji, formularz) wraca do poprzedniego; zamyka tylko X na poziomie głównym */
  _eGo(back, fn) { const S = this._eSheetEl, sc = S && S.querySelector('.hge-sheet .hs-sc'), t = this._eTrig;
    const key = t && t.dataset ? ['hge', 'c', 'k', 'i', 'e', 't', 'v'].filter((x) => t.dataset[x] != null).map((x) => `[data-${x}="${CSS.escape(t.dataset[x])}"]`).join('') : '';
    (this._eStk = this._eStk || []).push({ back, top: sc ? sc.scrollTop : 0, key, form: this._eFormGet() }); this._eNav('f'); fn(); this._eFocusTitle(); },
  /* stan formularza kroku (pola i przełączniki aria-pressed), odtwarzany po powrocie, gdy krok czyta wartości z DOM */
  _eBk(t) { return ['hge', 'c', 'k', 'i', 'e', 't', 'v', 'w', 'z'].filter((x) => t.dataset[x] != null).map((x) => `[data-${x}="${CSS.escape(t.dataset[x])}"]`).join(''); },
  _eFormGet() { const S = this._eSheetEl, sh = S && S.querySelector('.hge-sheet'); if (!sh) return null;
    return { f: [...sh.querySelectorAll('input[name], select[name], textarea[name]')].map((i) => [i.name, i.type === 'checkbox' || i.type === 'radio' ? i.checked : i.value, i.type]), p: [...sh.querySelectorAll('[aria-pressed][data-hge]')].map((b) => [this._eBk(b), b.getAttribute('aria-pressed')]) }; },
  _eFormSet(F) { const S = this._eSheetEl, sh = S && S.querySelector('.hge-sheet'); if (!sh || !F) return;
    for (const [n, v, t] of F.f) { const i = sh.querySelector(`[name="${CSS.escape(n)}"]`); if (!i) continue; if (t === 'checkbox' || t === 'radio') i.checked = v; else if (i.value !== v) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } }
    for (const [k, v] of F.p) { const b = k && sh.querySelector(k); if (b) b.setAttribute('aria-pressed', v); } },
  _eBack() { const f = (this._eStk || []).pop(); if (!f) return this._eClose(); this._eRepl = null; this._eNav('b'); this._eBacking = true; try { (f.back || f)(); } finally { this._eBacking = false; } if (f.form) this._eFormSet(f.form);
    const S = this._eSheetEl; if (!S) return; const sc = S.querySelector('.hge-sheet .hs-sc'); if (sc && f.top) sc.scrollTop = f.top;
    requestAnimationFrame(() => { const sc2 = S.querySelector('.hge-sheet .hs-sc'); if (sc2 && f.top) sc2.scrollTop = f.top; const el = f.key && S.querySelector(f.key); if (el) el.focus({ preventScroll: true }); else this._eFocusTitle(); }); },
  _eFocusTitle() { requestAnimationFrame(() => { const t = this._eSheetEl && this._eSheetEl.querySelector('.hge-sheet .hs-h b'); if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } }); },
  /* niezapisane zmiany: migawka stanu formularza przy otwarciu poziomu głównego */
  _eSnapVal() { const S = this._eSheetEl, rep = (k, v) => (v && (v.nodeType || typeof v === 'function') ? undefined : v);
    try { return JSON.stringify([this._eCompR, this._eCfgR && this._eCfgR.v, this._eCfgR && this._eCfgR.set, S ? [...S.querySelectorAll('.hge-sheet input:not([type=search]), .hge-sheet select, .hge-sheet textarea')].filter((i) => !i.closest('.hs-s.srch')).map((i) => i.type === 'checkbox' ? i.checked : i.value) : []], rep); } catch (e) { return ''; } },
  /* migawka formularza arkusza (osobna od this._eSnap trybu edycji): tylko formularze z zapisem (ustawienia karty, komponent) */
  _eSnapTake() { const t = this._eShT = (this._eShT || 0) + 1; this._eShSnap = null; requestAnimationFrame(() => { if (t === this._eShT) this._eShSnap = this._eSnapVal(); }); },
  _eDirtySheet() { return this._eShSnap != null && this._eSnapVal() !== this._eShSnap; },
  _eClose() { const S = this._eSheetEl, sh = S && S.querySelector('.hge-sheet'); if (!sh || !this._eDirtySheet()) return this._eSheet(false);
    if (sh.querySelector('.hs-cf')) return; sh.insertAdjacentHTML('beforeend', `<div class="hs-cf" role="alertdialog" aria-modal="true" aria-labelledby="hscf-t"><div class="hs-cfb"><b id="hscf-t">${hgT('edit.discard_changes')}</b><small>${hgT('edit.unsaved_changes_in_this')}</small><div><button class="hs-b2" data-hge="cfstay">${hgT('edit.stay')}</button><button class="hs-b hs-bd" data-hge="cfdrop">${hgT('edit.discard')}</button></div></div></div>`);
    requestAnimationFrame(() => { const b = sh.querySelector('[data-hge=cfstay]'); if (b) b.focus(); }); },
  _eNav(d) { const L = this._eSheetEl; if (!L) return; L.classList.remove('nav-f', 'nav-b'); void L.offsetWidth; L.classList.add('nav-' + d); clearTimeout(this._eNavT); this._eNavT = setTimeout(() => L.classList.remove('nav-f', 'nav-b'), 320); },
  _eCfgBack() { this._eRepl = null; const R = this._eCfgR, ct = R && this._eConts().find((c) => c.scope === R.sc); if (ct) this._eCfg(ct, R.k); else this._eSheet(false); },
  _eDeco() { const L = this._eSheetEl, n = (this._eStk || []).length; if (!L) return; const hd = L.querySelector('.hge-sheet .hs-h'); if (!hd) return;
    const bk = hd.querySelector('.hs-bk'); if (n && !bk) hd.insertAdjacentHTML('afterbegin', `<button class="hs-bk" data-hge="sback" aria-label="${hgT('common.back')}" title="${hgT('common.back')}">${H.icon('mdi:arrow-left')}</button>`); else if (!n && bk) bk.remove();
    const x = hd.querySelector('.hs-x'); if (x) x.setAttribute('aria-label', n ? hgT('edit.back_to_previous_step') : hgT('common.close')); },
  _eUpload(f) {
    if (!f) return; const h = this._hass; if (!h || !h.fetchWithAuth) return this._eToast(hgT('edit.no_session_cannot_upload'));
    const fd = new FormData(); fd.append('file', f, f.name); this._eToast(hgT('edit.uploading'));
    /* fetchWithAuth odświeża wygasły token (tablety otwarte dłużej niż 30 min) */
    h.fetchWithAuth('/api/image/upload', { method: 'POST', body: fd }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((j) => {
      const u = `/api/image/serve/${j.id}/original`; this._eApp((A) => { A.bg = { kind: 'url', v: u }; }); this._eToast(hgT('edit.uploaded_image_set')); this._eLook(); }, (e) => this._eToast(hgT('edit.upload_failed', { error: e })));
  },
  _eSheet(mode, ct, scOver) {
    if (!mode) { this._eRepl = null; this._eStk = []; this._eKidStk = []; this._eShT = (this._eShT || 0) + 1; this._eShSnap = null; this._eSheetOpen = false; if (this._eSheetEl) { this._eSheetEl.remove(); this._eSheetEl = null; } return; }
    this._eSheetOpen = mode; this._eSheetCt = ct; if (!this._eBacking) { this._eF = 'all'; this._eQ = ''; }
    let L = this._eSheetEl; if (L && !L.isConnected) this.shadowRoot.appendChild(L); if (!L) { L = this._eSheetEl = document.createElement('div'); L.className = 'hge-sheet-l'; this.shadowRoot.appendChild(L); this._eStk = [];
      setTimeout(() => L.classList.add('opened'), 320); new MutationObserver(() => this._eDeco()).observe(L, { childList: true });
      let g = null; L.addEventListener('touchstart', (ev) => { const t = ev.touches[0], sh = L.querySelector('.hge-sheet'); if (!t || !sh) return; const r = sh.getBoundingClientRect(), sc = sh.querySelector('.hs-sc');
        g = { x: t.clientX, y: t.clientY, edge: t.clientX - r.left < 28, top: t.clientY - r.top < 64 || (sc && sc.scrollTop <= 0 && sc.contains(ev.target)) }; }, { passive: true });
      L.addEventListener('touchend', (ev) => { const t = ev.changedTouches[0]; if (!g || !t) return; const dx = t.clientX - g.x, dy = t.clientY - g.y, n = (this._eStk || []).length;
        if (g.edge && dx > 70 && Math.abs(dy) < 50 && n) this._eBack(); else if (g.top && dy > 90 && Math.abs(dx) < 60 && !n) this._eClose(); g = null; }, { passive: true }); }
    if (!this.shadowRoot.querySelector('style[data-hgt]')) { const st = document.createElement('style'); st.dataset.hgt = '1'; st.textContent = HG_TILE_CSS; this.shadowRoot.appendChild(st); }
    if (mode === 'cfg') return;
    if (mode === 'hidden') { const hid = this._eHidden();
      L.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet" role="dialog" aria-modal="true" aria-label="${hgT('edit.restore_hidden')}"><div class="hs-h"><b>${hgT('edit.restore_hidden')}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgT('common.close')}">${H.icon('mdi:close')}</button></div>
        <div class="hs-l">${hid.length ? hid.map((x) => `<div class="hs-r"><span class="hs-i">${H.icon('mdi:eye-off-outline')}</span><span class="hs-t"><b>${H.esc(x.n)}</b><small>${H.esc(x.sc === this._pageScope() ? hgT('edit.view_card') : x.sc === 'rooms' ? hgT('common.room') : x.sc.startsWith('room:') ? hgT('edit.room_section') : hgT('edit.tile'))}</small></span><button class="hs-b" data-hge="restore" data-sc="${H.esc(x.sc)}" data-k="${H.esc(x.k)}">${hgT('edit.restore')}</button></div>`).join('') : `<p class="hs-e">${hgT('edit.no_hidden_items_in')}</p>`}</div></div>`;
      return;
    }
    if (!scOver) this._eRepl = null;
    const sc = scOver || (ct ? (ct.page ? ct.scope + ':tiles' : ct.scope) : (this._pageScope() + ':tiles')); this._eSc = sc;
    const rooms = sc === 'rooms' && !this._eRepl;
    L.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet" role="dialog" aria-modal="true" aria-label="${this._eRepl && this._eRepl.badge ? hgT('edit.add_entity') : hgT('edit.add_tile')}"><div class="hs-h"><b>${this._eRepl ? (this._eRepl.badge ? hgT('edit.add_entity') : hgT('edit.change_entity')) : rooms ? hgT('edit.add_room') : sc.startsWith('room:') ? hgT('edit.add_to_room') : hgT('edit.add_tile')}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgT('common.close')}">${H.icon('mdi:close')}</button></div>
      <label class="hs-s">${H.icon('mdi:magnify')}<input type="search" placeholder="${rooms ? hgT('edit.search_areas') : hgT('edit.search_by_name_room')}" aria-label="${hgT('common.search')}" autocomplete="off"><button class="hs-clr" type="button" hidden aria-label="${hgT('edit.clear')}">${H.icon('mdi:close')}</button></label>
      ${rooms ? '' : `<div class="hs-f" role="group" aria-label="${hgT('edit.type')}">${[['all', hgT('edit.all')], ['light', hgT('edit.lights')], ['tog', hgT('edit.switches')], ['val', hgT('edit.sensors')], ['clim', hgT('edit.climate')], ['media', hgT('common.media')], ['cam', hgT('edit.cameras')], ['cover', hgT('edit.covers')], ['run', hgT('edit.scenes_and_scripts')]].map(([f, l]) => `<button data-hge="filter" data-f="${f}" aria-pressed="${f === 'all'}">${l}</button>`).join('')}</div>`}
      ${rooms ? '' : '<div class="hs-pv" aria-live="polite"></div>'}<div class="hs-l" role="list"></div></div>`;
    const inp = L.querySelector('input'), clr = L.querySelector('.hs-clr'); if (this._eQ) { inp.value = this._eQ; clr.hidden = false; } inp.addEventListener('input', () => { this._eQ = inp.value; clr.hidden = !inp.value; this._eSheetList(); });
    clr.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); inp.value = ''; this._eQ = ''; clr.hidden = true; this._eSheetList(); inp.focus(); }, true);
    this._eSheetList(); setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 60);
  },
  /* encje już widoczne w widoku: atrybuty data-e/data-ac/data-cam/data-entity w DOM (głęboko) + identyfikatory w konfiguracji kart */
  _eShown() {
    const h = this._hass, S = new Set();
    const rx = /\b[a-z_]+\.[a-z0-9_]+\b/g, js = JSON.stringify(this._config.cards || []);
    for (const m of js.match(rx) || []) if (h.states[m]) S.add(m);
    const walk = (r, d) => { if (!r || d > 4) return; for (const el of r.querySelectorAll('[data-e],[data-ac],[data-cam],[data-entity],[data-hgk]')) { for (const v of [el.dataset.e, el.dataset.ac, el.dataset.cam, el.dataset.entity, el.dataset.hgk]) if (v && h.states[v]) S.add(v); }
      for (const el of r.querySelectorAll('*')) if (el.shadowRoot && /^(HG|NUVIO)-/.test(el.tagName)) walk(el.shadowRoot, d + 1); };
    walk(this.shadowRoot, 0);
    for (const sc of Object.keys(HGL.data.s)) for (const x of HGL.get(sc).added) if (sc === this._eSc) S.add(x.e);
    return S;
  },
  _eSheetList() {
    const L = this._eSheetEl; if (!L) return; const lst = L.querySelector('.hs-l'); if (!lst) return;
    for (const b of L.querySelectorAll('[data-hge=filter]')) b.setAttribute('aria-pressed', b.dataset.f === this._eF);
    const h = this._hass, sc = this._eSc, q = (this._eQ || '').trim().toLowerCase();
    if (sc === 'rooms' && !this._eRepl) {
      const ac = (this._cards || []).map((c) => c._config && c._config.areas).find(Boolean) || {}; const m = HGAreas.model(h, ac);
      const shown = new Set([...m.rooms.map((a) => a.id), ...HGL.get('rooms').added.map((x) => x.e)]); const hid = new Set(HGL.get('rooms').hidden);
      const list = m.list.filter((a) => a.id !== '_none' && (!shown.has(a.id) || hid.has(a.id)) && (!q || hgNorm(a.name).includes(hgNorm(q))));
      lst.innerHTML = list.length ? list.map((a) => `<button class="hs-r" role="listitem" data-hge="pick" data-sc="rooms" data-e="${H.esc(a.id)}" data-n="${H.esc(a.name)}"><span class="hs-i">${H.icon(a.icon)}</span><span class="hs-t"><b>${H.esc(a.name)}</b><small>${hgT('edit.entities_count', { count: a.ents.length })}${hid.has(a.id) ? hgT('common.hidden_suffix') : ''}</small></span><span class="hs-p">${H.icon('mdi:plus')}</span></button>`).join('') : `<p class="hs-e">${hgT('edit.all_areas_are_already')}</p>`;
      return;
    }
    const shown = this._eShown(), f = this._eF, reg = h.entities || {}, areas = h.areas || {}, devs = h.devices || {};
    const skip = new Set(['zone', 'sun', 'persistent_notification', 'update', 'tts', 'stt', 'conversation', 'event', 'image', 'device_tracker', 'group', 'input_text', 'input_datetime', 'todo', 'calendar', 'weather', 'wake_word', 'assist_satellite', 'select', 'number', 'text', 'time', 'date', 'datetime', 'notify', 'ai_task']);
    const arr = [];
    for (const e of Object.keys(h.states)) {
      const d = e.split('.')[0]; if ((skip.has(d) && !(this._eRepl && this._eRepl.doms && this._eRepl.doms.includes(d))) || (!this._eRepl && shown.has(e))) continue;   /* slot komponentu prosi o tę domenę (np. kalendarze) -> nie pomijamy */ if (this._eRepl && ((this._eRepl.doms && !this._eRepl.doms.includes(d)) || (this._eRepl.excl && this._eRepl.excl.includes(e)) || (this._eRepl.flt && !this._eRepl.flt(e)))) continue;
      const r = reg[e]; if (r && (r.hidden || r.entity_category)) continue;
      const k = HG_TILE_KIND(e);
      if (f !== 'all' && !(f === 'light' ? d === 'light' : f === 'tog' ? k === 'tog' && d !== 'light' : f === k)) continue;
      const s = h.states[e], nm = H.name(h, e), aid = r && (r.area_id || (r.device_id && devs[r.device_id] && devs[r.device_id].area_id)), an = aid && areas[aid] ? areas[aid].name : '';
      if (q && !(hgNorm(nm).includes(hgNorm(q)) || e.includes(q) || hgNorm(an).includes(hgNorm(q)))) continue;
      arr.push({ e, nm, an, k, s });
    }
    const coll = new Intl.Collator(HG_LOC()); arr.sort((a, b) => coll.compare(a.nm, b.nm));
    const sh = arr; this._eArr = arr;
    const pv = L.querySelector('.hs-pv'); if (pv) { const fx = this._eF === 'all' ? null : this._eF;
      pv.innerHTML = sh.length ? `<small>${hgT('edit.preview')}${fx ? ' · ' + H.esc(fx === 'light' ? hgT('edit.light') : (HG_KIND_LBL[fx] || '')) : ''}</small><div class="tg2">${hgTileHtml(h, sh[0].e)}</div>` : ''; hgSlots({ _hass: h, $: pv }); hgPvLive(pv); }
    const row = (x) => `<button class="hs-r" role="listitem" data-hge="${this._eRepl ? 'repl' : 'pick'}" data-sc="${H.esc(sc)}" data-e="${H.esc(x.e)}" data-n="${H.esc(x.nm)}"><span class="hs-i">${H.icon(x.s.attributes.icon || HG_DOM_ICON2[x.e.split('.')[0]] || 'mdi:circle-outline')}</span><span class="hs-t"><b>${H.esc(x.nm)}</b><small>${H.esc([HG_KIND_LBL[x.k], x.an, this._eRepl && shown.has(x.e) ? hgT('edit.already_in_view') : '', H.ok(x.s) ? H.T(h, x.s) : hgT('common.state_unavailable')].filter(Boolean).join(' · '))}</small></span><span class="hs-p">${H.icon(this._eRepl && !this._eRepl.badge ? 'mdi:swap-horizontal' : 'mdi:plus')}</span></button>`;
    /* leniwe renderowanie: porcje po 60, kolejne przy przewijaniu (bez limitu) */
    if (this._eIO) this._eIO.disconnect();
    if (!sh.length) { lst.innerHTML = `<p class="hs-e">${this._eRepl ? hgT('edit.no_matching_entities') : hgT('edit.no_matching_entities_those')}</p>`; return; }
    let n = 0; lst.innerHTML = `<small class="hs-cnt">${hgT('edit.entities_count', { count: sh.length })}</small>`;
    const more = () => { const st = lst.querySelector('.hs-more'); st && st.remove(); lst.insertAdjacentHTML('beforeend', sh.slice(n, n + 60).map(row).join('')); n += 60;
      if (n < sh.length) { lst.insertAdjacentHTML('beforeend', '<i class="hs-more" aria-hidden="true"></i>'); this._eIO.observe(lst.querySelector('.hs-more')); } };
    this._eIO = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) more(); }, { root: lst, rootMargin: '300px' });
    more();
  },
};
/* the editor arrived late (perf/editor-split): its methods join the page now, and the dashboard rebuilds so the edit controls appear */
/* the editor is a separate chunk (perf/editor-split): the page rebuilds when it arrives, so edit buttons appear without a reload */
document.dispatchEvent(new CustomEvent('hg-edit-ready', { bubbles: true, composed: true }));
