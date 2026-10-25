const fs = require('fs'), path = require('path');
const f = path.join(process.cwd(), 'src/MultiPost.jsx');
const raw = fs.readFileSync(f, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
if (s.includes('runCarouselOld')) { console.log('SKIP: pehle se laga hai'); process.exit(0); }

const NEWFN = String.raw`const runCarousel = async () => {
    const cps = selected.slice();
    if (!cps.length) { window.alert('Carousel ke liye kam az kam ek platform select karein'); return; }
    if (items.length < 2) { window.alert('Carousel ke liye kam az kam 2 files choose karein'); return; }
    if (items.length > 10) { window.alert('Carousel me max 10 files ho sakti hain'); return; }
    const mixedOk = cps.filter((p) => p === 'instagram' || p === 'whatsapp');
    const photoOnly = cps.filter((p) => !mixedOk.includes(p));
    const photos = items.filter((x) => !isVid(x.file));
    const videos = items.filter((x) => isVid(x.file));
    const payload = [];
    if (mixedOk.length) payload.push({ file: items[0].file, files: items.map((x) => x.file), text: items[0].text, platforms: mixedOk });
    if (photoOnly.length) {
      if (photos.length) payload.push({ file: photos[0].file, files: photos.map((x) => x.file), text: photos[0].text, platforms: photoOnly });
      videos.forEach((v) => payload.push({ file: v.file, files: [v.file], text: v.text, platforms: photoOnly }));
    }
    if (!payload.length) return;
    if (!testMode && !window.confirm('Live post hone wali hai!\n\n' + payload.length + ' post(s) bangi -> ' + cps.join(', ') + '\n\nPublish karein?')) return;
    idxRef.current = [];
    setRunning(true);
    setItems((prev) => prev.map((it) => ({ ...it, status: 'uploading', results: null })));
    let res = null;
    try {
      res = await window.api.postBatch({ items: payload, description, platforms: cps, dryRun: testMode });
    } catch (e) { res = null; }
    const outs = (res && res.items) || [];
    const all = [];
    outs.forEach((o) => (o.results || []).forEach((r, k) => all.push({
      r, p: payload[o.index].platforms[k] || 'instagram', file: payload[o.index].file,
      text: payload[o.index].text, n: payload[o.index].files.length,
    })));
    const ok = outs.length === payload.length && all.length > 0 && all.every((x) => x.r.ok);
    setItems((prev) => prev.map((it) => ({ ...it, status: ok ? 'done' : 'failed', results: all.map((x) => x.r) })));
    if (all.length) {
      addHistory(all.map((x, k) => ({
        id: 'c' + Date.now() + '-' + k, platform: x.p, postType: isVid(x.file) ? 'reel' : 'post',
        purpose: purpose.trim(), text: x.text, description, file: x.file,
        ok: !!x.r.ok, message: x.r.message + (x.n > 1 ? ' (carousel, ' + x.n + ' files)' : ''),
        postedAt: new Date().toISOString(), scheduledFor: null, dryRun: testMode,
      })));
    }
    setRunning(false);
  };

  const runCarouselOld = async () => {`;

const edits = [
  [String.raw`const runCarousel = async () => {`, NEWFN],
  [String.raw`{carousel && platforms.youtube && <div className="warn">YouTube par sab photos ka slideshow video banega (har photo 4 second). Videos ho to YouTube skip hoga.</div>}`,
   String.raw`{carousel && <div className="warn">Instagram/WhatsApp: sab files ek post me. Facebook/TikTok: photos ek carousel me, videos alag post. YouTube: photos ka slideshow video, videos alag.</div>}`],
  [String.raw`{carousel && platforms.tiktok && <div className="warn">TikTok photo carousel sirf photos leta hai, videos mix nahi hoti.</div>}`, ``]
];
for (const [a, b] of edits) {
  if (!s.includes(a)) throw new Error('ye line nahi mili -> ' + a.slice(0, 70));
  s = s.replace(a, () => b);
}
fs.writeFileSync(f + '.bak-carousel4', raw);
fs.writeFileSync(f, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('OK: src/MultiPost.jsx  (backup: .bak-carousel4)');
console.log('Ho gaya. Vite khud reload kar dega, warna npm run dev dobara chalao.');
