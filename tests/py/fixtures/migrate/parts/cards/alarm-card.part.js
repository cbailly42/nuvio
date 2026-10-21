class HGAlarmCard {
  render() {
    const a = hgTr('Zapisz', 'Save');
    const b = hgTr('Anuluj', 'Cancel');
    const c = hgTr(`${m} min temu`, `${m} min ago`);
    const d = hgTr(`${a.b} min temu`, `${a.b} min ago`);
    const e = hgTr('Język: ', 'Language: ') + name;
    const f = hgTr({ pl: 'x', en: 'y' }, { pl: 'x', en: 'y' });
    const g = hgTr(['a', 'b'], ['c', 'd']);
    const h = n === 1 ? hgTr('encja', 'entity') : hgTr('encji', 'entities');
    const i = hgTr('Zamknij', 'Close');
    const j = hgTr('Zamknięte', 'Close');
    const k = hgTr('Hello there my good friend', 'Hello there my good friend');
    const l = L('nie', 'tłumaczenie');
    const ov = hgTrLazy('Domyślne', 'Default');
  }
}
