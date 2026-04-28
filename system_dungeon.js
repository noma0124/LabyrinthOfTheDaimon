/**
 * ============================================================
 *  system_dungeon.js — ダンジョン生成・描画・移動・戦闘システム
 * ============================================================
 *
 * 【このファイルの役割】
 *   ダンジョン探索に関わるすべてを担当します。
 *   マップ生成 → 一人称視点描画 → 移動処理 → 戦闘 が一体になっています。
 *
 * 【依存関係】
 *   gamedata.js、gamestate.js、system_char.js
 *   HTMLの <canvas id="dungeon-canvas"> が必要
 *
 * 【読み込み順】
 *   4番目
 *
 * 【公開する定数】
 *   DUNGEON_SIZE = 10    マップの縦横マス数（10×10固定）
 *
 * 【公開する主な関数・オブジェクト】
 *   generateDungeon(floor)   フロアのマップを生成して返す
 *   initDungeon()            GS.dungeonを初期化してダンジョン開始
 *   exploreAround()          現在位置周囲をautoMapに記録
 *   renderDungeon()          1人称視点をcanvasに描画
 *   renderMap()              ミニマップ描画
 *   renderFullMap()          全体マップ描画（モーダル用）
 *
 *   Game.move(action)        移動コマンド処理
 *     action: 'forward'|'backward'|'turnLeft'|'turnRight'
 *             'strafeLeft'|'strafeRight'
 *   Game.newGame()           新規ゲーム開始
 *   Game.loadGame()          セーブデータ読み込み
 *   Game.save()              セーブ
 *
 *   handleTrap()             罠処理
 *   handleStairs()           階段処理
 *   handleChest()            宝箱処理
 *   checkRandomEncounter()   エンカウント判定
 *
 *   Battle オブジェクト（戦闘管理）
 *     Battle.start(enemies)  戦闘開始
 *     Battle.isActive()      戦闘中か判定
 *     Battle.selectCmd(cmd)  コマンド選択
 *     Battle.selectTarget(gi,mi) 対象選択
 *     Battle.selectSpell(spellId) 呪文選択
 *     Battle.selectItem(itemIdx)  アイテム選択
 *     Battle.confirmCompanion(idx) 仲間にする確認
 *     Battle.cancelCompanionSelect() キャンセル
 *
 *   startBattle()            エンカウント時に呼ばれる戦闘生成処理
 *
 * 【マップセルの値】
 *   0 = 壁  1 = 床  2 = 罠  3 = 階段  4 = 宝箱
 *
 * ============================================================
 */

const DUNGEON_SIZE = 10;

function generateDungeon(floor) {
  const map = [];
  for(let y=0;y<DUNGEON_SIZE;y++) {
    map[y] = [];
    for(let x=0;x<DUNGEON_SIZE;x++) map[y][x] = 1; // wall
  }
  // Simple maze-like generation
  function carve(x, y) {
    const dirs = [[0,-2],[2,0],[0,2],[-2,0]].sort(()=>Math.random()-0.5);
    for(const [dx,dy] of dirs) {
      const nx=x+dx, ny=y+dy;
      if(nx>0&&nx<DUNGEON_SIZE-1&&ny>0&&ny<DUNGEON_SIZE-1&&map[ny][nx]===1) {
        map[y+dy/2][x+dx/2] = 0;
        map[ny][nx] = 0;
        carve(nx,ny);
      }
    }
  }
  map[1][1] = 0;
  carve(1,1);

  // Place stairs
  let stairsPlaced = false;
  while(!stairsPlaced) {
    const sx=rand(1,DUNGEON_SIZE-2), sy=rand(1,DUNGEON_SIZE-2);
    if(map[sy][sx]===0 && !(sx===1&&sy===1)) {
      map[sy][sx] = 3; // stairs down
      stairsPlaced = true;
    }
  }

  // Place traps
  for(let i=0;i<floor+2;i++) {
    const tx=rand(1,DUNGEON_SIZE-2), ty=rand(1,DUNGEON_SIZE-2);
    if(map[ty][tx]===0) map[ty][tx]=2; // trap
  }

  // Place treasure chests
  for(let i=0;i<Math.min(floor,5);i++) {
    const tx=rand(1,DUNGEON_SIZE-2), ty=rand(1,DUNGEON_SIZE-2);
    if(map[ty][tx]===0) map[ty][tx]=4; // chest
  }

  return { map, floor, explored: {} };
}

function initDungeon() {
  GS.dungeon = generateDungeon(GS.floor);
  GS.playerPos = { x:1, y:1 };
  GS.playerDir = 0;
  GS.currentFloorData = GS.dungeon;
  exploreAround();
  renderDungeon();
  renderMap();
}

function exploreAround() {
  const {x,y} = GS.playerPos;
  for(let dy=-1;dy<=1;dy++) {
    for(let dx=-1;dx<=1;dx++) {
      const key = `${x+dx},${y+dy}`;
      GS.autoMap[key] = GS.dungeon.map[y+dy]?.[x+dx] ?? 1;
    }
  }
}

// ==================== DUNGEON RENDERING (1st person) ====================
function renderDungeon() {
  const canvas = document.getElementById('dungeon-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  // Background gradient
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#050510');
  grad.addColorStop(1,'#0a0a20');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  // Ceiling/floor
  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(0,0,W,H/2);
  ctx.fillStyle = '#06060f';
  ctx.fillRect(0,H/2,W,H/2);

  // 3D-ish wall rendering
  const {x,y} = GS.playerPos;
  const dir = GS.playerDir;
  const dx_forward = [0,1,0,-1][dir];
  const dy_forward = [-1,0,1,0][dir];
  const dx_right = [1,0,-1,0][dir];
  const dy_right = [0,1,0,-1][dir];

  function isWall(px,py) {
    if(px<0||py<0||px>=DUNGEON_SIZE||py>=DUNGEON_SIZE) return true;
    return GS.dungeon.map[py][px] === 1;
  }

  // Draw walls (simplified 5-column view)
  const slices = [
    { col:-2, depth:3, offx:-2 },
    { col:-1, depth:2, offx:-1 },
    { col: 0, depth:1, offx: 0 },
    { col: 1, depth:2, offx: 1 },
    { col: 2, depth:3, offx: 2 }
  ];

  // Draw 3 rows deep
  for(let depth=3;depth>=1;depth--) {
    const fx = x + dx_forward*depth;
    const fy = y + dy_forward*depth;
    const wallFront = isWall(fx, fy);
    const wallLeft  = isWall(fx - dx_right, fy - dy_right);
    const wallRight = isWall(fx + dx_right, fy + dy_right);

    const brightness = 0.2 + (4-depth)*0.25;
    const wallColor = `rgba(${Math.floor(40*brightness)},${Math.floor(40*brightness)},${Math.floor(100*brightness)},1)`;
    const wallColorDark = `rgba(${Math.floor(20*brightness)},${Math.floor(20*brightness)},${Math.floor(60*brightness)},1)`;
    const borderColor = `rgba(${Math.floor(80*brightness)},${Math.floor(80*brightness)},${Math.floor(180*brightness)},1)`;

    const cellW = W / 5;
    const cellH = H * 0.6;
    const top = (H - cellH) / 2;
    const cellWd = cellW * (4-depth)/3;

    const cx = W/2;
    const cy = H/2;
    const halfW = (W * 0.5) * (4-depth)/3;
    const halfH = (H * 0.35) * (4-depth)/3 + H*0.08*(4-depth);

    if(wallFront) {
      ctx.fillStyle = wallColor;
      ctx.fillRect(cx-halfW, cy-halfH, halfW*2, halfH*2);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx-halfW, cy-halfH, halfW*2, halfH*2);
      // Wall pattern
      ctx.strokeStyle = `rgba(60,60,140,${brightness*0.3})`;
      for(let i=1;i<4;i++) {
        ctx.beginPath();
        ctx.moveTo(cx-halfW, cy-halfH+halfH*2*i/4);
        ctx.lineTo(cx+halfW, cy-halfH+halfH*2*i/4);
        ctx.stroke();
      }
    }

    if(!isWall(fx - dx_right*0, fy - dy_right*0)) {
      if(wallLeft) {
        ctx.fillStyle = wallColorDark;
        ctx.beginPath();
        const prevHalfW = (W*0.5)*(5-depth)/3;
        const prevHalfH = (H*0.35)*(5-depth)/3+H*0.08*(5-depth);
        ctx.moveTo(cx-prevHalfW, cy-prevHalfH);
        ctx.lineTo(cx-halfW, cy-halfH);
        ctx.lineTo(cx-halfW, cy+halfH);
        ctx.lineTo(cx-prevHalfW, cy+prevHalfH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if(wallRight) {
        ctx.fillStyle = wallColorDark;
        ctx.beginPath();
        const prevHalfW = (W*0.5)*(5-depth)/3;
        const prevHalfH = (H*0.35)*(5-depth)/3+H*0.08*(5-depth);
        ctx.moveTo(cx+prevHalfW, cy-prevHalfH);
        ctx.lineTo(cx+halfW, cy-halfH);
        ctx.lineTo(cx+halfW, cy+halfH);
        ctx.lineTo(cx+prevHalfW, cy+prevHalfH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  // Compass
  const dirs = ['N','E','S','W'];
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(W-50, 5, 44, 20);
  ctx.fillStyle = '#c8a020';
  ctx.font = '12px Share Tech Mono, monospace';
  ctx.fillText(dirs[GS.playerDir], W-32, 19);

  // Floor indicator
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(5, 5, 50, 20);
  ctx.fillStyle = '#20c8c8';
  ctx.font = '12px Share Tech Mono, monospace';
  ctx.fillText(`B${GS.floor}F`, 10, 19);

  // Cell type indicator
  const curCell = GS.dungeon.map[y][x];
  if(curCell===2) {
    ctx.fillStyle = 'rgba(200,32,32,0.3)';
    ctx.fillRect(0,0,W,H);
    document.getElementById('dungeon-events').textContent = '⚠ 罠を踏んだ！';
  } else if(curCell===3) {
    // Draw stairs indicator
    ctx.fillStyle = '#c8a020';
    ctx.font = '14px Noto Sans JP, sans-serif';
    ctx.fillText('▼ 下り階段', W/2-50, H-20);
    document.getElementById('dungeon-events').textContent = '階段がある（下層へ進む場合はボタンを押してください）';
  } else if(curCell===4) {
    ctx.fillStyle = '#c8a020';
    ctx.font = '14px Noto Sans JP, sans-serif';
    ctx.fillText('📦 宝箱', W/2-30, H-20);
  } else {
    document.getElementById('dungeon-events').textContent = '';
  }
  
  updateQuickInfo();
}

function renderMap() {
  const canvas = document.getElementById('map-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cellW = W/DUNGEON_SIZE, cellH = H/DUNGEON_SIZE;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,W,H);

  for(const [key, val] of Object.entries(GS.autoMap)) {
    const [mx,my] = key.split(',').map(Number);
    const rx = mx*cellW, ry = my*cellH;
    if(val===1) { ctx.fillStyle='#111'; ctx.fillRect(rx,ry,cellW,cellH); }
    else if(val===0) { ctx.fillStyle='#224'; ctx.fillRect(rx,ry,cellW,cellH); }
    else if(val===2) { ctx.fillStyle='#422'; ctx.fillRect(rx,ry,cellW,cellH); } // trap
    else if(val===3) { ctx.fillStyle='#242'; ctx.fillRect(rx,ry,cellW,cellH); } // stairs
    else if(val===4) { ctx.fillStyle='#442'; ctx.fillRect(rx,ry,cellW,cellH); } // chest
  }

  // Player
  const {x,y} = GS.playerPos;
  ctx.fillStyle='#c8a020';
  ctx.fillRect(x*cellW+2, y*cellH+2, cellW-4, cellH-4);
  // Direction indicator
  const dirX = [0,1,0,-1][GS.playerDir]*cellW*0.4;
  const dirY = [-1,0,1,0][GS.playerDir]*cellH*0.4;
  ctx.fillStyle='#fff';
  ctx.beginPath();
  ctx.arc(x*cellW+cellW/2+dirX, y*cellH+cellH/2+dirY, 2, 0, Math.PI*2);
  ctx.fill();
}

function renderFullMap() {
  const canvas = document.getElementById('full-map-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  const cellW=W/DUNGEON_SIZE, cellH=H/DUNGEON_SIZE;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,W,H);

  for(const [key, val] of Object.entries(GS.autoMap)) {
    const [mx,my]=key.split(',').map(Number);
    const rx=mx*cellW, ry=my*cellH;
    ctx.fillStyle = val===1?'#0a0a14':val===0?'#1a2040':val===2?'#402020':val===3?'#204020':'#404020';
    ctx.fillRect(rx+1,ry+1,cellW-2,cellH-2);
    ctx.strokeStyle='#2a2a50';
    ctx.strokeRect(rx,ry,cellW,cellH);
    if(val===2){ ctx.fillStyle='#f44';ctx.font='12px monospace';ctx.fillText('T',rx+4,ry+14); }
    if(val===3){ ctx.fillStyle='#4f4';ctx.font='12px monospace';ctx.fillText('↓',rx+4,ry+14); }
    if(val===4){ ctx.fillStyle='#ff4';ctx.font='12px monospace';ctx.fillText('★',rx+4,ry+14); }
  }

  // Player
  const {x,y}=GS.playerPos;
  ctx.fillStyle='#c8a020';
  ctx.beginPath();
  ctx.arc(x*cellW+cellW/2, y*cellH+cellH/2, cellW/3, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle='#fff';
  ctx.font='bold 14px monospace';
  ctx.fillText('★', x*cellW+cellW/2-7, y*cellH+cellH/2+5);
}

// ==================== MOVEMENT ====================
const Game = {
  move(action) {
    if(Battle.isActive()) return;
    const {x,y} = GS.playerPos;
    let nx=x,ny=y;
    const fwd = [[0,-1],[1,0],[0,1],[-1,0]];
    const right= [[1,0],[0,1],[-1,0],[0,-1]];

    if(action==='forward') {
      nx+=fwd[GS.playerDir][0]; ny+=fwd[GS.playerDir][1];
    } else if(action==='backward') {
      nx-=fwd[GS.playerDir][0]; ny-=fwd[GS.playerDir][1];
    } else if(action==='turnLeft') {
      GS.playerDir=(GS.playerDir+3)%4; renderDungeon(); renderMap(); return;
    } else if(action==='turnRight') {
      GS.playerDir=(GS.playerDir+1)%4; renderDungeon(); renderMap(); return;
    } else if(action==='strafeLeft') {
      nx-=right[GS.playerDir][0]; ny-=right[GS.playerDir][1];
    } else if(action==='strafeRight') {
      nx+=right[GS.playerDir][0]; ny+=right[GS.playerDir][1];
    }

    if(nx<0||ny<0||nx>=DUNGEON_SIZE||ny>=DUNGEON_SIZE) return;
    if(GS.dungeon.map[ny][nx]===1) { log('壁だ。'); renderDungeon(); return; }

    GS.playerPos={x:nx,y:ny};
    exploreAround();
    renderDungeon();
    renderMap();

    const cell = GS.dungeon.map[ny][nx];
    if(cell===2) handleTrap();
    else if(cell===3) handleStairs();
    else if(cell===4) handleChest();
    else checkRandomEncounter();
  },

  newGame() {
    GS.gold=500;GS.floor=1;GS.maxFloorReached=1;
    GS.party=[];GS.roster=[];
    GS.shopItems=[...DATA.shopStock];
    GS.encyclopediaItems=new Set();
    GS.encyclopediaMonsters=new Set();
    GS.autoMap={};
    showScreen('town-screen');
    renderTownGold();
    log('新たな冒険が始まる！街で仲間を集めよう。','event');
  },

  loadGame() {
    const saved = localStorage.getItem('wizardry_save');
    if(!saved) { alert('セーブデータがありません'); return; }
    try {
      const data = JSON.parse(saved);
      Object.assign(GS, data);
      GS.encyclopediaItems = new Set(data.encyclopediaItems||[]);
      GS.encyclopediaMonsters = new Set(data.encyclopediaMonsters||[]);
      showScreen('town-screen');
      renderTownGold();
      log('セーブデータを読み込みました','event');
    } catch(e) { alert('読み込みエラー'); }
  },

  save() {
    const data = {...GS, encyclopediaItems:[...GS.encyclopediaItems], encyclopediaMonsters:[...GS.encyclopediaMonsters]};
    localStorage.setItem('wizardry_save', JSON.stringify(data));
    log('ゲームをセーブしました','event');
  }
};

function handleTrap() {
  const partyAlive = GS.party.filter(c=>c.isAlive&&!c.status.includes('stone'));
  if(!partyAlive.length) return;
  const target = randFrom(partyAlive);
  const trapType = rand(1,4);
  let msg='';
  if(trapType===1) {
    const dmg=rand(5,15)+GS.floor*2;
    target.hp=Math.max(0,target.hp-dmg);
    msg=`${target.name}が落とし穴に落ちた！${dmg}ダメージ！`;
    if(target.hp===0) { target.isAlive=false; target.status=['dead']; msg+=` ${target.name}は倒れた！`; }
  } else if(trapType===2) {
    if(!target.status.includes('poison')) {
      target.status.push('poison');
      msg=`${target.name}が毒針に刺さった！毒状態に！`;
    }
  } else if(trapType===3) {
    const dmg=rand(1,3);
    partyAlive.forEach(c=>{c.hp=Math.max(0,c.hp-dmg);});
    msg=`ガス罠！全員${dmg}ダメージ！`;
  } else {
    msg='罠を発見したが、うまく回避した！';
  }
  log(msg,'combat');
  updatePartyDisplay();
  GS.dungeon.map[GS.playerPos.y][GS.playerPos.x]=0; // disarm trap after trigger
}

function handleStairs() {
  const evEl=document.getElementById('dungeon-events');
  evEl.innerHTML='<button class="action-btn" onclick="goDeeper()">▼ 下の階へ進む</button> <button class="action-btn" onclick="goUp()">▲ 前の階へ戻る</button>';
}

/**
 * 「調べる」ボタン — 現在地のセルに応じてインタラクション
 * 通路: ランダムエンカウント判定 / 階段: 移動選択肢表示 / 宝箱: 開封 / 罠: 起動
 */
function interactCell() {
  if(Battle.isActive()) return;
  const {x,y}=GS.playerPos;
  const cell=GS.dungeon.map[y][x];
  if(cell===3)      handleStairs();
  else if(cell===4) handleChest();
  else if(cell===2) handleTrap();
  else { log('ここには何もない。','sys'); }
}

function goDeeper() {
  GS.floor++;
  GS.maxFloorReached=Math.max(GS.maxFloorReached,GS.floor);
  GS.autoMap={};
  log(`B${GS.floor}Fへ進んだ。`,'event');
  initDungeon();
  document.getElementById('floor-display').textContent=`B${GS.floor}F`;
  document.getElementById('dungeon-events').textContent='';
}

function goUp() {
  if(GS.floor<=1) {
    // B1Fの階段で戻るを選択 → 町へ帰還（CM広告なし）
    log('ダンジョンを出て町へ戻った。','event');
    showTown('stairs');
    return;
  }
  GS.floor--;
  GS.autoMap={};
  log(`B${GS.floor}Fに戻った。`,'event');
  initDungeon();
  document.getElementById('floor-display').textContent=`B${GS.floor}F`;
  document.getElementById('dungeon-events').textContent='';
}

function handleChest() {
  const available = DATA.items.filter(i=>i.minFloor<=GS.floor);
  const item = randFrom(available);
  const gold = rand(GS.floor*5, GS.floor*20);
  const roll = rand(1,10);
  if(roll<=7) {
    GS.gold+=gold;
    updateGoldDisplay();
    log(`宝箱を開けた！${gold}Gを手に入れた！`,'item');
  } else if(item) {
    const target = GS.party.find(c=>c.isAlive&&c.inventory.length<8);
    if(target) {
      target.inventory.push(item.id);
      GS.encyclopediaItems.add(item.id);
      log(`宝箱を開けた！${item.name}を手に入れた！`,'item');
    } else {
      GS.gold+=item.price;
      log(`宝箱を開けたが持てないので${item.price}Gに換えた。`,'item');
    }
  }
  GS.dungeon.map[GS.playerPos.y][GS.playerPos.x]=0;
  updatePartyDisplay();
}

function checkRandomEncounter() {
  const rate = 0.15 + GS.floor * 0.01;
  if(Math.random() < rate) startBattle();
}

// ==================== BATTLE SYSTEM ====================
const Battle = {
  isActive() { return document.getElementById('battle-screen').classList.contains('active'); },

  start(enemies) {
    GS.battleState = {
      enemies,
      turn: 1,
      phase: 'player',
      autoMode: false,
      selectedChar: null,
      selectedAction: null,
      pendingSpell: null,
      actionQueue: [],
      decidedChars: new Set(),
      pendingActions: []
    };
    GS.autoMode=false;
    showScreen('battle-screen');
    this.renderAll();
    this.restoreCmds();
    blogMsg(`=== バトル開始！ ターン 1 ===`,'event');
    this.nextCharTurn();
  },

  renderAll() {
    this.renderEnemies();
    this.renderParty();
    this.renderBattleCmds();
  },

  renderEnemies() {
    const el = document.getElementById('enemy-groups-display');
    if(!el) return;
    const bs = GS.battleState;
    el.innerHTML='';
    bs.enemies.forEach((grp,gi)=>{
      const div=document.createElement('div');
      div.className='enemy-group';
      div.innerHTML=`<div class="enemy-group-label">${gi<3?'前衛':'後衛'} G${gi+1}</div>`;
      grp.monsters.forEach((m,mi)=>{
        const hpPct=m.curHp/m.maxHp*100;
        const dead=m.curHp<=0;
        div.innerHTML+=`<div class="enemy-card ${dead?'dead':''}" onclick="Battle.targetEnemy(${gi},${mi})">
          <span>${m.img||'👾'}</span>
          <span style="flex:1;font-size:10px">${m.name}</span>
          <span class="enemy-hp-bar"><span class="enemy-hp-fill" style="width:${hpPct}%"></span></span>
        </div>`;
      });
      el.appendChild(div);
    });
  },

  renderParty() {
    const el = document.getElementById('battle-chars-display');
    if(!el) return;
    el.innerHTML='';
    GS.party.forEach((c,i)=>{
      const hpPct=c.maxHp?c.hp/c.maxHp*100:0;
      const dead=!c.isAlive||c.status.includes('dead')||c.status.includes('stone');
      const acting=GS.battleState?.selectedChar===c.id;
      const defending=GS.battleState?.pendingActions?.find(a=>a.charId===c.id&&a.action==='defend');
      el.innerHTML+=`<div class="battle-char ${dead?'dead':''} ${acting?'acting':''} ${defending?'defending':''}" onclick="Battle.selectChar(${i})">
        <div class="bc-name">${c.name}</div>
        <div class="bc-class">${getJob(c.job)?.name||''} Lv${c.level}</div>
        <div class="bc-hp" style="color:${hpColor(c.hp,c.maxHp)}">${c.hp}/${c.maxHp}</div>
        <div class="bc-status">${statusBadges(c)}</div>
      </div>`;
    });
  },

  renderBattleCmds() {
    const el=document.getElementById('battle-cmd-title');
    if(!el) return;
    const bs=GS.battleState;
    if(bs?.autoMode) {
      el.textContent='AUTO戦闘中...';
    } else if(bs?.selectedChar) {
      const c=GS.party.find(p=>p.id===bs.selectedChar);
      el.textContent=c?`${c.name} のコマンド`:'コマンド選択';
    } else {
      el.textContent='コマンド選択';
    }
  },

  toggleAuto() {
    const bs=GS.battleState;
    if(!bs) return;
    bs.autoMode=!bs.autoMode;
    GS.autoMode=bs.autoMode;
    const btn=document.querySelector('.cmd-btn');
    if(bs.autoMode) {
      btn.classList.add('auto-on');
      btn.style.borderColor='var(--green)';
      btn.style.color='var(--green2)';
      blogMsg('AUTO戦闘モード ON','event');
      this.autoTurn();
    } else {
      btn.style.borderColor='';
      btn.style.color='';
      blogMsg('AUTO戦闘モード OFF','sys');
    }
  },

  autoTurn() {
    if(!GS.battleState?.autoMode) return;
    if(!Battle.isActive()) return;
    // All living party members attack random living enemy
    GS.party.forEach(c=>{
      if(!c.isAlive||c.status.includes('stone')||c.status.includes('dead')) return;
      const allEnemies=[];
      GS.battleState.enemies.forEach((grp,gi)=>grp.monsters.forEach((m,mi)=>{if(m.curHp>0)allEnemies.push({gi,mi});}));
      if(!allEnemies.length) return;
      const target=randFrom(allEnemies);
      this.executeAttack(c, target.gi, target.mi);
    });
    this.checkBattleEnd();
    if(!Battle.isActive()) return;
    if(!GS.battleState?.autoMode) return;
    this.enemyTurn();
    this.checkBattleEnd();
    if(!Battle.isActive()) return;
    if(GS.battleState?.autoMode) {
      GS.battleState.turn++;
      blogMsg(`--- ターン ${GS.battleState.turn} ---`,'sys');
      setTimeout(()=>Battle.autoTurn(), 800);
    }
  },

  selectChar(idx) {
    const bs=GS.battleState;
    if(!bs||bs.autoMode) return;
    const c=GS.party[idx];
    if(!c||!c.isAlive||c.status.includes('stone')||c.status.includes('dead')) return;
    if(bs.selectedChar && bs.selectedChar!==c.id) {
      blogMsg(`今は ${GS.party.find(p=>p.id===bs.selectedChar)?.name} のターンです`,'sys');
    }
  },

  cmdAttack() {
    const bs=GS.battleState;
    if(!bs||bs.autoMode||!bs.selectedChar) { blogMsg('キャラクターのターン待ちです','sys'); return; }
    bs.selectedAction='attack';
    const c=GS.party.find(p=>p.id===bs.selectedChar);
    blogMsg(`▶ ${c?.name}：攻撃対象をクリックしてください`,'event');
  },

  cmdMagic() {
    const bs=GS.battleState;
    if(!bs||bs.autoMode||!bs.selectedChar) { blogMsg('キャラクターのターン待ちです','sys'); return; }
    const c=GS.party.find(p=>p.id===bs.selectedChar);
    if(!c) return;
    const all=[...getAvailableSpells(c,'mage'),...getAvailableSpells(c,'priest')];
    if(!all.length) { blogMsg(`${c.name}は魔法を使えない`,'sys'); return; }
    this.showMagicMenu(c, all);
  },

  showMagicMenu(char, spells) {
    const el=document.getElementById('battle-cmd-area');
    el.innerHTML=`<div class="battle-title">${char.name}の魔法 (MP:${char.mp})</div>
      <div class="magic-grid" id="spell-list"></div>
      <button class="cmd-btn" style="margin-top:8px" onclick="Battle.restoreCmds()">戻る</button>`;
    const sl=document.getElementById('spell-list');
    spells.forEach(sp=>{
      const btn=document.createElement('button');
      btn.className='magic-btn';
      btn.disabled=char.mp<sp.cost;
      btn.innerHTML=`${sp.name}<span class="magic-cost">MP:${sp.cost}</span><br><span style="font-size:9px;color:var(--gray)">${sp.desc}</span>`;
      btn.onclick=()=>this.selectSpell(char,sp);
      sl.appendChild(btn);
    });
  },

  restoreCmds() {
    const el=document.getElementById('battle-cmd-area');
    el.innerHTML=`<div class="battle-title" id="battle-cmd-title">コマンド選択</div>
      <div class="cmd-row" id="battle-cmds">
        <button class="cmd-btn" onclick="Battle.toggleAuto()">AUTO</button>
        <button class="cmd-btn" onclick="Battle.cmdAttack()">攻撃</button>
        <button class="cmd-btn" onclick="Battle.cmdMagic()">魔法</button>
        <button class="cmd-btn" onclick="Battle.cmdDefend()">防御</button>
        <button class="cmd-btn" onclick="Battle.cmdFlee()">逃走</button>
      </div>`;
    this.renderBattleCmds();
  },

  selectSpell(char, spell) {
    const bs=GS.battleState;
    if(spell.type==='damage' && spell.target==='one') {
      char.mp=Math.max(0,char.mp-spell.cost);
      bs.selectedAction='spell_one';
      bs.pendingSpell={...spell};
      this.restoreCmds();
      blogMsg(`▶ ${char.name}：${spell.name}の対象をクリックしてください`,'magic');
    } else {
      char.mp=Math.max(0,char.mp-spell.cost);
      this.restoreCmds();
      blogMsg(`${char.name}→${spell.name}を選択`,'magic');
      this.registerAction('spell',{spell:{...spell},gi:-1,mi:-1});
    }
  },

  resolveSpell(char, spell, gi, mi) {
    const bs=GS.battleState;
    const stats=calcStats(char);
    if(spell.type==='damage') {
      const dmg=(rand(spell.power*0.7,spell.power*1.3)|0)+stats.intel*2;
      if(gi>=0&&mi>=0) {
        const enemy=bs.enemies[gi]?.monsters[mi];
        if(enemy&&enemy.curHp>0) {
          enemy.curHp=Math.max(0,enemy.curHp-dmg);
          blogMsg(`  ${char.name}→${spell.name}→${enemy.name}: ${dmg}ダメージ！`,'magic');
        }
      } else {
        blogMsg(`  ${char.name}→${spell.name}（全体）！`,'magic');
        bs.enemies.forEach(grp=>grp.monsters.forEach(m=>{
          if(m.curHp<=0) return;
          if(spell.target==='all'||Math.random()<0.7) {
            m.curHp=Math.max(0,m.curHp-dmg);
            blogMsg(`    ${m.name}に${dmg}ダメージ！`,'magic');
          }
        }));
      }
    } else if(spell.type==='heal') {
      const heal=(rand(spell.power*0.7,spell.power*1.3)|0)+stats.pie*2;
      char.hp=Math.min(char.maxHp,char.hp+heal);
      blogMsg(`  ${char.name}→${spell.name}：HP+${heal}（${char.hp}/${char.maxHp}）`,'magic');
    } else if(spell.type==='revive') {
      const dead=GS.party.filter(c=>!c.isAlive&&!c.status.includes('stone'));
      if(dead.length) {
        dead[0].isAlive=true; dead[0].hp=Math.floor(dead[0].maxHp*0.1);
        dead[0].status=dead[0].status.filter(s=>s!=='dead');
        blogMsg(`  ${char.name}→${spell.name}：${dead[0].name}が蘇生！`,'magic');
      } else blogMsg(`  蘇生対象がいない`,'sys');
    } else {
      blogMsg(`  ${char.name}→${spell.name}！`,'magic');
    }
  },

  registerAction(action, opts={}) {
    const bs=GS.battleState;
    if(!bs||!bs.selectedChar) return;
    const c=GS.party.find(p=>p.id===bs.selectedChar);
    if(!c) return;
    bs.actionQueue.push({charId:c.id, action, ...opts});
    bs.decidedChars.add(c.id);
    if(action==='defend') bs.pendingActions.push({charId:c.id,action:'defend'});
    bs.selectedChar=null;
    this.renderAll();
    this.nextCharTurn();
  },

  nextCharTurn() {
    const bs=GS.battleState;
    if(!bs||bs.autoMode) return;
    const living=GS.party.filter(c=>c.isAlive&&!c.status.includes('stone')&&!c.status.includes('dead'));
    const next=living.find(c=>!bs.decidedChars.has(c.id));
    if(next) {
      bs.selectedChar=next.id;
      this.renderParty();
      this.renderBattleCmds();
      blogMsg(`▶ ${next.name} のターン — コマンドを選んでください`,'event');
    } else {
      this.executePlayerActions();
    }
  },

  executePlayerActions() {
    const bs=GS.battleState;
    blogMsg(`── 味方フェーズ ──`,'sys');
    for(const act of bs.actionQueue) {
      if(!bs.enemies.some(g=>g.monsters.some(m=>m.curHp>0))) break;
      const c=GS.party.find(p=>p.id===act.charId);
      if(!c||!c.isAlive||c.status.includes('stone')) continue;
      if(act.action==='attack') {
        const enemy=bs.enemies[act.gi]?.monsters[act.mi];
        if(!enemy||enemy.curHp<=0) {
          let retargeted=false;
          outer: for(let gi=0;gi<bs.enemies.length;gi++) for(let mi=0;mi<bs.enemies[gi].monsters.length;mi++) {
            if(bs.enemies[gi].monsters[mi].curHp>0) { this.executeAttack(c,gi,mi); retargeted=true; break outer; }
          }
          if(!retargeted) blogMsg(`${c.name}の攻撃：敵がいない`,'sys');
        } else { this.executeAttack(c,act.gi,act.mi); }
      } else if(act.action==='spell') {
        this.resolveSpell(c,act.spell,act.gi??-1,act.mi??-1);
      } else if(act.action==='defend') {
        blogMsg(`  ${c.name}は防御！（ダメージ半減）`,'sys');
      }
    }
    this.renderAll();
    this.checkBattleEnd();
    if(!Battle.isActive()) return;
    blogMsg(`── 敵フェーズ ──`,'sys');
    this.enemyTurn();
    this.checkBattleEnd();
    if(!Battle.isActive()) return;
    bs.turn++;
    bs.actionQueue=[];
    bs.decidedChars=new Set();
    bs.pendingActions=[];
    bs.selectedChar=null;
    blogMsg(`=== ターン ${bs.turn} ===`,'sys');
    this.nextCharTurn();
  },

  cmdDefend() {
    const bs=GS.battleState;
    if(!bs||bs.autoMode||!bs.selectedChar) return;
    const c=GS.party.find(p=>p.id===bs.selectedChar);
    if(!c) return;
    blogMsg(`${c.name}は防御を選択`,  'sys');
    this.registerAction('defend');
  },

  cmdFlee() {
    const bs=GS.battleState;
    if(!bs) return;
    if(Math.random()<0.4) {
      blogMsg('逃走した！','event');
      this.endBattle(false);
    } else {
      blogMsg('逃走に失敗！','combat');
      this.enemyTurn();
      this.checkBattleEnd();
    }
  },

  targetEnemy(gi, mi) {
    const bs=GS.battleState;
    if(!bs||bs.autoMode) return;
    const enemy=bs.enemies[gi]?.monsters[mi];
    if(!enemy||enemy.curHp<=0) { blogMsg('そのモンスターはすでに倒れている','sys'); return; }
    if(!bs.selectedChar) { blogMsg('キャラクターのターンを待ってください','sys'); return; }
    const c=GS.party.find(p=>p.id===bs.selectedChar);
    if(!c) return;
    if(bs.selectedAction==='attack') {
      blogMsg(`${c.name}→${enemy.name}を攻撃！`,'event');
      bs.selectedAction=null;
      this.registerAction('attack',{gi,mi});
    } else if(bs.selectedAction==='spell_one') {
      const sp=bs.pendingSpell;
      if(!sp) return;
      blogMsg(`${c.name}→${sp.name}（${enemy.name}）`,'magic');
      bs.selectedAction=null; bs.pendingSpell=null;
      this.registerAction('spell',{spell:{...sp},gi,mi});
    } else {
      blogMsg('先にコマンドを選んでください','sys');
    }
  },

  executeAttack(char, gi, mi) {
    const enemy=GS.battleState.enemies[gi]?.monsters[mi];
    if(!enemy||enemy.curHp<=0) return;
    const stats=calcStats(char);
    const atk=calcATK(char);
    const def=Math.floor(enemy.def*0.5);
    let dmg=Math.max(1, atk - def + rand(-2,5));

    // Status effects
    if(char.status.includes('confused')) {
      // Attack random target including self
      if(Math.random()<0.3) {
        const ally=randFrom(GS.party.filter(c=>c.isAlive));
        ally.hp=Math.max(0,ally.hp-dmg);
        blogMsg(`${char.name}は混乱して${ally.name}を攻撃！${dmg}ダメージ！`,'combat');
        if(ally.hp===0) { ally.isAlive=false; ally.status.push('dead'); blogMsg(`${ally.name}は倒れた！`,'combat'); }
        return;
      }
    }

    enemy.curHp=Math.max(0, enemy.curHp-dmg);
    let msg=`${char.name}→${enemy.name}: ${dmg}ダメージ`;
    if(enemy.curHp<=0) { msg+=` 撃破！`; char.kills=(char.kills||0)+1; }
    blogMsg(msg,'combat');
  },

  proceedTurn() { this.renderAll(); this.checkBattleEnd(); },

  enemyTurn() {
    const bs=GS.battleState;
    const aliveParty=GS.party.filter(c=>c.isAlive&&!c.status.includes('stone'));
    if(!aliveParty.length) return;

    bs.enemies.forEach((grp,gi)=>{
      grp.monsters.forEach(m=>{
        if(m.curHp<=0) return;
        // Determine targets (front row preferred)
        const frontRow=GS.party.slice(0,3).filter(c=>c.isAlive&&!c.status.includes('stone'));
        const targets=frontRow.length?frontRow:aliveParty;
        const target=randFrom(targets);
        if(!target) return;

        const isDefending=bs.pendingActions?.find(a=>a.charId===target.id&&a.action==='defend');
        let dmg=Math.max(1, m.atk - calcDEF(target) + rand(-3,5));
        if(isDefending) dmg=Math.max(1,Math.floor(dmg*0.5));

        // Special abilities
        if(m.abilities.includes('poison')&&Math.random()<0.2&&!target.status.includes('poison')) {
          target.status.push('poison');
          blogMsg(`${m.name}の毒攻撃！${target.name}が毒状態に！`,'combat');
        }
        if(m.abilities.includes('stone')&&Math.random()<0.1&&!target.status.includes('stone')) {
          target.status.push('stone');
          target.isAlive=false;
          blogMsg(`${m.name}の石化！${target.name}が石になった！`,'combat');
          return;
        }
        if(m.abilities.includes('drain')&&Math.random()<0.3) {
          const drained=Math.min(dmg,target.hp);
          m.curHp=Math.min(m.maxHp, m.curHp+drained);
          blogMsg(`${m.name}のドレイン！${target.name}から${drained}吸収！`,'combat');
        }
        if(m.abilities.includes('breath')) dmg=Math.max(1,dmg*1.5|0);
        if(m.abilities.includes('quick')&&Math.random()<0.5) {
          // Extra attack
          const dmg2=Math.max(1,m.atk-calcDEF(target)+rand(-2,3));
          target.hp=Math.max(0,target.hp-dmg2);
          if(target.hp===0) { target.isAlive=false; target.status.push('dead'); }
        }

        target.hp=Math.max(0,target.hp-dmg);
        let msg=`${m.name}→${target.name}: ${dmg}ダメージ`;
        if(target.hp===0) { target.isAlive=false; target.status.push('dead'); msg+=` ${target.name}は倒れた！`; }
        blogMsg(msg,'combat');
      });
    });

    // Poison damage
    aliveParty.forEach(c=>{
      if(c.status.includes('poison')) {
        const pd=Math.max(1,Math.floor(c.maxHp*0.05));
        c.hp=Math.max(0,c.hp-pd);
        blogMsg(`${c.name}の毒ダメージ: ${pd}`,'combat');
        if(c.hp===0) { c.isAlive=false; c.status.push('dead'); blogMsg(`${c.name}は倒れた！`,'combat'); }
      }
    });

    bs.pendingActions=[];
    this.renderAll();
  },

  checkBattleEnd() {
    const bs=GS.battleState;
    if(!bs) return;
    const aliveEnemies=bs.enemies.some(grp=>grp.monsters.some(m=>m.curHp>0));
    const aliveParty=GS.party.some(c=>c.isAlive&&!c.status.includes('stone'));

    if(!aliveEnemies) {
      this.victory();
    } else if(!aliveParty) {
      this.defeat();
    }
  },

  victory() {
    let totalExp=0, totalGold=0;
    const drops=[];
    GS.battleState.enemies.forEach(grp=>{
      grp.monsters.forEach(m=>{
        totalExp+=m.exp;
        totalGold+=rand(m.gold*0.5,m.gold*1.5)|0;
        GS.encyclopediaMonsters.add(m.id);
        // Drop rate: base 45% + floor bonus, multiple drops possible
        if(m.drops&&m.drops.length) {
          m.drops.forEach(did=>{
            const dropRate = 0.45 + GS.floor*0.02; // 45%〜65%
            if(Math.random()<dropRate) {
              drops.push({itemId:did, monsterName:m.name});
              GS.encyclopediaItems.add(did);
            }
          });
          // Rare extra drop from floor-appropriate items (15%+)
          if(Math.random()<0.15+GS.floor*0.01) {
            const floorItems=DATA.items.filter(i=>i.minFloor<=GS.floor&&i.slot);
            if(floorItems.length) {
              const bonus=randFrom(floorItems);
              drops.push({itemId:bonus.id, monsterName:m.name, rare:true});
              GS.encyclopediaItems.add(bonus.id);
            }
          }
        } else {
          // Even monsters without defined drops have a chance at floor-appropriate items
          if(Math.random()<0.20+GS.floor*0.01) {
            const floorItems=DATA.items.filter(i=>i.minFloor<=GS.floor);
            if(floorItems.length) {
              const bonus=randFrom(floorItems);
              drops.push({itemId:bonus.id, monsterName:m.name});
              GS.encyclopediaItems.add(bonus.id);
            }
          }
        }
      });
    });

    GS.gold+=totalGold;
    updateGoldDisplay();
    blogMsg(`════ 戦闘勝利！ EXP:${totalExp}  GOLD:${totalGold}G ════`,'event');
    log(`戦闘勝利！EXP${totalExp}、${totalGold}G獲得`,'item');

    // Distribute EXP
    const aliveParty=GS.party.filter(c=>c.isAlive&&!c.status.includes('stone'));
    const expEach=Math.floor(totalExp/Math.max(1,aliveParty.length));
    aliveParty.forEach(c=>{
      c.exp+=expEach;
      c.battles=(c.battles||0)+1;
      blogMsg(`  ${c.name}: +${expEach}EXP (計${c.exp})`,'sys');
    });

    // Show drops with details
    if(drops.length>0) {
      blogMsg(`◆ アイテムドロップ ◆`,'item');
      drops.forEach(d=>{
        const item=getItem(d.itemId);
        if(!item) return;
        const rare=d.rare?'★レア':'';
        // Find best candidate to receive: prefer who can equip it
        let target=null;
        if(item.slot) {
          target=aliveParty.find(c=>{
            if(c.inventory.length>=8) return false;
            if(item.classes&&!item.classes.includes(c.job)) return false;
            return true;
          });
        }
        if(!target) target=aliveParty.find(c=>c.inventory.length<8);
        if(target) {
          target.inventory.push(d.itemId);
          const atkStr=item.atk?` ATK+${item.atk}`:'';
          const defStr=item.def?` DEF+${item.def}`:'';
          blogMsg(`  ${d.monsterName}→${rare}[${item.name}]${atkStr}${defStr} → ${target.name}が拾得`,'item');
          log(`${target.name}が[${item.name}]を拾った！${atkStr}${defStr}`,'item');
        } else {
          GS.gold+=item.sell;
          blogMsg(`  [${item.name}]は持てないので${item.sell}Gに変換`,'item');
        }
      });
    } else {
      blogMsg(`  ドロップなし`,'sys');
    }

    // Check monster join
    const joinable=[];
    GS.battleState.enemies.forEach(grp=>{
      grp.monsters.forEach(m=>{
        if(m.joinable&&m.joinRate>0&&Math.random()*100<m.joinRate*0.5) joinable.push(m);
      });
    });

    if(joinable.length>0) {
      // 仲間加入イベントを先に処理し、選択完了後に endBattle する
      setTimeout(()=>this.offerMonsterJoin(joinable[0]), 500);
    } else {
      this.endBattle(true);
      updatePartyDisplay();
    }
  },

  defeat() {
    blogMsg('=== 全滅！ ===','combat');
    log('全滅した... 街に戻された','combat');
    setTimeout(()=>{
      this.endBattle(false);
      GS.party.forEach(c=>{ c.hp=1; c.isAlive=true; c.status=c.status.filter(s=>s==='stone'); });
      showTown();
    },1500);
  },

  endBattle(won) {  // won: true=勝利 false=敗北
    GS.battleState=null;
    GS.autoMode=false;
    showScreen('main-screen');
    renderDungeon();
    renderMap();
    updatePartyDisplay();
  },

  offerMonsterJoin(monster) {
    const overlay=document.getElementById('monster-join-overlay');
    document.getElementById('monster-join-name').textContent=`${monster.img} ${monster.name}`;
    document.getElementById('monster-join-msg').textContent=`${monster.name}が仲間になりたそうにしている！`;
    const btns=document.getElementById('monster-join-btns');
    // モンスターデータを一時保持して断るボタンから参照できるようにする
    window._offeringMonster = monster;
    btns.innerHTML=`
      <button class="cmd-btn" onclick="Battle.acceptMonster('${monster.id}')">仲間にする</button>
      <button class="cmd-btn" onclick="Battle.rejectMonster(window._offeringMonster)">断る</button>
    `;
    overlay.classList.add('active');
  },

  acceptMonster(monsterId) {
    const overlay=document.getElementById('monster-join-overlay');
    overlay.classList.remove('active');
    const md=getMonster(monsterId);
    if(!md) { this.endBattle(true); updatePartyDisplay(); return; }

    // Create monster character
    const monChar=createChar(md.name, 'lizard', 'fighter', {str:10,agi:10,intel:5,pie:5,vit:10,luk:5});
    monChar.isMonster=true;
    monChar.monsterId=monsterId;
    monChar.hp=md.hp+rand(0,md.hp/2|0);
    monChar.maxHp=md.hp*2;
    monChar.level=Math.ceil(GS.floor/2);

    if(GS.party.length>=6) {
      this.showCompanionSelect(monChar);
    } else {
      GS.party.push(monChar);
      log(`${md.name}が仲間になった！`,'monster');
      updatePartyDisplay();
    }
    this.endBattle(true);
    updatePartyDisplay();
  },

  rejectMonster(monster) {
    document.getElementById('monster-join-overlay').classList.remove('active');
    window._offeringMonster = null;
    // 断ったモンスターを邪教の館（GS.monsters）に登録
    if(monster) {
      if(!GS.monsters) GS.monsters = [];
      GS.monsters.push(monster);
      log(`断った。${monster.name}は邪教の館へ向かった。`,'monster');
    } else {
      log('断った。');
    }
    this.endBattle(true);
    updatePartyDisplay();
  },

  showCompanionSelect(newChar) {
    const overlay=document.getElementById('companion-select-overlay');
    const content=document.getElementById('companion-select-content');
    content.innerHTML=`<p style="font-size:12px;color:var(--gray);margin-bottom:10px;">新参加: ${newChar.name}</p>`;
    GS.party.forEach((c,i)=>{
      content.innerHTML+=`<div class="item-row" onclick="Battle.swapCompanion(${i}, '${newChar.id}')" data-newchar='${JSON.stringify(newChar)}'>
        <span>${i<3?'前衛':'後衛'}</span>
        <span class="item-name">${c.name}</span>
        <span class="item-type">${getJob(c.job)?.name||''}</span>
        <span class="item-val">Lv${c.level}</span>
        <span style="font-size:10px;color:var(--red2)">→ 別れる</span>
      </div>`;
    });
    content.innerHTML+=`<button class="cmd-btn" style="margin-top:8px;width:100%" onclick="Battle.cancelCompanionSelect()">キャンセル</button>`;
    // Store newChar in global temp
    window._pendingMonster=newChar;
    overlay.classList.add('active');
  },

  swapCompanion(idx) {
    const overlay=document.getElementById('companion-select-overlay');
    const removed=GS.party[idx];
    const newChar=window._pendingMonster;
    if(!newChar) return;
    GS.party.splice(idx,1,newChar);
    // 外れたメンバーがモンスターなら邪教の館へ送る
    if(removed.isMonster) {
      if(!GS.monsters) GS.monsters=[];
      GS.monsters.push(removed);
      log(`${removed.name}は邪教の館へ向かった。${newChar.name}が仲間になった！`,'monster');
    } else {
      log(`${removed.name}と別れ、${newChar.name}が仲間になった！`,'monster');
    }
    overlay.classList.remove('active');
    window._pendingMonster=null;
    updatePartyDisplay();
    this.endBattle(true);
  },

  cancelCompanionSelect() {
    document.getElementById('companion-select-overlay').classList.remove('active');
    // 入れ替えをキャンセル → 新参モンスターは邪教の館へ
    const pending=window._pendingMonster;
    if(pending) {
      if(!GS.monsters) GS.monsters=[];
      GS.monsters.push(pending);
      log(`入れ替えを断った。${pending.name}は邪教の館へ向かった。`,'monster');
    }
    window._pendingMonster=null;
    this.endBattle(true);
    updatePartyDisplay();
  }
};

function startBattle() {
  const floor=GS.floor;
  // Generate enemy groups
  const numGroups=rand(1,Math.min(6,floor+1));
  const fronts=Math.min(3,Math.ceil(numGroups/2));
  const backs=numGroups-fronts;
  const availableMonsters=DATA.monsters.filter(m=>m.floor<=floor);
  if(!availableMonsters.length) return;

  const enemies=[];
  for(let i=0;i<numGroups;i++) {
    const md=randFrom(availableMonsters);
    const count=rand(1,Math.min(9,4+floor/2|0));
    const monsters=[];
    for(let j=0;j<count;j++) {
      const hp=md.hp+rand(0,md.hp/3|0);
      monsters.push({...md, curHp:hp, maxHp:hp, status:[]});
    }
    enemies.push({monsters});
  }

  Battle.start(enemies);
}
