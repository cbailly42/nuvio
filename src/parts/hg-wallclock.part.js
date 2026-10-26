/* ===== #41 Wygląd zegara na wygaszaczu: czcionka, rozmiar, grubość, kolor, cień i przezroczystość.
   Ustawienie: HGL.data.wall.clock = { font ('system' | 'serif' | 'mono' | 'rounded' | 'own'), url (własna czcionka: /local/… albo https://…),
     size (0.6–1.4, mnożnik), weight (0 = jak w stylu, albo 100–900), color ('white' | 'accent' | 'custom'), hex (#rrggbb),
     shadow (null = jak w stylu, albo 0–1), opacity (0.3–1) }.
   Domyślne wartości nie zmieniają wyglądu: pusta zmienna CSS znaczy „zostaw styl". Zegar analogowy ma własną tarczę i nie korzysta z tych ustawień.
   Wartości idą zmiennymi CSS (--hg-ck-*) na korzeń nakładki i na podgląd w arkuszu, więc suwaki działają od razu. */
const HG_CLOCK_CSS = `
.nw .nw-t, .nw .nx-t, .nw .nx-fc b, .nw .ng-mt, .wck-pvt{ font-family:var(--hg-ck-font, 'DM Sans','HG DM Sans',system-ui,sans-serif); color:var(--hg-ck-c, inherit); }
.nw .nw-t{ font-weight:var(--hg-ck-w, 300); opacity:var(--hg-ck-o, 1); text-shadow:var(--hg-ck-sh, 0 4px 40px rgba(0,0,0,.45)); font-size:calc(clamp(84px, 22vmin, 240px) * var(--hg-ck-s, 1)); }
.nw .nx-t{ font-weight:var(--hg-ck-w, 200); text-shadow:var(--hg-ck-sh, 0 6px 60px rgba(0,0,0,.3)); font-size:calc(clamp(100px, 27vmin, 310px) * var(--hg-ck-s, 1)); }
.nw .nx-n .nx-t{ font-weight:var(--hg-ck-w, 300); text-shadow:var(--hg-ck-sh, none); font-size:calc(clamp(84px, 21vmin, 230px) * var(--hg-ck-s, 1)); opacity:calc(.62 * var(--hg-ck-o, 1)); }
.nw .nx-fc b{ font-weight:var(--hg-ck-w, 600); color:var(--hg-ck-c, rgb(238,240,244)); text-shadow:var(--hg-ck-sh, none); font-size:calc(clamp(104px, 27vmin, 300px) * var(--hg-ck-s, 1)); }
.nw .ng-mt{ font-weight:var(--hg-ck-w, 200); text-shadow:var(--hg-ck-sh, 0 2px 6px rgba(0,0,0,.35), 0 4px 40px rgba(0,0,0,.4)); opacity:var(--hg-ck-o, 1); font-size:calc(190 * var(--u) * var(--cs, 1) * var(--hg-ck-s, 1)); }
.wck-pvt{ font-weight:var(--hg-ck-w, 300); font-size:calc(70px * var(--hg-ck-s, 1)); opacity:var(--hg-ck-o, 1); text-shadow:var(--hg-ck-sh, none); }
`;
Object.assign(HGWall, {
  /* [klucz, nazwa, rodzina] – tylko czcionki systemu, bez ładowania zewnętrznego */
  CK_FONTS: [['system', hgTLazy('wallclock.font_system'), "'DM Sans','HG DM Sans',system-ui,sans-serif"], ['serif', hgTLazy('wallclock.font_serif'), "Georgia,'Times New Roman',serif"], ['mono', hgTLazy('wallclock.font_mono'), "ui-monospace,'SF Mono',Menlo,monospace"], ['rounded', hgTLazy('wallclock.font_rounded'), "ui-rounded,'SF Pro Rounded','Arial Rounded MT Bold',system-ui,sans-serif"]],
  CK_WEIGHTS: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  /* ---- ustawienia (zawsze znormalizowane) ---- */
  ckGet() { const w = (window.__hgL && window.__hgL.data && window.__hgL.data.wall) || {}, c = w.clock && typeof w.clock === 'object' ? w.clock : {};
    const n = (v, a, b) => { v = Number(v); return isFinite(v) ? Math.max(a, Math.min(b, v)) : null; };
    const url = typeof c.url === 'string' && /^(\/|https?:\/\/)/.test(c.url) && !/[\s"'()<>\\;{}]/.test(c.url) ? c.url : '';
    const sh = n(c.shadow, 0, 1);
    return { font: this.CK_FONTS.some((f) => f[0] === c.font) || c.font === 'own' ? c.font : 'system', url,
      size: n(c.size, 0.6, 1.4) == null ? 1 : n(c.size, 0.6, 1.4), weight: this.CK_WEIGHTS.includes(Number(c.weight)) ? Number(c.weight) : 0,
      color: ['white', 'accent', 'custom'].includes(c.color) ? c.color : 'white', hex: typeof c.hex === 'string' && /^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex.toLowerCase() : '#ffffff',
      shadow: sh, opacity: n(c.opacity, 0.3, 1) == null ? 1 : n(c.opacity, 0.3, 1) }; },
  /* zmienne CSS; pusta wartość = usuń zmienną, wtedy działa styl z HG_CLOCK_CSS */
  ckVars(c) { c = c || this.ckGet();
    const own = c.font === 'own' && c.url, fam = own ? "'HG Clock Own',system-ui,sans-serif" : (this.CK_FONTS.find((x) => x[0] === c.font) || this.CK_FONTS[0])[2];
    const col = c.color === 'accent' ? 'var(--hg-accent, #63d71e)' : c.color === 'custom' ? c.hex : '';
    const a = c.shadow, sh = a == null ? '' : a === 0 ? 'none' : `0 4px ${Math.round(8 + a * 64)}px rgba(0,0,0,${(a * 0.9).toFixed(2)})`;
    return { '--hg-ck-font': fam === this.CK_FONTS[0][2] ? '' : fam, '--hg-ck-w': c.weight || '', '--hg-ck-c': col, '--hg-ck-o': c.opacity === 1 ? '' : String(c.opacity), '--hg-ck-s': c.size === 1 ? '' : String(c.size), '--hg-ck-sh': sh }; },
  /* ustawia zmienne na nakładce (albo w podglądzie); pusta wartość usuwa zmienną */
  ckApply(el) { if (!el) return; const v = this.ckVars(); for (const k of Object.keys(v)) { if (v[k] === '') el.style.removeProperty(k); else el.style.setProperty(k, v[k]); } },
  /* @font-face dla własnej czcionki: adres tylko z /local/ albo https://, bez cudzysłowów i nawiasów (patrz ckGet) */
  /* stylesheet nakładki: reguły zegara i własna czcionka; dokładany na końcu, żeby nadpisać style o tej samej specyficzności */
  ckCss(c) { return `<style>${HG_CLOCK_CSS}${this.ckFace(c)}</style>`; },
  ckFace(c) { c = c || this.ckGet(); if (c.font !== 'own' || !c.url) return '';
    return `@font-face{font-family:'HG Clock Own';font-style:normal;font-weight:100 900;font-display:swap;src:url(${c.url})}`; },
  /* sekcja w arkuszu Wygląd: podgląd na żywo pod listą stylów; wszystko przez te same zmienne co nakładka */
  ckHtml(c) { const K = this.ckGet(), L = (t) => H.esc(t), face = this.ckFace(K);
    const seg = (path, list, cur) => `<div class="wl-seg" style="--n:${list.length}">${list.map(([k, t]) => `<button type="button" data-hge="wl-ck-s" data-v="${H.esc(path + '=' + k)}" aria-pressed="${String(cur) === String(k)}">${L(t)}</button>`).join('')}</div>`;
    const rg = (path, v, mi, mx, st, t, shown, fmt) => `<div class="wl-f"><span>${L(t)}<em class="wck-rv">${L(fmt(shown))}</em></span><input class="lk-rg" type="range" min="${mi}" max="${mx}" step="${st}" name="wck:${path}" value="${v}" data-fmt="${path === 'weight' ? 'x' : 'pc'}" style="--v:${((v - mi) / (mx - mi)) * 100}%" aria-label="${L(t)}"></div>`;
    const fonts = this.CK_FONTS.map(([k, t]) => [k, t]).concat([['own', hgT('wallclock.font_own')]]);
    const cols = [['white', hgT('wallclock.color_white')], ['accent', hgT('wallclock.color_accent')], ['custom', hgT('wallclock.color_custom')]];
    const wv = K.weight || 300, shv = K.shadow == null ? 0.5 : K.shadow;
    const pv = Object.entries(this.ckVars(K)).filter(([, v]) => v !== '').map(([k, v]) => `${k}:${v}`).join(';');
    return `<style>${HG_CLOCK_CSS}${face}</style><div class="wg-h">${L(hgT('wallclock.heading'))}</div>
      <div class="wl-f"><span>${L(hgT('wallclock.preview'))}</span><div class="wck-pv" role="img" aria-label="${L(hgT('wallclock.preview'))}"><span class="wck-pvt" style="${H.esc(pv)}">12:34</span></div></div>
      <div class="wl-f"><span>${L(hgT('wallclock.font'))}</span>${seg('font', fonts, K.font)}</div>
      ${K.font === 'own' ? `<span class="hs-s">${H.icon('mdi:format-font')}<input class="hs-in" name="wck-url" placeholder="${L(hgT('wallclock.font_url_hint'))}" value="${L(K.url)}" autocomplete="off" aria-label="${L(hgT('wallclock.font_url'))}"></span>` : ''}
      ${rg('size', K.size, 0.6, 1.4, 0.1, hgT('wallclock.size'), K.size, (x) => H.pct(Math.round(x * 100)))}
      ${rg('weight', wv, 100, 900, 100, hgT('wallclock.weight'), wv, (x) => String(x))}
      <div class="wl-f"><span>${L(hgT('wallclock.colour'))}</span>${seg('color', cols, K.color)}${K.color === 'custom' ? `<div class="wg-cl"><label><input type="color" name="wck:hex" value="${K.hex}">${L(hgT('wallclock.colour_pick'))}</label></div>` : ''}</div>
      ${rg('shadow', shv, 0, 1, 0.05, hgT('wallclock.shadow'), shv, (x) => H.pct(Math.round(x * 100)))}
      ${rg('opacity', K.opacity, 0.3, 1, 0.05, hgT('wallclock.opacity'), K.opacity, (x) => H.pct(Math.round(x * 100)))}
      <button type="button" class="wl-tb" data-hge="wl-ck-reset">${H.icon('mdi:restore')}<span>${L(hgT('wallclock.reset'))}</span></button>`; },
  /* zapis przez set(): w trybie edycji tylko szkic, zapis do HA przy Gotowe */
  ckSet(path, v) { const c = Object.assign({}, this.ckGet(), { [path]: v }); this.set({ clock: c }); },
  ckWire(p, S) { if (!this.admin(p)) return;
    for (const i of S.querySelectorAll('input[name^="wck:"]')) { const path = i.name.slice(4);
      if (i.type === 'range') i.addEventListener('input', () => { const mi = +i.min, mx = +i.max, v = +i.value; i.style.setProperty('--v', ((v - mi) / (mx - mi)) * 100 + '%'); const em = i.parentNode.querySelector('.wck-rv');
        if (em) em.textContent = path === 'weight' ? String(v) : H.pct(Math.round(v * 100)); this.ckSet(path, v); });
      else i.addEventListener('input', () => this.ckSet('hex', i.value)); }
    const u = S.querySelector('[name=wck-url]'); if (u) u.addEventListener('change', () => { const v = u.value.trim(); if (v && !/^(\/|https?:\/\/)/.test(v)) return p._eToast(hgT('wall.image_url_invalid')); this.ckSet('url', v); }); },
  ckAct(p, b, a) { if (a === 'wl-ck-s') { const [k, v] = b.dataset.v.split('='); this.ckSet(k, v); return p._eLook(); }
    if (a === 'wl-ck-reset') { this.set({ clock: {} }); return p._eLook(); }
    return false; },
});
