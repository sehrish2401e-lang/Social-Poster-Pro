const fs = require('fs');
let s = fs.readFileSync('electron/instagram.cjs', 'utf8');
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const find = "    try {\n      const shotImg";
const add = String.raw`    try {
      const wc = win.webContents;
      await run('(function(){ const b = document.querySelector(' + JSON.stringify(BOX) + '); if (b) { b.focus(); } return true; })()');
      await sleep(400);
      const key = (k, mods) => { wc.sendInputEvent({ type: 'keyDown', keyCode: k, modifiers: mods || [] }); wc.sendInputEvent({ type: 'keyUp', keyCode: k, modifiers: mods || [] }); };
      key('End', ['control']);
      await sleep(200);
      for (const ch of ['.', ' ']) {
        wc.sendInputEvent({ type: 'keyDown', keyCode: ch });
        wc.sendInputEvent({ type: 'char', keyCode: ch });
        wc.sendInputEvent({ type: 'keyUp', keyCode: ch });
        await sleep(150);
      }
      key('Backspace'); await sleep(150);
      key('Backspace'); await sleep(1500);
      log('REAL KEYS done');
    } catch (e) { log('real keys error: ' + e.message); }
`;
if (s.includes('REAL KEYS done')) console.log('SKIP');
else if (!s.includes(find)) console.log('FAIL');
else { s = s.replace(find, () => add + find); console.log('OK'); }
if (crlf) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync('electron/instagram.cjs', s, 'utf8');
