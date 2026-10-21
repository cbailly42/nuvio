class HGDemoCard extends HGBase {
  defaults() { return { title: hgT('cards.demo.title'), icon: 'mdi:star', unit: 'kWh' }; }
  render() { const el = this.$('.x'); el.textContent = '23 %'; el.title = HG_DEMO_T.save; }
}
