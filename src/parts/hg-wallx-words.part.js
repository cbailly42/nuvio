/* Word Clock screensaver (wallx style: 'words').
   English-only iteration 1 - phrase logic in HGWall.wdPhrase(), tested separately.
   Grid: 10 rows x 11 cols = 110 letter cells. Lit cells use class 'on'.
   Language note: word data is English-only in this iteration; locale key wallx.styles.words
   is already present in all four locale files for the UI label. */

/* DATA - word grid layout (not UI copy).
   Row 0:  I T I S H A L F T E N
   Row 1:  Q U A R T E R T W E N
   Row 2:  T Y F I V E P A S T O
   Row 3:  T O O N E T W O S I X
   Row 4:  T H R E E F O U R X X
   Row 5:  F I V E S E V E N X X
   Row 6:  E I G H T E L E V E N
   Row 7:  T W E L V E N I N E X
   Row 8:  T E N O C L O C K X X
   Row 9:  X X X X X X X X X X X
*/
const WD_COLS = 11;
const WD_LETTERS =
  'ITISHALFTEN' +
  'QUARTERTWEN' +
  'TYFIVEPASTO' +
  'TOONETOWSIX' +
  'THREEFOURXX' +
  'FIVESEVENXX' +
  'EIGHTELEVEN' +
  'TWELVENINEX' +
  'TENOCKLOCKX' +
  'XXXXXXXXXXX';

/* Named word positions [startIndex, length] within the 110-cell flat grid */
const WD_W = {
  it:      [0,  2],   /* IT      R0[0-1]  */
  is:      [2,  2],   /* IS      R0[2-3]  */
  half:    [4,  4],   /* HALF    R0[4-7]  */
  tenMin:  [8,  3],   /* TEN     R0[8-10] */
  quarter: [11, 7],   /* QUARTER R1[0-6]  */
  twenty:  [18, 6],   /* TWENTY  R1[7-10]+R2[0-1] */
  fiveMin: [24, 4],   /* FIVE    R2[2-5]  */
  past:    [28, 4],   /* PAST    R2[6-9]  */
  to:      [33, 2],   /* TO      R3[0-1]  */
  one:     [35, 3],   /* ONE     R3[2-4]  */
  two:     [38, 3],   /* TWO     R3[5-7]  */
  six:     [41, 3],   /* SIX     R3[8-10] */
  three:   [44, 5],   /* THREE   R4[0-4]  */
  four:    [49, 4],   /* FOUR    R4[5-8]  */
  fiveHr:  [55, 4],   /* FIVE    R5[0-3]  */
  seven:   [59, 5],   /* SEVEN   R5[4-8]  */
  eight:   [66, 5],   /* EIGHT   R6[0-4]  */
  eleven:  [71, 6],   /* ELEVEN  R6[5-10] */
  twelve:  [77, 6],   /* TWELVE  R7[0-5]  */
  nine:    [83, 4],   /* NINE    R7[6-9]  */
  tenHr:   [88, 3],   /* TEN     R8[0-2]  */
  oclock:  [91, 6],   /* OCLOCK  R8[3-8]  note: spells O-C-L-O-C-K (no apostrophe in grid) */
};

const WD_HR_NAMES = [null,'one','two','three','four','fiveHr','six','seven','eight','nine','tenHr','eleven','twelve'];

function wdExpand(name) {
  const [s, l] = WD_W[name];
  return Array.from({ length: l }, (_, i) => s + i);
}

/* Pure phrase function: returns sorted array of lit cell indices for given hour (0-23) and minute (0-59).
   Minutes are rounded to nearest 5; boundary cases advance the hour. */
HGWall.wdPhrase = function(h, m) {
  let rm = Math.round(m / 5) * 5;
  let rh = h % 12 || 12;
  if (rm === 60) { rm = 0; rh = (rh % 12) + 1; }

  const lit = [...wdExpand('it'), ...wdExpand('is')];

  if (rm === 0) {
    lit.push(...wdExpand(WD_HR_NAMES[rh]), ...wdExpand('oclock'));
  } else {
    const isPast = rm <= 30;
    const minParts = {
      5:  ['fiveMin'],
      10: ['tenMin'],
      15: ['quarter'],
      20: ['twenty'],
      25: ['twenty', 'fiveMin'],
      30: ['half'],
      35: ['twenty', 'fiveMin'],
      40: ['twenty'],
      45: ['quarter'],
      50: ['tenMin'],
      55: ['fiveMin'],
    }[rm] || [];

    for (const w of minParts) lit.push(...wdExpand(w));
    lit.push(...wdExpand(isPast ? 'past' : 'to'));

    const dispHr = isPast ? rh : (rh % 12) + 1;
    lit.push(...wdExpand(WD_HR_NAMES[dispHr]));
  }

  return [...new Set(lit)].sort((a, b) => a - b);
};

/* Build the grid HTML once (110 <span> cells) */
function wdGridHtml() {
  return WD_LETTERS.split('').map((ch, i) =>
    `<span class="nx-wd-c" data-i="${i}">${ch}</span>`
  ).join('');
}

HGWall.xsDef('words', hgTLazy('wallx.styles.words'), false, {
  cls: 'wd',
  css: `
.nx-wd{ background:${K(0,0,0,1)}; }
.nx-wd .nx-in{ gap:clamp(10px,2.2vmin,24px); }
.nx-wd-grid{
  display:grid;
  grid-template-columns:repeat(${WD_COLS},1fr);
  gap:clamp(2px,.5vmin,6px);
  width:min(94vmin,640px);
  font-size:clamp(14px,4.2vmin,52px);
  font-weight:600;
  letter-spacing:.06em;
  line-height:1;
  user-select:none;
}
.nx-wd-c{
  display:flex;
  align-items:center;
  justify-content:center;
  aspect-ratio:1;
  color:${K(255,255,255,1)};
  opacity:.18;
  text-shadow:none;
  transition:opacity .4s ease, text-shadow .4s ease;
}
.nx-wd-c.on{
  opacity:1;
  text-shadow:0 0 12px var(--hg-accent,${K(255,255,255,.6)}),0 1px 4px ${K(0,0,0,.3)};
}
.nx-wd .nx-dt{
  font-size:clamp(13px,2.4vmin,22px);
  font-weight:400;
  letter-spacing:.04em;
  opacity:.7;
  text-shadow:0 1px 4px ${K(0,0,0,.4)};
}
.nx-wd .nx-wx{ opacity:.8; }
`,
  body() {
    return `<div class="nx-in"><div class="nx-wd-grid" role="img" aria-label="">${wdGridHtml()}</div><p class="nx-dt"></p><div class="nx-wx" hidden></div><time class="nx-t" style="display:none" aria-hidden="true"></time></div>`;
  },
  draw(root, T, d, rm) {
    const h = d.getHours(), m = d.getMinutes();
    const key = `${h}:${m < 10 ? '0' : ''}${m}`;
    if (root.dataset.wdMin === key) return;
    root.dataset.wdMin = key;

    const lit = new Set(HGWall.wdPhrase(h, m));
    const cells = root.querySelectorAll('.nx-wd-c');
    cells.forEach((c) => {
      const on = lit.has(+c.dataset.i);
      if (on !== c.classList.contains('on')) {
        if (on) c.classList.add('on'); else c.classList.remove('on');
      }
    });

    /* Update accessibility label with human-readable time */
    const grid = root.querySelector('.nx-wd-grid');
    if (grid) grid.setAttribute('aria-label', T.t);
  },
});
