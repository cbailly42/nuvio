/* --- notatka (prosty markdown: **pogrubienie**, *kursywa*, listy "- ", nagłówki "# ") --- */
const hgMd = (t) => { const out = []; let ul = false;
  for (const raw of String(t || '').split(/\r?\n/)) { let l = H.esc(raw).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`(.+?)`/g, '<code>$1</code>');
    if (/^\s*[-*] /.test(raw)) { if (!ul) { out.push('<ul>'); ul = true; } out.push(`<li>${l.replace(/^\s*[-*] /, '')}</li>`); continue; }
    if (ul) { out.push('</ul>'); ul = false; }
    if (/^#{1,3} /.test(raw)) out.push(`<h3>${l.replace(/^#{1,3} /, '')}</h3>`); else if (raw.trim()) out.push(`<p>${l}</p>`); }
  if (ul) out.push('</ul>'); return out.join(''); };
class HGNoteCard extends HGBase {
  defaults() { return { title: null, icon: 'mdi:note-text-outline', text: '' }; }
  ents() { return []; }
  css() { return HG_G14_CSS + U(`.md{ font-size:14px; line-height:1.45; overflow:auto; min-height:0; overflow-wrap:anywhere; } .md p{ margin:0 0 6px; } .md h3{ margin:4px 0 6px; font-size:15px; } .md ul{ margin:0 0 6px; padding-left:18px; } .md code{ font-size:12.5px; padding:1px 5px; border-radius:6px; background:color-mix(in srgb, currentColor 10%, transparent); }`); }
  render() { const c = this._config;
    return `<ha-card class="glass">${c.title ? hgHead(c.icon || 'mdi:note-text-outline', c.title, '', true) : ''}<div class="md">${c.text ? hgMd(c.text) : `<div class="ph"><b>${hgTr('Pusta notatka', 'Empty note')}</b>${hgTr('Dodaj treść w polu „Treść”', 'Add text in the "Text" field')}</div>`}</div></ha-card>`; }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-note-card', HGNoteCard, hgTr('Home Glass – Notatka', 'Home Glass – Note'), hgTr('Tekst z prostym formatowaniem', 'Text with simple formatting'));
