/* shared/card-utils: Pomocnicze funkcje kart: moc w W, głębokie scalanie konfiguracji, liczba kluczy obiektu. */
/* moc w W wg unit_of_measurement (W / kW / MW) – wspólne dla kart mocy */
const hgW = (hass, e) => { const v = H.num(hass, e); if (v == null) return null; const u = String(H.st(hass, e).attributes.unit_of_measurement || '').trim(); return u === 'kW' ? v * 1000 : u === 'MW' ? v * 1e6 : v; };
/* scalanie konfiguracji: zagnieżdżone obiekty domyślne (progi, etykiety, kolory) uzupełniane kluczami, nie zastępowane w całości */
const hgDeep = (d, c) => { if (!c) return c; const o = Object.assign({}, c); for (const k in d) { const a = d[k], b = c[k]; if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) o[k] = Object.assign({}, a, b); } return o; };
/* liczba kluczy obiektu (hass.states / hass.entities) liczona raz na referencję – wspólna dla kart z wykrywaniem encji */
const hgNKeysM = new WeakMap(), hgNKeys = (o) => { let n = hgNKeysM.get(o); if (n == null) { n = Object.keys(o).length; hgNKeysM.set(o, n); } return n; };
