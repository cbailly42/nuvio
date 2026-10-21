/* runtime (skipped by the checker: its own definitions take non-literal keys) */
const hgT = (key, params) => hgI18nRes(key, params);
const hgTLazy = (key, params) => ({ toString: () => hgT(key, params) });
const hgTO = (o, map) => { for (const [k, key] of Object.entries(map)) Object.defineProperty(o, k, { get: () => hgT(key) }); return o; };
