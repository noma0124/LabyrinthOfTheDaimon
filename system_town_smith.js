/**
 * ============================================================
 *  system_town_smith.js — 鍛冶屋システム
 * ============================================================
 *
 * 【依存関係】
 *   gamedata.js → gamestate.js → system_town_common.js
 *
 * 【読み込み順】
 *   system_town_shop.js の直後（index.html 参照）
 *
 * 【担当範囲】
 *   ◆ 装備品の分解   → マナ石（輝度1〜5）を取得
 *   ◆ 装備品の強化   → マナ石＋Gを消費して最大+9まで強化
 *   ◆ 装備品の弱体   → 10000Gで強化値-1
 *   ◆ CM視聴ボーナス → 最後に取得したマナ石を再取得
 *
 * 【GS への追加フィールド】
 *   GS.manaStones    : { 1:N, 2:N, 3:N, 4:N, 5:N }  輝度別マナ石所持数
 *   GS.smithEnhance  : { [instanceKey]: { enhance:N, options:[] } }
 *                      instanceKey = `${charId}__${invIdx}__${iid}`
 *
 * 【装備品レア度 (rarity)】
 *   gamedata.js の items[] に rarity フィールドがあればそれを優先。
 *   なければ price から自動推定:
 *     price >= 5000 → 5 (レジェンダリ)
 *     price >= 1500 → 4 (エピック)
 *     price >=  400 → 3 (レア)
 *     price >=  100 → 2 (アンコモン)
 *     それ以下      → 1 (コモン)
 *
 * 【+3/+6/+9 オプション】
 *   options 配列にオブジェクトを push:
 *     { type:'stat',    stat:'str', val:10,     label:'力 +10' }
 *     { type:'atkpct',  val:12,                 label:'攻撃力 +12%' }
 *     { type:'defpct',  val:8,                  label:'防御力 +8%' }
 *     { type:'racedmg', race:'undead', val:25,  label:'不死へのダメージ +25%' }
 *
 * ============================================================
 */

// ==================== GS 初期化補完 ====================
if(typeof GS !== 'undefined') {
  if(!GS.manaStones)   GS.manaStones   = {1:0, 2:0, 3:0, 4:0, 5:0};
  if(!GS.smithEnhance) GS.smithEnhance = {};
}

// ==================== 定数 ====================

const SMITH_RARITY_LABELS = {1:'コモン', 2:'アンコモン', 3:'レア', 4:'エピック', 5:'レジェンダリ'};
const SMITH_RARITY_COLORS = {
  1: 'var(--gray)',
  2: 'var(--green2)',
  3: 'var(--blue2)',
  4: 'var(--purple)',
  5: 'var(--gold)'
};

const SMITH_GLOW_LABELS = {1:'◇ 輝度1', 2:'◆ 輝度2', 3:'✦ 輝度3', 4:'★ 輝度4', 5:'🌟 輝度5'};
const SMITH_GLOW_COLORS = {
  1: 'var(--gray)',
  2: 'var(--green2)',
  3: 'var(--blue2)',
  4: 'var(--purple)',
  5: 'var(--gold)'
};

/**
 * 強化コスト（index = 強化前の値、0→1 は index 0）
 */
const SMITH_ENHANCE_COSTS = [
  { gold:    500, stones:   1 }, // 0→1
  { gold:   1000, stones:   2 }, // 1→2
  { gold:   1000, stones:   4 }, // 2→3
  { gold:   5000, stones:  16 }, // 3→4
  { gold:   5000, stones:  32 }, // 4→5
  { gold:  10000, stones:  64 }, // 5→6
  { gold:  10000, stones: 128 }, // 6→7
  { gold:  10000, stones: 128 }, // 7→8
  { gold:  10000, stones: 256 }, // 8→9
];

const SMITH_WEAKEN_COST = 10000;

const SMITH_OPT_STATS       = ['str','agi','intel','pie','vit','luk'];
const SMITH_OPT_STAT_LABELS = {str:'力', agi:'素早', intel:'知性', pie:'信仰', vit:'生命', luk:'運'};

// ==================== ユーティリティ ====================

function smithGetRarity(item) {
  if(item.rarity) return item.rarity;
  const p = item.price || 0;
  if(p >= 5000) return 5;
  if(p >= 1500) return 4;
  if(p >=  400) return 3;
  if(p >=  100) return 2;
  return 1;
}

function smithTotalStones() {
  return Object.values(GS.manaStones).reduce((a, b) => a + b, 0);
}

function smithKey(charId, invIdx, iid) {
  return `${charId}__${invIdx}__${iid}`;
}

function smithGetData(charId, invIdx, iid) {
  const key = smithKey(charId, invIdx, iid);
  if(!GS.smithEnhance[key]) GS.smithEnhance[key] = { enhance:0, options:[] };
  return GS.smithEnhance[key];
}

function smithDecomposeCount()      { return rand(1, 5); }
function smithDecomposeGlow(item)   { return rand(1, smithGetRarity(item)); }

function smithConsumeStones(need) {
  let rem = need;
  for(let g = 1; g <= 5 && rem > 0; g++) {
    const use = Math.min(GS.manaStones[g] || 0, rem);
    GS.manaStones[g] -= use;
    rem -= use;
  }
}

function smithRollOption(item) {
  const r = Math.random();
  if(r < 0.34) {
    const stat = randFrom(SMITH_OPT_STATS);
    return { type:'stat', stat, val:10, label:`${SMITH_OPT_STAT_LABELS[stat]} +10` };
  } else if(r < 0.67) {
    const pct  = rand(5, 15);
    const kind = (item.atk && item.atk > 0) ? 'atkpct' : 'defpct';
    const kLbl = kind === 'atkpct' ? '攻撃力' : '防御力';
    return { type:kind, val:pct, label:`${kLbl} +${pct}%` };
  } else {
    const raceObj = randFrom(DATA.monsterRaces);
    const pct     = rand(20, 40);
    return { type:'racedmg', race:raceObj.id, val:pct, label:`${raceObj.label}へのダメージ +${pct}%` };
  }
}

// ==================== CM視聴ボーナス ====================
let _smithLastDecompose = null;

// ==================== 鍛冶屋エントリ ====================
function openSmith() {
  if(!GS.manaStones)   GS.manaStones   = {1:0, 2:0, 3:0, 4:0, 5:0};
  if(!GS.smithEnhance) GS.smithEnhance = {};
  renderSmithContent('decompose');
  showModal('smith-modal');
}

// ==================== 共通レンダリング ====================
function renderSmithContent(tab) {
  const content = document.getElementById('smith-content');
  if(!content) return;

  const TABS = [
    { id:'decompose', label:'⚒ 分解' },
    { id:'enhance',   label:'✨ 強化' },
    { id:'weaken',    label:'🔻 弱体' },
  ];

  let html = `<div style="display:flex;gap:4px;margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:6px">`;
  TABS.forEach(t => {
    const active = t.id === tab;
    html += `<button class="mini-btn${active ? ' equip-btn' : ''}"
      onclick="renderSmithContent('${t.id}')"
      style="flex:1;font-size:12px;padding:5px">${t.label}</button>`;
  });
  html += `</div>`;

  html += _smithStoneBar();

  if(tab === 'decompose') html += _smithDecomposeBody();
  if(tab === 'enhance')   html += _smithEnhanceBody();
  if(tab === 'weaken')    html += _smithWeakenBody();

  content.innerHTML = html;

  if(tab === 'decompose') _smithRenderDecomposeList();
  if(tab === 'enhance')   _smithRenderEnhanceList();
  if(tab === 'weaken')    _smithRenderWeakenList();
}

function _smithStoneBar() {
  let html = `<div style="background:var(--bg3);border:1px solid var(--border);
    padding:6px 10px;margin-bottom:8px;font-size:11px;
    display:flex;gap:10px;flex-wrap:wrap;align-items:center">
    <span style="color:var(--gray)">🪨 マナ石:</span>`;
  for(let g = 1; g <= 5; g++) {
    const n = GS.manaStones[g] || 0;
    html += `<span style="color:${SMITH_GLOW_COLORS[g]}">${SMITH_GLOW_LABELS[g]}: <b>${n}</b></span>`;
  }
  html += `<span style="margin-left:auto;color:var(--gray)">合計: <b>${smithTotalStones()}</b>個</span>`;
  html += `</div>`;
  return html;
}

function _smithCharSelect(id, onchange) {
  const party = GS.party.filter(c => c.isAlive);
  let html = `<select id="${id}" onchange="${onchange}"
    style="width:100%;margin-bottom:6px;background:var(--bg3);color:var(--white);
    border:1px solid var(--border);padding:4px;font-family:var(--font-jp)">`;
  party.forEach(c => { html += `<option value="${c.id}">${c.name}（${c.inventory.length}/8）</option>`; });
  html += `</select>`;
  return html;
}

// ==================== 分解タブ ====================
function _smithDecomposeBody() {
  return `
    <div class="stat-title">装備品の分解</div>
    <div style="font-size:10px;color:var(--gray);margin-bottom:8px">
      装備品を分解してマナ石を獲得します。レア度が高いほど高輝度のマナ石を取得可能（輝度1〜レア度）。
    </div>
    ${_smithCharSelect('smith-decompose-char', '_smithRenderDecomposeList()')}
    <div style="display:flex;gap:4px;margin-bottom:6px">
      <button class="mini-btn drop-btn" style="flex:1;padding:5px"
        onclick="_smithDecomposeAll()">⚒ 全ての装備品を一括分解</button>
      <button class="mini-btn"
        style="background:linear-gradient(135deg,#6b4f00,#c8a020);
               border-color:var(--gold);color:var(--white);font-size:10px;padding:4px 8px"
        onclick="_smithCMBonus()">📺 CM視聴で再取得</button>
    </div>
    <div class="item-list" id="smith-decompose-list" style="max-height:280px;overflow-y:auto"></div>
  `;
}

function _smithRenderDecomposeList() {
  const sel = document.getElementById('smith-decompose-char');
  const el  = document.getElementById('smith-decompose-list');
  if(!sel || !el) return;

  const party = GS.party.filter(c => c.isAlive);
  const c     = party.find(p => String(p.id) === sel.value) || party[0];
  if(!c) { el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:6px">パーティなし</div>'; return; }

  const equipItems = c.inventory
    .map((iid, ii) => ({iid, ii, item: getItem(iid)}))
    .filter(e => e.item && e.item.slot);

  if(!equipItems.length) {
    el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:6px">分解できる装備品がない</div>';
    return;
  }

  el.innerHTML = '';
  equipItems.forEach(({iid, ii, item}) => {
    const rarity = smithGetRarity(item);
    const enh    = smithGetData(c.id, ii, iid).enhance;
    const div    = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
      <span class="item-name">${item.name}${enh > 0 ? `<span style="color:var(--gold);font-size:9px"> +${enh}</span>` : ''}</span>
      <span style="font-size:9px;color:${SMITH_RARITY_COLORS[rarity]}">${SMITH_RARITY_LABELS[rarity]}</span>
      <span style="font-size:9px;color:var(--gray)">輝度1〜${rarity}</span>
      <button style="font-size:9px;padding:2px 7px;background:var(--bg3);
        border:1px solid var(--orange);color:var(--orange);cursor:pointer"
        onclick="_smithDecompose('${c.id}',${ii})">分解</button>
    `;
    el.appendChild(div);
  });
}

function _smithDecompose(charId, invIdx) {
  const c    = GS.party.find(p => String(p.id) === String(charId));
  if(!c) return;
  const iid  = c.inventory[invIdx];
  const item = getItem(iid);
  if(!item || !item.slot) { log('装備品のみ分解できます', 'sys'); return; }

  const enh = smithGetData(charId, invIdx, iid).enhance;
  if(enh > 0 && !confirm(`[${item.name} +${enh}] は強化済みです。分解しますか？`)) return;

  const count = smithDecomposeCount();
  const glow  = smithDecomposeGlow(item);

  delete GS.smithEnhance[smithKey(charId, invIdx, iid)];
  c.inventory.splice(invIdx, 1);

  GS.manaStones[glow] = (GS.manaStones[glow] || 0) + count;
  _smithLastDecompose  = { count, glow };

  log(`[${item.name}]を分解 → ${SMITH_GLOW_LABELS[glow]} ×${count} 取得！`, 'item');
  renderSmithContent('decompose');
}

function _smithDecomposeAll() {
  const sel   = document.getElementById('smith-decompose-char');
  const party = GS.party.filter(c => c.isAlive);
  const c     = (sel && party.find(p => String(p.id) === sel.value)) || party[0];
  if(!c) return;

  const equipItems = c.inventory
    .map((iid, ii) => ({iid, ii, item: getItem(iid)}))
    .filter(e => e.item && e.item.slot);

  if(!equipItems.length) { log('分解できる装備品がない', 'sys'); return; }
  if(!confirm(`${c.name}の装備品 ${equipItems.length}個を全て分解しますか？`)) return;

  const totalByGlow = {1:0, 2:0, 3:0, 4:0, 5:0};
  let lastGlow = 1, lastCount = 0;

  equipItems.map(e => e.ii).sort((a, b) => b - a).forEach(ii => {
    const iid  = c.inventory[ii];
    const item = getItem(iid);
    if(!item) return;
    const count = smithDecomposeCount();
    const glow  = smithDecomposeGlow(item);
    delete GS.smithEnhance[smithKey(c.id, ii, iid)];
    c.inventory.splice(ii, 1);
    GS.manaStones[glow] = (GS.manaStones[glow] || 0) + count;
    totalByGlow[glow] += count;
    lastGlow = glow; lastCount = count;
  });

  _smithLastDecompose = { count: lastCount, glow: lastGlow };

  const summary = Object.entries(totalByGlow)
    .filter(([, v]) => v > 0)
    .map(([g, v]) => `${SMITH_GLOW_LABELS[g]}×${v}`)
    .join(' / ');
  log(`一括分解完了！ ${summary}`, 'item');
  renderSmithContent('decompose');
}

function _smithCMBonus() {
  if(!_smithLastDecompose) { log('先に装備品を分解してください', 'sys'); return; }
  showCM(() => {
    const { count, glow } = _smithLastDecompose;
    GS.manaStones[glow] = (GS.manaStones[glow] || 0) + count;
    log(`━━━ CM視聴ボーナス！ ${SMITH_GLOW_LABELS[glow]} ×${count} 再取得！ ━━━`, 'levelup');
    renderSmithContent('decompose');
  });
}

// ==================== 強化タブ ====================
function _smithEnhanceBody() {
  const costTable = SMITH_ENHANCE_COSTS.map((c, i) =>
    `<div style="color:var(--gray);font-size:9px">
      <span style="color:var(--white)">+${i}→+${i+1}</span>
      <span style="color:var(--gold)"> ${c.gold.toLocaleString()}G</span>
      <span style="color:var(--blue2)"> 石×${c.stones}</span>
    </div>`
  ).join('');

  return `
    <div class="stat-title">装備品の強化（最大 +9）</div>
    <div style="font-size:10px;color:var(--gray);margin-bottom:6px">
      マナ石とGoldを消費して強化します。
      <b style="color:var(--gold)">+3 / +6 / +9</b> でオプションが1つ付与されます。
    </div>
    <div style="background:var(--bg3);border:1px solid var(--border);
      padding:6px 8px;margin-bottom:8px;
      display:grid;grid-template-columns:repeat(3,1fr);gap:2px">
      ${costTable}
    </div>
    ${_smithCharSelect('smith-enhance-char', '_smithRenderEnhanceList()')}
    <div class="item-list" id="smith-enhance-list" style="max-height:240px;overflow-y:auto"></div>
    <div id="smith-enhance-action" style="margin-top:8px"></div>
  `;
}

function _smithRenderEnhanceList() {
  const sel = document.getElementById('smith-enhance-char');
  const el  = document.getElementById('smith-enhance-list');
  const act = document.getElementById('smith-enhance-action');
  if(!sel || !el) return;
  if(act) act.innerHTML = '';

  const party = GS.party.filter(c => c.isAlive);
  const c     = party.find(p => String(p.id) === sel.value) || party[0];
  if(!c) { el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:6px">パーティなし</div>'; return; }

  const equipItems = c.inventory
    .map((iid, ii) => ({iid, ii, item: getItem(iid)}))
    .filter(e => e.item && e.item.slot);

  if(!equipItems.length) {
    el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:6px">強化できる装備品がない</div>';
    return;
  }

  el.innerHTML = '';
  equipItems.forEach(({iid, ii, item}) => {
    const data      = smithGetData(c.id, ii, iid);
    const enh       = data.enhance;
    const rarity    = smithGetRarity(item);
    const optBadges = data.options.map(o =>
      `<span style="font-size:8px;color:var(--cyan);margin-right:3px">[${o.label}]</span>`
    ).join('');
    const div = document.createElement('div');
    div.className = 'item-row';
    div.style.flexWrap = 'wrap';
    div.innerHTML = `
      <span class="item-name">${item.name}${enh > 0 ? `<span style="color:var(--gold)"> +${enh}</span>` : ''}</span>
      <span style="font-size:9px;color:${SMITH_RARITY_COLORS[rarity]}">${SMITH_RARITY_LABELS[rarity]}</span>
      ${enh < 9
        ? `<button style="font-size:9px;padding:2px 7px;background:var(--bg3);
            border:1px solid var(--green2);color:var(--green2);cursor:pointer"
            onclick="_smithSelectEnhance('${c.id}',${ii})">強化</button>`
        : `<span style="font-size:9px;color:var(--gold);margin-left:4px">MAX</span>`}
      ${optBadges ? `<div style="width:100%;padding-top:2px">${optBadges}</div>` : ''}
    `;
    el.appendChild(div);
  });
}

function _smithSelectEnhance(charId, invIdx) {
  const c    = GS.party.find(p => String(p.id) === String(charId));
  if(!c) return;
  const iid  = c.inventory[invIdx];
  const item = getItem(iid);
  if(!item) return;
  const data      = smithGetData(charId, invIdx, iid);
  const enh       = data.enhance;
  if(enh >= 9) return;

  const cost        = SMITH_ENHANCE_COSTS[enh];
  const totalStones = smithTotalStones();
  const canAfford   = GS.gold >= cost.gold && totalStones >= cost.stones;
  const nextOpt     = (enh + 1 === 3 || enh + 1 === 6 || enh + 1 === 9);

  const actionEl = document.getElementById('smith-enhance-action');
  if(!actionEl) return;

  actionEl.innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--gold);padding:8px;font-size:11px">
      <div style="color:var(--gold2);margin-bottom:6px">
        ⚒ <b>${item.name}${enh > 0 ? ` +${enh}` : ''}</b>
        → <b style="color:var(--green2)">+${enh + 1}</b>
        ${nextOpt ? '<span style="color:var(--gold);font-size:10px"> ✨ オプション付与</span>' : ''}
      </div>
      <div style="line-height:1.8">
        費用: <span style="color:var(--gold)">${cost.gold.toLocaleString()} G</span>
        　マナ石: <span style="color:var(--blue2)">${cost.stones}個</span>
      </div>
      <div style="font-size:10px;color:var(--gray)">
        現在: ${GS.gold.toLocaleString()}G / マナ石 ${totalStones}個
      </div>
      ${!canAfford
        ? '<div style="color:var(--red2);margin-top:4px;font-size:10px">⚠ Gまたはマナ石が不足しています</div>'
        : ''}
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="cmd-btn"
          ${canAfford ? '' : 'disabled style="opacity:0.35"'}
          onclick="_smithDoEnhance('${charId}',${invIdx})">強化する</button>
        <button class="mini-btn"
          onclick="document.getElementById('smith-enhance-action').innerHTML=''">キャンセル</button>
      </div>
    </div>
  `;
}

function _smithDoEnhance(charId, invIdx) {
  const c    = GS.party.find(p => String(p.id) === String(charId));
  if(!c) return;
  const iid  = c.inventory[invIdx];
  const item = getItem(iid);
  if(!item) return;
  const data = smithGetData(charId, invIdx, iid);
  const enh  = data.enhance;
  if(enh >= 9) return;

  const cost = SMITH_ENHANCE_COSTS[enh];
  if(GS.gold < cost.gold) {
    log(`Gが足りない！必要: ${cost.gold.toLocaleString()}G`, 'combat'); return;
  }
  if(smithTotalStones() < cost.stones) {
    log(`マナ石が足りない！必要: ${cost.stones}個`, 'combat'); return;
  }

  GS.gold -= cost.gold;
  smithConsumeStones(cost.stones);
  data.enhance++;

  let optMsg = '';
  if(data.enhance === 3 || data.enhance === 6 || data.enhance === 9) {
    const opt = smithRollOption(item);
    data.options.push(opt);
    optMsg = ` ✨ [${opt.label}]`;
    log(`★ +${data.enhance} オプション獲得: ${opt.label}`, 'levelup');
  }

  log(`[${item.name}] +${enh}→+${data.enhance} 強化成功！${optMsg}　(-${cost.gold.toLocaleString()}G / 石-${cost.stones})`, 'item');
  updateGoldDisplay();
  renderTownGold();
  renderSmithContent('enhance');
}

// ==================== 弱体タブ ====================
function _smithWeakenBody() {
  return `
    <div class="stat-title">装備品の弱体</div>
    <div style="font-size:10px;color:var(--gray);margin-bottom:4px">
      強化値を <b style="color:var(--red2)">-1</b> します。
      費用: <span style="color:var(--gold)">${SMITH_WEAKEN_COST.toLocaleString()} G</span>
    </div>
    <div style="font-size:10px;background:rgba(180,40,40,0.15);border:1px solid var(--red);
      color:var(--red2);padding:5px 8px;margin-bottom:8px;line-height:1.6;border-radius:2px">
      ⚠ <b>+3 / +6 / +9 から弱体する場合</b>、そのタイミングで付与されたオプションが
      <b>1つ消去</b>されます。オプションを失いたくない場合は実行しないでください。
    </div>
    ${_smithCharSelect('smith-weaken-char', '_smithRenderWeakenList()')}
    <div class="item-list" id="smith-weaken-list" style="max-height:300px;overflow-y:auto"></div>
    <div id="smith-weaken-action" style="margin-top:8px"></div>
  `;
}

function _smithRenderWeakenList() {
  const sel = document.getElementById('smith-weaken-char');
  const el  = document.getElementById('smith-weaken-list');
  const act = document.getElementById('smith-weaken-action');
  if(!sel || !el) return;
  if(act) act.innerHTML = '';

  const party = GS.party.filter(c => c.isAlive);
  const c     = party.find(p => String(p.id) === sel.value) || party[0];
  if(!c) { el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:6px">パーティなし</div>'; return; }

  const enhanced = c.inventory
    .map((iid, ii) => ({iid, ii, item: getItem(iid), data: smithGetData(c.id, ii, iid)}))
    .filter(e => e.item && e.item.slot && e.data.enhance > 0);

  if(!enhanced.length) {
    el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:6px">弱体できる（強化済み）装備品がない</div>';
    return;
  }

  el.innerHTML = '';
  enhanced.forEach(({iid, ii, item, data}) => {
    const willLoseOpt = (data.enhance === 3 || data.enhance === 6 || data.enhance === 9)
                        && data.options.length > 0;
    const lastOpt     = willLoseOpt ? data.options[data.options.length - 1] : null;
    const optBadges   = data.options.map((o, oi) => {
      const isLast = willLoseOpt && oi === data.options.length - 1;
      return `<span style="font-size:8px;color:${isLast ? 'var(--red2)' : 'var(--cyan)'};
        margin-right:3px;${isLast ? 'text-decoration:line-through;opacity:0.8' : ''}">[${o.label}]</span>`;
    }).join('');

    const div = document.createElement('div');
    div.className = 'item-row';
    div.style.flexWrap = 'wrap';
    div.innerHTML = `
      <span class="item-name">${item.name} <span style="color:var(--gold)">+${data.enhance}</span></span>
      <span style="font-size:9px;color:var(--red2)">→ +${data.enhance - 1}</span>
      ${willLoseOpt
        ? `<span style="font-size:9px;color:var(--red2);margin-left:2px">⚠ オプション消去</span>`
        : ''}
      <button style="font-size:9px;padding:2px 7px;background:var(--bg3);
        border:1px solid var(--red);color:var(--red2);cursor:pointer"
        onclick="_smithDoWeaken('${c.id}',${ii})">弱体</button>
      ${optBadges ? `<div style="width:100%;padding-top:2px">${optBadges}</div>` : ''}
      ${willLoseOpt && lastOpt
        ? `<div style="width:100%;font-size:9px;color:var(--red2);padding-top:1px">
            ⚠ 消去予定: [${lastOpt.label}]</div>`
        : ''}
    `;
    el.appendChild(div);
  });
}

function _smithDoWeaken(charId, invIdx) {
  const c    = GS.party.find(p => String(p.id) === String(charId));
  if(!c) return;
  const iid  = c.inventory[invIdx];
  const item = getItem(iid);
  if(!item) return;
  const data = smithGetData(charId, invIdx, iid);
  if(data.enhance <= 0) { log('強化されていない装備品です', 'sys'); return; }

  if(GS.gold < SMITH_WEAKEN_COST) {
    log(`Gが足りない！必要: ${SMITH_WEAKEN_COST.toLocaleString()}G`, 'combat'); return;
  }

  // +3/+6/+9 から弱体する場合はオプション消去の警告を追加
  const willLoseOpt = (data.enhance === 3 || data.enhance === 6 || data.enhance === 9)
                      && data.options.length > 0;
  const lastOpt     = willLoseOpt ? data.options[data.options.length - 1] : null;
  const optWarnMsg  = willLoseOpt
    ? `\n⚠ 警告: +${data.enhance} のオプション [${lastOpt.label}] が消去されます！`
    : '';

  if(!confirm(`[${item.name} +${data.enhance}] を弱体して +${data.enhance - 1} にしますか？\n費用: ${SMITH_WEAKEN_COST.toLocaleString()}G${optWarnMsg}`)) return;

  GS.gold -= SMITH_WEAKEN_COST;
  const before = data.enhance;
  data.enhance--;

  let optMsg = '';
  if(willLoseOpt && lastOpt) {
    data.options.pop();
    optMsg = ` ／ オプション消去: [${lastOpt.label}]`;
    log(`⚠ +${before} オプション消去: [${lastOpt.label}]`, 'combat');
  }

  log(`[${item.name}] +${before} → +${data.enhance} に弱体　(-${SMITH_WEAKEN_COST.toLocaleString()}G)${optMsg}`, 'sys');
  updateGoldDisplay();
  renderTownGold();
  renderSmithContent('weaken');
}
