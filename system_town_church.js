/**
 * system_town_church.js — 教会
 * 依存: system_town_common.js
 */

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

