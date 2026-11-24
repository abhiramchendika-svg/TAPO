/**
 * Builds the public marketing site into dist/ as pre-rendered HTML pages:
 *   dist/index.html, dist/product/index.html, dist/security/index.html, dist/faq/index.html
 * plus styles, fonts, a small client script, link-preview image, robots.txt, sitemap.xml and 404.
 *
 * Example figures (rankings, missed rewards, insights) are computed with the app's own TypeScript
 * modules from src/lib, transpiled on the fly, so the site and the app can never disagree.
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
const CAT = {
  groceries: ['#8FE0AE', '#17301F', 'M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2M9 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  dining: ['#FFB4A2', '#3A2220', 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5.5S15 13 17 13v8'],
  fuel: ['#F5C66B', '#33270F', 'M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M6 9h6M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3'],
  travel: ['#9EC2FF', '#172540', 'M22 2 11 13M22 2l-7 20-4-9-9-4z'],
  online: ['#C7AEFF', '#2A1F45', 'M6 7h12l1 14H5zM9 7a3 3 0 0 1 6 0'],
  utilities: ['#F0D86A', '#2F2A10', 'M13 2 4 14h7l-1 8 9-12h-7z'],
  entertainment: ['#FF9FD0', '#3A1A2E', 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM10 9v6l5-3z'],
  other: ['#C2C9D8', '#232838', 'M5 12h.01M12 12h.01M19 12h.01'],
};
const ICON = {
  arrow: 'M5 12h14M13 6l6 6-6 6', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', check: 'M5 12l4.5 4.5L19 7',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4', shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2', menu: 'M3 6h18M3 12h18M3 18h18', trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  chart: 'M4 19V5M4 19h16M8 15l4-4 3 3 5-6', wallet: 'M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7h16a1 1 0 0 1 1 1v3m0 5h-4a2.5 2.5 0 0 1 0-5h4z',
  cards: 'M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 11h16M21 9v9a2 2 0 0 1-2 2H8',
};
const ico = (n, s = 20, c = 'currentColor', w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;
const catIcon = (id, s = 19) => `<span class="cico" style="background:${CAT[id][1]}"><svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${CAT[id][0]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${CAT[id][2]}"/></svg></span>`;
const LOGO = '<svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#ECE9E2"/><rect x="8" y="13" width="20" height="8" rx="2.4" fill="#0B0E18"/><rect x="10.5" y="15.2" width="4" height="3.2" rx=".8" fill="#D8B96A"/><rect x="15" y="19" width="6" height="13" rx="2" fill="#0B0E18"/><path d="M30 12.5a6 6 0 0 1 0 9M33.5 9.5a10.5 10.5 0 0 1 0 15" stroke="#0B0E18" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>';
const TAP = '<svg class="cf-tap" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8.5 8a5 5 0 0 1 0 8M12 5.5a9 9 0 0 1 0 13M15.5 3a13 13 0 0 1 0 18"/></svg>';
const MARK = '<svg class="cf-logo" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="rgba(255,255,255,.85)"/><rect x="8" y="13" width="20" height="8" rx="2.4" fill="rgba(0,0,0,.55)"/><rect x="15" y="19" width="6" height="13" rx="2" fill="rgba(0,0,0,.55)"/></svg>';
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
// Five purchases the home page's live ranking cycles through, ranked by the app's own engine.
const DEMOS = [['groceries', 2340], ['travel', 7450], ['online', 1899], ['dining', 1120], ['fuel', 3000]].map(([cat, amt]) => ({
  label: `${CATEGORY_LABELS[cat]} · ${inr(amt)}`,
  rows: rankCards(cards, cat, amt, txns, NOW).slice(0, 3).map((e) => ({ name: e.card.nickname, reward: inr(e.rewardRupees, true), value: e.rewardRupees, color: e.card.color })),
}));

/* ---------- shell ---------- */
const NAV = [['/', 'Home'], ['/product/', 'Product'], ['/security/', 'Security'], ['/faq/', 'FAQ']];
function page({ pathName, title, description, body }) {
  const url = SITE_URL + pathName;
  const fullTitle = pathName === '/' ? 'TAPO · The right card for every purchase' : `${title} · TAPO`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#080B14">
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
<link rel="preload" href="/fonts/Satoshi-Regular.otf" as="font" type="font/otf" crossorigin>
<link rel="preload" href="/fonts/Satoshi-Black.otf" as="font" type="font/otf" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&text=%E2%82%B9&display=swap">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<canvas id="aurora" aria-hidden="true"></canvas>
<header class="snav" id="snav"><div class="wrap"><a class="brand" href="/" aria-label="TAPO home">${LOGO}<b>TAPO</b></a>
<nav class="slinks" id="slinks" aria-label="Site">${NAV.map(([h, l]) => `<a href="${h}"${h === pathName ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
<div class="snav-right"><a class="btn btn-ghost btn-sm signin-link" href="/app/">Sign in</a><a class="btn btn-primary btn-sm" href="/app/">Open TAPO ${ico('arrow', 16)}</a><button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false" aria-controls="slinks">${ico('menu', 20)}</button></div></div></header>
<main id="main">${body}</main>
<footer class="sfoot"><div class="wrap"><div class="fgrid">
<div><a class="brand" href="/">${LOGO}<b>TAPO</b></a><p style="margin-top:14px;max-width:34ch">The right card for every purchase. Made for India.</p></div>
<div><h4>Product</h4><ul><li><a href="/product/">How it works</a></li><li><a href="/app/">Open the web app</a></li><li><a href="/app/">Create an account</a></li></ul></div>
<div><h4>Trust</h4><ul><li><a href="/security/">Security</a></li><li><a href="/security/">Privacy</a></li><li><a href="/faq/">FAQ</a></li></ul></div>
<div><h4>Apps</h4><ul><li>Web · available now</li><li>iPhone · coming soon</li><li>Android · coming soon</li></ul></div></div>
<div class="fine"><p>TAPO is not a bank, card issuer or payment service and does not process payments. TAPO is not affiliated with, endorsed by or partnered with any bank, card network or payment provider. Example cards and figures on this site are fictional and calculated with TAPO's own reward engine. Reward figures are estimates based on the rates you enter and are not financial advice.</p><p>© ${NOW.getFullYear()} TAPO</p></div></div></footer>
<script type="application/json" id="demos">${JSON.stringify(DEMOS).replace(/</g, '\\u003c')}</script>
<script src="/site.js" defer></script>
</body>
</html>
`;
}

/* ---------- pages ---------- */
const mq = [['groceries', '5%'], ['travel', '6%'], ['online', '7%'], ['dining', '3%'], ['fuel', '2.5%'], ['entertainment', '4%'], ['utilities', '2%'], ['other', '1%']];
const home = `
<section class="hero"><div class="wrap"><div>
<span class="pill"><i></i>Free · Works in your browser</span>
<h1>Every card.<br><span class="shine-text">The right one.</span><br>Every time.</h1>
<p class="lede">TAPO knows the reward rules on every card you carry. It tells you which card earns the most before you pay, and shows exactly what the wrong card cost you after.</p>
<div class="hero-cta"><a class="btn btn-primary" href="/app/">Create a free account ${ico('arrow', 18)}</a><a class="btn btn-ghost" href="/product/">See how it works</a></div>
<p class="hero-note">Your wallet is encrypted on your device with your password. TAPO never asks for card numbers.</p></div>
<div class="stage3d" id="stage3d"><div class="glow"></div>
<div class="phone3d" id="phone3d" role="img" aria-label="The TAPO app on a phone, scrolling through example cards with this month's spending and rewards"><div class="p3-screen" aria-hidden="true"><div class="p3-feed"><div class="p3-set">${cards.map(phoneBlock).join('')}</div><div class="p3-set">${cards.map(phoneBlock).join('')}</div></div>
<div class="p3-tabs"><span>${ico('wallet', 15)}Wallet</span><span class="on">${ico('cards', 15)}Cards</span><span>${ico('chart', 15)}Insights</span></div></div></div>
<div class="float-chip glass a"><span class="dot" style="background:var(--green-bg)">${ico('check', 18, '#6FD9A4', 2.6)}</span><span><b class="num">${DEMOS[0].rows[0].reward}</b>back on groceries</span></div>
<div class="float-chip glass b"><span class="dot" style="background:var(--amber-bg)">${ico('trend', 18, '#F5C66B')}</span><span><b class="num">${inr(missed, true)}</b>missed this month</span></div>
</div></div></section>
<div class="marquee" aria-hidden="true"><div class="marquee-track">${[...mq, ...mq].map(([c, r]) => `<span class="mq">${catIcon(c, 15).replace('class="cico" style="', 'class="cico" style="width:28px;height:28px;border-radius:9px;')}${CATEGORY_LABELS[c]} <b>up to ${r}</b></span>`).join('')}</div></div>
<section class="sec"><div class="wrap"><div class="head"><span class="eyebrow">Why TAPO</span><h2 class="h2">Your wallet, finally doing the maths.</h2><p class="lede">Cashback on groceries, miles on travel, a cap that runs out mid-month. Nobody remembers all of it at the counter. TAPO does, instantly.</p></div>
<div class="bento">
<article class="panel tile t-a"><div class="box-h"><h3 style="font-size:22px">The best card, ranked live</h3><span class="tag" id="liveCat">${esc(DEMOS[0].label)}</span></div><p>Pick what you're buying. TAPO ranks every card you own, counts monthly caps, and explains its answer.</p>
<div class="live-rank" id="liveRank">${DEMOS[0].rows.map((r, i) => `<div class="lr${i === 0 ? ' top' : ''}"><b>${esc(r.name)}</b><span>${r.reward}</span><div class="bar"><i style="width:${Math.max(4, (r.value / (DEMOS[0].rows[0].value || 1)) * 100)}%;background:${i === 0 ? 'var(--green)' : r.color}"></i></div></div>`).join('')}</div></article>
<article class="panel tile t-b"><div class="ficon">${ico('trend', 22, '#F5C66B')}</div><h3>Missed rewards</h3><p>One number that matters: what your best cards would have earned this month.</p><div class="big-num num">${inr(missed, true)}</div></article>
<article class="panel tile t-c"><div class="ficon">${ico('file', 22, '#6FD9A4')}</div><h3>Private statement import</h3><p>Drop a bank CSV. It's read on your device, sorted into categories, and never uploaded.</p></article>
<article class="panel tile t-d"><div class="ficon">${ico('chart', 22, '#A99BFF')}</div><h3>Insights that act</h3><p>Where your money went, what each card earned, and the swaps that pay off.</p><div class="mini-bars" aria-hidden="true">${ins.categories.slice(0, 7).map((c, i) => `<i style="height:${Math.max(18, Math.round(c.share * 100 * 2.2))}%;--c:${CAT[c.category][0]};animation-delay:${i * 0.07}s"></i>`).join('')}</div></article>
<article class="panel tile t-e"><div class="ficon">${ico('shield', 22, '#ECE9E2')}</div><h3>Encrypted by your password</h3><p>Your wallet is locked with a key only your password can make. No card numbers, no OTPs, no bank logins.</p></article>
</div></div></section>
<section class="sec"><div class="wrap"><div class="head center"><span class="eyebrow">Three steps</span><h2 class="h2">Set up in five minutes.</h2></div><div class="steps3">
<div class="panel st"><span class="n">1</span><h3>Add your cards</h3><p>A nickname, the last four digits as a label, and each card's reward rates and caps.</p></div>
<div class="panel st"><span class="n">2</span><h3>Import your spending</h3><p>Load a statement CSV. TAPO categorises every purchase on your device.</p></div>
<div class="panel st"><span class="n">3</span><h3>Pay with the right card</h3><p>Ask before you pay, or review your month and recover what you missed.</p></div>
</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="cta-band"><h2 class="h2">Stop leaving rewards on the table.</h2><p class="lede">Create a free account and see your best card in seconds. No download needed.</p><a class="btn btn-primary" href="/app/">Get started ${ico('arrow', 18)}</a></div></div></section>`;

const layers = [
  `<span class="ds-k">Good evening</span><div class="ds-h">Your wallet</div><div style="margin:6px 4px 8px">${cardFace(cards[0])}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="ds-t"><span class="ds-k">Spent</span><b>${inr(ins.totalSpend)}</b></div><div class="ds-t"><span class="ds-k" style="color:var(--green)">Earned</span><b>${inr(ins.totalReward)}</b></div></div>`,
  `<span class="ds-k">Best card</span><div class="ds-h">${DEMOS[0].label}</div>${rankCards(cards, 'groceries', 2340, txns, NOW).map((e, i) => `<div class="ds-t" style="${i === 0 ? 'border-color:#1F4A3A;background:var(--green-bg)' : ''}"><div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(e.card.nickname)}</span><b style="font-size:13px;${i === 0 ? 'color:var(--green)' : ''}">${inr(e.rewardRupees, true)}</b></div></div>`).join('')}`,
  `<span class="ds-k">This month</span><div class="ds-h">Missed rewards</div><div class="ds-t" style="border-color:#4a3c1c"><span class="ds-k" style="color:var(--amber)">Could have earned</span><b style="font-size:28px;color:var(--amber)">${inr(missed, true)}</b></div>${ins.tips.slice(0, 3).map((t) => `<div class="ds-t" style="background:var(--amber-bg);border-color:#4a3c1c;color:#F8DFA6">Use ${esc(t.bestCard.nickname)} for ${CATEGORY_LABELS[t.category]}</div>`).join('')}`,
  `<span class="ds-k">Insights</span><div class="ds-h">This month</div><div class="ds-t">${ins.categories.slice(0, 5).map((c) => `<div class="ds-row" style="display:block"><div style="display:flex;justify-content:space-between"><span>${CATEGORY_LABELS[c.category]}</span><span>${inr(c.spend)}</span></div><div class="bar" style="margin-top:5px;height:5px"><i style="width:${Math.max(4, (c.spend / ins.categories[0].spend) * 100)}%;background:${CAT[c.category][0]}"></i></div></div>`).join('')}</div>`,
];
const chapters = [
  ['01', 'Your cards, in one place', 'Add each card with its reward rates and monthly caps. TAPO keeps a nickname and the last four digits as a label, and nothing else.'],
  ['02', 'Ask before you pay', 'Choose a category and amount. TAPO ranks every card, checks how much of each cap is left this month, and tells you which to tap.'],
  ['03', 'See what you missed', 'Import a statement and TAPO compares every purchase against your best card. The difference is your missed rewards.'],
  ['04', 'Insights that pay off', 'Spending by category, rewards by card, and specific swaps to make next month. All of it calculated on your device.'],
];
const product = `
<section class="sec" style="padding-bottom:40px"><div class="wrap"><div class="head"><span class="eyebrow">Product</span><h1 class="h2" style="font-size:clamp(40px,6vw,76px)">One app. Every card working its hardest.</h1><p class="lede">Here's how TAPO turns a wallet full of cards into one clear answer.</p></div></div></section>
<section style="padding-bottom:80px"><div class="wrap scrolly"><div class="phone-sticky"><div class="device" role="img" aria-label="TAPO app screens"><div class="dscreen">${layers.map((l, i) => `<div class="layer${i === 0 ? ' on' : ''}" data-layer="${i}">${l}</div>`).join('')}</div></div></div>
<div class="chapters">${chapters.map((c, i) => `<div class="chapter${i === 0 ? ' on' : ''}" data-ch="${i}"><span class="k">${c[0]}</span><h2 style="font-size:clamp(26px,3vw,36px);font-weight:900;letter-spacing:-0.03em;line-height:1.1">${c[1]}</h2><p>${c[2]}</p></div>`).join('')}<div><a class="btn btn-primary" href="/app/">Try it now ${ico('arrow', 18)}</a></div></div></div></section>
<section class="sec" id="rise" style="padding-top:20px;overflow:hidden"><div class="wrap"><div class="head center"><span class="eyebrow">Three screens, one answer</span><h2 class="h2">Your cards. Your best pick. Your month.</h2></div>
<div class="rise" id="risePhones">${[0, 1, 3].map((i) => `<div class="device" aria-hidden="true"><div class="dscreen"><div class="layer">${layers[i]}</div></div></div>`).join('')}</div>
<div class="rise-cap"><span>Wallet</span><span>Best card</span><span>Insights</span></div></div></section>`;

const security = `
<section class="sec"><div class="wrap"><div class="head"><span class="eyebrow">Security & privacy</span><h1 class="h2" style="font-size:clamp(40px,6vw,76px)">We can't leak what we never collect.</h1><p class="lede">TAPO is designed so that sensitive card data has nowhere to go, and the data it does keep is encrypted with a key only your password can create.</p></div>
<div class="panel box" style="margin-bottom:16px"><h2 style="font-size:20px">TAPO never asks for</h2><div class="never"><span>Full card number</span><span>CVV</span><span>PIN</span><span>OTP</span><span>Expiry date</span><span>Net-banking login</span><span>UPI PIN</span><span>Payment tokens</span></div><p class="muted small">If anyone claiming to be TAPO asks you for one of these, it isn't us.</p></div>
<div class="flow">
<div class="panel">${ico('lock', 26, '#6FD9A4')}<h3>Encrypted with your password</h3><p>Your password is turned into a key with PBKDF2, and your wallet is stored encrypted with AES-256-GCM. The password and the key are never saved.</p></div>
<div class="panel">${ico('phone', 26, '#6FD9A4')}<h3>Stays on your device</h3><p>Your account and wallet live on your phone or in your browser. There's no TAPO server and no cloud copy.</p></div>
<div class="panel">${ico('shield', 26, '#6FD9A4')}<h3>Locks when you step away</h3><p>After 10 minutes without activity TAPO locks and forgets the key. Five wrong passwords pause sign-in for 30 seconds.</p></div>
</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head"><span class="eyebrow">Our promises</span><h2 class="h2">Advice, not access.</h2></div><div class="promise-grid">
${[['TAPO never moves money', 'It recommends a card. You pay the way you always do.'], ['No bank logins, ever', "TAPO doesn't connect to your bank and never asks for credentials."], ['Estimates you can check', 'Rewards follow the rates you enter, rounded down so we never over-promise.'], ['You can delete everything', 'Remove your account and all of its data from your device at any time.']].map(([t, p]) => `<div class="panel promise">${ico('check', 22, '#6FD9A4', 2.4)}<div><h3>${t}</h3><p>${p}</p></div></div>`).join('')}
</div></div></section>`;

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
<section class="sec"><div class="wrap"><div class="head"><span class="eyebrow">FAQ</span><h1 class="h2" style="font-size:clamp(40px,6vw,76px)">Questions, answered.</h1><p class="lede">Everything you need to know about how TAPO works and what it does with your data.</p></div>
<div class="faq">${faqs.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="cta-band"><h2 class="h2">Ready when you are.</h2><p class="lede">Create your account and see your best card in seconds.</p><a class="btn btn-primary" href="/app/">Open TAPO ${ico('arrow', 18)}</a></div></div></section>`;

const notFound = `<section class="sec"><div class="wrap"><div class="head"><span class="eyebrow">404</span><h1 class="h2">This page doesn't exist.</h1><p class="lede">The link may be old or mistyped.</p><div><a class="btn btn-primary" href="/">Go to the home page</a></div></div></div></section>`;

/* ---------- write ---------- */
fs.rmSync(path.join(out, 'product'), { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const PAGES = [
  { pathName: '/', file: 'index.html', title: 'Home', description: 'TAPO tells you which of your cards earns the most for every purchase, and shows the rewards you missed. Free, encrypted, built for India.', body: home },
  { pathName: '/product/', file: 'product/index.html', title: 'Product', description: 'How TAPO ranks your cards, tracks monthly caps and finds the rewards you missed.', body: product },
  { pathName: '/security/', file: 'security/index.html', title: 'Security', description: 'TAPO never asks for card numbers, OTPs or bank logins, and encrypts your wallet with your password.', body: security },
  { pathName: '/faq/', file: 'faq/index.html', title: 'FAQ', description: 'Answers about TAPO accounts, encryption, supported cards and reward estimates.', body: faq },
];
for (const p of PAGES) {
  const file = path.join(out, p.file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page(p));
}
fs.writeFileSync(path.join(out, '404.html'), page({ pathName: '/404', title: 'Page not found', description: 'This page does not exist.', body: notFound }));
const fontFaces = [['Regular', 400], ['Medium', 500], ['Bold', 700], ['Black', 900]]
  .map(([n, w]) => `@font-face{font-family:"Satoshi";font-weight:${w};font-style:normal;font-display:swap;src:url(/fonts/Satoshi-${n}.otf) format("opentype")}`)
  .join('\n');
fs.writeFileSync(path.join(out, 'styles.css'), fontFaces + '\n' + fs.readFileSync(path.join(root, 'site/styles.css'), 'utf8'));
fs.copyFileSync(path.join(root, 'site/site.js'), path.join(out, 'site.js'));
fs.cpSync(path.join(root, 'site/public'), out, { recursive: true });
fs.copyFileSync(path.join(root, 'assets/favicon.png'), path.join(out, 'favicon.png'));
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /app/\n${SITE_URL ? `Sitemap: ${SITE_URL}/sitemap.xml\n` : ''}`);
if (SITE_URL) {
  fs.writeFileSync(
    path.join(out, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map((p) => `  <url><loc>${SITE_URL}${p.pathName}</loc></url>`).join('\n')}\n</urlset>\n`,
  );
}
console.log(`site built: ${PAGES.length} pages${SITE_URL ? ` for ${SITE_URL}` : ' (set SITE_URL for absolute preview links)'}`);
