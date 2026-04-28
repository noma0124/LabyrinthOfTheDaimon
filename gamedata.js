/**
 * ============================================================
 *  gamedata.js — マスターデータ定義
 * ============================================================
 *
 * 【このファイルの役割】
 *   ゲームで使う「変わらないデータ」をすべて定義します。
 *   キャラクター作成・装備・戦闘・ショップなど全モジュールが参照します。
 *
 * 【依存関係】
 *   なし（他のファイルより先に読み込む必要があります）
 *
 * 【読み込み順】
 *   1番目に読み込む（index.html の <script src="gamedata.js"> が最初）
 *
 * 【公開するグローバル変数】
 *   const DATA = {
 *     races        : プレイヤー種族データ（ヒューマン・エルフ等）
 *     jobs         : 職業データ（戦士・魔法使い・僧侶等）
 *     mageSpells   : 魔法使い呪文リスト
 *     priestSpells : 僧侶呪文リスト
 *     equipSlots   : 装備スロット名リスト
 *     itemTypes    : アイテム種別リスト
 *     items        : アイテムデータ（武器・防具・消耗品等）
 *     monsters     : モンスターデータ（rank・race・joinRate 等を持つ）
 *     shopStock    : 初期ショップ在庫
 *     monsterRanks : モンスターランク定義（rank値 1〜99 → F〜SSS）
 *                    ※ UI表示用バッジ（cssClass）と exp 倍率（expMult）の参照テーブル
 *     monsterRaces : モンスター種族定義（英雄/奸雄/天使/女神 等）
 *   }
 *
 * 【公開するグローバル関数】
 *   getMonsterRank(rankValue) : monsters[].rank の値からランクオブジェクトを返す
 *   getMonsterRace(raceId)    : monsters[].race の id から種族オブジェクトを返す
 *
 * 【別チャットでこのファイルを扱う場合の注意】
 *   - items[].id は他ファイルの drops / spellId 等で参照されています
 *   - id を変更するときは system_dungeon.js / system_town.js も合わせて確認
 *   - classes: null は「全職業が使える」の意味
 *   - races: null は「全種族が使える」の意味（items の races フィールド）
 *   - items[].rarity : 装備品のレア度（1〜5）。1=コモン〜5=レジェンダリ。
 *                      消耗品（slot:null）は設定不要。鍛冶屋システムで参照。
 *   - monsters[].rank は 1〜99 の整数。floor は出現フロアのみ（ランクとは独立）
 *   - monsters[].race は monsterRaces[].id を参照する種族識別子
 *   - monsterRanks の min/max は rank 値（1〜99）を基準にする
 *   - モンスターランクの UI 表現は system_town_temple.js の rankBadgeHtml() が担当
 *   - system_dungeon.js では expMult を報酬倍率の計算に使用可
 *
 * ============================================================
 */

// ==================== DATA DEFINITIONS ====================
const DATA = {
  // ==================== PLAYER RACES ====================
  // プレイヤーキャラクターの種族定義。キャラクター作成時に選択する。
  //
  // 各フィールドの意味:
  //   id      : 種族の識別子（'human', 'elf' 等）。GS.party[].race で参照。
  //   name    : 表示名
  //   bonus   : 各能力値への補正値。str/agi/intel/pie/vit/luk が対象。
  //             マイナスも可。合計が0でなくてもよい。
  //   jobs    : この種族が選択できる職業IDの配列。
  //             ここに載っていない職業は転職時も選択不可。
  races: [
    { id:'human', name:'ヒューマン', bonus:{str:0,agi:0,intel:0,pie:0,vit:0,luk:0}, jobs:['fighter','lord','knight','mage','priest','bishop','ninja','thief'] },
    { id:'elf',   name:'エルフ',    bonus:{str:-2,agi:3,intel:3,pie:2,vit:-2,luk:1}, jobs:['fighter','mage','priest','bishop','thief'] },
    { id:'dwarf', name:'ドワーフ',  bonus:{str:4,agi:-2,intel:-1,pie:2,vit:4,luk:-1}, jobs:['fighter','priest','thief'] },
    { id:'gnome', name:'ノーム',    bonus:{str:-2,agi:0,intel:4,pie:3,vit:1,luk:0}, jobs:['mage','bishop','thief'] },
    { id:'hobbit',name:'ホビット',  bonus:{str:-2,agi:4,intel:1,pie:1,vit:0,luk:5}, jobs:['thief','priest','mage'] },
    { id:'fairy', name:'フェアリー',bonus:{str:-4,agi:5,intel:5,pie:5,vit:-4,luk:3}, jobs:['mage','priest','bishop'] },
    { id:'lizard',name:'リザードマン',bonus:{str:5,agi:-1,intel:-3,pie:-2,vit:5,luk:-2}, jobs:['fighter','knight','thief'] },
    { id:'drakon',name:'ドラコン',  bonus:{str:6,agi:-2,intel:-2,pie:-3,vit:6,luk:-3}, jobs:['fighter','knight'] }
  ],
  // ==================== JOBS ====================
  // 職業定義。キャラクター作成・転職で参照する。
  //
  // 各フィールドの意味:
  //   id          : 職業の識別子（'fighter', 'mage' 等）。GS.party[].job で参照。
  //   name        : 表示名
  //   type        : 'front'（前衛）or 'back'（後衛）。隊列の配置制限に使用。
  //   req         : 転職・作成に必要な最低能力値。例: {str:13} → STR が 13 以上必要。
  //   mageSpell   : 使用できる魔法使い系呪文の最大レベル（0=使用不可、7=全レベル使用可）
  //   priestSpell : 使用できる僧侶系呪文の最大レベル（0=使用不可、7=全レベル使用可）
  //   hpDice      : レベルアップ時の HP 増加ダイス面数。例: 10 → 1〜10 の乱数で増加。
  //   color       : UI 表示用のテーマカラー（CSS color 値）
  jobs: [
    { id:'fighter', name:'戦士',   type:'front', req:{str:11}, mageSpell:0, priestSpell:0, hpDice:10, color:'#e8a020' },
    { id:'knight',  name:'ナイト', type:'front', req:{str:13,pie:12}, mageSpell:0, priestSpell:4, hpDice:10, color:'#c0c0e0' },
    { id:'lord',    name:'ロード', type:'front', req:{str:15,pie:15,luk:15}, mageSpell:4, priestSpell:4, hpDice:10, color:'#ffd700' },
    { id:'mage',    name:'魔法使い',type:'back', req:{intel:11}, mageSpell:7, priestSpell:0, hpDice:4, color:'#4080ff' },
    { id:'priest',  name:'僧侶',   type:'back', req:{pie:11}, mageSpell:0, priestSpell:7, hpDice:6, color:'#40c840' },
    { id:'bishop',  name:'ビショップ',type:'back', req:{intel:12,pie:12}, mageSpell:5, priestSpell:5, hpDice:6, color:'#a040e8' },
    { id:'thief',   name:'盗賊',   type:'front', req:{agi:11}, mageSpell:0, priestSpell:0, hpDice:6, color:'#e88020' },
    { id:'ninja',   name:'忍者',   type:'front', req:{str:15,agi:15,pie:10,luk:15}, mageSpell:4, priestSpell:0, hpDice:8, color:'#202020' },
    { id:'samurai', name:'侍',     type:'front', req:{str:15,agi:14,intel:11,pie:10}, mageSpell:3, priestSpell:0, hpDice:8, color:'#c04040' },
    { id:'valkyrie',name:'ヴァルキリー',type:'front', req:{str:14,pie:14}, mageSpell:0, priestSpell:5, hpDice:8, color:'#40a0e0' }
  ],
  // ==================== MAGE SPELLS ====================
  // 魔法使い系呪文リスト。jobs[].mageSpell の値以下の level の呪文が使用可能。
  //
  // 各フィールドの意味:
  //   id      : 呪文の識別子。items[].spellId で scroll 系アイテムから参照される。
  //   name    : 表示名
  //   level   : 呪文レベル（1〜7）。jobs[].mageSpell がこの値以上の職業が使用可能。
  //   cost    : 消費MP
  //   type    : 効果種別。'damage'=ダメージ / 'buff'=強化 / 'debuff'=弱体 / 'heal'=回復
  //   power   : 効果量の基準値（ダメージ・回復の計算に使用）
  //   target  : 対象範囲。'one'=単体 / 'group'=グループ / 'all'=全体 / 'self'=自身
  //   desc    : UI 表示用の短い説明文
  mageSpells: [
    { id:'halito',   name:'ハリト',   level:1, cost:1, type:'damage', power:8,  target:'one',   desc:'炎の矢' },
    { id:'mogref',   name:'モグレフ', level:1, cost:1, type:'buff',   power:0,  target:'self',  desc:'AC-4' },
    { id:'bolatu',   name:'ボラトゥ', level:2, cost:2, type:'damage', power:15, target:'one',   desc:'中炎' },
    { id:'dilto',    name:'ディルト', level:2, cost:2, type:'debuff', power:0,  target:'group', desc:'敵AC+4' },
    { id:'mahalito', name:'マハリト', level:3, cost:3, type:'damage', power:30, target:'group', desc:'大炎' },
    { id:'lahalito', name:'ラハリト', level:4, cost:5, type:'damage', power:50, target:'group', desc:'超炎' },
    { id:'malikto',  name:'マリクト', level:5, cost:6, type:'damage', power:80, target:'all',   desc:'全体大炎' },
    { id:'tiltowait',name:'ティルタウェイト',level:7,cost:10,type:'damage',power:150,target:'all',desc:'最強炎' }
  ],
  // ==================== PRIEST SPELLS ====================
  // 僧侶系呪文リスト。jobs[].priestSpell の値以下の level の呪文が使用可能。
  // フィールドの意味は mageSpells と同じ。
  // type 追加値: 'detect'=探知 / 'status'=状態異常治療 / 'revive'=蘇生
  priestSpells: [
    { id:'dios',     name:'ディオス',  level:1, cost:1, type:'heal',   power:8,  target:'one',   desc:'回復小' },
    { id:'badios',   name:'バディオス', level:1, cost:1, type:'damage', power:8,  target:'one',   desc:'光ダメ' },
    { id:'milwa',    name:'ミルワ',    level:1, cost:1, type:'buff',   power:0,  target:'self',  desc:'光の加護' },
    { id:'calfo',    name:'カルフォ',  level:2, cost:2, type:'detect', power:0,  target:'self',  desc:'罠感知' },
    { id:'madi',     name:'マディ',    level:3, cost:3, type:'heal',   power:30, target:'one',   desc:'回復中' },
    { id:'lomilwa',  name:'ロミルワ', level:3, cost:3, type:'buff',   power:0,  target:'party', desc:'パーティ光' },
    { id:'bamadi',   name:'バマディ',  level:4, cost:5, type:'heal',   power:60, target:'one',   desc:'回復大' },
    { id:'malikto',  name:'カドルト',  level:4, cost:6, type:'status', power:0,  target:'one',   desc:'毒消し' },
    { id:'mahaman',  name:'マハマン',  level:5, cost:7, type:'revive', power:0,  target:'one',   desc:'蘇生' },
    { id:'mabadi',   name:'マバディ',  level:6, cost:8, type:'damage', power:100,target:'all',   desc:'全体光ダメ' }
  ],
  equipSlots: ['右手','左手','頭','体','腕','足','指輪','首'],
  itemTypes: ['sword','axe','spear','mace','staff','bow','dagger','shield','helmet','armor','gauntlet','boots','ring','amulet','scroll','potion','misc'],

  // ==================== ITEMS ====================
  // アイテムデータベース。武器・防具・消耗品をすべてここで定義する。
  //
  // 全アイテム共通フィールド:
  //   id        : アイテムの識別子。drops / shopStock / spellId 等で参照される。
  //               ★ 変更時は全モジュールに通知すること
  //   name      : 表示名
  //   type      : アイテム種別（itemTypes 参照）。装備可否の判定に使用。
  //   slot      : 装備スロット名（equipSlots 参照）。null = 装備不可（消耗品等）。
  //   price     : ショップ購入価格（ゴールド）
  //   sell      : 売却価格（ゴールド）
  //   atk       : 攻撃力ボーナス（武器は正の値、防具は 0）
  //   def       : 防御力ボーナス（防具は正の値、武器は 0）
  //   minFloor  : ショップに入荷する最低フロア（0=最初から購入可）
  //   desc      : UI 表示用の短い説明文
  //   classes   : 装備できる職業IDの配列。null = 全職業が装備可能。
  //   rarity    : アイテムレア度（1〜5 の整数）。鍛冶屋の分解・強化で参照。
  //               1=コモン / 2=アンコモン / 3=レア / 4=エピック / 5=レジェンダリ
  //               装備品（slot あり）のみ設定。消耗品は設定不要（鍛冶屋対象外）。
  //               分解時は 輝度1〜rarity のマナ石をランダム取得。
  //
  // 種別ごとの追加フィールド:
  //   mp        : MP ボーナス（ring/amulet 等の魔法系アクセサリ）
  //   heal      : 使用時の HP 回復量（potion 系）
  //   mpHeal    : 使用時の MP 回復量（potion 系）
  //   cure      : 使用時に治療する状態異常ID（例: 'poison'）
  //   spellId   : 使用時に発動する呪文ID（scroll 系。mageSpells[].id を参照）
  //   escape    : true の場合、使用するとダンジョンから脱出できる（misc 系）
  items: [

// ---------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------
//   rarity 割り当て基準（武器）:
//     1 コモン      : atk  2〜 4 / price    30〜  60 / 序盤の消耗品
//     2 アンコモン : atk  8〜12 / price   200〜 500 / 一般的な冒険者
//     3 レア       : atk 14〜15 / price   300〜 400 / 中盤の強力な武器
//     4 エピック   : atk 18〜22 / price  1500〜2000 / 上位職専用
//     5 レジェンダリ: atk 28+    / price  5000+      / 特殊効果付き
// ---------------------------------------------------------------

// [剣系]
// --- Common (Rarity 1) ---
    { id:'wooden_sword', name:'木刀', type:'sword', slot:'右手', price:30, sell:15, atk:2, def:1, minFloor:0, rarity:1, desc:'訓練用の木の剣', classes:['fighter','thief','knight','lord','samurai'] },
    { id:'bronze_sword', name:'青銅の剣', type:'sword', slot:'右手', price:45, sell:22, atk:3, def:0, minFloor:0, rarity:1, desc:'柔らかい金属で作られた古い剣', classes:['fighter','thief','knight','lord'] },
    { id:'gladius_old', name:'古びたグラディウス', type:'sword', slot:'右手', price:55, sell:27, atk:4, def:1, minFloor:1, rarity:1, desc:'使い古された歩兵の短剣', classes:['fighter','knight','lord'] },
    { id:'iron_sword', name:'鉄の剣', type:'sword', slot:'右手', price:60, sell:30, atk:4, def:0, minFloor:1, rarity:1, desc:'ありふれた鉄の剣', classes:['fighter','thief','knight','lord','samurai','valkyrie'] },
    { id:'scimitar_rusty', name:'錆びたシミター', type:'sword', slot:'右手', price:35, sell:17, atk:3, def:0, minFloor:1, rarity:1, desc:'砂漠で見つかった錆びた湾刀', classes:['fighter','thief','samurai'] },
    { id:'spatha_worn', name:'摩耗したスパス', type:'sword', slot:'右手', price:50, sell:25, atk:4, def:0, minFloor:1, rarity:1, desc:'騎兵が使っていた古びた直剣', classes:['fighter','knight','lord'] },
    { id:'wakizashi_common', name:'脇差', type:'sword', slot:'右手', price:60, sell:30, atk:4, def:1, minFloor:1, rarity:1, desc:'護身用の短い刀', classes:['ninja','samurai','thief'] },
    { id:'heavy_iron_sword', name:'重い鉄の剣', type:'sword', slot:'右手', price:58, sell:29, atk:4, def:0, minFloor:2, rarity:1, desc:'重いが威力のある鉄の剣', classes:['fighter','knight','lord'] },
    { id:'cutlass_worn', name:'古びたカトラス', type:'sword', slot:'右手', price:45, sell:22, atk:4, def:0, minFloor:1, rarity:1, desc:'海賊が使っていたような片刃刀', classes:['thief','fighter'] },
    { id:'sharp_bronze_sword', name:'鋭い青銅の剣', type:'sword', slot:'右手', price:60, sell:30, atk:4, def:0, minFloor:2, rarity:1, desc:'青銅製だがよく研がれている', classes:['fighter','thief','knight'] },

    // --- Uncommon (Rarity 2) ---
    { id:'gladius', name:'グラディウス', type:'sword', slot:'右手', price:250, sell:125, atk:8, def:2, minFloor:3, rarity:2, desc:'ローマ兵愛用の刺突に適した短剣', classes:['fighter','knight','lord'] },
    { id:'scimitar', name:'シミター', type:'sword', slot:'右手', price:300, sell:150, atk:9, def:0, minFloor:3, rarity:2, desc:'三日月状の湾曲した刀', classes:['fighter','thief','samurai'] },
    { id:'rapier', name:'レイピア', type:'sword', slot:'右手', price:350, sell:175, atk:8, def:1, minFloor:4, rarity:2, desc:'護身用の細身の剣', classes:['thief','knight','lord','valkyrie'] },
    { id:'spatha', name:'スパス', type:'sword', slot:'右手', price:280, sell:140, atk:9, def:0, minFloor:3, rarity:2, desc:'ローマ後期の長剣', classes:['knight','lord','fighter'] },
    { id:'cutlass', name:'カトラス', type:'sword', slot:'右手', price:320, sell:160, atk:9, def:1, minFloor:4, rarity:2, desc:'船上での戦闘に適した頑丈な刀', classes:['thief','fighter'] },
    { id:'kopis', name:'コピス', type:'sword', slot:'右手', price:340, sell:170, atk:10, def:0, minFloor:4, rarity:2, desc:'内側に湾曲した古代ギリシャの剣', classes:['fighter','knight','lord'] },
    { id:'khopesh', name:'コペシュ', type:'sword', slot:'右手', price:400, sell:200, atk:11, def:0, minFloor:5, rarity:2, desc:'古代エジプトの鎌状の剣', classes:['fighter','lord'] },
    { id:'claymore_old', name:'使い古されたクレイモア', type:'sword', slot:'右手', price:450, sell:225, atk:12, def:0, minFloor:6, rarity:2, desc:'大型の両手持ち剣', classes:['fighter','lord'] },
    { id:'estoc_worn', name:'古びたエストック', type:'sword', slot:'右手', price:380, sell:190, atk:9, def:2, minFloor:5, rarity:2, desc:'鎧の隙間を突くための剣', classes:['knight','lord'] },
    { id:'shamsir', name:'シャムシール', type:'sword', slot:'右手', price:420, sell:210, atk:10, def:0, minFloor:5, rarity:2, desc:'ペルシャの優美な湾曲刀', classes:['fighter','thief','samurai'] },
    { id:'tulwar', name:'タルワール', type:'sword', slot:'右手', price:410, sell:205, atk:11, def:0, minFloor:5, rarity:2, desc:'北インドで使われた湾曲刀', classes:['fighter','samurai'] },
    { id:'kilij', name:'キリジ', type:'sword', slot:'右手', price:480, sell:240, atk:12, def:0, minFloor:6, rarity:2, desc:'トルコの強力な湾刀', classes:['fighter','knight'] },
    { id:'dao', name:'刀', type:'sword', slot:'右手', price:350, sell:175, atk:10, def:0, minFloor:4, rarity:2, desc:'中国の代表的な片刃刀', classes:['fighter','samurai','ninja'] },
    { id:'jian', name:'剣', type:'sword', slot:'右手', price:360, sell:180, atk:9, def:2, minFloor:4, rarity:2, desc:'中国の直身の両刃剣', classes:['fighter','lord','samurai'] },
    { id:'kodachi', name:'小太刀', type:'sword', slot:'右手', price:400, sell:200, atk:9, def:2, minFloor:5, rarity:2, desc:'取り回しの良い日本刀', classes:['ninja','samurai','thief'] },
    { id:'steel_sword', name:'鋼鉄の剣', type:'sword', slot:'右手', price:500, sell:250, atk:12, def:0, minFloor:6, rarity:2, desc:'良質な鋼で鍛えられた剣', classes:['fighter','knight','lord','samurai'] },
    { id:'zweihander_worn', name:'古びたツヴァイハンダー', type:'sword', slot:'右手', price:490, sell:245, atk:12, def:0, minFloor:7, rarity:2, desc:'非常に巨大な両手剣の古物', classes:['fighter'] },
    { id:'flamberge_rusty', name:'錆びたフランベルジュ', type:'sword', slot:'右手', price:420, sell:210, atk:11, def:0, minFloor:6, rarity:2, desc:'波打つ刃を持つが手入れが悪い', classes:['fighter','knight'] },
    { id:'viking_sword', name:'ヴァイキングソード', type:'sword', slot:'右手', price:450, sell:225, atk:11, def:1, minFloor:5, rarity:2, desc:'北方の戦士が用いた頑丈な剣', classes:['fighter','knight','lord'] },
    { id:'cinquedea', name:'チンクエディア', type:'sword', slot:'右手', price:480, sell:240, atk:10, def:2, minFloor:5, rarity:2, desc:'「5本の指」の幅を持つ幅広の短剣', classes:['thief','lord'] },

    // --- Rare (Rarity 3) ---
    { id:'silver_sword', name:'銀の剣', type:'sword', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:7, rarity:3, desc:'不死者に有効な銀製の剣', classes:['fighter','knight','lord','valkyrie'] },
    { id:'sharp_katana', name:'業物', type:'sword', slot:'右手', price:380, sell:190, atk:15, def:0, minFloor:8, rarity:3, desc:'一段上の切れ味を持つ日本刀', classes:['samurai','ninja'] },
    { id:'flame_rapier', name:'フレイムレイピア', type:'sword', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:8, rarity:3, magic:'fire', desc:'炎を纏う細身の剣', classes:['thief','knight','valkyrie'] },
    { id:'ice_sabre', name:'アイスサーベル', type:'sword', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:8, rarity:3, magic:'ice', desc:'冷気を放つ騎兵刀', classes:['fighter','knight','lord'] },
    { id:'lightning_sword', name:'ライトニングソード', type:'sword', slot:'右手', price:400, sell:200, atk:15, def:0, minFloor:9, rarity:3, magic:'thunder', desc:'稲妻を宿した剣', classes:['fighter','knight','samurai'] },
    { id:'executioner_sword', name:'処刑人の剣', type:'sword', slot:'右手', price:390, sell:195, atk:15, def:0, minFloor:9, rarity:3, desc:'首を撥ねるために剣先を切り落とした重剣', classes:['fighter'] },
    { id:'claymore', name:'クレイモア', type:'sword', slot:'右手', price:380, sell:190, atk:14, def:0, minFloor:8, rarity:3, desc:'ハイランダーが愛用した両手剣', classes:['fighter','lord'] },
    { id:'estoc', name:'エストック', type:'sword', slot:'右手', price:360, sell:180, atk:14, def:2, minFloor:7, rarity:3, desc:'鎧を貫くことに特化した刺突剣', classes:['knight','lord'] },
    { id:'schiavona', name:'スキアヴォーナ', type:'sword', slot:'右手', price:350, sell:175, atk:14, def:3, minFloor:8, rarity:3, desc:'籠状の柄を持つ、防御に優れた剣', classes:['knight','lord'] },
    { id:'brionac_sword', name:'ブリオナック（片手）', type:'sword', slot:'右手', price:400, sell:200, atk:15, def:0, minFloor:9, rarity:3, desc:'魔力を持つ直剣', classes:['valkyrie','knight','lord'] },
    { id:'serpentine_sword', name:'蛇行剣', type:'sword', slot:'右手', price:370, sell:185, atk:14, def:0, minFloor:8, rarity:3, desc:'蛇のように波打った形状の剣', classes:['samurai','ninja'] },
    { id:'black_blade', name:'ブラックブレード', type:'sword', slot:'右手', price:380, sell:190, atk:15, def:0, minFloor:9, rarity:3, desc:'漆黒に染められた剣', classes:['ninja','fighter','thief'] },
    { id:'holy_sabre', name:'ホーリーサーベル', type:'sword', slot:'右手', price:400, sell:200, atk:14, def:2, minFloor:9, rarity:3, magic:'holy', desc:'祝福を受けた騎士の剣', classes:['knight','lord','valkyrie'] },
    { id:'obsidian_sword', name:'黒曜石の剣', type:'sword', slot:'右手', price:340, sell:170, atk:15, def:0, minFloor:7, rarity:3, desc:'ガラス質の刃を持つ脆いが鋭い剣', classes:['fighter','thief'] },
    { id:'wind_cutter', name:'風切丸', type:'sword', slot:'右手', price:390, sell:195, atk:14, def:0, minFloor:8, rarity:3, magic:'wind', desc:'振るたびに風を巻き起こす刀', classes:['samurai','ninja'] },
    { id:'misericorde', name:'ミゼリコルデ', type:'sword', slot:'右手', price:320, sell:160, atk:14, def:0, minFloor:7, rarity:3, desc:'「慈悲の一撃」を与えるための細剣', classes:['thief','knight'] },
    { id:'sword_breaker', name:'ソードブレイカー', type:'sword', slot:'右手', price:350, sell:175, atk:11, def:4, minFloor:8, rarity:3, desc:'相手の剣を折るための溝がある短剣', classes:['thief','ninja'] },
    { id:'side_sword', name:'サイドソード', type:'sword', slot:'右手', price:360, sell:180, atk:14, def:1, minFloor:7, rarity:3, desc:'中世後期の多目的な直剣', classes:['knight','lord','fighter'] },
    { id:'katzbalger', name:'カッツバルゲル', type:'sword', slot:'右手', price:380, sell:190, atk:15, def:1, minFloor:8, rarity:3, desc:'混戦に適したS字柄の短めの剣', classes:['fighter','knight'] },
    { id:'falcata', name:'ファルカタ', type:'sword', slot:'右手', price:370, sell:185, atk:15, def:0, minFloor:8, rarity:3, desc:'強力な斬撃を生み出すイベリア半島の剣', classes:['fighter','knight'] },

    // --- Epic (Rarity 4) ---
    { id:'flamberge', name:'フランベルジュ', type:'sword', slot:'右手', price:1850, sell:925, atk:20, def:0, minFloor:12, rarity:4, desc:'炎のような揺らぎを持つ波刃の剣', classes:['fighter','knight','lord'] },
    { id:'zweihander', name:'ツヴァイハンダー', type:'sword', slot:'右手', price:1950, sell:975, atk:22, def:0, minFloor:13, rarity:4, desc:'両手持ち専用の巨大な剣', classes:['fighter'] },
    { id:'muramasa_copy', name:'村正（写し）', type:'sword', slot:'右手', price:2000, sell:1000, atk:21, def:0, minFloor:14, rarity:4, desc:'妖気を放つ鋭い日本刀', classes:['samurai','ninja'] },
    { id:'vorpal_sword', name:'ヴォーパルソード', type:'sword', slot:'右手', price:1700, sell:850, atk:20, def:0, minFloor:12, rarity:4, desc:'恐ろしい切れ味を持つ伝説の武器', classes:['fighter','knight','samurai'] },
    { id:'laevateinn_shard', name:'レーヴァテインの破片', type:'sword', slot:'右手', price:1800, sell:900, atk:19, def:0, minFloor:12, rarity:4, magic:'fire', desc:'魔剣の欠片から作られた熱い剣', classes:['fighter','lord'] },
    { id:'caliburn_fake', name:'カリバーン（模造品）', type:'sword', slot:'右手', price:1900, sell:950, atk:18, def:4, minFloor:13, rarity:4, desc:'王者の風格を模した美しい黄金剣', classes:['knight','lord'] },
    { id:'dragon_slayer', name:'ドラゴンスレイヤー', type:'sword', slot:'右手', price:2000, sell:1000, atk:22, def:2, minFloor:15, rarity:4, desc:'竜の鱗をも切り裂く重剣', classes:['fighter','lord'] },
    { id:'blood_sword', name:'ブラッドソード', type:'sword', slot:'右手', price:1600, sell:800, atk:18, def:0, minFloor:12, rarity:4, magic:'drain', desc:'敵の生命力を吸い取る魔剣', classes:['knight','samurai','ninja'] },
    { id:'rune_blade', name:'ルーンブレイド', type:'sword', slot:'右手', price:1750, sell:875, atk:19, def:3, minFloor:13, rarity:4, magic:'mp_regen', desc:'魔力が込められた文字が刻まれた剣', classes:['lord','valkyrie'] },
    { id:'shadow_edge', name:'シャドウエッジ', type:'sword', slot:'右手', price:1650, sell:825, atk:20, def:0, minFloor:12, rarity:4, magic:'dark', desc:'影のように実体の薄い黒剣', classes:['ninja','thief'] },
    { id:'crusader_sword', name:'十字軍の剣', type:'sword', slot:'右手', price:1700, sell:850, atk:19, def:3, minFloor:12, rarity:4, magic:'holy', desc:'聖地奪還を誓った騎士の聖剣', classes:['knight','lord'] },
    { id:'kusanagi_copy', name:'草薙剣（写し）', type:'sword', slot:'右手', price:1950, sell:975, atk:21, def:0, minFloor:14, rarity:4, magic:'wind', desc:'三種の神器の一つを模した神剣', classes:['samurai'] },
    { id:'durandal_shard', name:'デュランダルの残滓', type:'sword', slot:'右手', price:1800, sell:900, atk:20, def:2, minFloor:13, rarity:4, desc:'不滅の刃の力を受け継いだ剣', classes:['knight','lord'] },
    { id:'elemental_sabre', name:'エレメンタルサーベル', type:'sword', slot:'右手', price:1700, sell:850, atk:18, def:0, minFloor:11, rarity:4, magic:'multi', desc:'四大元素の力をランダムに発揮する', classes:['knight','lord','samurai'] },
    { id:'sword_of_parrying', name:'受け流しの剣', type:'sword', slot:'右手', price:1550, sell:775, atk:15, def:8, minFloor:10, rarity:4, desc:'攻撃よりも防御に特化した剣', classes:['knight','lord','thief'] },
    { id:'meteor_sword', name:'隕鉄の剣', type:'sword', slot:'右手', price:1900, sell:950, atk:22, def:0, minFloor:14, rarity:4, desc:'空から降った鉄から鍛えられた剣', classes:['fighter','samurai'] },
    { id:'obsidian_greatsword', name:'黒曜石の大剣', type:'sword', slot:'右手', price:1700, sell:850, atk:21, def:0, minFloor:13, rarity:4, desc:'巨大な黒曜石の刃を持つ斧剣', classes:['fighter'] },
    { id:'kalis', name:'カリス', type:'sword', slot:'右手', price:1600, sell:800, atk:19, def:2, minFloor:12, rarity:4, desc:'東南アジアの波打つ両刃剣', classes:['thief','ninja','fighter'] },
    { id:'monomato_sword', name:'一文字', type:'sword', slot:'右手', price:1850, sell:925, atk:21, def:1, minFloor:13, rarity:4, desc:'刀身に横一文字が刻まれた名刀', classes:['samurai'] },
    { id:'ice_brand', name:'アイスブランド', type:'sword', slot:'右手', price:1800, sell:900, atk:20, def:0, minFloor:13, rarity:4, magic:'ice', desc:'冷気を纏う伝説的な名剣', classes:['knight','lord','fighter'] },

    // --- Legendary (Rarity 5) ---
    { id:'excalibur', name:'エクスカリバー', type:'sword', slot:'右手', price:9999, sell:5000, atk:38, def:10, minFloor:25, rarity:5, magic:'holy', desc:'約束された勝利の聖剣', classes:['lord','knight'] },
    { id:'durandal', name:'デュランダル', type:'sword', slot:'右手', price:8500, sell:4250, atk:34, def:5, minFloor:22, rarity:5, desc:'不滅の輝きを持つ、決して折れぬ剣', classes:['knight','lord'] },
    { id:'claiomh_solais', name:'クラウ・ソラス', type:'sword', slot:'右手', price:8800, sell:4400, atk:35, def:3, minFloor:23, rarity:5, magic:'light', desc:'光り輝く剣、あるいは光の剣', classes:['lord','valkyrie'] },
    { id:'gram', name:'グラム', type:'sword', slot:'右手', price:9200, sell:4600, atk:37, def:0, minFloor:24, rarity:5, desc:'シグルズが竜を屠った伝説の魔剣', classes:['fighter','lord'] },
    { id:'balmung', name:'バルムンク', type:'sword', slot:'右手', price:8600, sell:4300, atk:33, def:4, minFloor:22, rarity:5, desc:'ニーベルングの指輪に登場する名剣', classes:['fighter','lord'] },
    { id:'tyrfing', name:'ティルフィング', type:'sword', slot:'右手', price:9500, sell:4750, atk:40, def:-10, minFloor:25, rarity:5, magic:'curse', desc:'抜けば必ず人を殺める、呪われた神剣', classes:['fighter','ninja'] },
    { id:'dainsleif', name:'ダインスレイヴ', type:'sword', slot:'右手', price:9000, sell:4500, atk:36, def:0, minFloor:24, rarity:5, magic:'drain', desc:'鞘から抜くと生き血を吸うまで収まらぬ魔剣', classes:['fighter','lord'] },
    { id:'kusanagi', name:'草薙剣', type:'sword', slot:'右手', price:9800, sell:4900, atk:37, def:5, minFloor:25, rarity:5, magic:'wind', desc:'ヤマタノオロチの尾から出た神剣', classes:['samurai'] },
    { id:'ame_no_murakumo', name:'天叢雲剣', type:'sword', slot:'右手', price:9800, sell:4900, atk:37, def:5, minFloor:25, rarity:5, magic:'thunder', desc:'雲を呼び嵐を司る神の剣', classes:['samurai'] },
    { id:'jovieuse', name:'ジョワユーズ', type:'sword', slot:'右手', price:8200, sell:4100, atk:32, def:6, minFloor:21, rarity:5, magic:'multi', desc:'シャルルマーニュ伝説の陽気な剣', classes:['knight','lord'] },
    { id:'caliburn', name:'カリバーン', type:'sword', slot:'右手', price:8500, sell:4250, atk:31, def:8, minFloor:20, rarity:5, magic:'holy', desc:'アーサー王が石から引き抜いた選定の剣', classes:['lord','knight'] },
    { id:'laevateinn', name:'レーヴァテイン', type:'sword', slot:'右手', price:9600, sell:4800, atk:39, def:0, minFloor:25, rarity:5, magic:'fire', desc:'世界を焼き尽くす終末の魔剣', classes:['fighter','lord'] },
    { id:'fragarach', name:'フラガラッハ', type:'sword', slot:'右手', price:8700, sell:4350, atk:34, def:2, minFloor:23, rarity:5, desc:'「回答するもの」と呼ばれる必中の剣', classes:['thief','knight','lord'] },
    { id:'hrunting', name:'フルンティング', type:'sword', slot:'右手', price:7500, sell:3750, atk:30, def:0, minFloor:20, rarity:5, magic:'poison', desc:'ベオウルフが怪物退治に用いた魔剣', classes:['fighter','lord'] },
    { id:'naegling', name:'ネァイリング', type:'sword', slot:'右手', price:7800, sell:3900, atk:32, def:0, minFloor:21, rarity:5, desc:'ベオウルフが竜との戦いで用いた古剣', classes:['fighter','lord'] },
    { id:'colada', name:'コラーダ', type:'sword', slot:'右手', price:7600, sell:3800, atk:31, def:4, minFloor:20, rarity:5, desc:'エル・シドが帯びた二振りの名剣の一つ', classes:['knight','lord'] },
    { id:'tizona', name:'ティゾーナ', type:'sword', slot:'右手', price:7700, sell:3850, atk:33, def:2, minFloor:21, rarity:5, desc:'エル・シドの剣、恐怖を呼び起こす', classes:['knight','lord'] },
    { id:'harpe', name:'ハルペー', type:'sword', slot:'右手', price:8000, sell:4000, atk:34, def:0, minFloor:22, rarity:5, desc:'メドゥーサの首を撥ねた鎌状の神剣', classes:['thief','valkyrie'] },
    { id:'muramasa', name:'千子村正', type:'sword', slot:'右手', price:9400, sell:4700, atk:38, def:0, minFloor:25, rarity:5, magic:'death', desc:'徳川家に仇なすという妖刀の真打', classes:['samurai','ninja'] },
    { id:'dojigiri', name:'童子切安綱', type:'sword', slot:'右手', price:9200, sell:4600, atk:36, def:2, minFloor:24, rarity:5, desc:'酒呑童子を切り伏せた天下五剣の筆頭', classes:['samurai'] },
    { id:'mikazuki', name:'三日月宗近', type:'sword', slot:'右手', price:9000, sell:4500, atk:34, def:5, minFloor:23, rarity:5, desc:'打ち除けが三日月に見える最も美しい刀', classes:['samurai'] },
    { id:'onimaru', name:'鬼丸国綱', type:'sword', slot:'右手', price:9100, sell:4550, atk:35, def:3, minFloor:24, rarity:5, desc:'鬼を斬ったという伝説を持つ天下五剣', classes:['samurai'] },
    { id:' juzumaru', name:'数珠丸恒次', type:'sword', slot:'右手', price:8800, sell:4400, atk:32, def:8, minFloor:22, rarity:5, desc:'柄に数珠を巻いた天下五剣の一つ', classes:['samurai'] },
    { id:'odenta', name:'大典太光世', type:'sword', slot:'右手', price:9150, sell:4575, atk:36, def:1, minFloor:24, rarity:5, desc:'病を治すという霊力を持つ天下五剣', classes:['samurai'] },
    { id:'zantetsuken', name:'斬鉄剣', type:'sword', slot:'右手', price:8500, sell:4250, atk:35, def:0, minFloor:21, rarity:5, desc:'鉄をも容易に切り裂く無双の剣', classes:['samurai','ninja'] },
    { id:'ragnarok', name:'ラグナロク', type:'sword', slot:'右手', price:9999, sell:5000, atk:42, def:0, minFloor:30, rarity:5, magic:'dark', desc:'終末の刻を告げる巨大な魔剣', classes:['fighter','lord'] },
    { id:'soul_eater', name:'ソウルイーター', type:'sword', slot:'右手', price:8000, sell:4000, atk:33, def:-5, minFloor:20, rarity:5, magic:'drain', desc:'持ち主の魂を削り力を得る呪いの剣', classes:['ninja','samurai','fighter'] },
    { id:'galatine', name:'ガラティーン', type:'sword', slot:'右手', price:8400, sell:4200, atk:32, def:4, minFloor:21, rarity:5, magic:'light', desc:'ガウェイン卿が持つ、太陽の輝きを宿す剣', classes:['knight','lord'] },
    { id:'maltet', name:'マルテ', type:'sword', slot:'右手', price:7900, sell:3950, atk:31, def:0, minFloor:20, rarity:5, desc:'中世の武勲詩に登場する名剣', classes:['knight','lord'] },
    { id:'ascalon', name:'アスカロン', type:'sword', slot:'右手', price:8300, sell:4150, atk:33, def:3, minFloor:22, rarity:5, magic:'holy', desc:'聖ゲオルギウスが竜を退治した聖剣', classes:['knight','lord'] },
    { id:'seven_branched_sword', name:'七支刀', type:'sword', slot:'右手', price:8900, sell:4450, atk:30, def:10, minFloor:23, rarity:5, magic:'holy', desc:'枝分かれした七つの刃を持つ儀式用の神剣', classes:['lord','samurai'] },
    { id:'monohoshizao', name:'物干し竿', type:'sword', slot:'右手', price:6500, sell:3250, atk:28, def:-2, minFloor:18, rarity:5, desc:'並外れた長さを誇る長刀', classes:['samurai'] },
    { id:'estoc_ultimate', name:'神貫のエストック', type:'sword', slot:'右手', price:7000, sell:3500, atk:29, def:5, minFloor:19, rarity:5, desc:'あらゆる鎧を無効化する極限の刺突剣', classes:['knight','lord'] },
    { id:'phantom_sword', name:'幻影の剣', type:'sword', slot:'右手', price:7200, sell:3600, atk:30, def:15, minFloor:20, rarity:5, desc:'実体がなく、防御を貫通し回避を上げる剣', classes:['thief','ninja'] },
    { id:'ouroboros_blade', name:'無限の剣', type:'sword', slot:'右手', price:9999, sell:5000, atk:45, def:10, minFloor:50, rarity:5, magic:'multi', desc:'始まりも終わりもない究極の剣', classes:['lord'] },

// [短剣・投擲系]
// --- Common (Rarity 1) ---
    { id:'small_knife', name:'スモールナイフ', type:'dagger', slot:'右手', price:35, sell:17, atk:2, def:0, minFloor:0, rarity:1, desc:'果物ナイフ程度の小刀', classes:['fighter','thief','ninja','mage','priest','bishop'] },
    { id:'rusty_shiv', name:'錆びたシヴ', type:'dagger', slot:'右手', price:25, sell:12, atk:2, def:0, minFloor:0, rarity:1, desc:'粗末な手製の刺突武器', classes:['thief','ninja'] },
    { id:'flint_knife', name:'石鏃のナイフ', type:'dagger', slot:'右手', price:40, sell:20, atk:3, def:0, minFloor:0, rarity:1, desc:'打ち欠いた石で作られた刃物', classes:['thief','ninja','mage'] },
    { id:'bronze_dagger', name:'ブロンズダガー', type:'dagger', slot:'右手', price:50, sell:25, atk:3, def:0, minFloor:1, rarity:1, desc:'青銅で鋳造された短剣', classes:['fighter','thief','ninja','mage','priest','bishop'] },
    { id:'dirk_common', name:'使い古されたディルク', type:'dagger', slot:'右手', price:60, sell:30, atk:4, def:0, minFloor:1, rarity:1, desc:'スコットランドの古い短剣', classes:['thief','fighter','ninja'] },
    { id:'wooden_dagger', name:'訓練用短剣', type:'dagger', slot:'右手', price:30, sell:15, atk:2, def:1, minFloor:0, rarity:1, desc:'木製の練習用ダガー', classes:['fighter','thief','ninja','mage','priest','bishop'] },
    { id:'bone_dagger', name:'骨の短剣', type:'dagger', slot:'右手', price:55, sell:27, atk:4, def:0, minFloor:1, rarity:1, desc:'動物の骨を削り出した刃', classes:['thief','ninja','mage'] },
    { id:'tantou', name:'短刀', type:'dagger', slot:'右手', price:70, sell:35, atk:4, def:0, minFloor:1, rarity:1, desc:'日本の伝統的な護身用短刀', classes:['ninja','samurai','thief'] },

    // --- Uncommon (Rarity 2) ---
    { id:'main_gauche', name:'マンゴーシュ', type:'dagger', slot:'右手', price:350, sell:175, atk:8, def:3, minFloor:3, rarity:2, desc:'「左手」を意味する防御短剣', classes:['thief','ninja','fighter'] },
    { id:'kukri', name:'ククリ', type:'dagger', slot:'右手', price:300, sell:150, atk:10, def:0, minFloor:3, rarity:2, desc:'内側に湾曲したグルカのナイフ', classes:['thief','ninja','fighter'] },
    { id:'roundel_dagger', name:'ロンデルダガー', type:'dagger', slot:'右手', price:280, sell:140, atk:9, def:1, minFloor:3, rarity:2, desc:'円盤状の柄頭を持つ騎士の短剣', classes:['fighter','knight','lord'] },
    { id:'kris', name:'クリス', type:'dagger', slot:'右手', price:320, sell:160, atk:10, def:0, minFloor:4, rarity:2, desc:'波打つ刃を持つ東南アジアの短剣', classes:['thief','ninja','mage'] },
    { id:'jambiya', name:'ジャンビーヤ', type:'dagger', slot:'右手', price:290, sell:145, atk:9, def:0, minFloor:4, rarity:2, desc:'中東の三日月型短剣', classes:['thief','ninja','priest'] },
    { id:'saia', name:'サイ', type:'dagger', slot:'右手', price:310, sell:155, atk:8, def:2, minFloor:4, rarity:2, desc:'攻撃を受け止める三叉の十手状武器', classes:['ninja','thief'] },
    { id:'poignard', name:'ポニャール', type:'dagger', slot:'右手', price:340, sell:170, atk:9, def:1, minFloor:4, rarity:2, desc:'軽装向けの尖った短剣', classes:['thief','mage','bishop'] },
    { id:'scramasax', name:'スクラマサクス', type:'dagger', slot:'右手', price:380, sell:190, atk:11, def:0, minFloor:5, rarity:2, desc:'ゲルマン人が用いた片刃の重短剣', classes:['fighter','thief'] },
    { id:'ear_dagger', name:'イヤーダガー', type:'dagger', slot:'右手', price:360, sell:180, atk:10, def:0, minFloor:5, rarity:2, desc:'柄頭が耳のような形のルネサンス短剣', classes:['thief','ninja'] },
    { id:'poison_knife', name:'毒塗りのナイフ', type:'dagger', slot:'右手', price:450, sell:225, atk:8, def:0, minFloor:4, rarity:2, magic:'poison', desc:'刃に毒が塗り込まれている', classes:['thief','ninja'] },

    // --- Rare (Rarity 3) ---
    { id:'assassin_dagger', name:'アサシンダガー', type:'dagger', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:6, rarity:3, desc:'暗殺に特化した隠し持ちやすい刃', classes:['thief','ninja'] },
    { id:'gladius_dagger', name:'グラディウス・ミニ', type:'dagger', slot:'右手', price:380, sell:190, atk:14, def:1, minFloor:6, rarity:3, desc:'軍用の剣を短剣サイズに縮小したもの', classes:['fighter','knight','lord'] },
    { id:'silver_stiletto', name:'銀のスティレット', type:'dagger', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:7, rarity:3, desc:'不死者を貫くための純銀製短針', classes:['thief','ninja','bishop'] },
    { id:'sacrificial_dagger', name:'供物の短剣', type:'dagger', slot:'右手', price:350, sell:175, atk:14, def:0, minFloor:7, rarity:3, magic:'drain', desc:'儀式で血を捧げるために使われた短剣', classes:['mage','priest','bishop'] },
    { id:'baselard', name:'バゼラード', type:'dagger', slot:'右手', price:370, sell:185, atk:15, def:0, minFloor:7, rarity:3, desc:'H型の柄を持つ中世の重短剣', classes:['fighter','thief','knight'] },
    { id:'misericorde_rare', name:'慈悲の短剣', type:'dagger', slot:'右手', price:390, sell:195, atk:15, def:0, minFloor:8, rarity:3, desc:'とどめを刺すための極細の刃', classes:['knight','lord','thief'] },
    { id:'butterfly_knife', name:'バタフライナイフ', type:'dagger', slot:'右手', price:320, sell:160, atk:14, def:0, minFloor:6, rarity:3, desc:'巧みな操作で敵を翻弄する折り畳み刃', classes:['thief','ninja'] },
    { id:'hidden_blade', name:'仕込み刃', type:'dagger', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:8, rarity:3, desc:'防具や袖に隠された暗殺用の刃', classes:['ninja','thief'] },
    { id:'lightning_shiv', name:'電光のシヴ', type:'dagger', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:8, rarity:3, magic:'thunder', desc:'抜くと静電気を放つ短剣', classes:['thief','ninja','mage'] },
    { id:'ice_shard', name:'氷の欠片', type:'dagger', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:8, rarity:3, magic:'ice', desc:'溶けない氷で作られた魔法の短剣', classes:['thief','ninja','mage'] },

    // --- Epic (Rarity 4) ---
    { id:'shadow_dagger', name:'シャドウダガー', type:'dagger', slot:'右手', price:1600, sell:800, atk:20, def:0, minFloor:10, rarity:4, magic:'dark', desc:'光を反射しない漆黒の短剣', classes:['thief','ninja'] },
    { id:'cursed_kukri', name:'呪われたククリ', type:'dagger', slot:'右手', price:1500, sell:750, atk:22, def:-5, minFloor:10, rarity:4, magic:'curse', desc:'凄まじい威力を発揮するが主を蝕む', classes:['fighter','thief','ninja'] },
    { id:'holy_misericorde', name:'聖なるミゼリコルデ', type:'dagger', slot:'右手', price:1800, sell:900, atk:19, def:2, minFloor:11, rarity:4, magic:'holy', desc:'罪を浄化すると言われる救済の短剣', classes:['priest','bishop','knight'] },
    { id:'dragon_fang_dagger', name:'竜の牙の短剣', type:'dagger', slot:'右手', price:1950, sell:975, atk:21, def:0, minFloor:12, rarity:4, desc:'竜の牙を削り出した、鉄より硬い刃', classes:['fighter','thief','ninja'] },
    { id:'sword_breaker_master', name:'名匠のソードブレイカー', type:'dagger', slot:'右手', price:1750, sell:875, atk:18, def:6, minFloor:11, rarity:4, desc:'敵の武器を絡め取り破壊する技巧の短剣', classes:['thief','ninja','knight'] },
    { id:'phantom_shiv', name:'幻影のシヴ', type:'dagger', slot:'右手', price:1850, sell:925, atk:20, def:0, minFloor:12, rarity:4, desc:'刀身が半透明で回避不能な突きを放つ', classes:['thief','ninja'] },
    { id:'mage_slayer', name:'ウィザードキラー', type:'dagger', slot:'右手', price:1900, sell:950, atk:19, def:0, minFloor:12, rarity:4, magic:'silence', desc:'魔術師の詠唱を封じる魔力阻害の短剣', classes:['thief','ninja'] },
    { id:'blood_letter', name:'吸血の短刀', type:'dagger', slot:'右手', price:1700, sell:850, atk:20, def:0, minFloor:11, rarity:4, magic:'drain', desc:'傷口から執拗に血を吸い上げる', classes:['thief','ninja'] },
    { id:'sonic_knife', name:'超振動ナイフ', type:'dagger', slot:'右手', price:2000, sell:1000, atk:22, def:0, minFloor:14, rarity:4, desc:'高周波の振動であらゆる物質を断つ', classes:['ninja','thief'] },
    { id:'meteor_dagger', name:'星屑の短剣', type:'dagger', slot:'右手', price:1800, sell:900, atk:21, def:0, minFloor:13, rarity:4, desc:'隕鉄から鍛えられた、星の輝きを宿す刃', classes:['thief','ninja','mage'] },

    // --- Legendary (Rarity 5) ---
    { id:'carnwennan', name:'カルンウェナン', type:'dagger', slot:'右手', price:8500, sell:4250, atk:32, def:5, minFloor:20, rarity:5, magic:'dark', desc:'アーサー王が所持した、影に身を隠す短剣', classes:['thief','ninja','lord'] },
    { id:'kusanagi_no_tsurugi_short', name:'草薙の短刀', type:'dagger', slot:'右手', price:9000, sell:4500, atk:34, def:3, minFloor:22, rarity:5, magic:'wind', desc:'神剣の断片から打たれた至高の短刀', classes:['ninja','samurai'] },
    { id:'azoth', name:'アゾット剣', type:'dagger', slot:'右手', price:8800, sell:4400, atk:30, def:0, minFloor:20, rarity:5, magic:'multi', desc:'パラケルススが愛用した、魔術の極致を秘める短剣', classes:['mage','bishop','thief'] },
    { id:'olivia_dagger', name:'オリヴィアの短剣', type:'dagger', slot:'右手', price:8200, sell:4100, atk:31, def:0, minFloor:21, rarity:5, desc:'古の聖女が身を守るために使ったとされる奇跡の刃', classes:['priest','bishop','thief'] },
    { id:'mjolnir_dagger', name:'縮小された雷槌', type:'dagger', slot:'右手', price:9500, sell:4750, atk:36, def:0, minFloor:24, rarity:5, magic:'thunder', desc:'雷神の武器を短剣サイズに縮小加工した逸品', classes:['fighter','thief','ninja'] },
    { id:'vampiric_edge', name:'真祖の牙', type:'dagger', slot:'右手', price:8700, sell:4350, atk:33, def:0, minFloor:22, rarity:5, magic:'drain', desc:'吸血鬼の始祖の牙を加工した呪物', classes:['thief','ninja'] },
    { id:'death_note_blade', name:'死を招く短剣', type:'dagger', slot:'右手', price:9999, sell:5000, atk:38, def:0, minFloor:25, rarity:5, magic:'death', desc:'かすっただけで命を奪う冥府の短剣', classes:['ninja','thief'] },
    { id:'eternal_dagger', name:'刻の短剣', type:'dagger', slot:'右手', price:9200, sell:4600, atk:31, def:10, minFloor:23, rarity:5, magic:'time', desc:'周囲の時間を遅延させる神話の遺物', classes:['thief','ninja'] },
    { id:'valkyrie_knife', name:'戦乙女の小刀', type:'dagger', slot:'右手', price:8400, sell:4200, atk:32, def:4, minFloor:21, rarity:5, magic:'holy', desc:'ヴァルキリーが魂を導く際に使う短剣', classes:['valkyrie','priest','thief'] },
    { id:'chaos_dagger', name:'混沌の短剣', type:'dagger', slot:'右手', price:9800, sell:4900, atk:35, def:0, minFloor:25, rarity:5, magic:'chaos', desc:'法則を歪め、予測不能な追加ダメージを与える', classes:['thief','ninja'] },
    { id:'prometheus_flame', name:'プロメテウスの火', type:'dagger', slot:'右手', price:8900, sell:4450, atk:34, def:0, minFloor:23, rarity:5, magic:'fire', desc:'神から盗んだ火が燃え続けているナイフ', classes:['fighter','thief','mage'] },
    { id:'abyssal_fang', name:'深淵の牙', type:'dagger', slot:'右手', price:9999, sell:5000, atk:40, def:0, minFloor:30, rarity:5, magic:'dark', desc:'虚無から生まれた、すべてを飲み込む短剣', classes:['ninja','thief'] },
    // --- Common (Rarity 1) ---
    { id:'small_knife', name:'スモールナイフ', type:'dagger', slot:'右手', price:35, sell:17, atk:2, def:0, minFloor:0, rarity:1, desc:'果物ナイフ程度の小刀', classes:['fighter','thief','ninja','mage','priest','bishop'] },
    { id:'rusty_shiv', name:'錆びたシヴ', type:'dagger', slot:'右手', price:25, sell:12, atk:2, def:0, minFloor:0, rarity:1, desc:'粗末な手製の刺突武器', classes:['thief','ninja'] },
    { id:'flint_knife', name:'石鏃のナイフ', type:'dagger', slot:'右手', price:40, sell:20, atk:3, def:0, minFloor:0, rarity:1, desc:'打ち欠いた石で作られた刃物', classes:['thief','ninja','mage'] },
    { id:'bronze_dagger', name:'ブロンズダガー', type:'dagger', slot:'右手', price:50, sell:25, atk:3, def:0, minFloor:1, rarity:1, desc:'青銅で鋳造された短剣', classes:['fighter','thief','ninja','mage','priest','bishop'] },
    { id:'dirk_common', name:'使い古されたディルク', type:'dagger', slot:'右手', price:60, sell:30, atk:4, def:0, minFloor:1, rarity:1, desc:'スコットランドの古い短剣', classes:['thief','fighter','ninja'] },
    { id:'wooden_dagger', name:'訓練用短剣', type:'dagger', slot:'右手', price:30, sell:15, atk:2, def:1, minFloor:0, rarity:1, desc:'木製の練習用ダガー', classes:['fighter','thief','ninja','mage','priest','bishop'] },
    { id:'bone_dagger', name:'骨の短剣', type:'dagger', slot:'右手', price:55, sell:27, atk:4, def:0, minFloor:1, rarity:1, desc:'動物の骨を削り出した刃', classes:['thief','ninja','mage'] },
    { id:'tantou', name:'短刀', type:'dagger', slot:'右手', price:70, sell:35, atk:4, def:0, minFloor:1, rarity:1, desc:'日本の伝統的な護身用短刀', classes:['ninja','samurai','thief'] },

    // --- Uncommon (Rarity 2) ---
    { id:'main_gauche', name:'マンゴーシュ', type:'dagger', slot:'右手', price:350, sell:175, atk:8, def:3, minFloor:3, rarity:2, desc:'「左手」を意味する防御短剣', classes:['thief','ninja','fighter'] },
    { id:'kukri', name:'ククリ', type:'dagger', slot:'右手', price:300, sell:150, atk:10, def:0, minFloor:3, rarity:2, desc:'内側に湾曲したグルカのナイフ', classes:['thief','ninja','fighter'] },
    { id:'roundel_dagger', name:'ロンデルダガー', type:'dagger', slot:'右手', price:280, sell:140, atk:9, def:1, minFloor:3, rarity:2, desc:'円盤状の柄頭を持つ騎士の短剣', classes:['fighter','knight','lord'] },
    { id:'kris', name:'クリス', type:'dagger', slot:'右手', price:320, sell:160, atk:10, def:0, minFloor:4, rarity:2, desc:'波打つ刃を持つ東南アジアの短剣', classes:['thief','ninja','mage'] },
    { id:'jambiya', name:'ジャンビーヤ', type:'dagger', slot:'右手', price:290, sell:145, atk:9, def:0, minFloor:4, rarity:2, desc:'中東の三日月型短剣', classes:['thief','ninja','priest'] },
    { id:'saia', name:'サイ', type:'dagger', slot:'右手', price:310, sell:155, atk:8, def:2, minFloor:4, rarity:2, desc:'攻撃を受け止める三叉の十手状武器', classes:['ninja','thief'] },
    { id:'poignard', name:'ポニャール', type:'dagger', slot:'右手', price:340, sell:170, atk:9, def:1, minFloor:4, rarity:2, desc:'軽装向けの尖った短剣', classes:['thief','mage','bishop'] },
    { id:'scramasax', name:'スクラマサクス', type:'dagger', slot:'右手', price:380, sell:190, atk:11, def:0, minFloor:5, rarity:2, desc:'ゲルマン人が用いた片刃の重短剣', classes:['fighter','thief'] },
    { id:'ear_dagger', name:'イヤーダガー', type:'dagger', slot:'右手', price:360, sell:180, atk:10, def:0, minFloor:5, rarity:2, desc:'柄頭が耳のような形のルネサンス短剣', classes:['thief','ninja'] },
    { id:'poison_knife', name:'毒塗りのナイフ', type:'dagger', slot:'右手', price:450, sell:225, atk:8, def:0, minFloor:4, rarity:2, magic:'poison', desc:'刃に毒が塗り込まれている', classes:['thief','ninja'] },

    // --- Rare (Rarity 3) ---
    { id:'assassin_dagger', name:'アサシンダガー', type:'dagger', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:6, rarity:3, desc:'暗殺に特化した隠し持ちやすい刃', classes:['thief','ninja'] },
    { id:'gladius_dagger', name:'グラディウス・ミニ', type:'dagger', slot:'右手', price:380, sell:190, atk:14, def:1, minFloor:6, rarity:3, desc:'軍用の剣を短剣サイズに縮小したもの', classes:['fighter','knight','lord'] },
    { id:'silver_stiletto', name:'銀のスティレット', type:'dagger', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:7, rarity:3, desc:'不死者を貫くための純銀製短針', classes:['thief','ninja','bishop'] },
    { id:'sacrificial_dagger', name:'供物の短剣', type:'dagger', slot:'右手', price:350, sell:175, atk:14, def:0, minFloor:7, rarity:3, magic:'drain', desc:'儀式で血を捧げるために使われた短剣', classes:['mage','priest','bishop'] },
    { id:'baselard', name:'バゼラード', type:'dagger', slot:'右手', price:370, sell:185, atk:15, def:0, minFloor:7, rarity:3, desc:'H型の柄を持つ中世の重短剣', classes:['fighter','thief','knight'] },
    { id:'misericorde_rare', name:'慈悲の短剣', type:'dagger', slot:'右手', price:390, sell:195, atk:15, def:0, minFloor:8, rarity:3, desc:'とどめを刺すための極細の刃', classes:['knight','lord','thief'] },
    { id:'butterfly_knife', name:'バタフライナイフ', type:'dagger', slot:'右手', price:320, sell:160, atk:14, def:0, minFloor:6, rarity:3, desc:'巧みな操作で敵を翻弄する折り畳み刃', classes:['thief','ninja'] },
    { id:'hidden_blade', name:'仕込み刃', type:'dagger', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:8, rarity:3, desc:'防具や袖に隠された暗殺用の刃', classes:['ninja','thief'] },
    { id:'lightning_shiv', name:'電光のシヴ', type:'dagger', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:8, rarity:3, magic:'thunder', desc:'抜くと静電気を放つ短剣', classes:['thief','ninja','mage'] },
    { id:'ice_shard', name:'氷の欠片', type:'dagger', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:8, rarity:3, magic:'ice', desc:'溶けない氷で作られた魔法の短剣', classes:['thief','ninja','mage'] },

    // --- Epic (Rarity 4) ---
    { id:'shadow_dagger', name:'シャドウダガー', type:'dagger', slot:'右手', price:1600, sell:800, atk:20, def:0, minFloor:10, rarity:4, magic:'dark', desc:'光を反射しない漆黒の短剣', classes:['thief','ninja'] },
    { id:'cursed_kukri', name:'呪われたククリ', type:'dagger', slot:'右手', price:1500, sell:750, atk:22, def:-5, minFloor:10, rarity:4, magic:'curse', desc:'凄まじい威力を発揮するが主を蝕む', classes:['fighter','thief','ninja'] },
    { id:'holy_misericorde', name:'聖なるミゼリコルデ', type:'dagger', slot:'右手', price:1800, sell:900, atk:19, def:2, minFloor:11, rarity:4, magic:'holy', desc:'罪を浄化すると言われる救済の短剣', classes:['priest','bishop','knight'] },
    { id:'dragon_fang_dagger', name:'竜の牙の短剣', type:'dagger', slot:'右手', price:1950, sell:975, atk:21, def:0, minFloor:12, rarity:4, desc:'竜の牙を削り出した、鉄より硬い刃', classes:['fighter','thief','ninja'] },
    { id:'sword_breaker_master', name:'名匠のソードブレイカー', type:'dagger', slot:'右手', price:1750, sell:875, atk:18, def:6, minFloor:11, rarity:4, desc:'敵の武器を絡め取り破壊する技巧の短剣', classes:['thief','ninja','knight'] },
    { id:'phantom_shiv', name:'幻影のシヴ', type:'dagger', slot:'右手', price:1850, sell:925, atk:20, def:0, minFloor:12, rarity:4, desc:'刀身が半透明で回避不能な突きを放つ', classes:['thief','ninja'] },
    { id:'mage_slayer', name:'ウィザードキラー', type:'dagger', slot:'右手', price:1900, sell:950, atk:19, def:0, minFloor:12, rarity:4, magic:'silence', desc:'魔術師の詠唱を封じる魔力阻害の短剣', classes:['thief','ninja'] },
    { id:'blood_letter', name:'吸血の短刀', type:'dagger', slot:'右手', price:1700, sell:850, atk:20, def:0, minFloor:11, rarity:4, magic:'drain', desc:'傷口から執拗に血を吸い上げる', classes:['thief','ninja'] },
    { id:'sonic_knife', name:'超振動ナイフ', type:'dagger', slot:'右手', price:2000, sell:1000, atk:22, def:0, minFloor:14, rarity:4, desc:'高周波の振動であらゆる物質を断つ', classes:['ninja','thief'] },
    { id:'meteor_dagger', name:'星屑の短剣', type:'dagger', slot:'右手', price:1800, sell:900, atk:21, def:0, minFloor:13, rarity:4, desc:'隕鉄から鍛えられた、星の輝きを宿す刃', classes:['thief','ninja','mage'] },

    // --- Legendary (Rarity 5) ---
    { id:'carnwennan', name:'カルンウェナン', type:'dagger', slot:'右手', price:8500, sell:4250, atk:32, def:5, minFloor:20, rarity:5, magic:'dark', desc:'アーサー王が所持した、影に身を隠す短剣', classes:['thief','ninja','lord'] },
    { id:'kusanagi_no_tsurugi_short', name:'草薙の短刀', type:'dagger', slot:'右手', price:9000, sell:4500, atk:34, def:3, minFloor:22, rarity:5, magic:'wind', desc:'神剣の断片から打たれた至高の短刀', classes:['ninja','samurai'] },
    { id:'azoth', name:'アゾット剣', type:'dagger', slot:'右手', price:8800, sell:4400, atk:30, def:0, minFloor:20, rarity:5, magic:'multi', desc:'パラケルススが愛用した、魔術の極致を秘める短剣', classes:['mage','bishop','thief'] },
    { id:'olivia_dagger', name:'オリヴィアの短剣', type:'dagger', slot:'右手', price:8200, sell:4100, atk:31, def:0, minFloor:21, rarity:5, desc:'古の聖女が身を守るために使ったとされる奇跡の刃', classes:['priest','bishop','thief'] },
    { id:'mjolnir_dagger', name:'縮小された雷槌', type:'dagger', slot:'右手', price:9500, sell:4750, atk:36, def:0, minFloor:24, rarity:5, magic:'thunder', desc:'雷神の武器を短剣サイズに縮小加工した逸品', classes:['fighter','thief','ninja'] },
    { id:'vampiric_edge', name:'真祖の牙', type:'dagger', slot:'右手', price:8700, sell:4350, atk:33, def:0, minFloor:22, rarity:5, magic:'drain', desc:'吸血鬼の始祖の牙を加工した呪物', classes:['thief','ninja'] },
    { id:'death_note_blade', name:'死を招く短剣', type:'dagger', slot:'右手', price:9999, sell:5000, atk:38, def:0, minFloor:25, rarity:5, magic:'death', desc:'かすっただけで命を奪う冥府の短剣', classes:['ninja','thief'] },
    { id:'eternal_dagger', name:'刻の短剣', type:'dagger', slot:'右手', price:9200, sell:4600, atk:31, def:10, minFloor:23, rarity:5, magic:'time', desc:'周囲の時間を遅延させる神話の遺物', classes:['thief','ninja'] },
    { id:'valkyrie_knife', name:'戦乙女の小刀', type:'dagger', slot:'右手', price:8400, sell:4200, atk:32, def:4, minFloor:21, rarity:5, magic:'holy', desc:'ヴァルキリーが魂を導く際に使う短剣', classes:['valkyrie','priest','thief'] },
    { id:'chaos_dagger', name:'混沌の短剣', type:'dagger', slot:'右手', price:9800, sell:4900, atk:35, def:0, minFloor:25, rarity:5, magic:'chaos', desc:'法則を歪め、予測不能な追加ダメージを与える', classes:['thief','ninja'] },
    { id:'prometheus_flame', name:'プロメテウスの火', type:'dagger', slot:'右手', price:8900, sell:4450, atk:34, def:0, minFloor:23, rarity:5, magic:'fire', desc:'神から盗んだ火が燃え続けているナイフ', classes:['fighter','thief','mage'] },
    { id:'abyssal_fang', name:'深淵の牙', type:'dagger', slot:'右手', price:9999, sell:5000, atk:40, def:0, minFloor:30, rarity:5, magic:'dark', desc:'虚無から生まれた、すべてを飲み込む短剣', classes:['ninja','thief'] },

    // ---------------------------------------------------------------
    // 斧・槌系 (Axes & Maces) - 30 items
    // ---------------------------------------------------------------
    // --- Common & Uncommon ---
    { id:'woodcutter_axe', name:'薪割り斧', type:'axe', slot:'右手', price:40, sell:20, atk:3, def:0, minFloor:0, rarity:1, desc:'生活用の斧', classes:['fighter','thief'] },
    { id:'stone_axe', name:'石斧', type:'axe', slot:'右手', price:30, sell:15, atk:4, def:0, minFloor:0, rarity:1, desc:'粗末な石の斧', classes:['fighter'] },
    { id:'bronze_axe', name:'ブロンズアックス', type:'axe', slot:'右手', price:200, sell:100, atk:8, def:0, minFloor:2, rarity:2, desc:'青銅製の戦斧', classes:['fighter','knight','lord'] },
    { id:'broad_axe', name:'ブロードアックス', type:'axe', slot:'右手', price:250, sell:125, atk:10, def:0, minFloor:3, rarity:2, desc:'刃幅の広い伐採兼戦斧', classes:['fighter','lord'] },
    { id:'mace', name:'メイス', type:'mace', slot:'右手', price:220, sell:110, atk:9, def:0, minFloor:2, rarity:2, desc:'全金属製の打撃武器', classes:['priest','bishop','knight','fighter'] },
    { id:'flail', name:'フレイル', type:'mace', slot:'右手', price:300, sell:150, atk:11, def:0, minFloor:4, rarity:2, desc:'鎖で繋がれた打撃具', classes:['fighter','priest'] },
    { id:'heavy_mace', name:'ヘビーメイス', type:'mace', slot:'右手', price:450, sell:225, atk:12, def:0, minFloor:5, rarity:2, desc:'重量級のメイス', classes:['priest','knight'] },
    { id:'francisca', name:'フランシスカ', type:'axe', slot:'右手', price:320, sell:160, atk:11, def:0, minFloor:4, rarity:2, desc:'フラン朝の投擲斧', classes:['fighter','thief'] },
    
    // --- Rare & Epic ---
    { id:'great_axe', name:'グレートアックス', type:'axe', slot:'右手', price:400, sell:200, atk:15, def:0, minFloor:6, rarity:3, desc:'巨大な両手斧', classes:['fighter'] },
    { id:'tabar', name:'タバール', type:'axe', slot:'右手', price:380, sell:190, atk:14, def:0, minFloor:5, rarity:3, desc:'ペルシャ風の戦斧', classes:['fighter','knight'] },
    { id:'war_pick', name:'ウォーピック', type:'axe', slot:'右手', price:360, sell:180, atk:14, def:0, minFloor:5, rarity:3, desc:'鎧を貫く鶴嘴', classes:['fighter','thief'] },
    { id:'crow_bill', name:'クロウビル', type:'mace', slot:'右手', price:390, sell:195, atk:15, def:0, minFloor:6, rarity:3, desc:'烏の嘴状の打撃武器', classes:['knight','lord'] },
    { id:'holy_mace', name:'ホーリーメイス', type:'mace', slot:'右手', price:400, sell:200, atk:14, def:0, minFloor:6, rarity:3, magic:'holy', desc:'祝福された聖職者の槌', classes:['priest','bishop'] },
    { id:'tomahawk', name:'トマホーク', type:'axe', slot:'右手', price:350, sell:175, atk:14, def:0, minFloor:5, rarity:3, desc:'北米先住民の投擲斧', classes:['fighter','thief','ninja'] },
    { id:'ono', name:'戦斧（マサカリ）', type:'axe', slot:'右手', price:1600, sell:800, atk:19, def:1, minFloor:10, rarity:4, desc:'豪傑が振るう大斧', classes:['fighter','samurai'] },
    { id:'executioner_axe', name:'断頭台の斧', type:'axe', slot:'右手', price:1800, sell:900, atk:22, def:0, minFloor:12, rarity:4, desc:'処刑用の巨大な斧', classes:['fighter'] },
    { id:'crescent_axe', name:'クレセントアックス', type:'axe', slot:'右手', price:1750, sell:875, atk:20, def:0, minFloor:11, rarity:4, desc:'三日月状の美しい刃を持つ斧', classes:['fighter','valkyrie'] },
    { id:'earthquake_hammer', name:'アースクエイク', type:'mace', slot:'右手', price:1900, sell:950, atk:22, def:0, minFloor:12, rarity:4, magic:'earth', desc:'大地を震わせる重槌', classes:['fighter','lord'] },
    { id:'silver_mace', name:'銀のメイス', type:'mace', slot:'右手', price:1500, sell:750, atk:18, def:0, minFloor:9, rarity:4, desc:'魔を払う純銀の槌', classes:['priest','bishop','valkyrie'] },
    { id:'power_wrist', name:'パワーハンマー', type:'mace', slot:'右手', price:1650, sell:825, atk:21, def:0, minFloor:11, rarity:4, desc:'衝撃波を放つ槌', classes:['fighter'] },

    // --- Legendary ---
    { id:'parashu', name:'パラシュ', type:'axe', slot:'右手', price:8500, sell:4250, atk:34, def:0, minFloor:20, rarity:5, magic:'holy', desc:'シヴァ神より授かった神斧', classes:['fighter','lord'] },
    { id:'mjolnir', name:'ミョルニル', type:'mace', slot:'右手', price:9999, sell:5000, atk:45, def:0, minFloor:25, rarity:5, magic:'thunder', desc:'雷神トールの神槌', classes:['lord','priest'] },
    { id:'labrys_legend', name:'迷宮の双斧', type:'axe', slot:'右手', price:7500, sell:3750, atk:32, def:2, minFloor:20, rarity:5, desc:'ミノタウロスの迷宮の象徴', classes:['fighter'] },
    { id:'ukonvasara', name:'ウコンバサラ', type:'mace', slot:'右手', price:8800, sell:4400, atk:35, def:0, minFloor:22, rarity:5, magic:'thunder', desc:'天空神ウッコの神槌', classes:['lord','valkyrie'] },
    { id:'demon_bane_axe', name:'魔界封じの斧', type:'axe', slot:'右手', price:8200, sell:4100, atk:33, def:5, minFloor:20, rarity:5, desc:'魔族に対して絶対的な威力を誇る', classes:['fighter','knight','lord'] },
    { id:'berserker_axe', name:'狂戦士の斧', type:'axe', slot:'右手', price:7800, sell:3900, atk:38, def:-10, minFloor:18, rarity:5, magic:'curse', desc:'理性を失う代わりに破壊力を得る', classes:['fighter'] },
    { id:'vajra_hammer', name:'金剛槌', type:'mace', slot:'右手', price:9000, sell:4500, atk:36, def:10, minFloor:24, rarity:5, desc:'決して壊れることのない神の槌', classes:['priest','bishop','samurai'] },
    { id:'storm_breaker', name:'ストームブレイカー', type:'axe', slot:'右手', price:9200, sell:4600, atk:40, def:0, minFloor:25, rarity:5, magic:'wind', desc:'嵐を切り裂く伝説の大斧', classes:['fighter','lord'] },
    { id:'meteor_mace', name:'メテオメイス', type:'mace', slot:'右手', price:8000, sell:4000, atk:34, def:0, minFloor:21, rarity:5, magic:'fire', desc:'隕石から削り出した灼熱の槌', classes:['fighter','priest'] },
    { id:'axe_of_pangu', name:'盤古の斧', type:'axe', slot:'右手', price:9999, sell:5000, atk:50, def:0, minFloor:30, rarity:5, desc:'天地を分かつ始まりの斧', classes:['lord'] },

    // ---------------------------------------------------------------
    // 槍・長柄系 (Spears & Polearms) - 30 items
    // ---------------------------------------------------------------
    // --- Common & Uncommon ---
    { id:'bamboo_spear', name:'竹槍', type:'spear', slot:'右手', price:30, sell:15, atk:2, def:0, minFloor:0, rarity:1, desc:'急場凌ぎの竹の槍', classes:['fighter','thief','samurai'] },
    { id:'short_spear', name:'ショートスピア', type:'spear', slot:'右手', price:60, sell:30, atk:4, def:0, minFloor:0, rarity:1, desc:'取り回しの良い短い槍', classes:['fighter','thief','knight','valkyrie'] },
    { id:'piking_fork', name:'ピッチフォーク', type:'spear', slot:'右手', price:45, sell:22, atk:3, def:0, minFloor:0, rarity:1, desc:'農具を転用した槍', classes:['fighter','thief'] },
    { id:'long_spear', name:'ロングスピア', type:'spear', slot:'右手', price:220, sell:110, atk:9, def:0, minFloor:2, rarity:2, desc:'リーチに優れた長槍', classes:['fighter','knight','valkyrie'] },
    { id:'pike', name:'パイク', type:'spear', slot:'右手', price:300, sell:150, atk:11, def:0, minFloor:4, rarity:2, desc:'集団戦用の極長槍', classes:['fighter','knight'] },
    { id:'lance', name:'ランス', type:'spear', slot:'右手', price:400, sell:200, atk:12, def:0, minFloor:5, rarity:2, desc:'騎馬突撃用の重槍', classes:['knight','lord'] },
    { id:'trident', name:'トライデント', type:'spear', slot:'右手', price:350, sell:175, atk:10, def:0, minFloor:3, rarity:2, desc:'三叉の漁師の槍', classes:['fighter','valkyrie'] },
    { id:'glaive', name:'グレイブ', type:'spear', slot:'右手', price:380, sell:190, atk:11, def:1, minFloor:4, rarity:2, desc:'刀身のついた長柄武器', classes:['fighter','knight','valkyrie'] },
    { id:'naginata', name:'薙刀', type:'spear', slot:'右手', price:420, sell:210, atk:10, def:2, minFloor:5, rarity:2, desc:'日本の伝統的な長柄刀', classes:['samurai','valkyrie','ninja'] },

    // --- Rare & Epic ---
    { id:'partisan', name:'パルチザン', type:'spear', slot:'右手', price:380, sell:190, atk:14, def:1, minFloor:6, rarity:3, desc:'幅広の穂先を持つ槍', classes:['fighter','knight','valkyrie'] },
    { id:'corsesca', name:'コルセスカ', type:'spear', slot:'右手', price:400, sell:200, atk:15, def:1, minFloor:7, rarity:3, desc:'三叉の穂先を持つ突撃槍', classes:['knight','valkyrie'] },
    { id:'cross_spear', name:'十文字槍', type:'spear', slot:'右手', price:390, sell:195, atk:15, def:1, minFloor:7, rarity:3, desc:'左右に刃を持つ実戦槍', classes:['samurai','valkyrie'] },
    { id:'bardiche', name:'バルディッシュ', type:'spear', slot:'右手', price:370, sell:185, atk:15, def:0, minFloor:6, rarity:3, desc:'半月型の刃を持つ斧槍', classes:['fighter'] },
    { id:'pilum', name:'ピルム', type:'spear', slot:'右手', price:340, sell:170, atk:14, def:0, minFloor:5, rarity:3, desc:'ローマ軍の投擲用槍', classes:['knight','lord'] },
    { id:'dragoon_lance', name:'竜騎士の槍', type:'spear', slot:'右手', price:1800, sell:900, atk:21, def:0, minFloor:11, rarity:4, desc:'跳躍攻撃に適した槍', classes:['valkyrie','knight'] },
    { id:'holy_lance', name:'ホーリーランス', type:'spear', slot:'右手', price:1900, sell:950, atk:20, def:2, minFloor:12, rarity:4, magic:'holy', desc:'聖なる輝きを放つ長槍', classes:['valkyrie','knight','lord'] },
    { id:'serpent_spear', name:'蛇矛', type:'spear', slot:'右手', price:1750, sell:875, atk:22, def:0, minFloor:11, rarity:4, desc:'蛇のようにうねった穂先', classes:['fighter','samurai'] },
    { id:'thunder_spear', name:'雷撃の槍', type:'spear', slot:'右手', price:1650, sell:825, atk:19, def:0, minFloor:10, rarity:4, magic:'thunder', desc:'雷を纏った魔法の槍', classes:['valkyrie','knight'] },
    { id:'wind_spear', name:'ウィンドスピア', type:'spear', slot:'右手', price:1600, sell:800, atk:18, def:2, minFloor:10, rarity:4, magic:'wind', desc:'風の守りを得る槍', classes:['valkyrie','ninja'] },
    { id:'heavy_halberd', name:'重ハルバード', type:'spear', slot:'右手', price:2000, sell:1000, atk:22, def:0, minFloor:12, rarity:4, desc:'破壊力を極めたハルバード', classes:['fighter','knight'] },

    // --- Legendary ---
    { id:'gae_bulg', name:'ゲイ・ボルグ', type:'spear', slot:'右手', price:8800, sell:4400, atk:35, def:0, minFloor:22, rarity:5, magic:'death', desc:'クー・フーリンの魔槍', classes:['valkyrie'] },
    { id:'longinus', name:'ロンギヌスの槍', type:'spear', slot:'右手', price:9500, sell:4750, atk:36, def:5, minFloor:24, rarity:5, magic:'holy', desc:'神の子を突いたとされる聖槍', classes:['lord','knight','valkyrie'] },
    { id:'triaina', name:'トリアイナ', type:'spear', slot:'右手', price:8500, sell:4250, atk:34, def:0, minFloor:21, rarity:5, magic:'water', desc:'海神ポセイドンの三叉槍', classes:['valkyrie','lord'] },
    { id:'brionac', name:'ブリオナック', type:'spear', slot:'右手', price:9200, sell:4600, atk:37, def:0, minFloor:23, rarity:5, magic:'light', desc:'光の神ルーの放つ槍', classes:['valkyrie','lord'] },
    { id:'tonbogiri', name:'蜻蛉切', type:'spear', slot:'右手', price:8900, sell:4450, atk:35, def:2, minFloor:22, rarity:5, desc:'天下三名槍。触れた蜻蛉も切れる', classes:['samurai','valkyrie'] },
    { id:'nihongo', name:'日本号', type:'spear', slot:'右手', price:8700, sell:4350, atk:33, def:4, minFloor:21, rarity:5, desc:'正三位の位を持つ伝説の槍', classes:['samurai','valkyrie'] },
    { id:'otegine', name:'御手杵', type:'spear', slot:'右手', price:8600, sell:4300, atk:36, def:0, minFloor:22, rarity:5, desc:'天下三名槍。重量級の突刺槍', classes:['samurai','fighter'] },
    { id:'rhongomyniad', name:'ロンゴミニアド', type:'spear', slot:'右手', price:9800, sell:4900, atk:40, def:5, minFloor:25, rarity:5, magic:'light', desc:'世界の果てを繋ぎ止める聖槍', classes:['lord','knight'] },
    { id:'slayer_spear', name:'魔竜封じの槍', type:'spear', slot:'右手', price:8000, sell:4000, atk:34, def:3, minFloor:20, rarity:5, desc:'竜の皮をも容易く貫く槍', classes:['valkyrie','knight'] },
    { id:'amenonuhoko', name:'天沼矛', type:'spear', slot:'右手', price:9999, sell:5000, atk:42, def:8, minFloor:30, rarity:5, desc:'混沌をかき混ぜ島を作った神槍', classes:['lord','samurai'] },

// ---------------------------------------------------------------
    // 杖系 (Staves & Wands) - 30 items
    // ---------------------------------------------------------------
    // --- Common & Uncommon ---
    { id:'oak_staff', name:'樫の杖', type:'staff', slot:'右手', price:40, sell:20, atk:2, def:1, minFloor:0, rarity:1, desc:'非常に硬い樫の木で作られた杖', classes:['mage','priest','bishop'] },
    { id:'cypress_pole', name:'ひのきのぼう', type:'staff', slot:'右手', price:20, sell:10, atk:1, def:0, minFloor:0, rarity:1, desc:'ただの木の棒。心もとない', classes:['mage','priest','bishop','thief'] },
    { id:'bent_staff', name:'曲がった杖', type:'staff', slot:'右手', price:45, sell:22, atk:3, def:0, minFloor:0, rarity:1, desc:'老人が使うような曲がった杖', classes:['mage','priest','bishop'] },
    { id:'iron_cane', name:'鉄の杖', type:'staff', slot:'右手', price:250, sell:125, atk:8, def:2, minFloor:2, rarity:2, desc:'護身用に作られた鉄製の杖', classes:['priest','bishop'] },
    { id:'crystal_wand', name:'水晶の杖', type:'staff', slot:'右手', price:350, sell:175, atk:7, def:0, minFloor:3, rarity:2, desc:'魔力を集めやすい水晶が埋め込まれた杖', classes:['mage','bishop'] },
    { id:'shaman_stick', name:'祈祷師の杖', type:'staff', slot:'右手', price:280, sell:140, atk:6, def:1, minFloor:2, rarity:2, desc:'羽飾りがついた呪術用の杖', classes:['mage','priest'] },
    { id:'silver_rod', name:'銀のロッド', type:'staff', slot:'右手', price:450, sell:225, atk:9, def:0, minFloor:4, rarity:2, desc:'銀で作られた魔導具', classes:['mage','priest','bishop'] },
    { id:'monk_staff', name:'錫杖', type:'staff', slot:'右手', price:400, sell:200, atk:10, def:3, minFloor:4, rarity:2, desc:'振ると音が鳴る僧侶の杖', classes:['priest','bishop','samurai'] },

    // --- Rare & Epic ---
    { id:'wizard_staff', name:'魔導師の杖', type:'staff', slot:'右手', price:380, sell:190, atk:14, def:0, minFloor:6, rarity:3, desc:'熟練の魔導師が使う本格的な杖', classes:['mage','bishop'] },
    { id:'high_priest_staff', name:'司教の杖', type:'staff', slot:'右手', price:400, sell:200, atk:14, def:4, minFloor:7, rarity:3, desc:'高い地位の聖職者が持つ権威ある杖', classes:['priest','bishop'] },
    { id:'emerald_staff', name:'エメラルドスタッフ', type:'staff', slot:'右手', price:1800, sell:900, atk:19, def:2, minFloor:11, rarity:4, magic:'earth', desc:'大地の魔力を秘めた緑の杖', classes:['mage','bishop'] },
    { id:'sapphire_staff', name:'サファイアスタッフ', type:'staff', slot:'右手', price:1850, sell:925, atk:18, def:3, minFloor:11, rarity:4, magic:'ice', desc:'氷結の魔力を宿す青い杖', classes:['mage','bishop'] },
    { id:'staff_of_judgment', name:'裁きの杖', type:'staff', slot:'右手', price:1750, sell:875, atk:21, def:0, minFloor:12, rarity:4, magic:'thunder', desc:'罪人に雷を落とす執行者の杖', classes:['bishop','priest'] },
    { id:'life_staff', name:'生命の杖', type:'staff', slot:'右手', price:1950, sell:975, atk:15, def:10, minFloor:12, rarity:4, magic:'heal', desc:'持ち主の生命力を活性化させる杖', classes:['priest','bishop'] },
    { id:'dark_crystal_staff', name:'闇の水晶杖', type:'staff', slot:'右手', price:1650, sell:825, atk:20, def:0, minFloor:11, rarity:4, magic:'dark', desc:'光を吸い込む不気味な水晶の杖', classes:['mage'] },
    { id:'rune_caster', name:'ルーンキャスター', type:'staff', slot:'右手', price:1700, sell:850, atk:18, def:5, minFloor:10, rarity:4, magic:'mp_regen', desc:'古代文字が刻まれた魔力回復の杖', classes:['mage','bishop'] },

    // --- Legendary ---
    { id:'staff_of_hermes', name:'ケリュケイオン', type:'staff', slot:'右手', price:8800, sell:4400, atk:30, def:8, minFloor:22, rarity:5, magic:'multi', desc:'二匹の蛇が巻き付いた伝令神の杖', classes:['bishop','mage'] },
    { id:'caduceus', name:'カドゥケウス', type:'staff', slot:'右手', price:8500, sell:4250, atk:28, def:12, minFloor:21, rarity:5, magic:'heal', desc:'あらゆる病を癒やすとされる神聖な杖', classes:['priest','bishop'] },
    { id:'thyrsus', name:'テュルソス', type:'staff', slot:'右手', price:8000, sell:4000, atk:32, def:0, minFloor:20, rarity:5, magic:'poison', desc:'松笠がついた豊穣と狂乱の杖', classes:['mage','priest'] },
    { id:'staff_of_osiris', name:'オシリスの杖', type:'staff', slot:'右手', price:9200, sell:4600, atk:34, def:5, minFloor:24, rarity:5, magic:'death', desc:'生と死を司る冥界の王の杖', classes:['bishop','mage'] },
    { id:'world_tree_branch', name:'世界樹の枝', type:'staff', slot:'右手', price:9999, sell:5000, atk:35, def:15, minFloor:30, rarity:5, magic:'multi', desc:'ユグドラシルの生命力を宿した神秘の枝', classes:['mage','priest','bishop'] },
    { id:'vajra_staff', name:'金剛杵の杖', type:'staff', slot:'右手', price:9100, sell:4550, atk:36, def:10, minFloor:24, rarity:5, magic:'thunder', desc:'煩悩を打ち砕く神聖な武器', classes:['priest','bishop','samurai'] },
    { id:'wisdom_of_solomon', name:'ソロモンの英知', type:'staff', slot:'右手', price:9500, sell:4750, atk:31, def:20, minFloor:25, rarity:5, magic:'multi', desc:'七十二柱の魔神を従えた王の杖', classes:['mage','bishop'] },
    { id:'elder_staff', name:'ニワトコの杖', type:'staff', slot:'右手', price:9800, sell:4900, atk:45, def:0, minFloor:28, rarity:5, desc:'死を打ち負かす最強の杖', classes:['mage'] },
    { id:'misty_staff', name:'ミスティスタッフ', type:'staff', slot:'右手', price:7800, sell:3900, atk:29, def:15, minFloor:20, rarity:5, desc:'霧を発生させ回避率を高める杖', classes:['mage','bishop'] },
    { id:'phoenix_rod', name:'不死鳥の杖', type:'staff', slot:'右手', price:8600, sell:4300, atk:33, def:0, minFloor:22, rarity:5, magic:'fire', desc:'燃え盛る不死鳥の羽で作られた杖', classes:['mage'] },

    // ---------------------------------------------------------------
    // 弓・遠距離系 (Bows & Ranged) - 30 items
    // ---------------------------------------------------------------
    // --- Common & Uncommon ---
    { id:'toy_bow', name:'おもちゃの弓', type:'bow', slot:'両手', price:30, sell:15, atk:1, def:0, minFloor:0, rarity:1, desc:'子供が遊ぶための弓', classes:['thief','ninja'] },
    { id:'self_bow', name:'セルフボウ', type:'bow', slot:'両手', price:120, sell:60, atk:6, def:0, minFloor:1, rarity:1, desc:'単一の材で作られた素朴な弓', classes:['thief','ninja','fighter'] },
    { id:'sling_shot', name:'パチンコ', type:'bow', slot:'両手', price:50, sell:25, atk:3, def:0, minFloor:0, rarity:1, desc:'小石を飛ばす道具', classes:['thief','mage','ninja'] },
    { id:'recurve_bow', name:'リカーブボウ', type:'bow', slot:'両手', price:350, sell:175, atk:9, def:0, minFloor:3, rarity:2, desc:'反りを持たせた威力の高い弓', classes:['thief','ninja','fighter'] },
    { id:'composite_bow', name:'合成弓', type:'bow', slot:'両手', price:480, sell:240, atk:11, def:0, minFloor:4, rarity:2, desc:'複数の素材を重ね合わせた強力な弓', classes:['thief','samurai','fighter'] },
    { id:'cross_bow', name:'クロスボウ', type:'bow', slot:'両手', price:500, sell:250, atk:12, def:0, minFloor:5, rarity:2, desc:'機械仕掛けで矢を放つ強弓', classes:['fighter','thief','knight'] },
    { id:'hankyu', name:'半弓', type:'bow', slot:'両手', price:300, sell:150, atk:8, def:0, minFloor:3, rarity:2, desc:'室内や馬上でも扱いやすい日本の弓', classes:['samurai','ninja','thief'] },
    { id:'heavy_crossbow', name:'ヘビィクロスボウ', type:'bow', slot:'両手', price:550, sell:275, atk:13, def:0, minFloor:6, rarity:2, desc:'装填に時間はかかるが威力は絶大', classes:['fighter','knight'] },

    // --- Rare & Epic ---
    { id:'great_bow', name:'グレートボウ', type:'bow', slot:'両手', price:400, sell:200, atk:15, def:0, minFloor:8, rarity:3, desc:'大男でも引くのが難しい巨大な弓', classes:['fighter','samurai'] },
    { id:'arbalest', name:'アルバレスト', type:'bow', slot:'両手', price:450, sell:225, atk:15, def:0, minFloor:8, rarity:3, desc:'鋼鉄の弦を張った巨大な弩', classes:['fighter','knight'] },
    { id:'yoichi_bow', name:'那須与一の弓', type:'bow', slot:'両手', price:1700, sell:850, atk:19, def:2, minFloor:11, rarity:4, desc:'扇の的をも射抜く名手の弓', classes:['samurai'] },
    { id:'robin_hood_bow', name:'義賊の弓', type:'bow', slot:'両手', price:1650, sell:825, atk:18, def:4, minFloor:10, rarity:4, desc:'森に潜む射手の使い慣れた弓', classes:['thief'] },
    { id:'flame_shot', name:'フレイムボウ', type:'bow', slot:'両手', price:1800, sell:900, atk:20, def:0, minFloor:12, rarity:4, magic:'fire', desc:'放たれる矢が炎に包まれる弓', classes:['thief','ninja'] },
    { id:'sonic_bow', name:'ソニックボウ', type:'bow', slot:'両手', price:1900, sell:950, atk:21, def:0, minFloor:13, rarity:4, magic:'wind', desc:'音速で矢を射出する魔法の弓', classes:['thief','ninja'] },
    { id:'sniper_crossbow', name:'狙撃の弩', type:'bow', slot:'両手', price:1750, sell:875, atk:22, def:0, minFloor:14, rarity:4, desc:'精密な照準器を備えたクロスボウ', classes:['thief','fighter'] },
    { id:'shadow_string', name:'影縫いの弓', type:'bow', slot:'両手', price:1600, sell:800, atk:19, def:0, minFloor:11, rarity:4, magic:'dark', desc:'敵の影を射て動きを封じる呪いの弓', classes:['ninja','thief'] },

    // --- Legendary ---
    { id:'failnaught', name:'フェイルノート', type:'bow', slot:'両手', price:9500, sell:4750, atk:38, def:5, minFloor:25, rarity:5, magic:'multi', desc:'「打ち損じなし」の意味を持つトリスタンの弓', classes:['thief','knight'] },
    { id:'gandiva', name:'ガーンディーヴァ', type:'bow', slot:'両手', price:9200, sell:4600, atk:40, def:0, minFloor:24, rarity:5, magic:'fire', desc:'火神アグニより授かったアルジュナの神弓', classes:['samurai','fighter'] },
    { id:'pinaka', name:'ピナーカ', type:'bow', slot:'両手', price:9800, sell:4900, atk:42, def:0, minFloor:26, rarity:5, magic:'thunder', desc:'シヴァ神が持つ、一矢で都市を滅ぼす弓', classes:['lord','samurai'] },
    { id:'apollo_bow', name:'アポロンの弓', type:'bow', slot:'両手', price:9000, sell:4500, atk:37, def:10, minFloor:23, rarity:5, magic:'light', desc:'太陽の光を矢として放つ黄金の弓', classes:['valkyrie','lord'] },
    { id:'artemis_bow', name:'アルテミスの弓', type:'bow', slot:'両手', price:8900, sell:4450, atk:36, def:12, minFloor:22, rarity:5, magic:'ice', desc:'月の女神が愛用した、銀の光を放つ弓', classes:['valkyrie','thief'] },
    { id:'houyi_bow', name:'后羿の弓', type:'bow', slot:'両手', price:9600, sell:4800, atk:45, def:0, minFloor:28, rarity:5, magic:'fire', desc:'九つの太陽を撃ち落とした中国神話の弓', classes:['samurai','fighter'] },
    { id:'sharur', name:'シャウル', type:'bow', slot:'両手', price:8500, sell:4250, atk:35, def:0, minFloor:21, rarity:5, desc:'意思を持ち、主人に助言を与える伝説の武器', classes:['lord','fighter'] },
    { id:'azusa_yumi', name:'天之麻迦古弓', type:'bow', slot:'両手', price:8700, sell:4350, atk:34, def:15, minFloor:22, rarity:5, magic:'holy', desc:'穢れを祓い魔を退ける神聖な梓弓', classes:['samurai','bishop'] },
    { id:'icarus_bow', name:'イカロスの弓', type:'bow', slot:'両手', price:7500, sell:3750, atk:32, def:0, minFloor:18, rarity:5, magic:'wind', desc:'空を飛ぶ鳥の羽を弦に使ったとされる弓', classes:['thief','ninja'] },
    { id:'centaur_bow', name:'ケンタウルスの弓', type:'bow', slot:'両手', price:8200, sell:4100, atk:33, def:5, minFloor:20, rarity:5, desc:'半人半馬の射手が使ったとされる強靭な弓', classes:['fighter','thief'] },

    // ---------------------------------------------------------------
    // Shields (10 items)
    // ---------------------------------------------------------------
    { id:'buckler',        name:'バックラー',      type:'shield',  slot:'左手', price:50,   sell:25,  atk:1,  def:2,  minFloor:0,  rarity:1, desc:'小型の丸盾',     classes:['fighter','thief','knight','lord','ninja','samurai','valkyrie'] },
    { id:'round_shield',   name:'ラウンドシールド', type:'shield',  slot:'左手', price:180,  sell:90,  atk:0,  def:5,  minFloor:2,  rarity:2, desc:'円形の木製盾',   classes:['fighter','knight','lord','priest','valkyrie'] },
    { id:'kite_shield',    name:'カイトシールド',   type:'shield',  slot:'左手', price:400,  sell:200, atk:0,  def:8,  minFloor:5,  rarity:2, desc:'騎士用の涙滴型盾', classes:['knight','lord','valkyrie'] },
    { id:'knight_shield',  name:'ナイトシールド',   type:'shield',  slot:'左手', price:900,  sell:450, atk:0,  def:11, minFloor:9,  rarity:3, desc:'紋章の刻まれた盾', classes:['knight','lord'] },
    { id:'spiked_shield',  name:'スパイクシールド', type:'shield',  slot:'左手', price:1000, sell:500, atk:4,  def:9,  minFloor:10, rarity:3, desc:'攻撃的な棘付き盾', classes:['fighter','knight'] },
    { id:'mirror_shield',  name:'ミラーシールド',   type:'shield',  slot:'左手', price:2500, sell:1250,atk:0,  def:15, minFloor:15, rarity:4, desc:'魔法を反射する盾', classes:['knight','lord','valkyrie'] },
    { id:'dragon_shield',  name:'ドラゴンシールド', type:'shield',  slot:'左手', price:3200, sell:1600,atk:0,  def:18, minFloor:18, rarity:4, desc:'竜の鱗の盾',     classes:['fighter','knight','lord'] },
    { id:'aegis',          name:'イージス',        type:'shield',  slot:'左手', price:8500, sell:4250,atk:0,  def:25, minFloor:25, rarity:5, desc:'神の加護ある盾',   classes:['lord','valkyrie'] },
    { id:'holy_shield',    name:'ホーリーシールド', type:'shield',  slot:'左手', price:5500, sell:2750,atk:0,  def:22, minFloor:20, rarity:5, desc:'聖なる輝きの盾',   classes:['knight','lord','priest'] },
    { id:'genji_shield',   name:'源氏の盾',        type:'shield',  slot:'左手', price:6000, sell:3000,atk:0,  def:21, minFloor:22, rarity:5, desc:'異国の名将の盾',   classes:['samurai'] },

    // ---------------------------------------------------------------
    // Helmets / Hats (20 items)
    // ---------------------------------------------------------------
    { id:'cloth_cap',      name:'布の帽子',        type:'helmet',  slot:'頭',   price:30,   sell:15,  atk:0,  def:1,  minFloor:0,  rarity:1, desc:'普通の帽子',     classes:['mage','priest','bishop','thief'] },
    { id:'circlet',        name:'サークレット',    type:'helmet',  slot:'頭',   price:150,  sell:75,  atk:0,  def:2,  minFloor:2,  rarity:1, desc:'金属の髪飾り',   classes:['mage','bishop','valkyrie'] },
    { id:'pointed_hat',    name:'三角帽子',        type:'helmet',  slot:'頭',   price:220,  sell:110, atk:1,  def:3,  minFloor:3,  rarity:2, desc:'魔力を高める帽子', classes:['mage','bishop'] },
    { id:'chain_coif',     name:'チェインコイフ',   type:'helmet',  slot:'頭',   price:250,  sell:125, atk:0,  def:4,  minFloor:4,  rarity:2, desc:'鎖の頭巾',       classes:['fighter','knight','lord','priest'] },
    { id:'sallet',         name:'サレット',        type:'helmet',  slot:'頭',   price:450,  sell:225, atk:0,  def:5,  minFloor:6,  rarity:2, desc:'洗練された鉄兜',   classes:['fighter','knight','lord'] },
    { id:'feather_hat',    name:'羽根付き帽子',    type:'helmet',  slot:'頭',   price:300,  sell:150, atk:1,  def:2,  minFloor:4,  rarity:2, desc:'お洒落な帽子',     classes:['thief','lord'] },
    { id:'black_hood',     name:'黒ずきん',        type:'helmet',  slot:'頭',   price:500,  sell:250, atk:2,  def:4,  minFloor:7,  rarity:3, desc:'闇に紛れる頭巾',   classes:['ninja','thief'] },
    { id:'kabuto',         name:'兜',              type:'helmet',  slot:'頭',   price:700,  sell:350, atk:0,  def:7,  minFloor:8,  rarity:3, desc:'東方の重厚な兜',   classes:['samurai'] },
    { id:'armet',          name:'アーメット',      type:'helmet',  slot:'頭',   price:850,  sell:425, atk:0,  def:9,  minFloor:10, rarity:3, desc:'可動式の面頬付き兜', classes:['knight','lord'] },
    { id:'silver_tiara',   name:'銀のティアラ',    type:'helmet',  slot:'頭',   price:1200, sell:600, atk:0,  def:6,  minFloor:12, rarity:4, desc:'魔除けの銀冠',     classes:['valkyrie','bishop','priest'] },
    { id:'viking_helmet',  name:'角付きの兜',      type:'helmet',  slot:'頭',   price:1400, sell:700, atk:3,  def:8,  minFloor:13, rarity:4, desc:'闘争心を煽る兜',   classes:['fighter'] },
    { id:'assassin_mask',  name:'暗殺者の仮面',    type:'helmet',  slot:'頭',   price:1600, sell:800, atk:5,  def:5,  minFloor:14, rarity:4, desc:'急所を見抜く仮面',   classes:['ninja','thief'] },
    { id:'dragon_helm',    name:'ドラゴンヘルム',   type:'helmet',  slot:'頭',   price:2800, sell:1400,atk:0,  def:12, minFloor:17, rarity:4, desc:'竜の皮の兜',       classes:['knight','lord','fighter'] },
    { id:'sage_hood',      name:'賢者のフード',    type:'helmet',  slot:'頭',   price:3000, sell:1500,atk:2,  def:8,  minFloor:18, rarity:5, desc:'英知が宿るフード',   classes:['mage','bishop'] },
    { id:'valkyrie_helm',  name:'戦乙女の兜',      type:'helmet',  slot:'頭',   price:4500, sell:2250,atk:3,  def:11, minFloor:20, rarity:5, desc:'翼の装飾がある兜',   classes:['valkyrie'] },
    { id:'hachigane',      name:'鉢金',            type:'helmet',  slot:'頭',   price:3500, sell:1750,atk:4,  def:9,  minFloor:19, rarity:5, desc:'急所を護る鉄板',     classes:['ninja','samurai'] },
    { id:'crown_of_kings', name:'王の冠',          type:'helmet',  slot:'頭',   price:9999, sell:5000,atk:5,  def:15, minFloor:25, rarity:5, desc:'支配者の黄金冠',     classes:['lord'] },
    { id:'skull_mask',     name:'ドクロの仮面',    type:'helmet',  slot:'頭',   price:1200, sell:600, atk:6,  def:2,  minFloor:12, rarity:4, desc:'呪われた不気味な面', classes:['ninja','fighter'] },
    { id:'ribbon',         name:'リボン',          type:'helmet',  slot:'頭',   price:5000, sell:2500,atk:0,  def:10, minFloor:20, rarity:5, desc:'万病を防ぐ髪飾り',   classes:['thief','mage','priest','bishop','valkyrie'] },
    { id:'mithril_helm',   name:'ミスリルヘルム',   type:'helmet',  slot:'頭',   price:4200, sell:2100,atk:0,  def:13, minFloor:22, rarity:5, desc:'光り輝く伝説の兜',   classes:['knight','lord','fighter'] },

    // ---------------------------------------------------------------
    // Armors (40 items)
    // ---------------------------------------------------------------
    { id:'tunic',          name:'チュニック',      type:'armor',   slot:'体',   price:40,   sell:20,  atk:0,  def:1,  minFloor:0,  rarity:1, desc:'ただの服',       classes:['mage','priest','bishop','thief'] },
    { id:'padded_armor',   name:'パデッドアーマー', type:'armor',   slot:'体',   price:150,  sell:75,  atk:0,  def:5,  minFloor:1,  rarity:1, desc:'綿を詰めた防護服', classes:['fighter','thief','priest'] },
    { id:'hard_leather',   name:'ハードレザー',    type:'armor',   slot:'体',   price:300,  sell:150, atk:0,  def:7,  minFloor:3,  rarity:2, desc:'なめした硬い革鎧', classes:['fighter','thief','knight','valkyrie'] },
    { id:'ring_mail',      name:'リングメイル',    type:'armor',   slot:'体',   price:500,  sell:250, atk:0,  def:9,  minFloor:4,  rarity:2, desc:'金属の輪を綴じた鎧', classes:['fighter','knight','lord','priest'] },
    { id:'scale_mail',     name:'スケイルメイル',  type:'armor',   slot:'体',   price:650,  sell:325, atk:0,  def:11, minFloor:5,  rarity:2, desc:'魚の鱗状の金属鎧', classes:['fighter','knight','lord'] },
    { id:'breastplate',    name:'胸当て',          type:'armor',   slot:'体',   price:800,  sell:400, atk:0,  def:12, minFloor:6,  rarity:3, desc:'胸部を重点的に護る', classes:['fighter','knight','lord','valkyrie'] },
    { id:'banded_mail',    name:'バンデッドメイル', type:'armor',   slot:'体',   price:1000, sell:500, atk:0,  def:13, minFloor:7,  rarity:3, desc:'金属帯を重ねた鎧', classes:['fighter','knight','lord'] },
    { id:'splint_mail',    name:'スプリントメイル', type:'armor',   slot:'体',   price:1300, sell:650, atk:0,  def:15, minFloor:8,  rarity:3, desc:'薄い板金を並べた鎧', classes:['fighter','knight','lord'] },
    { id:'haramaki',       name:'腹巻鎧',          type:'armor',   slot:'体',   price:400,  sell:200, atk:1,  def:6,  minFloor:4,  rarity:2, desc:'東方の軽量な鎧',   classes:['samurai','ninja'] },
    { id:'shinobi_fuku',   name:'忍び装束',        type:'armor',   slot:'体',   price:900,  sell:450, atk:2,  def:8,  minFloor:8,  rarity:3, desc:'隠密性に優れた服', classes:['ninja'] },
    { id:'magic_robe',     name:'マジックローブ',  type:'armor',   slot:'体',   price:1100, sell:550, atk:1,  def:6,  minFloor:9,  rarity:3, desc:'魔力耐性のある法衣', classes:['mage','bishop','priest'] },
    { id:'silver_chain',   name:'銀の鎖帷子',      type:'armor',   slot:'体',   price:1500, sell:750, atk:0,  def:12, minFloor:10, rarity:4, desc:'魔を退ける銀の鎖鎧', classes:['knight','lord','valkyrie','priest'] },
    { id:'heavy_plate',    name:'ヘヴィプレート',  type:'armor',   slot:'体',   price:2200, sell:1100,atk:0,  def:18, minFloor:13, rarity:4, desc:'重厚な板金鎧',     classes:['knight','lord'] },
    { id:'brigandine',     name:'ブリガンダイン',  type:'armor',   slot:'体',   price:1800, sell:900, atk:1,  def:14, minFloor:12, rarity:4, desc:'革の中に板金を隠した鎧', classes:['fighter','thief','knight'] },
    { id:'mirror_mail',    name:'ミラーメイル',    type:'armor',   slot:'体',   price:2500, sell:1250,atk:0,  def:16, minFloor:14, rarity:4, desc:'魔法を弾く光沢鎧',   classes:['knight','lord','valkyrie'] },
    { id:'dragon_mail',    name:'ドラゴンメイル',  type:'armor',   slot:'体',   price:4500, sell:2250,atk:0,  def:22, minFloor:18, rarity:5, desc:'竜の鱗を綴った鎧',   classes:['fighter','knight','lord'] },
    { id:'demon_armor',    name:'悪魔の鎧',        type:'armor',   slot:'体',   price:4000, sell:2000,atk:8,  def:25, minFloor:20, rarity:5, desc:'強大な力と呪いの鎧', classes:['fighter'] },
    { id:'holy_armor',     name:'ホーリーアーマー', type:'armor',   slot:'体',   price:5500, sell:2750,atk:0,  def:23, minFloor:21, rarity:5, desc:'聖なる加護の鎧',   classes:['knight','lord','valkyrie'] },
    { id:'tousen_gusoku',  name:'当世具足',        type:'armor',   slot:'体',   price:5200, sell:2600,atk:2,  def:20, minFloor:20, rarity:5, desc:'東方の完成された鎧', classes:['samurai'] },
    { id:'dark_suit',      name:'ダークスーツ',    type:'armor',   slot:'体',   price:4800, sell:2400,atk:5,  def:15, minFloor:19, rarity:5, desc:'闇に溶ける特殊装束', classes:['ninja','thief'] },
    { id:'evasion_cloke',  name:'回避の外套',      type:'armor',   slot:'体',   price:3500, sell:1750,atk:0,  def:8,  minFloor:15, rarity:4, desc:'敵の攻撃を逸らす布', classes:['mage','thief','ninja'] },
    { id:'sages_robe',     name:'賢者の法衣',      type:'armor',   slot:'体',   price:6000, sell:3000,atk:3,  def:12, minFloor:22, rarity:5, desc:'至高の魔導ローブ',   classes:['mage','bishop'] },
    { id:'fire_armor',     name:'火炎の鎧',        type:'armor',   slot:'体',   price:3200, sell:1600,atk:2,  def:16, minFloor:16, rarity:4, desc:'炎の耐性を得る鎧',   classes:['fighter','knight','lord'] },
    { id:'ice_armor',      name:'氷結の鎧',        type:'armor',   slot:'体',   price:3200, sell:1600,atk:0,  def:17, minFloor:16, rarity:4, desc:'氷の耐性を得る鎧',   classes:['fighter','knight','lord'] },
    { id:'crystal_armor',  name:'クリスタルメイル', type:'armor',   slot:'体',   price:5800, sell:2900,atk:0,  def:24, minFloor:23, rarity:5, desc:'透き通る結晶の鎧',   classes:['knight','lord'] },
    { id:'royal_armor',    name:'ロイヤルアーマー', type:'armor',   slot:'体',   price:7500, sell:3750,atk:2,  def:26, minFloor:24, rarity:5, desc:'王家に伝わる至宝の鎧', classes:['lord'] },
    { id:'adaman_plate',   name:'アダマンプレート', type:'armor',   slot:'体',   price:9000, sell:4500,atk:0,  def:30, minFloor:25, rarity:5, desc:'超硬金属の板金鎧',   classes:['fighter','knight','lord'] },
    { id:'silk_robe',      name:'シルクのローブ',  type:'armor',   slot:'体',   price:400,  sell:200, atk:0,  def:4,  minFloor:5,  rarity:2, desc:'高級な絹のローブ',   classes:['mage','bishop','priest'] },
    { id:'wizard_attire',  name:'魔術師の装束',    type:'armor',   slot:'体',   price:2000, sell:1000,atk:4,  def:10, minFloor:15, rarity:4, desc:'呪文詠唱を助ける服', classes:['mage'] },
    { id:'valkyrie_dress', name:'戦乙女の衣',      type:'armor',   slot:'体',   price:5000, sell:2500,atk:3,  def:18, minFloor:20, rarity:5, desc:'神域の加護がある衣', classes:['valkyrie'] },
    { id:'samurai_armor',  name:'大鎧',            type:'armor',   slot:'体',   price:3000, sell:1500,atk:1,  def:16, minFloor:14, rarity:4, desc:'格式高い武士の鎧',   classes:['samurai'] },
    { id:'thief_leather',  name:'シーフレザー',    type:'armor',   slot:'体',   price:600,  sell:300, atk:1,  def:6,  minFloor:6,  rarity:2, desc:'動きやすい加工革鎧', classes:['thief'] },
    { id:'golden_armor',   name:'黄金の鎧',        type:'armor',   slot:'体',   price:8000, sell:4000,atk:0,  def:22, minFloor:22, rarity:5, desc:'輝く金の鎧',       classes:['knight','lord'] },
    { id:'forest_leather', name:'森の革鎧',        type:'armor',   slot:'体',   price:1200, sell:600, atk:1,  def:10, minFloor:9,  rarity:3, desc:'森の精霊の加護',     classes:['thief','ninja','valkyrie'] },
    { id:'cursed_mail',    name:'呪われた鎧',      type:'armor',   slot:'体',   price:10,   sell:5,   atk:10, def:30, minFloor:20, rarity:5, desc:'脱ぐことのできない鎧', classes:['fighter','knight','lord'] },
    { id:'ninja_garb',     name:'忍の黒装束',      type:'armor',   slot:'体',   price:2500, sell:1250,atk:4,  def:11, minFloor:15, rarity:4, desc:'極限まで軽量化された', classes:['ninja'] },
    { id:'gladiator_body', name:'剣闘士の装具',    type:'armor',   slot:'体',   price:700,  sell:350, atk:3,  def:8,  minFloor:7,  rarity:3, desc:'闘技場用の露出多い鎧', classes:['fighter'] },
    { id:'knight_plate',   name:'騎士の板金鎧',    type:'armor',   slot:'体',   price:3500, sell:1750,atk:0,  def:20, minFloor:17, rarity:4, desc:'正式な騎士の装備',   classes:['knight','lord'] },
    { id:'white_robe',     name:'白のローブ',      type:'armor',   slot:'体',   price:1800, sell:900, atk:0,  def:10, minFloor:13, rarity:4, desc:'慈愛に満ちた僧侶服', classes:['priest','bishop'] },
    { id:'divine_armor',   name:'神意の鎧',        type:'armor',   slot:'体',   price:9999, sell:5000,atk:5,  def:32, minFloor:25, rarity:5, desc:'神の意思を宿した鎧', classes:['lord','valkyrie'] },

    // ---------------------------------------------------------------
    // Gauntlets / Gloves (20 items)
    // ---------------------------------------------------------------
    { id:'cloth_gloves',   name:'布の手袋',        type:'gauntlet',slot:'腕',   price:20,   sell:10,  atk:0,  def:1,  minFloor:0,  rarity:1, desc:'防寒用の手袋',     classes:['mage','priest','bishop','thief'] },
    { id:'bracers',        name:'リストバンド',    type:'gauntlet',slot:'腕',   price:80,   sell:40,  atk:1,  def:1,  minFloor:1,  rarity:1, desc:'手首を保護する布',   classes:['fighter','thief','ninja'] },
    { id:'studded_gloves', name:'スタッズグローブ', type:'gauntlet',slot:'腕',   price:150,  sell:75,  atk:1,  def:3,  minFloor:3,  rarity:2, desc:'鋲打ちの革手袋',   classes:['fighter','thief','knight'] },
    { id:'chain_gauntlet', name:'鎖の小手',        type:'gauntlet',slot:'腕',   price:350,  sell:175, atk:0,  def:5,  minFloor:5,  rarity:2, desc:'鎖で編まれた小手',   classes:['fighter','knight','lord'] },
    { id:'steel_gauntlet', name:'スチールガントレット',type:'gauntlet',slot:'腕', price:600, sell:300, atk:0,  def:7,  minFloor:8,  rarity:3, desc:'鋼鉄製の小手',     classes:['knight','lord','valkyrie'] },
    { id:'shinobi_kote',   name:'忍の籠手',        type:'gauntlet',slot:'腕',   price:500,  sell:250, atk:2,  def:4,  minFloor:7,  rarity:3, desc:'暗器を隠せる籠手',   classes:['ninja'] },
    { id:'samurai_kote',   name:'侍の籠手',        type:'gauntlet',slot:'腕',   price:700,  sell:350, atk:1,  def:6,  minFloor:9,  rarity:3, desc:'刀の扱いを助ける',   classes:['samurai'] },
    { id:'magic_gloves',   name:'マジックグローブ', type:'gauntlet',slot:'腕',   price:900,  sell:450, atk:2,  def:3,  minFloor:10, rarity:3, desc:'魔法の発動を助ける', classes:['mage','bishop'] },
    { id:'silver_gauntlet',name:'銀の小手',        type:'gauntlet',slot:'腕',   price:1300, sell:650, atk:0,  def:8,  minFloor:12, rarity:4, desc:'邪悪を払う銀の手甲', classes:['knight','lord','valkyrie','priest'] },
    { id:'power_wrist',    name:'パワーリスト',    type:'gauntlet',slot:'腕',   price:1800, sell:900, atk:5,  def:4,  minFloor:14, rarity:4, desc:'筋力を増強する腕輪', classes:['fighter','samurai'] },
    { id:'assassin_glove', name:'暗殺者の手袋',    type:'gauntlet',slot:'腕',   price:1600, sell:800, atk:4,  def:5,  minFloor:13, rarity:4, desc:'手元の狂いを無くす', classes:['ninja','thief'] },
    { id:'dragon_claw',    name:'ドラゴングローブ', type:'gauntlet',slot:'腕',   price:2500, sell:1250,atk:2,  def:11, minFloor:17, rarity:4, desc:'竜の鱗の小手',     classes:['knight','lord','fighter'] },
    { id:'holy_gauntlet',  name:'ホーリーガントレット',type:'gauntlet',slot:'腕', price:4800, sell:2400,atk:1,  def:14, minFloor:20, rarity:5, desc:'聖なる力が宿る',     classes:['knight','lord','valkyrie'] },
    { id:'genji_kote',     name:'源氏の小手',      type:'gauntlet',slot:'腕',   price:5500, sell:2750,atk:3,  def:12, minFloor:21, rarity:5, desc:'二刀流を助ける籠手', classes:['samurai','ninja'] },
    { id:'mithril_gauntlet',name:'ミスリルガントレット',type:'gauntlet',slot:'腕', price:5000, sell:2500,atk:0,  def:15, minFloor:22, rarity:5, desc:'軽くて硬い究極の小手', classes:['knight','lord','fighter'] },
    { id:'archers_glove',  name:'射手の手袋',      type:'gauntlet',slot:'腕',   price:800,  sell:400, atk:3,  def:3,  minFloor:8,  rarity:3, desc:'弓の命中率を上げる', classes:['thief','ninja'] },
    { id:'cursed_glove',   name:'呪われた小手',    type:'gauntlet',slot:'腕',   price:50,   sell:25,  atk:8,  def:2,  minFloor:15, rarity:5, desc:'外れない破壊の小手', classes:['fighter','samurai'] },
    { id:'wisdom_brace',   name:'知恵の腕輪',      type:'gauntlet',slot:'腕',   price:4500, sell:2250,atk:0,  def:10, minFloor:20, rarity:5, desc:'賢者の英知を宿す',   classes:['mage','bishop'] },
    { id:'gauntlet_of_king',name:'王の小手',       type:'gauntlet',slot:'腕',   price:7000, sell:3500,atk:4,  def:16, minFloor:24, rarity:5, desc:'指導者の風格ある小手', classes:['lord'] },
    { id:'diamond_glove',  name:'金剛の手甲',      type:'gauntlet',slot:'腕',   price:6000, sell:3000,atk:0,  def:18, minFloor:23, rarity:5, desc:'金剛石のごとき硬度', classes:['knight','lord'] },

    // ---------------------------------------------------------------
    // Boots (20 items)
    // ---------------------------------------------------------------
    { id:'sandals',        name:'サンダル',        type:'boots',   slot:'足',   price:20,   sell:10,  atk:0,  def:1,  minFloor:0,  rarity:1, desc:'ただの履物',       classes:['mage','priest','bishop','thief'] },
    { id:'cloth_shoes',    name:'布の靴',          type:'boots',   slot:'足',   price:60,   sell:30,  atk:0,  def:2,  minFloor:1,  rarity:1, desc:'歩きやすい靴',     classes:['mage','priest','bishop','thief','ninja'] },
    { id:'heavy_boots',    name:'ヘヴィブーツ',    type:'boots',   slot:'足',   price:350,  sell:175, atk:0,  def:5,  minFloor:4,  rarity:2, desc:'頑丈な厚底靴',     classes:['fighter','knight','lord'] },
    { id:'travelling_boots',name:'旅人の靴',        type:'boots',   slot:'足',   price:400,  sell:200, atk:0,  def:4,  minFloor:5,  rarity:2, desc:'疲れにくい旅の靴',   classes:['thief','priest','valkyrie'] },
    { id:'steel_boots',    name:'スチールブーツ',  type:'boots',   slot:'足',   price:650,  sell:325, atk:0,  def:7,  minFloor:8,  rarity:3, desc:'鋼鉄製の靴',       classes:['knight','lord','fighter'] },
    { id:'ninja_tabi',     name:'忍び足袋',        type:'boots',   slot:'足',   price:700,  sell:350, atk:1,  def:4,  minFloor:7,  rarity:3, desc:'足音を消す足袋',     classes:['ninja'] },
    { id:'winged_boots',   name:'羽根の靴',        type:'boots',   slot:'足',   price:1500, sell:750, atk:0,  def:5,  minFloor:12, rarity:4, desc:'移動速度が上がる',   classes:['thief','ninja','valkyrie'] },
    { id:'silver_boots',   name:'銀の靴',          type:'boots',   slot:'足',   price:1800, sell:900, atk:0,  def:9,  minFloor:13, rarity:4, desc:'聖なる銀の靴',       classes:['knight','lord','valkyrie','priest'] },
    { id:'greaves',        name:'戦士の脛当て',    type:'boots',   slot:'足',   price:1200, sell:600, atk:2,  def:8,  minFloor:10, rarity:3, desc:'前線を守る脛当て',   classes:['fighter','samurai'] },
    { id:'dragon_boots',   name:'ドラゴンブーツ',  type:'boots',   slot:'足',   price:2800, sell:1400,atk:0,  def:13, minFloor:17, rarity:4, desc:'竜の皮の靴',       classes:['knight','lord','fighter'] },
    { id:'spike_boots',    name:'スパイクブーツ',  type:'boots',   slot:'足',   price:1000, sell:500, atk:2,  def:6,  minFloor:9,  rarity:3, desc:'雪山でも滑らない',   classes:['fighter','thief'] },
    { id:'magic_slippers', name:'魔法のスリッパ',  type:'boots',   slot:'足',   price:2200, sell:1100,atk:0,  def:8,  minFloor:15, rarity:4, desc:'宙に浮くような感覚', classes:['mage','bishop'] },
    { id:'holy_boots',     name:'ホーリーブーツ',  type:'boots',   slot:'足',   price:4800, sell:2400,atk:0,  def:16, minFloor:20, rarity:5, desc:'穢れなき聖地への歩み', classes:['knight','lord','valkyrie'] },
    { id:'shadow_step',    name:'影走りの靴',      type:'boots',   slot:'足',   price:5000, sell:2500,atk:3,  def:10, minFloor:21, rarity:5, desc:'残像を残す靴',       classes:['ninja','thief'] },
    { id:'mithril_boots',  name:'ミスリルブーツ',  type:'boots',   slot:'足',   price:5500, sell:2750,atk:0,  def:18, minFloor:22, rarity:5, desc:'伝説の金属の靴',     classes:['knight','lord','fighter'] },
    { id:'genji_tabi',     name:'源氏の足袋',      type:'boots',   slot:'足',   price:6000, sell:3000,atk:2,  def:15, minFloor:23, rarity:5, desc:'異国の名将の足袋',   classes:['samurai','ninja'] },
    { id:'seven_league',   name:'七里ヶ靴',        type:'boots',   slot:'足',   price:8000, sell:4000,atk:0,  def:12, minFloor:24, rarity:5, desc:'一歩で千里を歩む',   classes:['thief','lord'] },
    { id:'adaman_boots',   name:'アダマンブーツ',  type:'boots',   slot:'足',   price:9000, sell:4500,atk:0,  def:22, minFloor:25, rarity:5, desc:'不壊の超硬金属靴',   classes:['knight','lord','fighter'] },
    { id:'glass_shoes',    name:'ガラスの靴',      type:'boots',   slot:'足',   price:4500, sell:2250,atk:0,  def:5,  minFloor:18, rarity:5, desc:'輝くほど美しい靴',   classes:['valkyrie','bishop','priest'] },
    { id:'berserker_leg',  name:'狂戦士の脚甲',    type:'boots',   slot:'足',   price:3800, sell:1900,atk:6,  def:14, minFloor:19, rarity:5, desc:'破壊衝動を高める',   classes:['fighter'] },
    
    // ---------------------------------------------------------------
    // Accessories
    // ---------------------------------------------------------------
    //   アクセサリは効果の希少性・価格・入手フロアを総合して判定。
    //     2 アンコモン : 単純な防御/攻撃強化リング（価格500〜600）
    //     3 レア       : MP強化アミュレット（魔法使い専用の希少性）
    // ---------------------------------------------------------------

    // --- Common & Uncommon (Rarity 1-2) ---
    { id:'copper_ring',    name:'銅の指輪',        type:'ring',    slot:'指輪', price:150,  sell:75,  atk:0,  def:1,  minFloor:1,  rarity:1, desc:'ありふれた指輪',   classes:null },
    { id:'silver_ring',    name:'銀の指輪',        type:'ring',    slot:'指輪', price:300,  sell:150, atk:0,  def:2,  minFloor:3,  rarity:1, desc:'魔除けの銀指輪',   classes:null },
    { id:'iron_amulet',    name:'鉄の護符',        type:'amulet',  slot:'首',   price:400,  sell:200, atk:1,  def:2,  minFloor:4,  rarity:2, desc:'武骨な首飾り',     classes:null },
    { id:'speed_ring',     name:'スピードリング',  type:'ring',    slot:'指輪', price:550,  sell:275, atk:0,  def:0,  minFloor:5,  rarity:2, desc:'身のこなしが軽くなる', classes:null },
    { id:'toughness_belt', name:'タフネスベルト',  type:'belt',    slot:'腰',   price:600,  sell:300, atk:0,  def:4,  minFloor:6,  rarity:2, desc:'HP+10',          classes:null },
    { id:'thief_armlet',   name:'盗賊の腕輪',      type:'armlet',  slot:'腕',   price:700,  sell:350, atk:2,  def:0,  minFloor:7,  rarity:2, desc:'手先が器用になる',   classes:['thief','ninja'] },
    { id:'faith_pendant',  name:'信仰のペンダント', type:'amulet',  slot:'首',   price:650,  sell:325, atk:0,  def:2,  minFloor:6,  rarity:2, desc:'精神を高める',     classes:['priest','bishop'] },
    { id:'poison_guard',   name:'ポイズンガード',  type:'ring',    slot:'指輪', price:800,  sell:400, atk:0,  def:0,  minFloor:5,  rarity:2, desc:'毒耐性+20%',      classes:null },
    { id:'fire_ring',      name:'炎の指輪',        type:'ring',    slot:'指輪', price:900,  sell:450, atk:1,  def:0,  minFloor:8,  rarity:2, desc:'炎耐性+10%',      classes:null },
    { id:'ice_ring',       name:'氷の指輪',        type:'ring',    slot:'指輪', price:900,  sell:450, atk:0,  def:1,  minFloor:8,  rarity:2, desc:'氷耐性+10%',      classes:null },

    // --- Rare (Rarity 3) ---
    { id:'gold_ring',      name:'金の指輪',        type:'ring',    slot:'指輪', price:1200, sell:600, atk:0,  def:5,  minFloor:10, rarity:3, desc:'豪華な金の指輪',   classes:null },
    { id:'ruby_pendant',   name:'紅玉のペンダント', type:'amulet',  slot:'首',   price:1500, sell:750, atk:5,  def:0,  minFloor:11, rarity:3, desc:'攻撃意欲を高める',   classes:null },
    { id:'emerald_pendant',name:'翠玉のペンダント', type:'amulet',  slot:'首',   price:1500, sell:750, atk:0,  def:8,  minFloor:11, rarity:3, desc:'守護の輝き',       classes:null },
    { id:'sapphire_ring',  name:'蒼玉の指輪',      type:'ring',    slot:'指輪', price:1800, sell:900, atk:0,  def:0,  minFloor:12, rarity:3, desc:'MP+30',          classes:['mage','bishop'] },
    { id:'berserk_badge',  name:'狂戦士の証',      type:'charm',   slot:'装飾', price:2000, sell:1000,atk:10, def:-5, minFloor:13, rarity:3, desc:'攻撃+10/防御-5',  classes:['fighter'] },
    { id:'clover_charm',   name:'四葉のチャーム',  type:'charm',   slot:'装飾', price:1400, sell:700, atk:0,  def:0,  minFloor:10, rarity:3, desc:'運が良くなる気がする', classes:null },
    { id:'warrior_symbol', name:'戦士のシンボル',  type:'amulet',  slot:'首',   price:1600, sell:800, atk:4,  def:4,  minFloor:12, rarity:3, desc:'攻防一体の証',     classes:['fighter','knight'] },
    { id:'mage_earring',   name:'魔術師の耳飾り',  type:'earring', slot:'装飾', price:1700, sell:850, atk:0,  def:0,  minFloor:12, rarity:3, desc:'魔法威力が微増',   classes:['mage'] },
    { id:'holy_cross',     name:'聖なる十字架',    type:'amulet',  slot:'首',   price:1900, sell:950, atk:0,  def:5,  minFloor:13, rarity:3, desc:'不死者への特効',   classes:['priest','bishop','lord'] },
    { id:'scout_monocle',  name:'斥候の単眼鏡',    type:'glass',   slot:'装飾', price:1300, sell:650, atk:2,  def:0,  minFloor:11, rarity:3, desc:'命中率アップ',     classes:['thief','ninja'] },

    // --- Epic (Rarity 4) ---
    { id:'diamond_ring',   name:'剛力の指輪',      type:'ring',    slot:'指輪', price:3500, sell:1750,atk:12, def:0,  minFloor:16, rarity:4, desc:'凄まじい力が湧く',   classes:null },
    { id:'guardian_anklet',name:'守護者のアンクレット',type:'anklet',slot:'装飾', price:3200, sell:1600,atk:0,  def:15, minFloor:15, rarity:4, desc:'鉄壁の守り',       classes:null },
    { id:'wizard_circlet', name:'魔導の額当て',    type:'circlet', slot:'頭',   price:3800, sell:1900,atk:0,  def:2,  mp:50, minFloor:17, rarity:4, desc:'MP+50/魔力増幅', classes:['mage','bishop'] },
    { id:'vampire_cape',   name:'吸血鬼のマント',  type:'cape',    slot:'肩',   price:4200, sell:2100,atk:5,  def:5,  minFloor:18, rarity:4, desc:'攻撃時にHPを吸収',  classes:['thief','ninja'] },
    { id:'fairy_dust',     name:'妖精の粉',        type:'charm',   slot:'装飾', price:3000, sell:1500,atk:0,  def:0,  minFloor:15, rarity:4, desc:'状態異常耐性+30%',  classes:null },
    { id:'atlas_belt',     name:'アトラスの帯',    type:'belt',    slot:'腰',   price:4500, sell:2250,atk:15, def:5,  minFloor:20, rarity:4, desc:'巨人の力を宿すベルト', classes:['fighter'] },
    { id:'spirit_beads',   name:'精霊の数珠',      type:'amulet',  slot:'首',   price:3600, sell:1800,atk:0,  def:10, minFloor:18, rarity:4, desc:'属性魔法ダメージ軽減', classes:['priest','bishop'] },
    { id:'black_black',    name:'漆黒のピアス',    type:'earring', slot:'装飾', price:3400, sell:1700,atk:8,  def:0,  minFloor:17, rarity:4, desc:'クリティカル率アップ', classes:['ninja','thief'] },
    { id:'valor_medal',    name:'勇気の勲章',      type:'medal',   slot:'装飾', price:4000, sell:2000,atk:6,  def:6,  minFloor:19, rarity:4, desc:'全ての能力を底上げ', classes:null },
    { id:'mystic_mirror',  name:'神秘の手鏡',      type:'charm',   slot:'装飾', price:3300, sell:1650,atk:0,  def:12, minFloor:16, rarity:4, desc:'幻惑を無効化する',   classes:null },

    // --- Legendary (Rarity 5) ---
    { id:'solomon_ring',   name:'ソロモンの指輪',  type:'ring',    slot:'指輪', price:8500, sell:4250,atk:0,  def:10, mp:100, minFloor:25, rarity:5, desc:'万物の声を聴く',    classes:null },
    { id:'dragon_eye',     name:'竜の眼',          type:'amulet',  slot:'首',   price:9000, sell:4500,atk:25, def:10, minFloor:28, rarity:5, desc:'全てを射抜く眼光',   classes:null },
    { id:'goddess_tear',   name:'女神の涙',        type:'amulet',  slot:'首',   price:9500, sell:4750,atk:0,  def:0,  mp:200, minFloor:30, rarity:5, desc:'MPを全回復させる奇跡', classes:['priest','bishop'] },
    { id:'hero_cloak',     name:'勇者のマント',    type:'cloak',   slot:'肩',   price:8800, sell:4400,atk:15, def:15, minFloor:25, rarity:5, desc:'伝説の勇者の外套',   classes:['lord'] },
    { id:'muramasa_charm', name:'村正の目貫',      type:'charm',   slot:'装飾', price:9200, sell:4600,atk:30, def:-10,minFloor:28, rarity:5, desc:'一撃必殺の力を宿す',  classes:['samurai'] },
    { id:'phoenix_feather',name:'不死鳥の尾羽',    type:'charm',   slot:'装飾', price:8000, sell:4000,atk:0,  def:0,  minFloor:22, rarity:5, desc:'一度だけ自動蘇生',   classes:null },
    { id:'odin_eye',       name:'オーディンの魔眼', type:'amulet',  slot:'首',   price:9800, sell:4900,atk:20, def:20, minFloor:30, rarity:5, desc:'神の知恵と力',       classes:null },
    { id:'yggdrasil_leaf', name:'世界樹の葉',      type:'charm',   slot:'装飾', price:7500, sell:3750,atk:0,  def:30, minFloor:20, rarity:5, desc:'強力な再生能力',     classes:null },
    { id:'ribbon_accessory',name:'守護のリボン',   type:'ribbon',  slot:'装飾', price:9999, sell:5000,atk:0,  def:10, minFloor:25, rarity:5, desc:'全ての状態異常を無効', classes:null },
    { id:'chronos_watch',  name:'刻の砂時計',      type:'charm',   slot:'装飾', price:9000, sell:4500,atk:0,  def:0,  minFloor:28, rarity:5, desc:'二回行動を可能にする', classes:null },
    { id:'dark_nebula',    name:'闇の星雲',        type:'amulet',  slot:'首',   price:8200, sell:4100,atk:35, def:-20,minFloor:26, rarity:5, desc:'破滅を呼ぶ闇の魔力',  classes:['mage','ninja'] },
    { id:'sun_bracer',     name:'太陽の腕輪',      type:'armlet',  slot:'腕',   price:8400, sell:4200,atk:18, def:18, minFloor:24, rarity:5, desc:'太陽の如き生命力',   classes:null },
    { id:'moon_earring',   name:'月の耳飾り',      type:'earring', slot:'装飾', price:8400, sell:4200,atk:10, def:10, mp:80, minFloor:24, rarity:5, desc:'静寂の魔力',        classes:null },
    { id:'kings_soul',     name:'覇王の魂',        type:'charm',   slot:'装飾', price:9999, sell:5000,atk:40, def:0,  minFloor:30, rarity:5, desc:'周囲を威圧する覇気',   classes:['lord','fighter'] },
    { id:'heaven_scroll',  name:'天界の巻物',      type:'charm',   slot:'装飾', price:8600, sell:4300,atk:0,  def:0,  minFloor:24, rarity:5, desc:'究極魔法の使用許可',   classes:['bishop'] },
    { id:'demon_contract', name:'悪魔の契約書',    type:'charm',   slot:'装飾', price:7777, sell:3888,atk:66, def:-66,minFloor:20, rarity:5, desc:'命と引き換えの超火力',  classes:['mage','ninja'] },
    { id:'valkyrie_wing',  name:'戦乙女の羽飾り',  type:'charm',   slot:'装飾', price:8800, sell:4400,atk:15, def:15, minFloor:25, rarity:5, desc:'神域への導き',       classes:['valkyrie'] },
    { id:'ninja_scroll_ex',name:'極意の巻物',      type:'charm',   slot:'装飾', price:8000, sell:4000,atk:20, def:0,  minFloor:23, rarity:5, desc:'全ての忍術を極める',   classes:['ninja'] },
    { id:'aegis_talisman', name:'アイギスの守護',  type:'amulet',  slot:'首',   price:9200, sell:4600,atk:0,  def:50, minFloor:28, rarity:5, desc:'絶対的な物理防御',   classes:['knight','lord'] },
    { id:'chaos_orb',      name:'カオスオーブ',    type:'charm',   slot:'装飾', price:9999, sell:5000,atk:25, def:25, minFloor:30, rarity:5, desc:'理を外れた混沌の力',   classes:null },

    // ---------------------------------------------------------------
    // Consumables（消耗品 — 鍛冶屋対象外のため rarity 未設定）
    // ---------------------------------------------------------------
    { id:'healing_herb',   name:'ヒーリングハーブ', type:'potion',  slot:null,   price:30,   sell:10,  heal:20,   minFloor:0, desc:'HP20回復',   classes:null },
    { id:'mega_herb',      name:'メガハーブ',        type:'potion',  slot:null,   price:100,  sell:30,  heal:50,   minFloor:4, desc:'HP50回復',   classes:null },
    { id:'mp_potion',      name:'マジックポーション',type:'potion',  slot:null,   price:80,   sell:25,  mpHeal:15, minFloor:3, desc:'MP15回復',   classes:null },
    { id:'antidote',       name:'どくけし草',        type:'potion',  slot:null,   price:50,   sell:15,  cure:'poison',minFloor:0,desc:'毒を治す',   classes:null },
    { id:'scroll_fire',    name:'ファイアスクロール',type:'scroll',  slot:null,   price:120,  sell:40,  spellId:'halito',minFloor:0,desc:'炎の魔法', classes:null },
    { id:'escape_wing',    name:'脱出の翼',          type:'misc',    slot:null,   price:200,  sell:50,  escape:true, minFloor:0, desc:'地上に戻る', classes:null }
  ],

  // ==================== MONSTERS ====================
  // モンスターデータベース。ダンジョンでの出現・戦闘・仲間加入を制御する。
  //
  // 各フィールドの意味:
  //   id        : モンスターの識別子。GS.battleState / GS.monsters で参照。
  //   name      : 表示名
  //   race      : 種族ID。monsterRaces[].id を参照。
  //               getMonsterRace(m.race) で種族オブジェクト取得。
  //   rank      : ランク値（1〜99 の整数）。強さの指標。floor とは独立。
  //               getMonsterRank(m.rank) で F〜SSS のランクオブジェクトを取得できる。
  //               → ランクオブジェクトの使い道は monsterRanks セクションを参照。
  //   floor     : 出現開始フロア（1〜）。rank とは独立した単なる出現条件。
  //   hp        : 最大HP（実際の出現時は乱数で増減する場合あり）
  //   atk       : 攻撃力
  //   def       : 防御力
  //   exp       : 撃破時の獲得経験値（expMult で倍率補正が可能）
  //   gold      : 撃破時の獲得ゴールド
  //   joinRate  : 仲間加入を申し出る確率（0〜100 の整数、%）。
  //               system_dungeon.js 側で × 0.5 して最終確率を算出している。
  //               joinable:false の場合は参照されない。
  //   joinable  : true の場合のみ仲間加入イベントが発生しうる
  //   img       : UI 表示用の絵文字
  //   abilities : 特殊能力IDの配列（例: 'poison', 'drain', 'breath'）
  //   group     : 難易度表示用のグループラベル（'弱'/'中'/'強'/'超強'）
  //   drops     : 撃破時にドロップするアイテムIDの配列（items[].id を参照）
  monsters: [
// ===============================================================
    // Monsters Data (Total: Approx 500 Planning)
    // ===============================================================

    // ---------------------------------------------------------------
    // Floor 1-3: 初心者の試練 (nature, beast, insect)
    // ---------------------------------------------------------------
    { id:'green_slime', name:'グリーンスライム', race:'nature', rank:2, floor:1, hp:6, atk:2, def:1, exp:3, gold:2, joinRate:30, joinable:true, img:'🟢', abilities:[], group:'弱', drops:[] },
    { id:'horn_rabbit', name:'いっかくうさぎ', race:'beast', rank:4, floor:1, hp:10, atk:4, def:1, exp:5, gold:4, joinRate:20, joinable:true, img:'🐇', abilities:['quick'], group:'弱', drops:['healing_herb'] },
    { id:'giant_rat', name:'大ネズミ', race:'beast', rank:3, floor:1, hp:9, atk:4, def:1, exp:4, gold:3, joinRate:20, joinable:true, img:'🐀', abilities:[], group:'弱', drops:[] },
    { id:'baby_bee', name:'ベビービー', race:'insect', rank:3, floor:1, hp:7, atk:5, def:0, exp:5, gold:2, joinRate:25, joinable:true, img:'🐝', abilities:['poison'], group:'弱', drops:[] },
    { id:'wild_dog', name:'野犬', race:'beast', rank:5, floor:2, hp:15, atk:7, def:2, exp:8, gold:5, joinRate:15, joinable:true, img:'🐕', abilities:[], group:'弱', drops:[] },
    { id:'poison_frog', name:'おおがえる', race:'nature', rank:6, floor:2, hp:18, atk:6, def:3, exp:10, gold:6, joinRate:15, joinable:true, img:'🐸', abilities:['poison'], group:'弱', drops:['antidote'] },
    { id:'man_eater_plant', name:'人喰い草', race:'nature', rank:8, floor:2, hp:22, atk:9, def:4, exp:12, gold:8, joinRate:10, joinable:true, img:'🌱', abilities:['bind'], group:'弱', drops:[] },
    { id:'stray_cat', name:'のらねこ', race:'beast', rank:5, floor:2, hp:14, atk:8, def:1, exp:9, gold:10, joinRate:18, joinable:true, img:'🐈', abilities:['quick'], group:'弱', drops:[] },
    { id:'killer_bee', name:'キラービー', race:'insect', rank:10, floor:3, hp:25, atk:11, def:3, exp:18, gold:12, joinRate:12, joinable:true, img:'🐝', abilities:['paralyze'], group:'中', drops:['antidote'] },
    { id:'goblin', name:'ゴブリン', race:'beast', rank:12, floor:3, hp:28, atk:10, def:5, exp:20, gold:20, joinRate:15, joinable:true, img:'👺', abilities:[], group:'中', drops:['dagger'] },
    { id:'giant_spider', name:'大クモ', race:'insect', rank:13, floor:3, hp:32, atk:13, def:4, exp:22, gold:15, joinRate:10, joinable:true, img:'🕷️', abilities:['web'], group:'中', drops:[] },

    // ---------------------------------------------------------------
    // Floor 4-6: 迷宮の洗礼 (undead, beast, machine)
    // ---------------------------------------------------------------
    { id:'ghost', name:'ゴースト', race:'undead', rank:15, floor:4, hp:20, atk:12, def:10, exp:30, gold:25, joinRate:5, joinable:true, img:'👻', abilities:['magic_guard'], group:'中', drops:[] },
    { id:'skeleton_warrior', name:'骸骨戦士', race:'undead', rank:18, floor:4, hp:45, atk:16, def:8, exp:45, gold:30, joinRate:8, joinable:true, img:'💀', abilities:[], group:'中', drops:['short_sword'] },
    { id:'werewolf', name:'ワーウルフ', race:'beast', rank:22, floor:5, hp:55, atk:22, def:6, exp:65, gold:45, joinRate:5, joinable:true, img:'🐺', abilities:['double_attack'], group:'中', drops:[] },
    { id:'copper_doll', name:'銅の人形', race:'machine', rank:25, floor:5, hp:60, atk:18, def:20, exp:80, gold:50, joinRate:0, joinable:false, img:'🤖', abilities:[], group:'中', drops:['bronze_axe'] },
    { id:'fire_lizard', name:'火とかげ', race:'beast', rank:24, floor:5, hp:50, atk:20, def:12, exp:75, gold:40, joinRate:6, joinable:true, img:'🦎', abilities:['fire_breath'], group:'中', drops:[] },
    { id:'shadow', name:'シャドウ', race:'undead', rank:26, floor:6, hp:35, atk:25, def:5, exp:90, gold:60, joinRate:4, joinable:true, img:'👤', abilities:['dark_magic'], group:'中', drops:[] },
    { id:'harpy', name:'ハーピー', race:'beast', rank:23, floor:6, hp:48, atk:19, def:8, exp:70, gold:55, joinRate:10, joinable:true, img:'🦅', abilities:['wind_magic'], group:'中', drops:['feather_hat'] },

    // ---------------------------------------------------------------
    // Floor 7-10: 深緑と岩石 (nature, giant, magic)
    // ---------------------------------------------------------------
    { id:'wood_golem', name:'ウッドゴーレム', race:'nature', rank:32, floor:7, hp:90, atk:25, def:15, exp:120, gold:80, joinRate:2, joinable:true, img:'🪵', abilities:[], group:'強', drops:[] },
    { id:'centaur', name:'ケンタウロス', race:'beast', rank:35, floor:7, hp:85, atk:28, def:12, exp:140, gold:100, joinRate:5, joinable:true, img:'🐎', abilities:['quick'], group:'強', drops:['short_bow'] },
    { id:'evil_eye', name:'イービルアイ', race:'yokai', rank:38, floor:8, hp:70, atk:30, def:10, exp:160, gold:120, joinRate:3, joinable:true, img:'👁️', abilities:['confuse'], group:'強', drops:['crystal_wand'] },
    { id:'ogre', name:'オーガ', race:'beast', rank:42, floor:8, hp:130, atk:35, def:18, exp:200, gold:150, joinRate:3, joinable:true, img:'👹', abilities:['heavy_hit'], group:'強', drops:['war_hammer'] },
    { id:'mimic_weak', name:'ミミック', race:'nature', rank:40, floor:8, hp:60, atk:40, def:25, exp:300, gold:500, joinRate:0, joinable:false, img:'📦', abilities:['ambush'], group:'強', drops:['iron_shield'] },
    { id:'cockatrice', name:'コカトリス', race:'beast', rank:45, floor:9, hp:95, atk:32, def:14, exp:220, gold:140, joinRate:2, joinable:true, img:'🐓', abilities:['stone'], group:'強', drops:[] },
    { id:'wyrm', name:'ワーム', race:'nature', rank:48, floor:9, hp:110, atk:38, def:20, exp:250, gold:180, joinRate:1, joinable:true, img:'🐉', abilities:['breath'], group:'強', drops:[] },
    { id:'blue_dragon', name:'ブルードラゴン', race:'nature', rank:60, floor:10, hp:200, atk:50, def:25, exp:500, gold:400, joinRate:1, joinable:true, img:'🐲', abilities:['ice_breath'], group:'強', drops:['sapphire_staff'] },

    // ---------------------------------------------------------------
    // Floor 11-15: 死霊の宮殿 (undead, demon, dark)
    // ---------------------------------------------------------------
    { id:'wraith', name:'レイス', race:'undead', rank:52, floor:11, hp:100, atk:42, def:15, exp:350, gold:200, joinRate:2, joinable:false, img:'👻', abilities:['drain'], group:'強', drops:[] },
    { id:'bone_knight', name:'ボーンナイト', race:'undead', rank:55, floor:11, hp:140, atk:45, def:22, exp:400, gold:250, joinRate:3, joinable:true, img:'🏇', abilities:[], group:'強', drops:['knight_shield'] },
    { id:'succubus', name:'サキュバス', race:'demon', rank:58, floor:12, hp:120, atk:40, def:18, exp:450, gold:500, joinRate:2, joinable:true, img:'💋', abilities:['charm','drain'], group:'強', drops:['silk_robe'] },
    { id:'headless_rider', name:'首なし騎士', race:'undead', rank:65, floor:13, hp:180, atk:55, def:25, exp:600, gold:400, joinRate:1, joinable:false, img:'🏇', abilities:['critical'], group:'超強', drops:['heavy_halberd'] },
    { id:'beholder', name:'ビホルダー', race:'yokai', rank:68, floor:14, hp:150, atk:48, def:20, exp:700, gold:600, joinRate:1, joinable:false, img:'🔮', abilities:['magic_all','stone'], group:'超強', drops:['wizard_staff'] },
    { id:'cerberus', name:'ケルベロス', race:'beast', rank:70, floor:15, hp:220, atk:60, def:24, exp:800, gold:500, joinRate:1, joinable:true, img:'🐕‍🦺', abilities:['fire_breath','triple_attack'], group:'超強', drops:[] },

    // ---------------------------------------------------------------
    // 属性スライム亜種 (バリエーション補充用)
    // ---------------------------------------------------------------
    { id:'red_slime', name:'レッドスライム', race:'nature', rank:10, floor:4, hp:30, atk:15, def:5, exp:40, gold:30, joinRate:20, joinable:true, img:'🔴', abilities:['fire'], group:'中', drops:[] },
    { id:'blue_slime', name:'ブルースライム', race:'nature', rank:10, floor:4, hp:35, atk:12, def:8, exp:40, gold:30, joinRate:20, joinable:true, img:'🔵', abilities:['ice'], group:'中', drops:[] },
    { id:'metal_slime', name:'メタルスライム', race:'nature', rank:50, floor:5, hp:4, atk:10, def:999, exp:3000, gold:100, joinRate:1, joinable:true, img:'💿', abilities:['quick','escape'], group:'特殊', drops:['silver_ring'] },
    { id:'king_slime', name:'キングスライム', race:'nature', rank:40, floor:10, hp:300, atk:35, def:20, exp:800, gold:200, joinRate:5, joinable:true, img:'👑', abilities:['heavy_hit'], group:'強', drops:[] },

    // ---------------------------------------------------------------
    // 亜人バリエーション (Floor 5-15)
    // ---------------------------------------------------------------
    { id:'goblin_archer', name:'ゴブリンアーチャー', race:'beast', rank:18, floor:5, hp:40, atk:22, def:6, exp:50, gold:40, joinRate:10, joinable:true, img:'🏹', abilities:[], group:'中', drops:['short_bow'] },
    { id:'goblin_mage', name:'ゴブリンメイジ', race:'beast', rank:20, floor:6, hp:35, atk:25, def:5, exp:60, gold:60, joinRate:8, joinable:true, img:'🧙', abilities:['magic'], group:'中', drops:['staff'] },
    { id:'orc_king', name:'オークキング', race:'beast', rank:45, floor:12, hp:250, atk:55, def:30, exp:1000, gold:800, joinRate:2, joinable:true, img:'🐗', abilities:['rage'], group:'強', drops:['great_axe'] },

    // ---------------------------------------------------------------
    // Floor 16-20: 機械とゴーレムの廃都 (machine, nature)
    // ---------------------------------------------------------------
    { id:'iron_golem', name:'アイアンゴーレム', race:'nature', rank:72, floor:16, hp:300, atk:70, def:45, exp:1200, gold:400, joinRate:0, joinable:false, img:'🤖', abilities:['heavy_hit'], group:'超強', drops:['iron_gauntlet'] },
    { id:'clockwork_knight', name:'ゼンマイ騎士', race:'machine', rank:68, floor:16, hp:180, atk:65, def:38, exp:900, gold:600, joinRate:0, joinable:false, img:'⚙️', abilities:['quick'], group:'強', drops:['steel_boots'] },
    { id:'scout_drone', name:'偵察ドローン', race:'machine', rank:60, floor:17, hp:120, atk:55, def:30, exp:750, gold:350, joinRate:0, joinable:false, img:'🛸', abilities:['laser'], group:'強', drops:[] },
    { id:'living_armor', name:'さまよう鎧', race:'undead', rank:75, floor:18, hp:220, atk:75, def:50, exp:1500, gold:500, joinRate:5, joinable:true, img:'🛡️', abilities:['counter'], group:'超強', drops:['knight_plate'] },
    { id:'mithril_golem', name:'ミスリルゴーレム', race:'nature', rank:85, floor:20, hp:500, atk:90, def:80, exp:3000, gold:2000, joinRate:0, joinable:false, img:'💎', abilities:['magic_reflect'], group:'超強', drops:['mithril_armor'] },

    // ---------------------------------------------------------------
    // Floor 21-30: 魔界の深淵 (demon, undead, darkgod)
    // ---------------------------------------------------------------
    { id:'greater_demon', name:'グレーターデーモン', race:'demon', rank:88, floor:21, hp:400, atk:110, def:45, exp:2500, gold:1200, joinRate:1, joinable:true, img:'👿', abilities:['dark_fire','multi_attack'], group:'超強', drops:['demon_armor'] },
    { id:'death_knight', name:'デスナイト', race:'undead', rank:86, floor:22, hp:350, atk:120, def:60, exp:2800, gold:1500, joinRate:2, joinable:true, img:'🏇', abilities:['death_strike'], group:'超強', drops:['death_sword'] },
    { id:'medusa_queen', name:'メデューサクイーン', race:'yokai', rank:82, floor:23, hp:320, atk:95, def:40, exp:2200, gold:1800, joinRate:3, joinable:true, img:'🐍', abilities:['stone_all'], group:'超強', drops:['mirror_shield'] },
    { id:'abyss_worm', name:'アビスワーム', race:'nature', rank:84, floor:24, hp:450, atk:105, def:55, exp:2600, gold:1000, joinRate:0, joinable:false, img:'🐛', abilities:['swallow'], group:'超強', drops:[] },
    { id:'vampire_lord', name:'ヴァンパイアロード', race:'undead', rank:92, floor:25, hp:500, atk:130, def:50, exp:5000, gold:3000, joinRate:1, joinable:false, img:'🧛', abilities:['drain_all','dark_magic'], group:'超強', drops:['vampire_cape'] },
    { id:'arch_demon', name:'アークデーモン', race:'demon', rank:95, floor:28, hp:600, atk:150, def:70, exp:8000, gold:5000, joinRate:0, joinable:false, img:'👺', abilities:['meteor','dark_fire'], group:'超強', drops:['dark_nebula'] },

    // ---------------------------------------------------------------
    // Floor 31-40: 聖域と精霊 (holy, valkyrie, nature)
    // ---------------------------------------------------------------
    { id:'angel_soldier', name:'天使の兵士', race:'holy', rank:85, floor:31, hp:400, atk:120, def:80, exp:4000, gold:1000, joinRate:2, joinable:true, img:'👼', abilities:['holy_magic'], group:'超強', drops:['holy_shield'] },
    { id:'arc_angel', name:'大天使', race:'holy', rank:90, floor:33, hp:600, atk:160, def:90, exp:7000, gold:2000, joinRate:1, joinable:true, img:'🧚', abilities:['resurrection'], group:'超強', drops:['holy_armor'] },
    { id:'silver_dragon', name:'シルバードラゴン', race:'nature', rank:94, floor:35, hp:1000, atk:200, def:100, exp:15000, gold:8000, joinRate:1, joinable:true, img:'🐉', abilities:['holy_breath'], group:'最恐', drops:['silver_boots'] },
    { id:'valkyrie_spirit', name:'戦乙女の魂', race:'holy', rank:92, floor:37, hp:550, atk:180, def:85, exp:9000, gold:3000, joinRate:2, joinable:true, img:'🛡️', abilities:['multi_attack'], group:'超強', drops:['valkyrie_helm'] },
    { id:'spirit_of_light', name:'光の精霊', race:'nature', rank:88, floor:38, hp:300, atk:140, def:150, exp:8500, gold:2500, joinRate:5, joinable:true, img:'✨', abilities:['magic_reflect'], group:'超強', drops:['sun_bracer'] },

    // ---------------------------------------------------------------
    // Floor 41-50: 神話の終焉 (darkgod, dragon, chaos)
    // ---------------------------------------------------------------
    { id:'behemoth', name:'ベヒモス', race:'beast', rank:96, floor:41, hp:2000, atk:250, def:120, exp:25000, gold:10000, joinRate:0, joinable:false, img:'🦏', abilities:['earthquake','heavy_hit'], group:'最恐', drops:[] },
    { id:'leviathan', name:'リヴァイアサン', race:'nature', rank:97, floor:43, hp:1800, atk:230, def:130, exp:28000, gold:12000, joinRate:0, joinable:false, img:'🐳', abilities:['tsunami','ice_breath'], group:'最恐', drops:[] },
    { id:'bahamut', name:'バハムート', race:'nature', rank:99, floor:45, hp:3000, atk:350, def:150, exp:50000, gold:20000, joinRate:1, joinable:true, img:'🐲', abilities:['mega_flare','breath'], group:'最恐', drops:['dragon_eye'] },
    { id:'lucifer', name:'ルシファー', race:'darkgod', rank:100, floor:48, hp:5000, atk:450, def:200, exp:99999, gold:50000, joinRate:0, joinable:false, img:'😈', abilities:['fallen_angel','dark_magic'], group:'最恐', drops:['hero_cloak'] },
    { id:'omega_weapon', name:'オメガウェポン', race:'machine', rank:100, floor:50, hp:8000, atk:600, def:300, exp:150000, gold:99999, joinRate:0, joinable:false, img:'🤖', abilities:['wave_cannon','flare'], group:'神', drops:['chronos_watch'] },

    // ---------------------------------------------------------------
    // 亜種・色違い・レア個体 (スライム・その他)
    // ---------------------------------------------------------------
    { id:'yellow_slime', name:'イエロースライム', race:'nature', rank:15, floor:6, hp:50, atk:20, def:10, exp:60, gold:50, joinRate:25, joinable:true, img:'🟡', abilities:['thunder'], group:'中', drops:[] },
    { id:'black_slime', name:'ブラックスライム', race:'nature', rank:25, floor:12, hp:100, atk:40, def:20, exp:200, gold:100, joinRate:15, joinable:true, img:'⚫', abilities:['dark'], group:'強', drops:[] },
    { id:'platinum_slime', name:'プラチナスライム', race:'nature', rank:80, floor:30, hp:10, atk:30, def:2000, exp:50000, gold:1000, joinRate:1, joinable:true, img:'⚪', abilities:['quick','escape'], group:'特殊', drops:['diamond_ring'] },
    { id:'gold_goblin', name:'ゴールドゴブリン', race:'beast', rank:30, floor:8, hp:80, atk:25, def:15, exp:100, gold:5000, joinRate:5, joinable:true, img:'🟡', abilities:['escape'], group:'特殊', drops:['gold_ring'] },
    { id:'dark_stalker', name:'ダークストーカー', race:'ninja', rank:65, floor:18, hp:150, atk:80, def:20, exp:1200, gold:800, joinRate:5, joinable:true, img:'👤', abilities:['assassinate'], group:'強', drops:['ninja_garb'] },

    // ---------------------------------------------------------------
    // 和風・侍・忍者系 (Floor 10-30)
    // ---------------------------------------------------------------
    { id:'ronin', name:'浪人', race:'human', rank:35, floor:10, hp:120, atk:45, def:20, exp:250, gold:150, joinRate:10, joinable:true, img:'⚔️', abilities:['counter'], group:'中', drops:['uchigatana'] },
    { id:'oni', name:'赤鬼', race:'yokai', rank:45, floor:12, hp:250, atk:60, def:30, exp:500, gold:300, joinRate:5, joinable:true, img:'👹', abilities:['rage'], group:'強', drops:['war_hammer'] },
    { id:'ao_oni', name:'青鬼', race:'yokai', rank:45, floor:12, hp:220, atk:55, def:40, exp:500, gold:300, joinRate:5, joinable:true, img:'👺', abilities:['ice_magic'], group:'強', drops:[] },
    { id:'tengu', name:'天狗', race:'yokai', rank:55, floor:15, hp:180, atk:65, def:35, exp:800, gold:500, joinRate:3, joinable:true, img:'🎭', abilities:['wind_magic','quick'], group:'強', drops:['fan'] },
    { id:'kunoichi', name:'くのいち', race:'human', rank:60, floor:18, hp:150, atk:75, def:25, exp:1000, gold:600, joinRate:5, joinable:true, img:'👤', abilities:['poison','double_attack'], group:'強', drops:['shinobi_kote'] },
    { id:'daimyo', name:'大名', race:'human', rank:85, floor:25, hp:600, atk:120, def:80, exp:5000, gold:10000, joinRate:1, joinable:true, img:'🏯', abilities:['command'], group:'超強', drops:['tousen_gusoku'] },

    // ---------------------------------------------------------------
    // Floor 26-35: 古代の遺跡と封印された獣 (ancient, holy, nature)
    // ---------------------------------------------------------------
    { id:'ancient_armor', name:'古代の動く鎧', race:'machine', rank:80, floor:26, hp:350, atk:95, def:70, exp:2000, gold:800, joinRate:2, joinable:true, img:'🛡️', abilities:['magic_guard'], group:'超強', drops:['heavy_plate'] },
    { id:'sphinx', name:'スフィンクス', race:'beast', rank:82, floor:27, hp:400, atk:100, def:60, exp:2500, gold:1500, joinRate:1, joinable:false, img:'🦁', abilities:['riddle','stone'], group:'超強', drops:['wisdom_brace'] },
    { id:'mummy_lord', name:'ミイラ男の王', race:'undead', rank:78, floor:28, hp:450, atk:90, def:55, exp:2200, gold:1200, joinRate:5, joinable:true, img:'🤕', abilities:['curse'], group:'超強', drops:['holy_cross'] },
    { id:'chimera_king', name:'キングキマイラ', race:'beast', rank:85, floor:30, hp:600, atk:120, def:65, exp:3500, gold:2000, joinRate:2, joinable:true, img:'🦁', abilities:['fire_breath','poison_sting'], group:'超強', drops:[] },
    { id:'medusa_eye', name:'メデューサアイ', race:'yokai', rank:75, floor:32, hp:200, atk:85, def:100, exp:1800, gold:900, joinRate:5, joinable:true, img:'👁️', abilities:['stone'], group:'超強', drops:['mirror_shield'] },
    { id:'titania', name:'ティターニア', race:'nature', rank:88, floor:35, hp:300, atk:130, def:80, exp:4500, gold:3000, joinRate:5, joinable:true, img:'🧚', abilities:['magic_all','heal'], group:'超強', drops:['fairy_dust'] },

    // ---------------------------------------------------------------
    // Floor 36-45: 神域・終焉のカウントダウン (holy, dragon, darkgod)
    // ---------------------------------------------------------------
    { id:'valkyrie_knight', name:'戦乙女の騎士', race:'holy', rank:92, floor:36, hp:500, atk:160, def:100, exp:8000, gold:4000, joinRate:2, joinable:true, img:'🤺', abilities:['holy_strike'], group:'最恐', drops:['valkyrie_dress'] },
    { id:'dark_paladin', name:'暗黒騎士', race:'human', rank:94, floor:38, hp:700, atk:190, def:120, exp:12000, gold:5000, joinRate:1, joinable:true, img:'🏇', abilities:['dark_magic','counter'], group:'最恐', drops:['demon_armor'] },
    { id:'fenrir', name:'フェンリル', race:'beast', rank:95, floor:40, hp:1200, atk:220, def:90, exp:20000, gold:7000, joinRate:1, joinable:true, img:'🐺', abilities:['ice_breath','quick'], group:'最恐', drops:[] },
    { id:'great_demon_lord', name:'大魔王の影', race:'demon', rank:98, floor:45, hp:2500, atk:300, def:140, exp:40000, gold:30000, joinRate:0, joinable:false, img:'👿', abilities:['meteor','drain_all'], group:'最恐', drops:['kings_soul'] },

    // ---------------------------------------------------------------
    // 属性ドラゴン・バリエーション (各種25階以降の中ボス〜雑魚)
    // ---------------------------------------------------------------
    { id:'fire_dragon', name:'ファイアドラゴン', race:'nature', rank:85, floor:25, hp:800, atk:150, def:80, exp:8000, gold:4000, joinRate:1, joinable:true, img:'🔥', abilities:['fire_breath'], group:'超強', drops:['fire_armor'] },
    { id:'ice_dragon', name:'アイスドラゴン', race:'nature', rank:85, floor:26, hp:850, atk:140, def:90, exp:8000, gold:4000, joinRate:1, joinable:true, img:'❄️', abilities:['ice_breath'], group:'超強', drops:['ice_armor'] },
    { id:'storm_dragon', name:'ストームドラゴン', race:'nature', rank:88, floor:28, hp:750, atk:170, def:70, exp:9000, gold:4500, joinRate:1, joinable:true, img:'⚡', abilities:['thunder_breath'], group:'超強', drops:[] },
    { id:'earth_dragon', name:'アースドラゴン', race:'nature', rank:90, floor:30, hp:1200, atk:160, def:120, exp:10000, gold:5000, joinRate:1, joinable:true, img:'⛰️', abilities:['earthquake'], group:'超強', drops:[] },
    { id:'chaos_dragon', name:'カオスドラゴン', race:'nature', rank:98, floor:48, hp:4000, atk:400, def:180, exp:70000, gold:50000, joinRate:1, joinable:true, img:'🧿', abilities:['chaos_breath','multi_attack'], group:'神', drops:['chaos_orb'] },

    // ---------------------------------------------------------------
    // 特殊能力・妨害・レア系 (テクニカル枠)
    // ---------------------------------------------------------------
    { id:'medusa_statue', name:'石像の乙女', race:'nature', rank:30, floor:10, hp:100, atk:10, def:80, exp:500, gold:200, joinRate:5, joinable:true, img:'🗿', abilities:['stone'], group:'中', drops:[] },
    { id:'curse_book', name:'呪いの魔導書', race:'yokai', rank:45, floor:15, hp:50, atk:45, def:30, exp:800, gold:1000, joinRate:10, joinable:true, img:'📖', abilities:['magic_all','curse'], group:'強', drops:['magic_robe'] },
    { id:'phantom_thief', name:'ファントムシーフ', race:'human', rank:55, floor:18, hp:120, atk:60, def:30, exp:1200, gold:2000, joinRate:5, joinable:true, img:'🎭', abilities:['steal','escape'], group:'強', drops:['thief_armlet'] },
    { id:'energy_vampire', name:'エナジーヴヴ', race:'undead', rank:70, floor:24, hp:200, atk:80, def:40, exp:2500, gold:1000, joinRate:1, joinable:false, img:'🦇', abilities:['drain_mp'], group:'超強', drops:[] },
    { id:'luck_rabbit', name:'ラッキーラビット', race:'beast', rank:1, floor:1, hp:5, atk:1, def:0, exp:1000, gold:1000, joinRate:50, joinable:true, img:'🐇', abilities:['escape'], group:'弱', drops:['clover_charm'] },

    // ---------------------------------------------------------------
    // 亜人・エリート兵（数稼ぎと装備ドロップ用）
    // ---------------------------------------------------------------
    { id:'orc_general', name:'オーク将軍', race:'beast', rank:60, floor:16, hp:400, atk:90, def:45, exp:1800, gold:800, joinRate:5, joinable:true, img:'🐗', abilities:['command'], group:'強', drops:['heavy_plate'] },
    { id:'lizard_assassin', name:'トカゲ暗殺者', race:'beast', rank:58, floor:17, hp:180, atk:85, def:35, exp:1500, gold:600, joinRate:5, joinable:true, img:'🦎', abilities:['poison','critical'], group:'強', drops:['assassin_mask'] },
    { id:'skeleton_bishop', name:'骸骨司教', race:'undead', rank:62, floor:19, hp:200, atk:70, def:40, exp:2000, gold:1500, joinRate:3, joinable:true, img:'💀', abilities:['magic_all','heal'], group:'強', drops:['white_robe'] },
    { id:'minotaur_zombie', name:'ミノゾンビ', race:'undead', rank:65, floor:21, hp:500, atk:110, def:30, exp:3000, gold:400, joinRate:2, joinable:true, img:'🧟', abilities:['rage'], group:'超強', drops:['war_hammer'] },
    { id:'knight_leader', name:'聖騎士長', race:'human', rank:80, floor:28, hp:800, atk:140, def:100, exp:6000, gold:5000, joinRate:1, joinable:true, img:'🏇', abilities:['holy_magic','guard'], group:'超強', drops:['royal_armor'] },

    // ---------------------------------------------------------------
    // 和風・深層追加 (samurai, ninja, yokai)
    // ---------------------------------------------------------------
    { id:'yuki_onna', name:'雪女', race:'yokai', rank:72, floor:22, hp:300, atk:100, def:60, exp:4000, gold:2000, joinRate:3, joinable:true, img:'❄️', abilities:['ice_all','stone'], group:'超強', drops:[] },
    { id:'shuten_doji', name:'酒呑童子', race:'yokai', rank:90, floor:35, hp:1500, atk:220, def:90, exp:25000, gold:15000, joinRate:1, joinable:true, img:'👺', abilities:['rage','multi_attack'], group:'最恐', drops:['muramasa_charm'] },
    { id:'hanya', name:'般若', race:'yokai', rank:78, floor:24, hp:400, atk:120, def:50, exp:6000, gold:3000, joinRate:2, joinable:true, img:'👹', abilities:['curse','counter'], group:'超強', drops:['hachigane'] },
    { id:'grand_ninja', name:'ニンジャマスター', race:'ninja', rank:85, floor:30, hp:350, atk:180, def:40, exp:8000, gold:6000, joinRate:2, joinable:true, img:'👤', abilities:['double_attack','assassinate'], group:'超強', drops:['ninja_scroll_ex'] },

    // ---------------------------------------------------------------
    // 最終盤・神の領域 (46F-50F)
    // ---------------------------------------------------------------
    { id:'seraphim', name:'熾天使', race:'holy', rank:99, floor:46, hp:3000, atk:380, def:180, exp:80000, gold:40000, joinRate:0, joinable:false, img:'👼', abilities:['holy_all','resurrection'], group:'神', drops:['heaven_scroll'] },
    { id:'hades', name:'冥王', race:'darkgod', rank:99, floor:47, hp:4500, atk:420, def:160, exp:90000, gold:50000, joinRate:0, joinable:false, img:'💀', abilities:['death_all','dark_magic'], group:'神', drops:['staff_of_osiris'] },
    { id:'yamata_no_orochi', name:'八岐大蛇', race:'yokai', rank:99, floor:49, hp:6000, atk:400, def:200, exp:100000, gold:80000, joinRate:0, joinable:false, img:'🐍', abilities:['multi_breath','regen'], group:'神', drops:['kusanagi'] },
    { id:'true_demon_king', name:'終焉の魔王', race:'darkgod', rank:100, floor:50, hp:20000, atk:800, def:400, exp:0, gold:0, joinRate:0, joinable:false, img:'👑', abilities:['all_cancel','world_end'], group:'神', drops:[] },
    
    // ---------------------------------------------------------------
    // 亜人エリート・バリエーション (階層の密度を上げる)
    // ---------------------------------------------------------------
    { id:'goblin_shaman', name:'ゴブリン呪術師', race:'beast', rank:22, floor:6, hp:60, atk:35, def:10, exp:120, gold:100, joinRate:10, joinable:true, img:'🧙‍♂️', abilities:['poison','curse'], group:'中', drops:['staff'] },
    { id:'goblin_elite', name:'ゴブリン精鋭兵', race:'beast', rank:28, floor:8, hp:100, atk:45, def:20, exp:200, gold:150, joinRate:5, joinable:true, img:'💂', abilities:['guard'], group:'中', drops:['iron_helmet'] },
    { id:'orc_warrior', name:'オーク戦士', race:'beast', rank:35, floor:11, hp:180, atk:55, def:25, exp:350, gold:200, joinRate:8, joinable:true, img:'🪓', abilities:['heavy_hit'], group:'強', drops:['battle_axe'] },
    { id:'orc_shaman', name:'オーク賢者', race:'beast', rank:40, floor:13, hp:150, atk:50, def:20, exp:400, gold:400, joinRate:5, joinable:true, img:'🧿', abilities:['fire_all'], group:'強', drops:['magic_robe'] },
    { id:'lizard_guard', name:'リザードガード', race:'beast', rank:45, floor:15, hp:220, atk:60, def:45, exp:600, gold:350, joinRate:5, joinable:true, img:'🛡️', abilities:['guard'], group:'強', drops:['kite_shield'] },
    { id:'lizard_hero', name:'リザードヒーロー', race:'beast', rank:65, floor:22, hp:450, atk:100, def:55, exp:1500, gold:1000, joinRate:2, joinable:true, img:'🔱', abilities:['triple_attack'], group:'超強', drops:['heavy_halberd'] },

    // ---------------------------------------------------------------
    // 昆虫・植物の進化系 (Floor 15-35)
    // ---------------------------------------------------------------
    { id:'giant_hornet', name:'ジャイアントホーネット', race:'insect', rank:42, floor:16, hp:140, atk:75, def:20, exp:550, gold:200, joinRate:12, joinable:true, img:'🐝', abilities:['paralyze','quick'], group:'強', drops:[] },
    { id:'death_scorpio', name:'デススコーピオン', race:'insect', rank:55, floor:20, hp:280, atk:90, def:60, exp:1200, gold:450, joinRate:5, joinable:true, img:'🦂', abilities:['deadly_poison'], group:'超強', drops:[] },
    { id:'killer_mantis', name:'キラーカマキリ', race:'insect', rank:50, floor:18, hp:200, atk:110, def:30, exp:1000, gold:300, joinRate:5, joinable:true, img:'🔪', abilities:['critical'], group:'強', drops:[] },
    { id:'alraune', name:'アルラウネ', race:'nature', rank:60, floor:23, hp:350, atk:80, def:40, exp:1800, gold:1200, joinRate:8, joinable:true, img:'🌸', abilities:['charm','sleep'], group:'超強', drops:['fairy_dust'] },
    { id:'elder_treant', name:'エルダー・トレント', race:'nature', rank:75, floor:28, hp:800, atk:120, def:70, exp:4500, gold:2000, joinRate:2, joinable:true, img:'🌳', abilities:['regen','earthquake'], group:'超強', drops:[] },

    // ---------------------------------------------------------------
    // 霊・悪魔の階級バリエーション (undead, demon)
    // ---------------------------------------------------------------
    { id:'specter', name:'スペクター', race:'undead', rank:48, floor:17, hp:120, atk:65, def:80, exp:900, gold:500, joinRate:5, joinable:false, img:'🕯️', abilities:['drain_mp','curse'], group:'強', drops:[] },
    { id:'lich_monarch', name:'死霊王', race:'undead', rank:88, floor:32, hp:600, atk:140, def:60, exp:10000, gold:8000, joinRate:0, joinable:false, img:'🧙', abilities:['death_all','magic_all'], group:'最恐', drops:['staff_of_osiris'] },
    { id:'imp_elite', name:'上級インプ', race:'demon', rank:35, floor:14, hp:130, atk:55, def:25, exp:450, gold:600, joinRate:15, joinable:true, img:'👿', abilities:['fire','confuse'], group:'中', drops:[] },
    { id:'pit_fiend', name:'ピット・フィンド', race:'demon', rank:92, floor:42, hp:1500, atk:240, def:110, exp:22000, gold:15000, joinRate:0, joinable:false, img:'👹', abilities:['hellfire','rage'], group:'最恐', drops:['demon_armor'] },

    // ---------------------------------------------------------------
    // 素材系・メタル系追加 (レア枠)
    // ---------------------------------------------------------------
    { id:'silver_slime', name:'シルバースライム', race:'nature', rank:45, floor:15, hp:5, atk:20, def:500, exp:8000, gold:500, joinRate:2, joinable:true, img:'🥈', abilities:['quick','escape'], group:'特殊', drops:['silver_ring'] },
    { id:'liquid_metal', name:'はぐれメタル', race:'nature', rank:70, floor:25, hp:8, atk:50, def:1500, exp:35000, gold:2000, joinRate:1, joinable:true, img:'💧', abilities:['quick','escape','magic_reflect'], group:'特殊', drops:['speed_ring'] },
    { id:'gold_golem', name:'ゴールドゴーレム', race:'nature', rank:60, floor:18, hp:400, atk:100, def:80, exp:2000, gold:20000, joinRate:1, joinable:false, img:'💰', abilities:['heavy_hit'], group:'超強', drops:['gold_ring'] },
    { id:'gem_mimic', name:'宝石ミミック', race:'nature', rank:80, floor:35, hp:500, atk:180, def:150, exp:15000, gold:50000, joinRate:0, joinable:false, img:'💎', abilities:['ambush','laser'], group:'最恐', drops:['diamond_ring'] },

    // ---------------------------------------------------------------
    // 最終盤：神話・カオス系追加 (40F-50F)
    // ---------------------------------------------------------------
    { id:'titan', name:'タイタン', race:'giant', rank:95, floor:42, hp:3000, atk:320, def:140, exp:35000, gold:15000, joinRate:0, joinable:false, img:'🏋️', abilities:['earthquake','heavy_hit'], group:'最恐', drops:['atlas_belt'] },
    { id:'hydra', name:'ヒュドラ', race:'nature', rank:94, floor:44, hp:2500, atk:280, def:110, exp:32000, gold:12000, joinRate:1, joinable:false, img:'🐉', abilities:['multi_breath','regen'], group:'最恐', drops:[] },
    { id:'valkyrie_queen', name:'戦乙女の女王', race:'holy', rank:98, floor:47, hp:4000, atk:400, def:180, exp:85000, gold:40000, joinRate:0, joinable:false, img:'👸', abilities:['holy_all','multi_attack'], group:'神', drops:['valkyrie_wing'] },
    { id:'dark_reaper', name:'冥府の使者', race:'undead', rank:95, floor:45, hp:1800, atk:350, def:100, exp:40000, gold:10000, joinRate:0, joinable:false, img:'💀', abilities:['death_strike','drain_all'], group:'神', drops:[] },
    { id:'chaos_spawn', name:'混沌の落とし子', race:'darkgod', rank:99, floor:49, hp:5500, atk:500, def:220, exp:120000, gold:60000, joinRate:0, joinable:false, img:'🧿', abilities:['chaos_beam','all_cancel'], group:'神', drops:['chaos_orb'] },

    // ---------------------------------------------------------------
    // バリエーション水増し用 (IDにカラーや属性を付与して展開)
    // ---------------------------------------------------------------
    // ※以下はプログラムでループ生成するイメージのテンプレートです
    { id:'elemental_fire', name:'火の精霊', race:'nature', rank:50, floor:20, hp:200, atk:80, def:40, exp:1000, gold:800, joinRate:10, joinable:true, img:'🔥', abilities:['fire_all'], group:'強', drops:['fire_ring'] },
    { id:'elemental_water', name:'水の精霊', race:'nature', rank:50, floor:20, hp:220, atk:70, def:50, exp:1000, gold:800, joinRate:10, joinable:true, img:'💧', abilities:['ice_all'], group:'強', drops:['ice_ring'] },
    { id:'elemental_wind', name:'風の精霊', race:'nature', rank:50, floor:20, hp:180, atk:90, def:30, exp:1000, gold:800, joinRate:10, joinable:true, img:'🌀', abilities:['wind_magic'], group:'強', drops:['speed_ring'] },
    { id:'elemental_earth', name:'地の精霊', race:'nature', rank:50, floor:20, hp:300, atk:75, def:70, exp:1000, gold:800, joinRate:10, joinable:true, img:'⛰️', abilities:['earthquake'], group:'強', drops:['iron_amulet'] }
  ],

  // Shop initial stock
  shopStock: ['dagger','short_sword','staff','wooden_shield','leather_helmet','leather_armor','leather_boots','leather_gloves','robe','healing_herb','antidote','scroll_fire'],

  // ==================== MONSTER RANKS ====================
  // monsters[].rank（1〜99）を基準にランクを判定する。
  // floor は出現フロアのみを表し、ランクとは独立している。
  // 全モジュールから DATA.monsterRanks / getMonsterRank(m.rank) で参照。
  // UI表現（バッジHTML）は system_town.js の rankBadgeHtml() が担当。
  // system_dungeon.js では expMult を報酬倍率の計算に使用可。
  monsterRanks: [
    { rank:'F',   min:1,  max:9,  label:'F',   cssClass:'rank-F',   color:'#808098', expMult:1.0 },
    { rank:'E',   min:10, max:19, label:'E',   cssClass:'rank-E',   color:'#60a060', expMult:1.2 },
    { rank:'D',   min:20, max:29, label:'D',   cssClass:'rank-D',   color:'#40c040', expMult:1.5 },
    { rank:'C',   min:30, max:39, label:'C',   cssClass:'rank-C',   color:'#4080e0', expMult:2.0 },
    { rank:'B',   min:40, max:54, label:'B',   cssClass:'rank-B',   color:'#a040e0', expMult:2.5 },
    { rank:'A',   min:55, max:69, label:'A',   cssClass:'rank-A',   color:'#e04040', expMult:3.0 },
    { rank:'S',   min:70, max:79, label:'S',   cssClass:'rank-S',   color:'#e0c000', expMult:4.0 },
    { rank:'SS',  min:80, max:89, label:'SS',  cssClass:'rank-SS',  color:'#ff8000', expMult:5.0 },
    { rank:'SSS', min:90, max:99, label:'SSS', cssClass:'rank-SSS', color:'#ff40ff', expMult:7.0 }
  ],

  // ==================== MONSTER RACES ====================
  // モンスターの種族定義テーブル。monsters[].race でこのテーブルの id を参照する。
  // getMonsterRace(m.race) で種族オブジェクトを取得して使う。
  //
  // 各フィールドの意味:
  //   id    : 種族の識別子（monsters[].race に設定する値）
  //   label : 表示名（UI でバッジ・フィルタ表示等に使用）
  //   pair  : 対となる種族の id（対立・相性計算などに利用予定）。null = 対なし。
  //   color : UI 表示用のテーマカラー（種族バッジやフィルタ色として使用）
  //
  // 現在定義されている種族一覧:
  //   英雄(hero) ↔ 奸雄(villain)  / 天使(angel) ↔ 女神(goddess)
  //   悪魔(demon) ↔ 邪神(darkgod) / 生物(beast) ↔ 妖怪(yokai)
  //   精霊(spirit) ↔ 自然(nature) / 不死(undead) … 対なし
  monsterRaces: [
    { id:'hero',    label:'英雄', pair:'villain', color:'#ffd700' },
    { id:'villain', label:'奸雄', pair:'hero',    color:'#c04040' },
    { id:'angel',   label:'天使', pair:'goddess', color:'#c8e8ff' },
    { id:'goddess', label:'女神', pair:'angel',   color:'#ffb0e0' },
    { id:'demon',   label:'悪魔', pair:'darkgod', color:'#a020f0' },
    { id:'darkgod', label:'邪神', pair:'demon',   color:'#ff00ff' },
    { id:'beast',   label:'生物', pair:'yokai',   color:'#80c040' },
    { id:'yokai',   label:'妖怪', pair:'beast',   color:'#40c0c0' },
    { id:'spirit',  label:'精霊', pair:'nature',  color:'#60d0ff' },
    { id:'nature',  label:'自然', pair:'spirit',  color:'#40a840' },
    { id:'undead',  label:'不死', pair:null,      color:'#808080' }
  ]
};

// ==================== DATA UTILITIES ====================
// gamedata.js 読み込み完了後すぐ使えるグローバル関数として公開。

/**
 * モンスターの rank 値（1〜99）からランクオブジェクトを返す。
 * 使い方: getMonsterRank(monster.rank)
 * 全モジュール（dungeon / town / ui）から呼び出し可能。
 * @param {number} rankValue  monsters[].rank の値（1〜99）
 * @returns {{ rank, min, max, label, cssClass, color, expMult }}
 */
function getMonsterRank(rankValue) {
  return DATA.monsterRanks.find(r => rankValue >= r.min && rankValue <= r.max) || DATA.monsterRanks[0];
}

/**
 * モンスターの race id から種族オブジェクトを返す。
 * 使い方: getMonsterRace(monster.race)
 * 全モジュール（dungeon / town / ui）から呼び出し可能。
 * @param {string} raceId  monsters[].race の値
 * @returns {{ id, label, pair, color } | null}
 */
function getMonsterRace(raceId) {
  return DATA.monsterRaces.find(r => r.id === raceId) || null;
}
