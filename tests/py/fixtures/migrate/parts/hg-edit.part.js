const hgTrO = (o, m) => { for (const [k, [pl, en]] of Object.entries(m)) Object.defineProperty(o, k, { get: () => hgTr(pl, en), enumerable: true, configurable: true }); return o; };
const T = hgTrO({}, { tog: ['Przełącznik', 'Switch'], btn: ['Przycisk', 'Button'] });
const s = () => hgTr('Zapisz', 'Save');
const w = () => hgTr('Zapisz', 'Save');
