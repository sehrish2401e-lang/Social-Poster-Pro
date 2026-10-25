const fs = require('fs'), path = require('path');
const root = process.cwd();
const jobs = [];

function plan(rel, mark, edits) {
  const f = path.join(root, rel);
  const raw = fs.readFileSync(f, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  if (s.includes(mark)) { console.log('SKIP (pehle se laga hai): ' + rel); return; }
  for (const [a, b] of edits) {
    if (!s.includes(a)) throw new Error(rel + ' : ye line nahi mili -> ' + a.slice(0, 70));
    s = s.replace(a, () => b);
  }
  jobs.push({ f, raw, out: crlf ? s.replace(/\n/g, '\r\n') : s, rel });
}

// ---------- facebook.cjs ----------
plan('electron/facebook.cjs', 'FB_CAROUSEL', [
  ["async function attachFile(win, file) {\n  dbgLog('---- attachFile shuru: ' + file);",
   "async function attachFile(win, file) {\n  // FB_CAROUSEL\n  const list = Array.isArray(file) ? file : [file];\n  file = list[0];\n  dbgLog('---- attachFile shuru: ' + list.join(' | '));"],
  ["{ files: [file], nodeId: ids[ids.length - 1] }", "{ files: list, nodeId: ids[ids.length - 1] }"],
  ["{ files: [file], backendNodeId: params.backendNodeId }", "{ files: list, backendNodeId: params.backendNodeId }"],
  ["files: [file], dragOperationsMask: 1", "files: list, dragOperationsMask: 1"],
  ["const img = nativeImage.createFromPath(file);", "if (list.length > 1) { dbgLog('paste: multi files, skip'); return; }\n      const img = nativeImage.createFromPath(file);"],
  ["  await sleep(1200);\n  await shot(win, 'fb-3b-attached');",
   "  await sleep(1200 + (list.length > 1 ? 2500 * list.length : 0));\n  await shot(win, 'fb-3b-attached');"],
  ["async function postToFacebook(text, file) {",
   "async function postToFacebook(text, file) {\n  if (Array.isArray(file) && file.length > 1 && file.some((f) => /\\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(f)))\n    return { ok: false, message: 'Facebook: ek post me multiple photos ho sakti hain, videos mix nahi hoti' };"]
]);

// ---------- bots.cjs ----------
plan('electron/bots.cjs', 'carousel abhi supported nahi', [[
  "if (Array.isArray(file) && p !== 'instagram') return fail(p + ': carousel abhi sirf Instagram par hota hai');",
  "if (Array.isArray(file) && p !== 'instagram' && p !== 'facebook') return fail(p + ': carousel abhi supported nahi');"
]]);

// ---------- MultiPost.jsx ----------
plan('src/MultiPost.jsx', 'const cps', [
  ["const runCarousel = async () => {",
   "const runCarousel = async () => {\n    const cps = selected.filter((p) => p === 'instagram' || p === 'facebook');\n    if (!cps.length) { window.alert('Carousel ke liye Instagram ya Facebook select karein'); return; }"],
  ["text: items[0].text, platforms: ['instagram'] }],", "text: items[0].text, platforms: cps }],"],
  ["description, platforms: ['instagram'], dryRun: testMode,", "description, platforms: cps, dryRun: testMode,"],
  ["id: 'c' + Date.now() + '-' + k, platform: 'instagram', postType: 'post',", "id: 'c' + Date.now() + '-' + k, platform: cps[k] || 'instagram', postType: 'post',"],
  ["<b>Carousel (Instagram, 1 post)</b><small>{carousel ? 'ON: sab files ek hi Instagram post me, dots ke saath' : 'OFF: har file alag post'}</small>",
   "<b>Carousel (Instagram + Facebook, 1 post)</b><small>{carousel ? 'ON: sab files ek hi post me' : 'OFF: har file alag post'}</small>"],
  ["{carousel && <PreviewCarousel paths={items.map((x) => x.file)} />}",
   "{carousel && <PreviewCarousel paths={items.map((x) => x.file)} />}\n        {carousel && selected.some((p) => !['instagram', 'facebook'].includes(p)) && <div className=\"warn\">TikTok / YouTube / WhatsApp par carousel abhi nahi hai, wahan ye post nahi jayegi.</div>}"]
]);

for (const j of jobs) {
  fs.writeFileSync(j.f + '.bak-carousel2', j.raw);
  fs.writeFileSync(j.f, j.out);
  console.log('OK: ' + j.rel + '  (backup: .bak-carousel2)');
}
console.log('\nHo gaya. App band karke dobara chalao: npm run dev');
