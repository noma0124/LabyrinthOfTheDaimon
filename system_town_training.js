/**
 * system_town_training.js — 訓練場（育成・転職）
 * 依存: system_town_common.js
 */

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
  _createState={race:null,job:null,name:'',bonusStats:{str:10,agi:10,intel:10,pie:10,vit:10,luk:10},bonus:bonusTotal,remaining:bonusTotal};
  return `
    <div style="margin-bottom:8px">
      <input id="new-char-name" placeholder="名前を入力" maxlength="10" style="background:var(--bg3);border:1px solid var(--border2);color:var(--white);padding:6px 8px;font-size:13px;width:200px;font-family:var(--font-jp)">
    </div>
    <div class="stat-title">種族を選ぶ</div>
    <div class="create-grid" id="race-select">
      ${DATA.races.map(r=>`<div class="race-card" onclick="selectRace('${r.id}')" id="rc-${r.id}">
        <div>${r.name}</div>
        <div style="font-size:9px;color:var(--gray);margin-top:3px">${Object.entries(r.bonus).map(([k,v])=>`${k}:${v>0?'+':''}${v}`).join(' ')}</div>
      </div>`).join('')}
    </div>
    <div class="stat-title" style="margin-top:8px">職業を選ぶ</div>
    <div class="create-grid" id="job-select">
      ${DATA.jobs.map(j=>{
        const reqStr=Object.entries(j.req).map(([k,v])=>`${k}≥${v}`).join(' ');
        return `<div class="job-card" onclick="selectJob('${j.id}')" id="jc-${j.id}">
          <div class="job-name" style="color:${j.color}">${j.name}</div>
          <div class="job-req">${reqStr}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="margin-top:10px;background:var(--bg3);padding:8px;border:1px solid var(--border)">
      <div class="stat-title">ボーナスポイント: <span id="bonus-remaining" class="gold-text">${bonusTotal}</span>/<span class="gold-text">${bonusTotal}</span></div>
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

function selectRace(id) {
  _createState.race=id;
  document.querySelectorAll('.race-card').forEach(el=>el.classList.remove('selected'));
  document.getElementById('rc-'+id)?.classList.add('selected');
  updateJobAvailability();
}

function selectJob(id) {
  const job=getJob(id);
  const card=document.getElementById('jc-'+id);
  if(card?.classList.contains('disabled')) return;
  _createState.job=id;
  document.querySelectorAll('.job-card').forEach(el=>el.classList.remove('selected'));
  card?.classList.add('selected');
}

function updateJobAvailability() {
  if(!_createState.race) return;
  const race=getRace(_createState.race);
  DATA.jobs.forEach(j=>{
    const card=document.getElementById('jc-'+j.id);
    if(!card) return;
    const allowed=race.jobs.includes(j.id);
    // Check stats
    const stats=_createState.bonusStats;
    const meetsReq=Object.entries(j.req).every(([k,v])=>stats[k]>=v);
    if(!allowed||!meetsReq) card.classList.add('disabled');
    else card.classList.remove('disabled');
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
  if(!name) { alert('名前を入力してください'); return; }
  if(!_createState.race) { alert('種族を選んでください'); return; }
  if(!_createState.job) { alert('職業を選んでください'); return; }
  const c=createChar(name, _createState.race, _createState.job, {..._createState.bonusStats});
  initCharHP(c);
  GS.roster.push(c);
  log(`${name}（${getRace(_createState.race)?.name} ${getJob(_createState.job)?.name}）を作成した！`,'event');
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

