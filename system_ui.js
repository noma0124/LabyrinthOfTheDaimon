/**
 * ============================================================
 *  system_ui.js — UI更新・装備・アイテム操作
 * ============================================================
 *
 * 【このファイルの役割】
 *   パーティ表示の更新、キャラ詳細、装備変更、
 *   アイテムの使用・ドロップ・受け渡しを担当します。
 *
 * 【依存関係】
 *   gamedata.js、gamestate.js、system_char.js
 *
 * 【読み込み順】
 *   5番目
 *
 * 【公開する主な関数】
 *   updatePartyDisplay()       パーティパネル再描画
 *   updateGoldDisplay()        所持金表示更新
 *   updateQuickInfo()          ヘッダーの簡易情報更新
 *   showCharDetail(idx)        キャラ詳細モーダル表示
 *   toggleEquipMenu(charIdx, slot)  装備スロット選択UI表示
 *   doEquip(charIdx, slot, itemId)  装備変更実行
 *   quickEquip(charIdx, itemId)     クイック装備（最適スロットに自動装備）
 *   useItem(charIdx, itemIdx)       アイテム使用
 *   dropItem(charIdx, itemIdx)      アイテム捨て
 *   transferItem(fromIdx, itemIdx, toIdx) アイテム受け渡し
 *
 * ============================================================
 */


// ==================== UI UPDATES ====================
function updatePartyDisplay() {
  const el = document.getElementById('party-list');
  if(!el) return;

  if(!GS.party.length) {
    el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:4px">パーティなし</div>';
    return;
  }

  const posLabel = i => (i < 3 ? '前' : '後') + (i % 3 + 1);

  const hpBar = (cur, max) => {
    const pct = max ? Math.min(100, Math.round(cur / max * 100)) : 0;
    const col = pct > 50 ? 'var(--green)' : pct > 25 ? 'var(--yellow)' : 'var(--red2)';
    return `<div class="party-bar"><div class="party-bar-fill" style="width:${pct}%;background:${col}"></div></div>`;
  };
  const mpBar = (cur, max) => {
    const pct = max ? Math.min(100, Math.round(cur / max * 100)) : 0;
    return `<div class="party-bar"><div class="party-bar-fill" style="width:${pct}%;background:var(--blue)"></div></div>`;
  };

  let html = '';
  GS.party.forEach((c, i) => {
    const dead  = !c.isAlive || c.status.includes('dead');
    const stone = c.status.includes('stone');
    const jobName = c.isMonster ? '怪' : (getJob(c.job)?.name || c.job || '');
    const icon = dead ? '💀' : stone ? '🗿' : c.status.includes('poison') ? '☠' : '';
    const rowClass = ['party-row', dead || stone ? 'dead' : '', c.isMonster ? 'monster-member' : ''].filter(Boolean).join(' ');

    html += `<div class="${rowClass}" onclick="showCharDetail(${i})">
      <div class="pr-pos">${posLabel(i)}</div>
      <div class="pr-lv">${c.level || 1}</div>
      <div class="pr-name">${icon}${c.name}${statusBadges(c)}</div>
      <div class="pr-job">${jobName}</div>
      <div class="pr-hp">
        <div class="pr-val" style="color:${hpColor(c.hp, c.maxHp)}">${c.hp}/${c.maxHp}</div>
        ${hpBar(c.hp, c.maxHp)}
      </div>
      <div class="pr-mp">
        <div class="pr-val" style="color:var(--blue2)">${c.mp || 0}/${c.maxMp || 0}</div>
        ${mpBar(c.mp || 0, c.maxMp || 0)}
      </div>
    </div>`;
  });

  el.innerHTML = html;
}

function updateGoldDisplay() {
  const el=document.getElementById('gold-display');
  if(el) el.textContent=`${GS.gold}G`;
}

function updateQuickInfo() {
  // 座標をヘッダーに表示（quick-infoバーは廃止）
  const coordEl = document.getElementById('coord-display');
  if(coordEl && GS.playerPos) {
    const {x, y} = GS.playerPos;
    coordEl.textContent = `(${x},${y})`;
  }
}

function showCharDetail(idx) {
  const c=GS.party[idx];
  if(!c) return;
  const stats=calcStats(c);
  const content=document.getElementById('char-modal-content');
  document.getElementById('char-modal-title').textContent=`${c.name} のステータス`;

  const job=getJob(c.job);
  const race=getRace(c.race);
  const expNeed=calcEXPNeeded(c.level);
  const curAtk=calcATK(c);
  const curDef=calcDEF(c);

  // Build equip slots HTML with inline equip UI
  const equipSlotsHtml=DATA.equipSlots.map(slot=>{
    const iid=c.equip[slot];
    const item=iid?getItem(iid):null;
    // Find compatible items from inventory for this slot
    const compatible=c.inventory.filter(iid2=>{
      const it=getItem(iid2);
      if(!it||it.slot!==slot) return false;
      if(it.classes&&!it.classes.includes(c.job)) return false;
      return true;
    });
    const hasOptions=compatible.length>0;
    return `<div class="equip-slot ${hasOptions?'has-options':''}" onclick="toggleEquipMenu(${idx},'${slot}')">
      <span class="equip-slot-label">${slot}</span>
      <span class="equip-slot-item">${item?item.name:'──'}</span>
      ${item?`<span style="font-size:9px;color:var(--gold);margin-left:2px">${item.atk?`A+${item.atk}`:''}${item.def?`D+${item.def}`:''}</span>`:''}
      ${hasOptions?`<span style="font-size:9px;color:var(--green2);margin-left:auto">▼</span>`:''}
    </div>
    <div id="equip-menu-${slot.replace(/[^a-z]/gi,'_')}" class="equip-dropdown" style="display:none">
      ${iid?`<div class="equip-option" onclick="doEquip(${idx},'${slot}',null)">[ 外す ]</div>`:''}
      ${compatible.map(ciid=>{
        const ci=getItem(ciid);
        const atkDiff=ci.atk?(ci.atk-(item?.atk||0)):0;
        const defDiff=ci.def?(ci.def-(item?.def||0)):0;
        const diffStr=[
          atkDiff!==0?`ATK${atkDiff>=0?'+':''}${atkDiff}`:'',
          defDiff!==0?`DEF${defDiff>=0?'+':''}${defDiff}`:''
        ].filter(Boolean).join(' ');
        const diffColor=atkDiff>0||defDiff>0?'var(--green2)':atkDiff<0||defDiff<0?'var(--red2)':'var(--gray)';
        return `<div class="equip-option" onclick="doEquip(${idx},'${slot}','${ciid}')">
          <span>${ci.name}</span>
          <span style="font-size:9px;color:${diffColor};margin-left:6px">${diffStr||'±0'}</span>
        </div>`;
      }).join('')}
      ${!compatible.length&&!iid?`<div style="font-size:10px;color:var(--gray);padding:4px">装備可能アイテムなし</div>`:''}
    </div>`;
  }).join('');

  // Inventory HTML with transfer
  const invHtml=c.inventory.map((iid,ii)=>{
    const item=getItem(iid);
    if(!item) return '';
    const isEquippable=item.slot&&(!item.classes||item.classes.includes(c.job));
    const isUsable=!!(item.heal||item.mpHeal||item.cure||item.escape||item.spellId);
    // Transfer targets: other alive party members who have inventory space
    const transferTargets=GS.party.filter((oc,oi)=>oi!==idx&&oc.isAlive&&!oc.status.includes('stone')&&oc.inventory.length<8);
    const hasTransfer=transferTargets.length>0;
    const transSelId=`ts_${idx}_${ii}`;
    const transferOpts=transferTargets.map(oc=>`<option value="${GS.party.indexOf(oc)}">${oc.name}(${oc.inventory.length}/8)</option>`).join('');
    return `<div class="item-row" style="flex-wrap:wrap;align-items:flex-start;padding:4px 6px;">
      <div style="display:flex;align-items:center;width:100%;gap:4px;">
        <span class="item-name" style="flex:1">${item.name}</span>
        <span class="item-type" style="color:${item.slot?'var(--cyan)':'var(--green2)'};font-size:9px">${item.type}</span>
        <span style="font-size:9px;color:var(--gold);">${item.atk?`A+${item.atk} `:''}${item.def?`D+${item.def}`:''}${item.heal?`HP+${item.heal}`:''}${item.mpHeal?`MP+${item.mpHeal}`:''}</span>
      </div>
      <div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:3px;">
        ${isEquippable?`<button class="mini-btn equip-btn" onclick="quickEquip(${idx},'${iid}')">装備</button>`:''}
        ${isUsable?`<button class="mini-btn use-btn" onclick="useItem(${idx},${ii})">使用</button>`:''}
        ${hasTransfer?`<select id="${transSelId}" style="font-size:9px;background:var(--bg3);color:var(--white);border:1px solid var(--border);padding:1px 2px;">${transferOpts}</select><button class="mini-btn" style="border-color:var(--purple);color:#c080ff" onclick="transferItem(${idx},${ii},parseInt(document.getElementById('${transSelId}').value))">渡す</button>`:'<span style="font-size:9px;color:var(--gray)">渡せる仲間なし</span>'}
        <button class="mini-btn drop-btn" onclick="dropItem(${idx},${ii})">捨</button>
      </div>
    </div>`;
  }).join('');

  content.innerHTML=`
    <div class="status-grid">
      <div class="stat-block">
        <div class="stat-title">基本情報</div>
        <div class="stat-row"><span class="stat-label">種族</span><span class="stat-val">${race?.name||c.race}</span></div>
        <div class="stat-row"><span class="stat-label">職業</span><span class="stat-val" style="color:${job?.color||'white'}">${job?.name||c.job}</span></div>
        <div class="stat-row"><span class="stat-label">レベル</span><span class="stat-val">${c.level}</span></div>
        <div class="stat-row"><span class="stat-label">EXP</span><span class="stat-val">${c.exp}/${expNeed}</span></div>
        <div class="stat-row"><span class="stat-label">HP</span><span class="stat-val" style="color:${hpColor(c.hp,c.maxHp)}">${c.hp}/${c.maxHp}</span></div>
        <div class="stat-row"><span class="stat-label">MP</span><span class="stat-val" style="color:var(--blue2)">${c.mp}/${c.maxMp}</span></div>
        <div class="stat-row"><span class="stat-label">ATK</span><span class="stat-val" style="color:var(--orange)">${curAtk}</span></div>
        <div class="stat-row"><span class="stat-label">DEF</span><span class="stat-val" style="color:var(--cyan)">${curDef}</span></div>
        <div class="stat-row"><span class="stat-label">状態</span><span class="stat-val">${c.status.length?statusBadges(c):'<span style="color:var(--green2)">正常</span>'}</span></div>
      </div>
      <div class="stat-block">
        <div class="stat-title">能力値（種族補正込）</div>
        ${[
          ['力 (STR)',stats.str,'var(--orange)'],
          ['素早(AGI)',stats.agi,'var(--green2)'],
          ['知性(INT)',stats.intel,'var(--blue2)'],
          ['信仰(PIE)',stats.pie,'var(--yellow)'],
          ['生命(VIT)',stats.vit,'var(--red2)'],
          ['運  (LUK)',stats.luk,'var(--purple)']
        ].map(([label,val,col])=>`
          <div class="stat-row">
            <span class="stat-label">${label}</span>
            <span class="stat-val" style="color:${col}">${val}</span>
          </div>`).join('')}
      </div>
    </div>

    <div style="margin-top:10px">
      <div class="stat-title">⚔ 装備スロット <span style="font-size:9px;color:var(--gray)">（▼マークをクリックで装備変更）</span></div>
      <div class="equip-grid" id="equip-grid-${idx}">
        ${equipSlotsHtml}
      </div>
    </div>

    <div style="margin-top:10px">
      <div class="stat-title">🎒 所持品 (${c.inventory.length}/8)</div>
      <div class="item-list" id="inv-list-${idx}">
        ${invHtml||'<div style="color:var(--gray);font-size:11px;padding:6px">所持品なし</div>'}
      </div>
    </div>

    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
      <button class="cmd-btn" onclick="hideModal('char-modal')">閉じる</button>
      ${idx>0?`<button class="cmd-btn" onclick="showCharDetail(${idx-1})">◀ 前</button>`:''}
      ${idx<GS.party.length-1?`<button class="cmd-btn" onclick="showCharDetail(${idx+1})">次 ▶</button>`:''}
    </div>
  `;
  showModal('char-modal');
}

function toggleEquipMenu(charIdx, slot) {
  const key=slot.replace(/[^a-z]/gi,'_');
  const menu=document.getElementById(`equip-menu-${key}`);
  if(!menu) return;
  const isOpen=menu.style.display!=='none';
  // Close all other menus first
  document.querySelectorAll('.equip-dropdown').forEach(m=>m.style.display='none');
  if(!isOpen) menu.style.display='block';
}

function doEquip(charIdx, slot, itemId) {
  const c=GS.party[charIdx];
  if(!c) return;

  const oldId=c.equip[slot];
  const oldItem=oldId?getItem(oldId):null;
  const newItem=itemId?getItem(itemId):null;

  if(itemId===null) {
    // Unequip
    if(oldId) {
      c.inventory.push(oldId);
      c.equip[slot]=null;
      log(`${c.name}: ${slot}の[${oldItem?.name}]を外した`,'sys');
    }
  } else {
    // Check class restriction
    if(newItem?.classes&&!newItem.classes.includes(c.job)) {
      log(`${c.name}は${newItem.name}を装備できない職業です！`,'combat');
      return;
    }
    // Swap
    if(oldId) c.inventory.push(oldId);
    c.equip[slot]=itemId;
    c.inventory=c.inventory.filter(i=>i!==itemId);

    // Log effect
    const atkBefore=calcATK(c)-( newItem?.atk||0)+(oldItem?.atk||0);
    const defBefore=calcDEF(c)-( newItem?.def||0)+(oldItem?.def||0);
    const atkNow=calcATK(c);
    const defNow=calcDEF(c);
    const atkDiff=atkNow-atkBefore;
    const defDiff=defNow-defBefore;
    let effectMsg='';
    if(atkDiff!==0) effectMsg+=` ATK${atkDiff>=0?'+':''}${atkDiff}`;
    if(defDiff!==0) effectMsg+=` DEF${defDiff>=0?'+':''}${defDiff}`;
    log(`${c.name}: [${newItem?.name}]を${slot}に装備！${effectMsg}`,'item');
  }
  showCharDetail(charIdx);
}

// Quick equip: auto-detect slot from item and equip immediately
function quickEquip(charIdx, itemId) {
  const c=GS.party[charIdx];
  const item=getItem(itemId);
  if(!c||!item||!item.slot) return;

  // Class check
  if(item.classes&&!item.classes.includes(c.job)) {
    log(`${c.name}はこのアイテムを装備できません（職業制限）`,'combat');
    return;
  }

  const slot=item.slot;
  const oldId=c.equip[slot];
  if(oldId) c.inventory.push(oldId);
  c.equip[slot]=itemId;
  c.inventory=c.inventory.filter(i=>i!==itemId);

  const oldItem=oldId?getItem(oldId):null;
  const atkNow=calcATK(c);
  const defNow=calcDEF(c);
  const atkBefore=atkNow-(item.atk||0)+(oldItem?.atk||0);
  const defBefore=defNow-(item.def||0)+(oldItem?.def||0);
  const atkDiff=atkNow-atkBefore;
  const defDiff=defNow-defBefore;
  let effectMsg=``;
  if(atkDiff!==0) effectMsg+=` ATK: ${atkBefore}→${atkNow}(${atkDiff>=0?'+':''}${atkDiff})`;
  if(defDiff!==0) effectMsg+=` DEF: ${defBefore}→${defNow}(${defDiff>=0?'+':''}${defDiff})`;
  if(oldItem) effectMsg+=` ※[${oldItem.name}]を外した`;
  log(`${c.name}: [${item.name}]を${slot}に装備！${effectMsg}`,'item');

  showCharDetail(charIdx);
}

function useItem(charIdx, itemIdx) {
  const c=GS.party[charIdx];
  if(!c||c.inventory[itemIdx]===undefined) return;
  const iid=c.inventory[itemIdx];
  const item=getItem(iid);
  if(!item) return;

  if(item.heal) {
    const actual=Math.min(item.heal, c.maxHp-c.hp);
    c.hp=Math.min(c.maxHp, c.hp+item.heal);
    log(`${c.name}は[${item.name}]を使用！HP+${actual}（${c.hp}/${c.maxHp}）`,'item');
    c.inventory.splice(itemIdx,1);
  } else if(item.mpHeal) {
    const actual=Math.min(item.mpHeal, c.maxMp-c.mp);
    c.mp=Math.min(c.maxMp, c.mp+item.mpHeal);
    log(`${c.name}は[${item.name}]を使用！MP+${actual}（${c.mp}/${c.maxMp}）`,'magic');
    c.inventory.splice(itemIdx,1);
  } else if(item.cure) {
    if(c.status.includes(item.cure)) {
      c.status=c.status.filter(s=>s!==item.cure);
      log(`${c.name}の${item.cure}が治った！`,'item');
      c.inventory.splice(itemIdx,1);
    } else {
      log(`${c.name}は${item.cure}状態ではない`,'sys');
      return;
    }
  } else if(item.escape) {
    log('脱出の翼で地上に戻った！','event');
    c.inventory.splice(itemIdx,1);
    hideModal('char-modal');
    showTown();
    return;
  } else if(item.spellId) {
    const spell=DATA.mageSpells.find(s=>s.id===item.spellId)||DATA.priestSpells.find(s=>s.id===item.spellId);
    if(spell) {
      log(`${c.name}は[${item.name}]を使用！${spell.name}の効果！`,'magic');
      // Apply healing or deal damage to all enemies in battle
      if(spell.type==='heal') {
        c.hp=Math.min(c.maxHp, c.hp+spell.power);
        log(`  HP+${spell.power}`,'magic');
      }
    }
    c.inventory.splice(itemIdx,1);
  } else if(item.slot) {
    // It's equipment - use quickEquip
    quickEquip(charIdx, iid);
    return;
  } else {
    log(`[${item.name}]はここでは使えない`,'sys');
    return;
  }
  updatePartyDisplay();
  // Refresh modal if open
  const modal=document.getElementById('char-modal');
  if(modal?.classList.contains('active')) showCharDetail(charIdx);
}

function dropItem(charIdx, itemIdx) {
  const c=GS.party[charIdx];
  if(!c) return;
  const iid=c.inventory[itemIdx];
  const item=getItem(iid);
  if(!item) return;
  if(confirm(`[${item.name}]を捨てますか？`)) {
    c.inventory.splice(itemIdx,1);
    log(`[${item.name}]を捨てた。`,'sys');
    updatePartyDisplay();
    showCharDetail(charIdx);
  }
}

function transferItem(fromIdx, itemIdx, toIdx) {
  const from=GS.party[fromIdx];
  const to=GS.party[toIdx];
  if(!from||!to) return;
  if(to.inventory.length>=8) { log(`${to.name}の荷物がいっぱいで渡せない！`,'combat'); return; }
  const iid=from.inventory[itemIdx];
  const item=getItem(iid);
  if(!item) return;
  from.inventory.splice(itemIdx,1);
  to.inventory.push(iid);
  log(`${from.name} → ${to.name}：[${item.name}]を渡した`,'item');
  updatePartyDisplay();
  showCharDetail(fromIdx);
}

