/**
 * system_town_options.js — オプション
 * 依存: system_town_common.js
 */

// ==================== OPTIONS（オプション）====================
function openOptions() {
  renderOptionsContent();
  showModal('options-modal');
}

function renderOptionsContent() {
  // Load saved volume or default to 70
  const vol = parseInt(localStorage.getItem('wiz_volume') ?? 70);
  const content = document.getElementById('options-content');
  content.innerHTML = `
    <div style="margin-bottom:20px">
      <div class="stat-title">🔊 音量設定</div>
      <div style="background:var(--bg3);border:1px solid var(--border);padding:12px;margin-top:6px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:16px">🔇</span>
          <input type="range" id="volume-slider" min="0" max="100" value="${vol}"
            style="flex:1;accent-color:var(--gold);cursor:pointer"
            oninput="updateVolume(this.value)">
          <span style="font-size:16px">🔊</span>
        </div>
        <div style="text-align:center;font-size:14px;color:var(--gold)">
          <span id="volume-value">${vol}</span>%
        </div>
        <div style="font-size:10px;color:var(--gray);text-align:center;margin-top:4px">
          ※ この設定はブラウザに保存されます
        </div>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <div class="stat-title" style="color:var(--red2)">⚠ ゲーム終了</div>
      <div style="background:var(--bg3);border:1px solid var(--red);padding:10px;margin-top:6px">
        <div style="font-size:11px;color:var(--gray);margin-bottom:8px">
          現在の進行状況は自動保存されています。タイトルに戻ると冒険を中断します。
        </div>
        <button class="cmd-btn" style="width:100%;color:var(--red2);border-color:var(--red);background:var(--bg)" onclick="returnToTitle()">
          タイトルに戻る
        </button>
      </div>
    </div>
  `;
}

function updateVolume(val) {
  const numVal = parseInt(val);
  const el = document.getElementById('volume-value');
  if(el) el.textContent = numVal;
  localStorage.setItem('wiz_volume', numVal);
  // Apply to all audio elements if any exist
  document.querySelectorAll('audio, video').forEach(a => { a.volume = numVal / 100; });
  // Expose global for other systems
  window.gameVolume = numVal / 100;
}

function returnToTitle() {
  if(!confirm('タイトルに戻りますか？\n（進行状況は保存済みです）')) return;
  Game.save?.();
  hideModal('options-modal');
  // Reset battle state
  if(GS.battleState) GS.battleState = null;
  GS.dungeon = null;
  showScreen('title-screen');
  log('タイトルに戻った。', 'sys');
}

