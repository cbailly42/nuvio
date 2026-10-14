/* --- zegar --- */
class HGClockCard extends HGBase {
  defaults() { return { title: null, seconds: false, date: true, hour12: false }; }
  ents() { return []; }
  css() { return HG_G14_CSS + U(`ha-card.glass{ justify-content:center; align-items:flex-start; } .tm{ font-size:clamp(34px, 22cqi, 96px); font-weight:300; letter-spacing:-.04em; line-height:1; font-variant-numeric:tabular-nums; } .tm small{ font-size:.38em; opacity:.6; margin-left:4px; letter-spacing:0; } .dt{ font-size:14px; opacity:.75; text-transform:capitalize; } .tt{ font-size:12px; opacity:.6; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }`); }
  connectedCallback() { super.connectedCallback(); clearInterval(this._ti); this._ti = setInterval(() => this.rerender(), this._config && this._config.seconds ? 1000 : 15000); }
  disconnectedCallback() { clearInterval(this._ti); }
  render() { const c = this._config, d = new Date(), loc = HG_LOC();
    const t = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: !!c.hour12 }), s = String(d.getSeconds()).padStart(2, '0');
    return `<ha-card class="glass">${c.title ? `<span class="tt">${H.esc(c.title)}</span>` : ''}<span class="tm" role="timer" aria-live="off">${H.esc(t)}${c.seconds ? `<small>${s}</small>` : ''}</span>${c.date !== false ? `<span class="dt">${H.esc(d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' }))}</span>` : ''}</ha-card>`; }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-clock-card', HGClockCard, hgTr('Home Glass – Zegar', 'Home Glass – Clock'), hgTr('Godzina i data', 'Time and date'));
