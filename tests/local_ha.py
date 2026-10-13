"""Smoke test Nuvio against a local HA (default http://127.0.0.1:8124). Usage: python tests/local_ha.py <token> [base] [tag]"""
import sys, json, time, os
from playwright.sync_api import sync_playwright
tok = sys.argv[1]; B = sys.argv[2] if len(sys.argv) > 2 else 'http://127.0.0.1:8124'; TAG = sys.argv[3] if len(sys.argv) > 3 else 'empty'
OUT = os.path.join(os.path.dirname(__file__), 'out') + '/'
FIND = """()=>{let p=null;const f=r=>{for(const el of r.querySelectorAll('*')){if(el.tagName==='NUVIO-PAGE'&&el.isConnected&&el.getBoundingClientRect().width){p=el;return}if(el.shadowRoot)f(el.shadowRoot);if(p)return}};f(document);window.__np=p;return !!p}"""
def ctx(b, W, H, sch, wiz=None):
    c = b.new_context(service_workers='block', viewport={'width': W, 'height': H}, color_scheme=sch, has_touch=W < 600, is_mobile=W < 600, locale='pl-PL')
    t = {'access_token': tok, 'token_type': 'Bearer', 'expires_in': 1800000000, 'hassUrl': B, 'clientId': B + '/', 'expires': int(time.time() * 1000) + 1800000000000, 'refresh_token': 'x'}
    c.add_init_script("localStorage.setItem('hassTokens',%s);window.__hgDryRun=%s;" % (json.dumps(json.dumps(t)), 'true' if wiz is None else 'false'))
    return c
R = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for W, H in ((1440, 900), (390, 844)):
        for sch in ('dark', 'light'):
            c = ctx(b, W, H, sch); pg = c.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:200]) if m.type == 'error' else None)
            pg.goto(B + '/nuvio-home/dashboard', wait_until='load')
            ok = False
            for i in range(30):
                time.sleep(1)
                if pg.evaluate(FIND): ok = True; break
            time.sleep(3)
            wiz = pg.evaluate("()=>!!document.getElementById('hg-wiz')")
            pg.screenshot(path=OUT + f'{TAG}_dashboard{"_wizard" if wiz else ""}_{sch}_{W}.png')
            info = pg.evaluate("()=>{const p=window.__np;if(!p)return null;return {views:(p._config.tabs||[]).map(t=>t.label),rail:(p._config.rail||[]).length,cards:(p._cards||[]).map(c=>c.tagName.toLowerCase()),wiz:!!document.getElementById('hg-wiz')}}")
            if wiz:
                pg.evaluate("()=>document.querySelector('#hg-wiz [data-x=skip]').click()"); time.sleep(1.5)
                pg.screenshot(path=OUT + f'{TAG}_dashboard_{sch}_{W}.png')
            for v in ('rooms', 'multimedia', 'kamery', 'family', 'pokoj?area=salon'):
                pg.goto(B + '/nuvio-home/' + v, wait_until='load'); time.sleep(6); pg.evaluate(FIND)
                pg.screenshot(path=OUT + f'{TAG}_{v.split("?")[0]}_{sch}_{W}.png'); pg.evaluate("()=>{const w=document.getElementById('hg-wiz');w&&w.remove()}")
            R[f'{W}_{sch}'] = {'found': ok, 'info': info, 'errs': [e for e in errs if 'nuvio' in e.lower() or 'hg' in e.lower() or 'TypeError' in e][:6]}
            c.close()
print(json.dumps(R, ensure_ascii=False, indent=1))
