/**
 * Imports spending from a bank or card statement exported as CSV.
 *
 * SAFETY: only three things are kept from each row — the date, a cleaned
 * merchant description and the amount spent. Every other column (balances,
 * reference numbers, account or card numbers, anything else) is ignored and
 * never stored. Any run of 9 or more digits left in a description (UPI refs,
 * account or card numbers) is masked down to its last four digits.
 * Parsing happens entirely on the device; nothing is uploaded.
 */
import type { Category, Transaction } from './types';

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_AMOUNT = 1_000_000;
export const MAX_IMPORT_BYTES = 2_000_000;

export interface ImportedRow {
  date: string; // ISO
  merchant: string;
  amountRupees: number;
  category: Category;
}

export interface ImportResult {
  rows: ImportedRow[];
  skipped: { credits: number; invalid: number; duplicates: number; overLimit: number };
  columns: { date: string; description: string; amount: string };
}

export class CsvImportError extends Error {}

/* ---------------------------------------------------------------- CSV parsing */

/** RFC 4180-style parser: quoted fields, escaped quotes, commas/newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const delimiter = guessDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === '') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''));
}

function guessDelimiter(src: string): string {
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const counts = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 1 ? counts[0]![0] : ',';
}

/* ----------------------------------------------------------- column detection */

const DATE_HEADERS = ['transaction date', 'txn date', 'tran date', 'date', 'value date', 'posting date'];
const DESC_HEADERS = ['description', 'narration', 'particulars', 'details', 'merchant', 'remarks', 'transaction details'];
const AMOUNT_HEADERS = ['amount', 'transaction amount', 'amount (inr)', 'amount(inr)', 'inr amount'];
const DEBIT_HEADERS = ['debit', 'debit amount', 'withdrawal', 'withdrawal amt', 'withdrawal amount', 'dr', 'debit (inr)'];
const CREDIT_HEADERS = ['credit', 'credit amount', 'deposit', 'deposit amt', 'deposit amount', 'cr', 'credit (inr)'];
const TYPE_HEADERS = ['type', 'dr/cr', 'cr/dr', 'debit/credit', 'transaction type'];

function norm(h: string) {
  return h.toLowerCase().replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findColumn(headers: string[], names: string[]): number {
  const n = headers.map(norm);
  for (const name of names) {
    const exact = n.indexOf(name);
    if (exact >= 0) return exact;
  }
  // Prefix matches ("Withdrawal Amt." → withdrawal) only for longer names, so "dr" never matches "Dr/Cr".
  for (const name of names.filter((x) => x.length >= 4)) {
    const partial = n.findIndex((h) => h.startsWith(name));
    if (partial >= 0) return partial;
  }
  return -1;
}

/** Statements often have a few lines of account info before the real header row. */
function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const r = rows[i]!;
    const hasDate = findColumn(r, DATE_HEADERS) >= 0;
    const hasDesc = findColumn(r, DESC_HEADERS) >= 0;
    const hasAmount = findColumn(r, AMOUNT_HEADERS) >= 0 || findColumn(r, DEBIT_HEADERS) >= 0;
    if (hasDate && hasDesc && hasAmount) return i;
  }
  return -1;
}

/* ------------------------------------------------------------- value parsing */

/** Parses "₹1,23,456.70", "Rs. 450", "INR 99", "(250.00)", "1,200 Dr". Returns NaN if unparseable. */
export function parseAmount(raw: string): number {
  let s = raw.trim();
  if (!s) return NaN;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/\bcr\.?$/i.test(s)) negative = true; // "1,200 Cr" = money in
  s = s.replace(/\b(dr|cr)\.?$/i, '').replace(/₹|rs\.?|inr/gi, '').replace(/,/g, '').trim();
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  const n = Number(s);
  return negative ? -n : n;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/** Day-first Indian formats (dd/mm/yyyy, dd-mm-yy, dd MMM yyyy, dd-MMM-yy) and ISO yyyy-mm-dd. */
export function parseStatementDate(raw: string): Date | null {
  const s = raw.trim().split(/[ T](?=\d{1,2}:)/)[0]!.trim(); // drop a trailing time
  let y: number, m: number, d: number;
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  } else if ((match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s))) {
    [d, m, y] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  } else if ((match = /^(\d{1,2})[-/ ]([A-Za-z]{3,4})[-/ ,]+(\d{2}|\d{4})$/.exec(s))) {
    const mon = MONTHS[match[2]!.toLowerCase()];
    if (mon === undefined) return null;
    [d, m, y] = [Number(match[1]), mon, Number(match[3])];
  } else return null;
  if (y < 100) y += 2000;
  const date = new Date(y, m, d, 12);
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
  return date;
}

/**
 * Masks any run of 9+ digits (account, card, UPI reference) to its last four, and bank-masked card
 * numbers such as "4111XXXXXXXX1234" or "XXXX XXXX XXXX 1234".
 */
export function maskLongNumbers(text: string): string {
  return text
    .replace(/[\dXx*][\dXx* -]{10,}\d/g, (run) => {
      const chars = run.replace(/[ -]/g, '');
      const digits = run.replace(/\D/g, '');
      return chars.length >= 12 && /[Xx*]/.test(chars) && digits.length >= 4 ? `••${digits.slice(-4)}` : run;
    })
    .replace(/\d[\d -]{7,}\d/g, (run) => {
      const digits = run.replace(/\D/g, '');
      return digits.length >= 9 ? `••${digits.slice(-4)}` : run;
    });
}

/** Turns "UPI/DR/412345678901/SWIGGY BANGALORE/YESB/..." into a readable merchant name. */
export function cleanMerchant(raw: string): string {
  let s = maskLongNumbers(raw);
  const upi = /^(upi|imps|neft|pos|ecom|nach|ach)[/-]/i.test(s);
  if (upi) {
    const parts = s.split(/[/|]/).map((p) => p.trim()).filter(Boolean);
    const named = parts.find(
      (p) => /[a-z]{3,}/i.test(p) && !/^(upi|dr|cr|imps|neft|pos|ecom|nach|ach|p2m|p2a|payment|ref)$/i.test(p) && !p.includes('••') && !/@/.test(p),
    );
    if (named) s = named;
  }
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > 40) s = `${s.slice(0, 39)}…`;
  return s || 'Unknown merchant';
}

/* ------------------------------------------------------------- categorising */

const KEYWORDS: [Category, RegExp][] = [
  ['dining', /swiggy|zomato|restaurant|cafe|café|coffee|dominos|domino's|pizza|kfc|mcdonald|burger|starbucks|biryani|dhaba|eatery|bakery|food/i],
  ['groceries', /bigbasket|big basket|blinkit|zepto|dmart|d-mart|grocery|grocer|supermarket|kirana|reliance fresh|more retail|spencer|instamart|jiomart|nature'?s basket|vegetable|milk/i],
  ['fuel', /petrol|diesel|fuel|hpcl|bpcl|iocl|indian oil|bharat petroleum|hindustan petroleum|shell|filling station|\bcng\b/i],
  ['travel', /irctc|makemytrip|goibibo|cleartrip|yatra|indigo|air india|vistara|akasa|spicejet|airline|airways|uber|\bola\b|rapido|redbus|hotel|oyo|metro|railway|airport|travel/i],
  ['online', /amazon|flipkart|myntra|ajio|meesho|nykaa|tata cliq|snapdeal|lenskart|firstcry|purplle|shopping|ecom/i],
  ['utilities', /electricity|bescom|msedcl|tneb|tata power|adani elec|water bill|gas bill|piped gas|broadband|fibre|fiber|recharge|postpaid|prepaid|airtel|jio|\bvi\b|vodafone|bsnl|dth|tata play|insurance|lic\b|bill ?pay|utility/i],
  ['entertainment', /netflix|prime video|hotstar|jiocinema|sonyliv|zee5|spotify|gaana|youtube|bookmyshow|pvr|inox|cinema|movie|steam|playstation|xbox|gaming/i],
];

export function categorise(description: string): Category {
  for (const [category, re] of KEYWORDS) if (re.test(description)) return category;
  return 'other';
}

/* ----------------------------------------------------------------- import */

export function importStatement(text: string, existing: Pick<Transaction, 'date' | 'amountRupees' | 'merchant'>[] = []): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) throw new CsvImportError('That file is too large. Export a shorter date range (under 2 MB).');
  const rows = parseCsv(text);
  if (rows.length < 2) throw new CsvImportError('This file has no rows. Export your statement as CSV and try again.');

  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) {
    throw new CsvImportError(
      'Couldn’t find the columns. TAPO needs a date column, a description column and an amount (or debit) column.',
    );
  }
  const headers = rows[headerIndex]!;
  const dateCol = findColumn(headers, DATE_HEADERS);
  const descCol = findColumn(headers, DESC_HEADERS);
  const amountCol = findColumn(headers, AMOUNT_HEADERS);
  const debitCol = findColumn(headers, DEBIT_HEADERS);
  const creditCol = findColumn(headers, CREDIT_HEADERS);
  const typeCol = findColumn(headers, TYPE_HEADERS);
  const spendCol = debitCol >= 0 ? debitCol : amountCol;
  const negativeIsSpend = debitCol < 0 && typeCol < 0 && hasNegativeSpends(rows, headerIndex, amountCol);

  const seen = new Set(existing.map(key));
  const result: ImportResult = {
    rows: [],
    skipped: { credits: 0, invalid: 0, duplicates: 0, overLimit: 0 },
    columns: { date: headers[dateCol]!, description: headers[descCol]!, amount: headers[spendCol]! },
  };

  for (const r of rows.slice(headerIndex + 1)) {
    const date = parseStatementDate(r[dateCol] ?? '');
    const rawAmount = r[spendCol] ?? '';
    let amount = parseAmount(rawAmount);

    // Separate debit/credit columns: an empty debit with a credit value is money in.
    if (debitCol >= 0 && (rawAmount === '' || amount === 0) && creditCol >= 0 && (r[creditCol] ?? '') !== '') {
      result.skipped.credits++;
      continue;
    }
    const type = typeCol >= 0 ? (r[typeCol] ?? '').toLowerCase() : '';
    if (/^(cr|credit|c)$/.test(type) || /\bcr\.?$/i.test(rawAmount)) {
      result.skipped.credits++;
      continue;
    }
    if (!date || Number.isNaN(amount)) {
      result.skipped.invalid++;
      continue;
    }
    // Card statements list spends as positive; some bank exports show spends as negative.
    const isSpend = negativeIsSpend ? amount < 0 : amount > 0;
    if (!isSpend && amount !== 0) {
      result.skipped.credits++;
      continue;
    }
    amount = Math.abs(amount);
    if (amount === 0) {
      result.skipped.invalid++;
      continue;
    }
    if (amount > MAX_IMPORT_AMOUNT) {
      result.skipped.overLimit++;
      continue;
    }
    if (result.rows.length >= MAX_IMPORT_ROWS) {
      result.skipped.overLimit++;
      continue;
    }
    const rawDesc = r[descCol] ?? '';
    const row: ImportedRow = {
      date: date.toISOString(),
      merchant: cleanMerchant(rawDesc),
      amountRupees: Math.round(amount * 100) / 100,
      category: categorise(rawDesc),
    };
    const k = key(row);
    if (seen.has(k)) {
      result.skipped.duplicates++;
      continue;
    }
    seen.add(k);
    result.rows.push(row);
  }
  return result;
}

/** A single signed amount column where most values are negative means "negative = spend". */
function hasNegativeSpends(rows: string[][], headerIndex: number, col: number): boolean {
  let neg = 0;
  let pos = 0;
  for (const r of rows.slice(headerIndex + 1)) {
    const n = parseAmount(r[col] ?? '');
    if (n < 0) neg++;
    else if (n > 0) pos++;
  }
  return neg > pos;
}

function key(t: { date: string; amountRupees: number; merchant: string }) {
  return `${t.date.slice(0, 10)}|${t.amountRupees}|${t.merchant.toLowerCase()}`;
}

/** Sample CSV students can use to try the importer. Fictional amounts; merchants are generic. */
export const EXAMPLE_CSV = `Date,Description,Debit,Credit,Balance
02/11/2026,UPI/DR/412345678901/SWIGGY/YESB/payment,486.00,,52000.00
03/11/2026,POS 4111XXXXXXXX1234 DMART MUMBAI,2310.50,,49689.50
05/11/2026,SALARY NOV,,85000.00,134689.50
06/11/2026,IOCL PETROL PUMP ANDHERI,3000.00,,131689.50
08/11/2026,AMAZON PAY INDIA,1899.00,,129790.50
10/11/2026,BESCOM ELECTRICITY BILL,1640.00,,128150.50
12/11/2026,IRCTC TICKET BOOKING,1245.00,,126905.50
15/11/2026,NETFLIX.COM,649.00,,126256.50
18/11/2026,ZEPTO MARKETPLACE,734.00,,125522.50`;
