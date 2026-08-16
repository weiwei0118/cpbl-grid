(() => {
  const BOARD_KEY = 'cpblGridTimeScoresV2';

  let started = false;
  let finished = false;
  let startAt = 0;
  let finalSeconds = 0;
  let timerHandle = null;

  function elapsedSeconds() {
    if (finished) return finalSeconds;
    if (!started || !startAt) return 0;
    return Math.max(0, Math.floor((performance.now() - startAt) / 1000));
  }

  function formatTime(sec) {
    sec = Math.max(0, Number(sec) || 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function puzzleKey() {
    try {
      return [...state.rows, ...state.cols].map(c => c && c.id ? c.id : '').join('|');
    } catch {
      return '';
    }
  }

  function updateHud() {
    const time = document.getElementById('hudTime');
    const label = document.getElementById('hudLabel');
    if (time) time.textContent = started ? formatTime(elapsedSeconds()) : '--:--';
    if (label) label.textContent = started ? '計時中' : '點第一格開始';
  }

  function decorateGrid() {
    const score = document.querySelector('#grid .score');
    if (score) {
      score.classList.add('run-stats');
      score.innerHTML = `
        <span id="hudLabel">${started ? '計時中' : '點第一格開始'}</span>
        <strong id="hudTime">${started ? formatTime(elapsedSeconds()) : '--:--'}</strong>`;
    }
    document.querySelectorAll('.rarity').forEach(el => el.remove());
    updateHud();
  }

  const baseRender = render;
  render = function () {
    baseRender();
    decorateGrid();
  };

  function stopTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  }

  function beginRun() {
    if (started || finished) return;
    started = true;
    startAt = performance.now();
    timerHandle = setInterval(updateHud, 250);
    updateHud();
  }

  function resetRun() {
    stopTimer();
    started = false;
    finished = false;
    startAt = 0;
    finalSeconds = 0;
    decorateGrid();
  }

  const baseOpenCell = openCell;
  openCell = function (r, c) {
    beginRun();
    return baseOpenCell(r, c);
  };

  function currentScores() {
    try {
      const value = JSON.parse(localStorage.getItem(BOARD_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveLocalScore() {
    const scores = currentScores();
    scores.push({
      seconds: finalSeconds,
      puzzle: puzzleKey(),
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(BOARD_KEY, JSON.stringify(scores.slice(-300)));
  }

  function updateCompleteCard() {
    const card = document.querySelector('#completeModal .complete-card');
    if (!card) return;
    const nine = card.querySelector('.complete-nine');
    if (nine) nine.textContent = '9 / 9 全部答對';
    const stat = card.querySelector('.complete-score');
    if (stat) {
      stat.innerHTML = `
        <div class="finish-stat">
          <span>完成時間</span>
          <strong>${finalSeconds} 秒</strong>
          <small>${formatTime(finalSeconds)}</small>
        </div>`;
    }
    const note = card.querySelector('p');
    if (note) note.textContent = '成績會加入此裝置的秒數排行榜。';
  }

  const baseOpenComplete = openComplete;
  openComplete = function () {
    if (!finished) {
      finalSeconds = elapsedSeconds();
      finished = true;
      stopTimer();
      saveLocalScore();
    }
    updateHud();
    updateCompleteCard();
    baseOpenComplete();
  };

  function renderLeaderboard() {
    const tbody = document.getElementById('timeRankingBody');
    if (!tbody) return;

    const scores = currentScores()
      .filter(x => Number.isFinite(Number(x.seconds)))
      .sort((a, b) => Number(a.seconds) - Number(b.seconds))
      .slice(0, 20);

    tbody.innerHTML = scores.length
      ? scores.map((x, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${Number(x.seconds)} 秒</td>
            <td>${formatTime(Number(x.seconds))}</td>
          </tr>`).join('')
      : '<tr><td colspan="3" class="empty-rank">目前還沒有完成紀錄</td></tr>';
  }

  function showLeaderboard() {
    renderLeaderboard();
    document.getElementById('rankingModal').classList.add('open');
  }

  function makeUi() {
    const controls = document.getElementById('controls');
    if (controls && !document.getElementById('rankingBtn')) {
      const rankBtn = document.createElement('button');
      rankBtn.id = 'rankingBtn';
      rankBtn.type = 'button';
      rankBtn.className = 'ctrl';
      rankBtn.textContent = '秒數排行榜';
      rankBtn.addEventListener('click', showLeaderboard);
      controls.appendChild(rankBtn);
    }

    if (!document.getElementById('rankingModal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="rankingModal" class="modalbg rank-bg">
          <section class="ranking-card">
            <div class="ranking-head">
              <div>
                <h2>秒數排行榜</h2>
                <p>目前為此裝置的完成紀錄</p>
              </div>
              <button id="closeRankingBtn" class="rank-close" type="button">×</button>
            </div>
            <table class="rank-table">
              <thead><tr><th>排名</th><th>秒數</th><th>時間</th></tr></thead>
              <tbody id="timeRankingBody"></tbody>
            </table>
          </section>
        </div>`);

      document.getElementById('closeRankingBtn').addEventListener('click', () => {
        document.getElementById('rankingModal').classList.remove('open');
      });
      document.getElementById('rankingModal').addEventListener('click', e => {
        if (e.target.id === 'rankingModal') e.currentTarget.classList.remove('open');
      });
    }

    const actions = document.querySelector('#completeModal .complete-actions');
    if (actions && !document.getElementById('completeRankBtn')) {
      const btn = document.createElement('button');
      btn.id = 'completeRankBtn';
      btn.className = 'complete-secondary';
      btn.type = 'button';
      btn.textContent = '秒數排行榜';
      btn.addEventListener('click', showLeaderboard);
      actions.appendChild(btn);
    }
  }

  makeUi();

  document.getElementById('resetBtn').addEventListener('click', resetRun);
  document.getElementById('newBtn').addEventListener('click', resetRun);
  document.getElementById('completeNewBtn').addEventListener('click', resetRun);

  const readiness = setInterval(() => {
    const grid = document.getElementById('grid');
    if (!grid || grid.hidden) return;
    decorateGrid();
  }, 250);

  window.addEventListener('beforeunload', stopTimer);
})();