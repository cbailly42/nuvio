/* shared/media: Czy odtwarzacz jest aktywny. */
/* aktywny = coś gra / jest wstrzymane albo urządzenie włączone z treścią (np. dekoder Enigma2 ma stan „on” z kanałem) */
const hgMpActive = (s) => !!s && (['playing', 'paused', 'buffering'].includes(s.state) || (s.state === 'on' && !!(s.attributes.media_title || s.attributes.media_channel)));
