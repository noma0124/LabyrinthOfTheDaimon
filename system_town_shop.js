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
  content.innerHTML = `
    <div class="shop-mode-select">
      <div class="shop-gold-display">所持金: <span style="color:var(--gold)">${GS.gold}G</span></div>
      <div class="shop-mode-btns">
        <button class="shop-mode-btn" onclick="shopSetMode('buy')">
          <span class="shop-mode-icon">🛒</span>
          <span class="shop-mode-label">購入する</span>
        </button>
        <button class="shop-mode-btn" onclick="shopSetMode('sell')">
          <span class="shop-mode-icon">💰</span>
          <span class="shop-mode-label">売却する</span>
        </button>
      </div>
    </div>`;
}

function shopSetMode(mode) {
  _shopMode = mode;
  _shopSelectedItem = null;
  renderShopContent();
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
    <div class="shop-header">
      <button class="shop-back-btn" onclick="shopSetMode(null)">← 戻る</button>
      <span class="shop-header-title">🛒 購入</span>
      <span class="shop-header-gold">所持金: <b style="color:var(--gold)">${GS.gold}G</b></span>
    </div>
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
    <div class="shop-header">
      <button class="shop-back-btn" onclick="shopSetMode(null)">← 戻る</button>
      <span class="shop-header-title">💰 売却</span>
      <span class="shop-header-gold">所持金: <b style="color:var(--gold)">${GS.gold}G</b></span>
    </div>
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
  const goldEl = document.querySelector('.shop-header-gold b');
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
