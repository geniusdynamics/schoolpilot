const fs = require('fs');
const code = fs.readFileSync('/workspace/src/contexts/AppDataContext.tsx', 'utf8');

const stack = [];
const lines = code.split('\n');

let inString = false;
let stringChar = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Skip comments (hacky, ignores block comments)
  if (line.trim().startsWith('//')) continue;
  
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    
    // Ignore strings
    if ((c === "'" || c === '"' || c === '`') && line[j-1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = c;
      } else if (c === stringChar) {
        inString = false;
      }
      continue;
    }
    
    if (inString) continue;
    
    if (c === '(' || c === '{' || c === '[') {
      stack.push({ char: c, line: i + 1 });
    } else if (c === ')' || c === '}' || c === ']') {
      if (stack.length > 0) {
        const last = stack[stack.length - 1];
        if (
          (c === ')' && last.char === '(') ||
          (c === '}' && last.char === '{') ||
          (c === ']' && last.char === '[')
        ) {
          stack.pop();
        }
      }
    }
  }
}

console.log('Unclosed blocks:');
for (const item of stack) {
  console.log(`Character '${item.char}' at line ${item.line}`);
}
