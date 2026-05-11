/**
 * ============================================================
 *  system_town_warehouse.js — 倉庫システム
 * ============================================================
 *
 * 【依存関係】
 *   gamedata.js → gamestate.js → system_town_common.js
 *   system_town_smith.js（分解処理を再利用）
 *   system_town_shop.js（売却処理を再利用）
 *
 * 【読み込み順】
 *   system_town_smith.js の後
 *
 * 【担当範囲】
 *   ◆ 倉庫へのアイテム預け入れ / 引き出し
 *   ◆ 倉庫内アイテムの売却（道具屋と同仕様）
 *   ◆ 倉庫内アイテムの分解（鍛冶屋と同仕様）
 *   ◆ ページング（1ページ50件、最大10000件）
 *
 * 【GS への追加フィールド】
 *   GS.warehouse : string[]  アイテムIDの配列（最大 WAREHOUSE_MAX 件）
 *
 * 【HTML への追加が必要なもの】
 * ─────────────────────────────────────────────────
 * 1) モーダル（他のモーダルと同じ場所に追加）:
 *
 *   <div id="warehouse-modal" class="modal">
 *     <div class="modal-box" style="max-width:520px;width:96%">
 *       <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
 *         <span class="modal-title">🏛 倉庫</span>
 *         <button class="mini-btn drop-btn" onclick="hideModal('warehouse-modal')">✕ 閉じる</button>
 *       </div>
 *       <div id="warehouse-content"></div>
 *     </div>
 *   </div>
 *
 * 2) 酒場モーダル内ボタン行（renderTavernContent 内の並替ボタン行の近く）:
 *   <button class="mini-btn" onclick="openWarehouseFromModal('tavern-modal')">🏛 倉庫</button>
 *
 * 3) 道具屋モーダル内（shop-content 上部 or フッター）:
 *   <button class="mini-btn" onclick="openWarehouseFromModal('shop-modal')">🏛 倉庫</button>
 *
 * 4) 鍛冶屋モーダル内（タブ行の末尾）:
 *   <button class="mini-btn" onclick="openWarehouseFromModal('smith-modal')">🏛 倉庫</button>
 *
 * 5) <script> 読み込み順（index.html）:
 *   system_town_smith.js の直後に追加:
 *   <script src="system_town_warehouse.js"></script>
 * ─────────────────────────────────────────────────
 *
 * ============================================================
 */

// ==================== 定数 ====================
const WAREHOUSE_MAX       = 10000; // 最大保管数
const WAREHOUSE_PAGE_SIZE = 50;    // 1ページあたり表示件数

// ==================== GS 初期化補完 ====================
if (typeof GS !== 'undefined') {
  if (!GS.warehouse) GS.warehouse = [];
}

// ==================== 内部状態 ====================
let _whPage      = 0;    // 現在のページ（0始まり）
let _whTab       = 'list'; // 'list' | 'deposit' | 'withdraw'
let _whFilter    = '';   // 名前フィルタ文字列
let _whFromModal = null; // 呼び出し元モーダルID（戻るため）

// ==================== エントリポイント ====================

/**
 * 倉庫を開く
 * @param {string|null} fromModalId - 呼び出し元モーダルID（閉じて倉庫を開く場合に使う）
 */
function openWarehouse(fromModalId) {
  if (!GS.warehouse) GS.warehouse = [];
  _whPage      = 0;
  _whTab       = 'list';
  _whFilter    = '';
  _whFromModal = fromModalId || null;
  renderWarehouseContent();
  showModal('warehouse-modal');
}

/**
 * 他モーダルから倉庫ボタンが押された場合：
 * 元モーダルを閉じてから倉庫を開く
 * @param {string} fromModalId
 */
function openWarehouseFromModal(fromModalId) {
  hideModal(fromModalId);
  openWarehouse(fromModalId);
}

// ==================== メインレンダリング ====================
function renderWarehouseContent() {
  const content = document.getElementById('warehouse-content');
  if (!content) return;

  const sp   = window.innerWidth <= 600;
  const used = GS.warehouse.length;
  const pct  = Math.min(100, Math.floor(used / WAREHOUSE_MAX * 100));
  const barColor = pct >= 90 ? 'var(--red2)' : pct >= 70 ? 'var(--yellow)' : 'var(--green2)';

  // ---- 戻るボタン（呼び出し元がある場合のみ） ----
  let html = _whFromModal
    ? `<button class="mini-btn" style="margin-bottom:10px" onclick="_whReturnToModal()">← メニューに戻る</button>`
    : '';

  // ---- 統計バー ----
  html += `
    <div style="background:var(--bg3);border:1px solid var(--border);
      padding:6px 10px;margin-bottom:8px;font-size:11px;
      display:flex;flex-wrap:wrap;gap:6px;align-items:center">
      <span style="color:var(--gray)">🏛 倉庫:</span>
      <span class="wh-stat-text">${used.toLocaleString()} / ${WAREHOUSE_MAX.toLocaleString()}個</span>
      <div style="flex:1;min-width:80px;height:6px;background:var(--bg2);border-radius:3px;overflow:hidden">
        <div class="wh-stat-fill"
          style="width:${pct}%;height:100%;background:${barColor};border-radius:3px;transition:width 0.3s"></div>
      </div>
      <span style="color:var(--gold)">${GS.gold.toLocaleString()}G</span>
    </div>`;

  // ---- タブ ----
  const TABS = [
    { id: 'list',     label: '📦 倉庫一覧' },
    { id: 'deposit',  label: '⬇ 預ける' },
    { id: 'withdraw', label: '⬆ 引き出す' },
  ];
  html += `<div style="display:flex;gap:4px;margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:6px">`;
  TABS.forEach(t => {
    const active = t.id === _whTab;
    html += `<button class="mini-btn${active ? ' equip-btn' : ''}"
      onclick="_whSetTab('${t.id}')"
      style="flex:1;font-size:${sp ? 12 : 11}px;padding:${sp ? 7 : 5}px">${t.label}</button>`;
  });
  html += `</div>`;

  content.innerHTML = html;

  // ---- タブ別コンテンツ ----
  if      (_whTab === 'list')     _renderWhList(content);
  else if (_whTab === 'deposit')  _renderWhDeposit(content);
  else if (_whTab === 'withdraw') _renderWhWithdraw(content);
}

function _whSetTab(tab) {
  _whTab   = tab;
  _whPage  = 0;
  _whFilter = '';
  renderWarehouseContent();
}

function _whReturnToModal() {
  hideModal('warehouse-modal');
  if (!_whFromModal) return;
  showModal(_whFromModal);
  // 戻り先モーダルのコンテンツを再描画する
  switch (_whFromModal) {
    case 'shop-modal':
      if (typeof renderShopContent === 'function') renderShopContent();
      break;
    case 'tavern-modal':
      if (typeof renderTavernContent === 'function') renderTavernContent();
      break;
    case 'smith-modal':
      if (typeof renderSmithContent === 'function') renderSmithContent();
      break;
  }
}

// ==================== フィルタ & ページング共通 ====================
function _whFilteredItems(src) {
  if (!_whFilter) return src;
  const f = _whFilter.toLowerCase();
  return src.filter(({ iid }) => {
    const item = getItem(iid);
    return item && item.name.toLowerCase().includes(f);
  });
}

function _renderPager(total) {
  const totalPages = Math.ceil(total / WAREHOUSE_PAGE_SIZE);
  if (totalPages <= 1) return '';
  const half = 3;
  let startP = Math.max(0, _whPage - half);
  let endP   = Math.min(totalPages - 1, _whPage + half);
  if (endP - startP < half * 2) startP = Math.max(0, endP - half * 2);

  let html = `<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;
    margin-top:8px;justify-content:center;font-size:11px">`;
  html += `<button class="mini-btn" ${_whPage===0?'disabled':''} onclick="_whGotoPage(0)">«</button>`;
  html += `<button class="mini-btn" ${_whPage===0?'disabled':''} onclick="_whGotoPage(${_whPage-1})">‹</button>`;
  for (let p = startP; p <= endP; p++) {
    html += `<button class="mini-btn${p===_whPage?' equip-btn':''}"
      onclick="_whGotoPage(${p})" style="min-width:30px">${p+1}</button>`;
  }
  html += `<button class="mini-btn" ${_whPage>=totalPages-1?'disabled':''} onclick="_whGotoPage(${_whPage+1})">›</button>`;
  html += `<button class="mini-btn" ${_whPage>=totalPages-1?'disabled':''} onclick="_whGotoPage(${totalPages-1})">»</button>`;
  html += `<span style="color:var(--gray);margin-left:4px">${_whPage+1} / ${totalPages}ページ</span>`;
  html += `</div>`;
  return html;
}

function _whGotoPage(p) {
  _whPage = p;
  renderWarehouseContent();
}

function _searchBar(onInputFn) {
  return `<input type="text" placeholder="🔍 名前で絞り込み" value="${_whFilter}"
    oninput="_whFilter=this.value;_whPage=0;${onInputFn}"
    style="width:100%;box-sizing:border-box;background:var(--bg3);color:var(--white);
           border:1px solid var(--border);padding:5px 8px;font-family:var(--font-jp);
           font-size:11px;margin-bottom:8px;border-radius:2px">`;
}

// ==================== 倉庫一覧タブ ====================
function _renderWhList(container) {
  const sp = window.innerWidth <= 600;
  const indexed  = GS.warehouse.map((iid, idx) => ({ iid, idx }));
  const filtered = _whFilteredItems(indexed);
  const pageItems = filtered.slice(
    _whPage * WAREHOUSE_PAGE_SIZE,
    (_whPage + 1) * WAREHOUSE_PAGE_SIZE
  );

  // レア度ラベル・カラー（smithが未ロードでも動くようフォールバック）
  const rarityColors = { 1:'var(--gray)', 2:'var(--green2)', 3:'var(--blue2)', 4:'var(--purple)', 5:'var(--gold)' };
  const rarityLabels = { 1:'コモン', 2:'アンコモン', 3:'レア', 4:'エピック', 5:'レジェンダリ' };

  let html = `
    <div style="font-size:10px;color:var(--gray);margin-bottom:6px">
      倉庫内アイテムの売却・分解が可能です。キャラクターに渡すには「引き出す」タブをご利用ください。
    </div>
    ${_searchBar('renderWarehouseContent()')}`;

  if (!filtered.length) {
    html += `<div style="color:var(--gray);font-size:11px;padding:8px">
      ${_whFilter ? '該当するアイテムがありません' : '倉庫は空です'}</div>`;
    container.insertAdjacentHTML('beforeend', html);
    return;
  }

  html += `<div style="font-size:10px;color:var(--gray);margin-bottom:4px">
    全 ${filtered.length.toLocaleString()}件 ／
    ${_whPage * WAREHOUSE_PAGE_SIZE + 1}〜${Math.min(filtered.length, (_whPage+1) * WAREHOUSE_PAGE_SIZE)}件表示
  </div>`;

  // ---- 一括売却ボタン ----
  html += `<div style="display:flex;gap:4px;margin-bottom:6px">
    <button class="mini-btn drop-btn" style="flex:1;${sp?'min-height:36px;font-size:12px;':''}"
      onclick="whSellAll()">💰 倉庫を全売却</button>
  </div>`;

  html += `<div class="item-list" id="wh-list-body">`;
  pageItems.forEach(({ iid, idx }) => {
    const item = getItem(iid);
    if (!item) return;
    const rarity  = typeof smithGetRarity === 'function' ? smithGetRarity(item) : 1;
    const isEquip = !!item.slot;
    html += `
      <div class="item-row" style="flex-wrap:wrap;gap:3px;
        padding:${sp ? '7px 5px' : '4px 5px'};
        margin-bottom:${sp ? 5 : 3}px;
        border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:5px;width:100%">
          <span class="item-name" style="flex:1;font-size:${sp ? 13 : 11}px">${item.name}</span>
          <span style="font-size:9px;color:var(--cyan)">${item.type}</span>
          ${isEquip ? `<span style="font-size:8px;color:${rarityColors[rarity]}">${rarityLabels[rarity]}</span>` : ''}
          <span style="font-size:9px;color:var(--gold)">
            ${item.atk ? `ATK+${item.atk} ` : ''}${item.def ? `DEF+${item.def} ` : ''}${item.heal ? `HP+${item.heal} ` : ''}${item.mpHeal ? `MP+${item.mpHeal}` : ''}
          </span>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;width:100%;align-items:center">
          <span style="font-size:9px;color:var(--gray);flex:1">
            売値: ${item.sell}G ${isEquip ? ' / 分解: マナ石×数個' : ''}
          </span>
          <button class="mini-btn"
            onclick="whSell(${idx})"
            style="border-color:var(--orange);color:var(--orange);
              ${sp ? 'min-height:32px;min-width:48px;font-size:12px;' : ''}">💰 売る</button>
          ${isEquip ? `
          <button class="mini-btn"
            onclick="whDecompose(${idx})"
            style="border-color:var(--orange);color:var(--orange);
              ${sp ? 'min-height:32px;min-width:48px;font-size:12px;' : ''}">⚒ 分解</button>` : ''}
        </div>
      </div>`;
  });
  html += `</div>`;
  html += _renderPager(filtered.length);

  container.insertAdjacentHTML('beforeend', html);
}

// ==================== 預けるタブ ====================
function _renderWhDeposit(container) {
  const sp       = window.innerWidth <= 600;
  const allChars = [...new Set([...GS.party, ...GS.roster])];
  const living   = allChars.filter(c => c.isAlive !== false);

  if (!living.length) {
    container.insertAdjacentHTML('beforeend',
      `<div style="color:var(--gray);font-size:11px;padding:8px">キャラクターがいません</div>`);
    return;
  }

  const charOptions = living.map(c =>
    `<option value="${c.id}">${c.name}（${c.inventory.length}/8）</option>`
  ).join('');

  let html = `
    <div style="font-size:10px;color:var(--gray);margin-bottom:6px">
      キャラクターの所持品から倉庫に預けます。装備中のアイテムは預けられません。
    </div>
    <select id="wh-deposit-char" onchange="_renderDepositList()"
      style="width:100%;margin-bottom:8px;background:var(--bg3);color:var(--white);
             border:1px solid var(--border);padding:${sp ? 7 : 4}px;
             font-family:var(--font-jp);font-size:${sp ? 13 : 11}px">
      ${charOptions}
    </select>
    <button class="mini-btn drop-btn"
      style="width:100%;margin-bottom:8px;${sp ? 'min-height:38px;font-size:13px;' : ''}"
      onclick="_whDepositAll()">⬇ 全て預ける（装備中を除く）</button>
    <div id="wh-deposit-list" class="item-list"></div>`;

  container.insertAdjacentHTML('beforeend', html);
  _renderDepositList();
}

function _renderDepositList() {
  const sel  = document.getElementById('wh-deposit-char');
  const el   = document.getElementById('wh-deposit-list');
  if (!sel || !el) return;

  const allChars   = [...new Set([...GS.party, ...GS.roster])];
  const c          = allChars.find(p => String(p.id) === sel.value) || allChars[0];
  if (!c) { el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:6px">キャラクターなし</div>'; return; }

  const sp          = window.innerWidth <= 600;
  const equippedSet = new Set(Object.values(c.equip || {}));

  if (!c.inventory.length) {
    el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:6px">所持品なし</div>';
    return;
  }

  el.innerHTML = '';
  c.inventory.forEach((iid, ii) => {
    const item       = getItem(iid);
    if (!item) return;
    const isEquipped = equippedSet.has(iid);
    const div        = document.createElement('div');
    div.className    = 'item-row';
    div.style.cssText = `padding:${sp ? '6px 5px' : '3px 5px'};margin-bottom:${sp ? 4 : 2}px;opacity:${isEquipped ? 0.4 : 1}`;
    div.innerHTML = `
      <span class="item-name" style="flex:1;font-size:${sp ? 13 : 11}px">${item.name}</span>
      <span class="item-type" style="font-size:9px;color:var(--cyan)">${item.type}</span>
      ${isEquipped
        ? `<span style="font-size:9px;color:var(--orange)">装備中</span>`
        : `<button class="mini-btn use-btn"
             onclick="_whDepositOne('${c.id}', ${ii})"
             style="${sp ? 'min-height:32px;min-width:52px;font-size:12px;' : ''}">⬇ 預ける</button>`}`;
    el.appendChild(div);
  });
}

function _whDepositOne(charId, itemIdx) {
  if (GS.warehouse.length >= WAREHOUSE_MAX) {
    alert(`倉庫が満杯です！（最大 ${WAREHOUSE_MAX.toLocaleString()} 個）`);
    return;
  }
  const allChars = [...new Set([...GS.party, ...GS.roster])];
  const c        = allChars.find(p => String(p.id) === String(charId));
  if (!c) return;
  const iid  = c.inventory[itemIdx];
  const item = getItem(iid);
  if (!item) return;
  c.inventory.splice(itemIdx, 1);
  GS.warehouse.push(iid);
  log(`${c.name}が[${item.name}]を倉庫に預けた`, 'item');

  // セレクトの表示（残り枠）を更新
  const sel = document.getElementById('wh-deposit-char');
  if (sel) {
    Array.from(sel.options).forEach(opt => {
      const ch = allChars.find(p => String(p.id) === opt.value);
      if (ch) opt.textContent = `${ch.name}（${ch.inventory.length}/8）`;
    });
  }
  _renderDepositList();
  _whUpdateStatBar();
}

function _whDepositAll() {
  const sel      = document.getElementById('wh-deposit-char');
  const allChars = [...new Set([...GS.party, ...GS.roster])];
  const c        = (sel && allChars.find(p => String(p.id) === sel.value)) || allChars[0];
  if (!c || !c.inventory.length) { log('預けるアイテムがない', 'sys'); return; }

  const equippedSet  = new Set(Object.values(c.equip || {}));
  const depositable  = c.inventory.filter(iid => !equippedSet.has(iid));
  if (!depositable.length) { log('装備中以外に預けられるアイテムがない', 'sys'); return; }

  const space = WAREHOUSE_MAX - GS.warehouse.length;
  if (space <= 0) { alert(`倉庫が満杯です！（最大 ${WAREHOUSE_MAX.toLocaleString()} 個）`); return; }
  if (!confirm(`${c.name}の非装備アイテム ${depositable.length}個を倉庫に預けますか？`)) return;

  let count = 0;
  for (let i = c.inventory.length - 1; i >= 0; i--) {
    if (count >= space) break;
    const iid = c.inventory[i];
    if (equippedSet.has(iid)) continue;
    c.inventory.splice(i, 1);
    GS.warehouse.push(iid);
    count++;
  }
  log(`${c.name}がアイテム${count}個を倉庫に預けた`, 'item');
  renderWarehouseContent();
}

// ==================== 引き出すタブ ====================
function _renderWhWithdraw(container) {
  const sp       = window.innerWidth <= 600;
  const allChars = [...new Set([...GS.party, ...GS.roster])];
  const living   = allChars.filter(c => c.isAlive !== false);

  const charOptions = living.map(c =>
    `<option value="${c.id}">${c.name}（${c.inventory.length}/8）</option>`
  ).join('');

  const indexed   = GS.warehouse.map((iid, idx) => ({ iid, idx }));
  const filtered  = _whFilteredItems(indexed);
  const pageItems = filtered.slice(
    _whPage * WAREHOUSE_PAGE_SIZE,
    (_whPage + 1) * WAREHOUSE_PAGE_SIZE
  );

  let html = `
    <div style="font-size:10px;color:var(--gray);margin-bottom:6px">
      倉庫からキャラクターに引き出します（所持上限 8個）。
    </div>
    <select id="wh-withdraw-char"
      style="width:100%;margin-bottom:8px;background:var(--bg3);color:var(--white);
             border:1px solid var(--border);padding:${sp ? 7 : 4}px;
             font-family:var(--font-jp);font-size:${sp ? 13 : 11}px">
      ${charOptions}
    </select>
    ${_searchBar('renderWarehouseContent()')}`;

  if (!filtered.length) {
    html += `<div style="color:var(--gray);font-size:11px;padding:8px">
      ${_whFilter ? '該当するアイテムがありません' : '倉庫は空です'}</div>`;
    container.insertAdjacentHTML('beforeend', html);
    return;
  }

  html += `<div style="font-size:10px;color:var(--gray);margin-bottom:4px">
    全 ${filtered.length.toLocaleString()}件 ／
    ${_whPage * WAREHOUSE_PAGE_SIZE + 1}〜${Math.min(filtered.length, (_whPage+1) * WAREHOUSE_PAGE_SIZE)}件表示
  </div>`;

  html += `<div class="item-list" id="wh-withdraw-list">`;
  pageItems.forEach(({ iid, idx }) => {
    const item = getItem(iid);
    if (!item) return;
    html += `
      <div class="item-row"
        style="padding:${sp ? '6px 5px' : '3px 5px'};margin-bottom:${sp ? 4 : 2}px">
        <span class="item-name" style="flex:1;font-size:${sp ? 13 : 11}px">${item.name}</span>
        <span class="item-type" style="font-size:9px;color:var(--cyan)">${item.type}</span>
        <span style="font-size:9px;color:var(--gold)">
          ${item.atk ? `ATK+${item.atk} ` : ''}${item.def ? `DEF+${item.def} ` : ''}${item.heal ? `HP+${item.heal}` : ''}
        </span>
        <button class="mini-btn use-btn"
          onclick="_whWithdrawOne(${idx})"
          style="${sp ? 'min-height:32px;min-width:52px;font-size:12px;' : ''}">⬆ 引き出す</button>
      </div>`;
  });
  html += `</div>`;
  html += _renderPager(filtered.length);

  container.insertAdjacentHTML('beforeend', html);
}

function _whWithdrawOne(whIdx) {
  const sel      = document.getElementById('wh-withdraw-char');
  const allChars = [...new Set([...GS.party, ...GS.roster])];
  const c        = sel
    ? (allChars.find(p => String(p.id) === sel.value) || allChars[0])
    : allChars[0];
  if (!c) return;
  if (c.inventory.length >= 8) {
    alert(`${c.name}の荷物がいっぱいです！（最大8個）`);
    return;
  }
  const iid  = GS.warehouse[whIdx];
  const item = getItem(iid);
  if (!item) return;
  GS.warehouse.splice(whIdx, 1);
  c.inventory.push(iid);
  log(`${c.name}が[${item.name}]を倉庫から引き出した`, 'item');

  // セレクトの表示（残り枠）を更新
  if (sel) {
    Array.from(sel.options).forEach(opt => {
      const ch = allChars.find(p => String(p.id) === opt.value);
      if (ch) opt.textContent = `${ch.name}（${ch.inventory.length}/8）`;
    });
  }

  // ページ番号が範囲外にならないよう調整
  const maxPage = Math.max(0, Math.ceil(GS.warehouse.length / WAREHOUSE_PAGE_SIZE) - 1);
  _whPage = Math.min(_whPage, maxPage);
  renderWarehouseContent();
}

// ==================== 倉庫内 売却 ====================
/**
 * 倉庫アイテムを1個売却（道具屋と同じ売値・同じ動作）
 * @param {number} whIdx - GS.warehouse 内のインデックス
 */
function whSell(whIdx) {
  const iid  = GS.warehouse[whIdx];
  const item = getItem(iid);
  if (!item) return;
  if (!confirm(`[${item.name}] を ${item.sell}G で売りますか？`)) return;

  GS.warehouse.splice(whIdx, 1);
  GS.gold += item.sell;
  if (!GS.shopItems.includes(iid)) GS.shopItems.push(iid);

  log(`倉庫から[${item.name}]を${item.sell}Gで売った`, 'item');
  updateGoldDisplay?.();
  renderTownGold?.();

  const maxPage = Math.max(0, Math.ceil(GS.warehouse.length / WAREHOUSE_PAGE_SIZE) - 1);
  _whPage = Math.min(_whPage, maxPage);
  renderWarehouseContent();
}

/**
 * 倉庫の全アイテムを一括売却
 */
function whSellAll() {
  const count = GS.warehouse.length;
  if (!count) { log('倉庫に売るアイテムがない', 'sys'); return; }
  if (!confirm(`倉庫の全アイテム（${count}個）を売却しますか？`)) return;

  let totalGold = 0;
  GS.warehouse.forEach(iid => {
    const item = getItem(iid);
    if (!item) return;
    totalGold += item.sell;
    if (!GS.shopItems.includes(iid)) GS.shopItems.push(iid);
  });
  GS.warehouse = [];
  GS.gold += totalGold;

  log(`倉庫の全アイテム（${count}個）を${totalGold.toLocaleString()}Gで一括売却した`, 'item');
  updateGoldDisplay?.();
  renderTownGold?.();
  _whPage = 0;
  renderWarehouseContent();
}

// ==================== 倉庫内 分解 ====================
/**
 * 倉庫アイテムを分解（鍛冶屋と完全同仕様）
 * @param {number} whIdx - GS.warehouse 内のインデックス
 */
function whDecompose(whIdx) {
  const iid  = GS.warehouse[whIdx];
  const item = getItem(iid);
  if (!item)       return;
  if (!item.slot)  { log('装備品のみ分解できます', 'sys'); return; }
  if (typeof smithGetRarity !== 'function') {
    alert('鍛冶屋システムが読み込まれていません（system_town_smith.js を先に読み込んでください）');
    return;
  }

  if (!GS.manaStones) GS.manaStones = { 1:0, 2:0, 3:0, 4:0, 5:0 };

  const rarity = smithGetRarity(item);
  const count  = rand(1, 5);
  const glow   = rand(1, rarity);

  GS.warehouse.splice(whIdx, 1);
  GS.manaStones[glow] = (GS.manaStones[glow] || 0) + count;

  // 鍛冶屋の CM再取得ボーナス対象にも登録する
  if (typeof _smithLastDecompose !== 'undefined') {
    // eslint-disable-next-line no-global-assign
    _smithLastDecompose = { count, glow };
  }

  const glowLabel = typeof SMITH_GLOW_LABELS !== 'undefined'
    ? SMITH_GLOW_LABELS[glow]
    : `輝度${glow}`;

  log(`倉庫の[${item.name}]を分解 → ${glowLabel} ×${count} 取得！`, 'item');

  const maxPage = Math.max(0, Math.ceil(GS.warehouse.length / WAREHOUSE_PAGE_SIZE) - 1);
  _whPage = Math.min(_whPage, maxPage);
  renderWarehouseContent();
}

// ==================== 軽量統計バー更新 ====================
/** ページ全体を再描画せず統計バーのみ更新（預ける操作の高速化） */
function _whUpdateStatBar() {
  const used  = GS.warehouse.length;
  const pct   = Math.min(100, Math.floor(used / WAREHOUSE_MAX * 100));
  const barColor = pct >= 90 ? 'var(--red2)' : pct >= 70 ? 'var(--yellow)' : 'var(--green2)';
  const fill  = document.querySelector('#warehouse-content .wh-stat-fill');
  const text  = document.querySelector('#warehouse-content .wh-stat-text');
  if (fill) { fill.style.width = `${pct}%`; fill.style.background = barColor; }
  if (text)   text.textContent = `${used.toLocaleString()} / ${WAREHOUSE_MAX.toLocaleString()}個`;
}

// ==================== 共通: 外部から倉庫にアイテムを追加する ====================
/**
 * 任意のアイテムIDを倉庫に追加する共通メソッド。
 * ダンジョン拾得・ガチャ・イベント報酬など、どこからでも呼べます。
 *
 * @param  {string}  iid       - アイテムID
 * @param  {string}  [source]  - ログ表示用の入手元（省略可）
 * @returns {boolean}          - 追加成功なら true、満杯なら false
 */
function warehouseAdd(iid, source) {
  if (!GS.warehouse) GS.warehouse = [];
  if (GS.warehouse.length >= WAREHOUSE_MAX) {
    log(`倉庫が満杯のため[${getItem(iid)?.name || iid}]を追加できない`, 'sys');
    return false;
  }
  GS.warehouse.push(iid);
  const item   = getItem(iid);
  const srcTxt = source ? `（${source}）` : '';
  log(`[${item?.name || iid}]が倉庫に追加された${srcTxt}`, 'item');
  return true;
}
