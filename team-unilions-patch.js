(() => {
  const CANONICAL = '統一7-ELEVEn獅';
  const OLD_NAMES = new Set(['統一獅', '統一7-ELEVEn獅']);
  let applied = false;

  function applyPatch() {
    if (applied) return true;
    if (typeof CRITERIA === 'undefined' || typeof CSET === 'undefined' || typeof state === 'undefined') return false;
    if (!Array.isArray(CRITERIA) || CRITERIA.length === 0) return false;

    const lions = CRITERIA.filter(c => c.kind === 'team' && OLD_NAMES.has(c.label));
    if (!lions.length) return false;

    const mergedPlayers = new Set();
    lions.forEach(c => (c.players || []).forEach(id => mergedPlayers.add(id)));

    CRITERIA = CRITERIA.filter(c => !(c.kind === 'team' && OLD_NAMES.has(c.label)));
    CRITERIA.push({
      id: `team:${CANONICAL}`,
      label: CANONICAL,
      kind: 'team',
      players: [...mergedPlayers]
    });

    CSET = new Map(CRITERIA.map(c => [c.id, new Set(c.players)]));

    // Regenerate the current puzzle so the old label can never remain on screen.
    state.solved = {};
    state.history = {};
    state.selected = null;
    state.editKey = null;
    if (typeof closePlayer === 'function') closePlayer();
    if (typeof closeEdit === 'function') closeEdit();
    if (typeof closeComplete === 'function') closeComplete();
    if (typeof buildPuzzle === 'function' && buildPuzzle()) {
      if (typeof render === 'function') render();
    }

    applied = true;
    return true;
  }

  const timer = setInterval(() => {
    if (applyPatch()) clearInterval(timer);
  }, 100);

  // Stop polling after one minute if the data source itself failed to load.
  setTimeout(() => clearInterval(timer), 60000);
})();
