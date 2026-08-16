const BASE = 'https://raw.githubusercontent.com/ldkrsi/cpbl-opendata/master/';

const TEAM_EQ = {
  '統一獅': ['統一獅', '統一7-ELEVEn獅']
};

const TEAM_PATCH = {
  '陳子豪': '味全龍（2021–）',
  '朱育賢': '味全龍（2021–）',
  '黃子鵬': '台鋼雄鷹',
  '林岱安': '富邦悍將',
  '江少慶': '統一獅',
  '王維中': '台鋼雄鷹',
  '劉時豪': '台鋼雄鷹',
  '賴智垣': '台鋼雄鷹',
  '林書逸': '富邦悍將'
};

const AWARDS = {
  '曾拿過全壘打王': ['魔鷹','吉力吉撈．鞏冠','朱育賢','林安可','張志豪','王柏融','高國輝','林益全','林智勝','陳金鋒','謝佳賢','張泰山','林仲秋','怪力男','鷹俠'],
  '曾拿過打擊王': ['吳念庭','林立','梁家榮','陳俊秀','陳傑憲','胡金龍','林益全','潘武雄','彭政閔','羅敏卿','怪力男','王光輝'],
  '曾拿過安打王': ['李凱威','邱智呈','劉基鴻','林立','王威晨','陳傑憲','朱育賢','胡金龍','林益全','張正偉','陳冠任','高國慶','張泰山','彭政閔','陳致遠','黃忠義','林易增'],
  '曾拿過打點王': ['吉力吉撈．鞏冠','魔鷹','廖健富','林立','朱育賢','林安可','林益全','蔣智賢','王柏融','林泓育','張泰山','謝佳賢','黃忠義','林仲秋'],
  '曾拿過盜壘王': ['李凱威','陳晨威','林立','王威晨','王勝偉','林智平','張正偉','鄭達鴻','張志豪','陽森','鄭兆行','黃甘霖','林易增']
};

let PLAYERS = [];
let CRITERIA = [];
let CSET = new Map();
const state = {
  rows: [],
  cols: [],
  solved: {},
  history: {},
  selected: null,
  editKey: null
};

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] || ''])));
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function fetchText(url) {
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function seasonStat(store, id, year) {
  if (!store.has(id)) store.set(id, new Map());
  const years = store.get(id);
  if (!years.has(year)) years.set(year, {});
  return years.get(year);
}

function addCriterion(id, label, kind, ids) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length) CRITERIA.push({ id, label, kind, players: unique });
}

function anySeason(store, id, test) {
  const years = store.get(id);
  return !!years && [...years.values()].some(test);
}

function careerTotal(store, id, key) {
  const years = store.get(id);
  let total = 0;
  if (years) years.forEach(s => total += num(s[key]));
  return total;
}

function usedPlayerIds() {
  return new Set(Object.values(state.solved).map(x => x.id));
}

function intersection(a, b, excludeUsed = true) {
  if (!a || !b) return [];
  const A = CSET.get(a.id);
  const B = CSET.get(b.id);
  if (!(A instanceof Set) || !(B instanceof Set)) return [];
  const used = excludeUsed ? usedPlayerIds() : null;
  const out = [];
  for (const id of A) {
    if (B.has(id) && (!used || !used.has(id))) out.push(id);
  }
  return out;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function validCriterion(c) {
  return !!c && CSET.get(c.id) instanceof Set && CSET.get(c.id).size > 0;
}

function buildPuzzle() {
  const teams = CRITERIA.filter(c => c.kind === 'team' && validCriterion(c));
  const nonTeams = CRITERIA.filter(c => c.kind !== 'team' && validCriterion(c));

  for (let attempt = 0; attempt < 5000; attempt++) {
    const rows = shuffle([...shuffle(teams).slice(0, 2), ...shuffle(nonTeams).slice(0, 1)]);
    const usedIds = new Set(rows.map(c => c.id));
    const cols = shuffle([
      ...shuffle(teams.filter(c => !usedIds.has(c.id))).slice(0, 2),
      ...shuffle(nonTeams.filter(c => !usedIds.has(c.id))).slice(0, 1)
    ]);
    if (rows.length !== 3 || cols.length !== 3) continue;
    if (rows.every(r => cols.every(c => intersection(r, c, false).length > 0))) {
      state.rows = rows;
      state.cols = cols;
      return true;
    }
  }

  const all = [...teams, ...nonTeams];
  for (let attempt = 0; attempt < 3000; attempt++) {
    const six = shuffle(all).slice(0, 6);
    if (six.length < 6) break;
    const rows = six.slice(0, 3);
    const cols = six.slice(3, 6);
    if (rows.every(r => cols.every(c => intersection(r, c, false).length > 0))) {
      state.rows = rows;
      state.cols = cols;
      return true;
    }
  }
  return false;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function chineseDisplayName(raw) {
  let name = String(raw || '').trim();
  name = name.replace(/[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*/g, '');
  name = name.replace(/[_.\-]/g, '').replace(/\s+/g, '');
  const parts = name.match(/[\u3400-\u9FFF．・·]+/g);
  return parts ? parts.join('') : '';
}

function historyFor(key) {
  return state.history[key] || [];
}

function recordPick(key, pick) {
  if (!state.history[key]) state.history[key] = [];
  state.history[key].push({
    id: pick.id,
    name: pick.name,
    order: state.history[key].length + 1
  });
}

function isComplete() {
  return Object.keys(state.solved).length === 9;
}

function openComplete() {
  document.getElementById('completeModal').classList.add('open');
}

function closeComplete() {
  document.getElementById('completeModal').classList.remove('open');
}

function closeEdit() {
  document.getElementById('editModal').classList.remove('open');
  state.editKey = null;
}

function render() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  const score = document.createElement('div');
  score.className = 'score';
  score.innerHTML = '<span>稀有度分數：</span><strong>—</strong>';
  grid.appendChild(score);

  state.cols.forEach(c => {
    const el = document.createElement('div');
    el.className = `crit ${c.kind}`;
    el.textContent = c.label;
    grid.appendChild(el);
  });

  state.rows.forEach((r, ri) => {
    const head = document.createElement('div');
    head.className = `crit ${r.kind}`;
    head.textContent = r.label;
    grid.appendChild(head);

    state.cols.forEach((c, ci) => {
      const key = `${ri}-${ci}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell' + (state.solved[key] ? ' solved' : '');

      if (state.solved[key]) {
        const name = state.solved[key].name;
        btn.innerHTML = `<span class="rarity">—</span><span class="avatar">${esc([...name][0] || '⚾')}</span><span class="namebar">${esc(name)}</span>`;
        btn.title = '點一下可以更換球員或查看填答紀錄';
        btn.addEventListener('click', () => openEditCell(ri, ci));
      } else {
        btn.innerHTML = '<span class="plus">+</span>';
        btn.addEventListener('click', () => openCell(ri, ci));
      }
      grid.appendChild(btn);
    });
  });
}

function renderInlineHistory(key) {
  const box = document.getElementById('cellHistoryInline');
  const history = historyFor(key);
  if (!history.length) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  box.hidden = false;
  box.innerHTML = `<strong>這格曾填過：</strong>${history.map(x => esc(x.name)).join('、')}`;
}

function openCell(r, c) {
  const a = state.rows[r];
  const b = state.cols[c];
  if (!a || !b) return;
  const key = `${r}-${c}`;
  state.selected = { a, b, key };
  document.getElementById('pair').textContent = `${a.label} × ${b.label}`;
  renderInlineHistory(key);
  document.getElementById('possible').textContent = `共有 ${intersection(a, b, false).length} 位可能球員`;
  document.getElementById('search').value = '';
  document.getElementById('results').innerHTML = '';
  document.getElementById('msg').textContent = '';
  document.getElementById('playerModal').classList.add('open');
  setTimeout(() => document.getElementById('search').focus(), 30);
}

function closePlayer() {
  document.getElementById('playerModal').classList.remove('open');
  state.selected = null;
}

function openEditCell(r, c) {
  const key = `${r}-${c}`;
  const current = state.solved[key];
  if (!current) {
    openCell(r, c);
    return;
  }

  state.editKey = key;
  document.getElementById('editPair').textContent = `${state.rows[r].label} × ${state.cols[c].label}`;
  document.getElementById('editCurrent').textContent = current.name;

  const historyBox = document.getElementById('editHistory');
  const history = historyFor(key);
  historyBox.innerHTML = '';

  if (!history.length) {
    historyBox.innerHTML = '<div class="history-item"><span>尚無歷史紀錄</span></div>';
  } else {
    history.forEach((item, index) => {
      const row = document.createElement('div');
      const isCurrent = index === history.length - 1 && current.id === item.id && current.name === item.name;
      row.className = 'history-item' + (isCurrent ? ' current' : '');
      row.innerHTML = `<span>${esc(item.name)}</span><span class="history-tag">${isCurrent ? '目前使用' : `第 ${index + 1} 次填答`}</span>`;
      historyBox.appendChild(row);
    });
  }

  document.getElementById('editModal').classList.add('open');
}

function clearAndReplace() {
  const key = state.editKey;
  if (!key || !state.solved[key]) return;
  delete state.solved[key];
  closeComplete();
  closeEdit();
  render();

  const [r, c] = key.split('-').map(Number);
  openCell(r, c);
}

function doSearch(q) {
  q = q.trim().toLowerCase();
  const results = document.getElementById('results');
  results.innerHTML = '';
  if (!q) return;

  const groups = new Map();
  PLAYERS.forEach(player => {
    player.n.forEach(rawName => {
      const display = chineseDisplayName(rawName);
      if (!display) return;
      if (!rawName.toLowerCase().includes(q) && !display.toLowerCase().includes(q)) return;
      if (!groups.has(display)) groups.set(display, new Map());
      groups.get(display).set(player.i, player);
    });
  });

  [...groups.entries()]
    .sort((a, b) => {
      const ap = a[0].toLowerCase().startsWith(q) ? 0 : 1;
      const bp = b[0].toLowerCase().startsWith(q) ? 0 : 1;
      return ap - bp || a[0].localeCompare(b[0], 'zh-Hant');
    })
    .slice(0, 70)
    .forEach(([display, playerMap]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'result';
      btn.textContent = display;
      btn.addEventListener('click', () => submitPlayer(display, [...playerMap.values()]));
      results.appendChild(btn);
    });
}

function submitPlayer(name, candidates) {
  const s = state.selected;
  if (!s) return;
  const valid = new Set(intersection(s.a, s.b, false));
  const used = usedPlayerIds();
  const matching = candidates.filter(p => valid.has(p.i));
  const msg = document.getElementById('msg');

  if (!matching.length) {
    msg.className = 'msg bad';
    msg.textContent = `❌ ${name} 不符合這一格`;
    return;
  }

  const winner = matching.find(p => !used.has(p.i));
  if (!winner) {
    msg.className = 'msg dup';
    msg.textContent = `⚠️ ${name} 已經在其他格使用過了`;
    return;
  }

  const pick = { id: winner.i, name };
  state.solved[s.key] = pick;
  recordPick(s.key, pick);
  msg.className = 'msg good';
  msg.textContent = `✅ ${name} 正確`;
  render();

  if (isComplete()) {
    setTimeout(() => {
      closePlayer();
      openComplete();
    }, 450);
  } else {
    setTimeout(closePlayer, 350);
  }
}

async function loadData() {
  const loading = document.getElementById('loading');
  try {
    const [standingsText, playersText] = await Promise.all([
      fetchText(BASE + 'CPBL/standings.csv'),
      fetchText(BASE + 'players.csv')
    ]);

    const standings = parseCSV(standingsText);
    const teamMap = new Map();
    standings.forEach(x => teamMap.set(`${x.Year}|${x['Team ID']}`, x.Team));

    const metadata = parseCSV(playersText);
    const canonical = new Map(metadata.map(x => [x.ID, x.Name]));
    const players = new Map();
    const batting = new Map();
    const pitching = new Map();

    function getPlayer(id) {
      if (!players.has(id)) players.set(id, { i: id, n: new Set(), t: new Set() });
      return players.get(id);
    }

    const jobs = [];
    for (let year = 1990; year <= 2024; year++) {
      for (const type of ['battings', 'pitchings']) {
        jobs.push((async () => {
          const rows = parseCSV(await fetchText(`${BASE}CPBL/${type}/${year}.csv`));
          rows.forEach(x => {
            if (num(x.G) <= 0) return;
            const id = (x.ID || '').trim();
            const name = (x.Name || '').trim();
            if (!id || !name) return;

            const p = getPlayer(id);
            p.n.add(name);

            let team = teamMap.get(`${year}|${x['Team ID']}`) || x['Team Name'] || '';
            if (team === '味全龍') {
              if (year <= 1999) team = '味全龍（1990–1999）';
              else if (year >= 2021) team = '味全龍（2021–）';
            }
            if (team) p.t.add(team);

            const store = type === 'battings' ? batting : pitching;
            const stat = seasonStat(store, id, year);
            const keys = type === 'battings' ? ['H','HR','RBI','SB'] : ['W','SO','SV'];
            keys.forEach(k => stat[k] = (stat[k] || 0) + num(x[k]));
          });
        })());
      }
    }
    await Promise.all(jobs);

    players.forEach((p, id) => {
      const latest = canonical.get(id);
      if (latest) p.n.add(latest);
    });

    const byName = new Map();
    players.forEach(p => p.n.forEach(name => {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(p);
    }));

    Object.entries(TEAM_PATCH).forEach(([name, team]) => {
      (byName.get(name) || []).forEach(p => p.t.add(team));
    });

    PLAYERS = [...players.values()].map(p => ({ i: p.i, n: [...p.n], t: [...p.t] }));
    CRITERIA = [];

    const teams = new Set();
    PLAYERS.forEach(p => p.t.forEach(t => teams.add(t)));
    [...teams].forEach(team => {
      const aliases = TEAM_EQ[team] || [team];
      addCriterion(`team:${team}`, team, 'team', PLAYERS.filter(p => aliases.some(t => p.t.includes(t))).map(p => p.i));
    });

    addCriterion('s20hr','單季 20+ 轟','stat', PLAYERS.filter(p => anySeason(batting,p.i,s => num(s.HR) >= 20)).map(p => p.i));
    addCriterion('s100h','單季 100+ 安','stat', PLAYERS.filter(p => anySeason(batting,p.i,s => num(s.H) >= 100)).map(p => p.i));
    addCriterion('s80rbi','單季 80+ 打點','stat', PLAYERS.filter(p => anySeason(batting,p.i,s => num(s.RBI) >= 80)).map(p => p.i));
    addCriterion('s30sb','單季 30+ 盜','stat', PLAYERS.filter(p => anySeason(batting,p.i,s => num(s.SB) >= 30)).map(p => p.i));
    addCriterion('s10w','單季 10+ 勝','stat', PLAYERS.filter(p => anySeason(pitching,p.i,s => num(s.W) >= 10)).map(p => p.i));
    addCriterion('s100k','單季 100+ 三振','stat', PLAYERS.filter(p => anySeason(pitching,p.i,s => num(s.SO) >= 100)).map(p => p.i));
    addCriterion('s20sv','單季 20+ 救援','stat', PLAYERS.filter(p => anySeason(pitching,p.i,s => num(s.SV) >= 20)).map(p => p.i));
    addCriterion('c100hr','生涯 100+ 轟','stat', PLAYERS.filter(p => careerTotal(batting,p.i,'HR') >= 100).map(p => p.i));
    addCriterion('c1000h','生涯 1000+ 安','stat', PLAYERS.filter(p => careerTotal(batting,p.i,'H') >= 1000).map(p => p.i));
    addCriterion('c100w','生涯 100+ 勝','stat', PLAYERS.filter(p => careerTotal(pitching,p.i,'W') >= 100).map(p => p.i));
    addCriterion('c1000k','生涯 1000+ 三振','stat', PLAYERS.filter(p => careerTotal(pitching,p.i,'SO') >= 1000).map(p => p.i));

    Object.entries(AWARDS).forEach(([label, names]) => {
      const ids = [];
      names.forEach(name => (byName.get(name) || []).forEach(p => ids.push(p.i)));
      addCriterion(`award:${label}`, label, 'award', ids);
    });

    CSET = new Map(CRITERIA.map(c => [c.id, new Set(c.players)]));
    if (!buildPuzzle()) throw new Error('無法產生有效題目');

    loading.hidden = true;
    document.getElementById('grid').hidden = false;
    document.getElementById('controls').hidden = false;
    render();
  } catch (err) {
    console.error(err);
    loading.textContent = `資料載入失敗，請重新整理頁面。 ${err.message}`;
  }
}

function resetCurrentPuzzle() {
  state.solved = {};
  state.history = {};
  state.selected = null;
  state.editKey = null;
  closePlayer();
  closeEdit();
  closeComplete();
  render();
}

function startNewPuzzle() {
  state.solved = {};
  state.history = {};
  state.selected = null;
  state.editKey = null;
  closePlayer();
  closeEdit();
  closeComplete();
  if (buildPuzzle()) render();
}

document.getElementById('search').addEventListener('input', e => doSearch(e.target.value));
document.getElementById('closePlayer').addEventListener('click', closePlayer);
document.getElementById('resetBtn').addEventListener('click', resetCurrentPuzzle);
document.getElementById('newBtn').addEventListener('click', startNewPuzzle);
document.getElementById('completeNewBtn').addEventListener('click', startNewPuzzle);
document.getElementById('completeCloseBtn').addEventListener('click', closeComplete);
document.getElementById('replacePlayerBtn').addEventListener('click', clearAndReplace);
document.getElementById('closeEditBtn').addEventListener('click', closeEdit);
document.getElementById('playerModal').addEventListener('click', e => {
  if (e.target.id === 'playerModal') closePlayer();
});
document.getElementById('editModal').addEventListener('click', e => {
  if (e.target.id === 'editModal') closeEdit();
});
document.getElementById('completeModal').addEventListener('click', e => {
  if (e.target.id === 'completeModal') closeComplete();
});

loadData();