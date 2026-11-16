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
function applySettings(s) {
  $("#min").value = s.min;
  $("#max").value = s.max;
  $("#size").value = s.size;
  $(`input[name="op"][value="${s.op}"]`).checked = true;
  $(`input[name="order"][value="${s.order}"]`).checked = true;
}
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
function save() {
  saveJSON(STORAGE_KEY, state);
}
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
function focusCell(i) {
  activeIndex = i;
  const el = $(`#board input[data-index="${i}"]`);
  if (el) {
    el.focus();
    el.select();
  }
}
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
function render() {
  applySettings(state.settings);
  $("#opLabel").textContent = opSymbol(state.settings.op);
  $("#operationHint").textContent =
    `左の数 ${opSymbol(state.settings.op)} 上の数 = ?`;
  $("#printTotal").textContent = TOTAL_CELLS;
  $("#gridLabel").textContent =
    `${ROW_COUNT} × ${COL_COUNT} の計算で、正確さを磨こう。`;
  makeBoard("#board", "input");
  $("#grade").disabled = state.graded;
  if (state.graded) showResults();
  else $("#results").hidden = true;
  renderReview();
}
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
$("#create").addEventListener("click", () => {
  try {
    makeProblem(settingsFromForm());
  } catch (e) {
    $("#error").textContent = e.message;
  }
});
$("#remake").addEventListener("click", () => {
  try {
    makeProblem(settingsFromForm());
  } catch (e) {
    $("#error").textContent = e.message;
  }
});
$("#next").addEventListener("click", () => advance(activeIndex));
$("#prev").addEventListener("click", () =>
  focusCell(Math.max(0, activeIndex - 1)),
);
$("#grade").addEventListener("click", grade);
$("#retry").addEventListener("click", () => makeProblem(state.settings));
$("#clearMistakes").addEventListener("click", () => {
  if (confirm("保存した間違いをすべて削除しますか？")) {
    localStorage.removeItem(MISTAKES_KEY);
    renderReview();
    logMistakeCount();
  }
});
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
$("#printBlank").addEventListener("click", () => printMode(false));
$("#printResults").addEventListener("click", () => printMode(true));
function applyTheme(theme) {
  document.body.classList.toggle("mono", theme === "mono");
  $("#theme").checked = theme === "mono";
  localStorage.setItem(THEME_KEY, theme);
}
$("#theme").addEventListener("change", function () {
  applyTheme(this.checked ? "mono" : "color");
});
applyTheme(localStorage.getItem(THEME_KEY) || "color");
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
  render();
  if (!state.graded) focusCell(0);
} else makeProblem(initialSettings);
// 誤答履歴の件数を確認するには、開発者ツールのConsoleで logMistakeCount() を実行。
logMistakeCount();
