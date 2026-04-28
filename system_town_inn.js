/**
 * system_town_inn.js — 宿屋
 * 依存: system_town_common.js
 */

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

