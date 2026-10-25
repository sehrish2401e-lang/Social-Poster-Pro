const fs = require('fs');
function patch(file, edits) {
  let s = fs.readFileSync(file, 'utf8');
  const crlf = s.includes('\r\n');
  s = s.replace(/\r\n/g, '\n');
  for (const e of edits) {
    if (e.skipIf && s.includes(e.skipIf)) { console.log('SKIP: ' + e.name); continue; }
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

const NEWMUSIC = String.raw`const IMG = /\.(jpe?g|png|webp|bmp|gif)$/i;
const tmpOut = () => path.join(os.tmpdir(), 'postpro_music_' + Date.now() + '_' + Math.floor(Math.random() * 100000) + '.mp4');
async function withMusic(file, music, volume, photos) {
  if (!music || typeof file !== 'string') return file;
  try {
    if (MUSIC_VIDEO.test(file)) return await addMusic({ video: file, music, out: tmpOut(), volume: volume || 0.25 });
    if (photos && IMG.test(file)) return await photosToVideo({ images: [file], music, out: tmpOut(), volume: volume || 0.25 });
    return file;
  } catch (e) {
    console.error('music error:', e.message);
    throw new Error('Music mix fail: ' + e.message);
  }
}
async function applyMusic(f, music, volume, photos) {
  if (!music) return f;
  if (Array.isArray(f)) {
    if (photos && f.length && f.every((x) => IMG.test(x))) {
      try { return await photosToVideo({ images: f, music, out: tmpOut(), volume: volume || 0.25 }); }
      catch (e) { throw new Error('Music mix fail: ' + e.message); }
    }
    const res = [];
    for (const x of f) res.push(await withMusic(x, music, volume, false));
    return res;
  }
  return withMusic(f, music, volume, photos);
}
`;

patch('electron/main.cjs', [
  { name: 'require photosToVideo', skipIf: 'photosToVideo }', find: "const { addMusic } = require('./music.cjs');", rep: "const { addMusic, photosToVideo } = require('./music.cjs');" },
  { name: 'withMusic naya', skipIf: 'const IMG =', find: /async function withMusic[\s\S]*?\n}\n/, rep: NEWMUSIC },
  { name: 'applyMusic purana hatao', skipIf: 'XXXX_never', find: /async function applyMusic\(f, music, volume\) \{[\s\S]*?\n}\n/, rep: '' },
  { name: 'batch photos flag', skipIf: 'data.musicPhotos', find: 'applyMusic(it.files || it.file, data.music, data.musicVolume)', rep: 'applyMusic(it.files || it.file, data.music, data.musicVolume, data.musicPhotos)' },
  { name: 'single post photos', find: 'const file = await withMusic(data.file, data.music, data.musicVolume);', rep: 'const file = await withMusic(data.file, data.music, data.musicVolume, true);' },
  { name: 'single dryrun photos', find: 'const mixed = await withMusic(data.file, data.music, data.musicVolume);', rep: 'const mixed = await withMusic(data.file, data.music, data.musicVolume, true);' },
]);

const CHK = String.raw`onChange={(e) => setMusic({ ...music, volume: Number(e.target.value) / 100 })} />
            <label className="tg" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={musicPhotos} onChange={(e) => setMusicPhotos(e.target.checked)} />
              <span className="sw" />
              <span><b>Photos pe bhi music</b><small>{musicPhotos ? 'ON: photos ki slideshow video ban jayegi (music ke sath)' : 'OFF: photos bina music ke jayengi'}</small></span>
            </label>`;

patch('src/MultiPost.jsx', [
  { name: 'musicPhotos state', skipIf: 'const [musicPhotos', find: 'const [music, setMusic] = useState(null);', rep: 'const [music, setMusic] = useState(null);\n  const [musicPhotos, setMusicPhotos] = useState(true);' },
  { name: 'musicPhotos payload', skipIf: 'music.file : null, musicPhotos', find: 'music: music ? music.file : null,', rep: 'music: music ? music.file : null, musicPhotos,' },
  { name: 'musicPhotos checkbox', skipIf: 'Photos pe bhi music', find: 'onChange={(e) => setMusic({ ...music, volume: Number(e.target.value) / 100 })} />', rep: CHK },
]);

patch('src/App.jsx', [
  { name: 'App hint', find: 'Ye photo hai - music sirf video me lagta hai.', rep: 'Ye photo hai - music lagane par slideshow video ban jayegi.' },
]);
