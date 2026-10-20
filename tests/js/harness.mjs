import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const fixture = (n) => JSON.parse(readFileSync(join(ROOT, 'tests/js/fixtures', n + '.json'), 'utf8'));
/* Concatenates src/parts/<f> like tools/build.py (one scope) and evaluates it with the given globals; returns the requested names.
   subs: { EN, MANIFEST } replace the build placeholders the compiler fills. */
export function loadParts(files, globals = {}, names = [], subs = {}) {
  let src = files.map((f) => readFileSync(join(ROOT, 'src/parts', f), 'utf8')).join('\n');
  if (subs.EN !== undefined) src = src.replace('/*__HG_I18N_EN__*/null', JSON.stringify(subs.EN));
  if (subs.MANIFEST !== undefined) src = src.replace('/*__HG_I18N_MANIFEST__*/[]', JSON.stringify(subs.MANIFEST));
  return new Function(...Object.keys(globals), src + '; return {' + names.join(',') + '}')(...Object.values(globals));
}
