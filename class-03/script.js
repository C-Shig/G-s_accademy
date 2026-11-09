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
		.css({ opacity: 0, fontSize: "", transform: "", whiteSpace: "" })
		.empty()
		.append($("<span>").addClass("prime-number").text(number))
		.append(document.createTextNode(" は\n素数だぁぁぁぁぁあ！"))
		.animate({ opacity: 1 }, 900); // 【変更】文字サイズはCSSで制御し、中央配置とレスポンシブを維持
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
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...discoveredPrimes].sort((a, b) => a - b)));
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

	// 【変更】登録前後のバッジIDを比較し、新規獲得分だけ通知する。
	const before = new Set(checkAchievements().map(a => a.id));
	discoveredPrimes.add(number);
	saveCollection();
	renderCollection();
	const after = checkAchievements();
	renderAchievements(after);
	const unlocked = after.filter(a => !before.has(a.id));
	if (unlocked.length) {
		$("#achievementNotice")
			.stop(true, true).hide()
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

// ============================================================
// 【大きな変更】Achievement v1：コレクションから動的にバッジを生成する。
// 既存の入力解析・素数判定には手を加えない。
// ============================================================

// 【拡張箇所】4桁を追加する場合は MAX_COMPLETE_DIGITS を4に変更。
// 4桁の素数は1061個あるため、描画・判定時間も検証すること。
const MAX_COMPLETE_DIGITS = 3;

// 1〜3桁の全素数を、既存のisPrime()を使って一度だけ生成する。
const PRIMES_BY_DIGITS = new Map();
for (let digits = 1; digits <= MAX_COMPLETE_DIGITS; digits++) {
	const start = digits === 1 ? 2 : 10 ** (digits - 1);
	const end = 10 ** digits;
	const primes = [];
	for (let n = start; n < end; n++) if (isPrime(n)) primes.push(n);
	PRIMES_BY_DIGITS.set(digits, primes);
}

function isPalindromePrime(n) {
	const text = String(n);
	return text === [...text].reverse().join("");
}

// Emirp: 数字を逆順にした別の数も素数（回文素数は除外）。
// 逆順の数がコレクションに存在する必要はない。
function isEmirp(n) {
	const reversed = Number([...String(n)].reverse().join(""));
	return Number.isSafeInteger(reversed) && reversed !== n && isPrime(reversed);
}

// メルセンヌ素数：素数nについて、n+1が2の整数乗かを除算で検査。
// Numberの安全整数範囲を越える場合は将来BigIntで対応する。
function isMersennePrime(n) {
	if (!Number.isSafeInteger(n) || !Number.isSafeInteger(n + 1)) return false;
	let value = n + 1;
	if (value < 2) return false;
	while (value % 2 === 0) value /= 2;
	return value === 1;
}

// パターンに一致する全ての素数が「発見済み」の場合に1組と数える。
// 素数三つ子は(3,5,7)の特例と(p,p+2,p+6)/(p,p+4,p+6)。
// 共有する素数があっても異なる組はそれぞれカウントする。
function countPrimeGroups(primes, offsets) {
	let count = 0;
	for (const n of primes) {
		if (offsets.every(offset => discoveredPrimes.has(n + offset))) count++;
	}
	return count;
}

function countTriplets(primes) {
	const groups = new Set();
	for (const n of primes) {
		for (const offsets of [[0, 2, 6], [0, 4, 6]]) {
			if (offsets.every(d => discoveredPrimes.has(n + d))) {
				groups.add(offsets.map(d => n + d).join(","));
			}
		}
	}
	if ([3, 5, 7].every(n => discoveredPrimes.has(n))) groups.add("3,5,7");
	return groups.size;
}

function badge(id, title, description, icon, number, category) {
	return { id, title, description, icon, number: String(number), category };
}

// 【変更】達成済みの実績だけを配列で返す。保存済みデータから毎回再計算。
function checkAchievements() {
	const primes = [...discoveredPrimes].sort((a, b) => a - b);
	const results = [];

	// 1〜3桁制覇。各桁の素数を全て発見したときに1枚ずつ獲得。
	for (const [digits, allPrimes] of PRIMES_BY_DIGITS) {
		if (allPrimes.every(n => discoveredPrimes.has(n))) {
			results.push(badge(`digits-${digits}`, `${digits}桁マスター`,
				`${digits}桁の素数${allPrimes.length}個をすべて発見！`, "🏅", digits, "digits"));
		}
	}

	// 10、100、1000... と、それぞれ独立したバッジを獲得。
	for (let threshold = 10; threshold <= primes.length; threshold *= 10) {
		results.push(badge(`collector-${threshold}`, `素数${threshold}個`,
			`異なる素数を${threshold}個発見！`, "🔎", threshold, "collector"));
		if (threshold > Number.MAX_SAFE_INTEGER / 10) break;
	}

	const palindromeCount = primes.filter(isPalindromePrime).length;
	const emirpCount = primes.filter(isEmirp).length;
	for (let count = 10; count <= palindromeCount; count += 10) {
		results.push(badge(`palindrome-${count}`, `回文素数${count}個`,
			`回文素数を${count}個発見！`, "🍅", count, "palindrome"));
	}
	for (let count = 10; count <= emirpCount; count += 10) {
		results.push(badge(`emirp-${count}`, `Emirp ${count}個`,
			`Emirp（逆から読んでも別の素数）を${count}個発見！`, "EMIRP", count, "emirp"));
	}

	const mersenneCount = primes.filter(isMersennePrime).length;
	// メルセンヌ・素数ペアは、現時点の発見個数を1枚のバッジで表示。
	if (mersenneCount) results.push(badge("mersenne", "メルセンヌ素数",
		`メルセンヌ素数を${mersenneCount}個発見！`, "MERSENNE", mersenneCount, "mersenne"));

	const twinCount = countPrimeGroups(primes, [0, 2]);
	const tripletCount = countTriplets(primes);
	const quadrupletCount = countPrimeGroups(primes, [0, 2, 6, 8]);
	if (twinCount) results.push(badge("twin", "双子素数",
		`双子素数を${twinCount}組発見！`, "🐣🐣", twinCount, "group"));
	if (tripletCount) results.push(badge("triplet", "三つ子素数",
		`三つ子素数を${tripletCount}組発見！`, "🐣🐣🐣", tripletCount, "group"));
	if (quadrupletCount) results.push(badge("quadruplet", "四つ子素数",
		`四つ子素数を${quadrupletCount}組発見！`, "🍀", quadrupletCount, "group"));
	return results;
}

function renderAchievements(achievements = checkAchievements()) {
	const $list = $("#achievementList").empty();
	$("#achievementEmpty").toggle(achievements.length === 0);
	achievements.forEach(a => {
		// buttonにすることでhoverに加えてタップ・キーボードでも詳細を表示。
		const $item = $("<li>").addClass("achievement-badge-item");
		// title属性を削除し、CSSのツールチップだけを使用する。
		// aria-labelはスクリーンリーダー向けの説明として維持する。
		const $button = $("<button>").attr({
			type: "button",
			"aria-label": `${a.title}：${a.description}`
		}).addClass(`achievement-badge badge-${a.category}`);
		const $icon = $("<span>").addClass("badge-symbol").text(a.icon);
		if (a.category === "emirp") $icon.addClass("mirror-word");
		$button.append($icon);
		$button.append($("<span>").addClass("badge-number").text(a.number));
		$button.append($("<span>").addClass("badge-tooltip").text(a.description));
		$item.append($button);
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
