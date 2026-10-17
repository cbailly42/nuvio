/* shared/livekid: dane dziecka z integracji LiveKid. Wykrywanie po platformie w rejestrze encji
   (hass.entities[e].platform + translation_key), bez wpisanych na sztywno identyfikatorów; bez rejestru po kształcie atrybutów.
   Używają go karta Dziecko i panel dziecka na wygaszaczu (Ustawienia → Tryb tabletu ściennego → LiveKid). */
const HGLiveKid = {
  PLATFORM: 'livekid',
  /* klucze tłumaczeń encji integracji -> rola w karcie */
  KEYS: ['present', 'last_check_in', 'last_check_out', 'meals_today', 'today_plan', 'unread_feed', 'bill_to_pay', 'bill_due_date', 'calendar'],
  _sig(st) { const a = (st && st.attributes) || {}; return a; },
  /* zgadywanie bez rejestru: binary_sensor z atrybutami planned_absence + not_scheduled_reason to "w placówce", reszta po atrybutach */
  _guess(h) { const S = h.states || {}, ids = {};
    for (const [e, s] of Object.entries(S)) { const a = this._sig(s);
      if (e.startsWith('binary_sensor.') && 'planned_absence' in a && 'not_scheduled_reason' in a) ids.present = ids.present || e;
      else if (e.startsWith('sensor.') && 'meal_plan' in a && 'scheduled' in a) ids.meals_today = ids.meals_today || e;
      else if (e.startsWith('sensor.') && Array.isArray(a.activities) && 'date' in a) ids.today_plan = ids.today_plan || e;
      else if (e.startsWith('sensor.') && 'to_pay_by_category' in a) ids.bill_to_pay = ids.bill_to_pay || e;
      else if (e.startsWith('sensor.') && 'checked_items' in a && Array.isArray(a.items)) ids.unread_feed = ids.unread_feed || e; }
    return ids.present ? [{ dev: '', ids }] : []; },
  groups(h) { if (!h || !h.states) return [];
    const R = h.entities || {}, by = new Map();
    for (const [e, r] of Object.entries(R)) { if (!r || r.platform !== this.PLATFORM || !h.states[e] || !this.KEYS.includes(r.translation_key)) continue;
      const d = r.device_id || ''; if (!by.has(d)) by.set(d, { dev: d, ids: {} }); by.get(d).ids[r.translation_key] = e; }
    const L = [...by.values()].filter((g) => g.ids.present);
    return L.length ? L : this._guess(h); },
  has(h) { return this.groups(h).length > 0; },
  /* imię: nazwa urządzenia (jedno urządzenie na dziecko), inaczej wspólny początek nazw encji */
  name(h, g) { const D = (h.devices || {})[g.dev]; if (D && (D.name_by_user || D.name)) return D.name_by_user || D.name;
    const N = Object.values(g.ids).map((e) => String(((h.states[e] || {}).attributes || {}).friendly_name || '')).filter(Boolean);
    if (N.length < 2) return N[0] || '';
    let p = N[0]; for (const n of N) while (p && !n.startsWith(p)) p = p.slice(0, -1);
    return p.trim() || N[0]; },
  _st(h, e) { const s = e && h.states[e]; return s && s.state !== 'unavailable' && s.state !== 'unknown' ? s : null; },
  _tf(h) { const l = h && h.locale ? h.locale.time_format : null; return l === '12' ? { hour12: true } : l === '24' ? { hour12: false } : {}; },
  /* godzina z czujnika timestamp: dziś tylko HH:MM, inny dzień z krótką datą */
  when(h, iso) { const d = new Date(iso); if (isNaN(d)) return ''; const t = new Intl.DateTimeFormat(HG_LOC(), Object.assign({ hour: '2-digit', minute: '2-digit' }, this._tf(h))).format(d);
    return d.toDateString() === new Date().toDateString() ? t : new Intl.DateTimeFormat(HG_LOC(), { weekday: 'short', day: 'numeric', month: 'numeric' }).format(d) + ', ' + t; },
  hhmm(h, v) { if (!v || !/^\d{1,2}:\d{2}$/.test(v)) return ''; const [a, b] = v.split(':').map(Number), d = new Date(); d.setHours(a, b, 0, 0);
    return new Intl.DateTimeFormat(HG_LOC(), Object.assign({ hour: '2-digit', minute: '2-digit' }, this._tf(h))).format(d); },
  money(v, unit) { const n = parseFloat(v); if (!isFinite(n)) return ''; try { return n.toLocaleString(HG_LOC(), { style: 'currency', currency: unit && /^[A-Z]{3}$/.test(unit) ? unit : 'PLN' }); } catch (e) { return n.toFixed(2) + ' ' + (unit || ''); } },
  /* wszystko, czego potrzebują karta i wygaszacz, dla jednego dziecka */
  read(h, g) { const I = g.ids, p = this._st(h, I.present), pa = (p && p.attributes) || {}, ci = this._st(h, I.last_check_in), co = this._st(h, I.last_check_out);
    const me = this._st(h, I.meals_today), pl = this._st(h, I.today_plan), un = this._st(h, I.unread_feed), bi = this._st(h, I.bill_to_pay), bd = this._st(h, I.bill_due_date), ba = (bi && bi.attributes) || {};
    return { g, ids: I, name: this.name(h, g), present: !!p && p.state === 'on', ok: !!p,
      scheduled: pa.scheduled_today !== false, reason: pa.not_scheduled_reason || null,
      inToday: this.hhmm(h, pa.check_in), outToday: this.hhmm(h, pa.check_out),
      lastIn: ci ? this.when(h, ci.state) : '', lastOut: co ? this.when(h, co.state) : '',
      meals: me ? me.state : '', mealsOn: !!me && (me.attributes || {}).scheduled !== false,
      plan: pl && Array.isArray((pl.attributes || {}).activities) ? pl.attributes.activities : [],
      unread: un && isFinite(parseFloat(un.state)) ? parseInt(un.state, 10) : null,
      bill: bi ? this.money(bi.state, ba.unit_of_measurement) : '', billNum: bi ? parseFloat(bi.state) : NaN, overdue: ba.overdue === true,
      due: bd && /^\d{4}-\d{2}-\d{2}$/.test(bd.state) ? new Intl.DateTimeFormat(HG_LOC(), { day: 'numeric', month: 'numeric' }).format(new Date(bd.state + 'T12:00:00')) : '' }; },
  kids(h) { return this.groups(h).map((g) => this.read(h, g)); },
};
window.HGLiveKid = HGLiveKid;
