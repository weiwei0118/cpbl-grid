(() => {
  const ID_KEY = 'cpblGridAnonymousId';
  const BOARD_KEY = 'cpblGridLocalScoresV1';

  let playerId = localStorage.getItem(ID_KEY) || '';
  let attempts = 0;
  let started = false;
  let finished = false;
  let startAt = 0;
  let finalSeconds = 0;
  let timerHandle = null;
  let pendingStart = false;

  function escLocal(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

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
    const count = document.getElementById('hudAttempts');
    const pid = document.getElementById('hudPlayer');
    if (time) time.textContent = started ? formatTime(elapsedSeconds()) : '--:--';
    if (count) count.textContent = `作答 ${attempts} 次`;
    if (pid) pid.textContent = playerId ? `玩家：${playerId}` : '尚未設定 ID';
  }

  function decorateGrid() {
    const score = document.querySelector('#grid .score');
    if (score) {
      score.classList.add('run-stats');
      score.innerHTML = `
        <span id="hudPlayer" class="hud-player">${playerId ? `玩家：${escLocal(playerId)}` : '尚未設定 ID'}</span>
        <strong id="hudTime">${started ? formatTime(elapsedSeconds()) : '--:--'}</strong>
        <span id="hudAttempts">作答 ${attempts} 次</span>`;
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

  function runTimer() {
    stopTimer();
    timerHandle = setInterval(updateHud, 250);
  }

  function beginRun(reset = true) {
    if (reset) {
      attempts = 0;
      finalSeconds = 0;
    }
    finished = false;
    started = true;
    startAt = performance.now();
    runTimer();
    decorateGrid();
  }

  function restartRun() {
    if (!playerId) return;
    beginRun(true);
  }

  function currentScores() {
    try {
      const value = JSON.parse(localStorage.getItem(BOARD_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveLocalScore() {
    const record = {
      id: playerId,
      seconds: finalSeconds,
      attempts,
      puzzle: puzzleKey(),
      createdAt: new Date().toISOString()
    };
    const scores = currentScores();
    scores.push(record);
    localStorage.setItem(BOARD_KEY, JSON.stringify(scores.slice(-200)));
  }

  function updateCompleteCard() {
    const card = document.querySelector('#completeModal .complete-card');
    if (!card) return;
    const nine = card.querySelector('.complete-nine');
    if (nine) nine.textContent = `玩家：${playerId}｜9 / 9 全部答對`;
    const stat = card.querySelector('.complete-score');
    if (stat) {
      stat.innerHTML = `
        <div class="finish-stat"><span>完成時間</span><strong>${finalSeconds} 秒</strong><small>${formatTime(finalSeconds)}</small></div>
        <div class="finish-stat"><span>作答次數</span><strong>${attempts} 次</strong><small>每次送出球員都會計算</small></div>`;
    }
    const note = card.querySelector('p');
    if (note) note.textContent = '目前先保存於此裝置作測試；正式跨玩家排行榜會再接資料庫。';
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

  const baseSubmitPlayer = submitPlayer;
  submitPlayer = function (name, candidates) {
    if (started && !finished) {
      attempts += 1;
      updateHud();
    }
    return baseSubmitPlayer(name, candidates);
  };

  function renderLeaderboard() {
    const tbodyTime = document.getElementById('timeRankingBody');
    const tbodyAttempts = document.getElementById('attemptRankingBody');
    if (!tbodyTime || !tbodyAttempts) return;

    const key = puzzleKey();
    const samePuzzle = currentScores().filter(x => x.puzzle === key);
    const byTime = [...samePuzzle].sort((a, b) => a.seconds - b.seconds || a.attempts - b.attempts).slice(0, 10);
    const byAttempts = [...samePuzzle].sort((a, b) => a.attempts - b.attempts || a.seconds - b.seconds).slice(0, 10);

    const rows = list => list.length
      ? list.map((x, i) => `<tr><td>${i + 1}</td><td>${escLocal(x.id)}</td><td>${x.seconds} 秒</td><td>${x.attempts} 次</td></tr>`).join('')
      : '<tr><td colspan="4" class="empty-rank">這一題還沒有完成紀錄</td></tr>';

    tbodyTime.innerHTML = rows(byTime);
    tbodyAttempts.innerHTML = rows(byAttempts);
  }

  function showLeaderboard() {
    renderLeaderboard();
    document.getElementById('rankingModal').classList.add('open');
  }

  function makeUi() {
    const controls = document.getElementById('controls');
    if (controls && !document.getElementById('playerIdBtn')) {
      const idBtn = document.createElement('button');
      idBtn.id = 'playerIdBtn';
      idBtn.type = 'button';
      idBtn.className = 'ctrl';
      idBtn.textContent = '玩家 ID';
      idBtn.addEventListener('click', () => showIdModal(false));
      controls.appendChild(idBtn);

      const rankBtn = document.createElement('button');
      rankBtn.id = 'rankingBtn';
      rankBtn.type = 'button';
      rankBtn.className = 'ctrl';
      rankBtn.textContent = '排行榜';
      rankBtn.addEventListener('click', showLeaderboard);
      controls.appendChild(rankBtn);
    }

    if (!document.getElementById('idModal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="idModal" class="modalbg id-bg open">
          <section class="id-card">
            <h2>輸入匿名 ID</h2>
            <p>不用登入帳號，輸入一個你想顯示在排行榜上的名稱。</p>
            <input id="anonymousIdInput" class="id-input" maxlength="20" autocomplete="off" placeholder="例如：wei123">
            <div id="idError" class="id-error"></div>
            <button id="startGameBtn" class="complete-primary" type="button">開始遊戲</button>
          </section>
        </div>
        <div id="rankingModal" class="modalbg rank-bg">
          <section class="ranking-card">
            <div class="ranking-head"><div><h2>排行榜</h2><p>此裝置測試排行榜・只比較目前這一題</p></div><button id="closeRankingBtn" class="rank-close" type="button">×</button></div>
            <h3>最快完成</h3>
            <table class="rank-table"><thead><tr><th>#</th><th>ID</th><th>時間</th><th>次數</th></tr></thead><tbody id="timeRankingBody"></tbody></table>
            <h3>最少作答次數</h3>
            <table class="rank-table"><thead><tr><th>#</th><th>ID</th><th>時間</th><th>次數</th></tr></thead><tbody id="attemptRankingBody"></tbody></table>
          </section>
        </div>`);

      document.getElementById('anonymousIdInput').value = playerId;
      document.getElementById('startGameBtn').addEventListener('click', confirmId);
      document.getElementById('anonymousIdInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') confirmId();
      });
      document.getElementById('closeRankingBtn').addEventListener('click', () => document.getElementById('rankingModal').classList.remove('open'));
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
      btn.textContent = '排行榜';
      btn.addEventListener('click', showLeaderboard);
      actions.appendChild(btn);
    }
  }

  function validId(value) {
    return /^[\p{L}\p{N}_-]{2,20}$/u.test(value);
  }

  function showIdModal(isInitial = false) {
    const modal = document.getElementById('idModal');
    const input = document.getElementById('anonymousIdInput');
    const btn = document.getElementById('startGameBtn');
    if (!modal || !input || !btn) return;
    input.value = playerId;
    btn.textContent = isInitial && !started ? '開始遊戲' : '儲存 ID';
    modal.classList.add('open');
    setTimeout(() => input.focus(), 30);
  }

  function confirmId() {
    const input = document.getElementById('anonymousIdInput');
    const error = document.getElementById('idError');
    const value = (input.value || '').trim();
    if (!validId(value)) {
      error.textContent = '請輸入 2～20 個中文字、英文字母、數字、_ 或 -';
      return;
    }
    error.textContent = '';
    playerId = value;
    localStorage.setItem(ID_KEY, playerId);
    document.getElementById('idModal').classList.remove('open');
    decorateGrid();

    if (!started) {
      const grid = document.getElementById('grid');
      if (grid && !grid.hidden) beginRun(true);
      else pendingStart = true;
    }
  }

  function onPuzzleReset() {
    if (started && playerId) restartRun();
  }

  makeUi();
  showIdModal(true);

  document.getElementById('resetBtn').addEventListener('click', onPuzzleReset);
  document.getElementById('newBtn').addEventListener('click', onPuzzleReset);
  document.getElementById('completeNewBtn').addEventListener('click', onPuzzleReset);

  const readiness = setInterval(() => {
    const grid = document.getElementById('grid');
    if (!grid || grid.hidden) return;
    decorateGrid();
    if (pendingStart && playerId && !started) {
      pendingStart = false;
      beginRun(true);
    }
  }, 250);

  window.addEventListener('beforeunload', stopTimer);
})();