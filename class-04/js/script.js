/** @format */

"use strict";
// ===== 正方形マスの配列長 =====
// ROW_COUNT = 縦見出しの個数、COL_COUNT = 横見出しの個数。必ず同じ数。
// TOTAL_CELLS = ROW_COUNT * COL_COUNT（例: 5 × 5 = 25問）。
let ROW_COUNT = 5;
let COL_COUNT = 5;
let TOTAL_CELLS = 25;
let state = null;
let activeIndex = 0;
const initialSettings = {min: 1, max: 5, op: "+", order: "asc", size: 5};
function setSize(size) {
  ROW_COUNT = size;
  COL_COUNT = size;
  TOTAL_CELLS = ROW_COUNT * COL_COUNT;
}

// 設定のよみとり
function settingsFromForm() {
  let min = Number($("#min").value),
    max = Number($("#max").value);
  const size = Number($("#size").value);
  const op = $('input[name="op"]:checked').value,
    order = $('input[name="order"]:checked').value;
  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min < -100 ||
    min > 100 ||
    max < -100 ||
    max > 100
  )
    throw Error("数字の範囲は−100〜100の整数にしてください。");
  if (min > max) [min, max] = [max, min];
  if (!Number.isInteger(size) || size < 3 || size > 10)
    throw Error("マス数を選んでください。");
  if (max - min + 1 < size)
    throw Error(`異なる数字が${size}個必要です。範囲を広げてください。`);
  if (op === "/" && max - min + 1 - (min <= 0 && max >= 0 ? 1 : 0) < size)
    throw Error(`割り算の横見出しには0以外の数字が${size}個必要です。`);
  return {min, max, op, order, size};
}

// 設定の反映だったかな
function applySettings(s) {
  $("#min").value = s.min;
  $("#max").value = s.max;
  $("#size").value = s.size;
  $(`input[name="op"][value="${s.op}"]`).checked = true;
  $(`input[name="order"][value="${s.order}"]`).checked = true;
}

// -----要素が重複しない、縦横の配列をつくる-----
// 最大値と最小値から、縦・横の長さと同じ長さの、ランダムor昇順配列をつくる
function pickUnique(s, excludeZero = false) {
  const pool = [];
  for (let n = s.min; n <= s.max; n++)
    if (!excludeZero || n !== 0) pool.push(n);
  if (pool.length < s.size) throw Error("指定範囲に必要な数字がありません。");
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const selected = pool.slice(0, s.size);
  return s.order === "asc" ? selected.sort((a, b) => a - b) : selected;
}
// pickUniqueで作った配列の、縦・横見出しと同じ数の要素を冒頭から取る
function generate(s) {
  setSize(s.size);
  const rows = pickUnique(s),
    cols = pickUnique(s, s.op === "/");
  return {
    settings: s,
    rows,
    cols,
    answers: Array(TOTAL_CELLS).fill(null),
    graded: false,
    createdAt: new Date().toISOString(),
  };
}

// 保存配列
function save() {
  saveJSON(STORAGE_KEY, state);
}

// 問題作成（縦横見出し配列の数値と、ランダムか昇順かの設定を保管
function makeProblem(s) {
  try {
    state = generate(s);
    save();
    $("#error").textContent = "";
    render();
    focusCell(0);
    console.log("[MasuCal] 新しい問題:", {
      rows: state.rows,
      cols: state.cols,
      settings: s,
    });
  } catch (e) {
    $("#error").textContent = e.message;
  }
}

// 問題のテーブル（25マス）作成
function makeBoard(target, mode) {
  const table = document.createElement("table");
  table.className = "board";
  const head = document.createElement("tr");
  const corner = document.createElement("th");
  corner.className = "corner";
  head.append(corner);
  state.cols.forEach((n) => {
    const th = document.createElement("th");
    th.textContent = n;
    head.append(th);
  });
  table.append(head);
  state.rows.forEach((row, r) => {
    const tr = document.createElement("tr"),
      th = document.createElement("th");
    th.textContent = row;
    tr.append(th);
    state.cols.forEach((col, c) => {
      const i = r * COL_COUNT + c,
        td = document.createElement("td");
      if (mode === "input") {
        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "decimal";
        input.autocomplete = "off";
        input.dataset.index = i;
        input.setAttribute("aria-label", `${r + 1}行${c + 1}列`);
        input.value = state.answers[i] === null ? "" : String(state.answers[i]);
        input.disabled = state.graded;
        input.addEventListener("focus", () => {
          activeIndex = i;
        });
        input.addEventListener("input", () => {
          state.answers[i] =
            input.value.trim() === "" ? null : input.value.trim();
          save();
        });
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            advance(i);
          }
        });
        td.append(input);
      } else {
        const actual = state.answers[i],
          correct = isCorrect(actual, row, col, state.settings.op);
        if (mode === "user") td.className = correct ? "correct" : "wrong";
        const span = document.createElement("span");
        span.textContent =
          mode === "key" ? expectedText(row, col, state.settings.op)
          : actual === null ? "—"
          : String(actual);
        td.append(span);
      }
      tr.append(td);
    });
    table.append(tr);
  });
  $(target).replaceChildren(table);
}

// 入力セル設定
function focusCell(i) {
  activeIndex = i;
  const el = $(`#board input[data-index="${i}"]`);
  if (el) {
    el.focus();
    el.select();
  }
}

// すべて入力したら、次で確定ボタンへ。未入力があれば、最後から最初のみ入力セルに戻る
function advance(i) {
  if (state.graded) return;
  if (i < TOTAL_CELLS - 1) {
    focusCell(i + 1);
    return;
  }
  const empty = state.answers.findIndex((x) => x === null);
  if (empty !== -1) focusCell(empty);
  else $("#grade").focus();
}

// 印刷等設定
function render() {
  applySettings(state.settings);
  $("#opLabel").textContent = opSymbol(state.settings.op);
  $("#operationHint").textContent =
    `左の数 ${opSymbol(state.settings.op)} 上の数 = ?`;
  // 印刷用満点スコア更新
  $("#printTotal").textContent = TOTAL_CELLS;
  // コメント用の◯x◯マスの数値更新
  $("#gridLabel").textContent =
    `${ROW_COUNT} × ${COL_COUNT} マスに挑戦！たくさん計算練習して、正確さとスピードをみがこう。`;
  makeBoard("#board", "input");
  $("#grade").disabled = state.graded;
  if (state.graded) showResults();
  else $("#results").hidden = true;
  renderReview();
}

// スコア計算
function grade() {
  if (!state || state.graded) return;
  state.graded = true;
  save();
  const all = mistakes(),
    date = new Date().toISOString();
  state.rows.forEach((row, r) =>
    state.cols.forEach((col, c) => {
      const i = r * COL_COUNT + c,
        actual = state.answers[i];
      if (!isCorrect(actual, row, col, state.settings.op))
        all.push({
          id: `${date}-${i}-${Math.random().toString(36).slice(2)}`,
          row,
          col,
          op: state.settings.op,
          expected: expectedText(row, col, state.settings.op),
          actual,
          date,
        });
    }),
  );
  saveJSON(MISTAKES_KEY, all.slice(-200));
  console.log("[MasuCal] 採点:", state.answers);
  logMistakeCount();
  render();
  $("#results").scrollIntoView({behavior: "smooth"});
}

// 結果表示
function showResults() {
  let correct = 0;
  state.rows.forEach((r, ri) =>
    state.cols.forEach((c, ci) => {
      if (
        isCorrect(state.answers[ri * COL_COUNT + ci], r, c, state.settings.op)
      )
        correct++;
    }),
  );
  $("#score").textContent =
    `${correct}/${TOTAL_CELLS} · ${Math.round((correct / TOTAL_CELLS) * 100)}%`;
  makeBoard("#yourBoard", "user");
  makeBoard("#keyBoard", "key");
  $("#results").hidden = false;
}

// 印刷プレビュー
function renderReview() {
  const all = mistakes();
  $("#review").hidden = all.length === 0;
  $("#reviewSummary").textContent =
    `保存した間違い：${all.length}件（最大200件）`;
  const list = $("#reviewItems");
  list.replaceChildren();
  all
    .slice(-30)
    .reverse()
    .forEach((m) => {
      const item = document.createElement("div");
      item.className = "review-item";
      item.textContent = `${m.row} ${opSymbol(m.op)} ${m.col} = ${m.expected}（回答：${m.actual === null ? "未入力" : m.actual}）`;
      list.append(item);
    });
}

// 問題作成（ボタンで発動）
$("#create").addEventListener("click", () => {
  try {
    makeProblem(settingsFromForm());
  } catch (e) {
    $("#error").textContent = e.message;
  }
});
// 問題再作成（ボタンで発動）
$("#remake").addEventListener("click", () => {
  try {
    makeProblem(settingsFromForm());
  } catch (e) {
    $("#error").textContent = e.message;
  }
});
// 次へボタン
$("#next").addEventListener("click", () => advance(activeIndex));
// 戻るボタン
$("#prev").addEventListener("click", () =>
  focusCell(Math.max(0, activeIndex - 1)),
);
// 回答送信
$("#grade").addEventListener("click", grade);
// 新しい問題へ
$("#retry").addEventListener("click", () => makeProblem(state.settings));
// まちがいリストの全削除
$("#clearMistakes").addEventListener("click", () => {
  if (confirm("保存した間違いをすべて削除しますか？")) {
    localStorage.removeItem(MISTAKES_KEY);
    renderReview();
    logMistakeCount();
  }
});

// ----印刷系----
// 印刷用関数
function printMode(results) {
  document.body.classList.toggle("print-results", results);
  document.body.classList.toggle("print-blank", !results);
  const el = $("#results"),
    hidden = el.hidden;
  if (!results) el.hidden = true;
  window.print();
  el.hidden = hidden;
  document.body.classList.remove("print-results", "print-blank");
}
// 問題のみ印刷
$("#printBlank").addEventListener("click", () => printMode(false));
// 結果も印刷
$("#printResults").addEventListener("click", () => printMode(true));
function applyTheme(theme) {
  document.body.classList.toggle("mono", theme === "mono");
  $("#theme").checked = theme === "mono";
  localStorage.setItem(THEME_KEY, theme);
}

// カラーモード
$("#theme").addEventListener("change", function () {
  applyTheme(this.checked ? "mono" : "color");
});
applyTheme(localStorage.getItem(THEME_KEY) || "color");
// THEME_KEYを増やすといろんなカラーモードを増やせる
// いまのところカラーとモノクロ

// 解いた結果の保存
const restored = readJSON(STORAGE_KEY, null);
if (
  restored &&
  restored.settings &&
  Array.isArray(restored.rows) &&
  Array.isArray(restored.cols) &&
  Array.isArray(restored.answers) &&
  restored.rows.length === restored.cols.length &&
  restored.rows.length >= 3 &&
  restored.rows.length <= 10 &&
  restored.answers.length === restored.rows.length ** 2
) {
  state = restored;
  state.settings.size = state.rows.length;
  setSize(state.rows.length);
  // 追加：採点済みでも全回答が未入力なら、未採点状態に戻す
  if (state.graded && state.answers.every((answer) => answer === null)) {
    state.graded = false;
    save();
    console.log("全回答が未入力のため、未採点状態に戻しました。");
  }
  render();
  // 未採点の場合は最初の入力セルを選択
  if (!state.graded) {
    focusCell(0);
  }
} else makeProblem(initialSettings);

// 誤答履歴の件数を確認するには、開発者ツールのConsoleで logMistakeCount() を実行。
logMistakeCount();
