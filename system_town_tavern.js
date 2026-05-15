/**
 * system_town_tavern.js — 酒場（PT編成・アイテム管理）
 * 依存: system_town_common.js
 * [SP対応済み] スマートフォン最適化版
 *
 * 修正: 実機スマホでのパーティ入替不可バグを修正
 *   - .tavern-member の onclick と addEventListener('click') が競合していた問題を解消
 *   - タップ → 選択ハイライト、ステータス確認は「詳細」ボタンで分離
 */

// ========== ユーティリティ ==========
/** スマホ判定（viewport幅 ≤ 600px） */
function _isMobile() {
  return window.innerWidth <= 600;
}

// ========== TAVERN ==========
function openTavern() {
  // ロード後にpartyとrosterの参照が切れている場合を修復（IDで再接続）
  GS.party = GS.party.map(pc => {
    const inRoster = GS.roster.find(rc => String(rc.id) === String(pc.id));
    return inRoster || pc;
  });
  renderTavernContent();
  showModal('tavern-modal');
}

function renderTavernContent() {
  const content = document.getElementById('tavern-content');
  // ロード後にオブジェクト参照が切れても正しく動くようIDで比較
  const partyIds = new Set(GS.party.map(c => String(c.id)));
  const bench = GS.roster.filter(c => !partyIds.has(String(c.id)));
  const sp = _isMobile();

  // ---- スマホ: 縦1カラム / PC: 2カラム ----
  const gridStyle = sp
    ? 'display:flex;flex-direction:column;gap:10px'
    : 'display:grid;grid-template-columns:1fr 1fr;gap:12px';

  let html = `<div style="${gridStyle}">`;

  // ===== パーティ列 =====
  html += `
    <div>
      <div class="stat-title" style="font-size:${sp ? 13 : 11}px;margin-bottom:6px">
        現在のパーティ (${GS.party.length}/6)
        ${sp
          ? '<span style="font-size:10px;color:var(--gray);margin-left:6px">タップ選択 → ▲▼で並替</span>'
          : '<span style="font-size:9px;color:var(--gray);margin-left:6px">タップ選択 → ▲▼で並替</span>'
        }
      </div>
      <div id="party-sort-list" style="min-height:40px">`;

  GS.party.forEach((c, i) => {
    const rowLabel = i < 3 ? `前${i + 1}` : `後${i - 2}`;
    const rowColor = i < 3 ? 'var(--orange)' : 'var(--cyan)';
    const jobInfo = getJob(c.job);

    // ★修正ポイント:
    //   onclick を削除し、data-idx のみ保持。
    //   ステータス確認は「詳細」ボタン (ontavernDetail) で行う。
    //   行タップ自体は addEventListener 側で _tavernSelected をセットする。
    html += `
      <div class="item-row tavern-member"
           data-idx="${i}"
           style="
             cursor:pointer;
             background:var(--bg3);
             margin-bottom:${sp ? 5 : 3}px;
             border:1px solid var(--border2);
             padding:${sp ? '7px 6px' : '3px 5px'};
             min-height:${sp ? 44 : 32}px;
             align-items:center;
             display:flex;gap:${sp ? 6 : 4}px;
           ">
        <!-- ポジションバッジ -->
        <span style="
          font-size:${sp ? 11 : 9}px;
          color:${rowColor};
          min-width:${sp ? 24 : 20}px;
          font-weight:bold;
          text-align:center;
          flex-shrink:0;
        ">${rowLabel}</span>
        <!-- アバター -->
        <span style="font-size:${sp ? 22 : 18}px;flex-shrink:0;line-height:1">${c.portrait || '🧑‍🦯'}</span>
        <!-- 名前 -->
        <span class="item-name" style="
          font-size:${sp ? 13 : 11}px;
          flex:1;
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        ">${c.name}</span>
        <!-- 職業 -->
        <span class="item-type" style="
          color:${jobInfo?.color || 'white'};
          font-size:${sp ? 11 : 10}px;
          flex-shrink:0;
        ">${jobInfo?.name || ''}</span>
        <!-- レベル -->
        <span class="item-val" style="
          font-size:${sp ? 11 : 10}px;
          flex-shrink:0;
          min-width:${sp ? 28 : 24}px;
          text-align:right;
        ">Lv${c.level}</span>
        <!-- 詳細ボタン: ステータス確認用（行タップと分離） -->
        <button class="mini-btn"
                onclick="event.stopPropagation();openCharStatusModal(GS.party[${i}],'town')"
                style="
                  flex-shrink:0;
                  color:var(--cyan);
                  ${sp ? 'min-width:44px;min-height:36px;font-size:12px;padding:4px 6px;' : 'font-size:9px;'}
                ">詳細</button>
        <!-- 外すボタン: スマホは十分なタップ領域 -->
        <button class="mini-btn drop-btn"
                onclick="event.stopPropagation();removeFromParty(${i})"
                style="
                  flex-shrink:0;
                  ${sp ? 'min-width:44px;min-height:36px;font-size:13px;padding:4px 8px;' : ''}
                ">外す</button>
      </div>`;
  });

  html += `</div>`;

  // ---- 並替ボタン行 ----
  html += `
      <div style="margin-top:${sp ? 8 : 6}px;display:flex;gap:${sp ? 6 : 4}px;flex-wrap:wrap">
        <button class="mini-btn"
                onclick="movePartyMember(-1)"
                style="${sp ? 'min-height:40px;min-width:64px;font-size:14px;padding:6px 10px;' : ''}"
                title="選択中を上へ">▲ 上へ</button>
        <button class="mini-btn"
                onclick="movePartyMember(1)"
                style="${sp ? 'min-height:40px;min-width:64px;font-size:14px;padding:6px 10px;' : ''}"
                title="選択中を下へ">▼ 下へ</button>
        <button class="mini-btn"
                onclick="swapFrontBack()"
                style="color:var(--gold);${sp ? 'min-height:40px;font-size:14px;padding:6px 10px;' : ''}">前後入替</button>
      </div>
    </div>`;

  // ===== 控えメンバー列 =====
  html += `
    <div>
      <div class="stat-title" style="font-size:${sp ? 13 : 11}px;margin-bottom:6px">控えメンバー</div>
      <div class="item-list">`;

  bench.forEach(c => {
    const jobInfo = getJob(c.job);
    html += `
      <div class="item-row"
           style="
             cursor:pointer;
             padding:${sp ? '7px 6px' : '3px 5px'};
             min-height:${sp ? 44 : 32}px;
             margin-bottom:${sp ? 5 : 3}px;
             align-items:center;
             display:flex;gap:${sp ? 6 : 4}px;
           ">
        <span style="font-size:${sp ? 22 : 18}px;flex-shrink:0;line-height:1">${c.portrait || '🧑‍🦯'}</span>
        <span class="item-name" style="
          font-size:${sp ? 13 : 11}px;
          flex:1;
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        ">${c.name}</span>
        <span class="item-type" style="
          color:${jobInfo?.color || 'white'};
          font-size:${sp ? 11 : 10}px;
          flex-shrink:0;
        ">${jobInfo?.name || ''}</span>
        <span class="item-val" style="
          font-size:${sp ? 11 : 10}px;
          flex-shrink:0;
          min-width:${sp ? 28 : 24}px;
          text-align:right;
        ">Lv${c.level}</span>
        <!-- 詳細ボタン -->
        <button class="mini-btn"
                onclick="event.stopPropagation();openCharStatusModal(GS.roster.find(r=>String(r.id)==='${c.id}'),'town')"
                style="
                  flex-shrink:0;
                  color:var(--cyan);
                  ${sp ? 'min-width:44px;min-height:36px;font-size:12px;padding:4px 6px;' : 'font-size:9px;'}
                ">詳細</button>
        <button class="mini-btn use-btn"
                onclick="event.stopPropagation();addToParty('${c.id}')"
                style="
                  flex-shrink:0;
                  ${sp ? 'min-width:52px;min-height:36px;font-size:13px;padding:4px 8px;' : ''}
                ">加える</button>
      </div>`;
  });

  if (!bench.length) {
    html += `<p style="color:var(--gray);font-size:${sp ? 12 : 11}px;padding:6px">控えメンバーなし</p>`;
  }

  html += `</div></div></div>`;

  // アイテム管理エリア（初期非表示）
  html += `<div id="tavern-item-mgr" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:10px"></div>`;

  content.innerHTML = html;

  // ========================================================
  // ★修正ポイント: タップ選択ハイライト
  //   onclick 属性を排除し、addEventListener のみで管理。
  //   これにより実機スマホで onclick との競合が発生しない。
  // ========================================================
  document.querySelectorAll('.tavern-member').forEach(row => {
    row.addEventListener('click', (e) => {
      // ボタン類のタップは選択に反応させない
      if (e.target.closest('button')) return;

      document.querySelectorAll('.tavern-member').forEach(r => r.style.outline = '');
      row.style.outline = '2px solid var(--gold)';
      window._tavernSelected = parseInt(row.dataset.idx);
    });
  });
}

function movePartyMember(dir) {
  const idx = window._tavernSelected;
  if (idx === undefined || idx === null) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= GS.party.length) return;
  const tmp = GS.party[idx];
  GS.party[idx] = GS.party[newIdx];
  GS.party[newIdx] = tmp;
  window._tavernSelected = newIdx;
  renderTavernContent();
  updatePartyDisplay();
  setTimeout(() => {
    const rows = document.querySelectorAll('.tavern-member');
    if (rows[newIdx]) {
      rows[newIdx].style.outline = '2px solid var(--gold)';
      window._tavernSelected = newIdx;
    }
  }, 10);
}

function swapFrontBack() {
  if (GS.party.length < 4) { log('後衛がいないため入替できません', 'sys'); return; }
  const front = GS.party.slice(0, 3);
  const back = GS.party.slice(3, 6);
  GS.party.splice(0, 6, ...back, ...front);
  renderTavernContent();
  updatePartyDisplay();
  log('前衛と後衛を入れ替えた', 'event');
}

function openTavernItemMgr(charId) {
  const all = [...new Set([...GS.party, ...GS.roster])];
  const c = all.find(ch => String(ch.id) === String(charId));
  if (!c) return;
  const mgr = document.getElementById('tavern-item-mgr');
  if (!mgr) return;
  mgr.style.display = 'block';
  const sp = _isMobile();

  const others = all.filter(oc => String(oc.id) !== String(charId) && oc.inventory.length < 8);

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div class="stat-title" style="font-size:${sp ? 13 : 11}px">
        📦 ${c.name} の荷物 (${c.inventory.length}/8)
      </div>
      <button class="mini-btn drop-btn"
              onclick="document.getElementById('tavern-item-mgr').style.display='none'"
              style="${sp ? 'min-height:36px;min-width:52px;font-size:13px;' : ''}">閉じる</button>
    </div>`;

  if (!c.inventory.length) {
    mgr.innerHTML = html + `<p style="color:var(--gray);font-size:${sp ? 12 : 11}px">所持品なし</p>`;
    return;
  }

  html += `<div class="item-list">`;
  c.inventory.forEach((iid, ii) => {
    const item = getItem(iid);
    if (!item) return;
    const tsid = `ttv_${String(charId).slice(-4)}_${ii}`;
    const transOpts = others.map(oc =>
      `<option value="${oc.id}">${oc.name}(${oc.inventory.length}/8)</option>`
    ).join('');

    // スマホ: アイテム行を縦積みで見やすく
    html += `
      <div class="item-row" style="
        flex-direction:column;
        align-items:flex-start;
        gap:${sp ? 6 : 3}px;
        padding:${sp ? '8px 6px' : '4px 5px'};
        margin-bottom:${sp ? 6 : 3}px;
        border-bottom:1px solid var(--border);
      ">
        <!-- アイテム名・ステータス行 -->
        <div style="display:flex;align-items:center;gap:6px;width:100%">
          <span class="item-name" style="font-size:${sp ? 13 : 11}px;flex:1">${item.name}</span>
          <span style="font-size:${sp ? 11 : 9}px;color:var(--gold)">
            ${item.atk ? `ATK+${item.atk} ` : ''}${item.def ? `DEF+${item.def} ` : ''}${item.heal ? `HP+${item.heal} ` : ''}${item.mpHeal ? `MP+${item.mpHeal}` : ''}
          </span>
        </div>
        <!-- 操作ボタン行 -->
        <div style="display:flex;gap:${sp ? 6 : 4}px;flex-wrap:wrap;width:100%;align-items:center">
          ${others.length ? `
            <select id="${tsid}" style="
              font-size:${sp ? 13 : 9}px;
              background:var(--bg3);
              color:var(--white);
              border:1px solid var(--border);
              padding:${sp ? '5px 4px' : '1px'};
              border-radius:3px;
              flex:1;
              min-width:0;
              ${sp ? 'min-height:36px;' : ''}
            ">${transOpts}</select>
            <button class="mini-btn"
                    style="color:#c080ff;border-color:var(--purple);flex-shrink:0;
                           ${sp ? 'min-height:36px;min-width:44px;font-size:13px;' : ''}"
                    onclick="tavernTransfer('${charId}',${ii},document.getElementById('${tsid}').value)">渡す</button>
          ` : ''}
          <button class="mini-btn drop-btn"
                  style="flex-shrink:0;${sp ? 'min-height:36px;min-width:44px;font-size:13px;' : ''}"
                  onclick="tavernDrop('${charId}',${ii})">捨てる</button>
        </div>
      </div>`;
  });
  html += '</div>';
  mgr.innerHTML = html;
}

function tavernTransfer(fromId, itemIdx, toId) {
  const all = [...new Set([...GS.party, ...GS.roster])];
  const from = all.find(c => String(c.id) === String(fromId));
  const to = all.find(c => String(c.id) === String(toId));
  if (!from || !to) return;
  if (to.inventory.length >= 8) { log(`${to.name}の荷物がいっぱい！`, 'combat'); return; }
  const iid = from.inventory[itemIdx];
  const item = getItem(iid);
  from.inventory.splice(itemIdx, 1);
  to.inventory.push(iid);
  log(`${from.name}→${to.name}：[${item?.name}]を渡した`, 'item');
  openTavernItemMgr(fromId);
  renderTavernContent();
}

function tavernDrop(charId, itemIdx) {
  const all = [...new Set([...GS.party, ...GS.roster])];
  const c = all.find(ch => String(ch.id) === String(charId));
  if (!c) return;
  const iid = c.inventory[itemIdx];
  const item = getItem(iid);
  if (!item) return;
  if (confirm(`[${item.name}]を捨てますか？`)) {
    c.inventory.splice(itemIdx, 1);
    log(`[${item.name}]を捨てた`, 'sys');
    openTavernItemMgr(charId);
  }
}

function removeFromParty(idx) {
  const c = GS.party[idx];
  if (!c) return;

  // パーティから外すだけ。レベル・ステータス・装備はそのまま roster に残る。
  GS.party.splice(idx, 1);
  log(`${c.name} をパーティから外した`, 'sys');
  renderTavernContent();
  updatePartyDisplay();
}

function addToParty(charId) {
  if (GS.party.length >= 6) { alert('パーティが満員！'); return; }
  // 既にパーティにいる場合は何もしない（ロード後の重複防止）
  if (GS.party.some(c => String(c.id) === String(charId))) return;
  const c = GS.roster.find(r => String(r.id) === String(charId));
  if (!c) return;
  GS.party.push(c);
  renderTavernContent();
  updatePartyDisplay();
}
