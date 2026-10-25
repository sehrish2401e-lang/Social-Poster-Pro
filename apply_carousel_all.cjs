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

// ---------- tiktok.cjs ----------
plan('electron/tiktok.cjs', 'TT_CAROUSEL', [
  [String.raw`async function postToTikTok(text, file) {`,
   String.raw`async function postToTikTok(text, file) {
  // TT_CAROUSEL
  const { setFilesMulti } = require('./carousel_helpers.cjs');
  const files = Array.isArray(file) ? file.filter(Boolean) : (file ? [file] : []);
  file = files[0];
  if (files.length > 1 && !files.every((f) => /\.(png|jpe?g|webp)$/i.test(f)))
    return { ok: false, message: 'TikTok: carousel sirf photos se banta hai, videos mix nahi hoti' };`],
  [String.raw`if (!(await setFile(win, 'input[type="file"]', file)))`,
   String.raw`if (!(await setFilesMulti(win, 'input[type="file"]', files)))`]
]);

// ---------- youtube.cjs ----------
plan('electron/youtube.cjs', 'YT_CAROUSEL', [
  [String.raw`async function postToYouTube(text, file) {`,
   String.raw`async function postToYouTube(text, file) {
  // YT_CAROUSEL
  if (Array.isArray(file)) {
    const list = file.filter(Boolean);
    if (list.length > 1) {
      if (!list.every((f) => /\.(jpe?g|png)$/i.test(f)))
        return { ok: false, message: 'YouTube: slideshow sirf photos (jpg/png) se banta hai, videos mix nahi hoti' };
      const made = await require('./carousel_helpers.cjs').photosToVideo(list);
      if (!made.ok) return made;
      file = made.path;
    } else {
      file = list[0];
    }
  }`]
]);

// ---------- whatsapp.cjs ----------
plan('electron/whatsapp.cjs', 'WA_CAROUSEL', [
  [String.raw`const filePath = typeof file === 'string' ? file : file && file.path;`,
   String.raw`// WA_CAROUSEL
  const filePath = Array.isArray(file) ? file.filter(Boolean) : (typeof file === 'string' ? file : file && file.path);`],
  [String.raw`{ files: [filePath], backendNodeId: fc.backendNodeId }`,
   String.raw`{ files: Array.isArray(filePath) ? filePath : [filePath], backendNodeId: fc.backendNodeId }`]
]);

// ---------- bots.cjs ----------
plan('electron/bots.cjs', 'ALL_PLATFORMS_CAROUSEL', [
  [String.raw`if (Array.isArray(file) && p !== 'instagram' && p !== 'facebook') return fail(p + ': carousel abhi supported nahi');`,
   String.raw`// ALL_PLATFORMS_CAROUSEL: sab platforms array le sakte hain`]
]);

// ---------- MultiPost.jsx ----------
plan('src/MultiPost.jsx', 'cps = selected.slice', [
  [String.raw`const cps = selected.filter((p) => p === 'instagram' || p === 'facebook');`,
   String.raw`const cps = selected.slice();`],
  [String.raw`window.alert('Carousel ke liye Instagram ya Facebook select karein')`,
   String.raw`window.alert('Carousel ke liye kam az kam ek platform select karein')`],
  [String.raw`<b>Carousel (Instagram + Facebook, 1 post)</b>`,
   String.raw`<b>Carousel (1 post, sab platforms)</b>`],
  [String.raw`{carousel && selected.some((p) => !['instagram', 'facebook'].includes(p)) && <div className="warn">TikTok / YouTube / WhatsApp par carousel abhi nahi hai, wahan ye post nahi jayegi.</div>}`,
   String.raw`{carousel && platforms.youtube && <div className="warn">YouTube par sab photos ka slideshow video banega (har photo 4 second). Videos ho to YouTube skip hoga.</div>}
        {carousel && platforms.tiktok && <div className="warn">TikTok photo carousel sirf photos leta hai, videos mix nahi hoti.</div>}`]
]);

for (const j of jobs) {
  fs.writeFileSync(j.f + '.bak-carousel3', j.raw);
  fs.writeFileSync(j.f, j.out);
  console.log('OK: ' + j.rel + '  (backup: .bak-carousel3)');
}
console.log('\nHo gaya. App band karke dobara chalao: npm run dev');
