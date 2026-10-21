/* demo module: every way a key can be used */
const HG_DEMO_T = hgTO({}, { save: 'common.save' });
const hgDemo = (n, count, x) => {
  const t = hgT('demo.title'), c = hgTLazy('demo.count', { count });
  const s = hgTD('states.' + x, x), lab = hgTD('states.label.on');
  return `<button aria-label="${hgT('demo.close')}" title="Nuvio">${hgT('demo.greet', { name: n })}</button><ha-icon icon="mdi:home"></ha-icon>${t}${c}${s}${lab}`;
};
