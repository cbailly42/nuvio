const hgTrLazy = (pl, en) => ({ toString: () => (typeof hgTr === 'function' ? hgTr(pl, en) : pl) });
const HG_BG_SET = window.HG_BG_SET = window.HG_BG_SET || [['dom-w-lesie', 'Dom w lesie', 'House in the woods'], ['kuchnia', 'Kuchnia', 'Kitchen']]
  .map(([id, pl, en], i) => { const l = hgTrLazy(pl, en); return [id, l]; });
const HG_I18N = {
  pl: { map: 'Mapa', hello: 'Witaj, {name}!' },
  en: { map: 'Map', hello: 'Welcome, {name}!' },
};
const HG_WZ_T = {
  pl: { hero: 'Witaj w Nuvio', heroS: 'Szklany pulpit', s: ['Język', 'Widoki'] },
  en: { hero: 'Welcome to Nuvio', heroS: 'A glass dashboard', s: ['Language', 'Views'] } };
