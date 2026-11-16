'use strict';
// index.html と wronglist.html で共有する保存・採点関数。
const STORAGE_KEY = 'masu25_state_v1';
const MISTAKES_KEY = 'masu25_mistakes_v1';
const THEME_KEY = 'masu25_theme_v1';
const $ = selector => document.querySelector(selector);
function readJSON(key, fallback) { try { const raw = localStorage.getItem(key);
  return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback;
  } }
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value));
  }
function gcd(a, b) { a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) { const t = a % b;
  a = b;
  b = t;
  } return a;
  }
function reduce(a, b) { if (b === 0) throw Error('0で割ることはできません');
  if (b < 0) { a = -a;
  b = -b;
  } const d = gcd(a, b);
  return [a / d, b / d];
  }
function calculate(a, b, op) { switch (op) { case '+': return a + b;
  case '-': return a - b;
  case '*': return a * b;
  case '/': return a / b;
  }throw Error('演算子が不正です');
  }
function expectedText(a, b, op) { if (op !== '/') return String(calculate(a, b, op));
  const [n, d] = reduce(a, b);
  return d === 1 ? String(n) : `${n}/${d}`;
  }
// 入力文字列を、厳密な分数 [分子,分母] に変換。小数の浮動小数点誤差を回避する。
function decimalFraction(raw) { if (!/^-?(?:\d+)(?:\.\d+)?$/.test(raw)) return null;
  const neg = raw.startsWith('-');
  const body = neg ? raw.slice(1) : raw;
  const parts = body.split('.');
  const decimals = parts[1] || '';
  if (decimals && decimals.endsWith('0')) return null;
  const n = Number(parts[0] + decimals) * (neg ? -1 : 1), d = 10 ** decimals.length;
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) return null;
  return reduce(n, d);
  }
function isCorrect(actual, a, b, op) {
  if (actual === null || actual === undefined) return false;
  const raw = String(actual).trim();
  if (op !== '/') { return /^-?\d+$/.test(raw) && Number(raw) === calculate(a, b, op);
  }
  if (b === 0) return false;
  const [n, d] = reduce(a, b);
  if (raw.includes('/')) { const m = raw.match(/^(-?\d+)\/([1-9]\d*)$/);
  if (!m) return false;
  const x = Number(m[1]), y = Number(m[2]);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || d === 1) return false;
  const [rx, ry] = reduce(x, y);
  return x === rx && y === ry && x === n && y === d;
  }
  const value = decimalFraction(raw);
  if (!value) return false;
  // 整数は小数表記を認めない。小数は有限小数の厳密な表記のみ認める。
  return value[0] === n && value[1] === d;
}
function opSymbol(op) { return { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] || op;
  }
function mistakes() { const items = readJSON(MISTAKES_KEY, []);
  return Array.isArray(items) ? items : [];
  }
function logMistakeCount() { console.log('[MasuCal] まちがいリストの問題数:', mistakes().length);
  }
function timestamp() { return new Date().toLocaleString('ja-JP');
  }
