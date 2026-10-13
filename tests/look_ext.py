"""Wygląd → Widoki / Integracje against a local HA. Usage: python tests/look_ext.py <token> [base] [with|without]
'with' expects kiosk-mode, custom-sidebar (+ /local/custom-sidebar-config.yaml) and card-mod registered as resources; 'without' expects none.
Checks: section renders, detection matches expectation, view toggle/reorder writes wiz.views, unavailable view shows a muted note,
generator honours the explicit view order (also unavailable views) and passes kiosk_mode through; no Nuvio page errors."""
import sys, json, time
from playwright.sync_api import sync_playwright
tok = sys.argv[1]; B = sys.argv[2] if len(sys.argv) > 2 else 'http://127.0.0.1:8124'; MODE = sys.argv[3] if len(sys.argv) > 3 else 'without'
FIND = """()=>{let p=null;const f=r=>{for(const el of r.querySelectorAll('*')){if(el.tagName==='NUVIO-PAGE'&&el.isConnected&&el.getBoundingClientRect().width){p=el;return}if(el.shadowRoot)f(el.shadowRoot);if(p)return}};f(document);window.__np=p;return !!p}"""
Q = """(code)=>{const f=new Function('r',code);const out=[];const w=r=>{const v=f(r);if(v!=null)out.push(v);r.querySelectorAll('*').forEach(e=>e.shadowRoot&&w(e.shadowRoot))};w(document);return out[0]}"""
fails = []
def check(c, m): print(('ok   ' if c else 'FAIL ') + m); c or fails.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    c = b.new_context(service_workers='block', viewport={'width': 1440, 'height': 900}, locale='pl-PL')
    t = {'access_token': tok, 'token_type': 'Bearer', 'expires_in': 1800000000, 'hassUrl': B, 'clientId': B + '/', 'expires': int(time.time() * 1000) + 1800000000000, 'refresh_token': 'x'}
    c.add_init_script("localStorage.setItem('hassTokens',%s);window.__hgDryRun=true;" % json.dumps(json.dumps(t)))
    pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:120] + ' @ ' + (e.stack or '')[:160]))
    pg.goto(B + '/nuvio-home/dashboard', wait_until='load')
    for i in range(30):
        time.sleep(1)
        if pg.evaluate(FIND): break
    time.sleep(2); pg.evaluate("()=>{const w=document.getElementById('hg-wiz');w&&w.remove()}")
    pg.evaluate("()=>window.__np._editEnter()"); time.sleep(1); pg.evaluate("()=>window.__np._eLook()"); time.sleep(3)
    rows = pg.evaluate(Q, "const s=[...r.querySelectorAll('.lx-r b')];if(s.length)return s.map(x=>x.textContent)")
    check(rows and 'Panel' in rows and 'Kiosk Mode' in rows, 'Widoki + Integracje rendered')
    det = pg.evaluate(Q, "const s=[...r.querySelectorAll('.lx-r')].filter(x=>x.querySelector('.lx-ok'));if(r.querySelector('.lx'))return s.map(x=>x.querySelector('b').textContent)")
    exp = ['Kiosk Mode', 'Custom Sidebar', 'card-mod'] if MODE == 'with' else []
    check(sorted(det or []) == sorted(exp), f'detected {det} == {exp}')
    if MODE == 'with': check(bool(pg.evaluate(Q, "if(r.querySelector('[data-hge=lx-k][data-k=hide_header]'))return 1")), 'kiosk toggles shown')
    else: check(not pg.evaluate(Q, "if(r.querySelector('[data-hge=lx-k]'))return 1"), 'no kiosk toggles without package')
    pg.evaluate("()=>{const L=window.HGLookX;L.M=Object.assign({},L.M,{media:[]});L.pend=null;window.__np._eLook()}"); time.sleep(.6)
    na = pg.evaluate(Q, "const x=[...r.querySelectorAll('.lx-r.na b')].map(b=>b.textContent+' '+b.nextElementSibling.textContent);if(r.querySelector('.lx'))return x")
    check(any('Multimedia' in x and 'Brak encji' in x for x in na or []), f'unavailable view muted with note: {na}')
    for code in ("r.querySelector('[data-hge=lx-up][data-v=kamery]')", "r.querySelector('[data-hge=lx-v][data-v=family]')", "r.querySelector('[data-hge=lx-apply]')"):
        pg.evaluate(Q, f"const b={code};if(b){{b.click();return 1}}"); time.sleep(.8)
    wz = pg.evaluate("()=>window.__hgL.data.wiz") or {}
    v = wz.get('views') or []
    check(bool(v) and 'family' not in v and 'kamery' in v and v[0] == 'dashboard', f'wiz.views saved {v}')
    g = pg.evaluate("async()=>{const c=await window.hgGenerate(window.__np._hass,{kiosk_mode:{hide_header:true},_wiz:{lang:'pl',views:['kamery','dashboard','energia']}});return [c.views.map(v=>v.path),c.kiosk_mode]}")
    check(g[0] == ['dashboard', 'kamery', 'energia'] and g[1] == {'hide_header': True}, f'generator order/kiosk {g}')
    own = [e for e in errs if 'nuvio' in e]
    check(not own, f'no Nuvio page errors {own}')
print('RESULT', 'PASS' if not fails else 'FAIL', fails); sys.exit(1 if fails else 0)
