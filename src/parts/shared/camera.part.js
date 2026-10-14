/* shared/camera: Wspólne dla kart kamer: wykrywanie niedostępnej kamery. */
const hgCamUn = (s) => !s || s.state === 'unavailable' || s.state === 'unknown';
