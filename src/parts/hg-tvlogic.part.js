/* ===== Telewizor: czyste funkcje parowania (bez DOM i bez Home Assistant). Używa ich hg-tv.part.js, testy w tests/js/tv-logic.test.mjs. ===== */
const HGTvLogic = {
  SEEN_KEY: 'nuvio_tv_seen',
  PREFIX: 'Nuvio TV',
  /* link z kodu QR http://IP:PORT/pair?c=KOD, wynik { addr, code } albo null */
  parseLink(text) {
    let u; try { u = new URL(String(text || '').trim()); } catch (e) { return null; }
    const code = u.searchParams.get('c');
    if (u.protocol !== 'http:' || u.username || u.password || u.pathname !== '/pair' || !u.port || !code) return null;
    return { addr: u.hostname + ':' + u.port, code: code.trim() };
  },
  /* adres telewizora host:port, host to IPv4 albo nazwa, port 1 do 65535; wynik { host, port } albo null */
  parseAddr(text) {
    const m = /^([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*):([0-9]{1,5})$/.exec(String(text || '').trim());
    if (!m) return null;
    const host = m[1], port = Number(m[2]);
    if (port < 1 || port > 65535) return null;
    if (/^[0-9.]+$/.test(host)) { const o = host.split('.'); if (o.length !== 4 || o.some((x) => !/^(0|[1-9][0-9]{0,2})$/.test(x) || Number(x) > 255)) return null; }
    return { host, port };
  },
  validCode: (s) => /^[0-9]{6}$/.test(String(s || '').trim()),
  /* 10.x, 172.16 do 31.x, 192.168.x, 169.254.x i nazwy .local */
  isPrivateHost(host) {
    const h = String(host || '').toLowerCase(), m = /^([0-9]{1,3})\.([0-9]{1,3})\.[0-9]{1,3}\.[0-9]{1,3}$/.exec(h);
    if (m) { const a = Number(m[1]), b = Number(m[2]); return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254); }
    return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.local$/.test(h);
  },
  /* czy telewizor zapyta o zgodę na połączenie bez szyfrowania: adres HA przez http i host spoza sieci prywatnej.
     Host jest czytany z surowego tekstu i po normalizacji URL (np. 3232235777 staje się 192.168.1.1); prywatny tylko gdy oba odczyty są prywatne */
  needsConfirm(ha) {
    const raw = /^http:\/\/([^/:?#]+)/i.exec(String(ha || ''));
    if (!raw) return false;
    let u; try { u = new URL(String(ha)); } catch (e) { return true; }
    return !(HGTvLogic.isPrivateHost(raw[1]) && HGTvLogic.isPrivateHost(u.hostname));
  },
  /* wynik POST /pair z odpowiedzi telewizora: 200 przyjęto, 403 zły kod, 429 za dużo prób lub przerwa, reszta (400, 404, inne) odrzucono */
  outcome(status) { return status === 200 ? 'ok' : status === 403 ? 'wrong' : status === 429 ? 'limit' : 'rejected'; },
  /* strona serwowana przez http: może wysłać fetch do telewizora bez nowej karty (strona https jest blokowana jako mieszana treść) */
  direct: (protocol) => protocol === 'http:',
  /* adres Home Assistant: http albo https, bez danych logowania (user:pass@), wynik bez końcowego ukośnika albo null */
  haUrl(text) {
    let u; try { u = new URL(String(text || '').trim()); } catch (e) { return null; }
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || !u.hostname || u.username || u.password) return null;
    return u.origin + u.pathname.replace(/\/+$/, '');
  },
  /* wolna nazwa tokenu: Nuvio TV RRRR-MM-DD GG:MM, przy kolizji z listą names sufiks " 2", " 3" */
  freeName(names, d) {
    const p = (n) => String(n).padStart(2, '0');
    const base = HGTvLogic.PREFIX + ' ' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    const used = new Set(names); let n = 1, name = base;
    while (used.has(name)) { n += 1; name = base + ' ' + n; }
    return name;
  },
  /* nazwy wszystkich długoterminowych tokenów (tylko wśród nich nazwa musi być unikalna) */
  longNames: (list) => (Array.isArray(list) ? list : []).filter((t) => t && t.type === 'long_lived_access_token' && typeof t.client_name === 'string').map((t) => t.client_name),
  /* nazwa telewizora: dokładnie "Nuvio TV" albo "Nuvio TV " i dalszy ciąg (nie "Nuvio TVx") */
  isTvName: (n) => typeof n === 'string' && (n === HGTvLogic.PREFIX || n.startsWith(HGTvLogic.PREFIX + ' ')),
  /* tokeny telewizorów do pokazania: długoterminowe, nazwa "Nuvio TV" (całe słowo), nie bieżąca sesja, najnowsze pierwsze */
  tokens: (list) => (Array.isArray(list) ? list : [])
    .filter((t) => t && t.type === 'long_lived_access_token' && !t.is_current && typeof t.id === 'string' && HGTvLogic.isTvName(t.client_name))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
  idByName(list, name) {
    const t = (Array.isArray(list) ? list : []).find((x) => x && x.type === 'long_lived_access_token' && x.client_name === name);
    return t && typeof t.id === 'string' ? t.id : null;
  },
  /* wartość znacznika nuvio_tv_seen: obiekt id tokenu HA (32 znaki szesnastkowe) -> czas ISO; wszystko inne odrzucone */
  parseSeen(value) {
    const out = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    for (const [k, v] of Object.entries(value)) if (/^[0-9a-fA-F]{32}$/.test(k) && typeof v === 'string' && !Number.isNaN(Date.parse(v))) out[k] = v;
    return out;
  },
  /* id tokenu odświeżania to pole iss tokenu JWT (ładunek base64url, bez sprawdzania podpisu) */
  tokenId(jwt) {
    try {
      const part = String(jwt || '').split('.')[1]; if (!part) return null;
      const b = part.replace(/-/g, '+').replace(/_/g, '/'), j = JSON.parse(atob(b + '='.repeat((4 - (b.length % 4)) % 4)));
      return typeof j.iss === 'string' && j.iss ? j.iss : null;
    } catch (e) { return null; }
  },
};
