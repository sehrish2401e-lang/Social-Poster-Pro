const fs = require('fs');
let s = fs.readFileSync('electron/instagram.cjs', 'utf8');
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const fn = String.raw`async function realShare(win, run) {
  const pos = await run('(function(){ const b = [...document.querySelectorAll(\'div[role="button"], button\')].find(e => /^share$/i.test((e.innerText || \'\').trim())); if (!b) return null; b.scrollIntoView({block:"center"}); const r = b.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()');
  if (!pos) return false;
  const wc = win.webContents;
  wc.sendInputEvent({ type: 'mouseMove', x: pos.x, y: pos.y });
  await sleep(300);
  wc.sendInputEvent({ type: 'mouseDown', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await sleep(90);
  wc.sendInputEvent({ type: 'mouseUp', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  log('REAL SHARE CLICK at ' + pos.x + ',' + pos.y);
  return true;
}

`;
const find1 = 'async function postToInstagram(';
const find2 = "if (!(await clickText(win, '^share$')))";
if (s.includes('async function realShare')) console.log('SKIP');
else if (!s.includes(find1) || !s.includes(find2)) console.log('FAIL');
else {
  s = s.replace(find1, () => fn + find1);
  s = s.replace(find2, () => "if (!(await realShare(win, run)) && !(await clickText(win, '^share$')))");
  console.log('OK');
}
if (crlf) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync('electron/instagram.cjs', s, 'utf8');
