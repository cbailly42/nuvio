/* shared/weather: Pogoda: nazwy warunków i subskrypcja prognozy (karta pogody i wygaszacz). */
/* ===================== POGODA NA ZEWNĄTRZ ===================== */
/* Źródło: weather.<x> (stan + atrybuty), prognoza godzinowa i dzienna przez WS weather/subscribe_forecast (jedna subskrypcja na typ,
   współdzielona przez wszystkie instancje karty), temperatura „teraz” z fizycznego czujnika zewnętrznego (CFG temp_sensor), słońce z sun.sun.
   Ikony: Meteocons (basmilius/weather-icons, MIT) hostowane lokalnie; animowana tylko duża ikona, w lite / reduced-motion wersja statyczna. */
/* ikony wg stanu pogody HA: [dzień, noc]; nazwy warunków w katalogu: weather.condition.<stan> (łączniki jako _), czytane przez HGWx.cn() */
const HG_WX_COND = {
  'clear-night': ['clear-night', 'clear-night'], sunny: ['clear-day', 'clear-night'], partlycloudy: ['partly-cloudy-day', 'partly-cloudy-night'],
  cloudy: ['cloudy', 'cloudy'], fog: ['fog-day', 'fog-night'], rainy: ['rain', 'rain'],
  pouring: ['extreme-rain', 'extreme-rain'], snowy: ['snow', 'snow'], 'snowy-rainy': ['sleet', 'sleet'],
  hail: ['hail', 'hail'], lightning: ['thunderstorms', 'thunderstorms'], 'lightning-rainy': ['thunderstorms-rain', 'thunderstorms-rain'],
  windy: ['wind', 'wind'], 'windy-variant': ['wind', 'wind'], exceptional: ['not-available', 'not-available'],
};
const HGWx = {
  subs: new Map(),   // key entity|type -> { data, cbs:Set, unsub, pending }
  sub(hass, entity, type, cb) {
    const k = entity + '|' + type; let s = this.subs.get(k);
    if (!s) {
      s = { data: null, cbs: new Set(), unsub: null };
      this.subs.set(k, s);
      try {
        s.pending = hass.connection.subscribeMessage((m) => { s.data = (m && m.forecast) || []; for (const f of s.cbs) f(s.data); }, { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: entity });
        s.pending.then((u) => { s.unsub = u; if (!s.cbs.size) { u(); this.subs.delete(k); } }, () => { this.subs.delete(k); });
      } catch (e) { this.subs.delete(k); }
    }
    s.cbs.add(cb); if (s.data) cb(s.data);
    return () => { s.cbs.delete(cb); if (!s.cbs.size && s.unsub) { s.unsub(); this.subs.delete(k); } };
  },
  cn: (k) => (HG_WX_COND[k] ? hgTD('weather.condition.' + k.replace(/-/g, '_'), k) : k),
  still: () => (typeof hgLite === 'function' && hgLite()) || HGPerf.eco() || matchMedia('(prefers-reduced-motion: reduce)').matches,
  icon(cfg, cond, night, anim) {
    const d = HG_WX_COND[cond] || HG_WX_COND.exceptional, f = night ? d[1] : d[0];
    return `${cfg.icon_base}${anim && !this.still() ? '' : 'static-'}${f}.svg?v=${cfg.icon_v}`;
  },
  // kolor temperatury: zimno (niebieski) -> ciepło (pomarańcz)
  tcol(t) {
    const st = [[-10, [76, 130, 230]], [0, [90, 170, 235]], [10, [96, 196, 160]], [18, [245, 196, 70]], [26, [245, 130, 50]], [34, [230, 70, 60]]];
    if (t <= st[0][0]) return `rgb(${st[0][1]})`; if (t >= st[st.length - 1][0]) return `rgb(${st[st.length - 1][1]})`;
    for (let i = 1; i < st.length; i++) if (t <= st[i][0]) { const [a, ca] = st[i - 1], [b, cb] = st[i], k = (t - a) / (b - a); return `rgb(${ca.map((v, j) => Math.round(v + (cb[j] - v) * k)).join(',')})`; }
  },
  hm: (d) => d.toLocaleTimeString(HG_LOC(), { hour: '2-digit', minute: '2-digit' }),
};
