const top = hgTr('Górny', 'Top');
hgReg('x-card', HGX, hgTr('Tytuł', 'Title'));
const objLit = { a: hgTr('Obiekt', 'Object') };
const lazyTop = hgTrLazy('Leniwy', 'Lazy');
const mapped = hgTrO({}, { m: ['Mapa', 'Map'] });
const arrowExpr = () => hgTr('Strzałka', 'Arrow');
const arrowBlock = () => { return hgTr('Blok strzałki', 'Arrow block'); };
const nested = items.map((i) => ({ label: hgTr('Wewnątrz', 'Inside') }));
function decl() { return hgTr('Deklaracja', 'Declaration'); }
const fe = function () { return hgTr('Wyrażenie', 'Expression'); };
if (flag) { const ifb = hgTr('Warunek', 'Conditional'); }
class HGLoad {
  field = hgTr('Pole', 'Field');
  static sf = hgTr('Pole statyczne', 'Static field');
  render() { return hgTr('Metoda', 'Method'); }
  get title() { return hgTr('Getter', 'Getter'); }
}
const lit = { render() { return hgTr('Metoda obiektu', 'Object method'); }, get g() { return hgTr('Getter obiektu', 'Object getter'); } };
const tl = `<b>${hgTr('Szablon', 'Template')}</b>`;
const tlf = () => `<b>${hgTr('Szablon w funkcji', 'Template in function')}</b>`;
const objm = { ask(a, ok = hgTr('Potwierdź', 'Confirm')) { return ok; } };
const arrp = (ok = hgTr('Domyślnie', 'By default')) => ok;
