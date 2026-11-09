
// 【変更】クリックとEnterのイベント登録を1か所にまとめる。
// 記法について要勉強
$(function () {
  $("#checkButton").on("click", checkPrime);
  $("#numberInput").on("keydown", function (event) {
    if (event.key === "Enter" && !event.isComposing && event.originalEvent?.isComposing !== true) {
      event.preventDefault();
      checkPrime();
    }
  });
  // 【追加】保存済みコレクションとAchievementを初期表示する。
  initializeCollection();
  $("#resetCollection").on("click", resetCollection);
});

// 許可された文字だけを数式として解析する。eval()は使用しない。
// 複素数は {re: 実部, im: 虚部} で表す。
function parseExpression(source) {

  // 入力の空白を削除
  const input = source.replace(/\s+/g, "");
  // /\s+/gは正規表現です。
  // - \s：空白文字
  // - +：1文字以上の連続
  // - g：文字列全体を対象にする


  if (!input || !/^[0-9+*/.\-i]+$/.test(input)) throw new Error("invalid");
  let pos = 0;
  const add = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
  const neg = a => ({ re: -a.re, im: -a.im });
  const mul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
  const div = (a, b) => {
    const d = b.re * b.re + b.im * b.im;
    if (d === 0) throw new Error("invalid");
    return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
  };
  function factor() {
    let sign = 1;
    while (input[pos] === "+" || input[pos] === "-") {
      if (input[pos] === "-") sign *= -1;
      pos++;
    }
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(input.slice(pos));
    let value;
    if (match) {
      pos += match[0].length;
      value = { re: Number(match[0]), im: 0 };
      if (input[pos] === "i") {
        value = { re: 0, im: value.re };
        pos++;
      }
    } else if (input[pos] === "i") {
      value = { re: 0, im: 1 };
      pos++;
    } else {
      throw new Error("invalid");
    }
    return sign === -1 ? neg(value) : value;
  }
  function term() {
    let value = factor();
    while (input[pos] === "*" || input[pos] === "/") {
      const op = input[pos++];
      const rhs = factor();
      value = op === "*" ? mul(value, rhs) : div(value, rhs);
    }
    return value;
  }
  let value = term();
  while (input[pos] === "+" || input[pos] === "-") {
    const op = input[pos++];
    const rhs = term();
    value = add(value, op === "+" ? rhs : neg(rhs));
  }
  if (pos !== input.length || !Number.isFinite(value.re) || !Number.isFinite(value.im)) {
    throw new Error("invalid");
  }
  return value;
}

// 整数の素数判定
function isPrime(number) {
  if (number < 2) return false;
  if (number === 2) return true;
  if (number % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(number); i += 2) {
    if (number % i === 0) return false;
  }
  return true;
}

// 【大きな変更①】数値の判定と表示を分離。
// この関数はDOMを操作せず、表示に必要な結果オブジェクトだけを返す。
function judgeNumber(original) {
  if (original === "") {
    return { type: "normal", message: "数字を入力してください" };
  }

  let value;
  try {
    value = parseExpression(original);
  } catch (error) {
    return { type: "normal", message: "数を入力してほしいな" };
  }

  if (Math.abs(value.im) > 1e-12) {
    return { type: "normal", message: "実数をいれてほしいな" };
  }

  const number = value.re;
  // 【変更】Math.floor()からMath.round()へ。負数も先に絶対値にして四捨五入する。
  const target = Math.round(Math.abs(number));
  if (!Number.isSafeInteger(target)) {
    return { type: "normal", message: "数が大きすぎて正確に判定できないよ" };
  }

  const notes = [];
  if (!Number.isInteger(number)) notes.push("整数にしてほしいな");
  if (number < 0) notes.push("正の数にしてほしいな");

  let explanation;
  if (target === 0 || target === 1) {
    explanation = `${target}は素数じゃないよ`;
  } else if (isPrime(target)) {
    explanation = `${target}は素数だよ`;
  } else {
    explanation = `${target}は素数ではありません`;
  }

  // 注意が必要な入力は、素数でも通常サイズで表示する。
  if (notes.length > 0) {
    return {
      type: "normal",
      message: `${notes.join("。\n")}。\nちなみに、${explanation}`,
      primeFound: isPrime(target),
      number: target
    };
  }

  if (isPrime(target)) {
    return { type: "prime", number: target, primeFound: true };
  }
  return { type: "normal", message: explanation };
}

// 通常表示専用。
// 前回のアニメーションとインラインの文字サイズを消してから表示する。
function showNormal(message) {
  $("#result")
    .stop(true, true)
    .removeClass("result-prime")
    .addClass("result-normal")
    .css({ opacity: "", fontSize: "", transform: "", whiteSpace: "" })
    .text(message);
}

// 素数の演出専用。
// 2行目は改行せず、文字列全体を画面中央に配置する。
// 数字はspanで囲み、CSSから別のサイズを指定する。
function showPrime(number) {
  const $result = $("#result");
  $result
    .stop(true, true)
    .removeClass("result-normal")
    .addClass("result-prime")
    .css({ opacity: 0, fontSize: "2rem", transform: "", whiteSpace: "" })
    .empty()
    .append($("<span>").addClass("prime-number").text(number))
    .append(document.createTextNode(" は\n素数だぁぁぁぁぁあ！"))
    .animate({ opacity: 1, fontSize: "6rem" }, 900);
}

// checkPrime()は各処理を呼ぶ司令塔
function checkPrime() {

  // ==== [1] 入力内容の正規化 ここから====

  //   == 数字だけ全角にする場合==
  // // const original = $("#numberInput").val()
  // // .replace(/[０-９]/g, char =>
  // //   String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
  // // )
  // // .trim();

  // 全角数字や全角演算子をすべて半角に正規化する。
  const original = $("#numberInput").val().normalize("NFKC").trim();

  // ==== [1] 入力内容の正規化 ここまで====


  // [2] 入力値をJudgeNumberに判定させる
  const result = judgeNumber(original);


  if (result.primeFound) {
    console.log(`素数 ${result.number} を見つけました`);
    addPrime(result.number);
  }

  if (result.type === "prime") {
    showPrime(result.number);
  } else {
    showNormal(result.message);
  }
}


// ============================================================
// 【新機能】素数コレクションとAchievement
// 判定ロジックには手を加えず、判定済みの整数だけを受け取る。
// ============================================================
const STORAGE_KEY = "primeCollection_v1";
const FIRST_DIGIT_PRIMES = [2, 3, 5, 7];
let discoveredPrimes = new Set();

// 【追加】保存データを読み込む。壊れたデータは無視し、画面を動かす。
function loadCollection() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return new Set();
    return new Set(saved.filter(n =>
      typeof n === "number" && Number.isSafeInteger(n) && n >= 2 && isPrime(n)
    ));
  } catch (error) {
    console.warn("保存データを読み込めませんでした", error);
    return new Set();
  }
}

// 【追加】保存できない設定でも判定自体は続けられるようにする。
function saveCollection() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...discoveredPrimes]));
  } catch (error) {
    console.warn("コレクションを保存できませんでした", error);
    $("#collectionStatus").text("このブラウザでは保存できませんでした。再読み込みすると記録が消える可能性があります。");
  }
}

function initializeCollection() {
  discoveredPrimes = loadCollection();
  renderCollection();
  renderAchievements();
}

// 【追加】Setを使うので同じ素数は二重に登録されない。
function addPrime(number) {
  if (!Number.isSafeInteger(number) || number < 2 || !isPrime(number)) return;
  if (discoveredPrimes.has(number)) return;

  const previousAchievements = checkAchievements();
  discoveredPrimes.add(number);
  saveCollection();
  renderCollection();
  renderAchievements();

  const currentAchievements = checkAchievements();
  const unlocked = ACHIEVEMENTS.filter(a => !previousAchievements[a.id] && currentAchievements[a.id]);
  if (unlocked.length) {
    $("#achievementNotice")
      .stop(true, true)
      .hide()
      .text("🏆 Achievement Unlocked! " + unlocked.map(a => a.title).join(" / "))
      .fadeIn(300);
  } else {
    $("#achievementNotice").hide().text("");
  }
}

// 【追加】数値として昇順ソートして安全にDOMへ追加する。
function renderCollection() {
  const primes = [...discoveredPrimes].sort((a, b) => a - b);
  $("#collectionCount").text(primes.length);
  const $list = $("#primeList").empty();
  $("#collectionEmpty").toggle(primes.length === 0);
  primes.forEach(n => $list.append($("<li>").addClass("prime-chip").text(n)));
}

// 【追加】Achievementは保存せず、コレクションから毎回計算する。
// これにより保存データの不整合を防ぐ。
const ACHIEVEMENTS = [
  { id: "first", title: "FIRST PRIME", description: "素数を初めて発見" },
  { id: "single", title: "SINGLE DIGIT MASTER", description: "2・3・5・7をすべて発見" },
  { id: "collector", title: "PRIME COLLECTOR", description: "異なる素数を10個発見" },
  { id: "twin", title: "TWIN PRIME HUNTER", description: "差が2の素数ペアを発見" }
];

function checkAchievements() {
  return {
    first: discoveredPrimes.size >= 1,
    single: FIRST_DIGIT_PRIMES.every(n => discoveredPrimes.has(n)),
    collector: discoveredPrimes.size >= 10,
    twin: [...discoveredPrimes].some(n => discoveredPrimes.has(n + 2))
  };
}

function renderAchievements() {
  const achieved = checkAchievements();
  const $list = $("#achievementList").empty();
  ACHIEVEMENTS.forEach(a => {
    const unlocked = achieved[a.id];
    const $item = $("<li>").addClass("achievement-card").toggleClass("unlocked", unlocked);
    $item.append($("<span>").addClass("achievement-icon").text(unlocked ? "🏆" : "🔒"));
    const $details = $("<div>");
    $details.append($("<strong>").text(a.title));
    $details.append($("<small>").text(a.description));
    $item.append($details);
    $list.append($item);
  });
}

// 【追加】消去前に確認する。Achievementも同時に初期化される。
function resetCollection() {
  if (discoveredPrimes.size === 0) return;
  if (!window.confirm("発見済み素数とAchievementをすべてリセットしますか？")) return;
  discoveredPrimes.clear();
  saveCollection();
  renderCollection();
  renderAchievements();
  $("#achievementNotice").hide().text("");
  $("#collectionStatus").text("コレクションをリセットしました。");
}
