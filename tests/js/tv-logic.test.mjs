/* Telewizor: czyste funkcje parowania (link z QR, adres, kod, sieć prywatna, nazwa tokenu, lista, znacznik, iss z JWT). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadParts } from './harness.mjs';

const { HGTvLogic: L } = loadParts(['hg-tvlogic.part.js'], {}, ['HGTvLogic']);

const ID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const OTHER = 'f0e1d2c3b4a5968778695a4b3c2d1e0f';
const jwt = (payload) => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'SYNTHETIC-SIGNATURE'].join('.');

test('parseLink: link z QR daje adres i kod, wszystko inne null', () => {
  assert.deepEqual(L.parseLink('http://10.0.8.117:8798/pair?c=482913'), { addr: '10.0.8.117:8798', code: '482913' });
  assert.deepEqual(L.parseLink('  http://tv.local:8800/pair?c=000123  '), { addr: 'tv.local:8800', code: '000123' });
  for (const bad of ['', null, undefined, '10.0.8.117:8798', 'https://10.0.8.117:8798/pair?c=482913', 'http://10.0.8.117/pair?c=482913',
    'http://10.0.8.117:8798/other?c=482913', 'http://10.0.8.117:8798/pair', 'http://10.0.8.117:8798/pair?c=', 'nie link']) assert.equal(L.parseLink(bad), null, String(bad));
});

test('parseLink: obejścia przez dane logowania, port domyślny i nietypowe hosty', () => {
  /* host po @ to evil.com, port 80 jest domyślny (URL.port puste), więc link jest odrzucany */
  assert.equal(L.parseLink('http://10.0.8.117@evil.com:80/pair?c=1'), null);
  /* dane logowania w linku są odrzucane także przy niedomyślnym porcie (host byłby evil.com) */
  for (const bad of ['http://10.0.8.117@evil.com:8798/pair?c=1', 'http://user:pass@10.0.8.117:8798/pair?c=482913', 'http://10.0.8.117:80@evil.com:8798/pair?c=1']) assert.equal(L.parseLink(bad), null, bad);
  /* host nie przechodzi walidacji sieci prywatnej, ale parseLink go nie zmienia: adres i tak sprawdza isPrivateHost */
  const l = L.parseLink('http://10.0.8.117.evil.com:8798/pair?c=482913');
  assert.deepEqual(l, { addr: '10.0.8.117.evil.com:8798', code: '482913' });
  assert.equal(L.isPrivateHost(L.parseAddr(l.addr).host), false);
  /* port 65536 odrzuca już URL; IPv6 i port 0 przechodzą parseLink, ale wynikowy adres odrzuca parseAddr */
  assert.equal(L.parseLink('http://10.0.8.117:65536/pair?c=482913'), null);
  for (const link of ['http://[::1]:8798/pair?c=482913', 'http://10.0.8.117:0/pair?c=482913']) { const l2 = L.parseLink(link); assert.equal(L.parseAddr(l2 && l2.addr), null, link); }
});

test('parseAddr: IPv4 albo nazwa z portem 1 do 65535', () => {
  assert.deepEqual(L.parseAddr('10.0.8.117:8798'), { host: '10.0.8.117', port: 8798 });
  assert.deepEqual(L.parseAddr(' tv.local:1 '), { host: 'tv.local', port: 1 });
  assert.deepEqual(L.parseAddr('salon-tv:65535'), { host: 'salon-tv', port: 65535 });
  for (const bad of ['', '10.0.8.117', '10.0.8.117:0', '10.0.8.117:65536', '10.0.8.256:8798', '10.0.8:8798', '10.0.8.1.1:8798', '010.0.8.1:8798',
    'http://10.0.8.117:8798', '10.0.8.117:80a', '-tv:8798', 'tv-:8798', 'tv..local:8798', '10.0.8.117:8798/pair', 'a b:8798', null]) assert.equal(L.parseAddr(bad), null, String(bad));
});

test('adres: obejścia (host z dopiskiem, @, IPv6, localhost, IP dziesiętny i szesnastkowy, port 0 i 65536, kropka na końcu)', () => {
  /* przechodzi parseAddr jako nazwa, ale nie jest siecią prywatną */
  for (const host of ['10.0.8.117.evil.com', 'localhost', '0xC0A80101', 'tv.local.evil.com']) {
    const a = L.parseAddr(host + ':8798'); assert.deepEqual(a, { host, port: 8798 }, host);
    assert.equal(L.isPrivateHost(a.host), false, host);
  }
  /* odrzucone już przy rozbiorze adresu */
  for (const bad of ['192.168.1.1@evil.com:8798', '192.168.1.1@evil.com', '[::1]:8798', '[::1]', '::1', '3232235777:8798', '10.0.8.117:0', 'tv.local:0', 'localhost:65536', 'tv.local:65536',
    '10.0.8.117.:8798', 'tv.local.:8798', '.tv.local:8798']) assert.equal(L.parseAddr(bad), null, bad);
  /* wielkie litery w .LOCAL są akceptowane na obu etapach */
  assert.deepEqual(L.parseAddr('Salon-TV.LOCAL:8798'), { host: 'Salon-TV.LOCAL', port: 8798 });
  assert.equal(L.isPrivateHost('Salon-TV.LOCAL'), true);
  assert.equal(L.isPrivateHost('TV.Local'), true);
  /* isPrivateHost samo odrzuca IPv6, IP dziesiętny i szesnastkowy, kropkę na końcu i dopiski */
  for (const no of ['[::1]', '::1', '3232235777', '0xC0A80101', '10.0.8.117.', '192.168.1.1@evil.com', '10.0.8.117.evil.com', 'localhost', '10.0.8.117 ']) assert.equal(L.isPrivateHost(no), false, no);
});

test('validCode: dokładnie 6 cyfr', () => {
  assert.equal(L.validCode('482913'), true);
  assert.equal(L.validCode(' 000123 '), true);
  for (const bad of ['', '12345', '1234567', '12345a', '12 345', null]) assert.equal(L.validCode(bad), false, String(bad));
});

test('isPrivateHost: sieci prywatne, link-local i .local; reszta blokowana', () => {
  for (const ok of ['10.0.8.117', '10.255.255.255', '172.16.0.1', '172.31.255.1', '192.168.1.5', '169.254.10.20', 'tv.local', 'Salon-TV.LOCAL']) assert.equal(L.isPrivateHost(ok), true, ok);
  for (const no of ['8.8.8.8', '172.15.0.1', '172.32.0.1', '192.169.1.1', '11.0.0.1', '127.0.0.1', 'example.com', 'local', 'tv.local.evil.com', '', null]) assert.equal(L.isPrivateHost(no), false, String(no));
});

test('haUrl: tylko http i https, bez końcowego ukośnika', () => {
  assert.equal(L.haUrl('https://ha.example.com'), 'https://ha.example.com');
  assert.equal(L.haUrl(' http://ha.local:8123/ '), 'http://ha.local:8123');
  assert.equal(L.haUrl('https://ha.example.com/sub/path/?x=1#y'), 'https://ha.example.com/sub/path');
  for (const bad of ['', 'ha.local:8123', 'ftp://ha.local', 'javascript:alert(1)', 'http://', 'nie adres', null]) assert.equal(L.haUrl(bad), null, String(bad));
});

test('haUrl: adres z danymi logowania jest odrzucany, zwykły http i https nadal przechodzi', () => {
  for (const bad of ['https://user:pass@ha.local', 'http://user:pass@ha.local:8123', 'https://user@ha.local', 'https://:pass@ha.local', 'http://a@b.example.com/path']) assert.equal(L.haUrl(bad), null, bad);
  assert.equal(L.haUrl('https://ha.local'), 'https://ha.local');
  assert.equal(L.haUrl('http://ha.local:8123'), 'http://ha.local:8123');
  assert.equal(L.haUrl('https://ha.example.com/sub/'), 'https://ha.example.com/sub');
});

test('freeName: znacznik czasu, przy kolizji sufiks 2, 3', () => {
  const d = new Date(2026, 9, 25, 9, 5);
  assert.equal(L.freeName([], d), 'Nuvio TV 2026-10-25 09:05');
  assert.equal(L.freeName(['Inny token', 'Nuvio TV 2026-10-25 09:05'], d), 'Nuvio TV 2026-10-25 09:05 2');
  assert.equal(L.freeName(['Nuvio TV 2026-10-25 09:05', 'Nuvio TV 2026-10-25 09:05 2'], d), 'Nuvio TV 2026-10-25 09:05 3');
  assert.equal(L.freeName(['Nuvio TV 2026-10-25 09:06'], d), 'Nuvio TV 2026-10-25 09:05');
});

const row = (o) => ({ id: 'x', type: 'long_lived_access_token', client_name: 'Nuvio TV 2026-10-25 09:05', created_at: '2026-10-25T08:05:00.000000+00:00', is_current: false, ...o });

test('longNames i tokens: filtr typu, nazwy, bieżącej sesji i kolejność', () => {
  const list = [
    row({ id: 'a', client_name: 'Nuvio TV 2026-10-24 20:00', created_at: '2026-10-24T19:00:00.000000+00:00' }),
    row({ id: 'b', client_name: 'Nuvio TV 2026-10-25 09:05' }),
    row({ id: 'c', client_name: 'Moja aplikacja' }),
    row({ id: 'd', type: 'normal', client_name: 'Nuvio TV sesja' }),
    row({ id: 'e', is_current: true }),
    row({ id: 'f', client_name: null }),
    null,
  ];
  assert.deepEqual(L.tokens(list).map((t) => t.id), ['b', 'a']);
  assert.deepEqual(L.longNames(list), ['Nuvio TV 2026-10-24 20:00', 'Nuvio TV 2026-10-25 09:05', 'Moja aplikacja', 'Nuvio TV 2026-10-25 09:05']);
  assert.deepEqual(L.tokens('nie lista'), []);
  assert.deepEqual(L.longNames(undefined), []);
});

test('tokens: prefiks Nuvio TV tylko jako całe słowo (spacja albo koniec nazwy)', () => {
  const list = [
    row({ id: 'a', client_name: 'Nuvio TV' }),
    row({ id: 'b', client_name: 'Nuvio TV 2026-10-25 13:45' }),
    row({ id: 'c', client_name: 'Nuvio TVx' }),
    row({ id: 'd', client_name: 'Nuvio TV2' }),
    row({ id: 'e', client_name: 'nuvio tv 2026' }),
    row({ id: 'f', client_name: 'Nuvio TV 2026-10-25 13:45', type: 'normal' }),
    row({ id: 'g', client_name: 'Nuvio TV 2026-10-25 13:45', is_current: true }),
    row({ id: 'h', client_name: ' Nuvio TV' }),
  ];
  assert.deepEqual(L.tokens(list).map((t) => t.id).sort(), ['a', 'b']);
  assert.equal(L.tokens([row({ client_name: 'Nuvio TVx' })]).length, 0);
  assert.equal(L.tokens([row({ client_name: 'Nuvio TV' })]).length, 1);
  assert.equal(L.tokens([row({ client_name: 'Nuvio TV 2026-10-25 13:45' })]).length, 1);
});

test('idByName: znajduje tylko długoterminowy token o tej nazwie', () => {
  const list = [row({ id: 'n', type: 'normal', client_name: 'T' }), row({ id: 'l', client_name: 'T' })];
  assert.equal(L.idByName(list, 'T'), 'l');
  assert.equal(L.idByName(list, 'Inny'), null);
  assert.equal(L.idByName(null, 'T'), null);
});

test('parseSeen: tylko obiekt id -> czas ISO', () => {
  assert.deepEqual(L.parseSeen({ [ID]: '2026-10-25T12:50:00.000Z', zly: 'nie data', liczba: 5, obiekt: {} }), { [ID]: '2026-10-25T12:50:00.000Z' });
  for (const bad of [null, undefined, 'tekst', 5, [], [ID]]) assert.deepEqual(L.parseSeen(bad), {}, String(bad));
});

test('parseSeen: klucz to 32 znaki szesnastkowe (id tokenu HA), małe lub wielkie litery', () => {
  const T = '2026-10-25T12:50:00.000Z', UP = ID.toUpperCase();
  assert.deepEqual(L.parseSeen({ [ID]: T, [UP]: T }), { [ID]: T, [UP]: T });
  const bad = ['', 'a', ID.slice(1), ID + '0', 'g' + ID.slice(1), ID.slice(0, 31) + '-', ' ' + ID, ID + ' ', '__proto__', 'constructor', 'zly klucz'];
  assert.deepEqual(L.parseSeen(Object.fromEntries(bad.map((k) => [k, T]))), {});
  assert.deepEqual(L.parseSeen({ [ID]: T, zly: T, [OTHER]: 'nie data' }), { [ID]: T });
});

test('tokenId: iss z ładunku JWT, błędne dane dają null', () => {
  assert.equal(L.tokenId(jwt({ iss: ID, iat: 1, exp: 2 })), ID);
  for (const bad of ['', null, undefined, 'abc', 'a.b', 'a.!!!.c', jwt({ exp: 1 }), jwt({ iss: 5 }), jwt({ iss: '' }), 'a.' + Buffer.from('[1]').toString('base64url') + '.c']) assert.equal(L.tokenId(bad), null, String(bad));
});

test('needsConfirm: telewizor pyta o zgodę tylko przy http i hoście spoza sieci prywatnej (host z surowego tekstu i po normalizacji URL)', () => {
  for (const ha of ['http://ha.example.com:8123', 'http://8.8.8.8', 'http://ha.example.com', 'http://172.15.0.1:8123', 'http://[::1]:8123', 'http://localhost:8123', 'http://3232235777:8123', 'http://0xC0A80101:8123', 'http://192.168.1.2.evil.com', 'http://tv.local.evil.com'])
    assert.equal(L.needsConfirm(ha), true, ha);
  for (const ha of ['http://10.0.8.5:8123', 'http://172.16.0.9:8123', 'http://192.168.1.2', 'http://169.254.1.1:8123', 'http://ha.local:8123', 'http://Salon.LOCAL', 'http://192.168.1.2:8123/api'])
    assert.equal(L.needsConfirm(ha), false, ha);
  for (const ha of ['https://ha.example.com', 'https://10.0.8.5', 'https://ha.local', '', null, undefined, 'ftp://x', 'ha.local']) assert.equal(L.needsConfirm(ha), false, String(ha));
});

test('outcome: status odpowiedzi telewizora na POST /pair', () => {
  assert.equal(L.outcome(200), 'ok'); assert.equal(L.outcome(403), 'wrong'); assert.equal(L.outcome(429), 'limit');
  for (const s of [400, 404, 500, 204, 201, 302, 0, undefined, null]) assert.equal(L.outcome(s), 'rejected', String(s));
});

test('direct: bezpośrednie wysłanie fetch tylko ze strony http', () => {
  assert.equal(L.direct('http:'), true);
  for (const x of ['https:', '', null, undefined, 'file:']) assert.equal(L.direct(x), false, String(x));
});
