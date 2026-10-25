const fs = require('fs');

function patch(file, edits) {
  let s = fs.readFileSync(file, 'utf8');
  const crlf = s.includes('\r\n');
  s = s.replace(/\r\n/g, '\n');
  for (const [a, b] of edits) {
    const n = a instanceof RegExp ? (s.match(new RegExp(a.source, 'gm')) || []).length : s.split(a).length - 1;
    if (n !== 1) throw new Error(file + ': anchor ' + n + ' baar mila (1 chahiye): ' + String(a).slice(0, 70));
    s = s.replace(a, typeof b === 'function' ? b : () => b);
  }
  if (crlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, s, 'utf8');
  console.log('OK', file);
}

// ---------------- MultiPost.jsx ----------------
const helpers = `  const pad2 = (n) => String(n).padStart(2, '0');
  const toLocalInput = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  const future = (v) => !!v && new Date(v).getTime() > Date.now();
  const whenFor = (p) => whens[p] || whenStr;
  const whenOk = mode === 'now' || (perPlat
    ? selected.length > 0 && selected.every((p) => future(whenFor(p)))
    : future(whenStr));
  const canSchedule = !running && items.length > 0 && selected.length > 0 && description.trim().length > 0 && whenOk
    && (!carousel || (items.length >= 2 && items.length <= 10));

  const buildNormal = (cps) => items
    .map((it) => ({ file: it.file, text: it.text, platforms: cps.filter((p) => !(p === 'youtube' && !isVid(it.file))) }))
    .filter((x) => x.platforms.length > 0);

  const buildCarousel = (cps) => {
    const mixedOk = cps.filter((p) => p === 'instagram' || p === 'whatsapp');
    const photoOnly = cps.filter((p) => !mixedOk.includes(p));
    const photos = items.filter((x) => !isVid(x.file));
    const videos = items.filter((x) => isVid(x.file));
    const out = [];
    if (mixedOk.length) out.push({ file: items[0].file, files: items.map((x) => x.file), text: items[0].text, platforms: mixedOk });
    if (photoOnly.length) {
      if (photos.length) out.push({ file: photos[0].file, files: photos.map((x) => x.file), text: photos[0].text, platforms: photoOnly });
      videos.forEach((v) => out.push({ file: v.file, files: [v.file], text: v.text, platforms: photoOnly }));
    }
    return out;
  };

  const schedule = () => {
    if (!canSchedule) return;
    const base = 'm' + Date.now();
    const mk = (cps, when, id) => ({
      id, kind: 'multi', carousel,
      items: items.map((x) => ({ file: x.file, text: x.text })),
      payload: carousel ? buildCarousel(cps) : buildNormal(cps),
      description, purpose: purpose.trim(), platforms: cps, dryRun: testMode,
      when: new Date(when).toISOString(), status: 'pending',
    });
    const jobs = perPlat
      ? selected.map((p) => mk([p], whenFor(p), base + '-' + p))
      : [mk(selected.slice(), whenStr, base)];
    if (jobs.some((j) => !j.payload.length)) {
      window.alert('Kisi platform ke liye koi valid file nahi (YouTube sirf video leta hai).');
      return;
    }
    addScheduled(jobs);
  };

  const run = async (onlyFailed) => {`;

const whenBlock = `        </div>

      <div className="card">
        <h2>When would you like to post?</h2>
        <p className="sub">Publish now or schedule for later.</p>
        <div className="when">
          <button className={'opt' + (mode === 'now' ? ' on' : '')} onClick={() => setMode('now')}>
            <span className="rd" /><span><b>Post Now</b><small>Publish immediately</small></span>
          </button>
          <button
            className={'opt' + (mode === 'later' ? ' on' : '')}
            onClick={() => { setMode('later'); if (!whenStr) setWhenStr(toLocalInput(new Date(Date.now() + 60 * 60 * 1000))); }}
          >
            <span className="rd" /><span><b>Schedule for Later</b><small>Choose a date and time</small></span>
          </button>
        </div>
        {mode === 'later' && (
          <div style={{ marginTop: 12 }}>
            <label className="tg" style={{ marginTop: 0, marginBottom: 14 }}>
              <input type="checkbox" checked={perPlat} onChange={(e) => setPerPlat(e.target.checked)} />
              <span className="sw" />
              <span><b>Separate time for each platform</b><small>Choose a separate date and time for each platform</small></span>
            </label>
            {perPlat ? (
              selected.length === 0
                ? <small className="muted">Pehle upar koi platform select karein.</small>
                : (
                  <div className="stack">
                    {selected.map((p) => (
                      <div key={p} className="prow">
                        <div className="who"><Dot p={p} />{p}</div>
                        <input
                          type="datetime-local" className="in" value={whenFor(p)}
                          min={toLocalInput(new Date())}
                          onChange={(e) => setWhens({ ...whens, [p]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                )
            ) : (
              <input type="datetime-local" className="in" value={whenStr} min={toLocalInput(new Date())} onChange={(e) => setWhenStr(e.target.value)} />
            )}
            {!whenOk && <div className="warn">Aane wala waqt chunein.</div>}
            <small className="muted" style={{ display: 'block', marginTop: 8 }}>Schedule tab hi chalegi jab app khuli ho aur PC on ho.</small>
          </div>
        )}
`;

const schedBtn = `        {mode === 'later' && (
          <button className="go" disabled={!canSchedule} onClick={schedule}>
            {running ? 'Please wait...' : 'Schedule Post (' + (carousel ? 'carousel, ' + items.length + ' files' : items.length + ' items') + ')'}
          </button>
        )}
        <button className="go" style={mode === 'later' ? { display: 'none' } : undefined} disabled={!canRun || carousel} onClick={() => run(false)}>`;

patch('src/MultiPost.jsx', [
  ['export default function MultiPost({ Dot, Media, addHistory }) {',
   'export default function MultiPost({ Dot, Media, addHistory, addScheduled }) {'],
  ['  const idxRef = useRef([]);',
   `  const idxRef = useRef([]);
  const [mode, setMode] = useState('now');
  const [whenStr, setWhenStr] = useState('');
  const [perPlat, setPerPlat] = useState(false);
  const [whens, setWhens] = useState({});`],
  ['  const run = async (onlyFailed) => {', helpers],
  [/^[ \t]*<label className="tg">[ \t]*\n[ \t]*<input type="checkbox" checked=\{testMode\}/m, (m) => whenBlock + m],
  ['<button className="go" disabled={running || items.length < 2 || !description.trim()} onClick={runCarousel}>',
   '<button className="go" style={mode === \'later\' ? { display: \'none\' } : undefined} disabled={running || items.length < 2 || !description.trim()} onClick={runCarousel}>'],
  ['<button className="go" disabled={!canRun || carousel} onClick={() => run(false)}>', schedBtn],
]);

// ---------------- App.jsx ----------------
const multiRunner = `  const runMultiJob = async (job) => {
    busyRef.current = true;
    setLoading(true);
    setResults([{ loading: true, message: job.dryRun ? 'Test mode is running...' : 'Publishing scheduled multiple post... please do not click anything.' }]);
    let res = null;
    try {
      res = await window.api.postBatch({ items: job.payload, description: job.description, platforms: job.platforms, dryRun: job.dryRun });
    } catch (e) { res = null; }
    const entries = [];
    const out = [];
    ((res && res.items) || []).forEach((o) => {
      const it = job.payload[o.index];
      if (!it) return;
      (o.results || []).forEach((r, k) => {
        const pl = it.platforms[k] || it.platforms[0] || 'facebook';
        out.push({ ok: !!r.ok, message: pl + ': ' + r.message });
        entries.push({
          id: job.id + '-' + o.index + '-' + k, platform: pl, postType: isVideo(it.file) ? 'reel' : 'post',
          purpose: job.purpose, text: it.text, description: job.description, file: it.file,
          ok: !!r.ok, message: r.message + (it.files && it.files.length > 1 ? ' (carousel, ' + it.files.length + ' files)' : ''),
          postedAt: new Date().toISOString(), scheduledFor: job.when || null, dryRun: job.dryRun,
        });
      });
    });
    if (!out.length) out.push({ ok: false, message: 'Scheduled multiple post: koi result wapas nahi aaya' });
    if (entries.length) addHistory(entries);
    setResults(out);
    busyRef.current = false;
    setLoading(false);
  };

  const runJob = async (job) => {
    if (job.kind === 'multi') return runMultiJob(job);`;

patch('src/App.jsx', [
  ["const typesText = (j) => typesOf(j).map(typeLabel).join(' + ');",
   "const typesText = (j) => (j.kind === 'multi'\n  ? 'Multiple Post (' + j.items.length + ' files' + (j.carousel ? ', carousel' : '') + ')'\n  : typesOf(j).map(typeLabel).join(' + '));"],
  ['  const runJob = async (job) => {', multiRunner],
  ['<MultiPost Dot={Dot} Media={Media} addHistory={addHistory} />',
   `<MultiPost Dot={Dot} Media={Media} addHistory={addHistory} addScheduled={(jobs) => { updateScheduled((prev) => [...prev, ...jobs].sort((a, b) => new Date(a.when) - new Date(b.when))); setTab('scheduled'); }} />`],
]);
