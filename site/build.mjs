/**
 * Builds the public marketing site into dist/ as pre-rendered HTML pages:
 *   dist/index.html, dist/product/index.html, dist/security/index.html, dist/faq/index.html
 * plus styles, fonts, a small client script, link-preview image, robots.txt, sitemap.xml and 404.
 *
 * Every example figure (rankings, missed rewards, insights, the home page's decision tool) is
 * computed at build time with the app's own TypeScript modules from src/lib, so the site and the
 * app can never disagree. The browser receives finished HTML plus a small JSON table.
 *
 * Usage: SITE_URL=https://example.com node site/build.mjs   (SITE_URL is used for absolute link-preview URLs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');

/* ---------- load the app's logic ---------- */
const tmp = path.join(root, 'node_modules', '.cache', 'tapo-site-lib');
fs.mkdirSync(tmp, { recursive: true });
for (const name of ['types', 'format', 'rewards', 'sampleData', 'insights']) {
  const src = fs.readFileSync(path.join(root, 'src/lib', name + '.ts'), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  fs.writeFileSync(path.join(tmp, name + '.js'), js);
}
const { CATEGORY_LABELS } = require(path.join(tmp, 'types.js'));
const { buildDemoData } = require(path.join(tmp, 'sampleData.js'));
const { rankCards } = require(path.join(tmp, 'rewards.js'));
const { buildInsights } = require(path.join(tmp, 'insights.js'));

const NOW = new Date();
const demo = buildDemoData(NOW);
const cards = demo.cards;
const txns = demo.transactions;
const ins = buildInsights(cards, txns, NOW);
const missed = Math.round(ins.tips.reduce((s, t) => s + t.extra, 0) * 100) / 100;

/* ---------- helpers ---------- */
const f0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const f2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr = (n, d) => '₹' + (d ? f2 : f0).format(n);
const pct = (n) => Math.round(n * 100) / 100 + '%';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Category tones match src/components/Icon.tsx (CATEGORY_TINT).
const CAT = {
  groceries: ['#9BCBA6', '#16211A', 'M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2M9 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  dining: ['#E7A58F', '#2A1A15', 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5.5S15 13 17 13v8'],
  fuel: ['#E2B56E', '#2A2114', 'M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M6 9h6M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3'],
  travel: ['#9DB7D3', '#151D27', 'M22 2 11 13M22 2l-7 20-4-9-9-4z'],
  online: ['#86C3BC', '#13221F', 'M6 7h12l1 14H5zM9 7a3 3 0 0 1 6 0'],
  utilities: ['#D9C79A', '#252117', 'M13 2 4 14h7l-1 8 9-12h-7z'],
  entertainment: ['#E39AAE', '#2A161C', 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM10 9v6l5-3z'],
  other: ['#B4B2AC', '#1E1E21', 'M5 12h.01M12 12h.01M19 12h.01'],
};
const ICON = {
  arrow: 'M5 12h14M13 6l6 6-6 6', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', check: 'M5 12l4.5 4.5L19 7',
  wallet: 'M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7h16a1 1 0 0 1 1 1v3m0 5h-4a2.5 2.5 0 0 1 0-5h4z',
  cards: 'M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 11h16M21 9v9a2 2 0 0 1-2 2H8',
  chart: 'M4 19V5M4 19h16M8 15l4-4 3 3 5-6',
};
const ico = (n, s = 20, c = 'currentColor', w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;
const arrow = (s = 16) => `<svg class="arr" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const catIcon = (id, s = 17, box = 34) => `<span class="cico" style="width:${box}px;height:${box}px;background:${CAT[id][1]}"><svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${CAT[id][0]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${CAT[id][2]}"/></svg></span>`;
const LOGO = '<svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#F2EFE9"/><rect x="8" y="13" width="20" height="8" rx="2.4" fill="#0A0A0B"/><rect x="10.5" y="15.2" width="4" height="3.2" rx=".8" fill="#C9A96A"/><rect x="15" y="19" width="6" height="13" rx="2" fill="#0A0A0B"/><path d="M30 12.5a6 6 0 0 1 0 9M33.5 9.5a10.5 10.5 0 0 1 0 15" stroke="#0A0A0B" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>';
const TAP = '<svg class="cf-tap" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8.5 8a5 5 0 0 1 0 8M12 5.5a9 9 0 0 1 0 13M15.5 3a13 13 0 0 1 0 18"/></svg>';
const MARK = '<svg class="cf-logo" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="rgba(255,255,255,.82)"/><rect x="8" y="13" width="20" height="8" rx="2.4" fill="rgba(0,0,0,.55)"/><rect x="15" y="19" width="6" height="13" rx="2" fill="rgba(0,0,0,.55)"/></svg>';
function bestLine(c) {
  const top = [...c.rules].sort((a, b) => b.ratePercent - a.ratePercent)[0];
  return top && top.ratePercent > c.baseRatePercent ? `${pct(top.ratePercent)} on ${CATEGORY_LABELS[top.category]}` : `${pct(c.baseRatePercent)} on everything`;
}
const cardFace = (c) =>
  `<div class="cardface" style="--c:${esc(c.color)}"><span class="cf-tag">EXAMPLE</span><div class="cf-name">${esc(c.nickname)}</div><div class="cf-sub">${esc(bestLine(c))}</div><div class="cf-chip"></div>${TAP}<div class="cf-num">•••• ${esc(c.last4)}</div>${MARK}</div>`;
function cardStats(c) {
  const row = ins.cards.find((r) => r.card.id === c.id);
  const capped = c.rules.filter((r) => r.monthlyCapRupees !== undefined).sort((a, b) => b.ratePercent - a.ratePercent)[0];
  let capLeft = null;
  if (capped) {
    const used = txns.filter((t) => t.cardId === c.id && t.category === capped.category && new Date(t.date).getMonth() === NOW.getMonth()).reduce((s, t) => s + Math.floor(t.amountRupees * capped.ratePercent) / 100, 0);
    capLeft = Math.max(0, Math.round((capped.monthlyCapRupees - used) * 100) / 100);
  }
  const top = [...c.rules].sort((a, b) => b.ratePercent - a.ratePercent)[0];
  return { spend: row ? row.spend : 0, reward: row ? row.reward : 0, capCat: capped?.category, capLeft, bestCat: top && top.ratePercent > c.baseRatePercent ? top.category : null };
}
const phoneBlock = (c) => {
  const s = cardStats(c);
  return `<div class="cb">${cardFace(c)}<div class="cb-info"><div class="cb-row"><span>Spent this month</span><b>${inr(s.spend)}</b></div><div class="cb-row"><span>Rewards earned</span><b class="g">+${inr(s.reward, true)}</b></div>${s.capCat ? `<div class="cb-row"><span>${CATEGORY_LABELS[s.capCat]} cap left</span><b class="a">${inr(s.capLeft)}</b></div>` : ''}<div class="cb-acts"><span>View card</span><span class="p">Best for ${s.bestCat ? CATEGORY_LABELS[s.bestCat].split(' ')[0] : 'all'}</span></div></div></div>`;
};

/* ---------- decision table for the home page tool, ranked by the app's engine ---------- */
const DECIDE_CATS = ['groceries', 'dining', 'travel', 'online', 'fuel', 'utilities', 'entertainment', 'other'];
const DECIDE_AMTS = [500, 2500, 7500, 15000];
function reasonFor(best, list, cat) {
  const L = CATEGORY_LABELS[cat];
  const capped = list.filter((e) => e !== best && e.source === 'category' && e.capLimited && e.capRemaining === 0);
  let r = best.source === 'category' ? `${pct(best.ratePercent)} back on ${L}` : `${pct(best.ratePercent)} everyday rate`;
  if (best.capLimited) r += ` · capped at ${inr(best.rewardRupees, true)} this month`;
  else if (best.capRupees !== undefined) r += ` · ${inr(best.capRemaining)} of the monthly cap left`;
  if (capped.length) r += ` · ${capped[0].card.nickname}'s ${L} cap is used up`;
  return r;
}
const DECIDE = {};
for (const cat of DECIDE_CATS) {
  for (const amt of DECIDE_AMTS) {
    const list = rankCards(cards, cat, amt, txns, NOW);
    const best = list[0];
    DECIDE[`${cat}|${amt}`] = {
      card: best.card.id,
      name: best.card.nickname,
      earn: inr(best.rewardRupees, true),
      why: reasonFor(best, list, cat),
      rows: list.map((e) => ({ n: e.card.nickname, c: e.card.color, r: e.source === 'category' ? `${pct(e.ratePercent)} ${CATEGORY_LABELS[cat]}` : `${pct(e.ratePercent)} everyday`, v: inr(e.rewardRupees, true) })),
    };
  }
}
const CARD_FACES = Object.fromEntries(cards.map((c) => [c.id, cardFace(c)]));

/* ---------- shell ---------- */
// Styles are inlined into every page (no render-blocking request); styles.css is still written for reference.
let CSS = '';
const NAV = [['/', 'Home'], ['/product/', 'Product'], ['/showcase/', 'Tap to pay'], ['/security/', 'Security'], ['/faq/', 'FAQ']];
function page({ pathName, title, description, body, data = '', css = '', script = '' }) {
  const url = SITE_URL + pathName;
  const fullTitle = pathName === '/' ? 'TAPO · The right card for every purchase' : `${title} · TAPO`;
  const navLinks = NAV.map(([h, l]) => `<a href="${h}"${h === pathName ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#0A0A0B">
${SITE_URL ? `<link rel="canonical" href="${url}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="TAPO">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
${SITE_URL ? `<meta property="og:url" content="${url}">\n<meta property="og:image" content="${SITE_URL}/og.png">` : '<meta property="og:image" content="/og.png">'}
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.png">
<link rel="preload" href="/fonts/PlusJakartaSans-Regular.ttf" as="font" type="font/ttf" crossorigin>
<link rel="preload" href="/fonts/PlusJakartaSans-Bold.ttf" as="font" type="font/ttf" crossorigin>
<style>${CSS}${css}</style>
<script>/* adaptive quality: decided before first paint */(function(){try{var n=navigator,m=window.matchMedia,low=(n.connection&&n.connection.saveData)||(n.deviceMemory&&n.deviceMemory<=4)||(n.hardwareConcurrency&&n.hardwareConcurrency<=4)||(m&&m('(prefers-reduced-transparency: reduce)').matches);if(low)document.documentElement.setAttribute('data-quality','low')}catch(e){}})()</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="snav" id="snav"><div class="wrap"><a class="brand" href="/" aria-label="TAPO home">${LOGO}<b>TAPO</b></a>
<nav class="slinks" id="slinks" aria-label="Site"><span class="nav-ind" aria-hidden="true"></span>${navLinks}</nav>
<div class="snav-right"><a class="btn btn-sm btn-quiet signin-link" href="/app/">Sign in</a><a class="btn btn-sm btn-primary magnetic" href="/app/">Open TAPO</a><button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false" aria-controls="sheet"><span class="bars" aria-hidden="true"><i></i><i></i><i></i></span></button></div></div>
<nav class="mobile-sheet glass" id="sheet" aria-label="Site">${navLinks}<a class="btn btn-quiet" href="/app/">Sign in</a></nav></header>
<main id="main">${body}</main>
<footer class="sfoot"><div class="wrap"><div class="fgrid">
<div><a class="brand" href="/">${LOGO}<b>TAPO</b></a><p style="margin-top:14px;max-width:34ch">The right card for every purchase. Made for India.</p></div>
<div><h2 class="fh">Product</h2><ul><li><a href="/product/">How it works</a></li><li><a href="/showcase/">Tap to pay</a></li><li><a href="/app/">Open the web app</a></li><li><a href="/app/">Create an account</a></li></ul></div>
<div><h2 class="fh">Trust</h2><ul><li><a href="/security/">Security</a></li><li><a href="/security/#keep">What we store</a></li><li><a href="/faq/">FAQ</a></li></ul></div>
<div><h2 class="fh">Apps</h2><ul><li>Web · available now</li><li>iPhone · coming soon</li><li>Android · coming soon</li></ul></div></div>
<div class="fine"><p>TAPO is not a bank, card issuer or payment service and does not process payments. TAPO is not affiliated with, endorsed by or partnered with any bank, card network or payment provider. Example cards and figures on this site are fictional and calculated with TAPO's own reward engine. Reward figures are estimates based on the rates you enter and are not financial advice.</p><p>© ${NOW.getFullYear()} TAPO</p></div></div></footer>
${data}
<script src="/site.js" defer></script>${script ? `
<script src="${script}" defer></script>` : ''}
</body>
</html>
`;
}

/* ---------- home ---------- */
const startCat = 'groceries', startAmt = 2500;
const startD = DECIDE[`${startCat}|${startAmt}`];
const ledgerRows = (rows) => rows.map((r, i) => `<div class="ledger-row${i === 0 ? ' win' : ''}"><i style="background:${esc(r.c)}"></i><span class="n">${esc(r.n)}</span><span class="r">${esc(r.r)}</span><span class="v">${r.v}</span></div>`).join('');
const home = `
<section class="hero"><div class="wrap"><div>
<p class="kicker"><b>TAPO</b> rewards wallet · India</p>
<h1><span class="reveal-line"><span>Every card in your wallet.</span></span><span class="reveal-line"><span class="accent">The right one</span></span><span class="reveal-line"><span>for every purchase.</span></span></h1>
<p class="lede">TAPO knows the reward rules on all the cards you carry. Before you pay, it tells you which one earns the most. After you pay, it shows what the wrong one cost you.</p>
<div class="hero-cta"><a class="btn btn-primary magnetic" href="/app/">Create a free account ${arrow()}</a><a class="textlink" href="/product/">How it works ${arrow()}</a></div>
<dl class="hero-facts"><div><dt>NEVER ASKS FOR</dt><dd>Card numbers, CVV, PIN or OTP</dd></div><div><dt>STORED</dt><dd>On your device, encrypted with your password</dd></div><div><dt>COST</dt><dd>Free, in any modern browser</dd></div></dl></div>
<div class="stage3d" id="stage3d">
<div class="phone3d" id="phone3d" role="img" aria-label="The TAPO app on a phone, listing example cards with this month's spending and rewards"><div class="p3-screen" aria-hidden="true"><div class="p3-feed"><div class="p3-set">${cards.map(phoneBlock).join('')}</div></div>
<div class="p3-tabs"><span>${ico('wallet', 15)}Wallet</span><span class="on">${ico('cards', 15)}Cards</span><span>${ico('chart', 15)}Insights</span></div></div></div>
<div class="figure glass f1" aria-hidden="true"><b class="num">${startD.earn}</b>back on ${inr(startAmt)} of groceries</div>
<div class="figure glass f2" aria-hidden="true"><b class="num">${inr(missed, true)}</b>missed this month</div>
</div></div></section>

<section class="sec" id="decide"><div class="wrap">
<div class="split-head rv"><div><p class="kicker">01 · DECIDE</p><h2 class="h2" style="margin-top:16px">A purchase, decided in a tap.</h2></div><p class="lede">Choose what you're buying and how much. TAPO ranks your cards with the same engine the app uses, including how much of each monthly cap is left. Try it with four example cards.</p></div>
<div class="decide rv">
<form class="decide-form" id="decideForm" onsubmit="return false">
<div class="q" role="group" aria-labelledby="qCat"><span id="qCat">WHAT ARE YOU BUYING?</span><div class="seg">${DECIDE_CATS.map((c) => `<button type="button" class="opt" data-cat="${c}" aria-pressed="${c === startCat}"><span class="dot-c" style="background:${CAT[c][1]}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${CAT[c][0]}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${CAT[c][2]}"/></svg></span>${CATEGORY_LABELS[c]}</button>`).join('')}</div></div>
<div class="q" role="group" aria-labelledby="qAmt"><span id="qAmt">HOW MUCH?</span><div class="seg">${DECIDE_AMTS.map((a) => `<button type="button" class="opt amt" data-amt="${a}" aria-pressed="${a === startAmt}">${inr(a)}</button>`).join('')}</div></div>
<p class="subtle small">With your own cards, any amount and any shop, TAPO works out the category for you. <a href="/app/">Open TAPO</a></p>
</form>
<div class="answer" id="answer" aria-live="polite">
<div class="answer-top"><span class="answer-k">PAY WITH</span><span class="answer-ctx" id="aCtx">${CATEGORY_LABELS[startCat]} · ${inr(startAmt)}</span></div>
<div class="answer-main"><div id="aFace">${CARD_FACES[startD.card]}</div><div><h3 class="answer-name" id="aName">${esc(startD.name)}</h3><p class="answer-earn">You earn <b id="aEarn">${startD.earn}</b></p><p class="answer-why" id="aWhy">${esc(startD.why)}</p></div></div>
<div class="ledger" id="aLedger">${ledgerRows(startD.rows)}</div>
</div></div></div></section>

<section class="sec"><div class="wrap">
<div class="split-head rv"><div><p class="kicker">02 · SET UP ONCE</p><h2 class="h2" style="margin-top:16px">Three steps, then it just answers.</h2></div><p class="lede">No bank logins and no card numbers. You tell TAPO what each card earns; TAPO remembers it on your device.</p></div>
<div class="steps rv">
<div class="step"><span class="no">STEP 1</span><h3>Add your cards</h3><p>A nickname, the last four digits as a label, and each card's reward rates and monthly caps.</p>
<div class="frag">${cards.slice(0, 2).map((c) => `<div class="frag-row"><span>${esc(c.nickname)}</span><b>${esc(bestLine(c))}</b></div>`).join('')}</div></div>
<div class="step"><span class="no">STEP 2</span><h3>Import your spending</h3><p>Drop a bank or card statement CSV. It's read on your device and sorted into categories.</p>
<div class="frag"><div class="frag-row"><span>Purchases found</span><b>${ins.count}</b></div><div class="frag-row"><span>Card numbers kept</span><b>0</b></div></div></div>
<div class="step"><span class="no">STEP 3</span><h3>Pay with the right card</h3><p>Ask before you pay, or review your month and see exactly which swaps would have earned more.</p>
<div class="frag"><div class="frag-row"><span>Earned this month</span><b style="color:var(--sage)">${inr(ins.totalReward, true)}</b></div><div class="frag-row"><span>Missed</span><b style="color:var(--ochre)">${inr(missed, true)}</b></div></div></div>
</div></div></section>

<section class="sec"><div class="wrap"><div class="missed rv">
<div><p class="kicker">03 · LOOK BACK</p><h2 class="h2" style="margin-top:16px">The number most wallets never show you.</h2><p class="lede" style="margin-top:20px">Missed rewards: what your best cards would have earned on the purchases you already made. TAPO shows the figure and exactly how to recover it.</p></div>
<div><div class="big-figure num">${inr(missed, true)}<small>MISSED THIS MONTH · EXAMPLE WALLET</small></div>
<div class="tips" style="margin-top:32px">${(ins.tips.length ? ins.tips.slice(0, 3) : []).map((t) => `<div class="tip-row">${catIcon(t.category)}<div><b>Use ${esc(t.bestCard.nickname)} for ${CATEGORY_LABELS[t.category]}</b><small>${t.count} ${t.count === 1 ? 'purchase' : 'purchases'} this month, before caps</small></div><span class="v">+${inr(t.extra, true)}</span></div>`).join('') || '<p class="muted">Every example purchase already used its best card.</p>'}</div></div>
</div></div></section>

<section class="sec"><div class="wrap"><div class="closing rv"><h2 class="h2">Stop leaving rewards on the table.</h2><div class="hero-cta" style="margin-top:0"><a class="btn btn-primary magnetic" href="/app/">Create a free account ${arrow()}</a><a class="textlink" href="/security/">How we protect your data ${arrow()}</a></div></div></div></section>`;

/* ---------- product ---------- */
const rankG = rankCards(cards, 'groceries', 2340, txns, NOW);
const layers = [
  `<span class="ds-k">GOOD EVENING</span><div class="ds-h">Your wallet</div><div style="margin:6px 2px 8px">${cardFace(cards[0])}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="ds-t"><span class="ds-k">SPENT</span><b>${inr(ins.totalSpend)}</b></div><div class="ds-t"><span class="ds-k">EARNED</span><b style="color:var(--sage)">${inr(ins.totalReward)}</b></div></div>`,
  `<span class="ds-k">BEST CARD</span><div class="ds-h">Groceries · ${inr(2340)}</div>${rankG.map((e, i) => `<div class="ds-t${i === 0 ? ' win' : ''}"><div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(e.card.nickname)}</span><b style="font-size:13px;${i === 0 ? 'color:var(--sage)' : ''}">${inr(e.rewardRupees, true)}</b></div></div>`).join('')}`,
  `<span class="ds-k">THIS MONTH</span><div class="ds-h">Missed rewards</div><div class="ds-t"><span class="ds-k">COULD HAVE EARNED</span><b style="font-size:28px;color:var(--ochre)">${inr(missed, true)}</b></div>${ins.tips.slice(0, 3).map((t) => `<div class="ds-t warn">Use ${esc(t.bestCard.nickname)} for ${CATEGORY_LABELS[t.category]}</div>`).join('')}`,
  `<span class="ds-k">INSIGHTS</span><div class="ds-h">This month</div><div class="ds-t">${ins.categories.slice(0, 5).map((c) => `<div class="ds-row" style="display:block"><div style="display:flex;justify-content:space-between"><span>${CATEGORY_LABELS[c.category]}</span><span>${inr(c.spend)}</span></div><div class="bar" style="margin-top:5px"><i style="width:${Math.max(4, (c.spend / ins.categories[0].spend) * 100)}%;background:${CAT[c.category][0]}"></i></div></div>`).join('')}</div>`,
];
const chapters = [
  ['01', 'Your cards, in one place', 'Add each card with its reward rates and monthly caps. TAPO keeps a nickname and the last four digits as a label, and nothing else.'],
  ['02', 'Ask before you pay', 'Type the shop or pick a category, enter the amount. TAPO ranks every card, checks how much of each cap is left this month, and tells you which to tap, with the reasons.'],
  ['03', 'See what you missed', 'Import a statement and TAPO compares every purchase against your best card. The difference is your missed rewards, with the swaps that recover them.'],
  ['04', 'Insights that pay off', 'Spending by category, rewards by card, and specific changes to make next month. All of it calculated on your device.'],
];
const product = `
<section class="sec first" style="padding-bottom:var(--s7)"><div class="wrap"><p class="kicker">PRODUCT</p><h1 class="h2" style="font-size:clamp(40px,6vw,80px);margin-top:18px;max-width:16ch">One app. Every card working its hardest.</h1><p class="lede" style="margin-top:22px">Here's how TAPO turns a wallet full of cards into one clear answer.</p></div></section>
<section style="padding-bottom:var(--s8)"><div class="wrap scrolly"><div class="phone-sticky"><div class="device" role="img" aria-label="TAPO app screens matching the chapter in view"><div class="dscreen">${layers.map((l, i) => `<div class="layer${i === 0 ? ' on' : ''}" data-layer="${i}">${l}</div>`).join('')}</div></div></div>
<div class="chapters">${chapters.map((c, i) => `<div class="chapter${i === 0 ? ' on' : ''}" data-ch="${i}"><span class="no">${c[0]}</span><h2>${c[1]}</h2><p>${c[2]}</p></div>`).join('')}<div><a class="btn btn-primary magnetic" href="/app/">Try it now ${arrow()}</a></div></div></div></section>
<section class="sec" id="rise" style="overflow:hidden"><div class="wrap"><div class="split-head"><div><p class="kicker">THREE SCREENS</p><h2 class="h2" style="margin-top:16px">Your cards. Your best pick. Your month.</h2></div></div>
<div class="rise" id="risePhones">${[0, 1, 3].map((i) => `<div class="device" aria-hidden="true"><div class="dscreen"><div class="layer">${layers[i]}</div></div></div>`).join('')}</div>
<div class="rise-cap"><span>WALLET</span><span>BEST CARD</span><span>INSIGHTS</span></div></div></section>`;

/* ---------- security ---------- */
const check = ico('check', 18, '#8FCBA6', 2.4);
const security = `
<section class="sec first"><div class="wrap"><p class="kicker">SECURITY &amp; PRIVACY</p><h1 class="h2" style="font-size:clamp(40px,6vw,80px);margin-top:18px;max-width:15ch">We can't leak what we never collect.</h1><p class="lede" style="margin-top:22px">TAPO is designed so sensitive card data has nowhere to go, and the little it does keep is encrypted with a key only your password can create.</p></div></section>
<section class="sec" id="keep"><div class="wrap"><div class="keep rv">
<div><h2 class="keep-h">What TAPO keeps</h2><ul>
<li><span>Your name and email</span><span>to sign you in</span></li>
<li><span>Card nicknames and last four digits</span><span>as labels</span></li>
<li><span>Reward rates and monthly caps</span><span>you enter them</span></li>
<li><span>Date, merchant and amount of purchases</span><span>from statements you import</span></li>
<li><span>A salted hash of your password</span><span>never the password</span></li></ul></div>
<div class="never"><h2 class="keep-h">What TAPO never asks for</h2><ul>
<li><span>Full card number</span><span>no field exists</span></li><li><span>CVV or PIN</span><span>no field exists</span></li><li><span>OTP or UPI PIN</span><span>no field exists</span></li><li><span>Net-banking login</span><span>no bank connection</span></li><li><span>Payment tokens</span><span>TAPO never pays</span></li></ul></div>
</div></div></section>
<section class="sec"><div class="wrap"><div class="split-head"><div><p class="kicker">HOW YOUR WALLET IS LOCKED</p><h2 class="h2" style="margin-top:16px">Four steps, all on your device.</h2></div><p class="lede">Nothing in this chain leaves your phone or browser. There is no TAPO server to breach.</p></div>
<div class="flowline rv">
<div><h3>You sign in</h3><p>Your password is typed on your device and goes nowhere else.</p></div>
<div><h3>A key is derived</h3><p>The password becomes an encryption key with <code>PBKDF2-SHA256</code> and a random salt.</p></div>
<div><h3>The wallet is sealed</h3><p>Cards and spending are stored encrypted with <code>AES-256-GCM</code>. The key is never saved.</p></div>
<div><h3>It locks itself</h3><p>After 10 minutes without activity TAPO forgets the key. Five wrong passwords pause sign-in for 30 seconds.</p></div>
</div></div></section>
<section class="sec"><div class="wrap"><div class="split-head"><div><p class="kicker">OUR PROMISES</p><h2 class="h2" style="margin-top:16px">Advice, not access.</h2></div></div><div class="promises rv">
${[['TAPO never moves money', 'It recommends a card. You pay the way you always do.'], ['No bank logins, ever', "TAPO doesn't connect to your bank and never asks for credentials."], ['Estimates you can check', 'Rewards follow the rates you enter, rounded down so we never over-promise.'], ['You can delete everything', 'Remove your account and all of its data from your device at any time.']].map(([t, p]) => `<div class="promise">${check}<div><h3>${t}</h3><p>${p}</p></div></div>`).join('')}
</div></div></section>`;

/* ---------- faq ---------- */
const faqs = [
  ['Is TAPO a bank or a payment app?', "No. TAPO doesn't issue cards, hold money or process payments. It tells you which of your existing cards to use; you keep paying with your cards as usual."],
  ['Which banks and cards work with TAPO?', "Any credit or debit card. You enter each card's reward rates yourself, so TAPO works with any issuer or network. TAPO isn't affiliated with any bank or card network."],
  ['Will TAPO ask for my card number or OTP?', 'Never. TAPO stores a nickname and, if you like, the last four digits as a label. It has no way to accept a full card number, CVV, PIN or OTP.'],
  ['Why do I need an account?', 'Your account is what encrypts your wallet. TAPO turns your password into the key that locks your cards and spending, so nobody else using your device can read them.'],
  ['Where is my data stored?', 'On your device only: in the app, or in your browser on the web. It is encrypted with your password. Nothing is sent to a server.'],
  ['Why did TAPO lock?', 'TAPO locks after 10 minutes without activity and forgets the key, so an unattended device stays private. Sign in again to continue.'],
  ['I forgot my password. Can I reset it?', 'No one can: the password is the only way to unlock the encrypted wallet. On the sign-in screen, choose "Can’t sign in?" to remove that account and its data from your device, then create a new one.'],
  ['How accurate are the reward estimates?', "They follow the rates and monthly caps you enter, rounded down to the paisa. Your issuer's statement is always the final word."],
  ['Is there a phone app?', 'TAPO works in any modern browser today, on phone or desktop. Native iPhone and Android apps are coming soon.'],
  ['How much does TAPO cost?', 'Nothing. TAPO is free.'],
];
const faq = `
<section class="sec first"><div class="wrap faq-layout">
<div class="faq-aside"><p class="kicker">FAQ</p><h1 class="h2" style="font-size:clamp(40px,5.4vw,72px)">Questions, answered.</h1><p class="lede">How TAPO works and what it does with your data.</p><div><a class="textlink" href="/security/">Read about security ${arrow()}</a></div></div>
<div class="faq">${faqs.map(([q, a]) => `<details><summary>${q}<span class="plus" aria-hidden="true"></span></summary><div class="ans"><p>${a}</p></div></details>`).join('')}</div>
</div></section>
<section class="sec"><div class="wrap"><div class="closing"><h2 class="h2">Ready when you are.</h2><a class="btn btn-primary magnetic" href="/app/">Open TAPO ${arrow()}</a></div></div></section>`;

const notFound = `<section class="sec first"><div class="wrap"><p class="kicker">404</p><h1 class="h2" style="margin-top:16px">This page doesn't exist.</h1><p class="lede" style="margin-top:16px">The link may be old or mistyped.</p><div style="margin-top:28px"><a class="btn btn-primary" href="/">Go to the home page</a></div></div></section>`;

/* ---------- showcase: tap to pay, as an animated 3D walkthrough ----------
 * Product page for TAPO's tap flow: tag → phone → checkout → best card and receipt.
 * The card shown is the one the app's rewards engine picks for this purchase (rankCards, the same
 * call the tap screen makes). site/showcase.js only advances the four steps; without it the page
 * shows the finished flow.
 */
const SC_MERCHANT = { name: 'Fresh Mart', category: 'groceries', amount: 845 };
const SC_RECEIPT = 'TP-20261121-7KQ2XM';
const SC_STAGES = ['Reading the tag', 'Choosing your best card', 'Confirming'];
const scRank = rankCards(cards, SC_MERCHANT.category, SC_MERCHANT.amount, txns, NOW);
const scBest = scRank[0];
const scCard = scBest.card;
const scCardLabel = `${esc(scCard.nickname)} •••• ${esc(scCard.last4)}`;
const scCat = CATEGORY_LABELS[SC_MERCHANT.category];
const scEarn = inr(scBest.rewardRupees, true);
const NFC_WAVES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8.5 8a5 5 0 0 1 0 8M12 5.5a9 9 0 0 1 0 13M15.5 3a13 13 0 0 1 0 18"/></svg>';
const SC_STEPS = [
  ['Tag', 'Each checkout has a small TAPO tag. It holds a short code, never card or payment details.'],
  ['Phone', 'Hold your phone near the tag. TAPO reads it and shows the shop and amount to confirm.'],
  ['Checkout', 'TAPO checks your cards, including how much of each monthly reward cap is left, and confirms on your phone.'],
  ['Card &amp; receipt', `You get the card that earns the most, here ${esc(scCard.nickname)} for ${scCat}, and a receipt kept on your phone.`],
];
const scScreen = [
  `<div class="scr s0"><p class="ph-k">Tap to pay</p><p class="ph-m">${SC_MERCHANT.name}</p><p class="ph-amt num">${inr(SC_MERCHANT.amount, true)}</p><div class="ph-wait"><span class="ph-nfc">${NFC_WAVES}</span><span>Hold your phone near the tag</span></div><span class="ph-btn ghost">Tap on screen instead</span></div>`,
  `<div class="scr s1"><p class="ph-ok"><span class="dot"></span>Tag read</p><p class="ph-code">${SC_MERCHANT.name} · counter 1</p><div class="ph-rows"><div><span>Shop</span><b>${SC_MERCHANT.name}</b></div><div><span>Amount</span><b class="num">${inr(SC_MERCHANT.amount, true)}</b></div><div><span>Card</span><b>${scCardLabel}</b></div></div><span class="ph-btn">Continue</span></div>`,
  `<div class="scr s2"><p class="ph-k">Processing</p><ol class="ph-stages">${SC_STAGES.map((t) => `<li><span class="tick"></span>${t}</li>`).join('')}</ol><p class="ph-note">This takes a second</p></div>`,
  `<div class="scr s3"><span class="ph-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4.5 4.5L19 7"/></svg></span><p class="ph-res">Tap complete</p><p class="ph-amt num sm">${inr(SC_MERCHANT.amount, true)}</p><p class="ph-note">You earned ${scEarn} with ${esc(scCard.nickname)}</p><span class="ph-btn ghost">View receipt</span></div>`,
];
const scReceipt = `<div class="receipt" aria-hidden="true"><p class="rc-h"><b>TAPO</b><span>RECEIPT</span></p><div class="rc-rows"><div><span>Shop</span><b>${SC_MERCHANT.name}</b></div><div><span>Amount</span><b class="num">${inr(SC_MERCHANT.amount, true)}</b></div><div><span>Card</span><b>${scCardLabel}</b></div><div><span>Rewards</span><b class="num">${scEarn}</b></div><div><span>Ref</span><b class="mono">${SC_RECEIPT}</b></div></div><p class="rc-f">Saved on your phone</p></div>`;
const scStatic = SC_STEPS.map(([t], i) => `${i + 1}, ${t.replace('&amp;', 'and')}`).join('; ');
const showcase = `
<section class="sc-hero"><div class="wrap">
<p class="kicker"><b>TAPO</b> tap to pay</p>
<h1 class="sc-h1">One tap. <span class="accent">The right card, every time.</span></h1>
<p class="lede">Hold your phone to a TAPO tag at checkout. TAPO reads it, picks the card in your wallet that earns the most, and keeps the receipt on your phone.</p>
</div></section>

<section class="sc-stage-sec" aria-labelledby="flowTitle"><div class="wrap">
<h2 class="sr" id="flowTitle">How a tap works</h2>
<div class="sc-stage" id="scStage" data-step="3">
<div class="scene" role="img" aria-label="Animated walkthrough of a tap: ${esc(scStatic)}. ${esc(SC_MERCHANT.name)}, ${esc(inr(SC_MERCHANT.amount, true))}, with ${esc(scCard.nickname)}, earning ${esc(scEarn)}.">
<div class="world" aria-hidden="true">
<div class="floor"><i class="rail"></i><i class="node n0"></i><i class="node n1"></i><i class="node n2"></i><i class="node n3"></i></div>
<div class="tag3d"><div class="tag-face"><span class="tag-coil"></span><span class="tag-k">TAPO</span><span class="tag-code">Tap here</span></div><span class="tag-shadow"></span></div>
<div class="ripples"><i></i><i></i><i></i></div>
<div class="phone3d-sc"><div class="ph-body"><div class="ph-screen"><p class="ph-top"><span>9:41</span><span>TAPO</span></p><div class="scrs">${scScreen.join('')}</div></div></div><span class="ph-shadow"></span></div>
<div class="pick"><div class="pick-k"><span>Best card for ${scCat}</span><b class="num">earns ${scEarn}</b></div>${cardFace(scCard).replace('<span class="cf-tag">EXAMPLE</span>', '')}</div>
${scReceipt}
</div></div>
<div class="sc-controls">
<ol class="sc-rail" id="scRail">${SC_STEPS.map(([t, d], i) => `<li><button type="button" class="sc-step" data-go="${i}"${i === 3 ? ' aria-current="step"' : ''}><span class="sc-no">${i + 1}</span><span class="sc-t">${t}</span><span class="sc-d">${d}</span><span class="sc-bar" aria-hidden="true"><i></i></span></button></li>`).join('')}</ol>
<button type="button" class="btn btn-sm btn-quiet sc-play" id="scPlay" hidden><span class="sc-play-i" aria-hidden="true"></span><span class="sc-play-l">Pause</span></button>
</div>
<p class="sr" id="scLive" aria-live="polite"></p>
</div></div></section>

<section class="sec"><div class="wrap">
<div class="split-head rv"><div><p class="kicker">WHERE YOU CAN TAP</p><h2 class="h2" style="margin-top:16px">Tap with your phone. Or tap on screen.</h2></div><p class="lede">Where your phone or browser can't read NFC tags, the same checkout runs with one tap on the screen.</p></div>
<div class="sc-table rv" role="region" aria-label="NFC support by platform" tabindex="0"><table>
<thead><tr><th scope="col">Where you use TAPO</th><th scope="col">Reads TAPO tags</th></tr></thead>
<tbody>
<tr><td>Chrome on Android</td><td><span class="yes">Yes</span> Web NFC</td></tr>
<tr><td>TAPO for Android · coming soon</td><td><span class="yes">Yes</span> built-in NFC</td></tr>
<tr><td>TAPO for iPhone · coming soon</td><td><span class="yes">Yes</span> iOS scanning sheet</td></tr>
<tr><td>Safari and other iPhone browsers</td><td><span class="no">No</span> tap on screen</td></tr>
<tr><td>Desktop browsers</td><td><span class="no">No</span> tap on screen</td></tr>
</tbody></table></div>
</div></section>

<section class="sec"><div class="wrap"><div class="closing rv"><h2 class="h2">Make your next tap count.</h2><div class="hero-cta" style="margin-top:0"><a class="btn btn-primary magnetic" href="/app/">Open TAPO ${arrow()}</a><a class="textlink" href="/security/">How we protect your data ${arrow()}</a></div><p class="subtle small" style="margin-top:18px;max-width:62ch">Create an account, add your cards, then choose <b>Tap to pay</b> from your wallet.</p></div></div></section>`;

/* ---------- write ---------- */
fs.rmSync(path.join(out, 'product'), { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
// Plus Jakarta Sans (SIL Open Font License), copied from the @expo-google-fonts package at build time.
const SITE_FONTS = [['Regular', 400], ['Medium', 500], ['Bold', 700]];
const fontFaces = SITE_FONTS
  .map(([n, w]) => `@font-face{font-family:"Plus Jakarta Sans";font-weight:${w};font-style:normal;font-display:swap;src:url(/fonts/PlusJakartaSans-${n}.ttf) format("truetype")}`)
  .join('\n');
CSS = buildCss();
const decideData = `<script type="application/json" id="decide-data">${JSON.stringify({ table: DECIDE, faces: CARD_FACES, labels: CATEGORY_LABELS }).replace(/</g, '\\u003c')}</script>`;
const PAGES = [
  { pathName: '/', file: 'index.html', title: 'Home', description: 'TAPO tells you which of your cards earns the most for every purchase, and shows the rewards you missed. Free, encrypted, built for India.', body: home, data: decideData },
  { pathName: '/product/', file: 'product/index.html', title: 'Product', description: 'How TAPO ranks your cards, tracks monthly caps and finds the rewards you missed.', body: product },
  { pathName: '/security/', file: 'security/index.html', title: 'Security', description: 'TAPO never asks for card numbers, OTPs or bank logins, and encrypts your wallet with your password.', body: security },
  { pathName: '/showcase/', file: 'showcase/index.html', title: 'Tap to pay', description: 'Hold your phone to a TAPO tag at checkout. TAPO picks the card that earns the most and keeps the receipt on your phone.', body: showcase, css: fs.readFileSync(path.join(root, 'site/showcase.css'), 'utf8'), script: '/showcase.js' },
  { pathName: '/faq/', file: 'faq/index.html', title: 'FAQ', description: 'Answers about TAPO accounts, encryption, supported cards and reward estimates.', body: faq },
];
for (const p of PAGES) {
  const file = path.join(out, p.file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page(p));
}
fs.writeFileSync(path.join(out, '404.html'), page({ pathName: '/404', title: 'Page not found', description: 'This page does not exist.', body: notFound }));
function buildCss() {
  return fontFaces + '\n' + fs.readFileSync(path.join(root, 'site/styles.css'), 'utf8');
}
fs.writeFileSync(path.join(out, 'styles.css'), CSS);
fs.copyFileSync(path.join(root, 'site/site.js'), path.join(out, 'site.js'));
fs.copyFileSync(path.join(root, 'site/showcase.js'), path.join(out, 'showcase.js'));
fs.cpSync(path.join(root, 'site/public'), out, { recursive: true });
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
const fontPkg = path.join(root, 'node_modules/@expo-google-fonts/plus-jakarta-sans');
for (const [n, w] of SITE_FONTS) {
  fs.copyFileSync(path.join(fontPkg, `${w}${n}/PlusJakartaSans_${w}${n}.ttf`), path.join(out, 'fonts', `PlusJakartaSans-${n}.ttf`));
}
fs.copyFileSync(path.join(fontPkg, 'LICENSE_FONT'), path.join(out, 'fonts', 'OFL.txt'));
fs.copyFileSync(path.join(root, 'assets/favicon.png'), path.join(out, 'favicon.png'));
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /app/\n${SITE_URL ? `Sitemap: ${SITE_URL}/sitemap.xml\n` : ''}`);
if (SITE_URL) {
  fs.writeFileSync(
    path.join(out, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map((p) => `  <url><loc>${SITE_URL}${p.pathName}</loc></url>`).join('\n')}\n</urlset>\n`,
  );
}
console.log(`site built: ${PAGES.length} pages${SITE_URL ? ` for ${SITE_URL}` : ' (set SITE_URL for absolute preview links)'}`);
