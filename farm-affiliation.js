(() => {
  // 球隊效力不能只看一軍。這裡把中職二軍出賽也納入球隊履歷，
  // 但不把二軍成績算進「單季／生涯數據」條件。
  const BASE = 'https://raw.githubusercontent.com/ldkrsi/cpbl-opendata/master/CPBLFarm/';
  const YEARS = Array.from({ length: 20 }, (_, i) => 2005 + i); // 2005–2024

  function normalizeFarmTeam(raw) {
    const name = String(raw || '').trim().replace(/二軍$/u, '');
    const map = {
      'La New': 'La New熊',
      'Lamigo': 'Lamigo桃猿',
      '統一': '統一7-ELEVEn獅',
      '統一7-ELEVEn獅': '統一7-ELEVEn獅',
      '興農': '興農牛',
      '義大': '義大犀牛',
      '兄弟': '兄弟象',
      '中信': '中信鯨',
      '中信兄弟': '中信兄弟',
      '富邦': '富邦悍將',
      '富邦悍將': '富邦悍將',
      '樂天': '樂天桃猿',
      '樂天桃猿': '樂天桃猿',
      '味全': '味全龍（2021–）',
      '味全龍': '味全龍（2021–）',
      '台鋼雄鷹': '台鋼雄鷹'
    };
    return map[name] || null;
  }

  function parse(text) {
    if (typeof parseCSV === 'function') return parseCSV(text);
    return [];
  }

  async function fetchRows(type, year) {
    const res = await fetch(`${BASE}${type}/${year}.csv`, { cache: 'force-cache' });
    if (!res.ok) return [];
    return parse(await res.text());
  }

  function ensureTeamCriterion(team) {
    let c = CRITERIA.find(x => x.kind === 'team' && x.label === team);
    if (!c) {
      c = { id: `team:${team}`, label: team, kind: 'team', players: [] };
      CRITERIA.push(c);
    }
    return c;
  }

  async function applyFarmAffiliations() {
    if (typeof PLAYERS === 'undefined' || typeof CRITERIA === 'undefined' || typeof CSET === 'undefined') return false;
    if (!Array.isArray(PLAYERS) || !PLAYERS.length || !Array.isArray(CRITERIA) || !CRITERIA.length) return false;

    const byId = new Map(PLAYERS.map(p => [String(p.i), p]));
    const jobs = [];
    for (const year of YEARS) {
      jobs.push(fetchRows('battings', year).then(rows => ({ year, rows })));
      jobs.push(fetchRows('pitchings', year).then(rows => ({ year, rows })));
    }

    const batches = await Promise.all(jobs);
    const additions = new Map(); // player id -> Set(team)

    for (const { rows } of batches) {
      for (const row of rows) {
        if (Number(row.G || 0) <= 0) continue;
        const id = String(row.ID || '').trim();
        const player = byId.get(id);
        if (!player) continue; // 搜尋池仍只保留曾上一軍的球員
        const team = normalizeFarmTeam(row['Team Name']);
        if (!team) continue; // 排除代訓、業餘交流隊等非中職球團
        if (!additions.has(id)) additions.set(id, new Set());
        additions.get(id).add(team);
      }
    }

    let changed = false;
    for (const [id, teams] of additions) {
      const player = byId.get(id);
      if (!player) continue;
      if (!Array.isArray(player.t)) player.t = [];

      for (const team of teams) {
        if (!player.t.includes(team)) {
          player.t.push(team);
          changed = true;
        }
        const criterion = ensureTeamCriterion(team);
        if (!criterion.players.includes(player.i)) {
          criterion.players.push(player.i);
          changed = true;
        }
      }
    }

    if (changed) {
      CSET = new Map(CRITERIA.map(c => [c.id, new Set(c.players)]));
      if (typeof render === 'function') render();
    }

    window.CPBLFarmAffiliationReady = true;
    document.dispatchEvent(new CustomEvent('cpbl-farm-affiliations-ready'));
    return true;
  }

  let running = false;
  const poll = setInterval(async () => {
    if (running) return;
    if (typeof PLAYERS === 'undefined' || !Array.isArray(PLAYERS) || !PLAYERS.length) return;
    if (typeof CRITERIA === 'undefined' || !Array.isArray(CRITERIA) || !CRITERIA.length) return;
    running = true;
    clearInterval(poll);
    try {
      await applyFarmAffiliations();
    } catch (err) {
      console.error('二軍球隊履歷補正失敗：', err);
      window.CPBLFarmAffiliationReady = false;
    }
  }, 100);

  setTimeout(() => clearInterval(poll), 60000);
})();
