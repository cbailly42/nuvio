/* ===================== LISTA ZADAŃ: pozycje z encji todo, dodawanie i odhaczanie ===================== */
class HGTodoCard extends HGBase {
  static getStubConfig(h) { return { entity: hgStub(h, ['todo']) || null }; }
  defaults() { return { entity: null, name: null, show_done: 3 }; }
  css() { return HG_NV_CSS + U(`
.add{ display:flex; gap:var(--s1); } .add input{ flex:1; min-width:0; height:36u; border:0; border-radius:var(--hg-radius-pill, 999px); padding:0 14u; font:inherit; font-size:var(--fs-sm); color:inherit; background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi); outline:none; }
.add input:focus-visible{ box-shadow:0 0 0 2px var(--hg-accent); } .add input::placeholder{ color:inherit; opacity:.5; }
.ls{ display:flex; flex-direction:column; overflow:auto; min-height:0; flex:1; margin:0 calc(var(--s1) * -1); }
.it{ display:flex; align-items:center; gap:var(--s1); min-height:40u; padding:0 var(--s1); border-radius:var(--r-sm); text-align:left; font-size:var(--fs-sm); animation: nvTd var(--hg-t-base) var(--hg-ease-out) both; }
@media (hover:hover){ .it:hover{ background:var(--hg-inner-bg); } }
.ck{ width:20px; height:20px; border-radius:50%; flex:none; box-shadow: inset 0 0 0 1.5px currentColor; opacity:.5; display:grid; place-items:center; transition: background var(--hg-t-base), opacity var(--hg-t-base), box-shadow var(--hg-t-base); }
.ck ha-icon{ width:14px; height:14px; opacity:0; transition: opacity var(--hg-t-fast); }
.done .ck{ background:var(--hg-accent); color:var(--hg-on-accent); box-shadow:none; opacity:1; } .done .ck ha-icon{ opacity:1; } .done span{ text-decoration:line-through; opacity:.5; }
.sec{ font-size:var(--fs-xs); opacity:.5; padding:6u var(--s1) 2u; }
@keyframes nvTd{ from{ opacity:0; transform: translateY(4px); } } @media (prefers-reduced-motion: reduce){ .it{ animation:none; } }
`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><span class="nv-empty">${hgT('cards.todo.choose_a_to_do')}</span></ha-card>`;
    this._load(); const L = this._items || [], open = L.filter((x) => x.status !== 'completed'), done = L.filter((x) => x.status === 'completed').slice(0, +c.show_done || 0);
    const row = (x) => `<button class="it ${x.status === 'completed' ? 'done' : ''}" data-act="tick" data-uid="${H.esc(x.uid)}" data-key="td-${H.esc(x.uid)}" role="checkbox" aria-checked="${x.status === 'completed'}"><span class="ck">${H.icon('mdi:check')}</span><span>${H.esc(x.summary)}</span></button>`;
    return `<ha-card class="glass">${hgUI.header(c.name || H.name(h, c.entity), { sub: this._items ? String(open.length) : '' })}
      <form class="add"><input name="t" placeholder="${hgT('cards.todo.add_a_task')}" aria-label="${hgT('cards.todo.new_task')}" autocomplete="off" enterkeyhint="done">${hgUI.iconBtn('mdi:plus', 'add', hgT('common.add'))}</form>
      <div class="ls">${!this._items ? `<span class="nv-empty">${hgT('common.loading')}</span>` : !L.length ? `<span class="nv-empty">${hgT('cards.todo.nothing_to_do')}</span>` : open.map(row).join('') + (done.length ? `<div class="sec">${hgT('cards.todo.done')}</div>` + done.map(row).join('') : '')}</div></ha-card>`; }
  /* lista z WebSocket todo/item/list; ponownie po każdej zmianie stanu encji (stan = liczba otwartych) */
  _load() { const c = this._config, s = H.st(this._hass, c.entity), k = s ? s.last_updated + c.entity : ''; if (this._lk === k) return; this._lk = k;
    if (!this._hass.callWS) return; this._hass.callWS({ type: 'todo/item/list', entity_id: c.entity }).then((r) => { this._items = (r && r.items) || []; this.rerender(); }).catch(() => { this._items = []; this.rerender(); }); }
  afterRender() { const f = this.$.querySelector('form.add'); if (f && this._once(f)) f.addEventListener('submit', (e) => { e.preventDefault(); this._add(); }); }
  _add() { const i = this.$.querySelector('form.add input'), t = i && i.value.trim(); if (!t) return; i.value = '';
    (this._items = this._items || []).unshift({ uid: 'tmp' + Date.now(), summary: t, status: 'needs_action' }); this.rerender(); H.call(this._hass, 'todo', 'add_item', { entity_id: this._config.entity, item: t }); }
  onAct(a, t) { if (a === 'add') return this._add(); if (a !== 'tick') return; const x = (this._items || []).find((y) => y.uid === t.dataset.uid); if (!x || x.uid.startsWith('tmp')) return;
    x.status = x.status === 'completed' ? 'needs_action' : 'completed'; H.haptic(); this.rerender(); H.call(this._hass, 'todo', 'update_item', { entity_id: this._config.entity, item: x.uid, status: x.status }); }
  getGridOptions() { return { columns: 6, rows: 4 }; }
}
hgReg('hg-todo-card', HGTodoCard, hgTLazy('cards.todo.picker_name'), hgTLazy('cards.todo.picker_description'));
