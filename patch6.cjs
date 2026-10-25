const fs = require('fs');
let s = fs.readFileSync('electron/instagram.cjs', 'utf8');
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const re = /clipboard\.writeText\(text\);\s*win\.webContents\.paste\(\);/;
const add = String.raw`const wc2 = win.webContents;
            for (const ch of Array.from(String(text))) {
              if (ch === '\n') {
                wc2.sendInputEvent({ type: 'keyDown', keyCode: 'Enter', modifiers: ['shift'] });
                wc2.sendInputEvent({ type: 'keyUp', keyCode: 'Enter', modifiers: ['shift'] });
              } else {
                await wc2.insertText(ch);
              }
              await sleep(12);
            }`;
if (s.includes('const wc2 = win.webContents')) console.log('SKIP');
else if (!re.test(s)) console.log('FAIL');
else { s = s.replace(re, () => add); console.log('OK'); }
if (crlf) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync('electron/instagram.cjs', s, 'utf8');
