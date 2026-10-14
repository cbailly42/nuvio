/* shared/avatar: Awatar osoby (zdjęcie albo inicjały). */
/* ===================== PERSON ===================== */
const hgAvatar = (hass, e, cls = 'av') => {
  const s = H.st(hass, e); const nm = H.name(hass, e, e);
  const pic = s && s.attributes.entity_picture;
  const ini = nm.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  const hues = [32, 200, 280, 140, 350]; const h = hues[[...nm].reduce((a, ch) => a + ch.charCodeAt(0), 0) % hues.length];
  return pic ? `<span class="${cls}" style="background-image:url('${H.cssUrl(pic)}')"></span>`
    : `<span class="${cls} ini" style="background:hsl(${h},55%,50%)">${H.esc(ini)}</span>`;
};
