/**
 * system_town_gacha.js — ガチャ
 * 依存: system_town_common.js
 */

// ==================== GACHA（ガチャ）====================
function openGacha() {
  renderGachaContent();
  showModal('gacha-modal');
}

function renderGachaContent() {
  const content = document.getElementById('gacha-content');
  content.innerHTML = `
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:22px;margin-bottom:4px">🎰 カルマガチャ</div>
      <div style="color:var(--gray);font-size:11px">CMを視聴してカルマを獲得しよう！</div>
      <div style="margin-top:8px;font-size:16px">現在のカルマ: <span id="karma-display" style="color:var(--gold);font-weight:bold">${GS.karma}</span></div>
    </div>
    <div style="background:var(--bg3);border:1px solid var(--border);padding:10px;margin-bottom:12px;font-size:11px">
      <div style="color:var(--gold2);margin-bottom:6px">📺 CM視聴でカルマゲット</div>
      <div>・獲得量: <span style="color:var(--green2)">100〜300カルマ</span></div>
      <div style="color:var(--gray)">・150以上の確率: <span style="color:var(--cyan)">20%</span></div>
      <div style="color:var(--gray)">・カルマは邪教の館の「合体」で使用します</div>
    </div>
    <div id="gacha-cm-area" style="margin-bottom:12px">
      <button class="cmd-btn" style="width:100%;background:linear-gradient(135deg,#b8860b,#daa520);border-color:var(--gold);font-size:14px" onclick="startKarmaGacha()">
        📺 CMを見てカルマを獲得
      </button>
    </div>
    <div id="gacha-result" style="min-height:60px"></div>
  `;
}

let _gachaWatching = false;
function startKarmaGacha() {
  if(_gachaWatching) return;
  _gachaWatching = true;

  const area = document.getElementById('gacha-cm-area');
  const result = document.getElementById('gacha-result');
  result.innerHTML = '';

  let timeLeft = 5;
  area.innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--gold);padding:12px;text-align:center">
      <div style="color:var(--gold2);font-size:13px;margin-bottom:6px">📺 CM視聴中...</div>
      <div id="gacha-bar-wrap" style="background:var(--bg);height:8px;border-radius:4px;overflow:hidden;margin-bottom:6px">
        <div id="gacha-bar-fill" style="height:100%;background:linear-gradient(90deg,var(--gold2),var(--gold));width:100%;transition:width 1s linear"></div>
      </div>
      <div style="font-size:20px;color:var(--gold)" id="gacha-timer">${timeLeft}</div>
    </div>
  `;

  // Force reflow before starting transition
  setTimeout(() => {
    document.getElementById('gacha-bar-fill').style.width = '0%';
  }, 50);

  const interval = setInterval(() => {
    timeLeft--;
    const timerEl = document.getElementById('gacha-timer');
    if(timerEl) timerEl.textContent = timeLeft;
    if(timeLeft <= 0) {
      clearInterval(interval);
      _gachaWatching = false;
      resolveKarmaGacha();
    }
  }, 1000);
}

function resolveKarmaGacha() {
  // 20% chance of 150-300, 80% chance of 100-149
  let gained;
  if(Math.random() < 0.20) {
    gained = rand(150, 300);
  } else {
    gained = rand(100, 149);
  }
  GS.karma += gained;

  const area = document.getElementById('gacha-cm-area');
  const result = document.getElementById('gacha-result');
  const karmaEl = document.getElementById('karma-display');
  if(karmaEl) karmaEl.textContent = GS.karma;

  const isLucky = gained >= 150;
  result.innerHTML = `
    <div style="background:var(--bg3);border:2px solid ${isLucky?'var(--gold)':'var(--border)'};padding:12px;text-align:center;animation:fadeIn 0.4s">
      <div style="font-size:18px;margin-bottom:4px">${isLucky?'🌟':'✨'}</div>
      <div style="color:${isLucky?'var(--gold)':'var(--green2)'};font-size:${isLucky?'18':'15'}px;font-weight:bold">
        +${gained} カルマ獲得！${isLucky?'　ラッキー！':''}
      </div>
      <div style="font-size:11px;color:var(--gray);margin-top:4px">合計カルマ: ${GS.karma}</div>
    </div>
  `;

  area.innerHTML = `
    <button class="cmd-btn" style="width:100%;background:linear-gradient(135deg,#b8860b,#daa520);border-color:var(--gold);font-size:14px" onclick="startKarmaGacha()">
      📺 もう一度CMを見る
    </button>
  `;

  log(`CMを視聴してカルマを${gained}獲得！（合計: ${GS.karma}）`, isLucky?'levelup':'event');
}

