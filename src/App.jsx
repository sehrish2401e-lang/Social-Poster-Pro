if (!window.api) {
  window.api = new Proxy({}, { get: () => () => Promise.resolve(null) });
}
import { useState, useEffect, useRef } from 'react';
import './App.css';
import MultiPost from './MultiPost.jsx';

const NAMES = ['facebook', 'instagram', 'tiktok', 'youtube', 'whatsapp'];
const NEED_FILE = ['instagram', 'tiktok', 'youtube'];
const COLORS = {
  facebook: '#1877f2', instagram: '#e1306c', tiktok: '#111111',
  youtube: '#ff0000', whatsapp: '#25d366',
};
const TYPES = [['post', 'Post'], ['reel', 'Video / Reel'], ['story', 'Story']];
const H_KEY = 'sp_history';
const S_KEY = 'sp_scheduled';
const T_KEY = 'sp_theme';

const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const fmt = (iso) => new Date(iso).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const typeLabel = (t) => (TYPES.find((x) => x[0] === t) || [t, t])[1];
const typesOf = (j) => j.postTypes || [j.postType];
const typesText = (j) => (j.kind === 'multi'
  ? 'Multiple Post (' + j.items.length + ' files' + (j.carousel ? ', carousel' : '') + ')'
  : typesOf(j).map(typeLabel).join(' + '));

const ICONS = {
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  hist: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5M12 8v4l3 2',
  user: 'M12 4a4 4 0 100 8 4 4 0 000-8zM4 21c0-4 4-6 8-6s8 2 8 6',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  img: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM21 15l-5-5L5 21',
  chk: 'M5 12l5 5 9-10',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
};
const Ic = ({ n }) => (
  <svg viewBox="0 0 24 24" className="ic"><path d={ICONS[n]} /></svg>
);

const mediaUrl = (p) => 'media://local/' + encodeURIComponent(p);
const isVideo = (p) => /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(p || '');
const Media = ({ path }) => {
  const [bad, setBad] = useState(false);
  if (!path) return null;
  const name = path.split('\\').pop();
  if (bad) return <div className="media media-fb">{name}</div>;
  return isVideo(path)
    ? <video className="media" src={mediaUrl(path)} controls preload="metadata" onError={() => setBad(true)} />
    : <img className="media" src={mediaUrl(path)} alt={name} onError={() => setBad(true)} />;
};

const Dot = ({ p }) => (
  <span className="dot" style={{ background: COLORS[p] }}>{p[0]}</span>
);

export default function App() {
  const [tab, setTab] = useState('new');
  const [newMode, setNewMode] = useState('single');
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(T_KEY) || 'light'; } catch { return 'light'; }
  });
  const [postTypes, setPostTypes] = useState(['post']);
  const [text, setText] = useState('');
  const [description, setDescription] = useState('');
  const [descs, setDescs] = useState({});
  const [purpose, setPurpose] = useState('');
  const [files, setFiles] = useState({});
  const [music, setMusic] = useState({});
  const [platforms, setPlatforms] = useState({
    facebook: false, instagram: false, tiktok: false, youtube: false, whatsapp: false,
  });
  const [mode, setMode] = useState('now');
  const [whenStr, setWhenStr] = useState('');
  const [perPlat, setPerPlat] = useState(false);
  const [whens, setWhens] = useState({});
  const [testMode, setTestMode] = useState(true);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginMsg, setLoginMsg] = useState('');
  const [history, setHistory] = useState(() => load(H_KEY));
  const [scheduled, setScheduled] = useState(() =>
    load(S_KEY).map((j) =>
      j.status === 'pending' && new Date(j.when).getTime() < Date.now() - 2 * 60 * 1000
        ? { ...j, status: 'missed' } : j
    )
  );

  const busyRef = useRef(false);
  const schedRef = useRef(scheduled);
  const runRef = useRef(null);
  schedRef.current = scheduled;

  useEffect(() => {
    window.api.onLoginStep((m) => setLoginMsg(m));
  }, []);

  const flipTheme = () => {
    const n = theme === 'dark' ? 'light' : 'dark';
    setTheme(n);
    try { localStorage.setItem(T_KEY, n); } catch { /* ignore */ }
  };

  const updateScheduled = (fn) => setScheduled((prev) => {
    const n = fn(prev);
    save(S_KEY, n);
    return n;
  });

  const addHistory = (entries) => setHistory((prev) => {
    const n = [...entries, ...prev].slice(0, 500);
    save(H_KEY, n);
    return n;
  });

  const runMultiJob = async (job) => {
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
    if (job.kind === 'multi') return runMultiJob(job);
    busyRef.current = true;
    setLoading(true);
    setResults([{ loading: true, message: job.dryRun ? 'Test mode is running...' : 'Publishing in progress... a new app window will open. Please do not click anything.' }]);
    const out = [];
    const entries = [];
    const jfiles = job.files || { [job.postType]: job.file };
    for (const t of typesOf(job)) {
      for (const p of job.platforms) {
        let rs;
        try {
          const res = await window.api.postAll({
            text: job.text, description: job.descs[p], file: jfiles[t] || null,
            platforms: [p], dryRun: job.dryRun, postType: t,
            music: ((job.music || {})[t] || {}).file || null,
            musicVolume: ((job.music || {})[t] || {}).volume || 0.25,
          });
          rs = res && res.results && res.results.length ? res.results : [{ ok: false, message: 'No results were returned' }];
        } catch (e) {
          rs = [{ ok: false, message: 'Error: ' + e.message }];
        }
        const ok = rs.every((x) => x.ok);
        const message = rs.map((x) => x.message).join(' | ');
        out.push({ ok, message: typeLabel(t) + ' / ' + p + ': ' + message });
        entries.push({
          id: job.id + '-' + t + '-' + p, platform: p, postType: t, purpose: job.purpose,
          text: job.text, description: job.descs[p], file: jfiles[t] || null, ok, message,
          postedAt: new Date().toISOString(), scheduledFor: job.when || null, dryRun: job.dryRun,
        });
      }
    }
    addHistory(entries);
    setResults(out);
    busyRef.current = false;
    setLoading(false);
  };
  runRef.current = runJob;

  // Har 10 second mein dekhta hai ke koi schedule hui post ka waqt aa gaya?
  useEffect(() => {
    const t = setInterval(() => {
      if (busyRef.current) return;
      const now = Date.now();
      const due = schedRef.current.find((j) => j.status === 'pending' && new Date(j.when).getTime() <= now);
      if (due) {
        updateScheduled((prev) => prev.filter((j) => j.id !== due.id));
        runRef.current(due);
      }
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const selected = Object.keys(platforms).filter((p) => platforms[p]);
  const effDesc = (p) => (descs[p] && descs[p].trim()) || description;
  const needFor = (t) => (t !== 'post' ? selected : NEED_FILE.filter((p) => selected.includes(p)));
  const missing = postTypes.filter((t) => !files[t] && needFor(t).length > 0).map((t) => ({ t, list: needFor(t) }));
  const anyFile = postTypes.some((t) => files[t]);
  const allDesc = selected.length > 0 && selected.every((p) => effDesc(p).trim().length > 0);
  const whenFor = (p) => whens[p] || whenStr;
  const future = (v) => !!v && new Date(v).getTime() > Date.now();
  const whenOk = mode === 'now' || (perPlat
    ? selected.length > 0 && selected.every((p) => future(whenFor(p)))
    : future(whenStr));
  const canPost = !loading && selected.length > 0 && missing.length === 0 && allDesc
    && (text.trim() || anyFile) && whenOk;

  const toggle = (name) => setPlatforms({ ...platforms, [name]: !platforms[name] });

  const toggleType = (id) => setPostTypes((prev) => (prev.includes(id)
    ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev)
    : TYPES.map((x) => x[0]).filter((x) => x === id || prev.includes(x))));

  const choose = async (t) => {
    const f = await window.api.pickFile();
    if (f) setFiles((prev) => ({ ...prev, [t]: f }));
  };

  const pickMusic = async (t) => {
    const f = await window.api.pickMusic();
    if (f) setMusic((prev) => ({ ...prev, [t]: { file: f, volume: 0.25 } }));
  };
  const setMusicVol = (t, v) => setMusic((prev) => ({ ...prev, [t]: { ...prev[t], volume: v } }));

  const submit = () => {
    const dMap = {};
    selected.forEach((p) => { dMap[p] = effDesc(p); });
    const job = {
      id: 'j' + Date.now(), postTypes, files, text, platforms: selected, descs: dMap,
      purpose: purpose.trim(), dryRun: testMode, music,
      when: mode === 'later' && !perPlat ? new Date(whenStr).toISOString() : null,
      status: 'pending',
    };
    if (mode === 'later') {
      const jobs = perPlat
        ? selected.map((p) => ({
          ...job, id: job.id + '-' + p, platforms: [p], descs: { [p]: dMap[p] },
          when: new Date(whenFor(p)).toISOString(),
        }))
        : [job];
      updateScheduled((prev) => [...prev, ...jobs].sort((a, b) => new Date(a.when) - new Date(b.when)));
      setResults(jobs.map((j) => ({
        ok: true,
        message: j.platforms.join(', ') + ': scheduled for ' + fmt(j.when) + '. Keep the app open, otherwise the post will not be published.',
      })));
      setTab('scheduled');
      return;
    }
    if (!testMode) {
      const ok = window.confirm(
        'A live post is about to be published!\n\nType: ' + postTypes.map(typeLabel).join(' + ') +
        '\nPlatform: ' + selected.join(', ') + '\n\nAre you sure you want to publish?'
      );
      if (!ok) return;
    }
    runJob(job);
  };

  const deleteHistory = (id) => {
    if (!window.confirm('Remove this entry from history?')) return;
    setHistory((prev) => {
      const n = prev.filter((x) => x.id !== id);
      save(H_KEY, n);
      return n;
    });
  };

  const postMissedNow = (job) => {
    if (busyRef.current) return;
    updateScheduled((prev) => prev.filter((j) => j.id !== job.id));
    setTab('new');
    runJob(job);
  };

  const NAV = [
    ['new', 'New Post', 'edit', null],
    ['scheduled', 'Scheduled', 'clock', scheduled.length],
    ['history', 'History', 'hist', history.length],
    ['login', 'Login', 'user', null],
  ];
  const TITLES = {
    new: ['New Post', 'Write your content, choose your platforms, and publish.'],
    scheduled: ['Scheduled', 'Posts scheduled for a set time.'],
    history: ['History', 'Record of your previous posts.'],
    login: ['Login', 'Connect your accounts.'],
  };

  return (
    <div className="shell" data-theme={theme}>
      <aside>
        <div className="brand"><div className="mark"><Ic n="send" /></div>Makhdoom PostPro</div>
        {NAV.map(([id, label, ic, count]) => (
          <button key={id} className={'nav' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>
            <Ic n={ic} />{label}
            {count !== null && <span className="b">{count}</span>}
          </button>
        ))}
        <div className="side-foot"><b>One Post, Everywhere</b>Write once and publish to all your selected platforms.</div>
      </aside>

      <main>
        <div className="top">
          <div><h1>{TITLES[tab][0]}</h1><p>{TITLES[tab][1]}</p></div>
          <div className="sp" />
          <span className={'pill' + (testMode ? '' : ' live')}>{testMode ? 'Test mode' : 'Live mode'}</span>
          <button className="icon-btn" onClick={flipTheme} aria-label="Theme badlo"><Ic n="moon" /></button>
        </div>

        {tab === 'new' && (
          <div className="kinds" style={{ marginBottom: 16 }}>
            <button className={'kind' + (newMode === 'single' ? ' on' : '')} onClick={() => setNewMode('single')}>Single Post</button>
            <button className={'kind' + (newMode === 'multi' ? ' on' : '')} onClick={() => setNewMode('multi')}>Multiple Post</button>
          </div>
        )}
        {tab === 'new' && newMode === 'multi' && <MultiPost Dot={Dot} Media={Media} addHistory={addHistory} addScheduled={(jobs) => { updateScheduled((prev) => [...prev, ...jobs].sort((a, b) => new Date(a.when) - new Date(b.when))); setTab('scheduled'); }} />}
        {tab === 'new' && newMode === 'single' && (
          <div className="layout">
            <div>
              <div className="card">
                <h2>What would you like to post?</h2>
                <p className="sub">Select one or more types. All will be published together.</p>
                <div className="kinds">
                  {TYPES.map(([id, label]) => (
                    <button key={id} className={'kind' + (postTypes.includes(id) ? ' on' : '')} onClick={() => toggleType(id)}>
                      <span className="cb"><Ic n="chk" /></span>{label}
                    </button>
                  ))}
                </div>
                <div className="stack">
                  <div>
                    <div className="fl">Post Text<span>{text.length} characters</span></div>
                    <textarea className="in" placeholder="Write your post here..." value={text} onChange={(e) => setText(e.target.value)} />
                  </div>
                  <div>
                    <div className="fl"><div>Description<em>*</em> <span>for all platforms, required</span></div><span>{description.length} characters</span></div>
                    <textarea className="in sm" placeholder="Write your description here (required)..." value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div>
                    <div className="fl">Purpose <span>note, shown in history</span></div>
                    <input type="text" className="in" placeholder="e.g. Eid offer, new product, event..." value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                  </div>
                  {postTypes.map((t) => (
                    <div key={t}>
                      <div className="fl">{typeLabel(t)} Photo / Video</div>
                      <div className="drop" onClick={() => choose(t)}>
                        <div className="thumb"><Ic n="img" /></div>
                        <div>
                          <b>{files[t] ? 'File selected' : 'Choose a file'}</b>
                          <small>{files[t] ? files[t].split('\\').pop() : 'jpg, png, mp4, mov'}</small>
                        </div>
                        {files[t] && (
                          <button className="link" onClick={(e) => { e.stopPropagation(); setFiles((prev) => ({ ...prev, [t]: null })); }}>Remove</button>
                        )}
                      </div>

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
                          {files[t] && !isVideo(files[t]) && <small className="muted">Ye photo hai - music lagane par slideshow video ban jayegi.</small>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2>Where would you like to post?</h2>
                <p className="sub">Select one or more platforms.</p>
                <div className="plats">
                  {NAMES.map((p) => (
                    <div key={p} className={'plat' + (platforms[p] ? ' on' : '')} onClick={() => toggle(p)}>
                      <Dot p={p} />{p}
                      <span className="tick"><Ic n="chk" /></span>
                    </div>
                  ))}
                </div>
                {missing.map(({ t, list }) => (
                  <div key={t} className="warn">A photo/video is required for {typeLabel(t)} ({list.join(', ')}). Please choose a file first.</div>
                ))}
                {selected.length > 0 && (
                  <div className="stack" style={{ marginTop: 18 }}>
                    <div>
                      <div className="fl">Platform-Specific Descriptions</div>
                      <small className="muted">Optional. If left blank, the description above will be used.</small>
                    </div>
                    {selected.map((p) => (
                      <div key={p}>
                        <div className="fl"><div className="who"><Dot p={p} />{p}</div></div>
                        <textarea
                          className="in sm"
                          placeholder={'Sirf ' + p + ' ke liye alag description...'}
                          value={descs[p] || ''}
                          onChange={(e) => setDescs({ ...descs, [p]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                        ? <small className="muted">Please select a platform above first.</small>
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
              </div>
            </div>

            <div className="sticky">
              <div className="card">
                <h2>Preview</h2>
                <p className="sub">This is how your post will appear.</p>
                <div className="pv">
                  <div className="pv-h"><div className="av">SP</div><div><b>Your Page</b><small>{postTypes.map(typeLabel).join(' + ')} &middot; {mode === 'later' ? (perPlat ? 'Separate times' : whenStr ? fmt(whenStr) : 'Scheduled') : 'Just now'}</small></div></div>
                  <div className={'pv-img' + (postTypes.some((t) => files[t]) ? ' has' : '')}>
                    {postTypes.some((t) => files[t])
                      ? postTypes.filter((t) => files[t]).map((t) => <Media key={t + files[t]} path={files[t]} />)
                      : 'No file selected'}
                  </div>
                  <div className={'pv-t' + (text.trim() ? '' : ' ph')}>{text.trim() || 'Your post preview will appear here...'}</div>
                  <div className="tags">{selected.map((p) => <span key={p} className="tag">{p}</span>)}</div>
                </div>
                <label className="tg">
                  <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
                  <span className="sw" />
                  <span><b>Test mode</b><small>{testMode ? 'ON: no live post will be published' : 'OFF: your post will be published live!'}</small></span>
                </label>
                <button className="go" disabled={!canPost} onClick={submit}>
                  <Ic n="send" />
                  {loading ? 'Please wait...' : mode === 'later' ? 'Schedule Post' : testMode ? 'Run Test (no live post)' : 'Publish Post'}
                </button>
              </div>

              {results.length > 0 && (
                <div className="card">
                  <h2>Results</h2>
                  {results.map((r, i) => (
                    <div key={i} className={'row ' + (r.loading ? 'load' : r.ok ? 'ok' : 'bad')}>
                      <span className="badge">{r.loading ? '...' : r.ok ? 'OK' : 'X'}</span>
                      <span>{r.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'scheduled' && (
          <div className="card">
            <h2>Scheduled Posts</h2>
            {scheduled.length === 0 && <p className="sub">No scheduled posts.</p>}
            {scheduled.map((j) => (
              <div key={j.id} className={'item ' + (j.status === 'missed' ? 'bad' : '')}>
                <div className="grow">
                  <b>{typesText(j)}</b> &rarr; {j.platforms.join(', ')}{j.dryRun && ' (TEST)'}
                  <small className="muted">{j.status === 'missed' ? 'Miss ho gayi (app band thi): ' : 'Waqt: '}{fmt(j.when)}</small>
                  {j.purpose && <small className="muted">Purpose: {j.purpose}</small>}
                  <small className="muted">{(j.text || '').slice(0, 80)}</small>
                </div>
                <div className="acts">
                  {j.status === 'missed' && <button className="mini" onClick={() => postMissedNow(j)}>Post Now</button>}
                  <button className="mini del" onClick={() => updateScheduled((prev) => prev.filter((x) => x.id !== j.id))}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div className="card">
            <div className="hrow">
              <h2>History</h2>
              {history.length > 0 && (
                <button
                  className="mini del"
                  onClick={() => { if (window.confirm('Delete the entire history?')) { setHistory([]); save(H_KEY, []); } }}
                >Clear History</button>
              )}
            </div>
            {history.length === 0 && <p className="sub">No history yet.</p>}
            {history.map((h) => (
              <div key={h.id} className={'item ' + (h.ok ? '' : 'bad')}>
                <Media path={h.file} />
                <div className="grow">
                  <div className="who"><Dot p={h.platform} /><b>{h.platform}</b><span className={'kindtag ' + h.postType}>{typeLabel(h.postType)}</span>{h.dryRun && <span className="kindtag">TEST</span>}<span className={'kindtag ' + (h.ok ? 'okt' : 'badt')}>{h.ok ? 'OK' : 'Fail'}</span></div>
                  <small className="date">Date: {fmt(h.postedAt)}{h.scheduledFor ? ' (schedule: ' + fmt(h.scheduledFor) + ')' : ''}</small>
                  {h.purpose && <small className="muted">Purpose: {h.purpose}</small>}
                  {h.text && <small className="muted">Post: {h.text.slice(0, 120)}</small>}
                  <small className="muted">Description: {(h.description || '').slice(0, 80)}</small>
                  {!h.ok && <small className="err">{h.message}</small>}
                </div>
                <div className="acts">
                  {!h.dryRun && h.ok && (
                    <button className="mini" onClick={() => window.api.openSite(h.platform)}>Open {h.platform}</button>
                  )}
                  <button className="mini del" onClick={() => deleteHistory(h.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'login' && (
          <div className="card">
            <h2>Login</h2>
            <p className="sub">Connect only the accounts you need.</p>
            <button className="go" style={{ marginTop: 0 }} onClick={() => window.api.loginAll()}>
              Log in to all accounts (one by one)
            </button>
            {loginMsg && <div className="login-msg">{loginMsg}</div>}
            <small className="muted" style={{ display: 'block', margin: '18px 0 8px' }}>Or log in individually:</small>
            <div className="plats">
              {NAMES.map((p) => (
                <div key={p} className="plat" onClick={() => window.api.openSite(p)}><Dot p={p} />{p}</div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
