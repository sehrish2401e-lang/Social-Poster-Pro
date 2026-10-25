const fs = require('fs');
const f = 'src/App.jsx';
let t = fs.readFileSync(f, 'utf8');
function rep(a, b) {
  if (!t.includes(a)) { console.log('NOT FOUND: ' + a.slice(0, 50)); return; }
  t = t.replace(a, () => b);
  console.log('ok: ' + a.slice(0, 50));
}

rep('const [files, setFiles] = useState({});',
  'const [files, setFiles] = useState({});\n  const [music, setMusic] = useState({});');

rep('const submit = () => {', String.raw`const pickMusic = async (t) => {
    const f = await window.api.pickMusic();
    if (f) setMusic((prev) => ({ ...prev, [t]: { file: f, volume: 0.25 } }));
  };
  const setMusicVol = (t, v) => setMusic((prev) => ({ ...prev, [t]: { ...prev[t], volume: v } }));

  const submit = () => {`);

rep('purpose: purpose.trim(), dryRun: testMode,',
  'purpose: purpose.trim(), dryRun: testMode, music,');

rep('platforms: [p], dryRun: job.dryRun, postType: t,',
  'platforms: [p], dryRun: job.dryRun, postType: t,\n            music: ((job.music || {})[t] || {}).file || null,\n            musicVolume: ((job.music || {})[t] || {}).volume || 0.25,');

const ui = String.raw`

                      <div className="drop" style={{ marginTop: 8 }} onClick={() => pickMusic(t)}>
                        <div className="thumb">&#9834;</div>
                        <div>
                          <b>{music[t] ? 'Music selected' : 'Add music (optional)'}</b>
                          <small>{music[t] ? music[t].file.split('\\').pop() : 'mp3, wav, m4a - video ke sath mix hoga'}</small>
                        </div>
                        {music[t] && (
                          <button className="link" onClick={(e) => { e.stopPropagation(); setMusic((prev) => ({ ...prev, [t]: null })); }}>Remove</button>
                        )}
                      </div>
                      {music[t] && (
                        <div style={{ marginTop: 6 }}>
                          <small className="muted">Music volume: {Math.round(music[t].volume * 100)}%</small>
                          <input type="range" min="5" max="100" style={{ width: '100%' }}
                            value={Math.round(music[t].volume * 100)}
                            onChange={(e) => setMusicVol(t, Number(e.target.value) / 100)} />
                          {files[t] && !isVideo(files[t]) && <small className="muted">Ye photo hai - music sirf video me lagta hai.</small>}
                        </div>
                      )}`;
const a = t.indexOf('Photo / Video</div>');
const k = t.indexOf('}}>Remove</button>', a);
const close = t.indexOf('</div>', k) + 6;
if (a < 0 || k < 0) console.log('UI anchor NOT FOUND');
else { t = t.slice(0, close) + ui + t.slice(close); console.log('ok: music UI'); }

fs.writeFileSync(f, t);
