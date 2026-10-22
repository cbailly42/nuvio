/* shared/climate-modes: Tryby HVAC (kolory, ikony, nazwy) dla karty klimatyzacji i pokoi. */
/* ===================== KLIMATYZACJA ===================== */
/* stan widoczny od razu, bez zmiany powierzchni szkła: mała pełna kropka trybu z ikoną (subtelna animacja), aktywny chip,
   podświetlenie łuku i tekst „Chłodzi · 21°”. Wyłączona: wszystko szare i przygaszone. Dotknięcie: stan od razu (optymistycznie),
   potwierdzenie z HA (albo powrót po 8 s, gdy HA nie potwierdzi). */
const HG_AC_MODE = {
  /* c: wypełnienie aktywnego przycisku trybu, on: ikona/tekst na nim, t: token koloru tekstu statusu (kontrast w obu schematach) */
  cool: { c: 'var(--hg-accent)', on: 'var(--hg-accent-tx)', i: 'mdi:snowflake', t: 'cool', get l() { return hgT('common.cooling'); } }, heat: { c: 'var(--hg-accent)', on: '#1E2023', i: 'mdi:fire', t: 'heat', get l() { return hgT('common.heating'); } },
  dry: { c: '#A3A9B1', on: '#1E2023', i: 'mdi:water-percent', t: 'neu', get l() { return hgT('shared.climate_modes.drying'); } }, fan_only: { c: '#A3A9B1', on: '#1E2023', i: 'mdi:fan', t: 'neu', get l() { return hgT('shared.climate_modes.fan_only'); } },
  heat_cool: { c: 'var(--hg-accent)', on: 'var(--hg-accent-tx)', i: 'mdi:thermostat-auto', t: 'auto', l: 'Auto' }, auto: { c: 'var(--hg-accent)', on: 'var(--hg-accent-tx)', i: 'mdi:thermostat-auto', t: 'auto', l: 'Auto' },
  off: { c: '#C4C8CE', on: '#5A5E64', i: 'mdi:power', t: 'neu', get l() { return hgT('common.off_fem'); } },
};
/* stan „pracuje / nie pracuje” z encji włącz/wyłącz (czujnik spalania, przełącznik) albo liczbowej (moc palnika, %):
   true / false; null gdy brak, niedostępna albo stan tekstowy (tekstu nie zgadujemy) */
const hgOnState = (s) => {
  if (!s) return null;
  if (s.state === 'on') return true; if (s.state === 'off') return false;
  const n = Number(s.state); return s.state !== '' && isFinite(n) ? n > 0 : null;
};
/* co urządzenie klimatu naprawdę robi: 'heat' | 'cool' | 'dry' | 'fan_only' | 'idle', null gdy wyłączone.
   Kolejność: encja „stan rzeczywisty” z ustawień pokoju (np. stan pieca) > hvac_action > temperatura względem nastawy
   (grzanie przy temperaturze ≥ nastawie, chłodzenie przy ≤ nastawie -> bezczynne) > sam tryb */
const HG_ACT = { heating: 'heat', preheating: 'heat', defrosting: 'heat', cooling: 'cool', drying: 'dry', fan: 'fan_only', idle: 'idle', off: 'idle' };
const hgClimAct = (h, s, st = s && s.state, cfg) => {
  if (!s || !st || st === 'off' || st === 'unavailable' || st === 'unknown') return null;
  const a = s.attributes || {}, ha = a.hvac_action, mode = ['heat_cool', 'auto'].includes(st) && HG_ACT[ha] && HG_ACT[ha] !== 'idle' ? HG_ACT[ha] : st;   // auto bez hvac_action zostaje „auto”
  if (st !== s.state) return mode;   // zmiana optymistyczna: jeszcze bez danych z urządzenia
  const se = typeof HGAreas !== 'undefined' && h ? HGAreas.stateOf(h, s.entity_id, cfg) : null, on = se ? hgOnState(h.states[se]) : null;
  if (on != null) return on ? mode : 'idle';
  if (ha) return HG_ACT[ha] || mode;
  const cur = parseFloat(a.current_temperature), tg = parseFloat(a.temperature);
  if (isFinite(cur) && isFinite(tg) && ((st === 'heat' && cur >= tg) || (st === 'cool' && cur <= tg))) return 'idle';
  return mode;
};
