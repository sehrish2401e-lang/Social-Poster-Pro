const fs = require('fs');
let s = fs.readFileSync('electron/instagram.cjs', 'utf8');
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const find = "    if (!(await clickText(win, '^share$')))";
const add = `    try {
      const shotImg = await win.webContents.capturePage();
      fs.writeFileSync('C:\\\\SocialPosterData\\\\ig-before-share.png', shotImg.toPNG());
      const snap = await run('(function(){ const b = document.querySelector(' + JSON.stringify(BOX) + '); return b ? (b.innerText || "") : "(BOX NAHI MILA)"; })()');
      log('BEFORE SHARE box=[' + String(snap).slice(0, 60).replace(/\\n/g, ' ') + ']');
    } catch (e) { log('shot error: ' + e.message); }
`;
if (s.includes('ig-before-share')) { console.log('SKIP'); }
else if (!s.includes(find)) { console.log('FAIL'); }
else { s = s.replace(find, () => add + find); console.log('OK'); }
if (!/const fs = require/.test(s.split('\n').slice(0, 5).join('\n'))) s = "const fs = require('fs');\n" + s;
if (crlf) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync('electron/instagram.cjs', s, 'utf8');
