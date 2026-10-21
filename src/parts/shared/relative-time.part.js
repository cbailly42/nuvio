/* shared/relative-time: Czas względny („5 min temu”). */
const hgRel = (d) => {
  const m = Math.max(0, Math.round((Date.now() - d) / 60000));
  if (m < 1) return hgT('common.just_now'); if (m < 60) return hgT('common.ago_minutes', { m });
  const h = Math.round(m / 60); if (h < 24) return hgT('common.ago_hours', { h });
  const dd = Math.round(h / 24); return dd === 1 ? hgT('shared.relative_time.yesterday') : hgT('shared.relative_time.days_ago', { count: dd });
};
