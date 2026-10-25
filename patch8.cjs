const fs = require('fs');
let s = fs.readFileSync('electron/main.cjs', 'utf8');
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const f1 = "const { postAll } = require('./bots.cjs');";
const f2 = 'const results = await postAll(caption, file, data.platforms);';
const branch = String.raw`let results;
  if (data.postType === 'story') {
    results = [];
    for (const p of data.platforms) {
      if (p === 'facebook') results.push(await postFacebookStory(file));
      else results.push({ ok: false, message: p + ': Story abhi supported nahi (sirf Facebook story chalti hai)' });
    }
  } else {
    results = await postAll(caption, file, data.platforms);
  }`;
if (s.includes('postFacebookStory')) console.log('SKIP');
else if (!s.includes(f1) || !s.includes(f2)) console.log('FAIL');
else {
  s = s.replace(f1, () => f1 + "\nconst { postFacebookStory } = require('./fbstory.cjs');");
  s = s.replace(f2, () => branch);
  console.log('OK');
}
if (crlf) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync('electron/main.cjs', s, 'utf8');
