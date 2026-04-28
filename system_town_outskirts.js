/**
 * system_town_outskirts.js — 城外・百科事典
 * 依存: system_town_common.js
 */

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

