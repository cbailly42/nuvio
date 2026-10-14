/* ===== ui/morph: aktualizacja karty na żywo. Zamiast podmieniać całe innerHTML (znika fokus, przewijanie i trwające animacje,
   przejścia CSS nie mają od czego startować), nowy HTML jest nakładany na istniejące węzły: zmieniają się tylko atrybuty,
   teksty i węzły, które naprawdę są inne. Dzięki temu paski, łuki i przełączniki płyną przejściami CSS do nowej wartości.
   Klucze (id, data-key, data-e) parują elementy list, więc przestawienie kolejności nie przerysowuje całej listy.
   Liczby z klasą .nv-num i atrybutem data-v przeliczają się płynnie od starej do nowej wartości. ===== */
const hgMorph = (() => {
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tpl = document.createElement('template');
  const KA = ['data-e', 'data-hgk', 'data-ac', 'data-cam', 'data-cm'];
  const key = (n) => { if (n.nodeType !== 1) return null; if (n.id || n.hasAttribute('data-key')) return n.id || n.getAttribute('data-key');
    for (const k of KA) if (n.hasAttribute(k)) return n.tagName + '|' + k + '|' + n.getAttribute(k); return null; };
  /* gniazda, do których kod wstawia całe karty (klimatyzacja, kamera, karta własna): morph zmienia tylko ich atrybuty, dzieci zostają */
  const own = (n) => n.hasAttribute('data-own') || /(^|\s)(acslot|camslot|cmslot)(\s|$)/.test(n.className || '');
  const same = (a, b) => a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.tagName === b.tagName && key(a) === key(b)));
  /* płynna liczba: od wartości widocznej teraz do nowej, 400 ms, format (miejsca po przecinku) z nowego tekstu */
  const tween = (el, from, to, text) => {
    cancelAnimationFrame(el.__nvT || 0);
    const d = (text.match(/[.,](\d+)/) || [, ''])[1].length, sep = text.includes(',') ? ',' : '.', t0 = performance.now();
    const pre = text.slice(0, text.search(/[-\d]/)), post = text.slice(text.search(/[-\d][\d\s.,]*/) + (text.match(/[-\d][\d\s.,]*/) || [''])[0].length);
    const step = (t) => { const k = Math.min(1, (t - t0) / 400), e = 1 - Math.pow(1 - k, 3), v = from + (to - from) * e;
      el.textContent = pre + v.toFixed(d).replace('.', sep) + post; if (k < 1) el.__nvT = requestAnimationFrame(step); else el.textContent = text; };
    el.__nvT = requestAnimationFrame(step);
  };
  const attrs = (a, b, root) => {
    for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
    for (const { name, value } of b.attributes) if (a.getAttribute(name) !== value) {
      const old = a.getAttribute(name); a.setAttribute(name, value);
      if (name === 'data-v' && a.classList.contains('nv-num') && !reduce()) { const f = parseFloat(old), t = parseFloat(value); if (isFinite(f) && isFinite(t) && f !== t) a.__nvTo = [f, t]; }
    }
    /* pola formularzy: właściwość value / checked idzie za atrybutem, chyba że użytkownik właśnie w nim pisze */
    if ((a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') && root.activeElement !== a) {
      if ('value' in b && a.value !== b.value && b.hasAttribute('value')) a.value = b.value;
      if (a.type === 'checkbox' || a.type === 'radio') a.checked = b.hasAttribute('checked');
    }
  };
  const kids = (a, b, root) => {
    const old = [...a.childNodes], neu = [...b.childNodes], byKey = new Map();
    for (const n of old) { const k = key(n); if (k) byKey.set(k, n); }
    let i = 0;
    for (const nb of neu) {
      const k = key(nb); let na = k ? byKey.get(k) : null;
      if (na) byKey.delete(k);
      else { const c = old[i]; if (c && !key(c) && same(c, nb)) na = c; }
      const at = a.childNodes[i];
      if (na) { if (na !== at) a.insertBefore(na, at || null); patch(na, nb, root); }
      else a.insertBefore(nb.cloneNode(true), at || null);
      i++;
    }
    while (a.childNodes.length > neu.length) a.removeChild(a.lastChild);
  };
  const patch = (a, b, root) => {
    if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    attrs(a, b, root);
    if (a.tagName === 'STYLE' || a.tagName === 'SCRIPT') { if (a.textContent !== b.textContent) a.textContent = b.textContent; return; }
    if (a.__nvTo) { const [f, t] = a.__nvTo; a.__nvTo = null; tween(a, f, t, b.textContent); return; }
    if (a.__nvT && a.getAttribute('data-v') === b.getAttribute('data-v')) return;   // trwa przeliczanie do tej samej wartości
    if (own(a) && !b.firstChild) return;
    kids(a, b, root);
  };
  /* root = kontener karty; html = nowa treść. Zwraca false, gdy nie da się łatać (pierwsze malowanie). */
  return (el, html) => {
    if (!el.firstChild) { el.innerHTML = html; return false; }
    tpl.innerHTML = html; kids(el, tpl.content, el.getRootNode()); tpl.innerHTML = '';
    return true;
  };
})();
window.__hgMorph = hgMorph;
