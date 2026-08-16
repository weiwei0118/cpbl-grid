(() => {
  // 顯示名稱一律以目前／最新登錄名為準；舊名只保留作為搜尋別名。
  // 大多數球員直接使用 players.csv 的 Name（它會在 app.js 中最後加入名稱集合）。
  // 下列為 players.csv 尚未同步、但中職官網已更新的名稱。
  const NAME_OVERRIDES = new Map([
    ['0000000045', '林智勝'],       // 原名／舊登錄：林智盛
    ['0000000128', '朱承洋'],       // 原名：朱俊祥
    ['0000000361', '張洺瑀'],       // 原名：張冠廷
    ['0000002278', '王定穎'],       // 原名：王玉譜
    ['0000002347', '王浩原'],       // 原名：王尉永（2026）
    ['0000005522', '朱迦恩'],       // 原名：羅暐捷（2025）
    ['0000005546', '拿莫伊漾'],     // 原名：朱祥麟
    ['0000005561', '李建勳'],       // 舊字形：李建勲
    ['0000006739', '李東洺'],       // 原名：李子強
    ['0000006853', '林禹叡']        // 原名：林耀煌（2025）
  ]);

  function cleanName(name) {
    if (typeof chineseDisplayName === 'function') {
      return chineseDisplayName(name);
    }
    return String(name || '').trim();
  }

  function canonicalName(player) {
    if (!player) return '';
    const forced = NAME_OVERRIDES.get(String(player.i));
    if (forced) return forced;

    // app.js 會在所有歷史名字載入完成後，再加入 players.csv 的 Name，
    // 因此最後一個中文名稱就是資料源中的最新名稱。
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
    const current = canonicalName(player);
    if (current) aliases.add(current.toLowerCase());
    return aliases;
  }

  // 取代原本搜尋：可以輸入舊名，但搜尋結果與最後填入棋盤都只顯示新名。
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
      const matched = [...aliasesFor(player)].some(alias => alias.includes(q));
      if (!matched) return;

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

  // 若其他流程直接呼叫 submitPlayer，也強制將名稱轉成該 player ID 的新名。
  const baseSubmitPlayer = submitPlayer;
  submitPlayer = function (name, candidates) {
    if (Array.isArray(candidates) && candidates.length) {
      const forcedNames = [...new Set(candidates.map(canonicalName).filter(Boolean))];
      if (forcedNames.length === 1) name = forcedNames[0];
    }
    return baseSubmitPlayer(name, candidates);
  };

  // 提供除錯用：瀏覽器 console 可輸入 CPBLName.canonical('ID') 查看名稱。
  window.CPBLName = {
    canonical(id) {
      const player = PLAYERS.find(p => String(p.i) === String(id));
      return canonicalName(player);
    },
    overrides: Object.fromEntries(NAME_OVERRIDES)
  };
})();
