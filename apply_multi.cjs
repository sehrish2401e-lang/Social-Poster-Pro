const fs = require('fs');
const path = require('path');
const root = __dirname;

function patch(file, fn) {
  const p = path.join(root, file);
  let s = fs.readFileSync(p, 'utf8');
  const crlf = s.includes('\r\n');
  s = s.replace(/\r\n/g, '\n');
  if (!fs.existsSync(p + '.bak_multi')) fs.copyFileSync(p, p + '.bak_multi');
  const out = fn(s);
  if (out === s) { console.log('SKIP (pehle se laga hai):', file); return; }
  fs.writeFileSync(p, crlf ? out.replace(/\n/g, '\r\n') : out);
  console.log('OK:', file);
}

patch('electron/preload.cjs', (s) => {
  if (s.includes('pickFiles')) return s;
  const i = s.lastIndexOf('});');
  const add =
    "  pickFiles: () => ipcRenderer.invoke('pick-files'),\n" +
    "  postBatch: (data) => ipcRenderer.invoke('post-batch', data),\n" +
    "  onBatchProgress: (cb) => ipcRenderer.on('batch-progress', (_e, msg) => cb(msg)),\n";
  return s.slice(0, i) + add + s.slice(i);
});

patch('electron/main.cjs', (s) => {
  const i = s.indexOf("ipcMain.handle('post-batch'");
  if (i < 0) throw new Error('main.cjs mein post-batch nahi mila');
  const head = s.slice(0, i);
  let tail = s.slice(i);
  if (tail.includes('it.platforms')) return s;
  tail = tail.split('data.platforms').join('(it.platforms || data.platforms)');
  return head + tail;
});

const BAR = `{tab === 'new' && (
          <div className="kinds" style={{ marginBottom: 16 }}>
            <button className={'kind' + (newMode === 'single' ? ' on' : '')} onClick={() => setNewMode('single')}>Single Post</button>
            <button className={'kind' + (newMode === 'multi' ? ' on' : '')} onClick={() => setNewMode('multi')}>Multiple Post</button>
          </div>
        )}
        {tab === 'new' && newMode === 'multi' && <MultiPost Dot={Dot} Media={Media} addHistory={addHistory} />}
        {tab === 'new' && newMode === 'single' && (`;

patch('src/App.jsx', (s) => {
  if (s.includes('MultiPost')) return s;
  if (!s.includes("{tab === 'new' && (")) throw new Error('App.jsx mein tab block nahi mila');
  s = s.replace("import './App.css';", "import './App.css';\nimport MultiPost from './MultiPost.jsx';");
  s = s.replace("const [tab, setTab] = useState('new');", "const [tab, setTab] = useState('new');\n  const [newMode, setNewMode] = useState('single');");
  s = s.replace("{tab === 'new' && (", BAR);
  return s;
});

console.log('\nHo gaya. Ab app band karke dobara chalao: npm run dev');r