/**
 * ============================================================
 *  system_char.js — キャラクターシステム
 * ============================================================
 *
 * 【このファイルの役割】
 *   キャラクターのステータス計算・作成・呪文習得を担当します。
 *
 * 【依存関係】
 *   gamedata.js（DATA参照）
 *   gamestate.js（GS・ユーティリティ関数参照）
 *
 * 【読み込み順】
 *   3番目
 *
 * 【公開する関数】
 *   calcStats(char)          最終ステータス計算（装備ボーナス込み）
 *   calcMaxHP(char)          最大HP計算
 *   calcMaxMP(char)          最大MP計算
 *   calcATK(char)            攻撃力計算
 *   calcDEF(char)            防御力計算
 *   calcEXPNeeded(level)     次のLVに必要な経験値
 *   createChar(name,race,job,baseStats) キャラ作成（オブジェクトを返す）
 *   initCharHP(char)         HP/MPを最大値にリセット
 *   getAvailableSpells(char, type) 習得済み呪文リストを返す
 *
 * 【キャラクターオブジェクトの構造】
 *   {
 *     id, name, race, job,
 *     baseStats: { str, agi, intel, pie, vit, luk },
 *     level, exp,
 *     curHP, maxHP, curMP, maxMP,
 *     equip: { 右手, 左手, 頭, 体, 腕, 足, 指輪, 首 },
 *     inventory: [],  // アイテム配列（最大8個）
 *     status: [],     // 状態異常リスト
 *     isAlive: bool,
 *     position: 'front' | 'back'
 *   }
 *
 * ============================================================
 */

// ==================== CHARACTER SYSTEM ====================
function calcStats(char) {
  if(char.isMonster || !char.baseStats || !char.race || !char.job) {
    return { str:0, agi:0, intel:0, pie:0, vit:0, luk:0 };
  }
  const race = getRace(char.race);
  const job  = getJob(char.job);
  if(!race || !race.bonus) return { str:0, agi:0, intel:0, pie:0, vit:0, luk:0 };
  const base = char.baseStats;
  const bonus = race.bonus;
  return {
    str: base.str + bonus.str,
    agi: base.agi + bonus.agi,
    intel: base.intel + bonus.intel,
    pie: base.pie + bonus.pie,
    vit: base.vit + bonus.vit,
    luk: base.luk + bonus.luk
  };
}

function calcMaxHP(char) {
  if(char.isMonster || !char.baseStats) return char.maxHp || 0;
  const job = getJob(char.job);
  if(!job) return char.maxHp || 0;
  const stats = calcStats(char);
  return Math.max(1, Math.floor((job.hpDice/2 + stats.vit/4) * char.level) + char.level * 2);
}

function calcMaxMP(char) {
  if(char.isMonster || !char.baseStats) return char.maxMp || 0;
  const job = getJob(char.job);
  if(!job) return char.maxMp || 0;
  const stats = calcStats(char);
  if(job.mageSpell===0 && job.priestSpell===0) return 0;
  const spellLvl = Math.max(job.mageSpell, job.priestSpell);
  return Math.floor((stats.intel + stats.pie)/4 * char.level + spellLvl * char.level);
}

function calcATK(char) {
  if(char.isMonster || !char.baseStats) return char.atk || 0;
  const stats = calcStats(char);
  let atk = Math.floor(stats.str * 0.5) + char.level;
  for(const slot of DATA.equipSlots) {
    const iid = char.equip?.[slot];
    if(iid) { const item = getItem(iid); if(item) atk += (item.atk||0); }
  }
  return atk;
}

function calcDEF(char) {
  if(char.isMonster || !char.baseStats) return char.def || 0;
  const stats = calcStats(char);
  let def = Math.floor(stats.agi * 0.3) + Math.floor(char.level * 0.5);
  for(const slot of DATA.equipSlots) {
    const iid = char.equip?.[slot];
    if(iid) { const item = getItem(iid); if(item) def += (item.def||0); }
  }
  return def;
}

function calcEXPNeeded(level) { return Math.floor(level * level * 100 * (1 + level * 0.1)); }

function createChar(name, race, job, baseStats, gender='male') {
  return {
    id: Date.now() + Math.random(),
    name, race, job,
    gender, // 'male' | 'female'
    level: 1,
    exp: 0,
    hp: 0, maxHp: 0,
    mp: 0, maxMp: 0,
    baseStats,
    equip: { '右手':null,'左手':null,'頭':null,'体':null,'腕':null,'足':null,'指輪':null,'首':null },
    inventory: [],
    status: [],
    isAlive: true,
    isMonster: false,
    // For monsters
    monsterId: null,
    previousJobs: [],
    // Tracking for journal
    kills: 0, battles: 0
  };
}

function initCharHP(char) {
  char.maxHp = calcMaxHP(char);
  char.hp = char.maxHp;
  char.maxMp = calcMaxMP(char);
  char.mp = char.maxMp;
}

function getAvailableSpells(char, type='mage') {
  const job = getJob(char.job);
  const stats = calcStats(char);
  const spellList = type==='mage' ? DATA.mageSpells : DATA.priestSpells;
  const maxLvl = type==='mage' ? job.mageSpell : job.priestSpell;
  if(maxLvl===0) return [];
  return spellList.filter(s => s.level <= maxLvl && s.level <= Math.ceil(char.level/2));
}

// ==================== DUNGEON GENERATION ====================
