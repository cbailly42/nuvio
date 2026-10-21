/* ===== ui/switch: przełącznik (zielony tor, biała gałka na sprężynie). Ten sam wygląd co .tg w HG_BASE, z ruchem z tokenów. ===== */
hgUI.add(`
.tg{ transition: background var(--hg-t-base) var(--hg-ease-out), box-shadow var(--hg-t-base) var(--hg-ease-out); }
.tg i{ transition: transform var(--hg-t-slow) var(--hg-spring, cubic-bezier(.3,.7,.3,1)), width var(--hg-t-fast) var(--hg-ease-out); }
.tg:active i{ width:19u; } .tg.on:active i{ transform: translateX(11u); }
.tg:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
`);
/* hgUI.switch(on, 'tog', 'Salon', disabled, data) */
hgUI.switch = (on, act, label, disabled, data) => `<button class="tg ${on ? 'on' : ''}" type="button" role="switch" aria-checked="${!!on}" aria-label="${H.esc(label || hgT('ui.switch.toggle'))}"${hgUI.act(act, data)}${disabled ? ' disabled' : ''}><i></i></button>`;
