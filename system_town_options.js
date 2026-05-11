/**
 * system_town_options.js — オプション
 * 依存: system_town_common.js
 */

// ==================== DEBUG CONFIG ====================
// デバッグ機能の表示有無をここで制御します。
// 本番リリース時は false に変更するか、ビルドスクリプトで除去してください。
const DEBUG_CONFIG = {
  enabled: true,   // false にするとデバッグ枠ごと非表示になります
};

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
    ${DEBUG_CONFIG.enabled ? renderDebugSection() : ''}
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

// ==================== DEBUG（デバッグ）====================

/**
 * デバッグセクションのHTML生成
 * DEBUG_CONFIG.enabled が true の時だけ renderOptionsContent() から呼ばれます
 */
function renderDebugSection() {
  return `
    <div style="margin-top:20px">
      <div class="stat-title" style="color:#ff6b35;display:flex;align-items:center;gap:6px">
        <span style="font-size:14px">🛠</span> デバッグ用
        <span style="font-size:9px;background:#ff6b35;color:#000;padding:1px 5px;border-radius:2px;font-weight:bold">DEV</span>
      </div>
      <div style="background:var(--bg3);border:1px dashed #ff6b35;padding:12px;margin-top:6px">
        <div style="font-size:10px;color:#ff6b35;margin-bottom:10px;opacity:0.8">
          ⚠ 開発用機能です。本番環境では DEBUG_CONFIG.enabled を false に設定してください。
        </div>

        <!-- キャラクター自動生成 -->
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--gray);margin-bottom:4px">👥 キャラクター</div>
          <button class="cmd-btn" style="width:100%;font-size:12px;border-color:#ff6b35;color:#ff6b35"
            onclick="debugAutoGenerateChars()">
            ランダムキャラクター 5体 自動生成
          </button>
        </div>

        <!-- カルマ・ゴールド -->
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--gray);margin-bottom:4px">💰 所持品</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <button class="cmd-btn" style="font-size:11px;border-color:#ff6b35;color:#ff6b35"
              onclick="debugAddKarma()">
              カルマ +10,000
            </button>
            <button class="cmd-btn" style="font-size:11px;border-color:#ff6b35;color:#ff6b35"
              onclick="debugAddGold()">
              ゴールド +100,000
            </button>
          </div>
        </div>

        <!-- マナ石 -->
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--gray);margin-bottom:4px">💎 マナ石</div>
          <button class="cmd-btn" style="width:100%;font-size:12px;border-color:#ff6b35;color:#ff6b35"
            onclick="debugAddManaStones()">
            全種マナ石 各1,000個 追加
          </button>
        </div>

        <!-- モンスター仲間 -->
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--gray);margin-bottom:4px">👹 モンスター</div>
          <button class="cmd-btn" style="width:100%;font-size:12px;border-color:#ff6b35;color:#ff6b35"
            onclick="debugAddMonsterCompanions()">
            ランダムモンスター仲間 10体 追加（邪教の館）
          </button>
        </div>

        <!-- アイテム追加 -->
        <div style="margin-bottom:0">
          <div style="font-size:11px;color:var(--gray);margin-bottom:4px">🎒 アイテム</div>
          <button class="cmd-btn" style="width:100%;font-size:12px;border-color:#ff6b35;color:#ff6b35"
            onclick="debugAddAllItemsToWarehouse()">
            全アイテム 各20個 倉庫に追加
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---- デバッグ：キャラクター自動生成 ----
function debugAutoGenerateChars() {
  const COUNT = 5;

  // ランダム名前プール
  const namePool = [
    'アルス','レオン','フィオナ','ガイウス','ミラ',
    'ゼノン','ルナ','カイン','セラ','ドラン',
    'エリス','ボルク','イリア','ガルス','ネア',
    'シオン','アルテ','ベルク','クレア','ライゼ'
  ];

  // 使用済み名前を避けるため既存名を収集
  const usedNames = new Set([...GS.party, ...GS.roster].map(c => c.name));
  const available = namePool.filter(n => !usedNames.has(n));

  let created = 0;
  for(let i = 0; i < COUNT; i++) {
    // 種族をランダム選択
    const race = randFrom(DATA.races);

    // 種族が選択できる職業の中からランダム選択
    const availableJobs = DATA.jobs.filter(j => race.jobs.includes(j.id));
    const job = randFrom(availableJobs);

    // ランダムなボーナスポイント配分（合計10〜60）
    const bonusTotal = rand(10, 60);
    const stats = { str:10, agi:10, intel:10, pie:10, vit:10, luk:10 };
    let remaining = bonusTotal;
    const statKeys = Object.keys(stats);
    // ランダムに振り分け
    while(remaining > 0) {
      const key = randFrom(statKeys);
      const add = Math.min(remaining, rand(1, 5));
      stats[key] += add;
      remaining -= add;
    }

    // 名前を選択（プールが尽きたら連番付与）
    let name;
    if(available.length > 0) {
      name = available.splice(rand(0, available.length - 1), 1)[0];
    } else {
      name = `冒険者${GS.roster.length + i + 1}`;
    }

    // キャラクター生成（createChar は system_town_common.js で定義）
    const c = createChar(name, race.id, job.id, stats);
    initCharHP(c);

    // ランダムなポートレート割り当て
    if(typeof PORTRAITS !== 'undefined' && PORTRAITS.length) {
      c.portrait = randFrom(PORTRAITS);
    }

    GS.roster.push(c);
    log(`[DEBUG] ${name}（${race.name} ${job.name} Lv${c.level}）を自動生成した`, 'event');
    created++;
  }

  updatePartyDisplay?.();
  _showDebugToast(`✅ キャラクター ${created}体 を生成しました`);
}

// ---- デバッグ：カルマ追加 ----
function debugAddKarma() {
  const amount = 10000;
  // GS.karma が未定義の場合も考慮して初期化
  GS.karma = (GS.karma ?? 0) + amount;
  log(`[DEBUG] カルマを ${amount.toLocaleString()} 獲得（合計: ${GS.karma.toLocaleString()}）`, 'levelup');
  _showDebugToast(`✅ カルマ +${amount.toLocaleString()}`);
}

// ---- デバッグ：ゴールド追加 ----
function debugAddGold() {
  const amount = 100000;
  GS.gold += amount;
  updatePartyDisplay?.();
  log(`[DEBUG] ゴールドを ${amount.toLocaleString()} 獲得（合計: ${GS.gold.toLocaleString()}）`, 'item');
  _showDebugToast(`✅ ゴールド +${amount.toLocaleString()}`);
}

// ---- デバッグ：マナ石追加 ----
/**
 * マナ石は GS.manaStones オブジェクトで管理します。
 * 各キーは輝度（rarity 1〜5 に対応）で、値は所持数です。
 * 例: GS.manaStones = { 1: 50, 2: 30, 3: 10, 4: 5, 5: 1 }
 *
 * ※ GS.manaStones が未定義の場合（既存セーブデータ互換）はここで初期化します。
 */
function debugAddManaStones() {
  // smith.js の GS 初期化補完と同じ構造を保証する
  if(!GS.manaStones) GS.manaStones = {1:0, 2:0, 3:0, 4:0, 5:0};

  const amount = 1000;
  for(let g = 1; g <= 5; g++) {
    GS.manaStones[g] = (GS.manaStones[g] || 0) + amount;
  }

  // SMITH_GLOW_LABELS は smith.js で定義されている定数。
  // smith.js より先にこの関数が呼ばれる場合に備えてフォールバックを用意。
  const glowLabels = (typeof SMITH_GLOW_LABELS !== 'undefined')
    ? SMITH_GLOW_LABELS
    : {1:'◇ 輝度1', 2:'◆ 輝度2', 3:'✦ 輝度3', 4:'★ 輝度4', 5:'🌟 輝度5'};

  const detail = [1,2,3,4,5].map(g => `${glowLabels[g]} ×${amount}`).join('  ');
  log(`[DEBUG] マナ石を追加: ${detail}`, 'magic');
  _showDebugToast(`✅ 全種マナ石 各${amount.toLocaleString()}個 追加`);
}

// ---- デバッグ：モンスター仲間追加 ----
/**
 * モンスター仲間は GS.monsters 配列で管理します（system_town_temple.js と共有）。
 * temple.js が参照するフィールドに完全に合わせた構造で追加します。
 *   { id, name, img, rank, floor, hp, atk, def, exp, gold,
 *     abilities, group, joinRate, joinable, drops, equipment }
 *
 * ※ GS.monsters は temple.js の冒頭でも初期化されますが、
 *   options.js が先に呼ばれる場合に備えてここでも保証します。
 */
function debugAddMonsterCompanions() {
  if(!Array.isArray(GS.monsters)) GS.monsters = [];

  // joinable:true のモンスターのみを仲間候補にする（temple.js と同じ前提）
  const joinable = DATA.monsters.filter(m => m.joinable === true);
  if(!joinable.length) {
    _showDebugToast('⚠ joinable なモンスターがいません');
    return;
  }

  const COUNT = 10;
  let added = 0;

  for(let i = 0; i < COUNT; i++) {
    const base = randFrom(joinable);

    // temple.js の showMonsterDetail / renderEvilTempleList が参照する
    // 全フィールドを忠実に再現したインスタンスを生成する
    const instance = {
      // --- 識別子（重複しないよう timestamp + カウンタで生成）---
      id        : `debug_${Date.now()}_${i}`,

      // --- 表示系 ---
      name      : base.name,
      img       : base.img  ?? '👾',
      group     : base.group ?? '中',

      // --- ランク・フロア（temple.js の rankBadgeHtml / doFusion で参照）---
      rank      : base.rank,
      floor     : base.floor,

      // --- 戦闘パラメータ ---
      hp        : base.hp,
      atk       : base.atk,
      def       : base.def,
      exp       : base.exp,
      gold      : base.gold,

      // --- 能力・ドロップ ---
      abilities : [...(base.abilities ?? [])],
      drops     : [...(base.drops     ?? [])],

      // --- 邪教の館システムが必要とするフィールド ---
      joinRate  : 0,        // 捕獲済みなので合体・解放のみ対象
      joinable  : true,
      equipment : {},       // 装備スロット（temple.js の equipMonsterItem で使用）

      // --- デバッグ生成フラグ（開発中の識別用）---
      _debugGenerated : true,
    };

    GS.monsters.push(instance);
    const rankLabel = getMonsterRank(base.rank)?.label ?? '?';
    log(`[DEBUG] ${base.img} ${base.name}（ランク${rankLabel} / ${base.floor}F）が邪教の館に加わった！`, 'event');
    added++;
  }

  _showDebugToast(`✅ モンスター仲間 ${added}体 を邪教の館に追加しました`);
}

// ---- デバッグ共通：トースト通知 ----
/**
 * オプションモーダル内にトースト風の成功メッセージを一時表示します。
 * 既存の DOM を壊さないよう、options-content の末尾に挿入して 2 秒後に消します。
 */
function _showDebugToast(msg) {
  // すでに表示中のトーストを削除
  document.getElementById('debug-toast')?.remove();

  const toast = document.createElement('div');
  toast.id = 'debug-toast';
  toast.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'left:50%',
    'transform:translateX(-50%)',
    'background:#1a1a1a',
    'border:1px solid #ff6b35',
    'color:#ff6b35',
    'padding:8px 18px',
    'font-size:12px',
    'border-radius:4px',
    'z-index:9999',
    'pointer-events:none',
    'animation:fadeIn 0.2s ease',
    'white-space:nowrap',
  ].join(';');
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

// ---- デバッグ：全アイテム倉庫追加 ----
/**
 * DATA.items の全アイテムを種類ごとに 20個ずつ GS.warehouse に追加します。
 * 追加には warehouse.js の warehouseAdd() を利用するため、
 * WAREHOUSE_MAX（10000件）の上限チェックが自動的に機能します。
 *
 * 追加ロジック:
 *   1. DATA.items をアイテムID単位でユニーク化（同一IDの重複定義を除去）
 *   2. 各アイテムを 20回 warehouseAdd() で追加
 *   3. 倉庫が満杯になった時点で中断し、追加済み件数をログに出力
 */
function debugAddAllItemsToWarehouse() {
  if(!Array.isArray(GS.warehouse)) GS.warehouse = [];

  // warehouseAdd が読み込まれているか確認
  if(typeof warehouseAdd !== 'function') {
    _showDebugToast('⚠ warehouseAdd が見つかりません（warehouse.js を確認してください）');
    return;
  }

  const PER_ITEM = 20;

  // アイテムIDのユニークリストを生成（DATA.items の順序を保持）
  const seen    = new Set();
  const uniqueItems = DATA.items.filter(item => {
    if(seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  let addedCount  = 0;  // 実際に追加できた総数
  let skippedFull = false;

  for(const item of uniqueItems) {
    for(let i = 0; i < PER_ITEM; i++) {
      const ok = warehouseAdd(item.id, 'デバッグ');
      if(ok) {
        addedCount++;
      } else {
        // warehouseAdd が false = 倉庫満杯
        skippedFull = true;
        break;
      }
    }
    if(skippedFull) break;
  }

  const msg = skippedFull
    ? `⚠ 倉庫が満杯のため途中停止（${addedCount.toLocaleString()}個追加）`
    : `✅ 全アイテム各${PER_ITEM}個を倉庫に追加（計${addedCount.toLocaleString()}個）`;

  log(`[DEBUG] ${msg}`, 'item');
  _showDebugToast(msg);
}
