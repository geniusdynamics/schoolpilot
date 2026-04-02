const fs = require('fs');
const code = fs.readFileSync('/workspace/src/contexts/AppDataContext.tsx', 'utf8');

let parenCount = 0;
let braceCount = 0;
let bracketCount = 0;

const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (c === '(') parenCount++;
    else if (c === ')') parenCount--;
    else if (c === '{') braceCount++;
    else if (c === '}') braceCount--;
    else if (c === '[') bracketCount++;
    else if (c === ']') bracketCount--;
  }
  
  if (parenCount < 0 || braceCount < 0 || bracketCount < 0) {
    console.log(`Mismatch at line ${i + 1}: parens=${parenCount}, braces=${braceCount}, brackets=${bracketCount}`);
  }
}

console.log(`Final count: parens=${parenCount}, braces=${braceCount}, brackets=${bracketCount}`);
