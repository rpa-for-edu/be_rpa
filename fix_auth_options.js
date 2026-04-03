const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/auth/strategy');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (file.endsWith('.strategy.ts') && file !== 'sap-mock.strategy.ts' && file !== 'erpnext.strategy.ts') {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    const target = 'super.authenticate(req, { ...options, state });';
    const replacement = "super.authenticate(req, { ...options, state, accessType: 'offline', prompt: 'consent' });";
    if (content.includes(target)) {
      content = content.replace(target, replacement);
      fs.writeFileSync(fullPath, content);
      console.log(`Replaced in ${file}`);
    }
  }
});
console.log('Done');
