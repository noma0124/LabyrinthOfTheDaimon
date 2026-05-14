/**
 * system_town_shop.js — ショップ
 * 依存: system_town_common.js
 */

// ========== SHOP ==========
// _shopMode: null | 'buy' | 'sell'
let _shopMode = null;
let _shopSelectedItem = null;

function openShop() {
  _shopMode = null;
  _shopSelectedItem = null;
  renderShopContent();
  showModal('shop-modal');
}

function renderShopContent() {
  const content = document.getElementById('shop-content');
  if (!content) return;

  if (!_shopMode) {
    _renderShopModeSelect(content);
  } else if (_shopMode === 'buy') {
    _renderShopBuy(content);
  } else if (_shopMode === 'sell') {
    _renderShopSell(content);
  }
}

// ========== モード選択画面 ==========
function _renderShopModeSelect(content) {
  // アイコンを橙ベース背景で統一するヘルパー
  const iconBadge = (emoji) =>
    `<span style="
      font-size:22px;line-height:1;flex-shrink:0;
    ">${emoji}</span>`;

  const cardBtn = (onclick, icon, label, sub) => `
    <button onclick="${onclick}"
      style="
        display:flex;align-items:center;gap:12px;
        width:100%;
        background:var(--bg3);
        border:1px solid var(--border2);
        color:var(--white);
        padding:12px 16px;
        cursor:pointer;
        font-family:var(--font-jp);
        text-align:left;
        border-radius:2px;
      ">
      ${iconBadge(icon)}
      <span style="display:flex;flex-direction:column;gap:2px">
        <span style="font-size:13px;font-weight:bold">${label}</span>
        <span style="font-size:10px;color:var(--gray)">${sub}</span>
      </span>
    </button>`;

  content.innerHTML = `
    <div class="shop-mode-select">
      <div class="shop-gold-display">所持金: <span style="color:var(--gold)">${GS.gold}G</span></div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">
        ${cardBtn("shopSetMode('buy')",  '🛒', '購入する', 'ショップの商品を購入する')}
        ${cardBtn("shopSetMode('sell')", '💰', '売却する', '所持アイテムを売却する')}
        ${cardBtn("_shopOpenWarehouse()", '🏛', '倉庫を開く', 'アイテムの預け・引き出し・売却')}
      </div>
    </div>`;
}

function shopSetMode(mode) {
  _shopMode = mode;
  _shopSelectedItem = null;
  renderShopContent();
}

// 道具屋から倉庫を開く（warehouse-modal が存在しない場合もケア）
function _shopOpenWarehouse() {
  if (typeof openWarehouseFromModal === 'function') {
    openWarehouseFromModal('shop-modal');
  } else if (typeof openWarehouse === 'function') {
    hideModal('shop-modal');
    openWarehouse('shop-modal');
  } else {
    alert('倉庫システムが読み込まれていません。\nindex.html に system_town_warehouse.js の読み込みと\nwarehouse-modal の HTML が追加されているか確認してください。');
  }
}

// ========== 購入画面 ==========
function _renderShopBuy(content) {
  const party = GS.party.filter(c => c.isAlive);

  let charOptions = party.map((c, i) =>
    `<option value="${i}">${c.name}（${c.inventory.length}/8）</option>`
  ).join('');

  let itemRows = '';
  GS.shopItems.forEach(iid => {
    const item = getItem(iid);
    if (!item) return;
    const selected = _shopSelectedItem === iid;
    itemRows += `
      <div class="item-row shop-item-row ${selected ? 'shop-item-selected' : ''}"
           onclick="shopSelectBuy('${iid}')">
        <span class="item-name">${item.name}</span>
        <span class="item-type">${item.type}</span>
        <span class="item-val">${item.price}G</span>
      </div>`;
  });

  let buyAction = '';
  if (_shopSelectedItem) {
    const item = getItem(_shopSelectedItem);
    if (item) {
      buyAction = `
        <div class="shop-buy-action">
          <div class="shop-buy-desc">${item.name} — ${item.desc}</div>
          <div class="shop-buy-row">
            <select id="buy-target" class="shop-select">${charOptions}</select>
            <button class="cmd-btn" onclick="doBuy('${_shopSelectedItem}')">購入 ${item.price}G</button>
          </div>
        </div>`;
    }
  }

  content.innerHTML = `
    <button class="mini-btn" style="margin-bottom:10px" onclick="shopSetMode(null)">← メニューに戻る</button>
    <div class="shop-screen-title">🛒 購入 <span class="shop-screen-gold">所持金: <b style="color:var(--gold)">${GS.gold}G</b></span></div>
    <div class="item-list shop-item-list" id="shop-buy-list">${itemRows}</div>
    <div id="shop-buy-action">${buyAction}</div>`;
}

function shopSelectBuy(iid) {
  _shopSelectedItem = (iid === _shopSelectedItem) ? null : iid;

  // アイテム行のselected状態を更新
  document.querySelectorAll('.shop-item-row').forEach((el, idx) => {
    el.classList.toggle('shop-item-selected', GS.shopItems[idx] === _shopSelectedItem);
  });

  const actionEl = document.getElementById('shop-buy-action');
  if (!actionEl) return;

  const item = _shopSelectedItem ? getItem(_shopSelectedItem) : null;
  if (!item) { actionEl.innerHTML = ''; return; }

  const party = GS.party.filter(c => c.isAlive);
  const charOptions = party.map((c, i) =>
    `<option value="${i}">${c.name}（${c.inventory.length}/8）</option>`
  ).join('');

  actionEl.innerHTML = `
    <div class="shop-buy-action">
      <div class="shop-buy-desc">${item.name} — ${item.desc}</div>
      <div class="shop-buy-row">
        <select id="buy-target" class="shop-select">${charOptions}</select>
        <button class="cmd-btn" onclick="doBuy('${_shopSelectedItem}')">購入 ${item.price}G</button>
      </div>
    </div>`;
}

function doBuy(iid) {
  const item = getItem(iid);
  if (!item) return;
  const targetSel = document.getElementById('buy-target');
  const idx = parseInt(targetSel.value);
  const target = GS.party.filter(c => c.isAlive)[idx];
  if (!target) return;
  if (target.inventory.length >= 8) { alert('荷物がいっぱい！'); return; }
  if (GS.gold < item.price) { alert('お金が足りない！'); return; }
  if (item.slot) {
    const reason = equipRestrictionReason(target, item);
    if (reason) {
      if (!confirm(`${target.name}は${reason}のため通常装備できません。\nそれでも購入しますか？`)) return;
    }
  }
  GS.gold -= item.price;
  target.inventory.push(iid);
  GS.encyclopediaItems.add(iid);
  log(`${target.name}が${item.name}を購入 (-${item.price}G)`, 'item');
  updateGoldDisplay();
  renderTownGold();
  _shopSelectedItem = null;
  _renderShopBuy(document.getElementById('shop-content'));
}

// ========== 売却画面 ==========
function _renderShopSell(content) {
  const party = GS.party.filter(c => c.isAlive);

  const charOptions = party.map(c =>
    `<option value="${c.id}">${c.name}（${c.inventory.length}/8）</option>`
  ).join('');

  content.innerHTML = `
    <button class="mini-btn" style="margin-bottom:10px" onclick="shopSetMode(null)">← メニューに戻る</button>
    <div class="shop-screen-title">💰 売却 <span class="shop-screen-gold">所持金: <b style="color:var(--gold)">${GS.gold}G</b></span></div>
    <select id="shop-sell-char" class="shop-select shop-sell-char-select"
            onchange="renderSellItems()">${charOptions}</select>
    <button class="mini-btn drop-btn shop-sell-all-btn" onclick="doSellAll()">💰 全て売る</button>
    <div class="item-list" id="shop-sell-list"></div>`;

  renderSellItems();
}

function renderSellItems() {
  const sel = document.getElementById('shop-sell-char');
  if (!sel) return;
  const charId = sel.value;
  const party = GS.party.filter(c => c.isAlive);
  const c = party.find(p => String(p.id) === charId) || party[0];
  if (!c) return;
  const el = document.getElementById('shop-sell-list');
  if (!el) return;
  el.innerHTML = '';
  if (!c.inventory.length) {
    el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:6px">所持品なし</div>';
    return;
  }
  c.inventory.forEach((iid, ii) => {
    const item = getItem(iid);
    if (!item) return;
    const div = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
      <span class="item-name">${item.name}</span>
      <span class="item-type" style="font-size:9px;color:var(--cyan)">${item.type}</span>
      <span class="item-val">${item.sell}G</span>
      <button class="shop-sell-btn" onclick="doSell('${c.id}',${ii})">売る</button>`;
    el.appendChild(div);
  });
}

function doSell(charId, itemIdx) {
  const c = GS.party.find(p => String(p.id) === String(charId));
  if (!c) return;
  const iid = c.inventory[itemIdx];
  const item = getItem(iid);
  if (!item) return;
  GS.gold += item.sell;
  c.inventory.splice(itemIdx, 1);
  if (!GS.shopItems.includes(iid)) GS.shopItems.push(iid);
  log(`${c.name}が[${item.name}]を${item.sell}Gで売った`, 'item');
  updateGoldDisplay();
  renderTownGold();
  // ヘッダーの所持金表示を更新
  const goldEl = document.querySelector('.shop-screen-gold b');
  if (goldEl) goldEl.textContent = `${GS.gold}G`;
  // キャラ選択のインベントリ数を更新
  const sel = document.getElementById('shop-sell-char');
  if (sel) {
    const party = GS.party.filter(p => p.isAlive);
    Array.from(sel.options).forEach(opt => {
      const ch = party.find(p => String(p.id) === opt.value);
      if (ch) opt.textContent = `${ch.name}（${ch.inventory.length}/8）`;
    });
  }
  renderSellItems();
}

function doSellAll() {
  const sel = document.getElementById('shop-sell-char');
  if (!sel) return;
  const c = GS.party.find(p => String(p.id) === sel.value) || GS.party.filter(p => p.isAlive)[0];
  if (!c || !c.inventory.length) { log('売れるアイテムがない', 'sys'); return; }
  if (!confirm(`${c.name}の所持品を全て売りますか？`)) return;
  let totalGold = 0;
  const sold = [];
  [...c.inventory].forEach(iid => {
    const item = getItem(iid);
    if (!item) return;
    totalGold += item.sell;
    sold.push(item.name);
    if (!GS.shopItems.includes(iid)) GS.shopItems.push(iid);
  });
  c.inventory = [];
  GS.gold += totalGold;
  log(`${c.name}が全アイテム（${sold.length}個）を${totalGold}Gで売った`, 'item');
  updateGoldDisplay();
  renderTownGold();
  _renderShopSell(document.getElementById('shop-content'));
}
