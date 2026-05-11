# 倉庫システム 実装ガイド

## 1. ファイル読み込み順（index.html）

```html
<!-- 既存 -->
<script src="gamedata.js"></script>
<script src="gamestate.js"></script>
<script src="system_town_common.js"></script>
<script src="system_town_shop.js"></script>
<script src="system_town_smith.js"></script>
<!-- ↓ 追加 -->
<script src="system_town_warehouse.js"></script>
<script src="system_town_tavern.js"></script>
```

---

## 2. HTML モーダル追加（他のモーダルと同じ場所に追加）

```html
<!-- ===== 倉庫モーダル ===== -->
<div id="warehouse-modal" class="modal">
  <div class="modal-box" style="max-width:520px;width:96%;max-height:90vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span class="modal-title">🏛 倉庫</span>
      <button class="mini-btn drop-btn" onclick="hideModal('warehouse-modal')">✕ 閉じる</button>
    </div>
    <div id="warehouse-content"></div>
  </div>
</div>
```

---

## 3. 各施設へのボタン追加

### 酒場（system_town_tavern.js の renderTavernContent 内）
並替ボタン行（▲上へ ▼下へ 前後入替）の直後に追加：

```javascript
html += `
  <div style="margin-top:${sp ? 6 : 4}px">
    <button class="mini-btn"
            onclick="openWarehouseFromModal('tavern-modal')"
            style="color:var(--gold);border-color:var(--gold);
                   ${sp ? 'min-height:40px;font-size:14px;padding:6px 10px;width:100%;' : 'width:100%;'}">
      🏛 倉庫を開く
    </button>
  </div>`;
```

---

### 道具屋（system_town_shop.js の _renderShopModeSelect 内）
shop-mode-btns の後に追加：

```javascript
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
      <!-- ↓ 追加 -->
      <div style="margin-top:10px">
        <button class="mini-btn"
          style="width:100%;color:var(--gold);border-color:var(--gold);padding:8px"
          onclick="openWarehouseFromModal('shop-modal')">🏛 倉庫を開く</button>
      </div>
    </div>`;
}
```

---

### 鍛冶屋（system_town_smith.js の renderSmithContent 内）
タブボタン行の直後に倉庫ボタンを追加：

```javascript
function renderSmithContent(tab) {
  const content = document.getElementById('smith-content');
  if(!content) return;

  const TABS = [
    { id:'decompose', label:'⚒ 分解' },
    { id:'enhance',   label:'✨ 強化' },
    { id:'weaken',    label:'🔻 弱体' },
  ];

  let html = `<div style="display:flex;gap:4px;margin-bottom:6px;border-bottom:1px solid var(--border);padding-bottom:6px">`;
  TABS.forEach(t => {
    const active = t.id === tab;
    html += `<button class="mini-btn${active ? ' equip-btn' : ''}"
      onclick="renderSmithContent('${t.id}')"
      style="flex:1;font-size:12px;padding:5px">${t.label}</button>`;
  });
  // ↓ 倉庫ボタンを追加
  html += `<button class="mini-btn"
    onclick="openWarehouseFromModal('smith-modal')"
    style="color:var(--gold);border-color:var(--gold);font-size:12px;padding:5px">🏛 倉庫</button>`;
  html += `</div>`;

  // 以降は既存のまま
  html += _smithStoneBar();
  // ...
```

---

## 4. GS のセーブ/ロード対応

セーブ/ロード処理で `GS.warehouse` を含める：

```javascript
// セーブ時（例: Game.save 内）
const saveData = {
  gold:      GS.gold,
  warehouse: GS.warehouse || [],   // ← 追加
  // ... 他のフィールド
};

// ロード時（例: Game.load 内）
GS.warehouse = saveData.warehouse || [];  // ← 追加
```

---

## 5. 外部からの倉庫追加（共通メソッド）

ダンジョン拾得・ガチャ・イベント報酬など、どこからでも使える：

```javascript
// アイテムIDを倉庫に追加（満杯の場合は false を返す）
const ok = warehouseAdd('item_potion', 'ダンジョン3F');
if (!ok) {
  // 倉庫満杯 → キャラインベントリに入れる or 捨てるなど
}
```

---

## 6. 機能一覧

| タブ | 機能 |
|------|------|
| 📦 倉庫一覧 | アイテム一覧・名前フィルタ・ページング・個別売却・一括売却・装備品分解 |
| ⬇ 預ける | キャラ選択→所持品一覧→個別預け/一括預け（装備中は除外） |
| ⬆ 引き出す | キャラ選択→倉庫一覧から引き出す（所持上限チェックあり） |

| 仕様 | 内容 |
|------|------|
| 最大保管数 | 10,000個 |
| 1ページ表示数 | 50件（ページング自動） |
| 売却仕様 | 道具屋と同じ（item.sell を取得、GS.shopItems に戻す） |
| 分解仕様 | 鍛冶屋と同じ（マナ石×1〜5個取得、CM再取得ボーナス対象） |
| スマホ対応 | viewport≤600px でタップ領域拡大・フォントサイズ最適化 |
