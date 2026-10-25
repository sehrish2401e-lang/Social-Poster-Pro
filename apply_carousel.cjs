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

// ---------- bots.cjs ----------
plan('electron/bots.cjs', 'carousel abhi sirf', [[
  'async function postOne(p, text, file) {',
  "async function postOne(p, text, file) {\n  if (Array.isArray(file) && p !== 'instagram') return fail(p + ': carousel abhi sirf Instagram par hota hai');"
]]);

// ---------- main.cjs ----------
plan('electron/main.cjs', 'it.files || it.file', [[
  'results = await postAll(caption, it.file, (it.platforms || data.platforms));',
  'results = await postAll(caption, it.files || it.file, (it.platforms || data.platforms));'
]]);

// ---------- instagram.cjs ----------
const igHelper = [
  '// CAROUSEL_PATCH',
  'async function setFiles(win, selector, files) {',
  '  if (files.length === 1) return setFile(win, selector, files[0]);',
  '  const dbg = win.webContents.debugger;',
  '  let mine = false;',
  '  try {',
  "    if (!dbg.isAttached()) { dbg.attach('1.3'); mine = true; }",
  "    await dbg.sendCommand('DOM.enable');",
  "    const doc = await dbg.sendCommand('DOM.getDocument', { depth: -1, pierce: true });",
  "    const q = await dbg.sendCommand('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: selector });",
  '    const ids = (q.nodeIds || []).filter(Boolean);',
  '    if (!ids.length) return false;',
  "    await dbg.sendCommand('DOM.setFileInputFiles', { files: files, nodeId: ids[ids.length - 1] });",
  '    return true;',
  "  } catch (e) { log('setFiles error: ' + e.message); return false; }",
  '  finally { try { if (mine) dbg.detach(); } catch (e) { /* ignore */ } }',
  '}',
  '',
  'async function postToInstagram(text, file) {',
  '  const files = Array.isArray(file) ? file.filter(Boolean) : (file ? [file] : []);',
  '  file = files[0];'
].join('\n');

plan('electron/instagram.cjs', 'CAROUSEL_PATCH', [
  ['async function postToInstagram(text, file) {', igHelper],
  ["(await setFile(win, 'div[role=\"dialog\"] input[type=\"file\"]', file)) ||",
   "(await setFiles(win, 'div[role=\"dialog\"] input[type=\"file\"]', files)) ||"],
  ["(await setFile(win, 'input[type=\"file\"]', file));",
   "(await setFiles(win, 'input[type=\"file\"]', files));"]
]);

// ---------- MultiPost.jsx ----------
const runCarousel = `  const runCarousel = async () => {
    if (items.length < 2) { window.alert('Carousel ke liye kam az kam 2 files choose karein'); return; }
    if (items.length > 10) { window.alert('Instagram carousel me max 10 files ho sakti hain'); return; }
    if (!testMode && !window.confirm('Live carousel post hone wali hai!\\n\\n' + items.length + ' files -> Instagram (1 post)\\n\\nPublish karein?')) return;
    idxRef.current = [];
    setRunning(true);
    setItems((prev) => prev.map((it) => ({ ...it, status: 'uploading', results: null })));
    let res = null;
    try {
      res = await window.api.postBatch({
        items: [{ file: items[0].file, files: items.map((x) => x.file), text: items[0].text, platforms: ['instagram'] }],
        description, platforms: ['instagram'], dryRun: testMode,
      });
    } catch (e) { res = null; }
    const o = res && res.items && res.items[0];
    const results = (o && o.results) || [];
    const ok = !!o && o.ok && results.length > 0;
    setItems((prev) => prev.map((it) => ({ ...it, status: ok ? 'done' : 'failed', results })));
    if (results.length) {
      addHistory(results.map((r, k) => ({
        id: 'c' + Date.now() + '-' + k, platform: 'instagram', postType: 'post',
        purpose: purpose.trim(), text: items[0].text, description, file: items[0].file,
        ok: !!r.ok, message: r.message + ' (carousel, ' + items.length + ' files)',
        postedAt: new Date().toISOString(), scheduledFor: null, dryRun: testMode,
      })));
    }
    setRunning(false);
  };

  const run = async (onlyFailed) => {`;

const toggleUI = `<label className="tg">
          <input type="checkbox" checked={carousel} onChange={(e) => setCarousel(e.target.checked)} />
          <span className="sw" />
          <span><b>Carousel (Instagram, 1 post)</b><small>{carousel ? 'ON: sab files ek hi Instagram post me, dots ke saath' : 'OFF: har file alag post'}</small></span>
        </label>
        {carousel && <PreviewCarousel paths={items.map((x) => x.file)} />}
        {carousel && (
          <button className="go" disabled={running || items.length < 2 || !description.trim()} onClick={runCarousel}>
            {running ? 'Posting... (window band na karein)' : testMode ? 'Run Carousel Test' : 'Publish Carousel (' + items.length + ' files)'}
          </button>
        )}
        <label className="tg">`;

plan('src/MultiPost.jsx', 'runCarousel', [
  ['const [running, setRunning] = useState(false);', "const [running, setRunning] = useState(false);\n  const [carousel, setCarousel] = useState(false);"],
  ['const run = async (onlyFailed) => {', runCarousel],
  ['<label className="tg">', toggleUI],
  ['className="go" disabled={!canRun}', 'className="go" disabled={!canRun || carousel}']
]);

// sab anchors mil gaye, ab likho
for (const j of jobs) {
  fs.writeFileSync(j.f + '.bak-carousel', j.raw);
  fs.writeFileSync(j.f, j.out);
  console.log('OK: ' + j.rel + '  (backup: .bak-carousel)');
}
console.log('\nHo gaya. Ab app band karke dobara chalao: npm run dev');
