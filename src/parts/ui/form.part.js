/* ===== ui/form: biblioteka pól formularza Nuvio. Jedno źródło dla edytora, ustawień i kart; żadnych gołych kontrolek przeglądarki.
   hgForm.text / num / area / toggle / select / color / more / field zwracają HTML; style w HG_FORM_CSS (hg-styles), przełącznik to element <hg-check>.
   <hg-check> zachowuje się jak checkbox (checked, disabled, type, zdarzenia input i change), więc istniejący kod czytający .checked działa bez zmian. ===== */
class HGCheck extends HTMLElement {
  static get formAssociated() { return true; }
  static get observedAttributes() { return ['checked', 'disabled']; }
  constructor() { super(); const r = this.attachShadow({ mode: 'open' }); try { this._int = this.attachInternals(); } catch (e) { /* starsze przeglądarki */ }
    r.innerHTML = `<style>
:host{ position:relative; display:inline-block; flex:none; width:48px; height:28px; border-radius:999px; cursor:pointer; outline:none; vertical-align:middle; -webkit-tap-highlight-color:transparent;
  background:rgba(120,120,128,.30); box-shadow:inset 0 0 0 1px rgba(255,255,255,.10); transition:background var(--hg-t-base, 200ms) var(--hg-ease-out, ease-out), box-shadow var(--hg-t-base, 200ms); }
:host([checked]){ background:var(--hg-accent, #63D71E); box-shadow:0 0 12px var(--hg-accent-glow, transparent); }
:host(:focus-visible){ box-shadow:0 0 0 2px var(--hg-glass-bg, transparent), 0 0 0 4px var(--hg-accent, #63D71E); }
:host([disabled]){ opacity:.45; cursor:not-allowed; }
i{ position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,.25);
  transition:transform var(--hg-t-slow, 320ms) var(--hg-spring, cubic-bezier(.3,.7,.3,1)), width var(--hg-t-fast, 120ms) var(--hg-ease-out, ease-out); }
:host([checked]) i{ transform:translateX(20px); } :host(:active:not([disabled])) i{ width:26px; } :host([checked]:active:not([disabled])) i{ transform:translateX(16px); }
:host::before{ content:''; position:absolute; inset:-8px -4px; }
@media (prefers-reduced-motion: reduce){ :host, i{ transition:none; } }
</style><i></i>`;
    this.addEventListener('click', (e) => { e.stopPropagation(); this._flip(); });
    this.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this._flip(); } }); }
  connectedCallback() { this.setAttribute('role', 'switch'); if (!this.hasAttribute('tabindex')) this.tabIndex = this.disabled ? -1 : 0; this._sync(); }
  attributeChangedCallback() { this._sync(); }
  get checked() { return this.hasAttribute('checked'); } set checked(v) { this.toggleAttribute('checked', !!v); }
  get disabled() { return this.hasAttribute('disabled'); } set disabled(v) { this.toggleAttribute('disabled', !!v); }
  get type() { return 'checkbox'; } get value() { return this.checked ? 'on' : ''; } get name() { return this.getAttribute('name') || ''; }
  _sync() { this.setAttribute('aria-checked', String(this.checked)); if (this.disabled) this.setAttribute('aria-disabled', 'true'); else this.removeAttribute('aria-disabled'); if (this._int && this._int.setFormValue) this._int.setFormValue(this.checked ? 'on' : null); }
  _flip() { if (this.disabled) return; this.checked = !this.checked; if (typeof H !== 'undefined' && H.haptic) H.haptic();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true })); this.dispatchEvent(new Event('change', { bubbles: true, composed: true })); }
}
if (!customElements.get('hg-check')) customElements.define('hg-check', HGCheck);
/* a: gotowe atrybuty (już z H.esc po stronie wywołującego), np. 'data-o="title" name="n"' */
const hgForm = {
  field: (label, ctl, o = {}) => `<${o.div ? 'div' : 'label'} class="hs-fl${o.cls ? ' ' + o.cls : ''}"><span>${o.raw ? label : H.esc(label)}</span>${ctl}${o.hint ? `<small class="nf-hint">${H.esc(o.hint)}</small>` : ''}</${o.div ? 'div' : 'label'}>`,
  text: (o = {}) => `<span class="hs-s">${o.icon ? H.icon(o.icon) : ''}<input class="hs-in" type="${o.type || 'text'}"${o.num ? ' inputmode="decimal"' : ''} value="${H.esc(o.value ?? '')}" placeholder="${H.esc(o.ph || '')}" autocomplete="off" ${o.a || ''}>${o.after || ''}</span>`,
  num: (o = {}) => hgForm.text(Object.assign({}, o, { num: 1 })),
  area: (o = {}) => `<textarea class="nf-area${o.code ? ' code' : ''}" rows="${o.rows || 5}" spellcheck="${o.code ? 'false' : 'true'}" placeholder="${H.esc(o.ph || '')}" ${o.a || ''}>${H.esc(o.value ?? '')}</textarea>`,
  toggle: (label, on, a = '', o = {}) => `<label class="nf-row">${o.icon ? H.icon(o.icon) : ''}<span>${H.esc(label)}${o.sub ? `<small>${H.esc(o.sub)}</small>` : ''}</span><hg-check ${a}${on ? ' checked' : ''}${o.disabled ? ' disabled' : ''} aria-label="${H.esc(label)}"></hg-check></label>`,
  select: (opts, val, a = '') => `<span class="hs-s"><select class="hs-in" ${a}>${opts.map(([v, l]) => `<option value="${H.esc(v)}"${String(v) === String(val ?? '') ? ' selected' : ''}>${H.esc(l)}</option>`).join('')}</select></span>`,
  color: (val, a = '') => `<input class="nf-color" type="color" value="${H.esc(val || '#63d71e')}" ${a}>`,
  more: (title, body, open, o = {}) => `<details class="nf-more"${open ? ' open' : ''} ${o.a || ''}><summary>${H.icon('mdi:chevron-right')}<span>${H.esc(title)}</span>${o.note ? `<small>${H.esc(o.note)}</small>` : ''}</summary><div class="nf-mb">${body}</div></details>`,
};
