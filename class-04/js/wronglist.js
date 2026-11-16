/** @format */

"use strict";
let selected = [];
let answers = [];
let graded = false;
let generatedAt = "";

// まちがいリストから、問題リストを制作
function makeList() {
  const count = Number($("#count").value),
    all = mistakes();
  selected = all
    .slice(-count)
    .reverse()
    .map((m, i) => ({...m, _sourceIndex: all.length - 1 - i}));
  answers = Array(selected.length).fill(null);
  graded = false;
  generatedAt = timestamp();
  $("#generatedAt").textContent = generatedAt;
  $("#fullScore").textContent = selected.length;
  $("#score").textContent = "";
  $("#deleteCorrect").hidden = true;
  $("#grade").disabled = selected.length === 0;
  $("#message").textContent =
    selected.length < count ?
      `保存履歴は${selected.length}件です。ある分だけ出題します。`
    : "";
  render();
  console.log("[MasuCal] まちがいなおし問題数:", selected.length);
}

// 最初の問題の解答欄にカーソルをおく
function focusAnswer(i) {
  const el = $(`#wrongQuestions input[data-index="${i}"]`);
  if (el) {
    el.focus();
    el.select();
  }
}
// 次への設定
function advance(i) {
  if (i < selected.length - 1) {
    focusAnswer(i + 1);
    return;
  }
  const first = answers.findIndex((v) => v === null);
  if (first !== -1) focusAnswer(first);
  else $("#grade").focus();
}
// 印刷設定
function render() {
  const box = $("#wrongQuestions");
  box.replaceChildren();
  selected.forEach((m, i) => {
    const line = document.createElement("div");
    line.className = "wrong-line";
    const label = document.createElement("label");
    label.htmlFor = `answer-${i}`;
    label.textContent = `${i + 1}. ${m.row} ${opSymbol(m.op)} ${m.col} = `;
    const input = document.createElement("input");
    input.id = `answer-${i}`;
    input.dataset.index = i;
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.value = answers[i] ?? "";
    input.disabled = graded;
    input.addEventListener("input", () => {
      answers[i] = input.value.trim() === "" ? null : input.value.trim();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        advance(i);
      }
    });
    line.append(label, input);
    if (graded) {
      const correct = isCorrect(answers[i], m.row, m.col, m.op);
      line.classList.add(correct ? "correct" : "wrong");
      const detail = document.createElement("span");
      detail.className = "answer-detail";
      detail.textContent =
        correct ? " ✓" : ` ✗ 正解：${expectedText(m.row, m.col, m.op)}`;
      line.append(detail);
    }
    box.append(line);
  });
}
// 採点
function grade() {
  if (graded || !selected.length) return;
  graded = true;
  const correct = selected.filter((m, i) =>
    isCorrect(answers[i], m.row, m.col, m.op),
  ).length;
  $("#score").textContent =
    `${correct}/${selected.length} · ${Math.round((correct / selected.length) * 100)}%`;
  $("#deleteCorrect").hidden = correct === 0;
  $("#grade").disabled = true;
  render();
  console.log("[MasuCal] まちがいなおし採点:", {
    correct,
    total: selected.length,
  });
}

// まちがいリストから、やり直しで正解したものを消す
function deleteCorrect() {
  if (!graded) return;
  const targets = selected.filter((m, i) =>
    isCorrect(answers[i], m.row, m.col, m.op),
  );
  if (!targets.length) return;
  if (
    !confirm(
      `今回正解した${targets.length}件を、まちがいリストから削除しますか？\nキャンセルするとすべて残ります。`,
    )
  )
    return;
  const all = mistakes();
  const indexes = new Set(targets.map((m) => m._sourceIndex));
  const next = all.filter((m, i) => !indexes.has(i));
  saveJSON(MISTAKES_KEY, next);
  $("#deleteCorrect").hidden = true;
  $("#message").textContent =
    `正解した${targets.length}件を削除しました。残り${next.length}件です。`;
  logMistakeCount();
}
// 作成ボタンで作成
$("#generate").addEventListener("click", makeList);
// 採点ボタンで採点
$("#grade").addEventListener("click", grade);
// まちがいリストから正解を消すボタンで消す
$("#deleteCorrect").addEventListener("click", deleteCorrect);
function buildPrintPages() {
  const holder = $("#printPages");
  holder.replaceChildren();
  const perPage = selected.length > 50 ? 50 : selected.length;
  for (let start = 0; start < selected.length; start += perPage) {
    const page = document.createElement("section");
    page.className = "print-page";
    const head = document.createElement("div");
    head.className = "print-page-head";
    head.textContent = `MasuCal　生成日時：${generatedAt}　氏名：________________　点数：_____ / ${selected.length}`;
    page.append(head);
    const questions = document.createElement("div");
    questions.className = "print-question-grid";
    const chunk = selected.slice(start, start + perPage);
    questions.style.setProperty(
      "--print-rows",
      String(
        chunk.length <= 10 ? 10
        : chunk.length <= 20 ? 10
        : 25,
      ),
    );
    if (chunk.length <= 10) questions.classList.add("one-column");
    chunk.forEach((m, j) => {
      const line = document.createElement("div");
      line.className = "print-question";
      line.textContent = `${start + j + 1}. ${m.row} ${opSymbol(m.op)} ${m.col} = `;
      const blank = document.createElement("span");
      blank.className = "print-blank";
      line.append(blank);
      questions.append(line);
    });
    page.append(questions);
    holder.append(page);
  }
}
// 印刷機能は後日実装する 2026.11.17
// $('#print').addEventListener('click', () => { buildPrintPages();window.print();});
//
makeList();
logMistakeCount();
