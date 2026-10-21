/* shared/confirm: Okno potwierdzenia HGConfirm (karty i edytor) – alert dialog z ui/overlay, to samo API co dawniej. */
const HGConfirm = {
  ask(title, text, ok = hgT('shared.confirm.ok_button'), danger = true, info = false) { return hgOverlay.alert(title, text, ok, danger, info); },
};
window.HGConfirm = window.HGConfirm || HGConfirm;
