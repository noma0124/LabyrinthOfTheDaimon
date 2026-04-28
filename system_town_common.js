/**
 * system_town_common.js — 町共通処理
 * 読み込み順: gamedata.js → gamestate.js → system_town_common.js（他townファイルより先）
 * 含む機能: 町表示・CM・ダンジョン全回復・共通キャラステータスモーダル・装備制限チェック・キーボード・INIT
 */

/**
 * ============================================================
 *  system_town.js — 街・ショップ・宿屋・訓練所・街はずれ・図鑑システム
 * ============================================================
 * 【依存関係】 gamedata.js → gamestate.js → system_char.js → system_ui.js
 * 【読み込み順】 6番目（最後）
 * 【担当範囲】
 *   街メイン / 宿屋 / 酒場 / 協会 / 道具屋 /
 *   訓練所（キャラ作成・転職・削除）/ 街はずれ / 図鑑 /
 *   邪教の館（モンスター管理・合体・解放）/
 *   ガチャ（CMカルマガチャ）/ オプション（音量・タイトル）/
 *   キーボードイベント / window.onload 初期化 / 自動セーブ
 * ============================================================
 */

// ==================== TOWN FUNCTIONS ====================
// source: 'stairs' = B1F階段から帰還（CM広告なし）/ 省略 = ヘッダーボタン等（CM広告あり）
function showTown(source) {
  const returnToTown = () => {
    GS.returnFloor = GS.floor;
    GS.floor = 1;
    showScreen('town-screen');
    renderTownGold();
    log('街に戻った。','event');
  };

  if(!GS.dungeon || source === 'stairs') {
    // ダンジョン未入場 or 階段から帰還 → CM広告なしで即帰還
    returnToTown();
    return;
  }
  // ヘッダー「街へ(CM)」等から → CM広告を挟んで帰還
  showCM(returnToTown);
}

function renderTownGold() {
  const el=document.getElementById('town-gold');
  if(el) el.textContent=`所持金: ${GS.gold}G`;
  const kEl=document.getElementById('town-karma');
  if(kEl) kEl.textContent=`カルマ: ${GS.karma}`;
}

function showCM(callback) {
  const overlay=document.getElementById('cm-overlay');
  overlay.classList.add('active');
  let timeLeft=5;
  const timerEl=document.getElementById('cm-timer');
  const barEl=document.getElementById('cm-bar-fill');
  timerEl.textContent=timeLeft;
  barEl.style.width='100%';

  const interval=setInterval(()=>{
    timeLeft--;
    timerEl.textContent=timeLeft;
    barEl.style.width=`${timeLeft/5*100}%`;
    if(timeLeft<=0) {
      clearInterval(interval);
      overlay.classList.remove('active');
      callback();
    }
  },1000);
}

// ==================== DUNGEON FULL HEAL ====================
function dungeonFullHeal() {
  if(Battle.isActive()) { log('戦闘中は使えない！','combat'); return; }
  showCM(()=>{
    GS.party.forEach(c=>{
      if(!c.isAlive||c.status.includes('stone')) return;
      c.hp = c.maxHp;
      c.mp = c.maxMp;
      // Cure poison/sleep/confused (but not stone/dead)
      c.status = c.status.filter(s=>s==='stone'||s==='dead');
    });
    updatePartyDisplay();
    log('━━━ 広告視聴完了！パーティが全回復した！ ━━━','levelup');
    GS.party.forEach(c=>{
      if(c.isAlive&&!c.status.includes('stone'))
        log(`  ${c.name}: HP ${c.hp}/${c.maxHp}  MP ${c.mp}/${c.maxMp}`,'statup');
    });
    renderDungeon();
  });
}


// ==================== 共通キャラクターステータスモーダル ====================
// 酒場・訓練所・ダンジョンサイドバー（system_ui.js）から呼び出し可能
// context: 'town' = 街モード（魔法使用不可）/ 'dungeon' = ダンジョンモード（魔法使用可）
//
// 【他モジュールとの連携】
//   system_ui.js のダンジョン中キャラ選択でも openCharStatusModal(char,'dungeon') を呼ぶこと
//   装備変更は system_ui.js の equipItem() / unequipItem() があればそちらを優先
//   なければ town 側の簡易装備変更 charStatusEquipSlot() を使う

function openCharStatusModal(char, context) {
  context = context || 'town';
  renderCharStatusModal(char, context);
  showModal('char-status-modal');
}

function renderCharStatusModal(char, context) {
  const stats = typeof calcStats === 'function' ? calcStats(char) : char;
  const job   = getJob(char.job);
  const race  = getRace(char.race);

  // ---- ポートレート ----
  const portrait = char.portrait || '🧑‍🦯';

  // ---- ステータスブロック ----
  const statNames = {str:'力',agi:'素早さ',intel:'知性',pie:'信仰',vit:'生命力',luk:'運'};
  let statsHtml = '';
  ['str','agi','intel','pie','vit','luk'].forEach(k=>{
    statsHtml += `<div class="stat-row">
      <span class="stat-label">${statNames[k]}</span>
      <span class="stat-val">${stats[k]??char[k]??'─'}</span>
    </div>`;
  });

  // ---- 装備スロット ----
  let equipHtml = '';
  DATA.equipSlots.forEach(slot=>{
    const iid = char.equip?.[slot];
    const item = iid ? getItem(iid) : null;
    const restriction = item ? equipRestrictionReason(char, item) : '';
    equipHtml += `<div class="equip-slot" onclick="charStatusEquipSlot('${char.id}','${slot}')">
      <span class="equip-slot-label">${slot}</span>
      <span class="equip-slot-item">${item
        ? `${item.name}${restriction?'<span style="color:var(--orange);font-size:8px"> ⚠</span>':''}`
        : '<span style="color:var(--gray)">─なし─</span>'}</span>
      <span style="font-size:8px;color:var(--border2)">▶</span>
    </div>`;
  });

  // ---- 所持品 ----
  let invHtml = '';
  if(!char.inventory?.length) {
    invHtml = '<div style="color:var(--gray);font-size:11px;padding:4px">所持品なし</div>';
  } else {
    char.inventory.forEach((iid, ii)=>{
      const item = getItem(iid);
      if(!item) return;
      const usable = item.heal || item.mpHeal || item.cure || item.spellId || item.escape;
      invHtml += `<div class="item-row">
        <span class="item-name">${item.name}</span>
        <span style="font-size:9px;color:var(--gold)">${item.atk?`ATK+${item.atk} `:''}${item.def?`DEF+${item.def} `:''}${item.heal?`HP+${item.heal}`:''}${item.mpHeal?`MP+${item.mpHeal}`:''}</span>
        ${usable&&context==='dungeon'
          ? `<button class="mini-btn use-btn" onclick="charStatusUseItem('${char.id}',${ii})">使う</button>`
          : (usable ? `<button class="mini-btn use-btn" onclick="charStatusUseItemTown('${char.id}',${ii})">使う</button>` : '')}
        ${item.slot ? `<button class="mini-btn equip-btn" onclick="charStatusEquipFromInventory('${char.id}',${ii})">装備</button>` : ''}
      </div>`;
    });
  }

  // ---- 魔法リスト ----
  let spellHtml = '';
  const allSpells = [...(DATA.mageSpells||[]), ...(DATA.priestSpells||[])];
  const learnedSpells = allSpells.filter(sp=>{
    if(!job) return false;
    if(DATA.mageSpells.includes(sp)) return job.mageSpell >= sp.level;
    if(DATA.priestSpells.includes(sp)) return job.priestSpell >= sp.level;
    return false;
  });
  if(learnedSpells.length) {
    learnedSpells.forEach(sp=>{
      const canCast = char.mp >= sp.cost;
      spellHtml += `<button class="magic-btn" ${canCast&&context==='dungeon'?`onclick="charStatusCastSpell('${char.id}','${sp.id}')"`:''} ${!canCast||context!=='dungeon'?'disabled':''}>
        ${sp.name}<span class="magic-cost">MP${sp.cost}</span>
        <span style="font-size:9px;color:var(--gray);display:block">${sp.desc}</span>
      </button>`;
    });
  } else {
    spellHtml = '<div style="color:var(--gray);font-size:11px;padding:4px">使える魔法なし</div>';
  }

  const content = document.getElementById('char-status-modal-content');
  const title   = document.getElementById('char-status-modal-title');
  if(title) title.textContent = `${char.name} — ${race?.name||''} ${job?.name||''}`;

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:auto 1fr;gap:12px;margin-bottom:10px;align-items:start">
      <div style="font-size:52px;line-height:1;text-align:center;background:var(--bg3);border:1px solid var(--border);padding:6px;min-width:64px;cursor:pointer" onclick="openPortraitModal('${char.id}')" title="タップでポートレート変更">
        ${portrait}
        <div style="font-size:8px;color:var(--gray);margin-top:2px">変更</div>
      </div>
      <div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:16px;color:var(--gold);font-weight:bold">${char.name}</span>
          <span style="font-size:10px;color:${job?.color||'white'}">${job?.name||''}</span>
          <span style="font-size:9px;color:var(--gray)">Lv${char.level}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;font-size:11px">
          <div class="stat-row"><span class="stat-label">HP</span><span class="stat-val" style="color:${hpColor(char.hp,char.maxHp)}">${char.hp}/${char.maxHp}</span></div>
          <div class="stat-row"><span class="stat-label">MP</span><span class="stat-val" style="color:var(--blue2)">${char.mp}/${char.maxMp}</span></div>
          <div class="stat-row"><span class="stat-label">EXP</span><span class="stat-val">${char.exp||0}</span></div>
          <div class="stat-row"><span class="stat-label">種族</span><span class="stat-val">${race?.name||'─'}</span></div>
        </div>
        <div style="margin-top:4px">${statusBadges(char)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div>
        <div class="stat-title">📊 能力値</div>
        <div style="background:var(--bg3);padding:4px;border:1px solid var(--border)">${statsHtml}</div>
      </div>
      <div>
        <div class="stat-title">⚔️ 装備</div>
        <div class="equip-grid" id="char-status-equip-${char.id}">${equipHtml}</div>
      </div>
    </div>

    <div style="margin-top:10px">
      <div class="stat-title">🎒 所持品 (${char.inventory?.length||0}/8)</div>
      <div class="item-list" style="max-height:140px" id="char-status-inv-${char.id}">${invHtml}</div>
    </div>

    <div style="margin-top:10px">
      <div class="stat-title">✨ 魔法 ${context==='town'?'<span style="font-size:9px;color:var(--gray)">(町では使用不可)</span>':''}</div>
      <div class="magic-grid" style="max-height:120px;overflow-y:auto">${spellHtml}</div>
    </div>
  `;
  // Store char id and context for sub-functions
  content.dataset.charId  = char.id;
  content.dataset.context = context;
}

// ---- 装備スロット選択 ----
function charStatusEquipSlot(charId, slot) {
  const all = [...new Set([...GS.party, ...GS.roster])];
  const char = all.find(c=>String(c.id)===String(charId));
  if(!char) return;

  const candidates = char.inventory
    .map((iid,ii)=>({iid,ii,item:getItem(iid)}))
    .filter(e=>e.item && e.item.slot===slot);

  // If already equipped, offer to unequip first
  const current = char.equip?.[slot];
  if(!candidates.length && !current) { log(`${slot}スロットに装備できるアイテムがない`,'sys'); return; }

  let html = `<div class="stat-title" style="font-size:11px">${char.name} の [${slot}] 変更</div>
    <div class="item-list" style="max-height:200px">`;
  if(current) {
    const ci = getItem(current);
    html += `<div class="item-row" style="border-color:var(--gold)">
      <span class="item-name" style="color:var(--gold)">▶ ${ci?.name||'不明'}（装備中）</span>
      <button class="mini-btn drop-btn" onclick="charStatusUnequip('${charId}','${slot}')">外す</button>
    </div>`;
  }
  if(!candidates.length) {
    html += `<div style="color:var(--gray);font-size:11px;padding:4px">所持品に装備可能なアイテムなし</div>`;
  }
  candidates.forEach(({iid,ii,item})=>{
    const restriction = equipRestrictionReason(char, item);
    const stats = `${item.atk?`ATK+${item.atk} `:''}${item.def?`DEF+${item.def} `:''}`;
    html += `<div class="item-row">
      <span class="item-name">${item.name}</span>
      <span style="font-size:9px;color:var(--gold)">${stats}</span>
      ${restriction ? `<span style="font-size:8px;color:var(--orange)">⚠${restriction}</span>` : ''}
      <button class="mini-btn equip-btn" onclick="charStatusDoEquip('${charId}','${slot}',${ii})">装備</button>
    </div>`;
  });
  html += '</div>';

  // Show inline below equip grid
  const grid = document.getElementById(`char-status-equip-${charId}`);
  if(!grid) return;
  let picker = document.getElementById('equip-slot-picker');
  if(!picker) { picker=document.createElement('div'); picker.id='equip-slot-picker'; picker.style.cssText='grid-column:1/-1;margin-top:4px;border:1px solid var(--gold);padding:6px;background:var(--bg3)'; grid.parentNode.appendChild(picker); }
  picker.innerHTML = html;
}

function charStatusDoEquip(charId, slot, invIdx) {
  const all = [...new Set([...GS.party, ...GS.roster])];
  const char = all.find(c=>String(c.id)===String(charId));
  if(!char) return;
  if(!char.equip) char.equip={};
  // Return old item to inventory
  const old = char.equip[slot];
  if(old) { char.inventory.push(old); }
  // Equip new
  const iid = char.inventory.splice(invIdx,1)[0];
  char.equip[slot] = iid;
  log(`${char.name}が[${getItem(iid)?.name}]を${slot}に装備した`,'item');
  const ctx = document.getElementById('char-status-modal-content')?.dataset?.context||'town';
  renderCharStatusModal(char, ctx);
}

function charStatusUnequip(charId, slot) {
  const all = [...new Set([...GS.party, ...GS.roster])];
  const char = all.find(c=>String(c.id)===String(charId));
  if(!char||!char.equip) return;
  if(char.inventory.length>=8) { log('荷物がいっぱいで外せない','sys'); return; }
  const iid = char.equip[slot];
  if(!iid) return;
  delete char.equip[slot];
  char.inventory.push(iid);
  log(`${char.name}の[${getItem(iid)?.name}]を外した`,'item');
  const ctx = document.getElementById('char-status-modal-content')?.dataset?.context||'town';
  renderCharStatusModal(char, ctx);
}

function charStatusEquipFromInventory(charId, invIdx) {
  const all = [...new Set([...GS.party, ...GS.roster])];
  const char = all.find(c=>String(c.id)===String(charId));
  if(!char) return;
  const iid = char.inventory[invIdx];
  const item = getItem(iid);
  if(!item?.slot) return;
  charStatusDoEquip(charId, item.slot, invIdx);
}

// ---- アイテム使用（町）----
function charStatusUseItemTown(charId, invIdx) {
  const all = [...new Set([...GS.party, ...GS.roster])];
  const char = all.find(c=>String(c.id)===String(charId));
  if(!char) return;
  const iid = char.inventory[invIdx];
  const item = getItem(iid);
  if(!item) return;
  if(item.heal) {
    const before = char.hp;
    char.hp = Math.min(char.maxHp, char.hp + item.heal);
    char.inventory.splice(invIdx,1);
    log(`${char.name}が[${item.name}]を使用。HP+${char.hp-before}`,'item');
  } else if(item.mpHeal) {
    char.mp = Math.min(char.maxMp, char.mp + item.mpHeal);
    char.inventory.splice(invIdx,1);
    log(`${char.name}が[${item.name}]を使用。MP+${item.mpHeal}`,'item');
  } else if(item.cure) {
    char.status = char.status.filter(s=>s!==item.cure);
    char.inventory.splice(invIdx,1);
    log(`${char.name}の${item.cure}が治った！`,'item');
  } else if(item.escape) {
    char.inventory.splice(invIdx,1);
    log(`[${item.name}]を使った（町ではすでに地上にいる）`,'sys');
  } else {
    log(`[${item.name}]は戦闘中のみ使用可能`,'sys');
    return;
  }
  const ctx = document.getElementById('char-status-modal-content')?.dataset?.context||'town';
  renderCharStatusModal(char, ctx);
  updatePartyDisplay?.();
}

// ---- アイテム使用（ダンジョン）---- system_dungeon.js の useItemInDungeon に委譲
function charStatusUseItem(charId, invIdx) {
  if(typeof useItemInDungeon === 'function') {
    useItemInDungeon(charId, invIdx);
  } else {
    charStatusUseItemTown(charId, invIdx);
  }
  const all=[...new Set([...GS.party,...GS.roster])];
  const char=all.find(c=>String(c.id)===String(charId));
  if(char) { const ctx=document.getElementById('char-status-modal-content')?.dataset?.context||'dungeon'; renderCharStatusModal(char,ctx); }
}

// ---- 魔法使用（ダンジョン中のみ）---- system_dungeon.js の castSpellOutsideBattle に委譲
function charStatusCastSpell(charId, spellId) {
  if(typeof castSpellOutsideBattle === 'function') {
    castSpellOutsideBattle(charId, spellId);
    const all=[...new Set([...GS.party,...GS.roster])];
    const char=all.find(c=>String(c.id)===String(charId));
    if(char) renderCharStatusModal(char,'dungeon');
  } else {
    log('ダンジョンでのみ魔法を使用できます','sys');
  }
}

// ==================== アイテム種族制限チェック ====================
// item.races が null/undefined なら全種族OK
// item.races が配列なら、その中にキャラの種族IDが含まれているか確認
function canCharEquipByRace(char, item) {
  if(!item) return false;
  if(!item.races) return true; // null = 全種族OK
  return item.races.includes(char.race);
}

// 職業制限と種族制限を両方チェック
function canCharEquipItem(char, item) {
  if(!item) return false;
  // 職業制限
  if(item.classes && !item.classes.includes(char.job)) return false;
  // 種族制限
  if(!canCharEquipByRace(char, item)) return false;
  return true;
}

// 装備できない理由を文字列で返す（UI表示用）
function equipRestrictionReason(char, item) {
  if(!item) return '';
  const reasons = [];
  if(item.classes && !item.classes.includes(char.job)) {
    reasons.push(`職業(${getJob(char.job)?.name})`);
  }
  if(item.races && !item.races.includes(char.race)) {
    const allowedRaceNames = item.races.map(r => getRace(r)?.name||r).join('/');
    reasons.push(`種族(必要:${allowedRaceNames})`);
  }
  return reasons.length ? `装備不可: ${reasons.join('・')}` : '';
}


// ==================== KEYBOARD ====================
document.addEventListener('keydown', e=>{
  if(document.activeElement.tagName==='INPUT') return;
  if(Battle.isActive()) return;
  const screen=document.querySelector('.screen.active');
  if(!screen||screen.id!=='main-screen') return;
  const map={'ArrowUp':'forward','w':'forward','W':'forward',
             'ArrowDown':'backward','s':'backward','S':'backward',
             'ArrowLeft':'turnLeft','a':'turnLeft','A':'turnLeft',
             'ArrowRight':'turnRight','d':'turnRight','D':'turnRight',
             'q':'strafeLeft','Q':'strafeLeft','e':'strafeRight','E':'strafeRight'};
  if(map[e.key]) { e.preventDefault(); Game.move(map[e.key]); }
});

// ==================== INIT ====================
window.addEventListener('load', ()=>{
  showScreen('title-screen');
});

// Auto-save periodically
setInterval(()=>{
  if(GS.party.length>0) Game.save();
}, 60000);
