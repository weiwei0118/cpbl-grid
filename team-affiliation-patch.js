(() => {
  // 補正「正式加盟球團，但未必曾在該球團一軍出賽」的球隊履歷。
  // 遊戲規則採正式加盟／簽約為準，不限一軍出賽紀錄。
  const EXTRA_AFFILIATIONS = [
    { id: '0000004632', name: '范柏絜', teams: ['Lamigo桃猿'] }
  ];

  let applied = false;

  function applyPatch() {
    if (applied) return true;
    if (typeof PLAYERS === 'undefined' || typeof CRITERIA === 'undefined' || typeof CSET === 'undefined') return false;
    if (!Array.isArray(PLAYERS) || !PLAYERS.length || !Array.isArray(CRITERIA) || !CRITERIA.length) return false;

    let changed = false;

    EXTRA_AFFILIATIONS.forEach(entry => {
      let player = PLAYERS.find(p => String(p.i) === entry.id);
      if (!player) {
        player = PLAYERS.find(p => Array.isArray(p.n) && p.n.some(n => String(n).trim() === entry.name));
      }
      if (!player) return;

      entry.teams.forEach(team => {
        if (!Array.isArray(player.t)) player.t = [];
        if (!player.t.includes(team)) {
          player.t.push(team);
          changed = true;
        }

        let criterion = CRITERIA.find(c => c.kind === 'team' && c.label === team);
        if (!criterion) {
          criterion = { id: `team:${team}`, label: team, kind: 'team', players: [] };
          CRITERIA.push(criterion);
          changed = true;
        }
        if (!criterion.players.includes(player.i)) {
          criterion.players.push(player.i);
          changed = true;
        }
      });
    });

    if (changed) {
      CSET = new Map(CRITERIA.map(c => [c.id, new Set(c.players)]));
      // 若目前題目正好包含受影響條件，只需重繪，不換題、不清答案。
      if (typeof render === 'function') render();
    }

    applied = true;
    return true;
  }

  const timer = setInterval(() => {
    if (applyPatch()) clearInterval(timer);
  }, 100);

  setTimeout(() => clearInterval(timer), 60000);
})();
