/**
 * ============================================================
 *  gamestate.js — 共有ゲーム状態 ＆ ユーティリティ関数
 * ============================================================
 *
 * 【このファイルの役割】
 *   ゲーム中に変化する「状態（セーブ対象データ）」をすべて持ちます。
 *   全モジュールはこの GS オブジェクトを読み書きして情報を共有します。
 *   ※ GS = Game State の略
 *
 * 【依存関係】
 *   gamedata.js（DATAを参照するため）
 *
 * 【読み込み順】
 *   2番目（gamedata.js の次）
 *
 * 【公開するグローバル変数】
 *   const GS = {
 *     gold           : パーティの所持金
 *     floor          : 現在のダンジョン階層
 *     maxFloorReached: 到達した最深フロア
 *     party          : アクティブパーティ（最大6人）の配列
 *     roster         : 作成済みキャラ全員の配列
 *     dungeon        : 現在フロアのマップデータ
 *     playerPos      : プレイヤー座標 { x, y }
 *     playerDir      : 向き 0=北 1=東 2=南 3=西
 *     autoMap        : 探索済みマスの記録
 *     shopItems      : 現在のショップ在庫
 *     encyclopediaItems/Monsters: 図鑑解放状況
 *     battleState    : 戦闘中の一時データ（null=戦闘外）
 *     autoMode       : オートモードON/OFF
 *   }
 *
 * 【公開するユーティリティ関数】
 *   rand(min,max)      乱数
 *   randFrom(arr)      配列からランダム取得
 *   clamp(v,min,max)   値を範囲内に収める
 *   getJob(id)         職業データ取得
 *   getRace(id)        種族データ取得
 *   getItem(id)        アイテムデータ取得
 *   getMonster(id)     モンスターデータ取得
 *   log(msg, cls)      ダンジョンログに出力
 *   blogMsg(msg, cls)  戦闘ログに出力
 *   showScreen(id)     画面切り替え
 *   showModal(id)      モーダル表示
 *   hideModal(id)      モーダル非表示
 *   hpColor(cur,max)   HP割合で色を返す
 *   statusBadges(char) 状態異常バッジHTML生成
 *
 * ============================================================
 */

// ==================== GAME STATE ====================
const GS = {
  gold: 500,
  floor: 1,
  maxFloorReached: 1,
  party: [],        // Active party (max 6)
  roster: [],       // All created chars
  dungeon: null,
  playerPos: { x:1, y:1 },
  playerDir: 0, // 0=N 1=E 2=S 3=W
  autoMap: {},
  shopItems: [...DATA.shopStock],
  encyclopediaItems: new Set(),
  encyclopediaMonsters: new Set(),
  battleState: null,
  autoMode: false,
  returnFloor: 1,
  currentFloorData: null
};

// ==================== UTILITIES ====================
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function randFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function getJob(id){ return DATA.jobs.find(j=>j.id===id); }
function getRace(id){ return DATA.races.find(r=>r.id===id); }
function getItem(id){ return DATA.items.find(i=>i.id===id); }
function getMonster(id){ return DATA.monsters.find(m=>m.id===id); }

function log(msg, cls='') {
  const box = document.getElementById('log-box');
  if(!box) return;
  const el = document.createElement('div');
  // Map class names
  const clsMap = {
    sys:'log-sys', combat:'log-combat', item:'log-item',
    magic:'log-magic', monster:'log-monster', event:'log-event',
    levelup:'log-levelup', statup:'log-statup', statdown:'log-statdown'
  };
  el.className = 'log-entry ' + (clsMap[cls]||'log-sys');
  el.textContent = msg;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  // Keep max 200 entries
  while(box.children.length>200) box.removeChild(box.firstChild);
}

function blogMsg(msg, cls='') {
  const box = document.getElementById('battle-log');
  if(!box) return;
  const el = document.createElement('div');
  el.className = 'log-entry ' + (cls ? 'log-'+cls : 'log-sys');
  el.textContent = msg;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showModal(id) { document.getElementById(id).classList.add('active'); }
function hideModal(id) { document.getElementById(id).classList.remove('active'); }

function hpColor(cur, max) {
  const r = cur/max;
  if(r > 0.5) return 'var(--green2)';
  if(r > 0.25) return 'var(--yellow)';
  return 'var(--red2)';
}

function statusBadges(char) {
  let s = '';
  if(char.status.includes('poison'))   s += '<span class="status-badge status-poison">毒</span>';
  if(char.status.includes('sleep'))    s += '<span class="status-badge status-sleep">眠</span>';
  if(char.status.includes('stone'))    s += '<span class="status-badge status-stone">石</span>';
  if(char.status.includes('paralyze')) s += '<span class="status-badge status-paralyze">麻</span>';
  if(char.status.includes('confused')) s += '<span class="status-badge status-confused">混</span>';
  return s;
}

