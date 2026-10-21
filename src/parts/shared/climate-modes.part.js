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
