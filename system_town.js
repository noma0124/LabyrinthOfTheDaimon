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
function showTown() {
  if(!GS.dungeon) {
    showScreen('town-screen');
    renderTownGold();
    return;
  }
  // Show CM first
  showCM(()=>{
    GS.returnFloor=GS.floor;
    GS.floor=1;
    showScreen('town-screen');
    renderTownGold();
    log('街に戻った。','event');
  });
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

// ========== INN ==========
function openInn() {
  const content=document.getElementById('inn-content');
  const costPerPerson=100;
  const cost=GS.party.filter(c=>c.isAlive).length * costPerPerson;
  let html=`<p style="margin-bottom:6px;font-size:13px">1泊 <span class="gold-text">${costPerPerson}G/人</span>　合計: <span class="gold-text">${cost}G</span></p>`;
  html+=`<p style="font-size:11px;color:var(--gray);margin-bottom:10px">宿泊でHP・MP全回復。EXPが足りていればレベルアップします。</p>`;

  // Show who can level up
  const levelers=GS.party.filter(c=>c.isAlive&&c.exp>=calcEXPNeeded(c.level));
  if(levelers.length) {
    html+=`<div style="background:var(--bg3);border:1px solid var(--green);padding:6px;margin-bottom:10px;font-size:12px;">
      ⬆ レベルアップ可能: <span class="green-text">${levelers.map(c=>c.name).join('、')}</span>
    </div>`;
  }

  // Show party status
  html+=`<div style="margin-bottom:10px">`;
  GS.party.forEach(c=>{
    const alive=c.isAlive&&!c.status.includes('stone');
    html+=`<div class="stat-row" style="font-size:11px;">
      <span class="stat-label">${c.name}</span>
      <span class="stat-val">${alive?`HP ${c.hp}/${c.maxHp}  MP ${c.mp}/${c.maxMp}`:'<span style="color:var(--red2)">戦闘不能</span>'}</span>
    </div>`;
  });
  html+=`</div>`;
  html+=`<div style="display:flex;gap:8px">
    <button class="cmd-btn" onclick="doInn()">宿泊する (${cost}G)</button>
    <button class="cmd-btn" onclick="hideModal('inn-modal')">キャンセル</button>
  </div>`;
  content.innerHTML=html;
  showModal('inn-modal');
}

function doInn() {
  const costPerPerson=100;
  const aliveMember=GS.party.filter(c=>c.isAlive);
  const cost=aliveMember.length * costPerPerson;
  if(GS.gold<cost) { alert(`お金が足りない！必要: ${cost}G　所持: ${GS.gold}G`); return; }
  GS.gold-=cost;

  GS.party.forEach(c=>{
    if(!c.isAlive) return;
    c.hp=c.maxHp;
    c.mp=c.maxMp;
    c.status=c.status.filter(s=>s==='stone');

    // Level up with detailed stat change logs
    while(c.exp>=calcEXPNeeded(c.level)) {
      c.level++;
      const oldMaxHp=c.maxHp;
      const oldMaxMp=c.maxMp;
      const oldBase={...c.baseStats};

      // Recalculate HP
      c.maxHp=calcMaxHP(c);
      const hpGain=c.maxHp-oldMaxHp;
      c.hp=c.maxHp; // full heal on levelup

      // Recalculate MP
      c.maxMp=calcMaxMP(c);
      const mpGain=c.maxMp-oldMaxMp;
      c.mp=c.maxMp;

      // Stat changes: each stat randomly +0, +1, or +2 (with small chance of -1)
      const statChanges={};
      const statKeys=['str','agi','intel','pie','vit','luk'];
      statKeys.forEach(s=>{
        const r=Math.random();
        let delta=0;
        if(r<0.05) delta=-1;        // 5%  下がる
        else if(r<0.35) delta=0;    // 30% 変わらない
        else if(r<0.75) delta=1;    // 40% +1
        else if(r<0.95) delta=2;    // 20% +2
        else delta=3;               // 5%  +3
        if(c.baseStats[s]+delta<1) delta=0;
        c.baseStats[s]+=delta;
        statChanges[s]=delta;
      });

      // Build detailed level up log
      const statLabels={str:'力',agi:'素早',intel:'知性',pie:'信仰',vit:'生命',luk:'運'};
      log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,'event');
      log(`★ ${c.name} がレベル ${c.level} になった！`,'levelup');
      // HP/MP changes
      const hpDiff=c.maxHp-oldMaxHp;
      const mpDiff=c.maxMp-oldMaxMp;
      log(`  HP: ${oldMaxHp} → ${c.maxHp} (${hpDiff>=0?'+':''}${hpDiff})`,'statup');
      if(oldMaxMp>0||c.maxMp>0) {
        log(`  MP: ${oldMaxMp} → ${c.maxMp} (${mpDiff>=0?'+':''}${mpDiff})`,'magic');
      }
      // Stat changes
      let anyChange=false;
      statKeys.forEach(s=>{
        const d=statChanges[s];
        if(d>0) { anyChange=true; log(`  ${statLabels[s]}: ${oldBase[s]} → ${c.baseStats[s]} ▲ +${d}`,'statup'); }
        else if(d<0) { anyChange=true; log(`  ${statLabels[s]}: ${oldBase[s]} → ${c.baseStats[s]} ▼ ${d}`,'statdown'); }
      });
      if(!anyChange) log('  能力値の変化なし','sys');
      log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,'event');
    }
  });

  updateGoldDisplay();
  renderTownGold();
  log(`宿泊した。${cost}G支払い。全員回復！`,'event');
  updatePartyDisplay();
  hideModal('inn-modal');
}

// ========== TAVERN ==========
function openTavern() {
  renderTavernContent();
  showModal('tavern-modal');
}

function renderTavernContent() {
  const content=document.getElementById('tavern-content');
  const bench=GS.roster.filter(c=>!GS.party.includes(c));

  let html=`
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div>
      <div class="stat-title">現在のパーティ (${GS.party.length}/6)
        <span style="font-size:9px;color:var(--gray);margin-left:6px">↕ドラッグで並び替え</span>
      </div>
      <div id="party-sort-list" style="min-height:40px">`;
  GS.party.forEach((c,i)=>{
    html+=`<div class="item-row tavern-member" data-idx="${i}" style="cursor:pointer;background:var(--bg3);margin-bottom:3px;border:1px solid var(--border2)" onclick="openCharStatusModal(GS.party[${i}],'town')">
      <span style="font-size:11px;color:var(--gray);width:16px;cursor:grab" onclick="event.stopPropagation()">☰</span>
      <span style="font-size:9px;color:${i<3?'var(--orange)':'var(--cyan)'};width:20px">${i<3?'前'+(i+1):'後'+(i-2)}</span>
      <span style="font-size:18px;margin-right:2px">${c.portrait||'🧑‍🦯'}</span>
      <span class="item-name">${c.name}</span>
      <span class="item-type" style="color:${getJob(c.job)?.color||'white'}">${getJob(c.job)?.name||''}</span>
      <span class="item-val">Lv${c.level}</span>
      <button class="mini-btn drop-btn" onclick="event.stopPropagation();removeFromParty(${i})">外す</button>
    </div>`;
  });
  html+=`</div>
      <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
        <button class="mini-btn" onclick="movePartyMember(-1)" title="選択中を上へ">▲ 上へ</button>
        <button class="mini-btn" onclick="movePartyMember(1)" title="選択中を下へ">▼ 下へ</button>
        <button class="mini-btn" onclick="swapFrontBack()" style="color:var(--gold)">前後入替</button>
      </div>
    </div>
    <div>
      <div class="stat-title">控えメンバー</div>
      <div class="item-list">`;
  bench.forEach(c=>{
    html+=`<div class="item-row" style="cursor:pointer" onclick="openCharStatusModal(GS.roster.find(r=>String(r.id)==='${c.id}'),'town')">
      <span style="font-size:18px;margin-right:2px">${c.portrait||'🧑‍🦯'}</span>
      <span class="item-name">${c.name}</span>
      <span class="item-type" style="color:${getJob(c.job)?.color||'white'}">${getJob(c.job)?.name||''}</span>
      <span class="item-val">Lv${c.level}</span>
      <button class="mini-btn use-btn" onclick="event.stopPropagation();addToParty('${c.id}')">加える</button>
    </div>`;
  });
  if(!bench.length) html+=`<p style="color:var(--gray);font-size:11px;padding:4px">控えメンバーなし</p>`;
  html+=`</div>
    </div>
  </div>
  <div id="tavern-item-mgr" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:10px"></div>`;

  content.innerHTML=html;

  // Enable click-to-select for reordering
  let _tavernSelected=null;
  document.querySelectorAll('.tavern-member').forEach(row=>{
    row.addEventListener('click', ()=>{
      document.querySelectorAll('.tavern-member').forEach(r=>r.style.outline='');
      row.style.outline='1px solid var(--gold)';
      _tavernSelected=parseInt(row.dataset.idx);
      window._tavernSelected=_tavernSelected;
    });
  });
}

function movePartyMember(dir) {
  const idx=window._tavernSelected;
  if(idx===undefined||idx===null) { return; }
  const newIdx=idx+dir;
  if(newIdx<0||newIdx>=GS.party.length) return;
  const tmp=GS.party[idx]; GS.party[idx]=GS.party[newIdx]; GS.party[newIdx]=tmp;
  window._tavernSelected=newIdx;
  renderTavernContent();
  updatePartyDisplay();
  // Re-select after re-render
  setTimeout(()=>{
    const rows=document.querySelectorAll('.tavern-member');
    if(rows[newIdx]) { rows[newIdx].style.outline='1px solid var(--gold)'; window._tavernSelected=newIdx; }
  },10);
}

function swapFrontBack() {
  if(GS.party.length<4) { log('後衛がいないため入替できません','sys'); return; }
  // Swap front 3 and back 3
  const front=GS.party.slice(0,3);
  const back=GS.party.slice(3,6);
  GS.party.splice(0,6,...back,...front);
  renderTavernContent();
  updatePartyDisplay();
  log('前衛と後衛を入れ替えた','event');
}

function openTavernItemMgr(charId) {
  const all=[...new Set([...GS.party,...GS.roster])];
  const c=all.find(ch=>String(ch.id)===String(charId));
  if(!c) return;
  const mgr=document.getElementById('tavern-item-mgr');
  if(!mgr) return;
  mgr.style.display='block';

  // Build item list for this char with transfer to other members
  const others=all.filter(oc=>String(oc.id)!==String(charId)&&oc.inventory.length<8);
  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <div class="stat-title">📦 ${c.name} の荷物 (${c.inventory.length}/8)</div>
    <button class="mini-btn drop-btn" onclick="document.getElementById('tavern-item-mgr').style.display='none'">閉じる</button>
  </div>`;
  if(!c.inventory.length) { mgr.innerHTML=html+'<p style="color:var(--gray);font-size:11px">所持品なし</p>'; return; }
  html+=`<div class="item-list">`;
  c.inventory.forEach((iid,ii)=>{
    const item=getItem(iid);
    if(!item) return;
    const transOpts=others.map(oc=>`<option value="${oc.id}">${oc.name}(${oc.inventory.length}/8)</option>`).join('');
    const tsid=`ttv_${String(charId).slice(-4)}_${ii}`;
    html+=`<div class="item-row" style="flex-wrap:wrap;gap:2px;">
      <span class="item-name">${item.name}</span>
      <span style="font-size:9px;color:var(--gold)">${item.atk?`A+${item.atk} `:''}${item.def?`D+${item.def}`:''}${item.heal?`HP+${item.heal}`:''}${item.mpHeal?`MP+${item.mpHeal}`:''}</span>
      <div style="display:flex;gap:2px;flex-wrap:wrap;width:100%;margin-top:2px">
        ${others.length?`<select id="${tsid}" style="font-size:9px;background:var(--bg3);color:var(--white);border:1px solid var(--border);padding:1px">${transOpts}</select>
        <button class="mini-btn" style="color:#c080ff;border-color:var(--purple)" onclick="tavernTransfer('${charId}',${ii},document.getElementById('${tsid}').value)">渡す</button>`:''}
        <button class="mini-btn drop-btn" onclick="tavernDrop('${charId}',${ii})">捨</button>
      </div>
    </div>`;
  });
  html+='</div>';
  mgr.innerHTML=html;
}

function tavernTransfer(fromId, itemIdx, toId) {
  const all=[...new Set([...GS.party,...GS.roster])];
  const from=all.find(c=>String(c.id)===String(fromId));
  const to=all.find(c=>String(c.id)===String(toId));
  if(!from||!to) return;
  if(to.inventory.length>=8) { log(`${to.name}の荷物がいっぱい！`,'combat'); return; }
  const iid=from.inventory[itemIdx];
  const item=getItem(iid);
  from.inventory.splice(itemIdx,1);
  to.inventory.push(iid);
  log(`${from.name}→${to.name}：[${item?.name}]を渡した`,'item');
  openTavernItemMgr(fromId);
  renderTavernContent();
}

function tavernDrop(charId, itemIdx) {
  const all=[...new Set([...GS.party,...GS.roster])];
  const c=all.find(ch=>String(ch.id)===String(charId));
  if(!c) return;
  const iid=c.inventory[itemIdx];
  const item=getItem(iid);
  if(!item) return;
  if(confirm(`[${item.name}]を捨てますか？`)) {
    c.inventory.splice(itemIdx,1);
    log(`[${item.name}]を捨てた`,'sys');
    openTavernItemMgr(charId);
  }
}

function removeFromParty(idx) {
  const member = GS.party[idx];
  if(!member) return;

  // モンスターメンバーは邪教の館（GS.monsters）に送る
  if(member.isMonster) {
    GS.party.splice(idx, 1);
    // GS.monstersに未登録なら追加
    if(!GS.monsters.find(m => m.id === member.id)) {
      GS.monsters.push(member);
    }
    log(`${member.name}を邪教の館に送った。`, 'event');
  } else {
    GS.party.splice(idx, 1);
  }
  renderTavernContent();
}

function addToParty(charId) {
  if(GS.party.length>=6) { alert('パーティが満員！'); return; }
  const c=GS.roster.find(r=>r.id==charId);
  if(!c) return;
  GS.party.push(c);
  renderTavernContent();
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
          <span style="font-size:11px;color:${char.gender==='female'?'#ff80c0':'#80c0ff'}">${char.gender==='female'?'♀':'♂'}</span>
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

// ========== CHURCH ==========
function openChurch() {
  let html='';
  GS.party.forEach((c,i)=>{
    const isDead=!c.isAlive&&!c.status.includes('stone');
    const isStone=c.status.includes('stone');
    const isPoisoned=c.status.includes('poison');
    html+=`<div class="item-row">
      <span class="item-name">${c.name} ${statusBadges(c)}</span>
      <span class="item-val" style="color:${hpColor(c.hp,c.maxHp)}">${c.hp}/${c.maxHp}</span>
      ${isDead?`<button class="hdr-btn" onclick="reviveChar(${i})">蘇生(500G)</button>`:''}
      ${isStone?`<button class="hdr-btn" onclick="destoneChar(${i})">石化解除(300G)</button>`:''}
      ${isPoisoned?`<button class="hdr-btn" onclick="curePoison(${i})">毒治療(50G)</button>`:''}
    </div>`;
  });
  html+=`<div class="separator"></div><button class="cmd-btn" onclick="fullHeal()">全員HP/MP全回復(${GS.party.length*100}G)</button>`;
  document.getElementById('church-content').innerHTML=html;
  showModal('church-modal');
}

function reviveChar(idx) {
  if(GS.gold<500) { alert('お金が足りない'); return; }
  const c=GS.party[idx];
  GS.gold-=500;
  c.isAlive=true;
  c.hp=Math.max(1,Math.floor(c.maxHp*0.1));
  c.status=c.status.filter(s=>s!=='dead');
  log(`${c.name}が蘇生した！`,'event');
  updateGoldDisplay(); renderTownGold();
  openChurch();
}

function destoneChar(idx) {
  if(GS.gold<300) { alert('お金が足りない'); return; }
  const c=GS.party[idx];
  GS.gold-=300;
  c.status=c.status.filter(s=>s!=='stone');
  c.isAlive=true;
  c.hp=Math.max(1,c.hp);
  log(`${c.name}の石化が解除された！`,'event');
  updateGoldDisplay(); renderTownGold();
  openChurch();
}

function curePoison(idx) {
  if(GS.gold<50) { alert('お金が足りない'); return; }
  const c=GS.party[idx];
  GS.gold-=50;
  c.status=c.status.filter(s=>s!=='poison');
  log(`${c.name}の毒が治った！`,'event');
  updateGoldDisplay(); renderTownGold();
  openChurch();
}

function fullHeal() {
  const cost=GS.party.length*100;
  if(GS.gold<cost) { alert('お金が足りない'); return; }
  GS.gold-=cost;
  GS.party.forEach(c=>{ if(c.isAlive){c.hp=c.maxHp;c.mp=c.maxMp;} });
  log('協会が全員を回復した！','event');
  updateGoldDisplay(); renderTownGold();
  hideModal('church-modal');
}

// ========== SHOP ==========
function openShop() {
  renderShopContent();
  showModal('shop-modal');
}

let _shopSelectedItem=null;
let _shopSellChar=null;

function renderShopContent() {
  const content=document.getElementById('shop-content');
  const party=GS.party.filter(c=>c.isAlive);

  let html=`<div class="shop-layout">
    <div>
      <div class="stat-title">購入 (所持金: ${GS.gold}G)</div>
      <div class="item-list" id="shop-buy-list">`;
  GS.shopItems.forEach(iid=>{
    const item=getItem(iid);
    if(!item) return;
    html+=`<div class="item-row" onclick="shopSelectBuy('${iid}')">
      <span class="item-name">${item.name}</span>
      <span class="item-type">${item.type}</span>
      <span class="item-val">${item.price}G</span>
    </div>`;
  });
  html+=`</div></div>
    <div>
      <div class="stat-title">売却</div>
      <div id="shop-sell-area">`;
  html+=`<select id="shop-sell-char" onchange="renderSellItems()" style="width:100%;margin-bottom:6px;background:var(--bg3);color:var(--white);border:1px solid var(--border);padding:4px;font-family:var(--font-jp)">`;
  party.forEach(c=>{ html+=`<option value="${c.id}">${c.name}(${c.inventory.length}/8)</option>`; });
  html+=`</select>`;
  html+=`<button class="mini-btn drop-btn" style="width:100%;margin-bottom:4px;padding:4px" onclick="doSellAll()">💰 全て売る</button>`;
  html+=`<div class="item-list" id="shop-sell-list"></div>`;
  html+=`</div></div></div>`;
  html+=`<div id="shop-buy-action" style="margin-top:8px"></div>`;

  content.innerHTML=html;
  renderSellItems();
}

function shopSelectBuy(iid) {
  _shopSelectedItem=iid;
  const item=getItem(iid);
  if(!item) return;
  const el=document.getElementById('shop-buy-action');
  el.innerHTML=`<div style="font-size:12px;margin-bottom:6px">${item.name} - ${item.price}G | ${item.desc}</div>
    <select id="buy-target" style="background:var(--bg3);color:var(--white);border:1px solid var(--border);padding:4px;font-family:var(--font-jp)">
      ${GS.party.filter(c=>c.isAlive).map((c,i)=>`<option value="${i}">${c.name}(${c.inventory.length}/8)</option>`).join('')}
    </select>
    <button class="cmd-btn" style="margin-left:6px" onclick="doBuy('${iid}')">購入</button>`;
}

function doBuy(iid) {
  const item=getItem(iid);
  if(!item) return;
  const targetSel=document.getElementById('buy-target');
  const idx=parseInt(targetSel.value);
  const target=GS.party.filter(c=>c.isAlive)[idx];
  if(!target) return;
  if(target.inventory.length>=8) { alert('荷物がいっぱい！'); return; }
  if(GS.gold<item.price) { alert('お金が足りない！'); return; }
  // 種族・職業制限チェック（装備スロットがある場合のみ）
  if(item.slot) {
    const reason = equipRestrictionReason(target, item);
    if(reason) {
      if(!confirm(`${target.name}は${reason}のため通常装備できません。\nそれでも購入しますか？`)) return;
    }
  }
  GS.gold-=item.price;
  target.inventory.push(iid);
  GS.encyclopediaItems.add(iid);
  log(`${target.name}が${item.name}を購入 (-${item.price}G)`,'item');
  updateGoldDisplay(); renderTownGold();
  renderShopContent();
}

function renderSellItems() {
  const sel=document.getElementById('shop-sell-char');
  if(!sel) return;
  const charId=sel.value; // Use charId as value to persist selection
  const party=GS.party.filter(c=>c.isAlive);
  const c=party.find(p=>String(p.id)===charId)||party[0];
  if(!c) return;
  const el=document.getElementById('shop-sell-list');
  if(!el) return;
  el.innerHTML='';
  if(!c.inventory.length) {
    el.innerHTML='<div style="color:var(--gray);font-size:11px;padding:6px">所持品なし</div>';
    return;
  }
  c.inventory.forEach((iid,ii)=>{
    const item=getItem(iid);
    if(!item) return;
    const div=document.createElement('div');
    div.className='item-row';
    div.innerHTML=`<span class="item-name">${item.name}</span>
      <span class="item-type" style="font-size:9px;color:var(--cyan)">${item.type}</span>
      <span class="item-val">${item.sell}G</span>
      <button style="font-size:9px;padding:2px 6px;background:var(--bg3);border:1px solid var(--gold);color:var(--gold2);cursor:pointer" onclick="doSell('${c.id}',${ii})">売る</button>`;
    el.appendChild(div);
  });
}

function doSell(charId, itemIdx) {
  const c=GS.party.find(p=>String(p.id)===String(charId));
  if(!c) return;
  const iid=c.inventory[itemIdx];
  const item=getItem(iid);
  if(!item) return;
  GS.gold+=item.sell;
  c.inventory.splice(itemIdx,1);
  if(!GS.shopItems.includes(iid)) GS.shopItems.push(iid);
  log(`${c.name}が[${item.name}]を${item.sell}Gで売った`,'item');
  updateGoldDisplay(); renderTownGold();
  // Re-render shop but keep the same character selected
  const content=document.getElementById('shop-content');
  const party=GS.party.filter(p=>p.isAlive);
  // Rebuild buy section and update gold display
  const buyList=document.getElementById('shop-buy-list');
  if(buyList) {
    buyList.innerHTML='';
    GS.shopItems.forEach(sid=>{
      const si=getItem(sid);
      if(!si) return;
      buyList.innerHTML+=`<div class="item-row" onclick="shopSelectBuy('${sid}')">
        <span class="item-name">${si.name}</span>
        <span class="item-type">${si.type}</span>
        <span class="item-val">${si.price}G</span>
      </div>`;
    });
  }
  // Keep same character selected and refresh only their sell list
  const sel=document.getElementById('shop-sell-char');
  if(sel) renderSellItems();
  // Update gold display in buy title
  const buyTitle=document.querySelector('#shop-content .stat-title');
  if(buyTitle) buyTitle.textContent=`購入 (所持金: ${GS.gold}G)`;
}

function doSellAll() {
  const sel=document.getElementById('shop-sell-char');
  if(!sel) return;
  const c=GS.party.find(p=>String(p.id)===sel.value)||GS.party.filter(p=>p.isAlive)[0];
  if(!c||!c.inventory.length) { log('売れるアイテムがない','sys'); return; }
  if(!confirm(`${c.name}の所持品を全て売りますか？`)) return;
  let totalGold=0;
  const sold=[];
  // Sell all items (iterate a copy since we splice)
  [...c.inventory].forEach(iid=>{
    const item=getItem(iid);
    if(!item) return;
    totalGold+=item.sell;
    sold.push(item.name);
    if(!GS.shopItems.includes(iid)) GS.shopItems.push(iid);
  });
  c.inventory=[];
  GS.gold+=totalGold;
  log(`${c.name}が全アイテム（${sold.length}個）を${totalGold}Gで売った`,'item');
  updateGoldDisplay(); renderTownGold();
  renderShopContent();
}

// ========== TRAINING ==========
let _createState={race:null,job:null,name:'',bonusStats:{str:10,agi:10,intel:10,pie:10,vit:10,luk:10},bonus:0};

// ポートレート選択肢
const PORTRAITS = [
  '🧑‍🦯','👨‍⚔️','👩‍⚔️','🧙','🧝','🧝‍♂️','🧙‍♀️','🧟','🧛','🦸',
  '🦹','🧜','🧚','🧞','🧞‍♂️','🦄','🐉','🧟‍♂️','👺','👹',
  '💂','🕵️','🧑‍🚀','🥷','👼','😈','👿','☠️','🤖','🦊'
];

function openTraining() {
  renderTrainingMenu();
  showModal('training-modal');
}

function renderTrainingMenu() {
  document.getElementById('training-content').innerHTML=`
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:13px;color:var(--gold2);margin-bottom:4px;font-family:var(--font-mono)">⚔️ 訓練所</div>
      <div style="font-size:11px;color:var(--gray)">何をしますか？</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;max-width:380px;margin:0 auto">
      <button class="menu-btn" style="width:100%;text-align:left;padding:14px 20px;font-size:13px" onclick="showTrainingSection('create')">
        <span style="font-size:18px;margin-right:10px">🌟</span>キャラクターの作成
        <div style="font-size:10px;color:var(--gray);margin-top:2px;margin-left:28px">新しい冒険者を作成する</div>
      </button>
      <button class="menu-btn" style="width:100%;text-align:left;padding:14px 20px;font-size:13px" onclick="showTrainingSection('inspect')">
        <span style="font-size:18px;margin-right:10px">📋</span>キャラクターを調べる
        <div style="font-size:10px;color:var(--gray);margin-top:2px;margin-left:28px">ステータス確認・装備変更</div>
      </button>
      <button class="menu-btn" style="width:100%;text-align:left;padding:14px 20px;font-size:13px" onclick="showTrainingSection('portrait')">
        <span style="font-size:18px;margin-right:10px">🖼️</span>グラフィックの変更
        <div style="font-size:10px;color:var(--gray);margin-top:2px;margin-left:28px">キャラクターのポートレートを変更する</div>
      </button>
      <button class="menu-btn" style="width:100%;text-align:left;padding:14px 20px;font-size:13px;color:var(--red2);border-color:var(--red)" onclick="showTrainingSection('delete')">
        <span style="font-size:18px;margin-right:10px">🗑️</span>キャラクターの削除
        <div style="font-size:10px;color:var(--gray);margin-top:2px;margin-left:28px">不要なキャラクターを削除する</div>
      </button>
    </div>
  `;
}

function showTrainingSection(section) {
  const backBtn = `<button class="mini-btn" style="margin-bottom:12px" onclick="renderTrainingMenu()">← メニューに戻る</button>`;
  let html = backBtn;
  if(section==='create')   html += renderCharCreate();
  if(section==='inspect')  html += renderTrainingInspect();
  if(section==='portrait') html += renderTrainingPortrait();
  if(section==='delete')   html += renderDeleteSection();
  document.getElementById('training-content').innerHTML = html;
}

// ---- キャラクターを調べる ----
function renderTrainingInspect() {
  const all=[...new Set([...GS.party,...GS.roster])];
  if(!all.length) return '<p style="color:var(--gray)">キャラクターがいない</p>';
  let html=`<div class="stat-title">キャラクターを選んでください</div><div class="item-list">`;
  all.forEach(c=>{
    const inParty=GS.party.includes(c);
    html+=`<div class="item-row" style="cursor:pointer" onclick="openCharStatusModal(GS.roster.find(r=>String(r.id)==='${c.id}')||GS.party.find(r=>String(r.id)==='${c.id}'),'town')">
      <span style="font-size:20px;margin-right:4px">${c.portrait||'🧑‍🦯'}</span>
      <span class="item-name">${c.name}</span>
      <span class="item-type" style="color:${getJob(c.job)?.color||'white'}">${getJob(c.job)?.name||''}</span>
      <span class="item-val">Lv${c.level}</span>
      <span style="font-size:9px;color:${inParty?'var(--green2)':'var(--gray)'}">${inParty?'[PT]':'[控]'}</span>
      <button class="mini-btn equip-btn">詳細 ▶</button>
    </div>`;
  });
  html+='</div>';
  return html;
}

// ---- グラフィックの変更（訓練所メニューから）----
function renderTrainingPortrait() {
  const all=[...new Set([...GS.party,...GS.roster])];
  if(!all.length) return '<p style="color:var(--gray)">キャラクターがいない</p>';
  let html=`<div class="stat-title">ポートレートを変更するキャラクターを選択</div><div class="item-list" id="portrait-char-select">`;
  all.forEach(c=>{
    html+=`<div class="item-row" style="cursor:pointer" onclick="_portraitSelectChar('${c.id}')">
      <span style="font-size:24px;margin-right:6px">${c.portrait||'🧑‍🦯'}</span>
      <span class="item-name">${c.name}</span>
      <span class="item-type" style="color:${getJob(c.job)?.color||'white'}">${getJob(c.job)?.name||''}</span>
      <button class="mini-btn equip-btn">選択</button>
    </div>`;
  });
  html+='</div><div id="portrait-picker-area"></div>';
  return html;
}

function _portraitSelectChar(charId) {
  const all=[...new Set([...GS.party,...GS.roster])];
  const char=all.find(c=>String(c.id)===String(charId));
  if(!char) return;
  const area=document.getElementById('portrait-picker-area');
  if(!area) return;
  area.innerHTML=`
    <div class="stat-title" style="margin-top:10px">${char.name} のポートレート選択</div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:6px">
      ${PORTRAITS.map(p=>`<div style="font-size:30px;text-align:center;padding:6px;background:var(--bg3);border:2px solid ${char.portrait===p?'var(--gold)':'var(--border)'};cursor:pointer;border-radius:3px"
        onclick="_setPortrait('${charId}','${p}',this)">${p}</div>`).join('')}
    </div>
  `;
}

function _setPortrait(charId, portrait, el) {
  const all=[...new Set([...GS.party,...GS.roster])];
  const char=all.find(c=>String(c.id)===String(charId));
  if(!char) return;
  char.portrait=portrait;
  // Update all border highlights
  el.parentElement?.querySelectorAll('div').forEach(d=>d.style.borderColor='var(--border)');
  el.style.borderColor='var(--gold)';
  // Update the char select list
  const listEl=document.querySelector('#portrait-char-select');
  if(listEl) {
    const rows=listEl.querySelectorAll('.item-row');
    rows.forEach(row=>{ if(row.onclick?.toString().includes(charId)) row.querySelector('span').textContent=portrait; });
  }
  log(`${char.name}のポートレートを変更した`,'sys');
  updatePartyDisplay?.();
}

// ---- ポートレート変更モーダル（キャラステータスモーダル内のポートレートクリックから）----
function openPortraitModal(charId) {
  const all=[...new Set([...GS.party,...GS.roster])];
  const char=all.find(c=>String(c.id)===String(charId));
  if(!char) return;
  const content=document.getElementById('char-status-modal-content');
  const prev=content.innerHTML;
  content.innerHTML=`
    <button class="mini-btn" style="margin-bottom:10px" onclick="renderCharStatusModal(GS.party.find(c=>String(c.id)==='${charId}')||GS.roster.find(c=>String(c.id)==='${charId}'),'${content.dataset.context||'town'}')">← 戻る</button>
    <div class="stat-title">${char.name} のポートレート選択</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:8px">
      ${PORTRAITS.map(p=>`<div style="font-size:34px;text-align:center;padding:8px;background:var(--bg3);border:2px solid ${char.portrait===p?'var(--gold)':'var(--border)'};cursor:pointer;border-radius:4px"
        onclick="_setPortraitAndBack('${charId}','${p}','${content.dataset.context||'town'}')">${p}</div>`).join('')}
    </div>
  `;
}

function _setPortraitAndBack(charId, portrait, context) {
  const all=[...new Set([...GS.party,...GS.roster])];
  const char=all.find(c=>String(c.id)===String(charId));
  if(!char) return;
  char.portrait=portrait;
  log(`${char.name}のポートレートを変更した`,'sys');
  updatePartyDisplay?.();
  renderCharStatusModal(char, context);
}

// ---- キャラクターの削除 ----
function renderDeleteSection() {
  const allChars=[...new Set([...GS.party,...GS.roster])];
  if(!allChars.length) return '<p style="color:var(--gray);padding:8px">キャラクターがいません</p>';

  let html=`<div style="background:var(--bg3);border:1px solid var(--red);padding:8px;margin-bottom:10px;font-size:11px;color:var(--red2);">
    ⚠ 削除したキャラクターは復元できません。所持アイテムも失われます。
  </div>
  <div class="item-list">`;
  allChars.forEach(c=>{
    const inParty=GS.party.includes(c);
    html+=`<div class="item-row">
      <span style="font-size:18px;margin-right:4px">${c.portrait||'🧑‍🦯'}</span>
      <span class="item-name">${c.name}</span>
      <span class="item-type" style="color:${getJob(c.job)?.color||'white'}">${getJob(c.job)?.name||''}</span>
      <span class="item-val">Lv${c.level}</span>
      <span style="font-size:9px;color:${inParty?'var(--green2)':'var(--gray)'};width:40px">${inParty?'[PT]':'[控]'}</span>
      <button class="mini-btn drop-btn" onclick="confirmDeleteChar('${c.id}')">削除</button>
    </div>`;
  });
  html+='</div>';
  return html;
}

// 旧タブ関数（後方互換）
function showTrainingTab(tab) {
  const map={create:'create',class:'inspect',delete:'delete'};
  showTrainingSection(map[tab]||tab);
}

function confirmDeleteChar(charId) {
  const allChars=[...new Set([...GS.party,...GS.roster])];
  const c=allChars.find(ch=>String(ch.id)===String(charId));
  if(!c) return;
  if(!confirm(`「${c.name}」を本当に削除しますか？\nこの操作は取り消せません。`)) return;
  // Remove from party
  const pi=GS.party.indexOf(c);
  if(pi>=0) GS.party.splice(pi,1);
  // Remove from roster
  const ri=GS.roster.indexOf(c);
  if(ri>=0) GS.roster.splice(ri,1);
  log(`${c.name}は訓練所を去った。`,'sys');
  updatePartyDisplay();
  showTrainingSection('delete'); // renderDeleteSectionを再描画
}

function renderCharCreate() {
  const bonusTotal=rand(10,60);
  _createState={race:null,job:null,gender:null,name:'',bonusStats:{str:10,agi:10,intel:10,pie:10,vit:10,luk:10},bonus:bonusTotal,remaining:bonusTotal};
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;align-items:end">
      <div>
        <div class="stat-title">名前</div>
        <input id="new-char-name" placeholder="名前を入力" maxlength="10"
          style="background:var(--bg3);border:1px solid var(--border2);color:var(--white);padding:6px 8px;font-size:13px;width:100%;font-family:var(--font-jp)">
      </div>
      <div>
        <div class="stat-title">性別</div>
        <div style="display:flex;gap:6px">
          <div class="job-card" id="gender-male" onclick="selectGender('male')" style="flex:1;padding:10px 6px">
            <div style="font-size:18px">♂</div>
            <div style="font-size:11px;margin-top:2px">男性</div>
          </div>
          <div class="job-card" id="gender-female" onclick="selectGender('female')" style="flex:1;padding:10px 6px">
            <div style="font-size:18px">♀</div>
            <div style="font-size:11px;margin-top:2px">女性</div>
          </div>
        </div>
      </div>
    </div>

    <div class="stat-title">種族を選ぶ <span style="font-size:9px;color:var(--gray);font-family:var(--font-jp);font-weight:normal">（ステータス補正に影響します）</span></div>
    <div class="create-grid" id="race-select">
      ${DATA.races.map(r=>`<div class="race-card" onclick="selectRace('${r.id}')" id="rc-${r.id}">
        <div>${r.name}</div>
        <div style="font-size:9px;color:var(--gray);margin-top:3px">${Object.entries(r.bonus).map(([k,v])=>`${k}:${v>0?'+':''}${v}`).join(' ')}</div>
      </div>`).join('')}
    </div>

    <div class="stat-title" style="margin-top:10px">
      職業を選ぶ
      <span style="font-size:9px;color:var(--gray);font-family:var(--font-jp);font-weight:normal">（ステータス条件を満たせば選択可。♀のみ: ヴァルキリー）</span>
    </div>
    <div class="create-grid" id="job-select">
      ${DATA.jobs.map(j=>{
        const reqStr=Object.entries(j.req).map(([k,v])=>`${k}≥${v}`).join(' ');
        const femaleOnly = j.id==='valkyrie';
        return `<div class="job-card disabled" onclick="selectJob('${j.id}')" id="jc-${j.id}">
          <div class="job-name" style="color:${j.color}">${j.name}${femaleOnly?'<span style="font-size:9px;color:#ff80c0;margin-left:3px">♀</span>':''}</div>
          <div class="job-req">${reqStr}</div>
        </div>`;
      }).join('')}
    </div>

    <div style="margin-top:10px;background:var(--bg3);padding:8px;border:1px solid var(--border)">
      <div class="stat-title">ボーナスポイント: <span id="bonus-remaining" class="gold-text">${bonusTotal}</span>/<span class="gold-text">${bonusTotal}</span>
        <span style="font-size:9px;color:var(--gray);margin-left:8px">（種族補正後の最終値は作成時に確定）</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px">
        ${['str','agi','intel','pie','vit','luk'].map(s=>`
          <div style="background:var(--bg);border:1px solid var(--border);padding:4px">
            <div style="font-size:9px;color:var(--gray)">${{str:'力',agi:'素早',intel:'知性',pie:'信仰',vit:'生命',luk:'運'}[s]}</div>
            <div style="display:flex;align-items:center;gap:3px;margin-top:2px">
              <button onclick="adjustStat('${s}',-1)" style="width:20px;height:20px;background:var(--bg3);border:1px solid var(--border);color:var(--white);cursor:pointer;font-size:14px;line-height:1">-</button>
              <span id="stat-${s}" style="font-family:var(--font-mono);font-size:13px;width:28px;text-align:center">${_createState.bonusStats[s]}</span>
              <button onclick="adjustStat('${s}',1)" style="width:20px;height:20px;background:var(--bg3);border:1px solid var(--border);color:var(--white);cursor:pointer;font-size:14px;line-height:1">+</button>
            </div>
          </div>`).join('')}
      </div>
    </div>
    <button class="cmd-btn" style="margin-top:10px;width:100%;font-size:14px" onclick="confirmCreate()">キャラクターを作成</button>
  `;
}

function selectGender(gender) {
  _createState.gender = gender;
  document.getElementById('gender-male')?.classList.toggle('selected', gender==='male');
  document.getElementById('gender-female')?.classList.toggle('selected', gender==='female');
  updateJobAvailability();
}

function selectRace(id) {
  _createState.race=id;
  document.querySelectorAll('.race-card').forEach(el=>el.classList.remove('selected'));
  document.getElementById('rc-'+id)?.classList.add('selected');
  updateJobAvailability();
}

function selectJob(id) {
  const card=document.getElementById('jc-'+id);
  if(card?.classList.contains('disabled')) return;
  _createState.job=id;
  document.querySelectorAll('.job-card').forEach(el=>el.classList.remove('selected'));
  card?.classList.add('selected');
}

function updateJobAvailability() {
  const stats=_createState.bonusStats;
  const gender=_createState.gender;
  DATA.jobs.forEach(j=>{
    const card=document.getElementById('jc-'+j.id);
    if(!card) return;
    // ステータス条件チェック（種族は無関係）
    const meetsReq=Object.entries(j.req).every(([k,v])=>stats[k]>=v);
    // ヴァルキリーは女性のみ
    const genderOk = j.id==='valkyrie' ? gender==='female' : true;
    const canSelect = meetsReq && genderOk;
    if(canSelect) card.classList.remove('disabled');
    else {
      card.classList.add('disabled');
      // 選択中だったら解除
      if(_createState.job===j.id) {
        _createState.job=null;
        card.classList.remove('selected');
      }
    }
  });
}

function adjustStat(stat, delta) {
  const cs=_createState;
  if(delta>0&&cs.remaining<=0) return;
  if(delta<0&&cs.bonusStats[stat]<=1) return;
  cs.bonusStats[stat]+=delta;
  cs.remaining-=delta;
  const el=document.getElementById('stat-'+stat);
  if(el) el.textContent=cs.bonusStats[stat];
  const rem=document.getElementById('bonus-remaining');
  if(rem) rem.textContent=cs.remaining;
  updateJobAvailability();
}

function confirmCreate() {
  const nameEl=document.getElementById('new-char-name');
  const name=nameEl?.value.trim();
  if(!name)                { alert('名前を入力してください'); return; }
  if(!_createState.gender) { alert('性別を選んでください'); return; }
  if(!_createState.race)   { alert('種族を選んでください'); return; }
  if(!_createState.job)    { alert('職業を選んでください'); return; }
  // ヴァルキリー＋男性の二重チェック
  if(_createState.job==='valkyrie' && _createState.gender!=='female') {
    alert('ヴァルキリーは女性のみ選択できます'); return;
  }
  const c=createChar(name, _createState.race, _createState.job, {..._createState.bonusStats});
  c.gender = _createState.gender;
  initCharHP(c);
  GS.roster.push(c);
  const genderLabel = _createState.gender==='male' ? '♂' : '♀';
  log(`${name}${genderLabel}（${getRace(_createState.race)?.name} ${getJob(_createState.job)?.name}）を作成した！`,'event');
  hideModal('training-modal');
  openTavern();
}

function renderClassChange() {
  if(!GS.party.length&&!GS.roster.length) return '<p style="color:var(--gray)">キャラクターがいない</p>';
  const all=[...new Set([...GS.party,...GS.roster])];
  let html='<div class="item-list">';
  all.forEach((c,i)=>{
    html+=`<div class="item-row" onclick="showJobOptions('${c.id}')">
      <span class="item-name">${c.name}</span>
      <span class="item-type">${getJob(c.job)?.name||''}</span>
      <span class="item-val">Lv${c.level}</span>
    </div>`;
  });
  html+='</div>';
  html+='<div id="job-options"></div>';
  return html;
}

function showJobOptions(charId) {
  const c=[...GS.party,...GS.roster].find(ch=>ch.id==charId);
  if(!c) return;
  const stats=calcStats(c);
  const race=getRace(c.race);
  const el=document.getElementById('job-options');
  if(!el) return;
  let html=`<div class="stat-title" style="margin-top:8px">${c.name}の転職先</div>
    <div class="create-grid">`;
  DATA.jobs.forEach(j=>{
    if(j.id===c.job) return; // current job
    const allowed=race?.jobs.includes(j.id);
    const meetsReq=Object.entries(j.req).every(([k,v])=>stats[k]>=v);
    const canChange=allowed&&meetsReq;
    html+=`<div class="job-card ${canChange?'':'disabled'}" onclick="${canChange?`doClassChange('${charId}','${j.id}')`:''}" title="${canChange?'転職可能':'条件不足'}">
      <div class="job-name" style="color:${j.color}">${j.name}</div>
      <div class="job-req">${Object.entries(j.req).map(([k,v])=>`${k}≥${v}`).join(' ')}</div>
    </div>`;
  });
  html+='</div>';
  el.innerHTML=html;
}

function doClassChange(charId, jobId) {
  const c=[...GS.party,...GS.roster].find(ch=>ch.id==charId);
  if(!c) return;
  const oldJob=getJob(c.job)?.name;
  c.previousJobs=c.previousJobs||[];
  c.previousJobs.push(c.job);
  c.job=jobId;
  c.level=1;
  c.exp=0;
  c.maxHp=calcMaxHP(c);
  c.hp=Math.min(c.hp,c.maxHp);
  c.maxMp=calcMaxMP(c);
  c.mp=Math.min(c.mp,c.maxMp);
  log(`${c.name}は${oldJob}から${getJob(jobId)?.name}に転職した！`,'event');
  hideModal('training-modal');
}

// ========== OUTSKIRTS ==========
function openOutskirts() {
  const content=document.getElementById('outskirts-content');
  content.innerHTML=`
    <p style="font-size:12px;margin-bottom:12px;color:var(--gray)">ダンジョンへ出発します。前回まで到達した最深部から再開することもできます。</p>
    <p style="margin-bottom:10px">最深部: <span class="gold-text">B${GS.maxFloorReached}F</span></p>
    <div style="display:flex;gap:8px;flex-direction:column">
      <button class="cmd-btn" onclick="enterDungeon(1)">B1Fから開始</button>
      ${GS.maxFloorReached>1?`<button class="cmd-btn" onclick="enterDungeon(${Math.max(1,GS.maxFloorReached-1)})">B${Math.max(1,GS.maxFloorReached-1)}Fから開始（前回地点）</button>`:''}
    </div>
    <div style="margin-top:12px;font-size:11px;color:var(--gray)">
      ⚠ パーティに生きているメンバーが必要です
    </div>
  `;
  showModal('outskirts-modal');
}

function enterDungeon(floor) {
  if(!GS.party.some(c=>c.isAlive)) { alert('生きているパーティメンバーが必要です！'); return; }
  GS.floor=floor;
  GS.autoMap={};
  hideModal('outskirts-modal');
  initDungeon();
  showScreen('main-screen');
  document.getElementById('floor-display').textContent=`B${GS.floor}F`;
  updateGoldDisplay();
  updatePartyDisplay();
  log(`B${floor}Fからダンジョンに挑む！`,'event');
}

// ========== ENCYCLOPEDIA ==========
function showEncyTab(tab) {
  document.getElementById('ency-item-content').style.display=tab==='item'?'block':'none';
  document.getElementById('ency-monster-content').style.display=tab==='monster'?'block':'none';
  document.getElementById('ency-item-btn').classList.toggle('active',tab==='item');
  document.getElementById('ency-monster-btn').classList.toggle('active',tab==='monster');

  if(tab==='item') renderItemEncyclopedia();
  else renderMonsterEncyclopedia();
}

function renderItemEncyclopedia() {
  const el=document.getElementById('ency-item-content');
  let html=`<div class="item-list">`;
  DATA.items.forEach(item=>{
    const known=GS.encyclopediaItems.has(item.id);
    html+=`<div class="item-row">
      <span class="item-name">${known?item.name:'???'}</span>
      <span class="item-type">${known?item.type:'──'}</span>
      <span class="item-val">${known?item.price+'G':'──'}</span>
      ${known?`<span style="font-size:9px;color:var(--gray)">${item.desc}</span>`:''}
    </div>`;
  });
  html+='</div>';
  html+=`<p style="font-size:10px;color:var(--gray);margin-top:6px">発見: ${GS.encyclopediaItems.size}/${DATA.items.length}</p>`;
  el.innerHTML=html;
}

function renderMonsterEncyclopedia() {
  const el=document.getElementById('ency-monster-content');
  let html=`<div class="item-list">`;
  DATA.monsters.forEach(m=>{
    const known=GS.encyclopediaMonsters.has(m.id);
    html+=`<div class="item-row">
      <span style="width:24px">${known?m.img:'?'}</span>
      <span class="item-name">${known?m.name:'???'}</span>
      <span class="item-type">${known?`HP:${m.hp}`:'──'}</span>
      <span class="item-val">${known?`EXP:${m.exp}`:'──'}</span>
    </div>`;
  });
  html+='</div>';
  html+=`<p style="font-size:10px;color:var(--gray);margin-top:6px">遭遇: ${GS.encyclopediaMonsters.size}/${DATA.monsters.length}</p>`;
  el.innerHTML=html;
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

// ==================== EVIL TEMPLE（邪教の館）====================
// GS.karma が未定義の場合は初期化（gamestate.js 変更禁止のため here で保証）
if(typeof GS.karma === 'undefined') GS.karma = 0;
// GS.monsters : 捕獲・合体で作られたモンスターインスタンスの配列
if(!GS.monsters) GS.monsters = [];

// ---- ランクバッジHTML（UI表現。ランク計算はgamedata.jsのgetMonsterRank()を使用）----
// 引数は monsters[].rank の値（1〜99）
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

  let bodyHtml = '';
  if(tab==='list') bodyHtml = renderEvilTempleList();
  else if(tab==='fusion') bodyHtml = renderEvilTempleFusion();
  else if(tab==='release') bodyHtml = renderEvilTempleRelease();

  const content = document.getElementById('eviltemple-content');
  content.innerHTML = tabHtml + bodyHtml;
}

// ---- モンスター一覧 ----
function renderEvilTempleList() {
  if(!GS.monsters.length) {
    return `<p style="color:var(--gray);font-size:12px;padding:8px">捕獲したモンスターがいない。<br>ダンジョンでモンスターが仲間になることがある。</p>`;
  }
  let html = `<div class="item-list">`;
  GS.monsters.forEach((m, i) => {
    const rankBadge = rankBadgeHtml(m.rank||1);
    html += `<div class="item-row" style="cursor:pointer" onclick="showMonsterDetail(${i})">
      <span style="width:28px;font-size:18px">${m.img||'👾'}</span>
      <span class="item-name">${m.name}</span>
      ${rankBadge}
      <span class="item-type" style="color:var(--cyan)">HP:${m.hp}</span>
      <span class="item-val">ATK:${m.atk}</span>
      <button class="mini-btn" style="color:var(--gold);border-color:var(--gold)" onclick="event.stopPropagation();showMonsterDetail(${i})">詳細</button>
    </div>`;
  });
  html += `</div>`;
  html += `<p style="font-size:10px;color:var(--gray);margin-top:6px">捕獲数: ${GS.monsters.length}体</p>`;
  return html;
}

function showMonsterDetail(idx) {
  const m = GS.monsters[idx];
  if(!m) return;
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
    <button class="mini-btn" style="margin-bottom:10px" onclick="renderEvilTempleContent('list')">← 一覧に戻る</button>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <span style="font-size:40px">${m.img||'👾'}</span>
      <div>
        <div style="font-size:16px;color:var(--gold)">${m.name} ${rankBadge}</div>
        <div style="font-size:10px;color:var(--gray)">ランク値: ${m.rank||1}　ランク: ${rankInfo.rank}　Floor: ${m.floor||'?'}F</div>
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
    <button class="mini-btn" style="margin-bottom:10px" onclick="showMonsterDetail(${monsterIdx})">← 詳細に戻る</button>
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
          ${GS.monsters.map((m,i)=>`<option value="${i}">${m.img||'👾'} ${m.name} [${getMonsterRank(m.rank||1).rank}]</option>`).join('')}
        </select>
      </div>
      <div>
        <div class="stat-title" style="font-size:10px">素材B</div>
        <select id="fusion-b" style="width:100%;background:var(--bg3);color:var(--white);border:1px solid var(--border);padding:4px;font-family:var(--font-jp);font-size:11px">
          ${GS.monsters.map((m,i)=>`<option value="${i}" ${i===1?'selected':''}>${m.img||'👾'} ${m.name} [${getMonsterRank(m.rank||1).rank}]</option>`).join('')}
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
      モンスターを自然に帰します。装備品はパーティに返却されます。<br>
      解放時に <span style="color:var(--purple)">ランク × 1.0〜5.0（小数切り上げ）</span> のカルマを獲得します。
    </div>
    <div class="item-list">`;
  GS.monsters.forEach((m, i) => {
    const rankBadge = rankBadgeHtml(m.rank||1);
    const rInfo = getMonsterRank(m.rank||1);
    html += `<div class="item-row">
      <span style="width:28px;font-size:18px">${m.img||'👾'}</span>
      <span class="item-name">${m.name}</span>
      ${rankBadge}
      <span class="item-type" style="color:var(--cyan)">HP:${m.hp}</span>
      <span class="item-val">ATK:${m.atk}</span>
      <span style="font-size:9px;color:var(--purple);min-width:60px">最大+${Math.ceil((m.rank||1)*5)}カルマ</span>
      <button class="mini-btn drop-btn" onclick="releaseMonster(${i})">解放</button>
    </div>`;
  });
  html += `</div>`;
  return html;
}

function releaseMonster(idx) {
  const m = GS.monsters[idx];
  if(!m) return;

  // Preview karma range
  const mRank = m.rank || 1;
  const maxKarma = Math.ceil(mRank * 5);
  if(!confirm(`「${m.name}」を解放しますか？\n獲得カルマ: ${Math.ceil(mRank*1.0)}〜${maxKarma}`)) return;

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

  // Karma gain: rank × (1.0〜5.0, step 0.1) → Math.ceil
  const multiplier = Math.round((1.0 + Math.random() * 4.0) * 10) / 10; // 1.0〜5.0 小数1桁
  const karmaGain = Math.ceil(mRank * multiplier);
  GS.karma += karmaGain;
  renderTownGold();

  const rankLabel = getMonsterRank(mRank).rank;
  GS.monsters.splice(idx, 1);
  log(`${m.name}[${rankLabel}]を解放。ランク${mRank}×${multiplier.toFixed(1)}=カルマ+${karmaGain}（合計: ${GS.karma}）`, 'event');
  renderEvilTempleContent('release');
}

// ==================== GACHA（ガチャ）====================
function openGacha() {
  renderGachaContent();
  showModal('gacha-modal');
}

function renderGachaContent() {
  const content = document.getElementById('gacha-content');
  content.innerHTML = `
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:22px;margin-bottom:4px">🎰 カルマガチャ</div>
      <div style="color:var(--gray);font-size:11px">CMを視聴してカルマを獲得しよう！</div>
      <div style="margin-top:8px;font-size:16px">現在のカルマ: <span id="karma-display" style="color:var(--gold);font-weight:bold">${GS.karma}</span></div>
    </div>
    <div style="background:var(--bg3);border:1px solid var(--border);padding:10px;margin-bottom:12px;font-size:11px">
      <div style="color:var(--gold2);margin-bottom:6px">📺 CM視聴でカルマゲット</div>
      <div>・獲得量: <span style="color:var(--green2)">100〜300カルマ</span></div>
      <div style="color:var(--gray)">・150以上の確率: <span style="color:var(--cyan)">20%</span></div>
      <div style="color:var(--gray)">・カルマは邪教の館の「合体」で使用します</div>
    </div>
    <div id="gacha-cm-area" style="margin-bottom:12px">
      <button class="cmd-btn" style="width:100%;background:linear-gradient(135deg,#b8860b,#daa520);border-color:var(--gold);font-size:14px" onclick="startKarmaGacha()">
        📺 CMを見てカルマを獲得
      </button>
    </div>
    <div id="gacha-result" style="min-height:60px"></div>
  `;
}

let _gachaWatching = false;
function startKarmaGacha() {
  if(_gachaWatching) return;
  _gachaWatching = true;

  const area = document.getElementById('gacha-cm-area');
  const result = document.getElementById('gacha-result');
  result.innerHTML = '';

  let timeLeft = 5;
  area.innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--gold);padding:12px;text-align:center">
      <div style="color:var(--gold2);font-size:13px;margin-bottom:6px">📺 CM視聴中...</div>
      <div id="gacha-bar-wrap" style="background:var(--bg);height:8px;border-radius:4px;overflow:hidden;margin-bottom:6px">
        <div id="gacha-bar-fill" style="height:100%;background:linear-gradient(90deg,var(--gold2),var(--gold));width:100%;transition:width 1s linear"></div>
      </div>
      <div style="font-size:20px;color:var(--gold)" id="gacha-timer">${timeLeft}</div>
    </div>
  `;

  // Force reflow before starting transition
  setTimeout(() => {
    document.getElementById('gacha-bar-fill').style.width = '0%';
  }, 50);

  const interval = setInterval(() => {
    timeLeft--;
    const timerEl = document.getElementById('gacha-timer');
    if(timerEl) timerEl.textContent = timeLeft;
    if(timeLeft <= 0) {
      clearInterval(interval);
      _gachaWatching = false;
      resolveKarmaGacha();
    }
  }, 1000);
}

function resolveKarmaGacha() {
  // 20% chance of 150-300, 80% chance of 100-149
  let gained;
  if(Math.random() < 0.20) {
    gained = rand(150, 300);
  } else {
    gained = rand(100, 149);
  }
  GS.karma += gained;

  const area = document.getElementById('gacha-cm-area');
  const result = document.getElementById('gacha-result');
  const karmaEl = document.getElementById('karma-display');
  if(karmaEl) karmaEl.textContent = GS.karma;

  const isLucky = gained >= 150;
  result.innerHTML = `
    <div style="background:var(--bg3);border:2px solid ${isLucky?'var(--gold)':'var(--border)'};padding:12px;text-align:center;animation:fadeIn 0.4s">
      <div style="font-size:18px;margin-bottom:4px">${isLucky?'🌟':'✨'}</div>
      <div style="color:${isLucky?'var(--gold)':'var(--green2)'};font-size:${isLucky?'18':'15'}px;font-weight:bold">
        +${gained} カルマ獲得！${isLucky?'　ラッキー！':''}
      </div>
      <div style="font-size:11px;color:var(--gray);margin-top:4px">合計カルマ: ${GS.karma}</div>
    </div>
  `;

  area.innerHTML = `
    <button class="cmd-btn" style="width:100%;background:linear-gradient(135deg,#b8860b,#daa520);border-color:var(--gold);font-size:14px" onclick="startKarmaGacha()">
      📺 もう一度CMを見る
    </button>
  `;

  log(`CMを視聴してカルマを${gained}獲得！（合計: ${GS.karma}）`, isLucky?'levelup':'event');
}

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
