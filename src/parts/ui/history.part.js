/* ===== ui/history: wspólna pamięć historii czujników. Kilka kart z tym samym czujnikiem i okresem pyta HA raz;
   wynik żyje 5 minut, równoległe pytania czekają na to samo zapytanie. hgHistory(hass, 'sensor.x', 24) -> Promise([{ t, v }]) ===== */
const hgHistory = (() => {
  const C = window.__hgHistC || (window.__hgHistC = new Map()), TTL = 5 * 60e3;
  return (h, e, hours = 24) => {
    if (!h || !h.callWS || !e) return Promise.resolve([]);
    const k = e + '|' + hours, c = C.get(k); if (c && Date.now() - c.at < TTL) return c.p;
    const p = h.callWS({ type: 'history/history_during_period', start_time: new Date(Date.now() - hours * 3600e3).toISOString(), entity_ids: [e], minimal_response: true, no_attributes: true, significant_changes_only: false })
      .then((r) => ((r && r[e]) || []).map((x) => ({ t: (x.lu || x.lc || 0) * 1000 || Date.parse(x.last_changed || x.last_updated), v: parseFloat(x.s ?? x.state) })).filter((x) => isFinite(x.v)))
      .catch(() => { C.delete(k); return []; });
    C.set(k, { at: Date.now(), p }); return p;
  };
})();
/* równe przedziały czasu (średnia), żeby wykres miał stałą liczbę punktów niezależnie od częstości zmian czujnika */
const hgBuckets = (pts, hours, n = 48) => { const t1 = Date.now(), t0 = t1 - hours * 3600e3, w = (t1 - t0) / n, out = new Array(n).fill(null), sum = new Array(n).fill(0), cnt = new Array(n).fill(0);
  let last = null; for (const p of pts) { if (p.t < t0) { last = p.v; continue; } const i = Math.min(n - 1, Math.floor((p.t - t0) / w)); sum[i] += p.v; cnt[i]++; }
  for (let i = 0; i < n; i++) { if (cnt[i]) last = sum[i] / cnt[i]; out[i] = last; } return out.map((v) => (v == null ? NaN : v)); };
