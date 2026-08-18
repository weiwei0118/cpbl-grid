(() => {
  // 顯示名稱一律以目前／最新登錄名為準；舊名只保留作為搜尋別名。
  // 大多數球員直接使用 players.csv 的 Name；下列為需要強制指定最新名稱的球員。
  const NAME_OVERRIDES = new Map([
    ['0000000045', '林智勝'],       // 舊名：林智盛
    ['0000000121', '羅力'],         // 舊登錄名：雷力
    ['0000000128', '朱承洋'],       // 舊名：朱俊祥
    ['0000000361', '張洺瑀'],       // 舊名：張冠廷
    ['0000002278', '王定穎'],       // 舊名：王玉譜
    ['0000002347', '王浩原'],       // 舊名：王尉永
    ['0000005522', '朱迦恩'],       // 舊名：羅暐捷
    ['0000005546', '拿莫伊漾'],     // 舊名：朱祥麟
    ['0000005561', '李建勳'],       // 舊字形：李建勲
    ['0000006739', '李東洺'],       // 舊名：李子強
    ['0000006853', '林禹叡']        // 舊名：林耀煌
  ]);

  // 額外舊名別名。即使歷史 CSV 某一年沒有留下舊名，也仍可用舊名搜尋。
  const EXTRA_ALIASES = new Map([
    ['0000000045', ['林智盛']],
    ['0000000121', ['雷力']],
    ['0000000128', ['朱俊祥']],
    ['0000000361', ['張冠廷']],
    ['0000002278', ['王玉譜']],
    ['0000002347', ['王尉永']],
    ['0000005522', ['羅暐捷']],
    ['0000005546', ['朱祥麟']],
    ['0000005561', ['李建勲']],
    ['0000006739', ['李子強']],
    ['0000006853', ['林耀煌']]
  ]);

  function cleanName(name) {
    if (typeof chineseDisplayName === 'function') return chineseDisplayName(name);
    return String(name || '').trim();
  }

  function canonicalName(player) {
    if (!player) return '';
    const id = String(player.i);
    const forced = NAME_OVERRIDES.get(id);
    if (forced) return forced;

    const names = (player.n || []).map(cleanName).filter(Boolean);
    return names[names.length - 1] || '';
  }

  function aliasesFor(player) {
    const aliases = new Set();
    (player.n || []).forEach(name => {
      const raw = String(name || '').trim();
      const cleaned = cleanName(raw);
      if (raw) aliases.add(raw.toLowerCase());
      if (cleaned) aliases.add(cleaned.toLowerCase());
    });
    (EXTRA_ALIASES.get(String(player.i)) || []).forEach(name => aliases.add(String(name).toLowerCase()));
    const current = canonicalName(player);
    if (current) aliases.add(current.toLowerCase());
    return aliases;
  }

  // 可以輸入舊名，但搜尋結果與最後填入棋盤都只顯示最新名稱。
  doSearch = function (query) {
    const q = String(query || '').trim().toLowerCase();
    const results = document.getElementById('results');
    if (!results) return;
    results.innerHTML = '';
    if (!q) return;

    const groups = new Map();
    PLAYERS.forEach(player => {
      const current = canonicalName(player);
      if (!current) return;
      if (![...aliasesFor(player)].some(alias => alias.includes(q))) return;
      if (!groups.has(current)) groups.set(current, new Map());
      groups.get(current).set(player.i, player);
    });

    [...groups.entries()]
      .sort((a, b) => {
        const ap = a[0].toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b[0].toLowerCase().startsWith(q) ? 0 : 1;
        return ap - bp || a[0].localeCompare(b[0], 'zh-Hant');
      })
      .slice(0, 70)
      .forEach(([displayName, playerMap]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'result';
        btn.textContent = displayName;
        btn.addEventListener('click', () => submitPlayer(displayName, [...playerMap.values()]));
        results.appendChild(btn);
      });
  };

  // 任何流程最後送進棋盤前，再強制轉一次最新名稱。
  const baseSubmitPlayer = submitPlayer;
  submitPlayer = function (name, candidates) {
    if (Array.isArray(candidates) && candidates.length) {
      const forcedNames = [...new Set(candidates.map(canonicalName).filter(Boolean))];
      if (forcedNames.length === 1) name = forcedNames[0];
    }
    return baseSubmitPlayer(name, candidates);
  };

  window.CPBLName = {
    canonical(id) {
      const player = PLAYERS.find(p => String(p.i) === String(id));
      return canonicalName(player);
    },
    overrides: Object.fromEntries(NAME_OVERRIDES)
  };
})();
