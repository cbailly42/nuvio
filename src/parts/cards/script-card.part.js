/* hg-script-card: kafel uruchamiający skrypt. Tap -> script.turn_on (w tle), fala (ripple) od miejsca dotyku, potem ✓;
   gdy skrypt działa (stan „on”) – obracający się pierścień, „Działa…”, przycisk zablokowany. */
class HGScriptCard extends HGBase {
  defaults() { return { name: null, icon: null, subtitle: hgTr('Dotknij, aby uruchomić', 'Tap to run'), color: 'var(--hg-accent)' }; }
  _extraSig() { return [this._ok ? 1 : 0]; }
  css() {
    return U(`
ha-card.glass{ padding:0; }
.b{ position:relative; width:100%; height:100%; display:flex; flex-direction:column; align-items:flex-start; justify-content:space-between; gap:var(--s1); padding:var(--s2) var(--s2); text-align:left; overflow:hidden; border-radius:inherit; }
.b[disabled]{ cursor:default; }
.ic{ position:relative; width:34u; height:34u; border-radius:var(--r-sm); display:flex; align-items:center; justify-content:center; background:#fff; color:var(--c); box-shadow:var(--hg-sh); transition:background .3s, color .3s; }
.ic ha-icon{ width:18u; height:18u; transition:transform .3s cubic-bezier(.2,.8,.2,1), opacity .2s; }
.run .ic{ background:var(--c); color:#fff; }
.run .ic::after{ content:''; position:absolute; inset:-4u; border-radius:var(--r-md); border:2u solid transparent; border-top-color:var(--c); border-right-color:var(--c); animation:var(--hg-loop, hgspin 1s linear infinite); }
.ok .ic{ background:var(--hg-accent); color:var(--hg-on-accent); } .ok .ic ha-icon{ animation:hgpop .45s cubic-bezier(.2,.8,.2,1.4); }
@keyframes hgpop{ 0%{ transform:scale(.3); opacity:0 } 100%{ transform:scale(1); opacity:1 } }
.tx b{ display:block; font-size:var(--fs-md); font-weight:600; letter-spacing:-.01em; }
.tx span{ display:block; font-size:var(--fs-xs); color:#5A5E64; margin-top:2u; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.run .tx span{ color:var(--c); font-weight:400; } .ok .tx span{ color:var(--hg-accent-tx); font-weight:400; }
.rp{ position:absolute; width:20u; height:20u; margin:-10u 0 0 -10u; border-radius:50%; background:var(--c); opacity:.35; pointer-events:none; transform:scale(0); animation:hgrip .6s cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes hgrip{ to{ transform:scale(18); opacity:0 } }
.un{ opacity:.55; }
`);
  }
  render() {
    const c = this._config, s = H.st(this._hass, c.entity);
    const un = !H.ok(s), run = s && s.state === 'on', ok = this._ok && !run;
    const nm = c.name || (s && s.attributes.friendly_name) || c.entity;
    const ic = ok ? 'mdi:check' : c.icon || (s && s.attributes.icon) || 'mdi:script-text-play-outline';
    const sub = un ? hgTr('Skrypt niedostępny', 'Script unavailable') : run ? hgTr('Działa…', 'Running…') : ok ? hgTr('Uruchomiono', 'Started') : c.subtitle;
    return `<ha-card class="glass ${run ? 'run' : ''} ${ok ? 'ok' : ''} ${un ? 'un' : ''}" style="--c:${c.color}">
      <button class="b" data-act="run" ${un || run ? 'disabled' : ''} aria-label="${H.esc(nm)}: ${H.esc(sub)}" aria-busy="${!!run}">
        <span class="ic">${H.icon(ic)}</span><span class="tx"><b>${H.esc(nm)}</b><span>${H.esc(sub)}</span></span></button></ha-card>`;
  }
  onAct(a, t, e) {
    if (a !== 'run') return;
    const r = t.getBoundingClientRect(), x = (e && e.clientX ? e.clientX : r.left + r.width / 2) - r.left, y = (e && e.clientY ? e.clientY : r.top + r.height / 2) - r.top;
    const rp = document.createElement('i'); rp.className = 'rp'; rp.style.left = x + 'px'; rp.style.top = y + 'px'; t.appendChild(rp); setTimeout(() => rp.remove(), 650);
    H.call(this._hass, 'script', 'turn_on', { entity_id: this._config.entity });
    clearTimeout(this._okT);
    setTimeout(() => { this._ok = true; this.rerender(); this._okT = setTimeout(() => { this._ok = false; this.rerender(); }, 2200); }, 280);
  }
  getGridOptions() { return { columns: 3, rows: 2 }; }
}
hgReg('hg-script-card', HGScriptCard, hgTr('Home Glass – Skrypt', 'Home Glass – Script'), hgTr('Kafel uruchamiający skrypt z animacją potwierdzenia', 'Tile that runs a script with a confirmation animation'));
