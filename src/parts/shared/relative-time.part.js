/* shared/relative-time: Czas względny („5 min temu”). */
const hgRel = (d) => {
  const m = Math.max(0, Math.round((Date.now() - d) / 60000));
  if (m < 1) return hgTr('przed chwilą', 'just now'); if (m < 60) return hgTr(`${m} min temu`, `${m} min ago`);
  const h = Math.round(m / 60); if (h < 24) return hgTr(`${h} godz. temu`, `${h} h ago`);
  const dd = Math.round(h / 24); return dd === 1 ? hgTr('wczoraj', 'yesterday') : hgTr(`${dd} dni temu`, `${dd} days ago`);
};
