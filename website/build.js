/**
 * Builds website/index.html from website/template.html:
 *  - inlines Plus Jakarta Sans (SIL Open Font License, from @expo-google-fonts) as base64 @font-face rules,
 *  - transpiles src/lib/csvImport.ts so the website's statement demo runs the app's real parser.
 *
 * Usage: npm run build:website
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p));

// 1. Fonts
const weights = [
  ['Regular', 400],
  ['Medium', 500],
  ['Bold', 700],
  ['ExtraBold', 800],
];
const fontFaces = weights
  .map(([name, weight]) => {
    const file = `node_modules/@expo-google-fonts/plus-jakarta-sans/${weight}${name}/PlusJakartaSans_${weight}${name}.ttf`;
    const b64 = read(file).toString('base64');
    return `@font-face{font-family:"Plus Jakarta Sans";font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/ttf;base64,${b64}) format("truetype")}`;
  })
  .join('\n');

// 2. CSV parser from the app (types stripped, `export` removed so it runs as a plain script)
const tsSource = read('src/lib/csvImport.ts').toString('utf8');
const js = ts
  .transpileModule(tsSource, { compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.ESNext } })
  .outputText.replace(/^export\s+/gm, '')
  .replace(/^import[^;]+;\s*$/gm, '');

// 3. Assemble
const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const out = template.replace('/*__FONT_FACES__*/', () => fontFaces).replace('/*__CSV_IMPORT__*/', () => js);
fs.writeFileSync(path.join(__dirname, 'index.html'), out);
console.log(`website/index.html written (${(out.length / 1024).toFixed(0)} KB)`);
