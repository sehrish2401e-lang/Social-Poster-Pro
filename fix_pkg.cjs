const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!p.main) p.main = 'electron/main.cjs';
p.description = p.description || 'Makhdoom PostPro';
p.author = p.author || 'Makhdoom';
p.build = {
  appId: 'com.makhdoom.postpro',
  productName: 'Makhdoom PostPro',
  directories: { output: 'release' },
  files: ['dist/**', 'electron/**', 'package.json', '!**/*.bak*', '!electron/*backup*'],
  win: { target: 'nsis' },
  nsis: { oneClick: false, allowToChangeInstallationDirectory: true }
};
fs.writeFileSync('package.json', JSON.stringify(p, null, 2));
console.log('OK');
