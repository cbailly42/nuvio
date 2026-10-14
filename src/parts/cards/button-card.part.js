class HGButtonCard extends HGBase {
  defaults() { return { entity: null, name: null, icon: null, mode: 'tile', tap_action: null, subtitle: null }; }
  ents() { return this._config.entity ? [this._config.entity] : []; }
  _extraSig() { return [this._ok ? 1 : 0]; }
  css() { return HG_GEN_CSS + U(`
ha-card.glass{ padding:0; }
.gbig{ all:unset; cursor:pointer; box-sizing:border-box; width:100%; height:100%; display:flex; flex-direction:column; align-items:flex-start; justify-content:space-between; gap:12px; padding:16px; transition:transform 150ms; }
.gbig:disabled{ cursor:default; } .gbig .gic{ width:48px; height:48px; border-radius:var(--r-md); } .gbig .gic ha-icon{ width:26px; height:26px; --mdc-icon-size:26px; }
.pill .gbig{ flex-direction:row; align-items:center; justify-content:flex-start; padding:12px 16px; } .pill .gbig .gic{ width:40px; height:40px; border-radius:12px; }
.ok .gic{ background:var(--hg-accent); color:var(--hg-on-accent); } .ok .gic ha-icon{ animation:gpop .4s cubic-bezier(.2,.8,.2,1.3); } @keyframes gpop{ from{ transform:scale(.4); opacity:0 } }
.ok .gn small{ color:var(--hg-accent-tx, var(--hg-accent)); opacity:1; } .pill .chev{ margin-left:auto; opacity:.5; width:20px; height:20px; }
`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity), d = hgDom(c.entity), nm = c.name || (c.entity ? H.name(h, c.entity) : hgTr('Przycisk', 'Button'));
    if (!c.entity && !c.tap_action) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Wybierz encję lub akcję', 'Choose an entity or action')}</b>${hgTr('Skrypt, scena, przycisk albo tap_action', 'Script, scene, button or tap_action')}</div></ha-card>`;
    const un = c.entity && (!s || s.state === 'unavailable' || (!H.ok(s) && !HG_PRESS_DOM.includes(d))) && !c.tap_action, on = s && ['on', 'unlocked', 'open'].includes(s.state) && !HG_PRESS_DOM.includes(d), ok = this._ok;
    const sub = un ? hgTr('niedostępne', 'unavailable') : ok ? hgTr('Wykonano', 'Done') : c.subtitle || (HG_PRESS_DOM.includes(d) || c.tap_action ? hgTr('Dotknij, aby uruchomić', 'Tap to run') : H.t(h, s));
    const ic = ok ? 'mdi:check' : c.icon || (s && s.attributes.icon) || HG_DOM_ICON2[d] || 'mdi:gesture-tap-button';
    return `<ha-card class="glass ${c.mode === 'pill' ? 'pill' : ''} ${ok ? 'ok' : ''} ${un ? 'un' : ''}"><button class="gbig" data-act="press" ${un ? 'disabled' : ''} aria-label="${H.esc(nm)}: ${H.esc(sub)}">
      <span class="gic ${on ? 'on' : ''}">${H.icon(ic)}</span><span class="gn"><b>${H.esc(nm)}</b><small>${H.esc(sub)}</small></span>${c.mode === 'pill' ? H.icon('mdi:chevron-right', 'chev') : ''}</button></ha-card>`; }
  onAct(a) { if (a !== 'press') return; const c = this._config; hgPress(this, this._hass, c.entity, c.tap_action); this._ok = true; this.rerender(); clearTimeout(this._ot); this._ot = setTimeout(() => { this._ok = false; this.rerender(); }, 1600); }
  getGridOptions() { return { columns: 3, rows: 2 }; }
}
hgReg('hg-button-card', HGButtonCard, hgTr('Home Glass – Przycisk', 'Home Glass – Button'), hgTr('Przycisk dla skryptu, sceny, button.press lub dowolnej akcji', 'Button for a script, scene, button.press or any action'));
