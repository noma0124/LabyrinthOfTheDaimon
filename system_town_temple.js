/**
 * system_town_temple.js — 邪教の館
 * 依存: system_town_common.js
 */

// ==================== EVIL TEMPLE（邪教の館）====================
// GS.karma が未定義の場合は初期化（gamestate.js 変更禁止のため here で保証）
if(typeof GS.karma === 'undefined') GS.karma = 0;
// GS.monsters : 捕獲・合体で作られたモンスターインスタンスの配列
if(!GS.monsters) GS.monsters = [];

// ---- ランクバッジHTML（UI表現。ランク計算はgamedata.jsのgetMonsterRank()を使用）----
function rankBadgeHtml(rankValue) {
  const r = getMonsterRank(rankValue); // gamedata.js のグローバル関数
  return `<span class="rank-badge ${r.cssClass}">${r.label}</span>`;
}

function openEvilTemple() {
  renderEvilTempleContent();
  showModal('eviltemple-modal');
}

function renderEvilTempleContent(tab) {
  tab = tab || 'list';
  const tabs = ['list','fusion','release'];
  const tabLabels = {list:'一覧', fusion:'合体', release:'解放'};
  let tabHtml = `<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">`;
  tabs.forEach(t => {
    tabHtml += `<button class="cmd-btn ${t===tab?'active':''}" onclick="renderEvilTempleContent('${t}')">${tabLabels[t]}</button>`;
  });
  tabHtml += `</div>`;

  // 「一覧に戻る」ボタンを×ボタンの下に配置（一覧タブ以外で表示）
  const backBtn = tab !== 'list'
    ? '' // 詳細表示時はshowMonsterDetail内で個別に出す
    : '';

  // ×ボタンの下に「一覧に戻る」リンクを差し込む（詳細・装備変更画面用）
  const modalBox = document.querySelector('#eviltemple-modal .modal-box');
  let subBackEl = document.getElementById('eviltemple-back-btn');
  if (!subBackEl) {
    subBackEl = document.createElement('button');
    subBackEl.id = 'eviltemple-back-btn';
    subBackEl.className = 'mini-btn';
    subBackEl.style.cssText = 'display:none;margin:2px 8px 6px;font-size:11px;width:calc(100% - 16px)';
    subBackEl.textContent = '← 一覧に戻る';
    subBackEl.onclick = () => renderEvilTempleContent('list');
    const closeBtn = modalBox ? modalBox.querySelector('.modal-close') : null;
    if (closeBtn && closeBtn.parentNode) {
      closeBtn.parentNode.insertBefore(subBackEl, closeBtn.nextSibling);
    }
  }
  subBackEl.style.display = 'none'; // タブ切り替え時は隠す

  let bodyHtml = '';
  if(tab==='list') bodyHtml = renderEvilTempleList();
  else if(tab==='fusion') bodyHtml = renderEvilTempleFusion();
  else if(tab==='release') bodyHtml = renderEvilTempleRelease();

  const content = document.getElementById('eviltemple-content');
  content.innerHTML = tabHtml + bodyHtml;
}

// ---- モンスター一覧（酒場と同じインターフェースで加える/外す対応）----
function renderEvilTempleList() {
  const sp = typeof _isMobile === 'function' ? _isMobile() : window.innerWidth <= 600;

  // パーティ中のキャラ（_charRef を持つエントリ）
  const partyChars  = GS.party; // キャラオブジェクト配列
  // 邪教の館の住民（モンスター全員）
  const allMonsters = GS.monsters || [];

  if (!allMonsters.length) {
    return `<p style="color:var(--gray);font-size:12px;padding:8px">捕獲したモンスターがいない。<br>ダンジョンでモンスターが仲間になることがある。</p>`;
  }

  // ---- パーティ内にいる元キャラのIDセット ----
  const partyCharIds = new Set(GS.party.map(c => String(c.id)));

  const gridStyle = sp
    ? 'display:flex;flex-direction:column;gap:10px'
    : 'display:grid;grid-template-columns:1fr 1fr;gap:12px';

  let html = `<div style="${gridStyle}">`;

  // ===== 左列: パーティ中の邪教館キャラ =====
  const partyFromTemple = GS.party.filter(c => {
    // 邪教の館から加えたキャラ（_fromTemple フラグ）
    return c._fromTemple;
  });

  html += `
    <div>
      <div class="stat-title" style="font-size:${sp?13:11}px;margin-bottom:6px">
        パーティ中 (${GS.party.length}/6)
        <span style="font-size:${sp?10:9}px;color:var(--gray);margin-left:6px">外すと館に戻ります</span>
      </div>
      <div style="min-height:30px">`;

  // パーティ内にいる全員を表示（邪教館出身かどうか問わず確認できるよう）
  if (!GS.party.length) {
    html += `<p style="color:var(--gray);font-size:${sp?12:11}px;padding:6px">パーティメンバーなし</p>`;
  }
  GS.party.forEach((c, i) => {
    const rowLabel = i < 3 ? `前${i+1}` : `後${i-2}`;
    const rowColor = i < 3 ? 'var(--orange)' : 'var(--cyan)';
    const jobInfo  = typeof getJob === 'function' ? getJob(c.job) : null;
    const isFromTemple = !!c._fromTemple;

    html += `
      <div class="item-row" style="
        background:var(--bg3);
        margin-bottom:${sp?5:3}px;
        border:1px solid var(--border2);
        padding:${sp?'7px 6px':'3px 5px'};
        min-height:${sp?44:32}px;
        align-items:center;
        display:flex;gap:${sp?6:4}px;
      ">
        <span style="font-size:${sp?11:9}px;color:${rowColor};min-width:${sp?24:20}px;font-weight:bold;text-align:center;flex-shrink:0">${rowLabel}</span>
        <span style="font-size:${sp?22:18}px;flex-shrink:0;line-height:1">${c.portrait||'🧑‍🦯'}</span>
        <span class="item-name" style="font-size:${sp?13:11}px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</span>
        ${jobInfo ? `<span class="item-type" style="color:${jobInfo.color||'white'};font-size:${sp?11:10}px;flex-shrink:0">${jobInfo.name}</span>` : ''}
        <span class="item-val" style="font-size:${sp?11:10}px;flex-shrink:0;min-width:${sp?28:24}px;text-align:right">Lv${c.level}</span>
        ${isFromTemple ? `
        <button class="mini-btn drop-btn"
                onclick="templeRemoveFromParty(${i})"
                style="flex-shrink:0;${sp?'min-width:44px;min-height:36px;font-size:13px;padding:4px 8px;':''}">外す</button>
        ` : `<span style="font-size:${sp?10:9}px;color:var(--gray);flex-shrink:0;padding:0 4px">冒険者</span>`}
      </div>`;
  });

  html += `</div></div>`;

  // ===== 右列: 館にいるモンスター一覧 =====
  // パーティ中のキャラ（_fromTemple）のIDセット
  const inPartyTempleIds = new Set(
    GS.party.filter(c => c._fromTemple).map(c => String(c._templeId))
  );

  const benchMonsters = allMonsters.filter(m => !inPartyTempleIds.has(String(m.id)));

  html += `
    <div>
      <div class="stat-title" style="font-size:${sp?13:11}px;margin-bottom:6px">
        館の住民 (${allMonsters.length}体)
      </div>
      <div class="item-list">`;

  benchMonsters.forEach((m, _bi) => {
    const mi = allMonsters.indexOf(m);
    const rankBadge = rankBadgeHtml(m.rank||1);
    const canAdd = GS.party.length < 6;

    html += `
      <div class="item-row" style="
        cursor:pointer;
        padding:${sp?'7px 6px':'3px 5px'};
        min-height:${sp?44:32}px;
        margin-bottom:${sp?5:3}px;
        align-items:center;
        display:flex;gap:${sp?6:4}px;
      " onclick="showMonsterDetail(${mi})">
        <span style="font-size:${sp?22:18}px;flex-shrink:0;line-height:1">${m.img||'👾'}</span>
        <span class="item-name" style="font-size:${sp?13:11}px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.name}</span>
        ${rankBadge}
        <span class="item-type" style="color:var(--cyan);font-size:${sp?11:10}px;flex-shrink:0">HP:${m.hp}</span>
        <span class="item-val" style="font-size:${sp?11:10}px;flex-shrink:0">ATK:${m.atk}</span>
        <button class="mini-btn use-btn"
                onclick="event.stopPropagation();templeAddToParty('${m.id}')"
                style="flex-shrink:0;${sp?'min-width:52px;min-height:36px;font-size:13px;padding:4px 8px;':''}"
                ${!canAdd?'disabled title="パーティが満員"':''}>加える</button>
      </div>`;
  });

  if (!benchMonsters.length) {
    html += `<p style="color:var(--gray);font-size:${sp?12:11}px;padding:6px">館に残っているモンスターなし</p>`;
  }

  html += `</div></div></div>`;
  html += `<p style="font-size:10px;color:var(--gray);margin-top:6px">捕獲数: ${allMonsters.length}体</p>`;
  return html;
}

// ---- 邪教の館からパーティに加える ----
function templeAddToParty(monsterId) {
  if (!GS.monsters) GS.monsters = [];
  if (GS.party.length >= 6) { alert('パーティが満員！'); return; }

  const m = GS.monsters.find(x => String(x.id) === String(monsterId));
  if (!m) return;

  // 元キャラ参照がある場合はそのまま復帰（ステータス変更なし）
  if (m._charRef) {
    const c = m._charRef;
    c._fromTemple = true;   // パーティ内で邪教館出身と識別
    c._templeId   = m.id;   // 対応するモンスターエントリのID
    GS.party.push(c);
    log(`${c.name} が邪教の館からパーティに加わった`, 'event');
  } else {
    // 純粋なモンスターをパーティキャラとして加える（簡易変換）
    const pseudo = {
      id:          m.id,
      _fromTemple: true,
      _templeId:   m.id,
      _charRef:    null,
      name:        m.name,
      portrait:    m.img || '👾',
      job:         null,
      race:        null,
      level:       Math.max(1, m.floor || 1),
      hp: m.hp, maxHp: m.hp,
      mp: 0,    maxMp: 0,
      str: m.atk, agi: 10, intel: 5, pie: 5, vit: m.def, luk: 5,
      status: [],
      inventory: [],
      equipment: m.equipment || {}
    };
    GS.party.push(pseudo);
    log(`${m.name} がパーティに加わった`, 'event');
  }

  if (typeof updatePartyDisplay === 'function') updatePartyDisplay();
  renderEvilTempleContent('list');
}

// ---- パーティから邪教の館に戻す ----
function templeRemoveFromParty(idx) {
  const c = GS.party[idx];
  if (!c) return;

  // _templeId で館のエントリを探し、_fromTemple フラグをリセット
  if (c._fromTemple) {
    c._fromTemple = false;
    // 対応するモンスターエントリが消えていれば再登録
    if (!GS.monsters) GS.monsters = [];
    const exists = GS.monsters.some(m => String(m.id) === String(c._templeId));
    if (!exists && c._templeId) {
      // _charRef を持つキャラの場合は再登録
      GS.monsters.push({
        id:       c._templeId || ('char_' + c.id),
        _charId:  c.id,
        _charRef: c,
        name:     c.name,
        img:      c.portrait || '🧑‍🦯',
        floor:    GS.floor || 1,
        rank:     Math.max(1, Math.floor((c.level||1)/3)+1),
        hp:       c.hp,
        atk:      c.str || 10,
        def:      c.vit || 5,
        exp:      (c.level||1)*10,
        gold:     0,
        abilities:[],
        group:    '人',
        joinRate: 0,
        joinable: true,
        equipment:{},
        drops:    []
      });
    }
    log(`${c.name} が邪教の館に戻った`, 'event');
  }

  GS.party.splice(idx, 1);
  if (typeof updatePartyDisplay === 'function') updatePartyDisplay();
  renderEvilTempleContent('list');
}

function showMonsterDetail(idx) {
  const m = GS.monsters[idx];
  if(!m) return;

  // ×ボタンの下に「一覧に戻る」ボタンを表示
  const subBackEl = document.getElementById('eviltemple-back-btn');
  if (subBackEl) {
    subBackEl.style.display = 'block';
    subBackEl.onclick = () => renderEvilTempleContent('list');
  }

  const equip = m.equipment || {};
  const equipSlots = DATA.equipSlots || [];
  let equipHtml = `<div style="margin-top:8px">
    <div class="stat-title" style="font-size:11px">装備</div>`;
  equipSlots.forEach(slot => {
    const itemId = equip[slot];
    const item = itemId ? getItem(itemId) : null;
    equipHtml += `<div class="stat-row" style="font-size:10px">
      <span class="stat-label" style="color:var(--gray)">${slot}</span>
      <span class="stat-val">${item ? item.name : '<span style="color:var(--gray2)">なし</span>'}
        <button class="mini-btn" style="font-size:8px;margin-left:4px" onclick="openMonsterEquipChange(${idx},'${slot}')">変更</button>
      </span>
    </div>`;
  });
  equipHtml += `</div>`;

  const abilitiesStr = (m.abilities||[]).length ? m.abilities.join(', ') : 'なし';
  const rankInfo = getMonsterRank(m.rank||1);
  const rankBadge = rankBadgeHtml(m.rank||1);

  const content = document.getElementById('eviltemple-content');
  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <span style="font-size:40px">${m.img||'👾'}</span>
      <div>
        <div style="font-size:16px;color:var(--gold)">${m.name} ${rankBadge}</div>
        <div style="font-size:10px;color:var(--gray)">Floor相当: ${m.floor||1}F　ランク: ${rankInfo.rank}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px">
      <div class="stat-row"><span class="stat-label">HP</span><span class="stat-val">${m.hp}</span></div>
      <div class="stat-row"><span class="stat-label">ATK</span><span class="stat-val">${m.atk}</span></div>
      <div class="stat-row"><span class="stat-label">DEF</span><span class="stat-val">${m.def}</span></div>
      <div class="stat-row"><span class="stat-label">EXP</span><span class="stat-val">${m.exp}</span></div>
      <div class="stat-row"><span class="stat-label">GOLD</span><span class="stat-val">${m.gold}</span></div>
      <div class="stat-row"><span class="stat-label">グループ</span><span class="stat-val">${m.group||'─'}</span></div>
    </div>
    <div class="stat-row"><span class="stat-label">特殊能力</span><span class="stat-val" style="color:var(--cyan)">${abilitiesStr}</span></div>
    ${equipHtml}
  `;
}

function openMonsterEquipChange(monsterIdx, slot) {
  const m = GS.monsters[monsterIdx];
  if(!m) return;

  // ×ボタンの下の「一覧に戻る」を詳細に戻るよう切り替え
  const subBackEl = document.getElementById('eviltemple-back-btn');
  if (subBackEl) {
    subBackEl.style.display = 'block';
    subBackEl.onclick = () => showMonsterDetail(monsterIdx);
  }

  // Gather all items available from party inventories + monster's current equip
  const allItems = [];
  [...GS.party, ...GS.roster].forEach(c => {
    c.inventory.forEach(iid => {
      const item = getItem(iid);
      if(item && item.slot === slot && !allItems.find(x=>x.iid===iid&&x.owner===c.id)) {
        allItems.push({iid, item, owner: c.id, ownerName: c.name, char: c});
      }
    });
  });

  const content = document.getElementById('eviltemple-content');
  let html = `
    <div class="stat-title">${m.name} の [${slot}] 変更</div>
    <div style="font-size:10px;color:var(--gray);margin-bottom:6px">※ モンスターは職業・種族制限なし</div>
    <div class="item-list" style="margin-top:8px">
      <div class="item-row" onclick="equipMonsterItem(${monsterIdx},'${slot}',null,null,null)" style="cursor:pointer">
        <span class="item-name" style="color:var(--gray)">装備なし</span>
        <button class="mini-btn">選択</button>
      </div>`;
  if(!allItems.length) {
    html += `<p style="color:var(--gray);font-size:11px;padding:4px">パーティに装備できるアイテムがない</p>`;
  }
  allItems.forEach((entry, ei) => {
    const {iid, item, owner, ownerName, char} = entry;
    const restrictNote = char ? equipRestrictionReason(char, item) : '';
    html += `<div class="item-row" style="cursor:pointer" onclick="equipMonsterItem(${monsterIdx},'${slot}','${iid}','${owner}',${ei})">
      <span class="item-name">${item.name}</span>
      <span class="item-type" style="font-size:9px;color:var(--gray)">${ownerName}の所持</span>
      <span class="item-val" style="font-size:9px">${item.atk?`ATK+${item.atk} `:''}${item.def?`DEF+${item.def}`:''}${item.heal?`HP+${item.heal}`:''}</span>
      ${restrictNote ? `<span style="font-size:8px;color:var(--orange)" title="${restrictNote}">⚠</span>` : ''}
      <button class="mini-btn use-btn">装備</button>
    </div>`;
  });
  html += `</div>`;
  content.innerHTML = html;
}

function equipMonsterItem(monsterIdx, slot, iid, ownerId, _ei) {
  const m = GS.monsters[monsterIdx];
  if(!m) return;
  if(!m.equipment) m.equipment = {};

  // Return previously equipped item to a party member if possible
  const prevId = m.equipment[slot];
  if(prevId) {
    const target = GS.party.find(c=>c.isAlive&&c.inventory.length<8) || GS.roster.find(c=>c.inventory.length<8);
    if(target) { target.inventory.push(prevId); log(`${m.name}の[${getItem(prevId)?.name}]を${target.name}に返却`,'item'); }
  }

  if(iid && ownerId) {
    const owner = [...GS.party,...GS.roster].find(c=>String(c.id)===String(ownerId));
    if(owner) {
      const ii = owner.inventory.indexOf(iid);
      if(ii>=0) owner.inventory.splice(ii,1);
    }
    m.equipment[slot] = iid;
    log(`${m.name}に[${getItem(iid)?.name}]を装備させた`,'item');
  } else {
    delete m.equipment[slot];
    log(`${m.name}の[${slot}]装備を外した`,'sys');
  }
  showMonsterDetail(monsterIdx);
}

// ---- 合体 ----
function renderEvilTempleFusion() {
  const karmaCost = 100;
  if(GS.monsters.length < 2) {
    return `<p style="color:var(--gray);font-size:12px;padding:8px">合体には2体以上のモンスターが必要です。</p>`;
  }
  let html = `
    <div style="background:var(--bg3);border:1px solid var(--purple);padding:8px;margin-bottom:10px;font-size:11px">
      <div style="color:var(--gold2);margin-bottom:4px">🔮 モンスター合体</div>
      <div>カルマを消費して2体のモンスターを合体させます。</div>
      <div style="color:var(--gray);margin-top:2px">・消費カルマ: <span style="color:var(--cyan)">${karmaCost}</span> / 現在: <span id="karma-disp-fusion" style="color:var(--gold)">${GS.karma}</span></div>
      <div style="color:var(--gray)">・ランク: 素材の平均 ±5ランダム</div>
      <div style="color:var(--gray)">・能力値: 平均 ±5ランダム</div>
      <div style="color:var(--gray)">・スキル: 素材スキルからランダム引き継ぎ</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <div class="stat-title" style="font-size:10px">素材A</div>
        <select id="fusion-a" style="width:100%;background:var(--bg3);color:var(--white);border:1px solid var(--border);padding:4px;font-family:var(--font-jp);font-size:11px">
          ${GS.monsters.map((m,i)=>`<option value="${i}">${m.img||'👾'} ${m.name} (${m.floor||1}F)</option>`).join('')}
        </select>
      </div>
      <div>
        <div class="stat-title" style="font-size:10px">素材B</div>
        <select id="fusion-b" style="width:100%;background:var(--bg3);color:var(--white);border:1px solid var(--border);padding:4px;font-family:var(--font-jp);font-size:11px">
          ${GS.monsters.map((m,i)=>`<option value="${i}" ${i===1?'selected':''}>${m.img||'👾'} ${m.name} (${m.floor||1}F)</option>`).join('')}
        </select>
      </div>
    </div>
    <button class="cmd-btn" style="background:linear-gradient(135deg,var(--purple),#6a0dad);border-color:var(--purple);width:100%" onclick="doFusion()">🔮 合体実行 (-${karmaCost}カルマ)</button>
    <div id="fusion-result" style="margin-top:10px"></div>
  `;
  return html;
}

function doFusion() {
  const karmaCost = 100;
  if(GS.karma < karmaCost) {
    document.getElementById('fusion-result').innerHTML =
      `<div style="color:var(--red2);font-size:12px">カルマが足りない！ (必要: ${karmaCost} / 現在: ${GS.karma})</div>`;
    return;
  }
  const idxA = parseInt(document.getElementById('fusion-a').value);
  const idxB = parseInt(document.getElementById('fusion-b').value);
  if(idxA === idxB) {
    document.getElementById('fusion-result').innerHTML =
      `<div style="color:var(--red2);font-size:12px">同じモンスターは選べません！</div>`;
    return;
  }

  const mA = GS.monsters[idxA];
  const mB = GS.monsters[idxB];

  // Rank (floor) calculation
  const avgFloor = (mA.floor + mB.floor) / 2;
  const newFloor = Math.max(1, Math.round(avgFloor + rand(-5, 5)));

  // Find base monster closest to newFloor for template
  const allMonsters = DATA.monsters;
  const base = allMonsters.reduce((best, m) => {
    return Math.abs(m.floor - newFloor) < Math.abs(best.floor - newFloor) ? m : best;
  }, allMonsters[0]);

  // Stats averaging with ±5 variance
  const newHp  = Math.max(1, Math.round((mA.hp  + mB.hp)  / 2 + rand(-5, 5)));
  const newAtk = Math.max(1, Math.round((mA.atk + mB.atk) / 2 + rand(-5, 5)));
  const newDef = Math.max(0, Math.round((mA.def + mB.def) / 2 + rand(-5, 5)));
  const newExp = Math.max(1, Math.round((mA.exp + mB.exp) / 2 + rand(-5, 5)));
  const newGold= Math.max(0, Math.round((mA.gold+ mB.gold)/ 2 + rand(-5, 5)));

  // Skills: pool all abilities, pick random subset
  const allAbilities = [...new Set([...(mA.abilities||[]), ...(mB.abilities||[])])];
  const pickCount = rand(0, Math.max(0, allAbilities.length));
  const shuffled = allAbilities.sort(()=>Math.random()-0.5);
  const newAbilities = shuffled.slice(0, pickCount);

  // Name generation
  const prefixes = ['ダーク','ネクロ','ブラッド','シャドウ','カオス','インフェルノ','クリムゾン','ヴォイド'];
  const newName = randFrom(prefixes) + base.name;

  const imgs = ['👿','💀','🔮','🌑','⚡','🔥','☠️','🌀','🦂','🐲'];
  const newImg = randFrom(imgs);

  const newMonster = {
    id: 'fused_' + Date.now(),
    name: newName,
    floor: newFloor,
    hp: newHp,
    atk: newAtk,
    def: newDef,
    exp: newExp,
    gold: newGold,
    abilities: newAbilities,
    img: newImg,
    group: newFloor >= 11 ? '超強' : newFloor >= 7 ? '強' : newFloor >= 4 ? '中' : '弱',
    joinRate: 0,
    joinable: false,
    drops: [],
    equipment: {}
  };

  // Remove both source monsters (remove higher index first)
  const removeIdxs = [idxA, idxB].sort((a,b)=>b-a);
  removeIdxs.forEach(i => GS.monsters.splice(i, 1));

  GS.monsters.push(newMonster);
  GS.karma -= karmaCost;

  const el = document.getElementById('karma-disp-fusion');
  if(el) el.textContent = GS.karma;

  const abStr = newAbilities.length ? newAbilities.join(', ') : 'なし';
  document.getElementById('fusion-result').innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--gold);padding:10px;animation:fadeIn 0.4s">
      <div style="font-size:14px;color:var(--gold);margin-bottom:6px">✨ 合体成功！</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:30px">${newImg}</span>
        <div>
          <div style="font-size:14px;color:var(--gold2)">${newName} ${rankBadgeHtml(newFloor)}</div>
          <div style="font-size:10px;color:var(--gray)">Floor相当: ${newFloor}F　ランク: ${getMonsterRank(newFloor).rank}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font-size:11px">
        <div>HP: <span style="color:var(--green2)">${newHp}</span></div>
        <div>ATK: <span style="color:var(--red2)">${newAtk}</span></div>
        <div>DEF: <span style="color:var(--cyan)">${newDef}</span></div>
        <div>EXP: <span style="color:var(--yellow)">${newExp}</span></div>
        <div>GOLD: <span style="color:var(--gold)">${newGold}</span></div>
      </div>
      <div style="font-size:10px;margin-top:4px;color:var(--cyan)">能力: ${abStr}</div>
      <button class="cmd-btn" style="margin-top:8px;font-size:11px" onclick="renderEvilTempleContent('fusion')">もう一度合体</button>
    </div>
  `;
  log(`${mA.name}と${mB.name}が合体し、${newName}が誕生した！（カルマ-${karmaCost}）`, 'event');
}

// ---- 解放 ----
function renderEvilTempleRelease() {
  if(!GS.monsters.length) {
    return `<p style="color:var(--gray);font-size:12px;padding:8px">解放できるモンスターがいない。</p>`;
  }
  let html = `
    <div style="background:var(--bg3);border:1px solid var(--border);padding:8px;margin-bottom:10px;font-size:11px;color:var(--gray)">
      モンスターを自然に帰します。装備品はパーティに返却されます。解放時に <span style="color:var(--purple)">1〜10カルマ</span> を獲得します。
    </div>
    <div class="item-list">`;
  GS.monsters.forEach((m, i) => {
    const rankBadge = rankBadgeHtml(m.rank||1);
    html += `<div class="item-row">
      <span style="width:28px;font-size:18px">${m.img||'👾'}</span>
      <span class="item-name">${m.name}</span>
      ${rankBadge}
      <span class="item-type" style="color:var(--cyan)">HP:${m.hp}</span>
      <span class="item-val">ATK:${m.atk}</span>
      <button class="mini-btn drop-btn" onclick="releaseMonster(${i})">解放</button>
    </div>`;
  });
  html += `</div>`;
  return html;
}

function releaseMonster(idx) {
  const m = GS.monsters[idx];
  if(!m) return;
  if(!confirm(`「${m.name}」を解放しますか？\n解放するとカルマを獲得できます。`)) return;

  // Return equipment to party
  const equip = m.equipment || {};
  Object.values(equip).forEach(iid => {
    if(!iid) return;
    const target = GS.party.find(c=>c.isAlive&&c.inventory.length<8) ||
                   GS.roster.find(c=>c.inventory.length<8);
    if(target) {
      target.inventory.push(iid);
      log(`${m.name}の装備[${getItem(iid)?.name}]を${target.name}に返却`, 'item');
    }
  });

  // Karma gain: 1-10 random
  const karmaGain = rand(1, 10);
  GS.karma += karmaGain;
  renderTownGold(); // refresh karma display

  GS.monsters.splice(idx, 1);
  log(`${m.name}を解放した。カルマ+${karmaGain}（合計: ${GS.karma}）`, 'event');
  renderEvilTempleContent('release');
}

