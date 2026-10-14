/* ===== SCHEMAT JASNY / CIEMNY =====
   Wszystkie kolory kart i strony to tokeny CSS (--hg-<rola>-<kolor>) zdefiniowane na :root: jeden zestaw dla jasnego,
   drugi (tylko różnice) dla :root[data-hg-scheme=dark]. Zmienne dziedziczą się przez shadow DOM, więc przełączenie
   atrybutu na <html> przemalowuje wszystko (karty, warstwy menu/arkusza, nakładkę kamery) bez przeładowania.
   Wybór: hass.themes.darkMode (profil HA: auto / jasny / ciemny) -> przy „auto” prefers-color-scheme na żywo.
   Nadpisanie do testów: localStorage home-glass:scheme = light | dark.
   Tokeny wygenerowane przez theme_tokens.py z dawnych literałów; ręczne strojenie w theme_overrides.json. */
(function hgTokens() {
  const id = 'hg-tokens';
  let s = document.getElementById(id);
  if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); }
  s.textContent = `:root{
  --r-lg:31px; --r-md:21px; --r-sm:16px; --s1:10px; --s2:16px; --s3:21px; --s4:31px; --fs-xs:11px; --fs-sm:13px; --fs-md:15.5px;
  --hg-sh: 0 10px 30px var(--hg-glass-sh, rgba(0,0,0,.18)); --hg-sh-sm: 0 1px 3px rgba(0,0,0,.08); --hg-sh-hover: 0 10px 28px var(--hg-glass-sh-h, rgba(20,35,60,.16)); --hg-hover-fill: rgba(255,255,255,.06);
  --hg-accent: #63D71E; --hg-accent-hi: #9BF24A; --hg-accent-lo: #3E9A10; --hg-accent-soft: rgba(99,215,30,.22); --hg-accent-faint: rgba(99,215,30,.10); --hg-accent-glow: rgba(125,246,48,.30); --hg-accent-tx: #1A4607; --hg-on-accent: #0B0F0A; --hg-thumb: #FFFFFF; --hg-thumb-sh: 0 1px 3px rgba(0,0,0,.25), 0 4px 12px rgba(0,0,0,.18);
  --hg-night: transparent; --hg-photo-filter: none; --hg-chrome-sat: 60%; --hg-tools-tint: rgba(240,242,245,.48); --hg-tools-sat: 30%; --hg-scheme: light; --hg-ink: #000; --hg-ink-p: 40%;
  /* pływające kontrolki (szyna, zakładki, pasek narzędzi, hub, wstecz): neutralne szare szkło, bez niebieskiego odcienia */
  --hg-chrome-bg: var(--hg-glass-bg); --hg-chrome-bd: transparent; --hg-chrome-lite: rgba(246,246,248,.86);
  --hg-chrome-blur: 14px; --hg-chrome-sat: 70%; --hg-chrome-lite-sat: 40%; --hg-chrome-sh: 0 4px 18px rgba(0,0,0,.08); --hg-chrome-solid: rgba(242,242,245,.92);
  --hg-chrome-fx: brightness(1.1); --hg-chrome-fg: #1C1C1E; --hg-chrome-ts: none; --hg-chrome-hover: rgba(0,0,0,.06); --hg-chrome-btn: rgba(255,255,255,.6);
  --hg-chrome-badge: var(--hg-accent); --hg-chrome-pill-sh: 0 1px 4px rgba(0,0,0,.18);
  /* powierzchnie szkła (ręcznie, nie z generatora) */
  --hg-glass-bg: rgba(226,232,238,.38); --hg-ov-bg: #F2F3F5; --hg-glass-blur: 14px; --hg-glass-sat: 120%; --hg-glass-bri: 1; --hg-spec: transparent;
  --hg-glass-bd: transparent; --hg-glass-hi: transparent; --hg-glass-sh: rgba(20,30,40,.10);
  /* liquid glass: ostry wewnętrzny obrys jaśniejszy u góry/lewej, ciemniejszy u dołu/prawej + miękka poświata krawędzi */
  --hg-glass-rim: 0 0 0 transparent; --hg-glass-rim-lite: 0 0 0 transparent; --hg-tile-bg: rgba(255,255,255,.30);
  --hg-lens: saturate(100%);
  --hg-warm-bg: var(--hg-glass-bg);
  --hg-panel-bg: rgba(210,218,226,.30); --hg-panel-flat: rgba(236,238,242,.82); --hg-warn: #931F18; --hg-trend-up: #7A1A14; --hg-alert-bg: var(--hg-accent-faint); --hg-alert-ic: var(--hg-accent-tx); --hg-alert-fg: rgba(30,32,35,.82); --hg-alert-tx: var(--hg-accent-tx); --hg-ac-heat-tx: var(--hg-accent-tx); --hg-ac-cool-tx: var(--hg-accent-tx); --hg-ac-dry-tx: var(--hg-accent-tx); --hg-ac-neu-tx: #3C4045; --hg-ac-auto-tx: var(--hg-accent-tx); --hg-panel-bd: transparent;
  /* klimatyzacja: kolory trybów (łuk, gałka, poświata) */
  --hg-ac-heat: #FF8A3D; --hg-ac-cool: #2E9BF0; --hg-ac-dry: #22B8A8; --hg-ac-fan: #8C9BAD;
  --hg-ac-heat-g: rgba(255,138,61,.42); --hg-ac-cool-g: rgba(46,155,240,.40); --hg-ac-dry-g: rgba(34,184,168,.38); --hg-ac-fan-g: rgba(140,155,173,.32);
  /* wewnętrzne powierzchnie szkła (kafle w kartach, przyciski): jedno wypełnienie + refleks górnej krawędzi */
  --hg-inner-bg: rgba(255,255,255,.42); --hg-inner-bg-h: rgba(255,255,255,.62); --hg-inner-hi: inset 0 1px 0 rgba(255,255,255,.7), inset 0 0 0 1px rgba(255,255,255,.3);
  /* tryb lekki (dotyk): karty bez rozmycia, półprzezroczyste jednolite tło */
  --hg-glass-lite-c: rgba(232,237,242,.80); --hg-warm-lite-c: var(--hg-glass-lite-c);
/*@LIGHT@*/
}
:root[data-hg-scheme=dark]{
  --hg-accent-tx: #9BF24A;
  --hg-night: rgba(6,8,12,.25);
  --hg-photo-filter: brightness(.78) saturate(.9); --hg-chrome-sat: 60%; --hg-tools-tint: rgba(22,26,32,.18); --hg-scheme: dark; --hg-ink: #fff; --hg-ink-p: 0%;
  --hg-chrome-bg: var(--hg-glass-bg); --hg-chrome-blur: 14px; --hg-chrome-sat: 15%; --hg-chrome-lite-sat: 10%; --hg-chrome-sh: none; --hg-chrome-bd: transparent; --hg-chrome-lite: rgba(120,128,136,.50); --hg-chrome-solid: rgba(30,30,33,.92);
  --hg-chrome-fx: brightness(1); --hg-chrome-fg: #FFFFFF; --hg-chrome-ts: 0 1px 6px rgba(0,0,0,.28); --hg-chrome-hover: rgba(255,255,255,.12); --hg-chrome-btn: rgba(255,255,255,.10);
  --hg-chrome-badge: var(--hg-accent); --hg-chrome-pill-sh: 0 2px 8px rgba(0,0,0,.15);
  --hg-glass-bg: rgba(255,255,255,.13); --hg-ov-bg: #24252A; --hg-spec: transparent; --hg-glass-bri: 1;
  --hg-glass-bd: transparent; --hg-glass-hi: transparent; --hg-glass-sh: rgba(0,0,0,.18);
  --hg-glass-rim: 0 0 0 transparent; --hg-glass-rim-lite: 0 0 0 transparent; --hg-tile-bg: rgba(255,255,255,.12); --hg-glass-sh-h: rgba(0,0,0,.40); --hg-hover-fill: rgba(255,255,255,.035);
  --hg-warm-bg: var(--hg-glass-bg);
  --hg-panel-bg: rgba(20,26,32,.22); --hg-panel-flat: rgba(30,31,35,.86); --hg-warn: #FFE0DC; --hg-trend-up: #FF6B63; --hg-alert-bg: var(--hg-accent-faint); --hg-alert-ic: var(--hg-accent-tx); --hg-alert-fg: rgba(255,255,255,.82); --hg-alert-tx: var(--hg-accent-tx); --hg-ac-heat-tx: var(--hg-accent-tx); --hg-ac-cool-tx: var(--hg-accent-tx); --hg-ac-dry-tx: var(--hg-accent-tx); --hg-ac-neu-tx: #C9CDD2; --hg-ac-auto-tx: var(--hg-accent-tx); --hg-panel-bd: transparent;
  --hg-glass-lite-c: rgba(120,128,136,.42); --hg-warm-lite-c: var(--hg-glass-lite-c);
  --hg-inner-bg: rgba(255,255,255,.08); --hg-inner-bg-h: rgba(255,255,255,.13); --hg-inner-hi: inset 0 1px 0 rgba(255,255,255,.12), inset 0 0 0 1px rgba(255,255,255,.05);
/*@DARK@*/
}`;
  /* soczewka SVG usunięta (szwy/tęczowe smugi w Chrome); sprzątanie po starej wersji */
  try { document.documentElement.removeAttribute('data-hg-lens'); const o = document.getElementById('hg-liquid-svg'); if (o) o.remove(); } catch (e) {}
})();
/* jedna instancja na stronę (moduł może zostać wczytany dwa razy, np. podgląd + zasób) */
const HGTheme = window.__hgTheme || {
  dark: null, _h: null,
  mq: window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null,
  apply(d) {
    d = !!d; if (d === this.dark) return;
    this.dark = d;
    document.documentElement.setAttribute('data-hg-scheme', d ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent('hg-scheme', { detail: { dark: d } }));
  },
  _ov() { try { const v = localStorage.getItem('home-glass:scheme'); return v === 'dark' || v === 'light' ? v : null; } catch (e) { return null; } },
  pick(h) {
    if (h) this._h = h;
    const ov = this._ov(); if (ov) return this.apply(ov === 'dark');
    const t = this._h && this._h.themes;
    if (t && typeof t.darkMode === 'boolean') return this.apply(t.darkMode);
    this.apply(this.mq && this.mq.matches);
  },
  /* zmiana systemowa: przy profilu „auto” od razu (HA i tak zaktualizuje hass chwilę później), przy wymuszonym – bez zmian */
  _sys() {
    if (this._ov()) return;
    const sel = this._h && this._h.selectedTheme;
    if (!sel || sel.dark === undefined || sel.dark === null) this.apply(this.mq.matches);
  },
};
if (HGTheme.mq && !HGTheme._bound) {
  HGTheme._bound = true;
  const f = () => HGTheme._sys();
  HGTheme.mq.addEventListener ? HGTheme.mq.addEventListener('change', f) : HGTheme.mq.addListener(f);
}
HGTheme.pick();
window.__hgTheme = HGTheme;

