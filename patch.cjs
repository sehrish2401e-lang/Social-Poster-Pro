const fs = require('fs');

function patch(file, edits) {
  let s = fs.readFileSync(file, 'utf8');
  const crlf = s.includes('\r\n');
  s = s.replace(/\r\n/g, '\n');
  for (const e of edits) {
    if (e.skipIf && s.includes(e.skipIf)) { console.log('SKIP (pehle se hai): ' + e.name); continue; }
    if (e.find instanceof RegExp) {
      if (!e.find.test(s)) { console.log('FAIL: ' + e.name); continue; }
      s = s.replace(e.find, () => e.rep);
    } else {
      if (!s.includes(e.find)) { console.log('FAIL: ' + e.name); continue; }
      s = s.split(e.find).join(e.rep);
    }
    console.log('OK: ' + e.name);
  }
  if (crlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, s, 'utf8');
}

const MUSIC_STATE = String.raw`const idxRef = useRef([]);
  const [music, setMusic] = useState(null);
  const pickMusic = async () => {
    const f = await window.api.pickMusic();
    if (f) setMusic({ file: f, volume: 0.25 });
  };`;

const MUSIC_UI = String.raw`<div className="card">
        <h2>Music (optional)</h2>
        <p className="sub">Ye music sab videos pe lagega (post, reel, carousel ki videos).</p>
        <div className="drop" onClick={pickMusic}>
          <div className="thumb">&#9834;</div>
          <div>
            <b>{music ? 'Music selected' : 'Add music'}</b>
            <small>{music ? music.file.split('\\').pop() : 'mp3, wav, m4a'}</small>
          </div>
          {music && <button className="link" onClick={(e) => { e.stopPropagation(); setMusic(null); }}>Remove</button>}
        </div>
        {music && (
          <div style={{ marginTop: 6 }}>
            <small className="muted">Music volume: {Math.round(music.volume * 100)}%</small>
            <input type="range" min="5" max="100" style={{ width: '100%' }}
              value={Math.round(music.volume * 100)}
              onChange={(e) => setMusic({ ...music, volume: Number(e.target.value) / 100 })} />
          </div>
        )}
      </div>

      <div className="card">
        <h2>Where would you like to post?</h2>`;

patch('src/MultiPost.jsx', [
  { name: 'music state', skipIf: 'const pickMusic', find: 'const idxRef = useRef([]);', rep: MUSIC_STATE },
  { name: 'carousel postBatch music', skipIf: 'musicVolume: music', find: 'platforms: cps, dryRun: testMode })', rep: 'platforms: cps, dryRun: testMode, music: music ? music.file : null, musicVolume: music ? music.volume : 0.25 })' },
  { name: 'normal postBatch music', find: 'platforms: selected, dryRun: testMode })', rep: 'platforms: selected, dryRun: testMode, music: music ? music.file : null, musicVolume: music ? music.volume : 0.25 })' },
  { name: 'music UI card', skipIf: 'Music (optional)', find: /<div className="card">\s*<h2>Where would you like to post\?<\/h2>/, rep: MUSIC_UI },
]);

const APPLY = String.raw`async function applyMusic(f, music, volume) {
  if (!music) return f;
  if (Array.isArray(f)) {
    const out = [];
    for (const x of f) out.push(await withMusic(x, music, volume));
    return out;
  }
  return withMusic(f, music, volume);
}

ipcMain.handle('pick-music'`;

patch('electron/main.cjs', [
  { name: 'post-batch applyMusic', skipIf: 'await applyMusic(', find: 'results = await postAll(caption, it.files || it.file, (it.platforms || data.platforms));', rep: 'const mf = await applyMusic(it.files || it.file, data.music, data.musicVolume);\n        results = await postAll(caption, mf, (it.platforms || data.platforms));' },
  { name: 'applyMusic function', skipIf: 'async function applyMusic', find: "ipcMain.handle('pick-music'", rep: APPLY },
  { name: 'music fail = post ruk jaye', skipIf: 'Music mix fail', find: 'return file; // music fail ho to original video post hogi', rep: "throw new Error('Music mix fail: ' + e.message);" },
]);
