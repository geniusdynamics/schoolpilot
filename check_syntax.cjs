const fs = require('fs');
const babel = require('@babel/parser');
const file = '/workspace/src/contexts/AppDataContext.tsx';
const code = fs.readFileSync(file, 'utf8');

try {
  babel.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log('Babel parse success');
} catch (e) {
  console.error('Babel parse error at line ' + e.loc.line + ' column ' + e.loc.column);
  console.error(e.message);
}
