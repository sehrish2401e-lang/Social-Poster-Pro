const fs = require('fs');
let s = fs.readFileSync('electron/instagram.cjs', 'utf8');
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const find = "    const done = await waitFor(win,";
const add = String.raw`    try {
      await sleep(4000);
      const im2 = await win.webContents.capturePage();
      fs.writeFileSync('C:\\SocialPosterData\\ig-after-share.png', im2.toPNG());
      log('AFTER SHARE shot saved');
    } catch (e) { log('after shot error: ' + e.message); }
`;
if (s.includes('ig-after-share')) console.log('SKIP');
else if (!s.includes(find)) console.log('FAIL');
else { s = s.replace(find, () => add + find); console.log('OK'); }
if (crlf) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync('electron/instagram.cjs', s, 'utf8');
