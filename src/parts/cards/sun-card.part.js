/* --- słońce: wschód i zachód --- */
class HGSunCard extends HGBase {
  defaults() { return { entity: 'sun.sun', title: null }; }
  css() { return HG_G14_CSS + U(`.arc{ position:relative; height:70px; } .arc svg{ width:100%; height:100%; overflow:visible; } .arc .b{ fill:none; stroke:color-mix(in srgb, currentColor 18%, transparent); stroke-width:2; stroke-dasharray:4 5; } .arc .d{ fill:var(--hg-accent); }
.tt{ display:flex; justify-content:space-between; gap:8px; font-size:13px; } .tt span{ display:inline-flex; align-items:center; gap:6px; } .tt ha-icon{ width:18px; height:18px; opacity:.8; } .tt b{ font-variant-numeric:tabular-nums; }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity || 'sun.sun');
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Brak encji sun.sun', 'No sun.sun entity')}</b>${hgTr('Włącz integrację Słońce w HA', 'Enable the Sun integration in HA')}</div></ha-card>`;
    const a = s.attributes, f = (x) => (x ? new Date(x).toLocaleTimeString(HG_LOC(), { hour: '2-digit', minute: '2-digit' }) : '–'), up = s.state === 'above_horizon';
    const r0 = Date.parse(a.next_rising), s0 = Date.parse(a.next_setting), now = Date.now(); let p = 0.5; if (up && isFinite(s0)) { const len = 12 * 3600e3; p = Math.max(0, Math.min(1, 1 - (s0 - now) / len)); }
    const x = 10 + p * 180, y = 60 - Math.sin(p * Math.PI) * 50;
    return `<ha-card class="glass">${hgHead(up ? 'mdi:white-balance-sunny' : 'mdi:weather-night', c.title || hgTr('Słońce', 'Sun'), up ? hgTr('Nad horyzontem', 'Above the horizon') : hgTr('Pod horyzontem', 'Below the horizon'), up)}
      <div class="arc hide-xs"><svg viewBox="0 0 200 70" aria-hidden="true"><path class="b" d="M10 60 Q100 -40 190 60"/>${up ? `<circle class="d" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"/>` : ''}</svg></div>
      <div class="tt"><span>${H.icon('mdi:weather-sunset-up')}<b>${f(a.next_rising)}</b></span><span>${H.icon('mdi:weather-sunset-down')}<b>${f(a.next_setting)}</b></span></div></ha-card>`; }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-sun-card', HGSunCard, hgTr('Home Glass – Słońce', 'Home Glass – Sun'), hgTr('Wschód i zachód słońca', 'Sunrise and sunset'));
